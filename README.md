# 📦 SupplyChainPro

A comprehensive supply chain optimization platform with AI-powered demand forecasting, geographic visualization, and real-time analytics.

## 🚀 Features

- **Interactive Mapping**: Geographic visualization of supply chain operations
- **AI-Powered Forecasting**: LSTM and Graph Neural Network models for demand prediction
- **Inventory Optimization**: Real-time inventory status and recommendations
- **Social Media Integration**: Analyzes social trends to predict demand
- **Multi-Region Support**: Handles operations across different regions
- **Real-time Analytics**: Provides insights and risk projections

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, Leaflet.js
- **Backend**: FastAPI, Python
- **ML/AI**: PyTorch, LSTM, Graph Neural Networks
- **Data**: CSV files, pandas for data manipulation
- **APIs**: RESTful API design with CORS support

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Train ML Models (Optional)

The application will work with fallback forecasting if models aren't trained, but for best results:

```bash
cd ml_models
python train_lstm.py
python train_gnn.py
cd ..
```

### 3. Start the Application

```bash
python run.py
```

### 4. Access the Application

- **Frontend**: http://127.0.0.1:8000/frontend/index.html
- **API Documentation**: http://127.0.0.1:8000/docs
- **Backend API**: http://127.0.0.1:8000

## 📁 Project Structure

```
project-root/
├── frontend/          # Web interface
│   ├── index.html     # Main map interface
│   ├── planner.html   # Inventory planning
│   ├── social.html    # Social trends
│   ├── insights.html  # Analytics
│   ├── css/           # Stylesheets
│   └── js/            # JavaScript files
├── backend/           # FastAPI server
│   ├── app/
│   │   ├── main.py    # Application entry point
│   │   ├── routes/    # API endpoints
│   │   └── utils/     # Business logic
│   └── data/          # CSV datasets
├── ml_models/         # Machine learning models
│   ├── train_lstm.py  # LSTM training script
│   └── train_gnn.py   # GNN training script
├── requirements.txt   # Python dependencies
├── run.py            # Startup script
└── README.md         # This file
```

## 🔧 API Endpoints

- `GET /api/map` - Geographic data and demand hotspots
- `GET /api/planner` - Inventory planning and forecasting
- `GET /api/social` - Social media trend analysis
- `GET /api/insights` - Business analytics and insights

## 📊 Data Sources

The application uses several CSV datasets:
- `sales.csv` - Historical sales data
- `inventory.csv` - Current inventory levels
- `locations.csv` - Warehouse locations
- `social_trends.csv` - Social media trend data

## 🎯 Use Cases

- Supply chain managers needing geographic oversight
- Inventory planners requiring demand forecasts
- Business analysts seeking market insights
- Operations teams managing multi-location warehouses

## 🔍 Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed with `pip install -r requirements.txt`
2. **Model Loading Errors**: The app will use fallback forecasting if ML models aren't available
3. **CORS Issues**: The backend is configured to allow all origins for development

### Development

For development, the application runs with auto-reload enabled. Any changes to Python files will automatically restart the server. 
