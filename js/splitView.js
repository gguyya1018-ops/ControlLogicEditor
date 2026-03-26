/**
 * splitView.js - 2분할 뷰어 모듈
 * 좌측: 제어 로직, 우측: P&ID
 */

// ============================================================
// 2분할 뷰 상태
// ============================================================

let splitViewActive = false;
let splitLogicData = null;      // 좌측 제어로직 데이터
let splitPIDData = null;        // 우측 P&ID 데이터
let splitLogicCanvas = null;
let splitPIDCanvas = null;
let splitLogicCtx = null;
let splitPIDCtx = null;

// 각 패널별 뷰 상태
let splitLogicView = { x: 0, y: 0, scale: 0.3 };
let splitPIDView = { x: 0, y: 0, scale: 0.5 };

// 리사이즈 상태
let isResizingSplit = false;
let splitRatio = 0.5;  // 0~1, 좌측 패널 비율

// ============================================================
// 초기화
// ============================================================

function initSplitView() {
    splitLogicCanvas = document.getElementById('splitLogicCanvas');
    splitPIDCanvas = document.getElementById('splitPIDCanvas');

    if (splitLogicCanvas && !splitLogicCanvas._initialized) {
        splitLogicCtx = splitLogicCanvas.getContext('2d');
        splitLogicCanvas.addEventListener('wheel', onSplitLogicWheel);
        splitLogicCanvas.addEventListener('mousedown', onSplitLogicMouseDown);
        splitLogicCanvas.addEventListener('dblclick', onSplitLogicDblClick);
        splitLogicCanvas._initialized = true;
    }

    if (splitPIDCanvas && !splitPIDCanvas._initialized) {
        splitPIDCtx = splitPIDCanvas.getContext('2d');
        splitPIDCanvas.addEventListener('wheel', onSplitPIDWheel);
        splitPIDCanvas.addEventListener('mousedown', onSplitPIDMouseDown);
        splitPIDCanvas.addEventListener('dblclick', onSplitPIDDblClick);
        splitPIDCanvas._initialized = true;
    }

    // 리사이즈 핸들
    const divider = document.getElementById('split-divider');
    if (divider && !divider._initialized) {
        divider.addEventListener('mousedown', onSplitDividerMouseDown);
        divider._initialized = true;
    }

    // 창 크기 변경 시 캔버스 리사이즈
    if (!window._splitResizeInitialized) {
        window.addEventListener('resize', resizeSplitCanvases);
        window._splitResizeInitialized = true;
    }
}

// ============================================================
// 탭 전환
// ============================================================

function activateSplitView() {
    splitViewActive = true;
    resizeSplitCanvases();

    // P&ID 인덱스 로드
    if (!pidIndex) {
        loadPIDIndex();
    }

    renderSplitLogic();
    renderSplitPID();
}

function deactivateSplitView() {
    splitViewActive = false;
}

// ============================================================
// 캔버스 리사이즈
// ============================================================

function resizeSplitCanvases() {
    if (!splitViewActive) return;

    const leftPane = document.getElementById('split-logic-pane');
    const rightPane = document.getElementById('split-pid-pane');

    if (splitLogicCanvas && leftPane) {
        // 새 구조: split-preview-canvas-wrap 또는 기존 split-canvas-wrap
        const wrap = leftPane.querySelector('.split-preview-canvas-wrap') || leftPane.querySelector('.split-canvas-wrap');
        if (wrap) {
            splitLogicCanvas.width = wrap.clientWidth || 300;
            splitLogicCanvas.height = wrap.clientHeight || 300;
        }
    }

    if (splitPIDCanvas && rightPane) {
        const wrap = rightPane.querySelector('.split-preview-canvas-wrap') || rightPane.querySelector('.split-canvas-wrap');
        if (wrap) {
            splitPIDCanvas.width = wrap.clientWidth || 300;
            splitPIDCanvas.height = wrap.clientHeight || 300;
        }
    }

    renderSplitLogic();
    renderSplitPID();
}

