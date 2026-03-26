/**
 * events.js - 이벤트 핸들러
 * 마우스, 키보드, 휠 이벤트 처리
 */

function hitTestAutoConnection(wx, wy, threshold) {
    if (!customConnections) return -1;
    let bestIdx = -1, bestDist = threshold;
    for (let i = 0; i < customConnections.length; i++) {
        const c = customConnections[i];
        if (c.source !== 'auto') continue;
        if (!c.fromCx || !c.toCx) continue;
        const pts = [{ x: c.fromCx, y: c.fromCy }];
        if (c.waypoints) pts.push(...c.waypoints);
        pts.push({ x: c.toCx, y: c.toCy });
        for (let j = 0; j < pts.length - 1; j++) {
            const d = pointToSegmentDist(wx, wy, pts[j].x, pts[j].y, pts[j+1].x, pts[j+1].y);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
    }
    return bestIdx;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ============ 마우스 다운 ============

function onMouseDown(e) {
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // P&ID 뷰어 모드 - 팬 시작
    if (typeof pidViewMode !== 'undefined' && pidViewMode) {
        isPanning = true;
        return;
    }

    // 포트 생성 위치 선택 모드
    if (portCreateMode && e.button === 0) {
        e.preventDefault();
        if (handlePortCreateClick(e)) return;
    }

    // Pattern mode handling
    if (patternMode && e.button === 0) {
        e.preventDefault();
        // 드래그 시작 (드래그 종료 시 영역 내 그룹 선택)
        handlePatternDragStart(e);
        return;
    }

    // Template mode handling
    if (templateMode && e.button === 0) {
        e.preventDefault();
        if (!templateAnchor) {
            handleTemplateClick(e);
        } else {
            const rect = canvas.getBoundingClientRect();
            templateSelectStart = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            templateSelectEnd = { ...templateSelectStart };
            isTemplateSelecting = true;
            canvas.style.cursor = 'crosshair';
        }
        return;
    }

    // Clone mode
    if (cloneMode && e.button === 0) {
        if (e.ctrlKey) {
            // Ctrl+drag = pan
        } else if (!e.shiftKey) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldX = (mouseX - viewX) / scale;
            const worldY = (mouseY - viewY) / scale;

            isCloneSelecting = true;
            cloneSelectStart = { x: worldX, y: worldY };
            cloneSelectEnd = { x: worldX, y: worldY };
            canvas.style.cursor = 'crosshair';
            return;
        }
    }

    // 편집 모드에서 포트/블록 드래그
    if (editMode && !connectMode) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - viewX) / scale;
        const worldY = (mouseY - viewY) / scale;

        // 포트 드래그 체크
        for (const port of ports) {
            const dist = Math.sqrt((worldX - port.cx) ** 2 + (worldY - port.cy) ** 2);
            if (dist < 15 / scale) {
                isDraggingPort = true;
                draggedPort = port;
                draggedGroupPort = null;
                if (port.parent && groupsData[port.parent]) {
                    draggedGroupPort = groupsData[port.parent].ports.find(
                        p => Math.abs(p.cx - port.cx) < 1 && Math.abs(p.cy - port.cy) < 1
                    );
                }
                selectedElement = port;
                canvas.style.cursor = 'move';
                updateSelectionInfo();
                render();
                return;
            }
        }

        // 블록 드래그 체크
        for (const block of blocks) {
            const dist = Math.sqrt((worldX - block.cx) ** 2 + (worldY - block.cy) ** 2);
            if (dist < 25 / scale) {
                isDraggingBlock = true;
                draggedBlock = block;
                selectedElement = block;
                canvas.style.cursor = 'move';
                updateSelectionInfo();
                render();
                return;
            }
        }
    }

    // 연결 모드에서는 패닝 비활성화 (클릭이 onClick으로 전달되어야 함)
    if (connectMode) return;

    // 패닝
    isDragging = true;
    lastViewX = viewX;
    lastViewY = viewY;
    canvas.classList.add('dragging');
}

// ============ 마우스 무브 ============

