# DECISIONS

Explicit assumptions I made while building this sketch. The point is to invite
correction — every one of these has a real answer inside Lumeto that I don't have.

1. **I assumed the highest-value regression target is clinical content fidelity, not
   surface dialog quality.** This might be wrong because faculty may grade equally
   on tone, pacing, and emotional realism — none of which I've modelled. With access
   to Lumeto's actual scenarios I would talk to a clinical lead and rebuild the
   assertion taxonomy from the rubric they already use to grade learners.

2. **I assumed scenarios should live as YAML, authored by engineers.** This is
   probably wrong — faculty likely author scenarios through a UI, and the YAML I'd
   want to test against is an export of that UI's data. With access I would stop
   designing the scenario format and start consuming whatever the platform already
   produces.

3. **I assumed TF-IDF is "good enough" for persona drift detection in a sketch.**
   It is not good enough for production — it conflates topic with persona, and a
   patient who suddenly answers like a doctor would still pass. With access I would
   wire in a sentence-transformer or ask the in-house model team which embedding
   they already trust.

4. **I assumed banned-mention checks via substring matching are acceptable.** They
   miss paraphrases ("80mg fictomycin" vs "eighty milligrams of fictomycin").
   With access I would add an LLM-judge pass for the high-stakes cases and keep
   substrings only as a fast first filter.

5. **I assumed cross-language consistency can be checked with a hand-maintained
   keyword translation map.** This obviously doesn't scale beyond a demo. With
   access I would either generate translations from a parallel-text source the
   clinical team trusts, or use embedding-space alignment so we don't have to
   hand-curate `compressions -> compresiones` for every concept.

6. **I assumed offline-deterministic-by-default is the right CI posture.** Real
   regression testing has to also run against the live model in a separate, slower
   pipeline that can flag drift introduced by a model upgrade. With access I would
   split this into `pytest` (offline, mock) and a nightly `pytest -m live` job that
   hits the real provider and posts diffs to Slack.

7. **I assumed a single-turn probe model is sufficient.** Most clinical reasoning
   is multi-turn — the second utterance depends on the first. With access I would
   move to a turn-by-turn transcript model where each probe carries the prior
   conversation as context, and assertions can fire on the trajectory rather than
   one response in isolation.

8. **I assumed I'd test at the model layer, not the rendered surface.** OnScreen
   Web, VR, and Desktop each have their own rendering path that can drop, truncate,
   or re-time the same model output. With access I would add a Playwright-driven
   harness for the OnScreen Web client and assert the rendered DOM text matches the
   model's emitted text — that's where regressions actually hurt the learner.
