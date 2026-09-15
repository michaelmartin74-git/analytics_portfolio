import json
from pathlib import Path
import duckdb
import pandas as pd
import pyarrow.parquet as pq

# ==============================================================================
# 1. PATH SETUP
# ==============================================================================
SCRIPTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPTS_DIR.parent

# Resolve path to the React app's public/data directory
REACT_PUBLIC_DATA_DIR = (
    PROJECT_ROOT / "dashboards" / "react" / "recalls-dashboard" / "public" / "data"
)

# Ensure the destination directory exists before writing
REACT_PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = REACT_PUBLIC_DATA_DIR / "agg_recalls_data.json"


def load_clean_parquet(filename: str) -> pd.DataFrame:
    """Reads Parquet file using PyArrow, converting string 'nan' / missing values to actual NaNs."""
    path = SCRIPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Required file not found: {path}")

    table = pq.read_table(path)
    existing_metadata = table.schema.metadata or {}
    clean_metadata = {
        k: v for k, v in existing_metadata.items() if k != b"pandas"
    }
    table = table.replace_schema_metadata(clean_metadata)

    df = table.to_pandas(types_mapper=lambda x: None)
    
    # Replace literal string representations of NaN with actual nulls across string columns
    str_cols = df.select_dtypes(include=["object", "string"]).columns
    for col in str_cols:
        df[col] = df[col].replace(["nan", "NaN", "NAN", "None", "null"], None)

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])
    return df

def generate_json_export():
    print("Loading parquet files...")
    df_date = load_clean_parquet("dim_date.parquet")
    df_agg_recalls = load_clean_parquet("agg_recalls.parquet")

    print("Executing DuckDB transformation query...")
    query = """
    SELECT 
        d.year_number,
        d.month_number,
        d.month_name,
        CAST(d.month_start_date AS STRING) AS date,
        d.months_ago,
        d.years_ago,
        COALESCE(NULLIF(a.reason_category, 'nan'), 'Other') AS reason_category,
        COALESCE(NULLIF(a.status, 'nan'), 'Unknown') AS status,
        COALESCE(NULLIF(a.voluntary_mandated, 'nan'), 'Unknown') AS voluntary_mandated,
        COALESCE(NULLIF(a.recalling_firm, 'nan'), 'Unknown') AS recalling_firm,
        COALESCE(NULLIF(a.class, 'nan'), 'Unknown') AS class,
        COALESCE(NULLIF(a.geo_state, 'nan'), 'Unknown') AS geo_state,
        COALESCE(NULLIF(a.geo_city, 'nan'), 'Unknown') AS geo_city,
        COALESCE(NULLIF(a.geo_country, 'nan'), 'Unknown') AS geo_country,
        CAST(SUM(a.recall_count) AS INT) AS recalls,
        CAST(SUM(a.event_count) AS INT) AS events,
        CAST(COUNT(DISTINCT a.recalling_firm) AS INT) AS firms,
        CAST(SUM(a.affected_skus) AS INT) AS skus,
        ROUND(AVG(a.init_to_class_days), 1) AS avg_init_to_class_days,
        ROUND(AVG(a.class_to_term_days), 1) AS avg_class_to_term_days,
        ROUND(AVG(a.init_to_term_days), 1) AS avg_init_to_term_days
    FROM df_agg_recalls a
    INNER JOIN df_date d ON d.date_sk = a.report_date_sk
    WHERE d.years_ago BETWEEN 0 AND 10
    GROUP BY ALL    
    """

    df_transformed = duckdb.query(query).df()

    # Clean out any remaining literal string 'nan' values across all columns
    df_transformed = df_transformed.replace(["nan", "NaN"], None)

    print(f"Writing {len(df_transformed)} records to JSON...")
    df_transformed.to_json(
        OUTPUT_FILE, 
        orient="records", 
        indent=2, 
        date_format="iso"
    )

    print(f"Done! Dataset saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_json_export()