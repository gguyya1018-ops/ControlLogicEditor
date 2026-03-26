/**
 * data.js - 데이터 처리 및 동기화
 * layoutData를 blocks/ports로 변환, groupsData 동기화
 */

// ============ 데이터 처리 ============

/**
 * layoutData를 blocks, ports, allElements로 분류
 */
function processData() {
    const BLOCK_TYPES_LIST = ['OCB_BLOCK', 'SIGNAL', 'ALG_BLOCK', 'REF_SIGNAL', 'OTHER'];
    const PORT_TYPES_LIST = ['PORT', 'BLOCK_TYPE', 'SHEET_REF'];

    blocks = [];
    ports = [];
    allElements = [];

    const seenPositions = new Set();  // 중복 위치 방지

    for (const row of layoutData) {
        if (row.text.length > 30) continue;

        // 위치 기반 중복 체크
        const posKey = `${Math.round(parseFloat(row.cx))}_${Math.round(parseFloat(row.cy))}`;
        if (seenPositions.has(posKey)) {
            continue;
        }
        seenPositions.add(posKey);

        const elem = {
            id: `${row.type}_${row.cx}_${row.cy}`,
            name: row.text,
            type: row.type,
            cx: parseFloat(row.cx),
            cy: parseFloat(row.cy),
            x1: parseFloat(row.x1),
            y1: parseFloat(row.y1),
            x2: parseFloat(row.x2),
            y2: parseFloat(row.y2)
        };

        allElements.push(elem);

        if (BLOCK_TYPES_LIST.includes(row.type)) {
            blocks.push(elem);
        } else if (PORT_TYPES_LIST.includes(row.type)) {
            ports.push(elem);
        }
    }

    syncPortsWithGroups();
    syncBlocksWithGroups();
}

/**
 * groupsData에 있는 블록 중 blocks 배열에 없는 것 추가
 */
function syncBlocksWithGroups() {
    for (const [blockName, group] of Object.entries(groupsData)) {
        const exists = blocks.find(b => b.name === blockName);
        if (!exists && group.cx && group.cy) {
            const newBlock = {
                id: 'group_' + blockName + '_' + Date.now(),
                name: blockName,
                type: group.type || 'OCB_BLOCK',
                cx: group.cx,
                cy: group.cy,
                x1: group.cx - 30,
                y1: group.cy - 15,
                x2: group.cx + 30,
                y2: group.cy + 15
            };
            blocks.push(newBlock);
            allElements.push(newBlock);
            console.log('Added missing block from groupsData:', blockName);
        }
    }
}

/**
 * ports 배열의 parent 정보로 groupsData.ports 재구성
 */
function rebuildGroupPortsFromPortsArray() {
    console.log('[rebuildGroupPorts] 시작');
    let rebuilt = 0;

    const portsByParent = {};
    for (const port of ports) {
        if (port.parent) {
            if (!portsByParent[port.parent]) {
                portsByParent[port.parent] = [];
            }
            portsByParent[port.parent].push({
                name: port.name,
                type: port.type,
                cx: port.cx,
                cy: port.cy
            });
        }
    }

    for (const [parentName, portList] of Object.entries(portsByParent)) {
        if (groupsData[parentName]) {
            if (!groupsData[parentName].ports || groupsData[parentName].ports.length < portList.length) {
                groupsData[parentName].ports = portList;
                rebuilt++;
            }
        }
    }

    console.log('[rebuildGroupPorts] 완료:', rebuilt, '개 그룹 ports 재구성');
}

/**
 * groupsData의 포트 정보를 ports 배열에 동기화
 */
function syncPortsWithGroups() {
    for (const [blockName, group] of Object.entries(groupsData)) {
        if (group.ports) {
            for (const port of group.ports) {
                let p = ports.find(pp =>
                    Math.abs(pp.cx - port.cx) < 5 &&
                    Math.abs(pp.cy - port.cy) < 5
                );

                if (!p) {
                    const existingByName = ports.find(pp =>
                        pp.parent === blockName && pp.name === port.name
                    );
                    if (existingByName) {
                        existingByName.cx = port.cx;
                        existingByName.cy = port.cy;
                        continue;
                    }

                    p = {
                        id: `${port.type || 'PORT'}_${port.cx}_${port.cy}`,
                        name: port.name,
                        type: port.type || 'PORT',
                        cx: port.cx,
                        cy: port.cy,
                        x1: port.cx - 10,
                        y1: port.cy - 10,
                        x2: port.cx + 10,
                        y2: port.cy + 10,
                        parent: blockName
                    };
                    ports.push(p);
                    allElements.push(p);
                } else {
                    p.parent = blockName;
                    p.cx = port.cx;
                    p.cy = port.cy;
                }

                if (port.customName) p.name = port.customName;
            }
        }
    }
}

