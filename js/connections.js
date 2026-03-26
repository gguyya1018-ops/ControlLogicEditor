/**
 * connections.js - 연결선 관리
 * 연결 생성, 삭제, 자동 연결, Junction 등
 */

// ============ 연결 삭제 ============

function deleteConnection(index) {
    if (index < 0 || index >= customConnections.length) return;

    customConnections.splice(index, 1);
    selectedElement = null;
    updateConnectionList();
    updateStats();
    markAsEdited();
    render();
}

function deleteAutoConnection(index) {
    if (index < 0 || index >= customConnections.length) return;
    if (customConnections[index].source !== 'auto') return;

    customConnections.splice(index, 1);
    selectedElement = null;
    updateConnectionList();
    updateStats();
    markAsEdited();
    render();
}

async function clearAllConnections() {
    if (!(await showConfirm('모든 연결선을 삭제하시겠습니까?', { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    customConnections = [];
    updateConnectionList();
    updateStats();
    markAsEdited();
    render();
}

// ============ Junction 생성 ============

function createJunction(worldX, worldY, connIdx) {
    const conn = customConnections[connIdx];
    const segments = getConnectionSegments(conn);

    let clickedSegIdx = -1;
    let minDist = Infinity;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const dist = pointToLineDistance(worldX, worldY, seg.x1, seg.y1, seg.x2, seg.y2);
        if (dist < minDist) {
            minDist = dist;
            clickedSegIdx = i;
        }
    }

    if (clickedSegIdx < 0 || minDist > 30) return null;

    const seg = segments[clickedSegIdx];
    const snapPoint = projectPointToLine(worldX, worldY, seg.x1, seg.y1, seg.x2, seg.y2);

    const junction = {
        id: 'junction_' + Date.now(),
        name: 'J' + (ports.filter(p => p.type === 'JUNCTION').length + 1),
        type: 'JUNCTION',
        cx: snapPoint.x,
        cy: snapPoint.y,
        x1: snapPoint.x - 8,
        y1: snapPoint.y - 8,
        x2: snapPoint.x + 8,
        y2: snapPoint.y + 8,
        parent: null
    };
    ports.push(junction);
    allElements.push(junction);

    const connFromX = conn.fromCx ?? conn.fromX;
    const connFromY = conn.fromCy ?? conn.fromY;
    const connToX = conn.toCx ?? conn.toX;
    const connToY = conn.toCy ?? conn.toY;

    const waypoints = conn.waypoints || [];
    const waypointsBefore = waypoints.slice(0, clickedSegIdx);
    const waypointsAfter = waypoints.slice(clickedSegIdx);

    const conn1 = {
        fromId: conn.fromId,
        fromName: conn.fromName,
        fromParent: conn.fromParent,
        fromCx: connFromX,
        fromCy: connFromY,
        toId: junction.id,
        toName: junction.name,
        toParent: null,
        toCx: junction.cx,
        toCy: junction.cy,
        waypoints: [...waypointsBefore]
    };

    const conn2 = {
        fromId: junction.id,
        fromName: junction.name,
        fromParent: null,
        fromCx: junction.cx,
        fromCy: junction.cy,
        toId: conn.toId,
        toName: conn.toName,
        toParent: conn.toParent,
        toCx: connToX,
        toCy: connToY,
        waypoints: [...waypointsAfter]
    };

    customConnections.splice(connIdx, 1, conn1, conn2);

    updateConnectionList();
    updateStats();
    markAsEdited();
    render();

    return junction;
}

// ============ 연결 위치 찾기 ============

function findConnectionAtPos(worldX, worldY) {
    for (let i = 0; i < customConnections.length; i++) {
        const segments = getConnectionSegments(customConnections[i]);
        for (const seg of segments) {
            const dist = pointToLineDistance(worldX, worldY, seg.x1, seg.y1, seg.x2, seg.y2);
            if (dist < 15) {
                return { connIdx: i, segment: seg };
            }
        }
    }
    return null;
}

// ============ 라인 인덱스 구축 ============

function buildLineIndex() {
    if (!linesData || linesData.length === 0) {
        lineIndex = null;
        return;
    }

    lineIndex = {};

    for (let i = 0; i < linesData.length; i++) {
        const line = linesData[i];
        const x1 = parseFloat(line.x1);
        const y1 = parseFloat(line.y1);
        const x2 = parseFloat(line.x2);
        const y2 = parseFloat(line.y2);

        const minCellX = Math.floor(Math.min(x1, x2) / LINE_GRID_SIZE);
        const maxCellX = Math.floor(Math.max(x1, x2) / LINE_GRID_SIZE);
        const minCellY = Math.floor(Math.min(y1, y2) / LINE_GRID_SIZE);
        const maxCellY = Math.floor(Math.max(y1, y2) / LINE_GRID_SIZE);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                const key = `${cx},${cy}`;
                if (!lineIndex[key]) lineIndex[key] = [];
                lineIndex[key].push({ x1, y1, x2, y2, index: i });
            }
        }
    }

    console.log('Line index built:', Object.keys(lineIndex).length, 'cells');
}

// ============ 라인 근처 찾기 ============

function findLinesNearPoint(x, y, tolerance = 15) {
    if (!lineIndex) return [];

    const results = [];
    const cellX = Math.floor(x / LINE_GRID_SIZE);
    const cellY = Math.floor(y / LINE_GRID_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = `${cellX + dx},${cellY + dy}`;
            const lines = lineIndex[key];
            if (!lines) continue;

            for (const line of lines) {
                const dist = pointToLineDistance(x, y, line.x1, line.y1, line.x2, line.y2);
                if (dist <= tolerance) {
                    results.push({ ...line, distance: dist });
                }
            }
        }
    }

    return results.sort((a, b) => a.distance - b.distance);
}

