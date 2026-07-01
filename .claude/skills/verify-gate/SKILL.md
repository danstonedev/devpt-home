---
name: verify-gate
description: >-
  Verify the DevPT home (devpt.app) static site before committing or pushing. There
  is no test runner here, so verification means validating apps.json (the canonical
  app registry that drives the nav/footer) and serving the site to confirm it renders
  and fetches. Use when asked to "verify", check the site, or confirm a content/registry
  change is safe.
---

# home verify gate

This is a **static site, no build step and no test runner** (`package.json` `test` is a
placeholder). Verification is lightweight but real:

1. **Validate `apps.json`** — it's the single source of truth for the catalog; a syntax
   error silently breaks the nav/footer. Parse it:
   `node -e "JSON.parse(require('fs').readFileSync('apps.json','utf8')); console.log('apps.json OK')"`.
   Confirm each entry still has its expected fields (id, name, live URL, repo, status,
   placement) and that `status` matches reality.
2. **Serve and load** — `npm start` (http-server on :8080). Open over http (not
   `file://`, or `app.js` can't `fetch('apps.json')`) and confirm: the marketing plates
   render, the "Practice tools" nav + footer populate from `apps.json`, and there are no
   console errors / 404s (check linked assets and `CV - Dan Stone.pdf`).
3. If you edited copy, also run the **claims-discipline-copy** skill's final pass.

Report what you actually observed; if the page falls back to the static nav lists in
`index.html`, that means the `apps.json` fetch failed — investigate, don't call it green.
