/**
 * fileIO.js - 파일 입출력
 * 저장, 로드, 가져오기, 내보내기
 * PyWebView API 및 HTTP 서버 모드 지원
 */

// ============ 파일 관리 변수 ============
// (config.js에서 전역 변수 선언됨)

// ============ PyWebView API 감지 ============

/**
 * PyWebView 환경인지 확인 (EXE 모드)
 */
function isPyWebView() {
    return typeof window.pywebview !== 'undefined' && window.pywebview.api;
}

/**
 * PyWebView API가 준비될 때까지 대기
 */
async function waitForPyWebView(timeout = 3000) {
    const start = Date.now();
    while (!isPyWebView() && Date.now() - start < timeout) {
        await new Promise(r => setTimeout(r, 100));
    }
    return isPyWebView();
}

// ============ 로컬 데이터 API ============

/**
 * 로컬 데이터 불러오기 (templates, patterns, recent, config)
 */
async function loadLocalData(dataType) {
    try {
        // PyWebView 모드 (EXE)
        if (isPyWebView()) {
            const result = await window.pywebview.api.load_data(dataType);
            if (result.success && result.data) {
                return result.data;
            }
            return null;
        }

        // HTTP 서버 모드 (브라우저)
        const response = await fetch(`/api/data/${dataType}`);
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        return null;
    } catch (e) {
        console.warn(`로컬 데이터 로드 실패 (${dataType}):`, e);
        // 폴백: localStorage에서 불러오기
        const stored = localStorage.getItem(dataType === 'templates' ? 'blockTemplates' :
                                            dataType === 'patterns' ? 'connectionPatterns' :
                                            dataType === 'recent' ? 'recentDrawings' : dataType);
        return stored ? JSON.parse(stored) : null;
    }
}

/**
 * 로컬 데이터 저장하기
 */
