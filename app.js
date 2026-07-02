/* DevPT - devpt.app interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  function showReveal(el) {
    el.classList.add("in");
    el.removeAttribute("data-reveal-pending");
    el.style.transitionDelay = "";
  }
  if (reveals.length) {
    try {
      if ("IntersectionObserver" in window && !reduceMotion) {
        var remainingReveals = reveals.length;
        var revealFallback = window.setTimeout(function () {
          reveals.forEach(showReveal);
        }, 1600);
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) {
                showReveal(e.target);
                io.unobserve(e.target);
                remainingReveals -= 1;
                if (remainingReveals <= 0) window.clearTimeout(revealFallback);
              }
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );
        reveals.forEach(function (el, i) {
          el.setAttribute("data-reveal-pending", "true");
          el.style.transitionDelay = Math.min(i % 6, 5) * 55 + "ms";
          io.observe(el);
        });
      } else {
        reveals.forEach(showReveal);
      }
    } catch (e) {
      reveals.forEach(showReveal);
    }
  }
  var vids = Array.prototype.slice.call(document.querySelectorAll("video.lazyvid"));
  if (vids.length && !reduceMotion) {
    if ("IntersectionObserver" in window) {
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
      vids.forEach(function (v) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    }
  }

  var walkthrough = document.querySelector(".hero-walkthrough");
  if (walkthrough) {
    var walkSteps = Array.prototype.slice.call(walkthrough.querySelectorAll(".walkthrough-step"));
    var walkItems = Array.prototype.slice.call(walkthrough.querySelectorAll(".walkthrough-timeline li"));
    var walkIndex = 0;
    var walkDelay = 4200;
    function setWalkthroughStep(nextIndex) {
      walkIndex = nextIndex % walkSteps.length;
      walkSteps.forEach(function (step, i) {
        step.classList.toggle("active", i === walkIndex);
      });
      walkItems.forEach(function (item, i) {
        item.classList.toggle("active", i === walkIndex);
        item.classList.toggle("done", i < walkIndex);
        var bar = item.querySelector(".track b");
        if (bar) {
          bar.style.animation = "none";
          bar.offsetHeight;
          bar.style.animation = "";
        }
      });
    }
    setWalkthroughStep(0);
    if (!reduceMotion && walkSteps.length > 1) {
      window.setInterval(function () {
        setWalkthroughStep(walkIndex + 1);
      }, walkDelay);
    }
  }

  function inPlacement(app, where) {
    return app.placement && app.placement.indexOf(where) !== -1;
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

  function renderFooter(apps) {
    var footUl = document.querySelector(".footer-apps");
    if (!footUl) return;
    footUl.innerHTML = "";
    apps.filter(function (a) { return inPlacement(a, "footer"); })
      .forEach(function (a) { footUl.appendChild(buildFooterItem(a)); });
  }

  function validateLinkedSurfaces(apps) {
    apps.filter(function (a) { return inPlacement(a, "plate"); }).forEach(function (a) {
      var surface = document.getElementById("app-" + a.id);
      if (!surface) { console.warn("[apps] missing surface #app-" + a.id); return; }
      var links = Array.prototype.slice.call(surface.querySelectorAll("a[href], area[href]"));
      var direct = surface.getAttribute("href") === a.url;
      var nested = links.some(function (l) { return l.getAttribute("href") === a.url; });
      if (!direct && !nested) console.warn("[apps] surface #app-" + a.id + " has no link to " + a.url);
    });
  }

  if (window.fetch) {
    fetch("apps.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.apps) return;
        renderFooter(data.apps);
        validateLinkedSurfaces(data.apps);
      })
      .catch(function () {});
  }
})();