function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    lastMouseX = e.clientX - rect.left;
    lastMouseY = e.clientY - rect.top;
    lastShiftKey = e.shiftKey;

    // P&ID 뷰어 모드 - 팬
    if (typeof pidViewMode !== 'undefined' && pidViewMode && isPanning) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        handlePIDPan(dx, dy);
        return;
    }

    // Pattern mode drag
    if (isPatternSelecting) {
        handlePatternDragMove(e);
        return;
    }

    // Template mode drag
    if (isTemplateSelecting) {
        handleTemplateDragMove(e);
        return;
    }

    // 포트 드래그
    if (isDraggingPort && draggedPort) {
        const worldX = (lastMouseX - viewX) / scale;
        const worldY = (lastMouseY - viewY) / scale;

        draggedPort.cx = worldX;
        draggedPort.cy = worldY;
        if (draggedPort.x1 !== undefined) {
            const halfW = 10;
            draggedPort.x1 = worldX - halfW;
            draggedPort.y1 = worldY - halfW;
            draggedPort.x2 = worldX + halfW;
            draggedPort.y2 = worldY + halfW;
        }

        if (draggedGroupPort) {
            draggedGroupPort.cx = worldX;
            draggedGroupPort.cy = worldY;
        }

        // 연결선 업데이트
        for (const conn of customConnections) {
            if (conn.fromId === draggedPort.id) {
                conn.fromCx = worldX;
                conn.fromCy = worldY;
            }
            if (conn.toId === draggedPort.id) {
                conn.toCx = worldX;
                conn.toCy = worldY;
            }
        }

        render();
        return;
    }

    // 블록 드래그
    if (isDraggingBlock && draggedBlock) {
        const worldX = (lastMouseX - viewX) / scale;
        const worldY = (lastMouseY - viewY) / scale;
        const dx = worldX - draggedBlock.cx;
        const dy = worldY - draggedBlock.cy;

        draggedBlock.cx = worldX;
        draggedBlock.cy = worldY;
        if (draggedBlock.x1 !== undefined) {
            const halfW = 30, halfH = 15;
            draggedBlock.x1 = worldX - halfW;
            draggedBlock.y1 = worldY - halfH;
            draggedBlock.x2 = worldX + halfW;
            draggedBlock.y2 = worldY + halfH;
        }

        // 그룹 데이터 및 자식 포트 이동
        if (groupsData[draggedBlock.name]) {
            groupsData[draggedBlock.name].cx = worldX;
            groupsData[draggedBlock.name].cy = worldY;

            for (const gPort of groupsData[draggedBlock.name].ports) {
                gPort.cx += dx;
                gPort.cy += dy;

                const port = ports.find(p =>
                    p.parent === draggedBlock.name &&
                    Math.abs(p.cx - (gPort.cx - dx)) < 2 &&
                    Math.abs(p.cy - (gPort.cy - dy)) < 2
                );
                if (port) {
                    port.cx = gPort.cx;
                    port.cy = gPort.cy;
                    if (port.x1 !== undefined) {
                        port.x1 = gPort.cx - 10;
                        port.y1 = gPort.cy - 10;
                        port.x2 = gPort.cx + 10;
                        port.y2 = gPort.cy + 10;
                    }
                }
            }
        }

        // 연결선 업데이트
        for (const conn of customConnections) {
            if (conn.fromId === draggedBlock.id) {
                conn.fromCx = worldX;
                conn.fromCy = worldY;
            }
            if (conn.toId === draggedBlock.id) {
                conn.toCx = worldX;
                conn.toCy = worldY;
            }
        }

        render();
        return;
    }

    // 연결 모드 미리보기
    if (connectMode && connectStart) {
        render();
    }

    // Clone mode area selection
    if (cloneMode && isCloneSelecting) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        cloneSelectEnd = {
            x: (mouseX - viewX) / scale,
            y: (mouseY - viewY) / scale
        };
        render();
        return;
    }

    if (!isDragging) {
        // C모드: auto 연결선 위 hover 시 pointer 커서
        if (showConnectionLines && !connectMode) {
            const rect = canvas.getBoundingClientRect();
            const wx = (e.clientX - rect.left - viewX) / scale;
            const wy = (e.clientY - rect.top - viewY) / scale;
            const hit = hitTestAutoConnection(wx, wy, 10 / scale);
            canvas.style.cursor = hit >= 0 ? 'pointer' : '';
        }
        return;
    }

    viewX = lastViewX + (e.clientX - dragStartX);
    viewY = lastViewY + (e.clientY - dragStartY);
    render();
}

