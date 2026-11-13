/* Home RECENT PHOTOS strip — newest 6 albums from data/gallery.json.
   Cards open an in-page lightbox; prev/next stays inside that album. URL is unchanged. */
(function () {
  var row = document.getElementById("photoStrip");
  if (!row) return;

  var ROOT = window.ADAM_ROOT || new URL("./", location.href).href;
  var ASSET = window.ADAM_ASSET_ROOT || "https://soonjokwon.github.io/adam-lab-widgets/";
  var ICON = {
    prev: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10.2 2.4 4.6 8l5.6 5.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    next: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5.8 2.4 11.4 8l-5.6 5.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  var albums = [], box = null, shown = [], idx = 0, opener = null, sx = 0, sy = 0, savedY = 0;

  function thumb(p) {
    var m = String(p).match(/^assets\/gallery\/([\w.-]+?)\.(jpe?g|png|webp)$/i);
    return m ? ASSET + "assets/gallery/thumbs/" + m[1] + "-480.jpg" : (/^https?:/.test(p) ? p : ASSET + p);
  }
  function src(p) { return /^https?:/.test(p) ? p : ASSET + p; }
  function dot(d) { return d ? d.replace(/^20(\d\d)-(\d\d)-(\d\d)$/, "$1.$2.$3") : ""; }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function closeBox() {
    if (!box) return;
    box.remove();
    box = null;
    document.documentElement.classList.remove("gl-locked");
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    window.scrollTo(0, savedY);
  }

  function step(d) {
    if (shown.length < 2) return;
    openBox((idx + d + shown.length) % shown.length);
  }

  function outsidePicture(img, e) {
    var r = img.getBoundingClientRect(), nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return false;
    var k = Math.min(1, r.width / nw, r.height / nh), w = nw * k, h = nh * k;
    var x = r.left + (r.width - w) / 2, y = r.top + (r.height - h) / 2;
    return e.clientX < x || e.clientX > x + w || e.clientY < y || e.clientY > y + h;
  }

  function openBox(i) {
    if (!box) savedY = window.scrollY;
    else { box.remove(); box = null; }
    idx = i;
    var it = shown[i], multi = shown.length > 1;
    var img = document.createElement("img");
    img.src = src(it.image);
    img.alt = it.caption || "";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "gl-btn";
    close.setAttribute("aria-label", "닫기");
    close.innerHTML = ICON.close;
    close.addEventListener("click", closeBox);
    var acts = document.createElement("span");
    acts.className = "gl-box-acts";
    acts.appendChild(close);
    var count = document.createElement("span");
    count.className = "ax-mono";
    count.textContent = (i + 1) + " / " + shown.length;
    var top = document.createElement("div");
    top.className = "gl-box-top";
    top.appendChild(count);
    top.appendChild(acts);
    var stage = document.createElement("div");
    stage.className = "gl-box-stage";
    stage.appendChild(img);
    if (multi) {
      var prev = document.createElement("button");
      prev.type = "button";
      prev.className = "gl-btn gl-prev";
      prev.setAttribute("aria-label", "이전 사진");
      prev.innerHTML = ICON.prev;
      var next = document.createElement("button");
      next.type = "button";
      next.className = "gl-btn gl-next";
      next.setAttribute("aria-label", "다음 사진");
      next.innerHTML = ICON.next;
      prev.addEventListener("click", function () { step(-1); });
      next.addEventListener("click", function () { step(1); });
      stage.appendChild(prev);
      stage.appendChild(next);
    }
    var cap = document.createElement("div");
    cap.className = "gl-box-cap";
    cap.innerHTML = '<span class="d">' + esc(dot(it.date)) + "</span>" + esc(it.caption || "");
    box = document.createElement("div");
    box.className = "gl-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", it.caption || "사진");
    box.appendChild(top);
    box.appendChild(stage);
    box.appendChild(cap);
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target === stage || (e.target === img && outsidePicture(img, e))) closeBox();
    });
    stage.addEventListener("touchstart", function (e) {
      var t = e.changedTouches[0];
      if (t) { sx = t.clientX; sy = t.clientY; }
    }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      var t = e.changedTouches[0];
      if (!t || shown.length < 2) return;
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.body.appendChild(box);
    document.documentElement.classList.add("gl-locked");
    close.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (!box) return;
    if (e.key === "Escape") closeBox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Tab") {
      var f = box.querySelectorAll("button");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  fetch(new URL("data/gallery.json", ROOT).href, { cache: "no-store" }).then(function (r) {
    return r.json();
  }).then(function (j) {
    var rows = (j.items || []).filter(function (r) { return r.image; }).map(function (r, i) {
      r.i = i;
      return r;
    });
    rows.sort(function (a, b) { return a.date === b.date ? a.i - b.i : (a.date < b.date ? 1 : -1); });
    var map = {}, order = [];
    rows.forEach(function (r) {
      var k = (r.caption || "") + "|" + String(r.date || "").slice(0, 4) + "|" + (r.group || "");
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(r);
    });
    albums = order.slice(0, 6).map(function (k) { return map[k]; });
    row.innerHTML = albums.map(function (a, n) {
      var f = a[0];
      return '<button type="button" class="ps-card" data-album="' + n + '" aria-label="' +
        esc(f.caption) + (a.length > 1 ? " (" + a.length + "장)" : "") +
        '"><div class="ps-img"><img src="' + esc(thumb(f.image)) + '" alt="" loading="lazy">' +
        (a.length > 1 ? '<span class="ps-n">' + a.length + "장</span>" : "") +
        '</div><div class="ps-cap"><span class="ps-date">' + dot(f.date) +
        '</span><span class="ps-text">' + esc(f.caption) + "</span></div></button>";
    }).join("");
    row.addEventListener("click", function (e) {
      var btn = e.target.closest(".ps-card");
      if (!btn || !row.contains(btn)) return;
      var n = +btn.getAttribute("data-album");
      if (!albums[n]) return;
      opener = btn;
      shown = albums[n].slice();
      openBox(0);
    });
  }).catch(function () {
    var strip = row.closest(".photo-strip");
    if (strip) strip.hidden = true;
  });
})();
