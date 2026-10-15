/* Optional recordings of the native products. Screenshots remain the default
 * and work as ordinary image links when scripts or video are unavailable. */
(function () {
  "use strict";

  var previews = [];

  function validSource(source) {
    try {
      var url = new URL(source.getAttribute("src"), location.href);
      return (
        url.origin === location.origin &&
        ["http:", "https:"].includes(url.protocol) &&
        url.pathname.startsWith("/assets/features/") &&
        url.pathname.endsWith(".mp4") &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    } catch (_) {
      return false;
    }
  }

  function pause(preview) {
    // Invalidate a pending play promise before a deliberate pause. Its
    // AbortError must not become a visible playback failure afterward.
    preview.attempt += 1;
    preview.video.pause();
  }

  function pauseOthers(active) {
    previews.forEach(function (preview) {
      if (preview !== active) pause(preview);
    });
  }

  function showScreenshot(preview, failed) {
    pause(preview);
    preview.open = false;
    preview.video.hidden = true;
    preview.still.hidden = false;
    preview.button.textContent = "Play clip";
    preview.button.setAttribute("aria-expanded", "false");
    preview.status.textContent = failed
      ? "This clip could not play. The screenshot is still available."
      : "";
    preview.status.hidden = !failed;
  }

  function showClip(preview) {
    pauseOthers(preview);
    preview.open = true;
    preview.still.hidden = true;
    preview.video.hidden = false;
    preview.button.textContent = "Show screenshot";
    preview.button.setAttribute("aria-expanded", "true");
    preview.status.hidden = true;
    preview.status.textContent = "";

    var attempt = ++preview.attempt;
    try {
      if (preview.video.error || preview.video.networkState === 3)
        preview.video.load();
      var playback = preview.video.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(function (error) {
          if (error && error.name === "AbortError" && preview.video.paused)
            return;
          if (preview.open && preview.attempt === attempt)
            showScreenshot(preview, true);
        });
      }
    } catch (_) {
      if (preview.open && preview.attempt === attempt)
        showScreenshot(preview, true);
    }
  }

  document
    .querySelectorAll("[data-feature-preview]")
    .forEach(function (figure, index) {
      var media = figure.querySelector(".feature-media");
      var still = figure.querySelector("a.feature-still");
      var video = figure.querySelector("video[data-feature-video]");
      var button = figure.querySelector("button[data-feature-play]");
      var title = figure.querySelector("figcaption h3");
      if (!media || !still || !video || !button) return;
      var sources = Array.from(video.querySelectorAll("source"));
      if (
        !sources.length ||
        !sources.every(validSource) ||
        video.hasAttribute("src")
      )
        return;

      var status = figure.querySelector("[data-feature-status]");
      if (!status) {
        status = document.createElement("p");
        status.dataset.featureStatus = "";
        media.after(status);
      }
      status.setAttribute("role", "status");
      status.hidden = true;

      var preview = {
        media: media,
        still: still,
        video: video,
        button: button,
        status: status,
        open: false,
        attempt: 0,
      };
      previews.push(preview);
      if (!video.id) video.id = "feature-video-" + (index + 1);
      if (title) {
        if (!title.id) title.id = "feature-title-" + (index + 1);
        video.setAttribute("aria-labelledby", title.id);
      }
      video.autoplay = false;
      video.loop = false;
      video.controls = true;
      video.playsInline = true;
      video.preload = "none";
      showScreenshot(preview, false);
      button.setAttribute("aria-controls", video.id);
      button.hidden = false;
      button.addEventListener("click", function () {
        if (preview.open) showScreenshot(preview, false);
        else showClip(preview);
      });
      video.addEventListener("play", function () {
        pauseOthers(preview);
      });
      video.addEventListener("error", function () {
        if (preview.open) showScreenshot(preview, true);
      });
      sources.forEach(function (source) {
        source.addEventListener("error", function () {
          if (preview.open) showScreenshot(preview, true);
        });
      });
    });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0) return;
        var preview = previews.find(function (item) {
          return item.media === entry.target;
        });
        if (preview) pause(preview);
      });
    });
    previews.forEach(function (preview) {
      observer.observe(preview.media);
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") previews.forEach(pause);
  });
})();
