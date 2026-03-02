"""Face enrollment: extract and average embeddings from 3-5 images."""
import logging
from typing import List

from deepface import DeepFace
from fastapi import UploadFile

from utils.image_processing import preprocess_for_deepface, validate_image
from utils.embedding_utils import average_embeddings

logger = logging.getLogger(__name__)

MIN_IMAGES = 3
MAX_IMAGES = 5
MODEL_NAME = "ArcFace"


def enroll_face(driver_id: str, image_files: List[UploadFile]) -> List[float]:
    """
    Validate 3-5 images, extract ArcFace embedding from each, average and return.
    Raises ValueError for validation or detection errors.
    """
    if not image_files or len(image_files) < MIN_IMAGES:
        raise ValueError(f"At least {MIN_IMAGES} images required, got {len(image_files) or 0}")
    if len(image_files) > MAX_IMAGES:
        raise ValueError(f"At most {MAX_IMAGES} images allowed, got {len(image_files)}")

    logger.info("Enrollment attempt: driver_id=%s, num_images=%s", driver_id, len(image_files))
    embeddings: List[List[float]] = []

    for idx, upload in enumerate(image_files):
        image_bytes = upload.file.read()
        upload.file.seek(0)

        try:
            img_array = validate_image(image_bytes)
        except ValueError as e:
            raise ValueError(f"Image {idx + 1}: {e}") from e

        img_array = preprocess_for_deepface(img_array)

        try:
            result = DeepFace.represent(
                img_path=img_array,
                model_name=MODEL_NAME,
                enforce_detection=True,
                detector_backend="opencv",
            )
        except Exception as e:
            err_msg = str(e).lower()
            if "face" in err_msg and "detect" in err_msg:
                raise ValueError(f"No face detected in image {idx + 1}") from e
            if "multiple" in err_msg:
                raise ValueError(
                    f"Multiple faces in image {idx + 1}, please crop to single face"
                ) from e
            logger.exception("DeepFace.represent failed for image %s", idx + 1)
            raise ValueError(f"Face processing failed for image {idx + 1}: {e}") from e

        if not result:
            raise ValueError(f"No face detected in image {idx + 1}")
        if len(result) > 1:
            raise ValueError(
                f"Multiple faces in image {idx + 1}, please crop to single face"
            )

        emb = result[0].get("embedding")
        if emb is None:
            raise ValueError(f"Could not extract embedding from image {idx + 1}")
        # Convert numpy to list if needed
        if hasattr(emb, "tolist"):
            emb = emb.tolist()
        embeddings.append(emb)

    averaged = average_embeddings(embeddings)
    logger.info("Enrollment success: driver_id=%s, embedding_dim=%s", driver_id, len(averaged))
    return averaged
