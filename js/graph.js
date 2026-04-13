/**
 * graph.js - 포트 기준 라인 추적 + 방향 연장 매칭 (v3)
 *
 * 핵심 알고리즘:
 * 1. 모든 포트/블록 좌표를 그리드 인덱스에 등록
 * 2. 각 포트에서 가까운 라인 끝점을 찾아 체이닝
 * 3. 체인 끝에서 라인 방향으로 연장하여 다른 포트에 도달
 * 4. 포트→포트 연결 = 템플릿 간 연결
 */

// ============ 전역 상태 ============
let graphNodes = [];       // 포트/블록 노드 (매칭된 것만)
let graphEdges = [];       // 포트→포트 연결
let graphAnalysisResult = null;
let showGraphNodes = false;
let showGraphEdges = false;

// ============ 설정 ============
const GRAPH_CONFIG = {
    portSearchRadius: 22,    // 포트 근처 라인 검색 반경 (px)
    lineSnapThreshold: 22,   // 라인 끝점 연결 거리 (px)
    extensionMaxDist: 800,   // 라인 연장 최대 거리 (px)
    extensionSnapRadius: 22, // 연장선이 포트에 도달하는 판정 반경 (px)
    maxLineLength: 2000,     // 최대 라인 길이 (vlines에 긴 라인 있음)
    maxChainDepth: 300,      // 체인 최대 깊이
};

// ============ 1단계: 라인 전처리 ============

function preprocessLines() {
    const lines = [];
    const maxLen = GRAPH_CONFIG.maxLineLength;

    // 블록 영역 바운딩 박스
    const blockBoxes = [];
    if (typeof groupsData !== 'undefined') {
        for (const [, group] of Object.entries(groupsData)) {
            if (!group.ports || group.ports.length === 0) continue;
            let minX = group.cx, maxX = group.cx, minY = group.cy, maxY = group.cy;
            for (const p of group.ports) {
                if (p.cx < minX) minX = p.cx;
                if (p.cx > maxX) maxX = p.cx;
                if (p.cy < minY) minY = p.cy;
                if (p.cy > maxY) maxY = p.cy;
            }
            blockBoxes.push({ x1: minX + 5, y1: minY + 5, x2: maxX - 5, y2: maxY - 5 });
        }
    }

    for (let i = 0; i < linesData.length; i++) {
        const line = linesData[i];
        const x1 = parseFloat(line.x1), y1 = parseFloat(line.y1);
        const x2 = parseFloat(line.x2), y2 = parseFloat(line.y2);

        if (Math.min(x1, x2) < 30 || Math.max(x1, x2) > 5400) continue;
        if (Math.min(y1, y2) < 30 || Math.max(y1, y2) > 3470) continue;

        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > maxLen || len < 0.5) continue;

        // 블록 내부 라인 제외
        let inside = false;
        for (const box of blockBoxes) {
            if (x1 >= box.x1 && x1 <= box.x2 && y1 >= box.y1 && y1 <= box.y2 &&
                x2 >= box.x1 && x2 <= box.x2 && y2 >= box.y1 && y2 <= box.y2) {
                inside = true; break;
            }
        }
        if (inside) continue;

        lines.push({ idx: i, x1, y1, x2, y2, dx, dy, len });
    }
    return lines;
}

// ============ 2단계: 그리드 인덱스 ============

function buildGridIndex(items, cellSize) {
    const grid = {};
    for (const item of items) {
        const gx = Math.floor(item.x / cellSize);
        const gy = Math.floor(item.y / cellSize);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = (gx + dx) + ',' + (gy + dy);
                if (!grid[key]) grid[key] = [];
                grid[key].push(item);
            }
        }
    }
    return grid;
}

function queryGrid(grid, x, y, cellSize) {
    const key = Math.floor(x / cellSize) + ',' + Math.floor(y / cellSize);
    return grid[key] || [];
}

// ============ 3단계: 포트에서 라인 체이닝 + 방향 연장 ============

