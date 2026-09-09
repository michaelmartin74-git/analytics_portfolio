import plotly.graph_objects as go
import pandas as pd
import streamlit as st


def render_kpi_sparkline(df_full: pd.DataFrame, df_filtered: pd.DataFrame, metric_col: str, title: str, start_date, end_date):
    """
    Renders a combined KPI card and segmented history sparkline.
    df_full: DataFrame with dimension filters applied (for baseline context)
    df_filtered: DataFrame with dimension + date filters applied (for KPI calculation)
    """
    if df_full.empty or metric_col not in df_full.columns:
        return

    # Prepare Baseline Data (Dimension-filtered, all dates)
    df_full = df_full.copy()
    df_full['date'] = pd.to_datetime(df_full['date'])
    agg_func = 'mean' if 'avg' in metric_col else 'sum'

    df_chart_full = (
        df_full.groupby('date', as_index=False)[metric_col]
        .agg(agg_func)
        .sort_values('date')
    )

    # Prepare Highlighted Data (Dimension + Date filtered)
    if not df_filtered.empty:
        df_filtered = df_filtered.copy()
        df_filtered['date'] = pd.to_datetime(df_filtered['date'])
        
        df_chart_highlight = (
            df_filtered.groupby('date', as_index=False)[metric_col]
            .agg(agg_func)
            .sort_values('date')
        )
        current_val = df_filtered[metric_col].mean() if 'avg' in metric_col else df_filtered[metric_col].sum()
    else:
        df_chart_highlight = pd.DataFrame(columns=['date', metric_col])
        current_val = 0

    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    timeframe_str = f"{start_dt.strftime('%b %Y')} - {end_dt.strftime('%b %Y')}"

    col_text, col_chart = st.columns([1, 2], gap="small")

    with col_text:
        kpi_html = f"""
        <div class="kpi-card-content">
            <div class="kpi-title">{title}</div>
            <div class="kpi-value">{current_val:,.0f}</div>
            <div class="kpi-timeframe">{timeframe_str}</div>
        </div>
        """
        st.markdown(kpi_html, unsafe_allow_html=True)

    with col_chart:
        fig = go.Figure()
        
        # Preserving your preferred hovertemplate approach
        custom_hovertemplate = "<b>%{x|%b %Y}</b>: %{y:,.0f}<extra></extra>"

        # Baseline Trace (Gray line across all dates for selected dimensions)
        fig.add_trace(go.Scatter(
            x=df_chart_full['date'],
            y=df_chart_full[metric_col],
            mode='lines+markers',
            marker=dict(size=4, opacity=0),
            line=dict(color='#CBD5E1', width=1.5),
            hovertemplate=custom_hovertemplate,
            hoverinfo='all',
            showlegend=False
        ))

        # Highlighted Trace (Blue line for active date range)
        fig.add_trace(go.Scatter(
            x=df_chart_highlight['date'],
            y=df_chart_highlight[metric_col],
            mode='lines+markers',
            marker=dict(size=4, opacity=0),
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
            hovermode="x",
            hoverdistance=-1
        )
        
        st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

 

def render_trend_chart(df_full: pd.DataFrame, df_filtered: pd.DataFrame, metric_col: str, start_date, end_date):
    """
    Renders a main trend line chart with a highlighted selection window.
    df_full: Dimension-filtered DataFrame (full history for gray baseline)
    df_filtered: Dimension + Date filtered DataFrame (for blue highlighted line)
    """
    if df_full.empty or metric_col not in df_full.columns:
        return

    agg_func = 'mean' if 'avg' in metric_col else 'sum'

    # 1. Full Dataset Aggregation (Baseline Context)
    df_full = df_full.copy()
    df_full['date'] = pd.to_datetime(df_full['date'], errors='coerce').dt.normalize()
    df_full = df_full.dropna(subset=['date'])

    df_chart_full = (
        df_full.groupby('date', as_index=False)[metric_col]
        .agg(agg_func)
        .sort_values('date', ascending=True)
        .reset_index(drop=True)
    )

    # 2. Filtered Subset Aggregation (Highlight Window)
    if not df_filtered.empty:
        df_filtered = df_filtered.copy()
        df_filtered['date'] = pd.to_datetime(df_filtered['date'], errors='coerce').dt.normalize()
        df_filtered = df_filtered.dropna(subset=['date'])

        df_chart_highlight = (
            df_filtered.groupby('date', as_index=False)[metric_col]
            .agg(agg_func)
            .sort_values('date', ascending=True)
            .reset_index(drop=True)
        )
    else:
        df_chart_highlight = pd.DataFrame(columns=['date', metric_col])

    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)

    fig = go.Figure()

    custom_hovertemplate = "<b>%{x|%b %d, %Y}</b>: %{y:,.0f}<extra></extra>"

    # Suppress baseline hover whenever a point is inside the active date range
    baseline_hover_control = [
        "none" if (start_dt <= d <= end_dt) else "all" 
        for d in df_chart_full['date']
    ]

    # 3. Baseline Trace (Gray / Out of Scope)
    fig.add_trace(go.Scatter(
        x=df_chart_full['date'],
        y=df_chart_full[metric_col],
        mode='lines+markers',
        marker=dict(size=4, opacity=0),
        line=dict(color='#CBD5E1', width=1.5),
        hovertemplate=custom_hovertemplate,
        hoverinfo=baseline_hover_control,
        showlegend=False
    ))

    # 4. Highlighted Trace (Blue / In Selected Timeframe)
    if not df_chart_highlight.empty:
        fig.add_trace(go.Scatter(
            x=df_chart_highlight['date'],
            y=df_chart_highlight[metric_col],
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

    # 5. Render Chart & Store Selection Event
    selected_data = st.plotly_chart(
        fig, 
        use_container_width=True, 
        config={'displayModeBar': False},
        on_select="rerun",
        selection_mode="points",
        key=f"trend_chart_selection_{metric_col}"
    )

    # Safely extract selection without state bleed
    points = selected_data.get("selection", {}).get("points", []) if selected_data else []
    st.session_state['selected_chart_date'] = points[0]['x'] if points else None
    


def render_segmented_table(df_full: pd.DataFrame, df_filtered: pd.DataFrame, metric_col: str, start_date, end_date):
    """
    Renders a Year x Month crosstab showing full historical data filtered by sidebar dimensions,
    highlighting the active date range selection, with a toggle for Total vs. Monthly Growth.
    """
    if df_full.empty or metric_col not in df_full.columns or 'date' not in df_full.columns:
        return

    df = df_full.copy()
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df = df.dropna(subset=['date'])

    # 1. UI Toggle for view type (key incorporates metric_col to prevent state collision)
    view_mode = st.radio(
        "Metric View",
        ["Total", "Monthly Growth"],
        horizontal=True,
        key=f"view_mode_{metric_col}"
    )

    # 2. Extract temporal metadata on full dimension-filtered dataset
    df['Year'] = df['date'].dt.year
    df['Month'] = df['date'].dt.strftime('%b')
    df['month_num'] = df['date'].dt.month

    agg_func = 'mean' if 'avg' in metric_col else 'sum'

    # 3. Build chronological 1D monthly series for continuous pct_change
    df['YearMonth'] = df['date'].dt.to_period('M')
    monthly_series = df.groupby('YearMonth')[metric_col].agg(agg_func).sort_index()

    if view_mode == "Monthly Growth":
        # MoM growth calculated chronologically across full baseline
        calc_series = monthly_series.pct_change()
        fmt = "{:+.1%}"
    else:
        calc_series = monthly_series
        fmt = "{:,.1f}" if agg_func == 'mean' else "{:,.0f}"

    # 4. Reshape calculated series into Year x Month Pivot
    calc_df = calc_series.to_frame(name='val')
    calc_df['Year'] = calc_df.index.year
    calc_df['month_num'] = calc_df.index.month
    calc_df['Month'] = calc_df.index.strftime('%b')

    display_df = (
        calc_df.pivot_table(
            index='Year',
            columns=['month_num', 'Month'],
            values='val',
            aggfunc='first'
        )
        .sort_index(axis=1, level=0)                # Jan -> Dec
        .sort_index(axis=0, ascending=False)        # Descending Year
    )
    display_df.columns = display_df.columns.get_level_values('Month')

    # 5. Build Highlight Mask for active date selection window
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)

    highlight_mask = pd.DataFrame(False, index=display_df.index, columns=display_df.columns)
    
    month_map = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 
                 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}

    for year in display_df.index:
        for month_str in display_df.columns:
            m_num = month_map.get(month_str)
            if m_num:
                cell_dt = pd.Timestamp(year=year, month=m_num, day=1)
                if (cell_dt >= start_dt.replace(day=1)) and (cell_dt <= end_dt):
                    highlight_mask.loc[year, month_str] = True

    # 6. Apply Conditional Formatting
    from numpy import where
    def apply_highlights(data):
        return pd.DataFrame(
            where(highlight_mask, 'background-color: #1e3a8a; color: #ffffff;', ''),
            index=data.index,
            columns=data.columns
        )

    styled_df = display_df.style.apply(apply_highlights, axis=None).format(fmt, na_rep="-")

    st.dataframe(
        styled_df, 
        use_container_width=True, 
        height=350
    )