// ============ 마우스 업 ============

function onMouseUp(e) {
    // P&ID 뷰어 모드
    if (typeof pidViewMode !== 'undefined' && pidViewMode) {
        isPanning = false;
        return;
    }

    // Pattern mode
    if (isPatternSelecting) {
        console.log('[이벤트] 패턴 드래그 종료 호출');
        handlePatternDragEnd(e);
        // 패턴 모드 후에도 커서 복구
        canvas.style.cursor = patternMode ? 'crosshair' : '';
        return;
    }

    // Template mode
    if (isTemplateSelecting) {
        handleTemplateDragEnd(e);
        return;
    }

    // Clone mode
    if (cloneMode && isCloneSelecting) {
        handleCloneSelectionEnd(e);
        return;
    }

    // 드래그 완료
    if (isDraggingPort) {
        isDraggingPort = false;
        draggedPort = null;
        draggedGroupPort = null;
        canvas.style.cursor = editMode ? 'crosshair' : '';
        markAsEdited();
    }

    if (isDraggingBlock) {
        isDraggingBlock = false;
        draggedBlock = null;
        canvas.classList.remove('dragging');
        markAsEdited();
    }

    isDragging = false;
    canvas.classList.remove('dragging');
}

// ============ 클론 선택 완료 ============

function handleCloneSelectionEnd(e) {
    isCloneSelecting = false;

    const x1 = Math.min(cloneSelectStart.x, cloneSelectEnd.x);
    const x2 = Math.max(cloneSelectStart.x, cloneSelectEnd.x);
    const y1 = Math.min(cloneSelectStart.y, cloneSelectEnd.y);
    const y2 = Math.max(cloneSelectStart.y, cloneSelectEnd.y);

    const selectionSize = Math.max(x2 - x1, y2 - y1);
    if (selectionSize < 10) {
        cloneSelectStart = null;
        cloneSelectEnd = null;
        canvas.style.cursor = '';
        render();
        return;
    }

    const selectedBlocks = blocks.filter(block => {
        return block.cx >= x1 && block.cx <= x2 &&
               block.cy >= y1 && block.cy <= y2;
    });

    if (selectedBlocks.length > 0) {
        selectedBlocks.sort((a, b) => a.cx - b.cx);
        cloneParentRow = selectedBlocks;
        cloneChildRow = new Array(selectedBlocks.length).fill(null);
        cloneCurrentChildIdx = 0;
        updateCloneHint();
    }

    cloneSelectStart = null;
    cloneSelectEnd = null;
    canvas.style.cursor = '';
    render();
}

// ============ 휠 (스크롤=이동, Ctrl+스크롤/핀치=줌) ============

function onWheel(e) {
    e.preventDefault();

    // P&ID 뷰어 모드
    if (typeof pidViewMode !== 'undefined' && pidViewMode) {
        handlePIDWheel(e);
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 터치패드 핀치(ctrlKey) 또는 마우스 휠 = 줌
    if (e.ctrlKey || e.deltaMode === 0 && e.deltaX === 0) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.05, Math.min(10, scale * zoomFactor));

        const worldX = (mouseX - viewX) / scale;
        const worldY = (mouseY - viewY) / scale;

        scale = newScale;

        viewX = mouseX - worldX * scale;
        viewY = mouseY - worldY * scale;
    } else {
        // 터치패드 2finger 스크롤 (deltaX와 deltaY 둘 다 있을 때) = 화면 이동
        const scrollSpeed = 1.5;
        viewX -= e.deltaX * scrollSpeed;
        viewY -= e.deltaY * scrollSpeed;
    }

    render();
}

// ============ 클릭 ============

