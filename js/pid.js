/**
 * P&ID 뷰어 모듈
 * - P&ID 도면 데이터 로드/관리
 * - Canvas 벡터 렌더링
 * - 검색 및 인터랙션
 */

// ============================================================
// P&ID 전역 상태
// ============================================================

let pidIndex = null;           // P&ID 도면 인덱스
let pidSearchIndex = null;     // P&ID 검색 인덱스 (전체 밸브/계기)
let pidCurrentData = null;     // 현재 로드된 P&ID 데이터
let pidViewMode = false;       // P&ID 뷰어 모드 활성화 여부
let pidSelectedItem = null;    // 선택된 밸브/계기
let pidViewX = 0;              // P&ID 뷰 오프셋 X
let pidViewY = 0;              // P&ID 뷰 오프셋 Y
let pidScale = 1;              // P&ID 줌 스케일
let pidHighlightItem = null;   // 하이라이트 대상
let pidHighlightPhase = 0;     // 하이라이트 애니메이션 페이즈

// P&ID 레이어 표시 상태
let pidLayerVisible = {
    lines: true,
    valves: true,
    instruments: true,
    texts: true,
    image: false
};
let pidBackgroundImage = null; // 배경 이미지

// 배경 이미지 정렬 파라미터
let pidImageOffset = { x: 0, y: 0 };      // 이미지 오프셋
let pidImageScale = { x: 1.0, y: 1.0 };   // 이미지 스케일

// ============================================================
// P&ID 레이어 토글
// ============================================================

function togglePIDLayer(layer) {
    // 이미지 레이어 토글 시 이미지가 없으면 알림
    if (layer === 'image' && !pidBackgroundImage) {
        showToast('배경 이미지 로딩 중...', 'warning');
        return;
    }

    pidLayerVisible[layer] = !pidLayerVisible[layer];

    // 버튼 상태 업데이트
    const btnMap = {
        lines: 'pidShowLines',
        valves: 'pidShowValves',
        instruments: 'pidShowInstruments',
        texts: 'pidShowTexts',
        image: 'pidShowImage'
    };

    const btn = document.getElementById(btnMap[layer]);
    if (btn) {
        btn.classList.toggle('active', pidLayerVisible[layer]);
    }

    // 이미지 켜질 때 조작 안내
    if (layer === 'image' && pidLayerVisible.image) {
        showToast('Shift+방향키: 이동, Shift+/-: 크기, Shift+0: 리셋', 'info');
    }

    renderPID();
}

// 초기 설정으로 리셋
function resetPIDSettings() {
    // 레이어 상태 초기화
    pidLayerVisible = {
        lines: true,
        valves: true,
        instruments: true,
        texts: true,
        image: false
    };

    // 이미지 정렬 초기화
    pidImageOffset = { x: 0, y: 0 };
    pidImageScale = { x: 1.0, y: 1.0 };

    // 버튼 상태 업데이트
    document.getElementById('pidShowLines')?.classList.add('active');
    document.getElementById('pidShowValves')?.classList.add('active');
    document.getElementById('pidShowInstruments')?.classList.add('active');
    document.getElementById('pidShowTexts')?.classList.add('active');

    // 선택 해제
    pidSelectedItem = null;
    stopPIDHighlight();

    // 뷰 초기화
    resetPIDView();

    // 사이드바 업데이트
    updatePIDSidebar();

    // 렌더링
    renderPID();

    showToast('초기화 완료', 'info');
}

// 이미지 정렬 조정 (키보드)
function adjustPIDImage(action, fine = false) {
    // DXF 좌표 기준 이동량 (줌에 따라 조절)
    const baseStep = fine ? 1 : 5;
    const step = baseStep / pidScale; // 화면에서 일정하게 보이도록

    const scaleStep = fine ? 0.005 : 0.02;

    switch (action) {
        case 'left':
            pidImageOffset.x -= step;
            break;
        case 'right':
            pidImageOffset.x += step;
            break;
        case 'up':
            pidImageOffset.y += step;
            break;
        case 'down':
            pidImageOffset.y -= step;
            break;
        case 'scaleUp':
            pidImageScale.x += scaleStep;
            pidImageScale.y += scaleStep;
            break;
        case 'scaleDown':
            pidImageScale.x = Math.max(0.1, pidImageScale.x - scaleStep);
            pidImageScale.y = Math.max(0.1, pidImageScale.y - scaleStep);
            break;
        case 'reset':
            pidImageOffset = { x: 0, y: 0 };
            pidImageScale = { x: 1.0, y: 1.0 };
            break;
    }

    renderPID();

    // 현재 값 표시
    console.log(`[P&ID] 이미지 정렬: offset(${pidImageOffset.x.toFixed(1)}, ${pidImageOffset.y.toFixed(1)}), scale(${pidImageScale.x.toFixed(3)}, ${pidImageScale.y.toFixed(3)})`);
}

// P&ID 모드에서 키보드 이벤트 처리
function handlePIDKeyDown(e) {
    if (!pidViewMode || !pidLayerVisible.image) return false;

    // Shift + 방향키: 이미지 이동, Ctrl 추가 시 미세 조정
    if (e.shiftKey) {
        const fine = e.ctrlKey; // Ctrl 누르면 미세 조정

        switch (e.key) {
            case 'ArrowLeft':
                adjustPIDImage('left', fine);
                e.preventDefault();
                return true;
            case 'ArrowRight':
                adjustPIDImage('right', fine);
                e.preventDefault();
                return true;
            case 'ArrowUp':
                adjustPIDImage('up', fine);
                e.preventDefault();
                return true;
            case 'ArrowDown':
                adjustPIDImage('down', fine);
                e.preventDefault();
                return true;
            case '+':
            case '=':
                adjustPIDImage('scaleUp', fine);
                e.preventDefault();
                return true;
            case '-':
            case '_':
                adjustPIDImage('scaleDown', fine);
                e.preventDefault();
                return true;
            case '0':
                adjustPIDImage('reset');
                e.preventDefault();
                return true;
        }
    }

    return false;
}