// ============================================================
// 제어 로직 패널
// ============================================================

function loadSplitLogic(drawingNum, pageNum) {
    // 기존 로직 도면 로드 재활용
    showToast(`제어 로직 ${drawingNum} 로딩...`, 'info');

    // 데이터 로드 후 렌더링
    // 기존 loadFromSupabaseWithVersion 함수 호출
    loadFromSupabaseWithVersion(drawingNum, pageNum, 'original').then(() => {
        splitLogicData = {
            drawingNum,
            pageNum,
            ports: [...ports],
            blocks: [...blocks],
            connections: [...customConnections]
        };

        // 타이틀 업데이트
        const titleEl = document.getElementById('split-logic-title');
        if (titleEl) titleEl.textContent = `${drawingNum} - Page ${pageNum}`;

        // 빈 화면 숨기기
        const emptyEl = document.getElementById('split-logic-empty');
        if (emptyEl) emptyEl.classList.add('hidden');

        // 뷰 리셋
        resetSplitLogicView();
        renderSplitLogic();
    });
}

function resetSplitLogicView() {
    if (!splitLogicCanvas || !splitLogicData) return;

    // 전체 요소 바운드 계산
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const p of (splitLogicData.ports || [])) {
        minX = Math.min(minX, p.cx);
        maxX = Math.max(maxX, p.cx);
        minY = Math.min(minY, p.cy);
        maxY = Math.max(maxY, p.cy);
    }

    for (const b of (splitLogicData.blocks || [])) {
        minX = Math.min(minX, b.cx);
        maxX = Math.max(maxX, b.cx);
        minY = Math.min(minY, b.cy);
        maxY = Math.max(maxY, b.cy);
    }

    if (minX === Infinity) {
        splitLogicView = { x: 0, y: 0, scale: 0.3 };
        return;
    }

    const dataWidth = maxX - minX + 100;
    const dataHeight = maxY - minY + 100;

    const scaleX = splitLogicCanvas.width / dataWidth;
    const scaleY = splitLogicCanvas.height / dataHeight;
    splitLogicView.scale = Math.min(scaleX, scaleY) * 0.9;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    splitLogicView.x = splitLogicCanvas.width / 2 - centerX * splitLogicView.scale;
    splitLogicView.y = splitLogicCanvas.height / 2 - centerY * splitLogicView.scale;
}

