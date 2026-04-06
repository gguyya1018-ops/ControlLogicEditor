"""
Ovation 심볼 120개에 PID 수준의 풍부한 detailFull을 생성하는 스크립트.
각 심볼마다:
1. 내부 기능 블록이 있는 Functional Symbol SVG
2. 신호 흐름도 SVG
3. 포트 상세 표, 수식 블록, 동작 설명
을 생성하여 ovation_symbols.json에 반영.
"""

import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_PATH = os.path.join(BASE_DIR, 'data', 'ovation_symbols.json')

# ============================================================
# 심볼별 시각 설정 (내부 서브블록, 기능기호, 색상, 흐름도)
# ============================================================
# inner_blocks: [{label, symbol, color, desc}]  - 블록 내부 기능 서브박스
# flow: [{from, to, label, color}]  - 흐름도 경로
# extra_svgs: 추가 SVG 다이어그램 설명

COLORS = {
    'blue': ('#4fc3f7', 'rgba(79,195,247,'),
    'green': ('#10b981', 'rgba(16,185,129,'),
    'red': ('#e94560', 'rgba(233,69,96,'),
    'orange': ('#ff9800', 'rgba(255,152,0,'),
    'purple': ('#a78bfa', 'rgba(167,139,250,'),
    'yellow': ('#fbbf24', 'rgba(251,191,36,'),
    'pink': ('#f472b6', 'rgba(244,114,182,'),
    'white': ('rgba(255,255,255,0.6)', 'rgba(255,255,255,'),
}

