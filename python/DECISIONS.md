# Design decisions

This is a sketch built without access to InvolveXR's actual scenarios,
faculty rubrics, or production telemetry. Every decision below is a
calibrated guess that I would re-evaluate against real data on day one.
Each entry follows the same shape:

> *I assumed X. This might be wrong because Y. With access to Lumeto's
> actual systems I would Z.*

---

## 1. N-of-M consensus voting for non-determinism

**I assumed** that flake handling for LLM-driven dialog should be N-of-M
consensus voting (run the same assertion N times, require M to pass)
rather than seed-pinning, snapshot tests, or record-replay.

**This might be wrong because** consensus voting eats N times the API
budget per assertion run. If Lumeto already has a deterministic
shadow-mode backend (a temperature-zero reference run, a frozen LoRA, or
a cached-response provider) the cheap answer is to assert against that
once and treat divergence as a separate signal. Seed-pinning works only
if every layer of the stack honors the seed; if even one layer
(retriever, post-processor, safety filter) is non-deterministic, the
seed is a lie. Record-replay works for surface-text comparisons but
falls over the moment the model is upgraded. Snapshot tests have the
same problem in practice.

**With access to Lumeto's actual systems I would** prototype both: a
"strict" suite that runs against a temperature-zero reference if one
exists, and a "drift" suite that runs N-of-M against the production
provider. The strict suite catches code regressions; the drift suite
catches model regressions. The 80/20 mix between them is data I don't
have today.

The consensus utility lives in `src/dialog_harness/consensus.py`. It
ships a single primitive (`consensus(fn, runs=5, threshold=4)`) and a
latency dual (`latency_consensus`) that takes p95 across runs.

## 2. Semantic similarity for persona drift, not exact match

**I assumed** that "stays in character" should be cosine similarity
between the response and the persona description, using
sentence-transformers embeddings (with a TF-IDF fallback for offline
CI). The threshold is empirically the lowest score that admits good
responses while rejecting unrelated text.

**This might be wrong because** persona drift in clinical simulation is
rarely about surface vocabulary. A patient who says "I am an OpenAI
language model" can score similarly to a patient description on TF-IDF
because the words are short and unrelated. A real drift detector
probably wants either an LLM-as-judge prompt or a small fine-tuned
classifier trained on faculty-flagged out-of-character samples.

**With access to Lumeto's actual systems I would** ask whether
faculty-flagged "out of character" recordings exist. If yes, fine-tune
a tiny classifier; if no, ship the embeddings approach as a Tier 1
filter and add a `judge_with_claude(response, persona)` option for
high-stakes scenarios.

## 3. Scenario YAML, not Gherkin

**I assumed** that scenarios are best authored as YAML — pure data, no
imperative steps. The YAML carries probes, must-mention anchors,
must-not-mention bans, learner objectives, and translation maps.

**This might be wrong because** Lumeto's stack lists SpecFlow under
"Skills useful in the role." SpecFlow speaks Gherkin
(`Given/When/Then`), and faculty who already write Gherkin scenarios for
the simulation runtime would be force-context-switched into a second
DSL.

**With access to Lumeto's actual systems I would** keep the harness
core driven by structured probes (because semantic assertions don't
naturally compose as Gherkin steps) but add a Gherkin-to-YAML
transpiler so SpecFlow `.feature` files can act as the source of truth.
The mapping is sketched in `docs/specflow_mapping.md` (Phase 2).

## 4. Python prototype, C# wrapper, JS surface

**I assumed** that the harness core lives in Python (because the
embedding, evaluation, and LLM-tooling ecosystems are there) but that
the integration story for a Lumeto-style backend is a thin C# wrapper
that shells out to it from existing xUnit / SpecFlow suites.

**This might be wrong because** if Lumeto's production stack is .NET
top-to-bottom, a Python sidecar adds an operational tax (a second
runtime, a second deployment lane, a second set of pipelines) that may
not be worth the harness's value. The right answer in that world might
be to port the assertions library to C# directly and lose the
embeddings.

**With access to Lumeto's actual systems I would** ask how aggressively
they want a unified .NET stack. The current `dotnet/` stub is a
placeholder for a thin REST-or-CLI wrapper; if that's the wrong shape,
the C# port is a few days of work because the data structures are
simple.

## 5. Offline by default

**I assumed** CI portability is more valuable than realism, so the
default test path uses `MockLLMClient` and
`DIALOG_HARNESS_DISABLE_EMBEDDINGS=1`. Real provider calls and
embeddings load are gated behind environment variables
(`RUN_LIVE_LLM_TESTS=1`, omitting the disable flag).

**This might be wrong because** "offline by default" means the
deterministic mock can drift from the real provider's failure modes
without anyone noticing. The mock answers what it has been told to
answer; it never returns a 429, it never times out, it never produces
a stylistically unfaithful response.

