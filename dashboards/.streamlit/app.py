import datetime
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
import streamlit as st
from components import render_kpi_sparkline, render_trend_chart, render_segmented_table
from pathlib import Path
import duckdb 

# 1. Configuration & Styles
st.set_page_config(layout="wide", page_title="Dashboard Template")

# Guarantees correct pathing regardless of where the terminal command is run
APP_DIR = Path(__file__).resolve().parent      # my_dbt_project/dashboards
CSS_PATH = APP_DIR / "styles.css"     
PROJECT_ROOT = APP_DIR.parent.parent                   # my_dbt_project
SCRIPTS_DIR = PROJECT_ROOT / "Scripts"

@st.cache_data(ttl="1d")
def load_all_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    
    # Define files to load
    files = ["dim_date.parquet", "fact_recalls.parquet", "agg_recalls.parquet"]
    dfs = []
    
    for filename in files:
        path = SCRIPTS_DIR / filename
        if not path.exists():
            st.error(f"File not found: {path}")
            dfs.append(pd.DataFrame())
            continue
            
        # Read as Arrow Table first to bypass PyArrow's automatic pandas_compat dtype mapper
        table = pq.read_table(path)
        
        # Strip pandas metadata to prevent PyArrow from looking for 'dbdate'
        existing_metadata = table.schema.metadata or {}
        clean_metadata = {k: v for k, v in existing_metadata.items() if k != b'pandas'}
        table = table.replace_schema_metadata(clean_metadata)
        
        # Convert to DataFrame ignoring custom extension dtypes
        df = table.to_pandas(types_mapper=lambda x: None)
        
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            
        dfs.append(df)
            
    return dfs[0], dfs[1], dfs[2]

# Unpack directly into distinct DataFrames
df_date, df_fact_recalls, df_agg_recalls = load_all_data()


# 2. Load data into dataframe
@st.cache_data
def get_main_dataframe(df_agg_recalls: pd.DataFrame, df_date: pd.DataFrame) -> pd.DataFrame:
    """Replicates the BigQuery SQL join and aggregation in-memory."""
    
    query = """
    SELECT 
        d.year_number,
        d.month_number,
        d.month_name,
        d.month_start_date AS date, -- Renamed to 'date' for components.py compatibility
        d.months_ago,
        d.years_ago,
        a.reason_category,
        a.status,
        a.voluntary_mandated,
        a.recalling_firm,
        a.class,
        a.geo_state,
        a.geo_city,
        a.geo_country,
        SUM(a.recall_count) AS recalls,
        SUM(a.event_count) AS events,
        COUNT(distinct a.recalling_firm) AS firms,
        SUM(a.affected_skus) AS skus,
        AVG(a.init_to_class_days) AS avg_init_to_class_days,
        AVG(a.class_to_term_days) AS avg_class_to_term_days,
        AVG(a.init_to_term_days) AS avg_init_to_term_days
    FROM df_agg_recalls a
    INNER JOIN df_date d
        ON d.date_sk = a.report_date_sk
    WHERE d.years_ago BETWEEN 0 AND 10
    GROUP BY ALL
    """
    
    df_transformed = duckdb.query(query).df()
    
    # Ensure date column is datetime object for Streamlit date inputs/filters
    df_transformed['date'] = pd.to_datetime(df_transformed['date'])
    
    return df_transformed

# Initialize main DataFrame
df = get_main_dataframe(df_agg_recalls, df_date)

# 3. Apply Dashboard Styling
with open(CSS_PATH) as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    

# 4. Native Collapsible Sidebar Filters
# Fallback bounds from current dataset
min_data_date = df['date'].min().date()
max_data_date = df['date'].max().date()

with st.sidebar:
    st.subheader("Filters")
    
    preset = st.selectbox(
        "Date Range Preset",
        options=[
            "Last Month",      # 0
            "Last 6 Months",   # 1
            "Current Year",    # 2
            "Last Year",       # 3
            "Custom",          # 4
            "All Time"         # 5
        ],
        index=2  # Default to 'Current Year'
    )

    if preset == "Last Month":
        # Uses dim_date flag: e.g., is_last_month == True or months_ago == 1
        subset = df[df['months_ago'] == 1]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "Last 6 Months":
        # Uses relative month offset: e.g., months_ago between 1 and 6 (or <= 6)
        subset = df[(df['months_ago'] >= 1) & (df['months_ago'] <= 6)]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "Current Year":
        # Uses dim_date flag: e.g., is_current_year == True or years_ago == 0
        subset = df[df['years_ago'] == 0]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "Last Year":
        # Uses dim_date flag: e.g., is_last_year == True or years_ago == 1
        subset = df[df['years_ago'] == 1]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "All Time":
        start_date = min_data_date
        end_date = max_data_date

    elif preset == "Custom":
        # Generates rolling 24 months ago as default start date
        subset = df[df['months_ago'] == 24]
        default_start_date = subset['date'].min().date() if not subset.empty else min_data_date
        date_range = st.date_input(
            "Select Dates",
            value=(default_start_date, max_data_date),
            min_value=min_data_date,
            max_value=max_data_date
        )
        start_date = date_range[0] if len(date_range) > 0 else min_data_date
        end_date = date_range[1] if len(date_range) > 1 else max_data_date

# 5. Title & Subtitle Header Block
st.markdown('<div class="app-title">Global Food Recalls</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="app-subtitle">'
    'Monthly Food Enforcement Data | '
    '<span class="subtitle-qualifier">Rolling 10 Years</span>'
    '</div>', 
    unsafe_allow_html=True
)

# 6. Main Layout Containers (Simulated Ratio: 15% | 30% | 55%)

# Container 1: KPI Cards + Sparklines (15% Vertical Section)
with st.container():
    kpi_cols = st.columns(4)
    metrics_config = [
        ("recalls", "Total Recalls"),
        #("skus", "Affected SKUs"),
        ("firms","Affected Firms"),
        ("avg_init_to_class_days", "Avg Init-to-Class (Days)"),
        ("avg_class_to_term_days", "Avg Class-to-Term (Days)")
    ]
    
    for idx, (col_name, label) in enumerate(metrics_config):
        with kpi_cols[idx]:
            render_kpi_sparkline(df, col_name, label, start_date, end_date)

st.divider()

# Container 2: Trend Detail Chart (30% Vertical Section)
with st.container():
    col_header, col_selector = st.columns([3, 1])
    with col_header:
         st.caption("HISTORICAL TREND ANALYSIS")
    with col_selector:
        selected_metric = st.selectbox(
            "Select Metric", 
            options=[m[0] for m in metrics_config],
            format_func=lambda x: dict(metrics_config).get(x, x),
            label_visibility="collapsed"
        )

    render_trend_chart(df, selected_metric, start_date, end_date)


st.divider()

# Container 3: Crosstab of Year x Month Values (55% Vertical Section)
with st.container():
    st.caption("YEAR OVER MONTH MATRIX")
    
    # Pass selected_metric into the table component
    render_segmented_table(df, selected_metric, start_date, end_date)    

# 7. Dashboard Footer
last_refresh = df['date'].max().strftime('%Y-%m-%d')
st.markdown(f'<div class="app-footer">Last refresh date of data: {last_refresh}</div>', unsafe_allow_html=True)