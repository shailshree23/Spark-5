import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset
import os

# --- FIX: Use correct encoding ---
sales_df = pd.read_csv("backend/data/sales.csv", encoding='utf-8-sig')
sales_df["date"] = pd.to_datetime(sales_df["date"])

os.makedirs("ml_models/lstm_products", exist_ok=True)

class LSTMNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(input_size=1, hidden_size=32, batch_first=True)
        self.fc = nn.Linear(32, 1)
    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1])

def create_sequences(data, seq_len):
    xs, ys = [], []
    for i in range(len(data) - seq_len):
        x = data[i:i+seq_len]
        y = data[i+seq_len]
        xs.append(x)
        ys.append(y)
    return np.array(xs), np.array(ys)

seq_len = 7
for product in sales_df['product'].unique():
    prod_df = sales_df[sales_df['product'] == product].sort_values('date')
    # --- THE REAL FIX: Aggregate sales per date ---
    # This is crucial for creating a proper time series without duplicate dates
    prod_df = prod_df.groupby('date', as_index=False).agg({'sales': 'sum'})
    
    prod_df = prod_df.set_index('date').asfreq('D', fill_value=0).reset_index()
    
    scaler = MinMaxScaler()
    scaled_sales = scaler.fit_transform(prod_df[["sales"]])
    X, y = create_sequences(scaled_sales, seq_len)
    
    if len(X) < 1: continue

    X_torch = torch.tensor(X, dtype=torch.float32)
    y_torch = torch.tensor(y, dtype=torch.float32)
    dataset = TensorDataset(X_torch, y_torch)
    loader = DataLoader(dataset, batch_size=4, shuffle=True)
    
    model = LSTMNet()
    loss_fn = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    print(f"Training model for {product}...")
    for epoch in range(30):
        for xb, yb in loader:
            optimizer.zero_grad()
            out = model(xb)
            loss = loss_fn(out, yb)
            loss.backward()
            optimizer.step()
            
    # Save the trained model
    product_key = str(product).replace(' ', '_').replace('"', '')
    torch.save({
        'model': model.state_dict(),
        'scaler_min': scaler.data_min_.tolist(),
        'scaler_max': scaler.data_max_.tolist(),
    }, f"ml_models/lstm_products/forecast_model_lstm_{product_key}.pth")
    print(f"Model for {product} saved.")