function traceFromPort(port, lineEndGrid, cellSize, portGrid, portCellSize, allPorts, visitedLines) {
    const results = [];  // { targetPort, path: [{x,y}] }
    const radius = GRAPH_CONFIG.portSearchRadius;
    const snapThresh = GRAPH_CONFIG.lineSnapThreshold;
    const snapSq = snapThresh * snapThresh;
    const maxDepth = GRAPH_CONFIG.maxChainDepth;

    // 포트 근처 라인 끝점 찾기
    const nearEndpoints = queryGrid(lineEndGrid, port.cx, port.cy, cellSize);
    const startEndpoints = [];
    for (const ep of nearEndpoints) {
        const dx = ep.x - port.cx, dy = ep.y - port.cy;
        if (dx * dx + dy * dy <= radius * radius) {
            startEndpoints.push(ep);
        }
    }

    for (const startEp of startEndpoints) {
        if (visitedLines.has(startEp.line.idx + '_' + (startEp.isStart ? 's' : 'e'))) continue;

        // 체이닝: 라인의 반대쪽 끝점에서 연결된 다음 라인 찾기
        const path = [{ x: port.cx, y: port.cy }];
        let currentLine = startEp.line;
        let currentEnd = startEp.isStart ?
            { x: currentLine.x2, y: currentLine.y2 } :
            { x: currentLine.x1, y: currentLine.y1 };

        path.push({ x: startEp.x, y: startEp.y });
        path.push({ x: currentEnd.x, y: currentEnd.y });

        const usedLines = new Set([currentLine.idx]);
        let lastDx = currentEnd.x - startEp.x;
        let lastDy = currentEnd.y - startEp.y;
        let depth = 0;
        let foundTarget = null;

        while (depth < maxDepth) {
            depth++;

            // 현재 끝점이 다른 포트에 도달했는지 확인
            const nearPorts = queryGrid(portGrid, currentEnd.x, currentEnd.y, portCellSize);
            for (const np of nearPorts) {
                if (np === port) continue; // 자기 자신 제외
                const dx = np.cx - currentEnd.x, dy = np.cy - currentEnd.y;
                if (dx * dx + dy * dy <= radius * radius) {
                    foundTarget = np;
                    path.push({ x: np.cx, y: np.cy });
                    break;
                }
            }
            if (foundTarget) break;

            // 연결된 다음 라인 찾기
            const nextEndpoints = queryGrid(lineEndGrid, currentEnd.x, currentEnd.y, cellSize);
            let bestNext = null;
            let bestDistSq = snapSq;

            for (const ep of nextEndpoints) {
                if (usedLines.has(ep.line.idx)) continue;
                const dx = ep.x - currentEnd.x, dy = ep.y - currentEnd.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    bestNext = ep;
                }
            }

            if (bestNext) {
                usedLines.add(bestNext.line.idx);
                const nextEnd = bestNext.isStart ?
                    { x: bestNext.line.x2, y: bestNext.line.y2 } :
                    { x: bestNext.line.x1, y: bestNext.line.y1 };

                lastDx = nextEnd.x - bestNext.x;
                lastDy = nextEnd.y - bestNext.y;
                path.push({ x: nextEnd.x, y: nextEnd.y });
                currentEnd = nextEnd;
            } else {
                // 더 이상 연결 라인 없음 → 방향 연장하여 포트 검색
                const lastLen = Math.sqrt(lastDx * lastDx + lastDy * lastDy);
                if (lastLen > 0.5) {
                    const dirX = lastDx / lastLen;
                    const dirY = lastDy / lastLen;
                    const extMax = GRAPH_CONFIG.extensionMaxDist;
                    const extSnap = GRAPH_CONFIG.extensionSnapRadius;
                    const extSnapSq = extSnap * extSnap;

                    // 연장 방향으로 가장 가까운 포트 검색
                    let bestPort = null;
                    let bestDist = extMax;

                    for (const np of allPorts) {
                        if (np === port) continue;
                        const toCx = np.cx - currentEnd.x;
                        const toCy = np.cy - currentEnd.y;

                        // 연장 방향과 같은 쪽에 있는지 (내적 > 0)
                        const dot = toCx * dirX + toCy * dirY;
                        if (dot <= 0 || dot > extMax) continue;

                        // 연장선까지의 수직 거리
                        const projX = currentEnd.x + dirX * dot;
                        const projY = currentEnd.y + dirY * dot;
                        const perpDx = np.cx - projX;
                        const perpDy = np.cy - projY;
                        const perpDistSq = perpDx * perpDx + perpDy * perpDy;

                        if (perpDistSq <= extSnapSq && dot < bestDist) {
                            bestDist = dot;
                            bestPort = np;
                        }
                    }

                    if (bestPort) {
                        foundTarget = bestPort;
                        path.push({ x: bestPort.cx, y: bestPort.cy });
                    }
                }
                break;
            }
        }

        if (foundTarget) {
            // 사용한 라인 마킹
            for (const lineIdx of usedLines) {
                visitedLines.add(lineIdx + '_s');
                visitedLines.add(lineIdx + '_e');
            }
            results.push({ targetPort: foundTarget, path });
        }
    }

    return results;
}

// ============ 4단계: 메인 분석 ============

