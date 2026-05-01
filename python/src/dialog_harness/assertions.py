from __future__ import annotations

from dataclasses import dataclass

from dialog_harness import embeddings


@dataclass
class AssertionResult:
    name: str
    passed: bool
    detail: str = ""


def _norm(text: str) -> str:
    return text.lower()


def assert_mentions(response: str, terms: list[str]) -> AssertionResult:
    """Response must contain each term (case-insensitive substring)."""
    body = _norm(response)
    missing = [t for t in terms if _norm(t) not in body]
    return AssertionResult(
        name="mentions",
        passed=not missing,
        detail=f"missing: {missing}" if missing else "all terms present",
    )


def assert_does_not_mention(response: str, banned: list[str]) -> AssertionResult:
    """Response must contain none of the banned terms."""
    body = _norm(response)
    hits = [b for b in banned if _norm(b) in body]
    return AssertionResult(
        name="does_not_mention",
        passed=not hits,
        detail=f"banned hits: {hits}" if hits else "clean",
    )


def assert_stays_in_character(
    response: str, persona: str, threshold: float = 0.05
) -> AssertionResult:
    """Cosine similarity between response and persona, above threshold.

    Uses sentence-transformers embeddings by default; falls back to TF-IDF
    cosine when the embedding model is unavailable (no model cache, no
    network, or DIALOG_HARNESS_DISABLE_EMBEDDINGS=1). The default threshold
    is intentionally low because TF-IDF persona similarity scores are tiny
    on short responses; production should retune for the embeddings backend
    (e.g. 0.30-0.40 with all-MiniLM-L6-v2).
    """
    if not response.strip() or not persona.strip():
        return AssertionResult("stays_in_character", False, "empty input")
    score = embeddings.similarity(persona, response)
    backend = embeddings.backend_name()
    return AssertionResult(
        name="stays_in_character",
        passed=score >= threshold,
        detail=f"similarity={score:.3f} threshold={threshold} backend={backend}",
    )


def assert_latency_p95(latencies_ms: list[int], ceiling_ms: int) -> AssertionResult:
    """p95 latency must be under ceiling."""
    if not latencies_ms:
        return AssertionResult("latency_p95", False, "no samples")
    ordered = sorted(latencies_ms)
    n = len(ordered)
    # linear interpolation between closest ranks (numpy-style, percentile=95)
    rank = 0.95 * (n - 1)
    lo = int(rank)
    hi = min(lo + 1, n - 1)
    frac = rank - lo
    p95 = ordered[lo] + (ordered[hi] - ordered[lo]) * frac
    p95 = int(round(p95))
    return AssertionResult(
        name="latency_p95",
        passed=p95 <= ceiling_ms,
        detail=f"p95={p95}ms ceiling={ceiling_ms}ms n={len(latencies_ms)}",
    )


def assert_language_consistency(
    responses_by_lang: dict[str, str],
    keyword_translations: dict[str, dict[str, str]],
) -> AssertionResult:
    """Every language variant must mention the translated form of each anchor concept.

    keyword_translations maps an English anchor to a dict of {lang: translated_term}.
    """
    failures: list[str] = []
    for anchor, by_lang in keyword_translations.items():
        for lang, response in responses_by_lang.items():
            term = by_lang.get(lang, anchor)
            if _norm(term) not in _norm(response):
                failures.append(f"{lang} missing '{term}' for anchor '{anchor}'")
    return AssertionResult(
        name="language_consistency",
        passed=not failures,
        detail="; ".join(failures) if failures else "all anchors present",
    )