// ============ 자동 연결 ============

function autoConnectAll() {
    if (connectionCandidates.length === 0) {
        showToast('연결 후보가 없습니다.', 'info');
        return;
    }

    let createdCount = 0;

    for (const candidate of connectionCandidates) {
        if (candidate.dismissed || candidate.confirmed) continue;

        const from = candidate.fromElement;
        const to = candidate.toElement;

        if (!from || !to) continue;

        const isDuplicate = customConnections.some(c =>
            c.fromId === from.id && c.toId === to.id
        );

        if (!isDuplicate) {
            customConnections.push({
                fromId: from.id,
                fromName: from.name,
                fromParent: from.parent || null,
                fromCx: from.cx,
                fromCy: from.cy,
                toId: to.id,
                toName: to.name,
                toParent: to.parent || null,
                toCx: to.cx,
                toCy: to.cy,
                waypoints: candidate.waypoints || []
            });
            createdCount++;
        }
    }

    connectionCandidates = [];

    if (createdCount > 0) {
        updateConnectionList();
        updateStats();
        markAsEdited();
        render();
    }

    showToast(`${createdCount}개 연결이 생성되었습니다.`, 'success');
}

// ============ 연결 후보 관리 ============

function confirmConnection(index) {
    if (index < 0 || index >= connectionCandidates.length) return;

    const candidate = connectionCandidates[index];
    candidate.confirmed = true;

    const from = candidate.fromElement;
    const to = candidate.toElement;

    if (from && to) {
        // fromPort가 있으면 해당 포트 위치 사용
        let fromCx = from.cx, fromCy = from.cy;
        if (candidate.fromPort) {
            const groupName = from.name || from.id;
            const group = groupsData[groupName];
            if (group && group.ports) {
                const port = group.ports.find(p => (p.name || p.customName) === candidate.fromPort);
                if (port) {
                    fromCx = port.cx || (from.cx + (port.dx || 0));
                    fromCy = port.cy || (from.cy + (port.dy || 0));
                    console.log(`[confirmConnection] fromPort '${candidate.fromPort}' found at (${fromCx}, ${fromCy})`);
                } else {
                    console.log(`[confirmConnection] fromPort '${candidate.fromPort}' NOT found in group '${groupName}'`);
                }
            }
        }

        // toElement가 그룹인지 확인하고 처리
        let toCx = to.cx, toCy = to.cy;
        let toName = to.name;
        let toId = to.id;

        // to가 포트이고 parent가 있으면 (그룹에 속한 포트)
        if (to.parent && groupsData[to.parent]) {
            // 포트의 위치를 직접 사용
            toCx = to.cx;
            toCy = to.cy;
            console.log(`[confirmConnection] toElement is port '${to.name}' in group '${to.parent}' at (${toCx}, ${toCy})`);
        } else if (candidate.toPort) {
            // toPort가 지정된 경우 그룹에서 포트 찾기
            const groupName = to.name || to.id;
            const group = groupsData[groupName];
            if (group && group.ports) {
                const port = group.ports.find(p => (p.name || p.customName) === candidate.toPort);
                if (port) {
                    toCx = port.cx || (to.cx + (port.dx || 0));
                    toCy = port.cy || (to.cy + (port.dy || 0));
                    console.log(`[confirmConnection] toPort '${candidate.toPort}' found at (${toCx}, ${toCy})`);
                }
            }
        }

        console.log(`[confirmConnection] Creating connection: (${fromCx}, ${fromCy}) -> (${toCx}, ${toCy})`);

        customConnections.push({
            fromId: from.id,
            fromName: from.name,
            fromParent: from.parent || null,
            fromCx: fromCx,
            fromCy: fromCy,
            fromPort: candidate.fromPort || null,
            toId: toId,
            toName: toName,
            toParent: to.parent || null,
            toCx: toCx,
            toCy: toCy,
            toPort: candidate.toPort || to.name,
            waypoints: candidate.path || []
        });

        updateConnectionList();
        updateStats();
        markAsEdited();
    }

    // 모든 후보가 처리되었으면 배열 비우기
    const pendingCount = connectionCandidates.filter(c => !c.confirmed && !c.dismissed).length;
    if (pendingCount === 0) {
        connectionCandidates = [];
    }

    displayConnectionCandidates();
    render();
}

