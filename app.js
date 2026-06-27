/* DevPT — devpt.app interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Nav border-on-scroll */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Scroll reveal */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 55 + "ms";
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Demo videos — play only while in view; static poster under reduced motion */
  var vids = Array.prototype.slice.call(document.querySelectorAll('video.lazyvid'));
  if (vids.length) {
    if (reduceMotion) {
      // leave posters in place; never autoplay
    } else if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else if (!v.paused) {
            v.pause();
          }
        });
      }, { threshold: 0.35 });
      vids.forEach(function (v) { vio.observe(v); });
    } else {
      vids.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
    }
  }

  /* ===== App catalog — single source of truth: apps.json =====
     The "Practice tools" nav and the footer app list are rendered from
     apps.json so the catalog is maintained in ONE place. The static markup
     in index.html is a no-JS fallback; edit apps.json, not the lists.
     (Fetch requires the page be served over http(s); opening index.html via
     file:// will skip rendering and keep the static fallback.) */
  function inPlacement(app, where) {
    return app.placement && app.placement.indexOf(where) !== -1;
  }
  function buildNavItem(app) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#app-" + app.id;
    a.className = "mono";
    a.textContent = app.tag;
    li.appendChild(a);
    return li;
  }
  function buildFooterItem(app) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = app.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = app.footerLabel || app.name;
    li.appendChild(a);
    return li;
  }
  function renderCatalog(apps) {
    var navUl = document.querySelector(".contract ul");
    if (navUl) {
      navUl.innerHTML = "";
      apps.filter(function (a) { return inPlacement(a, "nav"); })
          .forEach(function (a) { navUl.appendChild(buildNavItem(a)); });
    }
    var footUl = document.querySelector(".footer-apps");
    if (footUl) {
      footUl.innerHTML = "";
      apps.filter(function (a) { return inPlacement(a, "footer"); })
          .forEach(function (a) { footUl.appendChild(buildFooterItem(a)); });
    }
  }
  function validatePlates(apps) {
    apps.filter(function (a) { return inPlacement(a, "plate"); }).forEach(function (a) {
      var plate = document.getElementById("app-" + a.id);
      if (!plate) { console.warn("[apps] missing plate #app-" + a.id); return; }
      var links = Array.prototype.slice.call(plate.querySelectorAll("a[href]"));
      var match = links.some(function (l) { return l.getAttribute("href") === a.url; });
      if (!match) console.warn("[apps] plate #app-" + a.id + " has no link to " + a.url);
    });
  }
  if (window.fetch) {
    fetch("apps.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.apps) return;
        renderCatalog(data.apps);
        validatePlates(data.apps);
      })
      .catch(function () { /* keep the static fallback lists */ });
  }
})();
