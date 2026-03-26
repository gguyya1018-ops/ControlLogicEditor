# PRD: LLM 분석용 JSON 내보내기 기능

## 1. 개요

### 1.1 배경
- 현재 DH 순환펌프 등 대용량 펌프/밸브의 자동운전 로직에서 2개 이상 동시 운전 시 문제 발생
- 원인 분석을 위해 제어 로직 전체를 파악할 필요가 있음
- PDF 도면을 에디터에서 연결선 입력 후 LLM에 제공하여 분석하는 환경 필요

### 1.2 목표
- 에디터 JSON(11MB)을 LLM 분석용 JSON(50-100KB)으로 변환
- LLM이 제어 로직을 정확히 이해하고 분석할 수 있는 형태 제공
- 여러 페이지 간 참조 관계 추적 가능

### 1.3 성공 지표
- JSON 용량 99% 감소 (11MB → 100KB 이하)
- LLM이 제어 흐름을 정확히 설명할 수 있음
- 페이지 간 신호 참조 자동 추적

---

## 2. 현재 상태 분석

### 2.1 현재 에디터 JSON 구조
```json
{
  "timestamp": "2026-01-24T...",
  "groups": [...],      // 블록 그룹 (좌표 포함)
  "connections": [...], // 연결선 (waypoints 포함)
  "lines": [...],       // 시각적 선 요소
  "blocks": {...},      // 블록 정보 (좌표 포함)
  "ports": [...]        // 포트 정보 (좌표 포함)
}
```

### 2.2 문제점
| 항목 | 현재 | 문제 |
|------|------|------|
| 용량 | 11MB (60만 줄) | LLM 컨텍스트 초과 |
| 좌표 데이터 | 전체의 90% | 분석에 불필요 |
| 중복 데이터 | groups/blocks 중복 | 용량 낭비 |
| 블록 설명 | OTHER 포트에 분산 | 추출 어려움 |

### 2.3 LLM 분석에 필요한 정보
- 블록 ID 및 설명 (OCB008800E = "DH CIRC PP A HYD COUPL")
- 블록 타입 (OCB_BLOCK, ALG_BLOCK, SIGNAL, T블록 등)
- 연결 관계 (from → to, 포트명)
- 페이지 간 참조 (D03-511-03 → 페이지 511)

---

## 3. 요구사항

### 3.1 기능 요구사항

#### FR-01: 분석용 JSON 내보내기
- 에디터에서 "분석용 JSON 내보내기" 버튼 제공
- 현재 로드된 도면을 분석용 형식으로 변환
- 파일명: `{페이지번호}_analysis.json`

#### FR-02: 블록 정보 추출
- 블록 ID, 타입, 설명 추출
- 설명은 OTHER 타입 포트의 name에서 추출
- 포트 목록 (IN, OUT, PV, SP, FLAG, YES, NO 등)

#### FR-03: 연결 관계 추출
- from/to 블록 ID
- from/to 포트명
- 좌표, waypoints 제외

#### FR-04: 페이지 간 참조 추적
- D##-###-## 형식 신호에서 페이지 번호 추출
- SHEET_REF 블록에서 참조 페이지 추출
- references 섹션에 정리

#### FR-05: 여러 페이지 통합 (Phase 2)
- 관련 페이지들을 하나의 분석 파일로 병합
- 페이지 간 연결 관계 자동 연결

### 3.2 비기능 요구사항

#### NFR-01: 용량
- 단일 페이지: 100KB 이하
- 통합 파일: 500KB 이하

#### NFR-02: 호환성
- 기존 에디터 JSON과 별도 파일로 저장
- 에디터 기능에 영향 없음

---

## 4. 분석용 JSON 스키마