async function saveLocalData(dataType, data) {
    try {
        // PyWebView 모드 (EXE)
        if (isPyWebView()) {
            const result = await window.pywebview.api.save_data(dataType, data);
            if (result.success) {
                console.log(`[DATA] ${dataType} 저장 완료 (PyWebView)`);
                return true;
            }
            throw new Error(result.error);
        }

        // HTTP 서버 모드 (브라우저)
        const response = await fetch(`/api/data/${dataType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            console.log(`[DATA] ${dataType} 저장 완료`);
            return true;
        }
        throw new Error(result.error);
    } catch (e) {
        console.warn(`로컬 데이터 저장 실패 (${dataType}):`, e);
        // 폴백: localStorage에 저장
        const key = dataType === 'templates' ? 'blockTemplates' :
                    dataType === 'patterns' ? 'connectionPatterns' :
                    dataType === 'recent' ? 'recentDrawings' : dataType;
        localStorage.setItem(key, JSON.stringify(data));
        return false;
    }
}

/**
 * 앱 시작 시 로컬 데이터 로드
 */
async function initLocalData() {
    console.log('[INIT] 로컬 데이터 로드 중...');

    // PyWebView 환경에서는 API 준비 대기
    if (typeof window.pywebview !== 'undefined') {
        console.log('[INIT] PyWebView 환경 감지, API 대기 중...');
        await waitForPyWebView(3000);
        if (isPyWebView()) {
            console.log('[INIT] PyWebView API 준비 완료');
        }
    }

    // 템플릿 로드
    const templates = await loadLocalData('templates');
    if (templates && Array.isArray(templates)) {
        blockTemplates = templates;
        console.log(`[INIT] 템플릿 ${templates.length}개 로드됨`);
        if (typeof updateTemplateList === 'function') updateTemplateList();
    }

    // 패턴 로드
    const patterns = await loadLocalData('patterns');
    if (patterns && Array.isArray(patterns)) {
        connectionPatterns = patterns;
        console.log(`[INIT] 연결 패턴 ${patterns.length}개 로드됨`);
    }

    // 최근 도면 로드
    const recent = await loadLocalData('recent');
    if (recent && Array.isArray(recent)) {
        recentDrawings = recent;
        console.log(`[INIT] 최근 도면 ${recent.length}개 로드됨`);
    }
}

/**
 * 텍스트 파일 읽기 (PyWebView API 또는 fetch)
 */
async function readTextFile(relativePath) {
    try {
        if (isPyWebView()) {
            const result = await window.pywebview.api.read_text_file(relativePath);
            if (result.success) {
                return result.data;
            }
            throw new Error(result.error);
        }
        // HTTP 모드
        const response = await fetch(relativePath);
        if (!response.ok) throw new Error('File not found');
        return await response.text();
    } catch (e) {
        console.error(`파일 읽기 실패: ${relativePath}`, e);
        throw e;
    }
}

/**
 * JSON 파일 읽기 (PyWebView API 또는 fetch)
 */
async function readJsonFile(relativePath) {
    try {
        if (isPyWebView()) {
            const result = await window.pywebview.api.read_json_file(relativePath);
            if (result.success) {
                return result.data;
            }
            throw new Error(result.error);
        }
        // HTTP 모드
        const response = await fetch(relativePath);
        if (!response.ok) throw new Error('File not found');
        return await response.json();
    } catch (e) {
        console.error(`JSON 읽기 실패: ${relativePath}`, e);
        throw e;
    }
}

// ============ 데이터 로드 ============

async function loadFromSupabase() {
    await showDrawingList();
}

async function loadFromLocal() {
    try {
        if ('showOpenFilePicker' in window) {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }],
                startIn: 'downloads'
            });

            currentFileHandle = handle;
            const file = await handle.getFile();
            await loadFileContent(file, handle.name);
            console.log('로컬 파일 로드 완료:', handle.name);
        } else {
            document.getElementById('jsonImportInput').click();
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('파일 로드 실패:', e);
            showToast('파일을 열 수 없습니다: ' + e.message, 'error');
        }
    }
}

async function loadData(useSupabase = true, drawingNumber = '510', pageNumber = 187, version = 'original') {
    try {
        if (useSupabase) {
            console.log(`Loading data from Supabase: ${drawingNumber}/Page ${pageNumber} (${version})...`);
            await loadDataFromSupabase(drawingNumber, pageNumber, version);
        } else {
            console.log('Loading data from local files...');
            await loadDataFromLocal();
        }

        console.log('Loaded:', layoutData.length, 'elements,', linesData.length, 'lines');
    } catch (e) {
        console.error('Error loading data:', e);
        showToast('Error loading data: ' + e.message, 'error');
    }
}

async function loadDataFromSupabase(drawingNumber, pageNumber, version = 'original') {
    const folder = version;
    try {
        // Load layout.csv
        const { data: layoutBlob, error: layoutError } = await supabaseClient.storage
            .from('drawings')
            .download(`${drawingNumber}/${folder}/page_${pageNumber}_layout.csv`);

        if (layoutError) throw new Error('Layout download failed: ' + layoutError.message);
        const layoutText = await layoutBlob.text();
        layoutData = parseCSV(layoutText);

        // Load lines.csv
        const { data: linesBlob, error: linesError } = await supabaseClient.storage
            .from('drawings')
            .download(`${drawingNumber}/${folder}/page_${pageNumber}_lines.csv`);

        if (linesError) throw new Error('Lines download failed: ' + linesError.message);
        const linesText = await linesBlob.text();
        linesData = parseCSV(linesText);

        // Load groups.json (optional)
        try {
            const { data: groupsBlob, error: groupsError } = await supabaseClient.storage
                .from('drawings')
                .download(`${drawingNumber}/${folder}/page_${pageNumber}_groups.json`);

            if (!groupsError && groupsBlob) {
                const groupsText = await groupsBlob.text();
                groupsData = JSON.parse(groupsText);
            } else {
                groupsData = {};
            }
        } catch(e) {
            console.log('No groups.json file, using empty groups');
            groupsData = {};
        }

        // Load connections (optional)
        try {
            const { data: connBlob, error: connError} = await supabaseClient.storage
                .from('drawings')
                .download(`${drawingNumber}/${folder}/page_${pageNumber}_connections_custom.json`);

            if (!connError && connBlob) {
                const connText = await connBlob.text();
                customConnections = JSON.parse(connText);
            } else {
                customConnections = [];
            }
        } catch(e) {
            customConnections = [];
        }

        console.log('✓ Loaded from Supabase');
    } catch (e) {
        console.error('Supabase load failed:', e);
        throw e;
    }
}

async function loadDataFromLocal() {
    const layoutText = await fetch('data/page_187_layout.csv').then(r => r.text());
    layoutData = parseCSV(layoutText);

    const linesText = await fetch('data/page_187_lines.csv').then(r => r.text());
    linesData = parseCSV(linesText);

    groupsData = await fetch('data/page_187_groups.json').then(r => r.json());

    try {
        const connData = await fetch('data/page_187_connections_custom.json').then(r => r.json());
        customConnections = connData || [];
    } catch(e) {
        customConnections = [];
    }

    console.log('✓ Loaded from local files');
}

// ============ 도면 목록 관리 ============

// 현재 선택된 도면 목록 인덱스
let selectedDrawingIndex = -1;

// Drop 클릭 시 도면 목록 열기
function filterDrawingsByDrop(dropNum) {
    showDrawingList();
    // 필터링은 추후 구현
}

async function showDrawingList() {
    closeDrawingMenu();
    document.getElementById('drawing-list-dialog').style.display = 'flex';
    await loadDrawingListFromSupabase();
    switchFolder('original');
    selectedDrawingIndex = -1;

    // 검색창에 자동 포커스 및 키보드 이벤트 설정
    requestAnimationFrame(() => {
        setTimeout(() => {
            const searchInput = document.getElementById('drawing-search');
            if (searchInput) {
                searchInput.focus();

                // 기존 이벤트 제거 후 새로 추가
                searchInput.removeEventListener('keydown', handleDrawingSearchKeydown);
                searchInput.addEventListener('keydown', handleDrawingSearchKeydown);
            }
        }, 200);
    });
}

// 도면 검색창 키보드 이벤트 핸들러
function handleDrawingSearchKeydown(e) {
    const items = document.querySelectorAll('.drawing-list-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedDrawingIndex = Math.min(selectedDrawingIndex + 1, items.length - 1);
        updateDrawingListSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedDrawingIndex = Math.max(selectedDrawingIndex - 1, 0);
        updateDrawingListSelection(items);
    } else if (e.key === 'Enter' && selectedDrawingIndex >= 0) {
        e.preventDefault();
        items[selectedDrawingIndex]?.click();
    } else if (e.key === 'Escape') {
        closeDrawingList();
    }
}

// 선택된 항목 하이라이트 업데이트
function updateDrawingListSelection(items) {
    items.forEach((item, idx) => {
        if (idx === selectedDrawingIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('selected');
        }
    });
}

async function loadDrawingListFromSupabase() {
    try {
        localDrawingIndex = await readJsonFile('drawings/drawing_index.json');
        console.log('Loaded local drawing_index.json:', Object.keys(localDrawingIndex).length, 'drawings');

        supabaseDrawings = {};
        for (const [drawingNum, info] of Object.entries(localDrawingIndex)) {
            supabaseDrawings[drawingNum] = {
                info: {
                    drawing_number: drawingNum,
                    title: info.title,
                    drop: info.drop,
                    drop_name: info.drop_name,
                    pages: info.pages,
                    first_page: info.first_page
                },
                original: info.pages.map(p => ({ name: `page_${p}_layout.csv` })),
                edited: []
            };
        }

        console.log('Converted to supabaseDrawings format:', Object.keys(supabaseDrawings).length);
    } catch (err) {
        console.error('Error loading drawing list:', err);
    }
}

function closeDrawingList() {
    document.getElementById('drawing-list-dialog').style.display = 'none';

    // 다이얼로그를 제어로직 모드로 복원
    restoreDrawingListForLogic();
}

function restoreDrawingListForLogic() {
    const sortOption = document.getElementById('sort-option');
    const dropFilter = document.getElementById('drop-filter');

    // 정렬 옵션 복원
    if (sortOption) {
        sortOption.innerHTML = `
            <option value="drop">Drop별</option>
            <option value="page">페이지순</option>
            <option value="drawing">도면번호순</option>
        `;
        sortOption.onchange = () => renderDrawingList();
    }

    // 필터 표시 복원
    if (dropFilter) {
        dropFilter.style.display = '';
        const filterLabel = dropFilter.previousElementSibling;
        if (filterLabel && filterLabel.textContent.includes('필터')) {
            filterLabel.style.display = '';
        }
    }

    // 검색 입력 이벤트 복원
    const searchInput = document.getElementById('drawing-search');
    if (searchInput) {
        searchInput.oninput = () => filterDrawingList();
    }

    // 제목 복원
    const title = document.querySelector('#drawing-list-dialog h2');
    if (title) {
        title.innerHTML = '도면 목록 <span id="drawing-count" style="font-size:14px; color:#888;"></span>';
    }
}

function switchFolder(folder) {
    currentListFolder = folder;
    document.querySelectorAll('.folder-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.includes(folder === 'original' ? '원본' : '편집'));
    });
    renderDrawingList();
}

function filterDrawingList() {
    selectedDrawingIndex = -1; // 검색 시 선택 초기화
    renderDrawingList();
}

function renderDrawingList() {
    const content = document.getElementById('drawing-list-content');

    if (Object.keys(supabaseDrawings).length > 0) {
        renderFilteredDrawingList(content);
    } else {
        content.innerHTML = '<p style="color:#666; text-align:center;">도면 데이터 없음</p>';
    }
}

function renderFilteredDrawingList(content) {
    const searchQuery = (document.getElementById('drawing-search')?.value || '').toLowerCase();
    const sortOption = document.getElementById('sort-option')?.value || 'drop';
    const dropFilter = document.getElementById('drop-filter')?.value || 'all';

    let allPages = [];

    for (const [drawingNum, data] of Object.entries(supabaseDrawings)) {
        const info = data.info;
        const pages = info.pages || [info.first_page];

        for (const pageNum of pages) {
            allPages.push({
                drawingNum,
                pageNum,
                title: info.title || 'No title',
                drop: info.drop || 0,
                dropName: info.drop_name || 'Unknown'
            });
        }
    }

    // 검색 필터
    if (searchQuery) {
        allPages = allPages.filter(item =>
            item.drawingNum.toLowerCase().includes(searchQuery) ||
            item.title.toLowerCase().includes(searchQuery) ||
            item.dropName.toLowerCase().includes(searchQuery) ||
            String(item.pageNum).includes(searchQuery)
        );
    }

    // Drop 필터
    if (dropFilter !== 'all') {
        allPages = allPages.filter(item => String(item.drop) === dropFilter);
    }

    document.getElementById('drawing-count').textContent = `(${allPages.length}개)`;

    if (allPages.length === 0) {
        content.innerHTML = '<p style="color:#666; text-align:center;">검색 결과 없음</p>';
        return;
    }

    // 정렬
    if (sortOption === 'page') {
        allPages.sort((a, b) => a.pageNum - b.pageNum);
        renderFlatList(content, allPages);
    } else if (sortOption === 'drawing') {
        allPages.sort((a, b) => a.drawingNum.localeCompare(b.drawingNum) || a.pageNum - b.pageNum);
        renderFlatList(content, allPages);
    } else {
        renderGroupedByDrop(content, allPages);
    }
}

function renderFlatList(content, pages) {
    const html = pages.map(item => `
        <div class="drawing-list-item" onclick="loadFromSupabaseWithVersion('${item.drawingNum}', ${item.pageNum}, 'original')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="name" style="font-weight:bold;">${formatDrawingId(item.drawingNum, item.pageNum)}</span>
            </div>
            <span class="info" style="font-size:12px; color:#666;">${item.title}</span>
        </div>
    `).join('');

    content.innerHTML = html;
}

function renderGroupedByDrop(content, pages) {
    const dropGroups = {};

    for (const item of pages) {
        const drop = item.drop;
        if (!dropGroups[drop]) {
            dropGroups[drop] = {
                name: item.dropName,
                drawings: []
            };
        }
        dropGroups[drop].drawings.push(item);
    }

    let html = '';
    for (const [drop, group] of Object.entries(dropGroups).sort((a, b) => Number(a[0]) - Number(b[0]))) {
        html += `<div class="drop-group">
            <div class="drop-header" style="background:#1a1a2e; padding:8px; margin:10px 0 5px 0; border-radius:4px;">
                <strong>Drop ${drop}</strong> - ${group.name} (${group.drawings.length})
            </div>`;

        for (const item of group.drawings) {
            html += `
                <div class="drawing-list-item" onclick="loadFromSupabaseWithVersion('${item.drawingNum}', ${item.pageNum}, 'original')">
                    <span class="name">${formatDrawingId(item.drawingNum, item.pageNum)}</span>
                    <span class="info">${item.title}</span>
                </div>`;
        }
        html += '</div>';
    }

    content.innerHTML = html;
}

async function loadFromSupabaseWithVersion(drawingNumber, pageNumber, version) {
    closeDrawingList();
    hideWelcomeScreen();

    // 이전 선택 초기화 (하이라이트 잔상 방지, pendingTagHighlight는 유지)
    selectedElement = null;

    currentDrawingNumber = drawingNumber;
    currentPageNumber = pageNumber;
    currentVersion = version;

    // 파일 경로 저장
    const info = localDrawingIndex[drawingNumber];
    if (info) {
        const dropFolder = `drop_${info.drop}_${info.drop_name.replace(/ /g, '_')}`;
        currentFilePath = `drawings/${dropFolder}/${drawingNumber}/page_${pageNumber}`;
    }

    await loadDataFromLocalDrawings(drawingNumber, pageNumber);
    processData();
    updateStats();
    updateConnectionList();

    resizeCanvas();
    setTimeout(() => {
        resetView();
    }, 50);

    const drawingName = formatDrawingLabel(drawingNumber, pageNumber);
    setDrawingTitle(drawingName);
    drawingNavPush(drawingNumber, pageNumber, '');

    // 도면 ID 설정 (최근 목록은 저장 시에만 추가)
    currentDrawingId = `${drawingNumber}_page_${pageNumber}`;
}

async function loadVectorLines(drawingNumber, pageNumber) {
    console.log(`[VLines] 시도: drawingNumber=${drawingNumber}, pageNumber=${pageNumber}`);
    vectorLinesData = [];

    // localDrawingIndex가 없거나 도면번호가 없으면 로드
    if (!localDrawingIndex || !localDrawingIndex[drawingNumber]) {
        try {
            const indexData = await readJsonFile('drawings/drawing_index.json');
            localDrawingIndex = indexData;
            console.log('[VLines] drawing_index.json 로드됨, keys:', Object.keys(indexData).length);
        } catch (e) {
            console.log('[VLines] drawing_index.json 로드 실패:', e.message);
            return;
        }
    }

    const info = localDrawingIndex?.[drawingNumber];
    if (!info) {
        console.log('[VLines] localDrawingIndex에 도면 없음, drawingNumber:', drawingNumber, 'keys sample:', Object.keys(localDrawingIndex || {}).slice(0, 5));
        return;
    }

    const dropFolder = `drop_${info.drop}_${info.drop_name.replace(/ /g, '_')}`;
    const basePath = `drawings/${dropFolder}/${drawingNumber}`;
    const pagesToTry = pageNumber ? [pageNumber] : (info.pages || []);

    console.log(`[VLines] basePath=${basePath}, pages=${JSON.stringify(pagesToTry)}`);

    if (pageNumber) {
        // 페이지 번호가 확실하면 바로 로드
        const filePath = `${basePath}/page_${pageNumber}_vlines.csv`;
        try {
            const vlinesText = await readTextFile(filePath);
            vectorLinesData = parseCSV(vlinesText);
            console.log(`[VLines] 성공! ${vectorLinesData.length}개 로드 (page ${pageNumber})`);
            if (showVectorLines) render();
            return;
        } catch (e) {
            console.log(`[VLines] ${filePath} 실패:`, e.message);
        }
    } else {
        // 페이지 번호 모르면 포트 좌표로 매칭
        const refPorts = [];
        if (groupsData) {
            for (const g of Object.values(groupsData)) {
                for (const p of (g.ports || [])) {
                    refPorts.push({ cx: parseFloat(p.cx), cy: parseFloat(p.cy) });
                    if (refPorts.length >= 20) break;
                }
                if (refPorts.length >= 20) break;
            }
        }
        let bestPage = null, bestScore = 0;
        for (const pn of pagesToTry) {
            const filePath = `${basePath}/page_${pn}_vlines.csv`;
            try {
                const vlinesText = await readTextFile(filePath);
                const vlines = parseCSV(vlinesText);
                // 포트 근처에 vline endpoint가 몇 개나 있는지 점수 계산
                let score = 0;
                for (const port of refPorts) {
                    for (const vl of vlines) {
                        const d1 = Math.hypot(parseFloat(vl.x1) - port.cx, parseFloat(vl.y1) - port.cy);
                        const d2 = Math.hypot(parseFloat(vl.x2) - port.cx, parseFloat(vl.y2) - port.cy);
                        if (d1 < 30 || d2 < 30) { score++; break; }
                    }
                }
                console.log(`[VLines] page ${pn}: ${vlines.length}개, score=${score}/${refPorts.length}`);
                if (score > bestScore) {
                    bestScore = score;
                    bestPage = pn;
                    vectorLinesData = vlines;
                }
            } catch (e) {
                console.log(`[VLines] ${filePath} 실패:`, e.message);
            }
        }
        if (bestPage) {
            currentPageNumber = bestPage;
            console.log(`[VLines] 자동 매칭: page ${bestPage} (score=${bestScore})`);
            if (showVectorLines) render();
            return;
        }
    }
    console.log('[VLines] 모든 페이지에서 vlines 없음');
}

async function loadDataFromLocalDrawings(drawingNumber, pageNumber) {
    const info = localDrawingIndex[drawingNumber];
    if (!info) {
        showToast('Drawing not found: ' + drawingNumber, 'error');
        return;
    }

    const dropFolder = `drop_${info.drop}_${info.drop_name.replace(/ /g, '_')}`;
    const basePath = `drawings/${dropFolder}/${drawingNumber}`;

    try {
        // layout.csv
        try {
            const layoutText = await readTextFile(`${basePath}/page_${pageNumber}_layout.csv`);
            layoutData = parseCSV(layoutText);
        } catch (e) {
            layoutData = [];
        }

        // lines.csv
        try {
            const linesText = await readTextFile(`${basePath}/page_${pageNumber}_lines.csv`);
            linesData = parseCSV(linesText);
        } catch (e) {
            linesData = [];
        }

        // vlines.csv (vector lines)
        try {
            const vlinesText = await readTextFile(`${basePath}/page_${pageNumber}_vlines.csv`);
            vectorLinesData = parseCSV(vlinesText);
        } catch (e) {
            vectorLinesData = [];
        }

        // groups.json
        try {
            groupsData = await readJsonFile(`${basePath}/page_${pageNumber}_groups.json`);
        } catch(e) {
            groupsData = {};
        }

        customConnections = [];
        console.log(`Loaded local: ${basePath}/page_${pageNumber} - ${layoutData.length} elements, ${linesData.length} lines, ${vectorLinesData.length} vlines`);
        // 블록 컨텍스트 비동기 로드
        loadPageBlockContext(`${basePath}/page_${pageNumber}_layout.csv`).catch(() => {});
    } catch(e) {
        console.error('Error loading local drawings:', e);
        showToast('파일 로드 실패: ' + e.message, 'error');
    }
}

/**
 * drawings 폴더 경로에서 직접 로드 (localDrawingIndex 불필요)
 */
async function loadFromDrawingsPath(dropFolder, drawingNumber, pageNumber) {
    closeDrawingList();
    hideWelcomeScreen();

    selectedElement = null;

    currentDrawingNumber = drawingNumber;
    currentPageNumber = pageNumber;
    currentVersion = 'original';
    currentFilePath = `drawings/${dropFolder}/${drawingNumber}/page_${pageNumber}`;

    const basePath = `drawings/${dropFolder}/${drawingNumber}`;

    try {
        // layout.csv
        try {
            const layoutText = await readTextFile(`${basePath}/page_${pageNumber}_layout.csv`);
            layoutData = parseCSV(layoutText);
        } catch (e) {
            layoutData = [];
        }

        // lines.csv
        try {
            const linesText = await readTextFile(`${basePath}/page_${pageNumber}_lines.csv`);
            linesData = parseCSV(linesText);
        } catch (e) {
            linesData = [];
        }

        // vlines.csv (vector lines)
        try {
            const vlinesText = await readTextFile(`${basePath}/page_${pageNumber}_vlines.csv`);
            vectorLinesData = parseCSV(vlinesText);
        } catch (e) {
            vectorLinesData = [];
        }

        // groups.json
        try {
            groupsData = await readJsonFile(`${basePath}/page_${pageNumber}_groups.json`);
        } catch(e) {
            groupsData = {};
        }

        customConnections = [];
        console.log(`Loaded from path: ${basePath}/page_${pageNumber} - ${layoutData.length} elements, ${linesData.length} lines`);

        // 블록 컨텍스트 비동기 로드 (포트 설명 + 신호 정보)
        loadPageBlockContext(`${basePath}/page_${pageNumber}_layout.csv`).catch(() => {});

        processData();
        updateStats();
        updateConnectionList();
        if (typeof updateTemplateList === 'function') updateTemplateList();

        resizeCanvas();
        setTimeout(() => {
            resetView();
        }, 50);

        const drawingName = formatDrawingLabel(drawingNumber, pageNumber);
        setDrawingTitle(drawingName);
        drawingNavPush(drawingNumber, pageNumber, filePath || '');

        // 최근 도면에 추가
        currentDrawingId = `${drawingNumber}_page_${pageNumber}`;

    } catch(e) {
        console.error('Error loading from drawings path:', e);
        showToast('파일 로드 실패: ' + e.message, 'error');
    }
}

function loadDrawingFile(folder, filename) {
    closeDrawingList();
    const path = `drawings/${folder}/${filename}`;

    fetch(path)
        .then(r => {
            if (!r.ok) throw new Error('파일을 찾을 수 없습니다');
            return r.json();
        })
        .then(data => {
            applyLoadedData(data, filename);
        })
        .catch(err => {
            showToast(`파일 로드 실패: ${err.message}`, 'error');
        });
}

function applyLoadedData(data, filename) {
    layoutData = [];
    linesData = [];
    vectorLinesData = [];
    blocks = [];
    ports = [];
    allElements = [];
    groupsData = {};
    customConnections = [];
    bgImage = null;

    if (data.layout) layoutData = data.layout;
    if (data.lines) {
        linesData = data.lines;
        lineIndex = null;
    }
    if (data.groups) {
        groupsData = data.groups;
        for (const group of Object.values(groupsData)) {
            if (group.ports) {
                for (const port of group.ports) {
                    if (!port.role) {
                        port.role = classifyPortRole(port.name);
                    }
                }
            }
        }
    }
    if (data.connections) {
        customConnections = data.connections;
        // 기존 auto 연결 방향 정규화
        function loadOutScore(name, group) {
            const n = (name || '').toUpperCase();
            const g = (group || '').toUpperCase();
            if (n === 'OUT') return 10;
            if (g.startsWith('MODE') || g.startsWith('M/A')) {
                if (['MODE','AUTO','MAN','NO'].includes(n)) return 8;
            }
            return 0;
        }
        for (const c of customConnections) {
            if (c.source !== 'auto') continue;
            const fromScore = loadOutScore(c.fromName, c.fromGroup);
            const toScore = loadOutScore(c.toName, c.toGroup);
            if (toScore > fromScore) {
                [c.fromId, c.toId] = [c.toId, c.fromId];
                [c.fromName, c.toName] = [c.toName, c.fromName];
                [c.fromParent, c.toParent] = [c.toParent, c.fromParent];
                [c.fromGroup, c.toGroup] = [c.toGroup, c.fromGroup];
                [c.fromCx, c.toCx] = [c.toCx, c.fromCx];
                [c.fromCy, c.toCy] = [c.toCy, c.fromCy];
                if (c.waypoints) c.waypoints.reverse();
            }
        }
    }

    if (data.background?.data) {
        bgImage = new Image();
        bgImage.src = data.background.data;
        bgImage.onload = () => render();
    }

    // meta에서 도면번호/페이지 복원
    if (data.meta?.drawingNumber) currentDrawingNumber = data.meta.drawingNumber;
    if (data.meta?.pageNumber) currentPageNumber = data.meta.pageNumber;
    // 파일명에서 도면번호 추출 (meta 없는 기존 파일 호환)
    if (!currentDrawingNumber) {
        const numMatch = filename.match(/^(\d+)/);
        if (numMatch) currentDrawingNumber = numMatch[1];
    }

    processData();
    updateConnectionList();
    updateStats();
    if (typeof updateTemplateList === 'function') updateTemplateList();
    render();

    // vlines.csv 비동기 로드 (있으면)
    if (currentDrawingNumber && currentPageNumber) {
        loadVectorLines(currentDrawingNumber, currentPageNumber).catch(() => {});
    }

    const drawingName = data.meta?.name || filename.replace('.json', '');
    setDrawingTitle(drawingName);
    currentOriginalFile = filename;
    isEdited = data.meta?.edited || checkIfEdited();
    updateEditedIndicator();

    // 안정적 ID 생성: 파일명 기반 (새로고침 후에도 재사용 가능)
    const stableId = `saved_${filename.replace('.json', '')}`;
    currentDrawingId = stableId;
    // saved 폴더 경로 추정
    const savedPath = currentDrawingNumber
        ? `saved/${currentDrawingNumber}/${filename}`
        : `saved/${filename}`;
    currentFilePath = savedPath;
    addToRecentDrawings(currentDrawingId, drawingName, savedPath);

    hideWelcomeScreen();

    const blockCount = blocks.length;
    const portCount = ports.length;
    showToast(`도면 로드 완료 - 블록: ${blockCount}개, 포트: ${portCount}개`, 'success');
}

// ============ 파일 가져오기 ============

async function importDrawing() {
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON 파일',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            currentFileHandle = handle;
            const file = await handle.getFile();
            await loadFileContent(file, handle.name);
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('파일 열기 실패:', e);
            }
        }
    } else {
        document.getElementById('jsonImportInput').click();
    }
}

function handleJSONImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    currentFileHandle = null;
    loadFileContent(file, file.name);
    event.target.value = '';
}

async function loadFileContent(file, fileName) {
    closeDrawingMenu();
    console.log('=== JSON Import Start ===');
    console.log('File:', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log('Parsed JSON keys:', Object.keys(data));

            layoutData = [];
            linesData = [];
            blocks = [];
            ports = [];
            allElements = [];
            groupsData = {};
            customConnections = [];
            bgImage = null;

            if (data.layout && Array.isArray(data.layout)) {
                layoutData = data.layout;
                console.log('Layout loaded:', layoutData.length, 'elements');
            }
            if (data.lines && Array.isArray(data.lines)) {
                linesData = data.lines;
                console.log('Lines loaded:', linesData.length, 'lines');
            }

            if (data.groups) {
                groupsData = data.groups;
                // ports가 있는 그룹 수 확인
                let groupsWithPorts = 0;
                let totalPorts = 0;
                for (const [name, group] of Object.entries(groupsData)) {
                    if (group.ports && group.ports.length > 0) {
                        groupsWithPorts++;
                        totalPorts += group.ports.length;
                    }
                }
                console.log('Groups loaded:', Object.keys(groupsData).length,
                    '- 포트 있는 그룹:', groupsWithPorts, '/ 총 포트:', totalPorts);
            }
            if (data.connections) {
                customConnections = data.connections;
                console.log('Connections loaded:', customConnections.length);
            }

            if (data.blocks && Array.isArray(data.blocks)) {
                blocks = data.blocks.map(b => ({
                    ...b,
                    cx: parseFloat(b.cx),
                    cy: parseFloat(b.cy),
                    x1: parseFloat(b.x1),
                    y1: parseFloat(b.y1),
                    x2: parseFloat(b.x2),
                    y2: parseFloat(b.y2)
                }));
                console.log('Blocks loaded:', blocks.length);
            }
            if (data.ports && Array.isArray(data.ports)) {
                ports = data.ports.map(p => ({
                    ...p,
                    cx: parseFloat(p.cx),
                    cy: parseFloat(p.cy),
                    x1: parseFloat(p.x1),
                    y1: parseFloat(p.y1),
                    x2: parseFloat(p.x2),
                    y2: parseFloat(p.y2)
                }));
                console.log('Ports loaded:', ports.length);
            }

            if (data.background && data.background.data) {
                bgImage = new Image();
                bgImage.src = data.background.data;
                bgImage.onload = () => render();
                console.log('Background image loaded');
            }

            if ((!data.blocks || data.blocks.length === 0) && (!data.ports || data.ports.length === 0)) {
                processData();
            } else {
                allElements = [...blocks, ...ports];
                rebuildGroupPortsFromPortsArray();
                syncPortsWithGroups();
                syncBlocksWithGroups();
                console.log('allElements 재구성:', allElements.length);
            }
            updateConnectionList();
            updateStats();
            render();

            const drawingName = data.meta?.name || file.name.replace('.json', '').replace(/_data_\d+_\d+/, '').replace(/_edited$/, '');
            setDrawingTitle(drawingName);

            // 도면번호 추출 시도 (파일명 시작 부분의 숫자)
            const fileBaseName = file.name.replace('.json', '');
            const numberMatch = fileBaseName.match(/^(\d+)/);
            if (numberMatch) {
                currentDrawingNumber = numberMatch[1];
                console.log('[IMPORT] 도면번호 자동 추출:', currentDrawingNumber);
            } else {
                // 자동 추출 실패 시 사용자 입력 요청
                const userInput = prompt('도면번호를 입력하세요 (숫자만, 없으면 빈칸):', '');
                if (userInput && /^\d+$/.test(userInput.trim())) {
                    currentDrawingNumber = userInput.trim();
                    console.log('[IMPORT] 도면번호 사용자 입력:', currentDrawingNumber);
                } else {
                    currentDrawingNumber = null;
                    console.log('[IMPORT] 도면번호 없음');
                }
            }

            currentOriginalFile = file.name;
            isEdited = data.meta?.edited || checkIfEdited();
            updateEditedIndicator();

            // 안정적 ID: 파일명 기반
            const stableId = `saved_${file.name.replace('.json', '')}`;
            currentDrawingId = stableId;
            const savedPath = currentDrawingNumber
                ? `saved/${currentDrawingNumber}/${file.name}`
                : `saved/${file.name}`;
            currentFilePath = savedPath;
            addToRecentDrawings(currentDrawingId, drawingName, savedPath);

            hideWelcomeScreen();

            const blockCount = blocks.length;
            const portCount = ports.length;
            const connCount = customConnections.length;
            showToast(`도면 로드 완료 - 블록: ${blockCount}개, 포트: ${portCount}개, 연결선: ${connCount}개`, 'success');

            resizeCanvas();
            setTimeout(() => {
                resetView();
            }, 100);

            console.log('=== JSON Import Complete ===');

        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            showToast('JSON 파일을 읽을 수 없습니다: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function applyDrawingData(data) {
    console.log('=== Apply Drawing Data ===');
    console.log('Data keys:', Object.keys(data));

    layoutData = [];
    linesData = [];
    vectorLinesData = [];
    blocks = [];
    ports = [];
    allElements = [];
    groupsData = {};
    customConnections = [];
    bgImage = null;

    if (data.layout && Array.isArray(data.layout)) {
        layoutData = data.layout;
    }
    if (data.lines && Array.isArray(data.lines)) {
        linesData = data.lines;
    }

    if (data.groups) {
        groupsData = data.groups;
    }
    if (data.connections) {
        customConnections = data.connections;
    }

    if (data.background && data.background.data) {
        bgImage = new Image();
        bgImage.src = data.background.data;
        bgImage.onload = () => render();
    }

    processData();
    updateConnectionList();
    updateStats();
    render();

    // vlines 비동기 로드
    if (currentDrawingNumber) {
        loadVectorLines(currentDrawingNumber, currentPageNumber).catch(() => {});
    }

    const drawingName = data.meta?.name || 'Unknown';
    setDrawingTitle(drawingName);

    isEdited = data.meta?.edited || checkIfEdited();
    updateEditedIndicator();

    console.log(`Loaded: ${blocks.length} blocks, ${ports.length} ports, ${customConnections.length} connections`);
}

// ============ 파일 저장 ============

async function saveData() {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '_' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

    const saveObj = {
        timestamp: now.toISOString(),
        meta: {
            drawingNumber: currentDrawingNumber || null,
            pageNumber: currentPageNumber || null,
            name: currentDrawingName || currentDrawingNumber || ''
        },
        layout: layoutData,
        groups: groupsData,
        connections: customConnections,
        lines: linesData,
        blocks: blocks,
        ports: ports
    };

    // 파일명 결정 (도면번호 우선, 없으면 도면이름, 없으면 untitled)
    const drawingName = currentDrawingNumber || currentDrawingName || 'untitled';
    const filename = `${drawingName}_${timestamp}.json`;
    const subfolder = currentDrawingNumber || '';

    try {
        let result;

        // PyWebView 모드 (EXE)
        if (isPyWebView()) {
            result = await window.pywebview.api.save_file(filename, saveObj, subfolder);
        } else {
            // HTTP 서버 모드
            const response = await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    content: saveObj,
                    subfolder: subfolder
                })
            });
            result = await response.json();
        }

        if (result.success) {
            console.log('[SAVED]', result.path);
            showToast(`저장 완료: ${result.path}`, 'success');
            isEdited = false;
            updateEditedIndicator();
            // saved 파일 경로로 최근 도면에 추가
            const savedFilePath = subfolder ? `saved/${subfolder}/${filename}` : `saved/${filename}`;
            const savedDrawingId = `saved_${filename.replace('.json', '')}`;
            addToRecentDrawings(savedDrawingId, `${drawingName} (저장됨)`, savedFilePath);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.warn('저장 실패, 다운로드로 대체:', e);
        // 폴백: 다운로드
        const saveStr = JSON.stringify(saveObj, null, 2);
        downloadFile(saveStr, filename);
        showToast(`파일 다운로드됨: ${filename}`, 'info');
    }
}

// LLM용 텍스트 생성 (순수 데이터 생성만, 저장/전송 없음)
function generateLLMText() {
    // 1. groups → 블록별 포트 이름만
    const llmGroups = {};
    for (const [gId, g] of Object.entries(groupsData || {})) {
        const name = g.name || gId;
        const portNames = (g.ports || []).map(p => p.name).filter(Boolean);
        llmGroups[name] = {
            type: g.type || '',
            ports: portNames
        };
    }

    // 2. connections: auto + manual 합쳐서 from/to만
    const allConns = [];
    const connSet = new Set();

    // auto connections
    if (typeof autoConnectResults !== 'undefined' && autoConnectResults) {
        for (const c of autoConnectResults) {
            const key = `${c.fromGroup}.${c.fromName}->${c.toGroup}.${c.toName}`;
            if (!connSet.has(key)) {
                connSet.add(key);
                allConns.push({
                    from: `${c.fromGroup}.${c.fromName}`,
                    to: `${c.toGroup}.${c.toName}`,
                    source: 'auto'
                });
            }
        }
    }

    // manual connections
    for (const c of (customConnections || [])) {
        const fg = c.fromGroup || c.fromParent || '';
        const tg = c.toGroup || c.toParent || '';
        const key = `${fg}.${c.fromName}->${tg}.${c.toName}`;
        if (!connSet.has(key)) {
            connSet.add(key);
            allConns.push({
                from: `${fg}.${c.fromName}`,
                to: `${tg}.${c.toName}`,
                source: c.source || 'manual'
            });
        }
    }

    // 포트사전(전역 portDict) — startup 시 loadPortDictOnce()로 로드됨
    const pd = (typeof portDict !== 'undefined') ? portDict : {};

    // 심볼 설명 가져오기
    const symbolDesc = (type) => {
        if (typeof blockDictionary !== 'undefined' && blockDictionary[type]) {
            return blockDictionary[type].desc || '';
        }
        return '';
    };

    // TXT 생성 — LLM이 이해할 수 있는 자연어 기반 구조
    const lines = [];
    const drawingLabel = formatDrawingLabel(currentDrawingNumber || '?', currentPageNumber || '?');

    lines.push(`=== 도면 정보 ===`);
    lines.push(`도면: ${drawingLabel}`);
    lines.push('');

    // 심볼 사전 요약 (LLM이 블록 타입을 정확히 이해하도록)
    const bdt = (typeof btBlockData !== 'undefined') ? btBlockData : {};
    const usedTypes = new Set();
    if (typeof scanResults !== 'undefined' && scanResults) {
        for (const sr of scanResults) {
            if (sr.blockType && sr.blockType !== 'OCB_BLOCK' && sr.blockType !== 'ALG_BLOCK') {
                usedTypes.add(sr.blockType);
            }
        }
    }
    // 그룹 데이터에서도 추출
    for (const [, g] of Object.entries(groupsData || {})) {
        const t = g.type || '';
        if (t && !['BLOCK_TYPE','OTHER','PORT','SIGNAL','REF_SIGNAL','OCB_BLOCK','ALG_BLOCK'].includes(t)) {
            usedTypes.add(t);
        }
    }
    if (usedTypes.size > 0) {
        lines.push(`=== 심볼 사전 (이 도면에 사용된 블록 타입) ===`);
        for (const typeId of usedTypes) {
            const sym = bdt[typeId];
            if (sym) {
                let symLine = `[${typeId}] ${sym.desc || ''}`;
                if (sym.ai) symLine += ` — ${sym.ai}`;
                if (sym.ports && sym.ports.length > 0) {
                    const portSummary = sym.ports.map(p => `${p.direction === 'output' ? '→' : '←'}${p.name}${p.description ? '(' + p.description + ')' : ''}`).join(', ');
                    symLine += ` | 포트: ${portSummary}`;
                }
                lines.push(symLine);
            }
        }
        lines.push('');
    }

    // 스캔 결과 인덱스 (스캔 탭 실행 시 생성됨 — 없으면 {}로 폴백)
    const scanIdx = {};
    if (typeof scanResults !== 'undefined' && scanResults) {
        for (const sr of scanResults) scanIdx[sr.name] = sr;
    }
    const sd = (typeof scanDescriptions !== 'undefined') ? scanDescriptions : {};
    const gd = (typeof groupsData !== 'undefined') ? groupsData : {};

    // ── portConnMap: allConns에서 포트별 연결 맵 구성 ──
    // portConnMap[blockName][portName] = { isOutput: bool, conns: [{block, port}] }
    const portConnMap = {};
    for (const c of allConns) {
        const dotF = c.from.indexOf('.');
        const dotT = c.to.indexOf('.');
        const fromBlock = dotF >= 0 ? c.from.slice(0, dotF) : c.from;
        const fromPort  = dotF >= 0 ? c.from.slice(dotF + 1) : '';
        const toBlock   = dotT >= 0 ? c.to.slice(0, dotT) : c.to;
        const toPort    = dotT >= 0 ? c.to.slice(dotT + 1) : '';
        if (!portConnMap[fromBlock]) portConnMap[fromBlock] = {};
        if (!portConnMap[fromBlock][fromPort]) portConnMap[fromBlock][fromPort] = { isOutput: true, conns: [] };
        portConnMap[fromBlock][fromPort].conns.push({ block: toBlock, port: toPort });
        if (!portConnMap[toBlock]) portConnMap[toBlock] = {};
        if (!portConnMap[toBlock][toPort]) portConnMap[toBlock][toPort] = { isOutput: false, conns: [] };
        portConnMap[toBlock][toPort].conns.push({ block: fromBlock, port: fromPort });
    }

    // ── 포트 설명 보조표 ──
    const portDescFallback = {
        'K':'이득/게인', 'GAIN':'이득/게인',
        'd':'미분 이득', 'dt':'미분 시간', 'DRAT':'미분 감쇠',
        'A':'입력값', 'B':'입력값 B', 'G':'게인 입력',
        'FLAG':'조건 신호', 'YES':'참 분기', 'NO':'거짓 분기',
        'T':'Transfer 참조', 'H':'상한', 'L':'하한',
        'IN1':'입력1', 'IN2':'입력2', 'IN3':'입력3', 'IN4':'입력4', 'IN':'입력',
        'OUT':'출력', 'STPT':'설정값 (SP)', 'PV':'측정값 (PV)', 'SP':'설정값',
        'MODE':'모드', 'MRE':'수동리셋', 'ARE':'자동리셋',
        'MAN':'수동입력', 'AUTO':'자동입력',
        'I':'적분값',
    };

    // ── autoSymMap (autoDesc → btBlockData 심볼ID) ──
    const autoSymMapLLM = [
        [/PID/i, 'PID'], [/AND/i, 'AND'], [/\bOR\b/i, 'OR'],
        [/NOT\b|반전/i, 'N'], [/Transfer|조건 선택/i, 'T'],
        [/Gain|Bias|이득/i, 'K'], [/Multiply|곱/i, 'X'],
        [/최고값|High.*선택/i, 'H'], [/최저값|Low.*선택/i, 'L'],
        [/리미터|Limit/i, 'LIM'], [/나눗셈/i, 'DIV'],
        [/절대값/i, 'ABS'], [/합산/i, 'SUM'], [/M\/A/i, 'M/A'],
    ];

    // ── 심볼 포트 목록 조회 ──
    const getBdtPorts = (blockType, autoDescStr) => {
        const bdt = (typeof btBlockData !== 'undefined') ? btBlockData : {};
        let entry = bdt[blockType];
        if (!entry && autoDescStr) {
            for (const [re, symId] of autoSymMapLLM) {
                if (re.test(autoDescStr) && bdt[symId]) { entry = bdt[symId]; break; }
            }
        }
        return entry ? (entry.ports || []) : [];
    };

    // ── REF_SIGNAL 판별 ──
    const isRefSignal = (name) => {
        const rawType = (gd[name]?.type || '').toUpperCase();
        if (rawType === 'REF_SIGNAL') return true;
        return /^D\d+-\d+-\d+/.test(name);
    };

    // ── 연결 대상 텍스트 생성 ──
    const connText = (otherBlock, otherPort) => {
        // 빈 블록명 (포트만 있는 경우) 방어
        if (!otherBlock) return otherPort || '';
        // REF_SIGNAL (D03-511-xx_... 형태)
        if (isRefSignal(otherBlock)) {
            const m = otherBlock.match(/^(D\d+-\d+-\d+)/);
            if (m) {
                const ref = parseRefSignal(m[1]);
                const refTitle = ref ? getDrawingTitle(ref.task) : '';
                const label = m[1];
                return refTitle ? `[${label} ${refTitle}]` : `[${label}]`;
            }
            return `[${otherBlock}]`;
        }
        const osr = scanIdx[otherBlock] || {};
        const ogd = gd[otherBlock] || {};
        if (osr.type === 'SIGNAL' || ogd.type === 'SIGNAL') {
            let s = otherBlock;
            const ti = (osr.portSignals || {})['태그정보'] || {};
            const tagType = ti.tag_type || osr.autoDesc || '';
            if (tagType) s += ` [${tagType}]`;
            if (ti.equipment) s += ` @ ${ti.equipment}`;
            return s;
        }
        const oRawType = osr.blockType || ogd.type || '';
        const oMetaTypes = ['BLOCK_TYPE','OTHER','PORT','SIGNAL','REF_SIGNAL','OCB_BLOCK','ALG_BLOCK'];
        const oNamePrefix = otherBlock.split('_')[0] || '';
        const oPrefixType = /^(N|AND|OR|NOT|XOR|NAND|NOR|MODE|SR|RS|SEL|H|L|GT|LT|GE|LE|EQ|NE|SUM|ADD|SUB|K|X|MUL|DIV|ABS|LIM|PID|LAG|INTEG|RAMP)$/i.test(oNamePrefix) ? oNamePrefix.toUpperCase() : '';
        const oType = oMetaTypes.includes(oRawType.toUpperCase()) ? oPrefixType : (oRawType || oPrefixType);
        const showType = oType ? `(${oType})` : '';
        return `${otherBlock}${showType}${otherPort ? '.' + otherPort : ''}`;
    };

    // 블록 분류: 제어블록 vs SIGNAL vs REF_SIGNAL
    const ctrlBlocks = {};
    const signalBlocks = {};
    const refBlocks = {};
    for (const [name, info] of Object.entries(llmGroups)) {
        const gdType = (gd[name]?.type || '').toUpperCase();
        if (isRefSignal(name)) {
            refBlocks[name] = info;
        } else if (gdType === 'SIGNAL' || (scanIdx[name] || {}).type === 'SIGNAL') {
            signalBlocks[name] = info;
        } else {
            ctrlBlocks[name] = info;
        }
    }

    // SIGNAL 블록 요약 (개별 나열 대신 표)
    if (Object.keys(signalBlocks).length > 0) {
        lines.push(`=== 센서/계기 신호 (${Object.keys(signalBlocks).length}개) ===`);
        for (const [name] of Object.entries(signalBlocks)) {
            const sr = scanIdx[name] || {};
            const ti = (sr.portSignals || {})['태그정보'] || {};
            const sigSd = sd[name];
            const equip = ti.equipment || (typeof sigSd === 'string' ? sigSd : sigSd?.equipment || '') || sr.autoDesc || '';
            const tagType = ti.tag_type || '';
            let sigLine = name;
            if (tagType) sigLine += ` [${tagType}]`;
            if (equip) sigLine += ` — ${equip}`;
            lines.push(sigLine);
        }
        lines.push('');
    }

    // 외부참조 블록 요약 (도면별 그룹)
    if (Object.keys(refBlocks).length > 0) {
        const refByDrawing = {};
        for (const [name] of Object.entries(refBlocks)) {
            const m = name.match(/^(D\d+-\d+)-(\d+)/);
            const drw = m ? m[1].replace(/^D0*/, '') : name;
            if (!refByDrawing[drw]) refByDrawing[drw] = [];
            refByDrawing[drw].push(name);
        }
        lines.push(`=== 외부 참조 신호 (${Object.keys(refBlocks).length}개) ===`);
        for (const [drw, names] of Object.entries(refByDrawing)) {
            // drw = "3-511" → task=511에서 제목 조회
            const taskMatch = drw.match(/\d+-(\d+)/);
            const taskNum = taskMatch ? taskMatch[1] : '';
            const refTitle = taskNum ? getDrawingTitle(taskNum) : '';
            lines.push(`${drw}${refTitle ? ' ' + refTitle : ''}: ${names.length}개 신호`);
        }
        lines.push('');
    }

    // 제어 블록 목록 — 포트 중심 통합 표시
    lines.push(`=== 제어 블록 (${Object.keys(ctrlBlocks).length}개) ===`);
    lines.push('');
    for (const [name, info] of Object.entries(ctrlBlocks)) {
        const bi = pd[name] || {};
        const sr = scanIdx[name] || {};
        const si = sd[name];

        // 타입: 스캔 userType 우선 → scanResults → portDict → 블록명 접두어 추론
        const userType   = si && typeof si === 'object' ? (si.userType || '') : '';
        // groupsData.type에서 'BLOCK_TYPE'/'OTHER'/'PORT'/'SIGNAL'/'REF_SIGNAL' 같은 메타타입은 제외
        const gdRawType  = gd[name]?.type || '';
        const gdUseful   = ['BLOCK_TYPE','OTHER','PORT','SIGNAL','REF_SIGNAL'].includes(gdRawType.toUpperCase()) ? '' : gdRawType;
        // 블록명 접두어에서 타입 추출 (N_853_2251 → N, AND_xxx → AND)
        const namePrefix = name.split('_')[0] || '';
        const prefixType = /^(N|AND|OR|NOT|XOR|NAND|NOR|MODE|SR|RS|SEL|H|L|GT|LT|GE|LE|EQ|NE|SUM|ADD|SUB|K|X|MUL|DIV|ABS|LIM|PID|LAG|INTEG|RAMP)$/i.test(namePrefix) ? namePrefix.toUpperCase() : '';
        let pdType     = userType || sr.blockType || bi.type || gdUseful || prefixType || '';

        // 포트 기반 자동 타입 추론 (OCB_BLOCK/ALG_BLOCK에서 포트 구성으로 판별)
        if (!pdType || pdType === 'OCB_BLOCK' || pdType === 'ALG_BLOCK') {
            const portSet = new Set((info.ports || []).map(p => (p || '').toUpperCase()));
            const connPortSet = new Set(Object.keys(portConnMap[name] || {}).map(p => p.toUpperCase()));
            const allPorts = new Set([...portSet, ...connPortSet]);
            if ((allPorts.has('PV') || allPorts.has('STPT') || allPorts.has('SP')) && (allPorts.has('OUT') || allPorts.has('MV'))) {
                pdType = 'PID';
            } else if (allPorts.has('FLAG') && (allPorts.has('YES') || allPorts.has('NO'))) {
                pdType = 'T';
            } else if (allPorts.has('MODE') && allPorts.has('I') && allPorts.has('IN1')) {
                pdType = 'M/A/C';
            } else if (allPorts.has('NUM') && allPorts.has('DEN')) {
                pdType = 'DIV';
            }
        }

        const pdTypedesc = sr.blockDesc || bi.type_desc || symbolDesc(pdType) || '';
        const memo       = si && typeof si === 'object' ? (si.memo || bi.memo || '') : (bi.memo || '');
        const scanEquip  = si ? (typeof si === 'string' ? si : (si.equipment || '')) : '';
        const equipment  = scanEquip || bi.equipment || '';

        // 블록 헤더
        let header = `[${memo ? memo + '(' + name + ')' : name}]`;
        if (pdType)      header += ` ${pdType}`;
        if (pdTypedesc)  header += ` — ${pdTypedesc}`;
        if (sr.autoDesc && sr.autoDesc !== pdTypedesc) header += ` (${sr.autoDesc})`;
        lines.push(header);

        if (equipment) lines.push(`  설비: ${equipment}`);

        // ── 포트별 연결 정보 ──
        const bdtPorts = getBdtPorts(pdType, sr.autoDesc || '');
        const bdtPortMap = {};
        for (const bp of bdtPorts) {
            if (bp.name) bdtPortMap[bp.name.toUpperCase()] = bp;
        }

        const myConns = portConnMap[name] || {};

        // 포트 목록: 연결된 포트 우선, 심볼 정의 포트는 연결 있거나 핵심 포트만
        // 블록 타입명과 같은 포트(AND, N, OR 등)는 제외
        const blockTypeUpper = pdType.toUpperCase();
        const portNames = [];
        const seenPorts = new Set();
        // 연결 있는 포트 먼저 (중요 포트)
        for (const pn of Object.keys(myConns)) {
            const pUp = pn.toUpperCase();
            if (pn && pUp !== blockTypeUpper && !seenPorts.has(pUp)) {
                portNames.push(pn);
                seenPorts.add(pUp);
            }
        }
        // 심볼 정의 포트 중 연결된 것만 표시 (LLM에 미연결 포트는 노이즈)
        // 핵심 포트(PV, STPT, OUT, IN1, IN2, FLAG, YES, NO, MODE)는 연결 없어도 표시
        const corePortNames = new Set(['PV','STPT','SP','OUT','MV','IN1','IN2','FLAG','YES','NO','MODE','IN']);
        for (const bp of bdtPorts) {
            if (!bp.name) continue;
            const pUp = bp.name.toUpperCase();
            if (pUp === blockTypeUpper) continue;
            if (seenPorts.has(pUp)) continue;
            const hasConn = !!(myConns[bp.name] || myConns[pUp]);
            const isCore = corePortNames.has(pUp);
            // 연결 있거나 핵심 포트만 표시
            if (!hasConn && !isCore) continue;
            portNames.push(bp.name);
            seenPorts.add(pUp);
        }
        // info.ports에서 누락된 연결 포트만 추가 (타입명 제외)
        for (const pn of (info.ports || [])) {
            const pUp = pn.toUpperCase();
            if (pn && pUp !== blockTypeUpper && !seenPorts.has(pUp) && myConns[pn]) {
                portNames.push(pn);
                seenPorts.add(pUp);
            }
        }

        for (const pName of portNames) {
            const pUpper = pName.toUpperCase();
            const bp = bdtPortMap[pUpper];
            const connInfo = myConns[pName] || myConns[pUpper] || null;

            // 방향 결정: 확실한 포트만 고정, 나머지는 연결맵/심볼 정의 따름
            // OUT = 항상 출력, PV/STPT/IN1/IN2/FLAG = 항상 입력
            // YES/NO/MODE = 블록에 따라 입력/출력 → 연결맵 방향 사용
            const _ALWAYS_OUT = new Set(['OUT','MV','Q','AUTO','MRE','ARE']);
            const _ALWAYS_IN = new Set(['PV','STPT','IN1','IN2','IN3','IN4','IN','FLAG','NUM','DEN','SP']);
            let dir = '·';
            if (_ALWAYS_OUT.has(pUpper)) {
                dir = '→';
            } else if (_ALWAYS_IN.has(pUpper)) {
                dir = '←';
            } else if (connInfo) {
                dir = connInfo.isOutput ? '→' : '←';
            } else if (bp) {
                dir = bp.direction === 'output' ? '→' : '←';
            }

            // 설명: 심볼 > 보조표
            const desc = (bp && bp.description) ? bp.description
                       : portDescFallback[pUpper] || portDescFallback[pName] || '';

            let portLine = `  ${dir} ${pName}`;
            if (desc) portLine += ` (${desc})`;

            if (connInfo && connInfo.conns.length > 0) {
                const connStr = connInfo.conns.map(c => connText(c.block, c.port)).join(', ');
                portLine += ` : ${connStr}`;
            }
            lines.push(portLine);
        }

        lines.push('');
    }

    // (isRefSignal은 위쪽에서 정의됨)

    // 블록 표시 레이블 생성
    // REF_SIGNAL → [외부참조 D03-024-01]
    // OCB/ALG → [타입] 메모(코드) 또는 코드
    const blockLabel = (name, port, portDesc) => {
        if (isRefSignal(name)) {
            const m = name.match(/^(D\d+-\d+-\d+)/);
            const refDrw = m ? m[1].replace(/^D0*/, '') : name;
            return `[외부참조 ${refDrw}]`;
        }
        const bi = pd[name] || {};
        const type = bi.type || gd[name]?.type || '';
        const memo = bi.memo || '';
        const role = bi.role || '';
        let label = memo ? `${memo}(${name})` : name;
        if (type) label = `[${type}]${label}`;
        if (port) {
            const pDesc = portDesc || ((bi.ports || {})[port]?.desc || '');
            label += `.${port}${pDesc ? '(' + pDesc + ')' : ''}`;
        }
        return label;
    };

    // 외부 참조 신호 섹션 (스캔 결과에 refConnections가 있을 때만)
    const refScanItems = Object.values(scanIdx).filter(sr => sr.type === 'REF_SIGNAL');
    if (refScanItems.length > 0) {
        lines.push(`=== 외부 참조 신호 (${refScanItems.length}개) ===`);
        for (const sr of refScanItems) {
            const refDrw = typeof extractRefSignalPageNumber === 'function'
                ? extractRefSignalPageNumber(sr.name) : sr.name;
            let s = `[${sr.name}] 출처도면: ${refDrw}`;
            if (sr.autoDesc && sr.autoDesc !== refDrw) s += ` — ${sr.autoDesc}`;
            lines.push(s);
            const refConns = sr.refConnections || [];
            for (const rc of refConns.slice(0, 5)) {
                const eq = rc.equipment ? ` @ ${rc.equipment}` : '';
                const tt = rc.tag_type ? ` [${rc.tag_type}]` : '';
                lines.push(`  연결: ${rc.block}.${rc.port}${tt}${eq}`);
            }
        }
        lines.push('');
    }

    // 제어 블록 연결 흐름 섹션 제거 — 블록 목록의 포트 연결 정보와 중복됨
    // 데이터 크기 절감 (~5,000자 감소) → MISO 분석 속도 향상

    return lines.join('\n');
}

// LLM용 텍스트 로컬 저장
async function exportForLLM() {
    const textStr = generateLLMText();
    if (!textStr) { showToast('저장할 데이터 없음', 'warning'); return; }

    const drawingName = currentDrawingNumber || currentDrawingName || 'untitled';
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const filename = `${drawingName}_llm_${ts}.txt`;

    // 저장 시도
    try {
        if (isPyWebView()) {
            const subfolder = currentDrawingNumber || '';
            const result = await window.pywebview.api.save_text_file(filename, textStr, subfolder);
            const savedPath = (result && result.path) ? result.path : filename;
            showToast(`LLM 저장: ${savedPath}`, 'success', 5000);
        } else {
            downloadFile(textStr, filename);
            showToast(`LLM용 다운로드: ${filename}`, 'info');
        }
    } catch (e) {
        console.warn('LLM export 실패, 다운로드로 대체:', e);
        downloadFile(textStr, filename);
        showToast(`LLM용 다운로드: ${filename}`, 'info');
    }
}

// LLM용 심볼 사전 내보내기 (CSV)
async function exportDictForLLM() {
    const lines = [];

    lines.push('# DCS 제어 로직 심볼 사전');
    lines.push('# 이 사전은 XXX_llm_YYYYMMDD.csv 로직 데이터 파일과 함께 사용됩니다');
    lines.push('# 로직 데이터 파일의 [블록]과 [연결]을 이 사전의 규칙에 따라 해석하세요');
    lines.push('#');
    lines.push('# [분석규칙]');
    lines.push('# - 반드시 연결(connections)을 실제로 끝까지 추적하여 구체적인 결론을 도출할 것');
    lines.push('# - "확인해야 합니다" "분석해야 합니다" 같은 방법론 설명 금지. 직접 추적해서 결과를 말할 것');
    lines.push('# - 센서→중간블록→PID→ALG→최종출력까지 전체 체인을 빠짐없이 따라갈 것');
    lines.push('# - 응답형식: 2부 구성으로 답변할 것');
    lines.push('#   [Part1] 자연어 서술식 요약 (블록코드명 사용금지, 설비명/기능명으로 이야기하듯 서술)');
    lines.push('#     - OCB,ALG,MODE_,AND_,N_,OR_ 등 블록코드명 절대 사용금지. "PID제어기","조건선택기","연산블록" 등 기능명 사용');
    lines.push('#     - 도면번호(3/511등)와 센서태그(SIT2681A등 처음1회)는 허용');
    lines.push('#     - 문장을 이어서 이야기하듯 서술. 나열식/목록식 최소화');
    lines.push('#     1)개요(한문장) 2)제어흐름(서술식) 3)인터락요약(서술식) 4)운전모드요약(서술식)');
    lines.push('#   [Part2] 상세 블록 추적 (블록코드명 포함, 엔지니어 검증용) - 블록명 먼저, 설명 뒤에, 빈줄로 분리');
    lines.push('#     5)신호흐름(블록명→설명, 들여쓰기) 6)T형블록(블록별 FLAG/YES/NO) 7)운전모드 8)PID파라미터 9)병렬루프비교');
    lines.push('# - connections의 from=출력(신호출발), to=입력(신호도착)');
    lines.push('# - .블록명(점시작) = 외부/참조 신호에서 들어오는 연결');
    lines.push('#');
    lines.push('# [검증규칙 - 반드시 수행]');
    lines.push('# - T형블록(FLAG/YES/NO/OUT) 누락검증: 해당 루프의 모든 T형블록을 빠짐없이 나열할 것. 출력→입력을 역추적하여 빠진 T형블록이 없는지 확인');
    lines.push('# - STPT 출처 명시: PID블록의 STPT포트에 실제로 어떤 연결이 들어오는지 연결데이터에서 찾아 명시할 것. 연결이 없으면 "연결없음(미설정 또는 누락)"으로 표기');
    lines.push('# - STPT 결정 체인: STPT에 연결된 블록이 T형이면 그 T형의 FLAG/YES/NO도 추적하여 STPT가 어떤 조건에서 어떤 값으로 결정되는지 전체 체인을 보여줄 것');
    lines.push('# - 동일블록 재등장 금지: 한 블록이 여러 역할처럼 보여도 실제 연결이 다르면 각각 구분하여 설명');
    lines.push('# - 병렬루프 식별: 동일 구조가 반복되면(A/B/C/D 펌프 등) 하나를 상세분석 후 나머지는 차이점만 표로 비교');
    lines.push('#');
    lines.push('# [다중 도면 분석규칙]');
    lines.push('# - 여러 도면 CSV가 첨부된 경우 도면 간 참조신호(D03-XXX-YY)를 자동 매칭하여 도면 간 연결관계를 설명할 것');
    lines.push('# - 참조신호의 실제 출처를 해당 도면에서 찾아 "D03-511-03 = XXX 도면의 YYY 블록 출력" 형태로 명시');
    lines.push('# - 도면 간 인터락 충돌 가능성(동시운전 시 경합조건 등)을 분석할 것');
    lines.push('#');
    lines.push('# [로직 개선 분석규칙]');
    lines.push('# - 요청 시 현재 로직의 문제점/보완점을 제시할 것');
    lines.push('# - 분석항목: 인터락 누락(보호로직 부족), 경합조건(동시운전 충돌), 모드전환 안전성, PID 루프 안정성');
    lines.push('# - 수정 제안 시 "현재: A→B, 제안: A→C→B" 형태로 구체적 연결 변경을 명시');
    lines.push('# - 안전성 관련 개선은 반드시 우선 제시');
    lines.push('');

    // 블록 타입 사전
    lines.push('[블록타입]');
    lines.push('타입코드,설명,예시이름');
    lines.push('SIGNAL,현장 계측기 신호(센서/트랜스미터),"TIT(온도),PIT(압력),SIT(속도),FIT(유량),LIT(수위)"');
    lines.push('REF_SIGNAL,다른 도면 참조 신호,D03-XXX-YY (도면3/페이지XXX/신호YY)');
    lines.push('OCB_BLOCK,기능 블록(포트구성에 따라 기능 다름),OCB0088XXX');
    lines.push('ALG_BLOCK,알고리즘/PID 제어 블록,ALG-01130XX');
    lines.push('OTHER(MODE_),자동/수동 운전모드 결정 블록,MODE_XXX_YYY');
    lines.push('BLOCK_TYPE,논리/연산 블록,"AND,OR,N(NOT),ABS"');
    lines.push('');

    // 포트 사전
    lines.push('[포트사전]');
    lines.push('포트명,방향,설명,소속블록타입');
    lines.push('OUT,출력,신호 출력,공통');
    lines.push('IN1,입력,입력1,공통');
    lines.push('IN2,입력,입력2,공통');
    lines.push('IN3,입력,입력3,공통');
    lines.push('A,입력,입력값 또는 Alarm,OCB/ALG/SIGNAL');
    lines.push('G,입력,Good(정상상태),SIGNAL');
    lines.push('-,입력,신호값,SIGNAL');
    lines.push('FLAG,입력,조건(Bool) 참→YES 거짓→NO,OCB(T형)');
    lines.push('YES,입력,FLAG=참일때 출력할 값,OCB(T형)');
    lines.push('NO,입력,FLAG=거짓일때 출력할 값,OCB(T형)');
    lines.push('T,정보,블록 타입 표시,OCB(T형)');
    lines.push('NUM,입력,분자(Numerator),OCB(나눗셈)');
    lines.push('DEN,입력,분모(Denominator),OCB(나눗셈)');
    lines.push('STPT,입력,설정값(Setpoint),OCB(PID)');
    lines.push('PV,입력,현재값(Process Variable),OCB(PID)');
    lines.push('K,입력,비례이득,OCB(PID)');
    lines.push('d,입력,미분시간,OCB(PID)');
    lines.push('dt,입력,적분시간,OCB(PID)');
    lines.push('H,입력,상한값(High Limit),OCB(리미터)');
    lines.push('MODE,출력(MODE블록)/입력(ALG),운전모드,MODE→ALG');
    lines.push('AUTO,출력,자동운전 허가신호,MODE');
    lines.push('MAN,출력,수동운전 신호,MODE');
    lines.push('M/A,입력,수동/자동 전환,MODE');
    lines.push('MRE,입력,Manual Request Enable,MODE');
    lines.push('ARE,입력,Auto Request Enable,MODE');
    lines.push('I,입력,피드백(보통 자기OUT→I=적분기),ALG');
    lines.push('');

    // OCB 기능 분류
    lines.push('[OCB블록 기능분류]');
    lines.push('포트구성,기능,동작');
    lines.push('"FLAG,YES,NO,OUT,T",비교/선택(T형),OUT = FLAG ? YES : NO');
    lines.push('"NUM,DEN,OUT",나눗셈,OUT = NUM / DEN');
    lines.push('"A,OUT",단순전달,OUT = A');
    lines.push('"STPT,PV,OUT,K,d,dt",PID제어,"OUT = PID(STPT,PV)"');
    lines.push('"H,IN1,OUT",리미터,OUT = min(IN1 H)');
    lines.push('IN1만,최종출력,현장기기로 전달');
    lines.push('');

    // 패턴
    lines.push('[주요 로직 패턴]');
    lines.push('패턴명,설명');
    lines.push('T형체인,FLAG→YES/NO 선택이 연쇄적으로 이어지는 조건분기');
    lines.push('PID루프,센서(SIGNAL)→PID(OCB)→ALG→출력(OCB.IN1)');
    lines.push('MODE연동,MODE블록이 ALG의 자동/수동 결정. MODE.AUTO가 AND와 연결→자동운전조건');
    lines.push('자기피드백,ALG.OUT→ALG.I 연결은 적분기 피드백(정상)');
    lines.push('참조도면,REF_SIGNAL은 다른 도면 신호. 해당 도면 추가확인 필요');

    const textStr = lines.join('\n');
    const filename = 'dcs_symbol_dictionary.csv';

    try {
        if (isPyWebView()) {
            const subfolder = currentDrawingNumber || '';
            const result = await window.pywebview.api.save_text_file(filename, textStr, subfolder);
            const savedPath = (result && result.path) ? result.path : filename;
            showToast(`사전 저장: ${savedPath}`, 'success', 5000);
        } else {
            downloadFile(textStr, filename);
            showToast(`사전 다운로드: ${filename}`, 'info');
        }
    } catch (e) {
        console.warn('사전 export 실패:', e);
        showToast('사전 내보내기 실패: ' + e.message, 'error');
    }
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data.groups) {
                groupsData = data.groups;
                customConnections = data.connections || [];
                if (data.lines) linesData = data.lines;
                if (data.blocks) blocks = data.blocks || [];
                if (data.ports) ports = data.ports || [];

                blocks = blocks.map(b => ({
                    ...b,
                    cx: parseFloat(b.cx),
                    cy: parseFloat(b.cy),
                    x1: parseFloat(b.x1),
                    y1: parseFloat(b.y1),
                    x2: parseFloat(b.x2),
                    y2: parseFloat(b.y2)
                }));
                ports = ports.map(p => ({
                    ...p,
                    cx: parseFloat(p.cx),
                    cy: parseFloat(p.cy),
                    x1: parseFloat(p.x1),
                    y1: parseFloat(p.y1),
                    x2: parseFloat(p.x2),
                    y2: parseFloat(p.y2)
                }));

                console.log('[파일 로드] Combined format - groups:', Object.keys(groupsData).length,
                    'connections:', customConnections.length,
                    'blocks:', blocks.length, 'ports:', ports.length);
            } else if (Array.isArray(data)) {
                customConnections = data;
                console.log('[파일 로드] Old connections format:', customConnections.length);
            } else if (data.type || data.cx) {
                groupsData = data;
                console.log('[파일 로드] Old groups format');
            }

            if (!data.blocks && !data.ports) {
                console.log('[파일 로드] processData() 호출');
                processData();
            } else {
                allElements = [...blocks, ...ports];
                rebuildGroupPortsFromPortsArray();
                syncPortsWithGroups();
                syncBlocksWithGroups();
                console.log('[파일 로드] allElements 재구성:', allElements.length, '개');
            }
            updateConnectionList();
            updateStats();
            render();
            console.log('Loaded: ' + file.name);
        } catch (err) {
            showToast('Error loading file: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);

    event.target.value = '';
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function saveCurrentDrawing() {
    try {
        console.log('저장 시작...');
        const drawing = getCurrentDrawingData();
        console.log('데이터 생성 완료:', drawing.meta.name);

        if (currentFileHandle) {
            await saveToFileHandle(drawing);
            return;
        }

        let fileName;
        if (currentOriginalFile && currentOriginalFile.includes('_edited')) {
            fileName = currentOriginalFile;
        } else {
            const baseName = drawing.meta.name.replace(/_edited.*$/, '').replace(/_data_\d+_\d+/, '');
            fileName = `${baseName}_edited.json`;
        }
        console.log('파일명:', fileName);

        try {
            let result;

            // PyWebView 모드 (EXE)
            if (isPyWebView()) {
                result = await window.pywebview.api.save_file(fileName, drawing, '');
            } else {
                // HTTP 서버 모드
                const response = await fetch(`${SERVER_URL}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: fileName, content: drawing })
                });
                result = await response.json();
            }

            if (result.success) {
                currentOriginalFile = fileName;
                isEdited = true;
                updateEditedIndicator();
                closeDrawingMenu();
                addToRecentDrawings(fileName, drawing.meta.name);
                showServerSaveDialog(fileName, result.path);
                console.log('저장 완료:', result.path);
                return;
            }
        } catch (e) {
            console.log('저장 연결 실패, 다운로드로 대체:', e.message);
        }

        saveToDownload(drawing, fileName);
    } catch (e) {
        console.error('저장 에러:', e);
        showToast('저장 중 오류 발생: ' + e.message, 'error');
    }
}

