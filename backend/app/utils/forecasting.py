import torch
import os
import numpy as np
import pandas as pd
from backend.app.config import MODEL_PATH
from backend.app.utils.alerts import classify_inventory

def forecast_demand(inventory, days=30):
    results = []
    lstm_dir = f"{MODEL_PATH}/lstm_products"
    use_ml_models = os.path.exists(lstm_dir)
    # Load sales data for context
    sales_df = pd.read_csv("backend/data/sales.csv")
    sales_df["date"] = pd.to_datetime(sales_df["date"])
    for item in inventory:
        product = item['product']
        stock = item['stock']
        model_path = os.path.join(lstm_dir, f"forecast_model_lstm_{product.replace(' ', '_')}.pth")
        forecast_series = []
        if use_ml_models and os.path.exists(model_path):
            # Get recent sales for this product
            prod_sales = sales_df[sales_df['product'] == product].sort_values('date')
            prod_sales = prod_sales.groupby('date', as_index=False).agg({'sales': 'sum'})
            prod_sales = prod_sales.set_index('date').asfreq('D', fill_value=0).reset_index()
            sales_vals = prod_sales['sales'].values
            # Load model and scaler
            checkpoint = torch.load(model_path)
            scaler_min = np.array(checkpoint['scaler_min'])
            scaler_max = np.array(checkpoint['scaler_max'])
            def scale(x):
                return (x - scaler_min) / (scaler_max - scaler_min + 1e-8)
            def unscale(x):
                return x * (scaler_max - scaler_min + 1e-8) + scaler_min
            class LSTMNet(torch.nn.Module):
                def __init__(self):
                    super().__init__()
                    self.lstm = torch.nn.LSTM(input_size=1, hidden_size=32, batch_first=True)
                    self.fc = torch.nn.Linear(32, 1)
                def forward(self, x):
                    out, _ = self.lstm(x)
                    return self.fc(out[:, -1])
            model = LSTMNet()
            model.load_state_dict(checkpoint['model'])
            model.eval()
            seq_len = 7
            # Use last seq_len days as input, pad with zeros if not enough
            input_seq = list(sales_vals[-seq_len:])
            if len(input_seq) < seq_len:
                input_seq = [0]*(seq_len-len(input_seq)) + input_seq
            input_seq = scale(np.array(input_seq).reshape(-1,1)).astype(np.float32)
            for d in range(days):
                X = torch.tensor(input_seq).reshape(1, seq_len, 1)
                with torch.no_grad():
                    pred = model(X).item()
                pred_unscaled = unscale(pred)
                if isinstance(pred_unscaled, np.ndarray):
                    pred_unscaled = float(pred_unscaled.item())
                pred_unscaled = max(int(round(pred_unscaled)), 0)
                forecast_series.append(pred_unscaled)
                # Slide window for next day
                input_seq = np.roll(input_seq, -1, axis=0)
                input_seq[-1,0] = scale(np.array([[pred_unscaled]])).item()
            final_forecast = sum(forecast_series)
            status, recommendation = classify_inventory(stock, final_forecast)
            results.append({
                "product": product,
                "current_stock": stock,
                "forecast_demand": final_forecast,
                "forecast_series": forecast_series,
                "inventory_status": status,
                "risk_projection": recommendation
            })
        else:
            # Fallback: rule-based
            base_demand = stock * 0.3
            if 'Electronics' in str(item.get('category', '')):
                base_demand *= 1.2
            elif 'Grocery' in str(item.get('category', '')):
                base_demand *= 1.5
            forecast_series = [max(int(round(base_demand)), 0)] * days
            final_forecast = sum(forecast_series)
            status, recommendation = classify_inventory(stock, final_forecast)
            results.append({
                "product": product,
                "current_stock": stock,
                "forecast_demand": final_forecast,
                "forecast_series": forecast_series,
                "inventory_status": status,
                "risk_projection": recommendation
            })
    return results
