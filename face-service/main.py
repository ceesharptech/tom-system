from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="DDITS Face Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "ddits-face-service",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }


if __name__ == "__main__":
    import uvicorn
    port = int(__import__("os").environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
