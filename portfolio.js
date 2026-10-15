/* Preserve simLAB chapter bookmarks after giving the product its own page. */
(function () {
  "use strict";
  var oldSections = [
    "flow",
    "student",
    "faculty",
    "labs",
    "references",
    "research-opportunities",
  ];
  function restoreBookmark() {
    var section = location.hash.slice(1);
    if (!oldSections.includes(section)) return;
    var url = new URL("/simlab/", location.origin);
    url.hash = section;
    if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
      var simlab = new URLSearchParams(location.search).get("simlab");
      if (simlab) url.searchParams.set("simlab", simlab);
    }
    location.replace(url.href);
  }
  restoreBookmark();
  window.addEventListener("hashchange", restoreBookmark);
})();
