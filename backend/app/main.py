# File: backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
# --- (CHANGE 1) ADD the new import for filters_api ---
from backend.app.routes import map_api, planner_api, social_api, insights_api, filters_api

# --- (CHANGE 2) UPDATE the project title ---
app = FastAPI(title="OdinSight")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# API routers go here
# I'm using the prefix from your code, not the README, to minimize changes.
app.include_router(map_api.router, prefix="/api/market_radar") 
app.include_router(planner_api.router, prefix="/api/planner")
app.include_router(social_api.router, prefix="/api/social")
app.include_router(insights_api.router, prefix="/api/insights")
# --- (CHANGE 3) ADD the new router for filters ---
app.include_router(filters_api.router, prefix="/api/filters")


app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

# The root redirect MUST point to the URL that the browser will use.
@app.get("/")
def root_redirect():
    # --- (CHANGE 4) POINT the redirect to the main page ---
    return RedirectResponse(url="/frontend/market_radar.html")