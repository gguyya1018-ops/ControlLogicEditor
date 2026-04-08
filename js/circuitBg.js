/**
 * circuitBg.js — 커스텀 프로시저럴 로직 회로 배경
 * 전체 화면을 촘촘한 회로망으로 채움 (빈 곳 없음)
 */
(function () {
    const ws = document.getElementById('welcome-screen');
    if (!ws) return;

    const container = ws.parentElement;
    const canvas = document.createElement('canvas');
    canvas.id = 'circuit-bg';
    Object.assign(canvas.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%',
        zIndex: '51', pointerEvents: 'none',
    });
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W, H, animId;

    // ── 팔레트 ────────────────────────────────────────────
    const PALETTE = [
        { type: 'OCB',  color: '#e94560', weight: 4 },
        { type: 'ALG',  color: '#a78bfa', weight: 3 },
        { type: 'AND',  color: '#4fc3f7', weight: 3 },
        { type: 'OR',   color: '#4fc3f7', weight: 2 },
        { type: 'PID',  color: '#10b981', weight: 2 },
        { type: 'NOT',  color: '#ff9800', weight: 2 },
        { type: 'MAST', color: '#06b6d4', weight: 1 },
        { type: 'SUM',  color: '#a78bfa', weight: 1 },
    ];
    // weight-based random pick table
    const PICK_TABLE = PALETTE.flatMap(p => Array(p.weight).fill(p));

    function rgba(hex, a) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${Math.min(Math.max(a, 0), 1)})`;
    }

    // ── 고정 시드 난수 (xorshift32) ──────────────────────
    function makeRng(seed) {
        let s = (seed || 1) >>> 0;
        return function () {
            s ^= s << 13; s ^= s >> 17; s ^= s << 5;
            return (s >>> 0) / 0x100000000;
        };
    }

    // ── 데이터 ────────────────────────────────────────────
    let nodes   = [];
    let wires   = [];
    let signals = [];

    // OCB 번호 카운터 (시드 기반)
    function makeLabel(type, rng) {
        const n = Math.floor(rng() * 9000 + 1000);
        if (type === 'OCB')  return `OCB${n}`;
        if (type === 'ALG')  return `ALG-${n.toString(16).toUpperCase().slice(0, 3)}`;
        if (type === 'PID')  return `PID-${String(Math.floor(rng() * 99 + 1)).padStart(2, '0')}`;
        if (type === 'MAST') return `MAST`;
        return type;
    }

    function generate() {
        const rng = makeRng(0xc0ffee42);
        nodes = [];
        wires = [];

        // Grid spacing
        const GW = 108, GH = 66;
        const cols = Math.ceil(W / GW) + 1;
        const rows = Math.ceil(H / GH) + 1;

        // ① 노드 배치
        const grid = Array.from({ length: rows }, () => new Array(cols).fill(null));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (rng() > 0.54) continue;          // ~46% 채움
                const pal = PICK_TABLE[Math.floor(rng() * PICK_TABLE.length)];
                const jx  = (rng() - 0.5) * GW * 0.36;
                const jy  = (rng() - 0.5) * GH * 0.30;
                const x   = c * GW + GW * 0.5 + jx;
                const y   = r * GH + GH * 0.5 + jy;
                // AND/OR/NOT 같은 단순 게이트는 좀 더 작게
                const isGate = ['AND','OR','NOT','SUM'].includes(pal.type);
                const w = isGate ? (24 + rng() * 14) : (38 + rng() * 20);
                const h = isGate ? (14 + rng() * 6)  : (16 + rng() * 8);
                const node = { x, y, w, h, color: pal.color, label: makeLabel(pal.type, rng) };
                grid[r][c] = node;
                nodes.push(node);
            }
        }

        // ② 와이어 라우팅 (L자형 Manhattan)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const a = grid[r][c];
                if (!a) continue;

                // 오른쪽 이웃
                if (c + 1 < cols && grid[r][c + 1] && rng() < 0.70)
                    wires.push(routeL(a, grid[r][c + 1], rng));
                // 아래 이웃
                if (r + 1 < rows && grid[r + 1][c] && rng() < 0.62)
                    wires.push(routeL(a, grid[r + 1][c], rng));
                // 아래-오른쪽 2칸 (대각 연결 느낌)
                if (r + 1 < rows && c + 2 < cols && grid[r + 1][c + 2] && rng() < 0.16)
                    wires.push(routeL(a, grid[r + 1][c + 2], rng));
                // 오른쪽 2칸 (긴 수평선)
                if (c + 2 < cols && grid[r][c + 2] && rng() < 0.14)
                    wires.push(routeL(a, grid[r][c + 2], rng));
            }
        }
    }

    function routeL(a, b, rng) {
        // L자 꺾임점을 중간~약간치우침으로 결정
        const pivot = 0.3 + rng() * 0.4;
        const midX  = a.x + (b.x - a.x) * pivot;
        const pts   = [
            { x: a.x,  y: a.y  },
            { x: midX, y: a.y  },
            { x: midX, y: b.y  },
            { x: b.x,  y: b.y  },
        ];
        return { pts, color: rng() < 0.5 ? a.color : b.color };
    }

    function buildSignals() {
        signals = [];
        for (let i = 0; i < wires.length; i++) {
            if (Math.random() < 0.30) {
                signals.push({
                    idx:   i,
                    t:     Math.random(),
                    speed: 0.0012 + Math.random() * 0.0038,
                    tail:  0.10   + Math.random() * 0.14,
                });
            }
        }
    }

    // ── 렌더링 ────────────────────────────────────────────
    function draw() {
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, W, H);

        // 와이어
        for (const wire of wires) drawWire(wire);

        // 꺾임 접합점 (junction dot)
        for (const wire of wires) {
            const { pts, color } = wire;
            for (let i = 1; i < pts.length - 1; i++) {
                ctx.fillStyle = rgba(color, 0.42);
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 블록 노드
        for (const node of nodes) drawNode(node);

        // 신호 빛줄기
        for (const sig of signals) {
            drawSignal(sig);
            sig.t += sig.speed;
            if (sig.t > 1) sig.t -= 1;
        }

        // 중앙 비네트 (카드 가독성↑)
        const vx = W / 2, vy = H / 2;
        const vr1 = Math.min(W, H) * 0.12;
        const vr2 = Math.min(W, H) * 0.65;
        const vig = ctx.createRadialGradient(vx, vy, vr1, vx, vy, vr2);
        vig.addColorStop(0, 'rgba(13,17,23,0.28)');
        vig.addColorStop(1, 'rgba(13,17,23,0)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }

    function drawWire(wire) {
        const { pts, color } = wire;
        ctx.strokeStyle = rgba(color, 0.20);
        ctx.lineWidth   = 0.85;
        ctx.lineJoin    = 'miter';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    }

    function drawNode(node) {
        const { x, y, w, h, color, label } = node;
        ctx.fillStyle   = rgba(color, 0.10);
        ctx.strokeStyle = rgba(color, 0.58);
        ctx.lineWidth   = 0.75;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 2);
        ctx.fill();
        ctx.stroke();

        const fs = Math.max(5.5, Math.min(w * 0.22, 8));
        ctx.font         = `600 ${fs}px monospace`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = rgba(color, 0.88);
        const lbl = label.length > 9 ? label.slice(0, 8) + '…' : label;
        ctx.fillText(lbl, x, y);
    }

    function drawSignal(sig) {
        const wire = wires[sig.idx];
        if (!wire) return;
        const { pts, color } = wire;

        // 세그먼트 길이 계산
        const segs  = [];
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
            const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
            segs.push({ i, d, start: total });
            total += d;
        }
        if (total < 5) return;

        const headD = sig.t * total;
        const tailD = Math.max(0, headD - sig.tail * total);

        for (const seg of segs) {
            const sEnd = seg.start + seg.d;
            if (sEnd < tailD || seg.start > headD) continue;
            const d1 = Math.max(tailD, seg.start) - seg.start;
            const d2 = Math.min(headD, sEnd) - seg.start;
            if (d2 <= d1) continue;

            const p = pts[seg.i], q = pts[seg.i + 1];
            const span = headD - tailD || 1;
            const STEPS = 8;
            for (let k = 0; k < STEPS; k++) {
                const fa = k / STEPS, fb = (k + 1) / STEPS;
                const t1 = d1 / seg.d + fa * (d2 - d1) / seg.d;
                const t2 = d1 / seg.d + fb * (d2 - d1) / seg.d;
                const x1 = p.x + (q.x - p.x) * t1, y1 = p.y + (q.y - p.y) * t1;
                const x2 = p.x + (q.x - p.x) * t2, y2 = p.y + (q.y - p.y) * t2;
                // 꼬리→머리 방향 밝기
                const posA = (seg.start + d1 + (d2 - d1) * fa - tailD) / span;
                const posB = (seg.start + d1 + (d2 - d1) * fb - tailD) / span;
                const br   = (posA + posB) * 0.5;
                ctx.strokeStyle = rgba(color, 0.18 + br * 0.82);
                ctx.lineWidth   = 0.6 + br * 2.4;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // 머리 글로우 점
        const hs = segs.find(s => s.start <= headD && s.start + s.d >= headD);
        if (hs) {
            const ht = (headD - hs.start) / hs.d;
            const p  = pts[hs.i], q = pts[hs.i + 1];
            const hx = p.x + (q.x - p.x) * ht;
            const hy = p.y + (q.y - p.y) * ht;
            const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, 7);
            grd.addColorStop(0, rgba(color, 1.0));
            grd.addColorStop(0.4, rgba(color, 0.5));
            grd.addColorStop(1,   rgba(color, 0));
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(hx, hy, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── 리사이즈 + 루프 ──────────────────────────────────
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        W = container.clientWidth  || window.innerWidth;
        H = container.clientHeight || window.innerHeight;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function animate() {
        draw();
        animId = requestAnimationFrame(animate);
    }

    function init() {
        resize();
        generate();
        buildSignals();
        animate();
    }

    window.addEventListener('resize', () => {
        cancelAnimationFrame(animId);
        animId = null;
        resize();
        generate();
        buildSignals();
        animate();
    });

    // 웰컴화면 숨겨지면 정지
    const observer = new MutationObserver(() => {
        if (ws.classList.contains('hidden') || ws.style.display === 'none') {
            cancelAnimationFrame(animId);
            animId = null;
            canvas.style.display = 'none';
        } else {
            canvas.style.display = '';
            if (!animId) animate();
        }
    });
    observer.observe(ws, { attributes: true, attributeFilter: ['class', 'style'] });

    // 시작
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
})();
