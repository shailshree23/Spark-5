import torch
import torch.nn as nn
import os
import numpy as np
import pandas as pd
from backend.app.config import DATA_PATH, MODEL_PATH
from backend.app.utils.alerts import classify_inventory

class LSTMNet(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = torch.nn.LSTM(input_size=1, hidden_size=32, batch_first=True)
        self.fc = torch.nn.Linear(32, 1)
    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1])

model_cache = {}

def forecast_demand(inventory, days=30, use_ml=True):
    """Generates forecast using per-product LSTM models or a rule-based fallback."""
    results = []
    if not inventory:
        return []

    lstm_dir = os.path.join(MODEL_PATH, "lstm_products")
    use_ml_models = os.path.exists(lstm_dir) and use_ml
    
    sales_df = pd.read_csv(os.path.join(DATA_PATH, "sales.csv"))
    sales_df["date"] = pd.to_datetime(sales_df["date"])

    for item in inventory:
        product, stock = item['product'], item['stock']
        product_key = product.replace(' ', '_')
        model_path = os.path.join(lstm_dir, f"forecast_model_lstm_{product_key}.pth")
        forecast_series = []
        
        if use_ml_models and os.path.exists(model_path):
            model, scaler_min, scaler_max = None, None, None
            if product_key in model_cache:
                model, scaler_min, scaler_max = model_cache[product_key]
            else:
                try:
                    checkpoint = torch.load(model_path, map_location=torch.device('cpu'))
                    temp_model = LSTMNet()
                    temp_model.load_state_dict(checkpoint['model'])
                    temp_model.eval()
                    model, scaler_min, scaler_max = temp_model, np.array(checkpoint['scaler_min']), np.array(checkpoint['scaler_max'])
                    model_cache[product_key] = (model, scaler_min, scaler_max)
                except Exception as e:
                    print(f"Failed to load LSTM model for {product}: {e}")
            
            if model:
                def scale(x, s_min=scaler_min, s_max=scaler_max): return (x - s_min) / (s_max - s_min + 1e-9)
                def unscale(x, s_min=scaler_min, s_max=scaler_max): return x * (s_max - s_min + 1e-9) + s_min
                
                prod_sales = sales_df[sales_df['product'] == product].groupby('date', as_index=False).agg({'sales': 'sum'})
                prod_sales = prod_sales.set_index('date').asfreq('D', fill_value=0).reset_index()
                sales_vals = prod_sales['sales'].values
                
                seq_len = 7
                input_data = list(sales_vals[-seq_len:])
                if len(input_data) < seq_len: input_data = [0]*(seq_len - len(input_data)) + input_data
                
                input_seq = scale(np.array(input_data).reshape(-1, 1)).astype(np.float32)

                for _ in range(days):
                    X = torch.tensor(input_seq).reshape(1, seq_len, 1)
                    with torch.no_grad():
                        pred = model(X).item()
                    pred_unscaled = max(int(round(float(unscale(pred)))), 0)
                    forecast_series.append(pred_unscaled)
                    np.roll(input_seq, -1, axis=0)
                    input_seq[-1, 0] = scale(np.array([[pred_unscaled]]))[0, 0]
        
        if not forecast_series:
            base_demand = stock * 0.3
            if 'Electronics' in str(item.get('category', '')): base_demand *= 1.2
            elif 'Grocery' in str(item.get('category', '')): base_demand *= 1.5
            final_forecast_fb = int(base_demand * (days / 30.0))
            forecast_series = [max(0, final_forecast_fb // days)] * days if days > 0 else []
            
        final_forecast = sum(forecast_series)
        status, recommendation = classify_inventory(stock, final_forecast)

        # THE CRITICAL FIX IS ENSURING THIS KEY NAME IS EXACTLY "forecast_series"
        results.append({
            "product": product, 
            "current_stock": stock, 
            "forecast_demand": final_forecast,
            "forecast_series": forecast_series,  # <- This must be correct.
            "inventory_status": status,
            "risk_projection": recommendation
        })
    return results