// ============ 포트 할당 검증 ============

/**
 * 포트가 특정 블록에 허용되는지 확인
 */
function isPortAllowedForBlock(portName, blockType, blockName, existingPorts = []) {
    if (!portName || !blockType) return true;

    const upper = portName.toUpperCase();
    const rules = BLOCK_PORT_RULES[blockType];

    if (!rules) return true;

    // 패턴 매칭
    const allowed = rules.patterns.some(pattern => pattern.test(upper));
    if (!allowed) return false;

    // 상호 배타적 포트 검사
    for (const [groupName, exclusivePorts] of Object.entries(EXCLUSIVE_PORTS)) {
        const matchingExclusive = exclusivePorts.find(ep => upper.startsWith(ep));
        if (matchingExclusive) {
            const hasConflict = existingPorts.some(ep => {
                const epUpper = ep.name?.toUpperCase() || '';
                return exclusivePorts.some(exc => exc !== matchingExclusive && epUpper.startsWith(exc));
            });
            if (hasConflict) return false;
        }
    }

    return true;
}

// ============ 포트-블록 할당 ============

/**
 * 포트를 블록에 할당
 */
function assignPortToBlock(port, block, skipRender = false) {
    if (!port || !block) return false;

    const blockName = block.name;

    // 이미 같은 블록에 할당된 경우
    if (port.parent === blockName) return true;

    // 기존 할당 제거
    if (port.parent && groupsData[port.parent]) {
        const oldGroup = groupsData[port.parent];
        if (oldGroup.ports) {
            oldGroup.ports = oldGroup.ports.filter(p =>
                !(Math.abs(p.cx - port.cx) < 1 && Math.abs(p.cy - port.cy) < 1)
            );
        }
    }

    // 그룹 데이터 초기화
    if (!groupsData[blockName]) {
        groupsData[blockName] = {
            type: block.type,
            cx: block.cx,
            cy: block.cy,
            ports: []
        };
    }

    // 새 할당
    port.parent = blockName;
    groupsData[blockName].ports.push({
        name: port.name,
        type: port.type,
        cx: port.cx,
        cy: port.cy
    });

    if (!skipRender) {
        render();
        updateStats();
    }

    return true;
}

/**
 * 포트의 부모 블록 해제
 */
function removePortFromParent(port) {
    if (!port || !port.parent) return;

    const parentName = port.parent;
    if (groupsData[parentName] && groupsData[parentName].ports) {
        groupsData[parentName].ports = groupsData[parentName].ports.filter(p =>
            !(Math.abs(p.cx - port.cx) < 1 && Math.abs(p.cy - port.cy) < 1)
        );
    }

    port.parent = null;
}

/**
 * 포트의 부모 블록 변경
 */
function changeParentBlock(port, newParentName) {
    if (!port) return;

    removePortFromParent(port);

    if (newParentName && groupsData[newParentName]) {
        port.parent = newParentName;
        if (!groupsData[newParentName].ports) {
            groupsData[newParentName].ports = [];
        }
        groupsData[newParentName].ports.push({
            name: port.name,
            type: port.type,
            cx: port.cx,
            cy: port.cy
        });
    }

    render();
    updateStats();
}

// ============ A-G 페어 찾기 ============

/**
 * A 포트와 G 포트의 쌍 찾기
 */
function findAGPairs(aPorts, gPorts, maxDist = 50) {
    const pairs = [];
    const usedG = new Set();

    for (const a of aPorts) {
        let bestG = null;
        let bestDist = maxDist;

        for (const g of gPorts) {
            if (usedG.has(g)) continue;

            const dist = Math.hypot(a.cx - g.cx, a.cy - g.cy);
            if (dist < bestDist) {
                bestDist = dist;
                bestG = g;
            }
        }

        if (bestG) {
            pairs.push({ a, g: bestG, dist: bestDist });
            usedG.add(bestG);
        }
    }

    return pairs;
}

// ============ 블록 포트 정보 ============

/**
 * 블록에 할당된 포트 이름 목록
 */
function getBlockPortNames(block) {
    if (!block || !groupsData[block.name]) return [];
    const gd = groupsData[block.name];
    return (gd.ports || []).map(p => p.name);
}

/**
 * OCB 블록 서브타입 감지
 */
