# -*- coding: utf-8 -*-
"""YouTube(FM那覇チャンネル)から最新の「ノーブレーキのオリジンアワー」を取得し、
data/episodes_manual.json に未収録の回を追記する。GitHub Actions から実行される。
yt-dlp を使うので API キー不要。source(episodes.json)や既存manualに在る日付はスキップ。"""
import json, io, os, re, subprocess, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
CHANNEL = "https://www.youtube.com/@FMNAHA780live"
TABS = [CHANNEL + "/streams", CHANNEL + "/videos"]  # 生配信タブ＋動画タブ
LIMIT = 40  # 各タブの新しい方から何件見るか


def is_target(t):
    return bool(t) and "オリジンアワー" in t and "ノーブレーキ" in t


def parse_date(title):
    t = (title or "").replace("　", " ")
    m = re.search(r"(20\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})", t)
    if not m:
        m = re.search(r"(?<!\d)(\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})(?!\d)", t)
    if m:
        g = list(map(int, m.groups()))
        y = g[0] + (2000 if g[0] < 100 else 0)
        try:
            return datetime.date(y, g[1], g[2])
        except ValueError:
            return None
    return None


def load_json(path, default):
    try:
        return json.load(io.open(path, encoding="utf-8-sig"))
    except FileNotFoundError:
        return default


def fetch(url):
    try:
        out = subprocess.check_output(
            ["yt-dlp", "-J", "--flat-playlist", "--playlist-end", str(LIMIT),
             "--extractor-args", "youtube:lang=ja",  # 英訳タイトルだと「ノーブレーキ」判定に落ちる
             url],
            stderr=subprocess.DEVNULL, text=True, encoding="utf-8")
        return json.loads(out).get("entries", []) or []
    except Exception as e:
        print("fetch fail:", url, e)
        return []


episodes = load_json(os.path.join(DATA, "episodes.json"), {}).get("episodes", [])
manual_doc = load_json(os.path.join(DATA, "episodes_manual.json"), {"episodes": []})
manual = manual_doc.get("episodes", [])
have = {e.get("date") for e in episodes} | {m.get("date") for m in manual}

found = {}
for tab in TABS:
    for e in fetch(tab):
        title = (e.get("title") or "").replace("　", " ").strip()
        vid = e.get("id")
        if not (is_target(title) and vid):
            continue
        d = parse_date(title)
        if not d:
            continue
        iso = d.isoformat()
        if iso in have or iso in found:
            continue
        found[iso] = {"date": iso, "year": d.year, "title": title,
                      "videoId": vid, "guest": "", "tags": [str(d.year)]}

if found:
    manual.extend(found.values())
    manual.sort(key=lambda x: x["date"])
    manual_doc["episodes"] = manual
    json.dump(manual_doc, io.open(os.path.join(DATA, "episodes_manual.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print("added:", ", ".join(sorted(found)))
else:
    print("no new episodes")
