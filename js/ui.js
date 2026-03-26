/**
 * ui.js - UI 업데이트 및 관리
 * 상태바, 선택 정보, 통계, 연결 목록, 메뉴 등
 */

// ============ 스캔 탭 전역 변수 ============
let scanResults = [];  // 스캔된 요소 목록
let scanDescriptions = {};  // 인스턴스별 설명 { 블록명: "설명" }
let scanCollapsedCategories = {};  // 카테고리 접기 상태

// ============ 통합 알림 시스템 ============

// 토스트 알림 (alert 대체)
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<span class="toast-msg">${message.replace(/\n/g, '<br>')}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 확인 모달 (confirm 대체) - Promise 기반
function showConfirm(message, { title = '확인', confirmText = '확인', cancelText = '취소', type = 'info' } = {}) {
    return new Promise((resolve) => {
        // 기존 모달 제거
        const existing = document.getElementById('app-confirm-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-modal';
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-box">
                <div class="confirm-title">${title}</div>
                <div class="confirm-message">${message.replace(/\n/g, '<br>')}</div>
                <div class="confirm-buttons">
                    <button class="confirm-btn confirm-cancel">${cancelText}</button>
                    <button class="confirm-btn confirm-ok ${type === 'danger' ? 'confirm-danger' : ''}">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 애니메이션
        requestAnimationFrame(() => overlay.classList.add('confirm-visible'));

        const close = (result) => {
            overlay.classList.remove('confirm-visible');
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        overlay.querySelector('.confirm-ok').onclick = () => close(true);
        overlay.querySelector('.confirm-cancel').onclick = () => close(false);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

        // ESC로 닫기
        const onKey = (e) => { if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);

        // 확인 버튼 포커스
        setTimeout(() => overlay.querySelector('.confirm-ok').focus(), 100);
    });
}

// 알림 스타일 CSS
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        /* 토스트 */
        .toast-notification {
            position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
            padding: 10px 20px; border-radius: 8px; font-size: 12px; font-weight: 500;
            z-index: 9999; max-width: 500px; text-align: center; color: #fff;
            backdrop-filter: blur(12px); box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            animation: toastIn 0.3s ease;
        }
        .toast-success { background: rgba(16,185,129,0.9); }
        .toast-error { background: rgba(239,68,68,0.9); }
        .toast-info { background: rgba(30,30,50,0.95); border: 1px solid rgba(255,255,255,0.1); }
        .toast-out { animation: toastOut 0.3s ease forwards; }
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes toastOut { from { opacity:1; transform:translateX(-50%) translateY(0); } to { opacity:0; transform:translateX(-50%) translateY(20px); } }

        /* 확인 모달 */
        .confirm-overlay {
            position: fixed; top:0; left:0; right:0; bottom:0;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; opacity: 0; transition: opacity 0.2s ease;
        }
        .confirm-overlay.confirm-visible { opacity: 1; }
        .confirm-box {
            background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; padding: 24px; min-width: 320px; max-width: 480px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            transform: scale(0.95); transition: transform 0.2s ease;
        }
        .confirm-visible .confirm-box { transform: scale(1); }
        .confirm-title {
            font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 12px;
        }
        .confirm-message {
            font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 20px;
            white-space: pre-wrap;
        }
        .confirm-buttons { display: flex; gap: 8px; justify-content: flex-end; }
        .confirm-btn {
            padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;
            border: none; cursor: pointer; transition: all 0.15s;
        }
        .confirm-cancel {
            background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
        }
        .confirm-cancel:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .confirm-ok {
            background: var(--accent-blue, #58a6ff); color: #fff;
        }
        .confirm-ok:hover { filter: brightness(1.1); }
        .confirm-danger {
            background: #ef4444;
        }
        .confirm-danger:hover { background: #dc2626; }
    `;
    document.head.appendChild(style);
}

// ============ 환영 화면 ============

function showWelcomeScreen() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    // 도면이 없을 때 패널들 숨김
    const sidebar = document.getElementById('sidebar');
    const toolPanel = document.getElementById('tool-panel');
    if (sidebar) sidebar.style.display = 'none';
    if (toolPanel) toolPanel.style.display = 'none';
    // 헤더 버튼들 숨기기
    const navTabs = document.getElementById('header-nav-tabs');
    const editorBtns = document.getElementById('header-btns-editor');
    const pidBtns = document.getElementById('header-btns-pid');
    if (navTabs) navTabs.style.display = 'none';
    if (editorBtns) editorBtns.style.display = 'none';
    if (pidBtns) pidBtns.style.display = 'none';
    // 타이틀 클리어
    const titleEl = document.getElementById('drawing-title');
    if (titleEl) titleEl.textContent = '';
    // 통계 업데이트 (지연 로드)
    setTimeout(() => {
        loadHomeStats();
    }, 300);
}

// 홈 통계 초기화 (로직 + P&ID)
async function loadHomeStats() {
    console.log('[HomeStats] 통계 로딩 시작');
    await updateWelcomeStats();
    console.log('[HomeStats] 로직 통계 완료');

    // P&ID 검색 인덱스 로드 (검색용)
    if (typeof loadPIDSearchIndex === 'function' && !pidSearchIndex) {
        await loadPIDSearchIndex();
        console.log('[HomeStats] P&ID 검색 인덱스 로드 완료');
    }
}

async function updateWelcomeStats() {
    // 도면 인덱스가 없으면 로드
    if (!localDrawingIndex || Object.keys(localDrawingIndex).length === 0) {
        try {
            localDrawingIndex = await readJsonFile('drawings/drawing_index.json');
            console.log('[WelcomeStats] drawing_index.json 로드됨:', Object.keys(localDrawingIndex).length);
        } catch (e) {
            console.log('[WelcomeStats] drawing_index.json 로드 실패:', e.message);
        }
    }

    // cross_reference_index도 로드
    if (!crossRefIndex || crossRefIndex.length === 0) {
        try {
            crossRefIndex = await readJsonFile('data/cross_reference_index.json');
            console.log('[WelcomeStats] cross_reference_index.json 로드됨:', crossRefIndex.length);
        } catch (e) {
            console.log('[WelcomeStats] cross_reference_index.json 로드 실패:', e.message);
        }
    }

    // 도면/페이지 통계
    const drawingIndex = localDrawingIndex || {};
    const drawingCount = Object.keys(drawingIndex).length;
    let pageCount = 0;
    const drops = {};

    for (const [num, info] of Object.entries(drawingIndex)) {
        const pages = info.pages || [];
        pageCount += pages.length;
        const drop = info.drop || 0;
        if (!drops[drop]) {
            drops[drop] = { name: info.drop_name || 'Unknown', count: 0, pages: 0 };
        }
        drops[drop].count++;
        drops[drop].pages += pages.length;
    }

    // 태그 수
    const tagCount = crossRefIndex ? crossRefIndex.length : 0;

    // 사이드바 통계 업데이트
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString();
    };
    setVal('ws-pages', pageCount);
    setVal('ws-tags', tagCount);
    setVal('ws-drops', Object.keys(drops).length);

    // Drop 목록 (사이드바용)
    const listEl = document.getElementById('home-drop-list');
    if (listEl && Object.keys(drops).length > 0) {
        let html = '';
        for (const dk of Object.keys(drops).sort((a, b) => Number(a) - Number(b))) {
            const d = drops[dk];
            html += `<div class="sidebar-item" onclick="filterDrawingsByDrop(${dk})">
                <span>Drop ${dk} — ${d.name}</span>
                <span class="item-info">${d.count}개</span>
            </div>`;
        }
        listEl.innerHTML = html;
    }

    // P&ID 통계 업데이트
    updateHomePIDStats();
}

function hideWelcomeScreen() {
    document.getElementById('welcome-screen').classList.add('hidden');
    // 도면이 열리면 패널들 표시
    const sidebar = document.getElementById('sidebar');
    const toolPanel = document.getElementById('tool-panel');
    if (sidebar) sidebar.style.display = 'flex';
    if (toolPanel) toolPanel.style.display = 'flex';

    // 상단 UI 표시 (제어 로직 모드)
    const navTabs = document.getElementById('header-nav-tabs');
    const editorBtns = document.getElementById('header-btns-editor');
    if (navTabs) navTabs.style.display = 'flex';
    if (editorBtns) editorBtns.style.display = 'flex';

    // 전역 스캔 사전 로드 (설비정보 연동)
    loadScanDescriptions();
}

// ============ 모드 토글 ============

function toggleEditMode() {
    if (connectMode) toggleConnectMode();
    if (cloneMode) toggleCloneMode();
    if (templateMode) toggleTemplateMode();
    editMode = !editMode;
    pendingPortAssign = null;

    const indicator = document.getElementById('mode-indicator');
    const editBtn = document.getElementById('editBtn');
    const toolEditBtn = document.getElementById('toolEditBtn');

    if (editMode) {
        if (indicator) {
            indicator.textContent = 'EDIT';
            indicator.className = 'mode-edit';
        }
        editBtn?.classList.add('active');
        toolEditBtn?.classList.add('active');
    } else {
        if (indicator) {
            indicator.textContent = 'VIEW';
            indicator.className = 'mode-view';
        }
        editBtn?.classList.remove('active');
        toolEditBtn?.classList.remove('active');
    }
    updateStatusMode();
    render();
}

function toggleConnectMode() {
    // 패턴 모드가 활성화되어 있으면 먼저 해제
    if (typeof patternMode !== 'undefined' && patternMode) {
        patternMode = false;
        const patternBtn = document.getElementById('patternModeBtn');
        if (patternBtn) {
            patternBtn.classList.remove('active');
            patternBtn.textContent = '패턴모드';
        }
        if (typeof patternSelectedGroups !== 'undefined') patternSelectedGroups = [];
        if (typeof isPatternSelecting !== 'undefined') isPatternSelecting = false;
    }
    if (editMode) {
        editMode = false;
        document.getElementById('editBtn')?.classList.remove('active');
        document.getElementById('toolEditBtn')?.classList.remove('active');
    }
    if (cloneMode) toggleCloneMode();
    if (templateMode) toggleTemplateMode();
    connectMode = !connectMode;
    connectStart = null;
    connectWaypoints = [];

    const indicator = document.getElementById('mode-indicator');
    const btn = document.getElementById('connectBtn');
    const toolBtn = document.getElementById('toolConnectBtn');
    const hint = document.getElementById('connect-hint');

    if (connectMode) {
        if (indicator) {
            indicator.textContent = 'CONNECT';
            indicator.className = 'mode-connect';
        }
        btn?.classList.add('active');
        toolBtn?.classList.add('active');
        if (hint) {
            hint.style.display = 'inline';
            hint.textContent = 'Click start element';
        }
        if (canvas) {
            canvas.style.cursor = 'crosshair';
            canvas.classList.add('connect-mode');
        }
    } else {
        if (indicator) {
            indicator.textContent = 'VIEW';
            indicator.className = 'mode-view';
        }
        btn?.classList.remove('active');
        toolBtn?.classList.remove('active');
        if (hint) hint.style.display = 'none';
        if (canvas) {
            canvas.style.cursor = '';
            canvas.classList.remove('connect-mode');
        }
    }
    updateStatusMode();
    render();
}

function toggleCloneMode() {
    if (editMode) {
        editMode = false;
        document.getElementById('editBtn')?.classList.remove('active');
        document.getElementById('toolEditBtn')?.classList.remove('active');
    }
    if (connectMode) {
        connectMode = false;
        document.getElementById('connectBtn')?.classList.remove('active');
        document.getElementById('toolConnectBtn')?.classList.remove('active');
        const connectHint = document.getElementById('connect-hint');
        if (connectHint) connectHint.style.display = 'none';
    }
    if (templateMode) toggleTemplateMode();
    cloneMode = !cloneMode;
    cloneParentRow = [];
    cloneChildRow = [];
    cloneCurrentChildIdx = 0;
    cloneSelectStart = null;
    cloneSelectEnd = null;
    isCloneSelecting = false;

    const indicator = document.getElementById('mode-indicator');
    const btn = document.getElementById('cloneBtn');
    const hint = document.getElementById('clone-hint');

    if (cloneMode) {
        if (indicator) {
            indicator.textContent = 'CLONE';
            indicator.className = 'mode-clone';
        }
        btn?.classList.add('active');
        if (hint) {
            hint.style.display = 'inline';
            hint.textContent = '드래그: 부모 행 선택';
        }
        if (canvas) canvas.style.cursor = 'crosshair';
    } else {
        if (indicator) {
            indicator.textContent = 'VIEW';
            indicator.className = 'mode-view';
        }
        btn?.classList.remove('active');
        if (hint) hint.style.display = 'none';
        if (canvas) canvas.style.cursor = '';
    }
    render();
}

// ============ 상태바 업데이트 ============

function updateStatusBar() {
    document.getElementById('status-blocks').textContent = blocks.length;
    document.getElementById('status-ports').textContent = ports.length;
    document.getElementById('status-conns').textContent = customConnections.length;
    document.getElementById('status-zoom').textContent = Math.round(scale * 100) + '%';
    updateStatusMode();
}

function updateStatusMode() {
    const el = document.getElementById('status-mode');
    const hint = document.getElementById('status-hint');

    el.classList.remove('view', 'edit', 'connect', 'template');

    if (templateMode) {
        el.textContent = 'TEMPLATE';
        el.classList.add('template');
        hint.textContent = templateAnchor ? '드래그로 포트 선택' : '앵커 클릭';
    } else if (connectMode) {
        el.textContent = 'CONNECT';
        el.classList.add('connect');
        hint.textContent = connectStart ? '끝점 클릭' : '시작점 클릭';
    } else if (editMode) {
        el.textContent = 'EDIT';
        el.classList.add('edit');
        hint.textContent = '드래그로 이동, 더블클릭으로 추가';
    } else {
        el.textContent = 'VIEW';
        el.classList.add('view');
        hint.textContent = '';
    }

    document.getElementById('toolEditBtn')?.classList.toggle('active', editMode);
    document.getElementById('toolConnectBtn')?.classList.toggle('active', connectMode);
    document.getElementById('toolTemplateBtn')?.classList.toggle('active', templateMode);
}

// ============ 통계 업데이트 ============

function updateStats() {
    updateStatusBar();
}

// ============ 선택 정보 업데이트 ============

function updateSelectionInfo() {
    const div = document.getElementById('selection-info');

    if (!selectedElement) {
        div.innerHTML = '<p style="color:#666; font-size:12px;">Click on an element to select</p>';
        return;
    }

    const e = selectedElement;

    // Auto connection selected (C mode)
    if (e.autoConnectionIndex !== undefined) {
        const conn = customConnections[e.autoConnectionIndex];
        if (conn) {
            const fromGroup = conn.fromGroup || conn.fromParent || '';
            const toGroup = conn.toGroup || conn.toParent || '';
            const fromLabel = fromGroup ? `${fromGroup}` : conn.fromName;
            const toLabel = toGroup ? `${toGroup}` : conn.toName;
            div.innerHTML = `
                <div style="text-align:center; margin-bottom:8px;">
                    <span style="color:#ffeb3b; font-size:11px; font-weight:bold;">AUTO CONNECTION</span>
                </div>
                <div style="background:#1a1a2e; border-radius:6px; padding:10px; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                        <span style="background:#4caf50; color:#fff; font-size:9px; padding:2px 5px; border-radius:3px; flex-shrink:0;">FROM</span>
                        <span style="color:#4caf50; font-size:10px; font-weight:bold; word-break:break-all;">${conn.fromName}</span>
                    </div>
                    ${fromGroup ? `<div style="color:#aaa; font-size:10px; margin-left:40px; margin-bottom:4px;">▸ ${fromGroup}</div>` : ''}
                    <div style="text-align:center; color:#ffeb3b; font-size:14px; margin:4px 0;">↓</div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top:6px;">
                        <span style="background:#ff9800; color:#fff; font-size:9px; padding:2px 5px; border-radius:3px; flex-shrink:0;">TO</span>
                        <span style="color:#ff9800; font-size:10px; font-weight:bold; word-break:break-all;">${conn.toName}</span>
                    </div>
                    ${toGroup ? `<div style="color:#aaa; font-size:10px; margin-left:40px;">▸ ${toGroup}</div>` : ''}
                </div>
                <div style="display:flex; gap:8px; font-size:10px; color:#888; margin-bottom:8px;">
                    <span>경유점: ${conn.waypoints?.length || 0}</span>
                    <span>|</span>
                    <span>ID: #${e.autoConnectionIndex}</span>
                </div>
                <button class="btn-primary" style="width:100%; background:#c62828; font-size:11px;"
                    onclick="deleteAutoConnection(${e.autoConnectionIndex})">삭제 (잘못된 연결)</button>
                <p style="color:#888; font-size:10px; margin-top:6px; text-align:center;">or press <kbd style="background:#0f3460; padding:2px 5px; border-radius:3px;">DEL</kbd></p>
            `;
        }
        return;
    }

    // Connection selected
    if (e.connectionIndex !== undefined) {
        const conn = customConnections[e.connectionIndex];
        div.innerHTML = `
            <div class="info-row">
                <span class="label">Type:</span>
                <span class="value">CONNECTION</span>
            </div>
            <div class="info-row">
                <span class="label">From:</span>
                <span class="value">${conn.fromParent ? conn.fromParent + ' ' : ''}${conn.fromName}</span>
            </div>
            <div class="info-row">
                <span class="label">To:</span>
                <span class="value">${conn.toParent ? conn.toParent + ' ' : ''}${conn.toName}</span>
            </div>
            <div class="info-row">
                <span class="label">Waypoints:</span>
                <span class="value">${conn.waypoints?.length || 0}</span>
            </div>
            <button class="btn-primary" style="width:100%; margin-top:10px;"
                onclick="deleteConnection(${e.connectionIndex})">Delete Connection</button>
            <p style="color:#888; font-size:10px; margin-top:6px; text-align:center;">or press <kbd style="background:#0f3460; padding:2px 5px; border-radius:3px;">DEL</kbd></p>
        `;
        return;
    }

    // Common type options
    const allTypes = ['PORT', 'OCB_BLOCK', 'SIGNAL', 'ALG_BLOCK', 'REF_SIGNAL',
                      'AND', 'OR', 'NOT', 'M/A', 'DIV', 'MUL', 'PID', 'K', 'AI', 'AO', 'DI', 'DO',
                      'BLOCK_TYPE', 'SHEET_REF', 'OTHER'];

    let html = `
        <div class="info-row">
            <span class="label">Type:</span>
            ${editMode ?
                `<select onchange="changeElementType(selectedElement, this.value)" style="flex:1; background:#0f0f23; border:1px solid #0f3460; color:#eee; padding:2px;">
                    ${allTypes.map(t => `<option value="${t}" ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                    ${!allTypes.includes(e.type) ? `<option value="${e.type}" selected>${e.type}</option>` : ''}
                </select>` :
                `<span class="value">${e.type}</span>`
            }
        </div>
        <div class="info-row">
            <span class="label">Name:</span>
            ${editMode ?
                `<input type="text" value="${e.name}" onchange="updateElementName(selectedElement, this.value)" />` :
                `<span class="value" style="display:flex; align-items:center; gap:4px;">${e.name}<button onclick="navigator.clipboard.writeText('${e.name.replace(/'/g, "\\'")}'); this.textContent='✓'; setTimeout(()=>this.textContent='📋',800)" style="background:none; border:none; cursor:pointer; font-size:12px; padding:0 2px; opacity:0.6;" title="Copy name">📋</button></span>`
            }
        </div>
        <div class="info-row">
            <span class="label">Position:</span>
            <span class="value">(${e.cx.toFixed(0)}, ${e.cy.toFixed(0)})</span>
        </div>
    `;

    // 설비정보 (스캔에서 입력한 설명) - autoConnection/connection이 아닌 일반 요소만
    if (e.autoConnectionIndex === undefined && e.connectionIndex === undefined) {
        const scanInfo = scanDescriptions[e.name];
        let equipmentDesc = '';
        let memoDesc = '';
        if (scanInfo) {
            if (typeof scanInfo === 'string') {
                equipmentDesc = scanInfo; // 기존 호환
            } else {
                equipmentDesc = scanInfo.equipment || '';
                memoDesc = scanInfo.memo || '';
            }
        }

        html += `<div style="margin-top:8px; padding:8px; background:rgba(79,195,247,0.08); border:1px solid rgba(79,195,247,0.2); border-radius:6px;">`;
        html += `<div style="font-size:10px; font-weight:600; color:#4fc3f7; margin-bottom:4px;">설비 정보</div>`;
        html += `<input type="text" value="${equipmentDesc.replace(/"/g, '&quot;')}" placeholder="설비 정보를 입력하세요"
         onblur="saveScanEquipment('${e.name.replace(/'/g, "\\'")}', this.value)"
         style="width:100%; padding:4px 6px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:4px; color:var(--text-primary); font-size:11px; box-sizing:border-box; margin-bottom:6px;">`;
        html += `<div style="font-size:10px; font-weight:600; color:#4fc3f7; margin-bottom:4px;">메모</div>`;
        html += `<input type="text" value="${memoDesc.replace(/"/g, '&quot;')}" placeholder="메모를 입력하세요"
         onblur="saveScanMemo('${e.name.replace(/'/g, "\\'")}', this.value)"
         style="width:100%; padding:4px 6px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:4px; color:var(--text-primary); font-size:11px; box-sizing:border-box;">`;
        html += `</div>`;
    }

    if (['PORT', 'BLOCK_TYPE', 'SHEET_REF', 'JUNCTION'].includes(e.type)) {
        const validBlocks = blocks
            .filter(b => isBlockType(b.type) && !isPortLikeName(b.name))
            .sort((a, b) => a.name.localeCompare(b.name));

        html += `
            <div class="info-row" style="flex-direction:column; align-items:stretch;">
                <span class="label" style="margin-bottom:4px;">Parent Block:</span>
                <input type="text" id="block-search" placeholder="Search blocks... (↑↓ Enter)"
                       style="width:100%; margin-bottom:4px; padding:4px 8px;"
                       onkeyup="filterBlockDropdown(this.value)"
                       onkeydown="handleBlockSearchKeydown(event)">
                <select id="block-dropdown" size="5"
                        style="width:100%; min-height:100px; background:#0f0f23; border:1px solid #0f3460; color:#eee;"
                        onchange="changeParentBlock(selectedElement, this.value)">
                    <option value="" ${!e.parent ? 'selected' : ''}>(none)</option>
                    ${validBlocks.map(b => `<option value="${b.name}" ${e.parent === b.name ? 'selected' : ''}>${b.name} [${b.type.replace('_BLOCK','').replace('_SIGNAL','')}]</option>`).join('')}
                </select>
            </div>
            <p style="color:#888; font-size:10px; margin-top:4px;">Or click a block in the canvas</p>
        `;

        if (pendingPortAssign === e) {
            html += `<p style="color:#ff0; font-size:11px; margin-top:10px;">Click a block to assign</p>`;
        }
        if (e.parent) {
            html += `<button class="btn-secondary" style="margin-top:10px; width:100%;"
                     onclick="removePortFromParent(selectedElement)">Remove from parent</button>`;
        }
    }

    // Port connections list
    {
        const portConns = [];
        for (let i = 0; i < customConnections.length; i++) {
            const c = customConnections[i];
            const eName = e.name?.toUpperCase();
            const eParent = e.parent?.toUpperCase();
            if (c.fromName?.toUpperCase() === eName && (!eParent || c.fromParent?.toUpperCase() === eParent)) {
                portConns.push({ dir: 'TO', name: c.toName, parent: c.toParent, idx: i });
            }
            if (c.toName?.toUpperCase() === eName && (!eParent || c.toParent?.toUpperCase() === eParent)) {
                portConns.push({ dir: 'FROM', name: c.fromName, parent: c.fromParent, idx: i });
            }
        }
        if (portConns.length > 0) {
            html += `<h3 style="margin-top:10px; margin-bottom:5px; color:#66bb6a;">연결 (${portConns.length})</h3><div style="max-height:140px; overflow-y:auto;">`;
            for (const pc of portConns) {
                const label = pc.parent ? `${pc.parent}.${pc.name}` : pc.name;
                const dirColor = pc.dir === 'TO' ? '#ff9800' : '#4caf50';
                const dirLabel = pc.dir === 'TO' ? '→' : '←';
                html += `<div style="display:flex; align-items:center; gap:6px; padding:3px 6px; margin:2px 0; background:#1a1a2e; border-radius:3px; font-size:11px; cursor:pointer;" onclick="navigateToPort('${(pc.name||'').replace(/'/g,"\\'")}','${(pc.parent||'').replace(/'/g,"\\'")}')">
                    <span style="color:${dirColor}; font-size:13px; flex-shrink:0;">${dirLabel}</span>
                    <span style="color:#eee; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${label}</span>
                </div>`;
            }
            html += `</div>`;
        }
    }

    if (isBlockType(e.type) || e.isGroupAnchor) {
        // groupsData에서 그룹 찾기 (이름 또는 ID로)
        const group = groupsData[e.name] || groupsData[e.id];
        const portCount = group?.ports?.length || 0;

        html += `<h3 style="margin-top:10px; margin-bottom:5px; color:#4fc3f7;">하위 포트 (${portCount})</h3><div id="port-list" style="max-height:150px; overflow-y:auto;">`;

        if (group?.ports && group.ports.length > 0) {
            for (const p of group.ports) {
                const portName = p.customName || p.name || p.text || '(unknown)';
                html += `
                    <div class="port-item" style="display:flex; justify-content:space-between; padding:3px 6px; margin:2px 0; background:#1a1a3e; border-radius:3px; font-size:11px;">
                        <span style="color:#4fc3f7;">${portName}</span>
                        <span style="color:#888; font-size:10px;">(${Math.round(p.cx)}, ${Math.round(p.cy)})</span>
                        ${editMode ? `<span class="remove-btn" style="color:#e94560; cursor:pointer; margin-left:5px;" onclick="removePortByPos(${p.cx}, ${p.cy})">X</span>` : ''}
                    </div>
                `;
            }
        } else {
            html += `<p style="color:#666; font-size:11px; padding:5px;">포트 없음</p>`;
        }
        html += `</div>`;
    }

    // Cross Reference section
    if (crossRefIndex && e.name) {
        const refMatches = crossRefIndex.filter(r => r.tag.toUpperCase() === e.name.toUpperCase());
        if (refMatches.length > 0) {
            const allDrawings = refMatches.flatMap(r => r.drawings);
            html += `<h3 style="margin-top:10px; margin-bottom:5px; color:#f0a050;">관련 도면 (${allDrawings.length})</h3><div style="max-height:120px; overflow-y:auto;">`;
            for (const d of allDrawings) {
                const dn = d.num.includes('-') ? d.num.split('-').pop() : d.num;
                html += `<div style="display:flex; align-items:center; gap:6px; padding:3px 6px; margin:2px 0; background:#1a1a2e; border-radius:3px; font-size:11px; cursor:pointer;" onclick="openDrawingFromTag('${dn}','${d.num}','${e.name.replace(/'/g, "\\'")}')">
                    <span style="color:#f0a050;">${d.num}</span>
                    <span style="color:#aaa; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.title}</span>
                    ${d.primary ? '<span style="color:#4fc3f7; font-size:9px;">★</span>' : ''}
                </div>`;
            }
            html += `</div>`;
        }
    }

    // Memo section
    const currentMemo = getMemo(e);
    html += `
        <div class="memo-label">
            <span class="icon">📝</span>
            <span class="label">Memo</span>
        </div>
        <textarea class="memo-area"
                  placeholder="메모를 입력하세요..."
                  onchange="updateMemo(selectedElement, this.value)"
                  onkeydown="event.stopPropagation()">${currentMemo}</textarea>
    `;

    div.innerHTML = html;

    // Auto-focus search input for ports
    if (['PORT', 'BLOCK_TYPE', 'SHEET_REF', 'JUNCTION'].includes(e.type)) {
        setTimeout(() => {
            const searchInput = document.getElementById('block-search');
            if (searchInput) searchInput.focus();
        }, 50);
    }
}

function navigateToPort(name, parent) {
    const target = ports.find(p => {
        if (p.name?.toUpperCase() !== name.toUpperCase()) return false;
        if (parent && p.parent?.toUpperCase() !== parent.toUpperCase()) return false;
        return true;
    }) || blocks.find(b => b.name?.toUpperCase() === name.toUpperCase());
    if (!target) return;
    selectedElement = target;
    // Center view on element
    const canvas = document.getElementById('editor-canvas');
    const cw = canvas.width, ch = canvas.height;
    viewX = target.cx * scale - cw / 2;
    viewY = target.cy * scale - ch / 2;
    updateSelectionInfo();
    render();
}

function removePortByPos(cx, cy) {
    const port = ports.find(p => Math.abs(p.cx - cx) < 1 && Math.abs(p.cy - cy) < 1);
    if (port) removePortFromParent(port);
}

// ============ 연결 목록 업데이트 ============

// 접힌 블록 그룹 상태 저장
let connCollapsedGroups = new Set();

function filterConnectionList() {
    updateConnectionList();
}

function updateConnectionList() {
    // 분석 탭 적용 목록도 갱신
    if (typeof updateAppliedConnectionsList === 'function') updateAppliedConnectionsList();

    const container = document.getElementById('connection-list');
    if (!container) return;

    const statsEl = document.getElementById('conn-stats');
    const searchInput = document.getElementById('conn-search');
    const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();

    if (customConnections.length === 0) {
        container.innerHTML = '<p style="color:#555; font-size:11px; padding:10px; text-align:center;">연결선 없음</p>';
        if (statsEl) statsEl.textContent = '';
        return;
    }

    // 블록별 그룹화 (fromParent + toParent 양쪽 모두 수집)
    const blockMap = {}; // blockName -> [{ conn, idx, port, arrow, target, source }]

    customConnections.forEach((conn, idx) => {
        const fromBlock = conn.fromParent || conn.fromName || '(unknown)';
        const toBlock = conn.toParent || conn.toName || '(unknown)';
        const fromPort = conn.fromName ? conn.fromName.split('.').pop() : '?';
        const toPort = conn.toName ? conn.toName.split('.').pop() : '?';
        const sourceLabel = conn.source === 'manual' ? 'manual' : 'auto';

        // from 블록 측: 출력 방향 (->)
        if (!blockMap[fromBlock]) blockMap[fromBlock] = [];
        blockMap[fromBlock].push({
            conn, idx,
            port: fromPort,
            arrow: '\u2192',
            target: (toBlock !== fromBlock ? toBlock + '.' : '') + toPort,
            source: sourceLabel
        });

        // to 블록 측: 입력 방향 (<-)
        if (!blockMap[toBlock]) blockMap[toBlock] = [];
        blockMap[toBlock].push({
            conn, idx,
            port: toPort,
            arrow: '\u2190',
            target: (fromBlock !== toBlock ? fromBlock + '.' : '') + fromPort,
            source: sourceLabel
        });
    });

    // 검색 필터링 + 통계 수집
    const blockNames = Object.keys(blockMap).sort();
    let filteredBlocks = {};
    let totalConns = customConnections.length;
    let blockCount = 0;

    for (const bName of blockNames) {
        const entries = blockMap[bName];
        // 중복 제거 (같은 idx+arrow 조합)
        const seen = new Set();
        const unique = entries.filter(e => {
            const key = e.idx + '_' + e.arrow;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (searchTerm) {
            const blockMatch = bName.toLowerCase().includes(searchTerm);
            const matchedEntries = unique.filter(e =>
                blockMatch ||
                e.port.toLowerCase().includes(searchTerm) ||
                e.target.toLowerCase().includes(searchTerm)
            );
            if (matchedEntries.length > 0) {
                filteredBlocks[bName] = matchedEntries;
                blockCount++;
            }
        } else {
            filteredBlocks[bName] = unique;
            blockCount++;
        }
    }

    // 통계 업데이트
    if (statsEl) {
        statsEl.innerHTML = '<span style="color:#81d4fa;">전체 연결: ' + totalConns + '개</span> <span style="margin:0 6px; color:#444;">|</span> <span style="color:#b0bec5;">블록: ' + blockCount + '개</span>';
    }

    if (Object.keys(filteredBlocks).length === 0) {
        container.innerHTML = '<p style="color:#555; font-size:11px; padding:10px; text-align:center;">검색 결과 없음</p>';
        return;
    }

    // 렌더링
    let html = '';

    for (const [blockName, entries] of Object.entries(filteredBlocks)) {
        const isCollapsed = connCollapsedGroups.has(blockName);
        const toggleIcon = isCollapsed ? '\u25B6' : '\u25BC';
        const escapedName = blockName.replace(/'/g, "\\'");

        html += '<div class="conn-group">';
        html += '<div class="conn-group-header" onclick="toggleConnGroupByName(\'' + escapedName + '\')">';
        html += '<span class="toggle">' + toggleIcon + '</span>';
        html += '<span class="group-name">' + blockName + '</span>';
        html += '<span class="count">' + entries.length + '개 연결</span>';
        html += '</div>';

        html += '<div class="conn-group-items" style="display:' + (isCollapsed ? 'none' : 'block') + ';">';

        for (const entry of entries) {
            const selClass = (selectedElement && selectedElement.connectionIndex === entry.idx) ? ' selected' : '';
            const labelClass = entry.source === 'manual' ? 'manual' : 'auto';
            const labelText = entry.source === 'manual' ? '수동' : '자동';

            html += '<div class="conn-item' + selClass + '" onclick="selectConnection(' + entry.idx + ')" ondblclick="zoomToConnection(' + entry.idx + ')">';
            html += '<span class="conn-port">' + entry.port + '</span>';
            html += '<span class="conn-arrow">' + entry.arrow + '</span>';
            html += '<span class="conn-target">' + entry.target + '</span>';
            html += '<span class="conn-source-label ' + labelClass + '">(' + labelText + ')</span>';
            if (editMode) {
                html += '<span class="delete-btn" onclick="event.stopPropagation(); deleteConnection(' + entry.idx + ');">\u00D7</span>';
            }
            html += '</div>';
        }

        html += '</div></div>';
    }

    container.innerHTML = html;
}

function toggleConnGroupByName(blockName) {
    if (connCollapsedGroups.has(blockName)) {
        connCollapsedGroups.delete(blockName);
    } else {
        connCollapsedGroups.add(blockName);
    }
    updateConnectionList();
}

function toggleConnGroup(header) {
    const items = header.nextElementSibling;
    const toggle = header.querySelector('.toggle');
    if (items.style.display === 'none') {
        items.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        items.style.display = 'none';
        toggle.textContent = '▶';
    }
}

function selectConnection(idx) {
    selectedElement = { connectionIndex: idx };
    updateSelectionInfo();

    // 연결의 중앙으로 화면 이동
    const conn = customConnections[idx];
    if (conn && conn.fromCx && conn.toCx) {
        const cx = (conn.fromCx + conn.toCx) / 2;
        const cy = (conn.fromCy + conn.toCy) / 2;
        viewX = canvas.width / 2 - cx * scale;
        viewY = canvas.height / 2 - cy * scale;
        updateStatusBar();
    }

    updateConnectionList();
    startHighlightAnim();
}

function zoomToConnection(idx) {
    const conn = customConnections[idx];
    if (!conn) return;

    const cx = (conn.fromCx + conn.toCx) / 2;
    const cy = (conn.fromCy + conn.toCy) / 2;

    scale = 0.5;
    viewX = canvas.width / 2 - cx * scale;
    viewY = canvas.height / 2 - cy * scale;

    updateStatusBar();
    render();
}

// ============ 제목 설정 ============

function setDrawingTitle(title) {
    const el = document.getElementById('drawing-title');
    if (el) {
        el.textContent = title;
        el.title = title;
    }
}

// ============ 설비정보 저장 ============

function saveScanEquipment(blockName, value) {
    if (!scanDescriptions[blockName] || typeof scanDescriptions[blockName] === 'string') {
        const oldStr = typeof scanDescriptions[blockName] === 'string' ? scanDescriptions[blockName] : '';
        scanDescriptions[blockName] = { equipment: value, memo: '' };
        // 기존 문자열이 있었으면 설비정보로 이동
        if (oldStr && !value) scanDescriptions[blockName].equipment = oldStr;
    } else {
        scanDescriptions[blockName].equipment = value;
    }
    const pageKey = 'scan_dictionary';
    localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));
}

function saveScanMemo(blockName, value) {
    if (!scanDescriptions[blockName] || typeof scanDescriptions[blockName] === 'string') {
        const oldStr = typeof scanDescriptions[blockName] === 'string' ? scanDescriptions[blockName] : '';
        scanDescriptions[blockName] = { equipment: oldStr, memo: value };
    } else {
        scanDescriptions[blockName].memo = value;
    }
    const pageKey = 'scan_dictionary';
    localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));
}

// ============ 뷰 컨트롤 ============

function resetView() {
    if (!canvas) return;

    if (blocks.length === 0 && ports.length === 0) {
        scale = 0.25;
        viewX = 0;
        viewY = 0;
    } else {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const elem of allElements) {
            if (elem.cx < minX) minX = elem.cx;
            if (elem.cy < minY) minY = elem.cy;
            if (elem.cx > maxX) maxX = elem.cx;
            if (elem.cy > maxY) maxY = elem.cy;
        }

        const padding = 100;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const contentW = maxX - minX;
        const contentH = maxY - minY;

        const scaleX = canvas.width / contentW;
        const scaleY = canvas.height / contentH;
        scale = Math.min(scaleX, scaleY, 1) * 0.92;  // 사이드바/여백 고려 약간 축소

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const sidebarOffset = 40;  // 왼쪽 사이드바 보정 → 오른쪽으로 이동
        viewX = canvas.width / 2 - centerX * scale + sidebarOffset;
        viewY = canvas.height / 2 - centerY * scale;
    }

    updateStatusBar();
    render();
}

function zoomIn() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldX = (centerX - viewX) / scale;
    const worldY = (centerY - viewY) / scale;

    scale = Math.min(scale * 1.2, 5);

    viewX = centerX - worldX * scale;
    viewY = centerY - worldY * scale;

    updateStatusBar();
    render();
}

function zoomOut() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldX = (centerX - viewX) / scale;
    const worldY = (centerY - viewY) / scale;

    scale = Math.max(scale / 1.2, 0.05);

    viewX = centerX - worldX * scale;
    viewY = centerY - worldY * scale;

    updateStatusBar();
    render();
}

// ============ 표시 옵션 ============

function toggleDisplay(type) {
    const btnMap = {
        'blocks': 'toolShowBlocks',
        'ports': 'toolShowPorts',
        'conns': 'toolShowConns',
        'diagram': 'toolDiagramMode'
    };

    // 전역 변수 토글
    switch(type) {
        case 'blocks':
            showBlocks = !showBlocks;
            document.getElementById(btnMap[type])?.classList.toggle('active', showBlocks);
            break;
        case 'ports':
            showPorts = !showPorts;
            document.getElementById(btnMap[type])?.classList.toggle('active', showPorts);
            break;
        case 'conns':
            showConnections = !showConnections;
            document.getElementById(btnMap[type])?.classList.toggle('active', showConnections);
            break;
        case 'diagram':
            diagramMode = !diagramMode;
            document.getElementById(btnMap[type])?.classList.toggle('active', diagramMode);
            break;
    }

    // checkbox도 동기화 (있으면)
    const checkboxMap = {
        'blocks': 'showBlocks',
        'ports': 'showPorts',
        'conns': 'showConnections',
        'diagram': 'diagramMode'
    };
    const checkbox = document.getElementById(checkboxMap[type]);
    if (checkbox) {
        checkbox.checked = (type === 'blocks' ? showBlocks :
                           type === 'ports' ? showPorts :
                           type === 'conns' ? showConnections :
                           diagramMode);
    }

    render();
}

function initToolButtons() {
    // 전역 변수 기반으로 버튼 상태 초기화
    document.getElementById('toolShowBlocks')?.classList.toggle('active', showBlocks);
    document.getElementById('toolShowPorts')?.classList.toggle('active', showPorts);
    document.getElementById('toolShowConns')?.classList.toggle('active', showConnections);
    document.getElementById('toolDiagramMode')?.classList.toggle('active', diagramMode);
}

// ============ 컨텍스트 메뉴 ============

function showContextMenu(e) {
    e.preventDefault();
    const menu = document.getElementById('context-menu');
    menu.style.display = 'block';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
}

function contextAction(action) {
    hideContextMenu();
    switch(action) {
        case 'edit': toggleEditMode(); break;
        case 'connect': toggleConnectMode(); break;
        case 'addPort': addPortAtCenter(); break;
        case 'addBlock': addBlockAtCenter(); break;
        case 'soloGroup': createSoloGroup(); break;
        case 'regroup': regroupAllBlocks(); break;
        case 'config': showBlockPortConfig(); break;
        case 'delete':
            if (selectedElement) deleteSelectedElement();
            break;
    }
}

// ============ 도움말 ============

function showHelp() {
    // 메뉴가 열려있으면 닫기
    closeDrawingMenu();
    document.getElementById('help-modal').classList.add('show');
}

function hideHelp() {
    document.getElementById('help-modal').classList.remove('show');
}

// ============ 메뉴 관리 ============

function toggleDrawingMenu() {
    const menu = document.getElementById('drawing-menu');
    const overlay = document.getElementById('menu-overlay');
    menu.classList.toggle('open');
    overlay.classList.toggle('show');
    if (menu.classList.contains('open')) {
        updateRecentDrawingsList();
    }
}

function closeDrawingMenu() {
    document.getElementById('drawing-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('show');
}

// ============ 사이드바 탭 ============

function switchSidebarTab(tabName) {
    // 탭 버튼 활성화 - 탭 이름에 따라 버튼 찾기
    const tabIndex = { 'info': 0, 'template': 1, 'autoconnect': 2, 'connections': 3, 'scan': 4, 'blocktype': 5 };

    document.querySelectorAll('.sidebar-tab').forEach((t, i) => {
        if (i === tabIndex[tabName]) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    // 탭 컨텐츠 활성화
    document.querySelectorAll('.sidebar-tab-content').forEach(c => {
        c.classList.remove('active');
    });
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    // 패턴 탭 떠날 때 결과 초기화
    if (tabName !== 'pattern' && typeof hidePatternResults === 'function') {
        hidePatternResults();
    }
}

function toggleSection(name) {
    const content = document.getElementById(`${name}-content`);
    const toggle = document.getElementById(`${name}-toggle`);

    if (content) {
        const isCollapsed = content.style.maxHeight === '0px';
        content.style.maxHeight = isCollapsed ? '200px' : '0px';
        content.style.overflow = isCollapsed ? 'auto' : 'hidden';
        if (toggle) {
            toggle.textContent = isCollapsed ? '▲' : '▼';
        }
    }
}

// ============ 블록 드롭다운 필터 ============

function filterBlockDropdown(searchText) {
    const dropdown = document.getElementById('block-dropdown');
    if (!dropdown) return;

    const options = dropdown.options;
    const search = searchText.toLowerCase();

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(search) || option.value === '' ? '' : 'none';
    }
}

function handleBlockSearchKeydown(event) {
    const dropdown = document.getElementById('block-dropdown');
    if (!dropdown) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (dropdown.selectedIndex < dropdown.options.length - 1) {
            dropdown.selectedIndex++;
        }
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (dropdown.selectedIndex > 0) {
            dropdown.selectedIndex--;
        }
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (dropdown.value) {
            changeParentBlock(selectedElement, dropdown.value);
        }
    }
}

// ============ 포트/블록 추가 ============

function addPortAtCenter() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldX = (centerX - viewX) / scale;
    const worldY = (centerY - viewY) / scale;

    const portName = prompt('Enter port name:', 'NEW_PORT');
    if (!portName) return;

    if (!checkDuplicateName(portName, 'PORT')) return;

    const newPort = {
        id: 'port_' + Date.now(),
        name: portName,
        type: 'PORT',
        cx: worldX,
        cy: worldY,
        x1: worldX - 10,
        y1: worldY - 10,
        x2: worldX + 10,
        y2: worldY + 10,
        parent: null
    };
    ports.push(newPort);
    allElements.push(newPort);

    layoutData.push({
        text: portName,
        type: 'PORT',
        cx: worldX.toString(),
        cy: worldY.toString(),
        x1: (worldX - 10).toString(),
        y1: (worldY - 10).toString(),
        x2: (worldX + 10).toString(),
        y2: (worldY + 10).toString()
    });

    if (!editMode) toggleEditMode();
    selectedElement = newPort;
    pendingPortAssign = newPort;
    updateStats();
    updateSelectionInfo();
    render();
}

function addBlockAtCenter() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldX = (centerX - viewX) / scale;
    const worldY = (centerY - viewY) / scale;

    const blockName = prompt('Enter block name:', 'NEW_BLOCK');
    if (!blockName) return;

    if (!checkDuplicateName(blockName, 'OCB_BLOCK')) return;

    const newBlock = {
        id: 'block_' + Date.now(),
        name: blockName,
        type: 'OCB_BLOCK',
        cx: worldX,
        cy: worldY,
        x1: worldX - 30,
        y1: worldY - 15,
        x2: worldX + 30,
        y2: worldY + 15,
        parent: null
    };
    blocks.push(newBlock);
    allElements.push(newBlock);

    groupsData[blockName] = {
        type: 'OCB_BLOCK',
        cx: worldX,
        cy: worldY,
        x1: worldX - 30,
        y1: worldY - 15,
        x2: worldX + 30,
        y2: worldY + 15,
        ports: []
    };

    layoutData.push({
        text: blockName,
        type: 'OCB_BLOCK',
        cx: worldX.toString(),
        cy: worldY.toString(),
        x1: (worldX - 30).toString(),
        y1: (worldY - 15).toString(),
        x2: (worldX + 30).toString(),
        y2: (worldY + 15).toString()
    });

    if (!editMode) toggleEditMode();
    selectedElement = newBlock;
    updateStats();
    updateSelectionInfo();
    render();
}

function checkDuplicateName(name, type) {
    const existingPort = ports.find(p => p.name === name);
    const existingBlock = blocks.find(b => b.name === name);

    if (existingPort || existingBlock) {
        showToast(`"${name}" already exists. Please use a different name.`, 'error');
        return false;
    }
    return true;
}

// ============ 요소 삭제 ============

function deleteSelectedElement() {
    if (!selectedElement) return;

    if (selectedElement.connectionIndex !== undefined) {
        deleteConnection(selectedElement.connectionIndex);
        return;
    }

    const isPort = ports.includes(selectedElement);
    const isBlock = blocks.includes(selectedElement);

    if (isPort) {
        deletePort(selectedElement);
    } else if (isBlock) {
        deleteBlock(selectedElement);
    }
}

async function deletePort(port) {
    if (!(await showConfirm(`Delete port "${port.name}"?`, { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    const portIdx = ports.indexOf(port);
    if (portIdx > -1) ports.splice(portIdx, 1);

    const elemIdx = allElements.indexOf(port);
    if (elemIdx > -1) allElements.splice(elemIdx, 1);

    if (port.parent && groupsData[port.parent]) {
        const group = groupsData[port.parent];
        group.ports = group.ports.filter(p => {
            const nameMatch = p.name === port.name;
            const coordMatch = Math.abs(p.cx - port.cx) < 2 && Math.abs(p.cy - port.cy) < 2;
            return !nameMatch && !coordMatch;
        });
    }

    const layoutIdx = layoutData.findIndex(item =>
        item.text === port.name &&
        Math.abs(parseFloat(item.cx) - port.cx) < 2 &&
        Math.abs(parseFloat(item.cy) - port.cy) < 2
    );
    if (layoutIdx > -1) layoutData.splice(layoutIdx, 1);

    customConnections = customConnections.filter(c =>
        c.fromId !== port.id && c.toId !== port.id
    );

    selectedElement = null;
    updateConnectionList();
    updateSelectionInfo();
    updateStats();
    render();
}

async function deleteBlock(block) {
    if (!(await showConfirm(`Delete block "${block.name}"? This will also remove its port assignments.`, { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    for (const port of ports) {
        if (port.parent === block.name) {
            port.parent = null;
        }
    }

    if (groupsData[block.name]) {
        delete groupsData[block.name];
    }

    const blockIdx = blocks.indexOf(block);
    if (blockIdx > -1) blocks.splice(blockIdx, 1);

    const elemIdx = allElements.indexOf(block);
    if (elemIdx > -1) allElements.splice(elemIdx, 1);

    const layoutIdx = layoutData.findIndex(item =>
        item.text === block.name &&
        Math.abs(parseFloat(item.cx) - block.cx) < 2 &&
        Math.abs(parseFloat(item.cy) - block.cy) < 2
    );
    if (layoutIdx > -1) layoutData.splice(layoutIdx, 1);

    customConnections = customConnections.filter(c =>
        c.fromParent !== block.name && c.toParent !== block.name
    );

    selectedElement = null;
    updateConnectionList();
    updateSelectionInfo();
    updateStats();
    render();
}

// ============ 클론 힌트 업데이트 ============

function updateCloneHint() {
    const hint = document.getElementById('clone-hint');
    if (cloneParentRow.length > 0) {
        const assignedCount = cloneChildRow.filter(c => c !== null).length;
        const sameCount = cloneChildRow.filter(c => c === 'SAME').length;
        const matchedCount = assignedCount - sameCount;

        if (cloneCurrentChildIdx >= cloneParentRow.length) {
            hint.textContent = `완료! 매칭: ${matchedCount}쌍, 공통: ${sameCount}개 | Shift+Click: 복제 | ESC: 취소`;
            hint.style.background = '#4caf50';
        } else {
            const currentParent = cloneParentRow[cloneCurrentChildIdx];
            hint.textContent = `P${cloneCurrentChildIdx + 1} (${currentParent.name}) → 자식 클릭 | 빈곳클릭=건너뛰기 | ${assignedCount}/${cloneParentRow.length} | ESC: 실행취소`;
            hint.style.background = '#ffeb3b';
            hint.style.color = '#000';
        }
    } else {
        hint.textContent = '드래그: 부모 행 선택 | Ctrl+드래그: 화면이동';
        hint.style.background = '#ff9800';
        hint.style.color = '#fff';
    }
}

// ============ 스마트 매칭 ============

function smartMatchRows(parentRow, childRow) {
    const similarities = [];
    const unmatchedParents = [...parentRow].sort((a, b) => a.cx - b.cx);
    const unmatchedChildren = [...childRow].sort((a, b) => a.cx - b.cx);

    for (let pi = 0; pi < unmatchedParents.length; pi++) {
        for (let ci = 0; ci < unmatchedChildren.length; ci++) {
            const parent = unmatchedParents[pi];
            const child = unmatchedChildren[ci];
            const score = calculateBlockSimilarity(parent, child);
            const positionBonus = (pi === ci) ? 15 : 0;

            similarities.push({
                parentIdx: pi,
                childIdx: ci,
                parent,
                child,
                score: score + positionBonus
            });
        }
    }

    similarities.sort((a, b) => b.score - a.score);

    const matches = [];
    const usedParents = new Set();
    const usedChildren = new Set();

    for (const sim of similarities) {
        if (usedParents.has(sim.parentIdx) || usedChildren.has(sim.childIdx)) {
            continue;
        }

        if (sim.score > 0) {
            matches.push(sim);
            usedParents.add(sim.parentIdx);
            usedChildren.add(sim.childIdx);
        }
    }

    return matches;
}

// ============ 홈 이동 (웰컴 화면) ============

async function goHome() {
    // 도면이 열려있는지 확인
    const welcomeScreen = document.getElementById('welcome-screen');
    const isDrawingOpen = welcomeScreen && welcomeScreen.classList.contains('hidden');

    if (isDrawingOpen && blocks.length > 0) {
        // 도면 수정 중 → 3버튼 저장 확인 팝업
        const result = await showGoHomeConfirm();
        if (result === 'cancel') return;
        if (result === 'save') {
            if (typeof saveToSupabase === 'function') {
                await saveToSupabase();
            }
        }
        // result === 'discard' → 저장 안 하고 이동
    }

    // 에디터 탭으로 전환 후 웰컴 화면 표시
    switchMainTab('editor');
    showWelcomeScreen();

    // 홈 탭 활성 표시
    document.querySelectorAll('.global-header .nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === 'home');
    });
}

function showGoHomeConfirm() {
    return new Promise((resolve) => {
        const existing = document.getElementById('app-confirm-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-modal';
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-box">
                <div class="confirm-title">홈으로 이동</div>
                <div class="confirm-message">현재 도면의 변경사항을 저장하시겠습니까?</div>
                <div class="confirm-buttons" style="gap:8px;">
                    <button class="confirm-btn confirm-cancel" data-action="cancel">취소</button>
                    <button class="confirm-btn" data-action="discard" style="background:rgba(239,68,68,0.15); color:#f87171;">저장 안 함</button>
                    <button class="confirm-btn confirm-ok" data-action="save">저장 후 이동</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('confirm-visible'));

        const close = (result) => {
            overlay.classList.remove('confirm-visible');
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        overlay.querySelector('[data-action="save"]').onclick = () => close('save');
        overlay.querySelector('[data-action="discard"]').onclick = () => close('discard');
        overlay.querySelector('[data-action="cancel"]').onclick = () => close('cancel');
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close('cancel'); });

        const onKey = (e) => { if (e.key === 'Escape') { close('cancel'); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);
        setTimeout(() => overlay.querySelector('[data-action="save"]').focus(), 100);
    });
}

// ============ 메인 탭 전환 ============

let currentMainTab = 'editor';

function switchMainTab(tabName) {
    currentMainTab = tabName;

    document.querySelectorAll('.global-header .nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    if (tabName === 'block-types') {
        btInit();
    }

    // 헤더 버튼 그룹 전환
    const editorBtns = document.getElementById('header-btns-editor');
    const pidBtns = document.getElementById('header-btns-pid');
    const btBtns = document.getElementById('header-btns-blocktype');

    if (editorBtns) editorBtns.style.display = 'none';
    if (pidBtns) pidBtns.style.display = 'none';
    if (btBtns) btBtns.style.display = 'none';

    if (tabName === 'editor') {
        // P&ID 전체 화면 모드가 활성화된 경우 P&ID 버튼 표시
        if (typeof pidViewMode !== 'undefined' && pidViewMode) {
            if (pidBtns) pidBtns.style.display = 'flex';
        } else {
            if (editorBtns) editorBtns.style.display = 'flex';
        }
    } else if (tabName === 'block-types') {
        if (btBtns) btBtns.style.display = 'flex';
    } else if (tabName === 'scan-dict') {
        sdInit();
    }
}

// ============ 설비정보 사전 탭 ============

let sdData = {};
let sdFilter = 'all';

function sdInit() {
    const saved = localStorage.getItem('scan_dictionary');
    if (saved) {
        try {
            sdData = JSON.parse(saved);
            for (const [k, v] of Object.entries(sdData)) {
                if (typeof v === 'string') sdData[k] = { equipment: v, memo: '' };
            }
        } catch (e) { sdData = {}; }
    }
    sdBuildFilters();
    sdRenderTable();
}

function sdBuildFilters() {
    const types = new Set();
    for (const v of Object.values(sdData)) {
        types.add(v.type || '기타');
    }
    const container = document.getElementById('sdFilterChips');
    if (!container) return;
    let html = `<span class="sd-chip ${sdFilter === 'all' ? 'active' : ''}" onclick="sdSetFilter('all')">전체</span>`;
    for (const t of [...types].sort()) {
        html += `<span class="sd-chip ${sdFilter === t ? 'active' : ''}" onclick="sdSetFilter('${t}')">${t}</span>`;
    }
    container.innerHTML = html;
}

function sdSetFilter(f) {
    sdFilter = f;
    sdBuildFilters();
    sdRenderTable();
}

function sdRenderTable() {
    const searchEl = document.getElementById('sdSearchInput');
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    const tbody = document.getElementById('sdTableBody');
    if (!tbody) return;

    const entries = Object.entries(sdData).filter(([name, info]) => {
        if (sdFilter !== 'all' && (info.type || '기타') !== sdFilter) return false;
        if (search) {
            const haystack = `${name} ${info.equipment || ''} ${info.memo || ''} ${info.autoDesc || ''} ${info.category || ''}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    }).sort((a, b) => a[0].localeCompare(b[0]));

    const statsEl = document.getElementById('sdStats');
    if (statsEl) statsEl.textContent = `${entries.length} / ${Object.keys(sdData).length}`;

    const typeColors = {
        'OCB_BLOCK': '#e94560', 'SIGNAL': '#00ff88', 'REF_SIGNAL': '#00bcd4',
        'BLOCK_TYPE': '#ff9800', 'OTHER': '#999', 'PORT': '#ccc'
    };

    const dictTypes = typeof blockDictionary !== 'undefined' ? Object.keys(blockDictionary).sort() : [];

    tbody.innerHTML = entries.map(([name, info]) => {
        const tc = typeColors[info.type] || '#888';
        const eqVal = (info.equipment || '').replace(/"/g, '&quot;');
        const memoVal = (info.memo || '').replace(/"/g, '&quot;');
        const userType = info.userType || '';
        const escapedName = name.replace(/'/g, "\\'");
        const typeOpts = dictTypes.map(t => `<option value="${t}" ${userType === t ? 'selected' : ''}>${t}</option>`).join('');

        return `<tr>
            <td class="sd-td" style="font-family:'Consolas',monospace; font-weight:600; color:#e8e8ff; font-size:11px;">${name}</td>
            <td class="sd-td"><span style="padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; background:${tc}18; color:${tc}; border:1px solid ${tc}30;">${info.type || '기타'}</span></td>
            <td class="sd-td"><select class="sd-select" onchange="sdSave('${escapedName}','userType',this.value)"><option value="">-</option>${typeOpts}</select></td>
            <td class="sd-td"><input class="sd-input" value="${eqVal}" placeholder="설비정보 입력..." onblur="sdSave('${escapedName}','equipment',this.value)"></td>
            <td class="sd-td"><input class="sd-input" value="${memoVal}" placeholder="메모 입력..." onblur="sdSave('${escapedName}','memo',this.value)"></td>
        </tr>`;
    }).join('');
}

function sdSave(name, field, value) {
    if (!sdData[name]) sdData[name] = { equipment: '', memo: '' };
    sdData[name][field] = value;
    localStorage.setItem('scan_dictionary', JSON.stringify(sdData));
    // scanDescriptions도 동기화
    scanDescriptions = sdData;
}

function sdExportCSV() {
    let csv = '블록명,타입,지정타입,자동분류,설비정보,메모\n';
    for (const [name, info] of Object.entries(sdData).sort((a, b) => a[0].localeCompare(b[0]))) {
        const eq = (info.equipment || '').replace(/"/g, '""');
        const memo = (info.memo || '').replace(/"/g, '""');
        const auto = (info.autoDesc || info.category || '').replace(/"/g, '""');
        const ut = (info.userType || '').replace(/"/g, '""');
        csv += `"${name}","${info.type || ''}","${ut}","${auto}","${eq}","${memo}"\n`;
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `설비정보사전_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('CSV 내보내기 완료', 'success');
}

// ============ 블록 사전 기능 (localStorage 연동) ============

let btBlockData = {};
let btCurrentCat = 'all';
let btSelectedBlock = null;
let btDeletedBlocks = [];
let btEditingPorts = [];

const btCatNames = { logic: '논리', math: '수학', control: '제어', compare: '비교', timer: '타이머', io: '입출력', signal: '신호', unknown: '미분류' };

const btDefaultBlocks = {
    // === 논리 블록 (Logic) ===
    'AND': { id: 'AND', name: 'AND', category: 'logic', symbol: '&', desc: '논리곱 (AND Gate)', ai: 'AND 블록은 모든 입력이 TRUE일 때만 출력이 TRUE가 됩니다. 다중 조건이 모두 만족해야 할 때 사용합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'OR': { id: 'OR', name: 'OR', category: 'logic', symbol: '∨', desc: '논리합 (OR Gate)', ai: 'OR 블록은 하나라도 입력이 TRUE이면 출력이 TRUE가 됩니다. 여러 조건 중 하나만 만족해도 될 때 사용합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'N': { id: 'N', name: 'N', category: 'logic', symbol: '¬', desc: '논리 반전 (NOT)', ai: 'N 블록은 입력 신호를 반전시킵니다. TRUE→FALSE, FALSE→TRUE로 변환합니다.', ports: [{name:'IN1',direction:'input'},{name:'OUT',direction:'output'}] },
    'NOT': { id: 'NOT', name: 'NOT', category: 'logic', symbol: '¬', desc: '논리 반전 (NOT)', ai: 'NOT 블록은 입력을 반전시킵니다. N 블록과 동일한 기능입니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'XOR': { id: 'XOR', name: 'XOR', category: 'logic', symbol: '⊕', desc: '배타적 논리합 (XOR)', ai: 'XOR 블록은 입력이 서로 다를 때만 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'NAND': { id: 'NAND', name: 'NAND', category: 'logic', symbol: '⊼', desc: 'NOT AND', ai: 'NAND 블록은 AND의 반전입니다. 모든 입력이 TRUE일 때만 FALSE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'NOR': { id: 'NOR', name: 'NOR', category: 'logic', symbol: '⊽', desc: 'NOT OR', ai: 'NOR 블록은 OR의 반전입니다. 모든 입력이 FALSE일 때만 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'T': { id: 'T', name: 'T', category: 'logic', symbol: 'T', desc: '조건 분기 (Transfer)', ai: 'T 블록은 FLAG 입력이 TRUE일 때 YES 경로로, FALSE일 때 NO 경로로 신호를 분기합니다.', ports: [{name:'FLAG',direction:'input'},{name:'YES',direction:'output'},{name:'NO',direction:'output'},{name:'OUT',direction:'output'}] },
    'SEL': { id: 'SEL', name: 'SEL', category: 'logic', symbol: '⇌', desc: '선택 (Selector)', ai: 'SEL 블록은 조건에 따라 두 입력 중 하나를 선택하여 출력합니다.', ports: [{name:'G',direction:'input'},{name:'IN0',direction:'input'},{name:'IN1',direction:'input'},{name:'OUT',direction:'output'}] },
    'SR': { id: 'SR', name: 'SR', category: 'logic', symbol: 'S', desc: 'Set-Reset 래치', ai: 'SR 블록은 Set 우선 플립플롭입니다. S=TRUE면 출력 TRUE, R=TRUE면 출력 FALSE.', ports: [{name:'S',direction:'input'},{name:'R',direction:'input'},{name:'Q',direction:'output'}] },
    'RS': { id: 'RS', name: 'RS', category: 'logic', symbol: 'R', desc: 'Reset-Set 래치', ai: 'RS 블록은 Reset 우선 플립플롭입니다. R=TRUE면 출력 FALSE, S=TRUE면 출력 TRUE.', ports: [{name:'R',direction:'input'},{name:'S',direction:'input'},{name:'Q',direction:'output'}] },

    // === 수학 블록 (Math) ===
    'SUM': { id: 'SUM', name: 'SUM', category: 'math', symbol: '∑', desc: '덧셈 (Sum)', ai: 'SUM 블록은 여러 입력값을 더합니다. 아날로그 신호의 합계를 계산할 때 사용합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'ADD': { id: 'ADD', name: 'ADD', category: 'math', symbol: '+', desc: '덧셈 (Addition)', ai: 'ADD 블록은 IN1 + IN2를 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'SUB': { id: 'SUB', name: 'SUB', category: 'math', symbol: '−', desc: '뺄셈 (Subtraction)', ai: 'SUB 블록은 IN1 - IN2를 계산합니다. 편차 계산 등에 사용됩니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'X': { id: 'X', name: 'X', category: 'math', symbol: '×', desc: '곱셈 (Multiply)', ai: 'X 블록은 두 입력값을 곱합니다. 스케일링이나 게인 적용에 사용됩니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'MUL': { id: 'MUL', name: 'MUL', category: 'math', symbol: '×', desc: '곱셈 (Multiply)', ai: 'MUL 블록은 IN1 * IN2를 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'DIV': { id: 'DIV', name: 'DIV', category: 'math', symbol: '÷', desc: '나눗셈 (Division)', ai: 'DIV 블록은 IN1 / IN2를 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'K': { id: 'K', name: 'K', category: 'math', symbol: 'K', desc: '상수 (Constant)', ai: 'K 블록은 설정된 상수값을 출력합니다. 고정 설정값이나 게인값 입력에 사용됩니다.', ports: [{name:'OUT',direction:'output'}] },
    'ABS': { id: 'ABS', name: 'ABS', category: 'math', symbol: '|x|', desc: '절대값 (Absolute)', ai: 'ABS 블록은 입력의 절대값을 출력합니다. 음수를 양수로 변환합니다.', ports: [{name:'IN1',direction:'input'},{name:'OUT',direction:'output'}] },
    'SQRT': { id: 'SQRT', name: 'SQRT', category: 'math', symbol: '√', desc: '제곱근 (Square Root)', ai: 'SQRT 블록은 입력의 제곱근을 계산합니다. 유량 계산 등에 사용됩니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'LIM': { id: 'LIM', name: 'LIM', category: 'math', symbol: '⊥', desc: '리미터 (Limiter)', ai: 'LIM 블록은 입력값을 상한/하한 범위 내로 제한합니다.', ports: [{name:'IN',direction:'input'},{name:'HI',direction:'input'},{name:'LO',direction:'input'},{name:'OUT',direction:'output'}] },
    'SCALE': { id: 'SCALE', name: 'SCALE', category: 'math', symbol: '↔', desc: '스케일 변환', ai: 'SCALE 블록은 입력을 지정된 범위로 스케일링합니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'RATIO': { id: 'RATIO', name: 'RATIO', category: 'math', symbol: ':', desc: '비율 계산', ai: 'RATIO 블록은 두 입력의 비율을 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'AVG': { id: 'AVG', name: 'AVG', category: 'math', symbol: 'x̄', desc: '평균 (Average)', ai: 'AVG 블록은 입력들의 평균값을 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'MAX': { id: 'MAX', name: 'MAX', category: 'math', symbol: '↑', desc: '최대값 (Maximum)', ai: 'MAX 블록은 입력들 중 최대값을 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'MIN': { id: 'MIN', name: 'MIN', category: 'math', symbol: '↓', desc: '최소값 (Minimum)', ai: 'MIN 블록은 입력들 중 최소값을 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'F(X)': { id: 'F(X)', name: 'F(X)', category: 'math', symbol: 'ƒ', desc: '사용자 함수', ai: 'F(X) 블록은 사용자가 정의한 함수를 실행합니다. 비선형 특성 곡선 등을 구현할 때 사용합니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },

    // === 비교 블록 (Compare) ===
    'H': { id: 'H', name: 'H', category: 'compare', symbol: 'H', desc: '상한 선택 (High Select)', ai: 'H 블록은 여러 입력 중 가장 큰 값을 선택하여 출력합니다. 최대값 선택에 사용됩니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'L': { id: 'L', name: 'L', category: 'compare', symbol: 'L', desc: '하한 선택 (Low Select)', ai: 'L 블록은 여러 입력 중 가장 작은 값을 선택하여 출력합니다. 최소값 선택에 사용됩니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'GT': { id: 'GT', name: 'GT', category: 'compare', symbol: '>', desc: '크다 (>)', ai: 'GT 블록은 IN1 > IN2일 때 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'LT': { id: 'LT', name: 'LT', category: 'compare', symbol: '<', desc: '작다 (<)', ai: 'LT 블록은 IN1 < IN2일 때 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'GE': { id: 'GE', name: 'GE', category: 'compare', symbol: '≥', desc: '크거나 같다 (>=)', ai: 'GE 블록은 IN1 >= IN2일 때 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'LE': { id: 'LE', name: 'LE', category: 'compare', symbol: '≤', desc: '작거나 같다 (<=)', ai: 'LE 블록은 IN1 <= IN2일 때 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'EQ': { id: 'EQ', name: 'EQ', category: 'compare', symbol: '=', desc: '같다 (=)', ai: 'EQ 블록은 IN1 = IN2일 때 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'NE': { id: 'NE', name: 'NE', category: 'compare', symbol: '≠', desc: '다르다 (≠)', ai: 'NE 블록은 IN1 ≠ IN2일 때 TRUE를 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },

    // === 제어 블록 (Control) ===
    'PID': { id: 'PID', name: 'PID', category: 'control', symbol: 'P', desc: 'PID 제어', ai: 'PID 블록은 PV(측정값)와 SP(설정값)의 차이를 줄이는 비례-적분-미분 제어 출력을 생성합니다.', ports: [{name:'PV',direction:'input'},{name:'SP',direction:'input'},{name:'MV',direction:'output'}] },
    'LAG': { id: 'LAG', name: 'LAG', category: 'control', symbol: 'τ', desc: '1차 지연 (Lag Filter)', ai: 'LAG 블록은 입력 신호에 1차 지연(저역 통과 필터)을 적용합니다. 노이즈 필터링에 사용됩니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'LEAD': { id: 'LEAD', name: 'LEAD', category: 'control', symbol: 'λ', desc: '리드 필터 (Lead Filter)', ai: 'LEAD 블록은 입력 신호에 리드 필터를 적용하여 응답 속도를 높입니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'INTEG': { id: 'INTEG', name: 'INTEG', category: 'control', symbol: '∫', desc: '적분 (Integrator)', ai: 'INTEG 블록은 입력 신호를 시간에 대해 적분합니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'DERIV': { id: 'DERIV', name: 'DERIV', category: 'control', symbol: 'δ', desc: '미분 (Derivative)', ai: 'DERIV 블록은 입력 신호의 변화율(미분)을 계산합니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'RAMP': { id: 'RAMP', name: 'RAMP', category: 'control', symbol: '⟋', desc: '램프 (Ramp)', ai: 'RAMP 블록은 출력을 설정된 속도로 목표값까지 점진적으로 변화시킵니다.', ports: [{name:'IN',direction:'input'},{name:'RATE',direction:'input'},{name:'OUT',direction:'output'}] },
    'M/A': { id: 'M/A', name: 'M/A', category: 'control', symbol: '⇆', desc: '수동/자동 전환', ai: 'M/A 블록은 수동(Manual)과 자동(Auto) 모드를 전환합니다.', ports: [{name:'AUTO',direction:'input'},{name:'MAN',direction:'input'},{name:'MODE',direction:'input'},{name:'OUT',direction:'output'}] },

    // === 타이머/카운터 블록 (Timer) ===
    'TON': { id: 'TON', name: 'TON', category: 'timer', symbol: '⏱', desc: 'ON 지연 타이머', ai: 'TON 블록은 입력이 TRUE가 된 후 설정 시간이 지나면 출력이 TRUE가 됩니다.', ports: [{name:'IN',direction:'input'},{name:'PT',direction:'input'},{name:'Q',direction:'output'},{name:'ET',direction:'output'}] },
    'TOF': { id: 'TOF', name: 'TOF', category: 'timer', symbol: '⏲', desc: 'OFF 지연 타이머', ai: 'TOF 블록은 입력이 FALSE가 된 후 설정 시간이 지나면 출력이 FALSE가 됩니다.', ports: [{name:'IN',direction:'input'},{name:'PT',direction:'input'},{name:'Q',direction:'output'},{name:'ET',direction:'output'}] },
    'TP': { id: 'TP', name: 'TP', category: 'timer', symbol: '⎍', desc: '펄스 타이머', ai: 'TP 블록은 입력의 상승 에지에서 설정된 시간 동안 펄스를 출력합니다.', ports: [{name:'IN',direction:'input'},{name:'PT',direction:'input'},{name:'Q',direction:'output'},{name:'ET',direction:'output'}] },
    'CTU': { id: 'CTU', name: 'CTU', category: 'timer', symbol: '+1', desc: '업 카운터', ai: 'CTU 블록은 입력 펄스를 카운트하여 설정값에 도달하면 출력을 TRUE로 합니다.', ports: [{name:'CU',direction:'input'},{name:'R',direction:'input'},{name:'PV',direction:'input'},{name:'Q',direction:'output'},{name:'CV',direction:'output'}] },
    'CTD': { id: 'CTD', name: 'CTD', category: 'timer', symbol: '-1', desc: '다운 카운터', ai: 'CTD 블록은 설정값에서 시작하여 입력 펄스마다 감소하고, 0에 도달하면 출력을 TRUE로 합니다.', ports: [{name:'CD',direction:'input'},{name:'LD',direction:'input'},{name:'PV',direction:'input'},{name:'Q',direction:'output'},{name:'CV',direction:'output'}] },

    // === 입출력 블록 (I/O) ===
    'KEYBOARD': { id: 'KEYBOARD', name: 'KEYBOARD', category: 'io', symbol: '⌨', desc: '키보드 입력', ai: 'KEYBOARD 블록은 운전원이 키보드로 값을 직접 입력할 수 있는 인터페이스입니다. 설정값 변경 등에 사용됩니다.', ports: [{name:'OUT',direction:'output'}] },
    'DISPLAY': { id: 'DISPLAY', name: 'DISPLAY', category: 'io', symbol: '🖥', desc: '디스플레이 출력', ai: 'DISPLAY 블록은 값을 화면에 표시합니다.', ports: [{name:'IN',direction:'input'}] },
    'AI': { id: 'AI', name: 'AI', category: 'io', symbol: '◁', desc: '아날로그 입력 (Analog Input)', ai: 'AI 블록은 필드 센서로부터 아날로그 신호(4-20mA, 0-10V 등)를 받아 디지털 값으로 변환합니다.', ports: [{name:'OUT',direction:'output'}] },
    'AO': { id: 'AO', name: 'AO', category: 'io', symbol: '▷', desc: '아날로그 출력 (Analog Output)', ai: 'AO 블록은 제어 출력값을 아날로그 신호로 변환하여 밸브, 댐퍼 등의 액추에이터로 전송합니다.', ports: [{name:'IN',direction:'input'}] },
    'DI': { id: 'DI', name: 'DI', category: 'io', symbol: '◀', desc: '디지털 입력 (Digital Input)', ai: 'DI 블록은 필드로부터 ON/OFF 디지털 신호를 받습니다. 스위치, 리밋스위치 등의 상태를 읽습니다.', ports: [{name:'OUT',direction:'output'}] },
    'DO': { id: 'DO', name: 'DO', category: 'io', symbol: '▶', desc: '디지털 출력 (Digital Output)', ai: 'DO 블록은 ON/OFF 디지털 신호를 필드로 출력합니다. 솔레노이드 밸브, 릴레이 등을 제어합니다.', ports: [{name:'IN',direction:'input'}] },

    // === 신호 타입 (Signal) ===
    'A': { id: 'A', name: 'A', category: 'signal', symbol: 'A', desc: '아날로그 신호 포트', ai: 'A 포트는 아날로그 값(연속적인 수치)을 전달하는 연결점입니다. 온도, 압력, 유량 등의 측정값에 사용됩니다.', ports: [] },
    'G': { id: 'G', name: 'G', category: 'signal', symbol: 'G', desc: 'Good 상태 신호', ai: 'G 포트는 신호의 품질 상태(Good/Bad)를 나타냅니다. TRUE면 신호가 유효함을 의미합니다.', ports: [] },
    'OUT': { id: 'OUT', name: 'OUT', category: 'signal', symbol: '→', desc: '출력 포트', ai: 'OUT 포트는 블록의 계산 결과나 처리된 신호가 나가는 연결점입니다.', ports: [] },
    'IN': { id: 'IN', name: 'IN', category: 'signal', symbol: '←', desc: '입력 포트', ai: 'IN 포트는 블록으로 신호가 들어오는 연결점입니다.', ports: [] },
    'FLAG': { id: 'FLAG', name: 'FLAG', category: 'signal', symbol: '⚑', desc: '플래그 신호', ai: 'FLAG 포트는 조건 판단용 불리언 신호입니다. T블록 등에서 분기 조건으로 사용됩니다.', ports: [] },
    'STPT': { id: 'STPT', name: 'STPT', category: 'signal', symbol: 'SP', desc: '설정값 (Setpoint)', ai: 'STPT는 제어 목표값입니다. PID 제어에서 원하는 목표 온도, 압력 등을 지정합니다.', ports: [] },
    'PV': { id: 'PV', name: 'PV', category: 'signal', symbol: 'PV', desc: '측정값 (Process Value)', ai: 'PV는 현재 측정된 프로세스 값입니다. 센서로부터 읽은 실제 온도, 압력, 유량 등입니다.', ports: [] },
    'MV': { id: 'MV', name: 'MV', category: 'signal', symbol: 'MV', desc: '조작량 (Manipulated Value)', ai: 'MV는 제어기가 출력하는 조작량입니다. 밸브 개도, 펌프 속도 등 액추에이터 명령값입니다.', ports: [] },
    'NUM': { id: 'NUM', name: 'NUM', category: 'signal', symbol: '/', desc: '분자 (Numerator)', ai: 'NUM 포트는 나눗셈 블록에서 분자(나눠지는 수) 입력입니다.', ports: [] },
    'DEN': { id: 'DEN', name: 'DEN', category: 'signal', symbol: '/', desc: '분모 (Denominator)', ai: 'DEN 포트는 나눗셈 블록에서 분모(나누는 수) 입력입니다.', ports: [] },
    'HI': { id: 'HI', name: 'HI', category: 'signal', symbol: '↑', desc: '상한값 (High Limit)', ai: 'HI 포트는 리미터 블록의 상한값 입력입니다.', ports: [] },
    'LO': { id: 'LO', name: 'LO', category: 'signal', symbol: '↓', desc: '하한값 (Low Limit)', ai: 'LO 포트는 리미터 블록의 하한값 입력입니다.', ports: [] },
    'HISP': { id: 'HISP', name: 'HISP', category: 'signal', symbol: '⬆', desc: '상한 설정값', ai: 'HISP는 고선택(High Select) 또는 상한 설정 포인트입니다.', ports: [] },
    'LOSP': { id: 'LOSP', name: 'LOSP', category: 'signal', symbol: '⬇', desc: '하한 설정값', ai: 'LOSP는 저선택(Low Select) 또는 하한 설정 포인트입니다.', ports: [] },

    // === M/A 관련 블록 ===
    'MODE': { id: 'MODE', name: 'MODE', category: 'control', symbol: 'M', desc: '모드 선택', ai: 'MODE 블록은 수동/자동/캐스케이드 등 제어 모드를 선택합니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'AUTO': { id: 'AUTO', name: 'AUTO', category: 'control', symbol: 'A', desc: '자동 모드', ai: 'AUTO는 자동 제어 모드입니다. PID 등의 제어기가 자동으로 출력을 계산합니다.', ports: [] },
    'MAN': { id: 'MAN', name: 'MAN', category: 'control', symbol: 'M', desc: '수동 모드', ai: 'MAN은 수동 제어 모드입니다. 운전원이 직접 출력값을 조작합니다.', ports: [] },
    'TRACK': { id: 'TRACK', name: 'TRACK', category: 'control', symbol: 'T', desc: '추적 모드', ai: 'TRACK 모드에서는 출력이 외부 신호를 추적합니다. 범프리스 전환에 사용됩니다.', ports: [] },
    'CAS': { id: 'CAS', name: 'CAS', category: 'control', symbol: 'C', desc: '캐스케이드 모드', ai: 'CAS는 캐스케이드 제어 모드입니다. 상위 제어기의 출력이 하위 제어기의 설정값이 됩니다.', ports: [] }
};

async function btInit() {
    try {
        const deletedSaved = localStorage.getItem('blockDictionary_deleted');
        if (deletedSaved) btDeletedBlocks = JSON.parse(deletedSaved);
    } catch (e) { btDeletedBlocks = []; }

    const saved = localStorage.getItem('blockDictionary_v3');
    btBlockData = saved ? JSON.parse(saved) : { ...btDefaultBlocks };

    btRenderBlockList();
    btUpdateStats();
}

function btGuessCategory(id) {
    const u = id.toUpperCase();
    if (['AND','OR','NOT','XOR','NAND','NOR','T','SEL','SR','RS','N'].includes(u)) return 'logic';
    if (['ADD','SUB','MUL','DIV','ABS','SQRT','LIM','MAX','MIN','AVG','SUM','K','RATIO','SCALE','ALG'].includes(u)) return 'math';
    if (['PID','LAG','LEAD','INTEG','DERIV','M/A','RAMP','MODE'].includes(u)) return 'control';
    if (['GT','LT','GE','LE','EQ','NE','COMPARE','CMP','H','L'].includes(u)) return 'compare';
    if (['TIMER','TON','TOF','COUNTER','CTU','CTD','CTUD','TP'].includes(u)) return 'timer';
    return 'unknown';
}

function btSave() { localStorage.setItem('blockDictionary_v3', JSON.stringify(btBlockData)); }

function btUpdateStats() {
    const blocks = Object.values(btBlockData);
    document.getElementById('btStatBlocks').textContent = blocks.length;
    document.getElementById('btStatInstances').textContent = blocks.reduce((sum, b) => sum + (b.instances?.length || 0), 0);
    const withAI = blocks.filter(b => b.ai && b.ai.length > 10).length;
    document.getElementById('btStatComplete').textContent = blocks.length ? Math.round(withAI / blocks.length * 100) + '%' : '0%';
}

function btRenderBlockList() {
    const list = document.getElementById('btBlockList');
    if (!list) return;
    const search = document.getElementById('btSearchInput')?.value.toLowerCase() || '';

    const filtered = Object.values(btBlockData).filter(b => {
        if (btCurrentCat !== 'all' && b.category !== btCurrentCat) return false;
        if (search && !b.id.toLowerCase().includes(search) && !(b.name||'').toLowerCase().includes(search)) return false;
        return true;
    }).sort((a, b) => (b.instances?.length || 0) - (a.instances?.length || 0));

    list.innerHTML = filtered.map(b => {
        const count = b.instances?.length || 0;
        const hasAI = b.ai && b.ai.length > 10;
        const statusClass = hasAI ? 'bt-status-complete' : (b.desc ? 'bt-status-partial' : 'bt-status-empty');
        return `
            <div class="bt-block-item ${btSelectedBlock === b.id ? 'active' : ''}" onclick="btSelectBlock('${b.id}')">
                <div class="bt-block-icon bt-icon-${b.category || 'unknown'}">${b.id.slice(0, 2)}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.id}</div>
                    <div style="font-size:10px; color:rgba(255,255,255,0.4);">${btCatNames[b.category]||'미분류'} · ${count}개</div>
                </div>
                <div class="bt-block-status ${statusClass}"></div>
            </div>
        `;
    }).join('') || '<div style="padding:20px; text-align:center; color:rgba(255,255,255,0.3);">블록이 없습니다</div>';
}

function btSetCategory(cat) {
    btCurrentCat = cat;
    document.querySelectorAll('.bt-filter-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    btRenderBlockList();
}

function btFilterBlocks() { btRenderBlockList(); }

function btSelectBlock(id) {
    btSelectedBlock = id;
    btRenderBlockList();
    btRenderDetail();
}

function btRenderDetail() {
    const content = document.getElementById('btContent');
    const b = btBlockData[btSelectedBlock];
    if (!b) {
        content.innerHTML = '<div class="bt-empty-state"><div style="font-size:48px; margin-bottom:16px;">📦</div><div>왼쪽에서 블록을 선택하세요</div></div>';
        return;
    }

    const ports = b.ports || [];
    const inputs = ports.filter(p => p.direction === 'input');
    const outputs = ports.filter(p => p.direction === 'output');

    content.innerHTML = `
        <div class="bt-detail-card">
            <div class="bt-detail-header">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="bt-detail-icon bt-icon-${b.category || 'unknown'}">${b.id.slice(0, 2)}</div>
                    <div>
                        <div style="font-size:18px; font-weight:700; color:#fff;">${b.name || b.id}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.4);">ID: ${b.id} · ${b.instances?.length || 0}개 인스턴스</div>
                    </div>
                </div>
                <span class="bt-cat-badge bt-cat-${b.category || 'unknown'}">${btCatNames[b.category] || '미분류'}</span>
            </div>
            <div style="padding:20px;">
                <div class="bt-section">
                    <div class="bt-section-title">기본 설명
                        <div style="display:flex; gap:4px;">
                            <button class="bt-edit-btn" onclick="btEditBlock('${b.id}')">편집</button>
                            <button class="bt-edit-btn" onclick="btQuickDelete('${b.id}')" style="color:#f87171;">삭제</button>
                        </div>
                    </div>
                    <p class="bt-desc-text">${b.desc || '(설명 없음)'}</p>
                </div>

                ${ports.length ? `
                <div class="bt-section">
                    <div class="bt-section-title">포트 구성</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><span style="font-size:10px; color:#4fc3f7; font-weight:600;">입력:</span>
                            ${inputs.map(p => `<span class="bt-port-tag bt-port-in">${p.name}</span>`).join('') || '<span style="color:#666; font-size:10px;">없음</span>'}
                        </div>
                        <div><span style="font-size:10px; color:#ff9800; font-weight:600;">출력:</span>
                            ${outputs.map(p => `<span class="bt-port-tag bt-port-out">${p.name}</span>`).join('') || '<span style="color:#666; font-size:10px;">없음</span>'}
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="bt-section">
                    <div class="bt-section-title">AI 참조 설명</div>
                    <div class="bt-ai-box">
                        <div class="bt-ai-text">${b.ai || '아직 AI용 설명이 없습니다. 편집을 클릭해서 추가하세요.'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function btEditBlock(id) {
    const b = btBlockData[id];
    if (!b) return;

    document.getElementById('btEditId').value = id;
    document.getElementById('btEditBlockId').value = b.id;
    document.getElementById('btEditBlockId').disabled = true;
    document.getElementById('btEditName').value = b.name || '';
    document.getElementById('btEditCategory').value = b.category || 'unknown';
    document.getElementById('btEditDesc').value = b.desc || '';
    document.getElementById('btEditAI').value = b.ai || '';

    btEditingPorts = (b.ports || []).map(p => ({ name: p.name, direction: p.direction || 'input' }));
    btRenderEditPorts();

    document.getElementById('btModalTitle').textContent = '블록 편집';
    document.getElementById('btDeleteBtn').style.display = 'block';
    document.getElementById('btEditModal').style.display = 'flex';
}

function btAddNewBlock() {
    document.getElementById('btEditId').value = '';
    document.getElementById('btEditBlockId').value = '';
    document.getElementById('btEditBlockId').disabled = false;
    document.getElementById('btEditName').value = '';
    document.getElementById('btEditCategory').value = 'logic';
    document.getElementById('btEditDesc').value = '';
    document.getElementById('btEditAI').value = '';

    btEditingPorts = [];
    btRenderEditPorts();

    document.getElementById('btModalTitle').textContent = '새 블록 추가';
    document.getElementById('btDeleteBtn').style.display = 'none';
    document.getElementById('btEditModal').style.display = 'flex';
}

function btRenderEditPorts() {
    const container = document.getElementById('btEditPortsContainer');
    if (!container) return;

    if (btEditingPorts.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:12px; text-align:center; padding:10px;">포트 없음</div>';
        return;
    }

    const inputs = btEditingPorts.filter(p => p.direction === 'input');
    const outputs = btEditingPorts.filter(p => p.direction === 'output');

    let html = '';
    if (inputs.length) {
        html += `<div style="margin-bottom:8px;"><span style="font-size:10px; color:#4fc3f7; font-weight:600;">입력 (${inputs.length})</span></div>`;
        html += `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px;">`;
        inputs.forEach(p => {
            html += `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; background:#4fc3f733; border:1px solid #4fc3f7; border-radius:4px; font-size:11px; color:#4fc3f7;">
                ${p.name} <button onclick="btRemovePort('${p.name}')" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:12px; padding:0;">&times;</button>
            </span>`;
        });
        html += `</div>`;
    }
    if (outputs.length) {
        html += `<div style="margin-bottom:8px;"><span style="font-size:10px; color:#ff9800; font-weight:600;">출력 (${outputs.length})</span></div>`;
        html += `<div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        outputs.forEach(p => {
            html += `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; background:#ff980033; border:1px solid #ff9800; border-radius:4px; font-size:11px; color:#ff9800;">
                ${p.name} <button onclick="btRemovePort('${p.name}')" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:12px; padding:0;">&times;</button>
            </span>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

function btAddPortToEdit() {
    const name = document.getElementById('btNewPortName').value.trim().toUpperCase();
    const dir = document.getElementById('btNewPortDir').value;
    if (!name) return showToast('포트 이름을 입력하세요', 'info');
    if (btEditingPorts.some(p => p.name === name)) return showToast('이미 존재하는 포트입니다', 'info');
    btEditingPorts.push({ name, direction: dir });
    btRenderEditPorts();
    document.getElementById('btNewPortName').value = '';
}

function btRemovePort(name) {
    btEditingPorts = btEditingPorts.filter(p => p.name !== name);
    btRenderEditPorts();
}

function btSaveBlock() {
    const oldId = document.getElementById('btEditId').value;
    const newId = document.getElementById('btEditBlockId').value.trim().toUpperCase();
    if (!newId) return showToast('블록 ID를 입력하세요', 'info');

    const data = {
        id: newId,
        name: document.getElementById('btEditName').value.trim() || newId,
        category: document.getElementById('btEditCategory').value,
        desc: document.getElementById('btEditDesc').value.trim(),
        ai: document.getElementById('btEditAI').value.trim(),
        ports: btEditingPorts,
        instances: oldId ? (btBlockData[oldId]?.instances || []) : []
    };

    if (oldId && oldId !== newId) delete btBlockData[oldId];
    btBlockData[newId] = data;
    btSave();
    btCloseModal();

    btSelectedBlock = newId;
    btRenderBlockList();
    btRenderDetail();
    btUpdateStats();
}

async function btDeleteBlock() {
    const id = document.getElementById('btEditId').value;
    if (!(await showConfirm('이 블록을 삭제하시겠습니까?', { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    delete btBlockData[id];
    if (!btDeletedBlocks.includes(id)) {
        btDeletedBlocks.push(id);
        localStorage.setItem('blockDictionary_deleted', JSON.stringify(btDeletedBlocks));
    }
    btSave();
    btCloseModal();

    btSelectedBlock = null;
    btRenderBlockList();
    btRenderDetail();
    btUpdateStats();
}

async function btQuickDelete(id) {
    const b = btBlockData[id];
    if (!b) return;
    if (!(await showConfirm(`"${id}" 블록을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.`, { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    delete btBlockData[id];
    if (!btDeletedBlocks.includes(id)) {
        btDeletedBlocks.push(id);
        localStorage.setItem('blockDictionary_deleted', JSON.stringify(btDeletedBlocks));
    }
    btSave();

    btSelectedBlock = null;
    btRenderBlockList();
    btRenderDetail();
    btUpdateStats();
}

function btCloseModal() { document.getElementById('btEditModal').style.display = 'none'; }

async function btResetToDefaults() {
    if (!(await showConfirm('블록 사전을 초기화하시겠습니까? 모든 데이터가 삭제되고 기본값으로 복원됩니다.', { title: '삭제 확인', type: 'danger', confirmText: '초기화' }))) return;
    localStorage.removeItem('blockDictionary_v3');
    localStorage.removeItem('blockDictionary_deleted');
    btDeletedBlocks = [];
    btBlockData = JSON.parse(JSON.stringify(btDefaultBlocks));
    btSave();
    btSelectedBlock = null;
    btRenderBlockList();
    btRenderDetail();
    btUpdateStats();
}

async function btGenerateAIData() {
    const aiRef = {
        title: '제어 로직 블록 기능 사전',
        description: 'AI가 도면 분석 시 참조하는 블록 기능 정의',
        generated: new Date().toISOString(),
        totalBlocks: Object.keys(btBlockData).length,
        blocks: {}
    };

    for (const [id, b] of Object.entries(btBlockData)) {
        aiRef.blocks[id] = {
            name: b.name, category: b.category, description: b.desc,
            ports: b.ports || [], aiReference: b.ai || '',
            instanceCount: b.instances?.length || 0
        };
    }

    // PyWebView API로 저장
    if (window.pywebview && window.pywebview.api) {
        const filename = `block_dictionary_${new Date().toISOString().slice(0,10)}.json`;
        const result = await window.pywebview.api.save_file(filename, aiRef, 'exports');
        if (result.success) {
            showToast(`사전 내보내기 완료: ${result.path}`, 'success');
        } else {
            showToast(`내보내기 실패: ${result.error}`, 'error');
        }
    } else {
        // 폴백: 브라우저 다운로드
        const blob = new Blob([JSON.stringify(aiRef, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'block_dictionary.json';
        a.click();
        showToast('사전 내보내기 완료 (다운로드)', 'success');
    }
}

// ========== 태그 검색 (Cross Reference) ==========
let crossRefIndex = null;
let tagSearchSelectedIdx = -1;
let tagSearchDebounceTimer = null;

async function loadCrossReferenceIndex() {
    try {
        // 도면 인덱스가 아직 로드되지 않았으면 먼저 로드
        if (!localDrawingIndex || Object.keys(localDrawingIndex).length === 0) {
            await loadDrawingListFromSupabase();
            console.log('[TagSearch] 도면 인덱스 선행 로드 완료');
        }

        if (isPyWebView()) {
            const result = await window.pywebview.api.load_data('cross_reference_index');
            if (result && result.success && result.data) {
                crossRefIndex = result.data;
                console.log(`[TagSearch] Cross Reference 로드 완료: ${crossRefIndex.length}개 태그`);
            }
        } else {
            const resp = await fetch('data/cross_reference_index.json');
            if (resp.ok) {
                crossRefIndex = await resp.json();
                console.log(`[TagSearch] Cross Reference 로드 완료: ${crossRefIndex.length}개 태그`);
            }
        }
    } catch (e) {
        console.warn('[TagSearch] Cross Reference 인덱스 로드 실패:', e);
    }
}

function onTagSearchInput(value) {
    clearTimeout(tagSearchDebounceTimer);
    tagSearchDebounceTimer = setTimeout(() => {
        tagSearchSelectedIdx = -1;
        renderTagSearchResults(value.trim());
    }, 150);
}

function onTagSearchFocus() {
    const input = document.getElementById('tag-search-input');
    if (input.value.trim().length >= 2) {
        renderTagSearchResults(input.value.trim());
    }
}

function onTagSearchKeydown(e) {
    const resultsEl = document.getElementById('tag-search-results');
    const items = resultsEl.querySelectorAll('.tag-result-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        tagSearchSelectedIdx = Math.min(tagSearchSelectedIdx + 1, items.length - 1);
        updateTagSearchSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        tagSearchSelectedIdx = Math.max(tagSearchSelectedIdx - 1, 0);
        updateTagSearchSelection(items);
    } else if (e.key === 'Enter' && tagSearchSelectedIdx >= 0) {
        e.preventDefault();
        items[tagSearchSelectedIdx].click();
    } else if (e.key === 'Escape') {
        closeTagSearchResults();
    }
}

// 통합 검색 함수 (제어로직 + P&ID)
function onUnifiedSearchInput(value) {
    clearTimeout(tagSearchDebounceTimer);
    tagSearchDebounceTimer = setTimeout(() => {
        tagSearchSelectedIdx = -1;
        renderUnifiedSearchResults(value.trim());
    }, 150);
}

function onUnifiedSearchFocus() {
    const input = document.getElementById('tag-search-input');
    if (input.value.trim().length >= 2) {
        renderUnifiedSearchResults(input.value.trim());
    }
}

function onUnifiedSearchKeydown(e) {
    onTagSearchKeydown(e); // 키 핸들링은 동일
}

function renderUnifiedSearchResults(query) {
    const resultsEl = document.getElementById('tag-search-results');
    if (query.length < 2) {
        resultsEl.style.display = 'none';
        return;
    }

    let html = '';
    let totalCount = 0;
    const q = query.toUpperCase();

    // 홈화면인지 확인 (welcome-screen이 보이는지)
    const welcomeScreen = document.getElementById('welcome-screen');
    const isHomeScreen = welcomeScreen && !welcomeScreen.classList.contains('hidden');

    // P&ID 뷰어 모드일 때 - 현재 도면만 검색
    if (typeof pidViewMode !== 'undefined' && pidViewMode && pidCurrentData) {
        const pidResults = searchPID(query);
        if (pidResults.length > 0) {
            totalCount += pidResults.length;
            html += `<div class="tag-result-section">P&ID: ${pidCurrentData.pid_number}</div>`;
            for (const item of pidResults.slice(0, 30)) {
                const typeIcon = item._type === 'valve' ? '🔧' : '📡';
                const typeColor = item._type === 'valve' ? '#10b981' : '#f97316';
                html += `
                    <div class="tag-result-item" onclick="selectPIDItem('${item._type}', '${item.id}'); closeTagSearchResults();">
                        <span style="color:${typeColor};">${typeIcon} ${item.id}</span>
                        <span style="color:#888; margin-left:8px;">${item.type || item.type_kor || ''}</span>
                        <span style="color:#666; float:right;">${item.grid || ''}</span>
                    </div>
                `;
            }
        }
    }
    // 홈화면일 때 - 제어로직 + P&ID 모두 검색
    else if (isHomeScreen) {
        // 1. 제어로직 검색
        if (crossRefIndex) {
            const logicMatches = [];
            for (let i = 0; i < crossRefIndex.length && logicMatches.length < 30; i++) {
                if (crossRefIndex[i].tag.toUpperCase().includes(q)) {
                    logicMatches.push(crossRefIndex[i]);
                }
            }

            if (logicMatches.length > 0) {
                totalCount += logicMatches.length;
                html += `<div class="tag-result-section" style="background:#3b82f6;">📋 제어로직 (${logicMatches.length})</div>`;
                for (const item of logicMatches) {
                    const primaryDr = item.drawings.find(d => d.primary) || item.drawings[0];
                    const drawingsHtml = item.drawings.map(dr => {
                        const drawingNum = dr.num.split('-')[1];
                        return `<span class="tag-drawing-link${dr.primary ? ' primary' : ''}"
                                      onclick="event.stopPropagation(); openDrawingFromTag('${drawingNum}', '${dr.num}', '${item.tag.replace(/'/g, "\\'")}')"
                                      title="${dr.ref}">${dr.num}${dr.primary ? ' ★' : ''}</span>`;
                    }).join('');

                    html += `
                        <div class="tag-result-item" onclick="openDrawingFromTag('${(primaryDr?.num || '').split('-')[1]}', '${primaryDr?.num || ''}', '${item.tag.replace(/'/g, "\\'")}')">
                            <span class="tag-result-name">${item.tag}</span>
                            <div class="tag-drawings">${drawingsHtml}</div>
                        </div>
                    `;
                }
            }
        }

        // 2. P&ID 검색 (검색 인덱스 사용)
        if (pidSearchIndex) {
            const pidMatches = [];

            // 밸브 검색
            if (pidSearchIndex.valves) {
                for (const v of pidSearchIndex.valves) {
                    if (v.id && v.id.toUpperCase().includes(q)) {
                        pidMatches.push({
                            ...v,
                            _type: 'valve',
                            _pidNumber: v.pid,
                            _pidName: v.name
                        });
                        if (pidMatches.length >= 30) break;
                    }
                }
            }

            // 계기 검색
            if (pidMatches.length < 30 && pidSearchIndex.instruments) {
                for (const inst of pidSearchIndex.instruments) {
                    if (inst.id && inst.id.toUpperCase().includes(q)) {
                        pidMatches.push({
                            ...inst,
                            _type: 'instrument',
                            _pidNumber: inst.pid,
                            _pidName: inst.name
                        });
                        if (pidMatches.length >= 30) break;
                    }
                }
            }

            if (pidMatches.length > 0) {
                totalCount += pidMatches.length;
                html += `<div class="tag-result-section" style="background:#10b981;">🔧 P&ID (${pidMatches.length})</div>`;
                for (const item of pidMatches) {
                    const typeIcon = item._type === 'valve' ? '🔧' : '📡';
                    const typeColor = item._type === 'valve' ? '#10b981' : '#f97316';
                    html += `
                        <div class="tag-result-item" onclick="openPIDAndSelect('${item._pidNumber}', '${item._type}', '${item.id}'); closeTagSearchResults();">
                            <span style="color:${typeColor};">${typeIcon} ${item.id}</span>
                            <span style="color:#888; margin-left:8px;">${item.type || item.type_kor || ''}</span>
                            <span style="color:#666; font-size:11px; margin-left:auto;">${item._pidNumber}</span>
                        </div>
                    `;
                }
            }
        }
    }
    // 제어로직 에디터 모드일 때
    else if (crossRefIndex) {
        const matches = [];
        for (let i = 0; i < crossRefIndex.length && matches.length < 50; i++) {
            if (crossRefIndex[i].tag.toUpperCase().includes(q)) {
                matches.push(crossRefIndex[i]);
            }
        }

        if (matches.length > 0) {
            totalCount += matches.length;
            html += `<div class="tag-result-section">제어로직 태그</div>`;
            for (const item of matches) {
                const primaryDr = item.drawings.find(d => d.primary) || item.drawings[0];
                const drawingsHtml = item.drawings.map(dr => {
                    const drawingNum = dr.num.split('-')[1];
                    return `<span class="tag-drawing-link${dr.primary ? ' primary' : ''}"
                                  onclick="event.stopPropagation(); openDrawingFromTag('${drawingNum}', '${dr.num}', '${item.tag.replace(/'/g, "\\'")}')"
                                  title="${dr.ref}">${dr.num}${dr.primary ? ' ★' : ''}</span>`;
                }).join('');

                html += `
                    <div class="tag-result-item" onclick="openDrawingFromTag('${(primaryDr?.num || '').split('-')[1]}', '${primaryDr?.num || ''}', '${item.tag.replace(/'/g, "\\'")}')">
                        <span class="tag-result-name">${item.tag}</span>
                        <div class="tag-drawings">${drawingsHtml}</div>
                    </div>
                `;
            }
        }
    }

    if (totalCount === 0) {
        resultsEl.innerHTML = '<div class="tag-result-empty">검색 결과 없음</div>';
    } else {
        resultsEl.innerHTML = `<div class="tag-result-count">${totalCount}개 결과</div>` + html;
    }

    resultsEl.style.display = 'block';
}

function updateTagSearchSelection(items) {
    items.forEach((el, i) => {
        el.classList.toggle('selected', i === tagSearchSelectedIdx);
    });
    if (tagSearchSelectedIdx >= 0 && items[tagSearchSelectedIdx]) {
        items[tagSearchSelectedIdx].scrollIntoView({ block: 'nearest' });
    }
}

function renderTagSearchResults(query) {
    const resultsEl = document.getElementById('tag-search-results');
    if (!crossRefIndex || query.length < 2) {
        resultsEl.style.display = 'none';
        return;
    }

    const q = query.toUpperCase();
    const matches = [];
    for (let i = 0; i < crossRefIndex.length && matches.length < 50; i++) {
        if (crossRefIndex[i].tag.toUpperCase().includes(q)) {
            matches.push(crossRefIndex[i]);
        }
    }

    if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="tag-result-empty">검색 결과 없음</div>';
        resultsEl.style.display = 'block';
        return;
    }

    let html = `<div class="tag-result-count">${matches.length}${matches.length >= 50 ? '+' : ''}개 태그</div>`;
    for (const item of matches) {
        const primaryDr = item.drawings.find(d => d.primary) || item.drawings[0];
        const otherCount = item.drawings.length - 1;
        const drawingsHtml = item.drawings.map(dr => {
            const drawingNum = dr.num.split('-')[1];  // "3-056" → "056"
            const dropNum = dr.num.split('-')[0];
            return `<span class="tag-drawing-link${dr.primary ? ' primary' : ''}"
                          onclick="event.stopPropagation(); openDrawingFromTag('${drawingNum}', '${dr.num}', '${item.tag.replace(/'/g, "\\'")}')"
                          title="${dr.ref}">
                        ${dr.num}${dr.primary ? ' ★' : ''}
                    </span>`;
        }).join('');

        html += `<div class="tag-result-item">
            <div class="tag-result-name">${highlightMatch(item.tag, query)}</div>
            <div class="tag-result-title">${primaryDr ? primaryDr.title : ''}</div>
            <div class="tag-result-drawings">${drawingsHtml}</div>
        </div>`;
    }

    resultsEl.innerHTML = html;
    resultsEl.style.display = 'block';
}

function highlightMatch(text, query) {
    const idx = text.toUpperCase().indexOf(query.toUpperCase());
    if (idx === -1) return text;
    return text.substring(0, idx) +
           '<mark>' + text.substring(idx, idx + query.length) + '</mark>' +
           text.substring(idx + query.length);
}

let pendingTagHighlight = null;

async function openDrawingFromTag(drawingNum, fullNum, tagName) {
    // drawingNum: "056", fullNum: "3-056"
    if (supabaseDrawings[drawingNum]) {
        const info = supabaseDrawings[drawingNum].info;
        const pages = info.pages || [info.first_page];
        pendingTagHighlight = tagName || null;
        closeTagSearchResults();
        document.getElementById('tag-search-input').blur();

        // 태그가 있는 페이지 찾기 (여러 페이지 중 정확한 페이지 탐색)
        let targetPage = pages[0];
        if (tagName && pages.length > 1) {
            const foundPage = await findPageWithTag(drawingNum, pages, tagName);
            if (foundPage) targetPage = foundPage;
        }

        await loadFromSupabaseWithVersion(drawingNum, targetPage, 'original');
        if (pendingTagHighlight) {
            setTimeout(() => focusOnTag(pendingTagHighlight), 500);
        }
    } else {
        showToast(`도면 ${fullNum} (${drawingNum})이 로컬에 없습니다`, 'warning');
    }
}

async function findPageWithTag(drawingNum, pages, tagName) {
    const info = localDrawingIndex[drawingNum];
    if (!info) return null;

    const dropFolder = `drop_${info.drop}_${info.drop_name.replace(/ /g, '_')}`;
    const query = tagName.toUpperCase();

    for (const page of pages) {
        try {
            const csvPath = `drawings/${dropFolder}/${drawingNum}/page_${page}_layout.csv`;
            const csvText = await readTextFile(csvPath);
            if (csvText && csvText.toUpperCase().includes(query)) {
                console.log(`[TagSearch] "${tagName}" → page ${page} 에서 발견`);
                return page;
            }
        } catch (e) {
            // 파일 읽기 실패 시 다음 페이지 시도
        }
    }
    console.log(`[TagSearch] "${tagName}" → 모든 페이지에서 미발견, 첫 페이지 사용`);
    return null;
}

// 태그 하이라이트 효과 상태
let tagHighlightTarget = null;  // {cx, cy, name} - 하이라이트 대상
let tagHighlightAnim = null;    // requestAnimationFrame ID
let tagHighlightPhase = 0;      // 애니메이션 위상 (0~1 반복)

function focusOnTag(tagName) {
    if (!blocks || blocks.length === 0) return;

    const query = tagName.toUpperCase();
    // 정확 매칭 → 부분 매칭 → allElements 검색
    let found = blocks.find(b => b.name.toUpperCase() === query) ||
                blocks.find(b => b.name.toUpperCase().includes(query)) ||
                (allElements && (
                    allElements.find(e => e.name.toUpperCase() === query) ||
                    allElements.find(e => e.name.toUpperCase().includes(query))
                ));

    if (found) {
        // 위치 이동하지 않고 선택 + 펄스 효과
        selectedElement = found;
        tagHighlightTarget = found;
        tagHighlightPhase = 0;
        startTagHighlightAnimation();
        render();
        showToast(`"${found.name}" 하이라이트`, 'success');
    } else {
        showToast(`"${tagName}" 블록을 도면에서 찾지 못했습니다`, 'warning');
    }
    pendingTagHighlight = null;
}

function startTagHighlightAnimation() {
    if (tagHighlightAnim) cancelAnimationFrame(tagHighlightAnim);

    function animate() {
        if (!tagHighlightTarget) return;
        tagHighlightPhase = (tagHighlightPhase + 0.02) % 1;
        render();
        tagHighlightAnim = requestAnimationFrame(animate);
    }
    tagHighlightAnim = requestAnimationFrame(animate);
}

function clearTagHighlight() {
    tagHighlightTarget = null;
    if (tagHighlightAnim) {
        cancelAnimationFrame(tagHighlightAnim);
        tagHighlightAnim = null;
    }
}

// render()에서 호출 — 태그 하이라이트 펄스 효과
function drawTagHighlight(ctx) {
    if (!tagHighlightTarget) return;

    const t = tagHighlightTarget;
    const phase = tagHighlightPhase;

    // 텍스트 바운딩 박스 기준 — 텍스트 길이에 맞게 동적 크기
    const nameLen = (t.name || '').length;
    const halfW = Math.max(80, nameLen * 10);
    const pad = 60;
    const bx1 = Math.min(t.x1 || t.cx - halfW, t.cx - halfW) - pad;
    const by1 = (t.y1 || t.cy - 25) - pad;
    const bx2 = Math.max(t.x2 || t.cx + halfW, t.cx + halfW) + pad;
    const by2 = (t.y2 || t.cy + 25) + pad;
    const bw = bx2 - bx1;
    const bh = by2 - by1;
    const bcx = (bx1 + bx2) / 2;
    const bcy = (by1 + by2) / 2;

    // 3개의 펄스 링 (텍스트 영역 주변 사각 라운드)
    for (let i = 0; i < 3; i++) {
        const p = (phase + i * 0.33) % 1;
        const expand = p * 50;
        const alpha = (1 - p) * 0.55;
        const r = 8 + expand * 0.3;

        ctx.beginPath();
        ctx.roundRect(bx1 - expand, by1 - expand, bw + expand * 2, bh + expand * 2, r);
        ctx.strokeStyle = `rgba(255, 60, 120, ${alpha})`;
        ctx.lineWidth = (3 - p * 1.5) / scale;
        ctx.stroke();
    }

    // 내부 글로우 박스
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bx1, by1, bw, bh, 6);
    ctx.fillStyle = 'rgba(255, 60, 120, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 80, 140, 0.7)';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    ctx.restore();

    // 태그명 라벨 (상단)
    ctx.save();
    const fontSize = Math.max(12, 14 / scale);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    const labelY = by1 - 8;
    // 라벨 배경
    const textWidth = ctx.measureText(t.name).width;
    ctx.fillStyle = 'rgba(60, 0, 20, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bcx - textWidth/2 - 6, labelY - fontSize + 2, textWidth + 12, fontSize + 6, 4);
    ctx.fill();
    // 라벨 텍스트
    ctx.fillStyle = 'rgba(255, 120, 170, 0.95)';
    ctx.fillText(t.name, bcx, labelY);
    ctx.restore();
}

function closeTagSearchResults() {
    document.getElementById('tag-search-results').style.display = 'none';
    tagSearchSelectedIdx = -1;
}

// 바깥 클릭 시 닫기
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tag-search-container')) {
        closeTagSearchResults();
    }
});

// ============ 스캔 탭 기능 ============

function inferBlockCategory(groupName, groupPorts) {
    const portNames = groupPorts.map(p => (p.name || p.text || '').toUpperCase());
    const portSet = new Set(portNames);
    const nameUpper = groupName.toUpperCase();

    // SIGNAL 블록
    if (nameUpper.includes('SIGNAL') || (!nameUpper.startsWith('OCB') && !nameUpper.startsWith('ALG') && !nameUpper.startsWith('D0') && portSet.size <= 1)) {
        // 실제 SIGNAL 판별은 아래에서 별도 처리
    }

    // PID 제어기: STPT/SP, PV, OUT/MV, K, d, dt 등
    if ((portSet.has('STPT') || portSet.has('SP')) && portSet.has('PV') && (portSet.has('OUT') || portSet.has('MV'))) {
        return 'PID 제어기 (설정값→측정값 비교→제어출력)';
    }
    if (portSet.has('MV') && portSet.has('PV')) {
        return 'PID 제어기 (설정값→측정값 비교→제어출력)';
    }

    // 조건 선택 (Transfer): FLAG, YES, NO, OUT, T → OUT = FLAG ? YES : NO
    if (portSet.has('T') && portSet.has('YES') && portSet.has('NO')) {
        return '조건 선택 (Transfer, FLAG ? YES : NO)';
    }

    // 나눗셈 블록: NUM, DEN, OUT
    if (portSet.has('NUM') && portSet.has('DEN') && portSet.has('OUT')) {
        return '나눗셈 (NUM / DEN → OUT)';
    }

    // 리미터: H, IN1, OUT (or L, IN1, OUT)
    if ((portSet.has('H') || portSet.has('L')) && portSet.has('IN1') && portSet.has('OUT')) {
        return '리미터 (상/하한 제한)';
    }

    // 단순전달: A, OUT
    if (portSet.has('A') && portSet.has('OUT') && portNames.length <= 3) {
        return '단순전달 (입력값 그대로 출력)';
    }

    // 최종출력: IN1만 (또는 매우 적은 포트)
    if (portSet.has('IN1') && !portSet.has('OUT') && portNames.length <= 2) {
        return '최종출력 (현장기기 전달)';
    }

    // AND/OR/ADD/SUB 등
    if (portSet.has('IN1') && portSet.has('IN2') && portSet.has('OUT')) {
        if (nameUpper.includes('AND')) return 'AND (모두 참이면 참)';
        if (nameUpper.includes('OR')) return 'OR (하나라도 참이면 참)';
        if (nameUpper.includes('ADD') || nameUpper.includes('+')) return '덧셈 (IN1 + IN2)';
        if (nameUpper.includes('SUB') || nameUpper.includes('-')) return '뺄셈 (IN1 - IN2)';
        if (nameUpper.includes('MUL')) return '곱셈 (IN1 × IN2)';
        if (nameUpper.includes('DIV')) return '나눗셈 (IN1 / IN2)';
        return '연산 블록';
    }

    return '기타';
}

function extractSignalDescription(groupPorts) {
    // SIGNAL 블록의 포트에서 설비 설명 추출 (쉼표로 구분된 텍스트)
    for (const p of groupPorts) {
        const text = p.name || p.text || '';
        // 긴 텍스트(설명)를 찾기 - 보통 설비 설명은 공백을 포함한 긴 문자열
        if (text.length > 5 && /[A-Z]{2,}/.test(text) && text.includes(' ')) {
            return text.trim();
        }
    }
    // 포트명을 쉼표로 구분하여 설명 구성
    const names = groupPorts.map(p => (p.name || p.text || '').trim()).filter(n => n.length > 0);
    if (names.length > 0) {
        return names.join(', ');
    }
    return '';
}

function extractRefSignalPageNumber(groupName) {
    // REF_SIGNAL에서 도면 번호 추출 (예: D03-511-03 -> 3/511)
    const match = groupName.match(/D(\d+)-(\d+)-(\d+)/i);
    if (match) {
        return `${parseInt(match[1])}/${match[2]}`;
    }
    return groupName;
}

function runScanElements() {
    scanResults = [];
    loadScanDescriptions();

    if (!groupsData || Object.keys(groupsData).length === 0) {
        renderScanList();
        updateScanStats();
        return;
    }

    for (const [groupName, groupData] of Object.entries(groupsData)) {
        const gPorts = groupData.ports || [];
        const nameUpper = groupName.toUpperCase();

        let category = '';
        let autoDesc = '';
        let type = 'OCB_BLOCK';

        // SIGNAL 블록 판별
        if (nameUpper.match(/^[A-Z]{2,3}\d{3,}/) && !nameUpper.startsWith('OCB') && !nameUpper.startsWith('ALG') && !nameUpper.startsWith('D0')) {
            // 태그명 패턴 (예: SIT2681A, TIT2641 등)
            category = 'SIGNAL';
            type = 'SIGNAL';
            autoDesc = extractSignalDescription(gPorts);
        } else if (nameUpper.match(/^D\d{2}-\d{3}-\d{2}/)) {
            // REF_SIGNAL 패턴 (예: D03-511-03)
            category = 'REF_SIGNAL';
            type = 'REF_SIGNAL';
            autoDesc = extractRefSignalPageNumber(groupName);
        } else if (nameUpper.startsWith('OCB') || nameUpper.startsWith('ALG')) {
            // 기능 블록
            category = inferBlockCategory(groupName, gPorts);
            type = 'OCB_BLOCK';
            autoDesc = category;
        } else {
            // 기타 블록
            category = inferBlockCategory(groupName, gPorts);
            type = 'OTHER';
            autoDesc = category;
        }

        const scanInfo = scanDescriptions[groupName];
        const userDesc = scanInfo ? (typeof scanInfo === 'string' ? scanInfo : (scanInfo.equipment || '')) : '';

        scanResults.push({
            name: groupName,
            category: category,
            autoDesc: autoDesc,
            userDesc: userDesc,
            type: type,
            portCount: gPorts.length,
            cx: groupData.cx,
            cy: groupData.cy
        });
    }

    // groupsData에 없는 blocks/ports도 추가
    const addedNames = new Set(scanResults.map(r => r.name));

    // blocks 배열에서 추가
    if (typeof blocks !== 'undefined' && Array.isArray(blocks)) {
        for (const block of blocks) {
            if (!block.name || addedNames.has(block.name)) continue;
            addedNames.add(block.name);

            const nameUpper = block.name.toUpperCase();
            let category = '', autoDesc = '', type = block.type || 'OTHER';

            if (type === 'SIGNAL' || (nameUpper.match(/^[A-Z]{2,3}\d{3,}/) && !nameUpper.startsWith('OCB') && !nameUpper.startsWith('ALG') && !nameUpper.startsWith('D0'))) {
                category = 'SIGNAL';
                type = 'SIGNAL';
                autoDesc = block.text || block.name;
            } else if (type === 'REF_SIGNAL' || nameUpper.match(/^D\d{2}-\d{3}-\d{2}/)) {
                category = 'REF_SIGNAL';
                type = 'REF_SIGNAL';
                autoDesc = extractRefSignalPageNumber(block.name);
            } else if (nameUpper.startsWith('MODE') || nameUpper.startsWith('M/A')) {
                category = '운전모드 (AUTO/MANUAL 전환)';
                type = 'OTHER';
                autoDesc = category;
            } else if (nameUpper.startsWith('N_') || nameUpper.startsWith('NOT')) {
                category = 'NOT (반전)';
                type = 'BLOCK_TYPE';
                autoDesc = category;
            } else if (nameUpper.startsWith('AND')) {
                category = 'AND (모두 참이면 참)';
                type = 'BLOCK_TYPE';
                autoDesc = category;
            } else if (nameUpper.startsWith('OR')) {
                category = 'OR (하나라도 참이면 참)';
                type = 'BLOCK_TYPE';
                autoDesc = category;
            } else if (nameUpper.startsWith('ABS')) {
                category = '절대값 (ABS)';
                type = 'BLOCK_TYPE';
                autoDesc = category;
            } else {
                category = block.type || '기타';
                autoDesc = block.type || '';
            }

            const scanInfo = scanDescriptions[block.name];
            const userDesc = scanInfo ? (typeof scanInfo === 'string' ? scanInfo : (scanInfo.equipment || '')) : '';

            scanResults.push({
                name: block.name,
                category: category,
                autoDesc: autoDesc,
                userDesc: userDesc,
                type: type,
                portCount: 0,
                cx: block.cx,
                cy: block.cy
            });
        }
    }

    // ports 배열에서 독립 포트 추가 (parent 없는 것만)
    if (typeof ports !== 'undefined' && Array.isArray(ports)) {
        for (const port of ports) {
            if (!port.name || addedNames.has(port.name)) continue;
            // 같은 이름이 여러 개일 수 있으므로 첫 번째만
            addedNames.add(port.name);

            const scanInfo = scanDescriptions[port.name];
            const userDesc = scanInfo ? (typeof scanInfo === 'string' ? scanInfo : (scanInfo.equipment || '')) : '';

            scanResults.push({
                name: port.name,
                category: 'PORT',
                autoDesc: port.type || 'PORT',
                userDesc: userDesc,
                type: port.type || 'PORT',
                portCount: 0,
                cx: port.cx,
                cy: port.cy
            });
        }
    }

    // 카테고리별, 이름순 정렬
    scanResults.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
    });

    renderScanList();
    updateScanStats();
    console.log('Scan complete:', scanResults.length, 'elements');
}

function updateScanStats() {
    const statsEl = document.getElementById('scan-stats');
    if (!statsEl) return;

    const total = scanResults.length;
    const described = scanResults.filter(r => {
        const info = scanDescriptions[r.name];
        const hasEquipment = info && (typeof info === 'string' ? !!info : !!(info.equipment));
        return r.autoDesc || hasEquipment;
    }).length;
    const missing = total - described;

    // 사용자가 직접 입력한 설명 수도 계산
    const userDescribed = scanResults.filter(r => {
        const info = scanDescriptions[r.name];
        return info && (typeof info === 'string' ? !!info : !!(info.equipment));
    }).length;
    const autoDescribed = scanResults.filter(r => r.autoDesc && !r.userDesc).length;

    statsEl.innerHTML = `전체: <b>${total}</b>개 | 설명 완료: <b style="color:#4caf50;">${described}</b>개 | 미입력: <b style="color:#ff9800;">${missing}</b>개`;
}

function renderScanList(filterText) {
    const listEl = document.getElementById('scan-list');
    if (!listEl) return;

    let items = scanResults;
    if (filterText) {
        const lower = filterText.toLowerCase();
        items = items.filter(r =>
            r.name.toLowerCase().includes(lower) ||
            r.autoDesc.toLowerCase().includes(lower) ||
            r.userDesc.toLowerCase().includes(lower) ||
            r.category.toLowerCase().includes(lower)
        );
    }

    // 카테고리별 그룹화
    const groups = {};
    for (const item of items) {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
    }

    let html = '';
    for (const [cat, catItems] of Object.entries(groups)) {
        const isCollapsed = scanCollapsedCategories[cat];
        const arrow = isCollapsed ? '&#9654;' : '&#9660;';
        html += `<div style="margin-bottom:4px;">`;
        html += `<div onclick="toggleScanCategory('${cat}')" style="padding:6px 8px; background:rgba(255,255,255,0.05); border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; user-select:none;">`;
        html += `<span>${arrow} ${cat}</span><span style="color:var(--text-muted); font-weight:400;">${catItems.length}개</span>`;
        html += `</div>`;

        if (!isCollapsed) {
            html += `<div style="padding-left:8px;">`;
            for (const item of catItems) {
                html += renderScanItem(item);
            }
            html += `</div>`;
        }
        html += `</div>`;
    }

    if (items.length === 0) {
        html = '<div style="text-align:center; color:var(--text-muted); font-size:11px; padding:20px;">스캔 결과 없음. "스캔 실행" 버튼을 클릭하세요.</div>';
    }

    listEl.innerHTML = html;
}

function renderScanItem(item) {
    let html = '<div style="padding:4px 6px; margin:2px 0; font-size:11px; display:flex; align-items:center; gap:6px; border-bottom:1px solid rgba(255,255,255,0.03);">';

    // 블록 이름
    html += `<span style="flex-shrink:0; min-width:90px; font-family:monospace; font-size:10px; color:var(--text-primary); cursor:pointer;" onclick="focusScanElement('${item.name}')" title="클릭하여 이동">${item.name}</span>`;

    if (item.type === 'SIGNAL' && item.autoDesc) {
        // SIGNAL: 자동 설명 표시 + 체크
        html += `<span style="flex:1; font-size:10px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.autoDesc}">"${item.autoDesc}"</span>`;
        html += `<span style="color:#4caf50; flex-shrink:0; font-size:10px;" title="자동 추출">&#10003;</span>`;
    } else {
        // 자동 설명 라벨
        if (item.autoDesc) {
            html += `<span style="flex-shrink:0; font-size:9px; color:var(--text-muted); max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.autoDesc}">"${item.autoDesc}"</span>`;
        }
        // 사용자 입력란
        const escapedName = item.name.replace(/'/g, "\\'");
        const escapedDesc = (item.userDesc || '').replace(/"/g, '&quot;');
        html += `<input type="text" value="${escapedDesc}" placeholder="" onblur="saveScanDescription('${escapedName}', this.value)" style="flex:1; min-width:0; padding:2px 4px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:3px; color:var(--text-primary); font-size:10px;">`;
        if (item.userDesc) {
            html += `<span style="color:#4caf50; flex-shrink:0; font-size:10px;">&#10003;</span>`;
        }
    }

    html += '</div>';
    return html;
}

function toggleScanCategory(cat) {
    scanCollapsedCategories[cat] = !scanCollapsedCategories[cat];
    const searchEl = document.getElementById('scan-search');
    const filterText = searchEl ? searchEl.value.trim() : '';
    renderScanList(filterText || undefined);
}

function focusScanElement(blockName) {
    // 그룹 또는 블록에서 좌표 찾기
    const group = groupsData[blockName];
    const block = blocks.find(b => b.name === blockName);
    const port = ports.find(p => p.name === blockName);
    const target = block || port;
    const cx = group ? group.cx : (target ? target.cx : null);
    const cy = group ? group.cy : (target ? target.cy : null);

    if (cx === null || cy === null) return;

    // 캔버스 중앙으로 이동
    viewX = canvas.width / 2 - cx * scale;
    viewY = canvas.height / 2 - cy * scale;

    // 해당 요소 선택
    if (target) {
        selectedElement = target;
    } else if (group) {
        selectedElement = { name: blockName, cx: group.cx, cy: group.cy, type: group.type || 'OTHER' };
    }

    updateSelectionInfo();
    updateStatusBar();
    startHighlightAnim();
}

function saveScanDescription(blockName, value) {
    if (!scanDescriptions[blockName] || typeof scanDescriptions[blockName] === 'string') {
        scanDescriptions[blockName] = { equipment: value, memo: '' };
    } else {
        scanDescriptions[blockName].equipment = value;
    }
    const item = scanResults.find(r => r.name === blockName);
    if (item) item.userDesc = value;
    const pageKey = 'scan_dictionary';
    localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));
    updateScanStats();
}

function loadScanDescriptions() {
    const pageKey = 'scan_dictionary';
    const saved = localStorage.getItem(pageKey);
    console.log('[ScanDict] 로드:', saved ? `${saved.length}bytes` : 'null');
    if (saved) {
        try {
            scanDescriptions = JSON.parse(saved);
            console.log('[ScanDict] 파싱 완료:', Object.keys(scanDescriptions).length, '항목');
            // 마이그레이션: 문자열 → 객체
            for (const [key, val] of Object.entries(scanDescriptions)) {
                if (typeof val === 'string') {
                    scanDescriptions[key] = { equipment: val, memo: '' };
                }
            }
        } catch (e) {
            scanDescriptions = {};
        }
    } else {
        // 기존 도면별 데이터 마이그레이션
        scanDescriptions = {};
        let migrated = false;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('scan_descriptions_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    for (const [name, val] of Object.entries(data)) {
                        if (!scanDescriptions[name]) {
                            scanDescriptions[name] = typeof val === 'string' ? { equipment: val, memo: '' } : val;
                        }
                    }
                    migrated = true;
                } catch (e) {}
            }
        }
        if (migrated) {
            localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));
            console.log('[ScanDict] 기존 도면별 데이터 마이그레이션 완료:', Object.keys(scanDescriptions).length, '항목');
        }
    }
}

function saveScanAll() {
    // scanResults의 모든 항목을 scanDescriptions에 반영
    for (const item of scanResults) {
        if (!scanDescriptions[item.name]) {
            scanDescriptions[item.name] = { equipment: '', memo: '' };
        }
        const desc = scanDescriptions[item.name];
        if (typeof desc === 'string') {
            scanDescriptions[item.name] = { equipment: desc, memo: '' };
        }
        // autoDesc는 자동분류 칼럼에만 표시, equipment는 사용자 입력만
        // 타입/카테고리 정보도 저장
        scanDescriptions[item.name].type = item.type || '';
        scanDescriptions[item.name].category = item.category || '';
        scanDescriptions[item.name].autoDesc = item.autoDesc || '';
    }

    const pageKey = 'scan_dictionary';
    localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));
    showToast(`스캔 저장 완료 (${Object.keys(scanDescriptions).length}개)`, 'success');
}

function filterScanList() {
    const searchEl = document.getElementById('scan-search');
    const filterText = searchEl ? searchEl.value.trim() : '';
    renderScanList(filterText || undefined);
}
