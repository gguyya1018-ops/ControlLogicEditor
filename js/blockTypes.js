/**
 * blockTypes.js - 심볼 사전 관리 (현재 도면용)
 * T, PID, AND, OR, NOT, 수학 블록 등 기능 블록 검색 및 관리
 * 심볼 사전(blockDictionary)과 연동하여 미등록 블록 표시
 */

// ============ 전역 변수 ============
let scannedFunctionBlocks = [];
let selectedFuncBlock = null;
let currentFuncTypeFilter = 'all';
let funcBlockMemos = {}; // 블록별 메모 저장
let blockDictionary = {}; // 블록 사전 데이터

// ============ 초기화 ============

function initBlockTypeLibrary() {
    // 메모 로드
    loadFuncBlockMemos();
    // 블록 사전 로드
    loadBlockDictionary();
    console.log('Function block library initialized');
}

function loadBlockDictionary() {
    try {
        // Ovation 데이터 강제 갱신 (버전 체크)
        const ovVer = localStorage.getItem('ovation_merge_ver');
        if (ovVer !== '20260413_direct') {
            localStorage.removeItem('blockDictionary_v4');
            localStorage.setItem('ovation_merge_ver', '20260413_direct');
            console.log('[BlockDict] Ovation 버전 변경 → localStorage 초기화');
        }
        const saved = localStorage.getItem('blockDictionary_v4');
        if (saved) {
            blockDictionary = JSON.parse(saved);
            console.log('Block dictionary loaded:', Object.keys(blockDictionary).length, 'types');
        } else {
            // localStorage에 없으면 기본 블록으로 초기화
            if (typeof btDefaultBlocks !== 'undefined') {
                blockDictionary = JSON.parse(JSON.stringify(btDefaultBlocks));
                localStorage.setItem('blockDictionary_v4', JSON.stringify(blockDictionary));
                console.log('Block dictionary initialized with defaults:', Object.keys(blockDictionary).length, 'types');
            }
        }
    } catch (e) {
        console.error('Failed to load block dictionary:', e);
    }
    // Ovation 매뉴얼 심볼 데이터 머지
    mergeOvationSymbols();
}

let ovationSymbols = null;

async function mergeOvationSymbols() {
    try {
        if (!ovationSymbols) {
            const resp = await fetch('data/ovation_symbols.json?v=' + Date.now());
            if (!resp.ok) return;
            ovationSymbols = await resp.json();
            console.log('[OvationSymbols] 로드:', Object.keys(ovationSymbols).length, '개 심볼');
        }
        // 별칭 매핑: 도면 스캔 ID → Ovation 심볼 ID
        const ALIASES = { 'T': 'TRANSFER', 'N': 'NOT', 'M/A': 'MASTATION', 'M/A/C': 'MASTATION', 'MODE': 'MAMODE' };
        // 별칭 데이터를 원본 키에도 복제
        for (const [shortKey, fullKey] of Object.entries(ALIASES)) {
            if (ovationSymbols[fullKey] && !ovationSymbols[shortKey]) {
                // fullKey의 데이터를 shortKey로도 접근 가능하게
                ovationSymbols[shortKey] = ovationSymbols[fullKey];
            }
        }

        let merged = 0;
        for (const [key, sym] of Object.entries(ovationSymbols)) {
            if (!blockDictionary[key]) {
                // 새 심볼 등록
                blockDictionary[key] = {
                    id: sym.id,
                    name: sym.name,
                    category: sym.category || 'unknown',
                    desc: sym.desc || '',
                    detail: sym.detail || '',
                    ai: sym.ai || '',
                    formula: sym.formula || '',
                    symbol: sym.symbol || '',
                    ports: sym.ports || [],
                    settings: sym.settings || [],
                    guidelines: sym.guidelines || [],
                    diagramDesc: sym.diagramDesc || '',
                    fullDesc: sym.fullDesc || '',
                    detailFull: sym.detailFull || '',
                    section: sym.section || '',
                    pdfPages: sym.pdfPages || [],
                    core: sym.core || false,
                    images: [],
                    instances: [],
                    source: 'ovation'
                };
                merged++;
            } else {
                // 기존 블록에 Ovation 정보 강제 덮어쓰기
                const existing = blockDictionary[key];
                if (sym.formula) existing.formula = sym.formula;
                if (sym.detail) existing.detail = sym.detail;
                if (sym.section) existing.section = sym.section;
                if (sym.pdfPages) existing.pdfPages = sym.pdfPages;
                if (sym.settings && sym.settings.length) existing.settings = sym.settings;
                if (sym.guidelines && sym.guidelines.length) existing.guidelines = sym.guidelines;
                if (sym.diagramDesc) existing.diagramDesc = sym.diagramDesc;
                if (sym.fullDesc) existing.fullDesc = sym.fullDesc;
                if (sym.detailFull) existing.detailFull = sym.detailFull;
                if (sym.core !== undefined) existing.core = sym.core;
                if (sym.ai && sym.ai.length > (existing.ai || '').length) existing.ai = sym.ai;
                if (sym.ports && sym.ports.length) existing.ports = sym.ports;
                existing.source = 'merged';
            }
        }
        console.log('[OvationSymbols] 신규 등록:', merged, '개, 기존 보강 포함');
        // localStorage를 Ovation 데이터로 갱신 (diagramDesc 등 새 필드 반영)
        localStorage.setItem('blockDictionary_v4', JSON.stringify(blockDictionary));
        console.log('[OvationSymbols] localStorage 갱신 완료. PID diagramDesc:', !!blockDictionary['PID']?.diagramDesc);
        // btBlockData에도 동기화 (심볼 탭용)
        if (typeof btBlockData !== 'undefined') {
            for (const [key, val] of Object.entries(blockDictionary)) {
                if (!btBlockData[key]) {
                    btBlockData[key] = val;
                } else {
                    const bt = btBlockData[key];
                    if (!bt.formula && val.formula) bt.formula = val.formula;
                    if (!bt.detail && val.detail) bt.detail = val.detail;
                    if (!bt.section && val.section) bt.section = val.section;
                    if (!bt.pdfPages && val.pdfPages) bt.pdfPages = val.pdfPages;
                    if (!bt.settings && val.settings) bt.settings = val.settings;
                    if (!bt.guidelines && val.guidelines) bt.guidelines = val.guidelines;
                    if (val.ai && val.ai.length > (bt.ai || '').length) bt.ai = val.ai;
                    if (val.diagramDesc) bt.diagramDesc = val.diagramDesc;
                    if (val.fullDesc) bt.fullDesc = val.fullDesc;
                    if (val.detailFull) bt.detailFull = val.detailFull;
                    if (val.core !== undefined) bt.core = val.core;
                    if (val.ports && val.ports.length) bt.ports = val.ports;
                }
            }
        }
    } catch (e) {
        console.log('[OvationSymbols] 로드 실패 (정상):', e.message);
    }
}

