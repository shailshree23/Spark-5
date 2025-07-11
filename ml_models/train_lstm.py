import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset
import os

# Load sales data
sales_df = pd.read_csv("backend/data/sales.csv")
sales_df["date"] = pd.to_datetime(sales_df["date"])

# Directory to save per-product models
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
    # Aggregate sales per date to avoid duplicate dates
    prod_df = prod_df.groupby('date', as_index=False).agg({'sales': 'sum'})
    # Fill missing dates
    prod_df = prod_df.set_index('date').asfreq('D', fill_value=0).reset_index()
    scaler = MinMaxScaler()
    scaled_sales = scaler.fit_transform(prod_df[["sales"]])
    X, y = create_sequences(scaled_sales, seq_len)
    if len(X) == 0:
        continue
    X = torch.tensor(X).float()
    y = torch.tensor(y).float()
    dataset = TensorDataset(X, y)
    loader = DataLoader(dataset, batch_size=4, shuffle=True)
    model = LSTMNet()
    loss_fn = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    for epoch in range(30):
        total_loss = 0
        for xb, yb in loader:
            optimizer.zero_grad()
            out = model(xb)
            loss = loss_fn(out, yb)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (epoch + 1) % 10 == 0:
            print(f"{product} Epoch {epoch+1}: Loss={total_loss/len(loader):.4f}")
    torch.save({
        'model': model.state_dict(),
        'scaler_min': scaler.data_min_.tolist(),
        'scaler_max': scaler.data_max_.tolist(),
    }, f"ml_models/lstm_products/forecast_model_lstm_{product.replace(' ', '_')}.pth")
