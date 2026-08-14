"""
ColdSense AI Geography ETL Pipeline v2 - Main Entry Point

This script processes raw Indian administrative datasets into normalized CSV files
matching the Supabase schema for ColdSense AI.

Usage:
    python build_geography.py

The pipeline will:
1. Process LGD State data -> processed/states.csv
2. Process LGD District data -> processed/districts.csv  
3. Process India Post Pincode data -> processed/localities.csv (with merged postal_code)
4. Validate all data for quality and integrity
5. Generate build_report.txt (includes validation results)

Input Data:
- LGD Dataset: datasets/raw/india-local-government-directory-main/administrative/
- India Post Pincode: datasets/raw/5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv

Output Data:
- All processed files: datasets/processed/
- Build report: datasets/build_report.txt

Supabase Schema Compatibility:
- states.csv: id, name, code
- districts.csv: id, state_id, name
- localities.csv: id, district_id, name, postal_code (pincodes merged)

v2 Improvements:
- Enhanced district name normalization with official renames
- (State + District) composite key mapping for better accuracy
- Comprehensive data validation before CSV generation
- Automatic abort on validation failures
- Detailed validation results in build report
- Enforced uniqueness constraints: (district_id + name)
- Foreign key validation across all tables
- Merged pincodes into localities.csv as postal_code column
"""

import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from pipeline import main

if __name__ == "__main__":
    main()