function renderSplitLogic() {
    if (!splitLogicCtx || !splitLogicCanvas) return;

    const ctx = splitLogicCtx;
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, splitLogicCanvas.width, splitLogicCanvas.height);

    if (!splitLogicData) return;

    ctx.save();
    ctx.translate(splitLogicView.x, splitLogicView.y);
    ctx.scale(splitLogicView.scale, splitLogicView.scale);

    // 포트 렌더링
    for (const port of (splitLogicData.ports || [])) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(port.cx, port.cy, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // 블록 렌더링
    for (const block of (splitLogicData.blocks || [])) {
        const color = getBlockColor(block.type);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(block.cx - 30, block.cy - 15, 60, 30, 4);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(block.name?.substring(0, 10) || '', block.cx, block.cy);
    }

    // 연결선 렌더링 (간소화)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (const conn of (splitLogicData.connections || [])) {
        if (conn.fromCx && conn.toCx) {
            ctx.beginPath();
            ctx.moveTo(conn.fromCx, conn.fromCy);
            ctx.lineTo(conn.toCx, conn.toCy);
            ctx.stroke();
        }
    }

    ctx.restore();

    // 축척 표시
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${(splitLogicView.scale * 100).toFixed(0)}%`, splitLogicCanvas.width - 10, splitLogicCanvas.height - 10);
}

function getBlockColor(type) {
    if (!type) return '#666';
    if (type.includes('OCB')) return '#e94560';
    if (type.includes('SIGNAL')) return '#00ff88';
    if (type.includes('ALG')) return '#ffd700';
    if (type.includes('REF')) return '#00bcd4';
    return '#8b5cf6';
}

// ============================================================
// P&ID 패널
// ============================================================

function loadSplitPID(pidNumber) {
    showToast(`P&ID ${pidNumber} 로딩...`, 'info');

    loadPIDData(pidNumber).then(data => {
        if (!data) {
            showToast('P&ID 로드 실패', 'error');
            return;
        }

        splitPIDData = data;

        // 타이틀 업데이트
        const titleEl = document.getElementById('split-pid-title');
        if (titleEl) titleEl.textContent = `${data.pid_number} - ${data.name || ''}`;

        // 빈 화면 숨기기
        const emptyEl = document.getElementById('split-pid-empty');
        if (emptyEl) emptyEl.classList.add('hidden');

        // 뷰 리셋
        resetSplitPIDView();
        renderSplitPID();

        showToast(`${pidNumber} 로드 완료`, 'success');
    });
}

function resetSplitPIDView() {
    if (!splitPIDCanvas || !splitPIDData) return;

    const bounds = splitPIDData.bounds;
    const dataWidth = bounds.maxX - bounds.minX;
    const dataHeight = bounds.maxY - bounds.minY;

    const scaleX = (splitPIDCanvas.width - 20) / dataWidth;
    const scaleY = (splitPIDCanvas.height - 20) / dataHeight;
    splitPIDView.scale = Math.min(scaleX, scaleY, 2) * 0.9;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    splitPIDView.x = centerX * splitPIDView.scale - splitPIDCanvas.width / 2;
    splitPIDView.y = centerY * splitPIDView.scale - splitPIDCanvas.height / 2;
}

function renderSplitPID() {
    if (!splitPIDCtx || !splitPIDCanvas) return;

    const ctx = splitPIDCtx;
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, splitPIDCanvas.width, splitPIDCanvas.height);

    if (!splitPIDData) return;

    ctx.save();

    // Y축 반전
    ctx.translate(-splitPIDView.x, splitPIDCanvas.height + splitPIDView.y);
    ctx.scale(splitPIDView.scale, -splitPIDView.scale);

    // 라인 렌더링
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1 / splitPIDView.scale;

    for (const line of (splitPIDData.lines || [])) {
        if (line.type === 'line' || line.type === 'polyline') {
            const pts = line.points;
            if (pts && pts.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i][0], pts[i][1]);
                }
                ctx.stroke();
            }
        } else if (line.type === 'circle') {
            ctx.beginPath();
            ctx.arc(line.center[0], line.center[1], line.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // 밸브 렌더링
    const vSize = 6 / splitPIDView.scale;
    ctx.fillStyle = '#10b981';
    for (const v of (splitPIDData.valves || [])) {
        ctx.beginPath();
        ctx.rect(v.x - vSize/2, v.y - vSize/2, vSize, vSize);
        ctx.fill();
    }

    // 계기 렌더링
    const iRadius = 5 / splitPIDView.scale;
    ctx.fillStyle = '#fb923c';
    for (const i of (splitPIDData.instruments || [])) {
        ctx.beginPath();
        ctx.arc(i.x, i.y, iRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // 축척 표시
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${(splitPIDView.scale * 100).toFixed(0)}%`, splitPIDCanvas.width - 10, splitPIDCanvas.height - 10);
}

// ============================================================
// 이벤트 핸들러
// ============================================================

function onSplitLogicWheel(e) {
    e.preventDefault();
    const rect = splitLogicCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.05, Math.min(5, splitLogicView.scale * zoomFactor));

    const worldX = (mouseX - splitLogicView.x) / splitLogicView.scale;
    const worldY = (mouseY - splitLogicView.y) / splitLogicView.scale;

    splitLogicView.scale = newScale;
    splitLogicView.x = mouseX - worldX * newScale;
    splitLogicView.y = mouseY - worldY * newScale;

    renderSplitLogic();
}

