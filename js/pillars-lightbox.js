/* Home pillars: click a slide -> gallery-style lightbox (reuses .gl-box styles).
   Captions come from data-cap-ko / data-cap-en (mockup); proposed: sections tab rows
   block=home-pillars, type=slide, image=…, text=KO caption, sub=EN caption. */
(function () {
  var ICON = {
    prev: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10.2 2.4 4.6 8l5.6 5.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    next: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5.8 2.4 11.4 8l-5.6 5.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  function el(t, a, kids) { var e = document.createElement(t); for (var k in a || {}) { if (k === "html") e.innerHTML = a[k]; else if (k === "text") e.textContent = a[k]; else e.setAttribute(k, a[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); return e; }
  function init() {
    var imgs = [].slice.call(document.querySelectorAll(".pillars-visual .carousel__slide img"));
    if (!imgs.length) return;
    var box = null, cur = 0, opener = null;
    function open(i) {
      close(true); cur = (i + imgs.length) % imgs.length; var s = imgs[cur];
      var img = el("img", { src: s.currentSrc || s.src, alt: s.alt });
      var p = el("button", { type: "button", class: "gl-btn gl-prev", "aria-label": "이전 그림", html: ICON.prev });
      var n = el("button", { type: "button", class: "gl-btn gl-next", "aria-label": "다음 그림", html: ICON.next });
      var c = el("button", { type: "button", class: "gl-btn", "aria-label": "닫기", html: ICON.close });
      box = el("div", { class: "gl-box", role: "dialog", "aria-modal": "true", "aria-label": s.alt }, [
        el("div", { class: "gl-box-top" }, [el("span", { class: "ax-mono", text: (cur + 1) + " / " + imgs.length }), el("span", { class: "gl-box-acts" }, [c])]),
        el("div", { class: "gl-box-stage" }, [img, p, n]),
        el("div", { class: "gl-box-cap" }, [el("div", { text: s.getAttribute("data-cap-ko") || s.alt }),
          s.getAttribute("data-cap-en") ? el("div", { style: "opacity:.72;font-size:.92em;margin-top:4px", text: s.getAttribute("data-cap-en") }) : null])
      ]);
      
      p.onclick = function () { open(cur - 1); }; n.onclick = function () { open(cur + 1); }; c.onclick = function () { close(); };
      box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("gl-box-stage")) close(); });
      document.body.appendChild(box); document.documentElement.classList.add("gl-locked"); c.focus();
    }
    function close(keep) { if (box) { box.remove(); box = null; } if (!keep) { document.documentElement.classList.remove("gl-locked"); if (opener) opener.focus({ preventScroll: true }); } }
    /* inactive slides are stacked (opacity 0) on top, so open whichever slide is active */
    var root = document.querySelector(".pillars-visual .carousel");
    root.style.cursor = "zoom-in";
    root.addEventListener("click", function (e) {
      if (e.target.closest(".carousel__nav, .carousel__dots")) return;
      var slides = [].slice.call(root.querySelectorAll(".carousel__slide"));
      var i = slides.findIndex(function (sl) { return sl.classList.contains("is-active"); });
      opener = root; open(i < 0 ? 0 : i);
    });
    document.addEventListener("keydown", function (e) { if (!box) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") open(cur - 1); else if (e.key === "ArrowRight") open(cur + 1); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
