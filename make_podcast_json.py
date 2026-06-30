# -*- coding: utf-8 -*-
"""カタログから 2014〜2016（YouTube以前）の音源を data/podcast.json に書き出す。"""
import json, io, os
BASE = r"C:\Users\みゆきち\dev\nobreak-fansite"
cat = json.load(io.open(os.path.join(BASE, "podcast_catalog.json"), encoding="utf-8"))
rows = [r for r in cat if r.get("mp3") and r.get("date") and "2014" <= r["date"] < "2017"]
rows.sort(key=lambda r: r["date"])
# mp3 はあえて書き出さない（音源の直リンク再生はしない方針）。
# 日付＋公式バックナンバーへのリンクだけを残し、あらすじ・見出しは別ファイルで持つ。
out = [{"date": r["date"], "title": r["title"], "page": r["page_url"]} for r in rows]
json.dump({"count": len(out), "episodes": out},
          io.open(os.path.join(BASE, "data", "podcast.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("wrote data/podcast.json:", len(out), "本", out[0]["date"], "->", out[-1]["date"])
