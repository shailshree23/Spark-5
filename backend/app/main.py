from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from backend.app.routes import map_api, planner_api, social_api, insights_api

app = FastAPI(title="Supply Chain Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

app.include_router(map_api.router, prefix="/api/map")
app.include_router(planner_api.router, prefix="/api/planner")
app.include_router(social_api.router, prefix="/api/social")
app.include_router(insights_api.router, prefix="/api/insights")

@app.get("/")
def root():
    return RedirectResponse(url="/frontend/")
