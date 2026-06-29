---
name: claims-discipline-copy
description: >-
  Editorial guardrails for public-facing copy on the DevPT / simLAB sites. Use
  whenever you write or revise marketing, landing, or product copy here — homepage
  plates, app descriptions in apps.json, About/section text, headlines, CTAs — or
  when a task says to "align to the simLAB strategy", tighten messaging, or apply
  claims discipline. Keeps health/education claims honest, evidence-led, and
  audience-first for a PT-education product built at UND.
---

# Claims discipline for public copy

This is `home` (devpt.app) — a static site where **content lives in `index.html`
marketing "plates", and `apps.json` is the canonical app registry** (id, name,
URL, status, placement) that drives the nav/footer via `app.js`. Edit copy in
`index.html` and tool metadata in `apps.json`; never hardcode a tool list that
`apps.json` already owns.

## The standard (what "claims discipline" means)
This is a clinical-education product. Overstated copy is a liability, not just a
style nit. Every claim must be **true, sourced-or-softened, and audience-first.**

**Do**
- **Lead with the audience and the job-to-be-done**, not the technology. Say what a
  student/faculty member can *do*, then how.
- **Be evidence-led.** When you assert an outcome ("improves clinical reasoning"),
  either tie it to evidence/an artifact the product actually produces, or reframe as
  intent ("designed to build…") — not fact.
- **Match the claim to product `maturity`.** A `prototype`/`internal` tool is described
  as such; don't market pilot/aspirational features as shipped. Mirror the honest
  `maturity`/`status` already tracked in `apps.json` and the simLAB design docs.
- **Prefer concrete, verifiable numbers** ("28,092 classified triangles", "20 regions")
  over vague superlatives.
- **Name the education bridge** — connect the tool to the learning outcome / CAPTE-NPTE
  framing the simLAB strategy uses, so copy reads as pedagogy, not gadgetry.

**Don't**
- No clinical/diagnostic claims, efficacy promises, or implied medical-device status.
  This is a *teaching* simulation, not a clinical instrument — say so when relevant.
- No "best/leading/revolutionary/AI-powered" filler or unbacked superlatives.
- Don't imply features, integrations, or partnerships that aren't live.
- Don't bury the audience under jargon or stack three adjectives where one fact works.

## Voice
Light editorial theme, UND-green accent, serious but plain. Audience-first, evidence-led,
declarative. Simpler is the house win — recent refinements all moved *toward* less copy,
not more.

## Before finishing
1. Re-read each new/edited claim and ask: *is this literally true today, and can I point
   to the evidence or artifact behind it?* If not, soften to intent or cut it.
2. Confirm any tool you describe matches its `apps.json` `status` and the simLAB docs'
   `maturity`.
3. Serve over http(s) (`npm start`, not `file://`) and eyeball the rendered plates +
   the `apps.json`-driven nav/footer.
