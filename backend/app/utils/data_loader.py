# backend/app/utils/data_loader.py

import pandas as pd
from backend.app.config import DATA_PATH

def to_py(val):
    if hasattr(val, 'item'):
        return val.item()
    if isinstance(val, (pd.Timestamp,)):
        return str(val)
    return val

def dict_py(d):
    return {str(k): to_py(v) for k, v in d.items()}

def nested_dict_py(d):
    return {str(k): dict_py(v) for k, v in d.items()}

# --- THIS FUNCTION WAS MISSING/CONFLICTING. IT IS NOW RESTORED. ---
def load_sales_data(region=None, category=None, product=None, start=None, end=None):
    df = pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"])
    if region:
        df = df[df["region"] == region]
    if category:
        df = df[df["category"] == category]
    if product:
        df = df[df["product"] == product]
    if start:
        df = df[df["date"] >= pd.to_datetime(start)]
    if end:
        df = df[df["date"] <= pd.to_datetime(end)]
    
    # Check if df is empty before grouping
    if df.empty:
        return []

    # Let's be more specific with the grouping for the map
    group_by_fields = ["region"]
    if category or product:
        group_by_fields.append("product")
    else: # If no category or product, group by category for a higher-level view
        group_by_fields.append("category")

    grouped = df.groupby(group_by_fields).agg({"sales": "sum"}).reset_index()
    return grouped.to_dict(orient="records")

# --- THIS FUNCTION WAS MISSING/CONFLICTING. IT IS NOW RESTORED. ---
def load_inventory_data(region=None, warehouse=None, category=None):
    df = pd.read_csv(f"{DATA_PATH}/inventory.csv")
    if region:
        df = df[df["region"] == region]
    if warehouse:
        df = df[df["warehouse"] == warehouse]
    if category:
        df = df[df["category"] == category]
    return df.to_dict(orient="records")

# --- THIS IS OUR NEW, OPTIMIZED FUNCTION FOR THE INSIGHTS PAGE ---
def load_all_data(region=None, category=None, warehouse=None):
    # Load the full datasets
    sales_full = pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"])
    inventory_full = pd.read_csv(f"{DATA_PATH}/inventory.csv")
    trends_full = pd.read_csv(f"{DATA_PATH}/social_trends.csv")

    # Keep copies for filtering
    sales = sales_full.copy()
    inventory = inventory_full.copy()

    # Apply filters if they are provided
    if region:
        sales = sales[sales["region"] == region]
        inventory = inventory[inventory["region"] == region]
    if category:
        sales = sales[sales["category"] == category]
        inventory = inventory[inventory["category"] == category]
    if warehouse:
        inventory = inventory[inventory["warehouse"] == warehouse]

    # Summaries (based on filtered data)
    total_sales = int(sales["sales"].sum())
    inventory_summary = dict_py(inventory.groupby("product")["stock"].sum().to_dict())
    
    # Trending products summary should be global (unfiltered)
    trending_products = [str(p) for p in trends_full["product"].unique().tolist()]
    
    # Detailed breakdowns (based on filtered data)
    inventory_by_region = nested_dict_py(inventory.groupby(["region", "product"])["stock"].sum().unstack(fill_value=0).to_dict())
    sales_by_region = nested_dict_py(sales.groupby(["region", "product"])["sales"].sum().unstack(fill_value=0).to_dict())
    inventory_by_category = nested_dict_py(inventory.groupby(["category", "product"])["stock"].sum().unstack(fill_value=0).to_dict())
    sales_by_category = nested_dict_py(sales.groupby(["category", "product"])["sales"].sum().unstack(fill_value=0).to_dict())
    inventory_by_warehouse = nested_dict_py(inventory.groupby(["warehouse", "product"])["stock"].sum().unstack(fill_value=0).to_dict())
    
    sales_time_series = {}
    if not sales.empty:
        sales["month"] = sales["date"].dt.to_period("M").astype(str)
        sales_time_series = nested_dict_py(sales.groupby(["month", "product"])["sales"].sum().unstack(fill_value=0).to_dict())

    return {
        "total_sales": total_sales,
        "inventory_summary": inventory_summary,
        "trending_products": trending_products,
        "inventory_by_region": inventory_by_region,
        "sales_by_region": sales_by_region,
        "inventory_by_category": inventory_by_category,
        "sales_by_category": sales_by_category,
        "inventory_by_warehouse": inventory_by_warehouse,
        "sales_time_series": sales_time_series,
    }