### 4.1 단일 페이지 형식
```json
{
  "version": "1.0",
  "exportedAt": "2026-01-24T22:17:00Z",
  "page": {
    "number": "510",
    "title": "CIRCULATION LINE - DH",
    "system": "DH (District Heating)"
  },
  "blocks": {
    "OCB008800E": {
      "type": "OCB_BLOCK",
      "subtype": "PID",
      "desc": "DH CIRC PP A HYD COUPL",
      "ports": {
        "input": ["PV", "SP"],
        "output": ["OUT"],
        "other": ["MODE"]
      }
    },
    "ALG-011300C": {
      "type": "ALG_BLOCK",
      "desc": null,
      "ports": {
        "input": ["IN1"],
        "output": ["OUT"],
        "other": ["I", "MODE"]
      }
    },
    "SIT2681A": {
      "type": "SIGNAL",
      "signalType": "SIT",
      "desc": "Speed Indicator Transmitter - Pump A"
    },
    "OCB0088002": {
      "type": "T_BLOCK",
      "desc": null,
      "ports": {
        "input": ["FLAG", "YES", "NO"],
        "output": ["OUT"]
      }
    },
    "MODE_800_2350": {
      "type": "MODE_BLOCK",
      "desc": null,
      "ports": {
        "input": ["MRE", "ARE"],
        "output": ["AUTO", "MANUAL", "MODE"]
      }
    },
    "AND_1145_2288": {
      "type": "AND_GATE",
      "desc": null,
      "ports": {
        "input": ["IN1", "IN2"],
        "output": ["OUT"]
      }
    },
    "D03-511-03": {
      "type": "REF_SIGNAL",
      "refPage": "511",
      "desc": "페이지 511 참조 필요"
    }
  },
  "connections": [
    {
      "from": "SIT2681A",
      "fromPort": null,
      "to": "OCB008800E",
      "toPort": "PV",
      "note": "속도 측정값 → PID 입력"
    },
    {
      "from": "OCB008800E",
      "fromPort": "OUT",
      "to": "ALG-011300C",
      "toPort": "IN1",
      "note": "PID 출력 → 연산 블록"
    },
    {
      "from": "ALG-011300C",
      "fromPort": "OUT",
      "to": "OCB008800F",
      "toPort": "NO",
      "note": "연산 결과 → T블록 NO"
    },
    {
      "from": "D03-511-03",
      "fromPort": null,
      "to": "OCB0088002",
      "toPort": "FLAG",
      "note": "인터락 신호"
    },
    {
      "from": "D03-511-01",
      "fromPort": null,
      "to": "MODE_800_2350",
      "toPort": "MRE",
      "note": "수동 요청"
    },
    {
      "from": "D03-511-02",
      "fromPort": null,
      "to": "MODE_800_2350",
      "toPort": "ARE",
      "note": "자동 요청"
    },
    {
      "from": "MODE_800_2350",
      "fromPort": "AUTO",
      "to": "AND_1145_2288",
      "toPort": "IN2",
      "note": "자동 모드 신호"
    }
  ],
  "references": {
    "inbound": [],
    "outbound": [
      {
        "signal": "D03-511-01",
        "targetPage": "511",
        "usage": "MODE.MRE (수동 요청)"
      },
      {
        "signal": "D03-511-02",
        "targetPage": "511",
        "usage": "MODE.ARE (자동 요청)"
      },
      {
        "signal": "D03-511-03",
        "targetPage": "511",
        "usage": "T블록 FLAG (인터락)"
      },
      {
        "signal": "D03-024-01",
        "targetPage": "024",
        "usage": "SPEED P FLAG"
      }
    ]
  },
  "summary": {
    "totalBlocks": 25,
    "totalConnections": 104,
    "blockTypes": {
      "OCB_BLOCK": 8,
      "ALG_BLOCK": 6,
      "SIGNAL": 4,
      "T_BLOCK": 4,
      "MODE_BLOCK": 1,
      "AND_GATE": 2
    },
    "pumps": ["A", "B", "C", "D"],
    "controlType": "Speed Control via Hydraulic Coupling"
  }
}
```

