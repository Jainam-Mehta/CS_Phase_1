"""
Processor for LGD District data.
"""

import pandas as pd
from pathlib import Path
from typing import Dict, Any
import re
import uuid

from .base_processor import BaseProcessor
from config import LGD_DISTRICT_FILE, DISTRICTS_OUTPUT, STATES_OUTPUT, DISTRICT_NORMALIZATION_MAP
from utils import load_csv_safely, save_csv_safely, validate_columns


class DistrictProcessor(BaseProcessor):
    """
    Processor for LGD District data extraction and transformation.
    """
    
    REQUIRED_COLUMNS = ['State Code', 'District Code', 'District Name']
    OUTPUT_COLUMNS = ['id', 'state_id', 'name']
    
    def __init__(self):
        super().__init__("DistrictProcessor")
        self.state_mapping = {}
    
    def extract(self) -> pd.DataFrame:
        """
        Extract district data from LGD district file.
        
        Returns:
            DataFrame with raw district data
        """
        self.logger.info("Extracting district data from LGD file")
        
        df = load_csv_safely(
            LGD_DISTRICT_FILE,
            encoding='utf-8'
        )
        
        # Validate required columns
        if not validate_columns(df, self.REQUIRED_COLUMNS, "LGD District"):
            raise ValueError("LGD District file is missing required columns")
        
        self.update_stats('raw_rows', len(df))
        return df
    
    def load_state_mapping(self) -> None:
        """
        Load state code to state ID mapping from processed states file.
        """
        self.logger.info("Loading state mapping from processed states file")
        
        if not STATES_OUTPUT.exists():
            raise FileNotFoundError(f"States file not found: {STATES_OUTPUT}. Please run StateProcessor first.")
        
        states_df = load_csv_safely(STATES_OUTPUT, encoding='utf-8')
        
        # Create mapping from code to UUID id and name
        self.state_mapping = {}
        for _, row in states_df.iterrows():
            # Convert code to string for consistent matching
            code_str = str(row['code']).strip()
            self.state_mapping[code_str] = {
                'id': row['id'],  # This is now a UUID
                'name': row['name']
            }
        
        self.logger.info(f"Loaded mapping for {len(self.state_mapping)} states")
    
    def normalize_district_name(self, district_name: str) -> str:
        """
        Normalize district name for consistency.
        
        Args:
            district_name: Raw district name
            
        Returns:
            Normalized district name
        """
        if pd.isna(district_name) or district_name is None:
            return ""
        
        # Convert to lowercase for normalization
        normalized = str(district_name).lower().strip()
        
        # Apply normalization mapping if exists
        if normalized in DISTRICT_NORMALIZATION_MAP:
            normalized = DISTRICT_NORMALIZATION_MAP[normalized].lower()
        
        # Convert back to title case for final output
        return normalized.title()
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform district data to match Supabase schema.
        
        Args:
            df: Raw district data
            
        Returns:
            Transformed district data
        """
        self.logger.info("Transforming district data")
        
        # Load state mapping
        self.load_state_mapping()
        
        # Select and rename columns
        df_transformed = df[self.REQUIRED_COLUMNS].copy()
        df_transformed.columns = ['state_code', 'district_code', 'name']
        
        # Clean district names - apply normalization
        df_transformed['name'] = df_transformed['name'].apply(self.normalize_district_name)
        
        # Convert state_code to string for mapping and strip whitespace
        df_transformed['state_code'] = df_transformed['state_code'].astype(str).str.strip()
        
        # Map state_code to state_id using the enhanced mapping
        df_transformed['state_id'] = df_transformed['state_code'].map(
            lambda x: self.state_mapping.get(x, {}).get('id') if x in self.state_mapping else None
        )
        
        # Check for unmapped states
        unmapped_states = df_transformed[df_transformed['state_id'].isna()]
        if not unmapped_states.empty:
            unmapped_state_codes = unmapped_states['state_code'].unique()
            self.logger.warning(f"Found {len(unmapped_states)} districts with unmapped state codes: {unmapped_state_codes}")
            df_transformed = df_transformed[df_transformed['state_id'].notna()]
        
        # Remove any duplicate districts based on state_id and district_code
        initial_count = len(df_transformed)
        df_transformed = df_transformed.drop_duplicates(
            subset=['state_id', 'district_code'], 
            keep='first'
        )
        duplicates_removed = initial_count - len(df_transformed)
        
        if duplicates_removed > 0:
            self.logger.info(f"Removed {duplicates_removed} duplicate districts")
            self.update_stats('duplicate_districts_removed', duplicates_removed)
        
        # Select columns before adding ID
        df_transformed = df_transformed[['state_id', 'name']].copy()
        
        # Generate UUIDs for each district
        df_transformed['id'] = df_transformed.apply(lambda x: str(uuid.uuid4()), axis=1)
        
        # Reorder columns to match output schema (AFTER id is created)
        df_transformed = df_transformed[self.OUTPUT_COLUMNS]
        
        self.update_stats('transformed_rows', len(df_transformed))
        self.update_stats('unique_districts', df_transformed['name'].nunique())
        
        return df_transformed
    
    def load(self, df: pd.DataFrame) -> None:
        """
        Load transformed district data to CSV.
        
        Args:
            df: Transformed district data
        """
        self.logger.info("Loading district data to CSV")
        
        save_csv_safely(df, DISTRICTS_OUTPUT, encoding='utf-8')
        
        self.update_stats('output_file', str(DISTRICTS_OUTPUT))
        self.logger.info(f"District data saved to {DISTRICTS_OUTPUT}")