function analyzeGraph() {
    console.time('[Graph] 분석 v3');

    if (!linesData || linesData.length === 0 || !groupsData) {
        graphAnalysisResult = { error: '데이터가 없습니다.' };
        showGraphAnalysisResult();
        return;
    }

    // 1. 라인 전처리
    const lines = preprocessLines();
    console.log(`[Graph] 필터링된 라인: ${lines.length}개 / ${linesData.length}개`);

    // 2. 모든 포트/블록 수집
    const allPorts = [];
    const elementToGroup = {};
    for (const [blockName, group] of Object.entries(groupsData)) {
        // 블록 자체도 포트로 취급
        const blockPort = {
            name: blockName, cx: group.cx, cy: group.cy,
            type: 'block', parentGroup: blockName
        };
        allPorts.push(blockPort);
        elementToGroup[blockName + '_' + Math.round(group.cx) + '_' + Math.round(group.cy)] = blockName;

        if (group.ports) {
            for (const p of group.ports) {
                const pName = p.name || p;
                const portObj = {
                    name: pName, cx: p.cx, cy: p.cy,
                    type: p.type || 'port', parentGroup: blockName
                };
                allPorts.push(portObj);
                elementToGroup[pName + '_' + Math.round(p.cx) + '_' + Math.round(p.cy)] = blockName;
            }
        }
    }
    console.log(`[Graph] 포트/블록: ${allPorts.length}개`);

    // 3. 라인 끝점 그리드
    const lineEndpoints = [];
    for (const line of lines) {
        lineEndpoints.push({ x: line.x1, y: line.y1, line, isStart: true });
        lineEndpoints.push({ x: line.x2, y: line.y2, line, isStart: false });
    }

    const lineCellSize = GRAPH_CONFIG.lineSnapThreshold * 2;
    const lineEndGrid = buildGridIndex(lineEndpoints, lineCellSize);

    // 4. 포트 그리드
    const portCellSize = GRAPH_CONFIG.portSearchRadius * 2;
    const portGrid = buildGridIndex(allPorts.map(p => ({ ...p, x: p.cx, y: p.cy })), portCellSize);

    // 5. 각 포트에서 라인 추적
    const connections = [];  // { from, to, path }
    const connectionSet = new Set();
    const visitedLines = new Set();
    let directCount = 0;
    let extendedCount = 0;

    // 노드 저장 (렌더링용)
    graphNodes = allPorts;

    for (const port of allPorts) {
        const traces = traceFromPort(port, lineEndGrid, lineCellSize, portGrid, portCellSize, allPorts, visitedLines);

        for (const trace of traces) {
            const target = trace.targetPort;
            const fromKey = port.name + '_' + Math.round(port.cx) + '_' + Math.round(port.cy);
            const toKey = target.name + '_' + Math.round(target.cx) + '_' + Math.round(target.cy);
            const pairKey = fromKey < toKey ? fromKey + '|' + toKey : toKey + '|' + fromKey;

            if (connectionSet.has(pairKey)) continue;
            connectionSet.add(pairKey);

            const fromGroup = elementToGroup[fromKey];
            const toGroup = elementToGroup[toKey];

            const isExtended = trace.path.length > 0 &&
                Math.abs(trace.path[trace.path.length-2]?.x - target.cx) > GRAPH_CONFIG.lineSnapThreshold ||
                Math.abs(trace.path[trace.path.length-2]?.y - target.cy) > GRAPH_CONFIG.lineSnapThreshold;

            if (isExtended) extendedCount++;
            else directCount++;

            connections.push({
                fromPort: port,
                toPort: target,
                fromGroup: fromGroup || '?',
                toGroup: toGroup || '?',
                path: trace.path,
                isExtended
            });
        }
    }

    graphEdges = connections;
    console.log(`[Graph] 연결: ${connections.length}개 (직접 ${directCount}, 연장 ${extendedCount})`);

    // 6. 템플릿 간 연결 집계
    const tplPairMap = {};
    for (const conn of connections) {
        if (conn.fromGroup === conn.toGroup || conn.fromGroup === '?' || conn.toGroup === '?') continue;
        const pairKey = [conn.fromGroup, conn.toGroup].sort().join('|');
        if (!tplPairMap[pairKey]) {
            tplPairMap[pairKey] = { from: conn.fromGroup, to: conn.toGroup, details: [] };
        }
        tplPairMap[pairKey].details.push({
            fromEl: conn.fromPort.name,
            toEl: conn.toPort.name,
            isExtended: conn.isExtended
        });
    }
    const templateConnections = Object.values(tplPairMap);

    // 연결된 그룹 수
    const connectedGroups = new Set();
    for (const conn of connections) {
        if (conn.fromGroup !== '?') connectedGroups.add(conn.fromGroup);
        if (conn.toGroup !== '?') connectedGroups.add(conn.toGroup);
    }

    graphAnalysisResult = {
        totalLines: linesData.length,
        filteredLines: lines.length,
        totalPorts: allPorts.length,
        totalConnections: connections.length,
        directConnections: directCount,
        extendedConnections: extendedCount,
        templateConnections: templateConnections,
        totalGroups: Object.keys(groupsData).length,
        connectedGroups: connectedGroups.size,
        config: { ...GRAPH_CONFIG }
    };

    console.timeEnd('[Graph] 분석 v3');
    showGraphAnalysisResult();

    showGraphNodes = true;
    showGraphEdges = true;
    document.getElementById('toolShowGraph')?.classList.add('active');
    render();
}

// ============ 결과 표시 ============

