/**
 * utils.js - 순수 유틸리티 함수
 * 외부 상태에 의존하지 않는 순수 함수들
 */

// ============ 수학/기하학 함수 ============

/**
 * 점에서 선분까지의 거리
 */
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
        xx = x1; yy = y1;
    } else if (param > 1) {
        xx = x2; yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    return Math.hypot(px - xx, py - yy);
}

/**
 * 점을 선분에 투영
 */
function projectPointToLine(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return { x: x1, y: y1 };

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0.05, Math.min(0.95, t));

    return {
        x: x1 + t * dx,
        y: y1 + t * dy
    };
}

/**
 * 두 선분의 교차점 계산
 */
function lineIntersection(seg1, seg2) {
    const { x1: x1, y1: y1, x2: x2, y2: y2 } = seg1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = seg2;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    const margin = 0.02;
    if (t > margin && t < 1 - margin && u > margin && u < 1 - margin) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1),
            seg1Angle: Math.atan2(y2 - y1, x2 - x1)
        };
    }
    return null;
}

// ============ CSV 파싱 ============

/**
 * CSV 텍스트를 객체 배열로 변환
 */
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => {
            row[h.trim()] = values[idx]?.trim() || '';
        });
        data.push(row);
    }
    return data;
}

// ============ 이름/타입 분석 ============

/**
 * 포트 역할 분류
 */
function classifyPortRole(name) {
    if (!name) return 'UNKNOWN';
    const upper = name.toUpperCase();

    if (upper.match(/^(IN|INPUT|I[0-9])/)) return 'INPUT';
    if (upper.match(/^(OUT|OUTPUT|O[0-9]|Q)/)) return 'OUTPUT';
    if (upper.match(/^(A[0-9]|AI|ANALOG)/)) return 'ANALOG_IN';
    if (upper.match(/^(G[0-9]|AO)/)) return 'ANALOG_OUT';
    if (upper.match(/^(SP|SETPOINT)/)) return 'SETPOINT';
    if (upper.match(/^(PV|PROCESS)/)) return 'PROCESS_VAR';
    if (upper.match(/^(CV|CONTROL)/)) return 'CONTROL_VAR';
    if (upper.match(/^(EN|ENABLE)/)) return 'ENABLE';
    if (upper.match(/^(RST|RESET)/)) return 'RESET';

    return 'UNKNOWN';
}

/**
 * 이름이 포트같은지 확인
 */
function isPortLikeName(name) {
    if (!name) return false;
    const upper = name.toUpperCase();

    const portPatterns = [
        /^(IN|OUT|INPUT|OUTPUT)[0-9]*$/,
        /^[AIOG][0-9]+$/,
        /^(SP|PV|CV|MV|SV)[0-9]*$/,
        /^(EN|RST|SET|CLR)$/,
        /^(XIC|XIO|OTE|OTL|OTU|TON|TOF|CTU|CTD)/
    ];

    return portPatterns.some(p => p.test(upper));
}

/**
 * 요소 타입 정규화 (패턴 매칭용)
 */
function normalizeElementType(name, type) {
    if (!name) return type || 'UNKNOWN';

    const upper = name.toUpperCase();

    // 기본 타입 추출
    const prefixes = [
        'XIC', 'XIO', 'OTE', 'OTL', 'OTU',
        'TON', 'TOF', 'CTU', 'CTD',
        'ADD', 'SUB', 'MUL', 'DIV', 'MOV',
        'CMP', 'EQU', 'NEQ', 'GRT', 'LES', 'GEQ', 'LEQ'
    ];

    for (const prefix of prefixes) {
        if (upper.startsWith(prefix)) return prefix;
    }

    return type || upper.split('_')[0] || 'UNKNOWN';
}

// ============ 중복 검사 ============

/**
 * 이름 중복 확인 (blocks 배열 필요)
 */
async function checkDuplicateName(name, type, blocksArray) {
    if (type === 'PORT' || PORT_TYPES.includes(type)) {
        return true;
    }

    const existing = blocksArray.find(b => b.name === name);
    if (existing) {
        const msg = `"${name}" 블록 이름이 이미 존재합니다. 같은 이름으로 생성하시겠습니까?`;
        return await showConfirm(msg, { title: '확인', confirmText: '확인' });
    }
    return true;
}

/**
 * 모든 중복 이름 찾기
 */
function findDuplicates(elementsArray) {
    const names = {};
    for (const e of elementsArray) {
        if (!names[e.name]) names[e.name] = [];
        names[e.name].push(e);
    }
    return Object.entries(names).filter(([name, items]) => items.length > 1);
}

// ============ 요소 검색 ============

/**
 * ID로 요소 찾기
 */
function findElementById(id, elementsArray) {
    return elementsArray.find(e => e.id === id);
}

/**
 * 위치로 요소 찾기
 */
function findElementByPos(cx, cy, elementsArray) {
    return elementsArray.find(e => Math.abs(e.cx - cx) < 1 && Math.abs(e.cy - cy) < 1);
}

/**
 * 월드 좌표에서 요소 찾기
 */
function findElementAt(worldX, worldY, portsArray, blocksArray, currentScale, showPortsFlag, showBlocksFlag) {
    const tolerance = 20 / currentScale;

    // 포트 먼저 검색
    if (showPortsFlag) {
        for (const port of portsArray) {
            const dist = Math.hypot(port.cx - worldX, port.cy - worldY);
            if (dist < tolerance) return port;
        }
    }

    // 블록 검색
    if (showBlocksFlag) {
        for (const block of blocksArray) {
            if (worldX >= block.x1 - 5 && worldX <= block.x2 + 5 &&
                worldY >= block.y1 - 5 && worldY <= block.y2 + 5) {
                return block;
            }
        }
    }

    return null;
}

/**
 * 연결 모드용 - 엄격하게 찾기 (직접 클릭한 요소만, 자동 연결 방지)
 * 포트는 5픽셀 이내, 블록은 정확히 영역 내부만
 */
function findElementAtStrict(worldX, worldY, portsArray, blocksArray, currentScale) {
    const tolerance = 15 / currentScale; // 15픽셀 tolerance

    // 포트 + 블록 전부 거리 기반으로 검색 (가장 가까운 요소 반환)
    let bestElement = null;
    let bestDist = tolerance;

    for (const port of portsArray) {
        const dist = Math.hypot(port.cx - worldX, port.cy - worldY);
        if (dist < bestDist) {
            bestDist = dist;
            bestElement = port;
        }
    }

    for (const block of blocksArray) {
        const dist = Math.hypot(block.cx - worldX, block.cy - worldY);
        if (dist < bestDist) {
            bestDist = dist;
            bestElement = block;
        }
    }

    if (bestElement) return bestElement;

    return null;
}

// ============ 경로 최적화 ============

/**
 * 경로 최적화 (불필요한 중간점 제거)
 */
function optimizePath(path, fromX, fromY, toX, toY) {
    if (!path || path.length < 2) return path;

    const result = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
        const prev = result[result.length - 1];
        const curr = path[i];
        const next = path[i + 1];

        // 같은 방향이면 스킵
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;

        // 방향 변화가 있으면 유지
        if (Math.abs(dx1 * dy2 - dy1 * dx2) > 0.1) {
            result.push(curr);
        }
    }

    result.push(path[path.length - 1]);
    return result;
}

// ============ 날짜/시간 유틸 ============

/**
 * 현재 시간을 파일명용 문자열로
 */
function getTimestampString() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * 날짜를 한국어 형식으로
 */
function formatDateKorean(date) {
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