function loadPIDBackgroundImage() {
    document.getElementById('pidImageInput').click();
}

function handlePIDImageLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            pidBackgroundImage = img;
            pidLayerVisible.image = true;

            // 버튼 활성화
            const btn = document.getElementById('pidShowImage');
            if (btn) btn.classList.add('active');

            showToast('배경 이미지 로드 완료', 'success');
            renderPID();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // input 초기화 (같은 파일 다시 선택 가능하게)
    event.target.value = '';
}

// P&ID 번호에 해당하는 배경 이미지 자동 로드
async function loadPIDBackgroundImageAuto(pidNumber) {
    console.log(`[P&ID] 배경 이미지 로드 시도: ${pidNumber}`);

    // 인덱스에서 pdf_page 필드 찾기
    let pageNum = null;

    if (pidIndex) {
        const pidInfo = pidIndex.find(p => p.pid_number === pidNumber);
        if (pidInfo && pidInfo.pdf_page) {
            pageNum = pidInfo.pdf_page;
            console.log(`[P&ID] 인덱스에서 페이지 찾음: ${pageNum}`);
        }
    }

    // 인덱스에 없으면 번호에서 추출 (fallback)
    if (!pageNum) {
        const match = pidNumber.match(/PI-M-(\d+)/i);
        if (match) {
            pageNum = parseInt(match[1], 10);
            console.log(`[P&ID] 번호에서 추출: ${pageNum}`);
        }
    }

    if (!pageNum) {
        console.log(`[P&ID] 페이지 번호를 찾을 수 없음: ${pidNumber}`);
        return false;
    }

    const imagePath = `data/pid_images/page_${String(pageNum).padStart(3, '0')}.png`;
    console.log(`[P&ID] 이미지 경로: ${imagePath}, 페이지번호: ${pageNum}`);

    try {
        // pywebview API 존재 여부 확인
        console.log(`[P&ID] pywebview 확인:`, typeof pywebview);

        if (typeof pywebview === 'undefined') {
            console.log(`[P&ID] pywebview가 정의되지 않음`);
            return false;
        }

        console.log(`[P&ID] pywebview.api 확인:`, typeof pywebview.api);

        if (!pywebview.api) {
            console.log(`[P&ID] pywebview.api가 없음`);
            return false;
        }

        console.log(`[P&ID] load_file_as_base64 확인:`, typeof pywebview.api.load_file_as_base64);

        if (typeof pywebview.api.load_file_as_base64 !== 'function') {
            console.log(`[P&ID] load_file_as_base64 함수가 없음`);
            return false;
        }

        // pywebview API로 이미지 로드
        console.log(`[P&ID] pywebview API 호출 시작...`);
        const result = await pywebview.api.load_file_as_base64(imagePath);
        console.log(`[P&ID] API 결과:`, JSON.stringify(result).substring(0, 200));

        if (result && result.success && result.data) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = function() {
                    pidBackgroundImage = img;
                    console.log(`[P&ID] 배경 이미지 로드 완료: ${imagePath} (${img.width}x${img.height})`);

                    // 이미지 버튼 스타일 업데이트 (사용 가능 표시)
                    const btn = document.getElementById('pidShowImage');
                    if (btn) {
                        btn.style.opacity = '1';
                        btn.title = '배경 이미지 표시/숨김 (준비됨)';
                    }

                    showToast('배경 이미지 준비됨 (🖼 버튼으로 표시)', 'info');
                    resolve(true);
                };
                img.onerror = function(err) {
                    console.error(`[P&ID] 이미지 디코딩 에러:`, err);
                    resolve(false);
                };
                img.src = `data:image/png;base64,${result.data}`;
            });
        } else {
            console.log(`[P&ID] API 실패:`, result?.error || 'unknown error');
            return false;
        }
    } catch (e) {
        console.error(`[P&ID] 배경 이미지 로드 예외:`, e);
        return false;
    }
}

// ============================================================
// P&ID 데이터 로드
// ============================================================

async function loadPIDIndex() {
    try {
        const result = await pywebview.api.load_data('pid/_index.json');
        if (result && result.success && result.data) {
            pidIndex = result.data;
            console.log(`[P&ID] 인덱스 로드 완료: ${pidIndex.length}개 도면`);
            updatePIDWelcomeStats();
            return pidIndex;
        }
    } catch (e) {
        console.error('[P&ID] 인덱스 로드 실패:', e);
    }

    // fallback: fetch
    try {
        const resp = await fetch('data/pid/_index.json');
        pidIndex = await resp.json();
        console.log(`[P&ID] 인덱스 로드 완료 (fetch): ${pidIndex.length}개 도면`);
        updatePIDWelcomeStats();
        return pidIndex;
    } catch (e) {
        console.error('[P&ID] 인덱스 로드 실패 (fetch):', e);
    }

    return null;
}

