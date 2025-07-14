# File: backend/app/utils/radar_insights.py

import pandas as pd

def analyze_market_data(sales_by_category, demand_by_category):
    """
    Analyzes category-level sales and demand data to find opportunities and hotspots.

    Args:
        sales_by_category (list of dicts): e.g., [{'category': 'Electronics', 'sales': 5000}]
        demand_by_category (list of dicts): e.g., [{'category': 'Electronics', 'interest': 800}]
    
    Returns:
        dict: A dictionary containing lists of category names for hotspots and opportunities.
    """
    if not demand_by_category:
        return {"emerging_hotspots": [], "mismatched_opportunities": []}

    # Convert lists to DataFrames for analysis
    sales_df = pd.DataFrame(sales_by_category)
    demand_df = pd.DataFrame(demand_by_category)

    # Merge the two dataframes on 'category'. Use an outer join to keep categories
    # that might appear in one list but not the other.
    if sales_df.empty:
         market_df = demand_df.copy()
         market_df['sales'] = 0
    else:
         market_df = pd.merge(demand_df, sales_df, on='category', how='outer').fillna(0)

    if market_df.empty:
        return {"emerging_hotspots": [], "mismatched_opportunities": []}

    # --- Define Thresholds for categories ---
    # "High" is defined as being above the 70th percentile.
    # "Low" is defined as being below the 30th percentile.
    demand_threshold = market_df['interest'].quantile(0.7)
    sales_threshold = market_df['sales'].quantile(0.7)
    low_sales_threshold = market_df['sales'].quantile(0.3)

    # --- Find Insights ---
    # 1. Emerging Hotspots: High Demand AND High Sales.
    hotspots_df = market_df[
        (market_df['interest'] > demand_threshold) & (market_df['sales'] > sales_threshold) & (market_df['interest'] > 0)
    ]

    # 2. Mismatched Opportunities: High Demand BUT Low Sales.
    opportunities_df = market_df[
        (market_df['interest'] > demand_threshold) & (market_df['sales'] <= low_sales_threshold)
    ]
    
    emerging_hotspots = hotspots_df.sort_values(by='interest', ascending=False).head(5)['category'].tolist()
    mismatched_opportunities = opportunities_df.sort_values(by='interest', ascending=False).head(5)['category'].tolist()

    return {
        "emerging_hotspots": emerging_hotspots,
        "mismatched_opportunities": mismatched_opportunities
    }