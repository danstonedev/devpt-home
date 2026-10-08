/*
 * Homepage reasoning preview: no patient data, model calls, assessment, or persistence.
 * Geometry adapted from simLAB apps/mission-shell/src/lib/ddx/reasoningMapView.ts
 * from the October 2026 source checkout (work/simlab-source). bandTops, bandPositionAt,
 * and threadPath retain its collision spacing and cubic curve approach. This small
 * DOM implementation uses illustrative hypotheses; every relationship is authored
 * by the visitor. Source geometry belongs to the existing DevPT/simLAB project.
 */
(() => {
  "use strict";

  const CHIP_HEIGHT = 44;
  const CHIP_GAP = 12;
  const hypotheses = [
    {
      id: "hip",
      label: "Hip osteoarthritis",
      short: "Hip osteoarthritis",
      position: 0.22,
    },
    {
      id: "trochanteric",
      label: "Greater trochanteric pain",
      short: "Trochanteric pain",
      position: 0.56,
    },
    {
      id: "lumbar",
      label: "Lumbar referral",
      short: "Lumbar referral",
      position: 0.9,
    },
  ];
  const findings = [
    { id: "stairs", label: "Pain with stairs" },
    { id: "lateral", label: "Lateral hip symptoms" },
    { id: "stiffness", label: "Morning stiffness" },
  ];

  function bandTops(order, height, chip = CHIP_HEIGHT, gap = CHIP_GAP) {
    const room = Math.max(0, height - chip);
    const tops = order.map(
      (item) => Math.min(1, Math.max(0, item.position)) * room,
    );
    for (let index = 1; index < tops.length; index++)
      tops[index] = Math.max(tops[index], tops[index - 1] + chip + gap);
    if (tops.length)
      tops[tops.length - 1] = Math.min(tops[tops.length - 1], room);
    for (let index = tops.length - 2; index >= 0; index--)
      tops[index] = Math.min(tops[index], tops[index + 1] - chip - gap);
    if (tops.length) tops[0] = Math.max(tops[0], 0);
    return Object.fromEntries(
      order.map((item, index) => [item.id, Math.round(tops[index])]),
    );
  }

  function bandPositionAt(top, height, chip = CHIP_HEIGHT) {
    const room = height - chip;
    return room > 0
      ? Math.round(Math.min(1, Math.max(0, top / room)) * 1000) / 1000
      : 0.5;
  }

  function threadPath(from, to) {
    const bend = Math.max(40, Math.abs(to.x - from.x) * 0.45);
    const r = (value) => Math.round(value * 10) / 10;
    return `M ${r(from.x)} ${r(from.y)} C ${r(from.x + bend)} ${r(from.y)}, ${r(to.x - bend)} ${r(to.y)}, ${r(to.x)} ${r(to.y)}`;
  }

  document.querySelectorAll("[data-reasoning-demo]").forEach((root) => {
    const band = root.querySelector("[data-rd-band]");
    const map = root.querySelector(".rd-map");
    const svg = root.querySelector("[data-rd-threads]");
    const list = root.querySelector("[data-rd-link-list]");
    const selection = root.querySelector("[data-rd-selection]");
    const live = root.querySelector("[data-rd-live]");
    const restart = root.querySelector("[data-rd-restart]");
    const chips = new Map(
      Array.from(root.querySelectorAll("[data-rd-hypothesis]"), (button) => [
        button.dataset.rdHypothesis,
        button,
      ]),
    );
    const evidence = new Map(
      Array.from(root.querySelectorAll("[data-rd-evidence]"), (button) => [
        button.dataset.rdEvidence,
        button,
      ]),
    );
    if (
      !band ||
      !map ||
      !svg ||
      !list ||
      !selection ||
      !live ||
      !restart ||
      chips.size !== 3 ||
      evidence.size !== 3
    )
      return;

    const positions = new Map(
      hypotheses.map((item) => [item.id, item.position]),
    );
    const links = new Map();
    const interviewFindings = new Set();
    let selectedHypothesis = null;
    let selectedFinding = null;
    let drag = null;
    let suppressClick = null;
    let frame = null;
    let announcement = null;

    const hypothesis = (id) => hypotheses.find((item) => item.id === id);
    const finding = (id) => findings.find((item) => item.id === id);

    function announce(message) {
      window.clearTimeout(announcement);
      live.textContent = "";
      announcement = window.setTimeout(() => {
        live.textContent = message;
      }, 35);
    }

    function drawThreads() {
      const bounds = map.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      svg.replaceChildren();
      for (const link of links.values()) {
        const left = chips.get(link.hypothesis).getBoundingClientRect();
        const right = evidence.get(link.finding).getBoundingClientRect();
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute(
          "d",
          threadPath(
            {
              x: left.right - bounds.left,
              y: left.top + left.height / 2 - bounds.top,
            },
            {
              x: right.left - bounds.left,
              y: right.top + right.height / 2 - bounds.top,
            },
          ),
        );
        path.setAttribute(
          "class",
          `rd-thread${link.kind === "challenges" ? " is-challenges" : ""}`,
        );
        svg.append(path);
      }
    }

    function placeChips() {
      if (!band.clientHeight) return;
      const order = hypotheses
        .map((item) => ({ id: item.id, position: positions.get(item.id) }))
        .sort((a, b) => a.position - b.position);
      const tops = bandTops(order, band.clientHeight);
      for (const [id, chip] of chips) {
        chip.style.top = `${tops[id]}px`;
        const rank = order.findIndex((item) => item.id === id) + 1;
        chip.setAttribute(
          "aria-label",
          `${hypothesis(id).label}, rank ${rank} of ${order.length} on your likelihood band`,
        );
      }
      drawThreads();
    }

    function scheduleGeometry() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        placeChips();
      });
    }

    function updateSelection() {
      for (const [id, chip] of chips)
        chip.setAttribute("aria-pressed", String(id === selectedHypothesis));
      for (const [id, card] of evidence)
        card.setAttribute("aria-pressed", String(id === selectedFinding));
      root.querySelectorAll("[data-rd-link]").forEach((button) => {
        button.disabled = !selectedHypothesis || !selectedFinding;
      });
      root.querySelectorAll("[data-rd-move]").forEach((button) => {
        button.disabled = !selectedHypothesis;
      });
      if (!selectedHypothesis)
        selection.textContent = "Choose a hypothesis to begin.";
      else if (!selectedFinding)
        selection.textContent = `${hypothesis(selectedHypothesis).short} selected. Now choose a finding.`;
      else
        selection.textContent = `${finding(selectedFinding).label} → ${hypothesis(selectedHypothesis).short}. How does it relate?`;
    }

    function renderConnections() {
      list.replaceChildren();
      for (const [key, link] of links) {
        const item = document.createElement("li");
        if (link.kind === "challenges") item.className = "is-challenges";
        const description = `${finding(link.finding).label} ${link.kind} ${hypothesis(link.hypothesis).label}`;
        const text = document.createElement("span");
        text.textContent = `${finding(link.finding).label} ${link.kind} ${hypothesis(link.hypothesis).short}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "rd-remove";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Remove connection: ${description}`);
        remove.addEventListener("click", () => {
          links.delete(key);
          renderConnections();
          drawThreads();
          const nextRemove = list.querySelector(".rd-remove");
          (nextRemove || restart).focus({ preventScroll: true });
          announce(
            `Removed connection. ${links.size} ${links.size === 1 ? "link" : "links"} remaining.`,
          );
        });
        item.append(text, remove);
        list.append(item);
      }
      root.querySelector("[data-rd-count]").textContent = String(links.size);
      root.querySelector("[data-rd-empty]").hidden = links.size > 0;
    }

    function chooseHypothesis(id, shouldAnnounce = true) {
      selectedHypothesis = id;
      updateSelection();
      if (shouldAnnounce)
        announce(`${hypothesis(id).label} selected. Choose a finding.`);
    }

    function moveHypothesis(id, amount) {
      chooseHypothesis(id, false);
      const previous = positions.get(id);
      const next = Math.min(1, Math.max(0, previous + amount));
      if (next === previous) {
        announce(
          `${hypothesis(id).label} is already at the ${amount < 0 ? "more likely" : "less likely"} end of the band.`,
        );
        return;
      }
      positions.set(id, next);
      placeChips();
      const order = hypotheses
        .slice()
        .sort((a, b) => positions.get(a.id) - positions.get(b.id));
      announce(
        `${hypothesis(id).label} adjusted ${amount < 0 ? "toward more likely" : "toward less likely"}, rank ${order.findIndex((item) => item.id === id) + 1} of ${order.length}.`,
      );
    }

    for (const [id, chip] of chips) {
      chip.disabled = false;
      chip.addEventListener("click", () => {
        if (suppressClick === id) {
          suppressClick = null;
          return;
        }
        chooseHypothesis(id);
      });
      chip.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        moveHypothesis(id, event.key === "ArrowUp" ? -0.08 : 0.08);
      });
      chip.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        const bounds = chip.getBoundingClientRect();
        drag = {
          id,
          pointer: event.pointerId,
          startY: event.clientY,
          offset: event.clientY - bounds.top,
          moved: false,
        };
        chip.setPointerCapture(event.pointerId);
      });
      chip.addEventListener("pointermove", (event) => {
        if (!drag || drag.id !== id || drag.pointer !== event.pointerId) return;
        if (!drag.moved && Math.abs(event.clientY - drag.startY) < 6) return;
        if (!drag.moved) {
          drag.moved = true;
          chooseHypothesis(id, false);
          chip.classList.add("is-dragging");
        }
        const bounds = band.getBoundingClientRect();
        positions.set(
          id,
          bandPositionAt(
            event.clientY - bounds.top - drag.offset,
            bounds.height,
          ),
        );
        scheduleGeometry();
      });
      const endDrag = (event) => {
        if (!drag || drag.id !== id || drag.pointer !== event.pointerId) return;
        const moved = drag.moved;
        drag = null;
        chip.classList.remove("is-dragging");
        if (chip.hasPointerCapture(event.pointerId))
          chip.releasePointerCapture(event.pointerId);
        if (moved) {
          suppressClick = id;
          chip.focus({ preventScroll: true });
          placeChips();
          announce(
            `${hypothesis(id).label} repositioned. Choose a finding to connect.`,
          );
          // A pointer click normally follows pointerup; do not suppress a later
          // keyboard click or a separate tap if the browser cancelled that click.
          window.setTimeout(() => {
            if (suppressClick === id) suppressClick = null;
          }, 0);
        }
      };
      chip.addEventListener("pointerup", endDrag);
      chip.addEventListener("pointercancel", endDrag);
    }

    for (const [id, card] of evidence) {
      card.disabled = false;
      card.querySelector("[data-rd-source]").hidden = false;
      card.querySelector("[data-rd-source]").textContent = "Sample finding";
      card.setAttribute("aria-label", `${finding(id).label}, sample finding`);
      card.addEventListener("click", () => {
        selectedFinding = id;
        updateSelection();
        announce(
          selectedHypothesis
            ? `${finding(id).label} selected. Choose Supports or Challenges.`
            : `${finding(id).label} selected. Choose a working hypothesis.`,
        );
      });
    }

    root.querySelectorAll("[data-rd-link]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!selectedHypothesis || !selectedFinding) return;
        const kind = button.dataset.rdLink;
        if (!["supports", "challenges"].includes(kind)) return;
        const key = `${selectedHypothesis}:${selectedFinding}`;
        links.set(key, {
          hypothesis: selectedHypothesis,
          finding: selectedFinding,
          kind,
        });
        renderConnections();
        drawThreads();
        announce(
          `Connection added: ${finding(selectedFinding).label} ${kind} ${hypothesis(selectedHypothesis).label}.`,
        );
      });
    });

    root.querySelectorAll("[data-rd-move]").forEach((button) => {
      button.addEventListener("click", () => {
        if (selectedHypothesis)
          moveHypothesis(
            selectedHypothesis,
            button.dataset.rdMove === "up" ? -0.08 : 0.08,
          );
      });
    });

    restart.addEventListener("click", () => {
      hypotheses.forEach((item) => positions.set(item.id, item.position));
      links.clear();
      selectedHypothesis = null;
      selectedFinding = null;
      updateSelection();
      renderConnections();
      placeChips();
      announce(
        "Map restarted. Your connections were cleared and illustrative starting positions restored.",
      );
    });

    document.addEventListener("preview-evidence", (event) => {
      const id = event.detail && event.detail.finding;
      if (!evidence.has(id) || interviewFindings.has(id)) return;
      interviewFindings.add(id);
      const card = evidence.get(id);
      card.classList.add("is-from-interview");
      card.querySelector("[data-rd-source]").hidden = false;
      card.querySelector("[data-rd-source]").textContent = "From interview";
      card.setAttribute(
        "aria-label",
        `${finding(id).label}, from the illustrative interview`,
      );
      scheduleGeometry();
    });

    root.querySelector("[data-rd-fallback]").hidden = true;
    root.querySelector("[data-rd-controls]").hidden = false;
    restart.hidden = false;
    updateSelection();
    renderConnections();
    scheduleGeometry();
    // Tab changes resize the hidden map back to its actual dimensions. Drawing
    // from DOM ports also keeps curves aligned at narrow widths and browser zoom.
    if ("ResizeObserver" in window)
      new ResizeObserver(scheduleGeometry).observe(map);
    window.addEventListener("resize", scheduleGeometry, { passive: true });
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(scheduleGeometry);
  });
})();
