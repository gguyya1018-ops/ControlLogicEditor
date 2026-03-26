/**
 * templates.js - 템플릿 시스템
 * 블록 템플릿 생성, 적용, 관리
 */

// ============ 템플릿 변수 ============
// (config.js에서 전역 변수 선언됨)

// ============ 템플릿 모드 토글 ============

function toggleTemplateMode() {
    console.log('[toggleTemplateMode] called, current templateMode:', templateMode);
    templateMode = !templateMode;
    const btn = document.getElementById('templateBtn');
    const toolBtn = document.getElementById('toolTemplateBtn');
    const hint = document.getElementById('template-hint');
    const indicator = document.getElementById('mode-indicator');

    if (templateMode) {
        // Turn off other modes
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
        if (cloneMode) {
            cloneMode = false;
            document.getElementById('cloneBtn')?.classList.remove('active');
            const cloneHint = document.getElementById('clone-hint');
            if (cloneHint) cloneHint.style.display = 'none';
        }

        btn?.classList.add('active');
        toolBtn?.classList.add('active');
        if (hint) {
            hint.style.display = 'inline';
            hint.textContent = '앵커 선택';
        }
        templateAnchor = null;
        templateSelectStart = null;
        templateSelectEnd = null;
        isTemplateSelecting = false;

        if (indicator) {
            indicator.textContent = 'TEMPLATE';
            indicator.className = 'mode-template';
        }
        if (canvas) canvas.style.cursor = 'crosshair';

        // Disable diagram mode to see ungrouped ports (전역 변수 사용)
        diagramMode = false;
        showBlocks = true;
        showPorts = true;

        // checkbox 동기화 (있으면)
        const diagramModeEl = document.getElementById('diagramMode');
        const showBlocksEl = document.getElementById('showBlocks');
        const showPortsEl = document.getElementById('showPorts');
        if (diagramModeEl) diagramModeEl.checked = false;
        if (showBlocksEl) showBlocksEl.checked = true;
        if (showPortsEl) showPortsEl.checked = true;

        // Remove focus from any input fields
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        // Switch sidebar to template tab
        switchSidebarTab('template');

        setTemplateStatus('앵커 요소를 클릭하세요 (T, AND, N 등)');
        updateStatusMode();
        render();
    } else {
        btn?.classList.remove('active');
        toolBtn?.classList.remove('active');
        if (hint) hint.style.display = 'none';
        templateAnchor = null;
        templateSelectStart = null;
        templateSelectEnd = null;
        isTemplateSelecting = false;

        if (indicator) {
            indicator.textContent = 'VIEW';
            indicator.className = 'mode-view';
        }
        if (canvas) canvas.style.cursor = '';

        // Restore DIAGRAM mode when exiting template mode (전역 변수 사용)
        diagramMode = true;
        const diagramModeEl = document.getElementById('diagramMode');
        if (diagramModeEl) diagramModeEl.checked = true;

        setTemplateStatus('');
        updateStatusMode();
        render();
    }
}

function setTemplateStatus(msg) {
    const el = document.getElementById('template-status');
    if (el) el.textContent = msg;
}

// ============ 템플릿 클릭 핸들러 ============

function handleTemplateClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - viewX) / scale;
    const worldY = (my - viewY) / scale;

    console.log('Template click at screen:', mx, my, '-> world:', worldX.toFixed(0), worldY.toFixed(0));

    const el = findElementAt(worldX, worldY);
    console.log('Found element:', el ? el.name : 'none');

    // Remove focus from any input fields
    if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
    }

    if (!templateAnchor) {
        // Step 1: Select anchor
        if (el) {
            templateAnchor = el;
            setTemplateStatus(`✓ 앵커: ${el.name} 선택됨! 이제 드래그하여 포트들을 선택하세요.`);
            document.getElementById('template-hint').textContent = '드래그로 포트 선택';
            console.log('Template anchor set to:', el.name, 'at', el.cx, el.cy);
            render();
        } else {
            setTemplateStatus('❌ 요소 위를 클릭하세요 (T, AND, N 등)');
            console.log('No element found at click position');
        }
    } else {
        setTemplateStatus(`앵커: ${templateAnchor.name} | 드래그하여 포트 선택 (또는 ESC 취소)`);
    }
}

// ============ 템플릿 드래그 선택 ============

function handleTemplateDragStart(e) {
    if (!templateMode || !templateAnchor) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    templateSelectStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    templateSelectEnd = { ...templateSelectStart };
    isTemplateSelecting = true;
    canvas.style.cursor = 'crosshair';
    console.log('Template drag started at', templateSelectStart);
}

function handleTemplateDragMove(e) {
    if (!isTemplateSelecting) return;

    const rect = canvas.getBoundingClientRect();
    templateSelectEnd = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    render();
    drawTemplateSelection();
}

function handleTemplateDragEnd(e) {
    if (!isTemplateSelecting) return;
    isTemplateSelecting = false;

    // Find all ports/elements in selection area
    const x1 = Math.min(templateSelectStart.x, templateSelectEnd.x);
    const y1 = Math.min(templateSelectStart.y, templateSelectEnd.y);
    const x2 = Math.max(templateSelectStart.x, templateSelectEnd.x);
    const y2 = Math.max(templateSelectStart.y, templateSelectEnd.y);

    // Convert to world coordinates
    const wx1 = (x1 - viewX) / scale;
    const wy1 = (y1 - viewY) / scale;
    const wx2 = (x2 - viewX) / scale;
    const wy2 = (y2 - viewY) / scale;

    // Find elements in selection (exclude the anchor itself)
    const selectedElements = [];
    for (const port of ports) {
        if (port === templateAnchor) continue;
        if (port.cx >= wx1 && port.cx <= wx2 && port.cy >= wy1 && port.cy <= wy2) {
            selectedElements.push(port);
        }
    }
    // Also check BLOCK_TYPE, SIGNAL, OTHER, and logic gate blocks
    for (const block of blocks) {
        if (block === templateAnchor) continue;
        if (block.type === 'BLOCK_TYPE' || block.type === 'SIGNAL' || block.type === 'OTHER' ||
            ['AND', 'OR', 'NOT'].includes(block.type)) {
            if (block.cx >= wx1 && block.cx <= wx2 && block.cy >= wy1 && block.cy <= wy2) {
                selectedElements.push(block);
            }
        }
    }

    if (selectedElements.length === 0) {
        setTemplateStatus('No elements selected. Drag again or ESC to cancel.');
        templateSelectStart = null;
        templateSelectEnd = null;
        render();
        return;
    }

    console.log(`✓ Dragged and selected ${selectedElements.length} elements:`, selectedElements.map(e => `${e.name}(${e.type})`).join(', '));

    // Create template from selection
    createTemplateFromSelection(templateAnchor, selectedElements);
}

// ============ 템플릿 생성 ============

function createTemplateFromSelection(anchor, elements) {
    // Calculate relative positions from anchor
    const portOffsets = elements.map(el => ({
        name: el.name,
        type: el.type,
        dx: el.cx - anchor.cx,
        dy: el.cy - anchor.cy
    }));

    // 포트 추가 모드인 경우 기존 포트에 추가
    if (pendingTemplateAnchor &&
        pendingTemplateAnchor.cx === anchor.cx &&
        pendingTemplateAnchor.cy === anchor.cy) {
        // 중복 제거하면서 추가
        for (const port of portOffsets) {
            const exists = pendingTemplatePorts.find(p =>
                Math.abs(p.dx - port.dx) < 5 && Math.abs(p.dy - port.dy) < 5
            );
            if (!exists) {
                pendingTemplatePorts.push(port);
            }
        }
        showTemplateSaveDialog(anchor, pendingTemplatePorts);
    } else {
        // 새 템플릿 시작
        pendingTemplateAnchor = anchor;
        pendingTemplatePorts = [...portOffsets];
        showTemplateSaveDialog(anchor, pendingTemplatePorts);
    }
}

// ============ 템플릿 저장 다이얼로그 ============

