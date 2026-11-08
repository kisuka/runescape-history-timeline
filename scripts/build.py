# builds site/index.html and site/sources.html from the two csv files

import csv
import html
import json
import os
import sys

from rcssmin import cssmin
from rjsmin import jsmin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SITE = os.path.join(ROOT, "site")

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]
GAMES = {"all": "RuneScape", "rs3": "RS3", "osrs": "OSRS", "jagex": "Jagex"}


def read(name):
    with open(os.path.join(SITE, name), encoding="utf-8") as f:
        return f.read()


def read_csv(name):
    with open(os.path.join(DATA, name), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write(name, text):
    with open(os.path.join(SITE, name), "w", encoding="utf-8") as f:
        f.write(text)


def template(page, css, js):
    # css/js are kept readable in site/ and squashed into the page here
    tpl = read(page)
    assert "__CSS__" in tpl and "__JS__" in tpl, page
    return tpl.replace("__CSS__", cssmin(read(css))).replace("__JS__", jsmin(read(js)))


def build_index(pop, events):
    series = {"pre": [], "osrs": [], "rs3": []}
    for r in pop:
        key = "pre" if r["series"] == "all" else r["series"]
        series[key].append([r["month"], int(r["avg"])])
    for k in series:
        series[k].sort()

    ev = sorted([r["month"], r["event"], r["game"], r["date"], r["source"]] for r in events)

    last = max(series["rs3"][-1][0], series["osrs"][-1][0])
    last_label = MONTHS[int(last[5:7]) - 1] + " " + last[:4]

    page = template("template.html", "chart.css", "chart.js")
    page = page.replace("__POPULATION__", json.dumps(series, separators=(",", ":")))
    page = page.replace("__EVENTS__", json.dumps(ev, separators=(",", ":"), ensure_ascii=False))
    page = page.replace("__LAST_MONTH__", last_label)
    return page


def build_sources(events):
    rows = []
    for r in sorted(events, key=lambda r: (r["month"], r["game"], r["event"])):
        month = MONTHS[int(r["month"][5:7]) - 1][:3] + " " + r["month"][:4]
        link = ""
        if r["source"].startswith("http"):
            host = r["source"].split("/")[2].replace("www.", "")
            link = '<a href="%s" target="_blank" rel="noopener">%s</a>' % (html.escape(r["source"]), host)
        rows.append(
            '<tr><td class="m">%s</td><td><span class="g g-%s">%s</span></td><td>%s</td>'
            '<td class="d">%s</td><td>%s</td><td class="n">%s</td></tr>'
            % (month, r["game"], GAMES[r["game"]], html.escape(r["event"]),
               html.escape(r["date"]), link, html.escape(r["note"])))
    return template("sources_template.html", "sources.css", "sources.js").replace("__ROWS__", "\n".join(rows))


def main():
    pop = read_csv("population_monthly.csv")
    events = read_csv("events.csv")

    for r in events:
        if r["game"] not in GAMES:
            sys.exit("events.csv: unknown game %r on %r" % (r["game"], r["event"]))
    missing = [r["event"] for r in events if not r["source"]]
    if missing:
        print("warning: no source for", ", ".join(missing), file=sys.stderr)

    write("index.html", build_index(pop, events))
    write("sources.html", build_sources(events))
    print("built site/index.html and site/sources.html (%d population rows, %d events)" % (len(pop), len(events)))


if __name__ == "__main__":
    main()
