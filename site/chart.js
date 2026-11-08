// data is injected by build.py
const D = __POPULATION__;       // { pre: [[month, avg], ...], osrs: [...], rs3: [...] }
const EVENTS = __EVENTS__;      // [[month, label, game, date, source], ...]

const PX = 36;          // width of one month
const LEFT = 70;
const H = 440;          // plot height
const YMAX = 200000;
const PITCH = 52;       // vertical gap between rows of bubbles
const PAD = 36;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const COLOR = {
  all: '--rs3',
  rs3: '--rs3',
  osrs: '--osrs',
  jagex: '--neutral',
};

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function svgEl(tag, attrs, text) {
const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
for (const k in attrs) {
  el.setAttribute(k, attrs[k]);
}
  if (text != null) {
    el.textContent = text;
  }
  return el;
}

// "2004-03" -> 24038, so months can be subtracted
function monthIndex(m) {
  const [y, mo] = m.split('-');
  return y * 12 + (mo - 1);
}

const FIRST = monthIndex('2001-01');
const LAST = Math.max(...D.rs3.concat(D.osrs).map(d => monthIndex(d[0])));
const N = LAST - FIRST + 1;
const W = LEFT + N * PX + 40;

const xOf = m => LEFT + (monthIndex(m) - FIRST) * PX + PX / 2;
const fmt = v => v >= 100000 ? Math.round(v / 1000) + 'k' : (v / 1000).toFixed(1) + 'k';

// month -> value lookups
const VAL = { all: {}, rs3: {}, osrs: {} };
for (const [m, v] of D.pre) {
  VAL.all[m] = v;
}
for (const [m, v] of D.rs3) {
  VAL.rs3[m] = v;
}
for (const [m, v] of D.osrs) {
  VAL.osrs[m] = v;
}

function valueFor(game, m) {
  if (VAL[game] && VAL[game][m] != null) {
    return VAL[game][m];
  }
  if (game == 'all' && VAL.rs3[m] != null) {
    return VAL.rs3[m];
  }
  return null;
}

function wrap(text, max = 18) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = (line + ' ' + word).trim();
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}


// ---- bubbles ----
// OSRS events sit above the plot, everything else below. Within a side,
// bubbles are packed into rows left to right; rows[] remembers the right
// edge of the last bubble placed in each row.

const items = EVENTS.map(([m, label, game, date, src]) => ({
  m,
  label,
  game,
  date: date || '',
  src: src || '',
}));
items.sort((a, b) => monthIndex(a.m) - monthIndex(b.m));

const rowsTop = [], rowsBot = [];
for (const it of items) {
  it.x = xOf(it.m);
  it.lines = wrap(it.label);
  it.w = Math.max(...it.lines.map(l => l.length)) * 7.1 + 16;
  it.h = it.lines.length * 14 + 10;
  it.top = it.game == 'osrs';

  const rows = it.top ? rowsTop : rowsBot;
  let r = rows.findIndex(edge => edge < it.x - it.w / 2 - 6);
  if (r < 0) {
    r = rows.push(0) - 1;
  }
  rows[r] = it.x + it.w / 2;
  it.row = r;
}

const TOP = PAD + rowsTop.length * PITCH + 10;
const BOT = 44 + rowsBot.length * PITCH + PAD;
const TOTAL = TOP + H + BOT;
const yOf = v => TOP + H - (v / YMAX) * H;


// ---- drawing ----

