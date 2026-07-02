# -*- coding: utf-8 -*-
"""data/ 配下の確定JSONだけから data.js を生成（home側ソースに依存しない）。"""
import json, io, os
BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
PLAYLIST = "https://www.youtube.com/playlist?list=PLV-pPfOnzvHi5sPDwCuKG3OnK40ugSjcI"

def rj(name, default):
    try:
        return json.load(io.open(os.path.join(DATA, name), encoding="utf-8-sig"))
    except FileNotFoundError:
        return default

episodes = rj("episodes.json", {}).get("episodes", [])
# 手動追加ぶんを日付マージ（source優先。sourceに無い日付だけ足す）
_manual = rj("episodes_manual.json", {"episodes": []}).get("episodes", [])
_seen = {e["date"] for e in episodes}
for _m in _manual:
    if _m.get("date") and _m["date"] not in _seen:
        _m.setdefault("year", int(_m["date"][:4]))
        _m.setdefault("guest", "")
        _m.setdefault("tags", [str(_m["year"])])
        episodes.append(_m); _seen.add(_m["date"])
episodes.sort(key=lambda e: e["date"])
summaries = rj("summaries.json", {})
people = rj("people.json", {"members": [], "staff": []})
podcast = rj("podcast.json", {"episodes": []}).get("episodes", [])
podcast_summaries = rj("podcast_summaries.json", {})
hitokoto = rj("hitokoto.json", {"entries": []}).get("entries", [])

bundle = {"playlist": PLAYLIST, "episodes": episodes,
          "summaries": summaries, "people": people,
          "podcast": podcast, "podcast_summaries": podcast_summaries,
          "hitokoto": hitokoto}
with io.open(os.path.join(BASE, "data.js"), "w", encoding="utf-8") as f:
    f.write("window.DATA = ")
    f.write(json.dumps(bundle, ensure_ascii=False))
    f.write(";\n")
print("data.js 生成: episodes", len(episodes), "/ podcast", len(podcast),
      "/ summaries", len(summaries), "/ podcast_summaries", len(podcast_summaries),
      "/ hitokoto", len(hitokoto))
