/**
 * app.js - 앱 초기화 및 메인 진입점
 * 초기화, 이벤트 바인딩, 앱 시작
 */

// ============ 앱 초기화 ============

async function init() {
    // Supabase 초기화
    initSupabase();

    canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 캔버스 이벤트 바인딩
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    // wheel 이벤트: window 레벨에서 capture 단계로 캡처 (PyWebView 호환)
    window.addEventListener('wheel', (e) => {
        // 스크롤 가능한 요소(사이드바, 모달, 도움말, 검색결과, 홈화면 목록 등) 안에서는 기본 스크롤 허용
        const scrollableParent = e.target.closest('.sidebar-tab-content, .modal-content, .template-list, .bt-sidebar, .bt-content, #connection-list, #func-block-list, #template-list, #pattern-selection-info, #similar-groups-list, #connection-pattern-list, #help-modal, #help-content, #drawing-menu, #graph-analysis-modal, .tag-search-results, .home-sidebar-list, .home-pid-grid, [style*="overflow"]');
        if (scrollableParent) {
            // 스크롤 가능한 요소 안에서는 캔버스 이벤트 처리 안함
            return;
        }

        // 캔버스 영역에서만 처리
        const rect = canvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            onWheel(e);
        }
    }, { passive: false, capture: true });
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('contextmenu', showContextMenu);

    // 키보드 이벤트 바인딩
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift' && connectMode && connectStart) {
            lastShiftKey = true;
            render();
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift' && connectMode && connectStart) {
            lastShiftKey = false;
            render();
        }
    });

    // 컨텍스트 메뉴 숨기기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#context-menu')) {
            hideContextMenu();
        }
    });

    // UI 초기화
    updateStats();
    updateConnectionList();
    initToolButtons();

    resetView();
    render();

    // 환영 화면 표시
    showWelcomeScreen();
}

// ============ 캔버스 리사이즈 ============

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    render();
}

// ============ 요소 검색 헬퍼 ============

function findElementAt(worldX, worldY) {
    // Check ports first (smaller, harder to click)
    for (const port of ports) {
        const dx = worldX - port.cx;
        const dy = worldY - port.cy;
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
            return port;
        }
    }

    // Then check blocks
    for (const block of blocks) {
        if (worldX >= block.x1 && worldX <= block.x2 &&
            worldY >= block.y1 && worldY <= block.y2) {
            return block;
        }
        // Also check by center with tolerance for blocks without proper bounds
        const dx = worldX - block.cx;
        const dy = worldY - block.cy;
        if (Math.abs(dx) < 30 && Math.abs(dy) < 20) {
            return block;
        }
    }

    // 다이어그램 모드일 때 그룹 박스 영역 클릭 시 앵커 블록 반환
    if (diagramMode) {
        for (const [name, group] of Object.entries(groupsData)) {
            const anchorX = group.cx || 0;
            const anchorY = group.cy || 0;
            if (anchorX === 0 && anchorY === 0) continue;

            // 그룹 박스 경계 계산
            let minX = anchorX, maxX = anchorX, minY = anchorY, maxY = anchorY;
            const groupPorts = group.ports || [];
            for (const port of groupPorts) {
                const portX = port.cx || (anchorX + (port.dx || 0));
                const portY = port.cy || (anchorY + (port.dy || 0));
                minX = Math.min(minX, portX);
                maxX = Math.max(maxX, portX);
                minY = Math.min(minY, portY);
                maxY = Math.max(maxY, portY);
            }

            // 패딩 추가
            const padding = 25;
            const boxX1 = minX - padding;
            const boxY1 = minY - padding;
            const boxX2 = maxX + padding;
            const boxY2 = maxY + padding;

            // 박스 영역 내 클릭 확인
            if (worldX >= boxX1 && worldX <= boxX2 && worldY >= boxY1 && worldY <= boxY2) {
                // 앵커 블록 찾기
                const block = blocks.find(b => b.name === name || b.id === name);
                if (block) return block;

                // 블록이 없으면 가상 블록 객체 반환
                return {
                    id: name,
                    name: name,
                    type: group.type || 'SIGNAL',
                    cx: anchorX,
                    cy: anchorY,
                    isGroupAnchor: true
                };
            }
        }
    }

    return null;
}

// ============ 블록 포트 설정 ============
// (config.js에서 전역 변수 선언됨)

function showBlockPortConfig() {
    const modal = document.getElementById('block-config-modal');
    modal.style.display = 'block';

    configCanvas = document.getElementById('port-config-canvas');
    configCtx = configCanvas.getContext('2d');

    configCanvas.onmousedown = onConfigCanvasMouseDown;
    configCanvas.onmousemove = onConfigCanvasMouseMove;
    configCanvas.onmouseup = onConfigCanvasMouseUp;
    configCanvas.oncontextmenu = onConfigCanvasRightClick;

    populateBlockTypeDropdown();
    loadBlockTypeConfig();
    renderConfigCanvas();
}

