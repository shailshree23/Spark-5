# If you see linter errors for 'fastapi' or 'pandas', ensure your environment has these packages installed. The code is correct for a FastAPI backend with pandas.
from fastapi import APIRouter, Query
from backend.app.utils.data_loader import load_sales_data, load_inventory_data
import pandas as pd
from backend.app.config import DATA_PATH

router = APIRouter()

@router.get("/")
def get_map_data(region: str = "India", start: str = "2023-01-01", end: str = "2023-12-31", category: str = "", product: str = ""):
    try:
        # Use empty string for all regions
        region_param = "" if region == "India" else region
        internal_sales = load_sales_data(region_param, category, product, start, end)
        # External demand
        trends_df = pd.read_csv(f"{DATA_PATH}/social_trends.csv")
        # Filter out rows with missing or blank category
        trends_df = trends_df[trends_df["category"].notnull() & (trends_df["category"] != "")]
        if category:
            trends_df = trends_df[trends_df["category"] == category]
        if product:
            trends_df = trends_df[trends_df["product"] == product]
        if region == "India":
            # Aggregate by category for India
            external_demand = trends_df.groupby(["category"]).agg({"score": "sum"}).reset_index().rename(columns={"score": "interest"}).to_dict(orient="records")
        else:
            # Aggregate by category for city
            external_demand = trends_df.groupby(["category"]).agg({"score": "sum"}).reset_index().rename(columns={"score": "interest"}).to_dict(orient="records")
        # Inventory overview (by region and product)
        inventory = load_inventory_data(region_param, "", category)
        inventory_overview = {}
        for item in inventory:
            reg = item["region"]
            prod = item["product"]
            if reg not in inventory_overview:
                inventory_overview[reg] = {}
            inventory_overview[reg][prod] = item["stock"]
        # Add national summary for inventory
        if region == "India":
            india_inventory = {}
            for reg_inv in inventory_overview.values():
                for prod, stock in reg_inv.items():
                    india_inventory[prod] = india_inventory.get(prod, 0) + stock
            inventory_overview["India"] = india_inventory
        # Add national summary for internal sales
        if region == "India":
            if not category:
                # Aggregate sales per category across all regions
                df = pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"])
                if product:
                    df = df[df["product"] == product]
                if start:
                    df = df[df["date"] >= pd.to_datetime(start)]
                if end:
                    df = df[df["date"] <= pd.to_datetime(end)]
                cat_sales = df.groupby(["category"]).agg({"sales": "sum"}).reset_index()
                for _, row in cat_sales.iterrows():
                    internal_sales.append({"region": "India", "category": row["category"], "sales": int(row["sales"])})
            else:
                # Aggregate sales per product for the selected category
                india_sales = {}
                for sale in internal_sales:
                    prod = sale["product"]
                    india_sales[prod] = india_sales.get(prod, 0) + sale["sales"]
                for prod, sales in india_sales.items():
                    internal_sales.append({"region": "India", "product": prod, "sales": sales})
        demand_hotspots = sorted(internal_sales, key=lambda x: x['sales'], reverse=True)[:5]
        return {
            "internal_sales": internal_sales,
            "external_demand": external_demand,
            "inventory_overview": inventory_overview,
            "demand_hotspots": demand_hotspots
        }
    except Exception as e:
        return {"error": str(e)}
