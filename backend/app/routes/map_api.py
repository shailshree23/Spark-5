# File: backend/app/routes/map_api.py

from fastapi import APIRouter, Query
import pandas as pd
from backend.app.config import DATA_PATH
from backend.app.utils.radar_insights import analyze_market_data
from datetime import timedelta, datetime

router = APIRouter()

# --- THE FIX: This dictionary is now complete based on ALL your data files ---
CITY_TO_STATE_MAP = {
    "Delhi": "NCT OF Delhi",
    "Bangalore": "Karnataka",
    "Mumbai": "Maharashtra",
    "Chennai": "Tamil Nadu",
    "Hyderabad": "Telangana",
    "Kolkata": "West Bengal",
    "Pune": "Maharashtra",
    "Ahmedabad": "Gujarat",
    "Jaipur": "Rajasthan",
    "Lucknow": "Uttar Pradesh",
    "Kanpur": "Uttar Pradesh",
    "Nagpur": "Maharashtra",
    "Indore": "Madhya Pradesh"
}

@router.get("/")
def get_map_data(
    region: str = None, category: str = None, product: str = None,
    start: str = None, end: str = None
):
    try:
        sales_df = pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"], encoding='utf-8-sig')
        trends_df = pd.read_csv(f"{DATA_PATH}/social_trends.csv", parse_dates=["date"], encoding='utf-8-sig')
        
        end_date = pd.to_datetime(end) if end else datetime.now()
        start_date = pd.to_datetime(start) if start else end_date - timedelta(days=30)
        
        sales_filtered = sales_df[(sales_df['date'] >= start_date) & (sales_df['date'] <= end_date)]
        
        if region: sales_filtered = sales_filtered[sales_filtered['region'] == region]
        if category: sales_filtered = sales_filtered[sales_filtered['category'] == category]
        if product: sales_filtered = sales_filtered[sales_filtered['product'] == product]

        internal_sales_list = []
        if not sales_filtered.empty:
            duration = end_date - start_date
            prev_start = start_date - duration
            prev_sales_df = sales_df[(sales_df['date'] >= prev_start) & (sales_df['date'] < start_date)]

            group_fields = ['region', 'product']
            current_agg = sales_filtered.groupby(group_fields).agg(sales=('sales', 'sum')).reset_index()
            prev_agg = prev_sales_df.groupby(group_fields).agg(prev_sales=('sales', 'sum')).reset_index()
            
            if not prev_agg.empty:
                merged = pd.merge(current_agg, prev_agg, on=group_fields, how='left').fillna(0)
                merged['trend'] = merged.apply(
                    lambda r: 'increasing' if r['sales'] > r['prev_sales'] else 'decreasing' if r['sales'] < r['prev_sales'] else 'stable',
                    axis=1
                )
            else:
                merged = current_agg
                merged['trend'] = 'stable'
            internal_sales_list = merged.to_dict("records")

        trends_filtered = trends_df
        if category:
            trends_filtered = trends_filtered[trends_filtered['category'] == category]
        
        demand_per_category = trends_filtered.groupby('category')['score'].sum().reset_index()
        
        sales_df['state'] = sales_df['region'].map(CITY_TO_STATE_MAP)
        category_state_link = sales_df[['category', 'state']].dropna().drop_duplicates()

        if not demand_per_category.empty and not category_state_link.empty:
            state_demand_df = pd.merge(category_state_link, demand_per_category, on='category', how='inner')
            external_demand_by_state = state_demand_df.groupby('state')['score'].sum().reset_index()
            external_demand_by_state = external_demand_by_state.rename(columns={"score": "demand_score"}).to_dict("records")
        else:
            external_demand_by_state = []

        sales_by_category = sales_filtered.groupby('category')['sales'].sum().reset_index()
        demand_for_insights = demand_per_category.rename(columns={'score': 'interest'})
        
        key_insights = analyze_market_data(sales_by_category.to_dict("records"), demand_for_insights.to_dict("records"))

        return {
            "internal_sales": internal_sales_list,
            "external_demand_by_state": external_demand_by_state,
            "emerging_hotspots": key_insights["emerging_hotspots"],
            "mismatched_opportunities": key_insights["mismatched_opportunities"],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}