function showTemplateSaveDialog(anchor, portOffsets) {
    // 기존 다이얼로그 제거
    const existingDialog = document.getElementById('template-save-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'template-save-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a3e;
        border: 2px solid #9c27b0;
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        min-width: 350px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    // 포트 리스트 생성
    const portListItems = portOffsets.map((p, idx) => {
        const prefix = p.isGenerated ? '★ ' : '• ';
        const style = p.isGenerated ? 'color:#9c27b0;' : '';
        return `<div class="port-item" data-idx="${idx}" style="
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
            ${style}
        " onmouseover="this.style.background='#3a3a5e'" onmouseout="this.style.background='transparent'">
            ${prefix}${p.name} (dx:${p.dx.toFixed(0)}, dy:${p.dy.toFixed(0)})${p.isGenerated ? ' [생성]' : ''}
            <span style="float:right; color:#ff9800; font-size:10px;">🔄 앵커로</span>
        </div>`;
    }).join('');

    dialog.innerHTML = `
        <h3 style="margin:0 0 15px 0; color:#e040fb;">템플릿 생성</h3>
        <div style="margin-bottom:15px;">
            <strong style="color:#fff;">앵커:</strong>
            <span style="color:#4caf50;">${anchor.name}</span>
            <span style="color:#888;">(${anchor.type})</span>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#fff;">포트 ${portOffsets.length}개:</strong>
            <span style="color:#888; font-size:11px; margin-left:8px;">(클릭하면 앵커로 교체)</span>
            <div id="port-list-container" style="max-height:150px; overflow-y:auto; background:#1a1a2e; padding:10px; border-radius:6px; margin-top:5px; font-size:12px; color:#aaa;">
                ${portListItems}
            </div>
        </div>
        <div style="margin-bottom:15px;">
            <strong style="color:#fff;">적용 순서:</strong>
            <input type="number" id="template-priority" value="1" min="1" max="99" style="
                width: 60px;
                padding: 5px 8px;
                margin-left: 10px;
                background: #1a1a2e;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                font-size: 14px;
            ">
            <span style="color:#888; font-size:11px; margin-left:8px;">(숫자가 작을수록 먼저 적용)</span>
        </div>
        <div style="margin-bottom:15px;">
            <label style="color:#fff; cursor:pointer; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="template-ignore-name" style="width:16px; height:16px; cursor:pointer;">
                <span>앵커 이름 무시 (같은 타입 전체 적용)</span>
            </label>
            <span style="color:#888; font-size:11px; margin-left:24px;">MODE, M/A 등 이름이 다른 동일 패턴에 적용</span>
        </div>
        <div style="margin-bottom:15px;">
            <label style="color:#fff; cursor:pointer; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="template-strict-tolerance" style="width:16px; height:16px; cursor:pointer;">
                <span>엄격 좌표 매칭 (오차 ≤5)</span>
            </label>
            <span style="color:#888; font-size:11px; margin-left:24px;">좌표 차이가 5 이하일 때만 매칭 (기본: 30)</span>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="template-create-port" style="
                padding: 10px 20px;
                background: #9c27b0;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            ">+ 포트 생성</button>
            <button id="template-save" style="
                padding: 10px 20px;
                background: #4caf50;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            ">저장</button>
            <button id="template-cancel" style="
                padding: 10px 20px;
                background: #666;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            ">취소</button>
        </div>
    `;

    document.body.appendChild(dialog);

    // 포트 항목 클릭 시 앵커로 교체
    document.querySelectorAll('.port-item').forEach(item => {
        item.onclick = async () => {
            const idx = parseInt(item.dataset.idx);
            const selectedPort = portOffsets[idx];

            if (!(await showConfirm(`"${selectedPort.name}"을(를) 앵커로 설정하시겠습니까?`, { title: '확인', confirmText: '확인' }))) return;

            const newAnchorElement = findElementByNameAndPosition(selectedPort.name,
                anchor.cx + selectedPort.dx,
                anchor.cy + selectedPort.dy);

            if (!newAnchorElement) {
                showToast('해당 포트를 찾을 수 없습니다.', 'error');
                return;
            }

            // 모든 포트의 dx, dy를 새 앵커 기준으로 재계산
            const newPortOffsets = [];

            // 기존 앵커를 포트로 추가
            newPortOffsets.push({
                name: anchor.name,
                type: anchor.type,
                dx: anchor.cx - newAnchorElement.cx,
                dy: anchor.cy - newAnchorElement.cy,
                isGenerated: false
            });

            // 기존 포트들 재계산 (선택된 포트 제외)
            for (let i = 0; i < portOffsets.length; i++) {
                if (i === idx) continue;

                const p = portOffsets[i];
                const oldAbsX = anchor.cx + p.dx;
                const oldAbsY = anchor.cy + p.dy;

                newPortOffsets.push({
                    name: p.name,
                    type: p.type,
                    dx: oldAbsX - newAnchorElement.cx,
                    dy: oldAbsY - newAnchorElement.cy,
                    isGenerated: p.isGenerated
                });
            }

            console.log(`Anchor changed: ${anchor.name} -> ${newAnchorElement.name}`);
            console.log(`New ports:`, newPortOffsets);

            dialog.remove();
            showTemplateSaveDialog(newAnchorElement, newPortOffsets);
        };
    });

    // 포트 생성 버튼
    document.getElementById('template-create-port').onclick = () => {
        dialog.remove();
        showPortCreateDialog(anchor, portOffsets);
    };

    // 저장 버튼
    document.getElementById('template-save').onclick = () => {
        const priority = parseInt(document.getElementById('template-priority').value) || 1;
        const ignoreName = document.getElementById('template-ignore-name').checked;
        const strictTolerance = document.getElementById('template-strict-tolerance').checked;
        dialog.remove();
        finalizeTemplate(anchor, portOffsets, priority, ignoreName, strictTolerance);
    };

    // 취소 버튼
    document.getElementById('template-cancel').onclick = () => {
        dialog.remove();
        pendingTemplatePorts = [];
        pendingTemplateAnchor = null;
        setTemplateStatus('템플릿 생성 취소됨');
        toggleTemplateMode();
    };
}

// ============ 요소 찾기 헬퍼 ============

function findElementByNameAndPosition(name, x, y, tolerance = 30) {
    for (const b of blocks) {
        if (b.name === name && Math.abs(b.cx - x) < tolerance && Math.abs(b.cy - y) < tolerance) {
            return b;
        }
    }
    for (const p of ports) {
        if (p.name === name && Math.abs(p.cx - x) < tolerance && Math.abs(p.cy - y) < tolerance) {
            return p;
        }
    }
    return null;
}

// ============ 포트 생성 다이얼로그 ============

function showPortCreateDialog(anchor, existingPorts) {
    portCreateAnchor = anchor;
    portCreatePorts = [...existingPorts];

    const dialog = document.createElement('div');
    dialog.id = 'port-create-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a3e;
        border: 2px solid #9c27b0;
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        min-width: 300px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    dialog.innerHTML = `
        <h3 style="margin:0 0 15px 0; color:#9c27b0;">포트 생성</h3>
        <div style="margin-bottom:15px;">
            <label style="color:#fff; display:block; margin-bottom:5px;">포트 이름:</label>
            <input type="text" id="port-create-name" placeholder="예: OUT, IN, SIGNAL..." style="
                width: 100%;
                padding: 8px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #1a1a2e;
                color: #fff;
                box-sizing: border-box;
            ">
        </div>
        <div style="margin-bottom:15px;">
            <label style="color:#fff; display:block; margin-bottom:5px;">포트 타입:</label>
            <select id="port-create-type" style="
                width: 100%;
                padding: 8px;
                border: 1px solid #555;
                border-radius: 4px;
                background: #1a1a2e;
                color: #fff;
            ">
                <option value="PORT">PORT</option>
                <option value="SIGNAL">SIGNAL</option>
                <option value="REF_SIGNAL">REF_SIGNAL</option>
                <option value="SHEET_REF">SHEET_REF</option>
                <option value="BLOCK_TYPE">BLOCK_TYPE</option>
            </select>
        </div>
        <div style="margin-bottom:15px; padding:10px; background:#1a1a2e; border-radius:6px;">
            <p style="color:#ff9800; margin:0; font-size:13px;">
                ⚠️ 확인 후 캔버스에서 위치를 클릭하세요
            </p>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="port-create-confirm" style="
                padding: 10px 20px;
                background: #9c27b0;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            ">위치 선택</button>
            <button id="port-create-back" style="
                padding: 10px 20px;
                background: #666;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            ">뒤로</button>
        </div>
    `;

    document.body.appendChild(dialog);

    // 위치 선택 버튼
    document.getElementById('port-create-confirm').onclick = () => {
        const name = document.getElementById('port-create-name').value.trim();
        const type = document.getElementById('port-create-type').value;

        if (!name) {
            showToast('포트 이름을 입력하세요', 'info');
            return;
        }

        portCreateName = name;
        portCreateType = type;
        dialog.remove();

        // 위치 선택 모드 진입
        portCreateMode = true;
        setTemplateStatus(`"${name}" 포트 위치를 클릭하세요 (앵커: ${anchor.name})`);

        const hint = document.getElementById('template-hint');
        if (hint) {
            hint.textContent = `클릭으로 "${name}" 위치 지정`;
            hint.style.color = '#9c27b0';
        }
    };

    // 뒤로 버튼
    document.getElementById('port-create-back').onclick = () => {
        dialog.remove();
        showTemplateSaveDialog(anchor, existingPorts);
    };
}

// ============ 포트 생성 위치 클릭 ============

function handlePortCreateClick(e) {
    if (!portCreateMode || !portCreateAnchor) return false;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - viewX) / scale;
    const clickY = (e.clientY - rect.top - viewY) / scale;

    // 앵커 기준 상대 위치 계산
    const dx = clickX - portCreateAnchor.cx;
    const dy = clickY - portCreateAnchor.cy;

    // 포트 추가
    const newPort = {
        name: portCreateName,
        type: portCreateType,
        dx: dx,
        dy: dy,
        isGenerated: true
    };

    portCreatePorts.push(newPort);
    portCreateMode = false;

    console.log(`Created port: ${portCreateName} at dx=${dx.toFixed(0)}, dy=${dy.toFixed(0)}`);

    // 다시 저장 다이얼로그로
    pendingTemplatePorts = portCreatePorts;
    pendingTemplateAnchor = portCreateAnchor;
    showTemplateSaveDialog(portCreateAnchor, portCreatePorts);

    return true;
}

