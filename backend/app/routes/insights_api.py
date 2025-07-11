from fastapi import APIRouter
from backend.app.utils.data_loader import load_all_data

router = APIRouter()

@router.get("/")
def get_insights():
    try:
        insights = load_all_data()
        return insights
    except Exception as e:
        return {"error": str(e)}