function render() {
  const svg = document.getElementById('chart');
  const grid = cssVar('--grid');
  const fg = cssVar('--fg');
  const muted = cssVar('--muted');
  const line = cssVar('--line');
  const panel = cssVar('--panel');

  svg.setAttribute('width', W);
  svg.setAttribute('height', TOTAL);
  svg.setAttribute('viewBox', `0 0 ${W} ${TOTAL}`);
  svg.replaceChildren(svg.querySelector('title'));

  const base = document.createDocumentFragment();
  const rings = document.createDocumentFragment();
  const bubbles = document.createDocumentFragment();

  // gridlines, heavier every 100k
  for (let v = 0; v <= YMAX; v += 25000) {
    base.append(svgEl('line', {
      x1: 0,
      x2: W,
      y1: yOf(v),
      y2: yOf(v),
      stroke: grid,
      'stroke-width': v % 100000 ? 0.6 : 1,
    }));
  }

  // alternating year bands + year labels
  for (let yr = 2001; yr <= Math.floor(LAST / 12); yr++) {
    const xs = xOf(yr + '-01') - PX / 2;
    const xe = xOf(yr + '-12') + PX / 2;
    if (yr % 2 == 0) {
      base.append(svgEl('rect', {
        x: xs,
        y: TOP,
        width: xe - xs,
        height: H,
        fill: grid,
        opacity: 0.35,
      }));
    }
    base.append(svgEl('text', {
      x: (xs + xe) / 2,
      y: TOP + H + 22,
      'text-anchor': 'middle',
      'font-size': 14,
      'font-weight': 500,
      fill: fg,
    }, yr));
  }

  // month ticks
  for (let i = 0; i < N; i++) {
    const mo = (FIRST + i) % 12;
    const x = LEFT + i * PX + PX / 2;
    base.append(svgEl('line', {
      x1: x,
      x2: x,
      y1: TOP + H,
      y2: TOP + H + (mo == 0 ? 8 : 4),
      stroke: line,
    }));
    base.append(svgEl('text', {
      x,
      y: TOP + H + 36,
      'text-anchor': 'middle',
      'font-size': 10,
      fill: muted,
    }, MON[mo]));
  }

  // one data series: line, dotted bridges over gaps, markers, value labels
  // labels: 'up', 'down', or 'alt' (alternate, so the dense pre-2013 numbers don't collide)
  function series(data, color, labels, square) {
    let d = '';
    let prev = null;
    const marks = [];
    data.forEach(([m, v], i) => {
      const x = xOf(m), y = yOf(v);
      const gap = prev && monthIndex(m) - prev.i > 1;
      if (gap) {
        base.append(svgEl('line', {
          x1: prev.x,
          y1: prev.y,
          x2: x,
          y2: y,
          stroke: color,
          'stroke-width': 1.4,
          'stroke-dasharray': '3 4',
          opacity: 0.7,
        }));
      }
      d += (prev && !gap ? ' L' : ' M') + x + ' ' + y;
      prev = { i: monthIndex(m), x, y };

      const up = labels == 'alt' ? i % 2 == 0 : labels == 'up';
      if (square) {
        marks.push(svgEl('rect', {
          x: x - 2.8,
          y: y - 2.8,
          width: 5.6,
          height: 5.6,
          fill: color,
        }));
      } else {
        marks.push(svgEl('circle', {
          cx: x,
          cy: y,
          r: 2.6,
          fill: color,
        }));
      }
      marks.push(svgEl('text', {
        x,
        y: y + (up ? -8 : 14),
        'text-anchor': 'middle',
        'font-size': 11,
        'font-weight': 500,
        fill: color,
      }, fmt(v)));
    });
    base.append(svgEl('path', {
      d: d.trim(),
      fill: 'none',
      stroke: color,
      'stroke-width': 1.6,
      'stroke-linejoin': 'round',
    }));
    base.append(...marks);
  }
  series(D.pre, cssVar('--rs3'), 'alt');
  series(D.osrs, cssVar('--osrs'), 'up', true);
  series(D.rs3, cssVar('--rs3'), 'down');

  // event bubbles
  items.forEach((it, k) => {
    const c = cssVar(COLOR[it.game]);
    const v = it.game == 'jagex' ? null : valueFor(it.game, it.m);
    const by = it.top ? TOP - 14 - it.h - it.row * PITCH : TOP + H + 44 + it.row * PITCH;

    // dotted line from bubble to the data point (jagex-wide ones span the whole plot)
    const from = it.top ? by + it.h : by;
    let to;
    if (it.game == 'jagex') {
      to = it.top ? TOP + H : TOP;
    } else if (v != null) {
      to = it.top ? yOf(v) - 8 : yOf(v) + 8;
    } else {
      to = it.top ? TOP : TOP + H;
    }
    base.append(svgEl('line', {
      x1: it.x,
      x2: it.x,
      y1: from,
      y2: to,
      stroke: c,
      'stroke-width': 0.8,
      'stroke-dasharray': '2 3',
      opacity: 0.65,
    }));

    // ring on the data point, square for osrs to match its markers
    if (v != null) {
      if (it.game == 'osrs') {
        rings.append(svgEl('rect', {
          x: it.x - 6,
          y: yOf(v) - 6,
          width: 12,
          height: 12,
          fill: 'none',
          stroke: c,
          'stroke-width': 1.5,
        }));
      } else {
        rings.append(svgEl('circle', {
          cx: it.x,
          cy: yOf(v),
          r: 6,
          fill: 'none',
          stroke: c,
          'stroke-width': 1.5,
        }));
      }
    }

    const g = svgEl('g', { class: 'bub', 'data-i': k, tabindex: 0 });
    g.append(svgEl('rect', {
      x: it.x - it.w / 2,
      y: by,
      width: it.w,
      height: it.h,
      rx: 5,
      fill: panel,
      stroke: c,
      'stroke-width': 0.9,
    }));
    const text = svgEl('text', {
      x: it.x,
      y: by + 14,
      'text-anchor': 'middle',
      'font-size': 11,
      fill: c,
    });
    it.lines.forEach((l, i) => {
      text.append(svgEl('tspan', { x: it.x, dy: i ? 14 : 0 }, l));
    });
    g.append(text);
    bubbles.append(g);
  });

  svg.append(base, rings, bubbles);

  // y axis is a separate sticky svg
  const axis = document.getElementById('axis');
  const AW = 56;
  axis.setAttribute('width', AW);
  axis.setAttribute('height', TOTAL);
  axis.setAttribute('viewBox', `0 0 ${AW} ${TOTAL}`);
  axis.replaceChildren();
  for (let v = 0; v <= YMAX; v += 50000) {
    axis.append(svgEl('text', {
      x: AW - 8,
      y: yOf(v) + 4,
      'text-anchor': 'end',
      'font-size': 12,
      'font-weight': 500,
      fill: fg,
    }, v ? v / 1000 + 'k' : '0'));
  }
}

