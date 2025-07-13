# The original code was missing the import for Query
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
        inventory = load_inventory_data(region, warehouse, category)
        # It now correctly uses the default forecast method
        forecast = forecast_demand(inventory, days=timeframe)
        return forecast
    except Exception as e:
        print(f"Error in get_planner: {e}")
        return {"error": str(e)}