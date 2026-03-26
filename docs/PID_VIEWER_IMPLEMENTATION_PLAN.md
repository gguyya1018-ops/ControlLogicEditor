# P&ID 뷰어 통합 구현 계획서

**작성일**: 2026-02-05
**프로젝트**: ControlLogicEditor + P&ID Viewer 통합
**DXF 파일 수**: 55개 (PI-M-001 ~ PI-M-047 외)

---

## 1. 프로젝트 개요

### 1.1 목표
ControlLogicEditor에 P&ID 도면 뷰어 기능 추가
- DXF 벡터 데이터를 Canvas에 직접 렌더링 (고품질 확대 지원)
- 밸브/계기 검색 및 위치 하이라이트
- 정비이력, TM현황 정보 표시 (목업)

### 1.2 범위
| 구분 | 내용 |
|------|------|
| DXF 소스 | `C:\Users\이성규\AppProduct\DXF\temp_dxf\` (55개 파일) |
| 통합 대상 | ControlLogicEditor (PyWebView 데스크톱 앱) |
| 렌더링 방식 | Canvas 2D 벡터 렌더링 (방식 A) |

---

## 2. 현재 시스템 구조

### 2.1 ControlLogicEditor 파일 구조
```
ControlLogicEditor/
├── app.py                 # PyWebView 백엔드 (Python)
├── editor.html            # 메인 HTML
├── css/
│   └── editor.css         # 스타일시트
├── js/
│   ├── app.js             # 앱 초기화
│   ├── canvas.js          # Canvas 렌더링 (1,301줄)
│   ├── events.js          # 이벤트 핸들링
│   ├── ui.js              # UI 로직 (2,076줄)
│   ├── fileIO.js          # 파일 I/O
│   ├── config.js          # 설정
│   ├── connections.js     # 연결선 로직
│   ├── templates.js       # 템플릿
│   ├── patterns.js        # 패턴 매칭
│   ├── blockTypes.js      # 블록 타입
│   ├── groups.js          # 그룹 관리
│   ├── graph.js           # 그래프
│   ├── data.js            # 데이터
│   └── utils.js           # 유틸리티
└── data/
    ├── cross_reference_index.json
    ├── templates.json
    └── ...
