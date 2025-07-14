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

# --- ADD THIS NEW FUNCTION AT THE END OF THE FILE ---

def get_insights_data(region=None, category=None, warehouse=None):
    try:
        sales_df = pd.read_csv(f"{DATA_PATH}/sales.csv", parse_dates=["date"], encoding='utf-8-sig')
        inventory_df = pd.read_csv(f"{DATA_PATH}/inventory.csv", encoding='utf-8-sig')
        trends_df = pd.read_csv(f"{DATA_PATH}/social_trends.csv", encoding='utf-8-sig')

        # Create copies for filtering
        sales_filtered = sales_df.copy()
        inventory_filtered = inventory_df.copy()

        # Apply filters
        if region:
            sales_filtered = sales_filtered[sales_filtered['region'] == region]
            inventory_filtered = inventory_filtered[inventory_filtered['region'] == region]
        if category:
            sales_filtered = sales_filtered[sales_filtered['category'] == category]
            inventory_filtered = inventory_filtered[inventory_filtered['category'] == category]
        if warehouse:
            inventory_filtered = inventory_filtered[inventory_filtered['warehouse'] == warehouse]

        # --- Calculations ---
        # 1. Summary Cards
        total_sales = int(sales_filtered['sales'].sum())
        total_inventory_items = int(inventory_filtered['stock'].sum())
        total_trending_products = int(trends_df['product'].nunique())

        # 2. Dropdown options
        regions = sales_df['region'].unique().tolist()
        categories = sales_df['category'].unique().tolist()
        warehouses = inventory_df['warehouse'].unique().tolist()
        products = sales_df['product'].unique().tolist()

        # 3. Chart Data
        # Sales by Region chart data
        sales_by_region = sales_filtered.groupby('region')['sales'].sum()

        # Sales Time Series chart data (by month)
        sales_time_series = sales_filtered.set_index('date').groupby(pd.Grouper(freq='M'))['sales'].sum()
        
        # Prepare for JSON serialization
        sales_by_region_data = {
            'labels': sales_by_region.index.tolist(),
            'datasets': [{
                'label': 'Total Sales',
                'data': sales_by_region.values.tolist(),
                'backgroundColor': '#7D5BA6',
            }]
        }

        sales_time_series_data = {
            'labels': sales_time_series.index.strftime('%Y-%m').tolist(),
            'datasets': [{
                'label': 'Monthly Sales',
                'data': sales_time_series.values.tolist(),
                'borderColor': '#FFA987',
                'fill': False,
                'tension': 0.1
            }]
        }
        
        return {
            "summary": {
                "total_sales": total_sales,
                "total_inventory_items": total_inventory_items,
                "total_trending_products": total_trending_products,
            },
            "filters": {
                "regions": regions,
                "categories": categories,
                "warehouses": warehouses,
                "products": products
            },
            "charts": {
                "sales_by_region": sales_by_region_data,
                "sales_time_series": sales_time_series_data
            }
        }
    except FileNotFoundError as e:
        print(f"Error: Data file not found! {e}")
        return {"error": f"Data file not found: {e.filename}"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}