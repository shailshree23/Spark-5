# backend/app/routes/insights_api.py

from fastapi import APIRouter, Query
# We import the new function we just created
from backend.app.utils.data_loader import get_insights_data 

router = APIRouter()

@router.get("/")
def get_insights(
    region: str = Query(None),
    category: str = Query(None),
    warehouse: str = Query(None)
):
    # This API is now very clean. It just calls our data processing function.
    insights = get_insights_data(region=region, category=category, warehouse=warehouse)
    return insights