function dismissConnection(index) {
    if (index < 0 || index >= connectionCandidates.length) return;
    connectionCandidates[index].dismissed = true;

    // 모든 후보가 처리되었으면 배열 비우기
    const pendingCount = connectionCandidates.filter(c => !c.confirmed && !c.dismissed).length;
    if (pendingCount === 0) {
        connectionCandidates = [];
    }

    displayConnectionCandidates();
    render();
}

function dismissAllConnections() {
    for (let i = 0; i < connectionCandidates.length; i++) {
        if (!connectionCandidates[i].confirmed) {
            connectionCandidates[i].dismissed = true;
        }
    }
    // 모두 취소 후 배열 비우기
    connectionCandidates = [];
    displayConnectionCandidates();
    render();
}

function confirmAllConnections() {
    let count = 0;
    for (let i = 0; i < connectionCandidates.length; i++) {
        if (!connectionCandidates[i].dismissed && !connectionCandidates[i].confirmed) {
            confirmConnection(i);
            count++;
        }
    }
    showToast(`${count}개 연결이 확정되었습니다.`, 'success');
}

function clearConnectionCandidates() {
    connectionCandidates = [];
    render();
}

// ============ 라인 추적 ============

function traceLineToElement(startX, startY, startElement, maxDepth = 30, excludeGroup = null) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, depth: 0, path: [] }];
    const tolerance = 15;

    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${Math.round(current.x)},${Math.round(current.y)}`;

        if (visited.has(key) || current.depth > maxDepth) continue;
        visited.add(key);

        // 요소 찾기
        const elem = findElementNearPoint(current.x, current.y, startElement, tolerance, excludeGroup);
        if (elem) {
            return {
                element: elem,
                path: current.path,
                depth: current.depth
            };
        }

        // 연결된 라인 찾기
        const nearLines = findLinesNearPoint(current.x, current.y, tolerance);
        for (const line of nearLines) {
            const lineKey = `${line.index}`;
            if (visited.has(lineKey)) continue;
            visited.add(lineKey);

            // 라인 끝점으로 이동
            const dist1 = Math.hypot(line.x1 - current.x, line.y1 - current.y);
            const dist2 = Math.hypot(line.x2 - current.x, line.y2 - current.y);

            if (dist1 > tolerance) {
                queue.push({
                    x: line.x1,
                    y: line.y1,
                    depth: current.depth + 1,
                    path: [...current.path, { x: line.x1, y: line.y1 }]
                });
            }
            if (dist2 > tolerance) {
                queue.push({
                    x: line.x2,
                    y: line.y2,
                    depth: current.depth + 1,
                    path: [...current.path, { x: line.x2, y: line.y2 }]
                });
            }
        }
    }

    return null;
}

function findElementNearPoint(x, y, excludeElement = null, tolerance = 20, excludeGroup = null) {
    for (const port of ports) {
        if (port === excludeElement) continue;
        if (excludeGroup && port.parent === excludeGroup) continue;

        const dist = Math.hypot(port.cx - x, port.cy - y);
        if (dist <= tolerance) return port;
    }

    for (const block of blocks) {
        if (block === excludeElement) continue;
        if (excludeGroup && block.name === excludeGroup) continue;

        const dist = Math.hypot(block.cx - x, block.cy - y);
        if (dist <= tolerance) return block;
    }

    return null;
}

// ============ 포트 방향 판단 ============

function isOutputPort(portName) {
    if (!portName) return false;
    const outPatterns = ['OUT', 'OTE', 'OTL', 'OTU', 'MV', 'AO', 'DO', 'G', 'YES', 'NO'];
    const upperName = portName.toUpperCase();
    return outPatterns.some(p => upperName.startsWith(p) || upperName === p);
}

function isInputPort(portName) {
    if (!portName) return false;
    const inPatterns = ['IN', 'XIC', 'XIO', 'STPT', 'PV', 'AI', 'DI', 'A', 'K'];
    const upperName = portName.toUpperCase();
    return inPatterns.some(p => upperName.startsWith(p) || upperName === p);
}

// ============ 선택 요소에서 연결 찾기 ============

function findConnectionsFromSelected() {
    if (!selectedElement) {
        showToast('먼저 요소를 선택하세요.', 'info');
        return;
    }

    buildLineIndex();

    const excludeGroup = selectedElement.parent || selectedElement.name;
    connectionCandidates = [];

    // 검색할 시작점들 수집
    const searchPoints = [];

    // 1. 선택된 요소 자체의 위치
    searchPoints.push({ x: selectedElement.cx, y: selectedElement.cy, element: selectedElement, portName: null, isOutput: null });

    // 2. 그룹인 경우 (isGroupAnchor 또는 groupsData에 있는 블록) 포트 위치들도 추가
    const groupName = selectedElement.name || selectedElement.id;
    const group = groupsData[groupName];
    if (group && group.ports && group.ports.length > 0) {
        console.log(`[findConnections] Group '${groupName}' has ${group.ports.length} ports`);
        for (const port of group.ports) {
            const portX = port.cx || (selectedElement.cx + (port.dx || 0));
            const portY = port.cy || (selectedElement.cy + (port.dy || 0));
            const portName = port.name || port.customName;
            searchPoints.push({
                x: portX,
                y: portY,
                element: selectedElement,
                portName: portName,
                isOutput: isOutputPort(portName)
            });
        }
    }

    console.log(`[findConnections] Searching from ${searchPoints.length} points`);

    // 각 시작점에서 연결 찾기
    for (const sp of searchPoints) {
        const nearLines = findLinesNearPoint(sp.x, sp.y, 30);
        console.log(`[findConnections] Point (${Math.round(sp.x)}, ${Math.round(sp.y)}) port=${sp.portName} isOutput=${sp.isOutput} - found ${nearLines.length} near lines`);

        for (const line of nearLines) {
            // 양 방향으로 추적
            const result1 = traceLineToElement(line.x1, line.y1, selectedElement, 30, excludeGroup);
            const result2 = traceLineToElement(line.x2, line.y2, selectedElement, 30, excludeGroup);

            for (const result of [result1, result2]) {
                if (result && result.element) {
                    // 중복 체크 (같은 요소 또는 같은 ID)
                    const isDuplicate = connectionCandidates.some(c =>
                        (c.toElement === result.element || c.toElement.id === result.element.id) ||
                        (c.fromElement === result.element || c.fromElement.id === result.element.id)
                    );
                    if (!isDuplicate) {
                        // 포트 방향에 따라 from/to 결정
                        // OUT 포트면: selectedElement -> result.element
                        // IN 포트면: result.element -> selectedElement
                        // 방향 불명확하면: selectedElement -> result.element (기본)
                        let fromEl, toEl, fromPort, toPort;

                        if (sp.isOutput === true) {
                            // OUT 포트에서 나가는 연결
                            fromEl = selectedElement;
                            toEl = result.element;
                            fromPort = sp.portName;
                            toPort = null;
                        } else if (sp.isOutput === false && isInputPort(sp.portName)) {
                            // IN 포트로 들어오는 연결
                            fromEl = result.element;
                            toEl = selectedElement;
                            fromPort = null;
                            toPort = sp.portName;
                        } else {
                            // 방향 불명확 - 기본값
                            fromEl = selectedElement;
                            toEl = result.element;
                            fromPort = sp.portName;
                            toPort = null;
                        }

                        connectionCandidates.push({
                            fromElement: fromEl,
                            toElement: toEl,
                            path: result.path,
                            depth: result.depth,
                            confirmed: false,
                            dismissed: false,
                            fromPort: fromPort,
                            toPort: toPort
                        });

                        console.log(`[findConnections] Candidate: ${fromEl.name}${fromPort ? '.' + fromPort : ''} -> ${toEl.name}${toPort ? '.' + toPort : ''}`);
                    }
                }
            }
        }
    }

    console.log(`Found ${connectionCandidates.length} connection candidates`);
    displayConnectionCandidates();
    render();
}

function displayConnectionCandidates() {
    const containerEl = document.getElementById('connection-candidates');
    const listEl = document.getElementById('candidate-list');
    if (!listEl) return;

    // 미확정/미취소 후보만 카운트
    const pendingCount = connectionCandidates.filter(c => !c.confirmed && !c.dismissed).length;

    if (connectionCandidates.length === 0) {
        if (containerEl) containerEl.style.display = 'none';
        listEl.innerHTML = '<div style="color:#888; padding:8px;">연결 후보 없음</div>';
        return;
    }

    // 후보가 있으면 컨테이너 표시
    if (containerEl) containerEl.style.display = 'block';

    let html = '';
    for (let i = 0; i < connectionCandidates.length; i++) {
        const c = connectionCandidates[i];

        // 확정/취소된 항목은 표시하지 않음
        if (c.confirmed || c.dismissed) continue;

        // from 표시: 그룹명(포트명)
        const fromDisplay = c.fromPort
            ? `${c.fromElement.name}(${c.fromPort})`
            : c.fromElement.name;

        // to 표시: 그룹명(포트명) 또는 요소명
        const toDisplay = c.toPort
            ? `${c.toElement.name}(${c.toPort})`
            : c.toElement.name;

        html += `
            <div style="padding:12px; margin-bottom:8px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                    <span style="background:var(--accent-orange); color:#000; font-weight:bold; padding:2px 8px; border-radius:12px; font-size:12px;">${i + 1}</span>
                    <span style="color:var(--accent-orange); font-size:13px; font-weight:500;">${fromDisplay}</span>
                    <span style="color:var(--text-muted); font-size:16px;">→</span>
                    <span style="color:var(--accent-cyan); font-size:13px; font-weight:500;">${toDisplay}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="confirmConnection(${i})" style="flex:1; font-size:13px; padding:8px 12px; background:var(--accent-green); color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:500;">✓ 확정</button>
                    <button onclick="dismissConnection(${i})" style="flex:1; font-size:13px; padding:8px 12px; background:var(--accent-red); color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:500;">✗ 취소</button>
                </div>
            </div>
        `;
    }

    if (html === '') {
        html = '<div style="color:var(--text-muted); padding:16px; text-align:center; font-size:13px;">모든 후보가 처리되었습니다</div>';
        if (containerEl) containerEl.style.display = 'none';
    }

    listEl.innerHTML = html;
}