function hideBlockPortConfig() {
    document.getElementById('block-config-modal').style.display = 'none';
}

// HTML에서 호출되는 별칭
function closeBlockPortConfig() {
    hideBlockPortConfig();
}

function addNewBlockType() {
    const name = prompt('Enter new block type name:', 'NEW_BLOCK');
    if (!name) return;

    if (BLOCK_PORT_RULES[name]) {
        showToast('Block type already exists!', 'info');
        return;
    }

    BLOCK_PORT_RULES[name] = { ports: [] };
    populateBlockTypeDropdown();

    const select = document.getElementById('config-block-type');
    if (select) {
        select.value = name;
        loadBlockTypeConfig();
    }
}

function addPortToConfigVisual() {
    addConfigPort();
}

function applyMissingPorts() {
    const type = document.getElementById('config-block-type')?.value;
    if (!type || !BLOCK_PORT_RULES[type]) return;

    const config = BLOCK_PORT_RULES[type];
    if (!config.ports || config.ports.length === 0) {
        showToast('No port configuration for this block type', 'info');
        return;
    }

    let addedCount = 0;
    const targetBlocks = blocks.filter(b => b.text === type || b.subType === type);

    targetBlocks.forEach(block => {
        config.ports.forEach(portDef => {
            // Check if port already exists
            const existingPort = ports.find(p =>
                p.parentBlock === block.id &&
                p.text === portDef.name
            );

            if (!existingPort) {
                // Add missing port
                const newPort = {
                    id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'PORT',
                    text: portDef.name,
                    cx: block.cx + portDef.dx,
                    cy: block.cy + portDef.dy,
                    parentBlock: block.id,
                    isUserCreated: true
                };
                ports.push(newPort);
                allElements.push(newPort);
                addedCount++;
            }
        });
    });

    const statusEl = document.getElementById('apply-status');
    if (statusEl) {
        statusEl.textContent = `Added ${addedCount} ports to ${targetBlocks.length} ${type} blocks`;
    }

    if (addedCount > 0) {
        markAsEdited();
        render();
    }
}

function analyzeOCBBlocks() {
    const ocbBlocks = blocks.filter(b => b.type === 'OCB_BLOCK' || b.text?.includes('OCB'));
    const subtypes = {};

    ocbBlocks.forEach(block => {
        const subType = block.subType || block.text || 'UNKNOWN';
        if (!subtypes[subType]) {
            subtypes[subType] = { count: 0, ports: new Set() };
        }
        subtypes[subType].count++;

        // Find ports associated with this block
        const blockPorts = ports.filter(p => {
            const dx = Math.abs(p.cx - block.cx);
            const dy = Math.abs(p.cy - block.cy);
            return dx < 100 && dy < 100;
        });

        blockPorts.forEach(p => {
            if (p.text) subtypes[subType].ports.add(p.text);
        });
    });

    const analysisEl = document.getElementById('ocb-analysis');
    if (analysisEl) {
        let html = `<p>Total OCB blocks: ${ocbBlocks.length}</p>`;
        html += '<table style="width:100%; border-collapse:collapse; margin-top:8px;">';
        html += '<tr style="background:#0f3460;"><th style="padding:4px; text-align:left;">Subtype</th><th>Count</th><th>Ports</th></tr>';

        Object.entries(subtypes).sort((a, b) => b[1].count - a[1].count).forEach(([type, data]) => {
            html += `<tr style="border-bottom:1px solid #333;">
                <td style="padding:4px;">${type}</td>
                <td style="text-align:center;">${data.count}</td>
                <td style="font-size:10px;">${[...data.ports].join(', ') || '-'}</td>
            </tr>`;
        });

        html += '</table>';
        analysisEl.innerHTML = html;
    }
}

function populateBlockTypeDropdown() {
    const select = document.getElementById('config-block-type');
    if (!select) return;

    select.innerHTML = Object.keys(BLOCK_PORT_RULES).map(type =>
        `<option value="${type}">${type}</option>`
    ).join('');
}

function loadBlockTypeConfig() {
    const type = document.getElementById('config-block-type')?.value;
    if (!type || !BLOCK_PORT_RULES[type]) return;

    // Load from localStorage or use defaults
    const savedConfig = localStorage.getItem(`portConfig_${type}`);
    if (savedConfig) {
        try {
            BLOCK_PORT_RULES[type].ports = JSON.parse(savedConfig);
        } catch (e) {
            console.warn('Failed to load port config:', e);
        }
    }

    renderConfigCanvas();
    updateConfigPortList();
}

