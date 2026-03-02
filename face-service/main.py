"""
TOMS Face Recognition Service — FastAPI app.
Endpoints: /health, /enroll, /identify.
Run: uvicorn main:app --reload --port 8000
"""
import json
import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from models.face_enrollment import enroll_face
from models.face_identification import identify_face

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TOMS Face Service",
    version="1.0.0",
    description="Facial recognition for driver enrollment and identification (ArcFace).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health check; reports model name."""
    model = os.environ.get("MODEL_NAME", "ArcFace")
    return {
        "success": True,
        "data": {
            "status": "ok",
            "model": model,
            "service": "toms-face-service",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }


@app.post("/enroll")
async def enroll(
    driver_id: str = Form(...),
    images: list[UploadFile] = File(...),
):
    """
    Enroll a driver with 3-5 face images.
    Returns averaged ArcFace embedding.
    """
    if not driver_id or not driver_id.strip():
        raise HTTPException(status_code=400, detail="driver_id is required")
    driver_id = driver_id.strip()

    # FastAPI may send single file as one item
    if not isinstance(images, list):
        images = [images] if images else []

    try:
        embedding = enroll_face(driver_id, images)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Enrollment failed for driver_id=%s", driver_id)
        raise HTTPException(status_code=500, detail="Face enrollment processing failed") from e

    return {
        "success": True,
        "driver_id": driver_id,
        "embedding": embedding,
        "model": "ArcFace",
        "num_images": len(images),
    }


@app.post("/identify")
async def identify(
    image: UploadFile = File(...),
    stored_embeddings: str = Form(...),
):
    """
    Identify a face from a single image against stored embeddings.
    stored_embeddings: JSON string array of { "driver_id": str, "embedding": [float] }.
    """
    if not image:
        raise HTTPException(status_code=400, detail="image file is required")
    if not stored_embeddings or not stored_embeddings.strip():
        raise HTTPException(status_code=400, detail="stored_embeddings JSON is required")

    try:
        embeddings_list = json.loads(stored_embeddings)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid stored_embeddings JSON: {e}") from e

    if not isinstance(embeddings_list, list):
        raise HTTPException(status_code=400, detail="stored_embeddings must be a JSON array")

    try:
        result = identify_face(image, embeddings_list)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Identification failed")
        raise HTTPException(status_code=500, detail="Face identification processing failed") from e

    if result.get("matched"):
        return {"success": True, "data": result}
    raise HTTPException(status_code=404, detail=result)