# ============================================================
# 심볼별 내부 서브블록 정의
# ============================================================
SYMBOL_CONFIG = {
    # === LOGIC ===
    'AND': {
        'inner': [
            {'symbol': '&amp;', 'label': 'AND', 'color': 'blue', 'desc': '논리곱'},
        ],
        'flow_type': 'logic_gate',
        'flow_desc': '모든 입력이 TRUE일 때만 출력 TRUE',
        'timing': True,
    },
    'OR': {
        'inner': [
            {'symbol': '≥1', 'label': 'OR', 'color': 'green', 'desc': '논리합'},
        ],
        'flow_type': 'logic_gate',
        'flow_desc': '하나라도 TRUE이면 출력 TRUE',
        'timing': True,
    },
    'NOT': {
        'inner': [
            {'symbol': '1', 'label': 'NOT', 'color': 'red', 'desc': '논리 부정'},
        ],
        'flow_type': 'simple',
        'flow_desc': '입력의 반전을 출력',
    },
    'XOR': {
        'inner': [
            {'symbol': '=1', 'label': 'XOR', 'color': 'purple', 'desc': '배타적 OR'},
        ],
        'flow_type': 'logic_gate',
        'flow_desc': '두 입력이 다를 때 TRUE',
        'timing': True,
    },
    'FLIPFLOP': {
        'inner': [
            {'symbol': 'S', 'label': 'Set', 'color': 'green', 'desc': '세트'},
            {'symbol': 'R', 'label': 'Reset', 'color': 'red', 'desc': '리셋'},
            {'symbol': 'Q', 'label': 'Out', 'color': 'blue', 'desc': '출력'},
        ],
        'flow_type': 'sr_latch',
        'flow_desc': 'SET=1이면 출력 래치, RESET=1이면 해제',
    },
    'AAFLIPFLOP': {
        'inner': [
            {'symbol': 'T', 'label': 'Toggle', 'color': 'purple', 'desc': '토글'},
            {'symbol': 'Q', 'label': 'Out', 'color': 'blue', 'desc': '출력'},
        ],
        'flow_type': 'toggle',
        'flow_desc': '트리거마다 0→1→0 토글',
    },

    # === ARITHMETIC ===
    'SUM': {
        'inner': [
            {'symbol': 'Σ', 'label': 'Sum', 'color': 'blue', 'desc': '합산'},
            {'symbol': 'G', 'label': 'Gain', 'color': 'orange', 'desc': '이득'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
        ],
        'flow_type': 'arithmetic_chain',
        'flow_desc': 'INn × Gn + Bn을 모두 합산하여 출력',
    },
    'MULTIPLY': {
        'inner': [
            {'symbol': '×', 'label': 'Multiply', 'color': 'blue', 'desc': '곱셈'},
            {'symbol': 'G', 'label': 'Gain', 'color': 'orange', 'desc': '이득'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
        ],
        'flow_type': 'arithmetic_chain',
        'flow_desc': '(IN1 × IN2) × GAIN + BIAS',
    },
    'DIVIDE': {
        'inner': [
            {'symbol': '÷', 'label': 'Divide', 'color': 'blue', 'desc': '나눗셈'},
            {'symbol': 'G', 'label': 'Gain', 'color': 'orange', 'desc': '이득'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
        ],
        'flow_type': 'arithmetic_chain',
        'flow_desc': '(IN1 / IN2) × GAIN + BIAS',
    },
    'SQUAREROOT': {
        'inner': [
            {'symbol': '√', 'label': 'Sqrt', 'color': 'blue', 'desc': '제곱근'},
            {'symbol': 'G', 'label': 'Gain', 'color': 'orange', 'desc': '이득'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
        ],
        'flow_type': 'arithmetic_chain',
        'flow_desc': '√(IN1) × GAIN + BIAS',
    },
    'ABSVALUE': {
        'inner': [
            {'symbol': '|x|', 'label': 'Abs', 'color': 'blue', 'desc': '절대값'},
        ],
        'flow_type': 'simple',
        'flow_desc': '입력의 절대값을 출력',
    },
    'LOG': {
        'inner': [
            {'symbol': 'log₁₀', 'label': 'Log', 'color': 'blue', 'desc': '상용 로그'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'log₁₀(IN1) + BIAS',
    },
    'NLOG': {
        'inner': [
            {'symbol': 'ln', 'label': 'NLog', 'color': 'blue', 'desc': '자연 로그'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'ln(IN1) + BIAS',
    },
    'ANTILOG': {
        'inner': [
            {'symbol': '10ˣ', 'label': 'AntiLog', 'color': 'blue', 'desc': '역로그'},
        ],
        'flow_type': 'simple',
        'flow_desc': '10^(IN1) 또는 e^(IN1)',
    },
    'SINE': {
        'inner': [{'symbol': 'sin', 'label': 'Sine', 'color': 'blue', 'desc': '사인'}],
        'flow_type': 'simple', 'flow_desc': 'sin(IN1) [라디안]',
    },
    'COSINE': {
        'inner': [{'symbol': 'cos', 'label': 'Cosine', 'color': 'green', 'desc': '코사인'}],
        'flow_type': 'simple', 'flow_desc': 'cos(IN1) [라디안]',
    },
    'TANGENT': {
        'inner': [{'symbol': 'tan', 'label': 'Tangent', 'color': 'orange', 'desc': '탄젠트'}],
        'flow_type': 'simple', 'flow_desc': 'tan(IN1) [라디안]',
    },
    'ARCSINE': {
        'inner': [{'symbol': 'sin⁻¹', 'label': 'ArcSin', 'color': 'blue', 'desc': '아크사인'}],
        'flow_type': 'simple', 'flow_desc': 'arcsin(IN1) → 라디안',
    },
    'ARCCOSINE': {
        'inner': [{'symbol': 'cos⁻¹', 'label': 'ArcCos', 'color': 'green', 'desc': '아크코사인'}],
        'flow_type': 'simple', 'flow_desc': 'arccos(IN1) → 라디안',
    },
    'ARCTANGENT': {
        'inner': [{'symbol': 'tan⁻¹', 'label': 'ArcTan', 'color': 'orange', 'desc': '아크탄젠트'}],
        'flow_type': 'simple', 'flow_desc': 'arctan(IN1) → 라디안',
    },
    'POLYNOMIAL': {
        'inner': [
            {'symbol': 'Σaₙxⁿ', 'label': 'Poly', 'color': 'blue', 'desc': '다항식'},
        ],
        'flow_type': 'polynomial',
        'flow_desc': 'A0 + A1·X + A2·X² + A3·X³ + A4·X⁴ + A5·X⁵',
    },
    'COMPARE': {
        'inner': [
            {'symbol': '&gt;', 'label': 'Greater', 'color': 'green', 'desc': '초과'},
            {'symbol': '=', 'label': 'Equal', 'color': 'blue', 'desc': '동일'},
            {'symbol': '&lt;', 'label': 'Less', 'color': 'red', 'desc': '미만'},
        ],
        'flow_type': 'compare',
        'flow_desc': 'IN1과 IN2를 비교하여 3개 출력 (OUTG, OUT, OUTL)',
    },
    'SMOOTH': {
        'inner': [
            {'symbol': 'α', 'label': 'Alpha', 'color': 'blue', 'desc': '현재 가중'},
            {'symbol': 'β', 'label': 'Beta', 'color': 'green', 'desc': '이전 가중'},
        ],
        'flow_type': 'filter',
        'flow_desc': 'OUT = α×IN1 + β×이전OUT (지수 평활)',
    },
    'RATECHANGE': {
        'inner': [
            {'symbol': 'Δ/Δt', 'label': 'Rate', 'color': 'orange', 'desc': '변화율'},
        ],
        'flow_type': 'simple',
        'flow_desc': '입력의 시간당 변화율 계산',
    },
    'RUNAVERAGE': {
        'inner': [
            {'symbol': 'x̄', 'label': 'Avg', 'color': 'blue', 'desc': '이동 평균'},
        ],
        'flow_type': 'simple',
        'flow_desc': '지정 시간/개수 구간의 이동 평균',
    },
    'QAVERAGE': {
        'inner': [
            {'symbol': 'x̄ᵩ', 'label': 'QAvg', 'color': 'blue', 'desc': '품질 평균'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'BAD 품질 제외하고 GOOD 포인트만 평균',
    },
    'RESETSUM': {
        'inner': [
            {'symbol': 'Σ+R', 'label': 'RSum', 'color': 'blue', 'desc': '리셋 합산'},
        ],
        'flow_type': 'accumulator',
        'flow_desc': '누적 합산 + RSET으로 초기화',
    },
    'CALCBLOCK': {
        'inner': [
            {'symbol': 'f(x)', 'label': 'Calc', 'color': 'purple', 'desc': '수식 연산'},
            {'symbol': 'x₁..x₈', 'label': 'Args', 'color': 'orange', 'desc': '인수'},
        ],
        'flow_type': 'calc',
        'flow_desc': '사용자 정의 수식으로 최대 8개 인수 연산',
    },
    'CALCBLOCKD': {
        'inner': [
            {'symbol': 'f(x)', 'label': 'CalcD', 'color': 'purple', 'desc': '확장 수식'},
            {'symbol': 'x₁..x₈', 'label': 'Args', 'color': 'orange', 'desc': '인수'},
        ],
        'flow_type': 'calc',
        'flow_desc': '확장형 사용자 정의 수식 연산',
    },
    'FUNCTION': {
        'inner': [
            {'symbol': 'f(x)', 'label': 'Func', 'color': 'blue', 'desc': '함수 발생기'},
            {'symbol': '⌒', 'label': 'Curve', 'color': 'green', 'desc': '곡선'},
        ],
        'flow_type': 'function_gen',
        'flow_desc': '2차원 함수 발생기 (X→Y 변환 곡선)',
    },

    # === CONTROL ===
    'LEADLAG': {
        'inner': [
            {'symbol': 'sτL', 'label': 'Lead', 'color': 'green', 'desc': '리드'},
            {'symbol': '1/sτ', 'label': 'Lag', 'color': 'red', 'desc': '래그'},
        ],
        'flow_type': 'transfer_func',
        'flow_desc': '(1+sτ_lead)/(1+sτ_lag) 전달함수',
    },
    'PIDFF': {
        'inner': [
            {'symbol': 'Δ', 'label': 'Error', 'color': 'blue', 'desc': '편차계산'},
            {'symbol': 'κ', 'label': 'P', 'color': 'blue', 'desc': '비례'},
            {'symbol': '∫', 'label': 'I', 'color': 'green', 'desc': '적분'},
            {'symbol': 'd/dt', 'label': 'D', 'color': 'red', 'desc': '미분'},
            {'symbol': 'FF', 'label': 'Feed', 'color': 'orange', 'desc': '피드포워드'},
        ],
        'flow_type': 'pidff',
        'flow_desc': 'PID + 피드포워드 보상',
    },
    'PREDICTOR': {
        'inner': [
            {'symbol': 'e⁻ˢᵀ', 'label': 'Delay', 'color': 'red', 'desc': '시간지연 모델'},
            {'symbol': 'G(s)', 'label': 'Plant', 'color': 'blue', 'desc': '프로세스 모델'},
        ],
        'flow_type': 'smith_predictor',
        'flow_desc': 'Smith Predictor 구조로 시간지연 보상',
    },
    'BALANCER': {
        'inner': [
            {'symbol': '⚖', 'label': 'Balance', 'color': 'blue', 'desc': '부하 분배'},
        ],
        'flow_type': 'balancer',
        'flow_desc': '최대 16개 병렬 장비의 부하 균형 제어',
    },
    'INTERP': {
        'inner': [
            {'symbol': '⌒', 'label': 'Interp', 'color': 'blue', 'desc': '보간'},
            {'symbol': 'X→Y', 'label': 'Table', 'color': 'green', 'desc': '테이블'},
        ],
        'flow_type': 'lookup',
        'flow_desc': 'X-Y 데이터 테이블에서 보간하여 출력',
    },

    # === LIMITER ===
    'GAINBIAS': {
        'inner': [
            {'symbol': '×G', 'label': 'Gain', 'color': 'orange', 'desc': '이득'},
            {'symbol': '+B', 'label': 'Bias', 'color': 'green', 'desc': '바이어스'},
            {'symbol': '⌐¬', 'label': 'Limit', 'color': 'red', 'desc': '상하한'},
        ],
        'flow_type': 'gain_limit',
        'flow_desc': '(IN1 × GAIN) + BIAS [상하한 제한]',
    },
    'RATELIMIT': {
        'inner': [
            {'symbol': 'ΔR', 'label': 'Rate', 'color': 'orange', 'desc': '변화율 제한'},
            {'symbol': '⌐¬', 'label': 'Limit', 'color': 'red', 'desc': '제한'},
        ],
        'flow_type': 'rate_limit',
        'flow_desc': '변화율을 RALM 이내로 제한, 초과 시 FOUT=TRUE',
    },

    # === SELECTOR ===
    'HISELECT': {
        'inner': [
            {'symbol': 'MAX', 'label': 'HiSel', 'color': 'green', 'desc': '최대값 선택'},
        ],
        'flow_type': 'selector',
        'flow_desc': '최대 4개 입력 중 가장 큰 값 선택 출력',
    },
    'LOSELECT': {
        'inner': [
            {'symbol': 'MIN', 'label': 'LoSel', 'color': 'blue', 'desc': '최소값 선택'},
        ],
        'flow_type': 'selector',
        'flow_desc': '최대 4개 입력 중 가장 작은 값 선택 출력',
    },
    'MEDIANSEL': {
        'inner': [
            {'symbol': 'M̃', 'label': 'Median', 'color': 'purple', 'desc': '중간값'},
            {'symbol': 'Q', 'label': 'Quality', 'color': 'orange', 'desc': '품질 검사'},
        ],
        'flow_type': 'median',
        'flow_desc': '3개 입력의 중간값 선택 + 품질 감시',
    },
    'SELECTOR': {
        'inner': [
            {'symbol': 'MUX', 'label': 'Select', 'color': 'blue', 'desc': '멀티플렉서'},
        ],
        'flow_type': 'mux',
        'flow_desc': '디지털 입력으로 N개 아날로그 중 하나 선택',
    },
    'TRANSFER': {
        'inner': [
            {'symbol': '⇄', 'label': 'Transfer', 'color': 'blue', 'desc': '전환'},
            {'symbol': 'F', 'label': 'Flag', 'color': 'orange', 'desc': '플래그'},
        ],
        'flow_type': 'transfer',
        'flow_desc': 'FLAG=0→IN1, FLAG=1→IN2 전환 출력',
    },
    'TRNSFNDX': {
        'inner': [
            {'symbol': 'IDX', 'label': 'Index', 'color': 'blue', 'desc': '인덱스 선택'},
        ],
        'flow_type': 'simple',
        'flow_desc': '인덱스로 최대 64개 출력 중 하나 선택',
    },

    # === DIGITAL / TIMER ===
    'ONDELAY': {
        'inner': [
            {'symbol': '⏱↑', 'label': 'OnDly', 'color': 'blue', 'desc': '온 딜레이'},
        ],
        'flow_type': 'timer',
        'flow_desc': '입력 ON 후 설정시간 경과 시 출력 ON',
        'timing': True,
    },
    'OFFDELAY': {
        'inner': [
            {'symbol': '⏱↓', 'label': 'OffDly', 'color': 'red', 'desc': '오프 딜레이'},
        ],
        'flow_type': 'timer',
        'flow_desc': '입력 OFF 후 설정시간 경과 시 출력 OFF',
        'timing': True,
    },
    'ONESHOT': {
        'inner': [
            {'symbol': '⏱¹', 'label': 'OneShot', 'color': 'orange', 'desc': '원샷'},
        ],
        'flow_type': 'timer',
        'flow_desc': '입력 엣지에서 설정시간 동안 펄스 출력',
        'timing': True,
    },
    'COUNTER': {
        'inner': [
            {'symbol': 'CTR', 'label': 'Count', 'color': 'blue', 'desc': '카운터'},
            {'symbol': '↑↓', 'label': 'UpDn', 'color': 'green', 'desc': '업/다운'},
        ],
        'flow_type': 'counter',
        'flow_desc': '펄스를 세어 목표값 도달 시 출력 TRUE',
    },
    'PULSECNT': {
        'inner': [
            {'symbol': '#', 'label': 'Pulse', 'color': 'blue', 'desc': '펄스 카운트'},
        ],
        'flow_type': 'simple',
        'flow_desc': '입력 상승 엣지 카운트, RSET으로 리셋',
    },
    'DEVICEX': {
        'inner': [
            {'symbol': 'DEV', 'label': 'Device', 'color': 'blue', 'desc': '디바이스'},
            {'symbol': 'FB', 'label': 'FeedBack', 'color': 'green', 'desc': '피드백'},
            {'symbol': '⚠', 'label': 'Alarm', 'color': 'red', 'desc': '알람'},
        ],
        'flow_type': 'device',
        'flow_desc': '모터/밸브 기동·정지 + 피드백 감시',
    },
    'DIGITAL': {
        'inner': [
            {'symbol': 'DIG', 'label': 'Digital', 'color': 'blue', 'desc': '디지털 제어'},
            {'symbol': '7M', 'label': 'Modes', 'color': 'orange', 'desc': '7개 모드'},
        ],
        'flow_type': 'digital_device',
        'flow_desc': '최대 7개 모드의 디지털 디바이스 제어',
    },
    'FIFO': {
        'inner': [
            {'symbol': '▸▸▸', 'label': 'FIFO', 'color': 'blue', 'desc': '선입선출'},
        ],
        'flow_type': 'queue',
        'flow_desc': '트리거마다 IN→큐→OUT 이동 (선입선출)',
    },
    'PACK16': {
        'inner': [
            {'symbol': 'D→P', 'label': 'Pack', 'color': 'blue', 'desc': '패킹'},
        ],
        'flow_type': 'simple',
        'flow_desc': '16개 디지털 입력을 하나의 패킹 워드로 합침',
    },
    'UNPACK16': {
        'inner': [
            {'symbol': 'P→D', 'label': 'Unpack', 'color': 'green', 'desc': '언패킹'},
        ],
        'flow_type': 'simple',
        'flow_desc': '패킹 워드를 16개 디지털 출력으로 분리',
    },
    'DIGCOUNT': {
        'inner': [
            {'symbol': '#D', 'label': 'Count', 'color': 'blue', 'desc': '디지털 카운트'},
        ],
        'flow_type': 'simple',
        'flow_desc': '최대 12개 디지털 입력 중 TRUE 개수 카운트',
    },
    'PNTSTATUS': {
        'inner': [
            {'symbol': 'BIT', 'label': 'Status', 'color': 'blue', 'desc': '비트 검사'},
        ],
        'flow_type': 'simple',
        'flow_desc': '지정 비트 위치의 상태를 읽어 출력',
    },
    'MAMODE': {
        'inner': [
            {'symbol': 'M/A', 'label': 'Mode', 'color': 'blue', 'desc': '수동/자동'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'MASTATION의 모드 인터페이스',
    },

    # === MONITOR ===
    'HIGHMON': {
        'inner': [
            {'symbol': '&gt;H', 'label': 'HiMon', 'color': 'red', 'desc': '상한 감시'},
        ],
        'flow_type': 'monitor',
        'flow_desc': 'IN1 > HISP이면 알람 (히스테리시스 적용)',
    },
    'LOWMON': {
        'inner': [
            {'symbol': '&lt;L', 'label': 'LoMon', 'color': 'blue', 'desc': '하한 감시'},
        ],
        'flow_type': 'monitor',
        'flow_desc': 'IN1 < LOSP이면 알람 (히스테리시스 적용)',
    },
    'HIGHLOWMON': {
        'inner': [
            {'symbol': '&gt;H', 'label': 'Hi', 'color': 'red', 'desc': '상한'},
            {'symbol': '&lt;L', 'label': 'Lo', 'color': 'blue', 'desc': '하한'},
        ],
        'flow_type': 'monitor',
        'flow_desc': '상한/하한 동시 감시 (개별 히스테리시스)',
    },
    'RATEMON': {
        'inner': [
            {'symbol': 'Δ/t', 'label': 'Rate', 'color': 'orange', 'desc': '변화율 감시'},
        ],
        'flow_type': 'monitor',
        'flow_desc': '변화율이 설정값 초과 시 알람',
    },
    'ALARMMON': {
        'inner': [
            {'symbol': '⚠×16', 'label': 'Alarm', 'color': 'red', 'desc': '알람 통합'},
        ],
        'flow_type': 'simple',
        'flow_desc': '최대 16개 포인트 알람 상태 OR 감시',
    },
    'ANNUNCIATOR': {
        'inner': [
            {'symbol': '⚠', 'label': 'Ann', 'color': 'red', 'desc': '경보'},
            {'symbol': '♪', 'label': 'Horn', 'color': 'orange', 'desc': '경보음'},
        ],
        'flow_type': 'annunciator',
        'flow_desc': '알람 입력 + ACK/RSET/TEST로 경보창 제어',
    },
    'DBEQUALS': {
        'inner': [
            {'symbol': '≈', 'label': 'DBEq', 'color': 'blue', 'desc': '근사 비교'},
        ],
        'flow_type': 'simple',
        'flow_desc': '두 값의 차이가 데드밴드 이내면 TRUE',
    },
    'BILLFLOW': {
        'inner': [
            {'symbol': '∫Q', 'label': 'Total', 'color': 'blue', 'desc': '적산'},
        ],
        'flow_type': 'simple',
        'flow_desc': '유량 적산 + 일일 리셋',
    },
    'QUALITYMON': {
        'inner': [
            {'symbol': 'Q?', 'label': 'QMon', 'color': 'purple', 'desc': '품질 검사'},
        ],
        'flow_type': 'simple',
        'flow_desc': '입력 품질이 BAD이면 OUT=TRUE',
    },

    # === IO ===
    'MASTATION': {
        'inner': [
            {'symbol': 'M', 'label': 'Manual', 'color': 'orange', 'desc': '수동'},
            {'symbol': 'A', 'label': 'Auto', 'color': 'green', 'desc': '자동'},
            {'symbol': '⇄', 'label': 'Switch', 'color': 'blue', 'desc': '전환'},
        ],
        'flow_type': 'mastation',
        'flow_desc': '수동/자동 운전 스테이션 (범프리스 전환)',
    },
    'SETPOINT': {
        'inner': [
            {'symbol': 'SP', 'label': 'SetPt', 'color': 'blue', 'desc': '설정값'},
            {'symbol': '⌐¬', 'label': 'Limit', 'color': 'red', 'desc': '상하한'},
        ],
        'flow_type': 'simple',
        'flow_desc': '소프트/하드 수동 로더 (상하한 제한 포함)',
    },
    'FIELD': {
        'inner': [
            {'symbol': 'I/O', 'label': 'Field', 'color': 'blue', 'desc': 'I/O 인터페이스'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'I/O 포인트 필드 인터페이스',
    },
    'ASSIGN': {
        'inner': [
            {'symbol': ':=', 'label': 'Assign', 'color': 'blue', 'desc': '값 전송'},
        ],
        'flow_type': 'simple',
        'flow_desc': '프로세스 포인트의 값과 품질을 다른 포인트로 전송',
    },
    'ATREND': {
        'inner': [
            {'symbol': '📈', 'label': 'Trend', 'color': 'blue', 'desc': '트렌딩'},
        ],
        'flow_type': 'simple',
        'flow_desc': '포인트 값을 스트립 차트 레코더로 출력',
    },
    'KEYBOARD': {
        'inner': [
            {'symbol': '⌨', 'label': 'Key', 'color': 'blue', 'desc': '키 인터페이스'},
        ],
        'flow_type': 'simple',
        'flow_desc': '프로그래머블 키 인터페이스',
    },
    'BCDNIN': {
        'inner': [
            {'symbol': 'BCD→', 'label': 'In', 'color': 'blue', 'desc': 'BCD 입력'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'N자리 BCD 입력을 실수로 변환',
    },
    'BCDNOUT': {
        'inner': [
            {'symbol': '→BCD', 'label': 'Out', 'color': 'green', 'desc': 'BCD 출력'},
        ],
        'flow_type': 'simple',
        'flow_desc': '실수를 N자리 BCD로 변환하여 출력',
    },
    'SLCAIN': {
        'inner': [{'symbol': 'AI', 'label': 'SLC', 'color': 'blue', 'desc': 'QLC 아날로그 입력'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 아날로그 입력',
    },
    'SLCAOUT': {
        'inner': [{'symbol': 'AO', 'label': 'SLC', 'color': 'green', 'desc': 'QLC 아날로그 출력'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 아날로그 출력',
    },
    'SLCDIN': {
        'inner': [{'symbol': 'DI', 'label': 'SLC', 'color': 'blue', 'desc': 'QLC 디지털 입력'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 디지털 입력',
    },
    'SLCDOUT': {
        'inner': [{'symbol': 'DO', 'label': 'SLC', 'color': 'green', 'desc': 'QLC 디지털 출력'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 디지털 출력',
    },
    'SLCPIN': {
        'inner': [{'symbol': 'PI', 'label': 'SLC', 'color': 'blue', 'desc': 'QLC 패킹 입력'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 패킹 입력',
    },
    'SLCPOUT': {
        'inner': [{'symbol': 'PO', 'label': 'SLC', 'color': 'green', 'desc': 'QLC 패킹 출력'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 패킹 출력',
    },
    'SLCSTATUS': {
        'inner': [{'symbol': 'ST', 'label': 'SLC', 'color': 'orange', 'desc': 'QLC 상태'}],
        'flow_type': 'simple', 'flow_desc': 'QLC/LC 카드 상태 조회',
    },

    # === SEQUENCER ===
    'ANALOGDRUM': {
        'inner': [
            {'symbol': '⊞', 'label': 'Drum', 'color': 'blue', 'desc': '드럼'},
            {'symbol': '▶', 'label': 'Step', 'color': 'green', 'desc': '스텝'},
        ],
        'flow_type': 'sequencer',
        'flow_desc': '최대 30스텝의 아날로그 출력 시퀀스',
    },
    'DIGDRUM': {
        'inner': [
            {'symbol': '⊞', 'label': 'Drum', 'color': 'blue', 'desc': '드럼'},
            {'symbol': 'D16', 'label': 'Digital', 'color': 'orange', 'desc': '디지털 출력'},
        ],
        'flow_type': 'sequencer',
        'flow_desc': '최대 30스텝의 디지털 16비트 출력 시퀀스',
    },
    'MASTERSEQ': {
        'inner': [
            {'symbol': 'MST', 'label': 'Master', 'color': 'blue', 'desc': '마스터'},
            {'symbol': '→', 'label': 'Seq', 'color': 'green', 'desc': '시퀀스'},
        ],
        'flow_type': 'master_seq',
        'flow_desc': '단계별 자동 시퀀스 제어 (마스터)',
    },
    'DEVICESEQ': {
        'inner': [
            {'symbol': 'DSQ', 'label': 'Device', 'color': 'orange', 'desc': '디바이스'},
        ],
        'flow_type': 'simple',
        'flow_desc': '마스터 시퀀서의 각 디바이스 제어',
    },
    'STEPTIME': {
        'inner': [
            {'symbol': '⏱▶', 'label': 'Timer', 'color': 'blue', 'desc': '스텝 타이머'},
        ],
        'flow_type': 'simple',
        'flow_desc': '자동 스텝 진행 타이머',
    },
    'TRANSLATOR': {
        'inner': [
            {'symbol': '⊞→', 'label': 'Trans', 'color': 'blue', 'desc': '번역기'},
        ],
        'flow_type': 'simple',
        'flow_desc': '입력 코드를 출력 코드로 번역 (셀렉터+시퀀서)',
    },

    # === STEAM ===
    'STEAMFLOW': {
        'inner': [
            {'symbol': '√ΔP', 'label': 'Flow', 'color': 'blue', 'desc': '유량 보상'},
            {'symbol': 'T,P', 'label': 'Comp', 'color': 'orange', 'desc': '온도/압력'},
        ],
        'flow_type': 'steam',
        'flow_desc': '차압 기반 유량 측정 + 온도/압력 보상',
    },
    'STEAMTABLE': {
        'inner': [
            {'symbol': 'H₂O', 'label': 'Steam', 'color': 'blue', 'desc': '수증기 물성'},
        ],
        'flow_type': 'steam_table',
        'flow_desc': '온도/압력으로 수증기 열역학 성질 조회',
    },
    'GASFLOW': {
        'inner': [
            {'symbol': 'AGA3', 'label': 'Gas', 'color': 'blue', 'desc': '가스 유량'},
        ],
        'flow_type': 'simple',
        'flow_desc': 'AGA3 규격 오리피스 가스 유량 계산',
    },
    'LEVELCOMP': {
        'inner': [
            {'symbol': '▽', 'label': 'Level', 'color': 'blue', 'desc': '레벨 보상'},
        ],
        'flow_type': 'simple',
        'flow_desc': '보일러 드럼 수위 밀도 보상',
    },

    # === OTHER ===
    'ANALOG': {
        'inner': [
            {'symbol': 'ALC', 'label': 'Analog', 'color': 'blue', 'desc': '아날로그 제어'},
        ],
        'flow_type': 'simple',
        'flow_desc': '로컬 아날로그 루프 컨트롤러 인터페이스',
    },
    'AVALGEN': {
        'inner': [
            {'symbol': 'V=', 'label': 'AVal', 'color': 'blue', 'desc': '아날로그 값'},
        ],
        'flow_type': 'simple',
        'flow_desc': '아날로그 포인트를 지정 값으로 초기화',
    },
    'DVALGEN': {
        'inner': [
            {'symbol': 'D=', 'label': 'DVal', 'color': 'green', 'desc': '디지털 값'},
        ],
        'flow_type': 'simple',
        'flow_desc': '디지털 포인트를 지정 값으로 초기화',
    },
    'TRANSPORT': {
        'inner': [
            {'symbol': 'e⁻ˢᵀ', 'label': 'Delay', 'color': 'red', 'desc': '시간지연'},
        ],
        'flow_type': 'simple',
        'flow_desc': '순수 전송 시간 지연 (Dead Time)',
    },
    'LATCHQUAL': {
        'inner': [
            {'symbol': 'Q↓', 'label': 'Latch', 'color': 'purple', 'desc': '품질 래치'},
        ],
        'flow_type': 'simple',
        'flow_desc': '포인트 품질을 BAD로 래치 또는 해제',
    },
    'X3STEP': {
        'inner': [
            {'symbol': '±ε', 'label': '3Step', 'color': 'blue', 'desc': '3단 제어'},
        ],
        'flow_type': 'simple',
        'flow_desc': '허용 오차 내 디바이스 위치 제어',
    },
    'SYSTEMTIME': {
        'inner': [
            {'symbol': '🕐', 'label': 'Time', 'color': 'blue', 'desc': '시스템 시간'},
        ],
        'flow_type': 'simple',
        'flow_desc': '시스템 날짜/시간을 포인트에 저장',
    },
    'TIMECHANGE': {
        'inner': [
            {'symbol': 'Δt', 'label': 'TChg', 'color': 'orange', 'desc': '시간 변경 감지'},
        ],
        'flow_type': 'simple',
        'flow_desc': '시스템 시간 변경 감지',
    },
    'TIMEDETECT': {
        'inner': [
            {'symbol': '⏰', 'label': 'TDet', 'color': 'blue', 'desc': '시간 검출'},
        ],
        'flow_type': 'simple',
        'flow_desc': '지정 시간/요일에 펄스 출력',
    },
    'TIMEMON': {
        'inner': [
            {'symbol': '⏱P', 'label': 'TMon', 'color': 'blue', 'desc': '시간 펄스'},
        ],
        'flow_type': 'simple',
        'flow_desc': '시스템 시간 기반 주기 펄스 생성',
    },
    'DROPSTATUS': {
        'inner': [
            {'symbol': 'DRP', 'label': 'Drop', 'color': 'red', 'desc': '드롭 상태'},
        ],
        'flow_type': 'simple',
        'flow_desc': '드롭 통신 레코드 상태 조회',
    },
    'DRPI': {
        'inner': [
            {'symbol': '▽%', 'label': 'DRPI', 'color': 'blue', 'desc': '댐퍼/밸브 표시'},
        ],
        'flow_type': 'simple',
        'flow_desc': '댐퍼/밸브 개도 표시기',
    },
    'RVPSTATUS': {
        'inner': [
            {'symbol': 'RVP', 'label': 'Valve', 'color': 'blue', 'desc': '밸브 상태'},
        ],
        'flow_type': 'simple',
        'flow_desc': '밸브 포지셔너 카드 상태 조회',
    },
    'RPACNT': {
        'inner': [
            {'symbol': 'RPA#', 'label': 'Count', 'color': 'blue', 'desc': '펄스 누적'}],
        'flow_type': 'simple', 'flow_desc': '펄스 어큐뮬레이터 카운트',
    },
    'RPAWIDTH': {
        'inner': [
            {'symbol': 'RPAw', 'label': 'Width', 'color': 'blue', 'desc': '펄스 폭'}],
        'flow_type': 'simple', 'flow_desc': '펄스 어큐뮬레이터 폭 측정',
    },
    'SATOSP': {
        'inner': [
            {'symbol': 'A→P', 'label': 'AtoP', 'color': 'blue', 'desc': '아날로그→패킹'}],
        'flow_type': 'simple', 'flow_desc': '아날로그 값을 패킹 디지털로 전송',
    },
    'SPTOSA': {
        'inner': [
            {'symbol': 'P→A', 'label': 'PtoA', 'color': 'green', 'desc': '패킹→아날로그'}],
        'flow_type': 'simple', 'flow_desc': '패킹 디지털을 아날로그 값으로 전송',
    },
}

# 증기 테이블 심볼 (유사 구조)
for st_sym in ['HSCLTP','HSLT','HSTVSVP','HSVSSTP','PSLT','PSVS','SSLT','TSLH','TSLP','VCLTP','VSLT']:
    SYMBOL_CONFIG[st_sym] = {
        'inner': [{'symbol': 'H₂O', 'label': 'Steam', 'color': 'blue', 'desc': '수증기 물성'}],
        'flow_type': 'simple',
        'flow_desc': '수증기/물 열역학 성질 변환',
    }


# ============================================================
# SVG 생성 함수들
# ============================================================

def make_marker_defs(mid):
    """화살표 마커 정의"""
    return f'''<defs>
<marker id="{mid}_a1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#4fc3f7"/></marker>
<marker id="{mid}_a2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#ff9800"/></marker>
<marker id="{mid}_a3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.4)"/></marker>
<marker id="{mid}_a4" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#10b981"/></marker>
<marker id="{mid}_a5" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#a78bfa"/></marker>
<marker id="{mid}_a6" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#e94560"/></marker>
</defs>'''


def get_color(name):
    """색상 이름에서 hex와 rgba 프리픽스 반환"""
    return COLORS.get(name, COLORS['blue'])


def generate_functional_svg(sym_id, sym_data, config):
    """내부 기능 블록이 있는 Functional Symbol SVG 생성"""
    mid = sym_id.lower()
    ports = sym_data.get('ports', [])
    inner = config.get('inner', [])

    # 포트 분류
    main_ins = []
    params = []
    tracks = []
    main_outs = []
    aux_outs = []

    MAIN_IN_NAMES = {'IN1','IN2','IN3','IN4','IN5','IN6','IN7','IN8',
                     'PV','STPT','SP','MEAS','FLAG','T','A','B','N',
                     'SET','RSET','CLR','ENBL','ACK','TEST','INC','DEC',
                     'HOLD','AUTO','MAN','CASC','IN','INIT','SRST',
                     'FLOW','TEMP','PRES','ENTHALPY','ENTROPY','VOLUME',
                     'MSTR','FAIL','PASS','RDY','D0','D1','D2','D3',
                     'TRND','CARD','PACK','PBPT','HWPT',
                     'PLW','PRA','LWI','RAI','MRE',
                     'RSET','HCHG','MCHG','SCHG',
                     'SEC','MIN','HOUR','DAYM','MNTH','YEAR',
                     'IN9','IN10','IN11','IN12','IN16',
                     'PROQ','UNIT'}
    PARAM_NAMES = {'DIAG','GAIN','BIAS','TPSC','BTSC','TRAT',
                   'PGAIN','INTG','DGAIN','DRAT','DRATE','BASE',
                   'TARG','QUAL','TYPE','ACT','DACT','MODE',
                   'HYST','DBND','HILM','LOLM','HISP','HIDB',
                   'LOSP','LODB','PRAT','PDB','NRAT','NDB',
                   'RALM','SMTH','SCAL','LEAD','LAG','RCNT',
                   'NMIN','CNTL','NUMR','TIME','NUM','NSAM','TSAM',
                   'MTRU','TMOD','CARD','LENG','PCI',
                   'VCAL','XDO','DI','PB','RTRN',
                   'CHK','STAT','BITA','BITB','BITP','NDIG',
                   'SPRI','PFID','DEVO','PCNT','SHF1','SHF2','SHF3',
                   'WEEK','HR2','MIN2','SEC2','SHR','MNIN','GAP',
                   'TOPG','FUEL','ALRM','PHRN','HMTR','CNDB','ALDB',
                   'PT','EM'}
    TRACK_NAMES = {'TRIN','TRIN1','TRIN2','TRIN3'}
    OUTPUT_MAIN = {'OUT','OUT1','OUT2','OUT3','TOUT','DEVA','MV',
                   'YES','NO','OUTA','OUTB','OUTG','OUTL',
                   'FOUT','FLAG','AOUT','POUT','YOUT',
                   'RUN','MAXS','MAX','OTRK','FFB','DOUT','STRK'}

    for p in ports:
        name = p['name']
        direction = p.get('direction', 'input')
        upper = name.upper()

        if direction == 'output':
            if upper in OUTPUT_MAIN or upper.startswith('OUT') or upper == 'TOUT':
                main_outs.append(name)
            else:
                aux_outs.append(name)
        elif upper in TRACK_NAMES:
            tracks.append(name)
        elif upper in MAIN_IN_NAMES or (upper.startswith('IN') and upper not in PARAM_NAMES):
            main_ins.append(name)
        elif upper in PARAM_NAMES or upper.endswith('G') or upper.endswith('B'):
            # G/B 접미사지만 IN으로 시작하지 않는 것만
            if not upper.startswith('IN'):
                params.append(name)
            else:
                params.append(name)
        else:
            params.append(name)

    # Gain/Bias 패턴 (IN1G, IN1B 등)을 파라미터로 이동
    gain_bias = [n for n in main_ins if len(n) > 2 and (n.endswith('G') or n.endswith('B')) and n not in ('FLAG',)]
    main_ins = [n for n in main_ins if n not in gain_bias]
    params = gain_bias + params

    # TOUT를 main_outs에서 상단 출력으로 분리
    tout_items = [n for n in main_outs if n.upper() == 'TOUT']
    main_outs = [n for n in main_outs if n.upper() != 'TOUT']

    # 최대 표시 포트 수 제한
    main_ins = main_ins[:6]
    params = params[:8]
    main_outs_show = main_outs[:4]
    aux_show = aux_outs[:4]

    # 내부 서브블록 크기 계산
    n_inner = len(inner)
    sub_w = max(50, 160 // max(n_inner, 1))
    inner_total_w = n_inner * (sub_w + 5) - 5 if n_inner else 0

    # 블록 크기
    box_w = max(180, inner_total_w + 50, len(main_ins) * 55 + 30)
    box_h = max(100, len(params) * 22 + 40) if n_inner <= 1 else max(130, len(params) * 22 + 40)

    pad_left = 110 if params else 30
    pad_top = 50 if (main_ins or tout_items) else 20
    pad_bottom = 55 if main_outs_show else 20
    pad_right = 90 if aux_show else 40

    svg_w = pad_left + box_w + pad_right
    svg_h = pad_top + box_h + pad_bottom + (25 if tracks else 0)

    bx = pad_left
    by = pad_top
    cx = bx + box_w / 2

    els = []
    els.append(f'<svg viewBox="0 0 {svg_w} {svg_h}" style="width:100%; max-width:{svg_w}px; display:block; margin:12px auto;">')
    els.append(make_marker_defs(mid))

    # 타이틀
    els.append(f'<text x="{svg_w/2}" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ Functional Symbol</text>')

    # 메인 박스
    els.append(f'<rect x="{bx}" y="{by}" width="{box_w}" height="{box_h}" rx="6" fill="rgba(79,195,247,0.06)" stroke="rgba(79,195,247,0.3)" stroke-width="1.5"/>')

    # 내부 서브블록
    if inner:
        if n_inner == 1:
            # 단일 블록 - 중앙에 큰 기호
            ib = inner[0]
            hex_c, _ = get_color(ib['color'])
            els.append(f'<rect x="{bx+15}" y="{by+15}" width="{box_w-30}" height="{box_h-30}" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>')
            els.append(f'<text x="{cx}" y="{by + box_h/2 + 8}" fill="{hex_c}" font-size="22" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>')
        elif n_inner == 2:
            # 2블록 - 좌우 또는 상하
            half_w = (box_w - 40) / 2
            for i, ib in enumerate(inner):
                hex_c, rgba_c = get_color(ib['color'])
                sx = bx + 15 + i * (half_w + 10)
                sy = by + 15
                sh = box_h - 30
                els.append(f'<rect x="{sx}" y="{sy}" width="{half_w}" height="{sh}" rx="4" fill="{rgba_c}0.08)" stroke="{hex_c}" stroke-width="1" stroke-opacity="0.4"/>')
                els.append(f'<text x="{sx + half_w/2}" y="{sy + sh/2 - 2}" fill="{hex_c}" font-size="16" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>')
                els.append(f'<text x="{sx + half_w/2}" y="{sy + sh/2 + 14}" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">{ib["desc"]}</text>')
        else:
            # 3+ 블록 - 상단 메인 + 하단 서브블록 (PID 스타일)
            # 상단 메인 블록
            main_h = (box_h - 30) * 0.4
            els.append(f'<rect x="{bx+15}" y="{by+10}" width="{box_w-30}" height="{main_h}" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>')
            hex0, _ = get_color(inner[0]['color'])
            els.append(f'<text x="{cx}" y="{by + 10 + main_h/2 + 6}" fill="{hex0}" font-size="18" text-anchor="middle" font-weight="bold">{inner[0]["symbol"]}</text>')

            # 하단 서브블록들
            sub_blocks = inner[1:]
            sub_n = len(sub_blocks)
            sw = (box_w - 30 - (sub_n - 1) * 5) / sub_n
            sub_y = by + 10 + main_h + 8
            sub_h = box_h - 30 - main_h - 8

            for i, ib in enumerate(sub_blocks):
                hex_c, rgba_c = get_color(ib['color'])
                sx = bx + 15 + i * (sw + 5)
                els.append(f'<rect x="{sx}" y="{sub_y}" width="{sw}" height="{sub_h}" rx="4" fill="{rgba_c}0.1)" stroke="{rgba_c}0.3)" stroke-width="1"/>')
                els.append(f'<text x="{sx + sw/2}" y="{sub_y + sub_h/2 + 5}" fill="{hex_c}" font-size="13" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>')

    # === 상단: 주요 입력 + TOUT ===
    top_items = main_ins[:5]
    if tout_items:
        top_items = tout_items + top_items
    if top_items:
        spacing = box_w / (len(top_items) + 1)
        for i, name in enumerate(top_items):
            px = bx + spacing * (i + 1)
            is_tout = name.upper() == 'TOUT'
            if is_tout:
                els.append(f'<text x="{px}" y="{by - 22}" fill="#a78bfa" font-size="11" font-weight="600" text-anchor="middle">{name}</text>')
                els.append(f'<line x1="{px}" y1="{by}" x2="{px}" y2="{by - 15}" stroke="#a78bfa" stroke-width="1.5" marker-end="url(#{mid}_a5)"/>')
            else:
                els.append(f'<text x="{px}" y="{by - 22}" fill="#ff9800" font-size="11" font-weight="600" text-anchor="middle">{name}</text>')
                els.append(f'<line x1="{px}" y1="{by - 15}" x2="{px}" y2="{by}" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}_a2)"/>')

    # === 왼쪽: 파라미터 (점선) ===
    if params:
        p_spacing = min(22, (box_h - 10) / (len(params) + 1))
        start_y = by + (box_h - p_spacing * len(params)) / 2
        for i, name in enumerate(params):
            py = start_y + p_spacing * (i + 0.5)
            els.append(f'<text x="{bx - 70}" y="{py + 4}" fill="rgba(255,255,255,0.5)" font-size="9" text-anchor="start">{name}</text>')
            els.append(f'<line x1="{bx - 15}" y1="{py}" x2="{bx}" y2="{py}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#{mid}_a3)"/>')

    # === 하단: 주요 출력 ===
    if main_outs_show:
        spacing = box_w / (len(main_outs_show) + 1)
        for i, name in enumerate(main_outs_show):
            px = bx + spacing * (i + 1)
            els.append(f'<line x1="{px}" y1="{by + box_h}" x2="{px}" y2="{by + box_h + 25}" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}_a1)"/>')
            els.append(f'<text x="{px}" y="{by + box_h + 42}" fill="#4fc3f7" font-size="12" text-anchor="middle" font-weight="bold">{name}</text>')

    # === 하단 점선: 트래킹 ===
    if tracks:
        for i, name in enumerate(tracks):
            px = bx + 30 + i * 50
            ty = by + box_h + 48
            els.append(f'<text x="{px - 10}" y="{ty + 12}" fill="rgba(255,255,255,0.4)" font-size="10">{name}</text>')
            els.append(f'<line x1="{px}" y1="{ty}" x2="{px}" y2="{by + box_h + 5}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#{mid}_a3)"/>')

    # === 오른쪽: 보조 출력 ===
    if aux_show:
        a_spacing = box_h / (len(aux_show) + 1)
        for i, name in enumerate(aux_show):
            py = by + a_spacing * (i + 1)
            els.append(f'<line x1="{bx + box_w}" y1="{py}" x2="{bx + box_w + 40}" y2="{py}" stroke="#10b981" stroke-width="1.5" marker-end="url(#{mid}_a4)"/>')
            els.append(f'<text x="{bx + box_w + 48}" y="{py + 4}" fill="#10b981" font-size="11" font-weight="600">{name}</text>')

    els.append('</svg>')
    return ''.join(els)


def generate_flow_svg(sym_id, sym_data, config):
    """신호 흐름도 SVG 생성"""
    mid = sym_id.lower()
    flow_type = config.get('flow_type', 'simple')
    flow_desc = config.get('flow_desc', '')
    formula = sym_data.get('formula', '')
    inner = config.get('inner', [])

    # 흐름도 타입에 따른 생성
    if flow_type == 'simple':
        return _flow_simple(mid, sym_id, sym_data, config)
    elif flow_type == 'logic_gate':
        return _flow_logic(mid, sym_id, sym_data, config)
    elif flow_type == 'arithmetic_chain':
        return _flow_arithmetic(mid, sym_id, sym_data, config)
    elif flow_type == 'timer':
        return _flow_timer(mid, sym_id, sym_data, config)
    elif flow_type == 'monitor':
        return _flow_monitor(mid, sym_id, sym_data, config)
    elif flow_type == 'transfer':
        return _flow_transfer(mid, sym_id, sym_data, config)
    elif flow_type == 'selector':
        return _flow_selector(mid, sym_id, sym_data, config)
    elif flow_type == 'device':
        return _flow_device(mid, sym_id, sym_data, config)
    elif flow_type == 'sr_latch':
        return _flow_sr_latch(mid, sym_id, sym_data, config)
    elif flow_type == 'mastation':
        return _flow_mastation(mid, sym_id, sym_data, config)
    elif flow_type == 'sequencer':
        return _flow_sequencer(mid, sym_id, sym_data, config)
    elif flow_type in ('filter', 'gain_limit', 'rate_limit'):
        return _flow_filter(mid, sym_id, sym_data, config)
    elif flow_type == 'transfer_func':
        return _flow_transfer_func(mid, sym_id, sym_data, config)
    else:
        return _flow_simple(mid, sym_id, sym_data, config)


def _flow_simple(mid, sym_id, sym_data, config):
    """단순 IN → [처리] → OUT 흐름"""
    inner = config.get('inner', [{}])
    ib = inner[0] if inner else {'symbol': sym_id, 'color': 'blue'}
    hex_c, rgba_c = get_color(ib['color'])
    flow_desc = config.get('flow_desc', '')

    svg = f'''<svg viewBox="0 0 480 100" style="width:100%; max-width:480px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="240" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 신호 흐름도</text>
<text x="30" y="58" fill="#ff9800" font-size="12" font-weight="bold">IN</text>
<line x1="50" y1="54" x2="130" y2="54" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="135" y="34" width="180" height="40" rx="6" fill="{rgba_c}0.1)" stroke="{hex_c}" stroke-width="1.5"/>
<text x="225" y="59" fill="{hex_c}" font-size="14" text-anchor="middle" font-weight="bold">{ib['symbol']}</text>
<line x1="315" y1="54" x2="400" y2="54" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="420" y="58" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<text x="225" y="90" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{flow_desc}</text>
</svg>'''
    return svg


def _flow_logic(mid, sym_id, sym_data, config):
    """로직 게이트 흐름 + 타이밍 다이어그램"""
    inner = config.get('inner', [{}])
    ib = inner[0]
    hex_c, rgba_c = get_color(ib['color'])

    svg = f'''<svg viewBox="0 0 520 180" style="width:100%; max-width:520px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="260" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 신호 흐름 + 타이밍</text>
<text x="20" y="50" fill="#ff9800" font-size="11" font-weight="600">IN1</text>
<line x1="50" y1="46" x2="130" y2="46" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<text x="20" y="75" fill="#ff9800" font-size="11" font-weight="600">IN2</text>
<line x1="50" y1="71" x2="130" y2="71" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="135" y="30" width="100" height="60" rx="8" fill="{rgba_c}0.1)" stroke="{hex_c}" stroke-width="1.5"/>
<text x="185" y="66" fill="{hex_c}" font-size="20" text-anchor="middle" font-weight="bold">{ib['symbol']}</text>
<line x1="235" y1="60" x2="320" y2="60" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="335" y="64" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<line x1="30" y1="110" x2="490" y2="110" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<text x="20" y="130" fill="#ff9800" font-size="9">IN1</text>
<polyline points="50,140 50,125 120,125 120,140 190,140 190,125 260,125 260,140 330,140" fill="none" stroke="#ff9800" stroke-width="1.5"/>
<text x="20" y="155" fill="#ff9800" font-size="9">IN2</text>
<polyline points="50,165 50,150 85,150 85,165 155,165 155,150 225,150 225,165 295,165 295,150 330,150" fill="none" stroke="#ff9800" stroke-width="1.2"/>
<text x="20" y="178" fill="#4fc3f7" font-size="9">OUT</text>'''

    # AND/OR/XOR별 타이밍 패턴
    if sym_id == 'AND':
        svg += f'\n<polyline points="50,190 50,190 120,190 120,190 190,190 190,175 225,175 225,190 260,190 260,175 295,175 295,190 330,190" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>'
    elif sym_id == 'OR':
        svg += f'\n<polyline points="50,190 50,175 155,175 155,190 190,190 190,175 330,175 330,190" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>'
    elif sym_id == 'XOR':
        svg += f'\n<polyline points="50,190 50,175 85,175 85,190 120,190 120,175 155,175 155,190 190,190 190,190 225,190 225,175 260,175 260,190 295,190 295,190 330,190" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>'
    else:
        svg += f'\n<polyline points="50,190 50,175 330,175 330,190" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>'

    svg += '\n</svg>'
    return svg


def _flow_arithmetic(mid, sym_id, sym_data, config):
    """산술 연산 체인 흐름"""
    inner = config.get('inner', [])
    formula = sym_data.get('formula', '')

    svg = f'''<svg viewBox="0 0 600 120" style="width:100%; max-width:600px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="300" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 연산 흐름도</text>
<text x="15" y="48" fill="#ff9800" font-size="11" font-weight="600">IN1</text>
<line x1="40" y1="44" x2="80" y2="44" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<text x="15" y="73" fill="#ff9800" font-size="11" font-weight="600">IN2</text>
<line x1="40" y1="69" x2="80" y2="69" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>'''

    # 연산 블록 체인
    x_pos = 85
    for i, ib in enumerate(inner):
        hex_c, rgba_c = get_color(ib['color'])
        w = 90
        svg += f'\n<rect x="{x_pos}" y="30" width="{w}" height="55" rx="5" fill="{rgba_c}0.1)" stroke="{hex_c}" stroke-width="1.5"/>'
        svg += f'\n<text x="{x_pos + w/2}" y="52" fill="{hex_c}" font-size="16" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>'
        svg += f'\n<text x="{x_pos + w/2}" y="72" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">{ib["desc"]}</text>'

        if i < len(inner) - 1:
            svg += f'\n<line x1="{x_pos + w}" y1="57" x2="{x_pos + w + 20}" y2="57" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>'
        x_pos += w + 20

    svg += f'\n<line x1="{x_pos - 15}" y1="57" x2="{x_pos + 30}" y2="57" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>'
    svg += f'\n<text x="{x_pos + 45}" y="61" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>'

    # 수식 표시
    if formula:
        safe_formula = formula.replace('<', '&lt;').replace('>', '&gt;')
        svg += f'\n<text x="300" y="108" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="middle">{safe_formula[:80]}</text>'

    svg += '\n</svg>'
    return svg


def _flow_timer(mid, sym_id, sym_data, config):
    """타이머 타이밍 다이어그램"""
    inner = config.get('inner', [{}])
    ib = inner[0]
    hex_c, _ = get_color(ib['color'])

    # 타이머 종류별 타이밍 패턴
    if sym_id == 'ONDELAY':
        in_pattern = "50,140 50,125 200,125 200,140 350,140"
        out_pattern = "50,170 150,170 150,155 200,155 200,170 350,170"
        delay_label = "지연"
        delay_x1, delay_x2 = 50, 150
    elif sym_id == 'OFFDELAY':
        in_pattern = "50,140 50,125 150,125 150,140 350,140"
        out_pattern = "50,170 50,155 250,155 250,170 350,170"
        delay_label = "지연"
        delay_x1, delay_x2 = 150, 250
    else:  # ONESHOT
        in_pattern = "50,140 50,125 80,125 80,140 350,140"
        out_pattern = "50,170 50,155 200,155 200,170 350,170"
        delay_label = "펄스 폭"
        delay_x1, delay_x2 = 50, 200

    svg = f'''<svg viewBox="0 0 420 190" style="width:100%; max-width:420px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="210" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 타이밍 다이어그램</text>
<text x="15" y="58" fill="#ff9800" font-size="12" font-weight="600">IN1</text>
<line x1="45" y1="54" x2="110" y2="54" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="115" y="34" width="120" height="40" rx="6" fill="rgba(79,195,247,0.1)" stroke="{hex_c}" stroke-width="1.5"/>
<text x="175" y="59" fill="{hex_c}" font-size="14" text-anchor="middle" font-weight="bold">{ib['symbol']}</text>
<line x1="235" y1="54" x2="320" y2="54" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="335" y="58" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<line x1="30" y1="105" x2="380" y2="105" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<text x="25" y="120" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="end">t</text>
<text x="25" y="135" fill="#ff9800" font-size="9" text-anchor="end">IN1</text>
<polyline points="{in_pattern}" fill="none" stroke="#ff9800" stroke-width="1.5"/>
<text x="25" y="165" fill="#4fc3f7" font-size="9" text-anchor="end">OUT</text>
<polyline points="{out_pattern}" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>
<line x1="{delay_x1}" y1="178" x2="{delay_x2}" y2="178" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<line x1="{delay_x1}" y1="175" x2="{delay_x1}" y2="181" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<line x1="{delay_x2}" y1="175" x2="{delay_x2}" y2="181" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="{(delay_x1+delay_x2)/2}" y="188" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">{delay_label}</text>
</svg>'''
    return svg


def _flow_monitor(mid, sym_id, sym_data, config):
    """모니터/알람 흐름"""
    inner = config.get('inner', [{}])
    ib = inner[0]
    hex_c, rgba_c = get_color(ib['color'])

    svg = f'''<svg viewBox="0 0 500 140" style="width:100%; max-width:500px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="250" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 감시 동작 흐름</text>
<text x="15" y="55" fill="#ff9800" font-size="11" font-weight="600">IN1</text>
<line x1="45" y1="51" x2="110" y2="51" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="115" y="30" width="130" height="50" rx="6" fill="{rgba_c}0.1)" stroke="{hex_c}" stroke-width="1.5"/>
<text x="180" y="60" fill="{hex_c}" font-size="16" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>
<line x1="245" y1="55" x2="310" y2="55" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<rect x="315" y="38" width="70" height="34" rx="4" fill="rgba(233,69,96,0.1)" stroke="#e94560" stroke-width="1"/>
<text x="350" y="60" fill="#e94560" font-size="12" text-anchor="middle" font-weight="bold">ALARM</text>
<line x1="385" y1="55" x2="440" y2="55" stroke="#e94560" stroke-width="1.5" marker-end="url(#{mid}f_a6)"/>
<text x="455" y="59" fill="#e94560" font-size="12" font-weight="bold">OUT</text>
<text x="180" y="100" fill="rgba(255,255,255,0.3)" font-size="9" text-anchor="middle">설정점 (SP)</text>
<line x1="180" y1="105" x2="180" y2="85" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#{mid}f_a3)"/>
<text x="180" y="125" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get('flow_desc','')}</text>
</svg>'''
    return svg


def _flow_transfer(mid, sym_id, sym_data, config):
    """전환 스위치 흐름"""
    svg = f'''<svg viewBox="0 0 500 130" style="width:100%; max-width:500px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="250" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 전환 흐름도</text>
<text x="20" y="45" fill="#ff9800" font-size="11" font-weight="600">IN1</text>
<line x1="50" y1="41" x2="160" y2="41" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<text x="20" y="85" fill="#ff9800" font-size="11" font-weight="600">IN2</text>
<line x1="50" y1="81" x2="160" y2="81" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="165" y="25" width="120" height="72" rx="6" fill="rgba(79,195,247,0.08)" stroke="#4fc3f7" stroke-width="1.5"/>
<text x="225" y="55" fill="#4fc3f7" font-size="16" text-anchor="middle" font-weight="bold">⇄</text>
<text x="225" y="78" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">FLAG 전환</text>
<line x1="285" y1="61" x2="370" y2="61" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="385" y="65" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<text x="225" y="30" fill="#a78bfa" font-size="10" font-weight="600">FLAG</text>
<line x1="225" y1="16" x2="225" y2="25" stroke="#a78bfa" stroke-width="1" stroke-dasharray="4,3"/>
<text x="250" y="118" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">FLAG=0 → IN1, FLAG=1 → IN2</text>
</svg>'''
    return svg


def _flow_selector(mid, sym_id, sym_data, config):
    """선택기 흐름"""
    inner = config.get('inner', [{}])
    ib = inner[0]
    hex_c, rgba_c = get_color(ib['color'])
    label = ib.get('symbol', 'SEL')

    svg = f'''<svg viewBox="0 0 480 130" style="width:100%; max-width:480px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="240" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 선택 흐름도</text>
<text x="20" y="40" fill="#ff9800" font-size="10" font-weight="600">IN1</text>
<line x1="50" y1="36" x2="140" y2="50" stroke="#ff9800" stroke-width="1.2" marker-end="url(#{mid}f_a2)"/>
<text x="20" y="60" fill="#ff9800" font-size="10" font-weight="600">IN2</text>
<line x1="50" y1="56" x2="140" y2="56" stroke="#ff9800" stroke-width="1.2" marker-end="url(#{mid}f_a2)"/>
<text x="20" y="80" fill="#ff9800" font-size="10" font-weight="600">IN3</text>
<line x1="50" y1="76" x2="140" y2="62" stroke="#ff9800" stroke-width="1.2" marker-end="url(#{mid}f_a2)"/>
<rect x="145" y="30" width="130" height="55" rx="6" fill="{rgba_c}0.1)" stroke="{hex_c}" stroke-width="1.5"/>
<text x="210" y="63" fill="{hex_c}" font-size="18" text-anchor="middle" font-weight="bold">{label}</text>
<line x1="275" y1="57" x2="370" y2="57" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="385" y="61" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<text x="240" y="115" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get('flow_desc','')}</text>
</svg>'''
    return svg


def _flow_device(mid, sym_id, sym_data, config):
    """디바이스 제어 흐름"""
    svg = f'''<svg viewBox="0 0 550 150" style="width:100%; max-width:550px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="275" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 디바이스 제어 흐름</text>
<rect x="30" y="35" width="80" height="35" rx="4" fill="rgba(255,152,0,0.1)" stroke="#ff9800" stroke-width="1"/>
<text x="70" y="57" fill="#ff9800" font-size="11" text-anchor="middle" font-weight="600">SET/RSET</text>
<line x1="110" y1="52" x2="170" y2="52" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="175" y="25" width="150" height="70" rx="6" fill="rgba(79,195,247,0.08)" stroke="#4fc3f7" stroke-width="1.5"/>
<text x="250" y="50" fill="#4fc3f7" font-size="14" text-anchor="middle" font-weight="bold">DEV</text>
<text x="250" y="68" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">기동/정지 로직</text>
<text x="250" y="82" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">+ 피드백 감시</text>
<line x1="325" y1="42" x2="410" y2="42" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="425" y="46" fill="#4fc3f7" font-size="11" font-weight="bold">OUT1</text>
<line x1="325" y1="62" x2="410" y2="62" stroke="#10b981" stroke-width="1.5" marker-end="url(#{mid}f_a4)"/>
<text x="425" y="66" fill="#10b981" font-size="11" font-weight="bold">OUT2</text>
<line x1="325" y1="82" x2="410" y2="82" stroke="#e94560" stroke-width="1.5" marker-end="url(#{mid}f_a6)"/>
<text x="425" y="86" fill="#e94560" font-size="11" font-weight="bold">OUT3</text>
<text x="250" y="120" fill="rgba(255,255,255,0.3)" font-size="9" text-anchor="middle">피드백</text>
<line x1="250" y1="125" x2="250" y2="100" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#{mid}f_a3)"/>
<text x="275" y="142" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get('flow_desc','')}</text>
</svg>'''
    return svg


def _flow_sr_latch(mid, sym_id, sym_data, config):
    """SR 래치 흐름"""
    svg = f'''<svg viewBox="0 0 420 120" style="width:100%; max-width:420px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="210" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ S-R 래치 동작</text>
<text x="20" y="45" fill="#10b981" font-size="11" font-weight="600">SET</text>
<line x1="55" y1="41" x2="120" y2="41" stroke="#10b981" stroke-width="1.5" marker-end="url(#{mid}f_a4)"/>
<text x="20" y="75" fill="#e94560" font-size="11" font-weight="600">RSET</text>
<line x1="55" y1="71" x2="120" y2="71" stroke="#e94560" stroke-width="1.5" marker-end="url(#{mid}f_a6)"/>
<rect x="125" y="25" width="120" height="65" rx="6" fill="rgba(79,195,247,0.08)" stroke="#4fc3f7" stroke-width="1.5"/>
<text x="155" y="52" fill="#10b981" font-size="14" font-weight="bold">S</text>
<text x="155" y="78" fill="#e94560" font-size="14" font-weight="bold">R</text>
<line x1="175" y1="57" x2="220" y2="57" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
<text x="215" y="52" fill="#4fc3f7" font-size="14" font-weight="bold">Q</text>
<line x1="245" y1="57" x2="330" y2="57" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="345" y="61" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<text x="210" y="110" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get('flow_desc','')}</text>
</svg>'''
    return svg


def _flow_mastation(mid, sym_id, sym_data, config):
    """수동/자동 스테이션 흐름"""
    svg = f'''<svg viewBox="0 0 520 140" style="width:100%; max-width:520px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="260" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ Manual/Auto 전환 흐름</text>
<rect x="30" y="30" width="100" height="40" rx="4" fill="rgba(255,152,0,0.1)" stroke="#ff9800" stroke-width="1"/>
<text x="80" y="55" fill="#ff9800" font-size="12" text-anchor="middle" font-weight="bold">Manual</text>
<line x1="130" y1="50" x2="190" y2="50" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>
<rect x="30" y="80" width="100" height="40" rx="4" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-width="1"/>
<text x="80" y="105" fill="#10b981" font-size="12" text-anchor="middle" font-weight="bold">Auto</text>
<line x1="130" y1="100" x2="190" y2="75" stroke="#10b981" stroke-width="1.5" marker-end="url(#{mid}f_a4)"/>
<rect x="195" y="35" width="140" height="55" rx="6" fill="rgba(79,195,247,0.08)" stroke="#4fc3f7" stroke-width="1.5"/>
<text x="265" y="58" fill="#4fc3f7" font-size="14" text-anchor="middle" font-weight="bold">M/A ⇄</text>
<text x="265" y="78" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">범프리스 전환</text>
<line x1="335" y1="62" x2="420" y2="62" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>
<text x="435" y="66" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>
<text x="260" y="132" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get('flow_desc','')}</text>
</svg>'''
    return svg


def _flow_sequencer(mid, sym_id, sym_data, config):
    """시퀀서 흐름"""
    svg = f'''<svg viewBox="0 0 520 110" style="width:100%; max-width:520px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="260" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 시퀀스 흐름도</text>
<rect x="30" y="30" width="70" height="50" rx="4" fill="rgba(79,195,247,0.08)" stroke="#4fc3f7" stroke-width="1"/>
<text x="65" y="50" fill="#4fc3f7" font-size="10" text-anchor="middle" font-weight="600">Step 1</text>
<text x="65" y="67" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">OUT₁</text>
<line x1="100" y1="55" x2="130" y2="55" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>
<rect x="130" y="30" width="70" height="50" rx="4" fill="rgba(16,185,129,0.08)" stroke="#10b981" stroke-width="1"/>
<text x="165" y="50" fill="#10b981" font-size="10" text-anchor="middle" font-weight="600">Step 2</text>
<text x="165" y="67" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">OUT₂</text>
<line x1="200" y1="55" x2="230" y2="55" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>
<rect x="230" y="30" width="70" height="50" rx="4" fill="rgba(255,152,0,0.08)" stroke="#ff9800" stroke-width="1"/>
<text x="265" y="50" fill="#ff9800" font-size="10" text-anchor="middle" font-weight="600">Step 3</text>
<text x="265" y="67" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">OUT₃</text>
<line x1="300" y1="55" x2="330" y2="55" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>
<text x="350" y="59" fill="rgba(255,255,255,0.4)" font-size="14">···</text>
<line x1="370" y1="55" x2="400" y2="55" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>
<rect x="400" y="30" width="70" height="50" rx="4" fill="rgba(167,139,250,0.08)" stroke="#a78bfa" stroke-width="1"/>
<text x="435" y="50" fill="#a78bfa" font-size="10" text-anchor="middle" font-weight="600">Step N</text>
<text x="435" y="67" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">OUTₙ</text>
<text x="260" y="100" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get('flow_desc','')}</text>
</svg>'''
    return svg


def _flow_filter(mid, sym_id, sym_data, config):
    """필터/리미터 흐름"""
    inner = config.get('inner', [])
    hex_c, rgba_c = get_color(inner[0]['color']) if inner else get_color('blue')

    svg = f'''<svg viewBox="0 0 520 100" style="width:100%; max-width:520px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="260" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 처리 흐름도</text>
<text x="20" y="55" fill="#ff9800" font-size="12" font-weight="bold">IN</text>
<line x1="40" y1="51" x2="100" y2="51" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>'''

    x_pos = 105
    for i, ib in enumerate(inner):
        hc, rc = get_color(ib['color'])
        w = 100
        svg += f'\n<rect x="{x_pos}" y="30" width="{w}" height="45" rx="5" fill="{rc}0.1)" stroke="{hc}" stroke-width="1.5"/>'
        svg += f'\n<text x="{x_pos + w/2}" y="57" fill="{hc}" font-size="14" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>'
        if i < len(inner) - 1:
            svg += f'\n<line x1="{x_pos+w}" y1="52" x2="{x_pos+w+15}" y2="52" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>'
        x_pos += w + 15

    svg += f'\n<line x1="{x_pos-10}" y1="52" x2="{x_pos+40}" y2="52" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>'
    svg += f'\n<text x="{x_pos+55}" y="56" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>'
    svg += f'\n<text x="260" y="92" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get("flow_desc","")}</text>'
    svg += '\n</svg>'
    return svg


def _flow_transfer_func(mid, sym_id, sym_data, config):
    """전달함수 블록 다이어그램"""
    inner = config.get('inner', [])

    svg = f'''<svg viewBox="0 0 520 110" style="width:100%; max-width:520px; display:block; margin:12px auto;">
{make_marker_defs(mid+'f')}
<text x="260" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ 전달함수 블록 다이어그램</text>
<text x="20" y="58" fill="#ff9800" font-size="12" font-weight="bold">IN</text>
<line x1="40" y1="54" x2="110" y2="54" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}f_a2)"/>'''

    x_pos = 115
    for i, ib in enumerate(inner):
        hc, rc = get_color(ib['color'])
        w = 120
        svg += f'\n<rect x="{x_pos}" y="30" width="{w}" height="50" rx="5" fill="{rc}0.1)" stroke="{hc}" stroke-width="1.5"/>'
        svg += f'\n<text x="{x_pos + w/2}" y="52" fill="{hc}" font-size="14" text-anchor="middle" font-weight="bold">{ib["symbol"]}</text>'
        svg += f'\n<text x="{x_pos + w/2}" y="70" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">{ib["desc"]}</text>'
        if i < len(inner) - 1:
            svg += f'\n<line x1="{x_pos+w}" y1="55" x2="{x_pos+w+20}" y2="55" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" marker-end="url(#{mid}f_a3)"/>'
        x_pos += w + 20

    svg += f'\n<line x1="{x_pos-15}" y1="55" x2="{x_pos+30}" y2="55" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}f_a1)"/>'
    svg += f'\n<text x="{x_pos+45}" y="59" fill="#4fc3f7" font-size="12" font-weight="bold">OUT</text>'
    svg += f'\n<text x="260" y="100" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">{config.get("flow_desc","")}</text>'
    svg += '\n</svg>'
    return svg


# ============================================================
# HTML 컨텐츠 생성
# ============================================================

def generate_rich_detail(sym_id, sym_data, config):
    """PID 수준의 풍부한 detailFull HTML 생성"""
    section = sym_data.get('section', '')
    pages = sym_data.get('pdfPages', [])
    page_str = f'p.{pages[0]}~{pages[1]}' if len(pages) >= 2 else ''
    desc = sym_data.get('desc', '')
    ai = sym_data.get('ai', '')
    formula = sym_data.get('formula', '')
    diagramDesc = sym_data.get('diagramDesc', '')
    ports = sym_data.get('ports', [])
    inner = config.get('inner', [])
    flow_desc = config.get('flow_desc', '')

    html = ''

    # 헤더
    html += f'<h3 style="color:#4fc3f7; margin:0 0 4px;">{sym_id} 알고리즘 상세 가이드</h3>'
    html += f'<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section {section} ({page_str}) 기반</div>'

    # 1. 개요
    html += '<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>'
    overview = ai or diagramDesc or desc
    html += f'<p>{overview}</p>'

    # 2. Functional Symbol SVG
    html += '<div style="text-align:center; font-size:10px; color:rgba(255,255,255,0.4); margin-top:8px;">▼ Functional Symbol</div>'
    html += generate_functional_svg(sym_id, sym_data, config)

    # 3. 내부 기능 블록 설명
    if inner and len(inner) > 1:
        html += '<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 내부 기능 블록</h4>'
        html += '<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">'
        html += '<tr style="background:rgba(79,195,247,0.08);"><th style="padding:6px 10px; text-align:left; color:#4fc3f7;">기호</th><th style="padding:6px 10px; text-align:left; color:#4fc3f7;">기능</th><th style="padding:6px 10px; text-align:left; color:#4fc3f7;">설명</th></tr>'
        for ib in inner:
            hex_c, _ = get_color(ib['color'])
            html += f'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px; color:{hex_c}; font-weight:bold; font-size:16px;">{ib["symbol"]}</td><td style="padding:5px 10px; color:{hex_c}; font-weight:600;">{ib.get("label","")}</td><td style="padding:5px 10px; color:rgba(255,255,255,0.7);">{ib["desc"]}</td></tr>'
        html += '</table>'
        sec_num = 3
    else:
        sec_num = 2

    # 4. 동작 수식
    if formula:
        html += f'<h4 style="color:#4fc3f7; margin:20px 0 8px;">{sec_num}. 동작 수식</h4>'
        safe_formula = formula.replace('<', '&lt;').replace('>', '&gt;')
        html += f'<div style="padding:12px 14px; background:rgba(0,0,0,0.3); border-radius:8px; font-family:monospace; margin:10px 0; line-height:2.0; font-size:12px; color:#7dd3fc;">{safe_formula}</div>'
        sec_num += 1

    # 5. 신호 흐름도
    html += f'<h4 style="color:#4fc3f7; margin:20px 0 8px;">{sec_num}. 신호 흐름</h4>'
    html += generate_flow_svg(sym_id, sym_data, config)
    sec_num += 1

    # 6. diagramDesc에서 추가 설명 (있으면)
    if diagramDesc and diagramDesc != overview:
        html += f'<h4 style="color:#4fc3f7; margin:20px 0 8px;">{sec_num}. 동작 상세</h4>'
        html += f'<p>{diagramDesc}</p>'
        sec_num += 1

    # 7. 포트 상세
    if ports:
        # Variable 포트와 Parameter 포트 분리
        var_ports = []
        param_ports = []
        for p in ports:
            t = (p.get('type', '') or '').upper()
            if 'VARIABLE' in t or t in ('', 'LA', 'LD', 'LP') or t.startswith('IN') or t.startswith('OUT'):
                var_ports.append(p)
            else:
                param_ports.append(p)

        if not var_ports and not param_ports:
            var_ports = ports  # 분류 안 되면 전부 표시

        if var_ports:
            html += f'<h4 style="color:#4fc3f7; margin:20px 0 8px;">{sec_num}. 연결 포트 (Variable)</h4>'
            html += _port_table(var_ports)
            sec_num += 1

        if param_ports:
            html += f'<h4 style="color:#4fc3f7; margin:20px 0 8px;">{sec_num}. 파라미터 (R/S/X/LU)</h4>'
            html += _port_table(param_ports)
            sec_num += 1

    return html


def _port_table(ports):
    """포트 테이블 HTML"""
    html = '<table style="width:100%; border-collapse:collapse; font-size:11px; margin:10px 0;">'
    html += '<tr style="background:rgba(79,195,247,0.08);"><th style="padding:6px 8px; text-align:left; color:#4fc3f7;">포트</th><th style="padding:6px 8px; text-align:left; color:#4fc3f7;">방향</th><th style="padding:6px 8px; text-align:left; color:#4fc3f7;">타입</th><th style="padding:6px 8px; text-align:left; color:#4fc3f7;">설명</th></tr>'
    for p in ports:
        dir_color = '#ff9800' if p.get('direction') == 'input' else '#4fc3f7'
        dir_label = '입력' if p.get('direction') == 'input' else '출력'
        ptype = p.get('type', '') or ''
        desc_text = p.get('description', '') or ''
        req = ' ★' if p.get('required') else ''
        html += f'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px; color:{dir_color}; font-weight:600;">{p["name"]}{req}</td><td style="padding:4px 8px; color:rgba(255,255,255,0.5);">{dir_label}</td><td style="padding:4px 8px; color:rgba(255,255,255,0.4); font-family:monospace; font-size:10px;">{ptype}</td><td style="padding:4px 8px; color:rgba(255,255,255,0.7);">{desc_text}</td></tr>'
    html += '</table>'
    html += '<div style="font-size:9px; color:rgba(255,255,255,0.3); margin-top:4px;">★ = 필수 포트</div>'
    return html


# ============================================================
# MAIN
# ============================================================

def main():
    with open(SYMBOLS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    skipped = 0
    no_config = []

    for sym_id, sym in data.items():
        # PID는 이미 완성되어 있으므로 건너뜀
        if sym_id == 'PID':
            skipped += 1
            continue

        # 포트 없으면 건너뜀
        if not sym.get('ports'):
            no_config.append(f'{sym_id}: 포트 없음')
            continue

        config = SYMBOL_CONFIG.get(sym_id)
        if not config:
            no_config.append(sym_id)
            continue

        try:
            new_detail = generate_rich_detail(sym_id, sym, config)
            sym['detailFull'] = new_detail
            updated += 1
        except Exception as e:
            no_config.append(f'{sym_id}: ERROR {e}')

    # 저장
    with open(SYMBOLS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'완료: {updated}개 풍부한 detailFull 생성')
    print(f'PID 스킵: {skipped}개')
    print(f'설정 없음/에러: {len(no_config)}개')
    for item in no_config:
        print(f'  - {item}')


if __name__ == '__main__':
    main()
