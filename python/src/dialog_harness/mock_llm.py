from __future__ import annotations

import hashlib
import os
import random
import time
from dataclasses import dataclass, field
from typing import Protocol


class LLMClient(Protocol):
    def complete(self, prompt: str, *, language: str = "en") -> tuple[str, int]: ...


@dataclass
class MockLLMClient:
    """Deterministic mock keyed off probe text. No network, no flakes by default."""

    persona: str = "patient"
    canned: dict[str, str] = field(default_factory=dict)
    seed: int = 0
    inject_hallucination: bool = False
    base_latency_ms: int = 120

    def complete(self, prompt: str, *, language: str = "en") -> tuple[str, int]:
        key = prompt.strip().lower()
        if key in self.canned:
            response = self.canned[key]
        else:
            response = self._fallback(prompt, language)

        if self.inject_hallucination:
            response += " I would also start the patient on 80mg of fictomycin IV."

        digest = int(hashlib.sha256(f"{prompt}|{self.seed}".encode()).hexdigest(), 16)
        rng = random.Random(digest)
        latency = self.base_latency_ms + rng.randint(-30, 240)
        return response, max(1, latency)

    def _fallback(self, prompt: str, language: str) -> str:
        p = prompt.lower()
        es = language == "es"
        if "asleep" in p or "put to sleep" in p or "anesthesia" in p:
            return (
                "Yes, last time it was hard. The doctors said I have a difficult "
                "airway and obstructive sleep apnea. My neck does not bend much. "
                "I am anxious about going under for elective surgery again."
            )
        if "breathing at night" in p or "sleep" in p or "snore" in p:
            return (
                "I snore loudly and stop breathing at times. I have sleep apnea "
                "and use a CPAP at home."
            )
        if "tilt" in p or "neck" in p or "extension" in p:
            return "My neck is stiff. I cannot tilt it back very far."
        if "status" in p or "do we do first" in p or "first" in p:
            base = (
                "The child has no pulse. Begin compressions immediately and call "
                "for the code team."
            )
            return "El niño no tiene pulso. Inicien compresiones de inmediato." if es else base
        if "rate" in p or "depth" in p or "compress" in p:
            base = (
                "Compressions at 100 to 120 per minute, depth one third the chest "
                "diameter."
            )
            return "Compresiones a 100 a 120 por minuto." if es else base
        if "medication" in p or "drug" in p or "epi" in p:
            base = "Epinephrine 0.01 mg per kg IV every 3 to 5 minutes."
            return "Epinefrina 0.01 mg por kg IV cada 3 a 5 minutos." if es else base
        if "biopsy" in p or "results" in p:
            return (
                "I have your biopsy results to discuss. Take your time. "
                "I want to walk through the results carefully with you."
            )
        if "feeling" in p or "right now" in p:
            return "I can see this is a lot. I'm here. Take a breath."
        if "know first" in p or "what would you like" in p:
            return (
                "Whatever you'd like to start with is fine. Some people want the "
                "headline first, others want context. I will follow your lead."
            )
        if "name" in p or "who are you" in p:
            return f"My name is {self.persona[:40]}."
        return "I am not sure I understand. Could you say that another way?"


@dataclass
class RealLLMClient:
    """Plumbing-only stub for a real provider. Do not call in CI."""

    provider: str = "anthropic"
    model: str = "claude-3-5-sonnet"

    def complete(self, prompt: str, *, language: str = "en") -> tuple[str, int]:
        api_key = os.getenv(
            "ANTHROPIC_API_KEY" if self.provider == "anthropic" else "OPENAI_API_KEY"
        )
        if not api_key:
            raise RuntimeError(
                f"{self.provider} API key not set; use MockLLMClient in CI."
            )
        start = time.perf_counter()
        # Real implementation would call the SDK here.
        raise NotImplementedError(
            "RealLLMClient is a stub. Wire up provider SDK before enabling."
        )
        latency_ms = int((time.perf_counter() - start) * 1000)  # noqa: F841
