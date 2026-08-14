"""
Processor for LGD State data.
"""

import pandas as pd
from pathlib import Path
from typing import Dict, Any
import uuid

from .base_processor import BaseProcessor
from config import LGD_STATE_FILE, STATES_OUTPUT
from utils import load_csv_safely, save_csv_safely, validate_columns


class StateProcessor(BaseProcessor):
    """
    Processor for LGD State data extraction and transformation.
    """
    
    REQUIRED_COLUMNS = ['State Code', 'State Name']
    OUTPUT_COLUMNS = ['id', 'name', 'code']
    
    def __init__(self):
        super().__init__("StateProcessor")
    
    def extract(self) -> pd.DataFrame:
        """
        Extract state data from LGD state file.
        
        Returns:
            DataFrame with raw state data
        """
        self.logger.info("Extracting state data from LGD file")
        
        df = load_csv_safely(
            LGD_STATE_FILE,
            encoding='utf-8'
        )
        
        # Validate required columns
        if not validate_columns(df, self.REQUIRED_COLUMNS, "LGD State"):
            raise ValueError("LGD State file is missing required columns")
        
        self.update_stats('raw_rows', len(df))
        return df
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform state data to match Supabase schema.
        
        Args:
            df: Raw state data
            
        Returns:
            Transformed state data
        """
        self.logger.info("Transforming state data")
        
        # Select and rename columns
        df_transformed = df[self.REQUIRED_COLUMNS].copy()
        df_transformed.columns = ['code', 'name']
        
        # Clean state names - convert to title case
        df_transformed['name'] = df_transformed['name'].str.title().str.strip()
        
        # Remove any duplicate states based on code
        initial_count = len(df_transformed)
        df_transformed = df_transformed.drop_duplicates(subset=['code'], keep='first')
        duplicates_removed = initial_count - len(df_transformed)
        
        if duplicates_removed > 0:
            self.logger.info(f"Removed {duplicates_removed} duplicate states")
            self.update_stats('duplicate_states_removed', duplicates_removed)
        
        # Select columns before adding ID
        df_transformed = df_transformed[['name', 'code']].copy()
        
        # Generate UUIDs for each state
        df_transformed['id'] = df_transformed.apply(lambda x: str(uuid.uuid4()), axis=1)
        
        # Reorder columns to match output schema (AFTER id is created)
        df_transformed = df_transformed[self.OUTPUT_COLUMNS]
        
        self.update_stats('transformed_rows', len(df_transformed))
        self.update_stats('unique_states', df_transformed['code'].nunique())
        
        return df_transformed
    
    def load(self, df: pd.DataFrame) -> None:
        """
        Load transformed state data to CSV.
        
        Args:
            df: Transformed state data
        """
        self.logger.info("Loading state data to CSV")
        
        save_csv_safely(df, STATES_OUTPUT, encoding='utf-8')
        
        self.update_stats('output_file', str(STATES_OUTPUT))
        self.logger.info(f"State data saved to {STATES_OUTPUT}")
