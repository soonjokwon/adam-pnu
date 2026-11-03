#!/usr/bin/env python3
"""Rebuild js/search-index.js from data/*.json.

Run after scripts/snapshot_sheet.py (the sync workflow does this).
All sheet-driven entries (news, publications, patents, awards, projects,
members, talks, gallery, and text blocks from data/sections.json) are
regenerated from data/*.json. Only the static "page" entries are carried over
from the existing index. Section blocks map to the page whose HTML has the
matching data-block="..." mount. Anchors mirror js/widgets/sections.js
(A.markKey on cards and research pillar sections) and ADAM.slug.
"""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "js" / "search-index.js"
INSTAGRAM = "https://www.instagram.com/pnu_adam_lab?stkn=eWJlOHk4cHp6MDVt&utm_source=qr"


def slug(v):
    s = re.sub(r"[^\w\uac00-\ud7a3]+", "-", str(v or "").lower(), flags=re.ASCII)
    return s.strip("-")[:72] or "item"


def items(name):
    return json.loads((ROOT / "data" / f"{name}.json").read_text("utf-8")).get("items", [])


def j(sep, *parts):
    return sep.join(p for p in (str(x or "").strip() for x in parts) if p)


def entry(title, path, kind, blurb, keywords, anchor):
    return {"title": title, "path": path, "kind": kind, "blurb": blurb, "keywords": keywords, "anchor": anchor}


def build(old):
    out = [e for e in old if e["kind"] == "page"]
    for r in items("news"):
        t = r.get("title_ko") or r.get("title_en")
        out.append(entry(t, "board/index.html", "news", j(" · ", r.get("date"), r.get("tag"), r.get("title_en")),
                         j(" ", t, r.get("title_en"), r.get("tag"), "news 소식"), "adam-news-" + slug(t)))
    for r in items("publications"):
        t = r.get("title")
        if not t:
            continue
        typ = r.get("type")
        blurb = typ if typ == "in-prep" else j(" · ", r.get("year"), typ, r.get("venue"), r.get("authors"))
        out.append(entry(t, "publications/index.html", "publication", blurb,
                         j(" ", t, r.get("authors"), r.get("venue"), r.get("topics"), typ, "publication 논문"),
                         "adam-publication-" + slug(t)))
    for r in items("patents"):
        t = r.get("title")
        out.append(entry(t, "publications/index.html", "patent", j(" · ", r.get("status"), r.get("number"), r.get("date")),
                         j(" ", t, r.get("number"), r.get("topics"), "patent 특허"), "adam-patent-" + slug(t)))
    for r in items("awards"):
        t = r.get("award")
        out.append(entry(t, "awards/index.html", "award", j(" · ", r.get("date"), r.get("recipients"), r.get("title"), r.get("event")),
                         j(" ", t, r.get("recipients"), r.get("title"), r.get("event"), r.get("category"), "award 수상"),
                         "adam-award-" + slug(t)))
    for r in items("projects"):
        t = r.get("title")
        out.append(entry(t, "research/index.html", "project",
                         j(" · ", r.get("funder"), r.get("group"), r.get("org_role"), r.get("start"), r.get("end")),
                         j(" ", t, r.get("funder"), r.get("program"), r.get("group"), "project 과제"), "adam-project-" + slug(t)))
    for r in items("members"):
        ko, en = r.get("name_ko"), r.get("name_en")
        t = ko or en
        if not t:
            continue
        out.append(entry(t, "team/index.html", "member", j(" · ", en, r.get("role"), r.get("position"), r.get("status")),
                         j(" ", t, en if ko else "", r.get("role"), r.get("affiliation"), "member 구성원"),
                         "adam-member-" + slug(t)))
    for r in items("talks"):
        t = r.get("title")
        out.append(entry(t, "team/professor/index.html", "talk", j(" · ", r.get("date"), r.get("venue"), r.get("location")),
                         j(" ", t, r.get("venue"), r.get("location"), "talk 초청"), "adam-talk-" + slug(t)))
    for r in items("gallery"):
        t = r.get("caption")
        out.append(entry(t, "board/index.html", "photo", j(" · ", r.get("date"), r.get("group"), "Photos"),
                         j(" ", t, r.get("group"), "gallery 사진 photo"),
                         "adam-photo-" + slug(j(" ", t, (r.get("date") or "")[:4], r.get("group")))))
    out += build_sections()
    return out


PAGES = ["index.html", "research/index.html", "team/professor/index.html", "team/recruiting/index.html",
         "team/index.html", "awards/index.html", "publications/index.html", "board/index.html"]
