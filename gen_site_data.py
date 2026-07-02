# -*- coding: utf-8 -*-
"""
ノーブレーキのオリジンアワー ファンサイト用データ生成。
動画タブ+ライブ配信タブのjsonから episodes.json を生成（放送日順・重複除去）。
summaries.json / people.json は手動編集ぶんなので上書きしない。
"""
import json, io, re, os, datetime

SRC = r"C:\Users\みゆきち"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
PLAYLIST = "https://www.youtube.com/playlist?list=PLV-pPfOnzvHi5sPDwCuKG3OnK40ugSjcI"

def load(p):
    try: return json.load(io.open(p, encoding="utf-8-sig")).get("entries", [])
    except FileNotFoundError: return []

def is_target(t):
    return bool(t) and "オリジンアワー" in t and "ノーブレーキ" in t

def parse_date(title):
    t = title.replace("　", " ")
    m = re.search(r"(20\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})", t)
    if not m:
        m = re.search(r"(?<!\d)(\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})(?!\d)", t)
    if m:
        g = list(map(int, m.groups())); y = g[0] + (2000 if g[0] < 100 else 0)
        try: return datetime.date(y, g[1], g[2])
        except ValueError: return None
    return None

def extract_guest(title):
    m = re.search(r"ゲスト[：:]\s*([^\s　]+(?:\s*[^\s　]+)?)", title)
    return m.group(1).strip() if m else ""

def auto_tags(title, d):
    tags = [str(d.year)]
    g = extract_guest(title)
    if g: tags.append("ゲスト回")
    if "新語" in title or "流行語" in title: tags.append("新語流行語大賞")
    if "結婚" in title: tags.append("結婚")
    if "とうましょうこ" in title or "当間" in title: tags.append("当間正子")
    return tags

raw = []
for s in ["fmnaha_videos.json", "fmnaha_streams.json"]:
    for e in load(os.path.join(SRC, s)):
        if is_target(e.get("title")) and e.get("id"):
            d = parse_date(e["title"])
            if d:
                raw.append((d, e["id"], e["title"].replace("　", " ").strip(), s))

# dedup by date (動画タブ優先)
bydate = {}
for d, i, t, s in raw:
    if d not in bydate or (bydate[d][3].startswith("fmnaha_streams") and s.startswith("fmnaha_videos")):
        bydate[d] = (d, i, t, s)
merged = sorted(bydate.values(), key=lambda x: x[0])

episodes = []
for d, i, t, s in merged:
    episodes.append({
        "date": d.isoformat(),
        "year": d.year,
        "title": t,
        "videoId": i,
        "guest": extract_guest(t),
        "tags": auto_tags(t, d),
    })

# 手動追加ぶんを日付マージ（source優先。sourceに無い日付だけ足す）
try:
    _manual = json.load(io.open(os.path.join(OUT, "episodes_manual.json"), encoding="utf-8-sig")).get("episodes", [])
except FileNotFoundError:
    _manual = []
_seen = {e["date"] for e in episodes}
for _m in _manual:
    if _m.get("date") and _m["date"] not in _seen:
        _m.setdefault("year", int(_m["date"][:4]))
        _m.setdefault("guest", "")
        _m.setdefault("tags", [str(_m["year"])])
        episodes.append(_m); _seen.add(_m["date"])
episodes.sort(key=lambda e: e["date"])

data = {"playlist": PLAYLIST, "count": len(episodes), "episodes": episodes}
os.makedirs(OUT, exist_ok=True)
json.dump(data, io.open(os.path.join(OUT, "episodes.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

def read_json(name, default):
    p = os.path.join(OUT, name)
    try: return json.load(io.open(p, encoding="utf-8-sig"))
    except FileNotFoundError: return default

summaries = read_json("summaries.json", {})
people = read_json("people.json", {"members": [], "staff": []})
podcast = read_json("podcast.json", {"episodes": []})
podcast_summaries = read_json("podcast_summaries.json", {})
hitokoto = read_json("hitokoto.json", {"entries": []})

bundle = {"playlist": PLAYLIST, "episodes": episodes,
          "summaries": summaries, "people": people,
          "podcast": podcast.get("episodes", []),
          "podcast_summaries": podcast_summaries,
          "hitokoto": hitokoto.get("entries", [])}
site_dir = os.path.dirname(os.path.abspath(__file__))
with io.open(os.path.join(site_dir, "data.js"), "w", encoding="utf-8") as f:
    f.write("window.DATA = ")
    f.write(json.dumps(bundle, ensure_ascii=False))
    f.write(";\n")

print("wrote episodes.json + data.js:", len(episodes), "episodes",
      episodes[0]["date"], "->", episodes[-1]["date"],
      "| summaries:", len(summaries))
