/* DevPT homepage: deliberate, accessible product exploration. */
(function () {
  "use strict";
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var mobileMenu = document.querySelector(".nav-mobile");
  if (mobileMenu)
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.removeAttribute("open");
      });
    });

  var tablist = document.querySelector(".tour-tabs");
  if (tablist) {
    var tabs = Array.from(tablist.querySelectorAll("[data-tour]"));
    var panels = Array.from(document.querySelectorAll("[data-panel]"));
    function selectTab(index, focus) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute("aria-selected", String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== tabs[index].dataset.tour;
      });
      if (focus) tabs[index].focus();
    }
    tablist.setAttribute("role", "tablist");
    tabs.forEach(function (tab, index) {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "panel-" + tab.dataset.tour);
      tab.addEventListener("click", function () {
        selectTab(index, false);
      });
      tab.addEventListener("keydown", function (event) {
        var next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft")
          next = (index + tabs.length - 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          selectTab(next, true);
        }
      });
    });
    panels.forEach(function (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "tab-" + panel.dataset.panel);
      panel.tabIndex = 0;
    });
    selectTab(0, false);
    tablist.hidden = false;
  }

  var dialog = document.querySelector(".image-dialog");
  if (dialog && typeof dialog.showModal === "function") {
    var image = dialog.querySelector("img");
    var caption = dialog.querySelector("p");
    var opener;
    document.querySelectorAll("[data-enlarge]").forEach(function (link) {
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
        opener = link;
        image.src = link.href;
        image.alt = link.querySelector("img").alt;
        caption.textContent = image.alt;
        dialog.showModal();
      });
    });
    dialog
      .querySelector(".dialog-close")
      .addEventListener("click", function () {
        dialog.close();
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
    dialog.addEventListener("close", function () {
      if (opener) opener.focus();
    });
  }

  var footer = document.querySelector(".footer-apps");
  if (footer && window.fetch)
    fetch("apps.json", { cache: "no-cache" })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.apps)) return;
        var list = document.createDocumentFragment();
        data.apps
          .filter(function (app) {
            return app.placement.includes("footer");
          })
          .forEach(function (app) {
            var item = document.createElement("li");
            var link = document.createElement("a");
            link.href = app.url;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = app.footerLabel || app.name;
            item.appendChild(link);
            list.appendChild(item);
          });
        footer.replaceChildren(list);
      })
      .catch(function () {
        /* Static links remain available if the catalog cannot load. */
      });
})();
