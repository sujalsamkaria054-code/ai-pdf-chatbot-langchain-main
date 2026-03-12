# Retrieval Agent Workflow

The retrieval assistant now runs as a resilient multi-step graph:

1. `checkQueryType`
2. `resolveDocument`
3. `detectIntent`
4. `detectPreferences`
5. `decideRetrieval`
6. `planResponse`
7. `retrieveDocuments` (if needed)
8. `generateResponse`
9. `recoverFromError` (only when generation/retrieval issues occur)

## Fallback strategy

- Structured-output calls are wrapped via `invokeStructuredSafely(...)`.
- Parsing/model-output failures do **not** crash runs; fallbacks are returned.
- Preferences always normalize to defaults:
  - `chartType: auto`
  - `reportDepth: standard`
  - `reportStyle: neutral`
  - `focusArea: ""`
  - `includeRecommendations: false`
  - `includeCharts: false`
  - `includeTables: false`
- Unknown intent is normalized to `unknown`, then safely downgraded to `direct_answer` in planning.
- Empty retrieval results produce a best-effort answer message rather than runtime failure.

## Why output parsing failures are prevented

- Optional preference fields accept `null`/missing values at schema boundary.
- `normalizePreferences(...)` guarantees complete defaults before downstream use.
- `classifyIntent` / `classifyPreferences` / generation paths all use safe structured invocation wrappers with bounded retries.
