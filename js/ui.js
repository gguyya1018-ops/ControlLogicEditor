/**
 * ui.js - UI 업데이트 및 관리
 * 상태바, 선택 정보, 통계, 연결 목록, 메뉴 등
 */

// ============ 스캔 탭 전역 변수 ============
let scanResults = [];  // 스캔된 요소 목록
let scanDescriptions = {};  // 인스턴스별 설명 { 블록명: "설명" }
let scanCollapsedCategories = {};  // 카테고리 접기 상태

// ============ 블록사전 전역 변수 ============
let blockDict = {};  // { anchor: [ {drawing, equipment, memo, ports, connections, saved_at} ] }

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

// 앱 초기화 완료 전에 hideWelcomeScreen이 호출되는 것을 방지
window._appReady = false;

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
    setVal('ws-drops', Object.keys(drops).length);
    setVal('ws-pages', pageCount);
    setVal('ws-tags', tagCount);

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
    if (!window._appReady) {
        // 스타트업 중 호출 차단 — 어디서 호출했는지 로그 기록
        const caller = new Error().stack.split('\n').slice(1, 4).join(' | ');
        console.warn('[hideWelcomeScreen] 앱 초기화 전 호출 차단:', caller);
        return;
    }
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
    // 블록사전 로드
    loadBlockDict();
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

    // REF_SIGNAL / SHEET_REF: 도면 이동 버튼
    if (e.type === 'REF_SIGNAL' || e.type === 'SHEET_REF' || /^D\d+-\d+-\d+/.test(e.name)) {
        const ref = typeof parseRefSignal === 'function' ? parseRefSignal(e.name) : null;
        if (ref) {
            const refId = `D${ref.drop.padStart(2,'0')}-${ref.task}-${ref.sheet}`;
            const refTitle = typeof getDrawingTitle === 'function' ? getDrawingTitle(ref.task) : '';
            html += `
                <div style="margin-top:8px; padding:8px; background:rgba(0,188,212,0.08); border:1px solid rgba(0,188,212,0.2); border-radius:6px;">
                    <div style="font-size:10px; font-weight:600; color:#00bcd4; margin-bottom:6px;">참조 도면</div>
                    <div style="font-size:11px; color:#f0a050; font-weight:600;">${refId}</div>
                    ${refTitle ? `<div style="font-size:10px; color:rgba(255,255,255,0.6); margin-top:2px;">${refTitle}</div>` : ''}
                    <button class="btn-primary" style="width:100%; margin-top:8px; font-size:11px; background:#00bcd4;"
                        onclick="openDrawingFromTag('${ref.task}','','${e.name.replace(/'/g, "\\'")}')">도면 열기</button>
                </div>`;
        }
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

function saveScanUserType(blockName, value) {
    if (!scanDescriptions[blockName] || typeof scanDescriptions[blockName] === 'string') {
        const oldStr = typeof scanDescriptions[blockName] === 'string' ? scanDescriptions[blockName] : '';
        scanDescriptions[blockName] = { equipment: oldStr, memo: '', userType: value };
    } else {
        scanDescriptions[blockName].userType = value;
    }
    const pageKey = 'scan_dictionary';
    localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));
    // 스캔 결과에서도 즉시 반영
    const item = scanResults.find(r => r.name === blockName);
    if (item) {
        if (value && typeof blockDictionary !== 'undefined' && blockDictionary[value]) {
            item.blockType = value;
            item.blockTypeSrc = 'user';
            item.blockDesc = blockDictionary[value].desc || '';
        } else if (!value) {
            item.blockTypeSrc = 'portdict';
        }
    }
    openScanDetailPopup(blockName); // 팝업 갱신
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
        case 'other':
            showOther = !showOther;
            document.getElementById('toolShowOther')?.classList.toggle('active', showOther);
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
    document.getElementById('toolShowOther')?.classList.toggle('active', showOther);
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
    const tabIndex = { 'info': 0, 'template': 1, 'autoconnect': 2, 'connections': 3, 'scan': 4, 'block': 5 };

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

    // 블록 탭 진입 시 목록 갱신
    if (tabName === 'block') {
        if (scanResults.length === 0 && groupsData && Object.keys(groupsData).length > 0) {
            runScanElements();
        } else {
            renderBlockList();
        }
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

    if (isDrawingOpen && blocks.length > 0 && isEdited) {
        // 변경사항 있을 때만 저장 확인 팝업
        const result = await showGoHomeConfirm();
        if (result === 'cancel') return;
        if (result === 'save') {
            if (typeof saveData === 'function') {
                await saveData();
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
    if (tabName === 'block-dict') {
        renderBdMain();
    }

    // 헤더 버튼 그룹 전환
    const editorBtns = document.getElementById('header-btns-editor');
    const pidBtns = document.getElementById('header-btns-pid');
    const btBtns = document.getElementById('header-btns-blocktype');

    const misoBtns = document.getElementById('header-btns-miso');

    if (editorBtns) editorBtns.style.display = 'none';
    if (pidBtns) pidBtns.style.display = 'none';
    if (btBtns) btBtns.style.display = 'none';
    if (misoBtns) misoBtns.style.display = 'none';

    if (tabName === 'editor') {
        // P&ID 전체 화면 모드가 활성화된 경우 P&ID 버튼 표시
        if (typeof pidViewMode !== 'undefined' && pidViewMode) {
            if (pidBtns) pidBtns.style.display = 'flex';
        } else {
            if (editorBtns) editorBtns.style.display = 'flex';
        }
    } else if (tabName === 'block-types') {
        if (btBtns) btBtns.style.display = 'flex';
    } else if (tabName === 'miso') {
        if (misoBtns) misoBtns.style.display = 'flex';
        misoInit();
    } else if (tabName === 'block-info') {
        biInit();
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
            <td class="sd-td" style="text-align:center; width:40px;"><button onclick="sdDeleteItem('${escapedName}')" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:13px; padding:2px 6px;" title="삭제">&times;</button></td>
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

async function sdResetAll() {
    const count = Object.keys(sdData).length;
    if (count === 0) {
        showToast('삭제할 데이터가 없습니다.', 'info');
        return;
    }
    const ok = await showConfirm(
        `설비정보 ${count}건을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        { title: '설비정보 초기화', confirmText: '전체 삭제', cancelText: '취소', type: 'danger' }
    );
    if (!ok) return;
    sdData = {};
    scanDescriptions = {};
    localStorage.removeItem('scan_dictionary');
    sdBuildFilters();
    sdRenderTable();
    showToast('설비정보가 초기화되었습니다.', 'success');
}

async function sdDeleteItem(name) {
    const ok = await showConfirm(
        `"${name}" 설비정보를 삭제하시겠습니까?`,
        { title: '항목 삭제', confirmText: '삭제', cancelText: '취소', type: 'danger' }
    );
    if (!ok) return;
    delete sdData[name];
    delete scanDescriptions[name];
    localStorage.setItem('scan_dictionary', JSON.stringify(sdData));
    sdBuildFilters();
    sdRenderTable();
    showToast(`${name} 삭제 완료`, 'success');
}

// ============ 블록 사전 기능 (localStorage 연동) ============

let btBlockData = {};
let btCurrentCat = 'all';
let btSelectedBlock = null;
let btDeletedBlocks = [];
let btEditingPorts = [];

const btCatNames = { logic: '논리', math: '수학', control: '제어', compare: '비교', timer: '타이머', io: '입출력', signal: '신호', unknown: '미분류', arithmetic: '산술', digital: '디지털', selector: '선택기', limiter: '리미터', monitor: '감시', sequencer: '시퀀서', steam: '열역학', other: '기타' };

const btDefaultBlocks = {
    // === 논리 블록 (Logic) ===
    'AND': { id: 'AND', name: 'AND', category: 'logic', symbol: '&', desc: '논리곱 (AND Gate)', ai: '최대 8개의 디지털 입력에 대한 논리 AND 연산을 수행하는 블록. IN1, IN2는 필수이고 IN3~IN8은 선택적이다. 모든 연결된 입력이 TRUE(1)일 때만 OUT이 TRUE(1)가 된다. DCS에서 자동운전 조건 결합(예: N.OUT AND MODE.AUTO → 자동운전 허용)에 사용된다.', ports: [{name:'IN1',direction:'input',desc:'디지털 입력 1'},{name:'IN2',direction:'input',desc:'디지털 입력 2'},{name:'IN3',direction:'input',desc:'디지털 입력 3'},{name:'IN4',direction:'input',desc:'디지털 입력 4'},{name:'IN5',direction:'input',desc:'디지털 입력 5'},{name:'IN6',direction:'input',desc:'디지털 입력 6'},{name:'IN7',direction:'input',desc:'디지털 입력 7'},{name:'IN8',direction:'input',desc:'디지털 입력 8'},{name:'OUT',direction:'output',desc:'디지털 출력'}] },
    'OR': { id: 'OR', name: 'OR', category: 'logic', symbol: '∨', desc: '논리합 (OR Gate)', ai: '최대 8개의 디지털 입력에 대한 논리 OR 연산을 수행하는 블록. 하나라도 TRUE(1)이면 OUT이 TRUE(1)가 된다. DCS에서 여러 트립 조건 중 하나라도 발생하면 인터락을 발동시킬 때 사용된다.', ports: [{name:'IN1',direction:'input',desc:'디지털 입력 1'},{name:'IN2',direction:'input',desc:'디지털 입력 2'},{name:'OUT',direction:'output',desc:'디지털 출력'}] },
    'N': { id: 'N', name: 'N', category: 'logic', symbol: '¬', desc: '논리 반전 (NOT)', ai: 'N 블록은 입력 신호를 반전시킵니다. TRUE→FALSE, FALSE→TRUE로 변환합니다. DCS에서 MODE 상태를 반전하여 AND 조건에 입력하는 등 조건 반전에 사용된다.', ports: [{name:'IN1',direction:'input'},{name:'OUT',direction:'output'}] },
    'NOT': { id: 'NOT', name: 'NOT', category: 'logic', symbol: '¬', desc: '논리 반전 (NOT)', ai: 'NOT 블록은 N 블록과 동일. 입력 신호를 반전시킵니다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'XOR': { id: 'XOR', name: 'XOR', category: 'logic', symbol: '⊕', desc: '배타적 논리합 (XOR)', ai: '2입력 배타적 OR 게이트 블록. 두 디지털 입력이 서로 다를 때 출력이 TRUE(1), 같을 때 FALSE(0)가 된다.', ports: [{name:'IN1',direction:'input',desc:'디지털 입력 1'},{name:'IN2',direction:'input',desc:'디지털 입력 2'},{name:'OUT',direction:'output',desc:'디지털 출력'}] },
    'NAND': { id: 'NAND', name: 'NAND', category: 'logic', symbol: '⊼', desc: 'NOT AND', ai: 'AND의 반전. 모든 입력이 TRUE일 때만 FALSE를 출력한다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'NOR': { id: 'NOR', name: 'NOR', category: 'logic', symbol: '⊽', desc: 'NOT OR', ai: 'OR의 반전. 모든 입력이 FALSE일 때만 TRUE를 출력한다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'T': { id: 'T', name: 'T', category: 'logic', symbol: 'T', desc: '조건 분기 (Transfer)', ai: 'T 블록은 DCS 제어 로직의 핵심 분기 블록이다. FLAG가 TRUE이면 YES 입력값을, FALSE이면 NO 입력값을 OUT으로 전달한다. YES와 NO는 상류 블록의 OUT에서 값을 받는 입력 포트이며, OUT은 하류 블록(PID.STPT, 다음 T.NO, 최종출력.IN1 등)으로 연결된다. 여러 T블록이 체인으로 연결되어 다단계 조건 분기를 구성한다(T1.OUT→T2.NO→T2.OUT→...). FLAG에는 인터락 조건(외부참조 REF_SIGNAL 또는 OR/AND 출력)이 연결된다.', ports: [{name:'FLAG',direction:'input',desc:'조건 입력 (TRUE→YES, FALSE→NO)'},{name:'YES',direction:'input',desc:'참 경로 값 입력 (상류 블록.OUT에서 받음)'},{name:'NO',direction:'input',desc:'거짓 경로 값 입력 (상류 블록.OUT에서 받음)'},{name:'OUT',direction:'output',desc:'결과 출력 (FLAG 조건에 따라 YES 또는 NO 값 전달)'}] },
    'SEL': { id: 'SEL', name: 'SEL', category: 'logic', symbol: '⇌', desc: '선택 (Selector)', ai: 'SEL 블록은 G(Gate) 입력 조건에 따라 IN0 또는 IN1 중 하나를 선택하여 출력한다. T 블록과 유사하지만 아날로그 값 선택에 사용된다.', ports: [{name:'G',direction:'input'},{name:'IN0',direction:'input'},{name:'IN1',direction:'input'},{name:'OUT',direction:'output'}] },
    'SR': { id: 'SR', name: 'SR', category: 'logic', symbol: 'S', desc: 'Set-Reset 래치', ai: 'SR 블록은 Set 우선 플립플롭. S=TRUE면 출력 TRUE(래치), R=TRUE면 출력 FALSE(리셋). DCS에서 경보 래칭 등에 사용된다.', ports: [{name:'S',direction:'input'},{name:'R',direction:'input'},{name:'Q',direction:'output'}] },
    'RS': { id: 'RS', name: 'RS', category: 'logic', symbol: 'R', desc: 'Reset-Set 래치', ai: 'RS 블록은 Reset 우선 플립플롭. R=TRUE면 출력 FALSE(리셋 우선), S=TRUE면 출력 TRUE.', ports: [{name:'R',direction:'input'},{name:'S',direction:'input'},{name:'Q',direction:'output'}] },

    // === 수학 블록 (Math) ===
    'SUM': { id: 'SUM', name: 'SUM', category: 'math', symbol: '∑', desc: '덧셈 (Sum)', ai: '최대 8개 아날로그 입력의 합계를 계산한다. 보정값 합산이나 다중 신호 합계에 사용된다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'ADD': { id: 'ADD', name: 'ADD', category: 'math', symbol: '+', desc: '덧셈 (Addition)', ai: 'IN1 + IN2를 계산한다. 바이어스 추가 등에 사용된다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'SUB': { id: 'SUB', name: 'SUB', category: 'math', symbol: '−', desc: '뺄셈 (Subtraction)', ai: 'IN1 - IN2를 계산한다. 편차 계산, 차압 계산 등에 사용된다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'X': { id: 'X', name: 'X', category: 'math', symbol: '×', desc: '곱셈 (Multiply)', ai: 'IN1 * IN2를 계산한다. 스케일링, 게인 적용, 열량 환산 등에 사용된다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'MUL': { id: 'MUL', name: 'MUL', category: 'math', symbol: '×', desc: '곱셈 (Multiply)', ai: 'X 블록과 동일. IN1 * IN2를 계산한다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'DIV': { id: 'DIV', name: 'DIV', category: 'math', symbol: '÷', desc: '나눗셈 (Division)', ai: 'NUM(분자) / DEN(분모)를 계산한다. 비율 제어, 열효율 계산 등에 사용된다. DEN=0 시 출력을 제한한다.', ports: [{name:'NUM',direction:'input',desc:'분자'},{name:'DEN',direction:'input',desc:'분모'},{name:'OUT',direction:'output'}] },
    'K': { id: 'K', name: 'K', category: 'math', symbol: 'K', desc: '상수 (Constant)', ai: 'K 블록은 설정된 상수값을 출력합니다. 고정 설정값이나 게인값 입력에 사용됩니다.', ports: [{name:'OUT',direction:'output'}] },
    'ABS': { id: 'ABS', name: 'ABS', category: 'math', symbol: '|x|', desc: '절대값 (Absolute)', ai: '입력의 절대값을 출력한다. 편차의 크기만 비교하거나, 차압의 절대값을 구할 때 사용된다.', ports: [{name:'IN1',direction:'input'},{name:'OUT',direction:'output'}] },
    'SQRT': { id: 'SQRT', name: 'SQRT', category: 'math', symbol: '√', desc: '제곱근 (Square Root)', ai: '입력의 제곱근을 계산한다. 차압식 유량계에서 유량=√(차압) 계산에 필수적으로 사용된다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'LIM': { id: 'LIM', name: 'LIM', category: 'math', symbol: '⊥', desc: '리미터 (Limiter)', ai: '입력값을 HI(상한)/LO(하한) 범위 내로 제한한다. 제어 출력이 안전 범위를 벗어나지 않도록 보호한다.', ports: [{name:'IN',direction:'input'},{name:'HI',direction:'input'},{name:'LO',direction:'input'},{name:'OUT',direction:'output'}] },
    'SCALE': { id: 'SCALE', name: 'SCALE', category: 'math', symbol: '↔', desc: '스케일 변환', ai: '입력을 지정된 범위로 스케일링(선형 변환)한다. 센서 레인지 변환, 단위 환산 등에 사용된다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'RATIO': { id: 'RATIO', name: 'RATIO', category: 'math', symbol: ':', desc: '비율 계산', ai: 'RATIO 블록은 두 입력의 비율을 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'AVG': { id: 'AVG', name: 'AVG', category: 'math', symbol: 'x̄', desc: '평균 (Average)', ai: 'AVG 블록은 입력들의 평균값을 계산합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'MAX': { id: 'MAX', name: 'MAX', category: 'math', symbol: '↑', desc: '최대값 (Maximum)', ai: 'MAX 블록은 입력들 중 최대값을 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'MIN': { id: 'MIN', name: 'MIN', category: 'math', symbol: '↓', desc: '최소값 (Minimum)', ai: 'MIN 블록은 입력들 중 최소값을 출력합니다.', ports: [{name:'IN1',direction:'input'},{name:'IN2',direction:'input'},{name:'OUT',direction:'output'}] },
    'F(X)': { id: 'F(X)', name: 'F(X)', category: 'math', symbol: 'ƒ', desc: '사용자 함수', ai: '사용자 정의 함수 블록. 비선형 보정 곡선, 온도-압력 보상 테이블 등을 구현할 때 사용한다. 최대 20개의 X-Y 포인트로 구간 선형 보간을 수행한다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },

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
    'PID': { id: 'PID', name: 'PID', category: 'control', symbol: 'P', desc: 'PID 제어', ai: 'PID 블록은 PV(현재 측정값)와 STPT(목표 설정값)의 편차를 줄이는 비례(P)·적분(I)·미분(D) 제어 출력을 생성한다. DCS 제어 루프의 핵심 블록으로, 센서(SIGNAL)→PID.PV, T블록체인→PID.STPT, PID.OUT→ALG(M/A/C).IN1 순으로 연결된다. 내부 파라미터(PGAIN, INTG, DGAIN 등)로 제어 특성을 튜닝한다.', ports: [{name:'PV',direction:'input',desc:'현재값 입력 (Process Variable, 센서에서 받음)'},{name:'STPT',direction:'input',desc:'목표값 입력 (Set Point, T블록.OUT에서 받음)'},{name:'OUT',direction:'output',desc:'제어 출력 (ALG/M/A/C.IN1으로 보냄)'}] },
    'LAG': { id: 'LAG', name: 'LAG', category: 'control', symbol: 'τ', desc: '1차 지연 (Lag Filter)', ai: 'LAG 블록은 입력 신호에 1차 지연(저역 통과 필터)을 적용한다. 센서 노이즈 필터링에 사용된다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'LEAD': { id: 'LEAD', name: 'LEAD', category: 'control', symbol: 'λ', desc: '리드 필터 (Lead Filter)', ai: 'LEAD 블록은 입력 신호에 리드 필터를 적용하여 응답 속도를 높인다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'INTEG': { id: 'INTEG', name: 'INTEG', category: 'control', symbol: '∫', desc: '적분 (Integrator)', ai: 'INTEG 블록은 입력 신호를 시간에 대해 적분한다. 누적 유량 등에 사용된다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'DERIV': { id: 'DERIV', name: 'DERIV', category: 'control', symbol: 'δ', desc: '미분 (Derivative)', ai: 'DERIV 블록은 입력 신호의 변화율(미분)을 계산한다. 급격한 변화 감지에 사용된다.', ports: [{name:'IN',direction:'input'},{name:'OUT',direction:'output'}] },
    'RAMP': { id: 'RAMP', name: 'RAMP', category: 'control', symbol: '⟋', desc: '램프 (Ramp)', ai: 'RAMP 블록은 출력을 설정된 속도(RATE)로 목표값까지 점진적으로 변화시킨다. 급격한 출력 변화 방지에 사용된다.', ports: [{name:'IN',direction:'input'},{name:'RATE',direction:'input'},{name:'OUT',direction:'output'}] },
    'M/A': { id: 'M/A', name: 'M/A', category: 'control', symbol: '⇆', desc: '수동/자동 전환 (M/A/C 스테이션)', ai: 'M/A/C(Manual/Auto/Cascade) 스테이션 블록. 운전원이 수동/자동 모드를 전환한다. PID.OUT→M/A.IN1으로 자동 제어값을 받고, MODE 블록과 연동하여 운전 모드를 결정한다. OUT→T블록.NO로 출력하고, 내부적으로 OUT→I 피드백(적분기)이 있다. MODE 포트로 MAMODE 블록과 연결된다.', ports: [{name:'IN1',direction:'input',desc:'자동 제어 입력 (PID.OUT에서 받음)'},{name:'MODE',direction:'input',desc:'운전 모드 (MAMODE 블록에서 받음)'},{name:'OUT',direction:'output',desc:'최종 출력 (T블록.NO로 보냄)'}] },
    'M/A/C': { id: 'M/A/C', name: 'M/A/C', category: 'control', symbol: '⇆', desc: '수동/자동/캐스케이드 스테이션', ai: 'M/A 블록과 동일. PID.OUT→IN1, MODE블록→MODE, OUT→T블록.NO. 내부에 OUT→I 자기피드백(적분기)이 있다.', ports: [{name:'IN1',direction:'input',desc:'자동 제어 입력'},{name:'MODE',direction:'input',desc:'운전 모드'},{name:'OUT',direction:'output',desc:'최종 출력'}] },
    'MODE': { id: 'MODE', name: 'MODE', category: 'control', symbol: '⇆', desc: '모드 선택 (MAMODE)', ai: 'MAMODE(Manual/Auto Mode) 블록. 운전 모드 상태를 논리 제어에 전달한다. AUTO→AND.IN2로 자동운전 조건을 제공하고, MODE→ALG(M/A/C).MODE로 운전 모드를 전달한다. MRE(수동거부)/ARE(자동거부)에 외부참조 신호가 연결된다.', ports: [{name:'AUTO',direction:'output',desc:'자동 모드 출력 (AND.IN2로 보냄)'},{name:'MODE',direction:'output',desc:'모드 출력 (ALG.MODE로 보냄)'},{name:'MRE',direction:'output',desc:'수동 거부 (외부참조에서 받음)'},{name:'ARE',direction:'output',desc:'자동 거부 (외부참조에서 받음)'},{name:'IN',direction:'input',desc:'입력'},{name:'OUT',direction:'output',desc:'출력'}] },

    // === 타이머/카운터 블록 (Timer) ===
    'TON': { id: 'TON', name: 'TON', category: 'timer', symbol: '⏱', desc: 'ON 지연 타이머', ai: '입력이 TRUE가 된 후 PT(설정시간) 경과 시 Q=TRUE 출력. 순간적 노이즈를 무시하고 지속적 조건만 감지할 때 사용. ET는 경과 시간 출력.', ports: [{name:'IN',direction:'input'},{name:'PT',direction:'input',desc:'설정 시간'},{name:'Q',direction:'output',desc:'지연된 출력'},{name:'ET',direction:'output',desc:'경과 시간'}] },
    'TOF': { id: 'TOF', name: 'TOF', category: 'timer', symbol: '⏲', desc: 'OFF 지연 타이머', ai: '입력이 FALSE가 된 후 PT(설정시간) 경과 시 Q=FALSE 출력. 순간 복귀를 무시하고 확실한 해제만 허용할 때 사용.', ports: [{name:'IN',direction:'input'},{name:'PT',direction:'input',desc:'설정 시간'},{name:'Q',direction:'output'},{name:'ET',direction:'output',desc:'경과 시간'}] },
    'TP': { id: 'TP', name: 'TP', category: 'timer', symbol: '⎍', desc: '펄스 타이머', ai: '입력 상승 에지에서 PT(설정시간) 동안 Q=TRUE 펄스를 출력. 일정 시간 동작 명령(밸브 개방 등)에 사용.', ports: [{name:'IN',direction:'input'},{name:'PT',direction:'input',desc:'펄스 시간'},{name:'Q',direction:'output'},{name:'ET',direction:'output',desc:'경과 시간'}] },
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

    const saved = localStorage.getItem('blockDictionary_v4');
    btBlockData = saved ? JSON.parse(saved) : { ...btDefaultBlocks };

    // Ovation 매뉴얼 심볼 머지 대기
    await mergeOvationSymbols();

    // 머지 후 localStorage에서 다시 로드 (diagramDesc 등 새 필드 반영)
    const refreshed = localStorage.getItem('blockDictionary_v4');
    if (refreshed) btBlockData = JSON.parse(refreshed);

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

function btSave() { localStorage.setItem('blockDictionary_v4', JSON.stringify(btBlockData)); }

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
        if (btCurrentCat === 'core') { if (!b.core) return false; }
        else if (btCurrentCat !== 'all' && b.category !== btCurrentCat) return false;
        if (search && !b.id.toLowerCase().includes(search) && !(b.name||'').toLowerCase().includes(search) && !(b.desc||'').toLowerCase().includes(search)) return false;
        return true;
    }).sort((a, b) => {
        // core 우선, 그 다음 인스턴스 수
        if (a.core !== b.core) return a.core ? -1 : 1;
        return (b.instances?.length || 0) - (a.instances?.length || 0);
    });

    const catColors = {
        control: '#e94560', arithmetic: '#ff9800', logic: '#4fc3f7', selector: '#a78bfa',
        limiter: '#f0a050', monitor: '#10b981', digital: '#38bdf8', sequencer: '#c084fc',
        io: '#8b95a5', steam: '#fb923c', other: '#9ca3af', math: '#ff9800', unknown: '#6b7280'
    };
    list.innerHTML = filtered.map(b => {
        const count = b.instances?.length || 0;
        const hasAI = b.ai && b.ai.length > 10;
        const statusClass = hasAI ? 'bt-status-complete' : (b.desc ? 'bt-status-partial' : 'bt-status-empty');
        const cc = catColors[b.category] || '#6b7280';
        const isCore = b.core;
        return `
            <div class="bt-block-item ${btSelectedBlock === b.id ? 'active' : ''}" onclick="btSelectBlock('${b.id}')" style="${isCore ? 'border-left:2px solid ' + cc + ';' : ''}">
                <div style="width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; background:${cc}22; color:${cc}; flex-shrink:0;">${b.id.slice(0, 3)}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isCore ? '★ ' : ''}${b.id}</div>
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
    // 별칭 심볼 데이터 병합 (T→TRANSFER 등)
    const _SYM_ALIASES = { 'T': 'TRANSFER', 'N': 'NOT', 'M/A': 'MASTATION', 'M/A/C': 'MASTATION', 'MODE': 'MAMODE' };
    if (b && _SYM_ALIASES[b.id] && btBlockData[_SYM_ALIASES[b.id]]) {
        const alias = btBlockData[_SYM_ALIASES[b.id]];
        if (alias.fullDesc && !b.fullDesc) b.fullDesc = alias.fullDesc;
        if (alias.detailFull && !b.detailFull) b.detailFull = alias.detailFull;
        if (alias.diagramDesc && !b.diagramDesc) b.diagramDesc = alias.diagramDesc;
        if (alias.ports && alias.ports.length > (b.ports || []).length) b.ports = alias.ports;
        if (alias.section) b.section = alias.section;
        if (alias.pdfPages) b.pdfPages = alias.pdfPages;
    }
    if (!b) {
        content.innerHTML = '<div class="bt-empty-state"><div style="font-size:48px; margin-bottom:16px;">📦</div><div>왼쪽에서 블록을 선택하세요</div></div>';
        return;
    }

    // Ovation 포트 데이터 우선 적용 (한글 번역 반영)
    // 별칭 매핑: 도면 스캔 ID → Ovation 심볼 ID
    const _SYM_ALIASES = { 'T': 'TRANSFER', 'N': 'NOT', 'M/A': 'MASTATION', 'M/A/C': 'MASTATION', 'MODE': 'MAMODE' };
    const ovKey = _SYM_ALIASES[b.id] || b.id;
    const ov0 = ovationSymbols && (ovationSymbols[ovKey] || ovationSymbols[b.id]) ? (ovationSymbols[ovKey] || ovationSymbols[b.id]) : {};
    if (ov0.ports && ov0.ports.length) {
        b.ports = ov0.ports;
        console.log('[DEBUG] Ovation 포트 적용:', b.id, '포트수:', ov0.ports.length, '첫포트:', ov0.ports[0]?.description);
    } else {
        console.log('[DEBUG] Ovation 포트 없음:', b.id, 'ovationSymbols 존재:', !!ovationSymbols, 'ov0:', Object.keys(ov0).length);
    }

    const ports = b.ports || [];
    const inputs = ports.filter(p => p.direction === 'input');
    const outputs = ports.filter(p => p.direction === 'output');

    // 접기/펼치기 헬퍼
    const collapseSection = (id, title, color, content, defaultOpen = false) => {
        if (!content) return '';
        return `<div style="margin-bottom:8px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; overflow:hidden;">
            <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none'?'block':'none'; this.querySelector('.bt-arrow').textContent = this.nextElementSibling.style.display==='none'?'▶':'▼';"
                 style="padding:10px 14px; background:rgba(255,255,255,0.03); cursor:pointer; display:flex; align-items:center; gap:8px; user-select:none;">
                <span class="bt-arrow" style="font-size:9px; color:rgba(255,255,255,0.4);">${defaultOpen ? '▼' : '▶'}</span>
                <span style="font-size:11px; font-weight:600; color:${color};">${title}</span>
            </div>
            <div style="display:${defaultOpen ? 'block' : 'none'}; padding:12px 14px; position:relative;">
                ${content}
                <button onclick="const sec=this.closest('div[style*=padding]'); sec.style.display='none'; sec.previousElementSibling.querySelector('.bt-arrow').textContent='▶';"
                    style="position:sticky; bottom:8px; float:right; width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.2); background:rgba(30,30,30,0.9); color:rgba(255,255,255,0.6); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; backdrop-filter:blur(8px); box-shadow:0 2px 8px rgba(0,0,0,0.3); z-index:10; margin-top:8px;"
                    onmouseenter="this.style.background='rgba(79,195,247,0.3)'; this.style.color='#fff'; this.style.borderColor='#4fc3f7';"
                    onmouseleave="this.style.background='rgba(30,30,30,0.9)'; this.style.color='rgba(255,255,255,0.6)'; this.style.borderColor='rgba(255,255,255,0.2)';"
                    title="접기">✕</button>
            </div>
        </div>`;
    };

    // 포트를 실제 연결 포트(Variable)와 파라미터(R/S/X/LU)로 분리
    const isConnectionPort = (p) => {
        const t = (p.type || '').toUpperCase();
        return t.includes('VARIABLE') || t === '' || t === 'LA' || t === 'LD' || t === 'LP';
    };
    const connPorts = ports.filter(p => isConnectionPort(p));
    const connInputs = connPorts.filter(p => p.direction === 'input');
    const connOutputs = connPorts.filter(p => p.direction === 'output');
    const paramPorts = ports.filter(p => !isConnectionPort(p));

    // 연결 포트 HTML (설명 앞에 표시)
    let connPortsHtml = '';
    if (connPorts.length) {
        connPortsHtml = '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px;">';
        connPortsHtml += connInputs.map(p =>
            `<span style="padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(79,195,247,0.1); color:#4fc3f7; border:1px solid rgba(79,195,247,0.2);" title="${p.description || ''}">${p.name}</span>`
        ).join('');
        connPortsHtml += connOutputs.map(p =>
            `<span style="padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(255,152,0,0.1); color:#ff9800; border:1px solid rgba(255,152,0,0.2);" title="${p.description || ''}">${p.name}</span>`
        ).join('');
        connPortsHtml += '</div>';
    }

    // 파라미터 + 설정옵션 통합 HTML
    let paramsHtml = '';
    if (paramPorts.length || (b.settings && b.settings.length)) {
        let items = '';
        // 튜닝 파라미터
        for (const p of paramPorts) {
            items += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:4px 8px; font-weight:600; color:#e0e0e0; white-space:nowrap;">${p.name}</td>
                <td style="padding:4px 8px; font-size:10px; color:rgba(255,255,255,0.35);">${p.type || ''}</td>
                <td style="padding:4px 8px; font-size:10px; color:#ffb74d;">${p.default !== null && p.default !== undefined ? p.default : ''}</td>
                <td style="padding:4px 8px; font-size:10px; color:rgba(255,255,255,0.5);">${(p.description || '').slice(0, 50)}</td>
            </tr>`;
        }
        // 설정 옵션
        if (b.settings) {
            for (const s of b.settings) {
                items += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                    <td style="padding:4px 8px; font-weight:600; color:#c4b5fd;">${s.name}</td>
                    <td style="padding:4px 8px; font-size:10px; color:rgba(255,255,255,0.35);">설정</td>
                    <td style="padding:4px 8px; font-size:10px; color:#ffb74d;">${s.default || ''}</td>
                    <td style="padding:4px 8px; font-size:10px; color:rgba(255,255,255,0.5);">${(s.options || []).join(' / ')}${s.description ? ' — ' + s.description.slice(0, 40) : ''}</td>
                </tr>`;
            }
        }
        paramsHtml = `<table style="width:100%; border-collapse:collapse; font-size:11px;">
            <tr style="background:rgba(255,255,255,0.04);"><th style="padding:5px 8px; text-align:left; font-size:10px; color:rgba(255,255,255,0.4);">이름</th><th style="padding:5px 8px; text-align:left; font-size:10px; color:rgba(255,255,255,0.4);">타입</th><th style="padding:5px 8px; text-align:left; font-size:10px; color:rgba(255,255,255,0.4);">기본값</th><th style="padding:5px 8px; text-align:left; font-size:10px; color:rgba(255,255,255,0.4);">설명</th></tr>
            ${items}
        </table>`;
    }

    // 기존 변수 유지 (하위 호환)
    let portsHtml = connPortsHtml;
    let settingsHtml = paramsHtml;

    // 설정 옵션 HTML (기존 - 사용 안 함)
    if (false && b.settings && b.settings.length) {
        settingsHtml = b.settings.map(s => `<div style="padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:6px; border-left:3px solid #a78bfa; margin-bottom:4px;">
            <div style="font-size:11px; font-weight:600; color:#c4b5fd;">${s.name}: ${(s.options||[]).join(' / ')}</div>
            ${s.description ? `<div style="font-size:10px; color:rgba(255,255,255,0.4); margin-top:2px;">${s.description}</div>` : ''}
        </div>`).join('');
    }

    // 가이드라인 HTML
    let guidelinesHtml = '';
    if (b.guidelines && b.guidelines.length) {
        guidelinesHtml = `<ul style="margin:0; padding-left:16px;">${b.guidelines.map(g => `<li style="font-size:11px; color:rgba(255,255,255,0.6); margin-bottom:4px; line-height:1.4;">${g}</li>`).join('')}</ul>`;
    }

    const catColors2 = {
        control: '#e94560', arithmetic: '#ff9800', logic: '#4fc3f7', selector: '#a78bfa',
        limiter: '#f0a050', monitor: '#10b981', digital: '#38bdf8', sequencer: '#c084fc',
        io: '#8b95a5', steam: '#fb923c', other: '#9ca3af', math: '#ff9800', unknown: '#6b7280'
    };
    const cc2 = catColors2[b.category] || '#6b7280';

    content.innerHTML = `
        <div class="bt-detail-card">
            <!-- 헤더 -->
            <div class="bt-detail-header" style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:${cc2}22; color:${cc2}; flex-shrink:0;">${b.id.slice(0, 3)}</div>
                    <div>
                        <div style="font-size:18px; font-weight:700; color:#fff;">${b.core ? '★ ' : ''}${b.name || b.id}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.4);">${btCatNames[b.category] || '미분류'}${b.instances?.length ? ` · ${b.instances.length}개 인스턴스` : ''}${b.pdfPages && b.pdfPages[0] ? ` · 매뉴얼 ${b.section || ''} p.${b.pdfPages[0]}~${b.pdfPages[1]}` : ''}</div>
                    </div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="bt-edit-btn" onclick="btEditBlock('${b.id}')">편집</button>
                    <button class="bt-edit-btn" onclick="btQuickDelete('${b.id}')" style="color:#f87171;">삭제</button>
                </div>
            </div>
            <div style="padding:20px 20px 32px 20px;">

                <!-- 통합 설명 박스 — 항상 보임 -->
                ${(() => {
                    const ovk = _SYM_ALIASES[b.id] || b.id;
                    const ov = ovationSymbols && (ovationSymbols[ovk] || ovationSymbols[b.id]) ? (ovationSymbols[ovk] || ovationSymbols[b.id]) : {};
                    if (ov.fullDesc) b.fullDesc = ov.fullDesc;
                    if (ov.detailFull) b.detailFull = ov.detailFull;
                    if (ov.diagramDesc) b.diagramDesc = ov.diagramDesc;
                    if (ov.ports && ov.ports.length) b.ports = ov.ports;
                    return '';
                })()}
                <!-- 연결 포트 (설명 앞에 표시) -->
                ${connPortsHtml ? `<div style="margin-bottom:12px;">${connPortsHtml}</div>` : ''}

                <!-- 통합 설명 -->
                <div style="padding:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:12px;">
                    <div style="font-size:13px; color:rgba(255,255,255,0.85); line-height:1.8;">${(b.fullDesc || b.ai || b.desc || '(설명 없음)').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</div>
                </div>

                <!-- 접기/펼치기: 상세 설명 (PDF 원본 번역) -->
                ${collapseSection('detailFull', '상세 설명', '#a78bfa',
                    b.detailFull ? `<div style="font-size:12px; color:rgba(255,255,255,0.75); line-height:1.8;">${b.detailFull.includes('<svg') || b.detailFull.includes('<table') ? b.detailFull : b.detailFull.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</div>`
                    : (b.diagramDesc ? `<div style="font-size:12px; color:rgba(255,255,255,0.75); line-height:1.8;">${b.diagramDesc.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</div>` : ''), false)}

                <!-- 접기/펼치기: 매뉴얼 원본 다이어그램 (전체 페이지) -->
                ${(() => {
                    const pages = b.pdfPages ? (b.pdfPages[1] - b.pdfPages[0] + 1) : 1;
                    let imgs = `<img src="data/symbol_images/${b.id}.png" style="width:100%; border-radius:6px; background:#fff; margin-bottom:8px;" onerror="this.style.display='none'">`;
                    if (pages > 1) {
                        for (let i = 1; i <= pages; i++) {
                            imgs += `<img src="data/symbol_images/${b.id}_p${i}.png" style="width:100%; border-radius:6px; background:#fff; margin-bottom:8px;" onerror="this.style.display='none'">`;
                        }
                    }
                    return collapseSection('diagram', `매뉴얼 원본 (${pages}페이지)`, '#fb923c', `<div>${imgs}</div>`, false);
                })()}

                <!-- 접기/펼치기: 파라미터 및 설정 -->
                ${paramsHtml ? collapseSection('params', `파라미터 및 설정 (${paramPorts.length + (b.settings||[]).length})`, '#a78bfa', paramsHtml, false) : ''}
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
    localStorage.removeItem('blockDictionary_v4');
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
        const block = {
            name: b.name, category: b.category, description: b.desc,
            ports: b.ports || [], aiReference: b.ai || '',
            instanceCount: b.instances?.length || 0
        };
        // Ovation 매뉴얼 상세 정보 포함
        if (b.formula) block.formula = b.formula;
        if (b.detail) block.detail = b.detail;
        if (b.settings && b.settings.length > 0) block.settings = b.settings;
        if (b.guidelines && b.guidelines.length > 0) block.guidelines = b.guidelines;
        if (b.section) block.manualSection = b.section;
        aiRef.blocks[id] = block;
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
    // drawingNum: "056" 또는 "511"
    let pages = null;

    // 1. supabaseDrawings에서 찾기
    if (supabaseDrawings[drawingNum]) {
        const info = supabaseDrawings[drawingNum].info;
        pages = info.pages || [info.first_page];
    }
    // 2. drawingIndex (drawing_index.json)에서 찾기
    if (!pages && drawingIndex[drawingNum]) {
        pages = drawingIndex[drawingNum].pages || [];
    }

    if (pages && pages.length > 0) {
        pendingTagHighlight = tagName || null;
        const searchInput = document.getElementById('tag-search-input');
        if (searchInput) { closeTagSearchResults(); searchInput.blur(); }

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
        showToast(`도면 ${drawingNum}을(를) 찾을 수 없습니다`, 'warning');
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
    // 포트에서 신호 설명 추출 — 도면번호(3/524), 단일문자(G) 등은 제외
    const isSkip = (t) => /^\d+\/\d+$/.test(t) || t.length <= 1;
    for (const p of groupPorts) {
        const text = (p.name || p.text || '').trim();
        if (!isSkip(text) && text.length > 3 && text.includes(' ')) {
            return text; // "DH RTN WTR Gcal/H" 같은 설명 우선
        }
    }
    for (const p of groupPorts) {
        const text = (p.name || p.text || '').trim();
        if (!isSkip(text) && text.length > 2) {
            return text;
        }
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

    // groupsData의 모든 블록을 스캔 (템플릿으로 묶인 블록 전부 포함)
    for (const [groupName, groupData] of Object.entries(groupsData)) {
        const gPorts = groupData.ports || [];
        const nameUpper = groupName.toUpperCase();

        let category = '';
        let autoDesc = '';
        let type = groupData.type || 'OTHER';

        // ── 타입/카테고리 분류 ──────────────────────────────────────────
        if (type === 'SIGNAL' || (nameUpper.match(/^[A-Z]{2,3}\d{3,}/) && !nameUpper.startsWith('OCB') && !nameUpper.startsWith('ALG') && !nameUpper.startsWith('D0'))) {
            // 계기 태그 (ISA 형식: FIC1234, TIC_511_A 등)
            category = 'PORT';
            type = 'SIGNAL';
            autoDesc = extractSignalDescription(gPorts);

        } else if (type === 'REF_SIGNAL' || nameUpper.match(/^D\d{2}-\d{3}-\d{2}/)) {
            // 도면 간 참조 신호 (D03-511-05 등)
            category = '참조신호';
            type = 'REF_SIGNAL';
            const refDrw = extractRefSignalPageNumber(groupName);
            const refSigDesc = extractSignalDescription(gPorts);
            autoDesc = refSigDesc ? `${refDrw} — ${refSigDesc}` : refDrw;

        } else if (nameUpper.startsWith('ALG')) {
            // Ovation 알고리즘 블록 (PID, Transfer 등)
            category = 'ALG 블록';
            type = 'ALG_BLOCK';
            autoDesc = gPorts.length > 0 ? inferBlockCategory(groupName, gPorts) : '';

        } else if (nameUpper.startsWith('OCB')) {
            // Ovation 제어 블록
            category = 'OCB 블록';
            type = 'OCB_BLOCK';
            autoDesc = gPorts.length > 0 ? inferBlockCategory(groupName, gPorts) : '';

        } else if (/^[A-Z]_\d+_\d+$/i.test(groupName)) {
            // Ovation 내부 인스턴스 (N_1813_2211, T_xxx_xxx 등) — 첫 글자가 블록 타입
            if (gPorts.length === 0) continue;
            const abbrevType = groupName.split('_')[0].toUpperCase();
            const ABBREV_MAP = { N:'NOT', H:'H값 선택', L:'L값 선택', T:'Transfer', K:'Gain/Bias', X:'Multiply', AND:'AND', OR:'OR' };
            type = 'OCB_BLOCK';
            category = 'OCB 내부';
            autoDesc = ABBREV_MAP[abbrevType] || abbrevType;

        } else if (/^MODE_\d+/i.test(groupName) || /^MA_\d+/i.test(groupName) ||
                   /^MAMODE:/i.test(groupName) || nameUpper === 'MA') {
            // Ovation M/A 스테이션 (MAMODE:018, MODE_xxx 등 — 포트 없어도 포함)
            // "M/A" 단순 라벨은 제외 → 기타로 처리
            type = 'OCB_BLOCK';
            category = 'M/A 스테이션';
            autoDesc = 'M/A 스테이션';

        } else {
            // 기타 블록 (AND, OR, NOT, 라벨 등) — 포트가 있어야 포함
            if (gPorts.length === 0) continue;
            type = groupData.type || 'BLOCK_TYPE';
            const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[nameUpper] || blockDictionary[groupName] : null;
            if (dictEntry) {
                category = '로직 블록';
                autoDesc = dictEntry.desc || groupName;
            } else {
                category = '기타';
                autoDesc = inferBlockCategory(groupName, gPorts) || groupName;
            }
        }

        const scanInfo = scanDescriptions[groupName];
        const userDesc = scanInfo ? (typeof scanInfo === 'string' ? scanInfo : (scanInfo.equipment || '')) : '';

        // portDict 신호 정보 가져오기
        const _pdPre = (typeof portDict !== 'undefined') ? (portDict[groupName] || {}) : {};

        // blockDictionary 포트 집합 매칭으로 심볼 타입 추론
        let blockType = null, blockDesc = '', blockCategory = '';
        const isAlgBlock = type === 'ALG_BLOCK';

        if (isAlgBlock) {
            // ALG 블록: blockDictionary 매칭 먼저 시도
            const algTypeInfo = typeof identifyBlockType === 'function' ? identifyBlockType(groupName, gPorts, '') : null;
            if (algTypeInfo && algTypeInfo.type && algTypeInfo.type !== 'UNKNOWN') {
                blockType = algTypeInfo.type;
                blockDesc = algTypeInfo.description || '';
                blockCategory = algTypeInfo.category || '';
                if (blockDesc) autoDesc = blockDesc;
            } else if (gPorts.length > 0) {
                // 포트 패턴 휴리스틱
                const gPortSet = new Set(gPorts.map(p => (p.name || p.text || '').toUpperCase()));
                if (gPortSet.has('FLAG') || (gPortSet.has('NO') && gPortSet.has('YES'))) {
                    blockType = 'T';   // Transfer 블록
                } else if ((gPortSet.has('STPT') || gPortSet.has('SP')) && gPortSet.has('PV')) {
                    blockType = 'PID'; // PID 포트 패턴 확인됨
                }
                // 그 외는 blockType null (알 수 없음 — PID 단정 금지)
            }
        }
        if (!isAlgBlock && typeof identifyBlockType === 'function' && (type === 'OCB_BLOCK' || type === 'BLOCK_TYPE' || type === 'OTHER')) {
            if (gPorts.length > 0) {
                // 포트가 있으면 포트 집합 매칭
                const typeInfo = identifyBlockType(groupName, gPorts, '');
                if (typeInfo && typeInfo.type && typeInfo.type !== 'UNKNOWN') {
                    blockType = typeInfo.type;
                    blockDesc = typeInfo.description || '';
                    blockCategory = typeInfo.category || '';
                    if (blockDesc) autoDesc = blockDesc;
                }
            }
            // 포트 없어도 이름 기반 사전 조회 (M/A, AND, OR 등 이름 자체가 심볼명인 경우)
            if (!blockType && typeof blockDictionary !== 'undefined') {
                const dictEntry = blockDictionary[nameUpper] || blockDictionary[groupName] ||
                                  blockDictionary[nameUpper.replace('/', '')] || null;
                if (dictEntry) {
                    blockType = dictEntry.id || groupName;
                    blockDesc = dictEntry.desc || '';
                    blockCategory = dictEntry.category || '';
                    if (blockDesc) autoDesc = blockDesc;
                }
            }
        }

        // ctx.block_type(API 직접 분석)이 있으면 덮어쓰기
        {
            const _ctx = (typeof currentPageBlockContext !== 'undefined') ? (currentPageBlockContext[groupName] || {}) : {};
            if (_ctx.block_type && _ctx.block_type !== 'UNKNOWN') {
                blockType = _ctx.block_type;
                blockDesc = _ctx.block_desc || blockDesc;
                blockCategory = '';  // blockDictionary에서 다시 채움
            }
            if (blockType) {
                const _de = typeof blockDictionary !== 'undefined' ? blockDictionary[blockType] : null;
                if (_de) {
                    blockDesc     = blockDesc     || _de.desc     || '';
                    blockCategory = blockCategory || _de.category || '';
                }
                if (!autoDesc && blockDesc) autoDesc = blockDesc;
            }
        }
        // OCB/ALG 블록: autoDesc에서 심볼 ID 역추적 (PID 제어기 → "PID")
        if ((type === 'OCB_BLOCK' || type === 'ALG_BLOCK') && autoDesc && typeof blockDictionary !== 'undefined') {
            const autoSymMap = [
                [/PID/i, 'PID'], [/AND/i, 'AND'], [/\bOR\b/i, 'OR'],
                [/NOT\b|반전/i, 'N'], [/Transfer|조건 선택/i, 'T'],
                [/Gain|Bias|이득/i, 'K'], [/Multiply|곱/i, 'X'],
                [/최고값|High.*선택/i, 'H'], [/최저값|Low.*선택/i, 'L'],
                [/리미터|Limit/i, 'LIM'], [/나눗셈/i, 'DIV'],
                [/절대값/i, 'ABS'], [/합산/i, 'SUM'], [/M\/A/i, 'M/A'],
            ];
            for (const [re, symId] of autoSymMap) {
                if (re.test(autoDesc) && blockDictionary[symId]) {
                    blockType = symId;
                    const de = blockDictionary[symId];
                    blockDesc     = de.desc     || blockDesc;
                    blockCategory = de.category || blockCategory;
                    break;
                }
            }
        }

        // BLOCK_TYPE: 이름 자체가 심볼명인 경우 (AND, OR, NOT 등)
        if (!blockType && type === 'BLOCK_TYPE') {
            const dictEntry = typeof blockDictionary !== 'undefined' ? (blockDictionary[nameUpper] || blockDictionary[groupName]) : null;
            if (dictEntry) {
                blockType = dictEntry.id || groupName;
                blockDesc = dictEntry.desc || '';
                blockCategory = dictEntry.category || '';
                if (blockDesc) autoDesc = blockDesc;
            } else {
                blockType = groupName;
            }
        }

        // 크로스 레퍼런스 연동 (SIGNAL)
        let crossRef = [];
        if (type === 'SIGNAL' && typeof crossRefIndex !== 'undefined' && crossRefIndex) {
            crossRef = crossRefIndex.filter(r => r.tag.toUpperCase() === groupName.toUpperCase());
        }

        // REF_SIGNAL: portDict 역방향 검색 — 이 REF_SIGNAL 태그를 포트에 가진 블록 찾기
        let refConnections = [];
        if (type === 'REF_SIGNAL') {
            const _pd = (typeof portDict !== 'undefined') ? portDict : {};
            const nameUC = groupName.toUpperCase();
            for (const [bname, bdata] of Object.entries(_pd)) {
                // 새 portDict 구조: signals 키 사용
                const sigMap = bdata.signals || bdata.ports || {};
                for (const [tagOrPort, sinfo] of Object.entries(sigMap)) {
                    const tagKey = (sinfo.tag || tagOrPort).toUpperCase();
                    if (tagKey === nameUC) {
                        refConnections.push({
                            block: bname,
                            port: '',
                            direction: sinfo.direction || '',
                            equipment: sinfo.equipment || '',
                            tag_type: sinfo.tag_type || '',
                            drawing: bdata.drawing || ''
                        });
                        break;
                    }
                }
            }
            // customConnections에서도 추가 (분석-연결 탭 데이터)
            if (typeof customConnections !== 'undefined') {
                for (const conn of customConnections) {
                    const fp = (conn.fromParent || '').toUpperCase();
                    const tp = (conn.toParent || '').toUpperCase();
                    if (fp === nameUC) {
                        const existing = refConnections.find(r => r.block === (conn.toParent || conn.toName));
                        if (!existing) refConnections.push({ block: conn.toParent || '', port: (conn.toName || '').split('.').pop(), direction: 'output', source: 'conn' });
                    } else if (tp === nameUC) {
                        const existing = refConnections.find(r => r.block === (conn.fromParent || conn.fromName));
                        if (!existing) refConnections.push({ block: conn.fromParent || '', port: (conn.fromName || '').split('.').pop(), direction: 'input', source: 'conn' });
                    }
                }
            }
        }

        // ── 포트-신호 연결 구성 ────────────────────────────────────────────
        const pd      = (typeof portDict       !== 'undefined') ? portDict       : {};
        const tc      = (typeof tagContext     !== 'undefined') ? tagContext     : {};
        const ctx     = (typeof currentPageBlockContext !== 'undefined') ? (currentPageBlockContext[groupName] || {}) : {};
        const pdBlock = pd[groupName] || {};

        // portSignals: 루프 내 새로 초기화 (이전 블록 값 누적 방지)
        const portSignals = {};

        if (type === 'SIGNAL') {
            // ── SIGNAL: tagContext에서 계기 정보 직접 조회 ──
            const tcEntry = tc[groupName] || tc[groupName.toUpperCase()] || {};
            if (tcEntry.tag_type || tcEntry.equipment || tcEntry.primary_drawing) {
                portSignals['태그정보'] = {
                    direction:   '',
                    description: tcEntry.tag_type    || '',
                    tag:         groupName,
                    tag_type:    tcEntry.tag_type    || '',
                    equipment:   tcEntry.equipment   || '',
                    src_drawing: tcEntry.primary_drawing || '',
                    ref_drawing: '',
                };
                // autoDesc 보강 (기존 값 보존)
                if (tcEntry.equipment) {
                    autoDesc = autoDesc ? `${autoDesc} — ${tcEntry.equipment}` : tcEntry.equipment;
                } else if (tcEntry.tag_type && !autoDesc) {
                    autoDesc = tcEntry.tag_type;
                }
            }
        } else {
            // ── OCB/ALG/기타: portDict.connected 우선 → API ctx ──
            const pdConnected = pdBlock.connected || {};
            if (Object.keys(pdConnected).length > 0) {
                // v3 portDict: connected = {tag → {tag_type, equipment, drawing_title, ref_drawing, ...}}
                for (const [tag, info] of Object.entries(pdConnected)) {
                    // REF_SIGNAL(D0X-YYY-ZZ) 제외 — 연결신호 섹션은 실제 ISA 태그만
                    if (/^D\d+-\d+-\d+$/i.test(tag)) continue;
                    portSignals[tag] = {
                        direction:     '',
                        description:   info.drawing_title || '',
                        tag:           tag,
                        tag_type:      info.tag_type      || '',
                        equipment:     info.equipment     || '',
                        src_drawing:   info.drawing       || '',
                        ref_drawing:   info.ref_drawing   || '',
                        ref_index:     info.ref_index     || '',
                    };
                }
            } else if (Object.keys(ctx.ports || {}).length > 0) {
                // portDict 신호 없을 때만 API ctx 사용
                Object.assign(portSignals, ctx.ports);
                if (ctx.block_role) portSignals.__role = ctx.block_role;
            }

            // ── blockType 결정: ctx(API) 우선 → identifyBlockType ──
            if (!blockType) {
                if (ctx.block_type && ctx.block_type !== 'UNKNOWN') {
                    blockType = ctx.block_type;
                    blockDesc = blockDesc || ctx.block_desc || '';
                }
            }
            // blockDictionary로 desc/category 보완 (덮어쓰지 않음)
            if (blockType) {
                const de = typeof blockDictionary !== 'undefined' ? blockDictionary[blockType] : null;
                if (de) {
                    blockDesc     = blockDesc     || de.desc     || '';
                    blockCategory = blockCategory || de.category || '';
                }
            }
            // autoDesc는 아직 비어있을 때만 blockDesc로 채움
            if (!autoDesc && blockDesc) autoDesc = blockDesc;
        }

        // blockType 출처 추적 (사용자가 잘못된 포트사전 타입 파악용)
        let blockTypeSrc = '';
        {
            const _scanUserType = (typeof scanDescriptions !== 'undefined' && scanDescriptions[groupName]) ? (scanDescriptions[groupName].userType || '') : '';
            const _ctx2 = (typeof currentPageBlockContext !== 'undefined') ? (currentPageBlockContext[groupName] || {}) : {};
            if (_scanUserType) blockTypeSrc = 'user';
            else if (_ctx2.block_type && _ctx2.block_type !== 'UNKNOWN') blockTypeSrc = 'ctx';
            else if (blockType && !(typeof identifyBlockType === 'function' && identifyBlockType(groupName, gPorts, ''))) blockTypeSrc = 'portdict';
            else if (blockType) blockTypeSrc = 'infer';
        }

        scanResults.push({
            name: groupName,
            category: category,
            autoDesc: autoDesc,
            userDesc: userDesc,
            type: type,
            portCount: gPorts.length,
            cx: groupData.cx,
            cy: groupData.cy,
            blockType: blockType,
            blockTypeSrc: blockTypeSrc,
            blockDesc: blockDesc,
            blockCategory: blockCategory,
            crossRef: crossRef,
            refConnections: refConnections,
            portSignals: portSignals   // 포트-신호 연결 정보
        });
    }

    // 카테고리별, 이름순 정렬
    scanResults.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
    });

    renderScanList();
    updateScanStats();
    renderBlockList();  // 블록탭도 동기화
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

    // 카테고리 표시 순서
    const CAT_ORDER = ['OCB 블록', 'ALG 블록', 'OCB 내부', 'M/A 스테이션', '로직 블록', '참조신호', 'PORT', '기타'];
    const sortedGroups = Object.entries(groups).sort((a, b) => {
        const ia = CAT_ORDER.indexOf(a[0]);
        const ib = CAT_ORDER.indexOf(b[0]);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a[0].localeCompare(b[0]);
    });

    let html = '';
    for (const [cat, catItems] of sortedGroups) {
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
    const hasDesc = !!(item.userDesc || item.autoDesc);
    const checkColor = item.userDesc ? '#4caf50' : (item.autoDesc ? '#ffb74d' : 'transparent');
    const escapedName = item.name.replace(/'/g, "\\'");

    // 심볼 뱃지 — 카테고리별 색상
    const badgeCatColors = {
        control: '#e94560', arithmetic: '#ff9800', logic: '#4fc3f7', selector: '#a78bfa',
        limiter: '#f0a050', monitor: '#10b981', digital: '#38bdf8', sequencer: '#c084fc',
        io: '#8b95a5', steam: '#fb923c', other: '#9ca3af', math: '#ff9800', unknown: '#9ca3af'
    };
    let badge = '';
    if (item.blockType && item.blockType !== 'UNKNOWN') {
        const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[item.blockType] : null;
        const bCat = dictEntry ? dictEntry.category : (item.blockCategory || '');
        const bColor = badgeCatColors[bCat] || '#a78bfa';
        const isCore = dictEntry && dictEntry.core;
        badge = `<span style="flex-shrink:0; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:600; background:${bColor}22; color:${bColor}; ${isCore ? 'border:1px solid ' + bColor + '55;' : ''}">${isCore ? '★' : ''}${item.blockType}</span>`;
    } else if (item.crossRef && item.crossRef.length > 0) {
        const refCount = item.crossRef.reduce((sum, r) => sum + (r.drawings ? r.drawings.length : 0), 0);
        if (refCount > 0) badge = `<span style="flex-shrink:0; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:600; background:rgba(240,160,80,0.2); color:#f0a050;">${refCount}ref</span>`;
    }

    let html = `<div style="padding:5px 8px; margin:1px 0; font-size:11px; display:flex; align-items:center; gap:5px; border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer;" onclick="openScanDetailPopup('${escapedName}')" title="클릭하여 상세보기">`;

    // 체크 표시
    html += `<span style="color:${checkColor}; flex-shrink:0; font-size:11px; width:14px; text-align:center;">${hasDesc ? '&#10003;' : '&#9675;'}</span>`;

    // 블록/태그명
    html += `<span style="flex:1; font-family:monospace; font-size:10px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</span>`;

    // 심볼/참조 뱃지
    html += badge;

    // 신호 연결 표시 (portSignals가 있는 경우)
    if (item.portSignals && Object.keys(item.portSignals).length > 0) {
        const sigCount = Object.keys(item.portSignals).length;
        html += `<span style="flex-shrink:0; padding:1px 4px; border-radius:3px; font-size:8px; background:rgba(79,195,247,0.12); color:#4fc3f7;" title="신호 연결 ${sigCount}개">~${sigCount}</span>`;
    }

    // 이동 버튼
    html += `<span onclick="event.stopPropagation(); focusScanElement('${escapedName}')" style="flex-shrink:0; font-size:10px; color:var(--accent-blue); cursor:pointer; padding:2px 4px;" title="도면에서 찾기">&#8982;</span>`;

    html += '</div>';
    return html;
}

function openScanDetailPopup(blockName) {
    const item = scanResults.find(r => r.name === blockName);
    if (!item) return;

    const existing = document.getElementById('scan-detail-popup');
    if (existing) existing.remove();

    // portDict 우선, 없으면 세션 내 scanDescriptions
    const pdEntry = (typeof portDict !== 'undefined') ? (portDict[blockName] || {}) : {};
    const scanInfo = scanDescriptions[blockName];
    // REF_SIGNAL: 도면번호(3/524)는 equipment로 쓰지 않음, 신호 설명(autoDesc에서 추출)으로 대체
    const isRef = item.type === 'REF_SIGNAL';
    const autoEquipment = isRef ? '' : '';  // REF_SIGNAL은 빈 값으로
    const equipment = pdEntry.equipment || (scanInfo ? (typeof scanInfo === 'string' ? (isRef ? '' : scanInfo) : (scanInfo.equipment || '')) : '') || autoEquipment;
    const memo      = pdEntry.memo      || (scanInfo ? (typeof scanInfo === 'object' ? (scanInfo.memo || '') : '') : '');
    const escapedName = blockName.replace(/'/g, "\\'");

    // 심볼 정보 섹션 (OCB_BLOCK)
    let symbolSection = '';
    const currentUserType = scanInfo && scanInfo.userType ? scanInfo.userType : '';
    const detectedType = item.blockType && item.blockType !== 'UNKNOWN' ? item.blockType : '';
    const effectiveType = currentUserType || detectedType;

    if (effectiveType) {
        const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[effectiveType] : null;
        const desc = dictEntry ? (dictEntry.desc || '') : (item.blockDesc || '');
        const cat = dictEntry ? (dictEntry.category || '') : (item.blockCategory || '');
        const formula = dictEntry ? (dictEntry.formula || '') : '';
        const detail = dictEntry ? (dictEntry.detail || '') : '';
        const settings = dictEntry ? (dictEntry.settings || []) : [];
        const guidelines = dictEntry ? (dictEntry.guidelines || []) : [];
        const pdfPages = dictEntry ? (dictEntry.pdfPages || []) : [];

        let extraInfo = '';
        if (detail) extraInfo += `<div style="font-size:10px; color:rgba(255,255,255,0.5); margin-top:4px; line-height:1.4;">${detail}</div>`;
        if (formula) extraInfo += `<div style="margin-top:6px; padding:5px 8px; background:rgba(0,0,0,0.3); border-radius:4px; font-family:monospace; font-size:10px; color:#7dd3fc;">${formula}</div>`;
        if (settings.length > 0) {
            const setList = settings.map(s => `<span style="padding:1px 5px; border-radius:3px; font-size:9px; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.5);">${s.name}: ${(s.options || []).join('/')}</span>`).join(' ');
            extraInfo += `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">${setList}</div>`;
        }
        if (guidelines.length > 0) {
            const guideList = guidelines.map(g => `<li style="font-size:9px; color:rgba(255,255,255,0.4); margin-bottom:2px;">${g}</li>`).join('');
            extraInfo += `<ul style="margin:6px 0 0 12px; padding:0;">${guideList}</ul>`;
        }
        if (pdfPages.length === 2 && pdfPages[0]) {
            extraInfo += `<div style="margin-top:6px; font-size:9px; color:rgba(255,255,255,0.3);">📖 Ovation 매뉴얼 p.${pdfPages[0]}~${pdfPages[1]}</div>`;
        }

        const typeSrcLabel = currentUserType ? '수동 지정' : (item.blockTypeSrc === 'ctx' ? 'API 분석' : (item.blockTypeSrc === 'portdict' ? '⚠ 포트사전 (오류 가능)' : '추론'));
        const typeSrcColor = item.blockTypeSrc === 'portdict' && !currentUserType ? '#ff9800' : (currentUserType ? '#4fc3f7' : 'rgba(255,255,255,0.3)');
        symbolSection = `
            <div style="margin-bottom:12px;">
                <div style="font-size:10px; font-weight:600; color:#a78bfa; margin-bottom:4px;">심볼 정보 <span style="font-size:9px; color:${typeSrcColor}; font-weight:400;">(${typeSrcLabel})</span></div>
                <div style="padding:8px 10px; background:rgba(139,92,246,0.08); border:1px solid ${item.blockTypeSrc === 'portdict' && !currentUserType ? 'rgba(255,152,0,0.3)' : 'rgba(139,92,246,0.15)'}; border-radius:6px;">
                    <div style="font-size:12px; font-weight:600; color:#c4b5fd;">${effectiveType}</div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.6); margin-top:2px;">${desc}</div>
                    ${cat ? `<span style="font-size:9px; color:rgba(255,255,255,0.35); margin-top:2px; display:inline-block;">${cat}</span>` : ''}
                    ${item.blockTypeSrc === 'portdict' && !currentUserType ? `<div style="margin-top:6px; font-size:9px; color:#ff9800; background:rgba(255,152,0,0.1); padding:4px 6px; border-radius:3px;">포트사전에서 가져온 타입입니다. 잘못된 경우 아래에서 수동으로 수정하세요.</div>` : ''}
                    ${extraInfo}
                </div>
            </div>`;
    }

    // REF_SIGNAL 전용 정보 섹션
    let refSignalSection = '';
    if (isRef) {
        const refDrw = extractRefSignalPageNumber(blockName);
        const gPorts2 = (groupsData[blockName]?.ports || []);
        const sigDesc = extractSignalDescription(gPorts2);

        // 연결된 블록 목록 (portDict 역방향 + customConnections)
        let refConnHtml = '';
        const refConns = item.refConnections || [];
        if (refConns.length > 0) {
            const rows = refConns.slice(0, 8).map(rc => {
                const eq = rc.equipment ? `<span style="color:rgba(255,255,255,0.4);"> @ ${rc.equipment}</span>` : '';
                const drw = rc.drawing ? `<span style="color:rgba(255,255,255,0.25); font-size:9px;"> 도면${rc.drawing}</span>` : '';
                const tt = rc.tag_type ? `<span style="color:#4fc3f7; font-size:9px;"> [${rc.tag_type}]</span>` : '';
                const srcLabel = rc.source === 'conn' ? `<span style="font-size:8px; color:#f0a050;">연결</span> ` : `<span style="font-size:8px; color:rgba(255,255,255,0.25);">사전</span> `;
                const dirArrow = rc.direction === 'output' ? '→' : (rc.direction === 'input' ? '←' : '·');
                return `<div style="display:flex; align-items:center; gap:4px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                    <span style="font-size:9px; color:rgba(255,255,255,0.3);">${dirArrow}</span>
                    ${srcLabel}
                    <span style="font-family:monospace; font-size:10px; color:#e0e0e0;">${rc.block}</span>
                    ${rc.port ? `<span style="font-size:9px; color:rgba(255,255,255,0.4);">.${rc.port}</span>` : ''}
                    ${tt}${eq}${drw}
                </div>`;
            }).join('');
            refConnHtml = `<div style="margin-top:8px; border-top:1px solid rgba(0,188,212,0.2); padding-top:6px;">
                <div style="font-size:9px; font-weight:600; color:#00bcd4; margin-bottom:4px;">연결 블록 (${refConns.length}개)</div>
                ${rows}
                ${refConns.length > 8 ? `<div style="font-size:9px; color:rgba(255,255,255,0.3);">...외 ${refConns.length - 8}개</div>` : ''}
            </div>`;
        } else {
            refConnHtml = `<div style="margin-top:6px; font-size:9px; color:rgba(255,255,255,0.3);">연결된 블록 없음 (포트사전에 미등록)</div>`;
        }

        // 도면 이동 버튼 생성
        const ref = typeof parseRefSignal === 'function' ? parseRefSignal(blockName) : null;
        const refTask = ref ? ref.task : '';
        const refTitle = refTask && typeof getDrawingTitle === 'function' ? getDrawingTitle(refTask) : '';
        const refLabel = ref ? `D${ref.drop.padStart(2,'0')}-${ref.task}-${ref.sheet}` : refDrw;
        const goBtn = refTask ? `<button class="btn btn-sm" onclick="openDrawingFromTag('${refTask}','','${blockName.replace(/'/g, "\\'")}')"
            style="font-size:10px; background:#00bcd4; color:#fff; padding:3px 10px; margin-top:6px;">도면 ${refLabel} 열기</button>` : '';

        refSignalSection = `
            <div style="margin-bottom:12px; padding:8px 10px; background:rgba(0,188,212,0.08); border:1px solid rgba(0,188,212,0.2); border-radius:6px;">
                <div style="font-size:10px; font-weight:600; color:#00bcd4; margin-bottom:4px;">외부 참조 신호</div>
                <div style="font-size:11px; color:rgba(255,255,255,0.7);">출처: <span style="color:#f0a050; font-weight:600;">${refLabel}</span>${refTitle ? ` <span style="color:rgba(255,255,255,0.5);">${refTitle}</span>` : ''}</div>
                ${sigDesc ? `<div style="font-size:11px; color:#e0e0e0; margin-top:4px; font-weight:500;">${sigDesc}</div>` : ''}
                ${goBtn}
                ${refConnHtml}
            </div>`;
    }

    // 심볼 지정 드롭다운 (OCB_BLOCK일 때)
    // 심볼 수동 지정 (OCB_BLOCK에서 포트사전 타입이 의심스러울 때)
    let symbolSelectSection = '';
    if (item.type === 'OCB_BLOCK' || item.type === 'ALG_BLOCK' || item.type === 'BLOCK_TYPE') {
        const curUserType = (scanDescriptions[blockName] && scanDescriptions[blockName].userType) || '';
        const typeOptions = ['', 'PID', 'AND', 'OR', 'NOT', 'T', 'K', 'X', 'H', 'L', 'M/A', 'M/A/C', 'SUM', 'ABS', 'N', 'LIM'].map(t =>
            `<option value="${t}" ${curUserType === t ? 'selected' : ''}>${t || '(자동 감지)'}</option>`
        ).join('');
        symbolSelectSection = `
            <div style="margin-bottom:12px;">
                <div style="font-size:10px; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:4px;">심볼 수동 지정</div>
                <select onchange="saveScanUserType('${escapedName}', this.value)"
                    style="width:100%; padding:5px 6px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:4px; color:var(--text-primary); font-size:11px;">
                    ${typeOptions}
                </select>
            </div>`
    }

    // 포트 목록 섹션 (Ovation 매뉴얼 상세 정보 포함)
    let portsSection = '';
    const group = groupsData[blockName];
    if (group && group.ports && group.ports.length > 0) {
        // 1) effectiveType으로 직접 조회
        let dictEntry2 = effectiveType && typeof blockDictionary !== 'undefined' ? blockDictionary[effectiveType] : null;
        // 2) 없으면 autoDesc / 포트 이름으로 심볼 역추적
        if ((!dictEntry2 || !dictEntry2.ports?.length) && typeof btBlockData !== 'undefined') {
            // autoDesc → 심볼 ID 매핑 (inferBlockCategory 결과 활용)
            const autoDescStr = item.autoDesc || '';
            const autoSymMap = [
                [/PID/i, 'PID'],
                [/AND/i, 'AND'],
                [/OR\b/i, 'OR'],
                [/NOT\b/i, 'N'],
                [/Transfer|조건 선택/i, 'T'],
                [/Gain|Bias/i, 'K'],
                [/Multiply|곱/i, 'X'],
                [/최고값|High/i, 'H'],
                [/최저값|Low/i, 'L'],
                [/리미터|Limit/i, 'LIM'],
                [/나눗셈|Divid/i, 'DIV'],
                [/절대값|ABS/i, 'ABS'],
                [/합산|SUM/i, 'SUM'],
            ];
            for (const [re, symId] of autoSymMap) {
                if (re.test(autoDescStr) && btBlockData[symId]?.ports?.length) {
                    dictEntry2 = btBlockData[symId];
                    break;
                }
            }
            // 3) 그래도 없으면 포트 이름 교집합 비율로 (블록포트 기준)
            if (!dictEntry2?.ports?.length) {
                const portNames = new Set(group.ports.map(p => (p.name || p.text || '').toUpperCase()));
                let bestScore = 0, bestEntry = null;
                for (const sym of Object.values(btBlockData)) {
                    if (!sym.ports?.length) continue;
                    const symPortNames = new Set(sym.ports.map(p => p.name?.toUpperCase()).filter(Boolean));
                    let matches = 0;
                    for (const pn of portNames) if (symPortNames.has(pn)) matches++;
                    const score = matches / portNames.size; // 블록 포트 기준
                    if (score > bestScore && score >= 0.5) { bestScore = score; bestEntry = sym; }
                }
                if (bestEntry) dictEntry2 = bestEntry;
            }
        }
        const dictPorts = dictEntry2 && dictEntry2.ports ? dictEntry2.ports : [];

        // 포트명 매핑되지 않는 경우 대비 보조 설명표
        const fallbackPortDesc = {
            'K':'이득/게인 (Gain)', 'GAIN':'이득/게인 (Gain)',
            'd':'미분 이득 (Derivative Gain)', 'DGAIN':'미분 이득',
            'dt':'미분 시간 (Derivative Time)', 'DRAT':'미분 감쇠 상수',
            'NUM':'분자 (Numerator)', 'DEN':'분모 (Denominator)',
            'A':'입력값', 'B':'입력값 B',
            'FLAG':'조건 신호 (Boolean)', 'YES':'참일 때 값', 'NO':'거짓일 때 값',
            'T':'Transfer 블록 참조', 'H':'상한값 (High Limit)', 'L':'하한값 (Low Limit)',
            'IN1':'입력 1', 'IN2':'입력 2', 'IN3':'입력 3', 'IN4':'입력 4',
            'OUT':'출력', 'STPT':'설정값 (Setpoint)', 'PV':'측정값 (Process Variable)',
            'MODE':'모드 신호', 'MRE':'수동 리셋', 'ARE':'자동 리셋',
        };

        const portList = group.ports.map(p => {
            const pName = p.name || p.text || '?';
            const pUpper = pName.toUpperCase();
            const dp = dictPorts.find(d => d.name && d.name.toUpperCase() === pUpper);
            if (dp && dp.description) {
                const isOut = dp.direction === 'output';
                const dirColor = isOut ? '#fb923c' : '#4fc3f7';
                const dirLabel = isOut ? '→' : '←';
                return `<div style="display:flex; align-items:center; gap:6px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:9px; color:${dirColor}; width:14px; text-align:center;">${dirLabel}</span>
                    <span style="font-size:10px; color:#e0e0e0; font-weight:600; min-width:36px;">${pName}</span>
                    <span style="font-size:9px; color:rgba(255,255,255,0.45);">${dp.description}</span>
                </div>`;
            }
            // 심볼 매칭 없으면 보조 설명표 사용
            const fallback = fallbackPortDesc[pUpper] || fallbackPortDesc[pName];
            if (fallback) {
                return `<div style="display:flex; align-items:center; gap:6px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:9px; color:rgba(255,255,255,0.2); width:14px; text-align:center;">·</span>
                    <span style="font-size:10px; color:#e0e0e0; font-weight:600; min-width:36px;">${pName}</span>
                    <span style="font-size:9px; color:rgba(255,255,255,0.3);">${fallback}</span>
                </div>`;
            }
            // 설명 없는 포트도 같은 row 형식으로 통일
            return `<div style="display:flex; align-items:center; gap:6px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <span style="font-size:9px; color:rgba(255,255,255,0.15); width:14px; text-align:center;">·</span>
                <span style="font-size:10px; color:rgba(255,255,255,0.5); font-weight:600; min-width:36px;">${pName}</span>
            </div>`;
        }).join('');

        portsSection = `
            <div style="margin-bottom:12px;">
                <div style="font-size:10px; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:4px;">포트 구성 (${group.ports.length})</div>
                <div style="display:flex; flex-direction:column; gap:0; max-height:200px; overflow-y:auto;">${portList}</div>
            </div>`;
    }

    // 포트-신호 연결 섹션 (currentPageBlockContext 데이터)
    const blockRole = item.portSignals && item.portSignals.__role ? item.portSignals.__role : '';
    let portSignalSection = '';
    if (item.portSignals && Object.keys(item.portSignals).filter(k => k !== '__role').length > 0) {
        const sigEntries = Object.entries(item.portSignals).filter(([k]) => k !== '__role');
        const rows = sigEntries.map(([pname, pinfo]) => {
            const dir = pinfo.direction;
            const tagType = pinfo.tag_type || '';
            const equipment = pinfo.equipment || '';
            const refDrawing = pinfo.ref_drawing ? `→도면 ${pinfo.ref_drawing}-${pinfo.ref_index || '?'}` : '';
            const srcDrawing = pinfo.src_drawing ? `[${pinfo.src_drawing}]` : '';
            const isRef = !!pinfo.ref_drawing;
            const tagColor = isRef ? '#f0a050' : '#4fc3f7';
            return `<div style="display:flex; align-items:flex-start; gap:6px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="flex:1; min-width:0;">
                    <span style="font-size:10px; font-weight:600; color:${tagColor}; background:rgba(79,195,247,0.08); padding:1px 5px; border-radius:3px;">${pname}</span>
                    ${tagType ? `<span style="font-size:8px; color:rgba(255,200,100,0.7); margin-left:4px;">${tagType}</span>` : ''}
                    ${refDrawing ? `<span style="font-size:8px; color:#f0a050; margin-left:4px;">${refDrawing}</span>` : ''}
                    ${equipment ? `<div style="font-size:9px; color:#10b981; margin-top:2px;">📍 ${equipment}${srcDrawing ? ' ' + srcDrawing : ''}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        const roleHtml = blockRole ? `<div style="font-size:10px; color:#a78bfa; font-weight:600; margin-bottom:6px; padding:4px 8px; background:rgba(167,139,250,0.1); border-radius:4px;">역할 추론: ${blockRole}</div>` : '';

        portSignalSection = `
            <div style="margin-bottom:12px;">
                <div style="font-size:10px; font-weight:600; color:#4fc3f7; margin-bottom:4px;">연결 신호 (${sigEntries.length})</div>
                ${roleHtml}
                <div style="padding:6px 8px; background:rgba(79,195,247,0.05); border:1px solid rgba(79,195,247,0.12); border-radius:6px;">${rows}</div>
            </div>`;
    }

    // SIGNAL 역방향 조회 — portDict에서 이 태그를 사용하는 블록 찾기
    let signalUsageSection = '';
    if (item.type === 'SIGNAL') {
        const _pd = (typeof portDict !== 'undefined') ? portDict : {};
        const _tc = (typeof tagContext !== 'undefined') ? tagContext : {};
        const tcEntry = _tc[blockName] || _tc[blockName.toUpperCase()] || {};

        // portDict 역방향 검색: 이 tag를 connected에 가진 블록들
        const usedIn = [];
        const _bnu = blockName.toUpperCase();
        for (const [bname, binfo] of Object.entries(_pd)) {
            if (binfo.entry_type !== 'BLOCK') continue;
            const conn = binfo.connected || {};
            const info = conn[blockName] || conn[_bnu];
            if (info) {
                usedIn.push({
                    block:    bname,
                    port:     '',
                    dir:      '',
                    desc:     info.drawing_title || '',
                    role:     '',
                    equipment: info.equipment || '',
                    drawing:  binfo.drawings?.[0] || '',
                    tag_type: info.tag_type || '',
                });
            }
        }

        // tagContext 정보 헤더
        const tcHtml = (tcEntry.tag_type || tcEntry.equipment) ? `
            <div style="padding:6px 10px; background:rgba(0,255,136,0.06); border:1px solid rgba(0,255,136,0.12); border-radius:6px; margin-bottom:8px;">
                <span style="font-size:10px; font-weight:600; color:#00ff88;">${blockName}</span>
                ${tcEntry.tag_type ? `<span style="font-size:9px; color:rgba(255,200,100,0.7); margin-left:6px;">${tcEntry.tag_type}</span>` : ''}
                ${tcEntry.equipment ? `<div style="font-size:10px; color:#10b981; margin-top:2px;">📍 ${tcEntry.equipment}${tcEntry.primary_drawing ? ' [도면 ' + tcEntry.primary_drawing + ']' : ''}</div>` : ''}
            </div>` : '';

        // 연결 블록 목록
        const usageHtml = usedIn.length > 0 ? usedIn.map(u => {
            const dirColor = u.dir === 'input' ? '#4fc3f7' : u.dir === 'output' ? '#ff9800' : '#9ca3af';
            const dirLabel = u.dir === 'input' ? '입력' : u.dir === 'output' ? '출력' : '·';
            return `<div style="padding:4px 8px; font-size:10px; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; gap:6px; align-items:center;">
                <span style="font-size:9px; color:${dirColor}; width:22px;">${dirLabel}</span>
                <span style="font-family:monospace; color:#fff; font-size:10px;">${u.block}</span>
                <span style="color:rgba(255,255,255,0.3);">.${u.port}${u.desc ? '(' + u.desc + ')' : ''}</span>
                ${u.role ? `<span style="font-size:8px; color:#a78bfa; margin-left:auto;">${u.role}</span>` : ''}
            </div>`;
        }).join('') : '<div style="padding:8px; font-size:10px; color:rgba(255,255,255,0.3);">포트사전에 연결된 블록 없음</div>';

        if (tcHtml || usedIn.length > 0) {
            signalUsageSection = `
                <div style="margin-bottom:12px;">
                    <div style="font-size:10px; font-weight:600; color:#00ff88; margin-bottom:6px;">계기 정보 및 연결 블록</div>
                    ${tcHtml}
                    ${usedIn.length > 0 ? `<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; overflow:hidden;">${usageHtml}</div>` : usageHtml}
                </div>`;
        }
    }

    // 크로스 레퍼런스 섹션 (SIGNAL)
    let crossRefSection = '';
    if (item.crossRef && item.crossRef.length > 0) {
        const allDrawings = item.crossRef.flatMap(r => r.drawings || []);
        if (allDrawings.length > 0) {
            const drawingList = allDrawings.map(d =>
                `<div style="padding:4px 8px; font-size:10px; color:rgba(255,255,255,0.7); border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:#f0a050; font-weight:600;">${d.num || ''}</span>
                    <span style="color:rgba(255,255,255,0.4); margin-left:6px;">${d.title || d.ref || ''}</span>
                    ${d.primary ? '<span style="color:#4caf50; font-size:8px; margin-left:4px;">●주</span>' : ''}
                </div>`
            ).join('');
            crossRefSection = `
                <div style="margin-bottom:12px;">
                    <div style="font-size:10px; font-weight:600; color:#f0a050; margin-bottom:4px;">관련 도면 (${allDrawings.length})</div>
                    <div style="max-height:120px; overflow-y:auto; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.06);">${drawingList}</div>
                </div>`;
        }
    }

    const overlay = document.createElement('div');
    overlay.id = 'scan-detail-popup';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;';

    overlay.innerHTML = `
        <div style="background:#1a1a2e; border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:24px; width:480px; max-width:90vw; max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <div>
                    <div style="font-size:14px; font-weight:700; color:#fff;">${blockName}</div>
                    ${item.blockType && item.blockType !== 'UNKNOWN' ? `<button onclick="document.getElementById('scan-detail-popup').remove(); switchMainTab('block-types'); setTimeout(()=>{ document.getElementById('btSearchInput').value='${item.blockType}'; btRenderBlockList(); btSelectBlock('${item.blockType}'); }, 100);" style="margin-top:4px; padding:2px 8px; font-size:10px; background:rgba(139,92,246,0.2); color:#a78bfa; border:1px solid rgba(139,92,246,0.3); border-radius:4px; cursor:pointer;">심볼사전 → ${item.blockType}</button>` : ''}
                </div>
                <button onclick="document.getElementById('scan-detail-popup').remove()" style="background:none; border:none; color:rgba(255,255,255,0.5); font-size:18px; cursor:pointer; padding:4px;">&times;</button>
            </div>

            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">
                <span style="padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.6);">${item.category}</span>
                ${item.type ? `<span style="padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(79,195,247,0.15); color:#4fc3f7;">${item.type}</span>` : ''}
                ${item.blockType && item.blockType !== 'UNKNOWN' ? `<span style="padding:3px 8px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(139,92,246,0.15); color:#a78bfa;">${item.blockType}</span>` : ''}
                ${item.portCount ? `<span style="padding:3px 8px; border-radius:4px; font-size:10px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5);">포트 ${item.portCount}개</span>` : ''}
            </div>

            ${refSignalSection}
            ${signalUsageSection}
            ${symbolSection}
            ${symbolSelectSection}
            ${portSignalSection}
            ${portsSection}
            ${crossRefSection}

            ${item.autoDesc && !symbolSection ? `
            <div style="margin-bottom:12px;">
                <div style="font-size:10px; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:4px;">자동 분류</div>
                <div style="padding:8px 10px; background:rgba(255,255,255,0.04); border-radius:6px; font-size:11px; color:rgba(255,255,255,0.7);">${item.autoDesc}</div>
            </div>` : ''}

            <div style="margin-bottom:12px;">
                <div style="font-size:10px; font-weight:600; color:rgba(79,195,247,0.8); margin-bottom:4px;">설비정보</div>
                <input id="scan-popup-equipment" type="text" value="${equipment.replace(/"/g, '&quot;')}" placeholder="설비정보를 입력하세요"
                    style="width:100%; padding:8px 10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:12px; outline:none; box-sizing:border-box;">
            </div>

            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:600; color:rgba(79,195,247,0.8); margin-bottom:4px;">메모</div>
                <input id="scan-popup-memo" type="text" value="${memo.replace(/"/g, '&quot;')}" placeholder="메모를 입력하세요"
                    style="width:100%; padding:8px 10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:12px; outline:none; box-sizing:border-box;">
            </div>

            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button onclick="focusScanElement('${escapedName}'); document.getElementById('scan-detail-popup').remove();"
                    style="padding:8px 16px; border:1px solid rgba(255,255,255,0.1); border-radius:6px; background:transparent; color:rgba(255,255,255,0.7); font-size:12px; cursor:pointer;">도면에서 찾기</button>
                <button onclick="saveScanPopup('${escapedName}')"
                    style="padding:8px 16px; border:none; border-radius:6px; background:rgba(16,185,129,0.2); color:#10b981; font-size:12px; font-weight:600; cursor:pointer;">저장</button>
            </div>
        </div>
    `;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    document.getElementById('scan-popup-equipment').focus();

    // ESC 닫기
    const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
}

async function saveScanPopup(blockName) {
    const equipment = document.getElementById('scan-popup-equipment').value.trim();
    const memo      = document.getElementById('scan-popup-memo').value.trim();

    // scanDescriptions 세션 내 캐시 업데이트
    if (!scanDescriptions[blockName] || typeof scanDescriptions[blockName] === 'string') {
        scanDescriptions[blockName] = { equipment, memo };
    } else {
        scanDescriptions[blockName].equipment = equipment;
        scanDescriptions[blockName].memo      = memo;
    }

    // ── 블록사전에 저장 (앵커 + 현재 도면 기준) ──
    const drawing = (typeof currentDrawingNumber !== 'undefined' && currentDrawingNumber) ? currentDrawingNumber : '';
    const item = scanResults.find(r => r.name === blockName);
    // 템플릿 포트 정보
    const tmpl = blockTemplates.find(t => t.anchor === blockName || t.name === blockName);
    const ports = tmpl ? (tmpl.ports || []) : [];
    const bdEntry = {
        drawing,
        equipment,
        memo,
        ports,
        block_type: item?.blockType || '',
        connections: {},
        saved_at: new Date().toISOString(),
    };
    await saveBlockDictEntry(blockName, bdEntry);

    // 스캔 목록 즉시 갱신 (userDesc 반영)
    if (item) item.userDesc = equipment;

    updateScanStats();
    const searchEl = document.getElementById('scan-search');
    renderScanList(searchEl?.value.trim() || undefined);

    document.getElementById('scan-detail-popup').remove();
    showToast(`${blockName} 블록사전에 저장`, 'success');
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

// ============================================================
// 블록사전 (Block Dictionary)
// ============================================================

async function loadBlockDict() {
    // localStorage 우선 (빠름), 그 다음 파일
    try { blockDict = JSON.parse(localStorage.getItem('block_dict') || '{}'); } catch(e) { blockDict = {}; }
    if (isPyWebView()) {
        try {
            const res = await window.pywebview.api.load_block_dict();
            if (res.success && Object.keys(res.data || {}).length > 0) {
                blockDict = res.data;
                localStorage.setItem('block_dict', JSON.stringify(blockDict));
            }
        } catch(e) { console.warn('[BlockDict] 파일 로드 실패, localStorage 사용', e); }
    }
    renderBdList();
}

async function saveBlockDictEntry(anchor, entry) {
    // 메모리 업데이트
    if (!blockDict[anchor]) blockDict[anchor] = [];
    const idx = blockDict[anchor].findIndex(e => e.drawing === entry.drawing);
    if (idx >= 0) blockDict[anchor][idx] = entry;
    else blockDict[anchor].push(entry);

    // 파일 저장 (항상 localStorage + pywebview 둘 다)
    localStorage.setItem('block_dict', JSON.stringify(blockDict));
    if (isPyWebView()) {
        const patch = { [anchor]: [entry] };
        await window.pywebview.api.save_block_dict(patch).catch(e => console.warn('[BlockDict] 저장 실패', e));
    }
    renderBdList();
}

function renderBdList(filterText) {
    const listEl = document.getElementById('bd-list');
    const countEl = document.getElementById('bd-count');
    if (!listEl) return;

    const q = (filterText || document.getElementById('bd-search')?.value || '').toLowerCase().trim();
    const anchors = Object.keys(blockDict).filter(anchor => {
        if (!q) return true;
        if (anchor.toLowerCase().includes(q)) return true;
        return (blockDict[anchor] || []).some(e =>
            (e.equipment || '').toLowerCase().includes(q) ||
            (e.memo || '').toLowerCase().includes(q) ||
            (e.drawing || '').toLowerCase().includes(q)
        );
    });

    if (countEl) countEl.textContent = `${anchors.length}개`;

    if (anchors.length === 0) {
        listEl.innerHTML = `<div style="color:var(--text-muted); font-size:10px; text-align:center; margin-top:24px;">등록된 블록이 없습니다<br><span style="font-size:9px; color:rgba(255,255,255,0.2);">스캔탭에서 블록 저장 시 여기 표시됩니다</span></div>`;
        return;
    }

    listEl.innerHTML = anchors.map(anchor => {
        const entries = blockDict[anchor] || [];
        const equipList = [...new Set(entries.map(e => e.equipment).filter(Boolean))].slice(0, 2).join(' / ');
        const drawingCount = entries.length;
        return `<div onclick="openBdDetail('${anchor.replace(/'/g,"\\'")}') "
            style="padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; transition:background 0.15s;"
            onmouseover="this.style.background='rgba(255,255,255,0.04)'"
            onmouseout="this.style.background=''">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; font-weight:600; color:#e2e8f0;">${anchor}</span>
                <span style="font-size:9px; color:rgba(255,255,255,0.3); background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">${drawingCount}도면</span>
            </div>
            ${equipList ? `<div style="font-size:10px; color:#10b981; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${equipList}</div>` : ''}
        </div>`;
    }).join('');
}

function filterBdList() {
    const q = document.getElementById('bd-search')?.value || '';
    renderBdList(q);
}

// ── 블록사전 전체화면 (메인 탭) ──────────────────────────
function filterBdMain() {
    renderBdMain(document.getElementById('bd-main-search')?.value || '');
}

function renderBdMain(filterText) {
    const listEl   = document.getElementById('bd-main-list');
    const countEl  = document.getElementById('bd-main-count');
    if (!listEl) return;

    const q = (filterText || '').toLowerCase().trim();
    const anchors = Object.keys(blockDict).filter(anchor => {
        if (!q) return true;
        if (anchor.toLowerCase().includes(q)) return true;
        return (blockDict[anchor] || []).some(e =>
            (e.equipment || '').toLowerCase().includes(q) ||
            (e.memo || '').toLowerCase().includes(q) ||
            (e.drawing || '').toLowerCase().includes(q)
        );
    }).sort();

    if (countEl) countEl.textContent = `${anchors.length}개 등록`;

    if (anchors.length === 0) {
        listEl.innerHTML = `<div style="color:rgba(255,255,255,0.3); font-size:11px; text-align:center; margin-top:40px; padding:0 16px; line-height:1.6;">등록된 블록이 없습니다<br><span style="font-size:10px; color:rgba(255,255,255,0.15);">스캔탭 → 블록 저장</span></div>`;
        document.getElementById('bd-main-detail').innerHTML = '';
        return;
    }

    listEl.innerHTML = anchors.map(anchor => {
        const entries = blockDict[anchor] || [];
        const equipList = [...new Set(entries.map(e => e.equipment).filter(Boolean))].slice(0, 2).join(' / ');
        return `<div onclick="renderBdMainDetail('${anchor.replace(/'/g,"\\'")}') "
            style="padding:9px 14px; border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer;"
            onmouseover="this.style.background='rgba(255,255,255,0.04)'"
            onmouseout="this.style.background=''">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; font-weight:600; color:#e2e8f0;">${anchor}</span>
                <span style="font-size:9px; color:rgba(255,255,255,0.3);">${entries.length}도면</span>
            </div>
            ${equipList ? `<div style="font-size:10px; color:#10b981; margin-top:2px;">${equipList}</div>` : ''}
        </div>`;
    }).join('');
}

function renderBdMainDetail(anchor) {
    const detailEl = document.getElementById('bd-main-detail');
    if (!detailEl) return;

    // 목록 선택 표시
    document.querySelectorAll('#bd-main-list > div').forEach(el => {
        el.style.background = el.textContent.trim().startsWith(anchor) ? 'rgba(99,102,241,0.12)' : '';
    });

    const entries = blockDict[anchor] || [];
    const tmpl = blockTemplates.find(t => t.anchor === anchor || t.name === anchor);
    const tmplPorts = tmpl ? (tmpl.ports || []) : [];

    const portBadges = tmplPorts.filter(p => p.type === 'PORT').map(p =>
        `<span style="padding:2px 6px; border-radius:3px; font-size:10px; background:rgba(251,146,60,0.12); color:#fb923c;">${p.name}</span>`).join('');
    const signalBadges = tmplPorts.filter(p => p.type === 'SIGNAL').map(p =>
        `<span style="padding:2px 6px; border-radius:3px; font-size:10px; background:rgba(0,188,212,0.1); color:#00bcd4;">${p.name}</span>`).join('');
    const otherTexts = tmplPorts.filter(p => p.type === 'OTHER').map(p => p.name).join(', ');

    const tmplHtml = tmplPorts.length > 0 ? `
        <div style="margin-bottom:20px; padding:12px 16px; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.15); border-radius:8px;">
            <div style="font-size:11px; font-weight:600; color:#a78bfa; margin-bottom:8px;">템플릿 포트</div>
            ${portBadges ? `<div style="margin-bottom:6px; display:flex; flex-wrap:wrap; gap:4px;">${portBadges}</div>` : ''}
            ${signalBadges ? `<div style="margin-bottom:6px; display:flex; flex-wrap:wrap; gap:4px;">${signalBadges}</div>` : ''}
            ${otherTexts ? `<div style="font-size:10px; color:rgba(255,255,255,0.4);">텍스트: ${otherTexts}</div>` : ''}
        </div>` : '';

    const entriesHtml = entries.length === 0
        ? `<div style="color:rgba(255,255,255,0.3); font-size:11px;">등록된 도면 없음</div>`
        : entries.map((e, i) => `
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:13px; font-weight:600; color:#7dd3fc;">도면 ${e.drawing || '(미지정)'}</span>
                <button onclick="deleteBdEntry('${anchor.replace(/'/g,"\\'")}', ${i}); renderBdMain();" style="font-size:10px; padding:2px 8px; background:rgba(239,68,68,0.15); color:#f87171; border:none; border-radius:4px; cursor:pointer;">삭제</button>
            </div>
            ${e.block_type ? `<div style="font-size:10px; color:#a78bfa; margin-bottom:6px;">타입: ${e.block_type}</div>` : ''}
            ${e.equipment ? `<div style="font-size:12px; color:#10b981; margin-bottom:4px;">⚙ ${e.equipment}</div>` : '<div style="font-size:11px; color:rgba(255,255,255,0.2); margin-bottom:4px;">설비명 미입력</div>'}
            ${e.memo ? `<div style="font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:4px;">💬 ${e.memo}</div>` : ''}
            ${e.saved_at ? `<div style="font-size:9px; color:rgba(255,255,255,0.2);">${new Date(e.saved_at).toLocaleString('ko-KR')}</div>` : ''}
        </div>`).join('');

    detailEl.innerHTML = `
        <div style="max-width:600px;">
            <h2 style="font-size:18px; font-weight:700; color:#e2e8f0; margin:0 0 6px 0;">${anchor}</h2>
            <div style="font-size:11px; color:rgba(255,255,255,0.35); margin-bottom:20px;">${entries.length}개 도면 등록</div>
            ${tmplHtml}
            <div style="font-size:11px; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:10px;">등록 도면</div>
            ${entriesHtml}
        </div>`;
}

function openBdDetail(anchor) {
    const entries = blockDict[anchor] || [];
    const existing = document.getElementById('bd-detail-popup');
    if (existing) existing.remove();

    // 템플릿 포트 정보
    const tmpl = blockTemplates.find(t => t.anchor === anchor || t.name === anchor);
    const tmplPorts = tmpl ? (tmpl.ports || []) : [];
    const otherTexts = tmplPorts.filter(p => p.type === 'OTHER').map(p => p.name);
    const signalPorts = tmplPorts.filter(p => p.type === 'SIGNAL').map(p => p.name);
    const portItems = tmplPorts.filter(p => p.type === 'PORT').map(p => p.name);

    let tmplHtml = '';
    if (tmplPorts.length > 0) {
        const badges = (portItems.length ? `<div style="margin-bottom:4px;"><span style="font-size:9px; color:rgba(255,255,255,0.35);">포트: </span>${portItems.map(p=>`<span style="padding:1px 5px; margin:1px; border-radius:3px; font-size:9px; background:rgba(251,146,60,0.12); color:#fb923c;">${p}</span>`).join('')}</div>` : '') +
            (signalPorts.length ? `<div style="margin-bottom:4px;"><span style="font-size:9px; color:rgba(255,255,255,0.35);">신호: </span>${signalPorts.map(p=>`<span style="padding:1px 5px; margin:1px; border-radius:3px; font-size:9px; background:rgba(0,188,212,0.1); color:#00bcd4;">${p}</span>`).join('')}</div>` : '') +
            (otherTexts.length ? `<div><span style="font-size:9px; color:rgba(255,255,255,0.35);">텍스트: </span><span style="font-size:9px; color:rgba(255,255,255,0.5);">${otherTexts.join(', ')}</span></div>` : '');
        tmplHtml = `<div style="margin-bottom:14px; padding:8px 10px; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.15); border-radius:6px;">
            <div style="font-size:10px; font-weight:600; color:#a78bfa; margin-bottom:6px;">템플릿 포트 구성</div>
            ${badges}
        </div>`;
    }

    const entriesHtml = entries.length === 0
        ? `<div style="color:rgba(255,255,255,0.3); font-size:10px; text-align:center; padding:16px;">등록된 도면 없음</div>`
        : entries.map((e, i) => {
            const connCount = Object.keys(e.connections || {}).length;
            return `<div style="padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:11px; font-weight:600; color:#7dd3fc;">도면 ${e.drawing || '?'}</span>
                    <div style="display:flex; gap:4px;">
                        ${connCount ? `<span style="font-size:9px; color:rgba(255,255,255,0.3); background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">연결 ${connCount}</span>` : ''}
                        <button onclick="deleteBdEntry('${anchor.replace(/'/g,"\\'")}', ${i})" style="font-size:9px; padding:1px 6px; background:rgba(239,68,68,0.15); color:#f87171; border:none; border-radius:3px; cursor:pointer;">삭제</button>
                    </div>
                </div>
                ${e.equipment ? `<div style="font-size:11px; color:#10b981; margin-bottom:3px;">⚙ ${e.equipment}</div>` : ''}
                ${e.memo ? `<div style="font-size:10px; color:rgba(255,255,255,0.45); margin-bottom:3px;">💬 ${e.memo}</div>` : ''}
                ${e.saved_at ? `<div style="font-size:9px; color:rgba(255,255,255,0.2);">${new Date(e.saved_at).toLocaleString('ko-KR')}</div>` : ''}
            </div>`;
        }).join('');

    const popup = document.createElement('div');
    popup.id = 'bd-detail-popup';
    popup.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:10000; display:flex; align-items:center; justify-content:center;';
    popup.innerHTML = `
        <div style="background:#1a2236; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:18px; width:420px; max-height:80vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div>
                    <div style="font-size:14px; font-weight:700; color:#e2e8f0;">${anchor}</div>
                    <div style="font-size:10px; color:rgba(255,255,255,0.35);">블록사전 항목</div>
                </div>
                <button onclick="document.getElementById('bd-detail-popup').remove()" style="background:rgba(255,255,255,0.08); border:none; color:rgba(255,255,255,0.5); width:26px; height:26px; border-radius:4px; cursor:pointer; font-size:14px;">✕</button>
            </div>
            ${tmplHtml}
            <div style="font-size:10px; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:8px;">등록된 도면 (${entries.length})</div>
            ${entriesHtml}
        </div>`;
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
    document.body.appendChild(popup);
}

async function deleteBdEntry(anchor, idx) {
    if (!blockDict[anchor]) return;
    blockDict[anchor].splice(idx, 1);
    if (blockDict[anchor].length === 0) delete blockDict[anchor];
    if (isPyWebView()) {
        await window.pywebview.api.save_block_dict(blockDict).catch(() => {});
    } else {
        localStorage.setItem('block_dict', JSON.stringify(blockDict));
    }
    document.getElementById('bd-detail-popup')?.remove();
    renderBdList();
    showToast('삭제 완료', 'info');
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
        const sd = scanDescriptions[item.name];
        sd.type = item.type || '';
        sd.category = item.category || '';
        sd.autoDesc = item.autoDesc || '';

        // 설비정보 자동 입력 (비어있을 때만)
        if (!sd.equipment) {
            if (item.type === 'SIGNAL' && item.autoDesc) {
                sd.equipment = item.autoDesc;
            } else if (item.type === 'REF_SIGNAL' && item.autoDesc) {
                sd.equipment = item.autoDesc;
            } else if ((item.type === 'OCB_BLOCK' || item.type === 'ALG_BLOCK') && item.blockType) {
                const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[item.blockType] : null;
                if (dictEntry && dictEntry.desc) {
                    sd.equipment = dictEntry.desc;
                }
            }
        }
    }

    const pageKey = 'scan_dictionary';
    localStorage.setItem(pageKey, JSON.stringify(scanDescriptions));

    // blockInfo에도 저장 — scanDescriptions의 모든 정보를 반영
    const blockInfo = JSON.parse(localStorage.getItem('blockInfo') || '{}');
    for (const item of scanResults) {
        if (!blockInfo[item.name]) blockInfo[item.name] = {};
        const bi = blockInfo[item.name];
        const sd = scanDescriptions[item.name] || {};

        // 스캔 결과 정보
        bi.type = item.type;
        bi.symbolType = item.blockType || sd.userType || '';
        bi.category = item.category;
        bi.autoDesc = item.autoDesc;
        bi.portCount = item.portCount;
        bi.blockDesc = item.blockDesc || '';
        bi.blockCategory = item.blockCategory || '';

        // scanDescriptions에서 사용자 입력 정보 반영
        if (sd.equipment) bi.equipment = sd.equipment;
        if (sd.memo) bi.memo = sd.memo;
        if (sd.userType) bi.symbolType = sd.userType;

        // 설비정보 자동 입력 (비어있을 때만)
        if (!bi.equipment) {
            if (item.type === 'SIGNAL' && item.autoDesc) {
                // SIGNAL: autoDesc(태그 설명)를 설비정보로
                bi.equipment = item.autoDesc;
            } else if (item.type === 'REF_SIGNAL' && item.autoDesc) {
                // REF_SIGNAL: 참조 도면 번호
                bi.equipment = item.autoDesc;
            } else if ((item.type === 'OCB_BLOCK' || item.type === 'ALG_BLOCK') && item.blockType) {
                // OCB/ALG: 심볼사전의 기본설명
                const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[item.blockType] : null;
                if (dictEntry && dictEntry.desc) {
                    bi.equipment = dictEntry.desc;
                }
            }
        }

        // 포트 목록
        const group = groupsData[item.name];
        if (group && group.ports) {
            bi.ports = group.ports.map(p => p.name || p.text || '').filter(Boolean);
        }

        // 크로스 레퍼런스
        if (item.crossRef && item.crossRef.length > 0) {
            bi.crossRef = item.crossRef;
        }

        // 도면 정보 추가
        if (typeof currentDrawingNumber !== 'undefined' && currentDrawingNumber) {
            if (!bi.drawings) bi.drawings = [];
            const drawingKey = `${currentDrawingNumber}-${currentPageNumber || ''}`;
            if (!bi.drawings.includes(drawingKey)) bi.drawings.push(drawingKey);
        }
    }
    localStorage.setItem('blockInfo', JSON.stringify(blockInfo));
    console.log('[SaveScan] blockInfo 저장:', Object.keys(blockInfo).length, '개 블록');
    // 블록 탭 갱신
    if (typeof renderBlockList === 'function') renderBlockList();

    showToast(`스캔 저장 완료 (${Object.keys(blockInfo).length}개 블록)`, 'success');
}

/**
 * 현재 도면의 스캔 결과를 포트사전(block_port_dict.json)에 추가합니다.
 * currentPageBlockContext (Python API get_page_blocks 결과)를 사용합니다.
 */
async function addBlocksToDict() {
    // 현재 스캔된 결과를 모두 블록사전에 저장
    if (scanResults.length === 0) {
        showToast('먼저 스캔을 실행해주세요.', 'warning');
        return;
    }

    const drawing = (typeof currentDrawingNumber !== 'undefined' && currentDrawingNumber) ? currentDrawingNumber : '';
    const sd = (typeof scanDescriptions !== 'undefined') ? scanDescriptions : {};
    let saved = 0;

    for (const item of scanResults) {
        const blockName = item.name;
        const info = sd[blockName];
        const equipment = info ? (typeof info === 'string' ? info : (info.equipment || '')) : '';
        const memo = info && typeof info === 'object' ? (info.memo || '') : '';

        const tmpl = blockTemplates.find(t => t.anchor === blockName || t.name === blockName);
        const ports = tmpl ? (tmpl.ports || []) : [];

        const entry = {
            drawing,
            equipment,
            memo,
            ports,
            block_type: item.blockType || '',
            connections: {},
            saved_at: new Date().toISOString(),
        };

        // 메모리 업데이트
        if (!blockDict[blockName]) blockDict[blockName] = [];
        const idx = blockDict[blockName].findIndex(e => e.drawing === drawing);
        if (idx >= 0) blockDict[blockName][idx] = entry;
        else blockDict[blockName].push(entry);
        saved++;
    }

    // 파일 저장
    if (isPyWebView()) {
        await window.pywebview.api.save_block_dict(blockDict).catch(e => console.warn('[BlockDict] 저장 실패', e));
    }
    localStorage.setItem('block_dict', JSON.stringify(blockDict));

    renderBdList();
    showToast(`블록사전 저장 완료 (${saved}개)`, 'success');
}

function filterScanList() {
    const searchEl = document.getElementById('scan-search');
    const filterText = searchEl ? searchEl.value.trim() : '';
    renderScanList(filterText || undefined);
}

// ============ 블록 탭 렌더링 ============

function renderBlockList() {
    // scanResults 기반으로 스캔탭과 동일한 데이터 표시
    const listEl = document.getElementById('block-list');
    if (!listEl) return;

    if (!scanResults || scanResults.length === 0) {
        listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:11px;">스캔 탭에서 스캔을 먼저 실행해주세요</div>';
        return;
    }

    const search = (document.getElementById('block-search')?.value || '').toLowerCase();
    const sd = (typeof scanDescriptions !== 'undefined') ? scanDescriptions : {};

    // 카테고리별 그룹화
    const groups = {};
    for (const item of scanResults) {
        const sdInfo = sd[item.name];
        const equipment = typeof sdInfo === 'string' ? sdInfo : (sdInfo?.equipment || '');
        const memo = typeof sdInfo === 'object' ? (sdInfo?.memo || '') : '';
        const label = item.category || item.type || '기타';

        if (search) {
            const hay = `${item.name} ${item.type} ${item.autoDesc || ''} ${equipment} ${memo}`.toLowerCase();
            if (!hay.includes(search)) continue;
        }

        if (!groups[label]) groups[label] = [];
        groups[label].push({ ...item, equipment, memo });
    }

    const catColorMap = {
        'OCB 블록':'#60a5fa', 'ALG 블록':'#34d399', 'M/A 스테이션':'#a78bfa',
        'PORT':'#00bcd4', '참조신호':'#fb923c', '기타':'#6b7280',
    };

    let html = '';
    for (const [cat, items] of Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]))) {
        const cc = catColorMap[cat] || '#6b7280';
        html += `<div style="margin-bottom:2px;">
            <div style="padding:5px 8px; background:rgba(255,255,255,0.04); font-size:10px; font-weight:600; color:${cc}; display:flex; justify-content:space-between;">
                <span>${cat}</span><span style="color:rgba(255,255,255,0.25);">${items.length}</span>
            </div>`;
        for (const item of items) {
            const esc = item.name.replace(/'/g, "\\'");
            const desc = item.equipment || item.autoDesc || '';
            html += `<div style="padding:5px 8px 5px 14px; font-size:10px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.03);" onclick="openScanDetailPopup('${esc}')">
                <div style="font-family:monospace; color:#e2e8f0;">${item.name}</div>
                ${desc ? `<div style="font-size:9px; color:rgba(255,255,255,0.4); margin-top:1px;">${desc}</div>` : ''}
            </div>`;
        }
        html += `</div>`;
    }

    const total = Object.values(groups).reduce((s, a) => s + a.length, 0);
    if (!html) html = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:11px;">검색 결과 없음</div>';
    const filterChips = document.getElementById('block-type-filters');
    if (filterChips) filterChips.innerHTML = `<span style="font-size:9px; color:rgba(255,255,255,0.3);">총 ${total}개</span>`;
    listEl.innerHTML = html;
}

function filterBlockList() { renderBlockList(); }

// ============ 블록정보 메인탭 (심볼사전 형식) ============

let biData = {};
let biCurrentType = 'all';
let biSelectedBlock = null;

async function biInit() {
    biData = {};
    if (isPyWebView()) {
        try {
            const result = await window.pywebview.api.load_port_dict();
            if (result && result.success) biData = result.data || {};
        } catch(e) { console.warn('[포트사전] 로드 실패:', e); }
    }
    biRenderFilters();
    biRenderList();
    biUpdateStats();
}

function biUpdateStats() {
    const entries = Object.values(biData);
    const blocks  = entries.filter(b => b.entry_type !== 'SIGNAL');
    const signals = entries.filter(b => b.entry_type === 'SIGNAL');
    const totalPorts = blocks.reduce((sum, b) => sum + Object.keys(b.connected || {}).length, 0);
    const el1 = document.getElementById('biStatBlocks');
    const el2 = document.getElementById('biStatTypes');
    const el3 = document.getElementById('biStatPorts');
    if (el1) el1.textContent = blocks.length + (signals.length ? ` (+${signals.length}태그)` : '');
    if (el2) el2.textContent = new Set(blocks.map(b => b.type || b.blk_type_raw || '미분류')).size;
    if (el3) el3.textContent = totalPorts;
}

function biRenderFilters() {
    const container = document.getElementById('biFilterChips');
    if (!container) return;
    const types = new Set();
    for (const v of Object.values(biData)) {
        types.add(v.type || v.blk_type_raw || '미분류');
    }
    let html = `<button class="bt-filter-chip ${biCurrentType === 'all' ? 'active' : ''}" onclick="biSetType('all')">전체</button>`;
    for (const t of [...types].sort()) {
        html += `<button class="bt-filter-chip ${biCurrentType === t ? 'active' : ''}" onclick="biSetType('${t}')">${t}</button>`;
    }
    container.innerHTML = html;
}

function biSetType(t) {
    biCurrentType = t;
    biRenderFilters();
    biRenderList();
}

function biFilterList() { biRenderList(); }

const biCatColors = {
    control: '#e94560', arithmetic: '#ff9800', logic: '#4fc3f7', selector: '#a78bfa',
    limiter: '#f0a050', monitor: '#10b981', digital: '#38bdf8', sequencer: '#c084fc',
    io: '#8b95a5', steam: '#fb923c', other: '#9ca3af', SIGNAL: '#00ff88', REF_SIGNAL: '#00bcd4',
    OCB_BLOCK: '#e94560', ALG_BLOCK: '#ff9800'
};

function biRenderList() {
    const list = document.getElementById('biBlockList');
    if (!list) return;
    const search = (document.getElementById('biSearchInput')?.value || '').toLowerCase();

    const filtered = Object.entries(biData).filter(([name, info]) => {
        const type = info.type || info.blk_type_raw || '미분류';
        if (biCurrentType !== 'all' && type !== biCurrentType) return false;
        if (search) {
            const tagStr = Object.keys(info.connected || {}).join(' ');
            const haystack = `${name} ${info.memo || ''} ${type} ${info.type_desc || ''} ${info.tag_type || ''} ${info.equipment || ''} ${info.drawing || ''} ${(info.drawings || []).join(' ')} ${tagStr}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    // 타입별 그룹화
    const groups = {};
    for (const [name, info] of filtered) {
        const cat = info.type || info.blk_type_raw || '미분류';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push([name, info]);
    }

    const sortedCats = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    let html = '';
    for (const cat of sortedCats) {
        const items = groups[cat].sort((a, b) => a[0].localeCompare(b[0]));
        const cc = biCatColors[cat] || '#6b7280';
        const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[cat] : null;
        const catDesc = (items[0]?.[1]?.type_desc) || (dictEntry ? dictEntry.desc : '');

        html += `<div style="margin-bottom:2px;">`;
        html += `<div style="padding:6px 12px; background:rgba(255,255,255,0.03); font-size:10px; font-weight:600; color:${cc}; display:flex; justify-content:space-between; align-items:center; cursor:default;">`;
        html += `<span>${cat}${catDesc ? ' — ' + catDesc : ''}</span><span style="color:rgba(255,255,255,0.3);">${items.length}</span></div>`;

        for (const [name, info] of items) {
            const isActive = biSelectedBlock === name;
            const isSig = info.entry_type === 'SIGNAL';
            const drawing = (info.drawing || (info.drawings && info.drawings[0]) || '') ;
            const drwBadge = drawing ? `<span style="font-size:9px; color:rgba(255,255,255,0.25);">${drawing}</span>` : '';
            let subLine = '';
            if (isSig) {
                const tt = info.tag_type || '';
                const eq = info.equipment || '';
                subLine = [tt, eq].filter(Boolean).join(' · ');
            } else {
                const connCount = Object.keys(info.connected || {}).length;
                subLine = `${connCount ? connCount + '개 연결' : '연결 없음'}${info.memo ? ' · ' + info.memo : ''}`;
            }
            html += `<div class="bt-block-item ${isActive ? 'active' : ''}" onclick="biSelectBlock('${name.replace(/'/g, "\\'")}')" style="padding-left:16px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:11px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
                        <span>${name}</span>${drwBadge}
                    </div>
                    <div style="font-size:9px; color:rgba(255,255,255,0.35);">${subLine}</div>
                </div>
            </div>`;
        }
        html += `</div>`;
    }

    if (!html) html = '<div style="padding:20px; text-align:center; color:rgba(255,255,255,0.3); font-size:12px;">저장된 블록이 없습니다.<br>도면 스캔 후 "블록 추가" 버튼을 누르세요.</div>';
    list.innerHTML = html;
}

function biSelectBlock(name) {
    biSelectedBlock = name;
    biRenderList();
    biRenderDetail();
}

function biRenderDetail() {
    const content = document.getElementById('biContent');
    const b = biData[biSelectedBlock];
    if (!b) {
        content.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:rgba(255,255,255,0.3); font-size:13px;">좌측에서 블록을 선택하세요</div>';
        return;
    }

    // ── SIGNAL 항목 전용 뷰 ──────────────────────────────────────────────────
    if (b.entry_type === 'SIGNAL') {
        const name    = biSelectedBlock;
        const tagType = b.tag_type || '';
        const equip   = b.equipment || '';
        const primDrw = b.primary_drawing || '';
        const title   = b.drawing_title || '';
        const refDrws = (b.ref_drawings || []).join(', ');
        const drwList = (b.drawings || []).join(', ');
        content.innerHTML = `
            <div style="padding:24px;">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; background:#00ff8822; color:#00ff88; flex-shrink:0;">ISA</div>
                    <div style="flex:1;">
                        <div style="font-size:18px; font-weight:700; color:#fff;">${name}</div>
                        <div style="font-size:12px; color:rgba(255,255,255,0.4);">${tagType || 'ISA 계기 태그'}</div>
                    </div>
                </div>
                ${equip ? `<div style="margin-bottom:10px; padding:8px 12px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:6px; font-size:12px; color:#10b981;">📍 ${equip}</div>` : ''}
                ${primDrw ? `<div style="margin-bottom:8px; font-size:11px; color:rgba(255,255,255,0.5);">주 도면: <span style="color:#f0a050;">${primDrw}</span>${title ? ' — ' + title : ''}</div>` : ''}
                ${refDrws ? `<div style="margin-bottom:8px; font-size:11px; color:rgba(255,255,255,0.4);">참조 도면: ${refDrws}</div>` : ''}
                ${drwList ? `<div style="margin-bottom:8px; font-size:11px; color:rgba(255,255,255,0.35);">발견 도면: ${drwList}</div>` : ''}
            </div>`;
        return;
    }

    const name = biSelectedBlock;
    const type = b.type || b.blk_type_raw || '미분류';
    const memo = b.memo || '';
    const drawing = b.drawing || '';
    const cc = biCatColors[type] || '#6b7280';
    const escapedName = name.replace(/'/g, "\\'");

    // blockDictionary에서 심볼 상세 가져오기
    const dictEntry = typeof blockDictionary !== 'undefined' ? blockDictionary[type] : null;
    const typeDesc = b.type_desc || (dictEntry ? dictEntry.desc : '') || '';
    const dictPorts = dictEntry && dictEntry.ports ? dictEntry.ports : [];

    // 연결 신호 테이블 생성 (connected 맵 기반, REF_SIGNAL은 도면별 그룹화)
    const connected = b.connected || {};

    // ISA 태그 vs REF_SIGNAL 분리
    const isaConns = [], refConns = [];
    for (const [tag, info] of Object.entries(connected)) {
        if (/^D\d+-\d+-\d+$/i.test(tag)) refConns.push([tag, info]);
        else isaConns.push([tag, info]);
    }

    // REF_SIGNAL → 도면별 그룹화
    const refByDrawing = {};  // ref_drawing → {title, indices, resolved_tags, resolved_equip}
    for (const [tag, info] of refConns) {
        const drw = info.ref_drawing || tag;
        if (!refByDrawing[drw]) {
            refByDrawing[drw] = {
                title:         info.drawing_title || '',
                indices:       [],
                resolved_tags:  info.resolved_tags  || [],
                resolved_equip: info.resolved_equip || [],
            };
        }
        refByDrawing[drw].indices.push(info.ref_index || tag.split('-').pop());
    }

    let connTableRows = '';

    // ISA 태그 행
    for (const [tag, info] of isaConns) {
        const tagType   = info.tag_type  || '';
        const equipment = info.equipment || '';
        const srcDrw    = info.drawing   || '';
        const ttBadge   = tagType ? `<span style="padding:2px 5px; border-radius:3px; font-size:9px; background:rgba(255,255,255,0.05); color:rgba(255,200,100,0.7);">${tagType}</span>` : '';
        const eqLine    = equipment ? `<div style="font-size:9px; color:#10b981; margin-top:2px;">📍 ${equipment}${srcDrw ? ' · 도면 '+srcDrw : ''}</div>` : '';
        connTableRows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:8px 10px;">
                <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center;">
                    <span style="padding:2px 6px; border-radius:3px; font-size:10px; background:rgba(0,255,136,0.1); color:#00ff88; border:1px solid rgba(0,255,136,0.2);">${tag}</span>${ttBadge}
                </div>${eqLine}
            </td></tr>`;
    }

    // REF_SIGNAL 행 (도면별 1행)
    for (const [drw, grp] of Object.entries(refByDrawing)) {
        const idxStr  = grp.indices.sort().join(', ');
        const title   = grp.title || drw;
        // 실제 장치 태그 목록 (PP 계열만 우선)
        const ppTags  = grp.resolved_tags.filter(t => /^[A-Z]{2}\d{6}/.test(t));
        const showTags = (ppTags.length > 0 ? ppTags : grp.resolved_tags).slice(0, 4);
        const tagBadges = showTags.map(t => `<span style="padding:2px 5px; border-radius:3px; font-size:9px; background:rgba(0,188,212,0.1); color:#00bcd4; border:1px solid rgba(0,188,212,0.2);">${t}</span>`).join(' ');
        // 설비명: resolved_tags[i] 와 resolved_equip[i] 가 1:1 대응이 아니므로
        // build_port_dict.py 에서 이미 PP 우선 정렬돼 있으므로 앞 2개만 사용
        const uniqueEquips = [...new Set(grp.resolved_equip)].slice(0, 2);
        const equipLine = uniqueEquips.length > 0
            ? `<div style="font-size:9px; color:#10b981; margin-top:3px;">📍 ${uniqueEquips.join(' / ')}</div>` : '';

        connTableRows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:8px 10px;">
                <div style="font-size:11px; color:rgba(255,255,255,0.85); margin-bottom:3px;">${title}</div>
                <div style="font-size:9px; color:rgba(255,255,255,0.35);">도면 ${drw} · 인덱스 ${idxStr}</div>
            </td></tr>`;
    }

    const totalConn = isaConns.length + Object.keys(refByDrawing).length;
    const portTableHtml = connTableRows ? `
        <div style="margin-bottom:16px;">
            <div style="font-size:10px; font-weight:600; color:#a78bfa; margin-bottom:8px;">연결 신호 / 도면 (${totalConn})</div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <tbody>${connTableRows}</tbody>
            </table>
        </div>` : '<div style="padding:12px 0; font-size:11px; color:rgba(255,255,255,0.3);">연결 신호 정보 없음</div>';

    content.innerHTML = `
        <div style="padding:24px 24px 32px 24px;">
            <!-- 헤더 -->
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; background:${cc}22; color:${cc}; flex-shrink:0;">${(type || '?').slice(0, 4)}</div>
                <div style="flex:1;">
                    <div style="font-size:18px; font-weight:700; color:#fff;">${name}</div>
                    <div style="font-size:12px; color:rgba(255,255,255,0.4);">${type}${typeDesc ? ' — ' + typeDesc : ''}${drawing ? ' · 도면 ' + drawing : ''}</div>
                </div>
            </div>

            <!-- 포트 연결 테이블 -->
            ${portTableHtml}

            <!-- 메모 (사용자 메모만 편집 가능) -->
            <div style="margin-bottom:16px;">
                <div style="font-size:10px; font-weight:600; color:#4fc3f7; margin-bottom:6px;">메모</div>
                <input type="text" value="${memo.replace(/"/g, '&quot;')}" placeholder="메모 입력..."
                    onblur="biSaveField('${escapedName}', 'memo', this.value)"
                    style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; font-size:13px; outline:none; box-sizing:border-box;">
            </div>
        </div>
    `;
}

async function biSaveField(name, field, value) {
    if (!biData[name]) biData[name] = {};
    biData[name][field] = value;
    // 파일에 저장
    if (isPyWebView()) {
        const patch = {};
        patch[name] = biData[name];
        await window.pywebview.api.save_port_dict(patch).catch(e => console.warn('[포트사전] 저장 실패:', e));
    }
    biRenderList();
    biUpdateStats();
}

async function biDeleteBlock(name) {
    if (!await showConfirm(`"${name}" 블록을 포트사전에서 삭제하시겠습니까?`, { title: '블록 삭제', confirmText: '삭제', type: 'danger' })) return;
    delete biData[name];
    // 파일에 전체 저장 (삭제는 전체 재저장 방식)
    if (isPyWebView()) {
        await window.pywebview.api.save_port_dict_full(biData).catch(e => console.warn('[포트사전] 저장 실패:', e));
    }
    biSelectedBlock = null;
    biRenderFilters();
    biRenderList();
    biRenderDetail();
    biUpdateStats();
    showToast(`${name} 삭제 완료`, 'success');
}

async function biResetAll() {
    const count = Object.keys(biData).length;
    if (!count) { showToast('삭제할 데이터가 없습니다.', 'info'); return; }
    if (!await showConfirm(`포트사전 ${count}건을 모두 삭제하시겠습니까?`, { title: '포트사전 초기화', confirmText: '전체 삭제', type: 'danger' })) return;
    biData = {};
    if (isPyWebView()) {
        await window.pywebview.api.save_port_dict_full({}).catch(e => console.warn('[포트사전] 초기화 실패:', e));
    }
    biSelectedBlock = null;
    biRenderFilters();
    biRenderList();
    biRenderDetail();
    biUpdateStats();
    showToast('포트사전이 초기화되었습니다.', 'success');
}

function biExportCSV() {
    let csv = '블록명,타입,타입설명,도면,포트,방향,포트설명,연결태그,계기타입,참조도면,메모\n';
    for (const [name, info] of Object.entries(biData).sort((a, b) => a[0].localeCompare(b[0]))) {
        const type = (info.type || '').replace(/"/g, '""');
        const typeDesc = (info.type_desc || '').replace(/"/g, '""');
        const drawing = (info.drawing || '').replace(/"/g, '""');
        const memo = (info.memo || '').replace(/"/g, '""');
        const ports = info.ports || {};
        if (Object.keys(ports).length === 0) {
            csv += `"${name}","${type}","${typeDesc}","${drawing}","","","","","","","${memo}"\n`;
        } else {
            for (const [pname, pinfo] of Object.entries(ports)) {
                const portDesc = (pinfo.desc || '').replace(/"/g, '""');
                const dir = pinfo.direction || '';
                const tag = (pinfo.tag || '').replace(/"/g, '""');
                const tagType = (pinfo.tag_type || '').replace(/"/g, '""');
                const refDrw = (pinfo.ref_drawing || '').replace(/"/g, '""');
                csv += `"${name}","${type}","${typeDesc}","${drawing}","${pname}","${dir}","${portDesc}","${tag}","${tagType}","${refDrw}","${memo}"\n`;
            }
        }
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `포트사전_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('CSV 내보내기 완료', 'success');
}
