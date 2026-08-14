"""
Processor for India Post Pincode data - Localities (with merged pincodes).
"""

import pandas as pd
from pathlib import Path
from typing import Dict, Any
import re
import uuid
import json

from .base_processor import BaseProcessor
from config import INDIA_POST_PINCODE_FILE, LOCALITIES_OUTPUT, DISTRICTS_OUTPUT, STATES_OUTPUT, POSTAL_SUFFIXES, DISTRICT_NORMALIZATION_MAP, LOCALITY_UUID_MAPPING_FILE
from utils import load_csv_safely, save_csv_safely, validate_columns, normalize_text


class LocalityProcessor(BaseProcessor):
    """
    Processor for India Post Pincode data - extracting localities with merged pincodes.
    """
    
    REQUIRED_COLUMNS = ['officename', 'district', 'pincode', 'statename']
    OUTPUT_COLUMNS = ['id', 'district_id', 'name', 'postal_code']
    
    def __init__(self):
        super().__init__("LocalityProcessor")
        self.district_mapping = {}
        self.district_name_fallback = {}
    
    def extract(self) -> pd.DataFrame:
        """
        Extract pincode data from India Post file.
        
        Returns:
            DataFrame with raw pincode data
        """
        self.logger.info("Extracting pincode data from India Post file")
        
        df = load_csv_safely(
            INDIA_POST_PINCODE_FILE,
            encoding='utf-8'
        )
        
        # Validate required columns
        if not validate_columns(df, self.REQUIRED_COLUMNS, "India Post Pincode"):
            raise ValueError("India Post Pincode file is missing required columns")
        
        self.update_stats('raw_rows', len(df))
        return df
    
    def load_district_mapping(self) -> None:
        """
        Load district name to district ID mapping from processed districts file.
        Uses (State + District) composite key for more accurate matching.
        """
        self.logger.info("Loading district mapping from processed districts file")
        
        if not DISTRICTS_OUTPUT.exists():
            raise FileNotFoundError(f"Districts file not found: {DISTRICTS_OUTPUT}. Please run DistrictProcessor first.")
        
        if not STATES_OUTPUT.exists():
            raise FileNotFoundError(f"States file not found: {STATES_OUTPUT}. Please run StateProcessor first.")
        
        districts_df = load_csv_safely(DISTRICTS_OUTPUT, encoding='utf-8')
        states_df = load_csv_safely(STATES_OUTPUT, encoding='utf-8')
        
        # Create state_id to state_name mapping
        state_id_to_name = dict(zip(states_df['id'], states_df['name']))
        
        # Create mapping from (state_name, district_name) to district_id (UUID)
        self.district_mapping = {}
        for _, row in districts_df.iterrows():
            state_name = state_id_to_name.get(row['state_id'], '').lower()
            district_name = row['name'].lower()
            composite_key = (state_name, district_name)
            self.district_mapping[composite_key] = row['id']  # This is now a UUID
        
        # Also create a fallback mapping for district name only (for backward compatibility)
        self.district_name_fallback = dict(zip(
            districts_df['name'].str.lower(),
            districts_df['id']  # This is now a UUID
        ))
        
        self.logger.info(f"Loaded mapping for {len(self.district_mapping)} (state, district) combinations")
        self.logger.info(f"Loaded fallback mapping for {len(self.district_name_fallback)} district names")
    
    def normalize_district_name(self, district_name: str) -> str:
        """
        Normalize district name for matching.
        
        Args:
            district_name: Raw district name
            
        Returns:
            Normalized district name
        """
        if pd.isna(district_name) or district_name is None:
            return ""
        
        # Convert to lowercase and strip
        normalized = str(district_name).lower().strip()
        
        # Apply normalization mapping first
        if normalized in DISTRICT_NORMALIZATION_MAP:
            normalized = DISTRICT_NORMALIZATION_MAP[normalized].lower()
        
        # Remove common suffixes/prefixes
        # Remove 'district' suffix
        normalized = re.sub(r'\s+district\s*$', '', normalized)
        # Remove 'district' prefix
        normalized = re.sub(r'^district\s+', '', normalized)
        
        return normalized.strip()
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform pincode data to extract localities with merged pincodes matching Supabase schema.
        
        Args:
            df: Raw pincode data
            
        Returns:
            Transformed locality data with postal_code
        """
        self.logger.info("Transforming pincode data to extract localities with merged pincodes")
        
        # Load district mapping
        self.load_district_mapping()
        
        # Select required columns
        df_transformed = df[self.REQUIRED_COLUMNS].copy()
        
        # Normalize state names from India Post data
        df_transformed['normalized_state'] = df_transformed['statename'].str.lower().str.strip()
        
        # Normalize district names from India Post data
        df_transformed['normalized_district'] = df_transformed['district'].apply(self.normalize_district_name)
        
        # Try composite key mapping first (state + district)
        df_transformed['composite_key'] = df_transformed.apply(
            lambda row: (row['normalized_state'], row['normalized_district']),
            axis=1
        )
        df_transformed['district_id'] = df_transformed['composite_key'].map(self.district_mapping)
        
        # Fallback to district name only for unmapped districts
        unmapped_mask = df_transformed['district_id'].isna()
        if unmapped_mask.any():
            self.logger.info(f"Using fallback mapping for {unmapped_mask.sum()} unmapped districts")
            df_transformed.loc[unmapped_mask, 'district_id'] = df_transformed.loc[unmapped_mask, 'normalized_district'].map(
                self.district_name_fallback
            )
        
        # Check for unmapped districts
        unmapped_districts = df_transformed[df_transformed['district_id'].isna()]
        if not unmapped_districts.empty:
            unmapped_district_names = unmapped_districts['normalized_district'].unique()
            self.logger.warning(f"Found {len(unmapped_districts)} localities with unmapped districts: {unmapped_district_names[:10]}")
            df_transformed = df_transformed[df_transformed['district_id'].notna()]
        
        # Normalize locality names
        df_transformed['name'] = df_transformed['officename'].apply(
            lambda x: normalize_text(x, POSTAL_SUFFIXES)
        )
        
        # Remove empty locality names
        df_transformed = df_transformed[df_transformed['name'].str.len() > 0]
        
        # Clean pincodes - ensure it's a string and remove any non-digit characters
        df_transformed['postal_code'] = df_transformed['pincode'].astype(str).str.extract(r'(\d+)')[0]
        
        # Remove invalid pincodes
        df_transformed = df_transformed[df_transformed['postal_code'].notna()]
        df_transformed = df_transformed[df_transformed['postal_code'].str.len() == 6]  # Indian pincodes are 6 digits
        
        # Convert postal_code to integer
        df_transformed['postal_code'] = df_transformed['postal_code'].astype(int)
        
        # Remove duplicate localities based on district_id and name, keeping first pincode
        initial_count = len(df_transformed)
        df_transformed = df_transformed.drop_duplicates(
            subset=['district_id', 'name'], 
            keep='first'
        )
        duplicates_removed = initial_count - len(df_transformed)
        
        if duplicates_removed > 0:
            self.logger.info(f"Removed {duplicates_removed} duplicate localities")
            self.update_stats('duplicate_localities_removed', duplicates_removed)
        
        # Select columns before adding ID
        df_transformed = df_transformed[['district_id', 'name', 'postal_code']].copy()
        
        # Generate UUIDs for each locality
        df_transformed['id'] = df_transformed.apply(lambda x: str(uuid.uuid4()), axis=1)
        
        # Reorder columns to match output schema (AFTER id is created)
        df_transformed = df_transformed[self.OUTPUT_COLUMNS]
        
        self.update_stats('transformed rows', len(df_transformed))
        self.update_stats('unique_localities', df_transformed['name'].nunique())
        
        return df_transformed
    
    def load(self, df: pd.DataFrame) -> None:
        """
        Load transformed locality data to CSV and save UUID mapping.
        
        Args:
            df: Transformed locality data
        """
        self.logger.info("Loading locality data to CSV")
        
        save_csv_safely(df, LOCALITIES_OUTPUT, encoding='utf-8')
        
        # Save locality UUID mapping for PincodeProcessor to use
        self.logger.info("Saving locality UUID mapping for PincodeProcessor")
        locality_uuid_mapping = {}
        for _, row in df.iterrows():
            # Create composite key as string: "district_id|locality_name"
            key = f"{row['district_id']}|{row['name'].lower()}"
            locality_uuid_mapping[key] = row['id']
        
        # Save to JSON file
        with open(LOCALITY_UUID_MAPPING_FILE, 'w', encoding='utf-8') as f:
            json.dump(locality_uuid_mapping, f, indent=2)
        
        self.logger.info(f"Locality UUID mapping saved to {LOCALITY_UUID_MAPPING_FILE}")
        self.update_stats('output_file', str(LOCALITIES_OUTPUT))
        self.logger.info(f"Locality data saved to {LOCALITIES_OUTPUT}")