render();


// ---- theme ----
// colours are read from css variables when drawing, so switching means redrawing

const themeBtn = document.getElementById('theme');
const THEMES = ['system', 'light', 'dark'];

function setTheme(t) {
  if (t == 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = t;
  }
  themeBtn.textContent = 'Theme: ' + t;
  render();
}

try {
  const saved = localStorage.getItem('rs-theme');
  if (THEMES.includes(saved)) {
    setTheme(saved);
  }
} catch (e) {
}

themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme || 'system';
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  setTheme(next);
  try {
    localStorage.setItem('rs-theme', next);
  } catch (e) {
  }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!document.documentElement.dataset.theme) {
    render();
  }
});


// ---- tooltip ----

const strip = document.getElementById('strip');
const chart = document.getElementById('chart');
const tip = document.getElementById('tip');
const follow = document.getElementById('follow');
strip.scrollLeft = 0;

const niceMonth = m => MONTHS[m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);

function prevMonth(m) {
  let y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1;
  if (mo == 0) {
    mo = 12;
    y--;
  }
  return y + '-' + String(mo).padStart(2, '0');
}

function statRow(name, key, m) {
  const v = VAL[key][m];
  if (v == null) {
    return '';
  }
  const pv = VAL[key][prevMonth(m)];
  let change = '';
  if (pv != null) {
    const pct = Math.round((v - pv) / pv * 100);
    change = `<span style="opacity:.75"> ${v >= pv ? '+' : '−'}${Math.abs(pct)}%</span>`;
  }
  return `<div class="row"><span>${name}</span><span>${v.toLocaleString('en-US')}${change}</span></div>`;
}

