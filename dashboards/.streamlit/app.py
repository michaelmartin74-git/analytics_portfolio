import datetime
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
import streamlit as st
from pathlib import Path
import duckdb

from components import (
    render_kpi_sparkline, 
    render_trend_chart, 
    render_segmented_table, 
    render_drilldown_table
)

# ==============================================================================
# 1. APP CONFIG & PATH SETUP
# ==============================================================================
st.set_page_config(layout="wide", page_title="Dashboard Template")

APP_DIR = Path(__file__).resolve().parent
CSS_PATH = APP_DIR / "styles.css"
PROJECT_ROOT = APP_DIR.parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "Scripts"

DIMENSION_FILTERS = [
    "class", "status", "reason_category", 
    "recalling_firm", "geo_state", "geo_city"
]

METRICS_CONFIG = [
    ("recalls", "Total Recalls"),
    ("firms", "Affected Firms"),
    ("avg_init_to_class_days", "Avg Init-to-Class (Days)"),
    ("avg_class_to_term_days", "Avg Class-to-Term (Days)")
]
METRIC_LABELS = dict(METRICS_CONFIG)


# ==============================================================================
# 2. DATA LOADERS & IN-MEMORY TRANSFORMS (DUCKDB)
# ==============================================================================
@st.cache_data(ttl="1d")
def load_raw_datasets() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Reads Parquet files using PyArrow, stripping custom pandas metadata."""
    files = ["dim_date.parquet", "fact_recalls.parquet", "agg_recalls.parquet"]
    dfs = []
    
    for filename in files:
        path = SCRIPTS_DIR / filename
        if not path.exists():
            st.error(f"File not found: {path}")
            dfs.append(pd.DataFrame())
            continue
            
        table = pq.read_table(path)
        existing_metadata = table.schema.metadata or {}
        clean_metadata = {k: v for k, v in existing_metadata.items() if k != b'pandas'}
        table = table.replace_schema_metadata(clean_metadata)
        
        df = table.to_pandas(types_mapper=lambda x: None)
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            
        dfs.append(df)
            
    return dfs[0], dfs[1], dfs[2]


@st.cache_data
def get_unified_analytics_frame(df_agg_recalls: pd.DataFrame, df_date: pd.DataFrame) -> pd.DataFrame:
    """Executes aggregation join via DuckDB engine."""
    query = """
    SELECT 
        d.year_number,
        d.month_number,
        d.month_name,
        d.month_start_date AS date,
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
        COUNT(DISTINCT a.recalling_firm) AS firms,
        SUM(a.affected_skus) AS skus,
        AVG(a.init_to_class_days) AS avg_init_to_class_days,
        AVG(a.class_to_term_days) AS avg_class_to_term_days,
        AVG(a.init_to_term_days) AS avg_init_to_term_days
    FROM df_agg_recalls a
    INNER JOIN df_date d ON d.date_sk = a.report_date_sk
    WHERE d.years_ago BETWEEN 0 AND 10
    GROUP BY ALL
    """
    df_transformed = duckdb.query(query).df()
    df_transformed['date'] = pd.to_datetime(df_transformed['date'])
    return df_transformed


# Load core frames
df_date, df_fact_recalls, df_agg_recalls = load_raw_datasets()
df = get_unified_analytics_frame(df_agg_recalls, df_date)


# ==============================================================================
# 3. GLOBAL STYLES & ASSETS
# ==============================================================================
if CSS_PATH.exists():
    with open(CSS_PATH) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)


# ==============================================================================
# 4. SIDEBAR & INTERACTIVE FILTERS
# ==============================================================================
min_data_date = df['date'].min().date()
max_data_date = df['date'].max().date()

def _resolve_bounds(df_subset: pd.DataFrame) -> tuple[datetime.date, datetime.date]:
    """DRY helper for computing date bounds from dynamic sub-selections."""
    if df_subset.empty:
        return min_data_date, max_data_date
    return df_subset['date'].min().date(), df_subset['date'].max().date()


selected_filters = {}

with st.sidebar:
    st.subheader("Filters")
    
    preset = st.selectbox(
        "Date Range Preset",
        options=["Last Month", "Last 6 Months", "Current Year", "Last Year", "Custom", "All Time"],
        index=2
    )

    if preset == "Last Month":
        start_date, end_date = _resolve_bounds(df[df['months_ago'] == 1])
    elif preset == "Last 6 Months":
        start_date, end_date = _resolve_bounds(df[(df['months_ago'] >= 1) & (df['months_ago'] <= 6)])
    elif preset == "Current Year":
        start_date, end_date = _resolve_bounds(df[df['years_ago'] == 0])
    elif preset == "Last Year":
        start_date, end_date = _resolve_bounds(df[df['years_ago'] == 1])
    elif preset == "All Time":
        start_date, end_date = min_data_date, max_data_date
    elif preset == "Custom":
        default_start, _ = _resolve_bounds(df[df['months_ago'] == 24])
        date_range = st.date_input(
            "Select Dates",
            value=(default_start, max_data_date),
            min_value=min_data_date,
            max_value=max_data_date
        )
        if isinstance(date_range, tuple) and len(date_range) == 2:
            start_date, end_date = date_range
        elif isinstance(date_range, tuple) and len(date_range) == 1:
            start_date, end_date = date_range[0], max_data_date
        else:
            start_date, end_date = min_data_date, max_data_date

    st.markdown("---")
    st.subheader("Dimension Filters")
    
    for col in DIMENSION_FILTERS:
        options = ["All"] + sorted(df[col].dropna().unique().tolist())
        selected_filters[col] = st.selectbox(
            col.replace("_", " ").title(),
            options=options,
            index=0,
            key=f"filter_{col}"
        )


# ==============================================================================
# 5. DATASET FILTERING PIPELINE
# ==============================================================================
# Layer 1: Apply attribute filters across the full timeframe (preserves baseline gray lines)
dim_filtered_df = df.copy()
for col, val in selected_filters.items():
    if val != "All":
        dim_filtered_df = dim_filtered_df[dim_filtered_df[col] == val]

# Layer 2: Slice filtered attributes down to selected temporal range
fully_filtered_df = dim_filtered_df[
    (dim_filtered_df['date'].dt.date >= start_date) & 
    (dim_filtered_df['date'].dt.date <= end_date)
]


# ==============================================================================
# 6. DASHBOARD HEADER
# ==============================================================================
st.markdown('<div class="app-title">Global Food Recalls</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="app-subtitle">'
    'Monthly Food Enforcement Data | '
    '<span class="subtitle-qualifier">Rolling 10 Years</span>'
    '</div>', 
    unsafe_allow_html=True
)


# ==============================================================================
# 7. VISUALIZATIONS & METRIC LAYOUT
# ==============================================================================

# Row 1: KPI Cards + Sparklines
with st.container():
    kpi_cols = st.columns(len(METRICS_CONFIG))
    for idx, (col_name, label) in enumerate(METRICS_CONFIG):
        with kpi_cols[idx]:
            render_kpi_sparkline(
                df_full=dim_filtered_df,
                df_filtered=fully_filtered_df,
                metric_col=col_name,
                title=label,
                start_date=start_date,
                end_date=end_date
            )

st.divider()

# Row 2: Trend Line Chart
with st.container():
    col_header, col_selector = st.columns([3, 1])
    with col_header:
        st.caption("HISTORICAL TREND ANALYSIS")
    with col_selector:
        active_metric_col = st.selectbox(
            "Select Metric", 
            options=[m[0] for m in METRICS_CONFIG],
            format_func=lambda x: METRIC_LABELS.get(x, x),
            label_visibility="collapsed"
        )

    render_trend_chart(
        df_full=dim_filtered_df,
        df_filtered=fully_filtered_df,
        metric_col=active_metric_col,  
        start_date=start_date,
        end_date=end_date
    )

st.divider()

# Row 3: Drilldown Table
with st.container():
    render_drilldown_table(df_filtered=dim_filtered_df)

st.divider()

# Row 4: Year x Month Matrix
with st.container():
    col_header, col_selector = st.columns([3, 1])
    with col_header:
        st.caption("YEAR OVER MONTH MATRIX")

    render_segmented_table(
        df_full=dim_filtered_df,
        df_filtered=fully_filtered_df,
        metric_col=active_metric_col,
        start_date=start_date,
        end_date=end_date
    )


# ==============================================================================
# 8. FOOTER METADATA
# ==============================================================================
last_refresh = df['date'].max().strftime('%Y-%m-%d')
st.markdown(f'<div class="app-footer">Last refresh date of data: {last_refresh}</div>', unsafe_allow_html=True)