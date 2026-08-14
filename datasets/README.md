# ColdSense AI Geography ETL Pipeline v2

A production-quality Python ETL pipeline that converts raw Indian administrative datasets into normalized CSV files matching the Supabase schema for ColdSense AI.

## Overview

This pipeline processes two main data sources:
- **LGD Dataset**: Indian Local Government Directory (States and Districts)
- **India Post Pincode Dataset**: Postal office locations and pincodes

## v2 Improvements

- **Enhanced District Normalization**: Configurable alias mapping for official district renames (Firozepur → Firozpur, Hoshangabad → Narmadapuram, Allahabad → Prayagraj, etc.)
- **Composite Key Mapping**: District mapping now uses (State + District) for more accurate matching
- **Comprehensive Validation**: Automatic data quality checks before CSV generation
- **Foreign Key Validation**: Ensures referential integrity across all tables
- **Abort on Failure**: Pipeline aborts with clear error messages if validation fails
- **Enhanced Reporting**: Build report includes detailed validation results
- **Uniqueness Enforcement**: Strict constraints on (district_id + locality_name) and (locality_id + pincode)

## Directory Structure

```
datasets/
├── raw/                                    # Input data (never modified)
│   ├── india-local-government-directory-main/
│   │   └── administrative/
│   │       ├── 1-state.csv
│   │       └── 2-district.csv
│   └── 5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv
├── processed/                              # Output data (regenerated each run)
│   ├── states.csv
│   ├── districts.csv
│   ├── localities.csv
│   └── pincodes.csv
├── scripts/                                # ETL pipeline code
│   ├── config.py
│   ├── utils.py
│   ├── pipeline.py
│   ├── processors/
│   │   ├── __init__.py
│   │   ├── base_processor.py
│   │   ├── state_processor.py
│   │   ├── district_processor.py
│   │   ├── locality_processor.py
│   │   └── pincode_processor.py
├── build_geography.py                      # Main entry point
├── requirements.txt
├── build_report.txt                        # Generated after each run
└── README.md
```

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

Run the complete pipeline:
```bash
python build_geography.py
```

## Pipeline Steps

### Step 1: Process States
- **Input**: `raw/india-local-government-directory-main/administrative/1-state.csv`
- **Output**: `processed/states.csv`
- **Columns**: `id`, `state_name`, `state_code`
- **Processing**: 
  - Extract state code and name
  - Convert names to title case
  - Remove duplicates
  - Generate sequential IDs

### Step 2: Process Districts
- **Input**: `raw/india-local-government-directory-main/administrative/2-district.csv`
- **Output**: `processed/districts.csv`
- **Columns**: `id`, `state_id`, `district_name`
- **Processing**:
  - Extract district code, name, and state code
  - Apply district name normalization (configurable aliases)
  - Map state codes to state IDs using enhanced mapping
  - Convert names to title case
  - Remove duplicates
  - Generate sequential IDs

### Step 3: Process Localities
- **Input**: `raw/5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv`
- **Output**: `processed/localities.csv`
- **Columns**: `id`, `district_id`, `name`, `postal_code`
- **Processing**:
  - Extract office names, districts, states, and pincodes
  - Normalize district names for matching
  - Map districts to district IDs using (State + District) composite key
  - Fallback to district name only if composite key fails
  - Remove postal suffixes (.S.O., .B.O., .H.O.)
  - Convert names to title case
  - Merge pincode as postal_code column
  - Remove duplicates based on (district_id + name), keeping first pincode
  - Generate sequential IDs

### Step 4: Validate Data
- **Validation Checks**:
  - Duplicate states
  - Duplicate districts
  - Duplicate localities
  - Broken foreign keys
  - Null values
  - Invalid data formats
  - Invalid postal codes
- **Action**: Aborts build with clear error message if validation fails

### Step 5: Generate Build Report
- **Output**: `build_report.txt`
- **Contents**:
  - Processing statistics for each step
  - Record counts
  - Duplicate removal statistics
  - Validation results (PASS/FAIL)
  - Foreign key validation status
  - Error details (if any)

## Output Schema

### states.csv
```csv
id,name,code
1,Andaman And Nicobar Islands,35
2,Andhra Pradesh,28
...
```

### districts.csv
```csv
id,state_id,name
1,1,Nicobars
2,1,North And Middle Andaman
...
```

### localities.csv
```csv
id,district_id,name,postal_code
1,1,Kothimir,504273
2,2,Papanpet,504299
...
```

**Note**: Pincodes are merged into localities.csv as the `postal_code` column. The first pincode is used when multiple pincodes exist for the same locality.

