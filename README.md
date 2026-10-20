# DevPT — devpt.app

DevPT introduces three distinct product lines for physical therapy education and care:

| Product    | DevPT walkthrough | Product-owned public entry           | Owning repository                |
| ---------- | ----------------- | ------------------------------------ | -------------------------------- |
| simLAB     | `/simlab/`        | `https://lab.devpt.app/showcase/`    | `danstonedev/simlab`             |
| EMRs       | `/emrs/`          | `https://simemr.devpt.app/showcase/` | `danstonedev/devpt-emr-platform` |
| 3Dpain.app | `/3dpain/`        | `https://www.3dpain.app/showcase/`   | `danstonedev/3DPainMap`          |

The homepage is the shared introduction. Each product has a dedicated walkthrough, and the actual public demonstration is built in its owning product repository. DevPT does not vendor another simulator, EMR or symptom-mapping application.

## Static site and ownership

- `index.html` — three-product introduction and shared contact section.
- `simlab/index.html` — James Morgan's guided simLAB visit, live study tools and student/faculty introduction.
- `emrs/index.html` and `3dpain/index.html` — dedicated product walkthroughs.
- `apps.json` — canonical product/app registry, launch URLs, repositories and public walkthrough endpoints.
- `app.js` and `styles.css` — shared page behavior and DevPT presentation.
- `emr-foundation.css` — selected active EMR tokens and established shared chrome, refreshed by `scripts/sync-emr-foundation.mjs`.
- `walkthrough.js` and `native-showcase.css` — the existing simLAB live catalogue, chapter navigation and frame visibility bridge.
- `product-walkthrough.js` — public walkthrough bridge for the EMR and 3Dpain.app entries.
- `feature-workspaces.js` — nine source-owned native previews sharing one prepared inline iframe, with strict product contracts, expansion and visibility/lifetime controls.
- `showcase/index.html` — compatibility redirect for earlier simLAB bookmarks.
- `assets/` — brand marks and supporting screenshots.
- `assets/features/` — native launch posters and retired recordings, with source provenance and capture instructions.

Fonts load from Google Fonts; supporting imagery is local. Every homepage feature has a fixed-ratio native poster before its app starts. Display-sized simLAB wordmark derivatives retain the original artwork and transparency; their source hash and resize settings are recorded in `assets/brand/simlab-wordmark.source.json`. Product public entries use sample demonstration data. Protected production workspaces retain their normal sign-in and access requirements.

## One product, one walkthrough source

The product owns its demonstration state, chapter catalogue, native controls and public safety boundary. DevPT owns the introduction, surrounding navigation and frame visibility. Product deployments update the embedded experience without copying controls or records into the marketing site.

The existing simLAB bridge consumes `simlab-showcase-ready` and its versioned manifest. James's native case supplies the patient words, symptom drawing, observed examinations, reasoning and plan. It is scripted practice with an in-memory session, without protected AI calls or a persisted learner attempt. See [Live simLAB walkthrough](docs/native-showcase.md) for the complete contract.

EMR and 3Dpain.app public entries use the `devpt-showcase-ready`, `devpt-showcase-select`, `devpt-showcase-state` and `devpt-showcase-visibility` contract. A schema-versioned manifest identifies the product and its chapters. The EMR entry uses synthetic orientation data; 3Dpain.app uses its native recorded guest demonstrations. DevPT does not supply patient identities, account tokens or arbitrary navigation URLs to either entry.

The homepage feature previews use a separate native workspace presentation: `/showcase/?presentation=workspace&section=...` on each owning source. Its `${product}-workspace-ready` manifest identifies the three allowed sections and build. The corresponding select/state/visibility/close messages retain exact source-window and origin checks. One active native iframe appears inside its feature card. Preparation is bounded to one candidate, so the page never starts nine applications together. The poster remains until the selected native content is ready; the manifest handshake and iframe document load alone do not mean a 3D patient is ready. The corner Expand control enlarges the same connected iframe with CSS, and closing restores it inline without reloading the scene or conversation. simLAB's interview offers three server-limited AI exchanges with bounded speech; its objective preview includes native preselected exam examples and a separately labeled BPPV sample. EMR and pain-map actions use their real components and limited synthetic in-memory data. See [Product introduction](docs/homepage-refresh.md) for limits and ownership.