function isBlockRegistered(blockType) {
    return blockDictionary.hasOwnProperty(blockType);
}

function loadFuncBlockMemos() {
    try {
        const saved = localStorage.getItem('funcBlockMemos');
        if (saved) {
            funcBlockMemos = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load memos:', e);
    }
}

function saveFuncBlockMemosToStorage() {
    localStorage.setItem('funcBlockMemos', JSON.stringify(funcBlockMemos));
}

// ============ 블록 타입 식별 ============

/**
 * 포트 집합 매칭으로 심볼 타입 식별
 * 1순위: 사용자 수동 지정(userType)
 * 2순위: blockDictionary 포트 정의와 캔버스 포트 비교 (교집합 스코어링)
 * 3순위: 포트가 동일한 심볼이 여럿일 때 portDict 타입으로 구분
 */
function identifyBlockType(groupName, ports, portDictType) {
    // 순수 포트 집합 매칭만 수행 (userType 적용은 호출부에서 처리)
    if (!ports || ports.length === 0) return null;

    const canvasPorts = new Set(ports.map(p => (p.name || p.text || '').toUpperCase()).filter(Boolean));
    if (canvasPorts.size === 0) return null;

    // 2. blockDictionary 포트 정의와 스코어링 매칭
    const dict = (typeof blockDictionary !== 'undefined') ? blockDictionary : {};
    let bestScore = 0, bestType = null, bestTies = [];

    for (const [typeId, entry] of Object.entries(dict)) {
        if (!entry.ports || entry.ports.length === 0) continue;
        const symPorts = new Set(entry.ports.map(p => (p.name || '').toUpperCase()));

        // 교집합: 캔버스 포트 중 심볼에 정의된 포트 수
        let overlap = 0;
        for (const cp of canvasPorts) {
            if (symPorts.has(cp)) overlap++;
        }
        if (overlap === 0) continue;

        // 스코어 = 교집합 / 캔버스 포트 수 (캔버스는 전체 포트의 부분집합)
        // 캔버스 포트가 심볼 포트에 얼마나 포함되는지
        const score = overlap / canvasPorts.size;

        // 동점 처리: 가장 적은 심볼 포트 수를 가진 심볼 우선 (더 구체적)
        if (score > bestScore) {
            bestScore = score;
            bestType = typeId;
            bestTies = [{ typeId, score, symSize: symPorts.size }];
        } else if (score === bestScore) {
            bestTies.push({ typeId, score, symSize: symPorts.size });
        }
    }

    // 스코어 임계값: 캔버스 포트의 40% 이상 + 최소 2개 매칭 (단일 포트 오매칭 방지)
    const minOverlap = canvasPorts.size === 1 ? 1 : 2;
    if (bestScore < 0.4 || !bestType || bestTies[0]?.score * canvasPorts.size < minOverlap) return null;

    // 동점이 여럿일 때: portDictType으로 우선순위 결정, 없으면 심볼 포트 수 적은 것
    if (bestTies.length > 1) {
        if (portDictType) {
            const pdMatch = bestTies.find(t => t.typeId.toUpperCase() === portDictType.toUpperCase());
            if (pdMatch) bestType = pdMatch.typeId;
        } else {
            bestTies.sort((a, b) => a.symSize - b.symSize);
            bestType = bestTies[0].typeId;
        }
    }

    const entry = dict[bestType];
    return {
        type: bestType,
        category: entry.category || 'unknown',
        description: entry.desc || bestType,
        confidence: bestScore >= 0.9 ? 'high' : 'medium'
    };
}

// ============ 현재 도면 스캔 ============

function scanFunctionBlocks() {
    scannedFunctionBlocks = [];

    // 블록 사전 새로 로드 (최신 상태 반영)
    loadBlockDictionary();

    if (!groupsData || Object.keys(groupsData).length === 0) {
        updateFuncBlockList();
        return;
    }

    for (const [groupName, groupData] of Object.entries(groupsData)) {
        const ports = groupData.ports || [];
        if (ports.length < 2) continue;

        const typeInfo = identifyBlockType(groupName, ports);
        if (typeInfo) {
            const isRegistered = isBlockRegistered(typeInfo.type);
            scannedFunctionBlocks.push({
                name: groupName,
                type: typeInfo.type,
                category: typeInfo.category,
                description: typeInfo.description,
                ports: ports.map(p => p.name || p.text || ''),
                cx: groupData.cx,
                cy: groupData.cy,
                memo: funcBlockMemos[groupName] || '',
                isRegistered: isRegistered
            });
        }
    }

    // 타입별로 정렬 (미등록 우선)
    scannedFunctionBlocks.sort((a, b) => {
        // 미등록 블록 우선
        if (a.isRegistered !== b.isRegistered) return a.isRegistered ? 1 : -1;
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
    });

    updateFuncBlockSummary();
    updateFuncBlockList();
    console.log('Scanned function blocks:', scannedFunctionBlocks.length);
}

// ============ UI 업데이트 ============

function updateFuncBlockSummary() {
    const countEl = document.getElementById('func-block-count');
    const unregEl = document.getElementById('func-block-unregistered');

    if (countEl) {
        // 타입 수 계산
        const types = new Set();
        const unregTypes = new Set();

        for (const block of scannedFunctionBlocks) {
            types.add(block.type);
            if (!block.isRegistered) unregTypes.add(block.type);
        }

        countEl.textContent = `${types.size}개 타입 (${scannedFunctionBlocks.length}개 인스턴스)`;

        if (unregEl) {
            if (unregTypes.size > 0) {
                unregEl.style.display = 'inline';
                unregEl.textContent = `미등록 ${unregTypes.size}개`;
            } else {
                unregEl.style.display = 'none';
            }
        }
    }
}

// 타입 그룹 접기/펼치기 상태
let expandedTypes = new Set();

function updateFuncBlockList() {
    const listEl = document.getElementById('func-block-list');
    if (!listEl) return;

    const searchText = (document.getElementById('func-block-search')?.value || '').toLowerCase();

    if (scannedFunctionBlocks.length === 0) {
        listEl.innerHTML = `<div style="font-size:10px; color:var(--text-muted); padding:15px; text-align:center;">'심볼 검색' 버튼을 눌러주세요</div>`;
        return;
    }

    // 타입별 그룹화
    const typeGroups = {};
    for (const block of scannedFunctionBlocks) {
        const type = block.type || 'OTHER';

        // 타입 필터
        if (currentFuncTypeFilter !== 'all') {
            if (currentFuncTypeFilter === 'MATH' && block.category !== 'math') continue;
            else if (currentFuncTypeFilter === 'UNREGISTERED' && block.isRegistered) continue;
            else if (currentFuncTypeFilter !== 'MATH' && currentFuncTypeFilter !== 'UNREGISTERED' && block.type !== currentFuncTypeFilter) continue;
        }

        // 검색 필터 (타입명 또는 인스턴스명)
        if (searchText) {
            const matchType = type.toLowerCase().includes(searchText);
            const matchName = block.name.toLowerCase().includes(searchText);
            if (!matchType && !matchName) continue;
        }

        if (!typeGroups[type]) {
            typeGroups[type] = {
                type: type,
                isRegistered: block.isRegistered,
                category: block.category,
                description: block.description,
                instances: []
            };
        }
        typeGroups[type].instances.push(block);
    }

    const types = Object.values(typeGroups);
    if (types.length === 0) {
        listEl.innerHTML = `<div style="font-size:10px; color:var(--text-muted); padding:15px; text-align:center;">검색 결과가 없습니다</div>`;
        return;
    }

    // 미등록 우선, 알파벳 정렬
    types.sort((a, b) => {
        if (a.isRegistered !== b.isRegistered) return a.isRegistered ? 1 : -1;
        return a.type.localeCompare(b.type);
    });

    const unregTypes = types.filter(t => !t.isRegistered);
    const regTypes = types.filter(t => t.isRegistered);

    let html = '';

    function renderTypeGroup(tg) {
        const isExpanded = expandedTypes.has(tg.type);
        const regColor = tg.isRegistered ? '#4caf50' : '#ff5722';
        const regIcon = tg.isRegistered ? '✓' : '!';
        const arrow = isExpanded ? '▼' : '▶';
        const dictInfo = blockDictionary[tg.type];
        const desc = dictInfo ? (dictInfo.desc || '') : (tg.description || '');

        html += `<div onclick="toggleTypeExpand('${tg.type}')" style="padding:6px 8px; margin:2px 0; background:rgba(255,255,255,0.03); border-radius:4px; cursor:pointer; border-left:3px solid ${regColor};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; font-weight:600; color:#fff;">
                    <span style="color:var(--text-muted); font-size:9px; margin-right:4px;">${arrow}</span>
                    <span style="color:${regColor}; font-size:9px; margin-right:3px;">${regIcon}</span>
                    ${tg.type}
                </span>
                <span style="font-size:9px; color:var(--text-muted);">${tg.instances.length}개</span>
            </div>
            ${desc ? `<div style="font-size:9px; color:var(--text-muted); margin-top:2px; margin-left:20px;">${desc}</div>` : ''}
        </div>`;

        if (isExpanded) {
            for (const inst of tg.instances) {
                const isSelected = selectedFuncBlock?.name === inst.name;
                html += `<div onclick="event.stopPropagation(); selectFuncBlock('${inst.name}')" ondblclick="event.stopPropagation(); goToFuncBlock('${inst.name}')"
                    style="padding:4px 8px 4px 24px; margin:1px 0; font-size:10px; cursor:pointer; border-radius:3px; background:${isSelected ? 'rgba(88,166,255,0.15)' : 'transparent'}; border:1px solid ${isSelected ? 'var(--accent-blue)' : 'transparent'};">
                    <span style="color:var(--text-secondary); font-family:monospace;">${inst.name}</span>
                    <span style="color:var(--text-muted); font-size:9px; margin-left:6px;">${inst.ports.slice(0, 4).join(', ')}${inst.ports.length > 4 ? '...' : ''}</span>
                </div>`;
            }
        }
    }

    // 미등록 타입
    if (unregTypes.length > 0) {
        html += `<div style="padding:4px 8px; background:rgba(255,87,34,0.1); border-radius:4px; font-size:10px; font-weight:600; color:#ff5722; display:flex; justify-content:space-between;">
            <span>미등록 타입</span><span>${unregTypes.length}개</span>
        </div>`;
        for (const tg of unregTypes) renderTypeGroup(tg);
    }

    // 등록된 타입
    if (regTypes.length > 0) {
        html += `<div style="padding:4px 8px; margin-top:${unregTypes.length > 0 ? '8px' : '0'}; background:rgba(76,175,80,0.1); border-radius:4px; font-size:10px; font-weight:600; color:#4caf50; display:flex; justify-content:space-between;">
            <span>등록된 타입</span><span>${regTypes.length}개</span>
        </div>`;
        for (const tg of regTypes) renderTypeGroup(tg);
    }

    listEl.innerHTML = html;
}

function toggleTypeExpand(typeName) {
    if (expandedTypes.has(typeName)) {
        expandedTypes.delete(typeName);
    } else {
        expandedTypes.add(typeName);
    }
    updateFuncBlockList();
}

// ============ 필터 ============

function setFuncTypeFilter(type) {
    currentFuncTypeFilter = type;

    // 버튼 스타일 업데이트
    document.querySelectorAll('.func-type-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    updateFuncBlockList();
}

function filterFunctionBlocks() {
    updateFuncBlockList();
}

// ============ 블록 선택 및 상세 ============

// 하이라이트할 기능 블록 (캔버스 렌더링용)
let highlightedFuncBlock = null;

function selectFuncBlock(blockName) {
    const block = scannedFunctionBlocks.find(b => b.name === blockName);
    if (!block) return;

    selectedFuncBlock = block;
    updateFuncBlockList();
    showFuncBlockDetail(block);

    // 캔버스에 하이라이트 표시
    highlightFuncBlockOnCanvas(block);
}

function highlightFuncBlockOnCanvas(block) {
    if (!block) {
        highlightedFuncBlock = null;
        if (typeof render === 'function') render();
        return;
    }

    // groupsData에서 위치 정보 가져오기
    const group = groupsData[block.name];
    if (group) {
        highlightedFuncBlock = {
            name: block.name,
            type: block.type,
            cx: group.cx || block.cx,
            cy: group.cy || block.cy,
            x1: group.x1,
            y1: group.y1,
            x2: group.x2,
            y2: group.y2
        };
    } else {
        highlightedFuncBlock = {
            name: block.name,
            type: block.type,
            cx: block.cx,
            cy: block.cy
        };
    }

    if (typeof render === 'function') render();
}

// 캔버스에 하이라이트 렌더링 (canvas.js에서 호출)
function renderFuncBlockHighlight(ctx) {
    if (!highlightedFuncBlock) return;

    const hb = highlightedFuncBlock;
    const color = '#4caf50'; // 녹색

    ctx.save();

    // 좌표 계산
    let x1, y1, x2, y2;
    if (hb.x1 !== undefined) {
        x1 = hb.x1;
        y1 = hb.y1;
        x2 = hb.x2;
        y2 = hb.y2;
    } else {
        // 기본 크기
        const w = 100, h = 60;
        x1 = hb.cx - w / 2;
        y1 = hb.cy - h / 2;
        x2 = hb.cx + w / 2;
        y2 = hb.cy + h / 2;
    }

    const padding = 15 / scale;

    // 외곽 글로우 효과
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 / scale;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 / scale;
    ctx.setLineDash([]);
    ctx.strokeRect(x1 - padding, y1 - padding, (x2 - x1) + padding * 2, (y2 - y1) + padding * 2);

    // 반투명 배경
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x1 - padding, y1 - padding, (x2 - x1) + padding * 2, (y2 - y1) + padding * 2);
    ctx.globalAlpha = 1;

    // 모서리 마커
    const markerSize = 12 / scale;
    ctx.fillStyle = color;
    // 좌상
    ctx.fillRect(x1 - padding, y1 - padding, markerSize, 3 / scale);
    ctx.fillRect(x1 - padding, y1 - padding, 3 / scale, markerSize);
    // 우상
    ctx.fillRect(x2 + padding - markerSize, y1 - padding, markerSize, 3 / scale);
    ctx.fillRect(x2 + padding - 3 / scale, y1 - padding, 3 / scale, markerSize);
    // 좌하
    ctx.fillRect(x1 - padding, y2 + padding - 3 / scale, markerSize, 3 / scale);
    ctx.fillRect(x1 - padding, y2 + padding - markerSize, 3 / scale, markerSize);
    // 우하
    ctx.fillRect(x2 + padding - markerSize, y2 + padding - 3 / scale, markerSize, 3 / scale);
    ctx.fillRect(x2 + padding - 3 / scale, y2 + padding - markerSize, 3 / scale, markerSize);

    // 타입 라벨 (상단에 표시)
    const labelY = y1 - padding - 25 / scale;
    const labelText = `🔧 ${hb.type}: ${hb.name}`;

    ctx.font = `bold ${14 / scale}px sans-serif`;
    const textWidth = ctx.measureText(labelText).width;

    // 라벨 배경
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    const labelPadX = 8 / scale;
    const labelPadY = 4 / scale;
    const labelHeight = 20 / scale;
    ctx.beginPath();
    ctx.roundRect(hb.cx - textWidth / 2 - labelPadX, labelY - labelHeight / 2 - labelPadY, textWidth + labelPadX * 2, labelHeight + labelPadY * 2, 4 / scale);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 라벨 텍스트
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, hb.cx, labelY);

    ctx.restore();
}

