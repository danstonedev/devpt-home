# Live simLAB walkthrough

The DevPT walkthrough at **`/simlab/`** embeds **`https://lab.devpt.app/showcase/`**. The public entry is built and deployed by `danstonedev/simlab` alongside the signed-in application. Its native components, patient case, study tools and runtime assets remain in that repository. DevPT does not build or pin another simulator.

The old locally generated showcase and `showcase-src/` have been removed. `showcase/index.html` remains only as a redirect for earlier public bookmarks. The historical files under `demos/` are not loaded by the homepage or dedicated walkthrough.

## Ownership and versioned contract

DevPT owns the surrounding product story, chapter navigation, frame visibility and full-view link. The simLAB frame announces `simlab-showcase-ready` with its deployed build and a `schemaVersion: 1` manifest. That manifest supplies the chapter labels and study-tool catalogue; the parent does not maintain another list of active product controls.

The guest case is James Morgan (`patient-james-morgan`). simLAB's story, native session helpers and renderer implement the interview, symptom map, observed examinations, reasoning, plan and study tools. The scripted sample does not call protected AI or account APIs or persist a learner attempt. Selecting another product is navigation to another page, not a shared patient or student session.

`walkthrough.js` accepts messages only from the configured exact simLAB origin and the actual iframe window. The child accepts commands only from its trusted parent window and allowed origin. Production parents are `https://devpt.app` and `https://www.devpt.app`; the product's CSP uses the same `frame-ancestors` restriction. Moving the parent from `/` to `/simlab/` retains this origin boundary.

Both the tour and teaser iframe must keep **`referrerpolicy="origin"`**. simLAB establishes its trusted parent from `document.referrer`. A stricter page-level referrer policy otherwise hides that origin and leaves the embedded walkthrough paused. Only the origin is supplied, without the page path or query.

## Playback and state

The parent sends only versioned selection and visibility messages. Chapter selection updates the full-view URL; child-reported state updates the parent navigation without echoing another selection, which would pause the walkthrough. Modified clicks retain ordinary link behavior.

Autoplay begins only after the visitor selects **Watch James’s visit** or the native play control. Reduced-motion preferences suppress automatic playback. Intersection and document-visibility changes pause offscreen or background frames. Native renderers are released while inactive, while the guest case session remains in memory when the visitor returns. A separate full view starts a separate local demonstration.

## Local integration preview

Start simLAB's mission-shell development server on `127.0.0.1:5180`, then start this repository with `npm run preview` and open:

```text
http://127.0.0.1:8109/simlab/?simlab=http://127.0.0.1:5180
```

The override is accepted only on a loopback DevPT host, for an HTTP loopback source on port `5180`. The child accepts local DevPT parents on ports `8109` or `8099` only in development. Production always uses the live simLAB public entry. Arbitrary preview domains are not added to the trusted-parent list.

## Verification and rollout

`npm run check:walkthrough` verifies the dedicated route, both trusted live frames, root-relative assets, shared product navigation, live catalogue, origin/source checks and visibility coordination. It also rejects a vendored simulator or a walkthrough that has drifted back onto the DevPT homepage.

In a browser, check the teaser, every chapter, native play/pause, study tools, full view, mobile chapter scrolling, reduced motion, offscreen/background suspension and case retention. Inspect desktop and phone widths. simLAB's `apps/mission-shell/e2e/public-showcase.spec.ts` covers the real guest story; its showcase unit tests cover the trusted-parent and command boundary.

For a contract change, deploy the compatible simLAB public entry first, confirm the guest walkthrough, then deploy DevPT. Ordinary simLAB deployments update the embedded experience without another DevPT build. Signed-in access and API admission remain owned by simLAB.
