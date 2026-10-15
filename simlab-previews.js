/* A live, public simLAB workspace is created only when a visitor asks to try
 * it. Its native UI and fictional case remain owned by the product. */
(function () {
  "use strict";

  var dialog = document.getElementById("simlab-live-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;
  var slot = dialog.querySelector("[data-simlab-frame-slot]");
  var status = dialog.querySelector("[data-simlab-status]");
  var notice = dialog.querySelector(".simlab-live-notice");
  var title = dialog.querySelector("#simlab-live-title");
  var direct = dialog.querySelector("[data-simlab-full-view]");
  var close = dialog.querySelector("[data-simlab-close]");
  if (!slot || !status || !title || !direct || !close) return;

  var sections = ["interview", "reason", "examine"];
  var endpoint = new URL("https://lab.devpt.app/showcase/");
  var loopback = ["localhost", "127.0.0.1", "[::1]"];
  if (loopback.includes(location.hostname) && location.port === "8109") {
    try {
      var local = new URL(new URLSearchParams(location.search).get("simlab"));
      if (
        local.protocol === "http:" &&
        loopback.includes(local.hostname) &&
        local.port === "5180" &&
        !local.username &&
        !local.password
      ) {
        endpoint = new URL("/showcase/", local.origin);
      }
    } catch (_) {
      /* Other previews keep the public product endpoint. */
    }
  }

  var active = null;
  var opener = null;
  var timer = null;

  function urlFor(section) {
    var url = new URL(endpoint);
    url.searchParams.set("presentation", "workspace");
    url.searchParams.set("section", section);
    return url;
  }

  function send(message) {
    if (active && active.frame.contentWindow)
      active.frame.contentWindow.postMessage(message, endpoint.origin);
  }

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
    dialog.dataset.state = state;
    if (notice) notice.hidden = state === "ready";
  }

  function visibility() {
    if (!active || !active.ready) return;
    send({
      type: "simlab-workspace-visibility",
      visible:
        dialog.open && active.visible && document.visibilityState === "visible",
    });
  }

  function dispose() {
    window.clearTimeout(timer);
    timer = null;
    if (!active) return;
    send({ type: "simlab-workspace-visibility", visible: false });
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
      manifest.product !== "simlab" ||
      manifest.case?.patient?.id !== "patient-james-morgan"
    )
      return false;
    if (typeof data.build !== "string" || !/^[a-f0-9]{40}$/i.test(data.build))
      return false;
    if (
      !Array.isArray(manifest.sections) ||
      manifest.sections.length !== sections.length
    )
      return false;
    var ids = new Set();
    return manifest.sections.every(function (section) {
      if (
        !section ||
        !sections.includes(section.id) ||
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
    title.textContent = "simLAB · " + item.label;
    active.frame.title = "Live simLAB " + item.label + " workspace";
    direct.href = urlFor(section).href;
  }

  window.addEventListener("message", function (event) {
    if (
      !active ||
      !dialog.open ||
      event.origin !== endpoint.origin ||
      event.source !== active.frame.contentWindow
    )
      return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "simlab-workspace-ready") {
      if (!validManifest(data)) return;
      window.clearTimeout(timer);
      timer = null;
      active.ready = true;
      active.sections = data.manifest.sections.map(function (section) {
        return { id: section.id, label: section.label };
      });
      active.frame.dataset.ready = "true";
      active.frame.dataset.simlabBuild = data.build;
      reflect(active.section);
      setStatus(
        "Interactive fictional case · changes reset when you close this preview.",
        "ready",
      );
      send({ type: "simlab-workspace-select", section: active.section });
      visibility();
    } else if (
      data.type === "simlab-workspace-state" &&
      active.ready &&
      sections.includes(data.section)
    ) {
      // The child owns navigation. Reflect it without sending it back.
      reflect(data.section);
    } else if (data.type === "simlab-workspace-close" && active.ready) {
      // Escape inside a cross-origin frame does not reach its parent dialog.
      // The native workspace forwards only an unconsumed close request.
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

  function open(section, button, heading) {
    dispose();
    opener = button;
    title.textContent = "simLAB · " + heading;
    direct.href = urlFor(section).href;
    slot.hidden = false;
    setStatus("Opening the live simLAB workspace…", "loading");
    document.querySelectorAll("[data-feature-video]").forEach(function (video) {
      video.pause();
    });
    if (!dialog.open) dialog.showModal();

    var frame = document.createElement("iframe");
    frame.title = "Live simLAB " + heading + " workspace";
    frame.dataset.simlabLiveFrame = "";
    frame.referrerPolicy = "origin";
    frame.allow = "fullscreen";
    frame.src = urlFor(section).href;
    active = {
      frame: frame,
      section: section,
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

  document.querySelectorAll("[data-simlab-preview]").forEach(function (figure) {
    var section = figure.dataset.simlabPreview;
    var button = figure.querySelector("[data-simlab-try]");
    var heading = figure.querySelector("h3");
    if (!sections.includes(section) || !button || !heading) return;
    var link = figure.querySelector("[data-simlab-direct]");
    if (link) link.href = urlFor(section).href;
    button.hidden = false;
    button.addEventListener("click", function () {
      open(section, button, heading.textContent);
    });
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