function showFuncBlockDetail(block) {
    const detailEl = document.getElementById('func-block-detail');
    if (!detailEl) return;

    detailEl.style.display = 'block';

    document.getElementById('func-block-detail-name').textContent = block.name;
    document.getElementById('func-block-detail-type').textContent = `${block.type} (${block.description})`;
    document.getElementById('func-block-detail-ports').textContent = block.ports.join(', ');

    // 등록 상태 배지
    const badgeEl = document.getElementById('func-block-registered-badge');
    if (badgeEl) {
        badgeEl.style.display = 'inline';
        if (block.isRegistered) {
            badgeEl.textContent = '✓ 등록됨';
            badgeEl.style.background = 'rgba(76,175,80,0.2)';
            badgeEl.style.color = '#4caf50';
        } else {
            badgeEl.textContent = '⚠️ 미등록';
            badgeEl.style.background = 'rgba(255,87,34,0.2)';
            badgeEl.style.color = '#ff5722';
        }
    }

    // 사전 추가 버튼 (미등록일 때만)
    const addToDictEl = document.getElementById('func-block-add-to-dict');
    if (addToDictEl) {
        if (block.type === 'UNKNOWN') {
            // UNKNOWN 타입: 타입 선택 드롭다운 표시
            const types = Object.keys(blockDictionary).sort();
            addToDictEl.style.display = 'block';
            addToDictEl.innerHTML = `
                <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">타입 지정:</div>
                <div style="display:flex; gap:4px;">
                    <select id="unknown-type-select" style="flex:1; padding:4px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:4px; color:var(--text-primary); font-size:10px;">
                        <option value="">-- 타입 선택 --</option>
                        ${types.map(t => `<option value="${t}">${t} - ${blockDictionary[t].desc || ''}</option>`).join('')}
                    </select>
                    <button onclick="assignUserType('${block.name.replace(/'/g, "\\'")}')" style="padding:4px 8px; background:var(--accent-blue); color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:10px; white-space:nowrap;">지정</button>
                </div>
            `;
        } else {
            addToDictEl.style.display = block.isRegistered ? 'none' : 'block';
            addToDictEl.innerHTML = `
                <button style="width:100%; font-size:10px; padding:5px; background:#ff5722; border:none; color:#fff; border-radius:4px; cursor:pointer;" onclick="addBlockToDictionary()">
                    사전에 등록
                </button>
            `;
        }
    }
}

