from fastapi import APIRouter
from backend.app.utils.forecasting import forecast_demand
from backend.app.utils.data_loader import load_inventory_data

router = APIRouter()

@router.get("/")
def get_planner(region: str = None, warehouse: str = None, category: str = None, timeframe: int = 30):
    try:
        inventory = load_inventory_data(region, warehouse, category)
        forecast = forecast_demand(inventory, days=timeframe)
        return forecast
    except Exception as e:
        return {"error": str(e)}
