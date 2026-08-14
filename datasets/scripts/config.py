"""
Configuration settings for the ColdSense AI Geography ETL Pipeline.
"""

import os
from pathlib import Path
import json

# Base directory
BASE_DIR = Path(__file__).parent.parent

# Directory paths
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"
SCRIPTS_DIR = BASE_DIR / "scripts"

# Input file paths
LGD_STATE_FILE = RAW_DIR / "india-local-government-directory-main" / "administrative" / "1-state.csv"
LGD_DISTRICT_FILE = RAW_DIR / "india-local-government-directory-main" / "administrative" / "2-district.csv"
INDIA_POST_PINCODE_FILE = RAW_DIR / "5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv"

# Output file paths
STATES_OUTPUT = PROCESSED_DIR / "states.csv"
DISTRICTS_OUTPUT = PROCESSED_DIR / "districts.csv"
LOCALITIES_OUTPUT = PROCESSED_DIR / "localities.csv"
PINCODES_OUTPUT = PROCESSED_DIR / "pincodes.csv"
BUILD_REPORT_OUTPUT = BASE_DIR / "build_report.txt"

# UUID mapping file for sharing locality UUIDs between processors
LOCALITY_UUID_MAPPING_FILE = PROCESSED_DIR / "locality_uuid_mapping.json"

# Ensure processed directory exists
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Data processing settings
POSTAL_SUFFIXES = ['.S.O.', '.B.O.', '.H.O.']
DUPLICATE_HANDLING = 'first'  # 'first', 'last', or 'all'

# District name normalization mapping for known renamed districts
# Format: 'old_name': 'new_name' (all lowercase)
DISTRICT_NORMALIZATION_MAP = {
    # Official district renames
    'firozepur': 'firozpur',
    'firozpur': 'finczpur',
    'hoshangabad': 'narmadapuram',
    'narmadapuram': 'narmadapuram',
    'allahabad': 'prayagraj',
    'prayagraj': 'prayagraj',
    'bagalkot': 'bagalkot',
    'vijaynagar': 'vijayapura',
    'vijayapura': 'vijayapura',
    'lakshadweep': 'lakshadweep',
    # Additional common spelling variations
    'burdwan': 'bardhaman',
    'bardhaman': 'bardhaman',
    'chalakudy': 'thrissur',
    'thrissur': 'thrissur',
    'raichur': 'raichuru',
    'raichuru': 'raichuru',
    'bellary': 'ballari',
    'ballari': 'ballari',
    'gulbarga': 'kalaburagi',
    'kalaburagi': 'kalaburagi',
    'kolkata': 'kolkata',
    'calcutta': 'kolkata',
    'mumbai': 'mumbai',
    'bombay': 'mumbai',
    'chennai': 'chennai',
    'madras': 'chennai',
    'bengaluru': 'bengaluru',
    'bangalore': 'bengaluru',
    'pune': 'pune',
    'poona': 'pune',
    'ahmedabad': 'ahmedabad',
    'hyderabad': 'hyderabad',
    'delhi': 'delhi',
}