async function loadPIDSearchIndex() {
    if (pidSearchIndex) return pidSearchIndex;

    try {
        const result = await pywebview.api.load_data('pid/_search_index.json');
        if (result && result.success && result.data) {
            pidSearchIndex = result.data;
            console.log(`[P&ID] 검색 인덱스 로드 완료: 밸브 ${pidSearchIndex.valves?.length || 0}, 계기 ${pidSearchIndex.instruments?.length || 0}`);
            return pidSearchIndex;
        }
    } catch (e) {
        console.error('[P&ID] 검색 인덱스 로드 실패:', e);
    }

    // fallback: fetch
    try {
        const resp = await fetch('data/pid/_search_index.json');
        pidSearchIndex = await resp.json();
        console.log(`[P&ID] 검색 인덱스 로드 완료 (fetch): 밸브 ${pidSearchIndex.valves?.length || 0}, 계기 ${pidSearchIndex.instruments?.length || 0}`);
        return pidSearchIndex;
    } catch (e) {
        console.error('[P&ID] 검색 인덱스 로드 실패 (fetch):', e);
    }

    return null;
}

async function loadPIDData(pidNumber) {
    const filename = `pid/${pidNumber}.json`;

    try {
        const result = await pywebview.api.load_data(filename);
        if (result && result.success && result.data) {
            pidCurrentData = result.data;
            console.log(`[P&ID] ${pidNumber} 로드 완료`);
            return pidCurrentData;
        }
    } catch (e) {
        console.error(`[P&ID] ${pidNumber} 로드 실패:`, e);
    }

    // fallback: fetch
    try {
        const resp = await fetch(`data/${filename}`);
        pidCurrentData = await resp.json();
        console.log(`[P&ID] ${pidNumber} 로드 완료 (fetch)`);
        return pidCurrentData;
    } catch (e) {
        console.error(`[P&ID] ${pidNumber} 로드 실패 (fetch):`, e);
    }

    return null;
}

// ============================================================
// Welcome 화면 업데이트
// ============================================================

function updatePIDWelcomeStats() {
    if (!pidIndex) return;

    // 전체 통계 계산
    let totalValves = 0;
    let totalInstruments = 0;

    for (const pid of pidIndex) {
        totalValves += pid.stats?.valves || 0;
        totalInstruments += pid.stats?.instruments || 0;
    }

    // 사이드바 통계 표시
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString();
    };
    setVal('ws-pid-count', pidIndex.length);
    setVal('ws-valves', totalValves);
    setVal('ws-instruments', totalInstruments);

    // P&ID 목록 렌더링
    renderPIDPreviewList();
}

// ui.js에서 호출되는 함수
function updateHomePIDStats() {
    if (!pidIndex) {
        loadPIDIndex();
    } else {
        updatePIDWelcomeStats();
    }
}

function renderPIDPreviewList() {
    const container = document.getElementById('home-pid-list');
    if (!container || !pidIndex) return;

    // 심볼 도면 제외, 밸브 있는 것만
    const drawings = pidIndex
        .filter(p => p.pid_number && !p.name?.includes('심볼') && p.stats?.valves > 0)
        .sort((a, b) => a.pid_number.localeCompare(b.pid_number));

    if (drawings.length === 0) {
        container.innerHTML = '<p class="text-muted">P&ID 없음</p>';
        return;
    }

    // 도면번호 + 이름 표시
    container.innerHTML = drawings.map(d => {
        const num = d.pid_number.replace('PI-M-', '');
        const name = d.name || '';
        return `<div class="pid-grid-item" onclick="openPID('${d.pid_number}')">
            <span class="pid-num">${num}</span>
            <span class="pid-name">${name}</span>
        </div>`;
    }).join('');
}

// ============================================================
// (레거시) Welcome 탭 전환 - 현재 사용 안함
// ============================================================

function switchWelcomeType(type) {
    // 홈화면이 전체 2분할로 변경되어 탭 전환 불필요
    console.log('[switchWelcomeType] deprecated');
}

// ============================================================
// P&ID 목록 다이얼로그
// ============================================================

function showPIDList() {
    // 기존 drawing-list-dialog 재활용하거나 새 다이얼로그
    if (!pidIndex) {
        loadPIDIndex().then(() => renderPIDListDialog());
    } else {
        renderPIDListDialog();
    }
}

function renderPIDListDialog() {
    const dialog = document.getElementById('drawing-list-dialog');
    const content = document.getElementById('drawing-list-content');
    const countEl = document.getElementById('drawing-count');
    const title = dialog.querySelector('h2');

    if (title) title.innerHTML = 'P&ID 목록 <span id="drawing-count" style="font-size:14px; color:#888;"></span>';

    // P&ID 모드용 정렬/필터 컨트롤 변경
    const sortOption = document.getElementById('sort-option');
    const dropFilter = document.getElementById('drop-filter');
    if (sortOption) {
        sortOption.innerHTML = `
            <option value="number">도면번호순</option>
            <option value="valves">밸브수순</option>
            <option value="instruments">계기수순</option>
        `;
        sortOption.onchange = () => renderPIDListContent();
    }
    if (dropFilter) {
        dropFilter.style.display = 'none';
        // 필터 라벨도 숨기기
        const filterLabel = dropFilter.previousElementSibling;
        if (filterLabel && filterLabel.textContent.includes('필터')) {
            filterLabel.style.display = 'none';
        }
    }

    // 검색 입력 이벤트 연결
    const searchInput = document.getElementById('drawing-search');
    if (searchInput) {
        searchInput.value = ''; // 검색어 초기화
        searchInput.oninput = () => renderPIDListContent();
    }

    if (!pidIndex) {
        content.innerHTML = '<p class="text-muted">P&ID 인덱스를 불러오지 못했습니다.</p>';
        dialog.style.display = 'flex';
        return;
    }

    renderPIDListContent();
    dialog.style.display = 'flex';
}

