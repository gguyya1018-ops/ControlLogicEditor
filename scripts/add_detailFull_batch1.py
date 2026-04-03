import json

with open('C:/Users/이성규/AppProduct/ControlLogicEditor/data/ovation_symbols.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# ============================================================
# AND
# ============================================================
data['AND']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">AND 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-8 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>AND 블록은 최대 8개의 디지털 입력에 대한 논리 AND 연산을 수행합니다. 모든 연결된 입력이 TRUE(1)일 때만 출력이 TRUE(1)가 됩니다. 하나라도 FALSE(0)이면 출력은 FALSE(0)입니다. IN1, IN2는 필수 입력이며, IN3~IN8은 선택적입니다. 미연결 입력(IN3~IN8)은 TRUE로 처리되므로, IN1과 IN2만 연결하면 2입력 AND로 동작합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 3 (선택, 미연결 시 TRUE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 4 (선택, 미연결 시 TRUE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN5</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 5 (선택, 미연결 시 TRUE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN6</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 6 (선택, 미연결 시 TRUE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN7</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 7 (선택, 미연결 시 TRUE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN8</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 8 (선택, 미연결 시 TRUE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 출력 (모든 입력 AND 결과)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>수식:</b> OUT = IN1 AND IN2 AND IN3 AND ... AND IN8</p>
<p>모든 연결된 입력이 TRUE(1)일 때만 OUT이 TRUE(1)가 됩니다. 연결된 입력 중 하나라도 FALSE(0)이면 OUT은 FALSE(0)입니다.</p>
<p><b>미연결 입력 처리:</b> IN3~IN8 중 연결되지 않은 포트는 내부적으로 TRUE로 간주됩니다. 따라서 실제 연결된 입력만 AND 연산에 참여합니다.</p>
<p><b>진리표 (2입력 예시):</b></p>
<table style="width:60%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="padding:4px; color:#4fc3f7;">IN1</th><th style="padding:4px; color:#4fc3f7;">IN2</th><th style="padding:4px; color:#4fc3f7;">OUT</th></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">0</td><td style="padding:4px;">0</td></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">1</td><td style="padding:4px;">0</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">0</td><td style="padding:4px;">0</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">1</td><td style="padding:4px;">1</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>펌프 기동 허가 (Start Permissive):</b> 윤활유 압력 정상(IN1) AND 냉각수 유량 정상(IN2) AND 모터 온도 정상(IN3) AND 진동 정상(IN4)이 모두 만족해야 기동 허가(OUT=TRUE)를 발생시키는 인터록 로직에 활용합니다.</p>
<p><b>안전 인터록:</b> 보일러 점화 시퀀스에서 퍼지 완료(IN1) AND 연료 밸브 닫힘 확인(IN2) AND 화염 미감지(IN3) 조건을 모두 만족해야 점화 허가를 내보내는 로직에 사용합니다.</p>
<p><b>설비 운전 조건 확인:</b> 자동 운전 모드(IN1) AND 원격 제어 허가(IN2) AND 비상 정지 미발생(IN3) 조건을 조합하여 제어 출력 허가 신호를 생성합니다.</p>'''

# ============================================================
# OR
# ============================================================
data['OR']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">OR 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-67 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>OR 블록은 최대 8개의 디지털 입력에 대한 논리 OR 연산을 수행합니다. 연결된 입력 중 하나라도 TRUE(1)이면 출력이 TRUE(1)가 됩니다. 모든 입력이 FALSE(0)일 때만 출력은 FALSE(0)입니다. IN1, IN2는 필수 입력이며, IN3~IN8은 선택적입니다. 미연결 입력(IN3~IN8)은 FALSE로 처리됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 3 (선택, 미연결 시 FALSE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 4 (선택, 미연결 시 FALSE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN5</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 5 (선택, 미연결 시 FALSE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN6</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 6 (선택, 미연결 시 FALSE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN7</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 7 (선택, 미연결 시 FALSE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN8</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 8 (선택, 미연결 시 FALSE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 출력 (OR 연산 결과)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>수식:</b> OUT = IN1 OR IN2 OR IN3 OR ... OR IN8</p>
<p>연결된 입력 중 하나라도 TRUE(1)이면 OUT이 TRUE(1)가 됩니다. 모든 연결된 입력이 FALSE(0)일 때만 OUT은 FALSE(0)입니다.</p>
<p><b>미연결 입력 처리:</b> IN3~IN8 중 연결되지 않은 포트는 내부적으로 FALSE로 간주됩니다. 이는 AND 블록(미연결=TRUE)과 반대이므로 주의가 필요합니다.</p>
<p><b>진리표 (2입력 예시):</b></p>
<table style="width:60%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="padding:4px; color:#4fc3f7;">IN1</th><th style="padding:4px; color:#4fc3f7;">IN2</th><th style="padding:4px; color:#4fc3f7;">OUT</th></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">0</td><td style="padding:4px;">0</td></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">1</td><td style="padding:4px;">1</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">0</td><td style="padding:4px;">1</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">1</td><td style="padding:4px;">1</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>비상 정지 (Emergency Trip):</b> 과압(IN1) OR 과온(IN2) OR 진동 과다(IN3) OR 수동 트립(IN4) 중 어느 하나라도 발생하면 즉시 정지 신호(OUT=TRUE)를 내보내는 트립 로직에 사용합니다.</p>
<p><b>알람 집합 (Alarm Collection):</b> 여러 개별 알람 신호를 하나의 그룹 알람으로 집약할 때 사용합니다. 예를 들어 보일러 관련 개별 알람 8개를 OR로 묶어 "보일러 이상" 통합 알람을 생성합니다.</p>
<p><b>다중 소스 요구 통합:</b> 여러 곳에서 냉각수 요구가 올 수 있을 때, 어디서든 요구가 있으면 냉각수 펌프를 기동하는 로직에 활용합니다.</p>'''

# ============================================================
# NOT
# ============================================================
data['NOT']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">NOT 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-63 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>NOT 블록은 단일 디지털 입력의 논리 부정(반전)을 수행합니다. 입력이 TRUE(1)이면 출력은 FALSE(0), 입력이 FALSE(0)이면 출력은 TRUE(1)가 됩니다. 가장 단순한 논리 블록으로, 신호의 극성을 반전할 때 사용합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 출력 (입력의 반전)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>수식:</b> OUT = NOT IN1</p>
<p>IN1이 TRUE(1)이면 OUT은 FALSE(0), IN1이 FALSE(0)이면 OUT은 TRUE(1)가 됩니다. 입력 신호의 논리 상태를 즉시 반전하여 출력합니다.</p>
<p><b>진리표:</b></p>
<table style="width:40%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="padding:4px; color:#4fc3f7;">IN1</th><th style="padding:4px; color:#4fc3f7;">OUT</th></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">1</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">0</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>상태 반전:</b> 밸브 열림 상태(OPEN=TRUE)를 밸브 닫힘 상태(CLOSED=TRUE)로 변환하거나, 정상 상태(NORMAL=TRUE)를 이상 상태(FAULT=TRUE)로 변환할 때 사용합니다.</p>
<p><b>조건 부정:</b> "운전 중이 아닐 때"라는 조건이 필요할 경우, 운전 중 신호를 NOT으로 반전하여 사용합니다. 인터록에서 특정 조건의 NOT을 요구할 때 필수적입니다.</p>
<p><b>상보 신호 생성:</b> 하나의 디지털 신호로부터 정(正)/부(負) 양쪽 신호가 필요할 때, 원본 신호와 NOT 반전 신호를 함께 사용합니다.</p>'''

# ============================================================
# XOR
# ============================================================
data['XOR']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">XOR 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-120 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>XOR 블록은 2개의 디지털 입력에 대한 배타적 OR(Exclusive OR) 연산을 수행합니다. 두 입력이 서로 다를 때만 출력이 TRUE(1)가 되며, 같으면 FALSE(0)가 됩니다. 상태 불일치 감지나 교번 제어 로직에 사용됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 출력 (XOR 결과)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>수식:</b> OUT = IN1 XOR IN2</p>
<p>두 입력이 서로 다를 때(하나는 TRUE, 다른 하나는 FALSE) OUT이 TRUE(1)가 됩니다. 두 입력이 같을 때(둘 다 TRUE 또는 둘 다 FALSE) OUT은 FALSE(0)입니다.</p>
<p><b>진리표:</b></p>
<table style="width:60%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="padding:4px; color:#4fc3f7;">IN1</th><th style="padding:4px; color:#4fc3f7;">IN2</th><th style="padding:4px; color:#4fc3f7;">OUT</th></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">0</td><td style="padding:4px;">0</td></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">1</td><td style="padding:4px;">1</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">0</td><td style="padding:4px;">1</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">1</td><td style="padding:4px;">0</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>상태 불일치 감지:</b> 이중화 센서의 두 신호가 불일치할 때 알람을 발생시키는 로직에 사용합니다. 예를 들어 A 센서(IN1)와 B 센서(IN2)가 서로 다른 상태를 보이면 OUT=TRUE로 불일치 알람을 발생시킵니다.</p>
<p><b>교번 운전 판별:</b> 두 펌프의 운전 상태가 동시에 같은 상태(둘 다 운전 또는 둘 다 정지)인지, 교번 상태(하나만 운전)인지를 판별합니다.</p>
<p><b>변화 감지:</b> 이전 상태와 현재 상태를 XOR하여 상태 변화가 발생했는지 감지하는 데 활용합니다.</p>'''

# ============================================================
# FLIPFLOP
# ============================================================
data['FLIPFLOP']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">FLIPFLOP 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-38 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>FLIPFLOP 블록은 S-R(Set-Reset) 플립플롭 메모리 소자입니다. SET 입력이 TRUE가 되면 출력이 TRUE(1)로 래치(Latch)되고, RSET 입력이 TRUE가 되면 출력이 FALSE(0)로 해제됩니다. TYPE 설정에 따라 SET과 RSET이 동시에 활성화될 때의 우선순위를 결정합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TYPE</td><td style="padding:4px;">입력</td><td style="padding:4px;">X1-Byte</td><td style="padding:4px;">동작 모드 (0=Reset Override, 1=Set Override)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SET</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">Set 입력 (TRUE 시 출력을 1로 래치)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">RSET</td><td style="padding:4px;">입력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">Reset 입력 (TRUE 시 출력을 0으로 해제)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Digital Variable</td><td style="padding:4px;">디지털 출력 (래치 상태)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>기본 동작:</b> SET=TRUE이면 OUT=TRUE로 래치, RSET=TRUE이면 OUT=FALSE로 해제. SET=FALSE이고 RSET=FALSE이면 이전 상태를 유지합니다(메모리 동작).</p>
<p><b>TYPE=0 (Reset Override):</b> SET과 RSET이 동시에 TRUE이면 OUT=FALSE (Reset 우선). 안전 관련 로직에서 권장됩니다.</p>
<p><b>TYPE=1 (Set Override):</b> SET과 RSET이 동시에 TRUE이면 OUT=TRUE (Set 우선).</p>
<p><b>동작 진리표:</b></p>
<table style="width:80%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="padding:4px; color:#4fc3f7;">SET</th><th style="padding:4px; color:#4fc3f7;">RSET</th><th style="padding:4px; color:#4fc3f7;">TYPE=0</th><th style="padding:4px; color:#4fc3f7;">TYPE=1</th></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">0</td><td style="padding:4px;">이전 상태 유지</td><td style="padding:4px;">이전 상태 유지</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">0</td><td style="padding:4px;">OUT=1</td><td style="padding:4px;">OUT=1</td></tr>
<tr><td style="padding:4px;">0</td><td style="padding:4px;">1</td><td style="padding:4px;">OUT=0</td><td style="padding:4px;">OUT=0</td></tr>
<tr><td style="padding:4px;">1</td><td style="padding:4px;">1</td><td style="padding:4px;">OUT=0 (Reset 우선)</td><td style="padding:4px;">OUT=1 (Set 우선)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>모터 기동/정지 래치:</b> START 버튼(SET)을 누르면 운전 상태가 유지되고, STOP 버튼(RSET)을 누르면 정지 상태가 유지됩니다. TYPE=0(Reset Override)을 사용하면 비상 정지 시 안전하게 정지됩니다.</p>
<p><b>알람 래치:</b> 알람 조건 발생 시 SET으로 래치하고, 운전원이 확인(Acknowledge) 버튼을 누르면 RSET으로 해제합니다. 운전원이 확인하기 전까지 알람 상태가 유지됩니다.</p>
<p><b>시퀀스 제어:</b> 시퀀스의 각 단계를 FLIPFLOP으로 기억하여, 진행 조건(SET)과 리셋 조건(RSET)에 따라 단계를 관리합니다.</p>'''

# ============================================================
# AAFLIPFLOP
# ============================================================
data['AAFLIPFLOP']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">AAFLIPFLOP 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-3 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>AAFLIPFLOP(Alternating Action Flip-Flop) 블록은 교번 동작 플립플롭입니다. SRST 입력의 상승 에지(FALSE→TRUE 전환)가 발생할 때마다 출력 상태가 토글(반전)됩니다. RSET 입력으로 출력을 강제로 FALSE로 리셋할 수 있으며, INIT 입력으로 초기값을 설정할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">INIT</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable</td><td style="padding:4px;">초기값 설정 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SRST</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable</td><td style="padding:4px;">트리거 입력 (디지털, 상승 에지 감지)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">RSET</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable</td><td style="padding:4px;">리셋 입력 (디지털, TRUE 시 출력을 FALSE로 강제)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable</td><td style="padding:4px;">출력 (디지털, 토글 상태)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>토글 동작:</b> SRST 입력이 FALSE에서 TRUE로 전환(상승 에지)될 때마다 OUT의 상태가 반전됩니다. OUT이 FALSE였으면 TRUE로, TRUE였으면 FALSE로 변합니다.</p>
<p><b>리셋 동작:</b> RSET이 TRUE가 되면 OUT은 즉시 FALSE로 강제 리셋됩니다. RSET이 TRUE인 동안에는 SRST의 상승 에지가 무시됩니다.</p>
<p><b>초기값:</b> INIT 입력이 연결된 경우, 시스템 시작 시 또는 첫 번째 스캔에서 INIT의 값이 OUT의 초기 상태로 설정됩니다.</p>
<p><b>에지 감지:</b> SRST가 TRUE로 유지되는 동안에는 추가 토글이 발생하지 않습니다. 반드시 FALSE로 돌아갔다가 다시 TRUE가 되어야 다음 토글이 발생합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>교번 운전 (Alternating Operation):</b> 두 대의 펌프를 교대로 운전할 때, 기동 명령(SRST)이 들어올 때마다 A 펌프와 B 펌프를 교번으로 선택하는 로직에 사용합니다. OUT=TRUE이면 A 펌프, FALSE이면 B 펌프를 기동합니다.</p>
<p><b>토글 스위치:</b> 운전원이 하나의 버튼으로 ON/OFF를 번갈아 제어할 때 사용합니다. 버튼을 누를 때마다 장비가 켜졌다 꺼졌다를 반복합니다.</p>
<p><b>듀티 교번:</b> 일정 주기마다 두 장비의 운전 부하를 균등하게 분배하기 위해 교번 신호를 생성합니다.</p>'''

# ============================================================
# COMPARE
# ============================================================
data['COMPARE']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">COMPARE 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-23 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>COMPARE 블록은 2개의 아날로그 입력(부동소수점)을 비교하여 3개의 디지털 출력을 생성합니다. IN1과 IN2의 크기 관계에 따라 OUT(같음), OUTG(크다), OUTL(작다) 중 정확히 하나만 TRUE가 됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Analog)</td><td style="padding:4px;">비교 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Analog)</td><td style="padding:4px;">비교 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">IN1 = IN2일 때 TRUE</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUTG</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">IN1 > IN2일 때 TRUE</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUTL</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">IN1 &lt; IN2일 때 TRUE</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>비교 결과:</b> IN1과 IN2의 값을 비교하여 3개 출력 중 정확히 하나만 TRUE가 됩니다.</p>
<ul style="margin:4px 0; padding-left:20px;">
<li>IN1 = IN2 → OUT = TRUE, OUTG = FALSE, OUTL = FALSE</li>
<li>IN1 > IN2 → OUT = FALSE, OUTG = TRUE, OUTL = FALSE</li>
<li>IN1 &lt; IN2 → OUT = FALSE, OUTG = FALSE, OUTL = TRUE</li>
</ul>
<p><b>부동소수점 비교:</b> 부동소수점 특성상 정확한 "같음" 비교는 드물기 때문에, 내부적으로 미세한 허용 오차가 적용됩니다.</p>
<p><b>무효 입력 처리:</b> 입력이 무효(Invalid) 상태이면 모든 출력이 FALSE가 됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>ON/OFF 제어:</b> 탱크 수위(IN1)와 설정값(IN2)을 비교하여, 수위가 설정값보다 높으면(OUTG=TRUE) 배수 밸브를 열고, 낮으면(OUTL=TRUE) 급수 밸브를 여는 제어에 사용합니다.</p>
<p><b>상한/하한 감시:</b> 프로세스 값(IN1)과 알람 설정값(IN2)을 비교하여 알람을 발생시킵니다. OUTG를 상한 알람, OUTL을 하한 알람으로 활용합니다.</p>
<p><b>조건 분기:</b> 시퀀스 제어에서 아날로그 값 비교 결과에 따라 다른 경로로 분기하는 로직에 활용합니다. 예를 들어 온도가 설정값에 도달(OUT=TRUE)하면 다음 단계로 진행합니다.</p>'''

# ============================================================
# COUNTER
# ============================================================
data['COUNTER']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">COUNTER 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-25 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>COUNTER 블록은 디지털 입력의 상승 에지를 감지하여 업(UP) 또는 다운(DOWN)으로 카운트하는 블록입니다. 목표값(TARG)에 도달하면 완료 출력(OUT)이 TRUE가 되며, 현재 카운트값은 ACT를 통해 아날로그로 모니터링할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">카운트 시작 입력 (상승 에지 감지)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ENBL</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">Enable 입력 (TRUE일 때만 카운트 동작)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TARG</td><td style="padding:4px;">입력</td><td style="padding:4px;">R1 (Analog)</td><td style="padding:4px;">카운트 목표값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ACT</td><td style="padding:4px;">입력</td><td style="padding:4px;">R2 (Analog)</td><td style="padding:4px;">현재 카운트값 출력 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">카운트 완료 출력 (목표 도달 시 TRUE)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>카운트 동작:</b> ENBL이 TRUE인 상태에서 IN1의 상승 에지(FALSE→TRUE)가 발생할 때마다, 카운트 방향에 따라 내부 카운터가 증가 또는 감소합니다.</p>
<p><b>목표 도달:</b> 카운터 값이 TARG(목표값)에 도달하면 OUT이 TRUE가 됩니다.</p>
<p><b>현재값 모니터링:</b> ACT 포트를 통해 현재 카운트값을 아날로그로 확인할 수 있습니다. 외부에서 HMI 등으로 현재 진행 상황을 표시할 때 유용합니다.</p>
<p><b>Enable 제어:</b> ENBL이 FALSE이면 IN1의 상승 에지가 발생해도 카운트가 증가하지 않습니다. ENBL을 통해 카운트 동작의 활성/비활성을 제어합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>배치(Batch) 공정:</b> 원료 투입 횟수를 카운트하여 목표 횟수에 도달하면 다음 공정 단계로 진행합니다. 예를 들어 백(Bag) 10개 투입을 목표로 설정하고, 투입 센서의 펄스를 카운트합니다.</p>
<p><b>장비 기동 횟수 관리:</b> 모터나 펌프의 기동 횟수를 누적하여 정비 주기(예: 1000회 기동 시 정비)를 관리합니다.</p>
<p><b>시퀀스 반복 제어:</b> 특정 동작을 N회 반복 수행한 후 다음 단계로 진행하는 시퀀스 로직에 활용합니다. 예를 들어 세척 사이클을 3회 반복 후 완료 신호를 발생시킵니다.</p>'''

# ============================================================
# ONDELAY
# ============================================================
data['ONDELAY']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">ONDELAY 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-65 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>ONDELAY 블록은 디지털 입력이 TRUE가 된 후 설정 시간이 경과해야 출력을 TRUE로 만드는 On Delay 타이머입니다. 입력이 설정 시간 이전에 FALSE로 돌아가면 타이머가 리셋되어 출력은 FALSE를 유지합니다. 노이즈 필터링, 기동 지연, 조건 확인 대기 등에 사용됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td style="padding:4px;">입력</td><td style="padding:4px;">LU-Integer</td><td style="padding:4px;">튜닝 다이어그램 번호 (기본값: 96)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BASE</td><td style="padding:4px;">입력</td><td style="padding:4px;">R1</td><td style="padding:4px;">시간 베이스 (초 단위, 최소 0.1초, 기본값: 1.0초)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">디지털 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ENBL</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">Enable 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TARG</td><td style="padding:4px;">입력</td><td style="padding:4px;">R2 (Analog)</td><td style="padding:4px;">지연 시간 설정값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ACT</td><td style="padding:4px;">입력</td><td style="padding:4px;">R3 (Analog)</td><td style="padding:4px;">현재 타이머 경과값 출력 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">디지털 출력 (지연 후 TRUE)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>On Delay 동작:</b> IN1이 FALSE→TRUE로 전환되면 내부 타이머가 시작됩니다. TARG(지연 시간) x BASE(시간 베이스)초가 경과하면 OUT이 TRUE가 됩니다.</p>
<p><b>타이머 리셋:</b> 타이머 진행 중 IN1이 다시 FALSE로 돌아가면 타이머가 즉시 리셋되고, OUT은 FALSE를 유지합니다.</p>
<p><b>Off 동작:</b> IN1이 TRUE→FALSE로 전환되면 OUT은 즉시 FALSE가 됩니다 (Off Delay 없음).</p>
<p><b>경과 시간 모니터링:</b> ACT 포트를 통해 현재 타이머 경과값을 아날로그로 확인할 수 있습니다.</p>
<p><b>Enable 제어:</b> ENBL이 TRUE일 때만 타이머가 동작합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>노이즈 필터링:</b> 압력 센서가 순간적으로 한계값을 넘었다가 돌아오는 스파이크 노이즈를 걸러냅니다. ONDELAY를 3초로 설정하면 3초 이상 지속되는 진짜 과압만 트립 신호로 통과시킵니다.</p>
<p><b>기동 대기:</b> 모터 기동 명령 후 실제 회전 속도가 올라오기까지 대기 시간을 설정하여, 피드백 확인 전에 알람이 발생하는 것을 방지합니다.</p>
<p><b>순간 트립 방지:</b> 센서 노이즈에 의한 불필요한 트립을 방지하기 위해, 트립 조건이 설정 시간 이상 지속될 때만 실제 트립을 발생시킵니다.</p>'''

# ============================================================
# OFFDELAY
# ============================================================
data['OFFDELAY']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">OFFDELAY 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-64 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>OFFDELAY 블록은 디지털 입력이 FALSE가 된 후 설정 시간이 경과해야 출력을 FALSE로 만드는 Off Delay 타이머입니다. 입력이 TRUE가 되면 출력도 즉시 TRUE가 됩니다. 장비 후행 운전, 정지 후 냉각 대기, 접점 채터링 필터링 등에 사용됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td style="padding:4px;">입력</td><td style="padding:4px;">LU-Integer</td><td style="padding:4px;">튜닝 다이어그램 번호 (기본값: 97)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BASE</td><td style="padding:4px;">입력</td><td style="padding:4px;">R1</td><td style="padding:4px;">시간 베이스 (초 단위, 최소 0.1초, 기본값: 1.0초)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">디지털 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TARG</td><td style="padding:4px;">입력</td><td style="padding:4px;">R2 (Analog)</td><td style="padding:4px;">지연 시간 설정값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ACT</td><td style="padding:4px;">입력</td><td style="padding:4px;">R3 (Analog)</td><td style="padding:4px;">현재 타이머 경과값 출력 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">디지털 출력 (지연 후 FALSE)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>Off Delay 동작:</b> IN1이 TRUE→FALSE로 전환되면 내부 타이머가 시작됩니다. TARG(지연 시간) x BASE(시간 베이스)초가 경과하면 OUT이 FALSE가 됩니다.</p>
<p><b>타이머 리셋:</b> 타이머 진행 중 IN1이 다시 TRUE로 돌아가면 타이머가 즉시 리셋되고, OUT은 TRUE를 유지합니다.</p>
<p><b>On 동작:</b> IN1이 FALSE→TRUE로 전환되면 OUT은 즉시 TRUE가 됩니다 (On Delay 없음).</p>
<p><b>경과 시간 모니터링:</b> ACT 포트를 통해 현재 타이머 경과값을 아날로그로 확인할 수 있습니다.</p>
<p><b>펄스 스트레처:</b> 짧은 펄스 입력에 대해 출력을 설정 시간만큼 연장하는 "펄스 스트레처" 용도로도 사용할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>후행 운전 (Post-run):</b> 메인 펌프가 정지한 후에도 윤활유 펌프를 30초간 더 운전하려면, 메인 펌프 운전 신호에 OFFDELAY 30초를 연결합니다.</p>
<p><b>냉각 대기:</b> 용접기가 정지한 후 냉각팬을 60초간 더 돌려 잔열을 제거합니다. 정지 신호에 OFFDELAY를 적용하여 냉각팬 운전 시간을 연장합니다.</p>
<p><b>접점 채터링 필터:</b> 리밋 스위치 등의 기계적 접점에서 발생하는 바운싱(채터링)을 OFFDELAY로 필터링하여 안정적인 신호를 얻습니다.</p>'''

# ============================================================
# ONESHOT
# ============================================================
data['ONESHOT']['detailFull'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">ONESHOT 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-66 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>ONESHOT 블록은 디지털 입력의 상승 에지(FALSE→TRUE 전환)를 감지하여 설정 시간 동안 출력 펄스를 생성하는 블록입니다. 입력이 얼마나 오래 TRUE를 유지하든, 출력은 정확히 설정 시간 동안만 펄스를 생성합니다. 연속 신호를 단발성(원샷) 펄스로 변환합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td style="padding:4px;">입력</td><td style="padding:4px;">LU-Integer</td><td style="padding:4px;">튜닝 다이어그램 번호 (기본값: 98)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BASE</td><td style="padding:4px;">입력</td><td style="padding:4px;">R1</td><td style="padding:4px;">시간 베이스 (초 단위, 최소 0.1초, 기본값: 1.0초)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td style="padding:4px;">입력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">디지털 입력 (상승 에지 감지)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TARG</td><td style="padding:4px;">입력</td><td style="padding:4px;">R2 (Analog)</td><td style="padding:4px;">펄스 시간 설정값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ACT</td><td style="padding:4px;">입력</td><td style="padding:4px;">R3 (Analog)</td><td style="padding:4px;">현재 타이머 경과값 출력 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td style="padding:4px;">출력</td><td style="padding:4px;">Variable (Digital)</td><td style="padding:4px;">디지털 출력 (펄스)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>펄스 생성:</b> IN1이 FALSE→TRUE로 전환되는 순간, OUT이 TRUE가 되고 내부 타이머가 시작됩니다. TARG(펄스 시간) x BASE(시간 베이스)초가 경과하면 OUT은 자동으로 FALSE로 복귀합니다.</p>
<p><b>재트리거 방지:</b> 타이머 진행 중 IN1이 다시 FALSE→TRUE로 전환되어도 타이머는 리셋되지 않습니다. 원래 시간이 끝나야 종료됩니다.</p>
<p><b>고정 펄스 폭:</b> 입력이 얼마나 오래 TRUE를 유지하든, 출력 펄스의 폭은 항상 TARG x BASE초로 일정합니다.</p>
<p><b>경과 시간 모니터링:</b> ACT 포트를 통해 현재 타이머 경과값을 아날로그로 확인할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>솔레노이드 밸브 구동:</b> 솔레노이드 밸브에 정확히 0.5초 펄스 명령을 보내야 할 때 사용합니다. 운전원 버튼 누름 시간에 관계없이 일정한 펄스를 생성합니다.</p>
<p><b>카운터 트리거:</b> COUNTER 블록의 입력을 위해 깨끗한 단일 펄스를 생성합니다. 접점 바운싱이나 긴 신호를 정확한 단발 펄스로 변환합니다.</p>
<p><b>시퀀스 트리거:</b> 특정 조건 발생 시 한 번만 동작해야 하는 시퀀스 단계 진행 신호를 생성합니다. 조건이 유지되는 동안 반복 트리거를 방지합니다.</p>'''

# Save
with open('C:/Users/이성규/AppProduct/ControlLogicEditor/data/ovation_symbols.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done! detailFull added for: AND, OR, NOT, XOR, FLIPFLOP, AAFLIPFLOP, COMPARE, COUNTER, ONDELAY, OFFDELAY, ONESHOT")
