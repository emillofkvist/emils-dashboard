#!/usr/bin/env python3
"""Hämtar börsdata, kalender, Bonnies matsedel och Koenigsegg-nyheter till JSON-filer i data/.
Körs av GitHub Actions varje timme; dashboard.js läser JSON-filerna via
raw.githubusercontent.com (har CORS: * och undviker CORS-proxy-problem).
"""

import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; dashboard-bot/1.0)"}


def fetch_url(url, timeout=15):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── Börskurser ────────────────────────────────────────────────────────────────

def fetch_stocks():
    symbols = [
        ("^OMX",  "OMXS30"),
        ("^GSPC", "S&P 500"),
        ("^IXIC", "NASDAQ"),
        ("^DJI",  "Dow Jones"),
    ]
    result = []
    for i, (sym, name) in enumerate(symbols):
        if i > 0:
            time.sleep(2)  # undvik rate-limiting från Yahoo Finance
        fetched = False
        for host in ["query2", "query1"]:
            try:
                url = (f"https://{host}.finance.yahoo.com/v8/finance/chart/{sym}"
                       "?interval=1d&range=2d")
                data = json.loads(fetch_url(url))
                chart = data["chart"]["result"][0]
                closes = [c for c in chart["indicators"]["quote"][0]["close"]
                          if c is not None]
                current  = closes[-1]
                previous = closes[-2] if len(closes) >= 2 else current
                change   = round((current - previous) / previous * 100, 2)
                result.append({"symbol": sym, "name": name,
                               "current": round(current, 2),
                               "previous": round(previous, 2),
                               "change": change})
                print(f"  {name}: {change:+.2f}%")
                fetched = True
                break
            except Exception as e:
                if "429" in str(e) and host == "query2":
                    time.sleep(2)
                    continue
                print(f"  {name} ({host}): FEL – {e}", file=sys.stderr)
                break
        if not fetched:
            result.append({"symbol": sym, "name": name, "error": "Hämtning misslyckades"})
    return {"updated": now_iso(), "stocks": result}


# ── Kalender (Google iCal) ────────────────────────────────────────────────────

def parse_dtstart(dtstart):
    """Konverterar iCal DTSTART-sträng till Python date för filtrering."""
    try:
        s = dtstart.replace("Z", "")
        if "T" in s:
            return datetime.strptime(s[:15], "%Y%m%dT%H%M%S").date()
        return datetime.strptime(s[:8], "%Y%m%d").date()
    except Exception:
        return None


def parse_ical(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n[ \t]", "", text)   # unfold
    events = []
    today = datetime.now(timezone.utc).date()
    cutoff = today + timedelta(days=30)   # bara händelser inom 30 dagar
    for block in text.split("BEGIN:VEVENT"):
        if "END:VEVENT" not in block:
            continue
        block = block[: block.index("END:VEVENT")]
        summary = dtstart = ""
        for line in block.split("\n"):
            if line.startswith("SUMMARY:"):
                summary = line[8:].strip()
            elif line.startswith("DTSTART"):
                dtstart = line.split(":")[-1].strip()
        if not summary or not dtstart:
            continue
        d = parse_dtstart(dtstart)
        if d is None or d < today or d > cutoff:
            continue
        events.append({"summary": summary, "dtstart": dtstart})
    return events


def fetch_calendar(ical_url):
    try:
        text = fetch_url(ical_url)
        if "BEGIN:VCALENDAR" not in text:
            return {"updated": now_iso(), "events": [], "error": "Ej giltigt iCal"}
        events = parse_ical(text)
        print(f"  {len(events)} händelser")
        return {"updated": now_iso(), "events": events}
    except Exception as e:
        print(f"  Kalender FEL: {e}", file=sys.stderr)
        return {"updated": now_iso(), "events": [], "error": str(e)}


# ── Bonnies matsedel (astorp.se) ──────────────────────────────────────────────

DAY_OFFSETS = {"måndag": 0, "tisdag": 1, "onsdag": 2, "torsdag": 3, "fredag": 4}


def iso_week_monday(year, week):
    """Returnerar måndagen (UTC) i ISO-vecka week för år year."""
    jan4 = datetime(year, 1, 4, tzinfo=timezone.utc)
    jan4_dow = jan4.isoweekday()   # måndag=1 … söndag=7
    monday = jan4 - timedelta(days=jan4_dow - 1) + timedelta(weeks=week - 1)
    return monday


def resolve_lunch_date(week, day_offset):
    """Väljer det år som ger ett datum närmast idag (hanterar årsskiften)."""
    today = datetime.now(timezone.utc).date()
    best_date, best_diff = None, float("inf")
    for year in [today.year - 1, today.year, today.year + 1]:
        d = (iso_week_monday(year, week) + timedelta(days=day_offset)).date()
        diff = abs((d - today).days)
        if diff < best_diff:
            best_diff = diff
            best_date = d
    return best_date


def clean_cell(html_str):
    s = re.sub(r"<br\s*/?>", " ", html_str, flags=re.IGNORECASE)
    s = re.sub(r"<[^>]+>", "", s)
    return " ".join(s.split()).strip()


def parse_astorp_html(html):
    days = []
    tables = re.findall(r"<table[^>]*>(.*?)</table>", html,
                        re.DOTALL | re.IGNORECASE)
    for table in tables:
        cap = re.search(r"<caption[^>]*>(.*?)</caption>", table,
                        re.DOTALL | re.IGNORECASE)
        if not cap:
            continue
        caption_text = re.sub(r"<[^>]+>", "", cap.group(1))
        wm = re.search(r"vecka\s+(\d+)", caption_text, re.IGNORECASE)
        if not wm:
            continue
        week = int(wm.group(1))

        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table,
                          re.DOTALL | re.IGNORECASE)
        for row in rows:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row,
                               re.DOTALL | re.IGNORECASE)
            if len(cells) < 2:
                continue
            day_text = re.sub(r"<[^>]+>", "", cells[0]).strip().lower()
            day_off = DAY_OFFSETS.get(day_text)
            if day_off is None:
                continue
            lunch = clean_cell(cells[1])
            veg   = clean_cell(cells[2]) if len(cells) > 2 else ""
            meals = [m for m in [lunch, f"Veg: {veg}" if veg else ""] if m]
            if not meals:
                continue
            date = resolve_lunch_date(week, day_off)
            days.append({"date": date.isoformat(), "meals": meals})
    return days


