═══════════════════════════════════════════════════════════════════
  ANTESCAN DATASETS — DROP YOUR FILES HERE
═══════════════════════════════════════════════════════════════════

This folder is the official "drop zone" for clinical datasets.
Any file you place here is automatically detected by AnteScan.

──────────────────────────────────────────────────────────────────
  BUNDLED REAL GHANA DATASETS (already in this folder)
──────────────────────────────────────────────────────────────────

  GHBR8CFL.zip                         15 MB   DHS Ghana 2022 Births
                                                34,595 maternal records
  GHKR8CFL.zip                          3 MB   DHS Ghana 2022 Kids
                                                child health records
  Ghana_MICS6_SPSS_Datasets.zip         10 MB   UNICEF MICS6 Ghana
                                                14,609 women + 8,903 children

──────────────────────────────────────────────────────────────────
  HOW TO ADD MORE DATASETS
──────────────────────────────────────────────────────────────────

  1. Copy any .zip / .sav / .csv / .xlsx file into THIS folder
     using Windows Explorer / Finder / drag-and-drop.

  2. Choose one of three ways to register it:

     a) Run seed again (full refresh)
        > cd backend
        > python seed.py

     b) Open the Admin Dashboard → Dataset Manager → "Rescan folder"
        This picks up any new file without disturbing existing data.

     c) Use the upload button in Dataset Manager
        Click "Upload dataset" → choose your file → it's parsed live
        and added to this folder automatically.

──────────────────────────────────────────────────────────────────
  SUPPORTED FORMATS
──────────────────────────────────────────────────────────────────

  .sav         SPSS file (MICS6, DHS exports)
  .zip         Compressed archive containing any of the above
  .csv         Comma-separated values
  .xlsx        Excel workbook
  .dat + .dct  DHS fixed-width files

──────────────────────────────────────────────────────────────────
  WHERE THE PARSED DATA APPEARS
──────────────────────────────────────────────────────────────────

  • Admin Dashboard → Dataset Manager  (browse & download)
  • Admin Dashboard → Training Lab     (train ML models on it)
  • API endpoint     GET /api/datasets

═══════════════════════════════════════════════════════════════════
