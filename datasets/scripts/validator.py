"""
Data validation module for ColdSense AI Geography ETL Pipeline v2.
"""

import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

from utils import setup_logger, load_csv_safely
from config import STATES_OUTPUT, DISTRICTS_OUTPUT, LOCALITIES_OUTPUT, PINCODES_OUTPUT

logger = setup_logger("Validator")


@dataclass
class ValidationResult:
    """
    Data class to hold validation results.
    """
    passed: bool
    errors: List[str]
    warnings: List[str]
    stats: Dict[str, Any]


class DataValidator:
    """
    Validates processed geography data before CSV generation.
    """
    
    def __init__(self):
        """
        Initialize the validator.
        """
        self.logger = logger
        self.validation_results: Dict[str, ValidationResult] = {}
    
    def validate_all(self) -> ValidationResult:
        """
        Run all validation checks.
        
        Returns:
            ValidationResult with overall validation status
        """
        self.logger.info("Starting comprehensive data validation")
        
        all_errors = []
        all_warnings = []
        all_stats = {}
        
        # Validate each data file
        try:
            states_result = self.validate_states()
            self.validation_results['states'] = states_result
            all_errors.extend(states_result.errors)
            all_warnings.extend(states_result.warnings)
            all_stats['states'] = states_result.stats
        except Exception as e:
            all_errors.append(f"States validation failed: {str(e)}")
        
        try:
            districts_result = self.validate_districts()
            self.validation_results['districts'] = districts_result
            all_errors.extend(districts_result.errors)
            all_warnings.extend(districts_result.warnings)
            all_stats['districts'] = districts_result.stats
        except Exception as e:
            all_errors.append(f"Districts validation failed: {str(e)}")
        
        try:
            localities_result = self.validate_localities()
            self.validation_results['localities'] = localities_result
            all_errors.extend(localities_result.errors)
            all_warnings.extend(localities_result.warnings)
            all_stats['localities'] = localities_result.stats
        except Exception as e:
            all_errors.append(f"Localities validation failed: {str(e)}")
        
        try:
            pincodes_result = self.validate_pincodes()
            self.validation_results['pincodes'] = pincodes_result
            all_errors.extend(pincodes_result.errors)
            all_warnings.extend(pincodes_result.warnings)
            all_stats['pincodes'] = pincodes_result.stats
        except Exception as e:
            all_errors.append(f"Pincodes validation failed: {str(e)}")
        
        try:
            fk_result = self.validate_foreign_keys()
            self.validation_results['foreign_keys'] = fk_result
            all_errors.extend(fk_result.errors)
            all_warnings.extend(fk_result.warnings)
            all_stats['foreign_keys'] = fk_result.stats
        except Exception as e:
            all_errors.append(f"Foreign key validation failed: {str(e)}")
        
        # Overall result
        passed = len(all_errors) == 0
        overall_result = ValidationResult(
            passed=passed,
            errors=all_errors,
            warnings=all_warnings,
            stats=all_stats
        )
        
        if passed:
            self.logger.info("All validation checks passed")
        else:
            self.logger.error(f"Validation failed with {len(all_errors)} errors")
        
        return overall_result
    
    def validate_states(self) -> ValidationResult:
        """
        Validate states data.
        
        Returns:
            ValidationResult for states
        """
        self.logger.info("Validating states data")
        
        errors = []
        warnings = []
        stats = {}
        
        if not STATES_OUTPUT.exists():
            return ValidationResult(
                passed=False,
                errors=["States file not found"],
                warnings=warnings,
                stats=stats
            )
        
        df = load_csv_safely(STATES_OUTPUT, encoding='utf-8')
        
        # Check for required columns
        required_columns = ['id', 'name', 'code']
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            errors.append(f"States missing required columns: {missing_columns}")
            return ValidationResult(passed=False, errors=errors, warnings=warnings, stats=stats)
        
        # Check for duplicate state codes
        duplicate_codes = df[df.duplicated(subset=['code'], keep=False)]
        if not duplicate_codes.empty:
            errors.append(f"Found {len(duplicate_codes)} duplicate state codes")
            stats['duplicate_state_codes'] = len(duplicate_codes)
        
        # Check for duplicate state names
        duplicate_names = df[df.duplicated(subset=['name'], keep=False)]
        if not duplicate_names.empty:
            warnings.append(f"Found {len(duplicate_names)} duplicate state names")
            stats['duplicate_state_names'] = len(duplicate_names)
        
        # Check for null values
        null_counts = df.isnull().sum()
        if null_counts.any():
            for col, count in null_counts[null_counts > 0].items():
                errors.append(f"States column '{col}' has {count} null values")
        
        stats['total_states'] = len(df)
        stats['unique_state_codes'] = df['code'].nunique()
        stats['unique_state_names'] = df['name'].nunique()
        
        return ValidationResult(
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            stats=stats
        )
    
    def validate_districts(self) -> ValidationResult:
        """
        Validate districts data.
        
        Returns:
            ValidationResult for districts
        """
        self.logger.info("Validating districts data")
        
        errors = []
        warnings = []
        stats = {}
        
        if not DISTRICTS_OUTPUT.exists():
            return ValidationResult(
                passed=False,
                errors=["Districts file not found"],
                warnings=warnings,
                stats=stats
            )
        
        df = load_csv_safely(DISTRICTS_OUTPUT, encoding='utf-8')
        
        # Check for required columns
        required_columns = ['id', 'state_id', 'name']
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            errors.append(f"Districts missing required columns: {missing_columns}")
            return ValidationResult(passed=False, errors=errors, warnings=warnings, stats=stats)
        
        # Check for duplicate (state_id, name) combinations
        duplicate_combinations = df[df.duplicated(subset=['state_id', 'name'], keep=False)]
        if not duplicate_combinations.empty:
            errors.append(f"Found {len(duplicate_combinations)} duplicate (state_id, name) combinations")
            stats['duplicate_district_combinations'] = len(duplicate_combinations)
        
        # Check for null values
        null_counts = df.isnull().sum()
        if null_counts.any():
            for col, count in null_counts[null_counts > 0].items():
                errors.append(f"Districts column '{col}' has {count} null values")
        
        stats['total_districts'] = len(df)
        stats['unique_district_names'] = df['name'].nunique()
        stats['states_referenced'] = df['state_id'].nunique()
        
        return ValidationResult(
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            stats=stats
        )
    
    def validate_localities(self) -> ValidationResult:
        """
        Validate localities data.
        
        Returns:
            ValidationResult for localities
        """
        self.logger.info("Validating localities data")
        
        errors = []
        warnings = []
        stats = {}
        
        if not LOCALITIES_OUTPUT.exists():
            return ValidationResult(
                passed=False,
                errors=["Localities file not found"],
                warnings=warnings,
                stats=stats
            )
        
        df = load_csv_safely(LOCALITIES_OUTPUT, encoding='utf-8')
        
        # Check for required columns
        required_columns = ['id', 'district_id', 'name', 'postal_code']
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            errors.append(f"Localities missing required columns: {missing_columns}")
            return ValidationResult(passed=False, errors=errors, warnings=warnings, stats=stats)
        
        # Check for duplicate (district_id, name) combinations
        duplicate_combinations = df[df.duplicated(subset=['district_id', 'name'], keep=False)]
        if not duplicate_combinations.empty:
            errors.append(f"Found {len(duplicate_combinations)} duplicate (district_id, name) combinations")
            stats['duplicate_locality_combinations'] = len(duplicate_combinations)
        
        # Check for null values
        null_counts = df.isnull().sum()
        if null_counts.any():
            for col, count in null_counts[null_counts > 0].items():
                errors.append(f"Localities column '{col}' has {count} null values")
        
        # Check for empty locality names
        empty_names = df[df['name'].str.len() == 0]
        if not empty_names.empty:
            errors.append(f"Found {len(empty_names)} empty locality names")
            stats['empty_locality_names'] = len(empty_names)
        
        # Check for invalid postal codes (not 6 digits)
        invalid_postal_codes = df[~df['postal_code'].astype(str).str.match(r'^\d{6}$')]
        if not invalid_postal_codes.empty:
            errors.append(f"Found {len(invalid_postal_codes)} invalid postal codes (not 6 digits)")
            stats['invalid_postal_codes'] = len(invalid_postal_codes)
        
        stats['total_localities'] = len(df)
        stats['unique_locality_names'] = df['name'].nunique()
        stats['districts_referenced'] = df['district_id'].nunique()
        
        return ValidationResult(
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            stats=stats
        )
    
    def validate_pincodes(self) -> ValidationResult:
        """
        Validate pincodes data with UUID support.
        
        Returns:
            ValidationResult for pincodes
        """
        self.logger.info("Validating pincodes data")
        
        errors = []
        warnings = []
        stats = {}
        
        if not PINCODES_OUTPUT.exists():
            return ValidationResult(
                passed=False,
                errors=["Pincodes file not found"],
                warnings=warnings,
                stats=stats
            )
        
        df = load_csv_safely(PINCODES_OUTPUT, encoding='utf-8')
        
        # Check for required columns
        required_columns = ['id', 'locality_id', 'pincode']
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            errors.append(f"Pincodes missing required columns: {missing_columns}")
            return ValidationResult(passed=False, errors=errors, warnings=warnings, stats=stats)
        
        # Validate UUID format for id column
        import re
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
        invalid_uuids = df[~df['id'].astype(str).str.match(uuid_pattern)]
        if not invalid_uuids.empty:
            errors.append(f"Found {len(invalid_uuids)} invalid UUIDs in id column")
            stats['invalid_uuids'] = len(invalid_uuids)
        
        # Check for duplicate UUIDs
        duplicate_uuids = df[df.duplicated(subset=['id'], keep=False)]
        if not duplicate_uuids.empty:
            errors.append(f"Found {len(duplicate_uuids)} duplicate UUIDs")
            stats['duplicate_uuids'] = len(duplicate_uuids)
        
        # Check for duplicate (locality_id, pincode) combinations
        duplicate_combinations = df[df.duplicated(subset=['locality_id', 'pincode'], keep=False)]
        if not duplicate_combinations.empty:
            errors.append(f"Found {len(duplicate_combinations)} duplicate (locality_id, pincode) combinations")
            stats['duplicate_pincode_combinations'] = len(duplicate_combinations)
        
        # Check for null values
        null_counts = df.isnull().sum()
        if null_counts.any():
            for col, count in null_counts[null_counts > 0].items():
                errors.append(f"Pincodes column '{col}' has {count} null values")
        
        # Check for invalid pincodes (not 6 digits)
        invalid_pincodes = df[~df['pincode'].astype(str).str.match(r'^\d{6}$')]
        if not invalid_pincodes.empty:
            errors.append(f"Found {len(invalid_pincodes)} invalid pincodes (not 6 digits)")
            stats['invalid_pincodes'] = len(invalid_pincodes)
        
        stats['total_pincodes'] = len(df)
        stats['unique_pincodes'] = df['pincode'].nunique()
        stats['localities_referenced'] = df['locality_id'].nunique()
        
        # Check for missing locality references
        self.logger.info("Checking for missing locality references in pincodes")
        if LOCALITIES_OUTPUT.exists():
            localities_df = load_csv_safely(LOCALITIES_OUTPUT, encoding='utf-8')
            valid_locality_ids = set(localities_df['id'].astype(str).tolist())
            pincode_locality_ids = set(df['locality_id'].astype(str).tolist())
            missing_locality_ids = pincode_locality_ids - valid_locality_ids
            
            if missing_locality_ids:
                errors.append(f"Found {len(missing_locality_ids)} locality_id references in pincodes that don't exist in localities.csv")
                stats['missing_locality_references'] = len(missing_locality_ids)
            else:
                stats['missing_locality_references'] = 0
                self.logger.info("All locality_id references in pincodes exist in localities.csv")
        
        return ValidationResult(
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            stats=stats
        )
    
    def validate_foreign_keys(self) -> ValidationResult:
        """
        Validate foreign key relationships.
        
        Returns:
            ValidationResult for foreign keys
        """
        self.logger.info("Validating foreign key relationships")
        
        errors = []
        warnings = []
        stats = {}
        
        # Load all data files
        try:
            states_df = load_csv_safely(STATES_OUTPUT, encoding='utf-8')
            districts_df = load_csv_safely(DISTRICTS_OUTPUT, encoding='utf-8')
            localities_df = load_csv_safely(LOCALITIES_OUTPUT, encoding='utf-8')
            pincodes_df = load_csv_safely(PINCODES_OUTPUT, encoding='utf-8')
        except Exception as e:
            errors.append(f"Failed to load data files for FK validation: {str(e)}")
            return ValidationResult(passed=False, errors=errors, warnings=warnings, stats=stats)
        
        # Validate districts.state_id references states.id
        valid_state_ids = set(states_df['id'].astype(str).tolist())
        invalid_state_ids = set(districts_df['state_id'].astype(str).tolist()) - valid_state_ids
        if invalid_state_ids:
            errors.append(f"Found {len(invalid_state_ids)} districts with invalid state_id references")
            stats['invalid_district_state_ids'] = len(invalid_state_ids)
        
        # Validate localities.district_id references districts.id
        valid_district_ids = set(districts_df['id'].astype(str).tolist())
        invalid_district_ids = set(localities_df['district_id'].astype(str).tolist()) - valid_district_ids
        if invalid_district_ids:
            errors.append(f"Found {len(invalid_district_ids)} localities with invalid district_id references")
            stats['invalid_locality_district_ids'] = len(invalid_district_ids)
        
        # Validate pincodes.locality_id references localities.id
        valid_locality_ids = set(localities_df['id'].astype(str).tolist())
        invalid_locality_ids = set(pincodes_df['locality_id'].astype(str).tolist()) - valid_locality_ids
        if invalid_locality_ids:
            errors.append(f"Found {len(invalid_locality_ids)} pincodes with invalid locality_id references")
            stats['invalid_pincode_locality_ids'] = len(invalid_locality_ids)
        
        stats['fk_validation_passed'] = len(errors) == 0
        
        return ValidationResult(
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            stats=stats
        )
    
    def get_validation_summary(self) -> str:
        """
        Get a formatted summary of validation results.
        
        Returns:
            Formatted validation summary string
        """
        summary_lines = []
        summary_lines.append("=" * 80)
        summary_lines.append("VALIDATION SUMMARY")
        summary_lines.append("=" * 80)
        
        for data_type, result in self.validation_results.items():
            status = "PASS" if result.passed else "FAIL"
            summary_lines.append(f"\n{data_type.upper()}: {status}")
            
            if result.stats:
                summary_lines.append("  Statistics:")
                for key, value in result.stats.items():
                    summary_lines.append(f"    {key}: {value}")
            
            if result.errors:
                summary_lines.append("  Errors:")
                for error in result.errors:
                    summary_lines.append(f"    - {error}")
            
            if result.warnings:
                summary_lines.append("  Warnings:")
                for warning in result.warnings:
                    summary_lines.append(f"    - {warning}")
        
        summary_lines.append("=" * 80)
        
        return "\n".join(summary_lines)
