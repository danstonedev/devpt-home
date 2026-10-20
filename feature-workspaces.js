/* Each feature opens its product-owned public workspace after a user action.
 * The registry selects published contracts; these fixed definitions retain
 * control of trusted origins, capabilities and section identities. */
(function () {
  "use strict";

  var dialog = document.getElementById("workspace-live-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;
  var slot = dialog.querySelector("[data-workspace-frame-slot]");
  var status = dialog.querySelector("[data-workspace-status]");
  var notice = dialog.querySelector(".workspace-live-notice");
  var title = dialog.querySelector("#workspace-live-title");
  var direct = dialog.querySelector("[data-workspace-full-view]");
  var close = dialog.querySelector("[data-workspace-close]");
  if (!slot || !status || !notice || !title || !direct || !close) return;

  var products = Object.freeze({
    simlab: Object.freeze({
      name: "simLAB",
      origin: "https://lab.devpt.app",
      port: "5180",
      contract: "simlab-ai-preview:v1",
      prefix: "simlab-workspace",
      sections: Object.freeze(["interview", "reason", "examine"]),
    }),
    emrs: Object.freeze({
      name: "EMRs",
      origin: "https://simemr.devpt.app",
      port: "5181",
      contract: "emrs-workspace:v1",
      prefix: "emrs-workspace",
      sections: Object.freeze(["documentation", "schedule", "feedback"]),
    }),
    painmap: Object.freeze({
      name: "3Dpain.app",
      origin: "https://www.3dpain.app",
      port: "5182",
      contract: "painmap-workspace:v1",
      prefix: "painmap-workspace",
      sections: Object.freeze(["mapping", "movement", "timeline"]),
    }),
  });
  var loopback = ["localhost", "127.0.0.1", "[::1]"];
  var active = null;
  var opener = null;
  var timer = null;

  function endpointFor(entry, id, product) {
    try {
      var workspace = entry.showcase.workspace;
      var endpoint = new URL(workspace.url);
      if (
        workspace.contract !== product.contract ||
        endpoint.origin !== product.origin ||
        endpoint.pathname !== "/showcase/" ||
        endpoint.hash ||
        endpoint.username ||
        endpoint.password ||
        endpoint.searchParams.size !== 1 ||
        endpoint.searchParams.get("presentation") !== "workspace"
      )
        return null;
      // A generated local build points to the original compiled applications.
      // Preserve each mount prefix; the EMR workspace uses its root entry.
      var configuredBase =
        id === "simlab" && typeof NATIVE_SOURCE_BASE === "string"
          ? NATIVE_SOURCE_BASE
          : id === "emrs" && typeof EMR_SOURCE_BASE === "string"
            ? EMR_SOURCE_BASE
            : null;
      if (configuredBase) {
        try {
          var configured = new URL(configuredBase, location.href);
          if (
            ["http:", "https:"].includes(configured.protocol) &&
            !configured.username && !configured.password &&
            !configured.search && !configured.hash &&
            (configured.origin === location.origin ||
              configured.origin === product.origin ||
              (loopback.includes(location.hostname) &&
                loopback.includes(configured.hostname) &&
                configured.port === product.port))
          ) {
            var mount = configured.pathname.replace(/\/$/, "");
            endpoint = new URL(
              mount + (id === "emrs" ? "/" : "/showcase/"),
              configured.origin,
            );
            endpoint.searchParams.set("presentation", "workspace");
            return endpoint;
          }
        } catch (_) {
          // An invalid local config leaves the canonical source usable.
        }
      }
      if (loopback.includes(location.hostname) && location.port === "8109") {
        var override = new URLSearchParams(location.search).get(id);
        if (override) {
          try {
            var local = new URL(override);
            if (
              local.protocol === "http:" &&
              loopback.includes(local.hostname) &&
              local.port === product.port &&
              !local.username &&
              !local.password
            )
              endpoint = new URL(
                "/showcase/?presentation=workspace",
                local.origin,
              );
          } catch (_) {
            /* Invalid overrides keep the canonical endpoint. */
          }
        }
      }
      return endpoint;
    } catch (_) {
      return null;
    }
  }

  function urlFor(endpoint, section) {
    var url = new URL(endpoint);
    url.searchParams.set("section", section);
    return url;
  }

  function send(message) {
    if (active?.frame.contentWindow)
      active.frame.contentWindow.postMessage(message, active.endpoint.origin);
  }

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
    dialog.dataset.state = state;
    notice.hidden = state === "ready";
  }

  function visibility() {
    if (!active?.ready) return;
    send({
      type: active.product.prefix + "-visibility",
      visible:
        dialog.open && active.visible && document.visibilityState === "visible",
    });
  }

  function dispose() {
    window.clearTimeout(timer);
    timer = null;
    if (!active) return;
    send({ type: active.product.prefix + "-visibility", visible: false });
    if (observer) observer.unobserve(active.frame);
    active.frame.remove();
    active = null;
  }

  function unavailable() {
    dispose();
    slot.hidden = true;
    setStatus(
      "The live workspace could not connect. Open it directly to continue.",
      "unavailable",
    );
  }

  function validManifest(data) {
    var manifest = data.manifest;
    if (
      !manifest ||
      manifest.schemaVersion !== 1 ||
      manifest.presentation !== "workspace" ||
      manifest.product !== active.id ||
      typeof data.build !== "string" ||
      !/^[a-f0-9]{40}$/i.test(data.build)
    )
      return false;
    if (
      active.id === "simlab" &&
      (manifest.case?.patient?.id !== "patient-james-morgan" ||
        manifest.patientConversation?.mode !== "ai" ||
        manifest.patientConversation?.exchangeLimit !== 3 ||
        manifest.patientConversation?.speech !== "dictation-and-reply-audio")
    )
      return false;
    if (
      !Array.isArray(manifest.sections) ||
      manifest.sections.length !== active.product.sections.length
    )
      return false;
    var ids = new Set();
    return manifest.sections.every(function (section) {
      if (
        !section ||
        !active.product.sections.includes(section.id) ||
        ids.has(section.id) ||
        typeof section.label !== "string" ||
        !section.label.trim() ||
        section.label.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(section.label)
      )
        return false;
      ids.add(section.id);
      return true;
    });
  }

  function reflect(section) {
    active.section = section;
    var item = active.sections.find(function (item) {
      return item.id === section;
    });
    title.textContent = active.product.name + " · " + item.label;
    active.frame.title =
      "Live " + active.product.name + " " + item.label + " workspace";
    direct.href = urlFor(active.endpoint, section).href;
  }

  window.addEventListener("message", function (event) {
    if (
      !active ||
      !dialog.open ||
      event.origin !== active.endpoint.origin ||
      event.source !== active.frame.contentWindow
    )
      return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    var prefix = active.product.prefix;
    if (data.type === prefix + "-ready") {
      if (!validManifest(data)) return;
      window.clearTimeout(timer);
      timer = null;
      active.ready = true;
      active.sections = data.manifest.sections.map(function (section) {
        return { id: section.id, label: section.label };
      });
      active.frame.dataset.ready = "true";
      active.frame.dataset.workspaceBuild = data.build;
      reflect(active.section);
      setStatus("Live product workspace", "ready");
      send({ type: prefix + "-select", section: active.section });
      visibility();
    } else if (
      data.type === prefix + "-state" &&
      active.ready &&
      active.product.sections.includes(data.section)
    ) {
      // The native product owns navigation. Reflect without sending it back.
      reflect(data.section);
    } else if (data.type === prefix + "-close" && active.ready) {
      // Native dialogs consume Escape before forwarding a close request.
      dialog.close();
    }
  });

  var observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!active || entry.target !== active.frame) return;
            active.visible =
              entry.isIntersecting && entry.intersectionRatio > 0;
            visibility();
          });
        })
      : null;

  function open(id, product, endpoint, section, trigger, heading) {
    dispose();
    opener = trigger;
    title.textContent = product.name + " · " + heading;
    direct.href = urlFor(endpoint, section).href;
    slot.hidden = false;
    setStatus("Opening the live " + product.name + " workspace…", "loading");
    if (!dialog.open) dialog.showModal();
    var frame = document.createElement("iframe");
    frame.title = "Live " + product.name + " " + heading + " workspace";
    frame.dataset.workspaceFrame = id;
    frame.referrerPolicy = "origin";
    frame.allow =
      id === "simlab"
        ? "fullscreen; microphone " + endpoint.origin
        : "fullscreen; microphone 'none'";
    frame.src = urlFor(endpoint, section).href;
    active = {
      frame,
      id,
      product,
      endpoint,
      section,
      sections: [],
      ready: false,
      visible: true,
    };
    frame.addEventListener("error", function () {
      if (active?.frame === frame && !active.ready) unavailable();
    });
    slot.replaceChildren(frame);
    if (observer) observer.observe(frame);
    timer = window.setTimeout(function () {
      if (active?.frame === frame && !active.ready) unavailable();
    }, 15000);
    close.focus();
  }

  function initialize(catalog) {
    if (!Array.isArray(catalog.productLines)) return;
    Object.keys(products).forEach(function (id) {
      var entries = catalog.productLines.filter(function (entry) {
        return entry?.id === id;
      });
      if (entries.length !== 1) return;
      var product = products[id];
      var endpoint = endpointFor(entries[0], id, product);
      if (!endpoint) return;
      document
        .querySelectorAll(
          '[data-product="' + id + '"] [data-workspace-preview]',
        )
        .forEach(function (figure) {
          if (figure.dataset.workspaceInitialized) return;
          var section = figure.dataset.workspacePreview;
          var button = figure.querySelector("[data-workspace-try]");
          var heading = figure.querySelector("h3");
          if (!product.sections.includes(section) || !button || !heading)
            return;
          figure.dataset.workspaceInitialized = "true";
          figure
            .querySelectorAll(
              "[data-workspace-direct], [data-workspace-launch]",
            )
            .forEach(function (link) {
              link.href = urlFor(endpoint, section).href;
            });
          button.hidden = false;
          button.addEventListener("click", function () {
            open(id, product, endpoint, section, button, heading.textContent);
          });
          var launch = figure.querySelector("[data-workspace-launch]");
          if (launch)
            launch.addEventListener("click", function (event) {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              open(id, product, endpoint, section, launch, heading.textContent);
            });
        });
    });
  }

  var loadedCatalog = null;
  document.addEventListener("devpt:render", function () {
    if (loadedCatalog) initialize(loadedCatalog);
  });

  var registryAbort = new AbortController();
  var registryTimer = window.setTimeout(function () {
    registryAbort.abort();
  }, 10000);
  fetch("/apps.json", { credentials: "omit", signal: registryAbort.signal })
    .then(function (response) {
      if (!response.ok) throw new Error("Product registry unavailable");
      return response.json();
    })
    .then(function (catalog) {
      loadedCatalog = catalog;
      initialize(catalog);
    })
    .catch(function () {
      /* Static native links stay usable without the registry. */
    })
    .finally(function () {
      window.clearTimeout(registryTimer);
    });

  close.addEventListener("click", function () {
    dialog.close();
  });
  dialog.addEventListener("close", function () {
    dispose();
    if (opener) opener.focus({ preventScroll: true });
    opener = null;
  });
  dialog.addEventListener("click", function (event) {
    var bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
  document.addEventListener("visibilitychange", visibility);
})();