function hideFuncBlockDetail() {
    const detailEl = document.getElementById('func-block-detail');
    if (detailEl) detailEl.style.display = 'none';
    selectedFuncBlock = null;
    highlightedFuncBlock = null;
    if (typeof render === 'function') render();
}

// ============ 블록 이동 ============

function goToFuncBlock(blockName) {
    const targetName = blockName || selectedFuncBlock?.name;
    if (!targetName) return;

    const group = groupsData[targetName];
    if (!group) {
        showToast(`'${targetName}' 블록을 찾을 수 없습니다.`, 'error');
        return;
    }

    // 캔버스 중앙으로 이동
    const cx = group.cx;
    const cy = group.cy;

    scale = 0.5;
    viewX = canvas.width / 2 - cx * scale;
    viewY = canvas.height / 2 - cy * scale;

    // 해당 블록 선택
    const block = blocks.find(b => b.name === targetName);
    if (block) {
        selectedElement = block;
        updateSelectionInfo();
    }

    updateStatusBar();
    render();
}

// ============ 메모 저장 ============

function saveFuncBlockMemo() {
    if (!selectedFuncBlock) return;

    const memo = document.getElementById('func-block-memo')?.value || '';
    funcBlockMemos[selectedFuncBlock.name] = memo;
    selectedFuncBlock.memo = memo;

    saveFuncBlockMemosToStorage();
    updateFuncBlockList();
}