async function saveToFileHandle(drawing) {
    try {
        const json = JSON.stringify(drawing, null, 2);
        const writable = await currentFileHandle.createWritable();
        await writable.write(json);
        await writable.close();

        isEdited = true;
        updateEditedIndicator();
        closeDrawingMenu();
        addToRecentDrawings(currentOriginalFile, drawing.meta.name);
        showSaveSuccessDialog(currentOriginalFile, '원본 파일에 저장됨');
        console.log('원본 파일에 저장 완료:', currentOriginalFile);
    } catch (e) {
        console.error('파일 저장 실패:', e);
        showToast('파일 저장 실패: ' + e.message, 'error');
    }
}

function saveToDownload(drawing, fileName) {
    const json = JSON.stringify(drawing, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    currentOriginalFile = fileName;
    isEdited = true;
    updateEditedIndicator();
    closeDrawingMenu();

    addToRecentDrawings(fileName, drawing.meta.name);
    showSaveConfirmDialog(fileName);
}

async function saveAsDrawing() {
    try {
        const currentName = document.getElementById('drawing-title').textContent;
        const baseName = currentName.replace(/_edited.*$/, '').replace(/_data_\d+_\d+/, '');

        const newName = prompt('새 파일 이름을 입력하세요:', baseName);
        if (!newName) return;

        const drawing = getCurrentDrawingData();
        drawing.meta.name = newName;
        const fileName = `${newName}_edited.json`;

        try {
            let result;

            // PyWebView 모드 (EXE)
            if (isPyWebView()) {
                result = await window.pywebview.api.save_file(fileName, drawing, '');
            } else {
                // HTTP 서버 모드
                const response = await fetch(`${SERVER_URL}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: fileName, content: drawing })
                });
                result = await response.json();
            }

            if (result.success) {
                setDrawingTitle(newName);
                currentOriginalFile = fileName;
                isEdited = true;
                updateEditedIndicator();
                closeDrawingMenu();
                addToRecentDrawings(fileName, newName);
                showServerSaveDialog(fileName, result.path);
                return;
            }
        } catch (e) {
            console.log('저장 연결 실패, 다운로드로 대체');
        }

        saveToDownload(drawing, fileName);
        setDrawingTitle(newName);
    } catch (e) {
        console.error('저장 에러:', e);
        showToast('저장 중 오류 발생: ' + e.message, 'error');
    }
}

function getCurrentDrawingData() {
    const groups = {};

    for (const [name, group] of Object.entries(groupsData)) {
        // ports 배열에서 parent가 일치하는 포트 찾기
        const portsFromArray = ports.filter(p => p.parent === name).map(p => ({
            name: p.name,
            type: p.type,
            cx: p.cx,
            cy: p.cy
        }));

        // 원본 groupsData에 이미 ports가 있으면 병합
        let groupPorts = portsFromArray;
        if (group.ports && group.ports.length > 0) {
            // 원본 ports 중 portsFromArray에 없는 것들 추가
            for (const origPort of group.ports) {
                const exists = portsFromArray.some(p =>
                    Math.abs(p.cx - origPort.cx) < 5 && Math.abs(p.cy - origPort.cy) < 5
                );
                if (!exists) {
                    groupPorts.push({
                        name: origPort.name || origPort.customName,
                        type: origPort.type || 'PORT',
                        cx: origPort.cx,
                        cy: origPort.cy
                    });
                }
            }
        }

        groups[name] = {
            type: group.type,
            cx: group.cx,
            cy: group.cy,
            x1: group.x1,
            y1: group.y1,
            x2: group.x2,
            y2: group.y2,
            ports: groupPorts
        };
    }

    for (const block of blocks) {
        if (!groups[block.name]) {
            groups[block.name] = {
                type: block.type,
                cx: block.cx,
                cy: block.cy,
                x1: block.x1,
                y1: block.y1,
                x2: block.x2,
                y2: block.y2,
                ports: []
            };
        }
    }

    return {
        meta: {
            id: currentDrawingId,
            name: document.getElementById('drawing-title').textContent,
            modified: new Date().toISOString(),
            edited: isEdited,
            originalFile: currentOriginalFile || null
        },
        layout: layoutData,
        lines: linesData,
        groups: groups,
        connections: customConnections,
        background: null
    };
}

// ============ 저장 다이얼로그 ============

function showSaveSuccessDialog(fileName, subText) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width:400px;">
            <div class="modal-header">
                <h2 style="color:#4CAF50;">저장 완료</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center; padding:30px 20px;">
                <div style="font-size:48px; margin-bottom:15px;">✓</div>
                <p style="margin-bottom:5px; font-size:14px;">${subText || '파일이 저장되었습니다.'}</p>
                <p style="color:#4fc3f7; font-size:13px; word-break:break-all;">${fileName}</p>
            </div>
            <div class="modal-footer" style="justify-content:center;">
                <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function showServerSaveDialog(fileName, fullPath) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width:450px;">
            <div class="modal-header">
                <h2 style="color:#4CAF50;">저장 완료</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center; padding:30px 20px;">
                <div style="font-size:48px; margin-bottom:15px;">✓</div>
                <p style="margin-bottom:10px; font-size:14px;">파일이 저장되었습니다.</p>
                <p style="color:#4fc3f7; font-size:12px; word-break:break-all;">${fullPath}</p>
            </div>
            <div class="modal-footer" style="justify-content:center; gap:10px;">
                <button class="btn-secondary" onclick="openSavedFolder()">📁 폴더 열기</button>
                <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function showSaveConfirmDialog(fileName) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal-dialog" style="max-width:400px;">
            <div class="modal-header">
                <h2 style="color:#4CAF50;">저장 완료</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="text-align:center; padding:30px 20px;">
                <div style="font-size:48px; margin-bottom:15px;">✓</div>
                <p style="margin-bottom:10px; font-size:14px;">파일이 다운로드 폴더에 저장되었습니다.</p>
                <p style="color:#4fc3f7; font-size:13px; word-break:break-all;">${fileName}</p>
            </div>
            <div class="modal-footer" style="justify-content:center; gap:10px;">
                <button class="btn-secondary" onclick="openDownloadFolder(); this.closest('.modal-overlay').remove();">
                    📁 다운로드 폴더 열기
                </button>
                <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();">
                    확인
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function openSavedFolder() {
    showToast('저장 폴더: ' + SAVE_FOLDER, 'info');
}

function openDownloadFolder() {
    showToast('다운로드 폴더에서 확인하세요 (Ctrl+J)', 'info');
}

// ============ 편집 상태 관리 ============

function updateEditedIndicator() {
    const indicator = document.getElementById('edited-indicator');
    if (indicator) {
        if (isEdited) {
            indicator.textContent = '(편집됨)';
            indicator.style.color = '#ff9800';
        } else {
            indicator.textContent = '(원본)';
            indicator.style.color = '#4caf50';
        }
    }
}

function checkIfEdited() {
    if (customConnections && customConnections.length > 0) {
        return true;
    }
    for (const group of Object.values(groupsData)) {
        if (group.ports && group.ports.length > 0) {
            return true;
        }
    }
    return false;
}

function markAsEdited() {
    if (!isEdited) {
        isEdited = true;
        updateEditedIndicator();
    }
}

// ============ 최근 작업 관리 ============

async function loadRecentDrawings() {
    try {
        // 파일에서 먼저 시도
        const recent = await loadLocalData('recent');
        if (recent && Array.isArray(recent)) {
            recentDrawings = recent;
            return;
        }
        // 폴백: localStorage
        const saved = localStorage.getItem('recentDrawings');
        recentDrawings = saved ? JSON.parse(saved) : [];
    } catch (e) {
        recentDrawings = [];
    }
}

function saveRecentDrawings() {
    const dataToSave = recentDrawings.slice(0, 10); // 최근 10개 저장
    // 파일 기반 저장
    saveLocalData('recent', dataToSave);
    // localStorage 백업
    try {
        localStorage.setItem('recentDrawings', JSON.stringify(dataToSave));
    } catch (e) {
        console.warn('Failed to save recent drawings', e);
    }
}

function addToRecentDrawings(id, name, filePath = null) {
    loadRecentDrawings();
    recentDrawings = recentDrawings.filter(d => d.id !== id);
    recentDrawings.unshift({
        id: id,
        name: name,
        filePath: filePath || currentFilePath || id,
        lastModified: new Date().toISOString()
    });
    saveRecentDrawings();
    updateRecentDrawingsList();
}

function updateRecentDrawingsList() {
    loadRecentDrawings();

    // 사이드 메뉴
    const sideList = document.getElementById('recent-drawings-list');
    if (sideList) {
        if (recentDrawings.length === 0) {
            sideList.innerHTML = '<p style="color:#666; font-size:11px;">작업 기록 없음</p>';
        } else {
            sideList.innerHTML = recentDrawings.slice(0, 5).map(d => {
                const isCurrent = d.id === currentDrawingId;
                const date = new Date(d.lastModified).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
                return `
                    <div class="recent-item ${isCurrent ? 'current' : ''}" style="display:flex; justify-content:space-between; align-items:center;">
                        <div onclick="loadDrawing('${d.id}')" style="flex:1; cursor:pointer;">
                            <div class="name">${d.name}</div>
                            <div class="date">${date}</div>
                        </div>
                        ${isCurrent ? '<span class="current-badge">현재</span>' :
                            `<span onclick="event.stopPropagation(); removeFromRecentDrawings('${d.id}')"
                                   style="cursor:pointer; color:#666; padding:4px 8px; font-size:14px;"
                                   onmouseover="this.style.color='#ff5252'"
                                   onmouseout="this.style.color='#666'"
                                   title="목록에서 삭제">×</span>`}
                    </div>
                `;
            }).join('');
        }
    }

    // 초기 화면 — 제어 로직 최근 도면 (#home-logic-recent)
    const homeLogicRecent = document.getElementById('home-logic-recent');
    if (homeLogicRecent) {
        if (recentDrawings.length === 0) {
            homeLogicRecent.innerHTML = '<p class="text-muted">최근 항목 없음</p>';
        } else {
            homeLogicRecent.innerHTML = recentDrawings.slice(0, 4).map(d => {
                const date = new Date(d.lastModified).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                return `
                    <div class="home-recent-item"
                         onclick="loadDrawing('${d.id}')"
                         onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                         onmouseout="this.style.background=''">
                        <span class="home-recent-name">${d.name}</span>
                        <span class="home-recent-date">${date}</span>
                    </div>
                `;
            }).join('');
        }
    }
}

/**
 * 최근 도면 목록에서 삭제
 */
function removeFromRecentDrawings(drawingId) {
    recentDrawings = recentDrawings.filter(d => d.id !== drawingId);
    saveRecentDrawings();
    // loadRecentDrawings 호출 없이 직접 UI 업데이트
    renderRecentDrawingsUI();
    console.log('[RECENT] 삭제됨:', drawingId);
}

/**
 * 최근 도면 목록 UI만 렌더링 (로드 없이)
 */
function renderRecentDrawingsUI() {
    // 사이드 메뉴
    const sideList = document.getElementById('recent-drawings-list');
    if (sideList) {
        if (recentDrawings.length === 0) {
            sideList.innerHTML = '<p style="color:#666; font-size:11px;">작업 기록 없음</p>';
        } else {
            sideList.innerHTML = recentDrawings.slice(0, 5).map(d => {
                const isCurrent = d.id === currentDrawingId;
                const date = new Date(d.lastModified).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
                return `
                    <div class="recent-item ${isCurrent ? 'current' : ''}" style="display:flex; justify-content:space-between; align-items:center;">
                        <div onclick="loadDrawing('${d.id}')" style="flex:1; cursor:pointer;">
                            <div class="name">${d.name}</div>
                            <div class="date">${date}</div>
                        </div>
                        ${isCurrent ? '<span class="current-badge">현재</span>' :
                            `<span onclick="event.stopPropagation(); removeFromRecentDrawings('${d.id}')"
                                   style="cursor:pointer; color:#666; padding:4px 8px; font-size:14px;"
                                   onmouseover="this.style.color='#ff5252'"
                                   onmouseout="this.style.color='#666'"
                                   title="목록에서 삭제">×</span>`}
                    </div>
                `;
            }).join('');
        }
    }

    // 초기 화면 — 제어 로직 최근 도면 (#home-logic-recent)
    const homeLogicRecent2 = document.getElementById('home-logic-recent');
    if (homeLogicRecent2) {
        if (recentDrawings.length === 0) {
            homeLogicRecent2.innerHTML = '<p class="text-muted">최근 항목 없음</p>';
        } else {
            homeLogicRecent2.innerHTML = recentDrawings.slice(0, 4).map(d => {
                const date = new Date(d.lastModified).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                return `
                    <div class="home-recent-item"
                         onclick="loadDrawing('${d.id}')"
                         onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                         onmouseout="this.style.background=''">
                        <span class="home-recent-name">${d.name}</span>
                        <span class="home-recent-date">${date}</span>
                    </div>
                `;
            }).join('');
        }
    }
}

async function loadDrawing(drawingId, filePath = null) {
    try {
        // 최근 도면에서 filePath 찾기
        if (!filePath) {
            const recentItem = recentDrawings.find(d => d.id === drawingId);
            if (recentItem && recentItem.filePath) {
                filePath = recentItem.filePath;
            }
        }

        // 1. filePath가 saved 폴더인 경우 - 저장 파일 로드
        if (filePath && filePath.startsWith('saved/')) {
            try {
                const relativePath = filePath.replace('saved/', '');
                let result;

                // PyWebView 모드 (EXE)
                if (isPyWebView()) {
                    result = await window.pywebview.api.load_file(relativePath);
                } else {
                    // HTTP 서버 모드
                    const response = await fetch(`${SERVER_URL}/load/${encodeURIComponent(relativePath)}`);
                    result = await response.json();
                }

                if (result.success && result.data) {
                    currentDrawingId = drawingId;
                    currentFilePath = filePath;
                    // saved 파일명에서 도면번호 추출 (예: 303_20260125_143000.json → 303)
                    const fileBaseName = filePath.split('/').pop().replace('.json', '');
                    const drawingNumMatch = fileBaseName.match(/^(?:saved_)?(\d+)_/);
                    if (drawingNumMatch) {
                        currentDrawingNumber = drawingNumMatch[1];
                        console.log('[SAVED] 도면번호 추출:', currentDrawingNumber);
                    }
                    applyDrawingData(result.data);
                    currentOriginalFile = fileBaseName;
                    closeDrawingMenu();
                    hideWelcomeScreen();
                    // 제목 설정
                    const name = recentDrawings.find(d => d.id === drawingId)?.name || drawingId;
                    setDrawingTitle(name);
                    selectedElement = null;
                    drawingNavPush(currentDrawingNumber, currentPageNumber, filePath);
                    console.log('saved 폴더에서 로드:', filePath);
                    return;
                }
            } catch (e) {
                console.error('saved 파일 로드 실패:', e);
            }
        }

        // 2. filePath가 drawings 폴더인 경우 - 직접 로드 (localDrawingIndex 불필요)
        if (filePath && filePath.startsWith('drawings/')) {
            const match = filePath.match(/drawings\/([^\/]+)\/(\d+)\/page_(\d+)/);
            if (match) {
                const dropFolder = match[1];
                const drawingNumber = match[2];
                const pageNumber = parseInt(match[3]);
                await loadFromDrawingsPath(dropFolder, drawingNumber, pageNumber);
                closeDrawingMenu();
                return;
            }
        }

        // 3. drawings 폴더 형식 (510_page_187 형태의 ID) - localDrawingIndex 필요
        if (drawingId.includes('_page_')) {
            const parts = drawingId.split('_page_');
            const drawingNumber = parts[0];
            const pageNumber = parseInt(parts[1]);
            if (drawingNumber && pageNumber && localDrawingIndex[drawingNumber]) {
                await loadFromSupabaseWithVersion(drawingNumber, pageNumber, 'original');
                closeDrawingMenu();
                return;
            }
        }

        // 4. saved 폴더에서 찾기 (ID로 직접)
        try {
            let result;

            // PyWebView 모드 (EXE)
            if (isPyWebView()) {
                result = await window.pywebview.api.load_file(filePath || drawingId);
            } else {
                // HTTP 서버 모드
                const response = await fetch(`${SERVER_URL}/load/${encodeURIComponent(filePath || drawingId)}`);
                result = await response.json();
            }

            if (result.success && result.data) {
                currentDrawingId = drawingId;
                currentOriginalFile = drawingId;
                // saved 파일명에서 도면번호 추출 (예: saved_303_20260125_143000 → 303)
                const drawingNumMatch = drawingId.match(/^(?:saved_)?(\d+)_/);
                if (drawingNumMatch) {
                    currentDrawingNumber = drawingNumMatch[1];
                    console.log('[SAVED] 도면번호 추출:', currentDrawingNumber);
                }
                applyDrawingData(result.data);
                closeDrawingMenu();
                hideWelcomeScreen();
                console.log('saved 폴더에서 로드:', drawingId);
                return;
            }
        } catch (e) {
            console.log('서버/API 로드 실패, localStorage 확인');
        }

        // 5. localStorage에서 찾기
        const saved = localStorage.getItem(`drawing_${drawingId}`);
        if (saved) {
            const drawing = JSON.parse(saved);
            applyDrawingData(drawing);
            currentDrawingId = drawingId;
            closeDrawingMenu();
            hideWelcomeScreen();
            return;
        }

        const useFilePicker = await showConfirm(`'${drawingId}' 파일을 찾을 수 없습니다. 로컬에서 직접 선택하시겠습니까?`, { title: '확인', confirmText: '선택' });
        if (useFilePicker && 'showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    startIn: 'downloads'
                });

                currentFileHandle = handle;
                const file = await handle.getFile();
                await loadFileContent(file, handle.name);
                closeDrawingMenu();
                console.log('로컬 파일 로드 완료:', handle.name);
            } catch (fileError) {
                if (fileError.name !== 'AbortError') {
                    console.error('파일 선택 실패:', fileError);
                }
            }
        }
    } catch (e) {
        console.error('도면 로드 실패:', e);
        showToast('도면 로드 중 오류가 발생했습니다.', 'error');
    }
}

function saveDrawingToStorage(drawing) {
    try {
        localStorage.setItem(`drawing_${drawing.meta.id}`, JSON.stringify(drawing));
    } catch (e) {
        console.warn('도면 저장 실패 (용량 초과):', e);
        const lightDrawing = { ...drawing, background: null };
        localStorage.setItem(`drawing_${drawing.meta.id}`, JSON.stringify(lightDrawing));
    }
}

// ============ 페이지 블록 컨텍스트 ============

// 현재 도면의 블록 컨텍스트 (포트 설명 + 신호 정보 결합)
let currentPageBlockContext = {};   // { "OCB0088016": { block_type, block_desc, ports:{...} }, ... }
let portDict = {};                  // block_port_dict.json 전체 (앱 시작 시 1회 로드)
let tagContext = {};                // tag_context.json 전체 (앱 시작 시 1회 로드) — 계기태그별 설비명/타입/도면

/**
 * 현재 도면 레이아웃 CSV에서 블록 컨텍스트를 로드합니다.
 * Python API get_page_blocks()를 호출하여 결과를 currentPageBlockContext에 저장.
 * 블록정보 탭(biData)도 갱신합니다.
 */
async function loadPageBlockContext(layoutCsvPath) {
    if (!layoutCsvPath) return;
    try {
        let result = null;
        if (isPyWebView()) {
            result = await window.pywebview.api.get_page_blocks(layoutCsvPath);
        } else {
            // HTTP 모드: 서버 API 호출 (미구현 시 skip)
            try {
                const resp = await fetch(`/api/page_blocks?path=${encodeURIComponent(layoutCsvPath)}`);
                result = await resp.json();
            } catch { return; }
        }

        if (!result || !result.success) {
            console.warn('[블록컨텍스트] 로드 실패:', result?.error);
            return;
        }

        currentPageBlockContext = result.blocks || {};
        console.log(`[블록컨텍스트] ${Object.keys(currentPageBlockContext).length}개 블록 로드 완료`);

    } catch(e) {
        console.warn('[블록컨텍스트] 오류:', e);
    }
}

// ============ 도면 관리 초기화 ============

function initDrawingManager() {
    loadRecentDrawings();
    loadPortDictOnce();
    loadTagContextOnce();
}

async function loadPortDictOnce() {
    if (!isPyWebView()) return;
    try {
        const result = await window.pywebview.api.load_port_dict();
        if (result && result.success) {
            portDict = result.data || {};
            console.log(`[포트사전] ${Object.keys(portDict).length}개 블록 로드`);
            if (typeof renderBlockList === 'function') renderBlockList();
        }
    } catch(e) {
        console.warn('[포트사전] 로드 실패:', e);
    }
}

async function loadTagContextOnce() {
    if (!isPyWebView()) return;
    try {
        const result = await window.pywebview.api.load_tag_context();
        if (result && result.success) {
            tagContext = result.data || {};
            console.log(`[태그컨텍스트] ${Object.keys(tagContext).length}개 태그 로드`);
        }
    } catch(e) {
        console.warn('[태그컨텍스트] 로드 실패:', e);
    }
}
