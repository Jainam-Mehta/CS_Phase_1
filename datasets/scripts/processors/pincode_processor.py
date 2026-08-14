"""
Processor for India Post Pincode data - Pincodes (with UUID support).
"""

import pandas as pd
from pathlib import Path
from typing import Dict, Any
import re
import uuid
import json

from .base_processor import BaseProcessor
from config import INDIA_POST_PINCODE_FILE, PINCODES_OUTPUT, LOCALITIES_OUTPUT, DISTRICTS_OUTPUT, STATES_OUTPUT, POSTAL_SUFFIXES, DISTRICT_NORMALIZATION_MAP, LOCALITY_UUID_MAPPING_FILE
from utils import load_csv_safely, save_csv_safely, validate_columns, normalize_text


class PincodeProcessor(BaseProcessor):
    """
    Processor for India Post Pincode data - extracting pincodes linked to localities with UUID support.
    """
    
    REQUIRED_COLUMNS = ['officename', 'district', 'pincode', 'statename']
    OUTPUT_COLUMNS = ['id', 'locality_id', 'pincode']
    
    def __init__(self):
        super().__init__("PincodeProcessor")
        self.locality_mapping = {}
    
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
    
    def load_locality_mapping(self) -> None:
        """
        Load locality UUID mapping from the JSON file saved by LocalityProcessor.
        This ensures the exact same UUIDs are used for consistency.
        """
        self.logger.info("Loading locality UUID mapping from JSON file")
        
        if not LOCALITY_UUID_MAPPING_FILE.exists():
            raise FileNotFoundError(f"Locality UUID mapping file not found: {LOCALITY_UUID_MAPPING_FILE}. Please run LocalityProcessor first.")
        
        with open(LOCALITY_UUID_MAPPING_FILE, 'r', encoding='utf-8') as f:
            self.locality_mapping = json.load(f)
        
        self.logger.info(f"Loaded mapping for {len(self.locality_mapping)} localities from JSON file")
    
    def load_district_mapping(self) -> None:
        """
        Load district mapping using (State + District) composite key.
        """
        self.logger.info("Loading district mapping for pincode processing")
        
        if not DISTRICTS_OUTPUT.exists():
            raise FileNotFoundError(f"Districts file not found: {DISTRICTS_OUTPUT}. Please run DistrictProcessor first.")
        
        if not STATES_OUTPUT.exists():
            raise FileNotFoundError(f"States file not found: {STATES_OUTPUT}. Please run StateProcessor first.")
        
        districts_df = load_csv_safely(DISTRICTS_OUTPUT, encoding='utf-8')
        states_df = load_csv_safely(STATES_OUTPUT, encoding='utf-8')
        
        # Create state_id to state_name mapping
        state_id_to_name = dict(zip(states_df['id'], states_df['name']))
        
        # Create mapping from (state_name, district_name) to district UUID ID
        self.district_mapping = {}
        for _, row in districts_df.iterrows():
            state_name = state_id_to_name.get(row['state_id'], '').lower()
            district_name = row['name'].lower()
            composite_key = (state_name, district_name)
            self.district_mapping[composite_key] = row['id']  # This is now a UUID
        
        # Fallback mapping for district name only
        self.district_name_fallback = dict(zip(
            districts_df['name'].str.lower(),
            districts_df['id']  # This is now a UUID
        ))
        
        self.logger.info(f"Loaded mapping for {len(self.district_mapping)} (state, district) combinations")
    
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
        normalized = re.sub(r'\s+district\s*$', '', normalized)
        normalized = re.sub(r'^district\s+', '', normalized)
        
        return normalized.strip()
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform pincode data to extract pincodes matching Supabase schema with UUID support.
        
        Args:
            df: Raw pincode data
            
        Returns:
            Transformed pincode data with UUIDs
        """
        self.logger.info("Transforming pincode data to extract pincodes with UUID support")
        
        # Load locality mapping
        self.load_locality_mapping()
        
        # Load district mapping
        self.load_district_mapping()
        
        # Select required columns
        df_transformed = df[self.REQUIRED_COLUMNS].copy()
        
        # Normalize state names from India Post data
        df_transformed['normalized_state'] = df_transformed['statename'].str.lower().str.strip()
        
        # Normalize district names
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
        
        # Remove rows with unmapped districts
        df_transformed = df_transformed[df_transformed['district_id'].notna()]
        
        # Normalize locality names
        df_transformed['locality_name'] = df_transformed['officename'].apply(
            lambda x: normalize_text(x, POSTAL_SUFFIXES)
        )
        
        # Remove empty locality names
        df_transformed = df_transformed[df_transformed['locality_name'].str.len() > 0]
        
        # Create composite key for locality mapping
        df_transformed['locality_key'] = df_transformed.apply(
            lambda row: f"{row['district_id']}|{row['locality_name'].lower()}",
            axis=1
        )
        
        # Map to locality UUID ID
        df_transformed['locality_id'] = df_transformed['locality_key'].map(self.locality_mapping)
        
        # Remove rows with unmapped localities
        unmapped_localities = df_transformed[df_transformed['locality_id'].isna()]
        if not unmapped_localities.empty:
            self.logger.error(f"Found {len(unmapped_localities)} pincodes with unmapped localities")
            self.logger.error("This indicates a UUID mapping bug - all locality_id values must exist in the mapping")
            self.logger.error("Sample unmapped localities:")
            sample_unmapped = unmapped_localities.head(5)
            for _, row in sample_unmapped.iterrows():
                self.logger.error(f"  District ID: {row['district_id']}, Locality Name: {row['locality_name']}")
            raise ValueError(f"UUID mapping bug: {len(unmapped_localities)} pincodes have locality_id values that don't exist in the locality UUID mapping")
        
        # Validate that every locality_id in the result exists in the localities.csv
        self.logger.info("Validating that all locality_ids exist in localities.csv")
        localities_df = load_csv_safely(LOCALITIES_OUTPUT, encoding='utf-8')
        valid_locality_ids = set(localities_df['id'].astype(str).tolist())
        
        invalid_locality_ids = set(df_transformed['locality_id'].astype(str).tolist()) - valid_locality_ids
        if invalid_locality_ids:
            self.logger.error(f"Found {len(invalid_locality_ids)} invalid locality_id references that don't exist in localities.csv")
            self.logger.error("This indicates a UUID consistency bug between processors")
            raise ValueError(f"UUID consistency bug: {len(invalid_locality_ids)} locality_id values in pincodes don't exist in localities.csv")
        
        self.logger.info("All locality_id values validated successfully against localities.csv")
        
        # Clean pincode - ensure it's a string and remove any non-digit characters
        df_transformed['pincode'] = df_transformed['pincode'].astype(str).str.extract(r'(\d+)')[0]
        
        # Remove invalid pincodes
        df_transformed = df_transformed[df_transformed['pincode'].notna()]
        df_transformed = df_transformed[df_transformed['pincode'].str.len() == 6]  # Indian pincodes are 6 digits
        
        # Keep pincode as string for Supabase VARCHAR column
        df_transformed['pincode'] = df_transformed['pincode'].astype(str)
        
        # Remove duplicate pincodes based on locality_id and pincode
        initial_count = len(df_transformed)
        df_transformed = df_transformed.drop_duplicates(
            subset=['locality_id', 'pincode'], 
            keep='first'
        )
        duplicates_removed = initial_count - len(df_transformed)
        
        if duplicates_removed > 0:
            self.logger.info(f"Removed {duplicates_removed} duplicate pincodes")
            self.update_stats('duplicate_pincodes_removed', duplicates_removed)
        
        # Select columns before adding ID
        df_transformed = df_transformed[['locality_id', 'pincode']].copy()
        
        # Generate UUIDs for each pincode
        df_transformed['id'] = df_transformed.apply(lambda x: str(uuid.uuid4()), axis=1)
        
        # Reorder columns to match output schema (AFTER id is created)
        df_transformed = df_transformed[self.OUTPUT_COLUMNS]
        
        self.update_stats('transformed_rows', len(df_transformed))
        self.update_stats('unique_pincodes', df_transformed['pincode'].nunique())
        
        return df_transformed
    
    def load(self, df: pd.DataFrame) -> None:
        """
        Load transformed pincode data to CSV.
        
        Args:
            df: Transformed pincode data
        """
        self.logger.info("Loading pincode data to CSV")
        
        save_csv_safely(df, PINCODES_OUTPUT, encoding='utf-8')
        
        self.update_stats('output_file', str(PINCODES_OUTPUT))
        self.logger.info(f"Pincode data saved to {PINCODES_OUTPUT}")
