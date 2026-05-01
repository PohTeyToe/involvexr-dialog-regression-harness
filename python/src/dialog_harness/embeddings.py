"""Sentence-embedding similarity for persona-drift assertions.

Default backend: ``sentence-transformers/all-MiniLM-L6-v2``. Loaded once at
module level and cached.

Fallback: if the model is unavailable (no network at test time, no model
cache, or DIALOG_HARNESS_DISABLE_EMBEDDINGS=1) the module silently falls
back to a TF-IDF cosine. The fallback is good enough for unit tests but
the documented production path is sentence-transformers.
"""

from __future__ import annotations

import os
import threading
from typing import Any


_DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

_lock = threading.Lock()
_model: Any = None
_model_failed: bool = False
_backend: str = "uninitialized"


def _load_model() -> Any:
    global _model, _model_failed, _backend
    if _model is not None or _model_failed:
        return _model
    with _lock:
        if _model is not None or _model_failed:
            return _model
        if os.environ.get("DIALOG_HARNESS_DISABLE_EMBEDDINGS") == "1":
            _model_failed = True
            _backend = "tfidf (disabled by env)"
            return None
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(_DEFAULT_MODEL)
            _backend = f"sentence-transformers/{_DEFAULT_MODEL}"
        except Exception:
            _model = None
            _model_failed = True
            _backend = "tfidf (sentence-transformers unavailable)"
        return _model


def backend_name() -> str:
    """Human-readable name of whichever backend is in use."""
    if _backend == "uninitialized":
        _load_model()
    return _backend


def similarity(text_a: str, text_b: str) -> float:
    """Cosine similarity in [0, 1] between two strings."""
    if not text_a.strip() or not text_b.strip():
        return 0.0
    model = _load_model()
    if model is not None:
        try:
            embeddings = model.encode(
                [text_a, text_b], normalize_embeddings=True, convert_to_numpy=True
            )
            score = float((embeddings[0] * embeddings[1]).sum())
            # Cosine of normalized vectors lives in [-1, 1]; clamp to [0, 1].
            return max(0.0, min(1.0, score))
        except Exception:
            pass
    return _tfidf_similarity(text_a, text_b)


def _tfidf_similarity(text_a: str, text_b: str) -> float:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    vec = TfidfVectorizer().fit([text_a, text_b])
    mat = vec.transform([text_a, text_b])
    return float(cosine_similarity(mat[0], mat[1])[0][0])
