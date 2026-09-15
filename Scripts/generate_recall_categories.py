import re
import pandas as pd
from rapidfuzz import process, fuzz

INPUT_CSV = "recall_reasons.csv"
COLUMN_NAME = "reason"
OUTPUT_CSV = "recall_reasons_classified.csv"

# Keyword dictionary with priority rules
CATEGORY_PATTERNS = {
    "Microbiological Contamination": [
        r"listeria", r"salmonella", r"e\.?\s*coli", r"bacterial", r"mold", 
        r"spoilage", r"clostridium", r"botulinum", r"norovirus", r"microb"
    ],
    "Unmislabeled / Undeclared Allergens": [
        r"undeclared", r"allergen", r"contains\s+(peanut|milk|egg|soy|wheat|tree nut|sesame|fish|crustacean)",
        r"labeling\s+error", r"mislabeled", r"missing\s+ingredient"
    ],
    "Foreign Material / Physical Hazard": [
        r"foreign\s+(object|material|matter)", r"metal", r"glass", r"plastic", 
        r"rubber", r"wood", r"extraneous", r"fragment"
    ],
    "Chemical / Toxin Contamination": [
        r"lead", r"pesticide", r"heavy\s+metal", r"chemical", r"toxin", 
        r"aflatoxin", r"sulfite", r"histamine", r"drug"
    ],
    "Processing / Sanitation Issues": [
        r"underprocessed", r"temperature\s+abuse", r"cGMP", r"sanitation", 
        r"insanitary", r"processing", r"leak", r"swollen", r"unapproved"
    ],
    "Labeling / Packaging Defect": [
        r"misbranded", r"expiration", r"date", r"packaging", r"net\s+weight", r"label"
    ]
}

def classify_text(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return "Other / Unknown"
    
    text_lower = text.lower()
    
    # Tier 1: Regex Pattern Matching (Deterministic)
    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                return category
                
    # Tier 2: Optional Fuzzy Keyword Fallback for misspellings/variants
    keywords = {
        "microbial": "Microbiological Contamination",
        "contamination": "Processing / Sanitation Issues",
        "allergy": "Unmislabeled / Undeclared Allergens"
    }
    match, score, _ = process.extractOne(text_lower, keywords.keys(), scorer=fuzz.partial_ratio)
    if score >= 85:
        return keywords[match]

    return "Other / Unknown"

def main():
    df = pd.read_csv(INPUT_CSV)
    
    # Process unique values to speed up execution
    unique_df = pd.DataFrame({COLUMN_NAME: df[COLUMN_NAME].dropna().unique()})
    
    print(f"Classifying {len(unique_df)} unique records...")
    unique_df["category"] = unique_df[COLUMN_NAME].apply(classify_text)
    
    # Coverage metrics
    classified_count = len(unique_df[unique_df["category"] != "Other / Unknown"])
    coverage = (classified_count / len(unique_df)) * 100
    print(f"Categorized {classified_count}/{len(unique_df)} records ({coverage:.1f}% coverage)")
    
    # Save full mapped output
    output_df = df.merge(unique_df, on=COLUMN_NAME, how="left")
    output_df.to_csv(OUTPUT_CSV, index=False)
    print(f"Results saved to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()