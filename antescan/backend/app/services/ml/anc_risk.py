"""ANC pregnancy risk classifier.

Two-stage:
  1. Trained Random Forest on real DHS Ghana 2022 + MICS6 wm.sav features
  2. Rule-based fallback (Ghana Health Service ANC guidelines)
"""
import os, json, joblib
from datetime import datetime


# --- Rule-based fallback ---

def rule_based_risk(form: dict, symptoms: list) -> dict:
    """Apply GHS ANC clinical thresholds when ML model is unavailable.
    `form` keys: bp_systolic, bp_diastolic, temperature, fetal_hr, gestational_age, gravida, parity
    `symptoms` list of symptom keys.
    """
    score = 0
    reasons = []
    s = set(symptoms or [])

    bps = _to_num(form.get('bp_systolic'))
    bpd = _to_num(form.get('bp_diastolic'))
    if bps and bpd:
        if bps >= 160 or bpd >= 110:
            score += 40
            reasons.append(f"Severe hypertension ({int(bps)}/{int(bpd)} mmHg) — pre-eclampsia risk")
        elif bps >= 140 or bpd >= 90:
            score += 22
            reasons.append(f"Elevated blood pressure ({int(bps)}/{int(bpd)} mmHg)")

    if 'headache' in s and 'blurred_vision' in s:
        score += 25
        reasons.append("Headache + blurred vision — classic pre-eclampsia warning combination")
    if 'bleeding' in s:
        score += 22
        reasons.append("Vaginal bleeding reported — urgent evaluation required")
    if 'convulsions' in s:
        score += 50
        reasons.append("Convulsions reported — possible eclampsia, emergency referral needed")
    if 'reduced_fetal_movement' in s:
        score += 18
        reasons.append("Reduced fetal movement — fetal well-being assessment indicated")
    if 'swelling' in s:
        score += 8
        reasons.append("Generalized swelling reported")

    temp = _to_num(form.get('temperature'))
    if 'fever' in s and temp and temp >= 38.5:
        score += 12
        reasons.append(f"Fever ({temp}°C) — possible infection")

    fhr = _to_num(form.get('fetal_hr'))
    if fhr and (fhr < 110 or fhr > 160):
        score += 15
        reasons.append(f"Abnormal fetal heart rate ({int(fhr)} bpm) — normal range 110–160")

    ga = _to_num(form.get('gestational_age'))
    gravida = _to_num(form.get('gravida'))
    if ga and gravida and ga < 18 and gravida >= 5:
        score += 8
        reasons.append("Grand multiparity at early gestation — closer monitoring advised")

    if not reasons:
        reasons = [
            "All measured vitals within safe range",
            "No concerning symptoms reported",
            "Continue routine antenatal monitoring schedule",
        ]

    score = min(100, score)
    level = ('emergency' if score >= 80 else
             'high' if score >= 60 else
             'moderate' if score >= 35 else 'low')

    return {
        'score': score,
        'level': level,
        'reasons': reasons,
        'used_rule_fallback': True,
        'model_version': 'rules-v1.0',
    }


def _to_num(v):
    try:
        if v is None or v == '': return None
        return float(v)
    except Exception:
        return None


# --- ML-based prediction ---

class ANCRiskModel:
    """Loads a trained scikit-learn model from disk and serves predictions."""

    def __init__(self, models_dir: str):
        self.models_dir = models_dir
        self.model = None
        self.features = []
        self.version = None

    def load(self) -> bool:
        meta_path = os.path.join(self.models_dir, 'anc_risk_model.meta.json')
        pkl_path = os.path.join(self.models_dir, 'anc_risk_model.pkl')
        if not (os.path.exists(meta_path) and os.path.exists(pkl_path)):
            return False
        with open(meta_path) as f:
            meta = json.load(f)
        self.model = joblib.load(pkl_path)
        self.features = meta.get('features', [])
        self.version = meta.get('version', '1.0.0')
        return True

    def predict(self, form: dict, symptoms: list) -> dict:
        """Build feature vector from form, predict probability, return result."""
        if self.model is None:
            return rule_based_risk(form, symptoms)
        import numpy as np
        vec = []
        # Combine form vitals and one-hot symptom flags
        s = set(symptoms or [])
        feature_value_map = {
            'bp_systolic': _to_num(form.get('bp_systolic')) or 110,
            'bp_diastolic': _to_num(form.get('bp_diastolic')) or 70,
            'temperature': _to_num(form.get('temperature')) or 36.8,
            'pulse': _to_num(form.get('pulse')) or 78,
            'gestational_age': _to_num(form.get('gestational_age')) or 20,
            'fetal_hr': _to_num(form.get('fetal_hr')) or 140,
            'parity': _to_num(form.get('parity')) or 1,
            'gravida': _to_num(form.get('gravida')) or 1,
            'weight': _to_num(form.get('weight')) or 60,
            'sym_headache': 1 if 'headache' in s else 0,
            'sym_blurred_vision': 1 if 'blurred_vision' in s else 0,
            'sym_swelling': 1 if 'swelling' in s else 0,
            'sym_bleeding': 1 if 'bleeding' in s else 0,
            'sym_convulsions': 1 if 'convulsions' in s else 0,
            'sym_fever': 1 if 'fever' in s else 0,
            'sym_reduced_fetal_movement': 1 if 'reduced_fetal_movement' in s else 0,
            'sym_abdominal_pain': 1 if 'abdominal_pain' in s else 0,
        }
        for col in self.features:
            vec.append(feature_value_map.get(col, 0))

        try:
            probs = self.model.predict_proba([vec])[0]
            ml_score = self._to_score(probs)
            # Clinical safety: rule-based scoring catches red flags that may not be
            # learnable from this dataset (e.g. BP thresholds). Take the MAX of ML
            # and rule-based scores so we never miss an emergency.
            rule_result = rule_based_risk(form, symptoms)
            score = int(round(max(ml_score, rule_result['score'])))
            level = ('emergency' if score >= 80 else
                     'high' if score >= 60 else
                     'moderate' if score >= 35 else 'low')
            return {
                'score': score,
                'level': level,
                'reasons': rule_result['reasons'],
                'used_rule_fallback': bool(score == rule_result['score'] and score > ml_score),
                'model_version': self.version,
                'ml_score': int(round(ml_score)),
                'rule_score': rule_result['score'],
            }
        except Exception as e:
            return rule_based_risk(form, symptoms)

    def _to_score(self, probs):
        """Map class probabilities to a 0-100 risk score."""
        # 4-class: low/moderate/high/emergency mapped to 15/45/70/90
        if len(probs) == 4:
            anchors = [15, 45, 70, 90]
            return sum(p * a for p, a in zip(probs, anchors))
        # 2-class binary: probability of positive * 100
        if len(probs) == 2:
            return probs[1] * 100
        # n-class: weight by position
        n = len(probs)
        anchors = [int(100 * i / max(1, n - 1)) for i in range(n)]
        return sum(p * a for p, a in zip(probs, anchors))


# Singleton accessor — initialized in app/__init__.py
_anc_model = None

def get_anc_model(models_dir: str) -> ANCRiskModel:
    global _anc_model
    if _anc_model is None:
        _anc_model = ANCRiskModel(models_dir)
        _anc_model.load()
    return _anc_model
