"""Embedding comparison and aggregation utilities."""
from typing import List

import numpy as np
from scipy.spatial.distance import cosine


def compute_cosine_distance(embedding1: List[float], embedding2: List[float]) -> float:
    """Compute cosine distance between two embeddings. Range 0.0 (identical) to 2.0 (opposite)."""
    a = np.array(embedding1, dtype=np.float64)
    b = np.array(embedding2, dtype=np.float64)
    if a.shape != b.shape:
        raise ValueError(f"Embedding shape mismatch: {a.shape} vs {b.shape}")
    return float(cosine(a, b))


def average_embeddings(embeddings: List[List[float]]) -> List[float]:
    """Average a list of embeddings (element-wise mean). Returns list of floats."""
    if not embeddings:
        raise ValueError("Cannot average empty list of embeddings")
    arr = np.array(embeddings, dtype=np.float64)
    mean = np.mean(arr, axis=0)
    return mean.tolist()
