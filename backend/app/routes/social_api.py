from fastapi import APIRouter
from backend.app.utils.trends import get_social_trends
from backend.app.utils.data_loader import load_inventory_data

router = APIRouter()

@router.get("/")
def get_social_data(source: str = "pytrends", days: int = 7):
    try:
        analytics = get_social_trends(source, days)
        inventory = load_inventory_data()
        inventory_products = {item['product'] for item in inventory}
        recommended = [trend for trend in analytics['top_products'] if trend['product'] not in inventory_products]
        analytics['recommended'] = recommended
        return analytics
    except Exception as e:
        return {"error": str(e)}
