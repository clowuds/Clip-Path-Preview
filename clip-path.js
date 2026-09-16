// ── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  { name: 'heart',
    value: 'shape(from 50% 90%, line to 90% 50%, arc to 50% 10% of 1%, arc to 10% 50% of 1%)' },
  { name: 'circle',     value: 'circle(50% at 50% 50%)' },
  { name: 'ellipse',    value: 'ellipse(50% 40% at 50% 50%)' },
  { name: 'inset',      value: 'inset(10% 10% 10% 10% round 16%)' },
  { name: 'triangle',   value: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  { name: 'star',
    value: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { name: 'hexagon',    value: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  { name: 'arrow',
    value: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)' },
  { name: 'diamond',    value: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { name: 'trapezoid',  value: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' },
  { name: 'notch',      value: 'polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)' },
  { name: 'cross',
    value: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)' },
  { name: 'path()',     value: "path('M 130 0 L 260 260 L 0 260 Z')" },
  { name: 'blob',
    value: "path('M 130 10 C 180 0, 240 40, 250 90 C 265 145, 245 185, 220 215 C 195 248, 160 262, 130 258 C 100 262, 65 248, 40 215 C 15 185, -5 145, 10 90 C 20 40, 80 0, 130 10 Z')" },
  { name: 'splat',
    value: "path('M 130 5 C 158 -5, 178 18, 200 15 C 228 12, 248 38, 245 62 C 242 84, 262 100, 258 125 C 254 152, 232 162, 235 185 C 238 210, 218 235, 195 240 C 170 246, 152 228, 130 230 C 108 228, 90 246, 65 240 C 42 235, 22 210, 25 185 C 28 162, 8 152, 4 125 C 0 100, 18 84, 15 62 C 12 38, 32 12, 60 15 C 82 18, 102 -5, 130 5 Z')" },
  { name: 'wave-card',
    value: "path('M 0 40 C 40 10, 80 70, 130 40 C 180 10, 220 70, 260 40 L 260 220 C 220 250, 180 190, 130 220 C 80 250, 40 190, 0 220 Z')" },
  { name: 'shield',
    value: "path('M 130 4 C 130 4, 248 40, 248 40 L 248 148 C 248 200, 130 258, 130 258 C 130 258, 12 200, 12 148 L 12 40 Z')" },
  { name: 'flower',
    value: "path('M 130 130 C 130 80, 160 30, 130 10 C 100 30, 130 80, 130 130 C 80 130, 30 100, 10 130 C 30 160, 80 130, 130 130 C 130 180, 100 230, 130 250 C 160 230, 130 180, 130 130 C 180 130, 230 160, 250 130 C 230 100, 180 130, 130 130 Z')" },
  { name: 'ribbon',
    value: "path('M 0 80 C 50 40, 80 120, 130 80 C 180 40, 210 120, 260 80 L 260 100 C 210 140, 180 60, 130 100 C 80 140, 50 60, 0 100 Z')" },
];

// ── Token parser ──────────────────────────────────────────────────────────────
// Finds every numeric token (with optional unit) and labels it from context.

// CSS keywords that can appear before/after numbers — used for labelling
const KEYWORDS = [
  'from','to','line','arc','curve','smooth','of',
  'circle','ellipse','polygon','inset','path','shape',
  'at','round','closest-side','farthest-side',
];

function parseTokens(str) {
  // Match: optional sign, digits, optional decimal, optional unit
  // Capture: [fullMatch, numPart, unit]
  const re = /(-?\d+(?:\.\d+)?)(deg|grad|rad|turn|px|em|rem|%|vw|vh|vmin|vmax)?/g;
  const tokens = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    // skip if the char immediately before is a letter (part of a word like "50deg" preceded by a keyword)
    // we want the number itself, not embedded in identifiers
    const before = str.slice(0, m.index);
    const after  = str.slice(m.index + m[0].length);
    // skip if directly attached to a letter before (e.g. inside a word)
    if (/[a-zA-Z]$/.test(before)) continue;

    // derive a label from surrounding keyword context
    const label = deriveLabel(before, after, tokens.length);

    tokens.push({
      index:   m.index,
      length:  m[0].length,
      raw:     m[0],
      num:     parseFloat(m[1]),
      unit:    m[2] || '',
      label,
      // slider range defaults depend on unit
      min:     defaultMin(m[2]),
      max:     defaultMax(m[2]),
    });
  }
  return tokens;
}

function deriveLabel(before, after, idx) {
  // look backwards for the nearest keyword
  const kw = findNearestKeyword(before);
  // look at what comes after the number (the unit gives type info)
  // also check position index for x/y alternation in polygons
  if (!kw) return `value ${idx + 1}`;
  // shape() specific
  if (kw === 'from')  return idx % 2 === 0 ? 'from X' : 'from Y';
  if (kw === 'to')    return idx % 2 === 0 ? 'to X'   : 'to Y';
  if (kw === 'of')    return 'arc radius';
  if (kw === 'at')    return idx % 2 === 0 ? 'center X' : 'center Y';
  if (kw === 'round') return 'corner radius';
  if (kw === 'circle')  return 'radius';
  if (kw === 'ellipse') return idx % 2 === 0 ? 'rx' : 'ry';
  if (kw === 'inset') {
    const labels = ['top','right','bottom','left'];
    return labels[idx % 4] || `inset ${idx}`;
  }
  if (kw === 'polygon') {
    const axis = idx % 2 === 0 ? 'X' : 'Y';
    return `point ${Math.floor(idx/2)+1} ${axis}`;
  }
  return kw + ' ' + (idx + 1);
}

function findNearestKeyword(before) {
  // scan backwards through the string looking for a keyword
  const cleaned = before.replace(/[,()]/g, ' ');
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].toLowerCase();
    if (KEYWORDS.includes(w)) return w;
  }
  return null;
}

function defaultMin(unit) {
  if (unit === '%')   return 0;
  if (unit === 'deg') return 0;
  if (unit === 'px')  return 0;
  return -500;
}
function defaultMax(unit) {
  if (unit === '%')   return 100;
  if (unit === 'deg') return 360;
  if (unit === 'px')  return 500;
  return 500;
}

// Rebuild the string with updated token values, then re-parse positions
// so subsequent slider moves reference the correct offsets in the new string.
function rebuildString(str, tokens) {
  let result = '';
  let cursor = 0;
  for (const t of tokens) {
    result += str.slice(cursor, t.index);
    const numStr = String(Math.round(t.num * 100) / 100);
    t._newIndex  = result.length;
    t._newLength = numStr.length + t.unit.length;   // length of what was actually written
    result += numStr + t.unit;
    cursor = t.index + t.length;
  }
  result += str.slice(cursor);

  // Patch each token's index/length to match its position in the rebuilt string
  for (const t of tokens) {
    t.index  = t._newIndex;
    t.length = t._newLength;
    delete t._newIndex;
    delete t._newLength;
  }

  return result;
}

// ── State ─────────────────────────────────────────────────────────────────────
let currentValue = PRESETS[0].value;
let tokens = [];
let bgMode = 'gradient'; // 'gradient' | 'photo' | 'solid'

const box       = document.getElementById('preview-box');
const codeArea  = document.getElementById('code-area');
const slidersEl = document.getElementById('sliders-inner');
const outputEl  = document.getElementById('output-code');
const copyBtn   = document.getElementById('copy-btn');
const errEl     = document.getElementById('parse-error');
const wInput    = document.getElementById('w-input');
const hInput    = document.getElementById('h-input');

// ── Vertex overlay ───────────────────────────────────────────────────────────
const vertexOverlay = document.getElementById('vertex-overlay');
let activeTokenIdx = -1;
let overlayDots = [];
let overlayTimer = null;

// Convert a CSS value string + unit to a % relative to box dimension
function toPercent(num, unit, dim) {
  if (unit === '%')  return num;
  if (unit === 'px') return (num / dim) * 100;
  return num; // fallback
}

// Parse the current clip-path string into a list of {x, y} percent points
// Returns array of {x, y, tokenIndices:[i,j]} — tokenIndices are which tokens
// in the global `tokens` array correspond to this dot.
function resolveVertexPoints(val, toks, boxW, boxH) {
  if (!val || !toks || toks.length === 0) return [];

  const v = val.trim().toLowerCase();
  const points = [];

  if (v.startsWith('polygon(')) {
    // tokens alternate x, y
    for (let i = 0; i + 1 < toks.length; i += 2) {
      const tx = toks[i], ty = toks[i + 1];
      points.push({
        x: toPercent(tx.num, tx.unit, boxW),
        y: toPercent(ty.num, ty.unit, boxH),
        tokenIndices: [i, i + 1]
      });
    }
  }

  else if (v.startsWith('circle(')) {
    // circle(r at cx cy) — tokens: [r, cx, cy]
    if (toks.length >= 3) {
      const r  = toks[0], cx = toks[1], cy = toks[2];
      const cxP = toPercent(cx.num, cx.unit, boxW);
      const cyP = toPercent(cy.num, cy.unit, boxH);
      const rP  = toPercent(r.num,  r.unit,  Math.min(boxW, boxH));
      // center dot
      points.push({ x: cxP, y: cyP, tokenIndices: [1, 2] });
      // radius handle (right side)
      points.push({ x: cxP + rP, y: cyP, tokenIndices: [0] });
    } else if (toks.length === 1) {
      // circle(r) with no at — center is 50% 50%
      const rP = toPercent(toks[0].num, toks[0].unit, Math.min(boxW, boxH));
      points.push({ x: 50, y: 50, tokenIndices: [] });
      points.push({ x: 50 + rP, y: 50, tokenIndices: [0] });
    }
  }

  else if (v.startsWith('ellipse(')) {
    // ellipse(rx ry at cx cy) — tokens: [rx, ry, cx, cy]
    if (toks.length >= 4) {
      const rx = toks[0], ry = toks[1], cx = toks[2], cy = toks[3];
      const cxP = toPercent(cx.num, cx.unit, boxW);
      const cyP = toPercent(cy.num, cy.unit, boxH);
      const rxP = toPercent(rx.num, rx.unit, boxW);
      const ryP = toPercent(ry.num, ry.unit, boxH);
      points.push({ x: cxP,       y: cyP,       tokenIndices: [2, 3] }); // center
      points.push({ x: cxP + rxP, y: cyP,       tokenIndices: [0] });    // rx handle
      points.push({ x: cxP,       y: cyP - ryP, tokenIndices: [1] });    // ry handle
    }
  }

  else if (v.startsWith('inset(')) {
    // inset(top right bottom left) — tokens: [top, right, bottom, left, optional round]
    // show corners of the inset rectangle
    const top    = toks[0] ? toPercent(toks[0].num, toks[0].unit, boxH) : 0;
    const right  = toks[1] ? toPercent(toks[1].num, toks[1].unit, boxW) : top;
    const bottom = toks[2] ? toPercent(toks[2].num, toks[2].unit, boxH) : top;
    const left   = toks[3] ? toPercent(toks[3].num, toks[3].unit, boxW) : right;
    const l = left, r = 100 - right, t = top, b = 100 - bottom;
    // tokenIndices: [tiX, tiY] — explicitly ordered X then Y for onMove
    // inset tokens: 0=top(Y), 1=right(X, inverted), 2=bottom(Y, inverted), 3=left(X)
    // _insetSign: direction each token moves relative to the drag delta (inverted for right/bottom)
    points.push({ x: l, y: t, tokenIndices: [3, 0], _insetSign: [ 1,  1] }); // top-left
    points.push({ x: r, y: t, tokenIndices: [1, 0], _insetSign: [-1,  1] }); // top-right
    points.push({ x: r, y: b, tokenIndices: [1, 2], _insetSign: [-1, -1] }); // bottom-right
    points.push({ x: l, y: b, tokenIndices: [3, 2], _insetSign: [ 1, -1] }); // bottom-left
  }

  else if (v.startsWith('path(')) {
    // parse SVG path commands for M, L, C, Q, A, Z
    // We also need to map each anchor's X/Y back to the correct global token index.
    // Walk toks in parallel: each numeric token in the path string corresponds to
    // one entry in toks (in order), so we maintain a tokCursor.
    const pathStr = val.replace(/^path\s*\(\s*['"]?/i, '').replace(/['"]?\s*\)$/, '');
    const cmdRe = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
    let cx = 0, cy = 0;
    let tokCursor = 0; // index into toks[]
    let cm;
    const toBoxPct = (n) => (n / PATH_DESIGN_SIZE) * 100;
    while ((cm = cmdRe.exec(pathStr)) !== null) {
      const cmd = cm[1].toUpperCase();
      const isRel = cm[1] === cm[1].toLowerCase() && cm[1] !== 'Z';
      const numsRaw = cm[2].match(/-?\d+(?:\.\d+)?/g) || [];
      const nums = numsRaw.map(Number);

      if (cmd === 'M' || cmd === 'L') {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const ax = isRel ? cx + nums[i] : nums[i];
          const ay = isRel ? cy + nums[i+1] : nums[i+1];
          cx = ax; cy = ay;
          const tiX = tokCursor + i;
          const tiY = tokCursor + i + 1;
          points.push({ x: toBoxPct(ax), y: toBoxPct(ay), tokenIndices: [tiX, tiY], _pathCoord: true });
        }
        tokCursor += nums.length;
      } else if (cmd === 'H') {
        nums.forEach((n, ni) => {
          cx = isRel ? cx + n : n;
          points.push({ x: toBoxPct(cx), y: toBoxPct(cy), tokenIndices: [tokCursor + ni], _axis: 'x', _pathCoord: true });
        });
        tokCursor += nums.length;
      } else if (cmd === 'V') {
        nums.forEach((n, ni) => {
          cy = isRel ? cy + n : n;
          points.push({ x: toBoxPct(cx), y: toBoxPct(cy), tokenIndices: [tokCursor + ni], _axis: 'y', _pathCoord: true });
        });
        tokCursor += nums.length;
      } else if (cmd === 'C') {
        // 6 params per segment: cp1x cp1y cp2x cp2y x y — only show endpoint
        for (let i = 0; i + 5 < nums.length; i += 6) {
          const ax = isRel ? cx + nums[i+4] : nums[i+4];
          const ay = isRel ? cy + nums[i+5] : nums[i+5];
          cx = ax; cy = ay;
          points.push({ x: toBoxPct(ax), y: toBoxPct(ay), tokenIndices: [tokCursor + i + 4, tokCursor + i + 5], _pathCoord: true });
        }
        tokCursor += nums.length;
      } else if (cmd === 'Q') {
        // 4 params per segment: cpx cpy x y
        for (let i = 0; i + 3 < nums.length; i += 4) {
          const ax = isRel ? cx + nums[i+2] : nums[i+2];
          const ay = isRel ? cy + nums[i+3] : nums[i+3];
          cx = ax; cy = ay;
          points.push({ x: toBoxPct(ax), y: toBoxPct(ay), tokenIndices: [tokCursor + i + 2, tokCursor + i + 3], _pathCoord: true });
        }
        tokCursor += nums.length;
      } else if (cmd === 'A') {
        // 7 params: rx ry x-rot large-arc sweep x y
        for (let i = 0; i + 6 < nums.length; i += 7) {
          const ax = isRel ? cx + nums[i+5] : nums[i+5];
          const ay = isRel ? cy + nums[i+6] : nums[i+6];
          cx = ax; cy = ay;
          points.push({ x: toBoxPct(ax), y: toBoxPct(ay), tokenIndices: [tokCursor + i + 5, tokCursor + i + 6], _pathCoord: true });
        }
        tokCursor += nums.length;
      }
      // Z has no numbers
    }
  }

  else if (v.startsWith('shape(')) {
    // shape(from X Y, line to X Y, arc to X Y of R, ...)
    // tokens: from X, from Y, to X, to Y, ... with possible arc radius tokens
    // The 'at' keyword tokens are center coords for arc, not path points
    // We show every 'from'/'to' pair
    // Walk tokens and group by label
    for (let i = 0; i + 1 < toks.length; i += 2) {
      const tx = toks[i], ty = toks[i + 1];
      // skip arc radius tokens (unit %, but label is 'arc radius')
      if (tx.label === 'arc radius' || ty.label === 'arc radius') { i -= 1; continue; }
      // skip center X/Y tokens
      if (tx.label === 'center X') { i -= 1; continue; }
      points.push({
        x: toPercent(tx.num, tx.unit, boxW),
        y: toPercent(ty.num, ty.unit, boxH),
        tokenIndices: [i, i + 1]
      });
    }
  }

  return points;
}

function renderOverlay(activeIdx) {
  const boxW = box.offsetWidth  || 260;
  const boxH = box.offsetHeight || 260;
  const pts = resolveVertexPoints(currentValue, tokens, boxW, boxH);

  vertexOverlay.innerHTML = '';
  overlayDots = [];

  pts.forEach((pt, dotIdx) => {
    const dot = document.createElement('div');
    dot.className = 'v-dot';
    dot.style.left = pt.x + '%';
    dot.style.top  = pt.y + '%';

    const isActive = activeIdx >= 0 && pt.tokenIndices.includes(activeIdx);
    dot.classList.toggle('active', isActive);
    dot.style.cursor = pt.tokenIndices.length > 0 ? 'grab' : 'default';

    // ── Drag to move dot ──────────────────────────────────────────────────────
    if (pt.tokenIndices.length > 0) {
      const startDrag = (clientX, clientY) => {
        const rect   = vertexOverlay.getBoundingClientRect();
        const startX = clientX;
        const startY = clientY;
        // snapshot token values at drag start
        const startNums = pt.tokenIndices.map(ti => tokens[ti].num);

        dot.classList.add('active');
        dot.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        const onMove = (mx, my) => {
          const dx = ((mx - startX) / rect.width)  * 100; // in %
          const dy = ((my - startY) / rect.height) * 100;

          pt.tokenIndices.forEach((ti, k) => {
            const tok = tokens[ti];
            // For inset: tokenIndices is [tiX, tiY] and _insetSign tells direction.
            // For all others: k===1 (or _axis==='y' for single-token) means Y.
            const isY  = pt._insetSign
              ? k === 1
              : k === 1 || (pt.tokenIndices.length === 1 && pt._axis === 'y');
            const sign  = pt._insetSign ? pt._insetSign[k] : 1;
            const delta = (isY ? dy : dx) * sign;

            if (pt._pathCoord) {
              // path() tokens are in 260-design-space px — convert % drag to that space
              tok.num = Math.round((startNums[k] + (delta / 100) * PATH_DESIGN_SIZE) * 100) / 100;
            } else if (tok.unit === 'px') {
              const dim = isY ? rect.height : rect.width;
              tok.num = Math.round((startNums[k] + (delta / 100) * dim) * 100) / 100;
            } else {
              tok.num = Math.round((startNums[k] + delta) * 100) / 100;
            }

            // sync slider thumb + display
            const sl  = document.getElementById(`sr-${ti}`);
            const val = document.getElementById(`val-${ti}`);
            if (sl)  sl.value = Math.min(tok.max, Math.max(tok.min, tok.num));
            if (val) val.value = tok.num + tok.unit;
          });

          currentValue = rebuildString(currentValue, tokens);
          if (document.activeElement !== codeArea) codeArea.value = currentValue;
          apply(currentValue, true);

          // update ALL dots in place without a full DOM re-render
          const bW = box.offsetWidth  || 260;
          const bH = box.offsetHeight || 260;
          const newPts = resolveVertexPoints(currentValue, tokens, bW, bH);
          overlayDots.forEach(({ dot: d }, di) => {
            if (newPts[di]) {
              d.style.left = newPts[di].x + '%';
              d.style.top  = newPts[di].y + '%';
            }
          });
        };

        const onUp = () => {
          dot.style.cursor = 'grab';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup',   onUp);
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend',  onUp);
          // full re-render to sync all dots
          renderOverlay(-1);
        };

        const onMouseMove = e => onMove(e.clientX, e.clientY);
        const onTouchMove = e => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend',  onUp);
      };

      dot.addEventListener('mousedown',  e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
      dot.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    }

    vertexOverlay.appendChild(dot);
    overlayDots.push({ dot, pt });
  });
}

function showOverlay(activeIdx) {
  clearTimeout(overlayTimer);
  renderOverlay(activeIdx);
}

function hideOverlay() {
  overlayTimer = setTimeout(() => {
    vertexOverlay.innerHTML = '';
    overlayDots = [];
  }, 800);
}

// ── Path scaling ──────────────────────────────────────────────────────────────
// path() uses absolute SVG pixel coordinates. All presets are authored at 260×260.
// This rescales every coordinate in the path data to the actual box size so the
// shape always fills the box correctly regardless of its dimensions.
const PATH_DESIGN_SIZE = 260;

function scalePathToBox(val) {
  const boxW = box.offsetWidth  || PATH_DESIGN_SIZE;
  const boxH = box.offsetHeight || PATH_DESIGN_SIZE;
  const sx = boxW / PATH_DESIGN_SIZE;
  const sy = boxH / PATH_DESIGN_SIZE;

  // Extract the raw SVG path data string from path('...')
  const inner = val.replace(/^\s*path\s*\(\s*['"]?/i, '').replace(/['"]?\s*\)\s*$/i, '');

  // Walk each SVG command and scale its coordinates
  const scaled = inner.replace(
    /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g,
    (_, cmd, args) => {
      const nums = args.trim();
      if (!nums) return cmd; // e.g. Z

      const upper = cmd.toUpperCase();

      // Commands that only take X values: H
      if (upper === 'H') {
        return cmd + nums.replace(/-?\d+(?:\.\d+)?/g, n => round(parseFloat(n) * sx));
      }
      // Commands that only take Y values: V
      if (upper === 'V') {
        return cmd + nums.replace(/-?\d+(?:\.\d+)?/g, n => round(parseFloat(n) * sy));
      }

      // All other commands have coordinate pairs; scale alternating X, Y
      const parts = nums.match(/-?\d+(?:\.\d+)?/g) || [];
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        const n = parseFloat(parts[i]);
        // A (arc) has 7 params: rx ry x-rot large-arc-flag sweep-flag x y
        // rx=i%7===0, ry=i%7===1, flags at i%7===3,4 — only scale rx,ry,x,y
        if (upper === 'A') {
          const p = i % 7;
          if (p === 0) out += (i ? ' ' : '') + round(n * sx);
          else if (p === 1) out += ' ' + round(n * sy);
          else if (p === 5) out += ' ' + round(n * sx);
          else if (p === 6) out += ' ' + round(n * sy);
          else out += ' ' + n; // flags & x-rotation unchanged
        } else {
          // X coords at even indices, Y at odd
          out += (i ? ' ' : '') + round(n * (i % 2 === 0 ? sx : sy));
        }
      }
      return cmd + out;
    }
  );

  return `path('${scaled}')`;
}

function round(n) { return Math.round(n * 100) / 100; }

// ── Apply & render ────────────────────────────────────────────────────────────
function apply(val, fromSlider = false) {
  const isPath = /^\s*path\s*\(/i.test(val);

  // For path() values, scale the coordinates to the current box size for display.
  // The textarea / output / sliders always show the original 260-space values.
  const displayVal = isPath ? scalePathToBox(val) : val;
  box.style.clipPath = displayVal;

  outputEl.innerHTML =
    `<span class="oc-prop">clip-path</span>: <span class="oc-val">${esc(val)}</span>;`;

   if (!fromSlider) {
    // Full rebuild: re-parse tokens and recreate slider DOM
    tokens = parseTokens(val);
    buildSliders();
  } else {
    // Slider move: re-parse token positions only (no DOM rebuild) so
    // subsequent moves stay correctly indexed into currentValue
    tokens = parseTokens(val);
  }

  // update textarea unless we're typing in it
  if (!fromSlider) codeArea.value = val;
  errEl.textContent = '';
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Build sliders ─────────────────────────────────────────────────────────────
function buildSliders() {
  renderOverlay(-1);
  slidersEl.innerHTML = '';
  if (tokens.length === 0) {
    slidersEl.innerHTML = '<p style="font-size:12px;color:var(--muted);padding:8px 0">No numeric tokens found.</p>';
    return;
  }

  tokens.forEach((tok, i) => {
    const block = document.createElement('div');
    block.className = 'slider-block';
    block.innerHTML = `
      <div class="slider-top">
        <span class="edit-dot"></span>
        <span class="token-keyword">${esc(tok.unit || '#')}</span>
        <span class="token-context">${esc(tok.label)}</span>
        <input type="text" class="slider-val-display" id="val-${i}" value="${tok.num}${tok.unit}">
        <button class="edit-range-btn" title="edit range" data-idx="${i}">range ▾</button>
      </div>
      <div class="slider-row-inner">
        <input type="range"
          id="sr-${i}"
          min="${tok.min}" max="${tok.max}"
          step="${tok.unit === 'px' ? 1 : 0.05}"
          value="${Math.min(tok.max, Math.max(tok.min, tok.num))}">
      </div>
      <div class="range-bounds">
        <span id="lb-${i}">${tok.min}${tok.unit}</span>
        <span id="ub-${i}">${tok.max}${tok.unit}</span>
      </div>
      <div class="range-editor" id="re-${i}">
        <label>min</label>
        <input type="number" id="rmin-${i}" value="${tok.min}">
        <label>max</label>
        <input type="number" id="rmax-${i}" value="${tok.max}">
      </div>
    `;
    slidersEl.appendChild(block);

    // slider input
    document.getElementById(`sr-${i}`).addEventListener('input', e => {
      const v = Math.round(parseFloat(e.target.value) * 100) / 100;
      tokens[i].num = v;
      document.getElementById(`val-${i}`).value = v + tokens[i].unit;
      currentValue = rebuildString(currentValue, tokens);
      if (document.activeElement !== codeArea) codeArea.value = currentValue;
      apply(currentValue, true);
      showOverlay(i);
      block.classList.add('editing');
      clearTimeout(block._editTimer);
      block._editTimer = setTimeout(() => {
        block.classList.remove('editing');
        hideOverlay();
      }, 600);
    });

    // direct value input
    const valInput = document.getElementById(`val-${i}`);
    function commitValInput() {
      const raw = valInput.value.trim();
      const m = raw.match(/^(-?\d+(?:\.\d+)?)(deg|grad|rad|turn|px|em|rem|%|vw|vh|vmin|vmax)?$/);
      if (!m) { valInput.value = tokens[i].num + tokens[i].unit; return; }
      const num = parseFloat(m[1]);
      const unit = m[2] || tokens[i].unit;
      tokens[i].num  = num;
      tokens[i].unit = unit;
      currentValue = rebuildString(currentValue, tokens);
      if (document.activeElement !== codeArea) codeArea.value = currentValue;
      apply(currentValue, true);
      const sl = document.getElementById(`sr-${i}`);
      sl.min  = tokens[i].min;
      sl.max  = tokens[i].max;
      sl.value = Math.min(tokens[i].max, Math.max(tokens[i].min, num));
    }
    valInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); valInput.blur(); }
      if (e.key === 'Escape') { valInput.value = tokens[i].num + tokens[i].unit; valInput.blur(); }
    });
    valInput.addEventListener('blur', commitValInput);

    // toggle range editor
    block.querySelector('.edit-range-btn').addEventListener('click', () => {
      const re = document.getElementById(`re-${i}`);
      re.classList.toggle('open');
    });

    // range min/max
    document.getElementById(`rmin-${i}`).addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        tokens[i].min = v;
        const sl = document.getElementById(`sr-${i}`);
        sl.min = v;
        document.getElementById(`lb-${i}`).textContent = v + tokens[i].unit;
      }
    });
    document.getElementById(`rmax-${i}`).addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        tokens[i].max = v;
        const sl = document.getElementById(`sr-${i}`);
        sl.max = v;
        document.getElementById(`ub-${i}`).textContent = v + tokens[i].unit;
      }
    });
  });
}

