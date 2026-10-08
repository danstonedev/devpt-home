/* Public, authored previews. No accounts, model calls, or learner records. */
(function () {
  "use strict";
  var interview = document.querySelector(".encounter-preview");
  if (interview) {
    var questions = Array.from(interview.querySelectorAll("[data-question]"));
    var answers = {
      lateral: {
        question: "Where do you feel the pain?",
        answer: "Mostly on the outside of my hip. I can point right to it.",
        finding: "Lateral hip symptoms",
      },
      stairs: {
        question: "What makes it worse?",
        answer: "Stairs bring it on. I’ve started taking them one at a time.",
        finding: "Pain with stairs",
      },
      stiffness: {
        question: "How does it feel in the morning?",
        answer: "It feels stiff when I first get up. It eases once I’m moving.",
        finding: "Morning stiffness",
      },
    };
    var asked = new Set();
    var response = interview.querySelector(".encounter-response");
    var student = interview.querySelector(".encounter-student");
    var evidence = interview.querySelector(".encounter-evidence");
    var count = interview.querySelector(".encounter-count");
    var status = interview.querySelector(".encounter-status");
    questions.forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.dataset.question;
        var turn = answers[id];
        student.textContent = turn.question;
        student.hidden = false;
        response.textContent = "“" + turn.answer + "”";
        questions.forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        if (!asked.has(id)) {
          asked.add(id);
          var chip = document.createElement("span");
          chip.className = "encounter-finding";
          chip.textContent = turn.finding;
          evidence.appendChild(chip);
          evidence.querySelector(".encounter-empty").hidden = true;
          document.dispatchEvent(
            new CustomEvent("preview-evidence", { detail: { finding: id } }),
          );
        }
        count.textContent = asked.size + " / 3";
        status.textContent =
          "Patient: " +
          turn.answer +
          " Finding captured: " +
          turn.finding +
          ".";
      });
    });
    interview.querySelector(".encounter-controls").hidden = false;
    interview.querySelector(".encounter-nojs").hidden = true;
  }
  document.querySelectorAll("[data-open-reasoning]").forEach(function (link) {
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
      var tab = document.getElementById("tab-reasoning");
      if (tab) tab.click();
      var panel = document.getElementById("panel-reasoning");
      if (panel) {
        var target = panel.querySelector(".reasoning-demo") || panel;
        target.focus({ preventScroll: true });
        target.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      }
    });
  });

  var cohort = document.querySelector(".class-preview");
  if (cohort) {
    var reveal = cohort.querySelector(".class-reveal");
    var cloud = cohort.querySelector(".class-patterns");
    var cover = cohort.querySelector(".class-cover");
    reveal.hidden = false;
    cloud.hidden = true;
    cover.hidden = false;
    reveal.addEventListener("click", function () {
      var shown = reveal.getAttribute("aria-expanded") !== "true";
      reveal.setAttribute("aria-expanded", String(shown));
      cloud.hidden = !shown;
      cover.hidden = shown;
      reveal.textContent = shown
        ? "Hide class patterns"
        : "Reveal class patterns";
      cohort.querySelector(".class-status").textContent = shown
        ? "Sample class patterns revealed. Questions about symptoms, daily life, and goals are grouped for discussion."
        : "Sample class patterns hidden.";
    });
  }

  var load = document.querySelector("[data-load-joint]");
  if (load) {
    load.hidden = false;
    load.addEventListener("click", async function () {
      load.disabled = true;
      load.textContent = "Loading 3D model…";
      try {
        var demo = await import("./demos/joint-preview.bundle.js");
        await demo.mountJointPreview(document.querySelector(".joint-preview"));
      } catch (error) {
        document.querySelector(".joint-load-status").textContent =
          "The 3D preview couldn’t load here. You can still explore Movement in simLAB.";
        load.disabled = false;
        load.textContent = "Try loading again";
      }
    });
  }
})();