function onClick(e) {
    if (isDraggingPort || isDraggingBlock) return;

    // P&ID 뷰어 모드
    if (typeof pidViewMode !== 'undefined' && pidViewMode) {
        handlePIDClick(e);
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - viewX) / scale;
    const worldY = (mouseY - viewY) / scale;

    // 요소 찾기
    const clicked = findElementAt(worldX, worldY, ports, blocks, scale, showPorts, showBlocks);

    // C모드: auto 연결선 클릭 감지
    if (showConnectionLines && !connectMode) {
        const hitIdx = hitTestAutoConnection(worldX, worldY, 10 / scale);
        if (hitIdx >= 0) {
            selectedElement = { autoConnectionIndex: hitIdx };
            updateSelectionInfo();
            render();
            return;
        }
    }

    // 연결 모드 - 엄격하게 찾기 (직접 클릭한 요소만)
    if (connectMode) {
        const strictElement = findElementAtStrict(worldX, worldY, ports, blocks, scale);
        handleConnectModeClick(strictElement, worldX, worldY, e);
        return;
    }

    // 클론 모드
    if (cloneMode && cloneParentRow.length > 0) {
        handleCloneModeClick(clicked);
        return;
    }

    // 태그 하이라이트 해제
    if (typeof clearTagHighlight === 'function') {
        clearTagHighlight();
    }

    // 펄스 하이라이트 중지
    if (typeof stopHighlightAnim === 'function') {
        stopHighlightAnim();
    }

    // 일반 선택
    selectedElement = clicked;
    updateSelectionInfo();
    if (clicked) {
        switchSidebarTab('info');
    }
    render();
}

// ============ 연결 모드 클릭 처리 ============

function handleConnectModeClick(clicked, worldX, worldY, e) {
    if (!connectStart) {
        // 첫 번째 클릭 - 시작점
        if (clicked) {
            connectStart = clicked;
            connectWaypoints = [];
            render();
        }
    } else {
        // 두 번째 이후 클릭
        const orthoModeEl = document.getElementById('orthoMode');
        const orthoMode = orthoModeEl && orthoModeEl.checked && !e.shiftKey;

        if (clicked && clicked !== connectStart) {
            // 끝점 클릭 - 연결 완성
            if (orthoMode && connectWaypoints.length === 0) {
                const dx = Math.abs(clicked.cx - connectStart.cx);
                const dy = Math.abs(clicked.cy - connectStart.cy);
                if (dx > 5 && dy > 5) {
                    connectWaypoints.push({
                        x: clicked.cx,
                        y: connectStart.cy
                    });
                }
            }

            createConnection(connectStart, clicked, connectWaypoints);
            connectStart = null;
            connectWaypoints = [];
        } else {
            // 빈 공간 클릭 - 웨이포인트 추가
            if (orthoMode) {
                const prevPoint = connectWaypoints.length > 0
                    ? connectWaypoints[connectWaypoints.length - 1]
                    : { x: connectStart.cx, y: connectStart.cy };

                const dx = Math.abs(worldX - prevPoint.x);
                const dy = Math.abs(worldY - prevPoint.y);
                if (dx > 5 && dy > 5) {
                    connectWaypoints.push({ x: worldX, y: prevPoint.y });
                }
            }
            connectWaypoints.push({ x: worldX, y: worldY });
        }
        render();
    }
}

// ============ 클론 모드 클릭 처리 ============

function handleCloneModeClick(clicked) {
    if (!clicked || cloneCurrentChildIdx >= cloneParentRow.length) return;

    const parent = cloneParentRow[cloneCurrentChildIdx];
    if (clicked === parent) {
        cloneChildRow[cloneCurrentChildIdx] = 'SAME';
    } else {
        cloneChildRow[cloneCurrentChildIdx] = clicked;
    }

    cloneCurrentChildIdx++;
    updateCloneHint();
    render();

    if (cloneCurrentChildIdx >= cloneParentRow.length) {
        setTimeout(async () => {
            if (await showConfirm('모든 매칭 완료. 연결선을 복제하시겠습니까?', { title: '확인', confirmText: '확인' })) {
                cloneConnectionsFromGroups();
            }
        }, 100);
    }
}

// ============ 더블클릭 ============

function onDblClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - viewX) / scale;
    const worldY = (mouseY - viewY) / scale;

    const clicked = findElementAt(worldX, worldY, ports, blocks, scale, showPorts, showBlocks);

    if (clicked) {
        // TODO: 요소 편집 다이얼로그 구현 예정
        selectedElement = clicked;
        updateSelectionInfo();
        render();
    }
}

