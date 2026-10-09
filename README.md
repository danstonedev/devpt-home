# DevPT — devpt.app

The master home page and hub for **DevPT**: a growing platform of simulation and
assessment tools for physical therapy education, built at the University of North
Dakota.

It's a static deployment with a locally compiled native simLAB showcase. The app catalog is
data-driven: **[`apps.json`](apps.json) is the single source of truth**, and
`app.js` renders the footer tool list from it.

## Stack

- `index.html` — homepage content, embedded native showcase, student/faculty sections and lab links
- `apps.json` — **canonical app registry** (id, name, live URL, backing repo, status, placement)
- `styles.css` — light editorial theme, UND-green accent
- `app.js` — screenshot dialog, mobile menu and footer catalog
- `native-showcase.js` / `native-showcase.css` — homepage gallery navigation and iframe visibility coordination
- `showcase-src/` — homepage framing around imported, unmodified simLAB components
- `scripts/build-native-showcase.mjs` — pinned-source Vite build and native asset/credit packaging
- `showcase/` — checked-in generated showcase, models, credits and `source.json` provenance
- `assets/` — logo, demo videos/posters, screenshots
- `CV - Dan Stone.pdf` — linked from the About section

Fonts (Hanken Grotesk + JetBrains Mono) load from Google Fonts; product imagery is local.

## Homepage product story

The homepage embeds the actual simLAB patient presentation, interview, reasoning map and learning-lab components,
compiled from simLAB **61a664ca5706c19cddb8842fbfec1f0118121917** (`61a664c`). Native labels, controls, teaching notes,
models and playback come from that source. The homepage owns the surrounding navigation and demonstration state;
it does not recreate the product UI. See [the refresh record](docs/homepage-refresh.md) for component provenance.

The default gallery opens the **sterile Movement lab teaching view**. Its clean Body stage remains the baseline;
native patient identities and Outpatient PT, Inpatient room and Performance gym are separate presentation choices.
The gallery also exposes the native Joint, Eye, Neuro, Aquatic Therapy and Live Vitals workspaces.

The public case uses the real James Morgan scenario and native authored patient replies. Its interview and reasoning
views share an in-memory session, native transcript and selected-text evidence capture. It displays **Scripted case
practice**, has no AI API or account-service access, and does not save a learner record. Browser Talk/dictation, if
explicitly activated, can use the browser's speech-recognition service; it is not simLAB's protected realtime AI.
Offscreen case children unmount while their demonstration session remains available when visitors return.

Without JavaScript, descriptive content, the Movement screenshot fallback and static footer links remain available.
The remaining screenshots are direct captures of synthetic local demonstrations, not production student records.
Preserve the native teaching notes, source links and packaged model credits.

The earlier `experience.*`, `reasoning-demo.*` and `demos/` previews are superseded and are not loaded by the current
homepage. `build:demos` remains for those historical assets; use `build:native` for the current product showcase.

## Build the native showcase

Serving checked-in files needs no simLAB checkout. Rebuilding requires the pinned source and its recorded recursive
submodules at the default sibling path `../simlab-native-source`, plus frozen dependencies in both repositories.
The build was tested with Node.js 22.19.0; `build:native` enables TypeScript stripping for native plugin imports.
Use pnpm 9.15.0, as declared by the simLAB source.

From this homepage repository, prepare a fresh source checkout and build:

```bash
git clone https://github.com/danstonedev/simlab.git ../simlab-native-source
git -C ../simlab-native-source checkout --detach 61a664ca5706c19cddb8842fbfec1f0118121917
git -C ../simlab-native-source submodule update --init --recursive
pnpm --dir ../simlab-native-source install --frozen-lockfile --ignore-scripts
npm ci
npm run build:native
```

For an existing checkout, inspect its changes before changing its revision. Keep the recorded submodule commits;
do not update them with `--remote`. `SIMLAB_SOURCE_DIR` can point the builder to another prepared source directory.
The builder checks the pinned HEAD and tracked source cleanliness, prepares gitignored SvelteKit config stubs,
then regenerates only `showcase/` and the root `simlab-logo.png` asset. `showcase/source.json` records the full source
commit and recursive submodule status. Homepage adapters do not alter the simLAB source.

Commit the generated `showcase/` files and `simlab-logo.png` with source changes after inspecting the build. Azure
uses `skip_app_build: true`: it uploads these committed HTML, JavaScript, CSS and model assets from the repository
root and does not run npm, pnpm or Vite during deployment. Source files alone do not update the deployed showcase.

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