// ============ 템플릿 최종 저장 ============

function finalizeTemplate(anchor, portOffsets, priority = 1, ignoreName = false, strictTolerance = false) {
    let baseName = anchor.name;
    if (baseName.length > 10) baseName = baseName.substring(0, 10);

    let templateName = baseName;
    let counter = 1;
    while (blockTemplates.find(t => t.name === templateName)) {
        templateName = `${baseName}_${counter++}`;
    }

    const newTemplate = {
        name: templateName,
        anchor: anchor.name,
        anchorType: anchor.type,
        ports: portOffsets,
        priority: priority,
        ignoreName: ignoreName,
        strictTolerance: strictTolerance
    };

    blockTemplates.push(newTemplate);
    blockTemplates.sort((a, b) => (a.priority || 1) - (b.priority || 1));
    updateTemplateList();
    saveTemplatesToStorage();

    pendingTemplatePorts = [];
    pendingTemplateAnchor = null;

    setTemplateStatus(`템플릿 "${templateName}" 생성 완료! (${portOffsets.length}개 포트)`);

    toggleTemplateMode();
}

// ============ 템플릿 선택 영역 그리기 ============

function drawTemplateSelection() {
    if (!templateSelectStart || !templateSelectEnd) return;

    const x1 = Math.min(templateSelectStart.x, templateSelectEnd.x);
    const y1 = Math.min(templateSelectStart.y, templateSelectEnd.y);
    const x2 = Math.max(templateSelectStart.x, templateSelectEnd.x);
    const y2 = Math.max(templateSelectStart.y, templateSelectEnd.y);

    ctx.save();
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.fillStyle = 'rgba(156, 39, 176, 0.1)';
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);
    ctx.restore();

    // Highlight anchor
    if (templateAnchor) {
        const ax = templateAnchor.cx * scale + viewX;
        const ay = templateAnchor.cy * scale + viewY;
        ctx.save();
        ctx.strokeStyle = '#e040fb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ax, ay, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ============ 템플릿 리스트 UI ============

function updateTemplateList() {
    const list = document.getElementById('template-list');
    if (!list) return;

    if (blockTemplates.length === 0) {
        list.innerHTML = '<p style="color:#666; font-size:11px; padding:5px;">No templates yet</p>';
        updateMultiSelectButtons();
        return;
    }

    // Group templates by anchorType
    const groups = {};
    blockTemplates.forEach((t, idx) => {
        const type = t.anchorType || 'OTHER';
        if (!groups[type]) groups[type] = [];
        groups[type].push({ template: t, idx });
    });

    const typeLabels = {
        'OCB_BLOCK': '📦 OCB Block',
        'ALG_BLOCK': '📦 ALG Block',
        'BLOCK_TYPE': '🔤 Block Type (T, N, ...)',
        'AND': '⚙️ AND',
        'OR': '⚙️ OR',
        'NOT': '⚙️ NOT',
        'OTHER': '📋 기타'
    };

    let html = '';
    for (const [type, items] of Object.entries(groups)) {
        const label = typeLabels[type] || type;
        const groupCheckbox = templateEditMode ?
            `<input type="checkbox" class="checkbox group-checkbox" data-type="${type}"
                   onclick="toggleGroupTemplates('${type}', event)"
                   ${isGroupFullySelected(type, items) ? 'checked' : ''}>` : '';

        html += `<div class="template-group">
            <div class="template-group-header" style="font-size:10px; color:#888; padding:5px 0 2px 0; border-bottom:1px solid #0f3460; margin-top:5px;">
                ${groupCheckbox}
                ${label} (${items.length})
            </div>`;

        for (const { template: t, idx } of items) {
            const priorityBadge = t.priority ? `<span style="color:#e040fb; font-size:9px; margin-left:4px;">[${t.priority}]</span>` : '';
            const ignoreNameBadge = t.ignoreName ? `<span style="color:#ff9800; font-size:9px; margin-left:4px;" title="이름 무시 - 같은 타입 전체 적용">🌐</span>` : '';
            const strictBadge = t.strictTolerance ? `<span style="color:#00bcd4; font-size:9px; margin-left:4px;" title="엄격 좌표 매칭 (≤5)">📐</span>` : '';
            const isSelected = selectedTemplate === idx;
            const isMultiSelected = selectedTemplates.has(idx);
            const itemClass = isSelected ? 'selected' : (isMultiSelected ? 'multi-selected' : '');

            const itemCheckbox = templateEditMode ?
                `<input type="checkbox" class="checkbox" data-idx="${idx}"
                       onclick="toggleTemplateCheck(${idx}, event)"
                       ${isMultiSelected ? 'checked' : ''}>` : '';

            html += `<div class="template-item ${itemClass}" onclick="selectTemplate(${idx}, event)">
                <div style="display:flex; align-items:center;">
                    ${itemCheckbox}
                    <span class="name">${t.name}</span>${priorityBadge}${ignoreNameBadge}${strictBadge}
                    <span class="info">(${t.ports.length} ports)</span>
                </div>
            </div>`;
        }
        html += '</div>';
    }

    list.innerHTML = html;
    updateMultiSelectButtons();
}

// ============ 템플릿 수정 모드 ============

function toggleTemplateEditMode() {
    templateEditMode = !templateEditMode;

    const btn = document.getElementById('btn-template-edit-mode');
    const controls = document.getElementById('template-edit-controls');

    if (templateEditMode) {
        btn.textContent = '✅ 수정완료';
        btn.classList.add('active');
        btn.style.background = 'var(--accent-purple)';
        btn.style.borderColor = 'var(--accent-purple)';
        btn.style.color = 'white';
        controls.style.display = 'flex';
    } else {
        btn.textContent = '✏️ 수정';
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        controls.style.display = 'none';
        selectedTemplates.clear();
    }

    updateTemplateList();
    console.log(`📌 템플릿 수정 모드: ${templateEditMode ? 'ON' : 'OFF'}`);
}

function isGroupFullySelected(type, items) {
    if (!items || items.length === 0) return false;
    return items.every(item => selectedTemplates.has(item.idx));
}

function toggleGroupTemplates(type, event) {
    event.stopPropagation();
    const checkbox = event.target;

    const groupIndices = [];
    blockTemplates.forEach((t, idx) => {
        if ((t.anchorType || 'OTHER') === type) {
            groupIndices.push(idx);
        }
    });

    if (checkbox.checked) {
        groupIndices.forEach(idx => selectedTemplates.add(idx));
    } else {
        groupIndices.forEach(idx => selectedTemplates.delete(idx));
    }

    updateTemplateList();
    console.log(`📌 그룹 ${type} ${checkbox.checked ? '선택' : '해제'}: ${groupIndices.length}개`);
}

function toggleTemplateCheck(idx, event) {
    event.stopPropagation();

    if (selectedTemplates.has(idx)) {
        selectedTemplates.delete(idx);
    } else {
        selectedTemplates.add(idx);
    }

    updateTemplateList();
    console.log(`📌 템플릿 체크: ${selectedTemplates.size}개 선택됨`);
}

function updateMultiSelectButtons() {
    const count = selectedTemplates.size;
    const deleteBtn = document.getElementById('btn-delete-selected');

    if (deleteBtn) {
        deleteBtn.textContent = count > 0 ? `선택 삭제 (${count})` : '선택 삭제';
        deleteBtn.disabled = count === 0;
        deleteBtn.style.opacity = count === 0 ? '0.5' : '1';
    }
}

function selectAllTemplates() {
    blockTemplates.forEach((t, idx) => selectedTemplates.add(idx));
    updateTemplateList();
    console.log(`📌 전체 선택: ${selectedTemplates.size}개`);
}

function deselectAllTemplates() {
    selectedTemplates.clear();
    selectedTemplate = null;
    updateTemplateList();
    console.log(`📌 전체 해제`);
}

async function deleteSelectedTemplates() {
    if (selectedTemplates.size === 0) {
        showToast('삭제할 템플릿을 선택하세요', 'info');
        return;
    }

    const count = selectedTemplates.size;
    const names = Array.from(selectedTemplates).map(idx => blockTemplates[idx]?.name).filter(Boolean).join(', ');

    if (!(await showConfirm(`선택된 ${count}개 템플릿을 삭제하시겠습니까?`, { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    const sortedIndices = Array.from(selectedTemplates).sort((a, b) => b - a);
    for (const idx of sortedIndices) {
        blockTemplates.splice(idx, 1);
    }

    selectedTemplates.clear();
    selectedTemplate = null;
    updateTemplateList();
    saveTemplatesToStorage();
    setTemplateStatus(`${count}개 템플릿 삭제됨`);
    console.log(`🗑️ ${count}개 템플릿 삭제됨`);
}

// ============ 템플릿 선택 ============

function selectTemplate(idx, event) {
    if (event && event.target.type === 'checkbox') return;

    if (event && (event.ctrlKey || event.metaKey)) {
        if (selectedTemplates.has(idx)) {
            selectedTemplates.delete(idx);
        } else {
            selectedTemplates.add(idx);
        }
        console.log(`📌 Ctrl+클릭: ${selectedTemplates.size}개 선택됨`);
    } else {
        selectedTemplates.clear();
        selectedTemplate = (selectedTemplate === idx) ? null : idx;
        console.log(`📌 Template ${selectedTemplate !== null ? 'selected' : 'deselected'} at index ${idx}`);
    }

    updateTemplateList();

    if (selectedTemplate !== null) {
        const t = blockTemplates[selectedTemplate];
        console.log(`   → "${t.name}" (anchor: ${t.anchor}, ports: ${t.ports.length})`);
        setTemplateStatus(`Selected: ${t.name} - Anchor: ${t.anchor}, Ports: ${t.ports.map(p => p.name).join(', ')}`);

        if (document.getElementById('template-detail-dialog')) {
            updateTemplateDetailContent();
        }
    } else if (selectedTemplates.size > 0) {
        setTemplateStatus(`${selectedTemplates.size}개 템플릿 선택됨`);
    } else {
        setTemplateStatus('');
    }
}

async function deleteSelectedTemplate() {
    if (selectedTemplate === null) {
        showToast('Select a template first', 'info');
        return;
    }

    const t = blockTemplates[selectedTemplate];
    console.log(`🗑️ Deleting template at index ${selectedTemplate}:`, t.name);

    if (!(await showConfirm(`Delete template "${t.name}"?`, { title: '삭제 확인', type: 'danger', confirmText: '삭제' }))) return;

    blockTemplates.splice(selectedTemplate, 1);
    console.log(`✓ Template deleted. Remaining: ${blockTemplates.length}`);

    selectedTemplate = null;
    updateTemplateList();
    saveTemplatesToStorage();
    setTemplateStatus('Template deleted');
}

// ============ 템플릿 상세 정보 ============

function updateTemplateDetailContent() {
    if (selectedTemplate === null || !blockTemplates[selectedTemplate]) return;

    const t = blockTemplates[selectedTemplate];
    const portList = t.ports.map(p => {
        const gen = p.isGenerated ? ' [생성]' : '';
        return `  • ${p.name} (${p.type}): dx=${p.dx.toFixed(0)}, dy=${p.dy.toFixed(0)}${gen}`;
    }).join('\n');

    const ignoreNameText = t.ignoreName ? '예 (같은 타입 전체 적용)' : '아니오 (이름 패턴 매칭)';
    const strictText = t.strictTolerance ? '예 (≤5)' : '아니오 (≤30)';
    const detailText = `템플릿: ${t.name}\n` +
          `앵커: ${t.anchor} (${t.anchorType})\n` +
          `적용순서: ${t.priority || 1}\n` +
          `이름무시: ${ignoreNameText}\n` +
          `엄격좌표: ${strictText}\n` +
          `포트 수: ${t.ports.length}\n\n` +
          `포트 목록:\n${portList}`;

    const textarea = document.getElementById('template-detail-text');
    const priorityInput = document.getElementById('template-priority-input');
    const ignoreNameInput = document.getElementById('template-ignore-name-input');
    const strictInput = document.getElementById('template-strict-input');
    if (textarea) textarea.value = detailText;
    if (priorityInput) priorityInput.value = t.priority || 1;
    if (ignoreNameInput) ignoreNameInput.checked = t.ignoreName || false;
    if (strictInput) strictInput.checked = t.strictTolerance || false;
}

function showTemplateDetail(templateIndex = null) {
    if (templateIndex !== null) {
        selectedTemplate = templateIndex;
        updateTemplateList();
    }

    if (selectedTemplate === null) {
        showToast('템플릿을 먼저 선택하세요', 'info');
        return;
    }

    const existingDialog = document.getElementById('template-detail-dialog');
    if (existingDialog) {
        updateTemplateDetailContent();
        return;
    }

    const t = blockTemplates[selectedTemplate];
    const portList = t.ports.map(p => {
        const gen = p.isGenerated ? ' [생성]' : '';
        return `  • ${p.name} (${p.type}): dx=${p.dx.toFixed(0)}, dy=${p.dy.toFixed(0)}${gen}`;
    }).join('\n');

    const ignoreNameText = t.ignoreName ? '예 (같은 타입 전체 적용)' : '아니오 (이름 패턴 매칭)';
    const strictText = t.strictTolerance ? '예 (≤5)' : '아니오 (≤30)';
    const detailText = `템플릿: ${t.name}\n` +
          `앵커: ${t.anchor} (${t.anchorType})\n` +
          `적용순서: ${t.priority || 1}\n` +
          `이름무시: ${ignoreNameText}\n` +
          `엄격좌표: ${strictText}\n` +
          `포트 수: ${t.ports.length}\n\n` +
          `포트 목록:\n${portList}`;

    const dialog = document.createElement('div');
    dialog.id = 'template-detail-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a3e;
        border: 2px solid #4caf50;
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        min-width: 400px;
        max-width: 600px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    dialog.innerHTML = `
        <h3 style="margin:0 0 15px 0; color:#4caf50;">템플릿 상세</h3>
        <textarea id="template-detail-text" readonly style="
            width: 100%;
            height: 180px;
            background: #1a1a2e;
            color: #fff;
            border: 1px solid #555;
            border-radius: 6px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            resize: vertical;
            box-sizing: border-box;
        ">${detailText}</textarea>
        <div style="display:flex; align-items:center; gap:10px; margin-top:15px; padding:10px; background:#1a1a2e; border-radius:6px;">
            <label style="color:#fff; font-size:12px;">적용순서:</label>
            <input type="number" id="template-priority-input" value="${t.priority || 1}" min="1" max="99" style="
                width: 60px;
                padding: 5px 8px;
                background: #2a2a3e;
                color: #fff;
                border: 1px solid #555;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
            ">
            <span style="color:#888; font-size:11px;">(숫자가 작을수록 먼저 적용)</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:10px; padding:10px; background:#1a1a2e; border-radius:6px;">
            <label style="color:#fff; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="template-ignore-name-input" ${t.ignoreName ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                <span>이름 무시</span>
            </label>
            <label style="color:#fff; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:8px; margin-left:15px;">
                <input type="checkbox" id="template-strict-input" ${t.strictTolerance ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                <span>엄격좌표 (≤5)</span>
            </label>
            <button id="template-settings-save" style="
                margin-left: auto;
                padding: 5px 15px;
                background: #ff9800;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            ">설정 저장</button>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:15px;">
            <button id="template-detail-copy" style="
                padding: 10px 20px;
                background: #2196f3;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            ">복사</button>
            <button id="template-detail-close" style="
                padding: 10px 20px;
                background: #666;
                color: #fff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            ">닫기</button>
        </div>
    `;

    document.body.appendChild(dialog);

    // 복사 버튼
    document.getElementById('template-detail-copy').onclick = () => {
        const textarea = document.getElementById('template-detail-text');
        textarea.select();
        document.execCommand('copy');
        document.getElementById('template-detail-copy').textContent = '복사됨!';
        setTimeout(() => {
            document.getElementById('template-detail-copy').textContent = '복사';
        }, 1500);
    };

    // 설정 저장 버튼
    document.getElementById('template-settings-save').onclick = () => {
        const newPriority = parseInt(document.getElementById('template-priority-input').value) || 1;
        const ignoreName = document.getElementById('template-ignore-name-input').checked;
        const strictTolerance = document.getElementById('template-strict-input').checked;
        const templateName = blockTemplates[selectedTemplate].name;

        blockTemplates[selectedTemplate].priority = newPriority;
        blockTemplates[selectedTemplate].ignoreName = ignoreName;
        blockTemplates[selectedTemplate].strictTolerance = strictTolerance;
        blockTemplates.sort((a, b) => (a.priority || 1) - (b.priority || 1));
        saveTemplatesToStorage();
        updateTemplateList();
        const newIndex = blockTemplates.findIndex(t => t.name === templateName);
        if (newIndex >= 0) selectedTemplate = newIndex;
        updateTemplateDetailContent();

        const btn = document.getElementById('template-settings-save');
        btn.textContent = '저장됨!';
        btn.style.background = '#4caf50';
        setTimeout(() => {
            btn.textContent = '설정 저장';
            btn.style.background = '#ff9800';
        }, 1500);
    };

    // 닫기 버튼
    document.getElementById('template-detail-close').onclick = () => {
        dialog.remove();
    };
}

// ============ 템플릿 매칭 헬퍼 ============

function findMatchingElement(portDef, baseX, baseY, usedElements, excludeBlock, allowAssigned = false, debugBlockName = null, anchorType = null, ignoreName = false, strictTolerance = false) {
    const expectedX = baseX + portDef.dx;
    const expectedY = baseY + portDef.dy;
    const tolerance = strictTolerance ? 5 : 50;
    const debug = debugBlockName !== null;

    let bestElement = null;
    let bestDist = tolerance;
    let candidates = [];

    const skipNameCheck = (portDef.type === 'SHEET_REF' || portDef.type === 'OTHER' || portDef.type === 'BLOCK_TYPE');

    // Search in ports array
    for (const port of ports) {
        if (!skipNameCheck && port.name !== portDef.name) continue;
        if (port.type !== portDef.type) continue;

        const dist = Math.hypot(port.cx - expectedX, port.cy - expectedY);

        if (debug) {
            candidates.push({
                name: port.name,
                type: 'port',
                cx: port.cx,
                cy: port.cy,
                dist: dist,
                assigned: port.parent,
                used: usedElements && usedElements.has(port)
            });
        }

        if (!allowAssigned && port.parent) continue;
        if (usedElements && usedElements.has(port)) continue;

        if (dist < bestDist) {
            bestDist = dist;
            bestElement = port;
        }
    }

    // Search in blocks
    for (const block of blocks) {
        if (excludeBlock && block === excludeBlock) continue;
        if (!skipNameCheck && block.name !== portDef.name) continue;
        if (block.type !== portDef.type) continue;

        const dist = Math.hypot(block.cx - expectedX, block.cy - expectedY);

        if (debug) {
            candidates.push({
                name: block.name,
                type: block.type,
                cx: block.cx,
                cy: block.cy,
                dist: dist,
                assigned: block.parent,
                used: usedElements && usedElements.has(block)
            });
        }

        if (!allowAssigned && block.parent) continue;
        if (usedElements && usedElements.has(block)) continue;

        if (dist < bestDist) {
            bestDist = dist;
            bestElement = block;
        }
    }

    if (debug && !bestElement && candidates.length > 0) {
        console.log(`      Candidates for "${portDef.name}" (expected: ${expectedX.toFixed(0)}, ${expectedY.toFixed(0)}, tol: ${tolerance}):`);
        candidates.slice(0, 5).forEach(c => {
            console.log(`        - ${c.name} (${c.type}) at (${c.cx.toFixed(0)}, ${c.cy.toFixed(0)}), dist=${c.dist.toFixed(1)}, assigned=${c.assigned || 'none'}, used=${c.used}`);
        });
    }

    return bestElement ? { element: bestElement, dist: bestDist } : null;
}

function canMatchAllPorts(template, baseX, baseY, usedElements, excludeBlock, allowAssigned = false, debugBlockName = null, anchorType = null, ignoreName = false, strictTolerance = false) {
    const matches = [];
    const debug = debugBlockName !== null;

    const normalPorts = template.ports.filter(p => !p.isGenerated);

    for (const portDef of normalPorts) {
        const match = findMatchingElement(portDef, baseX, baseY, usedElements, excludeBlock, allowAssigned, debug ? debugBlockName : null, anchorType, ignoreName, strictTolerance);
        if (!match) {
            if (debug) {
                const expectedX = baseX + portDef.dx;
                const expectedY = baseY + portDef.dy;
                console.log(`    ❌ [${debugBlockName}] Port "${portDef.name}" (${portDef.type}) NOT FOUND at (${expectedX.toFixed(0)}, ${expectedY.toFixed(0)})`);
            }
            return null;
        }
        matches.push({ portDef, ...match });
    }
    return matches;
}

function unassignPort(port) {
    if (!port.parent) return;
    const parentName = port.parent;
    port.parent = null;
    if (groupsData[parentName]) {
        groupsData[parentName].ports = groupsData[parentName].ports.filter(p => p !== port.name);
    }
}

// ============ 디버그 함수 ============

window.debugTemplateMatch = function(blockName) {
    const block = blocks.find(b => b.name === blockName);
    if (!block) {
        console.log(`Block "${blockName}" not found`);
        return;
    }

    console.log(`\n========== DEBUG: ${blockName} ==========`);
    console.log(`Block type: ${block.type}`);
    console.log(`Block position: (${block.cx.toFixed(0)}, ${block.cy.toFixed(0)})`);
    console.log(`Current parent: ${block.parent || 'none'}`);

    if (blockTemplates.length === 0) {
        console.log('No templates registered');
        return;
    }

    console.log(`\nRegistered templates: ${blockTemplates.length}`);

    for (const template of blockTemplates) {
        console.log(`\n--- Template: ${template.name} ---`);
        console.log(`  Anchor: ${template.anchor} (type: ${template.anchorType})`);
        console.log(`  Ports: ${template.ports.length}`);

        if (template.anchorType === block.type) {
            console.log(`  ✓ Type matches, checking ports...`);

            const matches = canMatchAllPorts(template, block.cx, block.cy, new Set(), block, true, blockName, template.anchorType, template.ignoreName);

            if (matches) {
                console.log(`  ✓ ALL ${matches.length} ports matched!`);
                matches.forEach(m => {
                    console.log(`    - ${m.portDef.name}: found at dist=${m.dist.toFixed(1)}`);
                });
            } else {
                console.log(`  ✗ Some ports not found (see details above)`);
            }
        } else {
            console.log(`  ✗ Type mismatch (template: ${template.anchorType}, block: ${block.type})`);
        }
    }

    // List nearby elements
    console.log(`\n--- Nearby elements (within 200px) ---`);
    const nearby = [];
    for (const p of ports) {
        const dist = Math.hypot(p.cx - block.cx, p.cy - block.cy);
        if (dist < 200) nearby.push({ ...p, dist, source: 'port' });
    }
    for (const b of blocks) {
        if (b === block) continue;
        const dist = Math.hypot(b.cx - block.cx, b.cy - block.cy);
        if (dist < 200) nearby.push({ ...b, dist, source: 'block' });
    }
    nearby.sort((a, b) => a.dist - b.dist);
    nearby.slice(0, 15).forEach(el => {
        const dx = (el.cx - block.cx).toFixed(0);
        const dy = (el.cy - block.cy).toFixed(0);
        console.log(`  ${el.name} (${el.type}): dx=${dx}, dy=${dy}, dist=${el.dist.toFixed(0)}, parent=${el.parent || 'none'}`);
    });

    console.log(`\n========================================\n`);
};

// ============ 템플릿 적용 ============

async function applyTemplatesOnly() {
    if (blockTemplates.length === 0) {
        showToast('등록된 템플릿이 없습니다. Template 모드(T)로 먼저 템플릿을 등록하세요.', 'info');
        return;
    }

    // 시작 확인 (한 번만)
    if (!(await showConfirm(`${blockTemplates.length}개 템플릿을 전체 적용하시겠습니까?`, { title: '적용 확인', confirmText: '적용' }))) {
        return;
    }

    console.log('=== Applying All Templates ===');

    let totalAssigned = 0;
    let matchedBlocks = 0;
    let skippedBlocks = 0;
    const usedElements = new Set();

    const parentBlocks = blocks.filter(b =>
        ['OCB_BLOCK', 'ALG_BLOCK'].includes(b.type) && !isPortLikeName(b.name)
    );

    console.log(`Parent blocks (OCB/ALG): ${parentBlocks.length}`);
    console.log(`Templates available (${blockTemplates.length}):`,
        blockTemplates.map(t => `${t.name}(pri:${t.priority || 1}, ports:${t.ports.length})`).join(', '));

    const priorityGroups = {};
    blockTemplates.forEach(t => {
        const pri = t.priority || 1;
        if (!priorityGroups[pri]) priorityGroups[pri] = [];
        priorityGroups[pri].push(t);
    });

    const priorities = Object.keys(priorityGroups).map(Number).sort((a, b) => a - b);
    console.log(`Priority groups: ${priorities.join(', ')}`);

    for (const priority of priorities) {
        const templatesInGroup = priorityGroups[priority];

        console.log(`\n========== Applying Priority ${priority} Templates (${templatesInGroup.length}) ==========`);

        let groupMatchedBlocks = 0;
        let groupAssignedPorts = 0;

        for (const template of templatesInGroup) {
            console.log(`\n--- Template: ${template.name} (${template.anchorType}, ${template.ports.length} ports) ---`);

            if (template.anchorType === 'OCB_BLOCK' || template.anchorType === 'ALG_BLOCK') {
                for (const parentBlock of parentBlocks) {
                    const matches = canMatchAllPorts(template, parentBlock.cx, parentBlock.cy, null, parentBlock, true, null, template.anchorType, template.ignoreName);

                    if (matches) {
                        console.log(`\n  ✓ ${parentBlock.name}: ALL ${matches.length} ports matched`);
                        matchedBlocks++;
                        groupMatchedBlocks++;

                        const group = groupsData[parentBlock.name];
                        if (group && group.ports && group.ports.length > 0) {
                            const oldCount = group.ports.length;
                            console.log(`    🔄 Overwriting existing group: ${oldCount} ports`);

                            for (const port of ports) {
                                if (port.parent === parentBlock.name) {
                                    port.parent = null;
                                }
                            }
                            for (const block of blocks) {
                                if (block.parent === parentBlock.name) {
                                    block.parent = null;
                                }
                            }
                            group.ports = [];
                        }

                        for (const match of matches) {
                            assignPortToBlock(match.element, parentBlock, true);
                            usedElements.add(match.element);
                            totalAssigned++;
                            groupAssignedPorts++;
                        }
                    } else {
                        skippedBlocks++;
                    }
                }
            } else {
                // Other anchor types (BLOCK_TYPE, SIGNAL, REF_SIGNAL, etc.)
                let matchingAnchors;
                if (template.anchorType === 'BLOCK_TYPE') {
                    matchingAnchors = [
                        ...blocks.filter(b => b.type === template.anchorType && b.name === template.anchor),
                        ...ports.filter(p => p.type === template.anchorType && p.name === template.anchor)
                    ];
                } else if (template.ignoreName) {
                    matchingAnchors = [
                        ...blocks.filter(b => b.type === template.anchorType),
                        ...ports.filter(p => p.type === template.anchorType)
                    ];
                } else {
                    matchingAnchors = [
                        ...blocks.filter(b => b.type === template.anchorType),
                        ...ports.filter(p => p.type === template.anchorType)
                    ];
                }

                console.log(`  Found ${matchingAnchors.length} anchors of type "${template.anchorType}"`);

                for (const anchor of matchingAnchors) {
                    let existingGroupName = null;
                    for (const [name, group] of Object.entries(groupsData)) {
                        if (Math.abs(group.cx - anchor.cx) < 20 && Math.abs(group.cy - anchor.cy) < 20) {
                            existingGroupName = name;
                            break;
                        }
                    }

                    const parentName = existingGroupName || `${anchor.name}_${Math.round(anchor.cx)}_${Math.round(anchor.cy)}`;
                    const parentBlock = { ...anchor, name: parentName };

                    const matches = canMatchAllPorts(template, anchor.cx, anchor.cy, null, anchor, true, null, template.anchorType, template.ignoreName);

                    if (matches) {
                        console.log(`  ✓ Anchor ${anchor.name} -> ${parentName}: ${matches.length} ports matched`);
                        matchedBlocks++;
                        groupMatchedBlocks++;

                        const existingGroup = groupsData[parentName];
                        if (existingGroup && existingGroup.ports && existingGroup.ports.length > 0) {
                            for (const port of ports) {
                                if (port.parent === parentName) {
                                    port.parent = null;
                                }
                            }
                            for (const block of blocks) {
                                if (block.parent === parentName) {
                                    block.parent = null;
                                }
                            }
                            existingGroup.ports = [];
                        }

                        for (const match of matches) {
                            const el = match.element;
                            if (el.parent && el.parent !== parentName) {
                                if (groupsData[el.parent] && groupsData[el.parent].ports) {
                                    groupsData[el.parent].ports = groupsData[el.parent].ports.filter(p =>
                                        !(Math.abs(p.cx - el.cx) < 2 && Math.abs(p.cy - el.cy) < 2)
                                    );
                                }
                                el.parent = null;
                            }
                            assignPortToBlock(el, parentBlock, true);
                            usedElements.add(el);
                            totalAssigned++;
                            groupAssignedPorts++;
                        }
                    } else {
                        skippedBlocks++;
                    }
                }
            }
        }

        console.log(`\n========== Priority ${priority} Complete: ${groupMatchedBlocks} blocks, ${groupAssignedPorts} ports ==========`);
    }

    const finalAssigned = ports.filter(p => p.parent).length;
    const finalUnassigned = ports.filter(p => !p.parent).length;

    console.log(`\n========== All Templates Applied ==========`);
    console.log(`Total matched blocks: ${matchedBlocks}`);
    console.log(`Total assigned ports: ${totalAssigned}`);
    console.log(`Final stats: ${finalAssigned} assigned, ${finalUnassigned} unassigned`);

    updateStats();
    render();

    // 최종 결과만 한 번 알림
    showToast(`템플릿 전체 적용 완료! 매칭: ${matchedBlocks}개, 할당: ${totalAssigned}개`, 'success');
}

function applySelectedTemplate() {
    if (selectedTemplate === null) {
        showToast('템플릿을 먼저 선택하세요', 'info');
        return;
    }

    const template = blockTemplates[selectedTemplate];
    console.log(`=== Applying Selected Template: ${template.name} ===`);

    const parentBlocks = blocks.filter(b =>
        ['OCB_BLOCK', 'ALG_BLOCK'].includes(b.type) && !isPortLikeName(b.name)
    );

    let totalAssigned = 0;
    let matchedBlocks = 0;
    let skippedBlocks = 0;
    const usedElements = new Set();

    if (template.anchorType === 'OCB_BLOCK' || template.anchorType === 'ALG_BLOCK') {
        for (const parentBlock of parentBlocks) {
            const normalPorts = template.ports.filter(p => !p.isGenerated);
            const generatedPorts = template.ports.filter(p => p.isGenerated);

            let allNormalMatched = true;
            const normalMatches = [];

            for (const portDef of normalPorts) {
                const match = findMatchingElement(portDef, parentBlock.cx, parentBlock.cy, usedElements, parentBlock, true, null, null, false, template.strictTolerance);
                if (match) {
                    normalMatches.push({ portDef, match });
                } else {
                    allNormalMatched = false;
                    break;
                }
            }

            if (!allNormalMatched) {
                skippedBlocks++;
                continue;
            }

            let addedCount = 0;
            for (const { portDef, match } of normalMatches) {
                const el = match.element;

                if (el.parent === parentBlock.name) continue;

                if (el.parent && el.parent !== parentBlock.name) {
                    if (groupsData[el.parent] && groupsData[el.parent].ports) {
                        groupsData[el.parent].ports = groupsData[el.parent].ports.filter(p =>
                            !(Math.abs(p.cx - el.cx) < 2 && Math.abs(p.cy - el.cy) < 2)
                        );
                    }
                    el.parent = null;
                }

                assignPortToBlock(el, parentBlock);
                usedElements.add(el);
                addedCount++;
            }

            let createdCount = 0;
            for (const portDef of generatedPorts) {
                const newPortCx = parentBlock.cx + portDef.dx;
                const newPortCy = parentBlock.cy + portDef.dy;

                const existing = ports.find(p =>
                    p.name === portDef.name &&
                    Math.abs(p.cx - newPortCx) < 10 &&
                    Math.abs(p.cy - newPortCy) < 10
                );

                if (existing) {
                    if (existing.parent !== parentBlock.name) {
                        if (existing.parent) {
                            if (groupsData[existing.parent] && groupsData[existing.parent].ports) {
                                groupsData[existing.parent].ports = groupsData[existing.parent].ports.filter(p =>
                                    !(Math.abs(p.cx - existing.cx) < 2 && Math.abs(p.cy - existing.cy) < 2)
                                );
                            }
                        }
                        assignPortToBlock(existing, parentBlock);
                        addedCount++;
                    }
                } else {
                    const newPort = {
                        name: portDef.name,
                        type: portDef.type,
                        cx: newPortCx,
                        cy: newPortCy,
                        parent: parentBlock.name
                    };
                    ports.push(newPort);
                    assignPortToBlock(newPort, parentBlock);
                    createdCount++;
                    console.log(`    ★ Created ${portDef.name} at (${newPortCx.toFixed(0)}, ${newPortCy.toFixed(0)}) -> ${parentBlock.name}`);
                }
            }

            totalAssigned += addedCount + createdCount;

            if (addedCount > 0 || createdCount > 0) {
                matchedBlocks++;
                console.log(`  ✓ ${parentBlock.name}: Added ${addedCount}, Created ${createdCount}`);
            } else {
                skippedBlocks++;
            }
        }
    } else {
        // Other anchor types
        let matchingAnchors;
        if (template.anchorType === 'BLOCK_TYPE') {
            matchingAnchors = [
                ...blocks.filter(b => b.type === template.anchorType && b.name === template.anchor),
                ...ports.filter(p => p.type === template.anchorType && p.name === template.anchor)
            ];
        } else if (template.ignoreName) {
            matchingAnchors = [
                ...blocks.filter(b => b.type === template.anchorType),
                ...ports.filter(p => p.type === template.anchorType)
            ];
        } else {
            matchingAnchors = [
                ...blocks.filter(b => b.type === template.anchorType),
                ...ports.filter(p => p.type === template.anchorType)
            ];
        }

        console.log(`  Found ${matchingAnchors.length} anchors of type "${template.anchorType}"`);

        for (const anchor of matchingAnchors) {
            let existingGroupName = null;
            for (const [name, group] of Object.entries(groupsData)) {
                if (Math.abs(group.cx - anchor.cx) < 20 && Math.abs(group.cy - anchor.cy) < 20) {
                    existingGroupName = name;
                    break;
                }
            }

            const parentName = existingGroupName || `${anchor.name}_${Math.round(anchor.cx)}_${Math.round(anchor.cy)}`;
            const parentBlock = { ...anchor, name: parentName };

            const matches = canMatchAllPorts(template, anchor.cx, anchor.cy, null, anchor, true, null, template.anchorType, template.ignoreName, template.strictTolerance);

            if (matches) {
                console.log(`  ✓ Anchor ${anchor.name} -> ${parentName}: ${matches.length} ports matched`);
                matchedBlocks++;

                const existingGroup = groupsData[parentName];
                if (existingGroup && existingGroup.ports && existingGroup.ports.length > 0) {
                    for (const port of ports) {
                        if (port.parent === parentName) {
                            port.parent = null;
                        }
                    }
                    for (const block of blocks) {
                        if (block.parent === parentName) {
                            block.parent = null;
                        }
                    }
                    existingGroup.ports = [];
                }

                for (const match of matches) {
                    const el = match.element;
                    if (el.parent && el.parent !== parentName) {
                        if (groupsData[el.parent] && groupsData[el.parent].ports) {
                            groupsData[el.parent].ports = groupsData[el.parent].ports.filter(p =>
                                !(Math.abs(p.cx - el.cx) < 5 && Math.abs(p.cy - el.cy) < 5)
                            );
                        }
                        el.parent = null;
                    }
                    assignPortToBlock(el, parentBlock);
                    usedElements.add(el);
                    totalAssigned++;
                }
            } else {
                skippedBlocks++;
            }
        }
    }

    console.log(`Total assigned: ${totalAssigned}, Matched blocks: ${matchedBlocks}`);
    setTemplateStatus(`"${template.name}" 적용: ${matchedBlocks}개 블록, ${totalAssigned}개 포트`);
    updateStats();
    render();
}

// ============ 템플릿 저장/로드 ============

function saveTemplatesToStorage() {
    // 파일 기반 저장 (비동기)
    saveLocalData('templates', blockTemplates);
    // localStorage에도 백업
    try {
        localStorage.setItem('blockTemplates', JSON.stringify(blockTemplates));
    } catch (e) {
        console.warn('Failed to save templates to localStorage', e);
    }
}

function loadTemplatesFromStorage() {
    // 이미 파일에서 로드된 템플릿이 있으면 덮어쓰지 않음
    if (blockTemplates && blockTemplates.length > 0) {
        console.log('[Templates] File-based templates already loaded:', blockTemplates.length);
        blockTemplates.sort((a, b) => (a.priority || 1) - (b.priority || 1));
        updateTemplateList();
        return;
    }

    // localStorage에서 폴백으로 로드
    try {
        const saved = localStorage.getItem('blockTemplates');
        if (saved) {
            blockTemplates = JSON.parse(saved);
            blockTemplates.sort((a, b) => (a.priority || 1) - (b.priority || 1));
            console.log('[Templates] Loaded from localStorage:', blockTemplates.length);
            updateTemplateList();
        }
    } catch (e) {
        console.warn('Failed to load templates from localStorage', e);
    }
}

// ============ 템플릿 기반 재그룹화 ============

async function regroupWithTemplates() {
    if (blockTemplates.length === 0) {
        showToast('No templates registered. Use Template mode (T) to register templates first.', 'info');
        return;
    }

    if (!(await showConfirm('모든 블록-포트 그룹화를 재설정합니다. 계속하시겠습니까?', { title: '확인', confirmText: '확인' }))) return;

    console.log('=== Starting Template-based Regroup ===');

    // Clear all
    for (const port of ports) { port.parent = null; }
    for (const blockName of Object.keys(groupsData)) {
        if (groupsData[blockName]) groupsData[blockName].ports = [];
    }

    let totalAssigned = 0;
    const usedPorts = new Set();

    const parentBlocks = blocks.filter(b =>
        ['OCB_BLOCK', 'ALG_BLOCK'].includes(b.type) && !isPortLikeName(b.name)
    );

    const anchorCandidates = blocks.filter(b =>
        b.type === 'BLOCK_TYPE' || b.type === 'OTHER' || ['AND', 'OR', 'NOT'].includes(b.type)
    );

    for (const template of blockTemplates) {
        console.log(`\nApplying template: ${template.name} (anchor: ${template.anchor})`);

        const matchingAnchors = anchorCandidates.filter(a => a.name === template.anchor);

        for (const anchor of matchingAnchors) {
            console.log(`  Found anchor ${anchor.name} at (${anchor.cx.toFixed(0)}, ${anchor.cy.toFixed(0)})`);

            let parentBlock = null;
            let minDist = Infinity;

            for (const pb of parentBlocks) {
                const dx = Math.abs(anchor.cx - pb.cx);
                const dy = pb.cy - anchor.cy;

                if (dy > 0 && dy < 300 && dx < 200) {
                    const dist = dx + dy * 0.5;
                    if (dist < minDist) {
                        minDist = dist;
                        parentBlock = pb;
                    }
                }
            }

            if (!parentBlock) {
                console.log(`    No parent block found for anchor`);
                continue;
            }

            console.log(`    Parent: ${parentBlock.name}`);

            const tolerance = template.strictTolerance ? 5 : 50;
            for (const portDef of template.ports) {
                const expectedX = anchor.cx + portDef.dx;
                const expectedY = anchor.cy + portDef.dy;

                let bestPort = null;
                let bestDist = tolerance;

                for (const port of ports) {
                    if (port.parent) continue;
                    if (usedPorts.has(port)) continue;
                    if (port.name !== portDef.name) continue;

                    const dist = Math.hypot(port.cx - expectedX, port.cy - expectedY);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestPort = port;
                    }
                }

                if (!bestPort && portDef.type === 'SIGNAL') {
                    for (const block of blocks) {
                        if (block.type !== 'SIGNAL') continue;
                        if (block.parent) continue;
                        if (usedPorts.has(block)) continue;
                        if (block.name !== portDef.name) continue;

                        const dist = Math.hypot(block.cx - expectedX, block.cy - expectedY);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestPort = block;
                        }
                    }
                }

                if (!bestPort && portDef.type === 'OTHER') {
                    for (const block of blocks) {
                        if (block.type !== 'OTHER') continue;
                        if (block.parent) continue;
                        if (usedPorts.has(block)) continue;
                        if (block.name !== portDef.name) continue;

                        const dist = Math.hypot(block.cx - expectedX, block.cy - expectedY);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestPort = block;
                        }
                    }
                }

                if (bestPort) {
                    assignPortToBlock(bestPort, parentBlock);
                    usedPorts.add(bestPort);
                    totalAssigned++;
                    console.log(`      ${portDef.name} -> ${parentBlock.name}`);
                }
            }
        }
    }

    // Assign remaining ports by proximity
    console.log('\n=== Assigning remaining ports by proximity ===');

    // SHEET_REF -> REF_SIGNAL
    const refSignalBlocks = blocks.filter(b => b.type === 'REF_SIGNAL');
    for (const port of ports) {
        if (port.parent) continue;
        const match = port.name.match(/^3\/(\d+)$/);
        if (!match) continue;
        const pageNum = match[1];

        const matchingBlocks = refSignalBlocks.filter(b => {
            const refMatch = b.name.match(/^D03-(\d+)-\d+$/);
            return refMatch && refMatch[1] === pageNum;
        });

        if (matchingBlocks.length > 0) {
            let best = matchingBlocks[0], bestDist = Infinity;
            for (const b of matchingBlocks) {
                const d = Math.hypot(port.cx - b.cx, port.cy - b.cy);
                if (d < bestDist) { bestDist = d; best = b; }
            }
            assignPortToBlock(port, best);
            totalAssigned++;
        }
    }

    // A, G -> SIGNAL
    const signalBlocks = blocks.filter(b => b.type === 'SIGNAL');
    for (const port of ports) {
        if (port.parent) continue;
        if (port.name !== 'A' && port.name !== 'G') continue;

        let best = null, bestScore = Infinity;
        for (const b of signalBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = port.cy - b.cy;
            if (dy < 15 || dy > 70 || dx > 60) continue;
            const score = dx * 2 + dy;
            if (score < bestScore) { bestScore = score; best = b; }
        }
        if (best) {
            assignPortToBlock(port, best);
            totalAssigned++;
        }
    }

    // A, G -> REF_SIGNAL
    for (const port of ports) {
        if (port.parent) continue;
        if (port.name !== 'A' && port.name !== 'G') continue;

        let best = null, bestScore = Infinity;
        for (const b of refSignalBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = Math.abs(port.cy - b.cy);
            if (dy > 60 || dx > 80) continue;
            const score = dx * 1.5 + dy;
            if (score < bestScore) { bestScore = score; best = b; }
        }
        if (best) {
            assignPortToBlock(port, best);
            totalAssigned++;
        }
    }

    // Remaining -> nearest OCB/ALG
    for (const port of ports) {
        if (port.parent) continue;

        let best = null, bestScore = Infinity;
        for (const b of parentBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = b.cy - port.cy;
            if (dy < -30 || dy > 300 || dx > 150) continue;
            let score = dx * 2 + Math.abs(dy) * 0.3;
            if (dy > 20 && dy < 200) score -= 30;
            if (score < bestScore) { bestScore = score; best = b; }
        }
        if (best) {
            assignPortToBlock(port, best);
            totalAssigned++;
        }
    }

    const assigned = ports.filter(p => p.parent).length;
    const unassigned = ports.filter(p => !p.parent).length;

    if (unassigned > 0) {
        console.log('=== UNASSIGNED ===');
        ports.filter(p => !p.parent).forEach(p =>
            console.log(`  ${p.name} at (${p.cx.toFixed(0)}, ${p.cy.toFixed(0)})`)
        );
    }

    showToast(`Template Regroup 완료! 할당: ${assigned}, 미할당: ${unassigned}`, 'success');
    updateStats();
    render();
}

// ============ 템플릿 초기화 ============

function initTemplates() {
    loadTemplatesFromStorage();
    loadConnectionPatternsFromStorage();
}