function showGraphAnalysisResult() {
    const r = graphAnalysisResult;
    if (!r) return;
    if (r.error) { showToast(r.error, 'error'); return; }

    // 템플릿 간 연결
    let tplHtml = '';
    if (r.templateConnections.length > 0) {
        const tplItems = r.templateConnections.map(tc => {
            const detailStr = tc.details.slice(0, 5).map(d => {
                const extTag = d.isExtended ? ' <span style="color:#ff9800;">↝</span>' : '';
                return `<span style="color:#aaa; font-size:8px;">${d.fromEl} ↔ ${d.toEl}${extTag}</span>`;
            }).join('<br>');
            const moreText = tc.details.length > 5 ? `<span style="color:#666; font-size:8px;"> ... 외 ${tc.details.length - 5}개</span>` : '';
            return `<div style="background:rgba(255,255,255,0.04); padding:6px 8px; border-radius:4px; margin-bottom:3px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="color:#4fc3f7; font-weight:600; font-size:10px;">${tc.from}</span>
                    <span style="color:#ff9800; font-size:12px;">⇄</span>
                    <span style="color:#00ff88; font-weight:600; font-size:10px;">${tc.to}</span>
                    <span style="color:#666; font-size:8px; margin-left:auto;">${tc.details.length}개</span>
                </div>
                <div style="margin-top:2px; padding-left:8px; line-height:1.4;">${detailStr}${moreText}</div>
            </div>`;
        }).join('');
        tplHtml = `
            <div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                <h3 style="color:#ff9800; font-size:11px; margin:0 0 6px 0;">템플릿 간 연결 (${r.templateConnections.length}개)</h3>
                <div style="max-height:300px; overflow-y:auto;">${tplItems}</div>
            </div>
        `;
    }

    const html = `
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:10001;
            background:#1a1a2e; border:1px solid rgba(79,195,247,0.4); border-radius:10px;
            padding:20px; width:440px; max-height:80vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.6);">

            <h2 style="color:#4fc3f7; margin:0 0 14px 0; font-size:14px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
                그래프 분석 결과 (v3)
            </h2>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
                <div style="background:linear-gradient(135deg, rgba(79,195,247,0.15), rgba(79,195,247,0.05)); border:1px solid rgba(79,195,247,0.3); padding:10px; border-radius:6px; text-align:center;">
                    <div style="font-size:18px; color:#4fc3f7; font-weight:700;">${r.totalConnections}</div>
                    <div style="font-size:9px; color:#888;">포트 연결</div>
                </div>
                <div style="background:linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05)); border:1px solid rgba(0,255,136,0.3); padding:10px; border-radius:6px; text-align:center;">
                    <div style="font-size:18px; color:#00ff88; font-weight:700;">${r.templateConnections.length}</div>
                    <div style="font-size:9px; color:#888;">템플릿 간 연결</div>
                </div>
                <div style="background:linear-gradient(135deg, rgba(233,69,96,0.15), rgba(233,69,96,0.05)); border:1px solid rgba(233,69,96,0.3); padding:10px; border-radius:6px; text-align:center;">
                    <div style="font-size:14px; color:#e94560; font-weight:700;">${r.directConnections} + ${r.extendedConnections}<span style="font-size:9px; color:#ff9800;">↝</span></div>
                    <div style="font-size:9px; color:#888;">직접 + 연장</div>
                </div>
                <div style="background:linear-gradient(135deg, rgba(255,152,0,0.15), rgba(255,152,0,0.05)); border:1px solid rgba(255,152,0,0.3); padding:10px; border-radius:6px; text-align:center;">
                    <div style="font-size:18px; color:#ff9800; font-weight:700;">${r.connectedGroups}/${r.totalGroups}</div>
                    <div style="font-size:9px; color:#888;">연결된 그룹</div>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:10px; font-size:10px; color:#ccc; line-height:1.7;">
                <div style="display:flex; justify-content:space-between;"><span>원본 라인</span><span style="color:#fff;">${r.totalLines.toLocaleString()}개</span></div>
                <div style="display:flex; justify-content:space-between;"><span>필터링 라인</span><span style="color:#fff;">${r.filteredLines.toLocaleString()}개</span></div>
                <div style="display:flex; justify-content:space-between;"><span>포트/블록</span><span style="color:#00ff88;">${r.totalPorts}개</span></div>
                <div style="display:flex; justify-content:space-between;"><span>설정</span><span style="color:#888;">검색 ${r.config.portSearchRadius}px, 스냅 ${r.config.lineSnapThreshold}px, 연장 ${r.config.extensionMaxDist}px</span></div>
            </div>

            ${tplHtml}

            <div style="display:flex; gap:8px; margin-top:14px;">
                <button class="btn btn-primary" onclick="document.getElementById('graph-analysis-modal').remove();" style="flex:1; padding:8px; font-size:11px;">확인</button>
                <button class="btn" onclick="adjustGraphThreshold();" style="flex:1; padding:8px; font-size:11px; background:rgba(255,152,0,0.2); border:1px solid #ff9800; color:#ff9800;">설정 조정</button>
            </div>
        </div>
        <div onclick="document.getElementById('graph-analysis-modal').remove();" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000;"></div>
    `;

    document.getElementById('graph-analysis-modal')?.remove();
    const container = document.createElement('div');
    container.id = 'graph-analysis-modal';
    container.innerHTML = html;
    document.body.appendChild(container);
}

function adjustGraphThreshold() {
    const ps = prompt('포트 검색 반경 (현재: ' + GRAPH_CONFIG.portSearchRadius + 'px)', GRAPH_CONFIG.portSearchRadius);
    if (ps !== null) GRAPH_CONFIG.portSearchRadius = parseFloat(ps) || 15;

    const ls = prompt('라인 스냅 거리 (현재: ' + GRAPH_CONFIG.lineSnapThreshold + 'px)', GRAPH_CONFIG.lineSnapThreshold);
    if (ls !== null) GRAPH_CONFIG.lineSnapThreshold = parseFloat(ls) || 8;

    const ext = prompt('연장 최대 거리 (현재: ' + GRAPH_CONFIG.extensionMaxDist + 'px)', GRAPH_CONFIG.extensionMaxDist);
    if (ext !== null) GRAPH_CONFIG.extensionMaxDist = parseFloat(ext) || 300;

    document.getElementById('graph-analysis-modal')?.remove();
    analyzeGraph();
}

// ============ 캔버스 렌더링 ============

