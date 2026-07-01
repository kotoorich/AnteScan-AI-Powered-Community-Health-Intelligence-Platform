"""Voice transcript → clinical symptom mapper.

Maps keywords in Twi, Ga, Ewe, Hausa and English (Ghanaian) to standard symptom keys
used by the screening forms.
"""

# Ghanaian language keyword tables — maintained by clinicians.
SYMPTOM_KEYWORDS = {
    'headache': {
        'en': ['headache', 'head pain', 'head ache'],
        'tw': ['ti bo', 'tibo', 'ti pae', 'me ti yi me'],
        'ga': ['nyɔŋmɔ', 'yitso miihe'],
        'ee': ['tasi', 'tagbo le veʋem'],
        'ha': ['ciwon kai'],
    },
    'swelling': {
        'en': ['swelling', 'swollen', 'puffy'],
        'tw': ['ho hye', 'hohye', 'me ho ahonhon'],
        'ga': ['blɛkɔ'],
        'ee': ['kɔmɔɖe'],
        'ha': ['kumburi'],
    },
    'bleeding': {
        'en': ['bleeding', 'blood', 'bleed'],
        'tw': ['mogya', 'mogya retu'],
        'ga': ['la'],
        'ee': ['ʋu', 'ʋu didi'],
        'ha': ['jini'],
    },
    'abdominal_pain': {
        'en': ['abdominal pain', 'stomach pain', 'belly hurts'],
        'tw': ['yafunu yaw', 'yafunu', 'mefuru yare'],
        'ga': ['musu mli wala'],
        'ee': ['dɔme veve', 'dɔ veʋem'],
        'ha': ['cikin ciwo'],
    },
    'fever': {
        'en': ['fever', 'high temperature', 'hot body'],
        'tw': ['ahu duru', 'ahuduru', 'me ho yε hye'],
        'ga': ['feefee', 'gbi'],
        'ee': ['avivi', 'ŋutilã xɔ dzo'],
        'ha': ['zazzaɓi'],
    },
    'blurred_vision': {
        'en': ['blurred vision', 'cannot see', 'vision blurry'],
        'tw': ['ani bere', 'menhu adeε yie'],
        'ga': ['hiŋmɛi ehé je'],
        'ee': ['ŋku megale dada o'],
        'ha': ['ba na gani sosai'],
    },
    'vomiting': {
        'en': ['vomit', 'vomiting', 'throwing up'],
        'tw': ['wu wu', 'feye', 'merefefe'],
        'ga': ['lɛ'],
        'ee': ['fefee'],
        'ha': ['amai'],
    },
    'breathing': {
        'en': ['difficulty breathing', 'cannot breathe', 'shortness of breath'],
        'tw': ['ahome den', 'me nhome', 'mente ahome'],
        'ga': ['kɛ mumɔ tswa kpa'],
        'ee': ['gbɔgbɔ sesẽ'],
        'ha': ['wahalar numfashi'],
    },
    'reduced_fetal_movement': {
        'en': ['no movement', 'baby not moving', 'reduced fetal movement'],
        'tw': ['abofra nni kwan', 'abofra nkeka ne ho'],
        'ga': ['gbekɛbii lɛ tsuui'],
        'ee': ['vi la mele ʋuʋum o'],
        'ha': ["jariri ba motsi"],
    },
    'convulsions': {
        'en': ['convulsion', 'seizure', 'fits'],
        'tw': ['ɔso mu', 'mfumfum'],
        'ga': ['kpaikpa'],
        'ee': ['ɖatsoƒoƒo'],
        'ha': ['farfaɗiya'],
    },
}

LANGUAGE_NAMES = {'en': 'English', 'tw': 'Twi', 'ga': 'Ga', 'ee': 'Ewe', 'ha': 'Hausa'}


def detect_language(text: str) -> str:
    """Heuristic language detection — counts keyword hits per language."""
    if not text:
        return 'en'
    low = text.lower()
    counts = {}
    for sym, langs in SYMPTOM_KEYWORDS.items():
        for lang, kws in langs.items():
            for kw in kws:
                if kw.lower() in low:
                    counts[lang] = counts.get(lang, 0) + 1
    if not counts:
        return 'en'
    return max(counts.items(), key=lambda x: x[1])[0]


def map_transcript(text: str) -> dict:
    """Return matched symptoms + detected language."""
    if not text:
        return {'symptoms': [], 'language': 'English', 'matches': {}}
    low = text.lower()
    matched_symptoms = []
    matches_detail = {}
    for sym, langs in SYMPTOM_KEYWORDS.items():
        for lang, kws in langs.items():
            for kw in kws:
                if kw.lower() in low:
                    if sym not in matched_symptoms:
                        matched_symptoms.append(sym)
                    matches_detail.setdefault(sym, []).append({'lang': lang, 'kw': kw})
                    break
    lang_code = detect_language(text)
    return {
        'symptoms': matched_symptoms,
        'language': LANGUAGE_NAMES.get(lang_code, 'English'),
        'languageCode': lang_code,
        'matches': matches_detail,
    }