def clear_selection():
    st.session_state.pop("selected_chart_date", None)
    st.session_state.pop("trend_chart_selection", None)



def render_drilldown_table(df_filtered: pd.DataFrame):
    """
    Renders line-item records matching the clicked chart point (gray or blue),
    respecting active sidebar dimension filters.
    """
    clicked_date_str = st.session_state.get('selected_chart_date')

    if not clicked_date_str:
        st.info("Click any data point on the trend chart above (highlighted or baseline) to inspect underlying row records for that month.")
        return

    if df_filtered.empty or 'date' not in df_filtered.columns:
        st.warning("No line-item detail found for the active dimension filters.")
        return

    df = df_filtered.copy()
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    clicked_dt = pd.to_datetime(clicked_date_str)
    
    # Filter rows matching the selected month and year
    drill_df = df[
        (df['date'].dt.year == clicked_dt.year) & 
        (df['date'].dt.month == clicked_dt.month)
    ].copy()

    # Clear Selection Header
    col_title, col_btn = st.columns([4, 1])
    col_title.caption(f"DRILL-DOWN RECORDS: {clicked_dt.strftime('%B %Y')} ({len(drill_df):,} records)")
    col_btn.button("Clear Selection", use_container_width=True, on_click=clear_selection)

    if drill_df.empty:
        st.warning("No line-item detail found for this month under the active dimension filters.")
        return

    display_cols = [
        c for c in [
            'date', 'recalling_firm', 'class', 'reason_category', 'status', 
            'voluntary_mandated', 'geo_state', 'geo_city', 'geo_country', 
            'recalls', 'skus', 'avg_init_to_class_days', 
            'avg_class_to_term_days', 'avg_init_to_term_days'
        ] if c in drill_df.columns
    ]
    
    drill_display = drill_df[display_cols].sort_values('date', ascending=False)
    if 'date' in drill_display.columns:
        drill_display['date'] = drill_display['date'].dt.strftime('%Y-%m-%d')

    st.dataframe(drill_display, use_container_width=True, height=300, hide_index=True)
    