Each parent accepts messages only from the configured exact product origin and its own iframe window. Product entries restrict their trusted parents and frame ancestors to DevPT. Keep `referrerpolicy="origin"` on the embedded frames: their trusted-parent handshake needs the origin even when a page policy suppresses other cross-origin referrers. The path and query are not shared by that policy.

Offscreen and background frames receive visibility messages so they can release active work. Full-view links remain available when a frame cannot load. Do not widen product security policies to support an arbitrary preview host.

## Run locally

Use the npm scripts so a local preview cannot silently drift behind production:

```bash
npm ci
npm start          # clean main, current origin/main; http://localhost:8099
npm run preview    # current feature-branch draft; http://127.0.0.1:8109
```

`npm start` fetches `origin/main` and fast-forwards a clean, behind local `main`. It refuses a dirty, ahead, diverged, detached or feature checkout, or an unavailable remote. `npm run preview` permits draft changes after confirming the checkout contains the latest production commit. Neither path has a stale-base bypass.

Serve over HTTP(S), rather than `file://`, for the app registry and live frames.

For the existing two-repository simLAB preview, run mission-shell on port `5180` and open:

```text
http://127.0.0.1:8109/simlab/?simlab=http://127.0.0.1:5180
```

Product-line registry records also declare the EMR and PainMap local source ports (`5181` and `5182`). Source overrides are restricted to loopback development; production always uses the registered HTTPS entry.

## Registry and checks

`apps.json` keeps the three `productLines` together with the broader app catalogue. A product line identifies its dedicated page, launch apps and product-owned public entry. Keep canonical URLs aligned with the source repositories; in particular, 3Dpain.app advertises `https://www.3dpain.app`, with `pain3d.com` retained only as a legacy alias.

```bash
npm test
npm run check:brand:source # verifies the active adjacent EMR checkout
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui
node --check app.js
node --check walkthrough.js
node --check product-walkthrough.js
node --check feature-workspaces.js
node scripts/check-apps.mjs --no-ping
git diff --check
```

`check:walkthrough` verifies the dedicated simLAB page, both trusted live frames, root-relative assets, preserved live catalogue and visibility bridge. It rejects a walkthrough on the three-product homepage or a vendored simulator. The app checks validate the registry, product pages and launch links. CI additionally checks advertised URLs; temporary reachability failures warn unless strict mode is selected.

Inspect all four routes at desktop and phone widths. Check shared navigation, chapter selection, full view, local assets, reduced motion and unavailable-frame links. The real demonstration and its clinical behavior are tested in the owning product repository. See [Product introduction](docs/homepage-refresh.md) for the editorial and ownership rules.

The homepage browser checks cover the nine native features, exact product contracts, window/origin rejection, visibility suspension, expansion/restore on the same iframe, readiness before reveal, Escape/focus recovery and JavaScript-free poster links. Actual public guest simLAB captures and existing native EMR/pain-map screenshots provide immediate posters; capture URLs, revisions or deployed build references and image hashes remain with the assets. Recorded clips are retired from the homepage. The owning source suites verify the actual product actions and isolation from account and patient-record services.

## Deployment and compatibility

Azure Static Web Apps deploys the repository root on push to `main` via `.github/workflows/azure-static-web-apps-black-tree-0e898330f.yml`, with `skip_app_build: true`. All HTML, CSS and JavaScript needed by DevPT must therefore be committed. The owning repositories build and deploy their public product entries.

For a new public entry or a contract change, deploy the compatible product entry first, confirm it independently, then deploy the DevPT framing. The source's signed-in routes and protected APIs remain unchanged by the public walkthrough.

The Azure upload waits up to 30 minutes for all three required native entries. `scripts/wait-for-showcases.mjs` requires HTTP 200, the new workspace version markers and a Content Security Policy permitting both DevPT parent origins. It also checks the simLAB three-exchange API's read-only readiness endpoint. An auth fallback, older recorded build, unavailable AI configuration or framing restriction blocks the upload. If a product's CI or deployment is blocked, resolve it and rerun this deployment after the product is live. Do not remove the gate to force an early homepage release.

Custom domains and DNS live in Azure. Prefer Azure DNS ALIAS for apex changes and keep the catalogue aligned with the product domain records. Do not advertise an unverified alternate hostname.