// ── Textarea custom resize handle ─────────────────────────────────────────────
(function() {
  const resizer = document.getElementById('code-area-resizer');
  let startY, startH;

  const maxH = parseFloat(getComputedStyle(codeArea).maxHeight) || Infinity;

  resizer.addEventListener('mousedown', e => {
    e.preventDefault();
    startY = e.clientY;
    startH = codeArea.offsetHeight;
    resizer.classList.add('dragging');

    function onMove(e) {
      const newH = Math.min(maxH, Math.max(70, startH + e.clientY - startY));
      codeArea.style.height = newH + 'px';
    }
    function onUp() {
      resizer.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  resizer.addEventListener('touchstart', e => {
    e.preventDefault();
    startY = e.touches[0].clientY;
    startH = codeArea.offsetHeight;
    resizer.classList.add('dragging');

    function onMove(e) {
      const newH = Math.min(maxH, Math.max(70, startH + e.touches[0].clientY - startY));
      codeArea.style.height = newH + 'px';
    }
    function onUp() {
      resizer.classList.remove('dragging');
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, { passive: false });
})();

// ── Code area ─────────────────────────────────────────────────────────────────
codeArea.addEventListener('input', () => {
  // Strip "clip-path:" prefix and trailing ";" if the user pastes the full declaration
  let v = codeArea.value.trim();
  const prefixMatch = v.match(/^clip-path\s*:\s*/i);
  if (prefixMatch) {
    v = v.slice(prefixMatch[0].length).replace(/\s*;\s*$/, '').trim();
    codeArea.value = v;
  }
  currentValue = v;
  // deactivate preset badge
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  apply(v);
});

// ── Add variable ──────────────────────────────────────────────────────────────
document.getElementById('add-var-btn').addEventListener('click', insertVar);
document.getElementById('add-var-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') insertVar();
});

function insertVar() {
  const raw = document.getElementById('add-var-input').value.trim();
  if (!raw) return;
  // append to the current value at the cursor or at end
  // For shape() we need to add inside the parens; for others, append
  // Simple approach: append before the last ')'
  let val = currentValue;
  const lastParen = val.lastIndexOf(')');
  if (lastParen !== -1) {
    val = val.slice(0, lastParen) + ', ' + raw + val.slice(lastParen);
  } else {
    val = val + ' ' + raw;
  }
  currentValue = val;
  codeArea.value = val;
  document.getElementById('add-var-input').value = '';
  apply(val);
}

// ── Presets ───────────────────────────────────────────────────────────────────
const tabsEl = document.getElementById('preset-tabs');
PRESETS.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'preset-btn' + (i === 0 ? ' active' : '');
  btn.textContent = p.name;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentValue = p.value;
    apply(p.value);
  });
  tabsEl.appendChild(btn);
});

