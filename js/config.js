/**
 * config.js - 전역 설정, 상수, 상태 변수
 * Control Logic Editor
 */

// ============ SUPABASE SETUP ============
const SUPABASE_URL = 'https://tahgyhomkczoduetaecz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaGd5aG9ta2N6b2R1ZXRhZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY1NDksImV4cCI6MjA4MDIwMjU0OX0.all7FwsrviD0rmPNYDXtCVRnpD6UoyDKvfAw7JdIyjQ';
let supabaseClient = null;

// ============ PAGE CONSTANTS ============
const PAGE_W = 5450;
const PAGE_H = 3520;
const LINE_GRID_SIZE = 50;  // 라인 검색용 그리드 셀 크기
const CONFIG_SCALE = 2;     // 블록 설정 캔버스 스케일

// ============ SERVER CONFIG ============
const SERVER_URL = 'http://localhost:8080';
const SAVE_FOLDER = 'C:\\Users\\이성규\\AppProduct\\AI도면분석\\saved';

// ============ COLORS ============
const COLORS = {
    'OCB_BLOCK': '#e94560',
    'SIGNAL': '#00ff88',
    'ALG_BLOCK': '#ffd700',
    'REF_SIGNAL': '#00bcd4',
    'PORT': '#ffffff',
    'BLOCK_TYPE': '#ff9800',
    'SHEET_REF': '#9c27b0',
    'OTHER': '#666666',
    // Logic gates
    'AND': '#ff6b6b',
    'OR': '#4ecdc4',
    'NOT': '#ffe66d',
    // Control blocks
    'M/A': '#a29bfe',
    'DIV': '#fd79a8',
    'MUL': '#00b894',
    'PID': '#e17055',
    'K': '#74b9ff',
    'AI': '#55efc4',
    'AO': '#81ecec',
    'DI': '#fab1a0',
    'DO': '#ffeaa7',
    'JUNCTION': '#ff5722'
};

// ============ TYPE DEFINITIONS ============
const PORT_TYPES = ['PORT', 'BLOCK_TYPE', 'SHEET_REF', 'JUNCTION'];