function drawGraphNodes() {
    if (!showGraphNodes || graphNodes.length === 0) return;

    const drawnElements = new Set();

    for (const port of graphNodes) {
        const key = port.name + '_' + Math.round(port.cx) + '_' + Math.round(port.cy);
        if (drawnElements.has(key)) continue;
        drawnElements.add(key);

        if (port.type === 'block' || port.type === 'BLOCK_TYPE') {
            ctx.fillStyle = 'rgba(233, 69, 96, 0.9)';
            ctx.strokeStyle = '#e94560';
        } else {
            ctx.fillStyle = 'rgba(0, 255, 136, 0.9)';
            ctx.strokeStyle = '#00ff88';
        }
        ctx.lineWidth = 1 / scale;
        ctx.beginPath();
        ctx.arc(port.cx, port.cy, 2.5 / scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

function drawGraphEdges() {
    if (!showGraphEdges || graphEdges.length === 0) return;

    for (const conn of graphEdges) {
        // 색상: 연장이면 주황, 직접이면 초록
        if (conn.isExtended) {
            ctx.strokeStyle = 'rgba(255, 152, 0, 0.8)';
            ctx.setLineDash([4 / scale, 3 / scale]);
        } else {
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.85)';
            ctx.setLineDash([]);
        }
        ctx.lineWidth = 2 / scale;

        if (conn.path && conn.path.length > 1) {
            ctx.beginPath();
            ctx.moveTo(conn.path[0].x, conn.path[0].y);
            for (let i = 1; i < conn.path.length; i++) {
                ctx.lineTo(conn.path[i].x, conn.path[i].y);
            }
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
}

function drawGraph() {
    if (!showGraphNodes && !showGraphEdges) return;
    drawGraphEdges();
    drawGraphNodes();
}

// ============ 토글 ============

function toggleGraphDisplay() {
    if (graphEdges.length === 0 && graphNodes.length === 0) {
        analyzeGraph();
        return;
    }
    showGraphNodes = !showGraphNodes;
    showGraphEdges = !showGraphEdges;
    document.getElementById('toolShowGraph')?.classList.toggle('active', showGraphNodes);
    render();
}

// ============================================================
// 자동 연결 분석 (벡터 라인 기반) - v5 알고리즘
// 포트 필터 + 라인 중심 추적 + SIGNAL/REF nearest + self-loop
// ============================================================

let autoConnectResults = [];

// 외부 연결 포트만 (내부 파라미터/피드백은 심볼사전에서 설명)
const _CONNECTABLE_PORTS = new Set([
    'OUT', 'IN1', 'IN2', 'IN',           // 범용 입출력
    'PV', 'STPT',                         // PID
    'FLAG', 'YES', 'NO',                  // T블록
    'MODE', 'AUTO', 'MRE', 'ARE',         // MODE
    'NUM', 'DEN', 'MV', 'Q',             // 기타
]);
// 제외: I(자기피드백), H/L(상하한), T/A/G/K/d/dt(내부파라미터)

// 같은 그룹 내 허용 패턴 (외부 연결 포트만이므로 self-loop 최소화)
const _SELF_LOOP_PATTERNS = new Set(['NO|OUT', 'OUT|YES']);

function _portOutScore(port) {
    const n = (port.name || '').toUpperCase();
    if (n === 'OUT' || n === 'MV' || n === 'AUTO' || n === 'MODE') return 2;
    if (n === 'YES' || n === 'NO' || n === 'Q' || n === 'TOUT' || n === 'DEVA') return 1;
    return 0;
}

function _ptToSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const ll = dx * dx + dy * dy;
    if (ll === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / ll));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function runAutoConnect() {
    console.time('[AutoConnect v5]');
    autoConnectResults = [];

    if (!vectorLinesData || vectorLinesData.length === 0) {
        showToast('벡터 라인 데이터가 없습니다. V 버튼으로 먼저 로드해주세요.', 'error');
        return;
    }
    if (!groupsData || Object.keys(groupsData).length === 0) {
        showToast('그룹 데이터가 없습니다. 먼저 템플릿을 적용해주세요.', 'error');
        return;
    }

    const CFG = {
        portSnap: 25, portOnLine: 12, chainSnap: 25,
        maxChain: 300, sigSearchRadius: 500, refSearchRadius: 400,
        selfLoopDist: 200, modeMatchDist: 200,
    };

    // 1. 포트 수집 (CONNECTABLE 필터 + REF/SIGNAL 센터)
    const allPorts = [];
    for (const [gn, gd] of Object.entries(groupsData)) {
        const gt = gd.type || '';
        const gports = gd.ports || [];
        if (gports.length > 0) {
            for (const p of gports) {
                const pn = p.name || '';
                if (!_CONNECTABLE_PORTS.has(pn.toUpperCase())) continue;
                allPorts.push({
                    id: `${gn}.${pn}`, name: pn,
                    cx: parseFloat(p.cx), cy: parseFloat(p.cy),
                    type: p.type || '', group: gn, gtype: gt,
                });
            }
            if (gt === 'REF_SIGNAL' || gt === 'SIGNAL') {
                allPorts.push({
                    id: `${gn}.${gn}`, name: gn,
                    cx: parseFloat(gd.cx || 0), cy: parseFloat(gd.cy || 0),
                    type: gt, group: gn, gtype: gt, isCenter: true,
                });
            }
        } else {
            allPorts.push({
                id: `${gn}.${gn}`, name: gn,
                cx: parseFloat(gd.cx || 0), cy: parseFloat(gd.cy || 0),
                type: gt, group: gn, gtype: gt,
            });
        }
    }
    console.log(`[AutoConnect v5] 포트: ${allPorts.length}개`);

    // 2. 벡터 라인 파싱
    const vlines = vectorLinesData.map((l, i) => ({
        idx: i, x1: parseFloat(l.x1), y1: parseFloat(l.y1),
        x2: parseFloat(l.x2), y2: parseFloat(l.y2),
    }));

    // 3. 포트 그리드
    const PCELL = 20;
    const pgrid = {};
    for (const p of allPorts) {
        const key = Math.floor(p.cx / PCELL) + ',' + Math.floor(p.cy / PCELL);
        if (!pgrid[key]) pgrid[key] = [];
        pgrid[key].push(p);
    }

    function findPortsAt(x, y, radius) {
        const r = Math.ceil(radius / PCELL);
        const gx = Math.floor(x / PCELL), gy = Math.floor(y / PCELL);
        const res = [];
        const seen = new Set();
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                for (const p of (pgrid[(gx + dx) + ',' + (gy + dy)] || [])) {
                    if (seen.has(p.id)) continue;
                    seen.add(p.id);
                    const d = Math.hypot(p.cx - x, p.cy - y);
                    if (d <= radius) res.push([p, d]);
                }
            }
        }
        res.sort((a, b) => a[1] - b[1]);
        return res;
    }

    function findPortsOnSeg(x1, y1, x2, y2, maxDist) {
        const xmin = Math.min(x1, x2) - maxDist, xmax = Math.max(x1, x2) + maxDist;
        const ymin = Math.min(y1, y2) - maxDist, ymax = Math.max(y1, y2) + maxDist;
        const gx1 = Math.floor(xmin / PCELL), gy1 = Math.floor(ymin / PCELL);
        const gx2 = Math.floor(xmax / PCELL), gy2 = Math.floor(ymax / PCELL);
        const res = [];
        const seen = new Set();
        for (let gx = gx1; gx <= gx2; gx++) {
            for (let gy = gy1; gy <= gy2; gy++) {
                for (const p of (pgrid[gx + ',' + gy] || [])) {
                    if (seen.has(p.id)) continue;
                    seen.add(p.id);
                    const d = _ptToSegDist(p.cx, p.cy, x1, y1, x2, y2);
                    if (d <= maxDist) res.push([p, d]);
                }
            }
        }
        res.sort((a, b) => a[1] - b[1]);
        return res;
    }

    // 4. 라인 끝점 그리드
    const LCELL = 20;
    const lgrid = {};
    for (let i = 0; i < vlines.length; i++) {
        const l = vlines[i];
        const k1 = Math.floor(l.x1 / LCELL) + ',' + Math.floor(l.y1 / LCELL);
        const k2 = Math.floor(l.x2 / LCELL) + ',' + Math.floor(l.y2 / LCELL);
        if (!lgrid[k1]) lgrid[k1] = [];
        lgrid[k1].push([i, 'p1']);
        if (!lgrid[k2]) lgrid[k2] = [];
        lgrid[k2].push([i, 'p2']);
    }

    function linesNear(x, y, radius) {
        const r = Math.ceil(radius / LCELL);
        const gx = Math.floor(x / LCELL), gy = Math.floor(y / LCELL);
        const res = [];
        const seen = new Set();
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                for (const [idx, end] of (lgrid[(gx + dx) + ',' + (gy + dy)] || [])) {
                    if (seen.has(idx)) continue;
                    seen.add(idx);
                    const l = vlines[idx];
                    const d1 = Math.hypot(l.x1 - x, l.y1 - y);
                    const d2 = Math.hypot(l.x2 - x, l.y2 - y);
                    if (d1 <= radius) res.push([idx, 'p1', d1]);
                    if (d2 <= radius) res.push([idx, 'p2', d2]);
                }
            }
        }
        res.sort((a, b) => a[2] - b[2]);
        return res;
    }

    // 5. 연결 관리
    const connections = [];
    const connKeys = new Set();

    const _OUT_PORTS = new Set(['OUT', 'YES', 'NO', 'MV', 'Q', 'AUTO', 'MAN', 'MODE', 'MRE', 'ARE']);
    const _IN_PORTS = new Set(['PV', 'STPT', 'IN1', 'IN2', 'IN3', 'IN4', 'IN', 'FLAG', 'NUM', 'DEN', 'I', 'H', 'L', 'SP']);

    function addConn(src, tgt, method, wps) {
        if (src.group === tgt.group) {
            const pair = [src.name.toUpperCase(), tgt.name.toUpperCase()].sort().join('|');
            if (!_SELF_LOOP_PATTERNS.has(pair)) return false;
        }
        // 출력↔출력 차단 (확실한 FP)
        const sn = src.name.toUpperCase(), tn = tgt.name.toUpperCase();
        if (sn === 'OUT' && tn === 'OUT') return false;
        // MODE↔NO/YES/OUT 차단 (MODE↔MODE는 유효하므로 허용)
        if (sn === 'MODE' && (tn === 'NO' || tn === 'YES' || tn === 'OUT')) return false;
        if (tn === 'MODE' && (sn === 'NO' || sn === 'YES' || sn === 'OUT')) return false;
        const dup = [src.id, tgt.id].sort().join('|');
        if (connKeys.has(dup)) return false;
        connKeys.add(dup);
        const s1 = _portOutScore(src), s2 = _portOutScore(tgt);
        const swap = s2 > s1;
        const fp = swap ? tgt : src;
        const tp = swap ? src : tgt;
        // waypoints: from→to 방향으로 정렬, swap 시 반전
        let finalWps = wps || [];
        if (swap && finalWps.length > 0) finalWps = [...finalWps].reverse();
        // from/to 근처 중복 제거
        finalWps = finalWps.filter(wp => {
            const dF = Math.hypot(wp.x - fp.cx, wp.y - fp.cy);
            const dT = Math.hypot(wp.x - tp.cx, wp.y - tp.cy);
            return dF > 5 && dT > 5;
        });
        connections.push({
            fromId: fp.id, fromName: fp.name, fromParent: fp.group,
            fromGroup: fp.group, fromCx: fp.cx, fromCy: fp.cy,
            toId: tp.id, toName: tp.name, toParent: tp.group,
            toGroup: tp.group, toCx: tp.cx, toCy: tp.cy,
            waypoints: finalWps, source: 'auto', method,
        });
        return true;
    }

    // 6. 라인 체인 추적 — {target, waypoints} 반환
    function traceChain(src, snapRadius) {
        if (!snapRadius) snapRadius = CFG.portSnap;
        let nearby = linesNear(src.cx, src.cy, snapRadius);
        if (nearby.length === 0) {
            for (let i = 0; i < vlines.length; i++) {
                const l = vlines[i];
                const d = _ptToSegDist(src.cx, src.cy, l.x1, l.y1, l.x2, l.y2);
                if (d <= CFG.portOnLine * 2) {
                    const d1 = Math.hypot(src.cx - l.x1, src.cy - l.y1);
                    const d2 = Math.hypot(src.cx - l.x2, src.cy - l.y2);
                    nearby.push([i, 'p1', d1]);
                    nearby.push([i, 'p2', d2]);
                }
            }
            nearby.sort((a, b) => a[2] - b[2]);
        }
        const excludeIds = new Set(allPorts.filter(p => p.group === src.group).map(p => p.id));

        // 가장 가까운 라인 1개만 추적 (정밀도 우선)
        for (let si = 0; si < Math.min(nearby.length, 1); si++) {
            const [startIdx, startEnd] = nearby[si];
            const used = new Set([startIdx]);
            const l = vlines[startIdx];
            const path = [];  // 중간 경유점만 (src/tgt 근처는 addConn에서 제거)

            // 첫 라인: 반대쪽 끝점만 기록 (시작 끝점은 src 근처이므로 생략)
            let cx = startEnd === 'p1' ? l.x2 : l.x1;
            let cy = startEnd === 'p1' ? l.y2 : l.y1;

            // 첫 라인 위 포트
            const onSeg = findPortsOnSeg(l.x1, l.y1, l.x2, l.y2, CFG.portOnLine);
            for (const [p] of onSeg) {
                if (!excludeIds.has(p.id)) return { target: p, waypoints: [] };
            }

            path.push({ x: cx, y: cy });

            for (let depth = 0; depth < CFG.maxChain; depth++) {
                const endPorts = findPortsAt(cx, cy, CFG.portSnap);
                const filtered = endPorts.filter(([p]) => !excludeIds.has(p.id));
                if (filtered.length > 0) return { target: filtered[0][0], waypoints: path };

                const nextLines = linesNear(cx, cy, CFG.chainSnap);
                let foundNext = false;
                for (const [nlIdx, nlEnd] of nextLines) {
                    if (used.has(nlIdx)) continue;
                    used.add(nlIdx);
                    const nl = vlines[nlIdx];
                    const onSeg2 = findPortsOnSeg(nl.x1, nl.y1, nl.x2, nl.y2, CFG.portOnLine);
                    for (const [p] of onSeg2) {
                        if (!excludeIds.has(p.id)) return { target: p, waypoints: path };
                    }
                    cx = nlEnd === 'p1' ? nl.x2 : nl.x1;
                    cy = nlEnd === 'p1' ? nl.y2 : nl.y1;
                    path.push({ x: cx, y: cy });
                    foundNext = true;
                    break;
                }
                if (!foundNext) break;
            }
        }
        return null;
    }

    // ===== 7. 모든 포트에서 추적 + 블록쌍 중복제거 (OUT 우선) =====
    const normalPorts = allPorts.filter(p => !p.isCenter);

    // 1차: 모든 포트에서 추적
    const traceResults = [];
    for (const src of normalPorts) {
        const result = traceChain(src);
        if (result) traceResults.push({ src, target: result.target, wps: result.waypoints });
    }

    // 2차: OUT(score 2) 우선 정렬 → 블록쌍당 1개만
    traceResults.sort((a, b) => _portOutScore(b.src) - _portOutScore(a.src));
    const blockPairUsed = new Set();
    for (const tr of traceResults) {
        const pairKey = [tr.src.group, tr.target.group].sort().join('|');
        if (blockPairUsed.has(pairKey)) continue;
        if (addConn(tr.src, tr.target, 'line_trace', tr.wps)) {
            blockPairUsed.add(pairKey);
        }
    }

    // ===== 8. SIGNAL 센터 → PV 우선 nearest =====
    const centerPorts = allPorts.filter(p => p.isCenter);
    for (const cp of centerPorts) {
        if (cp.gtype === 'SIGNAL') {
            // 라인 추적 먼저
            const result = traceChain(cp, CFG.portSnap * 2);
            if (result) { addConn(cp, result.target, 'sig_trace', result.waypoints); continue; }
            // PV 우선 nearest (waypoints 없음)
            const pvPorts = [], otherPorts = [];
            for (const p of normalPorts) {
                if (p.group === cp.group || p.isCenter) continue;
                const dd = Math.hypot(p.cx - cp.cx, p.cy - cp.cy);
                if (dd >= CFG.sigSearchRadius) continue;
                const pn = p.name.toUpperCase();
                if (pn === 'PV') pvPorts.push([p, dd]);
                else if (['NUM', 'DEN', 'IN1', 'IN2'].includes(pn)) otherPorts.push([p, dd]);
            }
            const cands = pvPorts.sort((a, b) => a[1] - b[1]);
            if (cands.length === 0) cands.push(...otherPorts.sort((a, b) => a[1] - b[1]));
            if (cands.length > 0) addConn(cp, cands[0][0], 'sig_nearest');
        } else if (cp.gtype === 'REF_SIGNAL') {
            // REF: 라인 추적만 (nearest 제거 — FP 방지)
            const result = traceChain(cp, CFG.portSnap * 2);
            if (result) addConn(cp, result.target, 'ref_trace', result.waypoints);
        }
    }

    // ===== 9. 내부 self-loop 제거 (심볼사전에서 설명) =====
    // ALG OUT→I, OCB OUT→YES 등은 블록 내부 동작 → autoConnect 대상 아님
    const groupsMap = {};
    for (const p of allPorts) {
        if (!groupsMap[p.group]) groupsMap[p.group] = [];
        groupsMap[p.group].push(p);
    }

    for (const [gn, gports] of Object.entries(groupsMap)) {
        const pm = {};
        for (const p of gports) pm[p.name.toUpperCase()] = p;
    }

    // ===== 10. MODE 매칭 =====
    for (const [gn, gports] of Object.entries(groupsMap)) {
        const pm = {};
        for (const p of gports) pm[p.name.toUpperCase()] = p;
        if (!pm.MODE) continue;
        const modeP = pm.MODE;
        let best = null, bestD = CFG.modeMatchDist;
        for (const p2 of allPorts) {
            if (p2.group === gn) continue;
            if (p2.name.toUpperCase() === 'MODE') {
                const dd = Math.hypot(modeP.cx - p2.cx, modeP.cy - p2.cy);
                if (dd < bestD) { bestD = dd; best = p2; }
            }
        }
        if (best) addConn(modeP, best, 'mode_match');
    }

    autoConnectResults = connections;
    console.timeEnd('[AutoConnect v5]');
    console.log(`[AutoConnect v5] 완료: ${connections.length}개 연결`);

    updateAutoConnectUI(vlines.length, normalPorts.length, connections.length, allPorts.length);
    if (showVectorLines) render();
}