### 4.2 통합 파일 형식 (Phase 2)
```json
{
  "version": "1.0",
  "type": "integrated",
  "pages": ["510", "511", "024"],
  "pageData": {
    "510": { /* 위 형식 */ },
    "511": { /* 위 형식 */ },
    "024": { /* 위 형식 */ }
  },
  "crossPageConnections": [
    {
      "fromPage": "511",
      "fromSignal": "D03-511-03",
      "toPage": "510",
      "toBlock": "OCB0088002",
      "toPort": "FLAG"
    }
  ]
}
```

---

## 5. 블록 타입 정의

### 5.1 주요 블록 타입
| 타입 | 설명 | 포트 |
|------|------|------|
| OCB_BLOCK | 제어 블록 (PID 등) | PV, SP, OUT, MODE |
| ALG_BLOCK | 연산 블록 | IN1, OUT, I, MODE |
| T_BLOCK | 조건 선택 (FLAG=1→YES, FLAG=0→NO) | FLAG, YES, NO, OUT |
| MODE_BLOCK | 운전 모드 선택 | MRE, ARE, AUTO, MANUAL, MODE |
| SIGNAL | 계측 신호 | - |
| REF_SIGNAL | 다른 페이지 참조 신호 | - |
| AND_GATE | AND 논리 | IN1, IN2, OUT |
| OR_GATE | OR 논리 | IN1, IN2, OUT |
| NOT_GATE | NOT 논리 | IN1, OUT |

### 5.2 신호 타입 접두사
| 접두사 | 의미 | 예시 |
|--------|------|------|
| SIT | Speed Indicator Transmitter | SIT2681A |
| TIT | Temperature Indicator Transmitter | TIT2681A |
| PIT | Pressure Indicator Transmitter | PIT2681A |
| SIC | Speed Indicator Controller | SIC2681A |
| D##-###-## | 디지털 신호 (##=페이지) | D03-511-03 |

---

## 6. 구현 계획

### Phase 1: 기본 내보내기 (1주)
1. 블록 정보 추출 함수 구현
2. 연결 관계 추출 함수 구현
3. 분석용 JSON 생성 함수 구현
4. UI에 내보내기 버튼 추가

### Phase 2: 페이지 참조 추적 (1주)
1. D##-###-## 신호 파싱
2. SHEET_REF 블록 분석
3. references 섹션 자동 생성

### Phase 3: 여러 페이지 통합 (2주)
1. 여러 분석 파일 선택 UI
2. 통합 파일 생성
3. crossPageConnections 자동 연결

### Phase 4: LLM 프롬프트 템플릿 (1주)
1. 분석용 JSON과 함께 사용할 프롬프트 템플릿
2. 특정 분석 요청 템플릿 (흐름 분석, 인터락 분석 등)

---

## 7. 예상 효과

### 7.1 용량 비교
| 항목 | 현재 | 개선 후 |
|------|------|---------|
| 단일 페이지 | 11MB | ~80KB |
| 4개 펌프 통합 | 44MB | ~100KB |
| 관련 시스템 전체 | 100MB+ | ~500KB |

### 7.2 분석 가능 범위
- 단일 펌프 제어 흐름 분석
- 여러 펌프 간 인터락 관계 분석
- 밸브-펌프 연동 로직 분석
- 자동/수동 모드 전환 로직 분석

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 블록 설명 누락 | 분석 정확도 저하 | OTHER 포트 외 추가 소스 탐색 |
| 페이지 참조 누락 | 불완전한 분석 | SHEET_REF 완전 파싱 |
| LLM 컨텍스트 초과 | 통합 분석 불가 | 페이지 단위 분할 분석 |

---

## 9. 다음 단계

1. [ ] PRD 검토 및 승인
2. [ ] Phase 1 구현 시작
3. [ ] 테스트용 510 페이지 분석 JSON 생성
4. [ ] LLM 분석 테스트
