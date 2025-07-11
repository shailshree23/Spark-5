def classify_inventory(stock, forecasted_demand):
    if stock < forecasted_demand * 0.8:
        return "Out of Stock", "Increase Stock"
    elif stock > forecasted_demand * 1.5:
        return "Overstock", "Reduce Orders"
    else:
        return "Stable", "Maintain Inventory"