```

### 2.2 DXF에서 추출 가능한 데이터
| 데이터 | 설명 | 용도 |
|--------|------|------|
| POLYLINE | 배관 라인 좌표 | 선 렌더링 |
| INSERT (VALVE) | 밸브 위치/타입/사이즈 | 심볼 렌더링 + 검색 |
| TEXT/MTEXT | 계기 ID, 장비명 | 텍스트 렌더링 + 검색 |
| BLOCK | 장비 블록 | 도형 렌더링 |
| 레이어 | INST, V-NUMBER, cloud 등 | 필터링/스타일링 |

---

## 3. 구현 단계

### Phase 1: 데이터 준비 및 백엔드
**예상 작업량**: 중

| 단계 | 작업 | 파일 |
|------|------|------|
| 1.1 | DXF 파싱 스크립트 작성 (ezdxf) | `scripts/parse_pid_dxf.py` |
| 1.2 | 55개 DXF → JSON 변환 | `data/pid/*.json` |
| 1.3 | P&ID 인덱스 생성 | `data/pid_index.json` |
| 1.4 | app.py에 P&ID API 추가 | `app.py` |

**JSON 구조 (도면당)**:
```json
{
  "pid_number": "PI-M-007",
  "name": "주보일러증기계통",
  "grid": { "x_start": 935, "x_cell": 80.2, "y_start": 38.2, "y_cell": 90.95 },
  "lines": [
    { "type": "POLYLINE", "points": [[x1,y1], [x2,y2], ...], "layer": "..." }
  ],
  "valves": [
    { "id": "CV-0001", "type": "CHECK", "size": "50", "x": 1220.28, "y": 73.12, "grid": "5A", "description": "..." }
  ],
  "instruments": [
    { "id": "FCV 1551", "type": "유량조절밸브", "x": ..., "y": ..., "grid": "6A" }
  ],
  "texts": [
    { "text": "MAIN BOILER", "x": ..., "y": ..., "layer": "..." }
  ],
  "bounds": { "minX": ..., "maxX": ..., "minY": ..., "maxY": ... }
}
```

### Phase 2: 홈화면 UI 수정
**예상 작업량**: 소

| 단계 | 작업 | 파일 |
|------|------|------|
| 2.1 | 도면 유형 탭 추가 (제어 로직 / P&ID) | `editor.html` |
| 2.2 | P&ID 도면 목록 표시 | `js/ui.js` |
| 2.3 | 탭 전환 스타일 | `css/editor.css` |

### Phase 3: P&ID 뷰어 화면 구현
**예상 작업량**: 대

| 단계 | 작업 | 파일 |
|------|------|------|
| 3.1 | P&ID 전용 캔버스 모드 추가 | `js/canvas.js` 또는 `js/pidCanvas.js` (신규) |
| 3.2 | 배관 라인 렌더링 (POLYLINE) | `js/pidCanvas.js` |
| 3.3 | 밸브 심볼 렌더링 (타입별) | `js/pidCanvas.js` |
| 3.4 | 계기 심볼 렌더링 | `js/pidCanvas.js` |
| 3.5 | 텍스트 렌더링 | `js/pidCanvas.js` |
| 3.6 | 줌/팬 기능 (기존 코드 재활용) | `js/events.js` |
| 3.7 | 그리드 오버레이 (1-8, A-F) | `js/pidCanvas.js` |

**밸브 심볼 타입**:
- GATE (게이트밸브) - 직사각형
- GLOBE (글로브밸브) - 원형
- CHECK (체크밸브) - 삼각형
- BALL (볼밸브) - 원 + 선
- BUTTERFLY (버터플라이) - 나비 모양

### Phase 4: 우측 사이드바 구현
**예상 작업량**: 중

| 단계 | 작업 | 파일 |
|------|------|------|
| 4.1 | P&ID 전용 사이드바 레이아웃 | `editor.html` |
| 4.2 | 밸브/계기 상세정보 패널 | `js/ui.js` 또는 `js/pidUI.js` (신규) |
| 4.3 | 정비이력 섹션 (목업) | `js/pidUI.js` |
| 4.4 | TM현황 섹션 (목업) | `js/pidUI.js` |
| 4.5 | 스타일링 | `css/editor.css` |

**사이드바 구조**:
```
┌─────────────────────────┐
│ 🔍 검색: [________]     │
├─────────────────────────┤
│ 선택된 항목              │
│ ┌─────────────────────┐ │
│ │ CV-0001             │ │
│ │ 타입: CHECK         │ │
│ │ 사이즈: 50mm        │ │
│ │ 위치: 5A            │ │
│ │ 설명: INITIAL FILL  │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 📋 정비이력 (목업)       │
│ • 2025-12-01 점검       │
│ • 2025-06-15 교체       │
├─────────────────────────┤
│ 📄 TM현황 (목업)         │
│ • TM-2025-042 진행중    │
│ • TM-2024-118 완료      │
└─────────────────────────┘
```

### Phase 5: 검색 및 인터랙션
**예상 작업량**: 중

| 단계 | 작업 | 파일 |
|------|------|------|
| 5.1 | P&ID 검색 입력창 | `editor.html` |
| 5.2 | 밸브/계기 검색 로직 | `js/pidUI.js` |
| 5.3 | 검색 결과 드롭다운 | `js/pidUI.js` |
| 5.4 | 선택 시 위치 이동 + 하이라이트 | `js/pidCanvas.js` |
| 5.5 | 클릭으로 요소 선택 | `js/events.js` |

### Phase 6: 테스트 및 최적화
**예상 작업량**: 중

| 단계 | 작업 |
|------|------|
| 6.1 | 55개 도면 렌더링 테스트 |
| 6.2 | 대용량 도면 성능 최적화 (P&ID SUM.dxf = 64MB) |
| 6.3 | 줌 레벨별 LOD (Level of Detail) |
| 6.4 | 캐싱 전략 |

---

## 4. 신규 파일 목록

| 파일 | 용도 |
|------|------|
| `scripts/parse_pid_dxf.py` | DXF → JSON 변환 스크립트 |
| `js/pidCanvas.js` | P&ID 캔버스 렌더링 |
| `js/pidUI.js` | P&ID UI 로직 |
| `js/pidData.js` | P&ID 데이터 관리 |
| `data/pid/` | 변환된 JSON 파일들 |
| `data/pid_index.json` | P&ID 도면 인덱스 |

---

## 5. 수정 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `app.py` | P&ID API 추가 (load_pid, list_pids) |
| `editor.html` | 홈화면 탭, P&ID 사이드바 |
| `css/editor.css` | P&ID 관련 스타일 |
| `js/app.js` | P&ID 초기화 로직 |
| `js/ui.js` | 홈화면 탭 전환 로직 |
| `js/events.js` | P&ID 모드 이벤트 |

---

## 6. 백업 계획

### 6.1 백업 대상
```
ControlLogicEditor/
├── app.py
├── editor.html
├── css/editor.css
├── js/*.js (14개 파일)
└── data/*.json
```

### 6.2 백업 위치
```
ControlLogicEditor/backup/
└── 2026-02-05_pre_pid/
    ├── app.py
    ├── editor.html
    ├── css/
    ├── js/
    └── data/
```

### 6.3 백업 명령어
```bash
# 백업 생성
mkdir -p backup/2026-02-05_pre_pid
cp app.py backup/2026-02-05_pre_pid/
cp editor.html backup/2026-02-05_pre_pid/
cp -r css backup/2026-02-05_pre_pid/
cp -r js backup/2026-02-05_pre_pid/
cp -r data backup/2026-02-05_pre_pid/

# 복원 (필요시)
cp backup/2026-02-05_pre_pid/app.py .
cp backup/2026-02-05_pre_pid/editor.html .
cp -r backup/2026-02-05_pre_pid/css .
cp -r backup/2026-02-05_pre_pid/js .
cp -r backup/2026-02-05_pre_pid/data .
```

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| DXF 파싱 오류 | 일부 도면 렌더링 실패 | 도면별 예외 처리, 로그 |
| 대용량 도면 성능 | 렌더링 지연 | LOD, 캐싱, Web Worker |
| 심볼 렌더링 불일치 | 실제 도면과 차이 | DXF 블록 정의 분석, 보정 |
| 기존 기능 충돌 | 에디터 오작동 | 모드 분리, 철저한 테스트 |

---

## 8. 일정 (예상)

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | 데이터 준비 및 백엔드 | 1일 |
| 2 | 홈화면 UI 수정 | 0.5일 |
| 3 | P&ID 뷰어 화면 구현 | 2일 |
| 4 | 우측 사이드바 구현 | 1일 |
| 5 | 검색 및 인터랙션 | 1일 |
| 6 | 테스트 및 최적화 | 1일 |
| **총계** | | **약 6.5일** |

---

## 9. 시작 전 체크리스트

- [ ] 백업 완료
- [ ] DXF 파일 55개 확인
- [ ] ezdxf 라이브러리 설치 확인
- [ ] 기존 에디터 정상 작동 확인
- [ ] Phase 1부터 순차 진행

---

## 10. 참고 자료

- 기존 DXF 분석 스크립트: `C:\Users\이성규\AppProduct\DXF\scripts\extract_data_v2.py`
- RAG 데이터 예시: `C:\Users\이성규\AppProduct\DXF\RAG_데이터_최종.md`
- 밸브 목록 CSV: `DXF파일\PI-M-007(주보일러증기계통)_밸브목록.csv`