// ============ 블록 사전 추가 ============

function addBlockToDictionary() {
    if (selectedFuncBlock) {
        const block = selectedFuncBlock;
        const blockType = block.type;

        // 이미 등록되어 있으면 알림
        if (isBlockRegistered(blockType)) {
            showToast(`${blockType}은(는) 이미 사전에 등록되어 있습니다.`, 'info');
            return;
        }

        // 선택된 블록 기반으로 팝업
        showBlockDictionaryPopup(block);
    } else {
        // 선택 없으면 빈 팝업 (새 심볼 등록)
        const emptyBlock = {
            name: '',
            type: '',
            ports: [],
            description: ''
        };
        showBlockDictionaryPopup(emptyBlock);
    }
}

// 편집 중인 포트 목록 (에디터 팝업용)
let editingDictPorts = [];

function showBlockDictionaryPopup(block) {
    const blockType = block.type;

    // 포트 분류 및 초기화
    editingDictPorts = block.ports.map(portName => {
        const upperName = portName.toUpperCase();
        const isOutput = upperName.includes('OUT') || upperName === 'YES' || upperName === 'NO' || upperName === 'FLAG' || upperName === 'MV';
        return { name: portName, direction: isOutput ? 'output' : 'input' };
    });

    // 팝업 HTML
    const popupHtml = `
        <div id="block-dict-popup" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1a1a2e; border:1px solid #4caf50; border-radius:12px; width:520px; max-width:90vw; max-height:90vh; overflow:auto; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="padding:16px 20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; color:#4caf50; font-size:16px;">📚 블록 사전에 추가</h3>
                    <button onclick="closeBlockDictPopup()" style="background:none; border:none; color:#888; font-size:20px; cursor:pointer;">&times;</button>
                </div>

                <div style="padding:20px;">
                    <!-- 블록 타입 -->
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; color:#888; margin-bottom:4px;">블록 타입</label>
                        <div style="padding:10px; background:#0f0f23; border:1px solid #4caf50; border-radius:6px; color:#4caf50; font-weight:600; font-size:14px;">${blockType}</div>
                    </div>

                    <!-- 카테고리 -->
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; color:#888; margin-bottom:4px;">카테고리</label>
                        <select id="dict-category" style="width:100%; padding:10px; background:#0f0f23; border:1px solid #333; border-radius:6px; color:#fff; font-size:13px;">
                            <option value="logic" ${block.category === 'logic' ? 'selected' : ''}>logic - 논리 연산</option>
                            <option value="math" ${block.category === 'math' ? 'selected' : ''}>math - 수학 연산</option>
                            <option value="control" ${block.category === 'control' ? 'selected' : ''}>control - 제어</option>
                            <option value="compare">compare - 비교</option>
                            <option value="timer">timer - 타이머</option>
                            <option value="unknown">unknown - 미분류</option>
                        </select>
                    </div>

                    <!-- 기본 설명 -->
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; color:#888; margin-bottom:4px;">기본 설명</label>
                        <input type="text" id="dict-description" value="${block.description || blockType + ' 블록'}"
                               style="width:100%; padding:10px; background:#0f0f23; border:1px solid #333; border-radius:6px; color:#fff; font-size:13px;"
                               placeholder="블록의 기능을 간단히 설명...">
                    </div>

                    <!-- 상세 설명 -->
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:11px; color:#888; margin-bottom:4px;">상세 설명</label>
                        <textarea id="dict-detail" rows="3"
                                  style="width:100%; padding:10px; background:#0f0f23; border:1px solid #333; border-radius:6px; color:#fff; font-size:12px; resize:vertical;"
                                  placeholder="블록의 동작을 상세히 설명..."></textarea>
                    </div>

                    <!-- 포트 구성 (편집 가능) -->
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:11px; color:#888; margin-bottom:8px;">포트 구성</label>
                        <div id="dict-ports-container" style="background:#0f0f23; border:1px solid #333; border-radius:6px; padding:12px; max-height:180px; overflow-y:auto;">
                            <!-- 포트 목록이 여기에 렌더링됨 -->
                        </div>
                        <!-- 포트 추가 -->
                        <div style="display:flex; gap:8px; margin-top:8px;">
                            <input type="text" id="dict-new-port-name" placeholder="포트 이름"
                                   style="flex:1; padding:8px; background:#0f0f23; border:1px solid #333; border-radius:4px; color:#fff; font-size:12px;">
                            <select id="dict-new-port-dir" style="width:80px; padding:8px; background:#0f0f23; border:1px solid #333; border-radius:4px; color:#fff; font-size:11px;">
                                <option value="input">입력</option>
                                <option value="output">출력</option>
                                <option value="model">모델</option>
                            </select>
                            <button onclick="addDictPort()" style="padding:8px 12px; background:#4caf50; border:none; border-radius:4px; color:#fff; font-size:11px; cursor:pointer;">+ 추가</button>
                        </div>
                    </div>

                    <!-- 버튼 -->
                    <div style="display:flex; gap:10px;">
                        <button onclick="closeBlockDictPopup()"
                                style="flex:1; padding:12px; background:#333; border:none; border-radius:6px; color:#fff; font-size:13px; cursor:pointer;">
                            취소
                        </button>
                        <button onclick="saveBlockToDict('${blockType}')"
                                style="flex:1; padding:12px; background:#4caf50; border:none; border-radius:6px; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">
                            저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 기존 팝업 제거 후 추가
    closeBlockDictPopup();
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    // 포트 목록 렌더링
    renderDictPorts();

    // 설명 입력란에 포커스
    setTimeout(() => {
        document.getElementById('dict-description')?.focus();
    }, 100);
}

// 포트 목록 렌더링
function renderDictPorts() {
    const container = document.getElementById('dict-ports-container');
    if (!container) return;

    if (editingDictPorts.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:11px; text-align:center; padding:10px;">포트 없음</div>';
        return;
    }

    // 입력/출력/모델 포트를 인덱스와 함께 분리
    const inputs = [];
    const outputs = [];
    const models = [];
    editingDictPorts.forEach((p, idx) => {
        if (p.direction === 'input') {
            inputs.push({ ...p, globalIdx: idx });
        } else if (p.direction === 'output') {
            outputs.push({ ...p, globalIdx: idx });
        } else if (p.direction === 'model') {
            models.push({ ...p, globalIdx: idx });
        }
    });

    let html = '';

    // 입력 포트
    if (inputs.length > 0) {
        html += `<div style="margin-bottom:10px;">
            <div style="font-size:10px; color:#4fc3f7; font-weight:600; margin-bottom:6px;">입력 (${inputs.length})</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        inputs.forEach((p) => {
            html += `<span class="dict-port-tag" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; background:#4fc3f722; border:1px solid #4fc3f7; border-radius:4px; font-size:11px; color:#4fc3f7;">
                ${p.name}
                <select onchange="changeDictPortDir(${p.globalIdx}, this.value)" style="background:#0f0f23; border:1px solid #4fc3f7; border-radius:3px; color:#4fc3f7; font-size:9px; padding:1px 2px; cursor:pointer;">
                    <option value="input" selected>입력</option>
                    <option value="output">출력</option>
                    <option value="model">모델</option>
                </select>
                <button onclick="removeDictPort(${p.globalIdx})" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:12px; padding:0 2px;" title="삭제">×</button>
            </span>`;
        });
        html += `</div></div>`;
    }

    // 출력 포트
    if (outputs.length > 0) {
        html += `<div style="margin-bottom:10px;">
            <div style="font-size:10px; color:#ff9800; font-weight:600; margin-bottom:6px;">출력 (${outputs.length})</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        outputs.forEach((p) => {
            html += `<span class="dict-port-tag" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; background:#ff980022; border:1px solid #ff9800; border-radius:4px; font-size:11px; color:#ff9800;">
                ${p.name}
                <select onchange="changeDictPortDir(${p.globalIdx}, this.value)" style="background:#0f0f23; border:1px solid #ff9800; border-radius:3px; color:#ff9800; font-size:9px; padding:1px 2px; cursor:pointer;">
                    <option value="input">입력</option>
                    <option value="output" selected>출력</option>
                    <option value="model">모델</option>
                </select>
                <button onclick="removeDictPort(${p.globalIdx})" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:12px; padding:0 2px;" title="삭제">×</button>
            </span>`;
        });
        html += `</div></div>`;
    }

    // 모델 포트
    if (models.length > 0) {
        html += `<div>
            <div style="font-size:10px; color:#ab47bc; font-weight:600; margin-bottom:6px;">모델 (${models.length})</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">`;
        models.forEach((p) => {
            html += `<span class="dict-port-tag" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; background:#ab47bc22; border:1px solid #ab47bc; border-radius:4px; font-size:11px; color:#ab47bc;">
                ${p.name}
                <select onchange="changeDictPortDir(${p.globalIdx}, this.value)" style="background:#0f0f23; border:1px solid #ab47bc; border-radius:3px; color:#ab47bc; font-size:9px; padding:1px 2px; cursor:pointer;">
                    <option value="input">입력</option>
                    <option value="output">출력</option>
                    <option value="model" selected>모델</option>
                </select>
                <button onclick="removeDictPort(${p.globalIdx})" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:12px; padding:0 2px;" title="삭제">×</button>
            </span>`;
        });
        html += `</div></div>`;
    }

    container.innerHTML = html;
}

