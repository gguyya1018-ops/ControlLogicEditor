/**
 * groups.js - 그룹 관리
 * 포트-블록 그룹화, 재그룹화, 클론 기능
 */

// ============ 그룹 초기화 ============

async function clearAllGroups() {
    if (!(await showConfirm('모든 포트-블록 그룹화를 해제하시겠습니까?', { title: '확인', confirmText: '확인' }))) return;

    console.log('=== Clearing All Groups ===');

    for (const port of ports) {
        port.parent = null;
    }

    for (const block of blocks) {
        block.parent = null;
    }

    for (const blockName of Object.keys(groupsData)) {
        if (groupsData[blockName]) {
            groupsData[blockName].ports = [];
        }
    }

    const totalPorts = ports.length;
    showToast(`전체 그룹 해제 완료! 해제된 포트: ${totalPorts}개`, 'success');
    updateStats();
    render();
}

// ============ 재그룹화 (템플릿 + 알고리즘) ============

async function regroupAllBlocks() {
    if (!(await showConfirm('모든 블록-포트 그룹화를 재설정합니다. 계속하시겠습니까?', { title: '확인', confirmText: '확인' }))) return;

    console.log('=== Starting Regroup (Template + Algorithm) ===');

    // Clear all
    for (const port of ports) { port.parent = null; }
    for (const blockName of Object.keys(groupsData)) {
        if (groupsData[blockName]) groupsData[blockName].ports = [];
    }

    // Step 0: 템플릿 먼저 적용
    let templateAssigned = 0;
    if (blockTemplates.length > 0) {
        console.log('=== Step 0: Applying Templates ===');
        const usedElements = new Set();

        const parentBlocks = blocks.filter(b =>
            ['OCB_BLOCK', 'ALG_BLOCK'].includes(b.type) && !isPortLikeName(b.name)
        );

        for (const template of blockTemplates) {
            console.log(`  Template: ${template.name} (${template.anchorType})`);

            if (template.anchorType === 'OCB_BLOCK' || template.anchorType === 'ALG_BLOCK') {
                for (const parentBlock of parentBlocks) {
                    const matches = canMatchAllPorts(template, parentBlock.cx, parentBlock.cy, usedElements, parentBlock, false, null, template.anchorType, template.ignoreName);
                    if (matches) {
                        for (const match of matches) {
                            assignPortToBlock(match.element, parentBlock, true);
                            usedElements.add(match.element);
                            templateAssigned++;
                        }
                    }
                }
            }
        }
        console.log(`  Template total: ${templateAssigned} ports assigned`);
    }

    // 블록 분류
    const allBlocks = blocks.filter(b =>
        ['SIGNAL', 'REF_SIGNAL', 'OCB_BLOCK', 'ALG_BLOCK'].includes(b.type) &&
        !isPortLikeName(b.name)
    );
    const refSignalBlocks = allBlocks.filter(b => b.type === 'REF_SIGNAL');
    const signalBlocks = allBlocks.filter(b => b.type === 'SIGNAL');
    const ocbBlocks = allBlocks.filter(b => b.type === 'OCB_BLOCK');
    const algBlocks = allBlocks.filter(b => b.type === 'ALG_BLOCK');

    // Step 1: SHEET_REF -> REF_SIGNAL
    console.log('=== Step 1: SHEET_REF -> REF_SIGNAL ===');
    assignSheetRefToRefSignal(refSignalBlocks);

    // Step 2: A, G -> SIGNAL
    console.log('=== Step 2: A, G -> SIGNAL ===');
    assignAGToSignal(signalBlocks);

    // Step 3: A, G -> REF_SIGNAL
    console.log('=== Step 3: A, G -> REF_SIGNAL ===');
    assignAGToRefSignal(refSignalBlocks);

    // Step 4: I, A -> ALG_BLOCK
    console.log('=== Step 4: I, A -> ALG_BLOCK ===');
    assignIAToAlgBlock(algBlocks);

    // Step 5: Other ports -> OCB_BLOCK
    console.log('=== Step 5: Other ports -> OCB_BLOCK ===');
    assignOtherToOCB(ocbBlocks);

    // Step 6: Remaining A -> OCB_BLOCK
    console.log('=== Step 6: Remaining A -> OCB_BLOCK ===');
    assignRemainingAToOCB(ocbBlocks);

    // 결과 보고
    const assigned = ports.filter(p => p.parent).length;
    const unassigned = ports.filter(p => !p.parent).length;

    if (unassigned > 0) {
        console.log('=== UNASSIGNED ===');
        ports.filter(p => !p.parent).forEach(p =>
            console.log(`  ${p.name} at (${p.cx.toFixed(0)}, ${p.cy.toFixed(0)})`)
        );
    }

    showToast(`완료! 할당: ${assigned}, 미할당: ${unassigned}`, 'success');
    updateStats();
    render();
}

