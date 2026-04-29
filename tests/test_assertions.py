from __future__ import annotations

from dialog_harness import assertions


def test_mentions_pass() -> None:
    r = assertions.assert_mentions("I have sleep apnea and a difficult airway.", ["sleep apnea"])
    assert r.passed


def test_mentions_fail_lists_missing() -> None:
    r = assertions.assert_mentions("I am fine.", ["sleep apnea", "stridor"])
    assert not r.passed
    assert "sleep apnea" in r.detail


def test_does_not_mention_pass() -> None:
    r = assertions.assert_does_not_mention("Patient is stable.", ["fictomycin"])
    assert r.passed


def test_does_not_mention_fail() -> None:
    r = assertions.assert_does_not_mention(
        "I'd give 80mg of fictomycin IV.", ["fictomycin"]
    )
    assert not r.passed
    assert "fictomycin" in r.detail


def test_persona_pass() -> None:
    persona = "65 year old anxious patient with sleep apnea and difficult airway"
    response = "I have sleep apnea and I'm worried about the difficult airway again."
    r = assertions.assert_stays_in_character(response, persona, threshold=0.05)
    assert r.passed


def test_persona_fail_unrelated() -> None:
    persona = "65 year old patient with sleep apnea"
    response = "Quarterly revenue grew due to favourable foreign exchange tailwinds."
    r = assertions.assert_stays_in_character(response, persona, threshold=0.10)
    assert not r.passed


def test_latency_p95_pass() -> None:
    r = assertions.assert_latency_p95([100, 110, 120, 130, 200], ceiling_ms=300)
    assert r.passed


def test_latency_p95_fail() -> None:
    r = assertions.assert_latency_p95([100] * 19 + [9999], ceiling_ms=500)
    assert not r.passed


def test_language_consistency_pass() -> None:
    responses = {
        "en": "Begin compressions and prepare epinephrine.",
        "es": "Inicien compresiones y preparen epinefrina.",
    }
    translations = {
        "compressions": {"en": "compressions", "es": "compresiones"},
        "epinephrine": {"en": "epinephrine", "es": "epinefrina"},
    }
    r = assertions.assert_language_consistency(responses, translations)
    assert r.passed


def test_language_consistency_fail() -> None:
    responses = {
        "en": "Begin compressions and prepare epinephrine.",
        "es": "Hagan algo, no recuerdo qué.",
    }
    translations = {
        "epinephrine": {"en": "epinephrine", "es": "epinefrina"},
    }
    r = assertions.assert_language_consistency(responses, translations)
    assert not r.passed