// 포트 추가
function addDictPort() {
    const nameInput = document.getElementById('dict-new-port-name');
    const dirSelect = document.getElementById('dict-new-port-dir');
    const name = nameInput.value.trim().toUpperCase();
    const direction = dirSelect.value;

    if (!name) {
        showToast('포트 이름을 입력하세요', 'info');
        return;
    }

    if (editingDictPorts.some(p => p.name === name)) {
        showToast('이미 존재하는 포트입니다', 'info');
        return;
    }

    editingDictPorts.push({ name, direction });
    renderDictPorts();
    nameInput.value = '';
    nameInput.focus();
}

// 포트 삭제
function removeDictPort(idx) {
    console.log('removeDictPort called:', idx, editingDictPorts);
    if (idx < 0 || idx >= editingDictPorts.length) {
        console.error('Invalid port index:', idx);
        return;
    }
    const removed = editingDictPorts.splice(idx, 1);
    console.log('Removed port:', removed);
    renderDictPorts();
}

// 포트 방향 변경 (입력/출력/모델)
function changeDictPortDir(idx, newDirection) {
    console.log('changeDictPortDir called:', idx, newDirection);
    if (idx < 0 || idx >= editingDictPorts.length) {
        console.error('Invalid port index:', idx);
        return;
    }
    const port = editingDictPorts[idx];
    if (port) {
        const oldDir = port.direction;
        port.direction = newDirection;
        console.log(`Port ${port.name}: ${oldDir} → ${port.direction}`);
        renderDictPorts();
    }
}

