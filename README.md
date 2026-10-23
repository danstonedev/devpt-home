# DevPT — devpt.app

DevPT is a free physical therapy reference library, organized by body region and topic. Browsing, opening resources and sharing public resource collections require no account. The interactive players remain in their owning applications.

Product overviews provide a separate route to the three DevPT product lines:

| Product    | DevPT walkthrough | Product-owned public entry           | Owning repository                |
| ---------- | ----------------- | ------------------------------------ | -------------------------------- |
| simLAB     | `/simlab/`        | `https://lab.devpt.app/showcase/`    | `danstonedev/simlab`             |
| EMRs       | `/emrs/`          | `https://simemr.devpt.app/showcase/` | `danstonedev/devpt-emr-platform` |
| 3Dpain.app | `/3dpain/`        | `https://www.3dpain.app/showcase/`   | `danstonedev/3DPainMap`          |

The homepage leads with the reference library. Each product has a dedicated walkthrough, and the actual public demonstration is built in its owning product repository. DevPT does not vendor another simulator, EMR or symptom-mapping application.

## Static site and ownership

- `index.html` — public library shell; the release build adds source-rendered content and metadata.
- `library-routes.js` — shared browser/build mapping for real resource, region and topic URLs.
- `site-analytics.js` — public website measurement, separate from product application instrumentation.
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

Library fonts are self-hosted; supporting imagery is local. Every homepage feature has a fixed-ratio native poster before its app starts. Display-sized simLAB wordmark derivatives retain the original artwork and transparency; their source hash and resize settings are recorded in `assets/brand/simlab-wordmark.source.json`. Product public entries use sample demonstration data. Protected production workspaces retain their normal sign-in and access requirements.

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
npm start          # clean, current main; builds public pages; http://localhost:8099
npm run preview    # current feature draft; builds public pages; http://127.0.0.1:8109
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

Azure Static Web Apps deploys the repository root on push to `main` via `.github/workflows/azure-static-web-apps-black-tree-0e898330f.yml`, with `skip_app_build: true`. All website templates, CSS and JavaScript must therefore be committed; the workflow generates the public pages before upload. The owning repositories build and deploy their public product entries.

For a new public entry or a contract change, deploy the compatible product entry first, confirm it independently, then deploy the DevPT framing. The source's signed-in routes and protected APIs remain unchanged by the public walkthrough.

The Azure upload waits up to 30 minutes for all three required native entries. `scripts/wait-for-showcases.mjs` requires HTTP 200, the new workspace version markers and a Content Security Policy permitting both DevPT parent origins. It also checks the simLAB three-exchange API's read-only readiness endpoint. An auth fallback, older recorded build, unavailable AI configuration or framing restriction blocks the upload. If a product's CI or deployment is blocked, resolve it and rerun this deployment after the product is live. Do not remove the gate to force an early homepage release.

Custom domains and DNS live in Azure. Prefer Azure DNS ALIAS for apex changes and keep the catalogue aligned with the product domain records. Do not advertise an unverified alternate hostname.

## Reference library

The root site is a reference library: every resource simLAB publishes, filed by body region and topic (a region page lists its topics, a topic page its regions), with search across titles, headings and common terms, browser-local saves and account-free sharing. Each resource opens its own selection in simLAB's public player (`https://lab.devpt.app/teaching/?activity=<id>`). The site consumes SimLab’s source-owned published catalog at `https://lab.devpt.app/teaching/catalog.json`, including its ordered regions and topics; models, players and the resource list are never copied into this repository. A curated activity that names a reference item in `aliasOf` is listed once, as that item, and its own links keep opening it; earlier `#/collection/<id>` links open the matching region or topic. Public entry controls and publication live in SimLab ([public teaching resources](https://github.com/danstonedev/simlab/blob/main/docs/public-teaching-resources.md)). Gait physics remains an experimental local tool.

`npm run build:public` exports only public website files to `.cache/public-site`, which is the Azure deployment input. The workflow waits for compatible source-owned walkthroughs and the published teaching entry before upload. `npm run build:local` and `npm run preview:local` retain the complete local source review; see `docs/local-site-preview.md`.

## Public search pages and analytics

`npm run build:public` requires curl and fetches the revisioned public catalogue from
`https://lab.devpt.app/teaching/catalog.json`. The actual website renderer generates
readable HTML, canonical URLs, descriptions, Open Graph metadata and structured
data for `/`, `/regions/`, `/regions/<id>/`, `/topics/`, `/topics/<id>/`, and
`/resources/<id>/`. The same export includes `/products/`, `/faculty/`, `/contact/`,
`robots.txt`, an XML sitemap and a catalogue-derived HTML sitemap. Search results
and saved collections are `noindex, follow` and excluded from the XML sitemap.
Unknown paths retain real 404 responses; there is no blanket application fallback.

