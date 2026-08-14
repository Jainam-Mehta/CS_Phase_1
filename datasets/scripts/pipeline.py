"""
Main ETL Pipeline orchestrator for ColdSense AI Geography data.
"""

import sys
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent))

from processors import StateProcessor, DistrictProcessor, LocalityProcessor, PincodeProcessor
from validator import DataValidator
from config import BUILD_REPORT_OUTPUT
from utils import setup_logger

logger = setup_logger("Pipeline")


class GeographyPipeline:
    """
    Main pipeline orchestrator for geography ETL operations.
    """
    
    def __init__(self):
        """
        Initialize the pipeline.
        """
        self.logger = logger
        self.stats: Dict[str, Any] = {
            'start_time': datetime.now(),
            'processors': {}
        }
    
    def run(self) -> bool:
        """
        Execute the complete geography ETL pipeline.
        
        Returns:
            True if pipeline completed successfully, False otherwise
        """
        self.logger.info("=" * 80)
        self.logger.info("Starting ColdSense AI Geography ETL Pipeline v2")
        self.logger.info("=" * 80)
        
        try:
            # Step 1: Process States
            self.logger.info("Step 1: Processing States")
            state_processor = StateProcessor()
            state_stats = state_processor.process()
            self.stats['processors']['states'] = state_stats
            
            # Step 2: Process Districts
            self.logger.info("Step 2: Processing Districts")
            district_processor = DistrictProcessor()
            district_stats = district_processor.process()
            self.stats['processors']['districts'] = district_stats
            
            # Step 3: Process Localities (with merged pincodes)
            self.logger.info("Step 3: Processing Localities (with merged postal_code)")
            locality_processor = LocalityProcessor()
            locality_stats = locality_processor.process()
            self.stats['processors']['localities'] = locality_stats
            
            # Step 4: Process Pincodes (separate table with UUIDs)
            self.logger.info("Step 4: Processing Pincodes (separate table with UUIDs)")
            pincode_processor = PincodeProcessor()
            pincode_stats = pincode_processor.process()
            self.stats['processors']['pincodes'] = pincode_stats
            
            # Step 5: Validate Data
            self.logger.info("Step 5: Validating Data")
            validator = DataValidator()
            validation_result = validator.validate_all()
            self.stats['validation'] = validation_result
            
            # Step 6: Abort if validation fails
            if not validation_result.passed:
                self.logger.error("VALIDATION FAILED - Aborting build")
                self.logger.error("Errors:")
                for error in validation_result.errors:
                    self.logger.error(f"  - {error}")
                
                # Generate build report with failure status
                self.stats['end_time'] = datetime.now()
                self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
                self.stats['status'] = 'VALIDATION_FAILED'
                self.generate_build_report()
                
                return False
            
            self.logger.info("All validation checks passed")
            
            # Step 6: Generate Build Report
            self.logger.info("Step 6: Generating Build Report")
            self.generate_build_report()
            
            self.stats['end_time'] = datetime.now()
            self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
            self.stats['status'] = 'SUCCESS'
            
            self.logger.info("=" * 80)
            self.logger.info("Pipeline completed successfully")
            self.logger.info(f"Total duration: {self.stats['duration']}")
            self.logger.info("=" * 80)
            
            return True
            
        except Exception as e:
            self.stats['end_time'] = datetime.now()
            self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
            self.stats['status'] = 'FAILED'
            self.stats['error'] = str(e)
            
            self.logger.error("=" * 80)
            self.logger.error(f"Pipeline failed: {str(e)}")
            self.logger.error("=" * 80)
            
            # Generate error report
            self.generate_build_report()
            
            return False
    
    def generate_build_report(self) -> None:
        """
        Generate the build report with processing statistics and validation results.
        """
        self.logger.info("Generating build report")
        
        report_lines = []
        report_lines.append("=" * 80)
        report_lines.append("ColdSense AI Geography ETL Pipeline v2 - Build Report")
        report_lines.append("=" * 80)
        report_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append(f"Status: {self.stats.get('status', 'IN_PROGRESS')}")
        report_lines.append("")
        
        if 'duration' in self.stats:
            report_lines.append(f"Total Duration: {self.stats['duration']}")
            report_lines.append("")
        
        # Processor Statistics
        report_lines.append("PROCESSOR STATISTICS")
        report_lines.append("-" * 80)
        
        # States
        if 'states' in self.stats['processors']:
            state_stats = self.stats['processors']['states']
            report_lines.append("States Imported:")
            report_lines.append(f"  Raw Rows: {state_stats.get('raw_rows', 0)}")
            report_lines.append(f"  Transformed Rows: {state_stats.get('transformed_rows', 0)}")
            report_lines.append(f"  Unique States: {state_stats.get('unique_states', 0)}")
            if 'duplicate_states_removed' in state_stats:
                report_lines.append(f"  Duplicate States Removed: {state_stats['duplicate_states_removed']}")
            report_lines.append("")
        
        # Districts
        if 'districts' in self.stats['processors']:
            district_stats = self.stats['processors']['districts']
            report_lines.append("Districts Imported:")
            report_lines.append(f"  Raw Rows: {district_stats.get('raw_rows', 0)}")
            report_lines.append(f"  Transformed Rows: {district_stats.get('transformed_rows', 0)}")
            report_lines.append(f"  Unique Districts: {district_stats.get('unique_districts', 0)}")
            if 'duplicate_districts_removed' in district_stats:
                report_lines.append(f"  Duplicate Districts Removed: {district_stats['duplicate_districts_removed']}")
            report_lines.append("")
        
        # Localities
        if 'localities' in self.stats['processors']:
            locality_stats = self.stats['processors']['localities']
            report_lines.append("Localities Imported:")
            report_lines.append(f"  Raw Rows: {locality_stats.get('raw_rows', 0)}")
            report_lines.append(f"  Transformed Rows: {locality_stats.get('transformed_rows', 0)}")
            report_lines.append(f"  Unique Localities: {locality_stats.get('unique_localities', 0)}")
            if 'duplicate_localities_removed' in locality_stats:
                report_lines.append(f"  Duplicate Localities Removed: {locality_stats['duplicate_localities_removed']}")
            report_lines.append("")
        
        # Pincodes
        if 'pincodes' in self.stats['processors']:
            pincode_stats = self.stats['processors']['pincodes']
            report_lines.append("Pincodes Imported:")
            report_lines.append(f"  Raw Rows: {pincode_stats.get('raw_rows', 0)}")
            report_lines.append(f"  Transformed Rows: {pincode_stats.get('transformed_rows', 0)}")
            report_lines.append(f"  Unique Pincodes: {pincode_stats.get('unique_pincodes', 0)}")
            if 'duplicate_pincodes_removed' in pincode_stats:
                report_lines.append(f"  Duplicate Pincodes Removed: {pincode_stats['duplicate_pincodes_removed']}")
            report_lines.append("")
        
        # Validation Section
        if 'validation' in self.stats:
            validation_result = self.stats['validation']
            report_lines.append("VALIDATION RESULTS")
            report_lines.append("-" * 80)
            
            # Overall totals
            report_lines.append("Total Records:")
            if 'states' in validation_result.stats:
                report_lines.append(f"  Total States: {validation_result.stats['states'].get('total_states', 0)}")
            if 'districts' in validation_result.stats:
                report_lines.append(f"  Total Districts: {validation_result.stats['districts'].get('total_districts', 0)}")
            if 'localities' in validation_result.stats:
                report_lines.append(f"  Total Localities: {validation_result.stats['localities'].get('total_localities', 0)}")
            if 'pincodes' in validation_result.stats:
                report_lines.append(f"  Total Pincodes: {validation_result.stats['pincodes'].get('total_pincodes', 0)}")
            report_lines.append("")
            
            # Duplicate removal
            report_lines.append("Duplicate Rows Removed:")
            total_duplicates = 0
            if 'states' in validation_result.stats and 'duplicate_state_codes' in validation_result.stats['states']:
                report_lines.append(f"  States: {validation_result.stats['states']['duplicate_state_codes']}")
                total_duplicates += validation_result.stats['states']['duplicate_state_codes']
            if 'districts' in validation_result.stats and 'duplicate_district_combinations' in validation_result.stats['districts']:
                report_lines.append(f"  Districts: {validation_result.stats['districts']['duplicate_district_combinations']}")
                total_duplicates += validation_result.stats['districts']['duplicate_district_combinations']
            if 'localities' in validation_result.stats and 'duplicate_locality_combinations' in validation_result.stats['localities']:
                report_lines.append(f"  Localities: {validation_result.stats['localities']['duplicate_locality_combinations']}")
                total_duplicates += validation_result.stats['localities']['duplicate_locality_combinations']
            if 'pincodes' in validation_result.stats and 'duplicate_pincode_combinations' in validation_result.stats['pincodes']:
                report_lines.append(f"  Pincodes: {validation_result.stats['pincodes']['duplicate_pincode_combinations']}")
                total_duplicates += validation_result.stats['pincodes']['duplicate_pincode_combinations']
            report_lines.append(f"  Total Duplicates Removed: {total_duplicates}")
            report_lines.append("")
            
            # UUID validation (for pincodes)
            if 'pincodes' in validation_result.stats:
                if 'duplicate_uuids' in validation_result.stats['pincodes']:
                    report_lines.append(f"  Duplicate UUIDs in Pincodes: {validation_result.stats['pincodes']['duplicate_uuids']}")
                if 'invalid_uuids' in validation_result.stats['pincodes']:
                    report_lines.append(f"  Invalid UUIDs in Pincodes: {validation_result.stats['pincodes']['invalid_uuids']}")
                if 'missing_locality_references' in validation_result.stats['pincodes']:
                    report_lines.append(f"  Missing Locality References in Pincodes: {validation_result.stats['pincodes']['missing_locality_references']}")
                report_lines.append("")
            
            # Foreign key validation
            if 'foreign_keys' in validation_result.stats:
                fk_stats = validation_result.stats['foreign_keys']
                fk_status = "PASS" if fk_stats.get('fk_validation_passed', False) else "FAIL"
                report_lines.append(f"Foreign Key Validation: {fk_status}")
                if 'invalid_district_state_ids' in fk_stats:
                    report_lines.append(f"  Invalid district.state_id references: {fk_stats['invalid_district_state_ids']}")
                if 'invalid_locality_district_ids' in fk_stats:
                    report_lines.append(f"  Invalid locality.district_id references: {fk_stats['invalid_locality_district_ids']}")
                if 'invalid_pincode_locality_ids' in fk_stats:
                    report_lines.append(f"  Invalid pincode.locality_id references: {fk_stats['invalid_pincode_locality_ids']}")
                report_lines.append("")
            
            # Build status
            build_status = "PASS" if validation_result.passed else "FAIL"
            report_lines.append(f"Build Status: {build_status}")
            
            if validation_result.errors:
                report_lines.append("")
                report_lines.append("Validation Errors:")
                for error in validation_result.errors:
                    report_lines.append(f"  - {error}")
            
            if validation_result.warnings:
                report_lines.append("")
                report_lines.append("Validation Warnings:")
                for warning in validation_result.warnings:
                    report_lines.append(f"  - {warning}")
            
            report_lines.append("")
        
        # Summary
        report_lines.append("SUMMARY")
        report_lines.append("-" * 80)
        
        # Total duplicates from processors
        total_duplicates_removed = 0
        if 'states' in self.stats['processors'] and 'duplicate_states_removed' in self.stats['processors']['states']:
            total_duplicates_removed += self.stats['processors']['states']['duplicate_states_removed']
        if 'districts' in self.stats['processors'] and 'duplicate_districts_removed' in self.stats['processors']['districts']:
            total_duplicates_removed += self.stats['processors']['districts']['duplicate_districts_removed']
        if 'localities' in self.stats['processors'] and 'duplicate_localities_removed' in self.stats['processors']['localities']:
            total_duplicates_removed += self.stats['processors']['localities']['duplicate_localities_removed']
        if 'pincodes' in self.stats['processors'] and 'duplicate_pincodes_removed' in self.stats['processors']['pincodes']:
            total_duplicates_removed += self.stats['processors']['pincodes']['duplicate_pincodes_removed']
        
        report_lines.append(f"Total Duplicates Removed (Processing): {total_duplicates_removed}")
        
        if 'error' in self.stats:
            report_lines.append("")
            report_lines.append("ERROR DETAILS")
            report_lines.append("-" * 80)
            report_lines.append(f"Error: {self.stats['error']}")
        
        report_lines.append("=" * 80)
        
        # Write report to file
        report_content = "\n".join(report_lines)
        with open(BUILD_REPORT_OUTPUT, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        self.logger.info(f"Build report saved to {BUILD_REPORT_OUTPUT}")
        
        # Also log to console
        self.logger.info("\n" + report_content)


def main():
    """
    Main entry point for the pipeline.
    """
    pipeline = GeographyPipeline()
    success = pipeline.run()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
