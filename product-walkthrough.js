/* Each product owns its public walkthrough and chapter catalog. This page
 * supplies navigation and a trusted frame, never a second copy of its UI. */
(function () {
  "use strict";

  var host = document.querySelector("main[data-product-walkthrough]");
  if (!host) return;

  var product = host.dataset.productWalkthrough;
  var trustedOrigins = {
    emrs: "https://simemr.devpt.app",
    painmap: "https://www.3dpain.app",
  };
  if (!Object.prototype.hasOwnProperty.call(trustedOrigins, product)) return;

  var frame = host.querySelector("iframe[data-product-frame]");
  var rail = host.querySelector("[data-product-chapters]");
  var status = host.querySelector("[data-product-status]");
  var fullView = host.querySelector("a[data-product-full-view]");
  if (!frame || !rail || !status || !fullView) return;

  var endpoint = null;
  var chapters = [];
  var current = null;
  var ready = false;
  var visible = !("IntersectionObserver" in window);
  var loadingTimer = null;
  var registryTimer = null;
  var loopback = ["localhost", "127.0.0.1", "[::1]"];

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function stopLoadingTimer() {
    if (loadingTimer !== null) window.clearTimeout(loadingTimer);
    loadingTimer = null;
  }

  function isVisible() {
    return visible && document.visibilityState === "visible";
  }

  function send(message) {
    if (endpoint && frame.contentWindow) {
      frame.contentWindow.postMessage(message, endpoint.origin);
    }
  }

  function updateVisibility() {
    stopLoadingTimer();
    if (ready) {
      send({ type: "devpt-showcase-visibility", visible: isVisible() });
    } else if (endpoint && isVisible()) {
      loadingTimer = window.setTimeout(function () {
        loadingTimer = null;
        setStatus(
          "The embedded walkthrough is taking longer to connect. Open the full view while it loads.",
          "unavailable",
        );
      }, 15000);
    }
  }

  function hasChapter(id) {
    return chapters.some(function (chapter) {
      return chapter.id === id;
    });
  }

  function reflectSelection() {
    rail.querySelectorAll("button[data-chapter]").forEach(function (button) {
      var selected = button.dataset.chapter === current;
      button.setAttribute("aria-current", selected ? "step" : "false");
      button.tabIndex = selected ? 0 : -1;
    });

    var nativeUrl = new URL(endpoint);
    nativeUrl.searchParams.set("chapter", current);
    fullView.href = nativeUrl.href;

    var pageUrl = new URL(location.href);
    pageUrl.searchParams.set("chapter", current);
    history.replaceState(history.state, "", pageUrl.href);
  }

  function selectChapter(id) {
    if (!ready || !hasChapter(id)) return;
    current = id;
    reflectSelection();
    send({ type: "devpt-showcase-select", chapter: current });
  }

  function boundedText(value, limit) {
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= limit &&
      !/[\u0000-\u001f\u007f]/.test(value)
    );
  }

  function validManifest(manifest) {
    if (
      !manifest ||
      manifest.schemaVersion !== 1 ||
      manifest.product !== product ||
      !boundedText(manifest.title, 120)
    )
      return false;
    if (
      !Array.isArray(manifest.chapters) ||
      manifest.chapters.length === 0 ||
      manifest.chapters.length > 20
    )
      return false;
    var ids = new Set();
    return manifest.chapters.every(function (chapter) {
      if (
        !chapter ||
        typeof chapter.id !== "string" ||
        !/^[a-z][a-z0-9-]{0,47}$/.test(chapter.id) ||
        ids.has(chapter.id)
      )
        return false;
      if (
        !boundedText(chapter.label, 100) ||
        (chapter.cue !== undefined && !boundedText(chapter.cue, 300))
      )
        return false;
      ids.add(chapter.id);
      return true;
    });
  }

  function renderChapters() {
    var fragment = document.createDocumentFragment();
    chapters.forEach(function (chapter, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.chapter = chapter.id;

      var number = document.createElement("small");
      number.className = "product-chapter-number";
      number.textContent = String(index + 1).padStart(2, "0");
      var label = document.createElement("span");
      label.className = "product-chapter-label";
      label.textContent = chapter.label;
      button.append(number, label);
      if (chapter.cue) {
        var cue = document.createElement("span");
        cue.className = "product-chapter-cue";
        cue.textContent = chapter.cue;
        button.append(cue);
      }

      button.addEventListener("click", function () {
        selectChapter(chapter.id);
      });
      button.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          next = (index + 1) % chapters.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          next = (index + chapters.length - 1) % chapters.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = chapters.length - 1;
        if (next === null) return;
        event.preventDefault();
        selectChapter(chapters[next].id);
        rail.querySelectorAll("button[data-chapter]")[next].focus();
      });
      fragment.append(button);
    });
    rail.replaceChildren(fragment);
  }

  window.addEventListener("message", function (event) {
    if (
      !endpoint ||
      event.origin !== endpoint.origin ||
      event.source !== frame.contentWindow
    )
      return;
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "devpt-showcase-ready") {
      if (!validManifest(data.manifest)) return;
      chapters = data.manifest.chapters.map(function (chapter) {
        return { id: chapter.id, label: chapter.label, cue: chapter.cue };
      });
      var requested = new URLSearchParams(location.search).get("chapter");
      current = hasChapter(current)
        ? current
        : hasChapter(requested)
          ? requested
          : chapters[0].id;
      ready = true;
      frame.dataset.ready = "true";
      stopLoadingTimer();
      renderChapters();
      setStatus(
        data.manifest.title + " is ready. Choose a chapter to explore.",
        "ready",
      );
      selectChapter(current);
      updateVisibility();
    } else if (
      data.type === "devpt-showcase-state" &&
      ready &&
      hasChapter(data.chapter)
    ) {
      // A native change updates the page without echoing a new selection.
      current = data.chapter;
      reflectSelection();
    }
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          updateVisibility();
        });
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(frame);
  }
  document.addEventListener("visibilitychange", updateVisibility);
  window.addEventListener("popstate", function () {
    if (!ready) return;
    var requested = new URLSearchParams(location.search).get("chapter");
    selectChapter(hasChapter(requested) ? requested : chapters[0].id);
  });
  frame.addEventListener("error", function () {
    if (ready) return;
    stopLoadingTimer();
    setStatus(
      "The embedded walkthrough could not connect. Open the full view to explore the product.",
      "unavailable",
    );
  });

  function configureEndpoint(registry) {
    if (!registry || !Array.isArray(registry.productLines))
      throw new Error("Missing product catalog");
    var matches = registry.productLines.filter(function (line) {
      return line && line.id === product;
    });
    if (matches.length !== 1 || !matches[0].showcase)
      throw new Error("Missing product walkthrough");
    var config = matches[0].showcase;
    var url = new URL(config.url);
    if (
      url.origin !== trustedOrigins[product] ||
      url.protocol !== "https:" ||
      url.pathname !== "/showcase/" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Untrusted walkthrough endpoint");

    var configuredBase = product === "emrs" && typeof EMR_SOURCE_BASE === "string"
      ? EMR_SOURCE_BASE : null;
    if (configuredBase && configuredBase.trim()) {
      try {
        var base = new URL(configuredBase, location.href);
        if (
          ["http:", "https:"].includes(base.protocol) &&
          !base.username && !base.password && !base.search && !base.hash &&
          (base.origin === location.origin ||
            base.origin === trustedOrigins[product] ||
            (loopback.includes(location.hostname) &&
              loopback.includes(base.hostname) && base.port === "5181"))
        )
          // The local EMR bundle is rooted at this base. Its default entry
          // retains the chapter contract used by this dedicated product page;
          // the homepage launches presentation=workspace separately.
          return new URL(base.pathname.replace(/\/$/, "") + "/", base.origin);
      } catch (_) {
        /* Invalid local configuration keeps the catalog's published source. */
      }
    }

    if (loopback.includes(location.hostname) && location.port === "8109") {
      try {
        var local = new URL(new URLSearchParams(location.search).get(product));
        var expectedPort = product === "emrs" ? "5181" : "5182";
        if (
          local.protocol === "http:" &&
          loopback.includes(local.hostname) &&
          local.port === expectedPort &&
          config.localPort === Number(expectedPort) &&
          !local.username &&
          !local.password
        ) {
          url = new URL("/showcase/", local.origin);
        }
      } catch (_) {
        /* Local previews otherwise use the catalog's public URL. */
      }
    }
    return url;
  }

  setStatus("Connecting to the product walkthrough…", "loading");
  var controller = new AbortController();
  registryTimer = window.setTimeout(function () {
    controller.abort();
  }, 10000);
  fetch("/apps.json", { credentials: "omit", signal: controller.signal })
    .then(function (response) {
      if (!response.ok) throw new Error("Product catalog unavailable");
      return response.json();
    })
    .then(function (registry) {
      endpoint = configureEndpoint(registry);
      window.clearTimeout(registryTimer);
      fullView.href = endpoint.href;
      var embeddedUrl = new URL(endpoint);
      embeddedUrl.searchParams.set("embed", "");
      frame.loading = "lazy";
      frame.referrerPolicy = "origin";
      frame.src = embeddedUrl.href;
      updateVisibility();
    })
    .catch(function () {
      window.clearTimeout(registryTimer);
      setStatus(
        "The walkthrough is unavailable here. Open the full view to explore the product.",
        "unavailable",
      );
    });
})();
