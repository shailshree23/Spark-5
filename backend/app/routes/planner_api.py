# File: backend/app/routes/planner_api.py

from fastapi import APIRouter, Query 
from backend.app.utils.forecasting import forecast_demand
from backend.app.utils.data_loader import load_inventory_data

router = APIRouter()

@router.get("/")
def get_planner(
    region: str = Query(None, description="Filter by a specific region"), 
    warehouse: str = Query(None, description="Filter by a specific warehouse"), 
    category: str = Query(None, description="Filter by a specific category"), 
    timeframe: int = Query(30, description="Number of days to forecast")
):
    try:
        # Load the inventory data as a list of dictionaries
        inventory_list = load_inventory_data(region, warehouse, category)
        
        # Get the forecast, which will add forecasting details to each item
        forecast_results = forecast_demand(inventory_list, days=timeframe)

        # --- THE FIX ---
        # We need to ensure the original warehouse info is preserved.
        # We'll create a map of product -> original warehouse to add it back.
        product_to_warehouse_map = {item['product']: item.get('warehouse') for item in inventory_list}

        for result in forecast_results:
            result['warehouse'] = product_to_warehouse_map.get(result['product'])

        return forecast_results
    except Exception as e:
        print(f"Error in get_planner: {e}")
        return {"error": str(e)}