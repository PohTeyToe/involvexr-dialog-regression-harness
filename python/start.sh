#!/usr/bin/env bash
set -euo pipefail
exec uvicorn dialog_harness_api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
