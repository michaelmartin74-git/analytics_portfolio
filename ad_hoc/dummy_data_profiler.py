import pandas as pd
from pathlib import Path
from datetime import datetime

"""
Goal: Reuseable .py script surfacing sample data and summary stats via shareable html doc
Why: Save end users time inspecting research data for quality gaps
"""

import re

def format_dataset_name(stem: str) -> str:
    """
    Formats a filename stem into clean Title Case based on its naming convention.
    """
    # Case A: Snake_case or kebab-case (contains underscores or hyphens)
    if '_' in stem or '-' in stem:
        cleaned = stem.replace('_', ' ').replace('-', ' ')
        return cleaned.title()
        
    # Case B: camelCase or PascalCase (has internal capital letters)
    elif any(c.isupper() for c in stem[1:]):
        spaced = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', stem)
        return spaced.title()
        
    # Case C: Standard plain text or single word fallback
    else:
        return stem.replace('_', ' ').title()

def generate_research_codebook_from_csv(path_input: str, output_html_path: str = "dataset_codebook.html"):
    """
    Ingests a local CSV file or scans a folder path for a CSV,
    computes schema profiles and missingness, and outputs a clean 
    HTML research codebook for Box storage.
    """
    target_path = Path(path_input)
    
    # Directory Handler: logic based on user providing a file directory path
    if target_path.is_dir():
        
        # If directory: list all csvs in path, raise error if none
        csv_files = list(target_path.glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in directory: {target_path}")
        
        # Finds first file containing "irb" (case-insensitive), otherwise fall back to the first CSV
        file_to_read = next((f for f in csv_files if "irb" in f.name.lower()), csv_files[0])
        dataset_name = file_to_read.stem
    
    # Filepath Handler: logic if user provides filepath, simply ingest file itself
    elif target_path.is_file():
        file_to_read = target_path
        dataset_name = format_dataset_name(target_path.stem)
    else:
        raise FileNotFoundError(f"Provided path does not exist: {target_path}")

    # Attempts to ingest the CSV and store inside dataframe
    try:
        df = pd.read_csv(file_to_read)
    except Exception as e:
        raise RuntimeError(f"Failed to read CSV file {file_to_read.name}: {e}")

    # High-level metadata: row & column counts
    total_rows = len(df)
    total_cols = len(df.columns)
    
    # Scrapes min and max dates for any columns having "date" keywords
    date_range = "N/A"
    
    # Hierarchy of dates to use for data timespan
    priority_keywords = ['proc_date', 'adm_date', 'dsch_date']
    
    target_col = None
    for keyword in priority_keywords:
        match = next((col for col in df.columns if keyword in col.lower()), None)
        if match:
            target_col = match
            break

    if target_col:
        try:
            min_val = df[target_col].min()
            max_val = df[target_col].max()
            date_range = f"{min_val} to {max_val} (via {target_col})"
        except Exception:
            pass

    # Column-level profile (types, null counts, null percentages, stats)
    profile_data = []
    for col in df.columns:
        null_count = df[col].isnull().sum()
        total_non_null = total_rows - null_count
        
        # Default stats placeholders for non-numeric columns
        col_min = col_25p = col_med = col_avg = col_75p = col_max = "N/A"
        
        # Isolate calculation to numeric/float/int fields only
        if pd.api.types.is_numeric_dtype(df[col]) and total_non_null > 0 and df[col].dtype != bool:
            col_min = df[col].min()
            col_25p = df[col].quantile(0.25)
            col_med = df[col].median()
            col_avg = df[col].mean()
            col_75p = df[col].quantile(0.75)
            col_max = df[col].max()

        profile_data.append({
            "Column": col,
            "Type": str(df[col].dtype),
            "Non-Null Count": total_non_null,
            "Null Count": null_count,
            "Null %": round((null_count / total_rows) * 100, 2) if total_rows > 0 else 0,
            "Min": col_min,
            "25th Perc.": col_25p,
            "Median": col_med,
            "Avg": col_avg,
            "75th Perc": col_75p,
            "Max": col_max
        })
    profile_df = pd.DataFrame(profile_data)

    # Prevent long descriptor columns from expanding row height, making sample records hard to read
    preview_df = df.head(5).copy()
    for col in preview_df.select_dtypes(include=['object', 'string']).columns:
        preview_df[col] = preview_df[col].apply(
            # Surface tooltip for string columns (CHECK THI GEMINI)
            lambda val: f'<span title="{val}">{val}</span>' if pd.notnull(val) else ''
        )

    # Convert dataframes to clean HTML tables (escape=False allows the span tooltips to render)
    sample_html = preview_df.to_html(classes='table table-striped', index=False, escape=False)
    profile_html = profile_df.to_html(classes='table table-bordered', index=False)

    # Assemble HTML report
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dataset Codebook: {dataset_name}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #333; }}
            h1, h2 {{ color: #111; }}
            .metadata-box {{ background: #f4f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px; }}
            
            /* Responsive scrollable wrapper for wide tables */
            .table-container {{
                width: 100%;
                overflow-x: auto;
                margin-bottom: 30px;
                border: 1px solid #e1e4e8;
                border-radius: 6px;
            }}
            
            table {{ border-collapse: collapse; width: max-content; min-width: 100%; font-size: 14px; }}
            th, td {{ border: 1px solid #ddd; padding: 10px 16px; text-align: left; white-space: nowrap; }}
            th {{ background-color: #f8f9fa; position: sticky; top: 0; }}
        </style>
    </head>
    <body>
        <h1>Data Profile</h1>
        <div class="metadata-box">
            <p><strong>Dataset Name:</strong> {dataset_name}</p>
            <p><strong>Source File:</strong> {file_to_read.name}</p>
            <p><strong>Generated At:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p><strong>Total Rows:</strong> {total_rows} | <strong>Total Columns:</strong> {total_cols}</p>
            <p><strong>Detected Date Span:</strong> {date_range}</p>
        </div>

        <h2>Column Schema & Completeness</h2>
        <div class="table-container">
            {profile_html}
        </div>

        <h2>Data Preview (First 5 Rows)</h2>
        <div class="table-container">
            {sample_html}
        </div>
    </body>
    </html>
    """

    # Output HTML file next to your dataset or destination path
    output_path = Path(output_html_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Codebook successfully generated at: {output_path.resolve()}")
    return df

# Example execution:
if __name__ == "__main__":
    # Paste your folder path or file path here:
    generate_research_codebook_from_csv(r"C:\Users\joann\Downloads\dummy_procedure_visits.csv")
    pass