function renderPIDListContent() {
    const content = document.getElementById('drawing-list-content');
    const countEl = document.getElementById('drawing-count');
    const sortOption = document.getElementById('sort-option');
    const searchInput = document.getElementById('drawing-search');

    // 심볼 도면 제외
    let drawings = pidIndex.filter(p => p.pid_number && !p.name?.includes('심볼'));

    // 검색 필터
    const searchText = searchInput?.value?.toLowerCase() || '';
    if (searchText) {
        drawings = drawings.filter(d =>
            d.pid_number?.toLowerCase().includes(searchText) ||
            d.name?.toLowerCase().includes(searchText)
        );
    }

    // 정렬
    const sortBy = sortOption?.value || 'number';
    if (sortBy === 'number') {
        drawings.sort((a, b) => (a.pid_number || '').localeCompare(b.pid_number || ''));
    } else if (sortBy === 'valves') {
        drawings.sort((a, b) => (b.stats?.valves || 0) - (a.stats?.valves || 0));
    } else if (sortBy === 'instruments') {
        drawings.sort((a, b) => (b.stats?.instruments || 0) - (a.stats?.instruments || 0));
    }

    if (countEl) countEl.textContent = `(${drawings.length}개)`;

    content.innerHTML = `
        <div style="display:grid; gap:8px;">
            ${drawings.map(d => `
                <div class="drawing-list-item" onclick="openPID('${d.pid_number}'); closeDrawingList();">
                    <div>
                        <div style="font-weight:600; color:var(--accent-cyan);">${d.pid_number}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">${d.name || ''}</div>
                    </div>
                    <div style="text-align:right; font-size:11px; color:var(--text-muted);">
                        <div>밸브: ${d.stats?.valves || 0}</div>
                        <div>계기: ${d.stats?.instruments || 0}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================================
// P&ID 열기
// ============================================================

async function openPID(pidNumber) {
    showToast(`P&ID ${pidNumber} 로딩 중...`, 'info');

    const data = await loadPIDData(pidNumber);
    if (!data) {
        showToast('P&ID 로드 실패', 'error');
        return;
    }

    // P&ID 뷰어 모드 활성화
    pidViewMode = true;
    pidCurrentData = data;

    // Welcome 화면 숨기기
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) welcomeScreen.classList.add('hidden');

    // 사이드바 표시 (P&ID 전용)
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = 'flex';
        switchSidebarTab('info');

        // 제어로직 전용 탭 숨기기
        sidebar.querySelectorAll('[data-logic-only]').forEach(tab => {
            tab.style.display = 'none';
        });
    }

    // 제어로직 툴 패널 숨기기, P&ID 툴 패널 표시
    const toolPanel = document.getElementById('tool-panel');
    if (toolPanel) toolPanel.style.display = 'none';

    const pidToolPanel = document.getElementById('pid-tool-panel');
    if (pidToolPanel) pidToolPanel.classList.add('visible');

    // 상단 UI 표시 (P&ID 모드)
    const navTabs = document.getElementById('header-nav-tabs');
    const editorBtns = document.getElementById('header-btns-editor');
    const pidBtns = document.getElementById('header-btns-pid');
    if (navTabs) navTabs.style.display = 'flex';
    if (editorBtns) editorBtns.style.display = 'none';
    if (pidBtns) pidBtns.style.display = 'flex';

    // 타이틀 업데이트
    const titleEl = document.getElementById('drawing-title');
    if (titleEl) titleEl.textContent = `P&ID: ${data.pid_number} - ${data.name || ''}`;

    // 뷰 초기화
    resetPIDView();

    // 레이어 상태 초기화 (모두 표시)
    pidLayerVisible = {
        lines: true,
        valves: true,
        instruments: true,
        texts: true,
        image: false
    };
    document.getElementById('pidShowLines')?.classList.add('active');
    document.getElementById('pidShowValves')?.classList.add('active');
    document.getElementById('pidShowInstruments')?.classList.add('active');
    document.getElementById('pidShowTexts')?.classList.add('active');

    // 이미지 버튼 초기화 (이미지 로드 전까지 반투명)
    const imgBtn = document.getElementById('pidShowImage');
    if (imgBtn) {
        imgBtn.classList.remove('active');
        imgBtn.style.opacity = '0.5';
        imgBtn.title = '배경 이미지 로딩 중...';
    }

    // 이전 배경 이미지 초기화
    pidBackgroundImage = null;

    // 배경 이미지 자동 로드 (약간 딜레이 - API 준비 대기)
    setTimeout(async () => {
        try {
            await loadPIDBackgroundImageAuto(pidNumber);
        } catch (e) {
            console.error('[P&ID] 배경 이미지 로드 에러:', e);
        }
    }, 500);

    // 사이드바 P&ID 정보 표시
    updatePIDSidebar();

    // 렌더링
    renderPID();

    showToast(`${pidNumber} 로드 완료`, 'success');
}

// 검색에서 P&ID 열고 항목 선택
async function openPIDAndSelect(pidNumber, itemType, itemId) {
    await openPID(pidNumber);

    // 로드 후 선택 및 하이라이트
    setTimeout(() => {
        selectPIDItemAndCenter(itemType, itemId);
    }, 300);
}