// ============ 그룹화 헬퍼 함수들 ============

function assignSheetRefToRefSignal(refSignalBlocks) {
    for (const port of ports) {
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
            assignPortToBlock(port, best, true);
        }
    }
}

function assignAGToSignal(signalBlocks) {
    for (const port of ports) {
        if (port.parent) continue;
        if (port.name !== 'A' && port.name !== 'G') continue;

        let best = null, bestScore = Infinity;

        for (const b of signalBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = port.cy - b.cy;

            if (dy < 15 || dy > 70) continue;
            if (dx > 60) continue;

            const score = dx * 2 + dy;
            if (score < bestScore) { bestScore = score; best = b; }
        }

        if (best) {
            assignPortToBlock(port, best, true);
        }
    }
}

function assignAGToRefSignal(refSignalBlocks) {
    for (const port of ports) {
        if (port.parent) continue;
        if (port.name !== 'A' && port.name !== 'G') continue;

        let best = null, bestScore = Infinity;

        for (const b of refSignalBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = Math.abs(port.cy - b.cy);

            if (dy > 60) continue;
            if (dx > 80) continue;

            const score = dx * 1.5 + dy;
            if (score < bestScore) { bestScore = score; best = b; }
        }

        if (best) {
            assignPortToBlock(port, best, true);
        }
    }
}

function assignIAToAlgBlock(algBlocks) {
    for (const port of ports) {
        if (port.parent) continue;
        if (port.name !== 'I' && port.name !== 'A') continue;

        let best = null, bestScore = Infinity;

        for (const b of algBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = b.cy - port.cy;

            if (dy < 20 || dy > 130) continue;
            if (dx > 100) continue;

            const score = dx + dy * 0.5;
            if (score < bestScore) { bestScore = score; best = b; }
        }

        if (best) {
            assignPortToBlock(port, best, true);
        }
    }
}

function assignOtherToOCB(ocbBlocks) {
    for (const port of ports) {
        if (port.parent) continue;

        let best = null, bestScore = Infinity;

        for (const b of ocbBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = b.cy - port.cy;

            if (dy < -30) continue;
            if (dy > 300) continue;
            if (dx > 150) continue;

            let score = dx * 2 + Math.abs(dy) * 0.3;
            if (dy > 20 && dy < 200) score -= 30;

            if (score < bestScore) { bestScore = score; best = b; }
        }

        if (best) {
            assignPortToBlock(port, best, true);
        }
    }
}

function assignRemainingAToOCB(ocbBlocks) {
    for (const port of ports) {
        if (port.parent) continue;
        if (port.name !== 'A') continue;

        let best = null, bestScore = Infinity;

        for (const b of ocbBlocks) {
            const dx = Math.abs(port.cx - b.cx);
            const dy = b.cy - port.cy;

            if (dy < -50 || dy > 200) continue;
            if (dx > 120) continue;

            const score = dx + Math.abs(dy) * 0.5;
            if (score < bestScore) { bestScore = score; best = b; }
        }

        if (best) {
            assignPortToBlock(port, best, true);
        }
    }
}

// ============ 공간 기반 자동 그룹화 ============

function autoGroupByProximity() {
    const SEARCH_RADIUS = 200;
    const VERTICAL_BIAS = 1.5;

    console.log('=== 공간 기반 자동 그룹화 시작 ===');

    const anchorBlocks = blocks.filter(b =>
        ['OCB_BLOCK', 'ALG_BLOCK'].includes(b.type) && !isPortLikeName(b.name)
    );

    if (anchorBlocks.length === 0) {
        showToast('앵커 블록(OCB_BLOCK, ALG_BLOCK)이 없습니다.', 'error');
        return;
    }

    let assigned = 0;

    for (const port of ports) {
        if (port.parent) continue;

        let bestBlock = null;
        let bestScore = Infinity;

        for (const block of anchorBlocks) {
            const dx = Math.abs(port.cx - block.cx);
            const dy = port.cy - block.cy;

            if (dx > SEARCH_RADIUS || Math.abs(dy) > SEARCH_RADIUS) continue;

            const score = dx + Math.abs(dy) * VERTICAL_BIAS;
            if (score < bestScore) {
                bestScore = score;
                bestBlock = block;
            }
        }

        if (bestBlock) {
            assignPortToBlock(port, bestBlock, true);
            assigned++;
        }
    }

    console.log(`공간 그룹화 완료: ${assigned}개 포트 할당`);
    updateStats();
    render();
}

// ============ 블록 찾기 헬퍼 ============

function findBlockToRight(port, candidateBlocks, maxDistance) {
    let best = null;
    let bestDist = maxDistance;

    for (const block of candidateBlocks) {
        const dx = block.cx - port.cx;
        const dy = Math.abs(block.cy - port.cy);

        if (dx > 0 && dx < bestDist && dy < 50) {
            bestDist = dx;
            best = block;
        }
    }

    return best;
}

