document.addEventListener("DOMContentLoaded", function () {
  var explorer = document.querySelector(".tag-explorer");
  var mainPostList = document.querySelector(".main-post-list");
  var breadcrumb = document.getElementById("topbar-breadcrumb");

  if (!explorer || !mainPostList) return;

  var chips = Array.prototype.slice.call(
    explorer.querySelectorAll(".tag-explorer__chip")
  );
  var panels = Array.prototype.slice.call(
    mainPostList.querySelectorAll(".main-post-list__panel")
  );
  var homeLink = breadcrumb ? breadcrumb.querySelector(".breadcrumb-link") : null;
  var homeUrl = homeLink ? homeLink.getAttribute("href") || "/" : "/";
  var baseUrl = document.body ? document.body.getAttribute("data-baseurl") || "" : "";
  var defaultTitle = document.title;
  var routeMap = {};

  function normalizePath(path) {
    if (!path) return "/";

    var normalized = path.replace(/index\.html$/, "");

    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }

    return normalized || "/";
  }

  function updateBreadcrumb(label) {
    if (!breadcrumb || !homeUrl) return;

    document.title = label || defaultTitle;

    if (!label) {
      breadcrumb.innerHTML =
        '<a href="' + homeUrl + '" class="breadcrumb-link">首页</a>';
      return;
    }

    breadcrumb.innerHTML =
      '<a href="' +
      homeUrl +
      '" class="breadcrumb-link">首页</a>' +
      '<span class="breadcrumb-sep">/</span>' +
      '<a class="breadcrumb-link" href="' +
      baseUrl +
      '/tags/">标签</a>' +
      '<span class="breadcrumb-sep">/</span>' +
      '<span class="breadcrumb-current">' +
      label +
      '</span>';
  }

  function activate(targetId) {
    chips.forEach(function (chip) {
      var isActive = chip.getAttribute("data-target") === targetId;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    panels.forEach(function (panel) {
      var isActive = panel.id === targetId;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  panels.forEach(function (panel) {
    panel.setAttribute(
      "aria-hidden",
      panel.classList.contains("is-active") ? "false" : "true"
    );
  });

  chips.forEach(function (chip) {
    var chipUrl = chip.getAttribute("data-url");
    if (!chipUrl) return;
    routeMap[normalizePath(chipUrl)] = {
      targetId: chip.getAttribute("data-target"),
      label: chip.getAttribute("data-label") || "",
      url: chipUrl,
    };
  });

  function syncFromPath(path, pushState) {
    var route = routeMap[normalizePath(path)] || routeMap[normalizePath(homeUrl)];

    if (!route) return;

    activate(route.targetId);
    updateBreadcrumb(route.label);

    if (pushState && normalizePath(window.location.pathname) !== normalizePath(route.url)) {
      window.history.pushState({ targetId: route.targetId }, "", route.url);
    }
  }

  syncFromPath(window.location.pathname, false);

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var targetId = chip.getAttribute("data-target");
      var targetUrl = chip.getAttribute("data-url") || homeUrl;
      if (!targetId) return;
      syncFromPath(targetUrl, true);

      if (window.innerWidth <= 1179) {
        mainPostList.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  window.addEventListener("popstate", function () {
    syncFromPath(window.location.pathname, false);
  });
});