function saveBlockTypeConfig() {
    const type = document.getElementById('config-block-type')?.value;
    if (!type || !BLOCK_PORT_RULES[type]) return;

    try {
        localStorage.setItem(`portConfig_${type}`, JSON.stringify(BLOCK_PORT_RULES[type].ports));
        showToast('Port configuration saved!', 'success');
    } catch (e) {
        console.warn('Failed to save port config:', e);
        showToast('Failed to save configuration', 'error');
    }
}

function renderConfigCanvas() {
    if (!configCtx) return;

    const type = document.getElementById('config-block-type')?.value;
    const config = BLOCK_PORT_RULES[type];
    if (!config) return;

    const width = configCanvas.width;
    const height = configCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear
    configCtx.fillStyle = '#1a1a2e';
    configCtx.fillRect(0, 0, width, height);

    // Draw grid
    configCtx.strokeStyle = '#0f3460';
    configCtx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
        configCtx.beginPath();
        configCtx.moveTo(x, 0);
        configCtx.lineTo(x, height);
        configCtx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
        configCtx.beginPath();
        configCtx.moveTo(0, y);
        configCtx.lineTo(width, y);
        configCtx.stroke();
    }

    // Draw center block
    const blockW = 60;
    const blockH = 30;
    configCtx.fillStyle = COLORS[type] || '#666';
    configCtx.fillRect(centerX - blockW/2, centerY - blockH/2, blockW, blockH);
    configCtx.strokeStyle = '#fff';
    configCtx.strokeRect(centerX - blockW/2, centerY - blockH/2, blockW, blockH);

    // Draw block name
    configCtx.fillStyle = '#fff';
    configCtx.font = '10px Arial';
    configCtx.textAlign = 'center';
    configCtx.fillText(type, centerX, centerY + 4);

    // Draw ports
    if (config.ports) {
        config.ports.forEach((port, idx) => {
            const px = centerX + port.dx * CONFIG_SCALE;
            const py = centerY + port.dy * CONFIG_SCALE;

            // Port circle
            configCtx.beginPath();
            configCtx.arc(px, py, 6, 0, Math.PI * 2);
            configCtx.fillStyle = idx === configSelectedPort ? '#ff0' : '#4fc3f7';
            configCtx.fill();
            configCtx.strokeStyle = '#fff';
            configCtx.stroke();

            // Port name
            configCtx.fillStyle = '#fff';
            configCtx.font = '9px Arial';
            configCtx.fillText(port.name, px, py - 10);
        });
    }

    // Draw crosshair at center
    configCtx.strokeStyle = '#ff0';
    configCtx.setLineDash([3, 3]);
    configCtx.beginPath();
    configCtx.moveTo(centerX, 0);
    configCtx.lineTo(centerX, height);
    configCtx.moveTo(0, centerY);
    configCtx.lineTo(width, centerY);
    configCtx.stroke();
    configCtx.setLineDash([]);
}

function updateConfigPortList() {
    const type = document.getElementById('config-block-type')?.value;
    const config = BLOCK_PORT_RULES[type];
    const list = document.getElementById('config-port-list');

    if (!config || !list) return;

    list.innerHTML = (config.ports || []).map((port, idx) => `
        <div class="config-port-item ${idx === configSelectedPort ? 'selected' : ''}"
             onclick="selectConfigPort(${idx})">
            <span>${port.name}</span>
            <span style="color:#888;">(${port.dx}, ${port.dy})</span>
            <button onclick="event.stopPropagation(); removeConfigPort(${idx})">X</button>
        </div>
    `).join('');
}

function selectConfigPort(idx) {
    configSelectedPort = idx;
    updateConfigPortList();
    renderConfigCanvas();
}

function addConfigPort() {
    const type = document.getElementById('config-block-type')?.value;
    const name = prompt('Enter port name:', 'NEW');
    if (!name) return;

    if (!BLOCK_PORT_RULES[type]) {
        BLOCK_PORT_RULES[type] = { ports: [] };
    }
    if (!BLOCK_PORT_RULES[type].ports) {
        BLOCK_PORT_RULES[type].ports = [];
    }

    BLOCK_PORT_RULES[type].ports.push({ name, dx: 0, dy: -30 });
    updateConfigPortList();
    renderConfigCanvas();
}

function removeConfigPort(idx) {
    const type = document.getElementById('config-block-type')?.value;
    if (!BLOCK_PORT_RULES[type]?.ports) return;

    BLOCK_PORT_RULES[type].ports.splice(idx, 1);
    configSelectedPort = -1;
    updateConfigPortList();
    renderConfigCanvas();
}