// ============ 키보드 ============

function onKeyDown(e) {
    console.log('[onKeyDown] key:', e.key, 'target:', e.target.tagName);

    // ESC - 모드/선택 취소
    if (e.key === 'Escape') {
        if (connectMode && connectStart) {
            connectStart = null;
            connectWaypoints = [];
            render();
            return;
        }
        if (templateMode) {
            templateAnchor = null;
            templateSelectStart = null;
            templateSelectEnd = null;
            isTemplateSelecting = false;
        }
        if (patternMode) {
            isPatternSelecting = false;
            if (typeof patternSelectedGroups !== 'undefined') {
                patternSelectedGroups = [];
            }
            if (typeof patternDragStart !== 'undefined') {
                patternDragStart = null;
                patternDragEnd = null;
            }
            updatePatternSelectionInfo();
        }
        selectedElement = null;
        updateSelectionInfo();
        render();
        return;
    }

    // Delete - 선택 요소 삭제
    if (e.key === 'Delete' && selectedElement) {
        if (selectedElement.autoConnectionIndex !== undefined) {
            deleteAutoConnection(selectedElement.autoConnectionIndex);
            selectedElement = null;
            updateSelectionInfo();
            render();
            return;
        } else if (selectedElement.connectionIndex !== undefined) {
            deleteConnection(selectedElement.connectionIndex);
        } else if (PORT_TYPES.includes(selectedElement.type)) {
            deletePort(selectedElement);
        } else {
            deleteBlock(selectedElement);
        }
        selectedElement = null;
        updateSelectionInfo();
        render();
        return;
    }

    // Ctrl+S - 저장
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCurrentDrawing();
        return;
    }

    // Ctrl+Z - 실행 취소 (미구현)
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        console.log('Undo not implemented');
        return;
    }

    // 텍스트 입력 중일 때는 단축키 무시
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    // 모드 단축키
    if (e.key === 'e' || e.key === 'E') {
        toggleEditMode();
        return;
    }
    if (e.key === 'c' || e.key === 'C') {
        toggleConnectMode();
        return;
    }
    if (e.key === 't' || e.key === 'T') {
        toggleTemplateMode();
        return;
    }
    if (e.key === 'p' || e.key === 'P') {
        togglePatternMode();
        switchSidebarTab('pattern');
        return;
    }
    if (e.key === 'r' || e.key === 'R') {
        resetView();
        return;
    }
    if (e.key === 'd' || e.key === 'D') {
        toggleDisplay('diagram');
        return;
    }
    if (e.key === 'b' || e.key === 'B') {
        toggleDisplay('blocks');
        return;
    }

    // 사이드바 탭 전환 (1~6)
    if (e.key === '1') { switchSidebarTab('info'); return; }
    if (e.key === '2') { switchSidebarTab('template'); return; }
    if (e.key === '3') { switchSidebarTab('autoconnect'); return; }
    if (e.key === '4') { switchSidebarTab('connections'); return; }
    if (e.key === '5') { switchSidebarTab('scan'); return; }
    if (e.key === '6') { switchSidebarTab('blocktype'); return; }
}

// ============ 연결 생성 ============

function createConnection(from, to, waypoints = []) {
    const conn = {
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
        waypoints: waypoints.map(wp => ({ x: wp.x, y: wp.y })),
        source: 'manual'
    };

    // 중복 체크
    const isDuplicate = customConnections.some(c =>
        c.fromId === conn.fromId && c.toId === conn.toId
    );

    if (!isDuplicate) {
        customConnections.push(conn);
        updateConnectionList();
        updateStats();
        markAsEdited();
    }
}

// ============ 컨텍스트 메뉴 ============

function showContextMenu(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - viewX) / scale;
    const worldY = (mouseY - viewY) / scale;

    // 연결선 위인지 확인
    const connResult = findConnectionAtPos(worldX, worldY);
    if (connResult && e.shiftKey) {
        // Shift+우클릭 = Junction 생성
        createJunction(worldX, worldY, connResult.connIdx);
        return;
    }

    // 기본 컨텍스트 메뉴 표시
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
    }
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.style.display = 'none';
    }
}