function detectOCBSubtype(blockPorts) {
    if (!blockPorts || blockPorts.length === 0) return 'BASIC';

    const portNames = blockPorts.map(p => (p.name || '').toUpperCase());

    // PID 관련 포트 확인
    if (portNames.some(n => PID_PORTS.some(pp => n.includes(pp)))) {
        return 'PID';
    }

    // T 블록 포트 확인
    if (portNames.some(n => T_BLOCK_PORTS.some(tp => n.includes(tp)))) {
        return 'T_BLOCK';
    }

    // 기본 XIC/XIO/OTE
    const hasXIC = portNames.some(n => n.startsWith('XIC'));
    const hasXIO = portNames.some(n => n.startsWith('XIO'));
    const hasOTE = portNames.some(n => n.startsWith('OTE'));

    if (hasXIC || hasXIO || hasOTE) {
        return 'LOGIC';
    }

    return 'BASIC';
}

// ============ 메모 관리 ============

/**
 * 요소에 메모 업데이트
 */
function updateMemo(elem, memo) {
    if (!elem) return;
    const key = elem.id || `${elem.name}_${elem.cx}_${elem.cy}`;
    if (memo && memo.trim()) {
        elementMemos[key] = memo;
        elem.memo = memo;
    } else {
        delete elementMemos[key];
        delete elem.memo;
    }
}

/**
 * 요소의 메모 가져오기
 */
function getMemo(elem) {
    if (!elem) return '';
    if (elem.memo) return elem.memo;
    const key = elem.id || `${elem.name}_${elem.cx}_${elem.cy}`;
    return elementMemos[key] || '';
}

// ============ 이름 변경 ============

/**
 * 포트 이름 업데이트
 */
function updatePortName(port, newName) {
    if (!port || !newName) return;

    const oldName = port.name;
    port.name = newName;

    // groupsData에서도 업데이트
    if (port.parent && groupsData[port.parent] && groupsData[port.parent].ports) {
        const gPort = groupsData[port.parent].ports.find(p =>
            Math.abs(p.cx - port.cx) < 1 && Math.abs(p.cy - port.cy) < 1
        );
        if (gPort) {
            gPort.name = newName;
            gPort.customName = newName;
        }
    }

    console.log(`Port renamed: ${oldName} → ${newName}`);
}

/**
 * 요소 이름 업데이트
 */
function updateElementName(elem, newName) {
    if (!elem || !newName) return;

    const oldName = elem.name;

    // 블록인 경우 groupsData 키도 변경
    if (isBlockType(elem.type)) {
        if (groupsData[oldName]) {
            groupsData[newName] = groupsData[oldName];
            delete groupsData[oldName];
        }

        // 해당 블록에 속한 포트들의 parent 업데이트
        for (const port of ports) {
            if (port.parent === oldName) {
                port.parent = newName;
            }
        }

        // 연결선 업데이트
        for (const conn of customConnections) {
            if (conn.fromParent === oldName) conn.fromParent = newName;
            if (conn.toParent === oldName) conn.toParent = newName;
        }
    }

    elem.name = newName;
    console.log(`Element renamed: ${oldName} → ${newName}`);
}

/**
 * 요소 타입 변경
 */
function changeElementType(elem, newType) {
    if (!elem || !newType) return;

    const oldType = elem.type;
    elem.type = newType;

    // ID 업데이트
    elem.id = `${newType}_${elem.cx}_${elem.cy}`;

    // groupsData 업데이트
    if (isBlockType(newType) && groupsData[elem.name]) {
        groupsData[elem.name].type = newType;
    }

    console.log(`Element type changed: ${oldType} → ${newType}`);
    render();
}

// ============ 블록 유사성 계산 ============

/**
 * 두 블록의 유사성 계산 (포트 구성 기준)
 */
function calculateBlockSimilarity(parent, child) {
    const parentPorts = getBlockPortNames(parent);
    const childPorts = getBlockPortNames(child);

    if (parentPorts.length === 0 || childPorts.length === 0) return 0;

    // 포트 타입 추출
    const getPortType = (name) => {
        const upper = name.toUpperCase();
        if (upper.startsWith('XIC')) return 'XIC';
        if (upper.startsWith('XIO')) return 'XIO';
        if (upper.startsWith('OTE')) return 'OTE';
        if (upper.startsWith('OTL')) return 'OTL';
        if (upper.startsWith('OTU')) return 'OTU';
        if (upper.match(/^A\d*$/)) return 'A';
        if (upper.match(/^G\d*$/)) return 'G';
        return upper;
    };

    const parentTypes = new Set(parentPorts.map(getPortType));
    const childTypes = new Set(childPorts.map(getPortType));

    // Jaccard 유사도
    const intersection = [...parentTypes].filter(t => childTypes.has(t)).length;
    const union = new Set([...parentTypes, ...childTypes]).size;

    return union > 0 ? intersection / union : 0;
}
