# File: backend/app/routes/planner_filters_api.py

from fastapi import APIRouter, Query
import pandas as pd
from backend.app.config import DATA_PATH

router = APIRouter()

@router.get("/")
def get_planner_filter_options(
    region: str = Query(None, description="Filter warehouses and categories by a specific region")
):
    """
    Dynamically loads filter options specifically for the Planner page.
    This endpoint is separate from the main /api/filters to avoid conflicts.
    """
    try:
        # We only need inventory data for these filters as they are inventory-centric
        inventory_df = pd.read_csv(f"{DATA_PATH}/inventory.csv", encoding='utf-8-sig')

        # If a region is provided, filter the dataframe first
        if region:
            region_df = inventory_df[inventory_df['region'] == region]
            warehouses = sorted(region_df['warehouse'].dropna().unique().tolist())
            categories = sorted(region_df['category'].dropna().unique().tolist())
            return {"warehouses": warehouses, "categories": categories}
        
        # If no region is provided (initial load), return all unique options
        else:
            all_regions = sorted(inventory_df['region'].dropna().unique().tolist())
            all_warehouses = sorted(inventory_df['warehouse'].dropna().unique().tolist())
            all_categories = sorted(inventory_df['category'].dropna().unique().tolist())
            return {
                "regions": all_regions,
                "warehouses": all_warehouses,
                "categories": all_categories,
            }

    except Exception as e:
        print(f"Error in get_planner_filter_options: {e}")
        return {"error": str(e)}