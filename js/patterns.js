/**
 * patterns.js - 패턴 매칭 및 적용
 * 연결 패턴 저장/로드, 유사 그룹 찾기, 패턴 적용
 */

// ============ 패턴 저장소 ============

// 호버된 패턴 인덱스 (캔버스 하이라이트용)
let hoveredPatternIndex = null;

function loadConnectionPatternsFromStorage() {
    try {
        const saved = localStorage.getItem('connectionPatterns');
        if (saved) {
            savedConnectionPatterns = JSON.parse(saved);
            console.log('Loaded patterns:', savedConnectionPatterns.length);
        }
    } catch (e) {
        console.error('Failed to load patterns:', e);
    }
    // UI 업데이트
    updateConnectionPatternList();
}

function saveConnectionPatternsToStorage() {
    // 파일 기반 저장 (비동기)
    saveLocalData('patterns', savedConnectionPatterns);
    // localStorage에도 백업
    try {
        localStorage.setItem('connectionPatterns', JSON.stringify(savedConnectionPatterns));
        console.log('Saved patterns:', savedConnectionPatterns.length);
    } catch (e) {
        console.error('Failed to save patterns:', e);
    }
}

// ============ 패턴 UI ============

function updateConnectionPatternList() {
    const listEl = document.getElementById('connection-pattern-list');
    if (!listEl) return;

    if (savedConnectionPatterns.length === 0) {
        listEl.innerHTML = '<div style="color:#888; padding:8px; font-size:10px;">저장된 패턴 없음</div>';
        return;
    }

    let html = '';
    for (let i = 0; i < savedConnectionPatterns.length; i++) {
        const p = savedConnectionPatterns[i];
        const isSelected = selectedPatternIndex === i;
        const bgColor = isSelected ? '#1a4a7a' : '#2a2a3a';
        const elements = p.elements || p.blocks || [];

        html += `
            <div onclick="selectConnectionPattern(${i})" ondblclick="showPatternDetail(${i})"
                 onmouseenter="highlightPatternOnCanvas(${i})"
                 onmouseleave="unhighlightPatternOnCanvas()"
                 style="padding:6px 8px; margin:3px 0; background:${bgColor}; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:space-between;"
                 title="더블클릭: 상세 보기 | 호버: 화면 미리보기">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:11px; color:#fff;">${p.name || `패턴 ${i + 1}`}</div>
                    <div style="color:#888; font-size:9px; margin-top:2px;">${elements.length}개 요소 · ${(p.connections || []).length}개 연결</div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button onclick="event.stopPropagation(); showPatternDetail(${i})"
                            style="width:20px; height:20px; padding:0; background:transparent; border:1px solid #666; border-radius:3px; color:#888; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            onmouseover="this.style.background='#9c27b0'; this.style.borderColor='#9c27b0'; this.style.color='#fff';"
                            onmouseout="this.style.background='transparent'; this.style.borderColor='#666'; this.style.color='#888';"
                            title="상세 보기">👁</button>
                    <button onclick="event.stopPropagation(); deleteConnectionPattern(${i})"
                            style="width:20px; height:20px; padding:0; background:transparent; border:1px solid #666; border-radius:3px; color:#888; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            onmouseover="this.style.background='#c62828'; this.style.borderColor='#c62828'; this.style.color='#fff';"
                            onmouseout="this.style.background='transparent'; this.style.borderColor='#666'; this.style.color='#888';"
                            title="삭제">×</button>
                </div>
            </div>
        `;
    }

    listEl.innerHTML = html;
}

function selectConnectionPattern(idx) {
    selectedPatternIndex = idx;

    // 드래그 선택 영역 초기화 (저장된 패턴 선택 시)
    patternSelectStart = null;
    patternSelectEnd = null;

    updateConnectionPatternList();
    updatePatternSelectionInfo();

    // 선택된 패턴 정보 영역 표시
    const selectedPatternInfo = document.getElementById('selected-pattern-info');
    const selectedPatternDetail = document.getElementById('selected-pattern-detail');

    if (idx >= 0 && savedConnectionPatterns[idx]) {
        const pattern = savedConnectionPatterns[idx];
        const elements = pattern.elements || [];
        const connections = pattern.connections || [];

        if (selectedPatternInfo) {
            selectedPatternInfo.style.display = 'block';
        }
        if (selectedPatternDetail) {
            selectedPatternDetail.innerHTML = `
                <div>요소: ${elements.length}개</div>
                <div>연결: ${connections.length}개</div>
            `;
        }
    } else {
        if (selectedPatternInfo) {
            selectedPatternInfo.style.display = 'none';
        }
    }

    render();
}

