// Schová všechno, co do stránky přidá někdo jiný než ona sama (např. štítek "Powered by Netlify").
(function () {
  var SKIP = /^(SCRIPT|STYLE|LINK|META|TITLE|HEAD|NOSCRIPT)$/;
  function ours(el) { return el.classList.contains("wrap") || el.id === "dlg"; }
  function hide(el) { el.style.setProperty("display", "none", "important"); el.setAttribute("aria-hidden", "true"); }
  function sweep() {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (!SKIP.test(el.tagName) && !ours(el)) hide(el);
    });
    Array.prototype.forEach.call(document.documentElement.children, function (el) {
      if (el !== document.head && el !== document.body && !SKIP.test(el.tagName)) hide(el);
    });
    document.querySelectorAll('[id*="netlify" i], [class*="netlify" i]').forEach(hide);
  }
  sweep();
  new MutationObserver(sweep).observe(document.documentElement, { childList: true, subtree: false });
  new MutationObserver(sweep).observe(document.body, { childList: true, attributes: false });
  var n = 0, t = setInterval(function () { sweep(); if (++n > 40) clearInterval(t); }, 500);
})();
