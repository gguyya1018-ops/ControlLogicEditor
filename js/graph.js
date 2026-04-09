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
// 자동 연결 분석 (벡터 라인 기반) - OUT 포트 추적 방식
// ============================================================

let autoConnectResults = [];

// 포트 출력 점수: 높을수록 출력(from) 역할
function _portOutScore(port) {
    const n = port.name.toUpperCase();
    const g = (port.groupName || '').toUpperCase();
    if (n === 'OUT') return 10;
    // MODE 블록의 출력 포트들
    if (g.startsWith('MODE') || g.startsWith('M/A')) {
        if (['MODE','AUTO','MAN','NO'].includes(n)) return 8;
    }
    return 0;
}

function runAutoConnect() {
    console.log('[AutoConnect] 분석 시작 - OUT 포트 추적 방식');
    autoConnectResults = [];

    if (!vectorLinesData || vectorLinesData.length === 0) {
        showToast('벡터 라인 데이터가 없습니다. V 버튼으로 먼저 로드해주세요.', 'error');
        return;
    }

    // 그룹화 여부 확인
    const assignedPorts = ports.filter(p => p.parent);
    if (assignedPorts.length === 0) {
        showToast('포트가 블록에 할당되지 않았습니다. 먼저 템플릿을 적용해주세요.', 'error');
        return;
    }

    // 1. 모든 포트 수집 (그룹 포트 + 독립 포트)
    const allPorts = [];
    const addedKeys = new Set();

    // 그룹 내 포트
    for (const [groupId, group] of Object.entries(groupsData)) {
        if (!group.ports) continue;
        for (const port of group.ports) {
            const cx = parseFloat(port.cx), cy = parseFloat(port.cy);
            const key = `${Math.round(cx)}_${Math.round(cy)}`;
            if (addedKeys.has(key)) continue;
            addedKeys.add(key);
            allPorts.push({
                id: port.id || `PORT_${cx}_${cy}`,
                name: port.name || port.text || '',
                cx, cy,
                groupId: groupId,
                groupName: group.name || groupId,
                parent: groupId,
                role: port.role || ''
            });
        }
    }

    // 독립 포트 (전역 ports 배열에서 그룹에 없는 것)
    if (typeof ports !== 'undefined' && Array.isArray(ports)) {
        for (const port of ports) {
            const cx = parseFloat(port.cx), cy = parseFloat(port.cy);
            const key = `${Math.round(cx)}_${Math.round(cy)}`;
            if (addedKeys.has(key)) continue;
            addedKeys.add(key);
            allPorts.push({
                id: port.id || `PORT_${cx}_${cy}`,
                name: port.name || port.text || '',
                cx, cy,
                groupId: `independent_${cx}_${cy}`,
                groupName: port.name || 'independent',
                parent: null,
                role: port.role || ''
            });
        }
    }

    // SIGNAL/REF_SIGNAL (전역 allElements에서 신호명 추가)
    if (typeof allElements !== 'undefined' && Array.isArray(allElements)) {
        for (const elem of allElements) {
            if (elem.type !== 'SIGNAL' && elem.type !== 'REF_SIGNAL') continue;
            const cx = parseFloat(elem.cx), cy = parseFloat(elem.cy);
            const key = `${Math.round(cx)}_${Math.round(cy)}`;
            if (addedKeys.has(key)) continue;
            addedKeys.add(key);
            allPorts.push({
                id: elem.id || `SIG_${cx}_${cy}`,
                name: elem.name || elem.text || '',
                cx, cy,
                groupId: `signal_${cx}_${cy}`,
                groupName: elem.name || 'signal',
                parent: null,
                role: 'signal'
            });
        }
    }

    // 모든 포트에서 시작, 연결 생성 시 방향 정규화 (OUT쪽이 from)
    const startPorts = allPorts;
    console.log(`[AutoConnect] 전체 포트: ${allPorts.length}, 출발 포트: ${startPorts.length}`);

    // 2. 벡터 라인 파싱
    const lines = vectorLinesData.map((l, i) => ({
        idx: i,
        x1: parseFloat(l.x1), y1: parseFloat(l.y1),
        x2: parseFloat(l.x2), y2: parseFloat(l.y2)
    }));

    // 3. 라인 끝점 그리드 인덱스
    const CELL = 20;
    const endpointGrid = {};
    for (const line of lines) {
        for (const [px, py] of [[line.x1, line.y1], [line.x2, line.y2]]) {
            const key = `${Math.floor(px / CELL)}_${Math.floor(py / CELL)}`;
            if (!endpointGrid[key]) endpointGrid[key] = [];
            endpointGrid[key].push(line);
        }
    }

    // 4. 포트 그리드 인덱스 (OUT 제외한 모든 포트)
    const PORT_CELL = 30;
    const portGrid = {};
    for (const port of allPorts) {
        const key = `${Math.floor(port.cx / PORT_CELL)}_${Math.floor(port.cy / PORT_CELL)}`;
        if (!portGrid[key]) portGrid[key] = [];
        portGrid[key].push(port);
    }

    function findNearbyPort(px, py, excludeGroupId, radius) {
        let best = null, bestDist = radius;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const key = `${Math.floor(px / PORT_CELL) + dx}_${Math.floor(py / PORT_CELL) + dy}`;
                for (const port of (portGrid[key] || [])) {
                    if (port.groupId === excludeGroupId) continue;
                    const d = Math.hypot(port.cx - px, port.cy - py);
                    if (d < bestDist) {
                        bestDist = d;
                        best = port;
                    }
                }
            }
        }
        return best;
    }

    // 5. 라인 검색 함수
    const SNAP_RADIUS = 22;  // 포트좌표~라인끝점 허용거리 (테스트 최적값)
    const PORT_MATCH_RADIUS = 22;  // 포트 매칭 반경
    // vlines 사용 시 대각선도 유효한 연결선이므로 필터 완화
    const MIN_LINE_LEN = 3;   // 최소 라인 길이 (vlines는 깨끗)
    const DIAG_THRESHOLD = 999; // 대각선 필터 비활성화
    const shortLineSet = new Set();
    for (const line of lines) {
        const len = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
        if (len < MIN_LINE_LEN) {
            const adx = Math.abs(line.x2 - line.x1);
            const ady = Math.abs(line.y2 - line.y1);
            if (adx > DIAG_THRESHOLD && ady > DIAG_THRESHOLD) {
                shortLineSet.add(line.idx);
            }
        }
    }

    function findLinesNear(px, py, excludeIdxSet) {
        const results = [];
        const searchRange = Math.ceil(SNAP_RADIUS / CELL);
        for (let dx = -searchRange; dx <= searchRange; dx++) {
            for (let dy = -searchRange; dy <= searchRange; dy++) {
                const key = `${Math.floor(px / CELL) + dx}_${Math.floor(py / CELL) + dy}`;
                for (const line of (endpointGrid[key] || [])) {
                    if (excludeIdxSet.has(line.idx)) continue;
                    if (shortLineSet.has(line.idx)) continue;  // 짧은 라인 스킵
                    const d1 = Math.hypot(line.x1 - px, line.y1 - py);
                    const d2 = Math.hypot(line.x2 - px, line.y2 - py);
                    if (d1 <= SNAP_RADIUS) results.push({ line, nearEnd: 'p1', farX: line.x2, farY: line.y2, dist: d1 });
                    else if (d2 <= SNAP_RADIUS) results.push({ line, nearEnd: 'p2', farX: line.x1, farY: line.y1, dist: d2 });
                }
            }
        }
        results.sort((a, b) => a.dist - b.dist);
        return results;
    }

    // 6. 모든 포트에서 라인 추적
    const connections = [];
    const connKeys = new Set();

    for (const srcPort of startPorts) {
        const usedLines = new Set();
        const waypoints = [];
        let cx = srcPort.cx, cy = srcPort.cy;

        for (let depth = 0; depth < 300; depth++) {
            const nearby = findLinesNear(cx, cy, usedLines);
            if (nearby.length === 0) break;

            const best = nearby[0];
            usedLines.add(best.line.idx);
            waypoints.push({ x: cx, y: cy });

            cx = best.farX;
            cy = best.farY;

            let targetPort = findNearbyPort(cx, cy, srcPort.groupId, PORT_MATCH_RADIUS);

            // 특수 매핑: MODE 블록 → ALG 블록 영역이면 ALG의 MODE 포트로 연결
            if (!targetPort) {
                const srcGroupUp = (srcPort.groupName || '').toUpperCase();
                if (srcGroupUp.startsWith('MODE')) {
                    // 라인 끝점이 ALG 그룹 영역 안에 있는지 확인
                    for (const [gId, g] of Object.entries(groupsData)) {
                        const gName = (g.name || gId).toUpperCase();
                        if (!gName.startsWith('ALG')) continue;
                        if (!g.ports) continue;
                        // 그룹 바운딩박스 계산
                        const pxs = g.ports.map(p => parseFloat(p.cx));
                        const pys = g.ports.map(p => parseFloat(p.cy));
                        const margin = 50;
                        if (cx >= Math.min(...pxs) - margin && cx <= Math.max(...pxs) + margin &&
                            cy >= Math.min(...pys) - margin && cy <= Math.max(...pys) + margin) {
                            // ALG의 MODE 포트 찾기
                            const modePort = g.ports.find(p => p.name && p.name.toUpperCase() === 'MODE');
                            if (modePort) {
                                targetPort = allPorts.find(ap =>
                                    Math.abs(ap.cx - parseFloat(modePort.cx)) < 3 &&
                                    Math.abs(ap.cy - parseFloat(modePort.cy)) < 3
                                );
                                if (targetPort) {
                                    console.log(`[AutoConnect] MODE→ALG 자동매핑: ${srcPort.groupName}.MODE → ${gName}.MODE`);
                                }
                            }
                            break;
                        }
                    }
                }
            }

            if (targetPort) {
                // 양쪽 다 입력포트이고 둘 다 일반 포트(SIGNAL 아님)이면 스킵
                const srcScore = _portOutScore(srcPort);
                const tgtScore = _portOutScore(targetPort);
                const srcIsSig = srcPort.type === 'SIGNAL' || srcPort.type === 'REF_SIGNAL';
                const tgtIsSig = targetPort.type === 'SIGNAL' || targetPort.type === 'REF_SIGNAL';
                if (srcScore === 0 && tgtScore === 0 && !srcIsSig && !tgtIsSig) break;

                const dupKey = [srcPort.id, targetPort.id].sort().join('|');
                if (!connKeys.has(dupKey)) {
                    connKeys.add(dupKey);
                    waypoints.push({ x: cx, y: cy });
                    const swap = tgtScore > srcScore;
                    const fPort = swap ? targetPort : srcPort;
                    const tPort = swap ? srcPort : targetPort;
                    // waypoints 정리: from/to 근처 중복 제거
                    let rawWps = swap ? [...waypoints].reverse() : [...waypoints];
                    const wps = rawWps.filter(wp => {
                        const dFrom = Math.hypot(wp.x - fPort.cx, wp.y - fPort.cy);
                        const dTo = Math.hypot(wp.x - tPort.cx, wp.y - tPort.cy);
                        return dFrom > 5 && dTo > 5;
                    });
                    connections.push({
                        fromId: fPort.id,
                        fromName: fPort.name,
                        fromParent: fPort.parent,
                        fromGroup: fPort.groupName || fPort.parent || '',
                        fromCx: fPort.cx,
                        fromCy: fPort.cy,
                        toId: tPort.id,
                        toName: tPort.name,
                        toParent: tPort.parent,
                        toGroup: tPort.groupName || tPort.parent || '',
                        toCx: tPort.cx,
                        toCy: tPort.cy,
                        waypoints: wps,
                        source: 'auto'
                    });
                    console.log(`[AutoConnect] ${srcPort.groupName}.${srcPort.name} → ${targetPort.groupName}.${targetPort.name} (${usedLines.size} lines)`);
                }
                break;
            }
        }
    }

    autoConnectResults = connections;
    console.log(`[AutoConnect] 완료: ${connections.length}개 연결 발견 (포트 ${startPorts.length}개 중)`);

    updateAutoConnectUI(lines.length, startPorts.length, connections.length, allPorts.length);
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
