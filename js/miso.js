// ============ MISO AI 연동 모듈 ============

let misoAnalyses = {};
let misoSelectedDrawing = null;
let misoInitialized = false;
let misoSelectedAnalysisIdx = undefined;

// 미소사전 탭 초기화
async function misoInit() {
    if (!misoInitialized) {
        await misoLoadAnalyses();
        misoInitialized = true;
    }
    misoRenderList();
}

// 분석 결과 로드
async function misoLoadAnalyses() {
    if (!isPyWebView()) return;
    try {
        const result = await window.pywebview.api.miso_load_analyses();
        if (result.success) {
            misoAnalyses = result.data || {};
        }
    } catch (e) {
        console.warn('MISO 분석 로드 실패:', e);
    }
}

// 분석 결과 저장
async function misoSaveAnalyses() {
    if (!isPyWebView()) return;
    try {
        await window.pywebview.api.miso_save_analyses(misoAnalyses);
    } catch (e) {
        console.warn('MISO 분석 저장 실패:', e);
    }
}

// MISO 등록 + 백그라운드 분석 (에디터 헤더 MISO 버튼에서 호출)
async function misoSendAnalysis() {
    const drawingNum = currentDrawingNumber || currentDrawingName || '';
    if (!drawingNum) {
        showToast('도면을 먼저 열어주세요.', 'warning');
        return;
    }

    // LLM 텍스트 생성
    const llmText = generateLLMText();
    if (!llmText) {
        showToast('분석할 도면 데이터가 없습니다.', 'warning');
        return;
    }

    if (!isPyWebView()) {
        showToast('MISO 전송은 데스크톱 앱에서만 가능합니다.', 'warning');
        return;
    }

    // API 키 확인
    let config;
    try {
        const cfgResult = await window.pywebview.api.miso_load_config();
        config = cfgResult.success ? cfgResult.data : {};
    } catch (e) { config = {}; }

    if (!config.api_key) {
        showToast('MISO API 키를 먼저 설정해주세요.', 'warning');
        misoShowSettings();
        return;
    }

    // 미소사전에 도면 등록 + llm_text 갱신
    const now = new Date().toISOString();
    const page = (currentPageNumber && currentPageNumber !== '?') ? currentPageNumber : '';
    let drawingTitle = currentDrawingName || (page ? `${drawingNum}-${page}` : `${drawingNum}`);
    let equipmentName = '';
    if (typeof scanResults !== 'undefined' && scanResults) {
        const signals = scanResults.filter(sr => sr.type === 'SIGNAL' && sr.portSignals?.['태그정보']?.equipment);
        if (signals.length > 0) equipmentName = signals[0].portSignals['태그정보'].equipment;
    }
    if (equipmentName && !drawingTitle.includes(equipmentName)) {
        drawingTitle += ` ${equipmentName}`;
    }

    if (!misoAnalyses[drawingNum]) {
        misoAnalyses[drawingNum] = {
            drawing_number: drawingNum,
            drawing_title: drawingTitle,
            equipment_name: equipmentName,
            status: '분석중',
            last_analyzed: now,
            conversation_id: '',
            llm_text: llmText,
            analyses: []
        };
    } else {
        misoAnalyses[drawingNum].llm_text = llmText;
        misoAnalyses[drawingNum].last_analyzed = now;
        misoAnalyses[drawingNum].status = '분석중';
        misoAnalyses[drawingNum].drawing_title = drawingTitle;
        if (equipmentName) misoAnalyses[drawingNum].equipment_name = equipmentName;
    }

    // 분석중 항목을 analyses에 placeholder로 추가
    const analysisTimestamp = now;
    misoAnalyses[drawingNum].analyses.push({
        timestamp: analysisTimestamp,
        label: new Date(now).toLocaleString('ko-KR') + ' (분석중...)',
        answer: '',
        conversation_id: '',
        status: '분석중'
    });

    await misoSaveAnalyses();
    misoInitialized = false;

    // 토스트 알림 + 미소사전 탭으로 이동
    showToast('미소에 분석이 요청되었습니다.', 'success', 3000);
    switchMainTab('miso');
    misoInitialized = true;
    misoSelectedDrawing = drawingNum;
    misoRenderList();
    misoRenderDetail(drawingNum);

    // 백그라운드 분석 실행
    misoRunAnalysisBackground(drawingNum, analysisTimestamp)
        .then(() => console.log('MISO 분석 완료'))
        .catch(e => console.warn('MISO 분석 오류:', e));
}

