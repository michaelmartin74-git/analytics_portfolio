import datetime
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
import streamlit as st
from components import render_kpi_sparkline, render_segmented_table, render_trend_chart
from pathlib import Path

# Guarantees correct pathing regardless of where the terminal command is run
APP_DIR = Path(__file__).resolve().parent      # my_dbt_project/dashboards
CSS_PATH = APP_DIR / "styles.css"     
PROJECT_ROOT = APP_DIR.parent.parent                   # my_dbt_project
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

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
df_date, df_metrics, df_segment = load_all_data()

with open(CSS_PATH) as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# 1. Configuration & Styles
st.set_page_config(layout="wide", page_title="Executive Dashboard Template")

# 2. Mock Data Generator
@st.cache_data
def load_data():
    dates = pd.date_range(start="2024-01-01", end="2026-08-31", freq="M")
    np.random.seed(42)
    segments = ["North America", "EMEA", "APAC", "LATAM"]
    
    rows = []
    for d in dates:
        for seg in segments:
            rows.append({
                "date": d,
                "region": seg,
                "metric_a": np.random.randint(100, 500),
                "metric_b": np.random.uniform(10.0, 85.0),
                "metric_c": np.random.randint(1000, 5000),
                "metric_d": np.random.uniform(1.0, 5.0)
            })
    return pd.DataFrame(rows)

df = load_data()

# 3. Native Collapsible Sidebar Filters
with st.sidebar:
    st.subheader("Filters")
    min_date = df['date'].min().to_pydatetime()
    max_date = df['date'].max().to_pydatetime()
    
    date_range = st.date_input(
        "Date Range",
        value=(datetime.date(2025, 1, 1), max_date),
        min_value=min_date,
        max_value=max_date
    )
    
    start_date = date_range[0] if len(date_range) > 0 else min_date
    end_date = date_range[1] if len(date_range) > 1 else max_date

# 4. Title & Subtitle Header Block
st.markdown('<div class="app-title">Executive Performance Overview</div>', unsafe_allow_html=True)
st.markdown('<div class="app-subtitle">Enterprise Data Service Engine</div>', unsafe_allow_html=True)

# 5. Main Layout Containers (Simulated Ratio: 15% | 30% | 55%)

# Container 1: KPI Cards + Sparklines (15% Vertical Section)
with st.container():
    kpi_cols = st.columns(4)
    metrics_config = [
        ("metric_a", "Revenue"),
        ("metric_b", "Margin %"),
        ("metric_c", "Volume"),
        ("metric_d", "Churn Rate")
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
            options=["metric_a", "metric_b", "metric_c", "metric_d"],
            format_func=lambda x: dict(metrics_config).get(x, x),
            label_visibility="collapsed"
        )
    
    render_trend_chart(df, selected_metric, start_date, end_date)

st.divider()

# Container 3: Segmented Data Matrix (55% Vertical Section)
with st.container():
    col_tab_header, col_segment_selector = st.columns([3, 1])
    with col_tab_header:
        st.caption("DIMENSIONAL SEGMENTATION MATRIX")
    with col_segment_selector:
        segment_by = st.selectbox(
            "Segment By", 
            options=["region"], 
            label_visibility="collapsed"
        )
    
    render_segmented_table(df, segment_by, start_date, end_date)

# 6. Dashboard Footer
last_refresh = df['date'].max().strftime('%Y-%m-%d')
st.markdown(f'<div class="app-footer">Last refresh date of data: {last_refresh}</div>', unsafe_allow_html=True)