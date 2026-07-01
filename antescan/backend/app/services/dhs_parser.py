"""Dataset parser supporting DHS .DAT+.DCT, SPSS .sav, CSV, XLSX, JSON.

Handles real Ghana datasets:
  - GHBR8CFL.zip → DHS Births Recode (.DAT + .DCT + .SPS)
  - GHKR8CFL.zip → DHS Kids Recode
  - Ghana_MICS6_SPSS_Datasets.zip → MICS6 .sav files
"""
import os, json, zipfile, tempfile, shutil
import pandas as pd
import pyreadstat


def detect_format(path: str) -> str:
    p = path.lower()
    if p.endswith('.sav'): return 'spss'
    if p.endswith('.dta'): return 'stata'
    if p.endswith('.csv'): return 'csv'
    if p.endswith('.xlsx') or p.endswith('.xls'): return 'excel'
    if p.endswith('.json'): return 'json'
    if p.endswith('.dat'): return 'dhs'
    if p.endswith('.zip'): return 'zip'
    return 'unknown'


def extract_zip(zip_path: str, extract_to: str) -> list:
    """Extract a zip and return list of extracted file paths."""
    files = []
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(extract_to)
        for name in zf.namelist():
            if not name.endswith('/'):
                files.append(os.path.join(extract_to, name))
    return files


def find_primary_file(files: list) -> str:
    """Pick the first parseable data file from an extracted zip."""
    priority = ['.sav', '.dta', '.dat', '.csv', '.xlsx']
    for ext in priority:
        for f in files:
            if f.lower().endswith(ext):
                return f
    return files[0] if files else None


def parse_dhs_dat(dat_path: str, max_rows: int = 50):
    """Parse a DHS .DAT file using the companion .DCT/.SPS dictionary.

    DHS fixed-width files require column specs. We parse the .DCT (SAS) file
    which contains column names + start positions + lengths.
    """
    base = os.path.splitext(dat_path)[0]
    dct = base + '.DCT'
    dictionary = []

    if os.path.exists(dct):
        with open(dct, 'r', errors='ignore') as f:
            for line in f:
                line = line.strip()
                # Simplified parse: lines like:  @1 CASEID $15.
                if line.startswith('@'):
                    parts = line.split()
                    try:
                        start = int(parts[0][1:])
                        name = parts[1]
                        fmt = parts[2] if len(parts) > 2 else ''
                        # Detect length from format like "5." or "$15." or "5.2"
                        length = 1
                        clean = fmt.lstrip('$').rstrip(';').rstrip('.')
                        if '.' in clean:
                            clean = clean.split('.')[0]
                        try:
                            length = int(clean)
                        except Exception:
                            length = 1
                        dictionary.append({'name': name, 'start': start - 1, 'length': length})
                    except Exception:
                        continue

    if not dictionary:
        # Fallback: treat as opaque — just count rows
        with open(dat_path, 'rb') as f:
            return None, [{'name': 'RAW', 'label': 'unparsed', 'type': 'string', 'nulls': 0, 'unique': 0}], 0

    # Build DataFrame from fixed-width
    rows = []
    with open(dat_path, 'r', errors='ignore') as f:
        for i, line in enumerate(f):
            if i >= max_rows: break
            row = {}
            for col in dictionary[:40]:  # limit columns for preview
                row[col['name']] = line[col['start']:col['start'] + col['length']].strip()
            rows.append(row)

    df = pd.DataFrame(rows)
    columns_meta = [
        {'name': c['name'], 'label': c['name'], 'type': 'string', 'nulls': 0, 'unique': 0}
        for c in dictionary[:40]
    ]
    # Count total rows quickly
    total = 0
    with open(dat_path, 'r', errors='ignore') as f:
        for _ in f:
            total += 1
    return df, columns_meta, total


def parse_spss(sav_path: str, preview_rows: int = 30):
    """Parse SPSS .sav file. Returns (DataFrame preview, column metadata, total_rows)."""
    df, meta = pyreadstat.read_sav(sav_path)
    total = len(df)
    preview = df.head(preview_rows).copy()

    # Build column metadata with WHO/MICS6 labels
    columns_meta = []
    for col in df.columns[:80]:  # cap displayed columns
        series = df[col]
        dtype = 'numeric' if pd.api.types.is_numeric_dtype(series) else 'categorical' if series.nunique() < 30 else 'string'
        columns_meta.append({
            'name': col,
            'label': meta.column_names_to_labels.get(col, ''),
            'type': dtype,
            'nulls': int(series.isna().sum()),
            'unique': int(series.nunique()),
        })
    return preview, columns_meta, total


def parse_dataset(path: str, preview_rows: int = 30):
    """Top-level dispatcher — returns (preview DataFrame, columns list, total rows)."""
    fmt = detect_format(path)
    if fmt == 'spss':
        return parse_spss(path, preview_rows)
    if fmt == 'dhs':
        return parse_dhs_dat(path, preview_rows)
    if fmt == 'csv':
        df = pd.read_csv(path)
        return _generic_summary(df, preview_rows)
    if fmt == 'excel':
        df = pd.read_excel(path)
        return _generic_summary(df, preview_rows)
    if fmt == 'json':
        df = pd.read_json(path)
        return _generic_summary(df, preview_rows)
    raise ValueError(f'Unsupported format: {fmt}')


def _generic_summary(df, preview_rows):
    total = len(df)
    columns_meta = []
    for col in df.columns[:80]:
        series = df[col]
        dtype = ('numeric' if pd.api.types.is_numeric_dtype(series) else 'string')
        columns_meta.append({
            'name': col, 'label': col, 'type': dtype,
            'nulls': int(series.isna().sum()), 'unique': int(series.nunique()),
        })
    return df.head(preview_rows), columns_meta, total


def quality_check(df, columns_meta) -> dict:
    """Run basic data quality checks. Returns score 0-1 and issues list."""
    issues = []
    if df is None or len(df) == 0:
        return {'score': 0.0, 'issues': ['Empty dataset']}

    # Check null density per column
    high_null_cols = [c['name'] for c in columns_meta if c['nulls'] > len(df) * 0.5]
    if high_null_cols:
        issues.append(f'{len(high_null_cols)} columns have >50% missing values')

    # Check duplicates
    if len(df) > 0:
        dup_pct = df.duplicated().sum() / len(df)
        if dup_pct > 0.1:
            issues.append(f'Possible duplicates: {dup_pct:.1%} of rows')

    # Check single-value columns (useless for modeling)
    constant = [c['name'] for c in columns_meta if c['unique'] <= 1]
    if constant:
        issues.append(f'{len(constant)} columns have a single unique value')

    # Score: 1.0 baseline, deduct for each issue
    score = max(0.0, 1.0 - 0.15 * len(issues))
    return {'score': round(score, 2), 'issues': issues}


def to_records_safe(df, limit=30):
    """Convert DataFrame preview to JSON-safe records (handles NaN, bytes)."""
    if df is None:
        return []
    out = []
    for _, row in df.head(limit).iterrows():
        rec = {}
        for col, val in row.items():
            if pd.isna(val):
                rec[col] = None
            elif isinstance(val, bytes):
                rec[col] = val.decode('utf-8', errors='ignore').strip()
            elif hasattr(val, 'item'):
                rec[col] = val.item()
            else:
                rec[col] = str(val) if not isinstance(val, (int, float, bool, str)) else val
        out.append(rec)
    return out