# Bilingual page labels so section hits match Korean or English queries.
PAGE_WORDS = {
    "index.html": "home 홈 ADAM Lab",
    "research/index.html": "research 연구 연구분야",
    "team/professor/index.html": "professor 교수 권순조 Soonjo Kwon CV",
    "team/recruiting/index.html": "recruiting 모집 지원 join apply",
}
BLOCK_WORDS = {
    "home-pillars": "research pillars 연구 AID", "home-growth": "growth pillars 성장",
    "home-join": "join contact 연락처 모집", "research": "research area 연구 분야 Autonomy Intelligence Digitalization",
    "professor": "profile 약력", "recruit-intro": "모집 안내 recruiting", "recruit-topics": "연구 주제 research topics",
    "recruit-benefits": "참여 혜택 benefits", "recruit-apply": "지원 방법 how to apply contact",
}


SUB_LABELS = {"E": "Email 이메일", "T": "Tel 전화", "Office": "Office 교수실", "Lab": "Lab 연구실"}


def plain(v):
    s = re.sub(r"\*\*|\{\{|\}\}", "", str(v or ""))
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def short(v, n):
    v = plain(v)
    return v if len(v) <= n else v[: n - 1].rstrip() + "…"


def aid_letter(sub):
    m = re.search(r"\{\{\s*([AID])\s*\}\}", sub or "", re.I) or \
        re.search(r"\b([AID])(?:utonomy|ntelligence|igitalization)\b", sub or "", re.I)
    return m.group(1).upper() if m else ""


def pillar_key(title):
    for word, k in (("Autonomy", "a"), ("Intelligence", "i"), ("Digitalization", "d")):
        if re.search(r"\b" + word + r"\b", title or "", re.I):
            return k
    return ""


def block_pages():
    m = {}
    for page in PAGES:
        f = ROOT / page
        if f.exists():
            for b in re.findall(r'data-block="([^"]+)"', f.read_text("utf-8")):
                for one in b.split(","):
                    m.setdefault(one.strip(), page)
    return m


def build_sections():
    where = block_pages()
    rows = []
    for r in items("sections"):
        block, typ = (r.get("block") or "").strip(), (r.get("type") or "bullet").strip().lower()
        txt, sub = (r.get("text") or "").strip(), (r.get("sub") or "").strip()
        if not block or block not in where or typ == "figure" or not txt:
            continue
        if block == "recruit-intro" and sub == "신청 기간":
            txt = "상시"  # same override as sections.js
        rows.append(dict(block=block, type=typ, sub=sub, section=(r.get("section") or "").strip(), text=txt))
    # consecutive card rows with the same sub render as one card (sections.js cardRun)
    groups = []
    for r in rows:
        g = groups[-1] if groups else None
        if g and r["type"] == "card" and g[0]["type"] == "card" and r["sub"] and r["sub"] == g[0]["sub"] \
                and r["block"] == g[0]["block"] and r["section"] == g[0]["section"]:
            g.append(r)
        else:
            groups.append([r])
    out, seen_pillar = [], set()
    for g in groups:
        f = g[0]
        path, block, sec, sub = where[f["block"]], f["block"], plain(f["section"]), plain(f["sub"])
        anchor = ""
        if block == "research" and pillar_key(f["section"]):
            anchor = "adam-section-" + slug(pillar_key(f["section"]) + "-" + sec)
            if anchor not in seen_pillar:
                seen_pillar.add(anchor)
                out.append(entry(sec, path, "section", "Research area",
                                 j(" ", sec, BLOCK_WORDS["research"], PAGE_WORDS.get(path)), anchor))
        elif f["type"] == "card" and f["sub"]:
            letter = aid_letter(f["sub"])
            anchor = "adam-section-" + slug((letter + "-" if letter else "") + sub)
        texts = [plain(r["text"]) for r in g]
        label = SUB_LABELS.get(f["sub"], "")
        title = label or sub or sec or short(texts[0], 60)
        out.append(entry(title, path, "section", short(" · ".join(texts), 140),
                         j(" ", title, sec if sec != title else "", " ".join(texts),
                           BLOCK_WORDS.get(block), PAGE_WORDS.get(path)), anchor))
    return out


def main():
    old = []
    if OUT.exists():
        m = re.search(r"ADAM_SEARCH_INDEX = (.*);\s*$", OUT.read_text("utf-8"), re.S)
        old = json.loads(m.group(1)) if m else []
    idx = build(old)
    OUT.write_text("/* Auto-built site search index from data/*.json — pages + sheet content + anchors. */\n"
                   f"window.ADAM_INSTAGRAM_URL = {json.dumps(INSTAGRAM)};\n"
                   f"window.ADAM_SEARCH_INDEX = {json.dumps(idx, ensure_ascii=False)};\n", "utf-8")
    print(f"search-index.js: {len(idx)} entries")


if __name__ == "__main__":
    main()
