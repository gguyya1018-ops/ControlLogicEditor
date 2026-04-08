/**
 * canvas.js - 캔버스 렌더링 함수들
 * 모든 그리기 관련 로직
 */

// ============ 메인 렌더 함수 ============

function render() {
    if (!ctx || !canvas) { console.warn('[render] ctx/canvas missing'); return; }

    // P&ID 뷰어 모드
    if (typeof pidViewMode !== 'undefined' && pidViewMode) {
        renderPID();
        return;
    }

    try {
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewX, viewY);
    ctx.scale(scale, scale);

    // 배경 라인 (전역 변수 사용)
    if (showLines) {
        drawLines();
    }

    if (showBgLines) {
        drawBgLines();
    }

    if (showVectorLines) {
        drawVectorLines();
    }
    if (showConnectionLines) {
        drawAppliedConnections();
    }

    // 다이어그램 모드 vs 일반 모드 (전역 변수 사용)
    if (diagramMode) {
        drawDiagramBlocks();
    } else {
        const sharedPositions = new Set();
        drawBlocks(sharedPositions);   // 내부에서 타입별 showBlocks/showPorts/showOther 처리
        if (showPorts) {
            drawPorts(sharedPositions);
        }
    }

    // 연결선 (전역 변수 사용)
    if (showConnections) {
        drawCustomConnections();
    }

    // 선택된 연결 하이라이트 (시작/끝 포트 표시)
    if (selectedElement && selectedElement.connectionIndex !== undefined) {
        drawConnectionHighlight(selectedElement.connectionIndex);
    }

    // 선택된 블록/포트 하이라이트 (스캔 등에서 클릭 시)
    if (selectedElement && selectedElement.cx !== undefined && selectedElement.connectionIndex === undefined) {
        drawElementHighlight(selectedElement);
    }

    // 진행 중인 연결선
    if (connectMode && connectStart) {
        drawPendingConnection();
    }

    // 클론 선택 영역
    if (cloneMode) {
        drawCloneSelection();
    }

    // 템플릿 앵커 하이라이트
    if (templateMode && templateAnchor) {
        drawTemplateAnchor();
    }

    // 연결 후보 시각화
    if (connectionCandidates && connectionCandidates.length > 0) {
        drawConnectionCandidates();
    }

    // 패턴 선택된 그룹들 및 드래그 영역
    if (patternMode && (isPatternSelecting ||
        (typeof patternSelectedGroups !== 'undefined' && patternSelectedGroups.length > 0))) {
        drawPatternSelection();
    }

    // 유사 그룹 하이라이트
    if (typeof renderSimilarGroupHighlight === 'function') {
        renderSimilarGroupHighlight(ctx);
    }

    // 선택된 패턴 렌더링
    if (typeof renderSelectedPattern === 'function') {
        renderSelectedPattern(ctx);
    }

    // 호버된 패턴 하이라이트 (패턴 목록에서 마우스 올림)
    if (typeof renderHoveredPattern === 'function') {
        renderHoveredPattern(ctx);
    }

    // 기능 블록 하이라이트 (타입 탭에서 선택한 블록)
    if (typeof renderFuncBlockHighlight === 'function') {
        renderFuncBlockHighlight(ctx);
    }

    // 그래프 노드/엣지
    if (typeof drawGraph === 'function') {
        drawGraph();
    }

    // 태그 검색 하이라이트 효과
    if (typeof drawTagHighlight === 'function') {
        drawTagHighlight(ctx);
    }

    ctx.restore();

    // 템플릿 선택 영역 (스크린 좌표)
    if (templateMode && isTemplateSelecting && templateSelectStart && templateSelectEnd) {
        drawTemplateSelection();
    }

    // 상태 표시
    const statsEl = document.getElementById('stats');
    if (statsEl) {
        statsEl.textContent = `Zoom: ${(scale * 100).toFixed(0)}% | Connections: ${customConnections.length}`;
    }
    } catch (err) {
        console.error('[렌더] 렌더링 오류:', err);
    }
}

// ============ 라인 그리기 ============

