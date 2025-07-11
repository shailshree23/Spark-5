import pandas as pd
from backend.app.config import DATA_PATH
from datetime import datetime, timedelta
from collections import defaultdict

def get_social_trends(source, days=7):
    try:
        df = pd.read_csv(f"{DATA_PATH}/social_trends.csv")
        if source != "all":
            df = df[df["source"] == source]
        cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        df = df[df["date"] >= cutoff]
        return enrich_social_analytics(df)
    except Exception:
        return enrich_social_analytics(pd.DataFrame([]))

def enrich_social_analytics(df):
    if df is None or df.empty:
        return {
            "trends": [],
            "top_products": [],
            "category_distribution": {},
            "product_time_series": {},
            "category_time_series": {},
            "most_popular": "-",
            "most_popular_category": "-",
            "most_source": "-",
            "total_trend_volume": 0
        }
    # Top products by total score
    prod_scores = df.groupby(["product", "category", "source"]).agg({"score": "sum"}).reset_index()
    top_products = prod_scores.sort_values("score", ascending=False).head(10)
    top_products_list = top_products.to_dict(orient="records")
    # Category distribution (by score)
    cat_dist = df.groupby("category")["score"].sum().to_dict()
    # Product time series (for top products)
    product_time_series = {}
    for prod in top_products["product"]:
        prod_df = df[df["product"] == prod]
        ts = prod_df.groupby("date")["score"].sum().reset_index()
        product_time_series[prod] = ts.to_dict(orient="records")
    # Category time series
    category_time_series = {}
    for cat in df["category"].unique():
        cat_df = df[df["category"] == cat]
        ts = cat_df.groupby("date")["score"].sum().reset_index()
        category_time_series[cat] = ts.to_dict(orient="records")
    # Most popular product and category
    most_popular = top_products.iloc[0]["product"] if not top_products.empty else "-"
    most_popular_category = max(cat_dist.keys(), key=lambda k: cat_dist[k]) if cat_dist else "-"
    # Most common source in top products
    src_dist = defaultdict(int)
    for _, row in top_products.iterrows():
        src_dist[row["source"]] += 1
    most_source = max(src_dist, key=src_dist.get) if src_dist else "-"
    # Total trend volume
    total_trend_volume = int(df["score"].sum())
    return {
        "trends": df.to_dict(orient="records"),
        "top_products": top_products_list,
        "category_distribution": cat_dist,
        "product_time_series": product_time_series,
        "category_time_series": category_time_series,
        "most_popular": most_popular,
        "most_popular_category": most_popular_category,
        "most_source": most_source,
        "total_trend_volume": total_trend_volume
    }
