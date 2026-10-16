/* Posters paint with the page. One live product is admitted at a time.
 * Expanding changes its presentation, never its lifetime. */
(function () {
  "use strict";
  var surface = document.getElementById("workspace-live-dialog");
  var backdrop = document.querySelector("[data-workspace-backdrop]");
  if (!surface || !backdrop) return;
  var slot = surface.querySelector("[data-workspace-frame-slot]");
  var status = surface.querySelector("[data-workspace-status]");
  var notice = surface.querySelector(".workspace-live-notice");
  var title = surface.querySelector("#workspace-live-title");
  var direct = surface.querySelector("[data-workspace-full-view]");
  var close = surface.querySelector("[data-workspace-close]");
  if (!slot || !status || !notice || !title || !direct || !close) return;
  var products = Object.freeze({
    simlab: Object.freeze({ name: "simLAB", origin: "https://lab.devpt.app", port: "5180",
      contract: "simlab-ai-preview:v1", prefix: "simlab-workspace",
      sections: Object.freeze(["interview", "reason", "examine"]) }),
    emrs: Object.freeze({ name: "EMRs", origin: "https://simemr.devpt.app", port: "5181",
      contract: "emrs-workspace:v1", prefix: "emrs-workspace",
      sections: Object.freeze(["documentation", "schedule", "feedback"]) }),
    painmap: Object.freeze({ name: "3Dpain.app", origin: "https://www.3dpain.app", port: "5182",
      contract: "painmap-workspace:v1", prefix: "painmap-workspace",
      sections: Object.freeze(["mapping", "movement", "timeline"]) })
  });
  var loopback = ["localhost", "127.0.0.1", "[::1]"];
  var active = null, cards = [], expanded = false, opener = null;
  var inertSiblings = [], timer = null, warmScheduled = false, automaticAdmissionUsed = false;
  function endpointFor(entry, id, product) {
    try {
      var workspace = entry.showcase.workspace, endpoint = new URL(workspace.url);
      if (workspace.contract !== product.contract || endpoint.origin !== product.origin ||
          endpoint.pathname !== "/showcase/" || endpoint.hash || endpoint.username ||
          endpoint.password || endpoint.searchParams.size !== 1 ||
          endpoint.searchParams.get("presentation") !== "workspace") return null;
      if (loopback.includes(location.hostname) && location.port === "8109") {
        var override = new URLSearchParams(location.search).get(id);
        if (override) {
          try {
            var local = new URL(override);
            if (local.protocol === "http:" && loopback.includes(local.hostname) &&
                local.port === product.port && !local.username && !local.password)
              endpoint = new URL("/showcase/?presentation=workspace", local.origin);
          } catch (_) { /* Invalid overrides retain the canonical endpoint. */ }
        }
      }
      return endpoint;
    } catch (_) { return null; }
  }
  function urlFor(endpoint, section) {
    var url = new URL(endpoint);
    url.searchParams.set("section", section);
    return url;
  }
  function send(message) {
    if (active?.frame?.contentWindow)
      active.frame.contentWindow.postMessage(message, active.card.endpoint.origin);
  }
  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
    surface.dataset.state = state;
    notice.hidden = state === "ready";
    // The poster cannot stand in for an interactive product for keyboard users.
    if (active?.frame) {
      active.frame.inert = state !== "ready";
      active.frame.tabIndex = state === "ready" ? 0 : -1;
    }
  }
  function onscreen(card) {
    var bounds = card.media.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
  }
  function shouldRun() {
    return active && (expanded || onscreen(active.card)) && document.visibilityState === "visible";
  }
  function clearDeadline() { window.clearTimeout(timer); timer = null; }
  function deadline() {
    clearDeadline();
    if (!active || active.failed || active.visualReady || (active.ready && !shouldRun())) return;
    var frame = active.frame;
    timer = window.setTimeout(function () {
      if (active?.frame === frame && !active.visualReady) unavailable();
    }, 15000);
  }
  function visibility(force) {
    if (!active?.ready || active.failed) return;
    var visible = Boolean(shouldRun());
    if (force || visible !== active.visible) {
      active.visible = visible;
      send({ type: active.card.product.prefix + "-visibility", visible });
      if (!active.visualReady) deadline();
    }
  }
  function unavailable() {
    clearDeadline();
    if (!active) return;
    send({ type: active.card.product.prefix + "-visibility", visible: false });
    active.failed = true;
    active.frame?.remove();
    active.frame = null;
    setStatus("The live workspace could not connect. Open it directly to continue.", "unavailable");
  }
  function dispose() {
    clearDeadline();
    if (!active) return;
    send({ type: active.card.product.prefix + "-visibility", visible: false });
    active.card.launch.removeAttribute("aria-hidden");
    active.card.launch.removeAttribute("tabindex");
    resize?.unobserve(active.card.media);
    slot.replaceChildren();
    active = null;
  }
  function validManifest(data) {
    var manifest = data.manifest, product = active.card.product;
    if (!manifest || manifest.schemaVersion !== 1 || manifest.presentation !== "workspace" ||
        manifest.product !== active.card.id || typeof data.build !== "string" ||
        !/^[a-f0-9]{40}$/i.test(data.build)) return false;
    if (active.card.id === "simlab" &&
        (manifest.case?.patient?.id !== "patient-james-morgan" ||
         manifest.patientConversation?.mode !== "ai" || manifest.patientConversation?.exchangeLimit !== 3 ||
         manifest.patientConversation?.speech !== "dictation-and-reply-audio" ||
         manifest.patientPresentation?.readiness !== "settled-scene")) return false;
    if (!Array.isArray(manifest.sections) || manifest.sections.length !== product.sections.length) return false;
    var ids = new Set();
    return manifest.sections.every(function (section) {
      if (!section || !product.sections.includes(section.id) || ids.has(section.id) ||
          typeof section.label !== "string" || !section.label.trim() || section.label.length > 80 ||
          /[\u0000-\u001f\u007f]/.test(section.label)) return false;
      ids.add(section.id);
      return true;
    });
  }
  function reflect(section) {
    active.section = section;
    var item = active.sections.find(function (item) { return item.id === section; });
    title.textContent = active.card.product.name + " · " + item.label;
    active.frame.title = "Live " + active.card.product.name + " " + item.label + " workspace";
    direct.href = urlFor(active.card.endpoint, section).href;
  }
  function visualReady() {
    clearDeadline();
    active.visualReady = true;
    active.frame.dataset.visualReady = "true";
    setStatus("Live product workspace", "ready");
  }
  window.addEventListener("message", function (event) {
    if (!active?.frame || active.failed || event.origin !== active.card.endpoint.origin ||
        event.source !== active.frame.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    var prefix = active.card.product.prefix;
    if (data.type === prefix + "-ready") {
      if (active.ready || !validManifest(data)) return;
      active.ready = true;
      active.sections = data.manifest.sections.map(function (section) {
        return { id: section.id, label: section.label };
      });
      active.frame.dataset.ready = "true";
      active.frame.dataset.workspaceBuild = data.build;
      reflect(active.section);
      send({ type: prefix + "-select", section: active.section });
      visibility(true);
      if (active.card.id !== "simlab") visualReady();
    } else if (data.type === prefix + "-state" && active.ready &&
               active.card.product.sections.includes(data.section)) {
      if (data.section !== active.section && active.card.id === "simlab") {
        active.visualReady = false;
        delete active.frame.dataset.visualReady;
        setStatus("Preparing the live simLAB workspace…", "loading");
      }
      // Reflect native navigation without replaying a selection. Visibility is
      // idempotent and asks for the latest generation-fenced readiness report.
      reflect(data.section);
      visibility(active.card.id === "simlab");
    } else if (data.type === "simlab-workspace-patient-state" && active.ready &&
               active.card.id === "simlab" && data.section === active.section) {
      // A native 3D fallback is a usable product (including its conversation),
      // not a failed connection. Reveal it without discarding that session.
      if (data.state === "ready" || data.state === "unavailable") {
        active.frame.dataset.patientState = data.state;
        visualReady();
      }
      else if (data.state === "loading") {
        active.visualReady = false;
        delete active.frame.dataset.visualReady;
        setStatus("Preparing the live simLAB workspace…", "loading");
        deadline();
      }
    } else if (data.type === prefix + "-close" && active.ready && expanded) collapse();
  });
  function scale() {
    if (active) surface.style.setProperty("--workspace-scale", active.card.media.clientWidth / 1280);
  }
  var resize = "ResizeObserver" in window ? new ResizeObserver(scale) : null;
  window.addEventListener("resize", scale, { passive: true });
  function activate(card, explicit) {
    if (active?.card === card && !active.failed) {
      active.engaged ||= explicit;
      visibility();
      return;
    }
    if (expanded) collapse();
    dispose();
    // Move the EMPTY host. Reparenting a populated iframe restarts it in browsers.
    card.media.append(surface);
    surface.hidden = false;
    title.textContent = card.product.name + " · " + card.heading;
    direct.href = urlFor(card.endpoint, card.section).href;
    var poster = card.launch.querySelector("img").cloneNode(true);
    poster.className = "workspace-live-poster";
    poster.alt = "";
    poster.loading = "eager";
    poster.setAttribute("aria-hidden", "true");
    var frame = document.createElement("iframe");
    frame.title = "Live " + card.product.name + " " + card.heading + " workspace";
    frame.dataset.workspaceFrame = card.id;
    frame.referrerPolicy = "origin";
    frame.allow = card.id === "simlab" ? "fullscreen; microphone " + card.endpoint.origin
      : "fullscreen; microphone 'none'";
    active = { card, frame, section: card.section, sections: [], ready: false,
      visualReady: false, visible: null, failed: false, engaged: explicit };
    setStatus("Preparing the live " + card.product.name + " workspace…", "loading");
    if (document.activeElement === card.launch) card.button.focus({ preventScroll: true });
    card.launch.setAttribute("aria-hidden", "true");
    card.launch.tabIndex = -1;
    frame.addEventListener("error", function () {
      if (active?.frame === frame) unavailable();
    });
    frame.src = urlFor(card.endpoint, card.section).href;
    slot.replaceChildren(poster, frame);
    resize?.observe(card.media);
    scale();
    deadline();
  }
  function isolate() {
    var child = surface;
    while (child.parentElement) {
      Array.from(child.parentElement.children).forEach(function (sibling) {
        if (sibling === child || sibling === backdrop || !(sibling instanceof HTMLElement)) return;
        inertSiblings.push({ element: sibling, prior: sibling.inert });
        sibling.inert = true;
      });
      child = child.parentElement;
      if (child === document.body) break;
    }
  }
  function expand(card, trigger) {
    activate(card, true);
    if (expanded) return;
    expanded = true;
    opener = trigger;
    surface.dataset.expanded = "true";
    surface.setAttribute("role", "dialog");
    surface.setAttribute("aria-modal", "true");
    backdrop.hidden = false;
    document.body.classList.add("workspace-expanded");
    isolate();
    close.focus({ preventScroll: true });
    visibility();
  }
  function collapse() {
    if (!expanded) return;
    expanded = false;
    delete surface.dataset.expanded;
    surface.setAttribute("role", "region");
    surface.removeAttribute("aria-modal");
    backdrop.hidden = true;
    document.body.classList.remove("workspace-expanded");
    inertSiblings.forEach(function (item) { item.element.inert = item.prior; });
    inertSiblings = [];
    opener?.focus({ preventScroll: true });
    opener = null;
    scale();
    visibility();
  }
  function automaticAllowed() {
    var connection = navigator.connection;
    return !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType);
  }
  function scheduleWarm() {
    if (warmScheduled || active || automaticAdmissionUsed || !automaticAllowed()) return;
    var card = cards.find(function (card) { return onscreen(card); });
    if (!card || document.visibilityState !== "visible") return;
    warmScheduled = true;
    var warm = function () {
      warmScheduled = false;
      if (active || automaticAdmissionUsed || !onscreen(card) || !automaticAllowed() ||
          document.visibilityState !== "visible") return;
      automaticAdmissionUsed = true;
      activate(card, false);
    };
    // Critical paint takes priority. Scrolling cannot fan out into nine renderers.
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 1000 });
      else window.setTimeout(warm, 500);
    }); });
  }
  var observer = "IntersectionObserver" in window ? new IntersectionObserver(function () {
    visibility();
    scheduleWarm();
  }) : null;
  function preconnect(endpoint) {
    if (Array.from(document.querySelectorAll('link[rel="preconnect"]')).some(function (link) {
      return link.href === endpoint.origin + "/";
    })) return;
    var link = document.createElement("link");
    link.rel = "preconnect";
    link.href = endpoint.origin;
    document.head.append(link);
  }
  function initialize(catalog) {
    if (!Array.isArray(catalog.productLines)) return;
    Object.keys(products).forEach(function (id) {
      var entries = catalog.productLines.filter(function (entry) { return entry?.id === id; });
      if (entries.length !== 1) return;
      var product = products[id], endpoint = endpointFor(entries[0], id, product);
      if (!endpoint) return;
      document.querySelectorAll('[data-product="' + id + '"] [data-workspace-preview]')
        .forEach(function (figure) {
          var section = figure.dataset.workspacePreview;
          var button = figure.querySelector("[data-workspace-expand]");
          var launch = figure.querySelector("[data-workspace-launch]");
          var heading = figure.querySelector("h3"), media = figure.querySelector(".feature-media");
          if (!product.sections.includes(section) || !button || !launch?.querySelector("img") ||
              !heading || !media) return;
          var card = { id, product, endpoint, section, figure, media, launch,
            button, heading: heading.textContent };
          cards.push(card);
          launch.href = urlFor(endpoint, section).href;
          button.hidden = false;
          button.addEventListener("click", function () { expand(card, button); });
          launch.addEventListener("click", function (event) {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            activate(card, true);
          });
          figure.addEventListener("pointerenter", function () { preconnect(endpoint); }, { once: true });
          figure.addEventListener("focusin", function () { preconnect(endpoint); }, { once: true });
          observer?.observe(media);
        });
    });
    scheduleWarm();
  }
  var registryAbort = new AbortController();
  var registryTimer = window.setTimeout(function () { registryAbort.abort(); }, 10000);
  fetch("/apps.json", { credentials: "omit", signal: registryAbort.signal })
    .then(function (response) {
      if (!response.ok) throw new Error("Product registry unavailable");
      return response.json();
    }).then(initialize).catch(function () {
      /* Static native links remain usable without the registry. */
    }).finally(function () { window.clearTimeout(registryTimer); });
  close.addEventListener("click", collapse);
  backdrop.addEventListener("click", collapse);
  document.addEventListener("keydown", function (event) {
    if (!expanded) return;
    if (event.key === "Escape") { event.preventDefault(); collapse(); }
    else if (event.key === "Tab") {
      var focusable = Array.from(surface.querySelectorAll('button, a[href], iframe'))
        .filter(function (element) { return !element.inert && element.getClientRects().length; });
      var first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  document.addEventListener("visibilitychange", function () { visibility(); scheduleWarm(); });
  window.addEventListener("pagehide", function () { collapse(); dispose(); surface.hidden = true; });
})();