// 포트 이동
function moveDictPort(idx, delta) {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= editingDictPorts.length) return;

    const temp = editingDictPorts[idx];
    editingDictPorts[idx] = editingDictPorts[newIdx];
    editingDictPorts[newIdx] = temp;
    renderDictPorts();
}

function closeBlockDictPopup() {
    const popup = document.getElementById('block-dict-popup');
    if (popup) popup.remove();
}

function saveBlockToDict(blockType) {
    const block = selectedFuncBlock;
    if (!block || block.type !== blockType) {
        showToast('블록 정보가 유효하지 않습니다.', 'error');
        return;
    }

    // 입력값 수집
    const category = document.getElementById('dict-category')?.value || 'unknown';
    const desc = document.getElementById('dict-description')?.value || `${blockType} 블록`;
    const detail = document.getElementById('dict-detail')?.value || '';

    // 편집된 포트 배열 사용 (block-types.html 형식에 맞춤)
    const ports = editingDictPorts.map(p => ({
        name: p.name,
        direction: p.direction,
        type: 'any',
        description: ''
    }));

    // 블록 데이터 생성 (block-types.html 형식과 일치)
    // ai 필드는 사전에서 AI가 입력 (여기서는 빈 값)
    const newBlockData = {
        id: blockType,
        name: blockType,
        category: category,
        desc: desc,
        detail: detail,
        ai: '',
        ports: ports,
        images: [],
        instances: []
    };

    // 사전에 추가
    blockDictionary[blockType] = newBlockData;

    // localStorage에 저장
    try {
        localStorage.setItem('blockDictionary_v4', JSON.stringify(blockDictionary));
        console.log('Block added to dictionary:', blockType, newBlockData);

        // UI 업데이트
        block.isRegistered = true;
        selectedFuncBlock.isRegistered = true;

        // 해당 타입의 모든 블록도 업데이트
        scannedFunctionBlocks.forEach(b => {
            if (b.type === blockType) {
                b.isRegistered = true;
            }
        });

        updateFuncBlockSummary();
        updateFuncBlockList();
        showFuncBlockDetail(selectedFuncBlock);

        // 팝업 닫기
        closeBlockDictPopup();

        // 성공 알림
        showToast(`${blockType} 블록이 사전에 추가되었습니다.`, 'success');

    } catch (e) {
        console.error('Failed to save block to dictionary:', e);
        showToast('블록 저장에 실패했습니다: ' + e.message, 'error');
    }
}

