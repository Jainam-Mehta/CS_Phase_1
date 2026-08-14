"""
Base processor class for ETL operations.
"""

from abc import ABC, abstractmethod
import pandas as pd
from pathlib import Path
from typing import Dict, Any
import logging

from utils import setup_logger, log_dataframe_info


class BaseProcessor(ABC):
    """
    Abstract base class for all ETL processors.
    """
    
    def __init__(self, name: str):
        """
        Initialize the processor.
        
        Args:
            name: Name of the processor for logging
        """
        self.name = name
        self.logger = setup_logger(name)
        self.stats: Dict[str, Any] = {}
    
    @abstractmethod
    def extract(self) -> pd.DataFrame:
        """
        Extract data from source.
        
        Returns:
            DataFrame with extracted data
        """
        pass
    
    @abstractmethod
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform the extracted data.
        
        Args:
            df: DataFrame with extracted data
            
        Returns:
            DataFrame with transformed data
        """
        pass
    
    @abstractmethod
    def load(self, df: pd.DataFrame) -> None:
        """
        Load the transformed data to destination.
        
        Args:
            df: DataFrame with transformed data
        """
        pass
    
    def process(self) -> Dict[str, Any]:
        """
        Execute the complete ETL process.
        
        Returns:
            Dictionary with processing statistics
        """
        self.logger.info(f"Starting {self.name} processor")
        
        try:
            # Extract
            self.logger.info("Extract phase")
            df = self.extract()
            log_dataframe_info(df, f"{self.name}_extracted")
            
            # Transform
            self.logger.info("Transform phase")
            df_transformed = self.transform(df)
            log_dataframe_info(df_transformed, f"{self.name}_transformed")
            
            # Load
            self.logger.info("Load phase")
            self.load(df_transformed)
            
            self.logger.info(f"Completed {self.name} processor successfully")
            return self.stats
            
        except Exception as e:
            self.logger.error(f"Error in {self.name} processor: {str(e)}")
            raise
    
    def update_stats(self, key: str, value: Any) -> None:
        """
        Update processing statistics.
        
        Args:
            key: Statistic key
            value: Statistic value
        """
        self.stats[key] = value