// MISO API 분석 실행 (미소사전 "분석 실행" 버튼에서 호출)
async function misoRunAnalysis(drawingNum) {
    const entry = misoAnalyses[drawingNum];
    if (!entry || !entry.llm_text) {
        showToast('도면 데이터가 없습니다. 도면을 열고 MISO 버튼을 다시 눌러주세요.', 'warning');
        return;
    }
    if (!isPyWebView()) return;

    // API 키 확인
    let config;
    try {
        const cfgResult = await window.pywebview.api.miso_load_config();
        config = cfgResult.success ? cfgResult.data : {};
    } catch (e) { config = {}; }
    if (!config.api_key) {
        showToast('MISO API 키를 먼저 설정해주세요.', 'warning');
        misoShowSettings();
        return;
    }

    // 분석중 항목 추가
    const now = new Date().toISOString();
    entry.status = '분석중';
    entry.analyses.push({
        timestamp: now,
        label: new Date(now).toLocaleString('ko-KR') + ' (분석중...)',
        answer: '',
        conversation_id: '',
        status: '분석중'
    });
    await misoSaveAnalyses();
    misoRenderList();
    misoRenderDetail(drawingNum);

    // 백그라운드 실행
    misoRunAnalysisBackground(drawingNum, now);
}

// 백그라운드 분석 실행 (Python 스레드 + JS 폴링)
async function misoRunAnalysisBackground(drawingNum, analysisTimestamp) {
    const entry = misoAnalyses[drawingNum];
    if (!entry) return;

    // 프롬프트 로드
    let systemPrompt = '';
    try {
        const promptResult = await window.pywebview.api.miso_load_prompt();
        systemPrompt = promptResult.success ? promptResult.data : '';
    } catch (e) {}
    if (!systemPrompt) {
        systemPrompt = '이 DCS 제어 로직 도면을 분석하여 도면 개요, 제어 루프, 설정값 선택 로직, 인터락 조건, 외부 참조 신호를 정리해주세요.';
    }

    const prompt = `${systemPrompt}\n\n[도면 데이터]\n${entry.llm_text}`;
    const convId = entry.conversation_id || '';
    const analysisIdx = entry.analyses.findIndex(a => a.timestamp === analysisTimestamp);

    // Python 백그라운드 스레드로 MISO API 호출 시작
    let taskId;
    try {
        const startResult = await window.pywebview.api.miso_chat_async(prompt, convId, drawingNum, analysisTimestamp);
        if (!startResult.success) {
            misoUpdateAnalysisEntry(entry, analysisIdx, analysisTimestamp, '오류', '', startResult.error);
            await misoSaveAnalyses();
            misoRenderList();
            return;
        }
        taskId = startResult.task_id;
    } catch (e) {
        misoUpdateAnalysisEntry(entry, analysisIdx, analysisTimestamp, '오류', '', e.message);
        await misoSaveAnalyses();
        misoRenderList();
        return;
    }

    // 10초마다 폴링으로 결과 확인
    const pollInterval = setInterval(async () => {
        try {
            const check = await window.pywebview.api.miso_check_task(taskId);
            if (check.status === 'running') return; // 아직 진행 중

            clearInterval(pollInterval);

            // Python이 이미 파일에 저장했으므로 파일에서 다시 읽기
            await misoLoadAnalyses();
            showToast(`MISO 분석 완료: 도면 ${drawingNum}`, 'success', 5000);

            // 자동 렌더링
            misoRenderList();
            if (misoSelectedDrawing === drawingNum) {
                misoRenderDetail(drawingNum);
            }
        } catch (e) {
            // 폴링 에러 — 계속 시도
            console.warn('[MISO] 폴링 오류:', e);
        }
    }, 10000); // 10초마다

    // 10분 후 타임아웃
    setTimeout(() => {
        clearInterval(pollInterval);
        if (entry.analyses[analysisIdx]?.status === '분석중') {
            misoUpdateAnalysisEntry(entry, analysisIdx, analysisTimestamp, '오류', '', '타임아웃 (10분 초과)');
            misoSaveAnalyses();
            misoRenderList();
            if (misoSelectedDrawing === drawingNum) misoRenderDetail(drawingNum);
        }
    }, 600000);
}

