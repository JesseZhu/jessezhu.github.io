$(document).ready(function () {
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

  if (
    window.location.pathname !== "{{ site.baseurl }}" &&
    window.location.pathname !== "{{ site.baseurl }}index.html"
  ) {
    $(".panel-cover").addClass("panel-cover--collapsed");
  }

  $(".btn-mobile-menu").click(function () {
    $(".navigation-wrapper").toggleClass("visible animated bounceInDown");
    $(".btn-mobile-menu__icon").toggleClass(
      "icon-list icon-x-circle animated fadeIn"
    );
  });

  $(".navigation-wrapper .blog-button").click(function () {
    $(".navigation-wrapper").toggleClass("visible");
    $(".btn-mobile-menu__icon").toggleClass(
      "icon-list icon-x-circle animated fadeIn"
    );
  });

  // ================================
  //  主题切换（浅色 / 深色）
  // ================================
  (function () {
    var storageKey = "site-theme"; // 'light' | 'dark'
    var toggleBtn = document.getElementById("theme-toggle-btn");
    var labelEl = document.querySelector(".theme-toggle-label");
    var docEl = document.documentElement;

    // if (!toggleBtn) return;

    function getSystemPrefersDark() {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }

    function applyTheme(theme, save) {
      if (theme === "dark") {
        docEl.setAttribute("data-theme", "dark");
        labelEl.textContent = "Light";
      } else {
        docEl.setAttribute("data-theme", "light");
        labelEl.textContent = "Dark";
      }
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

    if (savedTheme === "light" || savedTheme === "dark") {
      applyTheme(savedTheme, false);
    } else {
      applyTheme(getSystemPrefersDark() ? "dark" : "light", false);
    }

    // 点击切换
    toggleBtn.addEventListener("click", function () {
      var current =
        docEl.getAttribute("data-theme") === "dark" ? "dark" : "light";
      var next = current === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  })();
});
