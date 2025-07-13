from fastapi import APIRouter, Query
from backend.app.utils.data_loader import load_all_data

router = APIRouter()

@router.get("/")
def get_insights(
    region: str = Query(None, description="Filter by a specific region"),
    category: str = Query(None, description="Filter by a specific category"),
    warehouse: str = Query(None, description="Filter by a specific warehouse")
):
    try:
        # Pass the query parameters directly to the data loading function
        insights = load_all_data(region=region, category=category, warehouse=warehouse)
        return insights
    except Exception as e:
        # It's helpful to log the error on the server
        print(f"Error in get_insights: {e}")
        return {"error": str(e)}