function updateAutoConnectUI(lineCount, outPortCount, connCount, totalPortCount) {
    document.getElementById('autoconnect-stats').style.display = 'block';
    document.getElementById('ac-line-count').textContent = lineCount;
    document.getElementById('ac-chain-count').textContent = `${outPortCount} (전체)`;
    document.getElementById('ac-conn-count').textContent = connCount;
    document.getElementById('ac-match-rate').textContent =
        outPortCount > 0 ? Math.round(connCount / outPortCount * 100) + '%' : '0%';

    document.getElementById('autoconnect-apply').style.display =
        connCount > 0 ? 'block' : 'none';

    const listEl = document.getElementById('autoconnect-list');
    if (connCount === 0) {
        listEl.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-muted);">연결을 찾지 못했습니다.</div>';
        return;
    }

    let html = '';
    for (const c of autoConnectResults) {
        const fromLabel = c.fromParent ? `${c.fromParent}.${c.fromName}` : c.fromName;
        const toLabel = c.toParent ? `${c.toParent}.${c.toName}` : c.toName;
        html += `<div style="padding:4px 6px; border-bottom:1px solid var(--border-color); cursor:pointer; display:flex; justify-content:space-between; gap:4px; font-size:10px;"
                      onclick="panToConnection(${c.fromCx}, ${c.fromCy}, ${c.toCx}, ${c.toCy})">
            <span style="color:#4caf50; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${fromLabel}</span>
            <span style="color:var(--text-muted);">→</span>
            <span style="color:#ff9800; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right;">${toLabel}</span>
        </div>`;
    }
    listEl.innerHTML = html;
}

