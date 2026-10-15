# DevPT — devpt.app

The master home page and hub for **DevPT**: a growing platform of simulation and
assessment tools for physical therapy education, built at the University of North
Dakota.

It's a static deployment embedding the public walkthrough from simLAB's own deployment. The app catalog is
data-driven: **[`apps.json`](apps.json) is the single source of truth**, and
`app.js` renders the footer tool list from it.

## Stack

- `index.html` — homepage content, embedded native showcase, student/faculty sections and lab links
- `apps.json` — **canonical app registry** (id, name, live URL, backing repo, status, placement)
- `styles.css` — light editorial theme, UND-green accent
- `app.js` — screenshot dialog, mobile menu and footer catalog
- `walkthrough.js` / `native-showcase.css` — live walkthrough navigation, shared catalogue and frame visibility
- `showcase/index.html` — redirect for old public bookmarks
- `assets/` — logo, demo videos/posters, screenshots
- `CV - Dan Stone.pdf` — linked from the About section

Fonts (Hanken Grotesk + JetBrains Mono) load from Google Fonts; product imagery is local.

## James’s walkthrough — one shared build

The homepage embeds **https://lab.devpt.app/showcase/**. That document is built and
deployed by simLAB, alongside the signed-in application, from the same commit and
component sources. The homepage no longer compiles, pins or ships its own patient
models, clinical UI or study tools.

James Morgan’s real case supplies the identity, patient words, symptom drawing,
exam results and follow-up scenarios. The guided visit connects the interview,
3D symptom map, native supine hip examinations, reasoning workspace and plan of care.
Guests can pause, choose chapters and explore the same learning labs. This public
sample is scripted and keeps an in-memory session; it does not call protected AI
or account APIs or save a learner attempt.

`walkthrough.js` owns only homepage navigation, frame visibility and the full-view
link. It accepts messages only from its actual simLAB frame and exact source
origin. Chapter labels and the study-tool catalogue come from that live frame's
versioned ready message. Updating the catalogue in simLAB updates the homepage
navigation and study cards without another homepage build. Iframes pause and
release their native views while offscreen; the guest's case state remains.

The two walkthrough iframes explicitly use `referrerpolicy="origin"`. The
production site's `Referrer-Policy: same-origin` otherwise hides devPT's origin
from the trusted bridge and leaves the embed paused. This frame policy sends
only the origin, without the homepage path or query.

The old `showcase/` URL is a bookmark redirect to the live entry. The former
generated assets, `showcase-src/` adapters and pinned-source build script have
been retired. `node scripts/check-live-showcase.mjs` runs in CI to prevent a
vendored simulator from returning.

For an intentional two-repository local preview, start simLAB's mission-shell
development server on **127.0.0.1:5180**, then use this repository's normal draft
preview on **127.0.0.1:8109** and open:

```
http://127.0.0.1:8109/?simlab=http://127.0.0.1:5180
```

The source override is accepted only on a loopback homepage and only for that
loopback simLAB port. Production always uses `https://lab.devpt.app/showcase/`.

Rollout order: deploy the simLAB public entry first, confirm its guest walkthrough,
then deploy this homepage integration. Future simLAB deployments update the
embedded experience automatically. API admission and signed-in routes are unchanged.

## Run locally

Use the npm script, not a direct `python -m http.server`, so localhost cannot drift behind production unnoticed.

```bash
npm start          # syncs local main to origin/main, then serves http://localhost:8099
```

`npm start` runs `scripts/ensure-fresh-main.mjs` before serving. The guard fetches
`origin/main`; if local `main` is clean and behind, it fast-forwards automatically.
It refuses to serve if the checkout is dirty, ahead, diverged, detached, on another
branch, or unable to reach `origin/main`.

There is intentionally no stale-mode bypass for `npm start`: it serves the same
source that deploys to `devpt.app`.

For an intentional redesign draft, use `npm ci` followed by `npm run preview`.
This serves `http://127.0.0.1:8109` after fetching `origin/main` and checking that
the draft contains the latest production commit. Draft previews allow local edits
and feature branches, clearly report that they are not production, and refuse
to serve an outdated base. `npm start` retains its strict clean-main checks.

Serve over http(s), not `file://`, so `app.js` can `fetch('apps.json')`. If opened
as a local file, the page falls back to the static nav/footer lists in `index.html`.

## Add or retire an application

1. Edit **`apps.json`** — add or change one record:
   - `id` — stable slug; the plate element is `id="app-<id>"`
   - `name`, `tag` (mono nav label), `footerLabel`
   - `url` — the app's live URL
   - `repo` — the backing GitHub repo (`owner/name`)
   - `status` — `live` | `live-unlisted` | `internal`
   - `placement` — any of `hero`, `nav`, `plate`, `footer`
2. The **footer list** re-renders automatically from `apps.json`; homepage gallery navigation is maintained separately.
3. For a full marketing **plate**, also add an `<article class="plate" id="app-<id>">`
   surface in `index.html` that links to its canonical URL. `scripts/check-apps.mjs`
   checks the matching plate ID and URL.

Apps not yet surfaced on the hub (e.g. `scope-or-nope`, `wellness`,
`anatomy-database-app`, `MASH`) are tracked under `unlisted` in `apps.json` so the
portfolio stays self-describing.

## Checks

`scripts/check-apps.mjs` validates `apps.json` (required fields; allowed
`category` / `status` / `placement` values), confirms every `plate` app has a
matching `id="app-<id>"` and link in `index.html`, and pings each listed URL. It
runs in CI on every change to the catalog (`.github/workflows/check-apps.yml`)
and weekly to catch apps that go offline.

```bash
node scripts/check-apps.mjs            # full check (schema + page + ping)
node scripts/check-apps.mjs --no-ping  # skip network checks
```

## Deploy

**Azure Static Web Apps**, on push to `main`, via
`.github/workflows/azure-static-web-apps-black-tree-0e898330f.yml`
(`app_location: "/"`, `skip_app_build: true`). The `devpt.app` custom domain is
configured in the Azure Static Web Apps resource.

## Custom domains & reliability

Custom domains and DNS live in Azure (Azure DNS + each app's SWA resource), not in
this repo. Two things to know:

- **Apex vs. subdomain.** Subdomains (`*.devpt.app`, `www.*`) are `CNAME`s that ride
  Azure's global Traffic-Manager path. The bare apexes (`devpt.app`, `pain3d.com`)
  are single-region `A` records — Microsoft's discouraged path ("no longer benefits
  from global distribution"). Prefer the **Azure DNS ALIAS** apex flow when you touch
  these. Reports of "works on my phone but not desktop" are almost always
  network-path issues (DNS cache or a TLS-intercepting campus/office wifi proxy),
  which HSTS makes un-bypassable — a different host (a `*.devpt.app` subdomain) is
  the quickest workaround.
- **PainMap canonical URL.** The registry advertises `https://www.3dpain.app`, with
  `https://pain3d.com` retained as its legacy alias. `pain.devpt.app` is not an advertised
  alias. Keep links aligned with `apps.json` and the PainMap repository's `docs/access-and-domains.md`.