async function deleteConnectionPattern(idx) {
    if (!(await showConfirm('이 패턴을 삭제하시겠습니까?', { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    savedConnectionPatterns.splice(idx, 1);
    if (selectedPatternIndex >= savedConnectionPatterns.length) {
        selectedPatternIndex = savedConnectionPatterns.length - 1;
    }

    saveConnectionPatternsToStorage();
    updateConnectionPatternList();
    hidePatternResults();
    render();
}

async function clearAllConnectionPatterns() {
    if (!(await showConfirm('모든 패턴을 삭제하시겠습니까?', { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    savedConnectionPatterns = [];
    selectedPatternIndex = -1;
    saveConnectionPatternsToStorage();
    updateConnectionPatternList();
    hidePatternResults();
}

/**
 * 패턴 결과 UI 숨기기
 */
function hidePatternResults() {
    const selectedPatternInfo = document.getElementById('selected-pattern-info');
    const similarGroupsList = document.getElementById('similar-groups-list');
    const applyAllContainer = document.getElementById('pattern-apply-all-container');

    if (selectedPatternInfo) selectedPatternInfo.style.display = 'none';
    if (similarGroupsList) similarGroupsList.style.display = 'none';
    if (applyAllContainer) applyAllContainer.style.display = 'none';
}

// ============ 패턴 모드 ============

// 선택된 그룹들 (드래그 또는 클릭으로 선택)
let patternSelectedGroups = [];

function togglePatternMode() {
    patternMode = !patternMode;
    console.log('[패턴] 모드 전환:', patternMode);

    // 툴바 버튼들 (상단)
    const toolConnBtn = document.getElementById('toolConnectBtn');
    const toolTmplBtn = document.getElementById('toolTemplateBtn');
    const toolEditBtn = document.getElementById('toolEditBtn');
    // 사이드바 버튼들
    const connBtn = document.getElementById('connectBtn');
    const tmplBtn = document.getElementById('templateBtn');
    const editBtn = document.getElementById('editBtn');

    // 버튼 비활성화 헬퍼
    function disableBtn(btn, text) {
        if (btn) {
            btn.classList.remove('active');
            btn.classList.add('disabled');
            if (text) btn.textContent = text;
            btn.style.opacity = '0.4';
            btn.style.pointerEvents = 'none';
        }
    }
    function enableBtn(btn) {
        if (btn) {
            btn.classList.remove('disabled');
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }

    // 패턴 모드 ON 시 다른 모드들 해제 및 버튼 비활성화
    if (patternMode) {
        // C - 연결 모드 해제 (connectMode 사용)
        if (typeof connectMode !== 'undefined') connectMode = false;
        if (typeof connectStart !== 'undefined') connectStart = null;
        if (typeof connectWaypoints !== 'undefined') connectWaypoints = [];
        disableBtn(toolConnBtn, 'C');
        disableBtn(connBtn, 'Connect');

        // T - 템플릿 모드 해제
        if (typeof templateMode !== 'undefined') templateMode = false;
        if (typeof templateAnchor !== 'undefined') templateAnchor = null;
        if (typeof isTemplateSelecting !== 'undefined') isTemplateSelecting = false;
        disableBtn(toolTmplBtn, 'T');
        disableBtn(tmplBtn, 'Template');

        // E - 편집 모드 해제
        if (typeof editMode !== 'undefined') editMode = false;
        disableBtn(toolEditBtn, 'E');
        disableBtn(editBtn, 'Edit');
    } else {
        // 패턴 모드 OFF 시 버튼 활성화 복원
        enableBtn(toolConnBtn);
        enableBtn(connBtn);
        enableBtn(toolTmplBtn);
        enableBtn(tmplBtn);
        enableBtn(toolEditBtn);
        enableBtn(editBtn);

        patternSelectedGroups = [];
        isPatternSelecting = false;
    }

    const btn = document.getElementById('patternModeBtn');
    if (btn) {
        btn.classList.toggle('active', patternMode);
        btn.textContent = patternMode ? '패턴모드 ON' : '패턴모드';
    }

    if (canvas) {
        canvas.style.cursor = patternMode ? 'crosshair' : '';
    }
    render();
}

// 그룹 클릭으로 선택/해제 토글
// addMode가 true면 추가 선택, false면 단일 선택
function handlePatternClick(worldX, worldY, addMode = false) {
    console.log('[패턴 클릭] addMode:', addMode, 'worldX:', worldX.toFixed(1), 'worldY:', worldY.toFixed(1));

    // 클릭 위치에서 그룹 찾기 (groupsData 기반으로 - 드래그 선택과 동일하게)
    let clickedGroup = null;
    const clickTolerance = 100; // 100픽셀까지 허용

    // 1. groupsData에서 가장 가까운 그룹 찾기
    let bestDist = clickTolerance;
    for (const [name, gd] of Object.entries(groupsData)) {
        if (!gd.cx || !gd.cy) continue;

        const dist = Math.hypot(gd.cx - worldX, gd.cy - worldY);
        if (dist < bestDist) {
            bestDist = dist;
            // blocks 배열에서 해당 이름을 가진 블록 찾기
            const block = blocks.find(b => b.name === name);
            if (block) {
                clickedGroup = block;
            } else {
                // blocks에 없으면 groupsData 기반으로 가상 블록 생성
                clickedGroup = {
                    id: name,
                    name: name,
                    type: 'GROUP',
                    cx: gd.cx,
                    cy: gd.cy,
                    x1: gd.x1 || gd.cx - 50,
                    y1: gd.y1 || gd.cy - 50,
                    x2: gd.x2 || gd.cx + 50,
                    y2: gd.y2 || gd.cy + 50
                };
            }
        }
    }

    // 2. groupsData에서 못 찾으면 blocks에서 찾기 (폴백)
    if (!clickedGroup) {
        for (const block of blocks) {
            const dist = Math.hypot(block.cx - worldX, block.cy - worldY);
            if (dist < clickTolerance && dist < bestDist) {
                bestDist = dist;
                clickedGroup = block;
            }
        }
    }

    if (!clickedGroup) {
        console.log('[패턴 클릭] 그룹을 찾지 못함 - 클릭 위치 근처에 그룹 없음');
        return false;
    }

    console.log('[패턴 클릭] 찾은 그룹:', clickedGroup.name);

    const existingIdx = patternSelectedGroups.findIndex(e =>
        e.id === clickedGroup.id || e.name === clickedGroup.name
    );

    if (addMode) {
        // 추가 모드: 토글 (있으면 제거, 없으면 추가)
        if (existingIdx >= 0) {
            patternSelectedGroups.splice(existingIdx, 1);
            console.log('[패턴] 선택 해제:', clickedGroup.name);
        } else {
            patternSelectedGroups.push(clickedGroup);
            console.log('[패턴] 선택 추가:', clickedGroup.name, '총:', patternSelectedGroups.length);
        }
    } else {
        // 단일 선택 모드: 기존 선택 초기화 후 새로 선택
        patternSelectedGroups = [clickedGroup];
        console.log('[패턴] 단일 선택:', clickedGroup.name);
    }

    updatePatternSelectionInfo();
    render();
    return true;
}

// ============ 패턴 드래그 선택 ============

// 드래그 중 임시 영역 (렌더링용)
let patternDragStart = null;
let patternDragEnd = null;

function handlePatternDragStart(e) {
    try {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 드래그 시작 시에는 초기화하지 않음 (드래그 종료 시 Ctrl 여부에 따라 결정)
        patternDragStart = {
            x: (mouseX - viewX) / scale,
            y: (mouseY - viewY) / scale
        };
        patternDragEnd = { ...patternDragStart };
        isPatternSelecting = true;
        console.log('[패턴] 드래그 시작, ctrlKey:', e.ctrlKey);
    } catch (err) {
        console.error('[패턴] 드래그 시작 오류:', err);
        isPatternSelecting = false;
    }
}

function handlePatternDragMove(e) {
    if (!isPatternSelecting) return;

    try {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        patternDragEnd = {
            x: (mouseX - viewX) / scale,
            y: (mouseY - viewY) / scale
        };

        render();
    } catch (err) {
        console.error('[패턴] 드래그 이동 오류:', err);
        isPatternSelecting = false;
    }
}

function handlePatternDragEnd(e) {
    if (!isPatternSelecting) return;

    isPatternSelecting = false;

    try {
        if (!patternDragStart || !patternDragEnd) {
            patternDragStart = null;
            patternDragEnd = null;
            render();
            return;
        }

        const x1 = Math.min(patternDragStart.x, patternDragEnd.x);
        const x2 = Math.max(patternDragStart.x, patternDragEnd.x);
        const y1 = Math.min(patternDragStart.y, patternDragEnd.y);
        const y2 = Math.max(patternDragStart.y, patternDragEnd.y);

        const selectionSize = Math.max(x2 - x1, y2 - y1);

        // 영역이 너무 작으면 (클릭) - 개별 선택 시도
        if (selectionSize < 10) {
            const worldX = patternDragEnd.x;
            const worldY = patternDragEnd.y;
            console.log('[패턴] 클릭 감지 - worldX:', worldX.toFixed(1), 'worldY:', worldY.toFixed(1), 'ctrlKey:', e.ctrlKey);
            // Ctrl 키로 추가 선택
            handlePatternClick(worldX, worldY, e.ctrlKey);
            patternDragStart = null;
            patternDragEnd = null;
            return;
        }

        // Ctrl 키: 기존 선택에 추가, 아니면 새로 선택 (여기서만 초기화)
        if (!e.ctrlKey) {
            patternSelectedGroups = [];
            console.log('[패턴] 새 드래그 - 기존 선택 초기화');
        }

        // 드래그 영역 내 그룹 찾기 (groupsData 기반)
        const groupsInArea = [];
        for (const [name, gd] of Object.entries(groupsData)) {
            if (!gd.cx || !gd.cy) continue;

            // 그룹 중심이 선택 영역 내에 있는지 확인
            if (gd.cx >= x1 && gd.cx <= x2 && gd.cy >= y1 && gd.cy <= y2) {
                // blocks에서 해당 그룹 찾기
                const block = blocks.find(b => b.name === name);
                if (block) {
                    groupsInArea.push(block);
                } else {
                    // blocks에 없으면 groupsData 기반으로 생성
                    groupsInArea.push({
                        id: name,
                        name: name,
                        type: 'GROUP',
                        cx: gd.cx,
                        cy: gd.cy,
                        x1: gd.x1 || gd.cx - 50,
                        y1: gd.y1 || gd.cy - 50,
                        x2: gd.x2 || gd.cx + 50,
                        y2: gd.y2 || gd.cy + 50
                    });
                }
            }
        }

        console.log('[패턴] 드래그 영역 내 그룹:', groupsInArea.length);

        // 중복 없이 추가
        for (const group of groupsInArea) {
            const exists = patternSelectedGroups.some(g =>
                g.id === group.id || g.name === group.name
            );
            if (!exists) {
                patternSelectedGroups.push(group);
            }
        }

        console.log('[패턴] 총 선택된 그룹:', patternSelectedGroups.length);

        // 드래그 영역 초기화 (선택된 그룹만 표시)
        patternDragStart = null;
        patternDragEnd = null;

        updatePatternSelectionInfo();
        render();
    } catch (err) {
        console.error('[패턴] 드래그 종료 오류:', err);
        patternDragStart = null;
        patternDragEnd = null;
    }
}

// ============ 패턴 저장 ============

function saveConnectionPatternFromSelection() {
    console.log('[패턴 저장] 시작');

    // 선택된 그룹이 없으면 경고
    if (!patternSelectedGroups || patternSelectedGroups.length === 0) {
        showToast('선택된 그룹이 없습니다. 드래그 또는 클릭으로 그룹을 선택하세요.', 'info');
        return;
    }

    // 선택된 그룹들로 요소 정보 생성
    const elementsInArea = [];
    const addedBlockNames = new Set();

    for (const block of patternSelectedGroups) {
        if (addedBlockNames.has(block.name)) continue;
        addedBlockNames.add(block.name);

        const gd = groupsData[block.name];
        const childPorts = (gd?.ports || []).map(p => ({
            name: p.name,
            normalizedName: normalizeElementType(p.name, p.type),
            relX: (p.cx || block.cx) - block.cx,
            relY: (p.cy || block.cy) - block.cy,
            cx: p.cx,
            cy: p.cy
        }));

        elementsInArea.push({
            id: block.id,
            name: block.name,
            type: block.type,
            cx: block.cx,
            cy: block.cy,
            isGroup: true,
            normalizedName: block.type,
            childPorts
        });
    }

    console.log('[패턴 저장] 선택된 그룹:', elementsInArea.length);
    console.log('[패턴 저장] 선택된 그룹 목록:', elementsInArea.map(e => e.name).join(', '));

    // 선택된 요소들 간의 연결선 수집
    const connectionsInArea = [];
    const portTolerance = 50; // 포트 위치 매칭 tolerance (더 넓게)

    for (const conn of customConnections) {
        const fromX = conn.fromCx ?? conn.fromX;
        const fromY = conn.fromCy ?? conn.fromY;
        const toX = conn.toCx ?? conn.toX;
        const toY = conn.toCy ?? conn.toY;

        // 연결선의 from/to가 선택된 요소에 포함되는지 확인
        let fromElemIdx = -1;
        let toElemIdx = -1;

        // 1. fromParent/toParent 이름으로 먼저 찾기
        if (conn.fromParent) {
            fromElemIdx = elementsInArea.findIndex(e => e.name === conn.fromParent);
        }
        if (conn.toParent) {
            toElemIdx = elementsInArea.findIndex(e => e.name === conn.toParent);
        }

        // 2. 포트 이름이 그룹의 포트 중 하나와 매칭되는지 확인
        if (fromElemIdx < 0 && conn.fromName) {
            fromElemIdx = elementsInArea.findIndex(e => {
                const gd = groupsData[e.name];
                if (!gd || !gd.ports) return false;
                return gd.ports.some(p => p.name === conn.fromName);
            });
        }
        if (toElemIdx < 0 && conn.toName) {
            toElemIdx = elementsInArea.findIndex(e => {
                const gd = groupsData[e.name];
                if (!gd || !gd.ports) return false;
                return gd.ports.some(p => p.name === conn.toName);
            });
        }

        // 3. 포트 위치가 그룹 내에 있는지 확인 (좌표 기반)
        if (fromElemIdx < 0 && fromX !== undefined && fromY !== undefined) {
            fromElemIdx = elementsInArea.findIndex(e => {
                const gd = groupsData[e.name];
                if (!gd || !gd.ports) return false;
                return gd.ports.some(p =>
                    Math.abs((p.cx || 0) - fromX) < portTolerance && Math.abs((p.cy || 0) - fromY) < portTolerance
                );
            });
        }
        if (toElemIdx < 0 && toX !== undefined && toY !== undefined) {
            toElemIdx = elementsInArea.findIndex(e => {
                const gd = groupsData[e.name];
                if (!gd || !gd.ports) return false;
                return gd.ports.some(p =>
                    Math.abs((p.cx || 0) - toX) < portTolerance && Math.abs((p.cy || 0) - toY) < portTolerance
                );
            });
        }

        // 4. 그룹 영역 내에 있는지 확인 (마지막 시도)
        if (fromElemIdx < 0 && fromX !== undefined && fromY !== undefined) {
            fromElemIdx = elementsInArea.findIndex(e => {
                const gd = groupsData[e.name];
                if (!gd) return false;
                const margin = 30;
                const x1 = (gd.x1 || e.cx - 50) - margin;
                const y1 = (gd.y1 || e.cy - 50) - margin;
                const x2 = (gd.x2 || e.cx + 50) + margin;
                const y2 = (gd.y2 || e.cy + 50) + margin;
                return fromX >= x1 && fromX <= x2 && fromY >= y1 && fromY <= y2;
            });
        }
        if (toElemIdx < 0 && toX !== undefined && toY !== undefined) {
            toElemIdx = elementsInArea.findIndex(e => {
                const gd = groupsData[e.name];
                if (!gd) return false;
                const margin = 30;
                const x1 = (gd.x1 || e.cx - 50) - margin;
                const y1 = (gd.y1 || e.cy - 50) - margin;
                const x2 = (gd.x2 || e.cx + 50) + margin;
                const y2 = (gd.y2 || e.cy + 50) + margin;
                return toX >= x1 && toX <= x2 && toY >= y1 && toY <= y2;
            });
        }

        // 디버그: 연결선 매칭 결과 로그
        if (fromElemIdx < 0 || toElemIdx < 0) {
            console.log(`[패턴 저장] 연결선 스킵: ${conn.fromName} -> ${conn.toName}`);
            console.log(`  fromParent: ${conn.fromParent}, toParent: ${conn.toParent}`);
            console.log(`  fromXY: (${fromX?.toFixed(1)}, ${fromY?.toFixed(1)}), toXY: (${toX?.toFixed(1)}, ${toY?.toFixed(1)})`);
            console.log(`  fromIdx=${fromElemIdx}, toIdx=${toElemIdx}, waypoints=${conn.waypoints?.length || 0}`);
        }

        // 양쪽 다 선택된 요소에 포함된 경우만 수집
        if (fromElemIdx >= 0 && toElemIdx >= 0) {
            const fromElem = elementsInArea[fromElemIdx];
            const toElem = elementsInArea[toElemIdx];

            // 포트의 상대 위치 계산 (요소 중심 기준)
            const fromPortRelX = fromX - fromElem.cx;
            const fromPortRelY = fromY - fromElem.cy;
            const toPortRelX = toX - toElem.cx;
            const toPortRelY = toY - toElem.cy;

            // 포트 인덱스 찾기 (위치 기반)
            const fromPortIdx = findPortIndexByPosition(fromElem.childPorts, fromPortRelX, fromPortRelY);
            const toPortIdx = findPortIndexByPosition(toElem.childPorts, toPortRelX, toPortRelY);

            connectionsInArea.push({
                fromElemIdx,
                toElemIdx,
                fromPortName: normalizeElementType(conn.fromName, null),
                toPortName: normalizeElementType(conn.toName, null),
                fromPortFullName: conn.fromName,
                toPortFullName: conn.toName,
                // 위치 기반 매칭용 정보 추가
                fromPortIdx,
                toPortIdx,
                fromPortRelX,
                fromPortRelY,
                toPortRelX,
                toPortRelY,
                // waypoints 저장 (상대 좌표로 변환)
                waypoints: (conn.waypoints || []).map(wp => ({
                    relX: wp.x - fromX,
                    relY: wp.y - fromY
                }))
            });
        }
    }

    console.log('[패턴 저장] 연결선:', connectionsInArea.length, '개')

    const name = prompt('패턴 이름:', `패턴 ${savedConnectionPatterns.length + 1}`);
    if (!name) return;

    const pattern = {
        name,
        elements: elementsInArea,
        connections: connectionsInArea,
        signature: elementsInArea.map(e => e.normalizedName).sort().join(','),
        createdAt: new Date().toISOString()
    };

    savedConnectionPatterns.push(pattern);
    saveConnectionPatternsToStorage();
    updateConnectionPatternList();

    // 선택 상태 초기화
    patternSelectedGroups = [];

    // 새로 저장한 패턴 선택
    const newPatternIdx = savedConnectionPatterns.length - 1;
    selectConnectionPattern(newPatternIdx);

    // 자동으로 유사 그룹 찾기
    console.log('[패턴 저장] 유사 그룹 자동 검색 시작');
    findSimilarGroupsAfterSave(pattern);
}

// 패턴 저장 후 자동으로 유사 그룹 찾기 및 적용 제안
function findSimilarGroupsAfterSave(pattern) {
    // 유사 그룹 찾기 실행
    findSimilarGroups();

    // 저장된 패턴 상세 정보 표시
    showPatternSaveResult(pattern, foundSimilarGroups.length);
}

// 패턴 미니맵 이미지 생성
function createPatternMinimap(pattern, width = 300, height = 200) {
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = width;
    miniCanvas.height = height;
    const ctx = miniCanvas.getContext('2d');

    const elements = pattern.elements || [];
    const connections = pattern.connections || [];

    if (elements.length === 0) return miniCanvas.toDataURL();

    // 경계 계산
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of elements) {
        const gd = groupsData[e.name];
        if (gd) {
            minX = Math.min(minX, gd.x1 || e.cx - 50);
            minY = Math.min(minY, gd.y1 || e.cy - 50);
            maxX = Math.max(maxX, gd.x2 || e.cx + 50);
            maxY = Math.max(maxY, gd.y2 || e.cy + 50);
        } else {
            minX = Math.min(minX, e.cx - 50);
            minY = Math.min(minY, e.cy - 50);
            maxX = Math.max(maxX, e.cx + 50);
            maxY = Math.max(maxY, e.cy + 50);
        }
    }

    const padding = 20;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const scaleX = (width - padding * 2) / contentW;
    const scaleY = (height - padding * 2) / contentH;
    const miniScale = Math.min(scaleX, scaleY, 1);

    const offsetX = padding + (width - padding * 2 - contentW * miniScale) / 2 - minX * miniScale;
    const offsetY = padding + (height - padding * 2 - contentH * miniScale) / 2 - minY * miniScale;

    // 배경
    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, width, height);

    // 연결선 그리기
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    for (const conn of connections) {
        const fromElem = elements[conn.fromElemIdx];
        const toElem = elements[conn.toElemIdx];
        if (!fromElem || !toElem) continue;

        const fx = fromElem.cx * miniScale + offsetX;
        const fy = fromElem.cy * miniScale + offsetY;
        const tx = toElem.cx * miniScale + offsetX;
        const ty = toElem.cy * miniScale + offsetY;

        ctx.beginPath();
        ctx.moveTo(fx, fy);

        // waypoints가 있으면 꺾인 선으로
        if (conn.waypoints && conn.waypoints.length > 0) {
            ctx.setLineDash([4, 2]);
            for (const wp of conn.waypoints) {
                const wpx = (fromElem.cx + wp.relX) * miniScale + offsetX;
                const wpy = (fromElem.cy + wp.relY) * miniScale + offsetY;
                ctx.lineTo(wpx, wpy);
            }
        }
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 그룹 그리기
    for (let i = 0; i < elements.length; i++) {
        const e = elements[i];
        const gd = groupsData[e.name];

        const cx = e.cx * miniScale + offsetX;
        const cy = e.cy * miniScale + offsetY;

        // 그룹 박스
        ctx.fillStyle = '#9c27b0';
        ctx.globalAlpha = 0.3;
        const boxW = ((gd?.x2 || e.cx + 40) - (gd?.x1 || e.cx - 40)) * miniScale;
        const boxH = ((gd?.y2 || e.cy + 30) - (gd?.y1 || e.cy - 30)) * miniScale;
        ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
        ctx.globalAlpha = 1;

        // 테두리
        ctx.strokeStyle = '#9c27b0';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

        // 번호
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, cx, cy);
    }

    return miniCanvas.toDataURL();
}

// 패턴 저장 결과 팝업 표시
function showPatternSaveResult(pattern, similarCount) {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('pattern-save-result-popup');
    if (existingPopup) existingPopup.remove();

    const elements = pattern.elements || [];
    const connections = pattern.connections || [];

    // 미니맵 이미지 생성
    const minimapDataUrl = createPatternMinimap(pattern);

    // 팝업 HTML 생성
    const popup = document.createElement('div');
    popup.id = 'pattern-save-result-popup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1e1e2e;
        border: 2px solid #9c27b0;
        border-radius: 12px;
        padding: 20px;
        min-width: 450px;
        max-width: 600px;
        max-height: 85vh;
        overflow-y: auto;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        font-family: 'Consolas', monospace;
        color: #fff;
    `;

    popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #9c27b0;">✓ 패턴 저장 완료</h3>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer;">&times;</button>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #aaa; font-size: 12px;">패턴 이름</div>
            <div style="font-size: 16px; font-weight: bold; color: #fff;">${pattern.name}</div>
        </div>

        <!-- 미니맵 이미지 -->
        <div style="margin-bottom: 15px; text-align: center;">
            <img src="${minimapDataUrl}" style="border: 1px solid #444; border-radius: 8px; max-width: 100%;" />
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <div style="flex: 1; background: #2a2a3a; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; color: #9c27b0; font-weight: bold;">${elements.length}</div>
                <div style="font-size: 11px; color: #888;">그룹</div>
            </div>
            <div style="flex: 1; background: #2a2a3a; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; color: #2196f3; font-weight: bold;">${connections.length}</div>
                <div style="font-size: 11px; color: #888;">연결선</div>
            </div>
            <div style="flex: 1; background: #2a2a3a; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; color: #ff9800; font-weight: bold;">${similarCount}</div>
                <div style="font-size: 11px; color: #888;">유사 그룹</div>
            </div>
        </div>

        <!-- 그룹 목록 (번호와 함께) -->
        <div style="margin-bottom: 15px; background: #0d0d15; padding: 10px; border-radius: 6px; max-height: 100px; overflow-y: auto;">
            ${elements.map((e, i) => `<div style="display: flex; align-items: center; margin: 3px 0;">
                <span style="background: #9c27b0; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 8px;">${i + 1}</span>
                <span style="color: #ccc; font-size: 12px;">${e.name}</span>
                <span style="color: #666; font-size: 10px; margin-left: auto;">${e.childPorts?.length || 0} 포트</span>
            </div>`).join('')}
        </div>

        ${similarCount > 0 ? `
        <div style="background: #2e1f3d; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <div style="color: #ff9800; margin-bottom: 8px;">🔍 ${similarCount}개의 유사 그룹 발견!</div>
            <button onclick="applyPatternToAllGroups(true); this.parentElement.parentElement.remove();"
                    style="background: #9c27b0; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                모두 적용
            </button>
            <button onclick="this.parentElement.parentElement.remove();"
                    style="background: #444; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                나중에
            </button>
        </div>
        ` : `
        <div style="background: #1a2a1a; padding: 12px; border-radius: 8px; color: #888; text-align: center; margin-bottom: 15px;">
            유사한 그룹을 찾지 못했습니다.
        </div>
        `}

        <div style="text-align: right;">
            <button onclick="this.parentElement.parentElement.remove();"
                    style="background: #333; color: #fff; border: 1px solid #555; padding: 8px 20px; border-radius: 6px; cursor: pointer;">
                닫기
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // ESC 키로 닫기
    const closeOnEsc = (e) => {
        if (e.key === 'Escape') {
            popup.remove();
            document.removeEventListener('keydown', closeOnEsc);
        }
    };
    document.addEventListener('keydown', closeOnEsc);
}

// 저장된 패턴 상세 보기
function showPatternDetail(patternIdx) {
    if (patternIdx < 0 || !savedConnectionPatterns[patternIdx]) return;

    const pattern = savedConnectionPatterns[patternIdx];
    showPatternSaveResult(pattern, 0); // 유사 그룹은 0으로 (이미 저장된 패턴이므로)
}

// 상대 위치로 포트 인덱스 찾기
function findPortIndexByPosition(childPorts, relX, relY, tolerance = 20) {
    if (!childPorts || childPorts.length === 0) return -1;

    let bestIdx = -1;
    let bestDist = tolerance + 1;

    for (let i = 0; i < childPorts.length; i++) {
        const p = childPorts[i];
        const dist = Math.hypot((p.relX || 0) - relX, (p.relY || 0) - relY);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }

    return bestIdx;
}

// ============ 유사 그룹 찾기 ============

// 포트명을 기능적 타입으로 정규화
function normalizePortName(name) {
    if (!name) return 'OTHER';
    const upper = name.toUpperCase().trim();

    // 1. 표준 포트 타입 패턴 매칭
    // IN 포트 패턴: IN, IN1, IN2, AI, DI, PV, STPT, XIC, XIO, K
    if (/^IN\d*$/.test(upper)) return 'IN';
    if (/^(AI|DI)\d*$/.test(upper)) return 'IN';
    if (/^(PV|STPT|XIC|XIO)\d*$/.test(upper)) return 'IN';
    if (/^K\d*$/.test(upper)) return 'IN';
    if (/^A\d*$/.test(upper) && upper.length <= 2) return 'IN';  // A, A1 (짧은 것만)

    // OUT 포트 패턴: OUT, OUT1, G, G1, AO, DO, OTE, OTL, OTU, MV, YES, NO
    if (/^OUT\d*$/.test(upper)) return 'OUT';
    if (/^G\d*$/.test(upper) && upper.length <= 2) return 'OUT';  // G, G1
    if (/^(AO|DO)\d*$/.test(upper)) return 'OUT';
    if (/^(OTE|OTL|OTU|MV)\d*$/.test(upper)) return 'OUT';
    if (upper === 'YES' || upper === 'NO') return 'OUT';

    // FLAG/STATUS 패턴: FLAG, T, MODE, MAN, AUTO
    if (upper === 'FLAG' || upper === 'T') return 'FLAG';
    if (/^(MODE|MAN|AUTO|M\/A)\d*$/.test(upper)) return 'MODE';

    // REF 패턴: 시트 참조, D03-xxx 등의 참조
    if (/^D\d{2}-\d{3}/.test(upper)) return 'REF';
    if (/^\d+\/\d+$/.test(upper)) return 'REF';  // 3/062 같은 시트 참조
    if (/^SHEET/.test(upper)) return 'REF';

    // DESC 패턴: DESC:, Description 등
    if (/^DESC/.test(upper)) return 'DESC';
    if (/^DESCRIPTION/.test(upper)) return 'DESC';

    // 괄호로 둘러싸인 참조: (D03-xxx-xx)
    if (/^\(.*\)$/.test(upper)) return 'REF';

    // 숫자로만 된 것: 참조번호
    if (/^\d+$/.test(upper)) return 'NUM';

    // 짧은 알파벳+숫자: A1, G2 등 - 입력/출력
    const shortMatch = upper.match(/^([A-Z])\d*$/);
    if (shortMatch) {
        const letter = shortMatch[1];
        if ('AIJK'.includes(letter)) return 'IN';
        if ('GQO'.includes(letter)) return 'OUT';
    }

    return 'OTHER';
}

// 포트 시그니처 생성 (정렬된 포트명 배열 - 포트 이름 기반)
function getPortSignature(ports) {
    if (!ports || ports.length === 0) return '';
    // 포트 이름 자체를 정규화해서 사용 (IN, OUT, A, G 등)
    return ports.map(p => normalizePortName(p.name)).sort().join(',');
}

// 블록의 포트 시그니처 가져오기
function getBlockPortSignature(block) {
    // block.name, block.id, block.text 순으로 groupsData에서 찾기
    let gd = groupsData[block.name] || groupsData[block.id] || groupsData[block.text];

    if (!gd || !gd.ports || gd.ports.length === 0) return '';
    return gd.ports.map(p => normalizePortName(p.name)).sort().join(',');
}

function findSimilarGroups() {
    const listDiv = document.getElementById('similar-groups-list');

    if (selectedPatternIndex < 0 || !savedConnectionPatterns[selectedPatternIndex]) {
        showToast('먼저 패턴을 선택해주세요.', 'info');
        return;
    }

    const pattern = savedConnectionPatterns[selectedPatternIndex];
    const patternElements = pattern.elements || pattern.blocks;
    if (!patternElements || patternElements.length === 0) {
        showToast('패턴에 요소가 없습니다.', 'error');
        return;
    }

    console.log('[유사 찾기] 패턴:', pattern.name, '요소:', patternElements.length);

    // 패턴의 각 요소별 포트 시그니처 계산 - groupsData에서 직접 가져오기
    const patternSignatures = patternElements.map((elem, idx) => {
        // 저장된 childPorts 사용하거나, groupsData에서 다시 가져오기
        let ports = elem.childPorts || [];

        // childPorts가 비어있으면 groupsData에서 직접 조회
        if (ports.length === 0) {
            const gd = groupsData[elem.name] || groupsData[elem.id];
            if (gd && gd.ports) {
                ports = gd.ports;
            }
        }

        const sig = getPortSignature(ports);
        console.log(`[패턴 시그] ${elem.name}: 포트=${ports.length}개, 시그=[${sig}]`);
        return {
            idx,
            type: elem.type,
            portSignature: sig,
            portCount: ports.length,
            name: elem.name
        };
    });

    // 포트가 가장 많은 요소를 앵커로 선택 (구분력이 높음)
    let anchorIdx = 0;
    let maxPortCount = 0;
    for (let i = 0; i < patternSignatures.length; i++) {
        if (patternSignatures[i].portCount > maxPortCount) {
            maxPortCount = patternSignatures[i].portCount;
            anchorIdx = i;
        }
    }

    const patternAnchor = patternElements[anchorIdx];
    const patternAnchorX = patternAnchor.cx || 0;
    const patternAnchorY = patternAnchor.cy || 0;

    console.log(`[유사 찾기] 앵커: ${patternAnchor.name} (인덱스 ${anchorIdx}, 포트 ${maxPortCount}개)`);

    // 패턴 요소들의 상대 위치 계산 (앵커 기준)
    const patternRelPos = patternElements.map((e, idx) => ({
        idx,
        relX: (e.cx || 0) - patternAnchorX,
        relY: (e.cy || 0) - patternAnchorY,
        type: e.type,
        isGroup: e.isGroup,
        normalizedName: e.normalizedName || e.type || e.name,
        childPorts: e.childPorts || []
    }));

    // 패턴에 사용된 요소 ID들 (중복 방지)
    const usedElementIds = new Set(patternElements.map(e => e.id || e.name));
    foundSimilarGroups = [];
    const positionTolerance = 150; // 위치 허용 오차는 넓게 (조건은 포트로 엄격하게)

    // 앵커 후보: 포트가 많은 패턴 요소와 시그니처가 일치하는 블록
    const anchorSig = patternSignatures[anchorIdx];
    const anchorCandidates = [];

    console.log('[유사 찾기] 앵커 포트 시그니처:', anchorSig.portSignature, '포트수:', anchorSig.portCount);

    for (const block of blocks) {
        // 패턴에 이미 사용된 요소는 제외
        if (usedElementIds.has(block.id) || usedElementIds.has(block.name)) continue;

        const blockSig = getBlockPortSignature(block);

        // 포트 시그니처가 정확히 일치해야만 앵커 후보
        if (blockSig === anchorSig.portSignature) {
            const gd = groupsData[block.name] || groupsData[block.id];
            anchorCandidates.push({
                element: block,
                cx: block.cx,
                cy: block.cy,
                isGroup: true,
                groupData: gd,
                portSignature: blockSig,
                portMatchRatio: 1.0,
                totalScore: 100,
                anchorIdx // 앵커 인덱스 저장
            });
        }
    }

    console.log('[유사 찾기] 앵커 후보 (포트 정확 일치):', anchorCandidates.length);

    // 각 앵커에서 매칭 시도 - 모든 요소가 포트 일치해야 함
    for (const anchor of anchorCandidates) {
        // 매칭 결과를 패턴 인덱스 순서대로 저장할 배열 (빈 슬롯으로 초기화)
        const matchedByIndex = new Array(patternElements.length).fill(null);
        matchedByIndex[anchorIdx] = anchor; // 앵커를 해당 인덱스에 배치

        let totalPosError = 0;
        let allMatched = true;

        // 앵커를 제외한 나머지 요소들과 매칭
        for (let i = 0; i < patternElements.length; i++) {
            if (i === anchorIdx) continue; // 앵커 인덱스는 스킵

            const elemDef = patternElements[i];
            const elemSig = patternSignatures[i];
            const rel = patternRelPos[i];
            const expectedX = anchor.cx + rel.relX;
            const expectedY = anchor.cy + rel.relY;

            let bestMatch = findBestMatchForElementStrict(
                elemDef, elemSig, expectedX, expectedY,
                matchedByIndex.filter(m => m), anchor, positionTolerance
            );

            if (bestMatch) {
                matchedByIndex[i] = bestMatch;
                totalPosError += bestMatch.posError;
            } else {
                allMatched = false;
                break; // 하나라도 매칭 실패하면 이 앵커 탈락
            }
        }

        // 모든 요소가 매칭된 경우만 유사 그룹으로 인정
        const matchedElements = matchedByIndex.filter(m => m);
        if (allMatched && matchedElements.length === patternElements.length) {
            const avgPosError = matchedElements.length > 1 ? totalPosError / (matchedElements.length - 1) : 0;
            const accuracy = Math.max(0, 100 - (avgPosError / positionTolerance) * 50);

            const groupKey = matchedElements.map(m => m.element.name || m.element.id).sort().join('|');

            if (!foundSimilarGroups.some(g => g.key === groupKey)) {
                foundSimilarGroups.push({
                    key: groupKey,
                    matchedElements: [...matchedByIndex], // 인덱스 순서대로 저장
                    validMatches: matchedElements,
                    matchRatio: 1.0,
                    accuracy,
                    avgPosError,
                    avgPortScore: 100,
                    centerX: matchedElements.reduce((s, m) => s + m.cx, 0) / matchedElements.length,
                    centerY: matchedElements.reduce((s, m) => s + m.cy, 0) / matchedElements.length
                });
            }
        }
    }

    foundSimilarGroups.sort((a, b) => b.accuracy - a.accuracy);
    console.log('[유사 찾기] 발견 (엄격 매칭):', foundSimilarGroups.length);

    displaySimilarGroups(listDiv, anchorCandidates.length, patternElements.length);
    render();
}

// 엄격한 요소 매칭 - 포트 시그니처가 정확히 일치해야 함
function findBestMatchForElementStrict(elemDef, elemSig, expectedX, expectedY, matchedElements, anchor, tolerance) {
    let bestMatch = null;
    let bestPosError = tolerance + 1;

    for (const block of blocks) {
        // 앵커와 같은 블록은 제외
        if (block.name === anchor.element.name) continue;
        // 이미 매칭된 블록은 제외
        if (matchedElements.some(m => m && m.element && m.element.name === block.name)) continue;

        // 포트 시그니처가 정확히 일치해야 함
        const blockSig = getBlockPortSignature(block);
        if (blockSig !== elemSig.portSignature) continue;

        // 위치 오차 계산
        const posError = Math.hypot(block.cx - expectedX, block.cy - expectedY);
        if (posError > tolerance) continue;

        // 위치가 가장 가까운 것을 선택
        if (posError < bestPosError) {
            bestPosError = posError;
            const gd = groupsData[block.name];
            bestMatch = {
                element: block,
                cx: block.cx,
                cy: block.cy,
                isGroup: true,
                groupData: gd,
                posError,
                portSignature: blockSig,
                portMatchRatio: 1.0,
                totalScore: 100
            };
        }
    }

    return bestMatch;
}

function displaySimilarGroups(listDiv, anchorCount, elemCount) {
    const applyAllContainer = document.getElementById('pattern-apply-all-container');

    if (foundSimilarGroups.length === 0) {
        listDiv.style.display = 'block';
        listDiv.innerHTML = `
            <div style="padding:10px; color:#f44336; font-size:11px; text-align:center;">
                유사한 그룹을 찾지 못했습니다.<br>
                <span style="font-size:9px; color:#888;">앵커 후보: ${anchorCount}개 검토</span>
            </div>
        `;
        if (applyAllContainer) applyAllContainer.style.display = 'none';
        return;
    }

    selectedSimilarGroupIdx = null;

    listDiv.style.display = 'block';
    listDiv.innerHTML = `
        <div style="padding:6px 8px; color:#4caf50; font-size:11px; font-weight:600; border-bottom:1px solid #333; margin-bottom:4px;">
            ${foundSimilarGroups.length}개 유사 그룹 발견
        </div>
    ` + foundSimilarGroups.map((group, idx) => {
        const names = (group.validMatches || []).map(m => m.element?.name || '?').join(', ');
        const matchPct = Math.round((group.matchRatio || 1) * 100);
        const accuracy = group.accuracy ? group.accuracy.toFixed(0) : '-';

        return `
            <div data-group-idx="${idx}" style="padding:8px; margin:4px 0; background:#2a2a4a; border-radius:4px; cursor:pointer; border:1px solid transparent;"
                 onclick="selectSimilarGroup(${idx})"
                 onmouseenter="highlightSimilarGroup(${idx}); this.style.borderColor='#4caf50';"
                 onmouseleave="unhighlightSimilarGroup(); this.style.borderColor='transparent';">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-weight:bold; font-size:11px; color:#fff;">그룹 ${idx + 1}</span>
                    <span style="color:${group.accuracy >= 40 ? '#4caf50' : '#ff9800'}; font-size:11px; font-weight:600;">
                        ${accuracy}점
                    </span>
                </div>
                <div style="color:#aaa; font-size:9px; margin-bottom:6px; line-height:1.3; word-break:break-all;">${names}</div>
                <button onclick="event.stopPropagation(); applyPatternToGroup(${idx})"
                        style="width:100%; font-size:10px; padding:5px 8px; background:#4caf50; color:#fff; border:none; border-radius:3px; cursor:pointer; font-weight:500;"
                        onmouseover="this.style.background='#66bb6a';"
                        onmouseout="this.style.background='#4caf50';">패턴 적용</button>
            </div>
        `;
    }).join('');

    if (applyAllContainer) applyAllContainer.style.display = 'block';
}

// ============ 유사 그룹 하이라이트 ============

function highlightSimilarGroup(idx) {
    highlightedSimilarGroup = idx;
    render();
}

function unhighlightSimilarGroup() {
    highlightedSimilarGroup = null;
    render();
}

// ============ 저장된 패턴 캔버스 하이라이트 ============

function highlightPatternOnCanvas(idx) {
    hoveredPatternIndex = idx;
    render();
}

function unhighlightPatternOnCanvas() {
    hoveredPatternIndex = null;
    render();
}

// 호버된 패턴을 캔버스에 렌더링
function renderHoveredPattern(ctx) {
    if (hoveredPatternIndex === null || !savedConnectionPatterns[hoveredPatternIndex]) return;

    const pattern = savedConnectionPatterns[hoveredPatternIndex];
    const elements = pattern.elements || [];
    const connections = pattern.connections || [];

    if (elements.length === 0) return;

    ctx.save();

    const groupColor = '#9c27b0';  // 보라색
    const connColor = '#2196f3';   // 파란색 (연결선)

    // 각 요소 하이라이트 - groupsData에서 실제 위치 가져오기
    for (let i = 0; i < elements.length; i++) {
        const elem = elements[i];
        const gd = groupsData[elem.name];

        if (!gd) continue; // groupsData에 없으면 스킵

        const cx = gd.cx || elem.cx;
        const cy = gd.cy || elem.cy;
        const x1 = gd.x1 || cx - 50;
        const y1 = gd.y1 || cy - 30;
        const x2 = gd.x2 || cx + 50;
        const y2 = gd.y2 || cy + 30;

        // 보라색 반투명 박스
        ctx.fillStyle = groupColor;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.globalAlpha = 1;

        // 보라색 테두리 (점선)
        ctx.strokeStyle = groupColor;
        ctx.lineWidth = 3 / scale;
        ctx.setLineDash([8 / scale, 4 / scale]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.setLineDash([]);

        // 번호 원 (1부터 시작)
        const numRadius = 14 / scale;
        ctx.fillStyle = groupColor;
        ctx.beginPath();
        ctx.arc(cx, y1 - numRadius - 5 / scale, numRadius, 0, Math.PI * 2);
        ctx.fill();

        // 번호 텍스트
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${12 / scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, cx, y1 - numRadius - 5 / scale);
    }

    // 연결선 하이라이트
    ctx.strokeStyle = connColor;
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([6 / scale, 3 / scale]);

    for (const conn of connections) {
        const fromElem = elements[conn.fromElemIdx];
        const toElem = elements[conn.toElemIdx];
        if (!fromElem || !toElem) continue;

        const fromGd = groupsData[fromElem.name];
        const toGd = groupsData[toElem.name];
        if (!fromGd || !toGd) continue;

        const fx = fromGd.cx || fromElem.cx;
        const fy = fromGd.cy || fromElem.cy;
        const tx = toGd.cx || toElem.cx;
        const ty = toGd.cy || toElem.cy;

        ctx.beginPath();
        ctx.moveTo(fx, fy);

        // waypoints가 있으면 경유점 그리기
        if (conn.waypoints && conn.waypoints.length > 0) {
            for (const wp of conn.waypoints) {
                ctx.lineTo(fx + wp.relX, fy + wp.relY);
            }
        }

        ctx.lineTo(tx, ty);
        ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
}

function selectSimilarGroup(idx) {
    const group = foundSimilarGroups[idx];
    if (!group) return;

    selectedSimilarGroupIdx = selectedSimilarGroupIdx === idx ? null : idx;

    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;
    viewX = screenCenterX - group.centerX * scale;
    viewY = screenCenterY - group.centerY * scale;

    updateSimilarGroupListSelection();
    render();
}

function updateSimilarGroupListSelection() {
    const items = document.querySelectorAll('[data-group-idx]');
    items.forEach(item => {
        const idx = parseInt(item.dataset.groupIdx);
        if (idx === selectedSimilarGroupIdx) {
            item.style.background = '#1a4a7a';
            item.style.border = '1px solid #4caf50';
        } else {
            item.style.background = '#2a2a4a';
            item.style.border = 'none';
        }
    });
}

// ============ 패턴 적용 ============

function applyPatternToGroup(idx, silent = false) {
    console.log('[패턴 적용] 시작 - 그룹', idx);
    const group = foundSimilarGroups[idx];
    const pattern = savedConnectionPatterns[selectedPatternIndex];

    if (!group || !pattern) {
        showToast('패턴 또는 유사 그룹이 선택되지 않았습니다.', 'error');
        return;
    }
    console.log('[패턴 적용] 패턴:', pattern.name, '연결수:', pattern.connections?.length);

    const patternElements = pattern.elements || pattern.blocks || [];
    const matchedElements = group.matchedElements || [];

    let createdCount = 0;
    let skippedCount = 0;

    for (const connPattern of pattern.connections) {
        const fromElemIdx = connPattern.fromElemIdx;
        const toElemIdx = connPattern.toElemIdx;

        if (fromElemIdx < 0 || toElemIdx < 0) {
            skippedCount++;
            continue;
        }

        if (fromElemIdx >= matchedElements.length || toElemIdx >= matchedElements.length) {
            skippedCount++;
            continue;
        }

        const fromMatched = matchedElements[fromElemIdx];
        const toMatched = matchedElements[toElemIdx];

        if (!fromMatched || !toMatched) {
            skippedCount++;
            continue;
        }

        let fromPort = null;
        let fromParent = null;
        let toPort = null;
        let toParent = null;

        const patternFromElem = patternElements[fromElemIdx];
        const patternToElem = patternElements[toElemIdx];

        // from 포트 찾기 - 위치 기반 우선 (T블록 YES/NO 위치 바뀜 대응)
        if (fromMatched.isGroup && fromMatched.groupData) {
            fromParent = fromMatched.element.name;
            const groupData = fromMatched.groupData;

            // 위치 기반으로만 찾기 (이름 무시)
            if (connPattern.fromPortRelX !== undefined && groupData.ports && groupData.ports.length > 0) {
                fromPort = findPortByRelativePosition(
                    groupData.ports,
                    fromMatched.element.cx,
                    fromMatched.element.cy,
                    connPattern.fromPortRelX,
                    connPattern.fromPortRelY,
                    150 // tolerance 더 넓게
                );
                console.log(`[포트찾기] from 위치기반: relX=${connPattern.fromPortRelX}, relY=${connPattern.fromPortRelY} -> ${fromPort?.name || 'NOT FOUND'}`);
            }

            // 위치로 못 찾으면 인덱스로 폴백
            if (!fromPort && connPattern.fromPortIdx >= 0 && groupData.ports && connPattern.fromPortIdx < groupData.ports.length) {
                fromPort = groupData.ports[connPattern.fromPortIdx];
                console.log(`[포트찾기] from 인덱스 폴백: idx=${connPattern.fromPortIdx} -> ${fromPort?.name}`);
            }
        } else {
            fromPort = fromMatched.element;
            fromParent = fromMatched.element.parent || null;
        }

        // to 포트 찾기 - 위치 기반 우선 (T블록 YES/NO 위치 바뀜 대응)
        if (toMatched.isGroup && toMatched.groupData) {
            toParent = toMatched.element.name;
            const groupData = toMatched.groupData;

            // 위치 기반으로만 찾기 (이름 무시)
            if (connPattern.toPortRelX !== undefined && groupData.ports && groupData.ports.length > 0) {
                toPort = findPortByRelativePosition(
                    groupData.ports,
                    toMatched.element.cx,
                    toMatched.element.cy,
                    connPattern.toPortRelX,
                    connPattern.toPortRelY,
                    150 // tolerance 더 넓게
                );
                console.log(`[포트찾기] to 위치기반: relX=${connPattern.toPortRelX}, relY=${connPattern.toPortRelY} -> ${toPort?.name || 'NOT FOUND'}`);
            }

            // 위치로 못 찾으면 인덱스로 폴백
            if (!toPort && connPattern.toPortIdx >= 0 && groupData.ports && connPattern.toPortIdx < groupData.ports.length) {
                toPort = groupData.ports[connPattern.toPortIdx];
                console.log(`[포트찾기] to 인덱스 폴백: idx=${connPattern.toPortIdx} -> ${toPort?.name}`);
            }
        } else {
            toPort = toMatched.element;
            toParent = toMatched.element.parent || null;
        }

        if (fromPort && toPort) {
            const fromId = fromPort.id || `${fromPort.type}_${fromPort.cx}_${fromPort.cy}`;
            const toId = toPort.id || `${toPort.type}_${toPort.cx}_${toPort.cy}`;

            const isDuplicate = customConnections.some(c =>
                c.fromId === fromId && c.toId === toId
            );

            if (!isDuplicate) {
                // 원본 패턴의 waypoints를 활용하여 새 위치에 맞게 변환
                let waypoints = [];

                if (connPattern.waypoints && connPattern.waypoints.length > 0) {
                    // 원본 패턴의 상대 좌표를 새 위치에 적용
                    // connPattern.waypoints는 from 포트 기준 상대 좌표로 저장됨
                    waypoints = connPattern.waypoints.map(wp => ({
                        x: fromPort.cx + wp.relX,
                        y: fromPort.cy + wp.relY
                    }));
                    console.log(`[패턴 적용] 원본 waypoints 사용: ${waypoints.length}개`);
                } else {
                    // waypoints가 없으면 라인 데이터를 활용해서 경로 찾기
                    waypoints = findConnectionPath(fromPort.cx, fromPort.cy, toPort.cx, toPort.cy);
                }

                customConnections.push({
                    fromId, fromName: fromPort.name, fromParent,
                    fromCx: fromPort.cx, fromCy: fromPort.cy,
                    toId, toName: toPort.name, toParent,
                    toCx: toPort.cx, toCy: toPort.cy,
                    waypoints
                });
                createdCount++;
            }
        } else {
            skippedCount++;
        }
    }

    if (createdCount > 0) {
        updateConnectionList();
        updateStats();
        markAsEdited();
        render();
    }

    // silent 모드가 아닐 때만 알림 표시
    if (!silent) {
        showToast(`연결 ${createdCount}개 생성됨${skippedCount > 0 ? ` (${skippedCount}개 스킵)` : ''}`, 'success');
    }

    return { created: createdCount, skipped: skippedCount };
}

// 상대 위치로 가장 가까운 포트 찾기
function findPortByRelativePosition(ports, elemCx, elemCy, relX, relY, tolerance = 50) {
    if (!ports || ports.length === 0) return null;

    let bestPort = null;
    let bestDist = tolerance + 1;

    const targetX = elemCx + relX;
    const targetY = elemCy + relY;

    for (const p of ports) {
        const portX = p.cx || elemCx;
        const portY = p.cy || elemCy;
        const dist = Math.hypot(portX - targetX, portY - targetY);
        if (dist < bestDist) {
            bestDist = dist;
            bestPort = p;
        }
    }

    return bestPort;
}

// 라인 데이터를 활용해서 연결 경로 찾기 (A* 알고리즘 기반)
function findConnectionPath(fromX, fromY, toX, toY) {
    console.log(`[경로찾기] 시작: (${fromX.toFixed(0)}, ${fromY.toFixed(0)}) -> (${toX.toFixed(0)}, ${toY.toFixed(0)})`);

    // lineIndex가 없거나 라인 데이터가 없으면 빈 경로 반환
    if (!linesData || linesData.length === 0) {
        console.log('[경로찾기] 라인 데이터 없음');
        return [];
    }

    // 라인 인덱스 빌드 (없으면)
    if (typeof buildLineIndex === 'function' && (!lineIndex || Object.keys(lineIndex).length === 0)) {
        console.log('[경로찾기] lineIndex 빌드 중...');
        buildLineIndex();
    }

    if (!lineIndex || Object.keys(lineIndex).length === 0) {
        console.log('[경로찾기] lineIndex 없음');
        return [];
    }

    const visited = new Set();
    const maxDepth = 100; // 더 깊게 탐색
    const tolerance = 30; // tolerance 늘림

    // 우선순위 큐 (목표에 가까운 것 우선)
    const queue = [];

    // 시작점에서 가장 가까운 라인들 찾기
    const startLines = findLinesNearPoint(fromX, fromY, tolerance);
    console.log(`[경로찾기] 시작점 근처 라인: ${startLines.length}개`);
    if (startLines.length === 0) {
        // tolerance를 더 넓혀서 다시 시도
        const startLines2 = findLinesNearPoint(fromX, fromY, 50);
        if (startLines2.length === 0) {
            console.log('[경로찾기] 시작점 근처 라인 없음');
            return [];
        }
        startLines.push(...startLines2);
    }

    for (const line of startLines) {
        // 시작점에서 먼 쪽 끝점으로 이동
        const d1 = Math.hypot(line.x1 - fromX, line.y1 - fromY);
        const d2 = Math.hypot(line.x2 - fromX, line.y2 - fromY);

        let nextX, nextY;
        if (d1 < d2) {
            nextX = line.x2;
            nextY = line.y2;
        } else {
            nextX = line.x1;
            nextY = line.y1;
        }

        const distToGoal = Math.hypot(nextX - toX, nextY - toY);
        queue.push({
            x: nextX,
            y: nextY,
            path: [],
            depth: 1,
            priority: distToGoal
        });
    }

    // 우선순위로 정렬
    queue.sort((a, b) => a.priority - b.priority);

    while (queue.length > 0) {
        const current = queue.shift();
        const posKey = `${Math.round(current.x / 5) * 5}_${Math.round(current.y / 5) * 5}`;

        if (visited.has(posKey)) continue;
        visited.add(posKey);

        // 도착점에 가까우면 경로 반환
        const distToEnd = Math.hypot(current.x - toX, current.y - toY);
        if (distToEnd < tolerance) {
            // 경로 단순화: 시작/끝점 근처 제거 + 중복/불필요한 점 제거
            const simplifiedPath = simplifyPath(current.path, fromX, fromY, toX, toY);
            console.log(`[경로찾기] 성공! waypoints: ${simplifiedPath.length}개`);
            return simplifiedPath;
        }

        if (current.depth >= maxDepth) continue;

        // 현재 위치에서 연결된 라인들 찾기
        const nearLines = findLinesNearPoint(current.x, current.y, tolerance);
        for (const line of nearLines) {
            const d1 = Math.hypot(line.x1 - current.x, line.y1 - current.y);
            const d2 = Math.hypot(line.x2 - current.x, line.y2 - current.y);

            // 현재 위치에서 먼 쪽 끝점으로 이동
            let nextX, nextY;
            if (d1 < d2) {
                nextX = line.x2;
                nextY = line.y2;
            } else {
                nextX = line.x1;
                nextY = line.y1;
            }

            const nextKey = `${Math.round(nextX / 5) * 5}_${Math.round(nextY / 5) * 5}`;
            if (!visited.has(nextKey)) {
                const distToGoal = Math.hypot(nextX - toX, nextY - toY);

                // 현재 위치가 꺾이는 점인지 확인 (방향이 바뀌면 waypoint로 추가)
                const newPath = [...current.path];
                if (isCornerPoint(current.path, current.x, current.y, nextX, nextY)) {
                    newPath.push({ x: current.x, y: current.y });
                }

                queue.push({
                    x: nextX,
                    y: nextY,
                    path: newPath,
                    depth: current.depth + 1,
                    priority: distToGoal + current.depth * 2 // A*: 거리 + 비용
                });
            }
        }

        // 우선순위로 재정렬
        queue.sort((a, b) => a.priority - b.priority);
    }

    console.log(`[경로찾기] 실패 - 방문노드: ${visited.size}개`);
    return []; // 경로 못 찾으면 빈 배열
}

// 꺾이는 점인지 확인
function isCornerPoint(path, cx, cy, nextX, nextY) {
    if (path.length === 0) return false;

    const last = path[path.length - 1];
    const prevDir = Math.atan2(cy - last.y, cx - last.x);
    const nextDir = Math.atan2(nextY - cy, nextX - cx);
    const angleDiff = Math.abs(prevDir - nextDir);

    // 방향이 30도 이상 바뀌면 꺾이는 점
    return angleDiff > Math.PI / 6 && angleDiff < Math.PI * 11 / 6;
}

// 경로 단순화
function simplifyPath(path, fromX, fromY, toX, toY) {
    if (!path || path.length === 0) return [];

    // 시작/끝점 근처 점 제거
    const minDist = 30;
    const filtered = path.filter(p =>
        Math.hypot(p.x - fromX, p.y - fromY) > minDist &&
        Math.hypot(p.x - toX, p.y - toY) > minDist
    );

    if (filtered.length <= 2) return filtered;

    // 직선상의 중간점 제거 (Douglas-Peucker 간소화)
    const result = [filtered[0]];
    for (let i = 1; i < filtered.length - 1; i++) {
        const prev = result[result.length - 1];
        const curr = filtered[i];
        const next = filtered[i + 1];

        // 세 점이 거의 직선인지 확인
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        const angleDiff = Math.abs(angle1 - angle2);

        // 방향이 15도 이상 바뀌면 유지
        if (angleDiff > Math.PI / 12 && angleDiff < Math.PI * 23 / 12) {
            result.push(curr);
        }
    }
    result.push(filtered[filtered.length - 1]);

    return result;
}

async function applyPatternToAllGroups(skipConfirm = false) {
    if (!skipConfirm && !(await showConfirm(`${foundSimilarGroups.length}개 그룹에 패턴을 적용하시겠습니까?`, { title: '적용 확인', confirmText: '적용' }))) return;

    let totalCreated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < foundSimilarGroups.length; i++) {
        const result = applyPatternToGroup(i, true); // silent 모드
        if (result) {
            totalCreated += result.created;
            totalSkipped += result.skipped;
        }
    }

    showToast(`전체 적용 완료! 그룹: ${foundSimilarGroups.length}개, 연결 생성: ${totalCreated}개${totalSkipped > 0 ? `, 스킵: ${totalSkipped}개` : ''}`, 'success');
}

// ============ 유사 그룹 하이라이트 렌더링 ============

function renderSimilarGroupHighlight(ctx) {
    const groupIdx = selectedSimilarGroupIdx !== null ? selectedSimilarGroupIdx : highlightedSimilarGroup;
    if (groupIdx === null || !foundSimilarGroups[groupIdx]) return;

    const group = foundSimilarGroups[groupIdx];
    const matches = group.validMatches || group.matchedElements?.filter(m => m) || [];

    ctx.save();

    // 보라색 계열로 통일 (패턴 선택과 동일)
    const groupColor = '#9c27b0';  // 보라색

    // 매칭된 요소 하이라이트
    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        if (!m || !m.element) continue;

        // 보라색으로 통일
        ctx.strokeStyle = groupColor;
        ctx.lineWidth = 3 / scale;
        ctx.setLineDash([6 / scale, 3 / scale]);

        ctx.beginPath();
        ctx.arc(m.cx, m.cy, 25, 0, Math.PI * 2);
        ctx.stroke();

        // 번호는 1부터 시작 (i+1)
        ctx.fillStyle = groupColor;
        ctx.font = `bold ${14 / scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, m.cx, m.cy - 30 / scale);
    }

    ctx.setLineDash([]);
    ctx.restore();
}

// ============ 선택된 패턴 렌더링 ============

function renderSelectedPattern(ctx) {
    if (selectedPatternIndex < 0) return;

    const pattern = savedConnectionPatterns[selectedPatternIndex];
    if (!pattern) return;

    const elements = pattern.elements || [];
    if (elements.length === 0) return;

    // 패턴 요소가 현재 화면에 있으면 하이라이트
    // (실제 구현에서는 패턴 미리보기 등)
}

// ============ 패턴 정보 표시 ============

function updatePatternSelectionInfo() {
    const infoEl = document.getElementById('pattern-selection-info');
    const saveBtn = document.getElementById('btn-save-pattern');
    if (!infoEl) return;

    // 1. 선택된 그룹이 있는 경우
    if (patternSelectedGroups && patternSelectedGroups.length > 0) {
        // 선택된 그룹들 간의 연결선 찾기
        const selectedConns = customConnections.filter(conn => {
            const hasFrom = patternSelectedGroups.some(b => b.name === conn.fromParent || b.id === conn.fromId);
            const hasTo = patternSelectedGroups.some(b => b.name === conn.toParent || b.id === conn.toId);
            return hasFrom && hasTo;
        });

        infoEl.innerHTML = `
            <div style="font-weight:bold; color:#ff9800; margin-bottom:8px;">선택된 그룹</div>
            <div style="font-size:13px; color:#fff;">
                <div style="margin-bottom:4px;">그룹: <strong>${patternSelectedGroups.length}</strong>개</div>
                <div style="margin-bottom:4px;">연결: <strong>${selectedConns.length}</strong>개</div>
            </div>
            <div style="font-size:11px; color:#aaa; margin-top:8px;">
                ${patternSelectedGroups.slice(0, 5).map(b => b.name).join(', ')}${patternSelectedGroups.length > 5 ? '...' : ''}
            </div>
            <div style="font-size:10px; color:#888; margin-top:8px;">
                클릭: 추가/제거 | Shift+드래그: 추가
            </div>
        `;

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
        return;
    }

    // 2. 저장된 패턴을 선택한 경우
    if (selectedPatternIndex >= 0) {
        const pattern = savedConnectionPatterns[selectedPatternIndex];
        if (pattern) {
            const elements = pattern.elements || [];
            const connections = pattern.connections || [];

            infoEl.innerHTML = `
                <div style="font-weight:bold; color:#4caf50; margin-bottom:8px;">✓ ${pattern.name}</div>
                <div style="font-size:13px; color:#fff;">
                    <div style="margin-bottom:4px;">🔹 요소: <strong>${elements.length}</strong>개</div>
                    <div style="margin-bottom:4px;">🔸 연결: <strong>${connections.length}</strong>개</div>
                </div>
            `;

            // 저장 버튼 비활성화 (이미 저장된 패턴)
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.5';
            }
            return;
        }
    }

    // 3. 아무것도 선택되지 않은 경우
    infoEl.innerHTML = `
        <div style="font-size:13px; color:var(--text-muted);">선택된 그룹 없음</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">드래그: 영역 내 그룹 선택<br>클릭: 그룹 추가/제거</div>
    `;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
    }
}

function showPatternDetailPopup(pattern) {
    // 패턴 상세 팝업 표시
    const popup = document.getElementById('pattern-detail-popup');
    if (popup) {
        popup.remove();
    }

    // 팝업 HTML 생성 및 표시
    console.log('Pattern detail:', pattern);
}
