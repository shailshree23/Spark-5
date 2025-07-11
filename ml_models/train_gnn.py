import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd
import numpy as np

df = pd.read_csv("backend/data/sales.csv")
product_sales = df.groupby('product')['sales'].sum().to_dict()
products = list(product_sales.keys())

features = []
for product in products:
    sales_vol = product_sales[product] / max(product_sales.values())
    category = df[df['product'] == product]['category'].iloc[0]
    category_enc = {'Electronics': 0.0, 'Fashion': 0.5, 'Grocery': 1.0}[category]
    features.append([sales_vol, category_enc])

features = torch.tensor(features, dtype=torch.float32)

adj_matrix = torch.zeros(len(products), len(products))
for i, product1 in enumerate(products):
    for j, product2 in enumerate(products):
        if i == j:
            adj_matrix[i][j] = 1
        elif df[df['product'] == product1]['category'].iloc[0] == df[df['product'] == product2]['category'].iloc[0]:
            adj_matrix[i][j] = 1

class GNNLayer(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)

    def forward(self, X, A):
        return self.linear(torch.matmul(A, X))

class GNNModel(nn.Module):
    def __init__(self, num_features=2, hidden_size=16, output_size=1):
        super().__init__()
        self.gnn1 = GNNLayer(num_features, hidden_size)
        self.gnn2 = GNNLayer(hidden_size, output_size)

    def forward(self, X, A):
        x = F.relu(self.gnn1(X, A))
        x = self.gnn2(x, A)
        return x.mean(dim=0)

model = GNNModel()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
loss_fn = nn.MSELoss()

targets = torch.tensor([[vol] for vol in [product_sales[p] / max(product_sales.values()) for p in products]], dtype=torch.float32)

for epoch in range(100):
    optimizer.zero_grad()
    y_pred = model(features, adj_matrix)
    loss = loss_fn(y_pred, targets.mean(dim=0))
    loss.backward()
    optimizer.step()
    if (epoch + 1) % 20 == 0:
        print(f"Epoch {epoch+1}: GNN Loss={loss.item():.4f}")

torch.save(model, "forecast_model_gnn.pth")