## Features

- **Modular Design**: Each processor is independent and reusable
- **Error Handling**: Comprehensive error handling with detailed logging
- **Data Validation**: Column validation and data quality checks
- **Duplicate Removal**: Automatic duplicate detection and removal
- **Logging**: Detailed logging to both file and console
- **Progress Tracking**: Statistics tracking for each processing step
- **Foreign Key Maintenance**: Proper foreign key relationships maintained
- **Data Normalization**: Consistent text normalization and formatting

## Logging

The pipeline generates detailed logs:
- **Console Output**: Real-time progress updates
- **Log File**: `etl_pipeline.log` with detailed execution logs

## Build Report

After each run, a `build_report.txt` is generated with:
- Processing duration
- Record counts for each step
- Duplicate removal statistics
- **Validation results (PASS/FAIL)**
- **Foreign key validation status**
- **Total records**
- **Error details (if any)**

## Validation Rules

The pipeline automatically validates:

### Uniqueness Constraints
- **States**: No duplicate state codes
- **Districts**: No duplicate (state_id, name) combinations
- **Localities**: No duplicate (district_id, name) combinations

### Foreign Key Constraints
- **districts.state_id** must reference **states.id**
- **localities.district_id** must reference **districts.id**

### Data Quality
- No null values in required columns
- No empty locality names
- Valid 6-digit postal codes
- Proper data types

### On Validation Failure
- Pipeline aborts immediately
- Clear error message with specific issues
- Build report shows FAIL status
- No CSV files are generated for failed validation

## Error Handling

The pipeline handles various error scenarios:
- Missing input files
- Invalid data formats
- Missing required columns
- Foreign key mapping failures
- Data quality issues

## Dependencies

- Python 3.7+
- pandas 2.0+

## Notes

- Raw datasets are never modified
- Processed files are regenerated on each run
- The pipeline does not import data into Supabase
- Output CSVs are ready for Supabase import
- District name matching is case-insensitive
- Postal suffixes are automatically removed from locality names

## Configuration

The pipeline uses `config.py` for configuration:

### District Name Normalization
The `DISTRICT_NORMALIZATION_MAP` in `config.py` contains official district renames:
```python
DISTRICT_NORMALIZATION_MAP = {
    'firozepur': 'firozpur',
    'hoshangabad': 'narmadapuram',
    'allahabad': 'prayagraj',
    # ... additional mappings
}
```

To add more district renames, add entries to this dictionary in `config.py`.

### Data Processing Settings
- `POSTAL_SUFFIXES`: List of postal suffixes to remove (.S.O., .B.O., .H.O.)
- `DUPLICATE_HANDLING`: Strategy for duplicate removal ('first', 'last', or 'all')

## Troubleshooting

### "File not found" errors
- Ensure raw datasets are in the correct directory
- Check file paths in `config.py`

### "Missing required columns" errors
- Verify the raw CSV files have the expected format
- Check column names match the expected schema

### "Unmapped districts/localities" warnings
- Some districts/localities may not have exact matches
- Check the build report for counts of unmapped records
- Add district renames to `DISTRICT_NORMALIZATION_MAP` in `config.py`

### "Validation failed" errors
- Pipeline aborts automatically if validation fails
- Check build report for specific validation errors
- Common issues:
  - Duplicate keys in tables
  - Broken foreign key references
  - Null values in required columns
  - Invalid data formats
- Fix the underlying data issue and re-run the pipeline

### Build status shows "FAIL"
- Check the validation section in build_report.txt
- Fix all validation errors before importing to Supabase
- Pipeline will not generate CSVs if validation fails

## Production Considerations

- The pipeline is designed for production use
- **Automatic validation** prevents bad data from being generated
- **Abort on failure** ensures only validated data is produced
- Comprehensive error handling prevents partial data corruption
- Logging provides audit trail for debugging
- Modular design allows easy extension and maintenance
- **Configurable district normalization** allows easy updates for official renames
- **Composite key mapping** improves data accuracy
- **Enforced uniqueness constraints** match Supabase schema requirements

## Data Quality Guarantees

The v2 pipeline ensures:
- ✅ No duplicate state codes
- ✅ No duplicate (state_id, name) combinations
- ✅ No duplicate (district_id, name) combinations
- ✅ All foreign keys are valid
- ✅ No null values in required columns
- ✅ Valid 6-digit postal codes only
- ✅ Properly normalized text data
- ✅ Consistent naming conventions
- ✅ Pincodes merged into localities as postal_code