def fetch_bonnie_lunch(astorp_url):
    html = None
    # 1. Direkthämtning (fungerar från GitHub Actions; astorp.se blockerar
    #    bara rena datacenter-IPs utan User-Agent, inte Actions-runners)
    try:
        text = fetch_url(astorp_url)
        if "matsedel" in text.lower():
            html = text
            print("  astorp.se: OK (direkthämtning)")
    except Exception as e:
        print(f"  astorp.se direkt: FEL – {e}", file=sys.stderr)

    # 2. cors.eu.org som reserv
    if not html:
        try:
            text = fetch_url(f"https://cors.eu.org/{astorp_url}")
            if "matsedel" in text.lower():
                html = text
                print("  astorp.se: OK (via cors.eu.org)")
        except Exception as e:
            print(f"  cors.eu.org: FEL – {e}", file=sys.stderr)

    if not html:
        print("  Bonnie lunch: alla källor misslyckades", file=sys.stderr)
        return {"updated": now_iso(), "days": [], "error": "Alla källor misslyckades"}

    days = parse_astorp_html(html)
    print(f"  {len(days)} matsedeldagar")
    return {"updated": now_iso(), "days": days}


# ── Koenigsegg-nyheter (Google News RSS) ─────────────────────────────────────

def fetch_koenigsegg_news(rss_url):
    try:
        text = fetch_url(rss_url)
        if not text.strip().startswith("<?xml") and "<rss" not in text[:200]:
            return {"updated": now_iso(), "items": [], "error": "Ej giltigt RSS-svar"}
        root = ET.fromstring(text)
        channel = root.find("channel")
        if channel is None:
            return {"updated": now_iso(), "items": [], "error": "Ingen channel-tagg"}
        items = []
        for item in channel.findall("item"):
            title = (item.findtext("title") or "").strip()
            link  = (item.findtext("link") or "").strip()
            pub   = (item.findtext("pubDate") or "").strip()
            src_el = item.find("source")
            source = (src_el.text or "").strip() if src_el is not None else ""
            if source and title.endswith(f" - {source}"):
                title = title[:-(len(source) + 3)]
            items.append({"title": title, "link": link, "source": source, "pubDate": pub})
        print(f"  Koenigsegg: {len(items)} nyheter")
        return {"updated": now_iso(), "items": items}
    except Exception as e:
        print(f"  Koenigsegg FEL: {e}", file=sys.stderr)
        return {"updated": now_iso(), "items": [], "error": str(e)}


# ── Läs URL:er från config.js ─────────────────────────────────────────────────

def read_config(key):
    with open("config.js") as f:
        content = f.read()
    m = re.search(rf"{key}:\s*\"([^\"]+)\"", content)
    return m.group(1) if m else None


# ── Huvudprogram ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)

    print("=== Börskurser ===")
    stocks = fetch_stocks()
    with open("data/stocks.json", "w") as f:
        json.dump(stocks, f, indent=2, ensure_ascii=False)

    print("=== Kalender ===")
    ical_url = read_config("icalUrl")
    if ical_url:
        cal = fetch_calendar(ical_url)
        with open("data/calendar.json", "w") as f:
            json.dump(cal, f, indent=2, ensure_ascii=False)
    else:
        print("  icalUrl ej hittad i config.js", file=sys.stderr)

    print("=== Bonnies matsedel ===")
    astorp_url = read_config("astorpUrl")
    if astorp_url:
        lunch = fetch_bonnie_lunch(astorp_url)
        with open("data/bonnie-lunch.json", "w") as f:
            json.dump(lunch, f, indent=2, ensure_ascii=False)
    else:
        print("  astorpUrl ej hittad i config.js", file=sys.stderr)

    print("=== Koenigsegg-nyheter ===")
    koenigsegg_url = read_config("koenigseggFeed")
    if koenigsegg_url:
        koe = fetch_koenigsegg_news(koenigsegg_url)
        with open("data/koenigsegg.json", "w") as f:
            json.dump(koe, f, indent=2, ensure_ascii=False)
    else:
        print("  koenigseggFeed ej hittad i config.js", file=sys.stderr)

    print("=== Klart ===")
