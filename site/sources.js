const q = document.getElementById('q');
const game = document.getElementById('game');
const count = document.getElementById('count');
const rows = [...document.querySelectorAll('#t tbody tr')];

function filter() {
  const s = q.value.toLowerCase();
  const gv = game.value;
  let shown = 0;
  for (const r of rows) {
    let ok = true;
    if (s && !r.textContent.toLowerCase().includes(s)) {
      ok = false;
    }
    if (gv && !r.querySelector('.g').classList.contains('g-' + gv)) {
      ok = false;
    }
    r.hidden = !ok;
    if (ok) {
      shown++;
    }
  }
  count.textContent = shown + ' of ' + rows.length;
}

q.addEventListener('input', filter);
game.addEventListener('change', filter);
filter();