function panToConnection(x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    viewX = canvas.width / 2 - cx * scale;
    viewY = canvas.height / 2 - cy * scale;
    render();
}

function applyAutoConnections() {
    if (autoConnectResults.length === 0) return;

    let added = 0;
    for (const conn of autoConnectResults) {
        const exists = customConnections.some(c =>
            (c.fromId === conn.fromId && c.toId === conn.toId) ||
            (c.fromId === conn.toId && c.toId === conn.fromId)
        );
        if (!exists) {
            customConnections.push(conn);
            added++;
        }
    }

    updateConnectionList();
    updateStats();
    updateAppliedConnectionsList();
    isEdited = true;
    updateEditedIndicator();
    render();
    showToast(`${added}개 연결이 추가되었습니다. (중복 제외)`, 'success');
}

function clearAutoConnect() {
    autoConnectResults = [];
    document.getElementById('autoconnect-stats').style.display = 'none';
    document.getElementById('autoconnect-apply').style.display = 'none';
    document.getElementById('autoconnect-list').innerHTML = '분석을 실행해주세요.';
    render();
}

function updateAppliedConnectionsList() {
    const listEl = document.getElementById('applied-connections-list');
    const countEl = document.getElementById('ac-applied-count');
    if (!listEl) return;

    const conns = customConnections || [];
    if (countEl) countEl.textContent = conns.length;

    if (conns.length === 0) {
        listEl.innerHTML = '<span style="padding:6px; display:block; color:var(--text-muted);">연결 없음</span>';
        return;
    }

    let html = '';
    for (const c of conns) {
        html += `<div style="padding:3px 6px; border-bottom:1px solid var(--border-color); cursor:pointer; display:flex; justify-content:space-between; gap:4px;"
                      onclick="panToConnection(${c.fromCx}, ${c.fromCy}, ${c.toCx}, ${c.toCy})">
            <span style="color:#00e676; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.fromName || '?'}</span>
            <span style="color:var(--text-muted);">→</span>
            <span style="color:#ff9800; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right;">${c.toName || '?'}</span>
        </div>`;
    }
    listEl.innerHTML = html;
}