// 항목 선택 (뷰 이동 없이 하이라이트만)
function selectPIDItemAndCenter(type, id) {
    if (!pidCurrentData) {
        console.warn('[P&ID] 데이터 없음');
        return;
    }

    const items = type === 'valve' ? pidCurrentData.valves : pidCurrentData.instruments;
    const item = items?.find(i => i.id === id);

    if (!item) {
        console.warn(`[P&ID] ${type} ${id} 찾을 수 없음`);
        showToast(`${id}를 찾을 수 없습니다`, 'warning');
        return;
    }

    // 선택 및 하이라이트
    item._type = type;
    pidSelectedItem = item;
    pidHighlightItem = item;

    // 뷰 이동 없음 - 전체 도면 상태 유지하고 하이라이트만 표시

    startPIDHighlight();
    updatePIDSidebar();
    renderPID();

    console.log(`[P&ID] ${type} ${id} 선택됨 - 위치: (${item.x}, ${item.y})`);
}

// ============================================================
// P&ID 뷰 제어
// ============================================================

function resetPIDView() {
    if (!pidCurrentData) return;

    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;

    const bounds = pidCurrentData.bounds;
    const dataWidth = bounds.maxX - bounds.minX;
    const dataHeight = bounds.maxY - bounds.minY;

    // 캔버스에 맞게 스케일 조정
    const scaleX = (canvas.width - 100) / dataWidth;
    const scaleY = (canvas.height - 100) / dataHeight;
    pidScale = Math.min(scaleX, scaleY, 2) * 0.9;

    // 중앙 정렬
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    pidViewX = centerX * pidScale - canvas.width / 2;
    pidViewY = centerY * pidScale - canvas.height / 2;
}

// ============================================================
// P&ID 사이드바
// ============================================================

function updatePIDSidebar() {
    const infoDiv = document.getElementById('selection-info');
    if (!infoDiv || !pidCurrentData) return;

    if (pidSelectedItem) {
        // 선택된 항목 정보 표시
        renderPIDItemInfo(infoDiv, pidSelectedItem);
    } else {
        // 도면 전체 정보
        const data = pidCurrentData;
        infoDiv.innerHTML = `
            <div style="margin-bottom:16px;">
                <div style="font-size:18px; font-weight:700; color:#22d3ee;">${data.pid_number}</div>
                <div style="font-size:13px; color:#e2e8f0;">${data.name || ''}</div>
            </div>
            <div class="info-row">
                <span class="label" style="color:rgba(255,255,255,0.5);">밸브:</span>
                <span class="value" style="color:#fff;">${data.stats?.valves || 0}개</span>
            </div>
            <div class="info-row">
                <span class="label" style="color:rgba(255,255,255,0.5);">계기:</span>
                <span class="value" style="color:#fff;">${data.stats?.instruments || 0}개</span>
            </div>
            <div class="info-row">
                <span class="label" style="color:rgba(255,255,255,0.5);">텍스트:</span>
                <span class="value" style="color:#fff;">${data.stats?.texts || 0}개</span>
            </div>
            <div class="info-row">
                <span class="label" style="color:rgba(255,255,255,0.5);">라인:</span>
                <span class="value" style="color:#fff;">${data.stats?.lines || 0}개</span>
            </div>

            <h3 style="margin-top:20px; margin-bottom:10px; font-size:13px; font-weight:600; color:#f97316;">밸브 목록</h3>
            <div style="max-height:200px; overflow-y:auto;">
                ${(data.valves || []).slice(0, 30).map(v => `
                    <div class="pid-item-row" onclick="selectPIDItem('valve', '${v.id}')" style="padding:6px 10px; margin:3px 0; background:rgba(255,255,255,0.05); border-radius:4px; cursor:pointer; font-size:12px;">
                        <span style="color:#10b981; font-weight:500;">${v.id}</span>
                        <span style="color:rgba(255,255,255,0.6); margin-left:8px;">${v.type || ''}</span>
                        <span style="color:rgba(255,255,255,0.5); float:right;">${v.grid || ''}</span>
                    </div>
                `).join('')}
                ${(data.valves?.length || 0) > 30 ? `<div style="text-align:center; color:rgba(255,255,255,0.5); font-size:11px; padding:6px;">... 외 ${data.valves.length - 30}개</div>` : ''}
            </div>
        `;
    }
}

