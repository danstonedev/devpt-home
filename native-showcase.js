(function () {
  "use strict";
  var frames = Array.from(document.querySelectorAll("[data-native-frame]"));
  var gallery = document.getElementById("native-gallery-frame");
  var choices = Array.from(document.querySelectorAll("[data-native-area]"));
  var current = "movement";
  var content = {
    movement: [
      "Movement lab",
      "STERILE TEACHING BASELINE",
      "The clean body teaching stage, with the program’s examination demonstrations, movement adaptations, hands, instruments and playback controls. Start with Capsular hip, or explore the native catalog.",
    ],
    patient: [
      "Patients & environments",
      "NATIVE PATIENT PRESENTATION",
      "Meet James Morgan or Elena Ruiz in the program’s own patient view. Explore Outpatient PT, Inpatient room and Performance gym, with the actual room and camera controls.",
    ],
    interview: [
      "Patient interview",
      "SCRIPTED NATIVE CASE PRACTICE",
      "Use the real interview workspace, planned questions, transcript and evidence capture. This public sample uses the program’s authored patient responses; full simLAB supports AI conversations.",
    ],
    reasoning: [
      "Reasoning & evidence",
      "NATIVE REASONING WORKSPACE",
      "Use the program’s diagnosis picker, connection ports, evidence flags and Supports / Weakens controls. The same sample case carries between the interview and map.",
    ],
    joints: [
      "Joint mechanics",
      "HIP · KNEE · ANKLE · FOOT",
      "Explore native joint playback, capsule and reference layers, bone morphology examples, and manual techniques with synchronized joint and hands views. Try Knee terminal extension or Hip posterior glide.",
    ],
    eyes: [
      "Eye examinations",
      "PATIENT + SYNCHRONIZED EYE VIEW",
      "Begin with the native Dix–Hallpike demonstration. Explore eye movements, vestibular findings, Frenzel goggles, affected side and playback at the program’s actual speeds.",
    ],
    neuro: [
      "Neuro lab",
      "STIMULUS · PATHWAY · ANATOMY",
      "Use the real light-touch, pinprick and reflex workspace. Trace the signal, explore sensory endings and pathways, and place a lesion using the program’s own controls.",
    ],
    aquatic: [
      "Aquatic Therapy",
      "POOL · MOVEMENT · RESPONSE",
      "Explore the actual pool, immersion and dose controls, movement animations and model-derived responses. The public view opens the program’s student Explore workspace.",
    ],
    vitals: [
      "Live Vitals",
      "PROFILE · POSTURE · EFFORT · TIME",
      "Change the native patient profile, posture and effort. Use the actual simulation clock, numerical readings and trends to watch the modeled response.",
    ],
  };
  function send(frame, message) {
    if (frame.contentWindow)
      frame.contentWindow.postMessage(message, window.location.origin);
  }
  function select(area, focus) {
    if (!content[area] || !gallery) return;
    current = area;
    choices.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.nativeArea === area),
      );
    });
    document.querySelector(".native-gallery-title").textContent =
      content[area][0];
    document.querySelector(".native-gallery-badge").textContent =
      content[area][1];
    document.querySelector(".native-gallery-description").textContent =
      content[area][2];
    gallery.title = "simLAB " + content[area][0] + " native workspace";
    document.querySelector(".native-full-view").href = "showcase/?area=" + area;
    send(gallery, { type: "simlab-showcase-select", area: area });
    if (focus) gallery.focus({ preventScroll: true });
  }
  choices.forEach(function (button, index) {
    button.addEventListener("click", function () {
      select(button.dataset.nativeArea, false);
    });
    button.addEventListener("keydown", function (event) {
      var next;
      if (event.key === "ArrowRight" || event.key === "ArrowDown")
        next = (index + 1) % choices.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        next = (index + choices.length - 1) % choices.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = choices.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        choices[next].focus();
        select(choices[next].dataset.nativeArea, false);
      }
    });
  });
  document.querySelectorAll("[data-open-native]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      select(link.dataset.openNative, false);
      var stage = document.querySelector(".native-gallery");
      stage.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      gallery.focus({ preventScroll: true });
    });
  });
  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin) return;
    var frame = frames.find(function (item) {
      return item.contentWindow === event.source;
    });
    if (!frame) return;
    if (event.data?.type === "simlab-showcase-ready") {
      if (frame === gallery)
        send(frame, { type: "simlab-showcase-select", area: current });
      send(frame, {
        type: "simlab-showcase-visibility",
        visible: frame.dataset.visible !== "false",
      });
    }
    if (
      event.data?.type === "simlab-showcase-area" &&
      frame === gallery &&
      event.data.area !== current
    )
      select(event.data.area, false);
    if (event.data?.type === "simlab-showcase-home")
      document.getElementById("top").scrollIntoView({ block: "start" });
  });
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var frame = entry.target;
          frame.dataset.visible = String(entry.isIntersecting);
          send(frame, {
            type: "simlab-showcase-visibility",
            visible: entry.isIntersecting,
          });
        });
      },
      { threshold: 0, rootMargin: "600px 0px" },
    );
    frames.forEach(function (frame) {
      observer.observe(frame);
    });
  }
  var full = document.querySelector(".native-full-view");
  if (full)
    full.addEventListener("click", function () {
      try {
        var url = new URL(gallery.contentWindow.location.href);
        url.searchParams.delete("embed");
        if (current === "movement") {
          var selected = gallery.contentDocument
            .querySelector(
            '[role="group"][aria-label="Show"] button[aria-pressed="true"] > span:last-child',
            )
            ?.textContent.trim();
          if (selected === "Joints") {
            url.searchParams.set("area", "joints");
            if (!url.searchParams.has("joints"))
              url.searchParams.set("joints", "");
          } else if (selected === "Eyes") url.searchParams.set("area", "eyes");
          else {
            url.searchParams.delete("joints");
            url.searchParams.delete("eyes");
          }
        }
        full.href = url.href;
      } catch (_) {}
    });
})();
