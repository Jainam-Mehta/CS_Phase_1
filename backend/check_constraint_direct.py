#!/usr/bin/env python3
"""
Direct PostgreSQL query to find the sensor_type CHECK constraint
"""
import os
import sys
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not set in .env")
    sys.exit(1)

# Extract host from SUPABASE_URL
# Format: https://vzoypfctadgyflzwodmp.supabase.co
project_id = SUPABASE_URL.split("//")[1].split(".")[0]
print(f"Project ID: {project_id}")

# Try using psycopg2
try:
    import psycopg2
    from psycopg2 import sql
    
    # Supabase PostgreSQL connection string
    # Format: postgresql://[user[:password]@][netloc][:port][/dbname]
    conn_str = f"postgresql://postgres:{SUPABASE_KEY}@db.{project_id}.supabase.co:5432/postgres"
    
    print(f"Attempting to connect to: postgresql://postgres:***@db.{project_id}.supabase.co:5432/postgres")
    
    conn = psycopg2.connect(conn_str)
    cursor = conn.cursor()
    
    # Query the constraint definition
    query = """
    SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
    FROM pg_constraint
    WHERE conrelid = 'public.sensor_devices'::regclass
    AND contype = 'c'
    AND conname = 'sensor_devices_sensor_type_check';
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    print("\n" + "=" * 80)
    print("CHECK CONSTRAINTS ON sensor_devices TABLE")
    print("=" * 80)
    
    if results:
        for constraint_name, constraint_def in results:
            print(f"\nConstraint Name: {constraint_name}")
            print(f"Definition: {constraint_def}")
            
            # Parse the constraint definition to extract allowed values
            # Example: CHECK (sensor_type = ANY (ARRAY['temperature'::text, 'humidity'::text, ...]))
            match = re.search(r"ARRAY\[(.*?)\]", constraint_def)
            if match:
                array_content = match.group(1)
                # Extract the values
                values = re.findall(r"'([^']+)'", array_content)
                print(f"\nAllowed sensor_type values:")
                for val in values:
                    print(f"  - {val}")
    else:
        print("No CHECK constraint found for sensor_type on sensor_devices table.")
        
        # List all check constraints on the table
        query_all = """
        SELECT 
            conname AS constraint_name,
            pg_get_constraintdef(oid) AS constraint_definition
        FROM pg_constraint
        WHERE conrelid = 'public.sensor_devices'::regclass
        AND contype = 'c';
        """
        
        cursor.execute(query_all)
        all_results = cursor.fetchall()
        
        if all_results:
            print("\nOther CHECK constraints on sensor_devices:")
            for constraint_name, constraint_def in all_results:
                print(f"  - {constraint_name}: {constraint_def}")
        else:
            print("No CHECK constraints found on sensor_devices table.")
    
    cursor.close()
    conn.close()
    
except ImportError:
    print("psycopg2 not installed. Attempting alternative method...")
    
except Exception as e:
    print(f"Error: {e}")
    print("Attempting with Supabase SQL query...")
    
    # Alternative: Use Supabase REST API to query
    try:
        from supabase import create_client, Client
        import json
        
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Create a function to query constraints (if it exists)
        query = """
        SELECT 
            conname AS constraint_name,
            pg_get_constraintdef(oid) AS constraint_definition
        FROM pg_constraint
        WHERE conrelid = 'public.sensor_devices'::regclass
        AND contype = 'c'
        AND conname = 'sensor_devices_sensor_type_check'
        """
        
        print("Query to run in Supabase SQL editor:")
        print(query)
        
    except Exception as e2:
        print(f"Alternative method failed: {e2}")

print("\nDone.")