function showTip(g, clientX, clientY) {
  const it = items[g.dataset.i];
  const rs3era = monthIndex(it.m) >= monthIndex('2013-02');
  let who;
  if (it.game == 'osrs') {
    who = 'OSRS';
  } else if (it.game == 'jagex') {
    who = 'Jagex-wide';
  } else if (rs3era) {
    who = 'RS3';
  } else {
    who = 'RuneScape';
  }

  let html = `<b>${it.label}</b><br>${who} · ${niceMonth(it.m)}<br>`;
  html += statRow(rs3era ? 'RS3' : 'RuneScape', rs3era ? 'rs3' : 'all', it.m);
  if (rs3era) {
    html += statRow('OSRS', 'osrs', it.m);
  }
  if (it.date) {
    html += `<div style="margin-top:6px">Date: <span style="font-family:var(--font-mono)">${it.date}</span></div>`;
  }
  if (it.src) {
    let host;
    try {
      host = new URL(it.src).hostname.replace(/^www\./, '');
    } catch (e) {
      host = it.src;
    }
    html += `<div>Source: <a href="${it.src}" target="_blank" rel="noopener">${host}</a></div>`;
  }
  html += '<div style="opacity:.75;margin-top:4px">Monthly avg. concurrent · % vs previous month</div>';
  tip.innerHTML = html;
  tip.hidden = false;

  // next to the cursor, flipped if it would run off the edge
  const r = strip.getBoundingClientRect();
  let x = clientX - r.left + strip.scrollLeft + 14;
  let y = clientY - r.top + 14;
  if (x + tip.offsetWidth > strip.scrollLeft + r.width - 8) {
    x = clientX - r.left + strip.scrollLeft - tip.offsetWidth - 14;
  }
  if (y + tip.offsetHeight > r.height - 8) {
    y = clientY - r.top - tip.offsetHeight - 14;
  }
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

let hideTimer = null;
let current = null;

function hideSoon() {
  clearTimeout(hideTimer);
  // short delay so the mouse can reach the link inside the tooltip
  hideTimer = setTimeout(() => {
    tip.hidden = true;
    current = null;
  }, 350);
}

function cancelHide() {
  clearTimeout(hideTimer);
}

chart.addEventListener('pointermove', e => {
  const g = e.target.closest('.bub');
  if (!g) {
    hideSoon();
    return;
  }
  cancelHide();
  if (g !== current) {
    current = g;
    showTip(g, e.clientX, e.clientY);
  }
});
chart.addEventListener('pointerleave', hideSoon);
tip.addEventListener('pointerenter', cancelHide);
tip.addEventListener('pointerleave', hideSoon);

// bubbles are focusable, so keyboard users get the tooltip too
chart.addEventListener('focusin', e => {
  const g = e.target.closest('.bub');
  if (g) {
    const b = g.getBoundingClientRect();
    showTip(g, b.left + b.width / 2, b.bottom);
  }
});
chart.addEventListener('focusout', hideSoon);
tip.addEventListener('focusin', cancelHide);


// ---- scrolling ----
// drag to pan by default; with "follow cursor" on, the mouse position maps straight to scroll position

let drag = null;

strip.addEventListener('pointerdown', e => {
  if (follow.checked || e.button !== 0) {
    return;
  }
  if (e.target.closest('#tip')) {
    return;   // let links in the tooltip be clicked
  }
  drag = { x: e.clientX, scroll: strip.scrollLeft };
  strip.classList.add('dragging');
  strip.setPointerCapture(e.pointerId);
});

strip.addEventListener('pointermove', e => {
  if (drag) {
    strip.scrollLeft = drag.scroll - (e.clientX - drag.x);
  } else if (follow.checked) {
    const r = strip.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    strip.scrollLeft = t * (strip.scrollWidth - strip.clientWidth);
  }
});

function endDrag() {
  drag = null;
  strip.classList.remove('dragging');
}
strip.addEventListener('pointerup', endDrag);
strip.addEventListener('pointercancel', endDrag);

follow.addEventListener('change', () => {
  strip.classList.toggle('follow', follow.checked);
  try {
    localStorage.setItem('rs-follow', follow.checked ? '1' : '0');
  } catch (e) {
  }
});

try {
  follow.checked = localStorage.getItem('rs-follow') == '1';
  strip.classList.toggle('follow', follow.checked);
} catch (e) {
}