function findClosestBlock(port, candidateBlocks, maxDistance) {
    let best = null;
    let bestDist = maxDistance;

    for (const block of candidateBlocks) {
        const dist = Math.hypot(port.cx - block.cx, port.cy - block.cy);
        if (dist < bestDist) {
            bestDist = dist;
            best = block;
        }
    }

    return best;
}

// ============ 클론 연결 복제 ============

function cloneConnectionsFromGroups() {
    if (cloneParentRow.length === 0 || cloneChildRow.length === 0) {
        showToast('부모 또는 자식 블록이 선택되지 않았습니다.', 'error');
        return;
    }

    console.log('=== 연결선 복제 시작 ===');
    let clonedCount = 0;

    // 부모 블록 간의 연결선 찾기
    for (const conn of customConnections) {
        // from/to가 부모 블록에 속하는지 확인
        let fromParentIdx = -1;
        let toParentIdx = -1;

        for (let i = 0; i < cloneParentRow.length; i++) {
            const parent = cloneParentRow[i];
            if (conn.fromParent === parent.name) fromParentIdx = i;
            if (conn.toParent === parent.name) toParentIdx = i;
        }

        if (fromParentIdx < 0 || toParentIdx < 0) continue;

        const fromChild = cloneChildRow[fromParentIdx];
        const toChild = cloneChildRow[toParentIdx];

        if (!fromChild || fromChild === 'SAME' || !toChild || toChild === 'SAME') continue;

        // 자식 블록에서 대응 포트 찾기
        const fromChildGroup = groupsData[fromChild.name];
        const toChildGroup = groupsData[toChild.name];

        if (!fromChildGroup || !toChildGroup) continue;

        // 포트 타입으로 매칭
        const fromPortType = normalizeElementType(conn.fromName, null);
        const toPortType = normalizeElementType(conn.toName, null);

        const fromPort = (fromChildGroup.ports || []).find(p =>
            normalizeElementType(p.name, p.type) === fromPortType
        );
        const toPort = (toChildGroup.ports || []).find(p =>
            normalizeElementType(p.name, p.type) === toPortType
        );

        if (!fromPort || !toPort) continue;

        // 새 연결 생성
        const newConn = {
            fromId: `${fromPort.type || 'PORT'}_${fromPort.cx}_${fromPort.cy}`,
            fromName: fromPort.name,
            fromParent: fromChild.name,
            fromCx: fromPort.cx,
            fromCy: fromPort.cy,
            toId: `${toPort.type || 'PORT'}_${toPort.cx}_${toPort.cy}`,
            toName: toPort.name,
            toParent: toChild.name,
            toCx: toPort.cx,
            toCy: toPort.cy,
            waypoints: []
        };

        // 중복 체크
        const isDuplicate = customConnections.some(c =>
            c.fromId === newConn.fromId && c.toId === newConn.toId
        );

        if (!isDuplicate) {
            customConnections.push(newConn);
            clonedCount++;
        }
    }

    console.log(`연결선 복제 완료: ${clonedCount}개`);
    showToast(`${clonedCount}개의 연결선이 복제되었습니다.`, 'success');

    // 클론 모드 초기화
    cloneParentRow = [];
    cloneChildRow = [];
    cloneCurrentChildIdx = 0;

    updateConnectionList();
    updateStats();
    markAsEdited();
    render();
}

// ============ 클론 힌트 업데이트 ============

function updateCloneHint() {
    const hintEl = document.getElementById('clone-hint');
    if (!hintEl) return;

    if (cloneCurrentChildIdx >= cloneParentRow.length) {
        hintEl.textContent = '✓ 모든 매칭 완료! 연결선 복제 중...';
    } else {
        const parent = cloneParentRow[cloneCurrentChildIdx];
        hintEl.textContent = `${cloneCurrentChildIdx + 1}/${cloneParentRow.length}: ${parent.name}에 대응하는 블록을 클릭하세요`;
    }
}

// ============ 솔로 그룹 생성 ============

function createSoloGroup() {
    if (!selectedElement) {
        showToast('먼저 요소를 선택하세요.', 'info');
        return;
    }

    if (!isBlockType(selectedElement.type)) {
        showToast('블록 타입만 그룹 생성이 가능합니다.', 'info');
        return;
    }

    const block = selectedElement;

    if (!groupsData[block.name]) {
        groupsData[block.name] = {
            type: block.type,
            cx: block.cx,
            cy: block.cy,
            ports: []
        };
    }

    console.log(`솔로 그룹 생성: ${block.name}`);
    showToast(`${block.name} 그룹이 생성되었습니다.`, 'success');
    updateStats();
    render();
}