function renderPIDItemInfo(container, item) {
    const isValve = item._type === 'valve';
    const typeLabel = isValve ? '밸브' : '계기';
    const typeColor = isValve ? '#10b981' : '#f97316';

    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <div style="font-size:16px; font-weight:700; color:${typeColor};">${item.id}</div>
            <div style="font-size:12px; color:rgba(255,255,255,0.6);">${typeLabel}</div>
        </div>
        <div class="info-row">
            <span class="label" style="color:rgba(255,255,255,0.5);">타입:</span>
            <span class="value" style="color:#fff;">${item.type || item.type_kor || '-'}</span>
        </div>
        ${isValve ? `
        <div class="info-row">
            <span class="label" style="color:rgba(255,255,255,0.5);">사이즈:</span>
            <span class="value" style="color:#fff;">${item.size || '-'}</span>
        </div>
        ` : ''}
        <div class="info-row">
            <span class="label" style="color:rgba(255,255,255,0.5);">위치:</span>
            <span class="value" style="color:#fff;">${item.grid || '-'}</span>
        </div>
        <div class="info-row">
            <span class="label" style="color:rgba(255,255,255,0.5);">좌표:</span>
            <span class="value" style="color:rgba(255,255,255,0.8);">(${item.x?.toFixed(1)}, ${item.y?.toFixed(1)})</span>
        </div>
        ${item.description ? `
        <div class="info-row" style="flex-direction:column; align-items:flex-start;">
            <span class="label" style="color:rgba(255,255,255,0.5);">설명:</span>
            <span class="value" style="font-size:12px; color:#e2e8f0;">${item.description}</span>
        </div>
        ` : ''}

        <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:16px 0;">

        <!-- 정비이력 (목업) -->
        <h3 style="font-size:12px; font-weight:600; color:#a78bfa; margin-bottom:10px;">📋 정비이력</h3>
        <div style="font-size:12px; color:#e2e8f0;">
            <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                <span style="color:rgba(255,255,255,0.5);">2025-12-15</span> 정기점검 완료
            </div>
            <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                <span style="color:rgba(255,255,255,0.5);">2025-06-20</span> 패킹 교체
            </div>
            <div style="padding:6px 0;">
                <span style="color:rgba(255,255,255,0.5);">2024-12-10</span> 정기점검 완료
            </div>
        </div>

        <!-- TM현황 (목업) -->
        <h3 style="font-size:12px; font-weight:600; color:#60a5fa; margin-top:16px; margin-bottom:10px;">📄 TM현황</h3>
        <div style="font-size:12px; color:#e2e8f0;">
            <div style="padding:6px 0; display:flex; justify-content:space-between;">
                <span>TM-2025-042</span>
                <span style="color:#f97316; font-weight:500;">진행중</span>
            </div>
            <div style="padding:6px 0; display:flex; justify-content:space-between;">
                <span>TM-2024-118</span>
                <span style="color:#10b981; font-weight:500;">완료</span>
            </div>
        </div>

        <button class="btn btn-sm" style="width:100%; margin-top:16px;" onclick="pidSelectedItem=null; updatePIDSidebar();">
            선택 해제
        </button>
    `;
}

function selectPIDItem(type, id) {
    if (!pidCurrentData) return;

    const items = type === 'valve' ? pidCurrentData.valves : pidCurrentData.instruments;
    const item = items?.find(i => i.id === id);

    if (item) {
        item._type = type;
        pidSelectedItem = item;
        pidHighlightItem = item;
        startPIDHighlight();
        updatePIDSidebar();
        renderPID();
    }
}

// ============================================================
// P&ID 캔버스 렌더링
// ============================================================

function renderPID() {
    if (!pidViewMode || !pidCurrentData) return;

    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 배경
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 배경 이미지 렌더링 (레이어 토글)
    if (pidLayerVisible.image && pidBackgroundImage) {
        renderPIDBackgroundImage(ctx, canvas);
    }

    ctx.save();

    // 뷰 변환 (Y축 반전 - DXF는 Y가 위로 증가)
    ctx.translate(-pidViewX, canvas.height + pidViewY);
    ctx.scale(pidScale, -pidScale);

    // 라인 렌더링 (레이어 토글)
    if (pidLayerVisible.lines) {
        renderPIDLines(ctx);
    }

    // 밸브 렌더링 (레이어 토글)
    if (pidLayerVisible.valves) {
        renderPIDValves(ctx);
    }

    // 계기 렌더링 (레이어 토글)
    if (pidLayerVisible.instruments) {
        renderPIDInstruments(ctx);
    }

    // 텍스트 렌더링 (레이어 토글)
    if (pidLayerVisible.texts) {
        renderPIDTexts(ctx);
    }

    ctx.restore();

    // 하이라이트 렌더링 (화면 좌표계)
    if (pidHighlightItem) {
        renderPIDHighlight(ctx, canvas);
    }

    // 그리드 오버레이
    renderPIDGrid(ctx, canvas);
}

function renderPIDLines(ctx) {
    const lines = pidCurrentData.lines || [];

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1 / pidScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const line of lines) {
        // 레이어별 색상
        if (line.layer?.toLowerCase().includes('cloud')) {
            ctx.strokeStyle = '#6b7280';
        } else if (line.layer?.toLowerCase().includes('pipe')) {
            ctx.strokeStyle = '#60a5fa';
        } else {
            ctx.strokeStyle = '#4a5568';
        }

        if (line.type === 'line' || line.type === 'polyline') {
            const pts = line.points;
            if (pts && pts.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i][0], pts[i][1]);
                }
                if (line.closed) ctx.closePath();
                ctx.stroke();
            }
        } else if (line.type === 'circle') {
            ctx.beginPath();
            ctx.arc(line.center[0], line.center[1], line.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (line.type === 'arc') {
            ctx.beginPath();
            const startRad = line.start_angle * Math.PI / 180;
            const endRad = line.end_angle * Math.PI / 180;
            ctx.arc(line.center[0], line.center[1], line.radius, startRad, endRad);
            ctx.stroke();
        }
    }
}

function renderPIDValves(ctx) {
    const valves = pidCurrentData.valves || [];

    // 줌 레벨에 따라 마커 크기 조절 (줌아웃 시 매우 작게)
    // pidScale 0.25 → 1.5px, pidScale 0.5 → 3px, pidScale 1.0+ → 6px
    const screenSize = Math.max(1, Math.min(6, pidScale * 6));
    const size = screenSize / pidScale;

    for (const valve of valves) {
        const x = valve.x;
        const y = valve.y;
        const isSelected = pidSelectedItem === valve;

        // 심볼 타입별 렌더링
        ctx.fillStyle = isSelected ? '#22c55e' : '#10b981';
        ctx.strokeStyle = isSelected ? '#fff' : '#065f46';
        ctx.lineWidth = (isSelected ? 2 : 1) / pidScale;

        // 간단한 사각형으로 표시 (타입별 심볼은 추후 확장)
        ctx.beginPath();
        ctx.rect(x - size/2, y - size/2, size, size);
        ctx.fill();
        ctx.stroke();

        // ID 텍스트 (줌 50% 이상일 때만 표시)
        if (pidScale >= 0.5) {
            ctx.save();
            ctx.scale(1, -1);
            ctx.font = `${10/pidScale}px sans-serif`;
            ctx.textAlign = 'center';

            // 배경 이미지가 있으면 외곽선 추가
            if (pidLayerVisible.image && pidBackgroundImage) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3 / pidScale;
                ctx.strokeText(valve.id, x, -y - size);
            }
            ctx.fillStyle = '#fff';
            ctx.fillText(valve.id, x, -y - size);
            ctx.restore();
        }
    }
}

function renderPIDInstruments(ctx) {
    const instruments = pidCurrentData.instruments || [];

    // 줌 레벨에 따라 마커 크기 조절 (줌아웃 시 매우 작게)
    // pidScale 0.25 → 1px, pidScale 0.5 → 2.5px, pidScale 1.0+ → 5px
    const screenRadius = Math.max(1, Math.min(5, pidScale * 5));
    const radius = screenRadius / pidScale;

    for (const inst of instruments) {
        const x = inst.x;
        const y = inst.y;
        const isSelected = pidSelectedItem === inst;

        ctx.fillStyle = isSelected ? '#f97316' : '#fb923c';
        ctx.strokeStyle = isSelected ? '#fff' : '#c2410c';
        ctx.lineWidth = (isSelected ? 2 : 1) / pidScale;

        // 원형 심볼
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // ID 텍스트 (줌 50% 이상일 때만 표시)
        if (pidScale >= 0.5) {
            ctx.save();
            ctx.scale(1, -1);
            ctx.font = `${10/pidScale}px sans-serif`;
            ctx.textAlign = 'center';

            // 배경 이미지가 있으면 외곽선 추가
            if (pidLayerVisible.image && pidBackgroundImage) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3 / pidScale;
                ctx.strokeText(inst.id, x, -y - radius - 2/pidScale);
            }
            ctx.fillStyle = '#fff';
            ctx.fillText(inst.id, x, -y - radius - 2/pidScale);
            ctx.restore();
        }
    }
}

function renderPIDTexts(ctx) {
    const texts = pidCurrentData.texts || [];

    ctx.save();
    ctx.scale(1, -1); // 텍스트 Y축 보정

    // 배경 이미지가 보이면 텍스트에 외곽선 추가
    const hasBackground = pidLayerVisible.image && pidBackgroundImage;

    if (hasBackground) {
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / pidScale;
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
    }

    ctx.font = `${8/pidScale}px sans-serif`;

    for (const t of texts) {
        // 중요 텍스트만 표시 (너무 많으면 성능 저하)
        if (pidScale < 0.5 && t.height < 3) continue;

        if (hasBackground) {
            ctx.strokeText(t.text, t.x, -t.y);
            ctx.fillText(t.text, t.x, -t.y);
        } else {
            ctx.fillText(t.text, t.x, -t.y);
        }
    }

    ctx.restore();
}

function renderPIDGrid(ctx, canvas) {
    // 그리드 오버레이 (선택적)
    if (pidScale < 0.3) return; // 줌아웃 시 생략

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';

    // 우측 하단에 현재 P&ID 정보
    ctx.textAlign = 'right';
    let info = `${pidCurrentData.pid_number} | Scale: ${pidScale.toFixed(2)}x`;

    // 이미지 레이어가 켜져 있으면 정렬 정보 표시
    if (pidLayerVisible.image && pidBackgroundImage) {
        info += ` | Img: (${pidImageOffset.x}, ${pidImageOffset.y}) x${pidImageScale.x.toFixed(2)}`;
    }

    ctx.fillText(info, canvas.width - 10, canvas.height - 10);
}

function renderPIDBackgroundImage(ctx, canvas) {
    if (!pidBackgroundImage || !pidCurrentData) return;

    const bounds = pidCurrentData.bounds;

    // 기본 크기 (DXF 범위)
    const baseWidth = bounds.maxX - bounds.minX;
    const baseHeight = bounds.maxY - bounds.minY;

    // 중심점 (스케일 기준점)
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // 스케일 적용된 크기
    const imgWidth = baseWidth * pidImageScale.x;
    const imgHeight = baseHeight * pidImageScale.y;

    // 중심점 기준으로 위치 계산 + 오프셋 적용
    const imgX = centerX - imgWidth / 2 + pidImageOffset.x;
    const imgY = centerY + imgHeight / 2 + pidImageOffset.y;

    ctx.save();

    // 뷰 변환 적용
    ctx.translate(-pidViewX, canvas.height + pidViewY);
    ctx.scale(pidScale, -pidScale);

    // 이미지 그리기
    ctx.globalAlpha = 0.7; // 반투명
    ctx.scale(1, -1); // 이미지 Y축 보정
    ctx.drawImage(
        pidBackgroundImage,
        imgX, -imgY,
        imgWidth, imgHeight
    );

    ctx.restore();
}

function renderPIDHighlight(ctx, canvas) {
    if (!pidHighlightItem) return;

    const item = pidHighlightItem;

    // 화면 좌표로 변환 (Y축 반전 고려)
    // renderPID의 변환: translate(-pidViewX, canvas.height + pidViewY) → scale(pidScale, -pidScale)
    // 결과: screenX = x * pidScale - pidViewX, screenY = canvas.height + pidViewY - y * pidScale
    const screenX = (item.x * pidScale) - pidViewX;
    const screenY = canvas.height + pidViewY - (item.y * pidScale);

    // 펄스 효과
    const pulse = Math.sin(pidHighlightPhase) * 0.3 + 0.7;
    const radius = 30 + Math.sin(pidHighlightPhase) * 10;

    ctx.strokeStyle = `rgba(255, 60, 120, ${pulse})`;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screenX, screenY, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 60, 120, ${pulse * 0.5})`;
    ctx.stroke();
}

