"""SMS gateway — Africa's Talking with dry-run fallback for development.

Templates support Twi, Ga, Ewe and English.
"""
import os, json
from datetime import datetime
from flask import current_app
import requests

from app.extensions import db
from app.models.sms_log import SMSLog


# Multilingual templates for the Grandmother Network and referrals.
TEMPLATES = {
    'referral_routine': {
        'en': 'AnteScan: Routine referral for {patient}. Please visit {facility} within 7 days. CHW: {chw} ({chw_phone}).',
        'tw': 'AnteScan: {patient} fa kɔ {facility} dadwen ɛnnanson mu. CHW: {chw} ({chw_phone}).',
        'ga': 'AnteScan: Yi {patient} kɛya {facility} ŋmɛnɛ mli. CHW: {chw} ({chw_phone}).',
        'ee': 'AnteScan: Mikplɔ {patient} yi {facility} le ŋkeke adre me. CHW: {chw} ({chw_phone}).',
    },
    'referral_urgent': {
        'en': 'AnteScan URGENT: {patient} needs care at {facility} within 24h. CHW: {chw} ({chw_phone}).',
        'tw': 'AnteScan EHIA: {patient} kɔ {facility} nnɔnhwere 24 mu. CHW: {chw} ({chw_phone}).',
        'ga': 'AnteScan SƐƐ: {patient} ŋɔɔɔŋ {facility} 24h mli. CHW: {chw} ({chw_phone}).',
        'ee': 'AnteScan KPATA: {patient} dze {facility} gaƒoƒo 24 me. CHW: {chw} ({chw_phone}).',
    },
    'referral_emergency': {
        'en': 'AnteScan EMERGENCY: {patient} needs immediate care at {facility}. Call 193 for ambulance. CHW: {chw}.',
        'tw': 'AnteScan AHOHIA: {patient} kɔ {facility} seesei. Frɛ 193 ma ambulance. CHW: {chw}.',
        'ga': 'AnteScan FEEMƆ: {patient} ya {facility} ŋmɛnɛ. Tsɛ 193. CHW: {chw}.',
        'ee': 'AnteScan AYAYAƲA: {patient} yi {facility} fifia. Yɔ 193. CHW: {chw}.',
    },
    'elder_alert': {
        'en': 'AnteScan: Hello {elder_name}. Please support {patient} who has been referred to {facility}. CHW: {chw}.',
        'tw': 'AnteScan: Maame {elder_name}, mepa wo kyɛw boa {patient} a wɔde no akɔ {facility}.',
        'ga': 'AnteScan: Maame {elder_name}, kpeyemɔ {patient} ni eya {facility}.',
        'ee': 'AnteScan: Mama {elder_name}, kpe ɖe {patient} ŋu si woyi {facility} la.',
    },
    'otp': {
        'en': 'AnteScan: Your verification code is {code}. Valid for 5 minutes.',
        'tw': 'AnteScan: Wo verification code yɛ {code}. Ɛkɔɔ so wɔ nnɔnsima 5 mu.',
        'ga': 'AnteScan: Bo verification code lɛ {code}. Eka 5.',
        'ee': 'AnteScan: Wò code enye {code}. Anɔ anyi 5.',
    },
}

LANG_TO_CODE = {'English': 'en', 'Twi': 'tw', 'Ga': 'ga', 'Ewe': 'ee', 'Hausa': 'ha'}


def render(template_key: str, language: str, **kwargs) -> str:
    code = LANG_TO_CODE.get(language, 'en')
    template = TEMPLATES.get(template_key, {}).get(code) or TEMPLATES.get(template_key, {}).get('en', '')
    try:
        return template.format(**kwargs)
    except KeyError:
        return template


def send_sms(to_phone: str, body: str, *,
             kind: str = 'general',
             language: str = 'English',
             patient_id: int | None = None,
             referral_id: int | None = None,
             family_elder_id: int | None = None,
             sent_by_chw_id: int | None = None,
             to_name: str | None = None) -> dict:
    """Send an SMS. Always writes to SMSLog. Returns delivery info."""
    log = SMSLog(
        kind=kind, to_phone=to_phone, to_name=to_name, body=body, language=language,
        patient_id=patient_id, referral_id=referral_id, family_elder_id=family_elder_id,
        sent_by_chw_id=sent_by_chw_id, status='Pending',
    )
    db.session.add(log)
    db.session.commit()

    dry_run = current_app.config.get('SMS_DRY_RUN', True)
    api_key = current_app.config.get('AT_API_KEY')

    if dry_run or not api_key:
        log.status = 'Sent'
        log.provider = 'dry-run'
        log.provider_sid = f'dry-{log.id}'
        log.sent_at = datetime.utcnow()
        log.cost_pesewas = 0
        db.session.commit()
        return {'status': 'Sent', 'sid': log.provider_sid, 'dryRun': True}

    try:
        resp = requests.post(
            'https://api.africastalking.com/version1/messaging',
            headers={
                'apiKey': api_key,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            data={
                'username': current_app.config.get('AT_USERNAME', 'sandbox'),
                'to': to_phone,
                'message': body,
                'from': current_app.config.get('AT_SENDER_ID', 'AnteScan'),
            },
            timeout=10,
        )
        data = resp.json()
        recipients = data.get('SMSMessageData', {}).get('Recipients', [{}])
        recipient = recipients[0] if recipients else {}
        log.provider = 'africastalking'
        log.provider_sid = recipient.get('messageId')
        log.status = recipient.get('status', 'Sent')
        log.cost_pesewas = int(float(recipient.get('cost', '0').split(' ')[-1] or 0) * 100) if recipient.get('cost') else 0
        log.sent_at = datetime.utcnow()
        db.session.commit()
        return {'status': log.status, 'sid': log.provider_sid, 'dryRun': False}
    except Exception as e:
        log.status = 'Failed'
        log.error = str(e)[:255]
        db.session.commit()
        return {'status': 'Failed', 'error': str(e)}


def send_referral_sms(referral, patient, chw, family_elder=None):
    """Compose and send a referral SMS + elder alert if applicable."""
    urgency_key = {
        'Routine': 'referral_routine',
        'Urgent': 'referral_urgent',
        'Emergency': 'referral_emergency',
    }.get(referral.urgency, 'referral_routine')

    lang = chw.language if chw else 'English'

    # Send to facility
    if referral.facility_phone:
        body = render(urgency_key, lang,
                       patient=patient.full_name, facility=referral.facility_name,
                       chw=chw.name if chw else '—',
                       chw_phone=chw.user.phone if chw and chw.user else '')
        send_sms(referral.facility_phone, body,
                 kind='referral', language=lang,
                 patient_id=patient.id, referral_id=referral.id,
                 sent_by_chw_id=chw.id if chw else None,
                 to_name=referral.facility_name)

    # Notify family elder for high/emergency
    if family_elder and family_elder.sms_consent and referral.urgency in ('Urgent', 'Emergency'):
        elder_body = render('elder_alert', family_elder.language,
                             elder_name=family_elder.name, patient=patient.full_name,
                             facility=referral.facility_name, chw=chw.name if chw else '—')
        send_sms(family_elder.phone, elder_body,
                 kind='elder_alert', language=family_elder.language,
                 patient_id=patient.id, referral_id=referral.id,
                 family_elder_id=family_elder.id,
                 sent_by_chw_id=chw.id if chw else None,
                 to_name=family_elder.name)
        referral.elder_notified = True
        db.session.commit()
