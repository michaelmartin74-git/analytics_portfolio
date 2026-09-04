import plotly.graph_objects as go
import pandas as pd
import streamlit as st

def render_kpi_sparkline(df: pd.DataFrame, metric_col: str, title: str, start_date, end_date):
    """Renders a combined KPI card and segmented history sparkline."""
    
    # Value Calculation
    filtered_df = df[(df['date'] >= pd.to_datetime(start_date)) & (df['date'] <= pd.to_datetime(end_date))]
    current_val = filtered_df[metric_col].iloc[-1] if not filtered_df.empty else 0
    timeframe_str = f"{start_date.strftime('%b %Y')} - {end_date.strftime('%b %Y')}"
    
    col_text, col_chart = st.columns([1, 2], gap="small")
    
    with col_text:
        st.markdown(f'<div class="kpi-title">{title}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="kpi-value">{current_val:,.1f}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="kpi-timeframe">{timeframe_str}</div>', unsafe_allow_html=True)
        
    with col_chart:
        # Plotly Sparkline with unanchored zero and segmented coloring
        fig = go.Figure()
        
        # Base History (Out-of-range)
        mask_in = (df['date'] >= pd.to_datetime(start_date)) & (df['date'] <= pd.to_datetime(end_date))
        
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df[metric_col],
            mode='lines',
            line=dict(color='#CBD5E1', width=1.5),
            hoverinfo='none'
        ))
        
        # Selected Range Segment
        df_selected = df[mask_in]
        fig.add_trace(go.Scatter(
            x=df_selected['date'],
            y=df_selected[metric_col],
            mode='lines',
            line=dict(color='#2563EB', width=2),
            hoverinfo='none'
        ))
        
        fig.update_layout(
            showlegend=False,
            margin=dict(l=0, r=0, t=0, b=0),
            height=40,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            xaxis=dict(visible=False),
            yaxis=dict(visible=False, zeroline=False) # Unanchored zero
        )
        st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
        
# def render_kpi_sparkline(df: pd.DataFrame, metric_col: str, title: str, start_date, end_date):
#     """Renders a combined KPI card and segmented history sparkline without column padding gaps."""
    
#     # Value Calculation
#     filtered_df = df[(df['date'] >= pd.to_datetime(start_date)) & (df['date'] <= pd.to_datetime(end_date))]
#     current_val = filtered_df[metric_col].iloc[-1] if not filtered_df.empty else 0
#     timeframe_str = f"{start_date.strftime('%b %Y')} - {end_date.strftime('%b %Y')}"
    
#     # Build Plotly Figure
#     fig = go.Figure()
    
#     mask_in = (df['date'] >= pd.to_datetime(start_date)) & (df['date'] <= pd.to_datetime(end_date))
    
#     # Base History
#     fig.add_trace(go.Scatter(
#         x=df['date'],
#         y=df[metric_col],
#         mode='lines',
#         line=dict(color='#CBD5E1', width=1.5),
#         hoverinfo='none'
#     ))
    
#     # Selected Range Segment
#     df_selected = df[mask_in]
#     fig.add_trace(go.Scatter(
#         x=df_selected['date'],
#         y=df_selected[metric_col],
#         mode='lines',
#         line=dict(color='#2563EB', width=2),
#         hoverinfo='none'
#     ))
    
#     fig.update_layout(
#         showlegend=False,
#         margin=dict(l=0, r=0, t=0, b=0),
#         height=40,
#         paper_bgcolor='rgba(0,0,0,0)',
#         plot_bgcolor='rgba(0,0,0,0)',
#         xaxis=dict(visible=False),
#         yaxis=dict(visible=False, zeroline=False)
#     )

#     # Combine Text and Chart using a single Flexbox container
#     # Adjust 'gap: 8px' below to control the exact distance between value and line
#     kpi_html = f"""
#     <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
#         <div style="flex: 0 0 auto; min-width: 80px;">
#             <div class="kpi-title">{title}</div>
#             <div class="kpi-value">{current_val:,.1f}</div>
#             <div class="kpi-timeframe">{timeframe_str}</div>
#         </div>
#     """
    
#     # Render wrapper start, plot, and wrapper end in sequence
#     st.markdown(kpi_html, unsafe_allow_html=True)
#     st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})


def render_trend_chart(df: pd.DataFrame, metric_col: str, start_date, end_date):
    """Renders main trend line matching sparkline color scheme."""
    fig = go.Figure()
    
    # Full baseline history
    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df[metric_col],
        mode='lines',
        name='Historical',
        line=dict(color='#CBD5E1', width=1.5)
    ))
    
    # Active range selection
    mask = (df['date'] >= pd.to_datetime(start_date)) & (df['date'] <= pd.to_datetime(end_date))
    df_selected = df[mask]
    
    fig.add_trace(go.Scatter(
        x=df_selected['date'],
        y=df_selected[metric_col],
        mode='lines',
        name='Selected Period',
        line=dict(color='#2563EB', width=2.5)
    ))
    
    fig.update_layout(
        margin=dict(l=20, r=20, t=10, b=20),
        height=220,
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=True, gridcolor='#F1F5F9', zeroline=False)
    )
    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

def render_segmented_table(df: pd.DataFrame, segment_col: str, start_date, end_date):
    """Renders cross-tabulation table aggregated by month/year."""
    filtered_df = df[(df['date'] >= pd.to_datetime(start_date)) & (df['date'] <= pd.to_datetime(end_date))].copy()
    filtered_df['Month/Year'] = filtered_df['date'].dt.strftime('%b %Y')
    
    pivot_df = filtered_df.pivot_table(
        index=segment_col,
        columns='Month/Year',
        values=['metric_a', 'metric_b', 'metric_c', 'metric_d'],
        aggfunc='sum',
        fill_value=0
    )
    
    st.dataframe(pivot_df, use_container_width=True, height=300)