function startPIDHighlight() {
    pidHighlightPhase = 0;

    // 기존 애니메이션 중지
    if (window.pidHighlightAnimId) {
        cancelAnimationFrame(window.pidHighlightAnimId);
        window.pidHighlightAnimId = null;
    }

    const animate = () => {
        if (!pidHighlightItem) {
            window.pidHighlightAnimId = null;
            return;
        }

        pidHighlightPhase += 0.1;
        renderPID();

        // 클릭할 때까지 계속 애니메이션 유지
        window.pidHighlightAnimId = requestAnimationFrame(animate);
    };

    window.pidHighlightAnimId = requestAnimationFrame(animate);
}

function stopPIDHighlight() {
    if (window.pidHighlightAnimId) {
        cancelAnimationFrame(window.pidHighlightAnimId);
        window.pidHighlightAnimId = null;
    }
    pidHighlightItem = null;
}

// ============================================================
// P&ID 이벤트 핸들링
// ============================================================

function handlePIDClick(e) {
    if (!pidViewMode || !pidCurrentData) return false;

    const canvas = document.getElementById('mainCanvas');
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 화면 좌표 → 데이터 좌표 변환
    const dataX = (clickX + pidViewX) / pidScale;
    const dataY = (canvas.height - clickY + pidViewY) / pidScale;

    // 밸브 클릭 확인
    const valves = pidCurrentData.valves || [];
    for (const v of valves) {
        const dist = Math.sqrt((v.x - dataX) ** 2 + (v.y - dataY) ** 2);
        if (dist < 15 / pidScale) {
            v._type = 'valve';
            pidSelectedItem = v;
            pidHighlightItem = v;
            startPIDHighlight();
            updatePIDSidebar();
            return true;
        }
    }

    // 계기 클릭 확인
    const instruments = pidCurrentData.instruments || [];
    for (const i of instruments) {
        const dist = Math.sqrt((i.x - dataX) ** 2 + (i.y - dataY) ** 2);
        if (dist < 15 / pidScale) {
            i._type = 'instrument';
            pidSelectedItem = i;
            pidHighlightItem = i;
            startPIDHighlight();
            updatePIDSidebar();
            return true;
        }
    }

    // 빈 곳 클릭 - 선택 해제
    pidSelectedItem = null;
    stopPIDHighlight();
    updatePIDSidebar();
    renderPID();

    return true;
}