// 블록별 허용 포트 규칙
const BLOCK_PORT_RULES = {
    'OCB_BLOCK': {
        allowed: ['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'A', 'G', 'FLAG'],
        patterns: [/^XIC/, /^XIO/, /^OTE/, /^OTL/, /^OTU/, /^A\d*$/, /^G\d*$/, /^FLAG/]
    },
    'SIGNAL': {
        allowed: ['A', 'G', 'XIC', 'XIO', 'OTE'],
        patterns: [/^A\d*$/, /^G\d*$/, /^XIC/, /^XIO/, /^OTE/]
    },
    'PID': {
        allowed: ['STPT', 'PV', 'MV', 'K', 'A', 'G'],
        patterns: [/^STPT/, /^PV/, /^MV/, /^K\d*$/, /^A\d*$/, /^G\d*$/]
    }
};

// 상호 배타적 포트 (한 블록에 하나만)
const EXCLUSIVE_PORTS = {
    'AG': ['A', 'G'],  // A와 G 중 하나만
    'LOGIC_OUT': ['OTE', 'OTL', 'OTU'],  // 출력 중 하나만
    'LOGIC_IN': ['XIC', 'XIO']  // 입력 중 하나만
};

// 특수 블록 포트 목록
const PID_PORTS = ['STPT', 'PV', 'MV', 'K'];
const T_BLOCK_PORTS = ['FLAG', 'YES', 'NO'];

// 기본 블록별 포트 설정
const DEFAULT_PORTS = {
    'OCB_BLOCK': [
        { name: 'XIC', dx: -40, dy: 0 },
        { name: 'OTE', dx: 40, dy: 0 }
    ],
    'PID': [
        { name: 'STPT', dx: -60, dy: -20 },
        { name: 'PV', dx: -60, dy: 0 },
        { name: 'MV', dx: 60, dy: 0 },
        { name: 'K', dx: 0, dy: 30 }
    ],
    'AND': [
        { name: 'IN1', dx: -30, dy: -10 },
        { name: 'IN2', dx: -30, dy: 10 },
        { name: 'OUT', dx: 30, dy: 0 }
    ],
    'OR': [
        { name: 'IN1', dx: -30, dy: -10 },
        { name: 'IN2', dx: -30, dy: 10 },
        { name: 'OUT', dx: 30, dy: 0 }
    ],
    'NOT': [
        { name: 'IN', dx: -25, dy: 0 },
        { name: 'OUT', dx: 25, dy: 0 }
    ]
};

// ============ DATA STATE ============
let layoutData = [];
let linesData = [];
let vectorLinesData = [];
let showVectorLines = false;
let showConnectionLines = true;
let groupsData = {};
let customConnections = [];

// Processed data
let blocks = [];
let ports = [];
let allElements = [];

// ============ CANVAS STATE ============
let canvas = null;
let ctx = null;
let viewX = 0;
let viewY = 0;
let scale = 0.25;

// ============ INTERACTION STATE ============
let isDragging = false;
let isPanning = false;  // P&ID 뷰어 팬 상태
let dragStartX = 0;
let dragStartY = 0;
let lastViewX = 0;
let lastViewY = 0;
let lastMouseX = 0;
let lastMouseY = 0;

let selectedElement = null;
let editMode = false;
let connectMode = false;
let connectStart = null;
let connectWaypoints = [];
let pendingPortAssign = null;

// Port dragging
let isDraggingPort = false;
let draggedPort = null;
let draggedGroupPort = null;
let lastShiftKey = false;

// Block dragging
let isDraggingBlock = false;
let draggedBlock = null;

// ============ CLONE MODE STATE ============
let cloneMode = false;
let cloneParentRow = [];
let cloneChildRow = [];
let cloneCurrentChildIdx = 0;
let cloneSelectStart = null;
let cloneSelectEnd = null;
let isCloneSelecting = false;

// ============ TEMPLATE MODE STATE ============
let templateMode = false;
let templateAnchor = null;
let templateSelectStart = null;
let templateSelectEnd = null;
let isTemplateSelecting = false;
let selectedTemplate = null;
let selectedTemplates = new Set();
let templateEditMode = false;
let blockTemplates = [];
let pendingTemplatePorts = [];
let pendingTemplateAnchor = null;

// ============ PATTERN MODE STATE ============
let patternMode = false;
let isPatternSelecting = false;
let patternSelectStart = null;
let patternSelectEnd = null;
let selectedPatternArea = null;
let savedConnectionPatterns = [];
let selectedPatternIndex = -1;
let foundSimilarGroups = [];
let highlightedSimilarGroup = null;
let selectedSimilarGroupIdx = null;

// ============ CONNECTION STATE ============
let connectionCandidates = [];
let lineIndex = null;
let priorityPortNames = JSON.parse(localStorage.getItem('priorityPortNames') || '["G", "A"]');

// ============ DIAGRAM MODE ============
let diagramMode = true;

// ============ CONFIG CANVAS STATE ============
let configCanvas = null;
let configCtx = null;
let configDraggingPort = null;
let configSelectedPort = -1;
let blockTypeConfigs = {};

// ============ PORT CREATE MODE ============
let portCreateMode = false;
let portCreateAnchor = null;
let portCreatePorts = [];
let portCreateName = '';
let portCreateType = 'PORT';

// ============ DISPLAY TOGGLES ============
let showPorts = true;
let showBlocks = true;
let showOther = true;   // OTHER 타입 표시 (라벨/주석 등)
let showLines = true;
let showConnections = true;
let showBgLines = false;

// ============ BACKGROUND IMAGE ============
let bgImage = null;

// ============ MEMOS ============
let elementMemos = {};

// ============ DRAWING MANAGER STATE ============
let currentDrawingId = null;
let currentOriginalFile = null;
let currentDrawingNumber = null;
let currentPageNumber = null;
let currentVersion = 'original';
let currentFileHandle = null;
let currentFilePath = null;
let currentDrawingName = null;
let isEdited = false;
let recentDrawings = [];
let currentListFolder = 'original';
let supabaseDrawings = {};
let localDrawingIndex = {};

// ============ 도면 인덱스 (drawing_index.json) ============
let drawingIndex = {};

async function loadDrawingIndex() {
    try {
        if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
            const result = await window.pywebview.api.load_drawing_index();
            if (result.success) drawingIndex = result.data || {};
        } else {
            const resp = await fetch('drawings/drawing_index.json');
            if (resp.ok) drawingIndex = await resp.json();
        }
    } catch (e) {
        console.warn('도면 인덱스 로드 실패:', e);
    }
}

// D{drop}-{task}-{sheet} 형식 생성
function formatDrawingId(task, page) {
    const info = drawingIndex[String(task)];
    if (!info) return page ? `${task}-${page}` : `${task}`;
    const drop = String(info.drop).padStart(2, '0');
    return page ? `D${drop}-${task}-${page}` : `D${drop}-${task}`;
}

// D{drop}-{task}-{sheet} + 제목
function formatDrawingLabel(task, page) {
    const id = formatDrawingId(task, page);
    const info = drawingIndex[String(task)];
    const title = info?.title || '';
    return title ? `${id} ${title}` : id;
}

// REF_SIGNAL 파싱: D03-511-03 → {drop:'03', task:'511', sheet:'03'}
function parseRefSignal(name) {
    const m = name.match(/^D(\d+)-(\d+)-(\d+)/);
    if (!m) return null;
    return { drop: m[1], task: m[2], sheet: m[3] };
}

// REF_SIGNAL → 표시 문자열 (인덱스에서 제목 조회)
function formatRefSignal(name) {
    const ref = parseRefSignal(name);
    if (!ref) return name;
    const info = drawingIndex[ref.task];
    const id = `D${ref.drop.padStart(2,'0')}-${ref.task}-${ref.sheet}`;
    return info?.title ? `${id} ${info.title}` : id;
}

// 도면 인덱스에서 task 제목만 가져오기
function getDrawingTitle(task) {
    const info = drawingIndex[String(task)];
    return info?.title || '';
}

// Legacy drawing files mapping
const drawingFiles = {
    'page_187': 'page_187.json',
    'page_188': 'page_188.json'
};

// ============ HELPER FUNCTIONS ============
function getColor(type) {
    return COLORS[type] || '#888888';
}

function isBlockType(type) {
    return type && !PORT_TYPES.includes(type);
}

function initSupabase() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}
