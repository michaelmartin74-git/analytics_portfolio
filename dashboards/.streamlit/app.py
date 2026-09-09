import datetime
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
import streamlit as st
from components import render_kpi_sparkline, render_trend_chart, render_segmented_table, render_drilldown_table
from pathlib import Path
import duckdb 

# 1. Configuration & Styles
st.set_page_config(layout="wide", page_title="Dashboard Template")

# 2. Anchors paths for app references
# Guarantees correct pathing regardless of where the terminal command is run
APP_DIR = Path(__file__).resolve().parent      # my_dbt_project/dashboards
CSS_PATH = APP_DIR / "styles.css"     
PROJECT_ROOT = APP_DIR.parent.parent                   # my_dbt_project
SCRIPTS_DIR = PROJECT_ROOT / "Scripts"

# 3. Loads initial dataframes into separate objects
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


# 3. Joins dataframes into unified object
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

# 4. Apply Dashboard Styling
with open(CSS_PATH) as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# 5. Sidebar & Filters

# a. set min and max dates for timeframe range
min_data_date = df['date'].min().date()
max_data_date = df['date'].max().date()

# b. Define dimensions in rendering order
DIMENSION_FILTERS = ["class", "status", "reason_category", "recalling_firm", "geo_state", "geo_city"]

# Dictionary to store active user selections
selected_filters = {}

# c. Sidebar config: timeframe presets, dimension filter loop
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
        subset = df[df['months_ago'] == 1]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "Last 6 Months":
        subset = df[(df['months_ago'] >= 1) & (df['months_ago'] <= 6)]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "Current Year":
        subset = df[df['years_ago'] == 0]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "Last Year":
        subset = df[df['years_ago'] == 1]
        start_date = subset['date'].min().date() if not subset.empty else min_data_date
        end_date = subset['date'].max().date() if not subset.empty else max_data_date

    elif preset == "All Time":
        start_date = min_data_date
        end_date = max_data_date

    elif preset == "Custom":
        subset = df[df['months_ago'] == 24]
        default_start_date = subset['date'].min().date() if not subset.empty else min_data_date
        date_range = st.date_input(
            "Select Dates",
            value=(default_start_date, max_data_date),
            min_value=min_data_date,
            max_value=max_data_date
        )
        # Safe tuple unpacking in case input is cleared or partial
        if isinstance(date_range, tuple) and len(date_range) == 2:
            start_date, end_date = date_range
        elif isinstance(date_range, tuple) and len(date_range) == 1:
            start_date = date_range[0]
            end_date = max_data_date
        else:
            start_date, end_date = min_data_date, max_data_date
        
    st.markdown("---")
    st.subheader("Dimension Filters")
    
    # Render all dimension dropdowns
    for col in DIMENSION_FILTERS:
        label = col.replace("_", " ").title()
        options = ["All"] + sorted(df[col].dropna().unique().tolist())
        
        selected_filters[col] = st.selectbox(
            label,
            options=options,
            index=0,
            key=f"filter_{col}"
        )


# d. Apply selected filters above to dataframe

# d.1: Apply Dimension Filters across FULL date range (for gray sparkline baseline)
dim_filtered_df = df.copy()
for col, selected_value in selected_filters.items():
    if selected_value != "All":
        dim_filtered_df = dim_filtered_df[dim_filtered_df[col] == selected_value]

# d.2: Apply Date Range Filter on top of dimensions (for blue highlight & metrics)
fully_filtered_df = dim_filtered_df[
    (dim_filtered_df['date'].dt.date >= start_date) & 
    (dim_filtered_df['date'].dt.date <= end_date)
]

# 6. Dasboard Header
st.markdown('<div class="app-title">Global Food Recalls</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="app-subtitle">'
    'Monthly Food Enforcement Data | '
    '<span class="subtitle-qualifier">Rolling 10 Years</span>'
    '</div>', 
    unsafe_allow_html=True
)


# 7. Main Layout Containers (Simulated Ratio: 15% | 30% | 55%)

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
            render_kpi_sparkline(
                df_full=dim_filtered_df,
                df_filtered=fully_filtered_df,
                metric_col=col_name,
                title=label,
                start_date=start_date,
                end_date=end_date
            )

st.divider()

# Container 2: Trend Detail Chart (30% Vertical Section)
with st.container():
    col_header, col_selector = st.columns([3, 1])
    with col_header:
         st.caption("HISTORICAL TREND ANALYSIS")
    with col_selector:
        active_metric_col = st.selectbox(
            "Select Metric", 
            options=[m[0] for m in metrics_config],
            format_func=lambda x: dict(metrics_config).get(x, x),
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


# Container 3: Crosstab of Recall Details
with st.container():
    render_drilldown_table(df_filtered=dim_filtered_df)

    
st.divider()


# Container 4: Crosstab of Year x Month Values (55% Vertical Section)
with st.container():
    #st.caption("YEAR OVER MONTH MATRIX")
    
    # Pass selected_metric into the table component
    #render_segmented_table(df, selected_metric, start_date, end_date)
    
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


# 8. Dashboard Footer
last_refresh = df['date'].max().strftime('%Y-%m-%d')