function assignUserType(blockName) {
    const select = document.getElementById('unknown-type-select');
    if (!select || !select.value) {
        showToast('타입을 선택해주세요.', 'info');
        return;
    }
    const userType = select.value;

    // 설비정보에 userType 저장
    if (!scanDescriptions[blockName]) {
        scanDescriptions[blockName] = { equipment: '', memo: '' };
    }
    if (typeof scanDescriptions[blockName] === 'string') {
        scanDescriptions[blockName] = { equipment: scanDescriptions[blockName], memo: '' };
    }
    scanDescriptions[blockName].userType = userType;
    localStorage.setItem('scan_dictionary', JSON.stringify(scanDescriptions));

    // 스캔 결과 재실행하여 반영
    scanFunctionBlocks();
    showToast(`${blockName} → ${userType} 타입 지정 완료`, 'success');
}

function openBlockDictionary() {
    // 심볼 사전 페이지 새 탭으로 열기
    window.open('block-types.html', '_blank');
}

function findUnregisteredSymbols() {
    // 현재 도면의 모든 블록 타입을 수집
    const foundTypes = new Set();

    for (const [groupName, groupData] of Object.entries(groupsData)) {
        const ports = groupData.ports || [];
        if (ports.length < 2) continue;

        const typeInfo = identifyBlockType(groupName, ports);
        if (typeInfo) {
            foundTypes.add(typeInfo.type);
        }
    }

    // 블록 사전에 없는 타입 필터
    const unregistered = [];
    for (const typeName of foundTypes) {
        if (!blockDictionary[typeName]) {
            unregistered.push(typeName);
        }
    }

    if (unregistered.length === 0) {
        showToast('모든 심볼이 사전에 등록되어 있습니다.', 'success');
    } else {
        showToast(`미등록 심볼 ${unregistered.length}개 발견`, 'info');
        // 미등록 필터 활성화
        setFuncTypeFilter('UNREGISTERED');
    }

    // 스캔도 같이 실행
    scanFunctionBlocks();
}

// ============ CSS 스타일 (동적 추가) ============

(function addFuncBlockStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .func-type-filter {
            padding: 4px 8px;
            font-size: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .func-type-filter:hover {
            background: rgba(76, 175, 80, 0.1);
            border-color: rgba(76, 175, 80, 0.3);
        }

        .func-type-filter.active {
            background: rgba(76, 175, 80, 0.2);
            border-color: #4caf50;
            color: #4caf50;
            font-weight: 600;
        }

        .func-block-item:hover {
            background: rgba(255, 255, 255, 0.08) !important;
        }
    `;
    document.head.appendChild(style);
})();
