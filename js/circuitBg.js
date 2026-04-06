/**
 * circuitBg.js — 시작화면 배경: 실제 제어 로직 회로 애니메이션
 * ovation_symbols.json의 실제 블록 데이터를 사용하여
 * 복잡한 제어 로직 도면을 배경에 렌더링
 */
(function() {
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
    let W, H, nodes = [], edges = [], signals = [], animId;
    const BG = '#0d1117';

    // 실제 Ovation 심볼에서 가져온 블록 정의 (카테고리별 색상)
    const BLOCKS = [
        // Control (파란계열)
        { label: 'PID', sub: ['Δ','κ','∫','d/dt'], color: '#4fc3f7', cat: 'ctrl' },
        { label: 'PIDFF', sub: ['Δ','∫','FF'], color: '#4fc3f7', cat: 'ctrl' },
        { label: 'LEADLAG', sub: ['sτ','1/sτ'], color: '#4fc3f7', cat: 'ctrl' },
        { label: 'PREDICTOR', sub: ['e⁻ˢᵀ','G(s)'], color: '#4fc3f7', cat: 'ctrl' },
        // Logic (초록계열)
        { label: 'AND', sub: ['&'], color: '#10b981', cat: 'logic' },
        { label: 'OR', sub: ['OR'], color: '#10b981', cat: 'logic' },
        { label: 'NOT', sub: ['NOT'], color: '#e94560', cat: 'logic' },
        { label: 'XOR', sub: ['XOR'], color: '#a78bfa', cat: 'logic' },
        { label: 'FLIPFLOP', sub: ['S','R'], color: '#10b981', cat: 'logic' },
        // Math (보라계열)
        { label: 'SUM', sub: ['Σ'], color: '#a78bfa', cat: 'math' },
        { label: 'MULTIPLY', sub: ['×'], color: '#a78bfa', cat: 'math' },
        { label: 'DIVIDE', sub: ['÷'], color: '#a78bfa', cat: 'math' },
        { label: 'SQUAREROOT', sub: ['√'], color: '#a78bfa', cat: 'math' },
        { label: 'ABSVALUE', sub: ['|x|'], color: '#a78bfa', cat: 'math' },
        { label: 'COMPARE', sub: ['>','=','<'], color: '#a78bfa', cat: 'math' },
        { label: 'POLYNOMIAL', sub: ['Σaₙxⁿ'], color: '#a78bfa', cat: 'math' },
        { label: 'FUNCTION', sub: ['f(x)'], color: '#a78bfa', cat: 'math' },
        // Timer (주황계열)
        { label: 'ONDELAY', sub: ['⏱↑'], color: '#ff9800', cat: 'timer' },
        { label: 'OFFDELAY', sub: ['⏱↓'], color: '#ff9800', cat: 'timer' },
        { label: 'ONESHOT', sub: ['⏱¹'], color: '#ff9800', cat: 'timer' },
        { label: 'COUNTER', sub: ['CTR'], color: '#ff9800', cat: 'timer' },
        // Selector (노란계열)
        { label: 'HISELECT', sub: ['MAX'], color: '#fbbf24', cat: 'sel' },
        { label: 'LOSELECT', sub: ['MIN'], color: '#fbbf24', cat: 'sel' },
        { label: 'TRANSFER', sub: ['⇄'], color: '#fbbf24', cat: 'sel' },
        { label: 'SELECTOR', sub: ['MUX'], color: '#fbbf24', cat: 'sel' },
        // Monitor (빨간계열)
        { label: 'HIGHMON', sub: ['>H'], color: '#e94560', cat: 'mon' },
        { label: 'LOWMON', sub: ['<L'], color: '#e94560', cat: 'mon' },
        { label: 'RATEMON', sub: ['Δ/t'], color: '#e94560', cat: 'mon' },
        // IO (청록계열)
        { label: 'MASTATION', sub: ['M','A'], color: '#06b6d4', cat: 'io' },
        { label: 'SETPOINT', sub: ['SP'], color: '#06b6d4', cat: 'io' },
        { label: 'GAINBIAS', sub: ['×G','+B'], color: '#06b6d4', cat: 'io' },
        { label: 'RATELIMIT', sub: ['ΔR'], color: '#06b6d4', cat: 'io' },
        // Signal
        { label: 'SMOOTH', sub: ['α'], color: '#4fc3f7', cat: 'sig' },
        { label: 'TRANSPORT', sub: ['e⁻ˢᵀ'], color: '#4fc3f7', cat: 'sig' },
        // Simple
        { label: 'K', sub: [], color: '#fbbf24', cat: 'const' },
        { label: 'T', sub: [], color: '#ff9800', cat: 'logic' },
    ];

    // 포트 이름들 (연결선 라벨용)
    const PORT_NAMES = ['PV','STPT','OUT','IN1','IN2','MV','SP','TRIN','TOUT','DEVA','FLAG','YES','NO','ENBL'];

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        W = container.clientWidth || window.innerWidth;
        H = container.clientHeight || window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
        resize();
        nodes = []; edges = []; signals = [];

        // 촘촘한 그리드
        const cellW = 80, cellH = 55;
        const cols = Math.floor(W / cellW);
        const rows = Math.floor(H / cellH);
        const nodeCount = Math.min(Math.floor(cols * rows * 0.6), 120);

        const slots = [];
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                slots.push({ c, r });
        shuffle(slots);

        for (let i = 0; i < nodeCount && i < slots.length; i++) {
            const slot = slots[i];
            const bt = BLOCKS[Math.floor(Math.random() * BLOCKS.length)];
            const hasSub = bt.sub.length > 0;
            const w = hasSub ? Math.max(40, bt.label.length * 5 + 20) : 30;
            const h = hasSub ? 32 : 22;

            nodes.push({
                x: (slot.c + 0.5) * cellW + (Math.random() - 0.5) * 15,
                y: (slot.r + 0.5) * cellH + (Math.random() - 0.5) * 10,
                w, h,
                label: bt.label,
                sub: bt.sub,
                color: bt.color,
                cat: bt.cat,
                alpha: 0.14 + Math.random() * 0.10,
            });
        }

        // 연결: 가까운 노드끼리 (다양한 방향)
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            const candidates = nodes.map((b, j) => ({
                j, d: Math.hypot(b.x - a.x, b.y - a.y), dx: b.x - a.x, dy: b.y - a.y
            }))
            .filter(d => d.j !== i && d.d < 160 && d.d > 30)
            .sort((a, b) => a.d - b.d)
            .slice(0, 3);

            for (const { j, dx, dy } of candidates) {
                if (!edges.find(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
                    // 방향 결정: 오른쪽이면 좌→우, 아래면 상→하
                    const from = dx >= 0 ? i : j;
                    const to = dx >= 0 ? j : i;
                    edges.push({ a: from, b: to, path: null, len: 0 });
                }
            }
        }

        // 경로 계산
        for (const e of edges) {
            e.path = calcPath(e);
            e.len = pathLen(e.path);
        }

        // 신호 — 많이 생성
        for (let i = 0; i < edges.length; i++) {
            if (Math.random() < 0.35) {
                signals.push({
                    edge: i,
                    t: Math.random(),
                    speed: 0.002 + Math.random() * 0.004,
                    color: nodes[edges[i].a].color,
                    tailLen: 15 + Math.random() * 25,
                });
            }
        }
    }

    function calcPath(e) {
        const a = nodes[e.a], b = nodes[e.b];
        const x1 = a.x + a.w/2, y1 = a.y;
        const x2 = b.x - b.w/2, y2 = b.y;
        const midX = (x1 + x2) / 2;

        // 수직 차이가 작으면 직선, 크면 직각 경로
        if (Math.abs(y2 - y1) < 5) {
            return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        }
        return [
            { x: x1, y: y1 },
            { x: midX, y: y1 },
            { x: midX, y: y2 },
            { x: x2, y: y2 },
        ];
    }

    function pathLen(pts) {
        let len = 0;
        for (let i = 1; i < pts.length; i++)
            len += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
        return len;
    }

    function pointOnPath(pts, totalLen, t) {
        let target = Math.max(0, Math.min(1, t)) * totalLen;
        for (let i = 1; i < pts.length; i++) {
            const seg = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
            if (target <= seg || i === pts.length - 1) {
                const r = seg > 0 ? target / seg : 0;
                return {
                    x: pts[i-1].x + (pts[i].x - pts[i-1].x) * Math.min(r, 1),
                    y: pts[i-1].y + (pts[i].y - pts[i-1].y) * Math.min(r, 1),
                };
            }
            target -= seg;
        }
        return pts[pts.length - 1];
    }

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
    }

    // ─── 그리기 ───

    function drawNode(n) {
        const { x, y, w, h, label, sub, color, alpha } = n;

        // 메인 박스
        ctx.fillStyle = rgba(color, alpha * 0.3);
        ctx.strokeStyle = rgba(color, alpha * 1.0);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, 3);
        ctx.fill();
        ctx.stroke();

        if (sub.length > 0) {
            // 서브블록 (PID 스타일 내부 구조)
            if (sub.length === 1) {
                // 단일 기호 — 중앙에 크게
                ctx.fillStyle = rgba(color, alpha * 2.5);
                ctx.font = '600 10px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(sub[0], x, y);
            } else {
                // 다중 서브블록 — 가로로 나열
                const subW = (w - 8) / sub.length;
                const subY = y - h/2 + 4;
                const subH = h - 8;
                const colors = ['#4fc3f7', '#10b981', '#e94560', '#ff9800', '#a78bfa'];
                for (let i = 0; i < sub.length; i++) {
                    const sx = x - w/2 + 4 + i * subW;
                    const sc = colors[i % colors.length];
                    ctx.fillStyle = rgba(sc, alpha * 0.6);
                    ctx.strokeStyle = rgba(sc, alpha * 0.8);
                    ctx.lineWidth = 0.4;
                    ctx.beginPath();
                    ctx.roundRect(sx, subY, subW - 2, subH, 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = rgba(sc, alpha * 2.5);
                    ctx.font = '600 7px -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(sub[i], sx + subW/2 - 1, subY + subH/2);
                }
            }
        } else {
            // 라벨만
            ctx.fillStyle = rgba(color, alpha * 2.5);
            ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        }

        // 입출력 포트 (작은 사각형)
        ctx.fillStyle = rgba(color, alpha * 1.5);
        ctx.fillRect(x - w/2 - 2, y - 1.5, 3, 3);
        ctx.fillRect(x + w/2 - 1, y - 1.5, 3, 3);

        // 상단/하단 포트 (일부 블록)
        if (sub.length >= 3) {
            ctx.fillRect(x - 1.5, y - h/2 - 2, 3, 3);
            ctx.fillRect(x - 1.5, y + h/2 - 1, 3, 3);
        }
    }

    function drawEdge(e) {
        if (!e.path || e.len <= 0) return;
        const a = nodes[e.a], b = nodes[e.b];
        const alpha = Math.min(a.alpha, b.alpha) * 0.6;

        ctx.strokeStyle = rgba('#4fc3f7', alpha * 1.2);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(e.path[0].x, e.path[0].y);
        for (let i = 1; i < e.path.length; i++)
            ctx.lineTo(e.path[i].x, e.path[i].y);
        ctx.stroke();

        // 꺾이는 점에 작은 점
        for (let i = 1; i < e.path.length - 1; i++) {
            ctx.fillStyle = rgba('#4fc3f7', alpha * 1.5);
            ctx.beginPath();
            ctx.arc(e.path[i].x, e.path[i].y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSignal(s) {
        const e = edges[s.edge];
        if (!e || !e.path || e.len <= 0) return;

        const headDist = s.t * e.len;
        const tailDist = Math.max(0, headDist - s.tailLen);
        const steps = 10;

        for (let i = 0; i < steps; i++) {
            const d1 = tailDist + (headDist - tailDist) * (i / steps);
            const d2 = tailDist + (headDist - tailDist) * ((i + 1) / steps);
            const p1 = pointOnPath(e.path, e.len, d1 / e.len);
            const p2 = pointOnPath(e.path, e.len, d2 / e.len);

            const brightness = i / steps;
            ctx.strokeStyle = rgba(s.color, brightness * 0.75);
            ctx.lineWidth = 1.0 + brightness * 1.8;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    function rgba(hex, a) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${Math.min(Math.max(a,0),1)})`;
    }

    // ─── 애니메이션 루프 ───

    function animate() {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        for (const e of edges) drawEdge(e);
        for (const n of nodes) drawNode(n);
        for (const s of signals) {
            s.t += s.speed;
            if (s.t > 1) { s.t = 0; }
            drawSignal(s);
        }
        animId = requestAnimationFrame(animate);
    }

    init();
    animate();

    window.addEventListener('resize', () => {
        cancelAnimationFrame(animId);
        init();
        animate();
    });

    const observer = new MutationObserver(() => {
        if (ws.classList.contains('hidden') || ws.style.display === 'none') {
            cancelAnimationFrame(animId);
            canvas.style.display = 'none';
        }
    });
    observer.observe(ws, { attributes: true, attributeFilter: ['class', 'style'] });
})();
