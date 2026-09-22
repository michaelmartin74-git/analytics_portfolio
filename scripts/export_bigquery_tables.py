import os
from pathlib import Path
import pandas as pd
from google.cloud import bigquery

client = bigquery.Client()

# Get target project and dataset dynamically
project_id = os.getenv("DBT_BIGQUERY_PROJECT")
dataset_id = os.getenv("DBT_BIGQUERY_DATASET")

# Define output directory (relative to this script's location)
SCRIPTS_DIR = Path(__file__).parent

# Map BigQuery table IDs to target Parquet filenames
TABLES_TO_EXPORT = {
    f"{project_id}.{dataset_id}.dim_date": "dim_date.parquet",
    f"{project_id}.{dataset_id}.fact_fda__food_enforcements_enriched": "fact_recalls.parquet",
    f"{project_id}.{dataset_id}.agg_fda__food_enforcements": "agg_recalls.parquet",
}

for table_id, filename in TABLES_TO_EXPORT.items():
    print(f"Exporting {table_id}...")
    query = f"SELECT * FROM `{table_id}`"
    df = client.query(query).to_dataframe()
    output_path = SCRIPTS_DIR / filename
    df.to_parquet(output_path, index=False)
    print(f"  --> Saved to {output_path}")

print("All exports complete!")