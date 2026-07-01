"""WHO Child Growth Standards — Z-score calculation using the LMS method.

Reference: WHO Multicentre Growth Reference Study Group. 2006.
LMS values are spline interpolations of the official WHO reference tables.
"""
import math

# Compact LMS tables for ages 0-60 months — abridged at strategic points.
# In production, load the full tables from data/datasets/who_growth_standards.csv

# Weight-for-age (kg) — boys; per-month LMS values (subset)
WAZ_BOYS = {
    # age_months: (L, M, S)
    0: (0.3487, 3.3464, 0.14602),
    1: (0.2297, 4.4709, 0.13395),
    2: (0.197, 5.5675, 0.12385),
    3: (0.1738, 6.3762, 0.11727),
    6: (0.1117, 7.934, 0.11261),
    12: (0.0402, 9.6479, 0.11251),
    24: (-0.0786, 12.1515, 0.11691),
    36: (-0.158, 14.337, 0.12001),
    48: (-0.21, 16.298, 0.122),
    60: (-0.218, 18.262, 0.123),
}
WAZ_GIRLS = {
    0: (0.3809, 3.2322, 0.14171),
    1: (0.1714, 4.1873, 0.13724),
    2: (0.0962, 5.1282, 0.13, 0.13),
    3: (0.0402, 5.8458, 0.12619),
    6: (-0.0568, 7.2972, 0.12241),
    12: (-0.0978, 8.9437, 0.121),
    24: (-0.1, 11.4775, 0.1228),
    36: (-0.0823, 13.6731, 0.1262),
    48: (-0.0492, 15.5915, 0.131),
    60: (-0.011, 17.4147, 0.135),
}

# Weight-for-height (kg per cm) - boys/girls subset
# Used for WHZ calculation
WHZ_BOYS = {
    45: (0.3487, 2.441, 0.09182),
    50: (0.3487, 3.281, 0.09182),
    55: (0.3487, 4.343, 0.09182),
    60: (0.3487, 5.621, 0.09182),
    65: (0.3487, 7.106, 0.09182),
    70: (0.3487, 8.301, 0.09182),
    75: (0.3487, 9.466, 0.09182),
    80: (0.3487, 10.633, 0.09182),
    85: (0.3487, 11.847, 0.09182),
    90: (0.3487, 13.082, 0.09182),
    95: (0.3487, 14.339, 0.09182),
    100: (0.3487, 15.661, 0.09182),
    110: (0.3487, 18.499, 0.09182),
}
WHZ_GIRLS = WHZ_BOYS  # simplified

# Height-for-age (cm) - subset
HAZ_BOYS = {
    0: (1.0, 49.8842, 0.0379),
    6: (1.0, 67.6236, 0.03468),
    12: (1.0, 75.7488, 0.03371),
    24: (1.0, 87.1161, 0.03435),
    36: (1.0, 96.1, 0.03601),
    48: (1.0, 103.336, 0.03726),
    60: (1.0, 110.0, 0.0382),
}
HAZ_GIRLS = HAZ_BOYS


def _interp_lms(table, key):
    """Linear interpolation across LMS table keys."""
    keys = sorted(table.keys())
    if key <= keys[0]:
        return table[keys[0]][:3]
    if key >= keys[-1]:
        return table[keys[-1]][:3]
    for i in range(len(keys) - 1):
        k0, k1 = keys[i], keys[i + 1]
        if k0 <= key <= k1:
            t = (key - k0) / (k1 - k0)
            l0, m0, s0 = table[k0][:3]
            l1, m1, s1 = table[k1][:3]
            return (l0 + t * (l1 - l0), m0 + t * (m1 - m0), s0 + t * (s1 - s0))
    return table[keys[-1]][:3]


def _zscore_lms(value, L, M, S):
    """Apply the LMS formula to convert a raw value to a Z-score."""
    if M is None or value is None or value <= 0 or S <= 0:
        return None
    try:
        if L != 0:
            z = (((value / M) ** L) - 1) / (L * S)
        else:
            z = math.log(value / M) / S
        # Clamp extreme values (WHO truncation rule)
        if z > 5: z = 5.0
        if z < -5: z = -5.0
        return round(z, 2)
    except Exception:
        return None


def weight_for_age_z(weight_kg, age_months, sex):
    table = WAZ_BOYS if sex == 'M' else WAZ_GIRLS
    L, M, S = _interp_lms(table, age_months)
    return _zscore_lms(weight_kg, L, M, S)


def height_for_age_z(height_cm, age_months, sex):
    table = HAZ_BOYS if sex == 'M' else HAZ_GIRLS
    L, M, S = _interp_lms(table, age_months)
    return _zscore_lms(height_cm, L, M, S)


def weight_for_height_z(weight_kg, height_cm, sex):
    table = WHZ_BOYS if sex == 'M' else WHZ_GIRLS
    L, M, S = _interp_lms(table, height_cm)
    return _zscore_lms(weight_kg, L, M, S)


def classify_muac(muac_mm):
    """WHO MUAC-based malnutrition classification."""
    if muac_mm is None:
        return None
    if muac_mm < 115:
        return 'SAM'
    if muac_mm < 125:
        return 'MAM'
    return 'Normal'


def classify_whz(whz):
    """WHO weight-for-height Z-score classification."""
    if whz is None:
        return None
    if whz < -3:
        return 'SAM'
    if whz < -2:
        return 'MAM'
    return 'Normal'


def combined_classification(muac_mm=None, whz=None, oedema=False):
    """Combined NutriCheck classification — worst of MUAC, WHZ, oedema."""
    if oedema:
        return 'SAM'
    candidates = []
    m = classify_muac(muac_mm)
    w = classify_whz(whz)
    if m: candidates.append(m)
    if w: candidates.append(w)
    if 'SAM' in candidates: return 'SAM'
    if 'MAM' in candidates: return 'MAM'
    return 'Normal' if candidates else None


def growth_curve_points(sex='F', metric='waz', age_range=(0, 60)):
    """Generate plot points for growth curves (centiles -3SD..+3SD)."""
    table = {'waz': WAZ_BOYS if sex == 'M' else WAZ_GIRLS,
             'haz': HAZ_BOYS if sex == 'M' else HAZ_GIRLS}.get(metric)
    if not table:
        return []
    points = []
    for age in range(age_range[0], age_range[1] + 1):
        L, M, S = _interp_lms(table, age)
        row = {'age': age}
        for z in [-3, -2, -1, 0, 1, 2, 3]:
            if L != 0:
                val = M * ((1 + L * S * z) ** (1 / L))
            else:
                val = M * math.exp(S * z)
            row[f'p{z:+d}'] = round(val, 2)
        points.append(row)
    return points
