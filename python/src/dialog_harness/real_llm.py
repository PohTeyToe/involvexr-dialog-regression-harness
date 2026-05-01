"""Real Anthropic-backed LLM client.

Implements the same protocol as :class:`MockLLMClient` so the runner can swap
between offline and live without code changes. Reads ``ANTHROPIC_API_KEY`` from
the environment. Default model is ``claude-sonnet-4-5``.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any


_LANG_NAMES: dict[str, str] = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
}


@dataclass
class RealLLMClient:
    """Calls Anthropic's Messages API to play the patient persona."""

    persona: str = "patient"
    model: str = "claude-sonnet-4-5"
    max_tokens: int = 400
    temperature: float = 0.6
    timeout_s: float = 30.0
    api_key: str | None = None
    _client: Any = field(default=None, init=False, repr=False)

    def _ensure_client(self) -> Any:
        if self._client is not None:
            return self._client
        try:
            from anthropic import Anthropic
        except ImportError as exc:
            raise RuntimeError(
                "anthropic package not installed; pip install anthropic"
            ) from exc
        key = self.api_key or os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY not set; cannot use RealLLMClient. "
                "Use MockLLMClient for offline runs."
            )
        self._client = Anthropic(api_key=key, timeout=self.timeout_s)
        return self._client

    def _system_prompt(self, language: str) -> str:
        lang_name = _LANG_NAMES.get(language, language)
        return (
            f"You are role-playing a patient in a clinical simulation. "
            f"Persona: {self.persona}. "
            f"Respond in {lang_name}. "
            "Stay in character. Do not break the fourth wall, do not mention "
            "you are an AI, and do not invent medications or lab values that "
            "were not stated in the persona description. Keep responses to "
            "two or three sentences unless asked for detail."
        )

    def complete(self, prompt: str, *, language: str = "en") -> tuple[str, int]:
        client = self._ensure_client()
        start = time.perf_counter()
        msg = client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=self._system_prompt(language),
            messages=[{"role": "user", "content": prompt}],
        )
        latency_ms = int((time.perf_counter() - start) * 1000)
        # Concatenate text blocks (Anthropic returns a list of content blocks).
        parts: list[str] = []
        for block in msg.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        response = "\n".join(parts).strip()
        return response, max(1, latency_ms)
