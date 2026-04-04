$(document).ready(function () {
  function normalizePath(path) {
    if (!path) return "/";
    var normalized = path.replace(/index\.html$/, "");
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized || "/";
  }

  function isHomePath() {
    var body = document.body;
    var baseUrl = body ? body.getAttribute("data-baseurl") || "" : "";
    var pathname = normalizePath(window.location.pathname);
    var normalizedBase = normalizePath(baseUrl || "/");

    if (normalizedBase !== "/" && pathname.indexOf(normalizedBase) === 0) {
      pathname = normalizePath(pathname.slice(normalizedBase.length) || "/");
    }

    return pathname === "/";
  }

  $("a.blog-button").click(function (e) {
    if ($(".panel-cover").hasClass("panel-cover--collapsed")) return;
    currentWidth = $(".panel-cover").width();
    if (currentWidth < 960) {
      $(".panel-cover").addClass("panel-cover--collapsed");
      $(".content-wrapper").addClass("animated slideInRight");
    } else {
      $(".panel-cover").css("max-width", currentWidth);
      $(".panel-cover").animate(
        { "max-width": "530px", width: "40%" },
        400,
        (swing = "swing"),
        function () {}
      );
    }
  });

  if (window.location.hash && window.location.hash == "#blog") {
    $(".panel-cover").addClass("panel-cover--collapsed");
  }

  if (!isHomePath()) {
    $(".panel-cover").addClass("panel-cover--collapsed");
  }

  (function () {
    var mobileMenuBtn = document.querySelector(".btn-mobile-menu");
    var navigationWrapper = document.querySelector(".navigation-wrapper.mobile-only");
    var mobileOverlay = document.querySelector(".mobile-nav-overlay");
    var openIcon = document.querySelector(".btn-mobile-menu__icon");
    var closeIcon = document.querySelector(".btn-mobile-close__icon");

    if (!mobileMenuBtn || !navigationWrapper || !mobileOverlay) return;

    function setMenuState(isOpen) {
      navigationWrapper.classList.toggle("visible", isOpen);
      mobileOverlay.classList.toggle("visible", isOpen);
      document.body.classList.toggle("mobile-menu-open", isOpen);

      if (openIcon) {
        openIcon.classList.toggle("hidden", isOpen);
      }

      if (closeIcon) {
        closeIcon.classList.toggle("hidden", !isOpen);
      }

      mobileMenuBtn.setAttribute(
        "aria-label",
        isOpen ? "关闭侧边栏" : "打开侧边栏"
      );
      mobileMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function toggleMenu() {
      setMenuState(!document.body.classList.contains("mobile-menu-open"));
    }

    mobileMenuBtn.onclick = function (event) {
      event.preventDefault();
      toggleMenu();
    };

    mobileOverlay.onclick = function () {
      setMenuState(false);
    };

    navigationWrapper.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuState(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) {
        setMenuState(false);
      }
    });

    window.__toggleMobileMenu = toggleMenu;

    setMenuState(false);
  })();

  // ================================
  //  主题切换（浅色 / 深色）
  // ================================
  (function () {
    var storageKey = "site-theme"; // 'light' | 'dark'
    var toggleButtons = document.querySelectorAll(".btn-theme-toggle");
    var docEl = document.documentElement;

    if (toggleButtons.length === 0) return;

    function getSystemPrefersDark() {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }

    function applyTheme(theme, save) {
      if (docEl.getAttribute("data-theme") !== theme) {
        docEl.setAttribute("data-theme", theme);
      }

      toggleButtons.forEach(function (btn) {
        if (theme === "dark") {
          btn.setAttribute("aria-label", "切换到浅色模式");
          btn.setAttribute("title", "切换到浅色模式");
        } else {
          btn.setAttribute("aria-label", "切换到深色模式");
          btn.setAttribute("title", "切换到深色模式");
        }
      });

      if (save) {
        try {
          window.localStorage.setItem(storageKey, theme);
        } catch (e) {}
      }
    }

    // 初始化：优先使用用户选择，其次跟随系统
    var savedTheme = null;
    try {
      savedTheme = window.localStorage.getItem(storageKey);
    } catch (e) {}

    var initialTheme = docEl.getAttribute("data-theme");

    if (initialTheme === "light" || initialTheme === "dark") {
      applyTheme(initialTheme, false);
    } else if (savedTheme === "light" || savedTheme === "dark") {
      applyTheme(savedTheme, false);
    } else {
      applyTheme(getSystemPrefersDark() ? "dark" : "light", false);
    }

    // 点击切换
    toggleButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var current =
          docEl.getAttribute("data-theme") === "dark" ? "dark" : "light";
        var next = current === "dark" ? "light" : "dark";
        applyTheme(next, true);
      });
    });
  })();
});
