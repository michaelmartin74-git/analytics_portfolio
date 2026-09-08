import plotly.graph_objects as go
import pandas as pd
import streamlit as st


def render_kpi_sparkline(df: pd.DataFrame, metric_col: str, title: str, start_date, end_date):
    """Renders a combined KPI card and segmented history sparkline."""
    if df.empty or metric_col not in df.columns:
        return

    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])

    agg_func = 'mean' if 'avg' in metric_col else 'sum'

    df_chart = (
        df.groupby('date', as_index=False)[metric_col]
        .agg(agg_func)
        .sort_values('date')
    )

    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    mask_in = (df_chart['date'] >= start_dt) & (df_chart['date'] <= end_dt)
    filtered_df = df_chart[mask_in]

    if not filtered_df.empty:
        current_val = filtered_df[metric_col].mean() if 'avg' in metric_col else filtered_df[metric_col].sum()
    else:
        current_val = 0

    timeframe_str = f"{start_dt.strftime('%b %Y')} - {end_dt.strftime('%b %Y')}"

    col_text, col_chart = st.columns([1, 2], gap="small")

    with col_text:
        st.markdown(f'<div class="kpi-title">{title}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="kpi-value">{current_val:,.0f}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="kpi-timeframe">{timeframe_str}</div>', unsafe_allow_html=True)

    with col_chart:
        fig = go.Figure()
        
        custom_hovertemplate = "<b>%{x|%b %Y}</b>: %{y:,.0f}<extra></extra>"

        # Baseline Trace
        fig.add_trace(go.Scatter(
            x=df_chart['date'],
            y=df_chart[metric_col],
            mode='lines+markers',
            marker=dict(size=4, opacity=0),  # Invisible markers for easy hit detection
            line=dict(color='#CBD5E1', width=1.5),
            hovertemplate=custom_hovertemplate,
            hoverinfo='all',
            showlegend=False
        ))

        # Highlighted Trace
        fig.add_trace(go.Scatter(
            x=filtered_df['date'],
            y=filtered_df[metric_col],
            mode='lines+markers',
            marker=dict(size=4, opacity=0),  # Invisible markers for easy hit detection
            line=dict(color='#2563EB', width=2),
            hovertemplate=custom_hovertemplate,
            hoverinfo='all',
            showlegend=False
        ))

        fig.update_layout(
            showlegend=False,
            margin=dict(l=0, r=0, t=0, b=0),
            height=40,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            # Hide visuals while leaving the axis enabled for hovering
            xaxis=dict(
                showgrid=False,
                showline=False,
                showticklabels=False,
                zeroline=False,
                fixedrange=True
            ),
            yaxis=dict(
                showgrid=False,
                showline=False,
                showticklabels=False,
                zeroline=False,
                fixedrange=True
            ),
            hovermode="x",           # Closest point along X-axis
            hoverdistance=-1         # Snap to nearest point anywhere on hover
        )
        
        st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})


def render_trend_chart(df: pd.DataFrame, metric_col: str, start_date, end_date):
    if df.empty or metric_col not in df.columns:
        return

    df = df.copy()
    df['date'] = pd.to_datetime(df['date'], errors='coerce').dt.normalize()
    df = df.dropna(subset=['date'])

    agg_func = 'mean' if 'avg' in metric_col else 'sum'

    # 1. Full Dataset Aggregation & Sort
    df_chart = (
        df.groupby('date', as_index=False)[metric_col]
        .agg(agg_func)
        .sort_values('date', ascending=True)
        .reset_index(drop=True)
    )

    # 2. Filtered Subset for the Highlighted Timeframe
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    mask_in = (df_chart['date'] >= start_dt) & (df_chart['date'] <= end_dt)
    filtered_df = df_chart[mask_in]

    fig = go.Figure()

    # <extra></extra> strips out trace labels / secondary box details
    custom_hovertemplate = "<b>%{x|%b %d, %Y}</b>: %{y:,.0f}<extra></extra>"

    # Suppress baseline hover whenever a point is inside the highlighted range
    baseline_hover_control = [
        "none" if (start_dt <= d <= end_dt) else "all" 
        for d in df_chart['date']
    ]

    # 3. Baseline Trace (Gray / Out of Scope)
    fig.add_trace(go.Scatter(
        x=df_chart['date'],
        y=df_chart[metric_col],
        mode='lines+markers',
        marker=dict(size=4, opacity=0),
        line=dict(color='#CBD5E1', width=1.5),
        hovertemplate=custom_hovertemplate,
        hoverinfo=baseline_hover_control,
        showlegend=False
    ))

    # 4. Highlighted Trace (Blue / In Selected Timeframe)
    if not filtered_df.empty:
        fig.add_trace(go.Scatter(
            x=filtered_df['date'],
            y=filtered_df[metric_col],
            mode='lines+markers',
            marker=dict(size=4, opacity=0),
            line=dict(color='#2563EB', width=2.5),
            hovertemplate=custom_hovertemplate,
            showlegend=False
        ))

    fig.update_layout(
        height=250,
        margin=dict(l=40, r=20, t=10, b=30),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        xaxis=dict(
            type='date',
            categoryorder='category ascending',
            showgrid=False
        ),
        yaxis=dict(
            showgrid=True,
            gridcolor='#E2E8F0'
        )
    )

    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
    

def render_segmented_table(df: pd.DataFrame, metric_col: str, start_date, end_date):
    """Renders a Year x Month pivot table for the selected metric."""
    if df.empty or metric_col not in df.columns:
        return

    # Filter by date range
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    filtered_df = df[(df['date'] >= start_dt) & (df['date'] <= end_dt)].copy()

    if filtered_df.empty:
        st.warning("No data available for the selected timeframe.")
        return

    # Extract Year and Month (ordered chronologically)
    filtered_df['Year'] = filtered_df['date'].dt.year
    filtered_df['Month'] = filtered_df['date'].dt.strftime('%b')
    filtered_df['month_num'] = filtered_df['date'].dt.month

    # Determine aggregation logic matching trend chart
    agg_func = 'mean' if 'avg' in metric_col else 'sum'

    # Build Year (rows) x Month (columns) Pivot
    pivot_df = filtered_df.pivot_table(
        index='Year',
        columns=['month_num', 'Month'],
        values=metric_col,
        aggfunc=agg_func,
        fill_value=0
    )

    # Sort and drop month_num helper from column multi-index
    pivot_df = pivot_df.sort_index(axis=1, level=0)
    pivot_df.columns = pivot_df.columns.get_level_values('Month')

    # Formatting string based on metric type
    fmt = "{:,.1f}" if agg_func == 'mean' else "{:,.0f}"

    st.dataframe(
        pivot_df.style.format(fmt), 
        use_container_width=True, 
        height=300
    )
    