function drawLines() {
    ctx.strokeStyle = 'rgba(100, 120, 140, 1.0)';
    ctx.lineWidth = 0.5 / scale;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    for (const line of linesData) {
        const x1 = parseFloat(line.x1);
        const y1 = parseFloat(line.y1);
        const x2 = parseFloat(line.x2);
        const y2 = parseFloat(line.y2);

        if (Math.min(x1, x2) < 50 || Math.max(x1, x2) > 5400) continue;
        if (Math.min(y1, y2) < 50 || Math.max(y1, y2) > 3470) continue;

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.stroke();
}

function drawBgLines() {
    if (!linesData || linesData.length === 0) return;

    for (const line of linesData) {
        const x1 = parseFloat(line.x1);
        const y1 = parseFloat(line.y1);
        const x2 = parseFloat(line.x2);
        const y2 = parseFloat(line.y2);

        if (Math.min(x1, x2) < 30 || Math.max(x1, x2) > 5400) continue;
        if (Math.min(y1, y2) < 30 || Math.max(y1, y2) > 3470) continue;

        let strokeColor = '#333';
        if (line.color) {
            const match = line.color.match(/\(([^)]+)\)/);
            if (match) {
                const parts = match[1].split(',').map(s => parseFloat(s.trim()));
                if (parts.length >= 3) {
                    const r = Math.round(parts[0] * 255);
                    const g = Math.round(parts[1] * 255);
                    const b = Math.round(parts[2] * 255);
                    strokeColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }

        const lineWidth = line.width ? parseFloat(line.width) : 1;

        ctx.strokeStyle = strokeColor;
        // 최소 1.5 굵기 보장 (두꺼운 라인 기준으로 일정하게)
        ctx.lineWidth = Math.max(1.5, lineWidth) / scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

async function toggleVectorLines() {
    showVectorLines = !showVectorLines;
    document.getElementById('toolShowVLines')?.classList.toggle('active', showVectorLines);

    if (showVectorLines && vectorLinesData.length === 0 && currentDrawingNumber) {
        console.log('[VLines] 데이터 없음, 로드 시도...');
        await loadVectorLines(currentDrawingNumber, currentPageNumber);
    }
    console.log(`[VLines] toggle=${showVectorLines}, data=${vectorLinesData.length}개`);
    render();
}

function toggleConnectionLines() {
    showConnectionLines = !showConnectionLines;
    document.getElementById('toolShowConnLines')?.classList.toggle('active', showConnectionLines);
    render();
}

function drawVectorLines() {
    if (!vectorLinesData || vectorLinesData.length === 0) return;

    ctx.strokeStyle = 'rgba(0, 100, 255, 0.85)';
    ctx.lineWidth = 2 / scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (const line of vectorLinesData) {
        const x1 = parseFloat(line.x1);
        const y1 = parseFloat(line.y1);
        const x2 = parseFloat(line.x2);
        const y2 = parseFloat(line.y2);

        if (Math.min(x1, x2) < 50 || Math.max(x1, x2) > 5400) continue;
        if (Math.min(y1, y2) < 50 || Math.max(y1, y2) > 3470) continue;

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.stroke();
}

function drawAppliedConnections() {
    if (!customConnections || customConnections.length === 0) return;

    for (let i = 0; i < customConnections.length; i++) {
        const conn = customConnections[i];
        // C모드: auto만 표시 (manual/none은 L모드에서)
        if (conn.source !== 'auto') continue;
        if (!conn.fromCx || !conn.toCx) continue;

        const isSelected = selectedElement && selectedElement.autoConnectionIndex === i;
        const r = 4 / scale;

        // 시작 포트 (초록 테두리)
        ctx.strokeStyle = isSelected ? '#fff' : 'rgba(76, 175, 80, 0.8)';
        ctx.lineWidth = (isSelected ? 3 : 2) / scale;
        ctx.beginPath();
        ctx.arc(conn.fromCx, conn.fromCy, r, 0, Math.PI * 2);
        ctx.stroke();

        // 끝 포트 (주황 테두리)
        ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255, 152, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(conn.toCx, conn.toCy, r, 0, Math.PI * 2);
        ctx.stroke();

        // 연결선
        const lineColor = isSelected ? '#ffffff' : 'rgba(255, 235, 59, 0.8)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = (isSelected ? 3 : 2) / scale;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(conn.fromCx, conn.fromCy);
        if (conn.waypoints) {
            for (const wp of conn.waypoints) ctx.lineTo(wp.x, wp.y);
        }
        ctx.lineTo(conn.toCx, conn.toCy);
        ctx.stroke();

        // 화살표 (from→to 방향)
        const wps = conn.waypoints || [];
        const arrowColor = isSelected ? '#ffffff' : 'rgba(255, 235, 59, 0.8)';
        drawConnectionArrow(conn.fromCx, conn.fromCy, conn.toCx, conn.toCy, wps, false, arrowColor);
    }
}

function drawAutoConnectResults() {
    if (!autoConnectResults || autoConnectResults.length === 0) return;

    for (const conn of autoConnectResults) {
        // 매칭된 포트 포인트 (시작: 초록, 끝: 주황)
        const r = 5 / scale;

        // 시작 포트 포인트
        ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
        ctx.beginPath();
        ctx.arc(conn.fromCx, conn.fromCy, r, 0, Math.PI * 2);
        ctx.fill();

        // 끝 포트 포인트
        ctx.fillStyle = 'rgba(255, 152, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(conn.toCx, conn.toCy, r, 0, Math.PI * 2);
        ctx.fill();

        // 연결선 (waypoints를 따라)
        if (conn.waypoints && conn.waypoints.length > 0) {
            ctx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
            ctx.lineWidth = 2.5 / scale;
            ctx.setLineDash([6 / scale, 3 / scale]);
            ctx.beginPath();
            ctx.moveTo(conn.fromCx, conn.fromCy);
            for (const wp of conn.waypoints) {
                ctx.lineTo(wp.x, wp.y);
            }
            ctx.lineTo(conn.toCx, conn.toCy);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // waypoint 없으면 직선
            ctx.strokeStyle = 'rgba(255, 235, 59, 0.7)';
            ctx.lineWidth = 2.5 / scale;
            ctx.setLineDash([6 / scale, 3 / scale]);
            ctx.beginPath();
            ctx.moveTo(conn.fromCx, conn.fromCy);
            ctx.lineTo(conn.toCx, conn.toCy);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

// ============ 블록/포트 그리기 ============

function drawBlocks(drawnPositions = new Set()) {

    // 패턴 선택된 그룹 이름 목록 (빠른 조회용)
    const patternSelectedNames = new Set();
    if (typeof patternSelectedGroups !== 'undefined' && patternSelectedGroups.length > 0) {
        for (const g of patternSelectedGroups) {
            patternSelectedNames.add(g.name);
        }
    }

    // 슈퍼그룹 하이라이트된 요소 이름 목록
    const superGroupNames = new Set();
    const groupIdx = typeof selectedSimilarGroupIdx !== 'undefined' && selectedSimilarGroupIdx !== null
        ? selectedSimilarGroupIdx
        : (typeof highlightedSimilarGroup !== 'undefined' ? highlightedSimilarGroup : null);
    if (groupIdx !== null && typeof foundSimilarGroups !== 'undefined' && foundSimilarGroups[groupIdx]) {
        const group = foundSimilarGroups[groupIdx];
        const matches = group.validMatches || group.matchedElements?.filter(m => m) || [];
        for (const m of matches) {
            if (m && m.element) {
                superGroupNames.add(m.element.name);
            }
        }
    }

    // 타입별 표시 제어:
    //   B(showBlocks): OCB_BLOCK, ALG_BLOCK, REF_SIGNAL, M/A 스테이션 블록
    //   P(showPorts):  SIGNAL(ISA 태그), OTHER 중 포트 기능 라벨(MAN/AUTO/MRE 등)
    //   O(showOther):  OTHER 중 순수 텍스트 주석
    const _showOther = typeof showOther !== 'undefined' ? showOther : true;
    const _showPorts = typeof showPorts !== 'undefined' ? showPorts : true;

    // 기능 포트 라벨 (OTHER 타입이지만 P 버튼에 속함)
    const PORT_LABEL_SET = new Set([
        'PV','SP','STPT','OUT','MV','FB','IN','I','FLAG','YES','NO',
        'MAN','AUTO','MODE','MRE','ARE','RAI','LWI','REF',
        'AND','OR','NOT',
        'K','D','DT','H','L','NUM','DEN','A','B','T','N','X',
        'PPR','SPR','PK','SIG','CNF','ERR','LIMIT','FBPV','FBIN'
    ]);
    const _isPortLabel = (n) => {
        const u = n.toUpperCase();
        return PORT_LABEL_SET.has(u) || /^IN\d+$/.test(u) || /^OUT\d+$/.test(u) || /^PPR\d+$/.test(u);
    };
    // M/A 스테이션 블록 (B 버튼) — "M/A" 단순 라벨은 제외, MAMODE:xxx 같은 실제 블록만
    const _isMABlock = (n) => {
        const u = n.toUpperCase();
        return u === 'MA' ||
               /^MAMODE:/i.test(n) ||
               /^MODE_\d+/i.test(n) || /^MA_\d+/i.test(n) ||
               /^[A-Z]{1,4}_\d{4}_\d{4}$/.test(n);
    };

    for (const block of blocks) {
        const btype = block.type;
        if (btype === 'SIGNAL') {
            // IN으로 시작하는 포트명(IN1, IN2 등) → P 버튼
            // 그 외 ISA 태그(FIC1234, SIT2681A 등) → B 버튼
            const _sn = block.name.toUpperCase();
            if (/^IN\d*$/.test(_sn)) {
                if (!_showPorts) continue;
            } else {
                if (!showBlocks) continue;
            }
        } else if (btype === 'OTHER') {
            if (_isPortLabel(block.name)) {
                // 기능 포트 라벨 → P 버튼
                if (!_showPorts) continue;
            } else if (_isMABlock(block.name)) {
                // M/A 스테이션 블록 → B 버튼
                if (!showBlocks) continue;
            } else {
                // 순수 텍스트 주석 → O 버튼
                if (!_showOther) continue;
            }
        } else {
            // OCB_BLOCK, ALG_BLOCK, REF_SIGNAL → B 버튼
            if (!showBlocks) continue;
        }

        const posKey = `${Math.round(block.cx)}_${Math.round(block.cy)}`;
        if (drawnPositions.has(posKey)) continue;
        drawnPositions.add(posKey);

        const isSelected = selectedElement === block;
        const isConnectStart = connectStart === block;
        const isPatternSelected = patternSelectedNames.has(block.name);
        const isSuperGroup = superGroupNames.has(block.name);
        // 색상 결정
        let color;
        if (isPatternSelected || isSuperGroup) {
            color = '#9c27b0';
        } else if (isConnectStart) {
            color = '#ff9800';
        } else {
            color = getColor(block.type);
        }

        const radius = isSelected || isConnectStart ? 14 : 10;

        ctx.beginPath();
        ctx.arc(block.cx, block.cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3 / scale;
            ctx.stroke();
        } else if (isPatternSelected || isSuperGroup) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.font = `${9}px monospace`;
        ctx.textAlign = 'center';

        if (!(block.name.startsWith('IN') && block.name.length <= 3)) {
            ctx.fillText(block.name, block.cx, block.cy - 16);
        }
    }
}

function drawPorts(drawnPositions = new Set()) {
    for (const port of ports) {
        // PORT, BLOCK_TYPE(PV/MAN/AUTO 등 기능 라벨), SHEET_REF 모두 P 버튼으로 제어
        // (showPorts가 false면 drawPorts 자체가 호출 안 됨 — 상위에서 처리)

        // 위치 기반 중복 체크
        const posKey = `${Math.round(port.cx)}_${Math.round(port.cy)}`;
        if (drawnPositions.has(posKey)) {
            continue;
        }
        drawnPositions.add(posKey);

        const isSelected = selectedElement === port;
        const isPending = pendingPortAssign === port;
        const isConnectStart = connectStart === port;

        let color;
        if (isConnectStart) {
            color = '#ff9800';
        } else if (isPending) {
            color = '#ff0';
        } else if (isSelected) {
            color = '#fff';
        } else {
            color = getColor(port.type || 'PORT');
        }

        const radius = isSelected || isConnectStart ? 14 : 10;

        ctx.beginPath();
        ctx.arc(port.cx, port.cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) {
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 3 / scale;
            ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.font = `${9}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(port.name, port.cx, port.cy - 16);
    }
}

// ============ 다이어그램 모드 블록 그리기 ============

function drawDiagramBlocks() {
    const drawnPorts = new Set();
    const drawnBlocks = new Set();
    const drawnPositions = new Set();  // 위치 기반 중복 체크
    const drawnTexts = new Set();  // 텍스트 중복 체크 (같은 위치 근처의 같은 텍스트)
    const groupedPortPositions = [];  // 그룹에 속한 포트 위치들

    // 1. groupsData의 그룹들을 큰 투명 박스로 그리기 (블록+포트들을 감싸는 형태)
    for (const [name, group] of Object.entries(groupsData)) {
        const block = blocks.find(b => b.id === name || b.name === name);
        const isSelected = selectedElement && (selectedElement.id === name || selectedElement.name === name || selectedElement === block);
        const isConnectStart = connectStart && (connectStart.id === name || connectStart.name === name || connectStart === block);

        // 앵커(블록) 위치
        const anchorX = group.cx || (block ? block.cx : 0);
        const anchorY = group.cy || (block ? block.cy : 0);
        const color = getColor(group.type || (block ? block.type : 'OTHER'));

        if (anchorX === 0 && anchorY === 0) continue;

        // 위치 기반 중복 체크 (같은 위치의 그룹이 이미 그려졌으면 스킵)
        const posKey = `${Math.round(anchorX)}_${Math.round(anchorY)}`;
        if (drawnPositions.has(posKey)) {
            continue;
        }

        // 같은 텍스트가 비슷한 위치에 이미 그려졌으면 스킵
        const displayName = group.text || name;
        const textPosKey = `${displayName}_${Math.round(anchorX / 100)}_${Math.round(anchorY / 100)}`;
        if (drawnTexts.has(textPosKey)) {
            continue;
        }
        drawnTexts.add(textPosKey);

        drawnBlocks.add(name);
        if (block) {
            drawnBlocks.add(block.id);
            drawnBlocks.add(block.name);
            if (block.text) drawnBlocks.add(block.text);
        }
        // group.text도 추가
        if (group.text) drawnBlocks.add(group.text);

        // 앵커 위치를 위치 기반 체크에도 추가
        drawnPositions.add(`${Math.round(anchorX)}_${Math.round(anchorY)}`);

        // 앵커 위치도 그룹 포트로 마킹
        groupedPortPositions.push({ x: anchorX, y: anchorY });

        // 그룹 내 포트들의 경계 계산 (앵커 포함)
        let minX = anchorX, maxX = anchorX, minY = anchorY, maxY = anchorY;
        const groupPorts = group.ports || [];

        for (const port of groupPorts) {
            const portX = port.cx || (anchorX + (port.dx || 0));
            const portY = port.cy || (anchorY + (port.dy || 0));
            minX = Math.min(minX, portX);
            maxX = Math.max(maxX, portX);
            minY = Math.min(minY, portY);
            maxY = Math.max(maxY, portY);

            // 이 포트 위치를 기록
            groupedPortPositions.push({ x: portX, y: portY });

            // 이 포트가 그려졌다고 표시 (group.ports 기준)
            if (port.id) drawnPorts.add(port.id);

            // ports 배열에서 같은 위치의 포트도 마킹 (실제 그려진 위치만)
            for (const p of ports) {
                if (Math.abs(p.cx - portX) < 5 && Math.abs(p.cy - portY) < 5) {
                    drawnPorts.add(p.id);
                }
            }
        }

        // 여유 공간 추가
        const padding = 25;
        const boxX = minX - padding;
        const boxY = minY - padding;
        const boxW = Math.max(80, maxX - minX + padding * 2);
        const boxH = Math.max(50, maxY - minY + padding * 2);

        // 그룹 박스 그리기 (투명한 배경)
        ctx.fillStyle = color + '30';  // 30% 투명도
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();

        // 테두리
        ctx.strokeStyle = (isSelected || isConnectStart) ? (isConnectStart ? '#ff9800' : '#fff') : color;
        ctx.lineWidth = (isSelected || isConnectStart) ? 3 / scale : 2 / scale;
        ctx.stroke();

        // 앵커 블록 그리기 (그룹의 중심이 되는 블록)
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, isSelected || isConnectStart ? 14 : 10, 0, Math.PI * 2);
        ctx.fillStyle = isConnectStart ? '#ff9800' : color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();

        // 앵커 옆에 그룹 이름 표시 (한 번만)
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName, anchorX + 16, anchorY);

        // 그룹 내 포트들을 원으로 그리기
        for (const port of groupPorts) {
            const portX = port.cx || (anchorX + (port.dx || 0));
            const portY = port.cy || (anchorY + (port.dy || 0));

            // 앵커와 같은 위치면 스킵 (이미 그림)
            if (Math.abs(portX - anchorX) < 5 && Math.abs(portY - anchorY) < 5) continue;

            const portSelected = selectedElement && (selectedElement.id === port.id ||
                (Math.abs(selectedElement.cx - portX) < 5 && Math.abs(selectedElement.cy - portY) < 5));
            const portConnectStart = connectStart && (connectStart.id === port.id ||
                (Math.abs(connectStart.cx - portX) < 5 && Math.abs(connectStart.cy - portY) < 5));

            // 포트 원
            ctx.beginPath();
            ctx.arc(portX, portY, portSelected || portConnectStart ? 10 : 7, 0, Math.PI * 2);
            ctx.fillStyle = portConnectStart ? '#ff9800' : (portSelected ? '#fff' : '#4fc3f7');
            ctx.fill();

            if (portSelected || portConnectStart) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / scale;
                ctx.stroke();
            }

            // 포트 이름 (옆에 표시) - 앵커 이름과 같으면 스킵
            const portName = port.text || port.name || '';
            if (portName && portName !== displayName && portName !== name) {
                ctx.fillStyle = '#fff';
                ctx.font = `${9}px monospace`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(portName, portX + 12, portY);
            }
        }
    }

    // 2. 그룹에 속하지 않은 블록들 (원으로, 포트처럼 표시)
    for (const block of blocks) {
        // 위치 기반 중복 체크 (이미 그려진 위치면 스킵)
        const posKey = `${Math.round(block.cx)}_${Math.round(block.cy)}`;
        if (drawnPositions.has(posKey)) {
            continue;
        }

        // 1단계에서 앵커 블록으로 이미 그려진 블록만 스킵
        if (drawnBlocks.has(block.id) || drawnBlocks.has(block.name)) continue;

        // 이 블록 위치를 기록
        drawnPositions.add(posKey);
        const isSelected = selectedElement === block;
        const isConnectStart = connectStart === block;
        const hasParent = !!block.parent;
        const color = hasParent ? '#4fc3f7' : getColor(block.type);

        // 블록을 원으로 표시
        ctx.beginPath();
        ctx.arc(block.cx, block.cy, isSelected || isConnectStart ? 10 : (hasParent ? 7 : 9), 0, Math.PI * 2);
        ctx.fillStyle = isConnectStart ? '#ff9800' : (isSelected ? '#fff' : color);
        ctx.fill();

        if (isSelected || isConnectStart) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
        }

        // 블록 이름 (옆에 표시)
        ctx.fillStyle = '#fff';
        ctx.font = `${9}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(block.name || '', block.cx + 12, block.cy);
    }

    // 3. 아직 안 그려진 포트들 (원으로)
    for (const port of ports) {
        // 이미 그려진 포트는 스킵
        if (drawnPorts.has(port.id)) continue;

        // 위치 기반 중복 체크
        const posKey = `${Math.round(port.cx)}_${Math.round(port.cy)}`;
        if (drawnPositions.has(posKey)) continue;

        drawnPositions.add(posKey);

        const isSelected = selectedElement === port;
        const isConnectStart = connectStart === port;

        // 포트 원
        ctx.beginPath();
        ctx.arc(port.cx, port.cy, isSelected || isConnectStart ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isConnectStart ? '#ff9800' : (isSelected ? '#fff' : '#4fc3f7');
        ctx.fill();

        if (isSelected || isConnectStart) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
        }

        // 포트 이름
        ctx.fillStyle = '#fff';
        ctx.font = `${9}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(port.name || '', port.cx + 12, port.cy);
    }
}

// ============ 그룹 링크 그리기 ============

function drawGroupLinks() {
    ctx.lineWidth = 1 / scale;

    for (const port of ports) {
        if (!port.parent) continue;
        const parent = blocks.find(b => b.name === port.parent);
        if (!parent) continue;

        const color = getColor(parent.type);
        ctx.strokeStyle = color + '40';

        ctx.beginPath();
        ctx.moveTo(port.cx, port.cy);
        ctx.lineTo(parent.cx, parent.cy);
        ctx.stroke();
    }
}

// ============ 연결선 그리기 ============

function drawCustomConnections() {
    ctx.lineWidth = 3 / scale;

    const crossings = findAllCrossings();
    const bridgeRadius = 12;

    for (let i = 0; i < customConnections.length; i++) {
        const conn = customConnections[i];
        // L모드: manual/none만 표시 (auto는 C모드에서)
        if (conn.source === 'auto') continue;

        const fromX = conn.fromCx ?? conn.fromX;
        const fromY = conn.fromCy ?? conn.fromY;
        const toX = conn.toCx ?? conn.toX;
        const toY = conn.toCy ?? conn.toY;

        // 좌표가 없으면 스킵
        if (fromX === undefined || fromY === undefined ||
            toX === undefined || toY === undefined) continue;

        const isSelected = selectedElement && selectedElement.connectionIndex === i;
        ctx.strokeStyle = isSelected ? '#fff' : '#ff9800';  // 확정된 연결은 주황색

        const myCrossings = crossings.filter(c => c.bridgeConnIdx === i);
        const segments = getConnectionSegments(conn);

        for (const seg of segments) {
            const segCrossings = myCrossings.filter(c => {
                const t = (seg.x2 - seg.x1 !== 0)
                    ? (c.x - seg.x1) / (seg.x2 - seg.x1)
                    : (c.y - seg.y1) / (seg.y2 - seg.y1);
                return t > 0.01 && t < 0.99;
            }).sort((a, b) => {
                const ta = (seg.x2 - seg.x1 !== 0)
                    ? (a.x - seg.x1) / (seg.x2 - seg.x1)
                    : (a.y - seg.y1) / (seg.y2 - seg.y1);
                const tb = (seg.x2 - seg.x1 !== 0)
                    ? (b.x - seg.x1) / (seg.x2 - seg.x1)
                    : (b.y - seg.y1) / (seg.y2 - seg.y1);
                return ta - tb;
            });

            if (segCrossings.length === 0) {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            } else {
                const segAngle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
                let curX = seg.x1, curY = seg.y1;

                for (const crossing of segCrossings) {
                    const beforeX = crossing.x - bridgeRadius * Math.cos(segAngle);
                    const beforeY = crossing.y - bridgeRadius * Math.sin(segAngle);

                    ctx.beginPath();
                    ctx.moveTo(curX, curY);
                    ctx.lineTo(beforeX, beforeY);
                    ctx.stroke();

                    const afterX = crossing.x + bridgeRadius * Math.cos(segAngle);
                    const afterY = crossing.y + bridgeRadius * Math.sin(segAngle);

                    ctx.beginPath();
                    ctx.arc(crossing.x, crossing.y, bridgeRadius, segAngle + Math.PI, segAngle, true);
                    ctx.stroke();

                    curX = afterX;
                    curY = afterY;
                }

                ctx.beginPath();
                ctx.moveTo(curX, curY);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            }
        }

        // Waypoint dots
        const waypoints = conn.waypoints || [];
        if (isSelected) {
            for (const wp of waypoints) {
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#ff9800';
                ctx.fill();
            }
        }

        // Arrow head
        drawConnectionArrow(fromX, fromY, toX, toY, waypoints, isSelected);
    }
}

function drawConnectionArrow(fromX, fromY, toX, toY, waypoints, isSelected, color) {
    const lastPoint = waypoints.length > 0 ? waypoints[waypoints.length - 1] : { x: fromX, y: fromY };
    const lastX = lastPoint.x !== undefined ? lastPoint.x : fromX;
    const lastY = lastPoint.y !== undefined ? lastPoint.y : fromY;
    const dx = toX - lastX;
    const dy = toY - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return;

    const angle = Math.atan2(dy, dx);
    const arrowLen = 18;
    const arrowWidth = 0.5;
    const arrowOffset = Math.min(12, dist * 0.3);

    const tipX = toX - arrowOffset * Math.cos(angle);
    const tipY = toY - arrowOffset * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
        tipX - arrowLen * Math.cos(angle - arrowWidth),
        tipY - arrowLen * Math.sin(angle - arrowWidth)
    );
    ctx.lineTo(
        tipX - arrowLen * Math.cos(angle + arrowWidth),
        tipY - arrowLen * Math.sin(angle + arrowWidth)
    );
    ctx.closePath();
    ctx.fillStyle = color || (isSelected ? '#fff' : '#ff9800');
    ctx.fill();
}

// ============ 펄스 하이라이트 시스템 ============

let highlightPhase = 0;
let highlightAnimId = null;

function startHighlightAnim() {
    if (highlightAnimId) return;
    const animate = () => {
        highlightPhase += 0.12;
        render();
        highlightAnimId = requestAnimationFrame(animate);
    };
    highlightAnimId = requestAnimationFrame(animate);
}

function stopHighlightAnim() {
    if (highlightAnimId) {
        cancelAnimationFrame(highlightAnimId);
        highlightAnimId = null;
    }
    highlightPhase = 0;
}

function drawPulseCircle(cx, cy, color) {
    const pulse = Math.sin(highlightPhase) * 0.3 + 0.7;
    const r1 = (25 + Math.sin(highlightPhase) * 8) / scale;
    const r2 = r1 + 12 / scale;

    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace('1)', `${pulse})`);
    ctx.lineWidth = 3 / scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace('1)', `${pulse * 0.4})`);
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
}

function drawHighlightLabel(cx, cy, label) {
    ctx.font = `bold ${11 / scale}px monospace`;
    ctx.textAlign = 'center';
    const metrics = ctx.measureText(label);
    const labelY = cy - 38 / scale;
    const pad = 4 / scale;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(cx - metrics.width / 2 - pad, labelY - 7 / scale, metrics.width + pad * 2, 14 / scale);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx, labelY);
}

// 선택된 요소 하이라이트 (스캔 등)
function drawElementHighlight(elem) {
    if (!elem || !elem.cx || !elem.cy) return;
    ctx.save();
    drawPulseCircle(elem.cx, elem.cy, 'rgba(255,60,60,1)');
    const label = elem.parent ? `${elem.parent}.${elem.name}` : elem.name;
    drawHighlightLabel(elem.cx, elem.cy, label);
    ctx.restore();
}

// 선택된 연결 하이라이트
function drawConnectionHighlight(idx) {
    const conn = customConnections[idx];
    if (!conn || !conn.fromCx || !conn.toCx) return;
    ctx.save();

    // FROM
    drawPulseCircle(conn.fromCx, conn.fromCy, 'rgba(255,60,60,1)');
    const fromLabel = conn.fromParent ? `${conn.fromParent}.${conn.fromName}` : conn.fromName;
    drawHighlightLabel(conn.fromCx, conn.fromCy, fromLabel);

    // TO
    drawPulseCircle(conn.toCx, conn.toCy, 'rgba(79,195,247,1)');
    const toLabel = conn.toParent ? `${conn.toParent}.${conn.toName}` : conn.toName;
    drawHighlightLabel(conn.toCx, conn.toCy, toLabel);

    ctx.restore();
}

// ============ 진행 중인 연결선 ============

function drawPendingConnection() {
    if (!connectStart) return;

    const mouseX = (lastMouseX - viewX) / scale;
    const mouseY = (lastMouseY - viewY) / scale;
    const orthoModeEl = document.getElementById('orthoMode');
    const orthoMode = orthoModeEl && orthoModeEl.checked && !lastShiftKey;

    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([10 / scale, 5 / scale]);
    ctx.beginPath();
    ctx.moveTo(connectStart.cx, connectStart.cy);

    for (const wp of connectWaypoints) {
        ctx.lineTo(wp.x, wp.y);
    }

    if (orthoMode) {
        const prevPoint = connectWaypoints.length > 0
            ? connectWaypoints[connectWaypoints.length - 1]
            : { x: connectStart.cx, y: connectStart.cy };

        const dx = Math.abs(mouseX - prevPoint.x);
        const dy = Math.abs(mouseY - prevPoint.y);

        if (dx > 5 && dy > 5) {
            ctx.lineTo(mouseX, prevPoint.y);
        }
    }
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff9800';
    for (const wp of connectWaypoints) {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============ 클론 선택 영역 ============

function drawCloneSelection() {
    if (cloneMode && isCloneSelecting && cloneSelectStart && cloneSelectEnd) {
        const x1 = Math.min(cloneSelectStart.x, cloneSelectEnd.x);
        const y1 = Math.min(cloneSelectStart.y, cloneSelectEnd.y);
        const w = Math.abs(cloneSelectEnd.x - cloneSelectStart.x);
        const h = Math.abs(cloneSelectEnd.y - cloneSelectStart.y);

        ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.fillRect(x1, y1, w, h);
        ctx.strokeStyle = '#64c8ff';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([6 / scale, 3 / scale]);
        ctx.strokeRect(x1, y1, w, h);
        ctx.setLineDash([]);
    }

    // 부모/자식 블록 표시
    drawCloneParentChildBlocks();
}

function drawCloneParentChildBlocks() {
    function drawLabelWithBg(text, x, y, bgColor, textColor, fontSize) {
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(text);
        const padding = 4;
        const width = metrics.width + padding * 2;
        const height = fontSize + padding;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x - width / 2, y - height / 2, width, height, 4);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.fillText(text, x, y);
    }

    if (cloneMode && cloneParentRow.length > 0) {
        for (let i = 0; i < cloneParentRow.length; i++) {
            const block = cloneParentRow[i];
            const child = cloneChildRow[i];
            const isAssigned = child !== null;
            const isSame = child === 'SAME';
            const isCurrentTarget = (i === cloneCurrentChildIdx);

            if (isCurrentTarget) {
                ctx.strokeStyle = '#ffeb3b';
                ctx.lineWidth = 6 / scale;
            } else if (isAssigned) {
                ctx.strokeStyle = isSame ? '#888' : '#4caf50';
                ctx.lineWidth = 4 / scale;
            } else {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2 / scale;
            }

            ctx.beginPath();
            ctx.arc(block.cx, block.cy, 28, 0, Math.PI * 2);
            ctx.stroke();

            const bgColor = isCurrentTarget ? '#ffeb3b' : (isAssigned ? (isSame ? '#666' : '#4caf50') : '#444');
            const textColor = isCurrentTarget ? '#000' : '#fff';
            const label = isSame ? `${i + 1} 공통` : `P${i + 1}`;
            drawLabelWithBg(label, block.cx, block.cy - 38, bgColor, textColor, 16);
        }
    }

    if (cloneMode && cloneChildRow.length > 0) {
        for (let i = 0; i < cloneChildRow.length; i++) {
            const child = cloneChildRow[i];
            const parent = cloneParentRow[i];

            if (child && child !== 'SAME') {
                ctx.strokeStyle = '#2196f3';
                ctx.lineWidth = 4 / scale;
                ctx.beginPath();
                ctx.arc(child.cx, child.cy, 28, 0, Math.PI * 2);
                ctx.stroke();

                drawLabelWithBg(`C${i + 1}`, child.cx, child.cy - 38, '#2196f3', '#fff', 16);

                ctx.setLineDash([10 / scale, 5 / scale]);
                ctx.beginPath();
                ctx.moveTo(parent.cx, parent.cy);
                ctx.lineTo(child.cx, child.cy);
                ctx.strokeStyle = '#ff9800';
                ctx.lineWidth = 3 / scale;
                ctx.stroke();
                ctx.setLineDash([]);

                const midX = (parent.cx + child.cx) / 2;
                const midY = (parent.cy + child.cy) / 2;
                drawLabelWithBg(`${i + 1}`, midX, midY, '#ff9800', '#fff', 14);
            }
        }
    }
}

// ============ 템플릿 앵커 ============

function drawTemplateAnchor() {
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 4 / scale;
    ctx.setLineDash([8 / scale, 4 / scale]);
    ctx.beginPath();
    ctx.arc(templateAnchor.cx, templateAnchor.cy, 25 / scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#e040fb';
    ctx.font = `bold ${14 / scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`앵커: ${templateAnchor.name}`, templateAnchor.cx, templateAnchor.cy - 35 / scale);
}

// ============ 연결 후보 시각화 ============

function drawConnectionCandidates() {
    for (let i = 0; i < connectionCandidates.length; i++) {
        const candidate = connectionCandidates[i];
        // 확정되거나 취소된 항목은 그리지 않음
        if (candidate.dismissed || candidate.confirmed) continue;

        const fromElem = candidate.fromElement;
        const toElem = candidate.toElement;
        if (!fromElem || !toElem) continue;

        // 시작점: fromPort가 있으면 해당 포트 위치, 없으면 요소 중심
        let startX = fromElem.cx, startY = fromElem.cy;
        if (candidate.fromPort) {
            const groupName = fromElem.name || fromElem.id;
            const group = groupsData[groupName];
            if (group && group.ports) {
                const port = group.ports.find(p => (p.name || p.customName) === candidate.fromPort);
                if (port) {
                    startX = port.cx || (fromElem.cx + (port.dx || 0));
                    startY = port.cy || (fromElem.cy + (port.dy || 0));
                }
            }
        }

        // 끝점: toPort가 있으면 해당 포트 위치, 없으면 요소 중심
        let endX = toElem.cx, endY = toElem.cy;
        if (candidate.toPort) {
            const groupName = toElem.name || toElem.id;
            const group = groupsData[groupName];
            if (group && group.ports) {
                const port = group.ports.find(p => (p.name || p.customName) === candidate.toPort);
                if (port) {
                    endX = port.cx || (toElem.cx + (port.dx || 0));
                    endY = port.cy || (toElem.cy + (port.dy || 0));
                }
            }
        }

        // 주황색 점선으로 후보 표시
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.8)';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([8 / scale, 4 / scale]);

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        // 경로(path)가 있으면 waypoints를 따라 그림
        if (candidate.path && candidate.path.length > 0) {
            for (const pt of candidate.path) {
                ctx.lineTo(pt.x, pt.y);
            }
        }

        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 번호 표시 - 시작점 근처에
        const labelX = startX + 20;
        const labelY = startY - 20;

        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(labelX, labelY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, labelX, labelY);
    }
}

// ============ 패턴 선택 영역 ============

function drawPatternSelection() {
    // 1. 드래그 중 영역 표시
    if (typeof patternDragStart !== 'undefined' && patternDragStart && isPatternSelecting) {
        const endX = patternDragEnd ? patternDragEnd.x : (lastMouseX - viewX) / scale;
        const endY = patternDragEnd ? patternDragEnd.y : (lastMouseY - viewY) / scale;

        const x1 = Math.min(patternDragStart.x, endX);
        const y1 = Math.min(patternDragStart.y, endY);
        const w = Math.abs(endX - patternDragStart.x);
        const h = Math.abs(endY - patternDragStart.y);

        ctx.fillStyle = 'rgba(156, 39, 176, 0.15)';
        ctx.fillRect(x1, y1, w, h);
        ctx.strokeStyle = '#9c27b0';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([6 / scale, 3 / scale]);
        ctx.strokeRect(x1, y1, w, h);
        ctx.setLineDash([]);
    }

    // 2. 선택된 그룹들 - 포트에 번호 라벨 표시 (보라색 계열)
    if (typeof patternSelectedGroups !== 'undefined' && patternSelectedGroups.length > 0) {
        ctx.save();

        const groupColor = '#9c27b0';  // 보라색
        const groupColorLight = 'rgba(156, 39, 176, 0.5)';

        // 유효한 그룹만 필터링 (groupsData에 있는 것만)
        const validGroups = patternSelectedGroups.filter(elem => {
            const gd = groupsData[elem.name];
            return gd && gd.ports && gd.ports.length > 0;
        });

        for (let groupIdx = 0; groupIdx < validGroups.length; groupIdx++) {
            const elem = validGroups[groupIdx];
            const groupNum = groupIdx + 1;  // 1부터 시작

            // groupsData에서 포트 목록 가져오기
            const gd = groupsData[elem.name];
            if (!gd || !gd.ports) continue;

            // 각 포트에 "그룹번호-포트번호" 라벨 표시
            for (let portIdx = 0; portIdx < gd.ports.length; portIdx++) {
                const port = gd.ports[portIdx];
                if (port.cx === undefined || port.cy === undefined) continue;

                const portNum = portIdx + 1;
                const label = `${groupNum}-${portNum}`;

                // 포트 위치에 하이라이트 원 (보라색)
                ctx.beginPath();
                ctx.arc(port.cx, port.cy, 12 / scale, 0, Math.PI * 2);
                ctx.fillStyle = groupColorLight;
                ctx.fill();
                ctx.strokeStyle = groupColor;
                ctx.lineWidth = 3 / scale;
                ctx.stroke();

                // 라벨 배경 (포트 위쪽에 표시)
                const labelX = port.cx;
                const labelY = port.cy - 20 / scale;
                const fontSize = 12 / scale;

                ctx.font = `bold ${fontSize}px sans-serif`;
                const textWidth = ctx.measureText(label).width;
                const padding = 4 / scale;

                // 배경 박스
                ctx.fillStyle = groupColor;
                ctx.beginPath();
                ctx.roundRect(
                    labelX - textWidth / 2 - padding,
                    labelY - fontSize / 2 - padding,
                    textWidth + padding * 2,
                    fontSize + padding * 2,
                    3 / scale
                );
                ctx.fill();

                // 라벨 텍스트
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, labelX, labelY);
            }

            // 그룹 중심에 그룹 번호 표시 (큰 배지)
            const badgeSize = 32 / scale;
            ctx.fillStyle = groupColor;
            ctx.beginPath();
            ctx.arc(elem.cx, elem.cy, badgeSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3 / scale;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = `bold ${18 / scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${groupNum}`, elem.cx, elem.cy);
        }

        ctx.restore();
    }
}

// ============ 템플릿 선택 영역 ============

function drawTemplateSelection() {
    const x1 = Math.min(templateSelectStart.x, templateSelectEnd.x);
    const y1 = Math.min(templateSelectStart.y, templateSelectEnd.y);
    const w = Math.abs(templateSelectEnd.x - templateSelectStart.x);
    const h = Math.abs(templateSelectEnd.y - templateSelectStart.y);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = 'rgba(224, 64, 251, 0.15)';
    ctx.fillRect(x1, y1, w, h);
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x1, y1, w, h);
    ctx.setLineDash([]);

    ctx.restore();
}

// ============ 그룹 위치로 찾기 ============

function findGroupByPosition(cx, cy, tolerance = 20) {
    for (const [name, group] of Object.entries(groupsData)) {
        if (Math.abs(group.cx - cx) < tolerance && Math.abs(group.cy - cy) < tolerance) {
            return { name, group };
        }
    }
    return null;
}

// ============ 연결 세그먼트 계산 ============

function getConnectionSegments(conn) {
    // conn에 저장된 좌표 사용 (포트 위치가 저장되어 있음)
    const fromX = conn.fromCx ?? conn.fromX;
    const fromY = conn.fromCy ?? conn.fromY;
    const toX = conn.toCx ?? conn.toX;
    const toY = conn.toCy ?? conn.toY;

    // 유효성 체크 - 좌표가 있으면 요소 없어도 OK
    if ((fromX === undefined || fromY === undefined) ||
        (toX === undefined || toY === undefined)) {
        return [];
    }

    const segments = [];
    const waypoints = conn.waypoints || [];

    // conn에 저장된 좌표 사용 (포트 위치)
    let prevX = fromX, prevY = fromY;

    for (const wp of waypoints) {
        segments.push({ x1: prevX, y1: prevY, x2: wp.x, y2: wp.y });
        prevX = wp.x;
        prevY = wp.y;
    }
    segments.push({ x1: prevX, y1: prevY, x2: toX, y2: toY });
    return segments;
}

// ============ 교차점 찾기 ============

function findAllCrossings() {
    const crossings = [];
    const allSegments = [];

    for (let i = 0; i < customConnections.length; i++) {
        const segments = getConnectionSegments(customConnections[i]);
        for (const seg of segments) {
            allSegments.push({ ...seg, connIdx: i });
        }
    }

    for (let i = 0; i < allSegments.length; i++) {
        for (let j = i + 1; j < allSegments.length; j++) {
            if (allSegments[i].connIdx === allSegments[j].connIdx) continue;
            const intersection = lineIntersection(allSegments[i], allSegments[j]);
            if (intersection) {
                crossings.push({
                    x: intersection.x,
                    y: intersection.y,
                    bridgeConnIdx: Math.max(allSegments[i].connIdx, allSegments[j].connIdx),
                    angle: intersection.seg1Angle
                });
            }
        }
    }
    return crossings;
}

// ============ 캔버스 리사이즈 ============

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    render();
}
