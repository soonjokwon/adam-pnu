/* Harvard citation + Cite button (click-to-copy + toast). */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof root !== "undefined") {
    root.ADAMCite = api;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", api.bootUI);
      else api.bootUI();
    }
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
  var MONTH_TAIL = new RegExp(",\\s*(?:" + MONTHS + ")(?:\\s+\\d{1,2})?\\.?$", "i");
  var STATUS_DETAILS = /^(Published online|게재 예정|in press|in-press|accepted)$/i;

  function trim(s) { return String(s == null ? "" : s).trim(); }
  function isKoreanText(s) { return /[가-힣]/.test(s || ""); }
  function stripMarks(name) {
    return String(name || "").replace(/[*+]/g, "").replace(/\s+/g, " ").trim();
  }
  function isInitials(tok) {
    return /^[A-Z]\.$/.test(tok) ||
      /^[A-Z](?:\.[A-Z])+\.?$/.test(tok) ||
      /^[A-Z]\.?-(?:[A-Z]\.?)+$/.test(tok);
  }
  function isJunior(tok) {
    return /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(tok);
  }

  function splitAuthors(raw) {
    var parts = String(raw || "").split(/\s*,\s*/).map(function (p) { return p.trim(); }).filter(Boolean);
    var out = [];
    parts.forEach(function (p) {
      var clean = stripMarks(p);
      if (!clean) return;
      if (isJunior(clean) && out.length) {
        out[out.length - 1].junior = clean.replace(/jr\.?/i, "Jr.").replace(/sr\.?/i, "Sr.");
        return;
      }
      out.push({ raw: clean, junior: "" });
    });
    return out;
  }

  function formatOneAuthor(entry, korean) {
    var name = entry.raw;
    if (korean || isKoreanText(name)) {
      return name + (entry.junior ? ", " + entry.junior : "");
    }
    var tokens = name.split(/\s+/).filter(Boolean);
    var initials = [];
    var surnameParts = [];
    tokens.forEach(function (tok) {
      if (isInitials(tok) && !surnameParts.length) {
        var norm = tok.charAt(tok.length - 1) === "." ? tok : tok + ".";
        initials.push(norm);
      } else {
        surnameParts.push(tok);
      }
    });
    var formatted;
    if (surnameParts.length && initials.length) {
      formatted = surnameParts.join(" ") + ", " + initials.join(" ");
    } else if (/^[A-Za-z][A-Za-z'.\-]+,\s*/.test(name)) {
      formatted = name;
    } else {
      formatted = name;
    }
    if (entry.junior) formatted += ", " + entry.junior;
    return formatted;
  }

  function joinAuthors(list, korean) {
    if (!list.length) return "";
    if (korean) return list.join(", ");
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + " and " + list[1];
    return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }

  function formatAuthors(raw) {
    var korean = isKoreanText(raw);
    var people = splitAuthors(raw);
    var names = people.map(function (p) { return formatOneAuthor(p, korean); });
    return { text: joinAuthors(names, korean), missing: !names.length };
  }

  function doiFromLink(link) {
    var s = trim(link);
    if (!s) return "";
    var m = s.match(/doi\.org\/(.+)$/i) || s.match(/^doi:\s*(.+)$/i);
    if (!m) return "";
    try { return decodeURIComponent(m[1]).replace(/\/+$/, ""); }
    catch (e) { return m[1].replace(/\/+$/, ""); }
  }

  function stripMonthTail(s) {
    var prev;
    do {
      prev = s;
      s = s.replace(MONTH_TAIL, "").trim();
    } while (s !== prev);
    return s;
  }

  function parsePagesOrArticle(rest) {
    rest = stripMonthTail(trim(rest)).replace(/,$/, "").trim();
    if (!rest) return {};
    if (STATUS_DETAILS.test(rest)) return { status: rest };
    var p = rest.match(/^(?:pp\.?\s*)?(\d+)\s*[-–—]\s*(\d+)$/);
    if (p) return { pages: p[1] + "-" + p[2] };
    if (/^(?:e)?\d+[a-z]?\d*$/i.test(rest)) return { article: rest };
    return { raw: rest };
  }

  function parseJournalDetails(details) {
    var s = stripMonthTail(trim(details));
    if (!s) return { empty: true };
    if (STATUS_DETAILS.test(s)) return { status: s };
    var m = s.match(/^(\d+)\s*\(([^)]+)\)\s*,\s*(.+)$/);
    if (m) return Object.assign({ vol: m[1], issue: m[2] }, parsePagesOrArticle(m[3]));
    m = s.match(/^(\d+)\s*\(([^)]+)\)\s*$/);
    if (m) return { vol: m[1], issue: m[2] };
    m = s.match(/^(\d+)\s*,\s*(.+)$/);
    if (m) return Object.assign({ vol: m[1] }, parsePagesOrArticle(m[2]));
    return { raw: s };
  }

  function periodJoin(parts) {
    var out = [];
    parts.forEach(function (p) {
      p = trim(p);
      if (!p) return;
      out.push(p.replace(/[.]+$/, ""));
    });
    if (!out.length) return "";
    var last = out[out.length - 1];
    var joined = out.join(". ");
    if (/[.!?)]$/.test(last)) return joined;
    return joined + ".";
  }

  function endTitle(title) {
    title = trim(title);
    if (!title) return "";
    return /[.!?…]$/.test(title) ? title : title + ".";
  }

  function conferenceTail(it) {
    var details = trim(it.details);
    var date = trim(it.date);
    if (details) return details.replace(/[.]+$/, "");
    if (date) return date;
    return "";
  }

  function formatHarvard(it) {
    it = it || {};
    var type = it.type || "";
    var authors = formatAuthors(it.authors);
    var year = trim(it.year);
    var title = trim(it.title);
    var venue = trim(it.venue);
    var doi = doiFromLink(it.link);

    var head = "";
    if (authors.text && year) head = authors.text + " (" + year + ") " + endTitle(title);
    else if (authors.text) head = authors.text + " " + endTitle(title);
    else if (year) head = "(" + year + ") " + endTitle(title);
    else head = endTitle(title);

    var body = "";
    if (type === "journal-intl" || type === "journal-kr") {
      var d = parseJournalDetails(it.details);
      var loc = "";
      if (d.vol && d.issue) loc = d.vol + "(" + d.issue + ")";
      else if (d.vol) loc = d.vol;
      if (d.pages) loc = (loc ? loc + ", " : "") + "pp. " + d.pages;
      else if (d.article) loc = (loc ? loc + ", " : "") + d.article;
      else if (d.raw) loc = (loc ? loc + ", " : "") + d.raw;
      var jBits = [];
      if (venue && loc) jBits.push(venue + ", " + loc);
      else if (venue) jBits.push(venue);
      else if (loc) jBits.push(loc);
      if (d.status) jBits.push(d.status);
      body = periodJoin(jBits);
    } else if (type === "conf-intl" || type === "conf-kr") {
      var tail = conferenceTail(it);
      var inLine = venue ? "In: " + venue : "In:";
      if (tail) inLine += ", " + tail;
      if (!venue && !tail) inLine = "";
      body = periodJoin([inLine]);
    } else if (type === "in-prep") {
      var st = trim(it.status).replace(/-/g, " ");
      body = periodJoin([venue, st ? "[" + st + "]" : "[in preparation]"]);
    } else {
      body = periodJoin([venue, trim(it.details) || trim(it.date)]);
    }

    var text = periodJoin([head.replace(/[.]+$/, ""), body.replace(/[.]+$/, "")]);
    if (doi) text = text.replace(/[.]+$/, "") + ". doi:" + doi;

    var usable = !authors.missing && !!year && !!title && type !== "in-prep" && !!venue;
    return { text: text, usable: usable };
  }

  /* ---------- clipboard ---------- */
  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.setAttribute("aria-hidden", "true");
      ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  function copyText(text) {
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function selectPreview(el) {
    if (!el) return;
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {}
  }

  /* ---------- UI ---------- */
  var ui = { toast: null };
  var toastTimer = null;

  function ensureToast() {
    if (ui.toast) return ui.toast;
    var t = document.createElement("div");
    t.id = "cite-toast";
    t.className = "cite-toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.innerHTML = '<p class="cite-toast__msg"></p><p class="cite-toast__preview"></p>';
    document.body.appendChild(t);
    ui.toast = t;
    return t;
  }

  function setCopiedState(btn, on) {
    if (!btn) return;
    if (on) {
      btn.classList.add("is-copied");
      btn.textContent = "복사됨";
      btn.setAttribute("aria-label", "복사됨");
    } else {
      btn.classList.remove("is-copied");
      btn.textContent = "Cite";
    }
  }

  function showToast(cite, ok) {
    var t = ensureToast();
    t.classList.toggle("is-fallback", !ok);
    t.querySelector(".cite-toast__msg").textContent = ok
      ? "Harvard 서식을 복사했습니다"
      : "복사하지 못했습니다. 아래 문구를 선택해 복사해 주세요.";
    var preview = t.querySelector(".cite-toast__preview");
    preview.textContent = cite.text;
    t.classList.add("is-on");
    if (toastTimer) window.clearTimeout(toastTimer);
    if (!ok) {
      window.setTimeout(function () { selectPreview(preview); }, 30);
      toastTimer = window.setTimeout(function () { t.classList.remove("is-on", "is-fallback"); }, 10000);
    } else {
      toastTimer = window.setTimeout(function () { t.classList.remove("is-on", "is-fallback"); }, 4200);
    }
  }

  function flashCopied(btn) {
    setCopiedState(btn, true);
    window.setTimeout(function () { setCopiedState(btn, false); }, 1800);
  }

  function attach(li, it, body, meta) {
    if (!li || !it) return;
    var cite = formatHarvard(it);
    if (!cite.usable) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pub-cite";
    btn.textContent = "Cite";
    btn.setAttribute("aria-label", "Harvard 서식으로 인용하기: " + (it.title || ""));
    btn.setAttribute("data-cite-title", it.title || "");
    btn.setAttribute("data-cite-type", it.type || "");
    if (meta) meta.appendChild(btn);
    else if (body) body.appendChild(btn);
    else li.appendChild(btn);
    btn.addEventListener("click", function () {
      copyText(cite.text).then(function (ok) {
        if (ok) flashCopied(btn);
        showToast(cite, ok);
      });
    });
  }

  function bootUI() { ensureToast(); }

  return {
    format: formatHarvard,
    attach: attach,
    bootUI: bootUI
  };
});