// ── BG toggle ─────────────────────────────────────────────────────────────────
function setBg(mode) {
  bgMode = mode;
  document.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + mode).classList.add('active');
  box.innerHTML = '';
  const cs = getComputedStyle(document.documentElement);
  const ga = cs.getPropertyValue('--grad-a').trim();
  const gb = cs.getPropertyValue('--grad-b').trim();
  const gc = cs.getPropertyValue('--grad-c').trim();
  if (mode === 'gradient') {
    box.style.background = `linear-gradient(135deg, ${ga}, ${gb} 50%, ${gc})`;
  } else if (mode === 'photo') {
    box.style.background = 'none';
    const img = document.createElement('img');
    img.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80';
    img.alt = 'mountain landscape';
    box.appendChild(img);
  } else {
    box.style.background = ga;
  }
  apply(currentValue, true);
}
document.getElementById('btn-gradient').addEventListener('click', () => setBg('gradient'));
document.getElementById('btn-photo').addEventListener('click',    () => setBg('photo'));
document.getElementById('btn-solid').addEventListener('click',    () => setBg('solid'));

// ── Size ──────────────────────────────────────────────────────────────────────
wInput.addEventListener('input', () => {
  box.style.width = wInput.value + 'px';
  apply(currentValue, true); // rescale path() if active
});
hInput.addEventListener('input', () => {
  box.style.height = hInput.value + 'px';
  apply(currentValue, true); // rescale path() if active
});

// ── Copy ──────────────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(`clip-path: ${currentValue};`).then(() => {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy CSS';
      copyBtn.classList.remove('copied');
    }, 1800);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
setBg('gradient');
apply(PRESETS[0].value);
