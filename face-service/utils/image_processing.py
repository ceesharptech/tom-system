"""Image validation and preprocessing for DeepFace."""
import io
import logging
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
MIN_WIDTH = 100
MIN_HEIGHT = 100


def validate_image(image_bytes: bytes) -> np.ndarray:
    """
    Validate image bytes and convert to numpy array.
    - Check valid image format
    - Validate dimensions (must be > 100x100 pixels)
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Empty image data")

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ValueError(f"Invalid image format: {e}") from e

    img_array = np.array(pil_img)
    if img_array.size == 0:
        raise ValueError("Image could not be decoded")

    h, w = img_array.shape[:2]
    if w < MIN_WIDTH or h < MIN_HEIGHT:
        raise ValueError(
            f"Image dimensions too small: {w}x{h}. Minimum is {MIN_WIDTH}x{MIN_HEIGHT} pixels."
        )

    return img_array


def preprocess_for_deepface(image_array: np.ndarray) -> np.ndarray:
    """
    Ensure image is in RGB format for DeepFace.
    DeepFace expects RGB; PIL/OpenCV may load as RGBA or BGR.
    """
    if image_array.ndim == 2:
        # Grayscale -> repeat to RGB
        return np.stack([image_array] * 3, axis=-1)
    if image_array.shape[-1] == 4:
        # RGBA -> RGB
        return image_array[:, :, :3].copy()
    if image_array.shape[-1] == 3:
        # Assume RGB (DeepFace handles BGR internally if needed)
        return image_array
    raise ValueError(f"Unexpected image shape: {image_array.shape}")
