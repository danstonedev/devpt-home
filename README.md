# DevPT — devpt.app

The master home page and hub for **DevPT**: a growing platform of simulation and
assessment tools for physical therapy education, built at the University of North
Dakota.

It's a single, self-contained static site (no build step). The app catalog is
data-driven: **[`apps.json`](apps.json) is the single source of truth**, and
`app.js` renders the footer tool list from it.

## Stack

- `index.html` — homepage content, product tour, student/faculty sections and lab links
- `apps.json` — **canonical app registry** (id, name, live URL, backing repo, status, placement)
- `styles.css` — light editorial theme, UND-green accent
- `app.js` — accessible product tabs, screenshot dialog, mobile menu and footer catalog
- `assets/` — logo, demo videos/posters, screenshots
- `CV - Dan Stone.pdf` — linked from the About section

Fonts (Hanken Grotesk + JetBrains Mono) load from Google Fonts; product imagery is local.

## Homepage product story

The homepage presents the current simLAB learning environment: native patient encounters and DDx reasoning maps,
care planning, live/scheduled classes, faculty review, and integrated learning labs. `index.html` owns the product
tour copy; `app.js` adds keyboard-accessible tabs and a screenshot dialog. Without JavaScript, all four tour panels
and the static footer links remain available. Screenshots are real captures of synthetic localhost demonstrations,
not production student records. Capture provenance is recorded in `docs/homepage-refresh.md`.

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
2. The **"Practice tools" nav** and the **footer list** re-render automatically from `apps.json`.
3. For a full marketing **plate**, also add an `<article class="plate" id="app-<id>">`
   block in `index.html` (copy an existing one). `app.js` logs a console warning if a
   plate's link doesn't match the `url` in `apps.json`.

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
- **PainMap alternate URL.** `pain.devpt.app` is being added as a resilient alternate
  to `pain3d.com` (recorded under the `painmap` entry's `aliases` in `apps.json`).
  The full diagnosis, the provisioning script, and the apex-hardening steps are in
  the pain map repo: **`danstonedev/3DPainMap` → `docs/access-and-domains.md`**.