**With access to Lumeto's actual systems I would** add a nightly job
that runs the live suite against the real provider, with results posted
to a Slack channel and a flake budget enforced (e.g. "fail the build if
the live mock-vs-real divergence rate exceeds 5% week-over-week").

## 6. Cross-language consistency via translation map, not embeddings

**I assumed** that "the Spanish version of the scenario must surface
the same clinical anchors as the English version" should be enforced by
an explicit translation map (`epinephrine -> epinefrina`) rather than
by cross-lingual embedding similarity.

**This might be wrong because** translation maps require human upkeep:
a faculty author who adds a new must-mention anchor in English has to
remember to add Spanish and French entries too, or the test silently
becomes English-only. A cross-lingual embedding model (LaBSE, BGE-M3)
could check semantic equivalence without the maintenance burden.

**With access to Lumeto's actual systems I would** ship both: keep the
explicit map as the strict gate (it's how clinical translators want to
work) and add a soft equivalence check using LaBSE that flags drift
between language versions for human review. Stop the build only on the
strict gate; surface the soft gate as a warning.

## 7. Scenario coverage tied to learner objectives

**I assumed** that the right metric for "are we testing the right
things?" is what percentage of a scenario's `learner_objectives` are
actually exercised by at least one probe (via keyword overlap with an
embedding tiebreaker).

**This might be wrong because** learner objectives in healthcare
simulation are usually higher-level than what a single probe can test
(e.g. "demonstrate situational awareness during deteriorating
respiratory status"). A simple "did any probe mention this objective"
metric will look 100% covered without actually testing the objective.

**With access to Lumeto's actual systems I would** map each objective
to a set of *behaviors* (probes + assertion patterns) rather than
keywords, and let faculty annotate which objective each probe
exercises. The current keyword + embedding heuristic is a Phase 1
proxy.

## 8. Where this would integrate with Lumeto's ACF

**I assumed** the harness slots in upstream of the ACF (AI Clinical
Facilitator pipeline announced at IMSH 2026) as a regression filter
during model-version bumps. New model -> run the harness -> if any
scenario regresses below its consensus threshold, gate the rollout.

**This might be wrong because** the ACF probably has its own evaluation
loop (faculty-graded sessions, learner outcome data, post-sim debrief
analysis) that is far richer than what offline probes can produce. My
harness might be a nightly smoke test rather than the gate.

**With access to Lumeto's actual systems I would** ask where in the
release flow regression matters most. If the answer is "between
model-version selection and rollout", the harness becomes a CI gate. If
it's "between rollout and learner-facing release", the same harness
becomes a canary monitor that runs every 30 minutes against a sample of
scenarios and pages on regression. Same code, different deployment
shape.

## 9. Why not record-and-replay against the OnScreen client

**I assumed** the right place to assert clinical correctness is at the
LLM boundary, not at the rendered DOM. A Playwright record-replay test
that captures the patient utterance from the OnScreen Web client tells
me whether the renderer broke; it does not tell me whether the model
hallucinated a medication.

**This might be wrong because** clinical correctness is sometimes
mediated by the renderer (e.g. the model returns markdown the renderer
doesn't escape, so the learner sees garbled text). A pure-LLM harness
misses that.

**With access to Lumeto's actual systems I would** keep this harness as
the LLM-boundary check and let the existing E2E suite (Playwright +
SpecFlow against the OnScreen Web client) own the rendering check. The
two layers compose; neither replaces the other.

## 10. Where the deterministic mock is honest

**I assumed** the canned responses in `MockLLMClient._fallback` are a
fair stand-in for "what a competent patient agent would say." They are
not. They are written by hand to make the assertions pass.

**This might be wrong because** every demo built this way looks better
than reality. The day this harness runs against a real model, half the
scenarios will fail in ways the mock cannot reproduce.

**With access to Lumeto's actual systems I would** seed the mock with
recordings of actual patient-agent responses (anonymized or paraphrased)
so the offline test surface matches the live failure distribution.
Until then, the `--live` flag and `RUN_LIVE_LLM_TESTS=1` are the honest
mode.

## 11. Coverage analyzer is keyword-biased toward content objectives

**I assumed** keyword-overlap-with-semantic-similarity-fallback is a
reasonable cheap signal for "which learner objectives does this scenario
exercise." The analyzer tokenizes objective text and probe text
(`prompt + must_mention`), drops stopwords, intersects, and falls back
to TF-IDF cosine similarity at threshold 0.30 if the keyword pass
misses.

**This might be wrong because** the signal is systematically biased
toward objectives whose vocabulary appears in patient responses (e.g.
"Recognize predictors of difficult airway" — "difficult" and "airway"
sit in the must_mention) and away from objectives about *learner*
behavior or protocol-name vocabulary (e.g. "Apply SPIKES framework" —
the patient never says "SPIKES"). The breaking-bad-news scenario
surfaces this clearly: the SPIKES framework objective is uncovered
because the patient response anchors are "results", "here", "lead",
which share no tokens with "spikes" or "framework". TF-IDF fallback
helps a little but not enough at 0.30 over short snippets.

**With access to Lumeto's actual systems I would** add a second
analyzer keyed off faculty-authored rubrics rather than free-text
objectives — every rubric criterion gets an explicit
"observable-in-response" anchor curated by the educator who wrote it.
The keyword analyzer becomes the cheap CI gate; the rubric analyzer
becomes the report-card-grade signal. Until then, expect the SPIKES /
empathic-listening / informed-consent style objectives to score lower
than they should under this metric, and read coverage as "how much of
the content surface this scenario exercises" not "how complete is the
protocol coverage."
