# File: backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
# Import all the route modules, including our new one
from backend.app.routes import map_api, planner_api, social_api, insights_api, filters_api, planner_filters_api

app = FastAPI(title="OdinSight")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# API routers
app.include_router(map_api.router, prefix="/api/market_radar") 
app.include_router(planner_api.router, prefix="/api/planner")
app.include_router(social_api.router, prefix="/api/social")
app.include_router(insights_api.router, prefix="/api/insights")
app.include_router(filters_api.router, prefix="/api/filters") # For MarketRadar (untouched)

# THIS LINE IS THE FIX: Register the new router for the planner page
app.include_router(planner_filters_api.router, prefix="/api/planner-filters")


app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

@app.get("/")
def root_redirect():
    return RedirectResponse(url="/frontend/market_radar.html")