Only the source-owned public projection may produce a release. Development
catalogues, invalid IDs, duplicate IDs and non-source player URLs fail the build.
No catalogue or model copy is maintained in this repository. A website export
must be rebuilt when new resources are published so the corresponding HTML and
sitemap exist. Re-run the website deployment through its manual workflow trigger
when the catalogue changes without a website commit. `release.json` identifies
both the website revision and the catalogue build used for the export.

Old `#/activity/…`, `#/region/…`, `#/topic/…`, collection and saved-list links
continue to open their canonical real paths. Resource aliases redirect to their
source-owned canonical IDs. The browser-local saved-resource storage key is
unchanged. Local review on port 8110 retains hash routing and sends no analytics.

The current public-site measurement ID is `G-VTLNJW0KKX`, centralized in
`site-analytics.js`. Only `devpt.app` and `www.devpt.app` load the tag; localhost,
Azure previews and local review do not. Existing product application tags are not
modified. This remains a shared GA4 property until a dedicated public-site ID is
provided; public events use `site_area=devpt_public` and content groups `library`,
`products` or `information` so app traffic can be excluded from public reports.

The wrapper owns initial and virtual `page_view` events and deduplicates catalogue
refreshes and UI re-renders of the same page. Resource visits emit `resource_open`;
`resource_ready` requires the existing trusted player handshake. Saving, removing,
completed share-link copying and submitted library searches have distinct events.
`product_link_click` records a product ID and placement, and `inquiry_click`
records an email inquiry link click. These actions are not purchase conversions.
The tag disables Google signals and ad personalization. Custom payloads contain
canonical public paths and bounded identifiers/counts, without search text,
issue-report content, saved collection IDs/URLs or email addresses. Entry campaign
source, medium, name and ID are retained only when they match a bounded character
allowlist. Free-text campaign term/content are not copied.

### Google and hosting setup

Account settings require access to the respective Google/Azure account. Before
releasing the manual page-view integration:

1. In GA4, select the web stream for `G-VTLNJW0KKX` under **Admin → Data streams**.
   In **Enhanced measurement → Page views → Show advanced settings**, turn off
   **Page changes based on browser history events**. `send_page_view:false`
   disables the config-generated view but does not disable enhanced history
   events. Also turn off **Site search** and **Form interactions** to avoid
   automatic collection of free text. These settings affect the shared stream;
   review the app's reporting needs before changing them. A dedicated public-site
   property can isolate this configuration later.
2. Register event-scoped custom dimensions `site_area`, `page_type`, `resource_id`,
   `region_id`, `topic_id`, `product_id` and `placement` for report use.
   `content_group` is built in. These definitions apply to future reporting.
3. Validate in GA4 DebugView/Realtime after release: one homepage view; one new
   view per resource/region/topic navigation; separate `resource_ready` and
   `product_link_click` events; no duplicate view on saving or catalogue refresh.
   Browser tests inspect queued payloads without contacting Google; they cannot
   verify remote stream settings or account-side processing.
4. Verify the Search Console domain property for `devpt.app` (DNS ownership may
   be required), submit `https://devpt.app/sitemap.xml`, then inspect the homepage,
   one region and one resource URL. Track indexed pages, impressions and clicks.
5. In Azure Static Web Apps → **Custom domains**, select `devpt.app` and choose
   **Set default** to redirect alternate hostnames to the apex. Canonicals and the
   root `/index.html` redirect are provided in code; the hostname redirect is an
   Azure account setting.

Do not use a property-wide hostname exclusion to remove app traffic while this
measurement ID is shared. Use report filters; collection exclusions permanently
remove future data. Google account links and settings are described in the
[page-view documentation](https://developers.google.com/analytics/devguides/collection/ga4/views)
and [Azure default-domain documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain-default).

### Public website reports

Create reports using these filters after the tag and dimensions are validated:

| Report | Scope | Measures |
| --- | --- | --- |
| Homepage reach | `site_area=devpt_public`, `page_type=homepage` | Users, sessions containing a homepage view, views and engagement |
| Homepage arrivals | Session's first `page_view` has a DevPT public hostname and homepage location | Sessions, session source/medium and device |
| Library use | `site_area=devpt_public`, `content_group=library` | Resource opens, successful loads, saves, shares and search result counts |
| Product interest | `product_link_click` with `site_area=devpt_public` | Product ID, placement, users and event count |

In the shared property, `/` alone also identifies each application's home route.
For arrivals, check the hostname of the session's *first page view*, rather than
combining an event-scoped hostname with a landing-path filter. Browser users and
sessions are estimates, not verified people; neither screenshot totals nor a
country distribution establish bot traffic. Compare date/hostname/page/source,
engagement and technical patterns with any retained hosting logs to investigate
spikes. Collection gaps cannot be backfilled by this change.

`npm test` includes source-contract, generated-page and analytics payload checks.
`npm run test:ui` builds an explicit protocol-only fixture export and exercises
actual routes, old links, no-JavaScript pages, player trust, sharing, mobile layout
and public event wiring. Fixtures are confined to `e2e/fixtures/` and never enter
the deployment export.
