"""Face identification: match query image against stored embeddings."""
import logging
import os
from typing import Any, Dict, List

from deepface import DeepFace
from fastapi import UploadFile

from utils.image_processing import preprocess_for_deepface, validate_image
from utils.embedding_utils import compute_cosine_distance

logger = logging.getLogger(__name__)

MODEL_NAME = "ArcFace"


def _get_threshold() -> float:
    """Threshold from environment (default 0.4). Lower = stricter match."""
    try:
        return float(os.environ.get("FACE_CONFIDENCE_THRESHOLD", "0.4"))
    except (TypeError, ValueError):
        return 0.4


def _extract_embedding_from_upload(upload: UploadFile) -> List[float]:
    """Read upload, validate, preprocess, run DeepFace.represent, return embedding list."""
    image_bytes = upload.file.read()
    img_array = validate_image(image_bytes)
    img_array = preprocess_for_deepface(img_array)
    result = DeepFace.represent(
        img_path=img_array,
        model_name=MODEL_NAME,
        enforce_detection=True,
        detector_backend="opencv",
    )
    if not result:
        raise ValueError("No face detected in image")
    if len(result) > 1:
        raise ValueError("Multiple faces in image, please use a single face")
    emb = result[0].get("embedding")
    if emb is None:
        raise ValueError("Could not extract embedding from image")
    if hasattr(emb, "tolist"):
        emb = emb.tolist()
    return emb


def identify_face(
    query_image: UploadFile,
    stored_embeddings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Match query image against stored_embeddings.
    stored_embeddings: list of {"driver_id": str, "embedding": List[float]}.

    Returns either:
    - {"matched": True, "driver_id": str, "confidence": float, "distance": float}
    - {"matched": False, "message": str}
    """
    if not stored_embeddings:
        return {"matched": False, "message": "No stored embeddings to compare against"}

    try:
        query_emb = _extract_embedding_from_upload(query_image)
    except ValueError as e:
        raise ValueError(str(e)) from e

    threshold = _get_threshold()
    best_driver_id = None
    best_distance = float("inf")

    for item in stored_embeddings:
        driver_id = item.get("driver_id")
        emb = item.get("embedding")
        if not driver_id or emb is None:
            continue
        dist = compute_cosine_distance(query_emb, emb)
        if dist < best_distance:
            best_distance = dist
            best_driver_id = driver_id

    if best_driver_id is None:
        return {"matched": False, "message": "No match found above confidence threshold"}

    if best_distance < threshold:
        confidence = (1 - best_distance) * 100
        logger.info(
            "Identification match: driver_id=%s, confidence=%.2f%%, distance=%.4f",
            best_driver_id,
            confidence,
            best_distance,
        )
        return {
            "matched": True,
            "driver_id": best_driver_id,
            "confidence": round(confidence, 2),
            "distance": round(best_distance, 6),
        }

    logger.info(
        "Identification no match: best_driver_id=%s, best_distance=%.4f, threshold=%.4f",
        best_driver_id,
        best_distance,
        threshold,
    )
    return {
        "matched": False,
        "message": "No match found above confidence threshold",
    }