// 분석 항목 업데이트 헬퍼
function misoUpdateAnalysisEntry(entry, analysisIdx, timestamp, status, answer, error) {
    const idx = analysisIdx >= 0 ? analysisIdx : entry.analyses.length - 1;
    if (idx >= 0 && entry.analyses[idx]) {
        const dateLabel = new Date(timestamp).toLocaleString('ko-KR');
        entry.analyses[idx].status = status;
        entry.analyses[idx].answer = answer || error || '';
        entry.analyses[idx].label = status === '완료' ? dateLabel : `${dateLabel} (${status})`;
    }
    entry.status = entry.analyses.some(a => a.status === '분석중') ? '분석중'
                 : entry.analyses.some(a => a.status === '완료') ? '완료' : status;
}

// 도면 목록 렌더링
function misoRenderList() {
    const container = document.getElementById('miso-list');
    if (!container) return;

    const entries = Object.values(misoAnalyses);

    if (entries.length === 0) {
        container.innerHTML = `
            <div style="padding:20px; text-align:center; color:rgba(255,255,255,0.4); font-size:12px;">
                등록된 도면이 없습니다.<br>
                도면을 열고 MISO 버튼을 누르면 등록됩니다.
            </div>`;
        return;
    }

    // 최신순 정렬
    entries.sort((a, b) => (b.last_analyzed || '').localeCompare(a.last_analyzed || ''));

    container.innerHTML = entries.map(e => {
        const isSelected = misoSelectedDrawing === e.drawing_number;
        // 상태: 분석 목록 중 하나라도 분석중이면 '분석중', 하나라도 완료면 '완료'
        const hasAnalyzing = (e.analyses || []).some(a => a.status === '분석중');
        const hasComplete = (e.analyses || []).some(a => a.status === '완료');
        const realStatus = hasAnalyzing ? '분석중' : hasComplete ? '완료' : (e.analyses?.length ? '오류' : '등록');
        const statusColor = realStatus === '완료' ? '#4ade80' : realStatus === '분석중' ? '#60a5fa' : realStatus === '등록' ? '#fbbf24' : '#f87171';
        const date = e.last_analyzed ? new Date(e.last_analyzed).toLocaleDateString('ko-KR') : '';
        const title = e.drawing_title || `도면 ${e.drawing_number}`;
        const analysesCnt = (e.analyses || []).length;
        const equip = e.equipment_name || '';

        return `<div class="miso-item ${isSelected ? 'active' : ''}" onclick="misoSelectDrawing('${e.drawing_number}')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; color:#e0e0e0; font-size:12px;">${title}</span>
                <div style="display:flex; gap:4px; align-items:center;">
                    <span style="font-size:9px; color:${statusColor}; background:${statusColor}22; padding:2px 5px; border-radius:3px;">${realStatus}</span>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); misoDeleteDrawing('${e.drawing_number}')"
                        style="font-size:8px; color:#f87171; padding:1px 4px; line-height:1;">X</button>
                </div>
            </div>
            ${equip ? `<div style="font-size:10px; color:rgba(255,255,255,0.45); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${equip}</div>` : ''}
            <div style="font-size:10px; color:rgba(255,255,255,0.25); margin-top:2px;">
                ${date} | 분석 ${analysesCnt}회
            </div>
        </div>`;
    }).join('');
}

// 도면 선택
function misoSelectDrawing(drawingNum) {
    misoSelectedDrawing = drawingNum;
    misoSelectedAnalysisIdx = undefined;
    misoRenderList();
    misoRenderDetail(drawingNum);
}

// 특정 분석 보기 (idx=-1이면 접기)
function misoShowAnalysis(drawingNum, idx) {
    misoSelectedAnalysisIdx = idx >= 0 ? idx : undefined;
    misoRenderDetail(drawingNum);
}

// 도면 삭제
async function misoDeleteDrawing(drawingNum) {
    if (!(await showConfirm(`도면 ${drawingNum}의 모든 분석 결과를 삭제하시겠습니까?`, { title: '도면 삭제', type: 'danger', confirmText: '전체 삭제' }))) return;
    delete misoAnalyses[drawingNum];
    if (misoSelectedDrawing === drawingNum) {
        misoSelectedDrawing = null;
        misoSelectedAnalysisIdx = undefined;
    }
    await misoSaveAnalyses();
    misoRenderList();
    const detail = document.getElementById('miso-detail');
    if (detail) detail.innerHTML = '<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.3); font-size:13px;">왼쪽 목록에서 도면을 선택하세요</div>';
    showToast(`도면 ${drawingNum} 삭제됨`, 'success');
}

// 개별 분석 삭제
async function misoDeleteAnalysis(drawingNum, idx) {
    if (!(await showConfirm('이 분석을 삭제하시겠습니까?', { title: '분석 삭제', type: 'danger', confirmText: '삭제' }))) return;
    const entry = misoAnalyses[drawingNum];
    if (!entry || !entry.analyses) return;
    entry.analyses.splice(idx, 1);
    // 분석 전부 삭제되면 도면도 제거
    if (entry.analyses.length === 0) {
        delete misoAnalyses[drawingNum];
        if (misoSelectedDrawing === drawingNum) {
            misoSelectedDrawing = null;
            misoSelectedAnalysisIdx = undefined;
        }
        await misoSaveAnalyses();
        misoRenderList();
        const detail = document.getElementById('miso-detail');
        if (detail) detail.innerHTML = '<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.3); font-size:13px;">왼쪽 목록에서 도면을 선택하세요</div>';
    } else {
        entry.status = '완료';
        misoSelectedAnalysisIdx = undefined;
        await misoSaveAnalyses();
        misoRenderList();
        misoRenderDetail(drawingNum);
    }
    showToast('분석 삭제됨', 'success');
}

// 도면 제목 수정
async function misoEditTitle(drawingNum) {
    const entry = misoAnalyses[drawingNum];
    if (!entry) return;
    const input = document.getElementById('miso-title-input');
    if (!input) return;
    entry.drawing_title = input.value.trim() || `도면 ${drawingNum}`;
    await misoSaveAnalyses();
    misoRenderList();
    showToast('제목 수정됨', 'success');
}

// 분석 이름 변경
async function misoRenameAnalysis(drawingNum, idx) {
    const entry = misoAnalyses[drawingNum];
    if (!entry || !entry.analyses || !entry.analyses[idx]) return;
    const a = entry.analyses[idx];
    const currentLabel = a.label || new Date(a.timestamp).toLocaleString('ko-KR');
    const newLabel = prompt('분석 이름 변경:', currentLabel);
    if (newLabel === null) return;
    a.label = newLabel.trim() || new Date(a.timestamp).toLocaleString('ko-KR');
    await misoSaveAnalyses();
    misoRenderDetail(drawingNum);
    showToast('이름 변경됨', 'success');
}

// 분석 결과 상세 표시
function misoRenderDetail(drawingNum) {
    const container = document.getElementById('miso-detail');
    if (!container) return;

    const entry = misoAnalyses[drawingNum];
    if (!entry) {
        container.innerHTML = `<div style="padding:20px; color:rgba(255,255,255,0.4); font-size:12px; text-align:center;">도면을 선택하세요.</div>`;
        return;
    }

    const analysesList = entry.analyses || [];
    const hasAnalyzing = analysesList.some(a => a.status === '분석중');
    const dataSize = (entry.llm_text || '').length.toLocaleString();

    // 헤더: 분석 실행 버튼만
    let html = `
        <div style="padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:10px; color:rgba(255,255,255,0.3);">데이터 ${dataSize}자</span>
                ${!hasAnalyzing ? `<button class="btn btn-sm" onclick="misoRunAnalysis('${drawingNum}')"
                    style="background:#6366f1; color:#fff; font-size:10px;">분석 실행</button>` : ''}
            </div>
        </div>`;

    // 분석 없으면 안내
    if (analysesList.length === 0) {
        html += `<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.3); font-size:12px;">
            분석 결과가 없습니다. '분석 실행'을 눌러주세요.
        </div>`;
        container.innerHTML = html;
        return;
    }

    // 분석 목록 (상단 고정) + 선택된 분석 내용 (아래 스크롤)
    const openIdx = misoSelectedAnalysisIdx;
    const openAnalysis = (openIdx !== undefined && openIdx >= 0 && openIdx < analysesList.length) ? analysesList[openIdx] : null;

    html += `<div style="display:flex; flex-direction:column; height:calc(100% - 60px);">`;

    // 분석 목록 (고정 영역)
    html += `<div style="flex-shrink:0; max-height:${openAnalysis ? '120px' : '100%'}; overflow-y:auto; border-bottom:${openAnalysis ? '1px solid rgba(99,102,241,0.3)' : 'none'};">`;
    for (let i = analysesList.length - 1; i >= 0; i--) {
        const a = analysesList[i];
        const aDate = new Date(a.timestamp).toLocaleString('ko-KR');
        const isOpen = openIdx === i;
        const arrow = isOpen ? '▼' : '▶';

        const isAnalyzing = a.status === '분석중';
        const isError = a.status === '오류';
        const aLabel = isAnalyzing ? `${aDate}` : (a.label || aDate);
        const statusTag = isAnalyzing ? ' <span style="color:#60a5fa; font-size:9px; background:rgba(96,165,250,0.15); padding:1px 4px; border-radius:2px;">분석중</span>'
                        : isError ? ' <span style="color:#f87171; font-size:9px; background:rgba(248,113,113,0.15); padding:1px 4px; border-radius:2px;">오류</span>' : '';
        const labelColor = isAnalyzing ? '#60a5fa' : isError ? '#f87171' : '#e0e0e0';

        html += `<div class="miso-item ${isOpen ? 'active' : ''}" style="padding:6px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;"
                 onclick="misoShowAnalysis('${drawingNum}', ${isOpen ? -1 : i})">
            <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">
                <span style="font-size:9px; color:rgba(255,255,255,0.4);">${isAnalyzing ? '◌' : arrow}</span>
                <span style="font-size:11px; color:${labelColor}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${aLabel}${statusTag}</span>
            </div>
            <div style="display:flex; gap:3px; flex-shrink:0;">
                ${!isAnalyzing ? `<button class="btn btn-sm" onclick="event.stopPropagation(); misoRenameAnalysis('${drawingNum}', ${i})" style="font-size:9px; padding:1px 5px;">이름</button>` : ''}
                ${!isAnalyzing && a.answer ? `<button class="btn btn-sm" onclick="event.stopPropagation(); misoCopyResult('${drawingNum}', ${i})" style="font-size:9px; padding:1px 5px;">복사</button>` : ''}
                <button class="btn btn-sm" onclick="event.stopPropagation(); misoDeleteAnalysis('${drawingNum}', ${i})" style="font-size:9px; color:#f87171; padding:1px 5px;">X</button>
            </div>
        </div>`;
    }
    html += `</div>`;

    // 선택된 분석 내용 (스크롤 영역)
    if (openAnalysis) {
        const resultHtml = misoMarkdownToHtml(openAnalysis.answer || '(응답 없음)');
        html += `<div style="flex:1; overflow-y:auto; padding:16px; font-size:12px; line-height:1.7; color:#d0d0d0;">
            ${resultHtml}
        </div>`;
    }

    html += `</div>`;

    container.innerHTML = html;
}

// 이전 분석 보기
function misoShowHistory(drawingNum, index) {
    const entry = misoAnalyses[drawingNum];
    if (!entry) return;
    const analysis = entry.analyses[parseInt(index)];
    if (!analysis) return;

    const content = document.getElementById('miso-result-content');
    if (content) {
        content.innerHTML = misoMarkdownToHtml(analysis.answer || '(응답 없음)');
    }
}

// 결과 복사
function misoCopyResult(drawingNum, idx) {
    const entry = misoAnalyses[drawingNum];
    if (!entry || !entry.analyses.length) return;
    const target = (idx !== undefined) ? entry.analyses[idx] : entry.analyses[entry.analyses.length - 1];
    navigator.clipboard.writeText(target.answer || '').then(() => {
        showToast('분석 결과 복사됨', 'success');
    });
}

// 간단한 마크다운 → HTML 변환
function misoMarkdownToHtml(md) {
    let html = md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h4 style="color:#60a5fa; margin:16px 0 6px; font-size:13px;">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="color:#818cf8; margin:18px 0 8px; font-size:14px;">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 style="color:#a78bfa; margin:20px 0 10px; font-size:15px;">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0e0;">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.06); padding:1px 4px; border-radius:2px; font-size:11px;">$1</code>')
        .replace(/^- (.+)$/gm, '<div style="padding-left:12px;">• $1</div>')
        .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:12px;">$&</div>')
        .replace(/^```([\s\S]*?)```/gm, '<pre style="background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; font-size:11px; overflow-x:auto;">$1</pre>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
    return html;
}

// MISO 설정 모달
function misoShowSettings() {
    // 설정 로드
    if (!isPyWebView()) {
        showToast('데스크톱 앱에서만 설정 가능합니다.', 'warning');
        return;
    }

    window.pywebview.api.miso_load_config().then(result => {
        const config = result.success ? result.data : {};
        const apiKey = config.api_key || '';
        const apiUrl = config.api_url || 'https://api.holdings.miso.gs/ext/v1/chat';
        const user = config.user || 'editor_user';

        const modal = document.createElement('div');
        modal.id = 'miso-settings-modal';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999;';
        modal.innerHTML = `
            <div style="background:#1a1a2e; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:24px; width:420px; max-width:90vw;">
                <h3 style="color:#e0e0e0; margin:0 0 16px; font-size:14px;">MISO 설정</h3>
                <div style="margin-bottom:12px;">
                    <label style="font-size:11px; color:rgba(255,255,255,0.5); display:block; margin-bottom:4px;">API Key</label>
                    <input id="miso-cfg-key" type="password" value="${apiKey}" placeholder="app-xxxx..."
                        style="width:100%; padding:6px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#e0e0e0; font-size:12px; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:11px; color:rgba(255,255,255,0.5); display:block; margin-bottom:4px;">API URL</label>
                    <input id="miso-cfg-url" type="text" value="${apiUrl}"
                        style="width:100%; padding:6px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#e0e0e0; font-size:12px; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="font-size:11px; color:rgba(255,255,255,0.5); display:block; margin-bottom:4px;">User</label>
                    <input id="miso-cfg-user" type="text" value="${user}"
                        style="width:100%; padding:6px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#e0e0e0; font-size:12px; box-sizing:border-box;">
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button onclick="document.getElementById('miso-settings-modal').remove()" class="btn btn-sm" style="font-size:11px;">취소</button>
                    <button onclick="misoSaveSettings()" class="btn btn-sm" style="font-size:11px; background:#6366f1; color:#fff;">저장</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    });
}

// 설정 저장
async function misoSaveSettings() {
    const config = {
        api_key: document.getElementById('miso-cfg-key').value.trim(),
        api_url: document.getElementById('miso-cfg-url').value.trim(),
        user: document.getElementById('miso-cfg-user').value.trim() || 'editor_user'
    };

    try {
        const result = await window.pywebview.api.miso_save_config(config);
        if (result.success) {
            showToast('MISO 설정 저장 완료', 'success');
            const modal = document.getElementById('miso-settings-modal');
            if (modal) modal.remove();
        } else {
            showToast('설정 저장 실패: ' + result.error, 'error');
        }
    } catch (e) {
        showToast('설정 저장 실패', 'error');
    }
}

// 목록 새로고침
async function misoRefreshList() {
    misoInitialized = false;
    await misoInit();
    // 선택된 도면 상세도 갱신
    if (misoSelectedDrawing && misoAnalyses[misoSelectedDrawing]) {
        misoRenderDetail(misoSelectedDrawing);
    }
    showToast('목록 새로고침 완료', 'success');
}