function updateConfigPort(index) {
    // Called when port position changes via drag
    const type = document.getElementById('config-block-type')?.value;
    if (!BLOCK_PORT_RULES[type]?.ports?.[index]) return;

    updateConfigPortList();
    renderConfigCanvas();
}

function onConfigCanvasMouseDown(e) {
    const rect = configCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = configCanvas.width / 2;
    const centerY = configCanvas.height / 2;

    const type = document.getElementById('config-block-type')?.value;
    const config = BLOCK_PORT_RULES[type];
    if (!config?.ports) return;

    // Check if clicked on a port
    for (let i = 0; i < config.ports.length; i++) {
        const port = config.ports[i];
        const px = centerX + port.dx * CONFIG_SCALE;
        const py = centerY + port.dy * CONFIG_SCALE;
        const dist = Math.hypot(x - px, y - py);

        if (dist < 10) {
            configDraggingPort = i;
            configSelectedPort = i;
            updateConfigPortList();
            return;
        }
    }
}

function onConfigCanvasMouseMove(e) {
    if (configDraggingPort === null) return;

    const rect = configCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = configCanvas.width / 2;
    const centerY = configCanvas.height / 2;

    const type = document.getElementById('config-block-type')?.value;
    if (!BLOCK_PORT_RULES[type]?.ports?.[configDraggingPort]) return;

    // Update port position
    BLOCK_PORT_RULES[type].ports[configDraggingPort].dx = Math.round((x - centerX) / CONFIG_SCALE);
    BLOCK_PORT_RULES[type].ports[configDraggingPort].dy = Math.round((y - centerY) / CONFIG_SCALE);

    renderConfigCanvas();
}

function onConfigCanvasMouseUp(e) {
    if (configDraggingPort !== null) {
        updateConfigPort(configDraggingPort);
    }
    configDraggingPort = null;
}

function onConfigCanvasRightClick(e) {
    e.preventDefault();
    // Could add context menu for port options
}

// ============ 앱 시작 ============

// 중복 실행 방지
let appStarted = false;

// 앱 초기화 함수
async function startApp() {
    if (appStarted) return;
    appStarted = true;

    // 로컬 데이터 먼저 로드 (템플릿, 패턴, 최근도면)
    if (typeof initLocalData === 'function') {
        await initLocalData();
        // 템플릿이 비어있으면 재시도
        if (blockTemplates.length === 0 && isPyWebView()) {
            console.log('[APP] 템플릿 로드 실패, 1초 후 재시도...');
            await new Promise(r => setTimeout(r, 1000));
            await initLocalData();
        }
    }

    init();
    initTemplates();
    initDrawingManager();
    updateRecentDrawingsList();

    // 블록 타입 라이브러리 초기화
    if (typeof initBlockTypeLibrary === 'function') {
        initBlockTypeLibrary();
    }

    // 패턴 저장소 로드 (localStorage 폴백용)
    if (typeof loadConnectionPatternsFromStorage === 'function') {
        loadConnectionPatternsFromStorage();
    }

    // 태그 검색 인덱스 로드
    if (typeof loadCrossReferenceIndex === 'function') {
        loadCrossReferenceIndex();
    }

    // 전역 스캔 사전 로드
    if (typeof loadScanDescriptions === 'function') {
        loadScanDescriptions();
    }

    console.log('[APP] 초기화 완료 - 템플릿:', blockTemplates.length, '개');
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // PyWebView 환경인 경우 API 준비 이벤트 대기
    if (window.pywebview) {
        window.addEventListener('pywebviewready', () => {
            console.log('[APP] pywebviewready 이벤트 수신');
            startApp();
        });
    } else {
        // PyWebView가 아직 없으면 잠시 대기 후 확인
        setTimeout(async () => {
            if (window.pywebview) {
                // PyWebView가 나중에 로드됨 - 이벤트 대기
                window.addEventListener('pywebviewready', () => {
                    console.log('[APP] pywebviewready 이벤트 수신 (지연)');
                    startApp();
                });
                // 이미 준비되었을 수도 있으니 직접 확인
                if (window.pywebview.api) {
                    console.log('[APP] PyWebView API 이미 준비됨');
                    startApp();
                }
            } else {
                // 브라우저 모드 (HTTP 서버)
                console.log('[APP] 브라우저 모드로 시작');
                startApp();
            }
        }, 100);
    }
});

// 또는 즉시 실행 (script가 body 끝에 있는 경우)
// init();
// initTemplates();
// initDrawingManager();
// updateRecentDrawingsList();
