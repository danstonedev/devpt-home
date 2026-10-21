/* The dedicated simLAB page owns its frame, not a copy of the simulator. Chapter/tool
 * metadata arrives from the currently deployed simLAB build itself. */
(function () {
  "use strict";
  var endpoint = new URL("https://lab.devpt.app/showcase/");
  var loopback = ["localhost", "127.0.0.1", "[::1]"];
  var configured = null;
  if (typeof NATIVE_SOURCE_BASE === "string" && NATIVE_SOURCE_BASE.trim()) {
    try {
      var base = new URL(NATIVE_SOURCE_BASE, location.href);
      if (
        ["http:", "https:"].includes(base.protocol) &&
        !base.username && !base.password && !base.search && !base.hash &&
        (base.origin === location.origin ||
          base.origin === endpoint.origin ||
          (loopback.includes(location.hostname) &&
            loopback.includes(base.hostname) && base.port === "5180"))
      )
        configured = new URL(base.pathname.replace(/\/$/, "") + "/showcase/", base.origin);
    } catch (_) {
      /* An absent or invalid local configuration keeps the published source. */
    }
  }
  if (configured) endpoint = configured;
  else if (loopback.includes(location.hostname)) {
    try {
      var local = new URL(new URLSearchParams(location.search).get("simlab"));
      if (
        local.protocol === "http:" &&
        loopback.includes(local.hostname) &&
        local.port === "5180" && !local.username && !local.password
      )
        endpoint = new URL("/showcase/", local.origin);
    } catch (_) {
      /* Local preview defaults to the live public walkthrough. */
    }
  }
  var frames = Array.from(document.querySelectorAll("[data-live-showcase]"));
  var gallery = document.getElementById("native-gallery-frame");
  var rail = document.querySelector("[data-story-chapters]");
  var current = { chapter: "meet", tool: "joints", play: false };
  var chapters = [];
  var tools = [];
  var paths = {
    person:
      "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8v6m-3-3h6",
    mic: "M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V5Zm-3 6a6 6 0 0 0 12 0M12 17v4m-4 0h8",
    accessibility_new:
      "M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0M4 8l8 2 8-2M12 10v5m0 0-5 6m5-6 5 6",
    stethoscope:
      "M5 3v6a5 5 0 0 0 10 0V3M3 3h4m6 0h4M10 14v3a4 4 0 0 0 8 0v-2m2-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m2 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
    trending_up: "m3 17 6-6 4 4 8-11m-7 0h7v7",
    menu_book:
      "M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1m0-15c3-2 6-2 10-1v15c-4-1-7-1-10 1V5Z",
  };
  function icon(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    var path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", paths[name] || "M12 4v16M4 12h16");
    svg.append(path);
    return svg;
  }
  function send(frame, message) {
    if (frame.contentWindow)
      frame.contentWindow.postMessage(message, endpoint.origin);
  }
  function selection() {
    if (!gallery) return;
    if (gallery.dataset.ready === "true")
      send(
        gallery,
        Object.assign(
          {
            type: "simlab-showcase-select",
            chapter: current.chapter,
            play: current.play,
          },
          current.chapter === "study" ? { tool: current.tool } : {},
        ),
      );
    rail?.querySelectorAll("button").forEach(function (button) {
      button.setAttribute(
        "aria-current",
        button.dataset.chapter === current.chapter ? "step" : "false",
      );
    });
    var full = document.querySelector(".native-full-view");
    if (full) {
      var url = new URL(endpoint);
      url.searchParams.set("chapter", current.chapter);
      if (current.chapter === "study")
        url.searchParams.set("tool", current.tool);
      full.href = url.href;
    }
  }
  function choose(chapter, tool, play) {
    if (
      chapters.length &&
      !chapters.some(function (item) {
        return item.id === chapter;
      })
    )
      return;
    if (
      tool &&
      tools.length &&
      !tools.some(function (item) {
        return item.id === tool;
      })
    )
      return;
    current = { chapter: chapter, tool: tool || current.tool, play: !!play };
    selection();
  }
  function enter(chapter, tool, play) {
    choose(chapter, tool, play);
    (rail || document.querySelector(".native-gallery")).scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function validCatalog(items) {
    return (
      Array.isArray(items) &&
      items.length > 0 &&
      items.length <= 20 &&
      items.every(function (item) {
        return (
          item &&
          /^[a-z][a-z-]{0,30}$/.test(item.id) &&
          typeof item.label === "string" &&
          item.label.length < 80
        );
      })
    );
  }
  function renderChapters(manifest) {
    if (
      !rail ||
      manifest?.schemaVersion !== 1 ||
      manifest.case?.patient?.id !== "patient-james-morgan" ||
      !validCatalog(manifest.chapters) ||
      !validCatalog(manifest.studyTools)
    )
      return;
    chapters = manifest.chapters;
    tools = manifest.studyTools;
    var fragment = document.createDocumentFragment();
    chapters.forEach(function (chapter, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.chapter = chapter.id;
      var label = document.createElement("span");
      label.textContent = chapter.label;
      var number = document.createElement("small");
      number.textContent = String(index + 1).padStart(2, "0");
      button.append(icon(chapter.icon), label, number);
      button.addEventListener("click", function () {
        enter(chapter.id, null, false);
      });
      button.addEventListener("keydown", function (event) {
        var next =
          event.key === "ArrowRight"
            ? (index + 1) % chapters.length
            : event.key === "ArrowLeft"
              ? (index + chapters.length - 1) % chapters.length
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? chapters.length - 1
                  : null;
        if (next !== null) {
          event.preventDefault();
          rail.querySelectorAll("button")[next].focus();
          choose(chapters[next].id);
        }
      });
      fragment.append(button);
    });
    rail.replaceChildren(fragment);
    selection();
    var cards = document.querySelector("[data-live-study-tools]");
    if (cards) {
      var list = document.createDocumentFragment();
      tools.forEach(function (tool, index) {
        var link = document.createElement("a");
        link.className = "native-lab-card";
        var url = new URL(endpoint);
        url.searchParams.set("chapter", "study");
        url.searchParams.set("tool", tool.id);
        link.href = url.href;
        var label = document.createElement("span");
        label.className = "mono";
        label.textContent =
          String(index + 1).padStart(2, "0") + " / STUDY TOOL";
        var title = document.createElement("h3");
        title.textContent = tool.label;
        var cue = document.createElement("p");
        cue.textContent = typeof tool.cue === "string" ? tool.cue : "";
        var action = document.createElement("span");
        action.textContent = "Explore ↗";
        link.append(label, title, cue, action);
        link.addEventListener("click", function (event) {
          if (
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          enter("study", tool.id, false);
        });
        list.append(link);
      });
      cards.replaceChildren(list);
    }
  }
  window.addEventListener("message", function (event) {
    if (event.origin !== endpoint.origin) return;
    var frame = frames.find(function (item) {
      return item.contentWindow === event.source;
    });
    if (!frame) return;
    var data = event.data;
    if (data?.type === "simlab-showcase-ready") {
      frame.dataset.ready = "true";
      frame.dataset.simlabBuild =
        typeof data.build === "string" ? data.build : "";
      renderChapters(data.manifest);
      send(frame, {
        type: "simlab-showcase-visibility",
        visible:
          frame.dataset.visible !== "false" &&
          document.visibilityState === "visible",
      });
      if (frame === gallery) {
        selection();
        document.querySelector("[data-walkthrough-loading]")?.remove();
      }
    }
    if (
      data?.type === "simlab-showcase-state" &&
      frame === gallery &&
      chapters.some(function (item) {
        return item.id === data.chapter;
      })
    ) {
      current.chapter = data.chapter;
      if (
        tools.some(function (item) {
          return item.id === data.tool;
        })
      )
        current.tool = data.tool;
      // Reflect the child state without sending a selection back (which would pause it).
      rail?.querySelectorAll("button").forEach(function (button) {
        button.setAttribute(
          "aria-current",
          button.dataset.chapter === current.chapter ? "step" : "false",
        );
      });
      var full = document.querySelector(".native-full-view");
      var url = new URL(endpoint);
      url.searchParams.set("chapter", current.chapter);
      if (current.chapter === "study")
        url.searchParams.set("tool", current.tool);
      if (full) full.href = url.href;
    }
  });
  frames.forEach(function (frame) {
    var url = new URL(endpoint);
    url.searchParams.set("embed", "");
    if (frame.dataset.liveShowcase === "teaser")
      url.searchParams.set("teaser", "");
    frame.src = url.href;
  });
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.dataset.visible = String(entry.isIntersecting);
          send(entry.target, {
            type: "simlab-showcase-visibility",
            visible:
              entry.isIntersecting && document.visibilityState === "visible",
          });
        });
      },
      { rootMargin: "120px 0px" },
    );
    frames.forEach(function (frame) {
      observer.observe(frame);
    });
  }
  document.addEventListener("visibilitychange", function () {
    frames.forEach(function (frame) {
      send(frame, {
        type: "simlab-showcase-visibility",
        visible:
          document.visibilityState === "visible" &&
          frame.dataset.visible !== "false",
      });
    });
  });
  document
    .querySelectorAll("[data-start-walkthrough]")
    .forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        enter("meet", null, true);
      });
    });
  var areas = { patient: "meet", interview: "listen", reasoning: "reason" };
  document.querySelectorAll("[data-open-native]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      var area = link.dataset.openNative;
      enter(areas[area] || "study", areas[area] ? null : area, false);
    });
  });
})();
