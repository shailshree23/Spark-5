import pandas as pd
from backend.app.config import DATA_PATH

# --- FIX #1: Correct file loading with encoding ---
def load_sales_data():
    return pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"], encoding='utf-8-sig')

def load_inventory_data(region=None, warehouse=None, category=None):
    df = pd.read_csv(f"{DATA_PATH}/inventory.csv", encoding='utf-8-sig')
    if region:
        df = df[df["region"] == region]
    if warehouse:
        df = df[df["warehouse"] == warehouse]
    if category:
        df = df[df["category"] == category]
    return df.to_dict(orient="records")

def to_py(val):
    if hasattr(val, 'item'): return val.item()
    return val

# --- FIX #2: Greatly simplified this function to match your data structure ---
def load_all_data(region=None, category=None, warehouse=None):
    sales = pd.read_csv(f"{DATA_PATH}/sales.csv", encoding='utf-8-sig', parse_dates=["date"])
    inventory = pd.read_csv(f"{DATA_PATH}/inventory.csv", encoding='utf-8-sig')
    trends = pd.read_csv(f"{DATA_PATH}/social_trends.csv", encoding='utf-8-sig')

    # Apply filters
    if region:
        sales = sales[sales['region'] == region]
        inventory = inventory[inventory['region'] == region]
    if category:
        sales = sales[sales['category'] == category]
        inventory = inventory[inventory['category'] == category]
    if warehouse:
        inventory = inventory[inventory['warehouse'] == warehouse]

    total_sales = int(sales['sales'].sum())
    
    inventory_summary = {
        str(k): to_py(v) for k, v in inventory.groupby("product")["stock"].sum().items()
    }
    
    trending_products = trends['product'].unique().tolist()
    
    return {
        "total_sales": total_sales,
        "inventory_summary": inventory_summary,
        "trending_products": trending_products,
        # Other complex fields are removed for now as they relied on inconsistent data
    }