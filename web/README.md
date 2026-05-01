# Dialog Harness — Web

Next.js 15 App Router frontend for the dialog regression harness. Built to be
the educator-facing surface that streams live runs from the FastAPI server in
[`../python/`](../python/) and renders coverage, latency, and per-probe results
in a way faculty can actually read.

The frontend is fully usable offline: every page falls back to mock data
sourced from the same YAML scenarios when `NEXT_PUBLIC_API_URL` is unset or
the backend is unreachable. This matters for demos and CI preview deploys.

## Stack

- Next.js 15 App Router, React 19, TypeScript strict
- Tailwind v4 + shadcn-style component primitives
- recharts (latency histogram, coverage donut)
- react-syntax-highlighter (YAML), react-markdown + remark-gfm (docs)
- next-themes for the dark / light toggle
- Geist Sans / Geist Mono via `next/font/google`

## Local development

```bash
cd web
npm install
npm run dev
# open http://localhost:3000
```

To point at a real backend, set `NEXT_PUBLIC_API_URL` in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The header pill flips from "Mock data" to "Live API" once a backend is
configured.

## Pages

| Path | What it does |
|-|-|
| `/` | Hero, feature trio, repo tour |
| `/scenarios` | Library of YAML-defined clinical scenarios |
| `/scenarios/[name]` | YAML preview + persona / objectives / probes / languages tabs |
| `/run` | Live regression run — picks scenario, opens SSE stream, animates per-probe results |
| `/reports` | Past runs table with pass rate, latency p95, coverage |
| `/reports/[id]` | Run detail with latency histogram, coverage donut, diff vs previous |
| `/architecture` | SVG diagram of how the harness slots into the existing stack |
| `/docs/[slug]` | Markdown design docs (decisions, csharp_equivalents, specflow_mapping) |

## Build

```bash
npm run build
npm run start
```

`npm run typecheck` runs `tsc --noEmit` over the whole tree.

## Deployment

This app deploys cleanly to Vercel. The repo root is the project root; set
**Root Directory** in Vercel project settings to `web`.

```
vercel --prod
```
