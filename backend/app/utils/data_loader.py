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
    grouped = df.groupby(["region", "product"]).agg({"sales": "sum"}).reset_index()
    return grouped.to_dict(orient="records")

def load_inventory_data(region=None, warehouse=None, category=None):
    df = pd.read_csv(f"{DATA_PATH}/inventory.csv")
    if region:
        df = df[df["region"] == region]
    if warehouse:
        df = df[df["warehouse"] == warehouse]
    if category:
        df = df[df["category"] == category]
    return df.to_dict(orient="records")

def load_all_data():
    sales = pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"])
    inventory = pd.read_csv(f"{DATA_PATH}/inventory.csv")
    trends = pd.read_csv(f"{DATA_PATH}/social_trends.csv")
    # Summary
    total_sales = int(sales["sales"].sum())
    inventory_summary = dict_py(inventory.groupby("product")["stock"].sum().to_dict())
    trending_products = [str(p) for p in trends["product"].unique().tolist()]
    # By region
    inventory_by_region = nested_dict_py(inventory.groupby(["region", "product"])["stock"].sum().unstack(fill_value=0).to_dict())
    sales_by_region = nested_dict_py(sales.groupby(["region", "product"])["sales"].sum().unstack(fill_value=0).to_dict())
    # By category
    inventory_by_category = nested_dict_py(inventory.groupby(["category", "product"])["stock"].sum().unstack(fill_value=0).to_dict())
    sales_by_category = nested_dict_py(sales.groupby(["category", "product"])["sales"].sum().unstack(fill_value=0).to_dict())
    # By warehouse
    inventory_by_warehouse = nested_dict_py(inventory.groupby(["warehouse", "product"])["stock"].sum().unstack(fill_value=0).to_dict())
    # Time series (monthly)
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
        "all_inventory": [dict_py(row) for row in inventory.to_dict(orient="records")],
        "all_sales": [dict_py(row) for row in sales.to_dict(orient="records")]
    }