function handlePIDWheel(e) {
    if (!pidViewMode) return false;

    const canvas = document.getElementById('mainCanvas');
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, pidScale * zoomFactor));

    // 마우스 위치 기준 줌
    const dataX = (mouseX + pidViewX) / pidScale;
    const dataY = (canvas.height - mouseY + pidViewY) / pidScale;

    pidScale = newScale;

    pidViewX = dataX * pidScale - mouseX;
    pidViewY = dataY * pidScale - (canvas.height - mouseY);

    renderPID();
    return true;
}

function handlePIDPan(dx, dy) {
    if (!pidViewMode) return false;

    pidViewX -= dx;
    pidViewY += dy; // Y축 반전
    renderPID();
    return true;
}

// ============================================================
// P&ID 검색
// ============================================================

function searchPID(query) {
    if (!pidCurrentData || !query) return [];

    const q = query.toUpperCase().replace(/[-\s]/g, '');
    const results = [];

    // 밸브 검색
    for (const v of (pidCurrentData.valves || [])) {
        if (v.variants?.some(var_ => var_.includes(q)) || v.id.toUpperCase().replace(/[-\s]/g, '').includes(q)) {
            results.push({ ...v, _type: 'valve' });
        }
    }

    // 계기 검색
    for (const i of (pidCurrentData.instruments || [])) {
        if (i.variants?.some(var_ => var_.includes(q)) || i.id.toUpperCase().replace(/[-\s]/g, '').includes(q)) {
            results.push({ ...i, _type: 'instrument' });
        }
    }

    return results;
}

function focusOnPIDItem(item) {
    if (!item) return;

    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;

    // 아이템 중심으로 뷰 이동
    pidViewX = item.x * pidScale - canvas.width / 2;
    pidViewY = item.y * pidScale - canvas.height / 2;

    // 하이라이트
    pidHighlightItem = item;
    pidSelectedItem = item;
    startPIDHighlight();
    updatePIDSidebar();
}

// ============================================================
// P&ID 모드 종료
// ============================================================

function closePIDViewer() {
    pidViewMode = false;
    pidCurrentData = null;
    pidSelectedItem = null;
    stopPIDHighlight();

    // P&ID 툴 패널 숨기기
    const pidToolPanel = document.getElementById('pid-tool-panel');
    if (pidToolPanel) pidToolPanel.classList.remove('visible');

    // 제어로직 전용 탭 다시 표시
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.querySelectorAll('[data-logic-only]').forEach(tab => {
            tab.style.display = '';
        });
    }

    // 홈 화면으로 복원
    if (typeof showWelcomeScreen === 'function') {
        showWelcomeScreen();
    }

    // 캔버스 클리어
    const canvas = document.getElementById('mainCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0c10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ============================================================
// 초기화
// ============================================================

// DOM 로드 후 P&ID 인덱스 프리로드
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 딜레이 후 백그라운드 로드
    setTimeout(() => {
        loadPIDIndex();
    }, 1000);

    // P&ID 이미지 정렬 키보드 이벤트
    document.addEventListener('keydown', (e) => {
        if (handlePIDKeyDown(e)) {
            // 이벤트 처리됨
        }
    });
});
