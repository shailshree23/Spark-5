# File: backend/app/routes/filters_api.py

from fastapi import APIRouter, Query
import pandas as pd
from backend.app.config import DATA_PATH

router = APIRouter()

@router.get("/")
def get_filter_options(
    # This allows us to pass a category like: /api/filters?category=Groceries
    category: str = Query(None, description="Filter products by a specific category")
):
    """
    Dynamically loads unique filter options.
    If a category is provided, the product list will be filtered accordingly.
    """
    try:
        sales_df = pd.read_csv(f"{DATA_PATH}/sales.csv", encoding='utf-8-sig')
        inventory_df = pd.read_csv(f"{DATA_PATH}/inventory.csv", encoding='utf-8-sig')

        # Combine dataframes to have a single source of truth for relationships
        combined_df = pd.concat([
            sales_df[['region', 'category', 'product']],
            inventory_df[['region', 'category', 'product']]
        ]).drop_duplicates()

        # If a category is NOT provided, return all unique values
        if not category:
            unique_regions = sorted(combined_df['region'].dropna().unique().tolist())
            unique_categories = sorted(combined_df['category'].dropna().unique().tolist())
            unique_products = sorted(combined_df['product'].dropna().unique().tolist())

            return {
                "regions": unique_regions,
                "categories": unique_categories,
                "products": unique_products,
            }
        
        # --- NEW LOGIC ---
        # If a category IS provided, filter the dataframe first
        else:
            filtered_df = combined_df[combined_df['category'] == category]
            unique_products = sorted(filtered_df['product'].dropna().unique().tolist())
            
            # We only need to return the products for a category filter update
            return {
                "products": unique_products
            }

    except Exception as e:
        print(f"Error in get_filter_options: {e}")
        return {"error": str(e)}