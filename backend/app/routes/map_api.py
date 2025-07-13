# backend/app/routes/map_api.py

from fastapi import APIRouter, Query
import pandas as pd
from backend.app.config import DATA_PATH
# Import the functions directly from the file where they are defined
from backend.app.utils.data_loader import load_sales_data, load_inventory_data

router = APIRouter()

@router.get("/")
def get_map_data(region: str = "India", start: str = "2023-01-01", end: str = "2023-12-31", category: str = "", product: str = ""):
    try:
        # Use an empty string to signify all regions if "India" is selected.
        # This aligns with how load_sales_data works (None or "" means all)
        region_param = "" if region == "India" else region
        
        # Load internal sales using our utility function
        internal_sales = load_sales_data(region=region_param, category=category, product=product, start=start, end=end)

        # External demand (from social trends)
        trends_df = pd.read_csv(f"{DATA_PATH}/social_trends.csv")
        trends_df = trends_df[trends_df["category"].notna() & (trends_df["category"] != "")]
        if category:
            trends_df = trends_df[trends_df["category"] == category]
        # For map data, aggregating by category is more useful for display
        external_demand_agg_field = "category"
        if region != "India" and product: # Be more specific for a city+product view
            external_demand_agg_field = "product"

        external_demand = trends_df.groupby(external_demand_agg_field)["score"].sum().reset_index().rename(columns={"score": "interest"})
        external_demand = external_demand.to_dict(orient="records")
        
        # Inventory overview
        inventory = load_inventory_data(region=region_param, category=category)
        inventory_overview = {}
        for item in inventory:
            reg = item["region"]
            prod = item["product"]
            if reg not in inventory_overview:
                inventory_overview[reg] = {}
            inventory_overview[reg][prod] = item["stock"]

        # Calculate demand hotspots from sales data
        if not internal_sales:
             demand_hotspots = []
        else:
             demand_hotspots = sorted(internal_sales, key=lambda x: x['sales'], reverse=True)[:5]
        
        return {
            "internal_sales": internal_sales,
            "external_demand": external_demand,
            "inventory_overview": inventory_overview,
            "demand_hotspots": demand_hotspots
        }
    except Exception as e:
        print(f"Error in get_map_data: {e}")
        return {"error": str(e)}