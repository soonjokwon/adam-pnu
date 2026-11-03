#!/usr/bin/env python3
"""Rebuild js/search-index.js from data/*.json.

Run after scripts/snapshot_sheet.py (the sync workflow does this).
Data-driven entries (news, publications, patents, awards, projects, members,
talks, gallery) are regenerated from data/*.json. Static "page" and "section"
entries are carried over from the existing index unchanged.
Anchor slugs mirror ADAM.slug in js/sheet/sheet-loader.js.
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
    out += [e for e in old if e["kind"] == "section"]
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
