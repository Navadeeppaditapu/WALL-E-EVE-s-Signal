"""Builds one self-contained HTML file that animates a trajectory.

No internet, no libraries: just open outputs/visualization.html in a browser.

Run:  python -m wall_e.visualize [trajectory.json] [output.html]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WALL-E and EVE's Signal</title>
<style>
  :root { --bg:#0b1020; --panel:#141b30; --line:#26314f; --text:#e6ebf8; --muted:#8e9bbd;
          --yellow:#f5b942; --cyan:#4fd1e8; --green:#4ade80; --red:#f87171; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { padding:16px 24px; border-bottom:1px solid var(--line); }
  header h1 { margin:0; font-size:20px; }
  header p { margin:4px 0 0; color:var(--muted); font-size:13px; }
  main { display:flex; flex-wrap:wrap; gap:20px; padding:20px 24px; max-width:1200px; margin:0 auto; }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; }
  #gridWrap { flex:0 0 auto; }
  canvas { display:block; max-width:100%; }
  #side { flex:1 1 320px; display:flex; flex-direction:column; gap:14px; min-width:300px; }
  .stat { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--line); font-size:14px; }
  .stat:last-child { border-bottom:none; }
  .stat span:first-child { color:var(--muted); }
  #batteryBar { height:14px; background:#0b1020; border-radius:7px; overflow:hidden; border:1px solid var(--line); margin-top:6px; }
  #batteryFill { height:100%; width:100%; background:var(--green); transition:width .15s, background .15s; }
  .controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; }
  button { background:#1d2745; color:var(--text); border:1px solid var(--line); border-radius:8px;
           padding:7px 12px; cursor:pointer; font-size:14px; }
  button:hover { background:#27345d; }
  input[type=range] { width:100%; }
  select { background:#1d2745; color:var(--text); border:1px solid var(--line); border-radius:8px; padding:6px; }
  .legend { display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:var(--muted); margin-top:10px; }
  .legend i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:5px; vertical-align:-1px; }
  h3 { margin:0 0 8px; font-size:14px; color:var(--muted); font-weight:600; }
  #outcome { font-weight:700; }
</style>
</head>
<body>
<header>
  <h1>WALL-E and EVE's Signal</h1>
  <p>A Bayesian search: WALL-E keeps a probability for every cell, learns from noisy clues, and always keeps enough battery to get home.</p>
</header>
<main>
  <div id="gridWrap" class="panel">
    <canvas id="grid" width="600" height="600"></canvas>
    <div class="legend">
      <span><i style="background:var(--yellow)"></i>WALL-E</span>
      <span><i style="background:var(--cyan)"></i>EVE (true location)</span>
      <span><i style="background:var(--green)"></i>Base</span>
      <span><i style="background:#c0842b"></i>Belief heat (brighter = more likely)</span>
      <span>Diamond = ping range (green = fired, grey = silent)</span>
    </div>
  </div>
  <div id="side">
    <div class="panel">
      <h3>Status</h3>
      <div class="stat"><span>Step</span><span id="sStep"></span></div>
      <div class="stat"><span>Action</span><span id="sAction"></span></div>
      <div class="stat"><span>Mode</span><span id="sMode"></span></div>
      <div class="stat"><span>Clue</span><span id="sClue"></span></div>
      <div class="stat"><span>Best guess for EVE</span><span id="sGuess"></span></div>
      <div class="stat"><span>Uncertainty (bits)</span><span id="sEntropy"></span></div>
      <div class="stat"><span>Battery</span><span id="sBattery"></span></div>
      <div id="batteryBar"><div id="batteryFill"></div></div>
      <div class="stat" style="margin-top:8px"><span>Final outcome</span><span id="outcome"></span></div>
    </div>
    <div class="panel">
      <h3>Uncertainty over time (lower = WALL-E is more sure)</h3>
      <canvas id="chart" width="440" height="140"></canvas>
    </div>
    <div class="panel">
      <h3>Controls (space = play/pause, arrows = step)</h3>
      <input type="range" id="scrub" min="0" value="0">
      <div class="controls">
        <button id="bStart">&#9198;</button>
        <button id="bBack">&#9664;</button>
        <button id="bPlay">Play</button>
        <button id="bFwd">&#9654;</button>
        <button id="bEnd">&#9197;</button>
        <label style="font-size:13px;color:var(--muted)">Speed
          <select id="speed">
            <option value="600">Slow</option>
            <option value="250" selected>Normal</option>
            <option value="90">Fast</option>
          </select>
        </label>
      </div>
    </div>
  </div>
</main>

<script id="data" type="application/json">__DATA__</script>
<script>
(function () {
  const D = JSON.parse(document.getElementById('data').textContent);
  const F = D.frames, R = D.meta.rows, C = D.meta.cols;
  const base = D.meta.base, eve = D.meta.eve, radius = D.meta.ping_radius;
  const grid = document.getElementById('grid'), g = grid.getContext('2d');
  const chart = document.getElementById('chart'), cg = chart.getContext('2d');
  const scrub = document.getElementById('scrub');
  const CELL = Math.min(grid.width / C, grid.height / R);
  grid.width = CELL * C; grid.height = CELL * R;
  scrub.max = F.length - 1;
  let i = 0, timer = null;

  const $ = id => document.getElementById(id);
  const cx = c => (c + 0.5) * CELL, cy = r => (r + 0.5) * CELL;

  function heat(t) {               // t in 0..1 -> dark blue to amber
    const a = [14, 20, 40], b = [245, 185, 66];
    const s = Math.sqrt(t);
    return 'rgb(' + a.map((v, k) => Math.round(v + (b[k] - v) * s)).join(',') + ')';
  }

  function drawGrid() {
    const f = F[i];
    g.clearRect(0, 0, grid.width, grid.height);
    let max = 0;
    for (const row of f.belief) for (const v of row) if (v > max) max = v;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const v = f.belief[r][c];
      g.fillStyle = heat(max > 0 ? v / max : 0);
      g.fillRect(c * CELL, r * CELL, CELL, CELL);
      if (v >= 0.02) {
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.font = Math.round(CELL * 0.2) + 'px sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(Math.round(v * 100) + '%', cx(c), cy(r) + CELL * 0.3);
      }
    }
    g.strokeStyle = '#26314f'; g.lineWidth = 1;
    for (let r = 0; r <= R; r++) { g.beginPath(); g.moveTo(0, r * CELL); g.lineTo(C * CELL, r * CELL); g.stroke(); }
    for (let c = 0; c <= C; c++) { g.beginPath(); g.moveTo(c * CELL, 0); g.lineTo(c * CELL, R * CELL); g.stroke(); }

    // base
    g.fillStyle = '#4ade80';
    g.fillRect(base[1] * CELL + 4, base[0] * CELL + 4, CELL * 0.35, CELL * 0.35);
    g.fillStyle = '#0b1020'; g.font = 'bold ' + Math.round(CELL * 0.14) + 'px sans-serif';
    g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('BASE', base[1] * CELL + 7, base[0] * CELL + 8);

    // EVE (true location)
    g.beginPath(); g.arc(cx(eve[1]), cy(eve[0]), CELL * 0.22, 0, 2 * Math.PI);
    g.fillStyle = '#4fd1e8'; g.fill();
    g.fillStyle = '#0b1020'; g.font = 'bold ' + Math.round(CELL * 0.17) + 'px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('EVE', cx(eve[1]), cy(eve[0]));

    // path so far
    g.strokeStyle = 'rgba(245,185,66,0.95)'; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath();
    for (let k = 0; k <= i; k++) {
      const p = F[k].position;
      if (k === 0) g.moveTo(cx(p[1]), cy(p[0])); else g.lineTo(cx(p[1]), cy(p[0]));
    }
    g.stroke();

    // ping range diamond
    const p = f.position;
    if (f.clue === 'PING' || f.clue === 'SCAN') {
      const rad = f.clue === 'PING' ? radius : 0;
      const reach = (rad + 0.5) * CELL;
      g.strokeStyle = f.fired ? '#4ade80' : '#8e9bbd';
      g.lineWidth = 2; g.setLineDash([6, 4]);
      g.beginPath();
      g.moveTo(cx(p[1]), cy(p[0]) - reach); g.lineTo(cx(p[1]) + reach, cy(p[0]));
      g.lineTo(cx(p[1]), cy(p[0]) + reach); g.lineTo(cx(p[1]) - reach, cy(p[0]));
      g.closePath(); g.stroke(); g.setLineDash([]);
    }

    // WALL-E
    const s = CELL * 0.4;
    g.fillStyle = '#f5b942';
    g.fillRect(cx(p[1]) - s / 2, cy(p[0]) - s / 2, s, s);
    g.fillStyle = '#0b1020'; g.font = 'bold ' + Math.round(CELL * 0.2) + 'px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('W', cx(p[1]), cy(p[0]));
  }

  function drawChart() {
    const W = chart.width, H = chart.height, pad = 22;
    cg.clearRect(0, 0, W, H);
    const maxH = Math.max(...F.map(f => f.entropy), 1);
    const x = k => pad + (F.length <= 1 ? 0 : k / (F.length - 1)) * (W - pad - 8);
    const y = v => H - pad - (v / maxH) * (H - pad - 10);
    cg.strokeStyle = '#26314f'; cg.lineWidth = 1;
    cg.beginPath(); cg.moveTo(pad, 8); cg.lineTo(pad, H - pad); cg.lineTo(W - 6, H - pad); cg.stroke();
    cg.fillStyle = '#8e9bbd'; cg.font = '11px sans-serif'; cg.textAlign = 'right';
    cg.fillText(maxH.toFixed(1), pad - 4, 14); cg.fillText('0', pad - 4, H - pad);
    cg.strokeStyle = '#4fd1e8'; cg.lineWidth = 2; cg.beginPath();
    F.forEach((f, k) => { if (k === 0) cg.moveTo(x(k), y(f.entropy)); else cg.lineTo(x(k), y(f.entropy)); });
    cg.stroke();
    cg.fillStyle = '#f5b942'; cg.beginPath(); cg.arc(x(i), y(F[i].entropy), 4, 0, 2 * Math.PI); cg.fill();
    cg.fillStyle = '#8e9bbd'; cg.textAlign = 'center'; cg.fillText('steps', W / 2, H - 5);
  }

  function drawStatus() {
    const f = F[i];
    $('sStep').textContent = f.step + ' / ' + F[F.length - 1].step;
    $('sAction').textContent = f.action || 'start';
    $('sMode').textContent = f.reason === 'safe_return' ? 'Heading home (safe return)' :
                             f.reason === 'explore' ? 'Searching' : f.reason;
    $('sClue').textContent = f.clue === 'NONE' ? '-' :
        f.clue + ' ' + (f.fired ? 'FIRED' : 'silent');
    $('sGuess').textContent = '(' + f.most_likely[0] + ', ' + f.most_likely[1] + ')';
    $('sEntropy').textContent = f.entropy.toFixed(2);
    $('sBattery').textContent = f.battery + ' / ' + D.meta.battery_start;
    const pct = Math.max(0, f.battery / D.meta.battery_start * 100);
    $('batteryFill').style.width = pct + '%';
    $('batteryFill').style.background = pct > 40 ? '#4ade80' : pct > 15 ? '#f5b942' : '#f87171';
    $('outcome').textContent = i === F.length - 1 ? D.outcome.replace(/_/g, ' ') : '...';
    $('outcome').style.color = i === F.length - 1 && D.outcome === 'FOUND_EVE' ? '#4ade80' : '';
    scrub.value = i;
    $('bPlay').textContent = timer ? 'Pause' : 'Play';
  }

  function render() { drawGrid(); drawChart(); drawStatus(); }
  function go(k) { i = Math.max(0, Math.min(F.length - 1, k)); render(); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } drawStatus(); }
  function play() {
    if (timer) return stop();
    if (i >= F.length - 1) i = 0;
    timer = setInterval(() => { if (i >= F.length - 1) return stop(); go(i + 1); },
                        parseInt($('speed').value, 10));
    drawStatus();
  }

  $('bPlay').onclick = play;
  $('bFwd').onclick = () => { stop(); go(i + 1); };
  $('bBack').onclick = () => { stop(); go(i - 1); };
  $('bStart').onclick = () => { stop(); go(0); };
  $('bEnd').onclick = () => { stop(); go(F.length - 1); };
  scrub.oninput = () => { stop(); go(parseInt(scrub.value, 10)); };
  $('speed').onchange = () => { if (timer) { stop(); play(); } };
  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); play(); }
    else if (e.code === 'ArrowRight') { stop(); go(i + 1); }
    else if (e.code === 'ArrowLeft') { stop(); go(i - 1); }
  });

  render();
})();
</script>
</body>
</html>
"""


def build_html(trajectory: dict[str, Any]) -> str:
    # "</" inside JSON could end the <script> tag early, so escape it.
    data = json.dumps(trajectory).replace("</", "<\\/")
    return _TEMPLATE.replace("__DATA__", data)


def write_visualization(trajectory_path: str | Path, html_path: str | Path) -> Path:
    trajectory = json.loads(Path(trajectory_path).read_text(encoding="utf-8"))
    html_path = Path(html_path)
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(build_html(trajectory), encoding="utf-8")
    return html_path


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    src = argv[0] if len(argv) > 0 else "outputs/trajectory.json"
    dst = argv[1] if len(argv) > 1 else "outputs/visualization.html"
    if not Path(src).exists():
        print(f"Cannot find {src}. Run 'python run_simulation.py' first.")
        sys.exit(1)
    print(f"Wrote {write_visualization(src, dst)}")


if __name__ == "__main__":
    main()
