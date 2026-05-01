# Deployment

The repository is build-ready. Tokens were not exported in the build
shell, so the actual deploy commands need to run from a shell with the
relevant credentials available.

## Front-end (Vercel)

```bash
cd web
vercel login                    # browser-based, one-time
vercel --prod                    # deploys to production
```

Or with a token:

```bash
cd web
vercel --token "$VERCEL_TOKEN" --yes --prod
```

When the deploy succeeds, copy the production URL into the root
`README.md` "Live demo" section and add it as `NEXT_PUBLIC_API_URL`
once the backend is up.

## Back-end (Render — preferred)

The FastAPI server lives at `python/src/dialog_harness_api/main.py`.

```bash
# Through the Render dashboard:
# 1. New > Web Service
# 2. Connect repo: PohTeyToe/involvexr-dialog-regression-harness
# 3. Root directory: python
# 4. Build command: pip install -e .
# 5. Start command: uvicorn dialog_harness_api.main:app --host 0.0.0.0 --port $PORT
# 6. Environment: Python 3.12
# 7. Add env var: ANTHROPIC_API_KEY = sk-ant-...
```

Or via the Render REST API once `RENDER_API_KEY` is set, see the Render
docs.

## Back-end (Railway — alternative)

`railway.json` is wired at the repo root. With a fresh Railway login:

```bash
railway login
railway link                     # link to a new or existing project
railway up                       # deploys based on railway.json
railway domain                   # generate a public URL
railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

## Wiring front-end to back-end

After both are deployed, set the Vercel env var:

```bash
cd web
vercel env add NEXT_PUBLIC_API_URL production
# paste the Render or Railway URL when prompted
vercel --prod                    # redeploy with the new env var
```

The front-end falls back to mock data when `NEXT_PUBLIC_API_URL` is
unset or unreachable, so the URL is always demonstrable even without
the backend.

## Verification

- `https://<vercel-url>/` — home page renders, dark mode, sidebar nav
- `https://<vercel-url>/scenarios` — three scenario cards visible
- `https://<vercel-url>/scenarios/difficult_airway` — YAML preview, probes, objectives
- `https://<vercel-url>/run` — pick a scenario, click Run, watch SSE stream
- `https://<vercel-url>/reports` — list of historical runs (mock or real)
- `https://<vercel-url>/architecture` — SVG architecture diagram
- `https://<vercel-url>/docs/decisions` — markdown render of DECISIONS.md
- `https://<render-url>/api/scenarios` — JSON list of 3 scenarios
- `https://<render-url>/api/runs/<id>/stream` — SSE stream when a run is started
