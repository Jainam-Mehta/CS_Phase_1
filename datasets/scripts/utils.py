"""
Utility functions for the ColdSense AI Geography ETL Pipeline.
"""

import logging
import pandas as pd
from typing import List, Set
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('etl_pipeline.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def setup_logger(name: str) -> logging.Logger:
    """
    Create and configure a logger for a specific module.
    
    Args:
        name: Name of the logger
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def validate_file_exists(file_path: Path) -> bool:
    """
    Validate that a file exists and is readable.
    
    Args:
        file_path: Path to the file to validate
        
    Returns:
        True if file exists and is readable, False otherwise
    """
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        return False
    
    if not file_path.is_file():
        logger.error(f"Path is not a file: {file_path}")
        return False
    
    return True


def load_csv_safely(file_path: Path, **kwargs) -> pd.DataFrame:
    """
    Safely load a CSV file with error handling.
    
    Args:
        file_path: Path to the CSV file
        **kwargs: Additional arguments to pass to pd.read_csv
        
    Returns:
        DataFrame with the loaded data
        
    Raises:
        FileNotFoundError: If file doesn't exist
        pd.errors.EmptyDataError: If file is empty
        Exception: For other loading errors
    """
    if not validate_file_exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    try:
        logger.info(f"Loading CSV file: {file_path}")
        df = pd.read_csv(file_path, **kwargs)
        logger.info(f"Successfully loaded {len(df)} rows from {file_path}")
        return df
    except pd.errors.EmptyDataError:
        logger.error(f"File is empty: {file_path}")
        raise
    except Exception as e:
        logger.error(f"Error loading CSV file {file_path}: {str(e)}")
        raise


def save_csv_safely(df: pd.DataFrame, file_path: Path, **kwargs) -> None:
    """
    Safely save a DataFrame to CSV with error handling.
    
    Args:
        df: DataFrame to save
        file_path: Path where to save the CSV
        **kwargs: Additional arguments to pass to df.to_csv
    """
    try:
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Saving CSV file: {file_path}")
        df.to_csv(file_path, index=False, **kwargs)
        logger.info(f"Successfully saved {len(df)} rows to {file_path}")
    except Exception as e:
        logger.error(f"Error saving CSV file {file_path}: {str(e)}")
        raise


def normalize_text(text: str, remove_suffixes: List[str] = None) -> str:
    """
    Normalize text by removing suffixes, trimming spaces, and converting to title case.
    
    Args:
        text: Text to normalize
        remove_suffixes: List of suffixes to remove
        
    Returns:
        Normalized text
    """
    if pd.isna(text) or text is None:
        return ""
    
    text = str(text).strip()
    
    # Remove specified suffixes
    if remove_suffixes:
        for suffix in remove_suffixes:
            if text.endswith(suffix):
                text = text[:-len(suffix)].strip()
    
    # Convert to title case
    text = text.title()
    
    return text


def remove_duplicates(df: pd.DataFrame, subset: List[str] = None, keep: str = 'first') -> pd.DataFrame:
    """
    Remove duplicate rows from a DataFrame.
    
    Args:
        df: DataFrame to process
        subset: Columns to consider for duplicate detection
        keep: Which duplicate to keep ('first', 'last', or False)
        
    Returns:
        DataFrame with duplicates removed
    """
    initial_count = len(df)
    df_cleaned = df.drop_duplicates(subset=subset, keep=keep)
    removed_count = initial_count - len(df_cleaned)
    
    if removed_count > 0:
        logger.info(f"Removed {removed_count} duplicate rows")
    
    return df_cleaned


def log_dataframe_info(df: pd.DataFrame, name: str) -> None:
    """
    Log information about a DataFrame.
    
    Args:
        df: DataFrame to analyze
        name: Name to use in log messages
    """
    logger.info(f"DataFrame {name} info:")
    logger.info(f"  Rows: {len(df)}")
    logger.info(f"  Columns: {len(df.columns)}")
    logger.info(f"  Columns: {list(df.columns)}")
    logger.info(f"  Memory usage: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")


def validate_columns(df: pd.DataFrame, required_columns: List[str], df_name: str) -> bool:
    """
    Validate that a DataFrame contains all required columns.
    
    Args:
        df: DataFrame to validate
        required_columns: List of required column names
        df_name: Name of the DataFrame for error messages
        
    Returns:
        True if all columns exist, False otherwise
    """
    missing_columns = set(required_columns) - set(df.columns)
    
    if missing_columns:
        logger.error(f"DataFrame {df_name} is missing required columns: {missing_columns}")
        return False
    
    return True


def get_unique_count(df: pd.DataFrame, column: str) -> int:
    """
    Get the count of unique values in a column.
    
    Args:
        df: DataFrame to analyze
        column: Column name
        
    Returns:
        Count of unique values
    """
    return df[column].nunique()