function onSplitPIDWheel(e) {
    e.preventDefault();
    const rect = splitPIDCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, splitPIDView.scale * zoomFactor));

    const dataX = (mouseX + splitPIDView.x) / splitPIDView.scale;
    const dataY = (splitPIDCanvas.height - mouseY + splitPIDView.y) / splitPIDView.scale;

    splitPIDView.scale = newScale;
    splitPIDView.x = dataX * newScale - mouseX;
    splitPIDView.y = dataY * newScale - (splitPIDCanvas.height - mouseY);

    renderSplitPID();
}

let splitLogicDragging = false;
let splitPIDDragging = false;
let splitDragStartX = 0, splitDragStartY = 0;

function onSplitLogicMouseDown(e) {
    splitLogicDragging = true;
    splitDragStartX = e.clientX;
    splitDragStartY = e.clientY;

    const onMove = (ev) => {
        if (!splitLogicDragging) return;
        const dx = ev.clientX - splitDragStartX;
        const dy = ev.clientY - splitDragStartY;
        splitDragStartX = ev.clientX;
        splitDragStartY = ev.clientY;
        splitLogicView.x += dx;
        splitLogicView.y += dy;
        renderSplitLogic();
    };

    const onUp = () => {
        splitLogicDragging = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function onSplitPIDMouseDown(e) {
    splitPIDDragging = true;
    splitDragStartX = e.clientX;
    splitDragStartY = e.clientY;

    const onMove = (ev) => {
        if (!splitPIDDragging) return;
        const dx = ev.clientX - splitDragStartX;
        const dy = ev.clientY - splitDragStartY;
        splitDragStartX = ev.clientX;
        splitDragStartY = ev.clientY;
        splitPIDView.x -= dx;
        splitPIDView.y += dy;
        renderSplitPID();
    };

    const onUp = () => {
        splitPIDDragging = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

function onSplitLogicDblClick(e) {
    // 더블클릭: 전체 화면으로 열기
    if (splitLogicData && splitLogicData.drawingNum) {
        showToast('제어 로직 전체 화면으로 전환', 'info');
        deactivateSplitView();
        // 기존 도면 열기 함수 호출
        if (typeof loadFromSupabaseWithVersion === 'function') {
            loadFromSupabaseWithVersion(splitLogicData.drawingNum, splitLogicData.pageNum, 'original');
        }
    }
}

function onSplitPIDDblClick(e) {
    // 더블클릭: 전체 화면으로 열기
    if (splitPIDData && splitPIDData.pid_number) {
        showToast('P&ID 전체 화면으로 전환', 'info');
        deactivateSplitView();
        // P&ID 전체 화면 열기
        if (typeof openPID === 'function') {
            openPID(splitPIDData.pid_number);
        }
    }
}

// 리사이즈 핸들
function onSplitDividerMouseDown(e) {
    isResizingSplit = true;
    e.preventDefault();

    // 새 구조 또는 기존 구조
    const container = document.querySelector('.split-preview-container') || document.querySelector('.split-view-container');
    const leftPane = document.getElementById('split-logic-pane');
    const rightPane = document.getElementById('split-pid-pane');

    if (!container || !leftPane || !rightPane) return;

    const onMove = (ev) => {
        if (!isResizingSplit) return;

        const containerRect = container.getBoundingClientRect();
        const newRatio = (ev.clientX - containerRect.left) / containerRect.width;
        splitRatio = Math.max(0.2, Math.min(0.8, newRatio));

        leftPane.style.flex = `${splitRatio}`;
        rightPane.style.flex = `${1 - splitRatio}`;

        resizeSplitCanvases();
    };

    const onUp = () => {
        isResizingSplit = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}

// ============================================================
// 도면 목록 다이얼로그 (2분할 모드용)
// ============================================================

function showSplitDrawingList(side) {
    if (side === 'logic') {
        showDrawingList(); // 기존 함수 재활용
    } else if (side === 'pid') {
        showPIDList();
    }
}

// ============================================================
// 초기화는 switchWelcomeType('split')에서 호출됨
// ============================================================
