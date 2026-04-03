import json

with open('data/ovation_symbols.json', 'r', encoding='utf-8') as f:
    symbols = json.load(f)

# SVG 다이어그램들
svg_functional = (
'<svg viewBox="0 0 500 320" style="width:100%; max-width:500px; display:block; margin:12px auto;">'
'<defs><marker id="a1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#4fc3f7"/></marker>'
'<marker id="a2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#ff9800"/></marker>'
'<marker id="a3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.4)"/></marker></defs>'
# 메인 박스
'<rect x="150" y="60" width="200" height="160" rx="6" fill="rgba(79,195,247,0.06)" stroke="rgba(79,195,247,0.3)" stroke-width="1.5"/>'
# 내부 블록
'<rect x="175" y="75" width="150" height="45" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>'
'<text x="250" y="103" fill="#4fc3f7" font-size="18" text-anchor="middle" font-weight="bold">&Delta;</text>'
'<rect x="175" y="140" width="50" height="45" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>'
'<text x="200" y="168" fill="#4fc3f7" font-size="16" text-anchor="middle" font-weight="bold">&kappa;</text>'
'<rect x="225" y="140" width="50" height="45" rx="4" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" stroke-width="1"/>'
'<text x="250" y="168" fill="#10b981" font-size="16" text-anchor="middle" font-weight="bold">&int;</text>'
'<rect x="275" y="140" width="50" height="45" rx="4" fill="rgba(233,69,96,0.1)" stroke="rgba(233,69,96,0.3)" stroke-width="1"/>'
'<text x="300" y="163" fill="#e94560" font-size="11" text-anchor="middle" font-weight="bold">d/dt</text>'
# 입력: STPT, PV (상단)
'<text x="240" y="30" fill="#ff9800" font-size="11" font-weight="600">ST|PT</text>'
'<line x1="250" y1="35" x2="250" y2="60" stroke="#ff9800" stroke-width="1.5" marker-end="url(#a2)"/>'
'<text x="330" y="30" fill="#ff9800" font-size="11" font-weight="600">PV</text>'
'<line x1="335" y1="35" x2="335" y2="60" stroke="#ff9800" stroke-width="1.5" marker-end="url(#a2)"/>'
# 입력: PGAIN, INTG, DGAIN, DRAT (좌측)
'<text x="40" y="100" fill="rgba(255,255,255,0.5)" font-size="10">PGAIN</text>'
'<line x1="85" y1="97" x2="150" y2="97" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#a3)"/>'
'<text x="50" y="125" fill="rgba(255,255,255,0.5)" font-size="10">INTG</text>'
'<line x1="85" y1="122" x2="150" y2="122" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#a3)"/>'
'<text x="38" y="150" fill="rgba(255,255,255,0.5)" font-size="10">DGAIN</text>'
'<line x1="85" y1="147" x2="150" y2="147" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#a3)"/>'
'<text x="50" y="175" fill="rgba(255,255,255,0.5)" font-size="10">DRAT</text>'
'<line x1="85" y1="172" x2="150" y2="172" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#a3)"/>'
# 출력: OUT (하단)
'<line x1="250" y1="220" x2="250" y2="270" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#a1)"/>'
'<text x="250" y="290" fill="#4fc3f7" font-size="12" text-anchor="middle" font-weight="bold">OUT</text>'
# 출력: DEVA (우측)
'<line x1="350" y1="140" x2="420" y2="140" stroke="#10b981" stroke-width="1.5" marker-end="url(#a1)"/>'
'<text x="440" y="145" fill="#10b981" font-size="11" font-weight="600">DEVA</text>'
# 출력: TOUT (상단 좌)
'<text x="175" y="30" fill="#a78bfa" font-size="11" font-weight="600">TOUT</text>'
'<line x1="185" y1="60" x2="185" y2="38" stroke="#a78bfa" stroke-width="1.5" marker-end="url(#a1)"/>'
# 입력: TRIN (하단 좌)
'<text x="140" y="270" fill="rgba(255,255,255,0.4)" font-size="10">TRIN</text>'
'<line x1="165" y1="260" x2="165" y2="225" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#a3)"/>'
'</svg>'
)

svg_laplace = (
'<svg viewBox="0 0 700 200" style="width:100%; max-width:700px; display:block; margin:12px auto;">'
'<defs><marker id="b1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#4fc3f7"/></marker>'
'<marker id="b2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#ff9800"/></marker></defs>'
# Error 입력
'<text x="5" y="105" fill="#ff9800" font-size="12" font-weight="bold">Error</text>'
'<line x1="50" y1="100" x2="100" y2="100" stroke="#ff9800" stroke-width="1.5" marker-end="url(#b2)"/>'
# 분기점
'<circle cx="105" cy="100" r="3" fill="#4fc3f7"/>'
'<line x1="105" y1="100" x2="105" y2="35" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>'
'<line x1="105" y1="100" x2="105" y2="165" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>'
# P 블록
'<line x1="105" y1="35" x2="160" y2="35" stroke="#4fc3f7" stroke-width="1.5"/>'
'<rect x="160" y="18" width="90" height="34" rx="4" fill="rgba(79,195,247,0.12)" stroke="#4fc3f7" stroke-width="1.5"/>'
'<text x="205" y="40" fill="#4fc3f7" font-size="14" text-anchor="middle" font-weight="bold">Kp</text>'
'<text x="205" y="12" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">비례 (P)</text>'
'<line x1="250" y1="35" x2="390" y2="35" stroke="#4fc3f7" stroke-width="1.5"/>'
# I 블록
'<line x1="105" y1="100" x2="160" y2="100" stroke="#10b981" stroke-width="1.5"/>'
'<rect x="160" y="83" width="90" height="34" rx="4" fill="rgba(16,185,129,0.12)" stroke="#10b981" stroke-width="1.5"/>'
'<text x="205" y="105" fill="#10b981" font-size="14" text-anchor="middle" font-weight="bold">1/s&tau;i</text>'
'<text x="205" y="77" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">적분 (I)</text>'
'<line x1="250" y1="100" x2="390" y2="100" stroke="#10b981" stroke-width="1.5"/>'
# D 블록
'<line x1="105" y1="165" x2="160" y2="165" stroke="#e94560" stroke-width="1.5"/>'
'<rect x="160" y="148" width="90" height="34" rx="4" fill="rgba(233,69,96,0.12)" stroke="#e94560" stroke-width="1.5"/>'
'<text x="205" y="168" fill="#e94560" font-size="11" text-anchor="middle" font-weight="bold">Kds/(s&tau;d+1)</text>'
'<text x="205" y="143" fill="rgba(255,255,255,0.35)" font-size="9" text-anchor="middle">미분 (D)</text>'
'<line x1="250" y1="165" x2="390" y2="165" stroke="#e94560" stroke-width="1.5"/>'
# 합산 연결선
'<line x1="390" y1="35" x2="390" y2="165" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>'
# 합산점
'<circle cx="420" cy="100" r="16" fill="rgba(255,255,255,0.05)" stroke="#fff" stroke-width="1.5"/>'
'<text x="420" y="106" fill="#fff" font-size="18" text-anchor="middle">+</text>'
'<line x1="390" y1="100" x2="404" y2="100" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>'
# Limits
'<line x1="436" y1="100" x2="500" y2="100" stroke="#fff" stroke-width="1.5" marker-end="url(#b1)"/>'
'<rect x="505" y="80" width="90" height="40" rx="4" fill="rgba(255,152,0,0.1)" stroke="#ff9800" stroke-width="1.5"/>'
'<text x="550" y="96" fill="#ff9800" font-size="10" text-anchor="middle">Algorithm</text>'
'<text x="550" y="110" fill="#ff9800" font-size="10" text-anchor="middle">Limits</text>'
# 출력
'<line x1="595" y1="100" x2="660" y2="100" stroke="#ff9800" stroke-width="1.5" marker-end="url(#b2)"/>'
'<text x="675" y="105" fill="#ff9800" font-size="12" font-weight="bold">OUT</text>'
'</svg>'
)

svg_cascade = (
'<svg viewBox="0 0 600 160" style="width:100%; max-width:600px; display:block; margin:12px auto;">'
'<defs><marker id="c1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#4fc3f7"/></marker>'
'<marker id="c2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#a78bfa"/></marker></defs>'
# 상위 PID
'<rect x="30" y="40" width="150" height="70" rx="6" fill="rgba(79,195,247,0.08)" stroke="#4fc3f7" stroke-width="1.5"/>'
'<text x="105" y="68" fill="#4fc3f7" font-size="13" text-anchor="middle" font-weight="bold">상위 PID</text>'
'<text x="105" y="85" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="middle">Controller A</text>'
'<text x="105" y="100" fill="rgba(255,255,255,0.3)" font-size="9" text-anchor="middle">(예: 온도)</text>'
# 연결선 OUT → SP
'<line x1="180" y1="75" x2="260" y2="75" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#c1)"/>'
'<text x="220" y="67" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">OUT&rarr;SP</text>'
# 하위 PID
'<rect x="265" y="40" width="170" height="70" rx="6" fill="rgba(233,69,96,0.08)" stroke="#e94560" stroke-width="1.5"/>'
'<text x="350" y="68" fill="#e94560" font-size="13" text-anchor="middle" font-weight="bold">하위 PID</text>'
'<text x="350" y="85" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="middle">Controller B (CASC)</text>'
'<text x="350" y="100" fill="rgba(255,255,255,0.3)" font-size="9" text-anchor="middle">(예: 유량)</text>'
# 최종 출력
'<line x1="435" y1="75" x2="530" y2="75" stroke="#e94560" stroke-width="1.5" marker-end="url(#c1)"/>'
'<text x="550" y="80" fill="#ff9800" font-size="12" font-weight="bold">OUT</text>'
'<text x="550" y="95" fill="rgba(255,255,255,0.3)" font-size="9">최종출력</text>'
# TRKOUT 피드백
'<line x1="350" y1="110" x2="350" y2="140" stroke="#a78bfa" stroke-width="1" stroke-dasharray="4,3"/>'
'<line x1="350" y1="140" x2="105" y2="140" stroke="#a78bfa" stroke-width="1" stroke-dasharray="4,3"/>'
'<line x1="105" y1="140" x2="105" y2="115" stroke="#a78bfa" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#c2)"/>'
'<text x="230" y="152" fill="#a78bfa" font-size="9" text-anchor="middle">TRKOUT (Conditional Track)</text>'
'</svg>'
)

pid_detail = (
'<h3 style="color:#4fc3f7; margin:0 0 4px;">PID 제어기 상세 매뉴얼</h3>'
'<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-69 (p.283~292) 기반</div>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>'
'<p>PID 블록은 현재값 PV(Process Variable)와 목표값 STPT(Set Point)의 차이를 줄이기 위해 '
'비례(P), 적분(I), 미분(D) 세 가지 제어 동작을 동시에 수행하여 제어출력 OUT을 계산합니다. '
'세 동작이 병렬로 계산되어 합산되는 구조(Parallel PID)이며, 모드 전환 시 출력이 급변하지 않는 '
'Bumpless Transfer(무충격 전환) 기능과 출력이 한계에 걸렸을 때 적분값이 과도하게 쌓이는 것을 '
'방지하는 Anti-reset Windup 기능이 내장되어 있습니다.</p>'

'<div style="text-align:center; font-size:10px; color:rgba(255,255,255,0.4); margin-top:8px;">▼ Functional Symbol</div>'
+ svg_functional +

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 입력 정규화</h4>'
'<p>PID 블록 내부에서는 모든 계산이 0~100% 범위에서 이루어집니다. 따라서 PV와 STPT가 블록에 '
'들어오기 전에 Gain(게인)과 Bias(보정값)를 사용하여 0~100%로 변환해야 합니다.</p>'
'<p>예를 들어 온도 센서의 측정 범위가 0~300도라면:</p>'
'<div style="padding:10px 14px; background:rgba(0,0,0,0.25); border-radius:6px; font-family:monospace; margin:8px 0; line-height:1.8; font-size:12px;">'
'PVG(PV Gain) = 100 / (300 - 0) = 0.333<br>'
'PVB(PV Bias) = -0.333 &times; 0 = 0<br><br>'
'<span style="color:rgba(255,255,255,0.4);">결과:</span> 0도 &rarr; 0%, 150도 &rarr; 50%, 300도 &rarr; 100%'
'</div>'
'<p>STPT(목표값)도 동일한 방식으로 SPTG/SPTB를 설정합니다. 이 정규화를 하지 않으면 PID 계산이 올바르게 동작하지 않습니다.</p>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 출력 계산</h4>'
'<p>먼저 Error(편차)를 계산합니다. ACT(Action) 설정에 따라:</p>'
'<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">'
'<tr style="background:rgba(79,195,247,0.08);"><td style="padding:8px 12px; font-weight:600; color:#4fc3f7; width:110px;">INDIRECT</td>'
'<td style="padding:8px 12px;">Error = SP - PV. PV&uarr; &rarr; OUT&darr; <span style="color:rgba(255,255,255,0.4);">(예: 가열 밸브)</span></td></tr>'
'<tr style="background:rgba(255,255,255,0.02);"><td style="padding:8px 12px; font-weight:600; color:#4fc3f7;">DIRECT</td>'
'<td style="padding:8px 12px;">Error = PV - SP. PV&uarr; &rarr; OUT&uarr; <span style="color:rgba(255,255,255,0.4);">(예: 냉각 밸브)</span></td></tr>'
'</table>'

'<p>Error가 구해지면 세 가지 제어 동작이 동시에 계산되어 합산됩니다:</p>'

'<div style="text-align:center; font-size:10px; color:rgba(255,255,255,0.4); margin-top:8px;">▼ LaPlace Transform 구조</div>'
+ svg_laplace +

'<div style="padding:12px 14px; background:rgba(0,0,0,0.3); border-radius:8px; font-family:monospace; margin:10px 0; line-height:2.0; font-size:12px; color:#7dd3fc;">'
'OUT = Kp &times; Error &nbsp;+&nbsp; (1/&tau;<sub>i</sub>) &times; &int;Error dt &nbsp;+&nbsp; Kd &times; d(din)/dt<br><br>'
'<span style="color:rgba(255,255,255,0.5);">Kp</span> = PGAIN &mdash; 편차에 비례하여 즉각 반응하는 강도<br>'
'<span style="color:rgba(255,255,255,0.5);">&tau;<sub>i</sub></span> = INTG &mdash; 편차를 누적하여 잔류 오차를 없애는 속도 (sec/repeat)<br>'
'<span style="color:rgba(255,255,255,0.5);">Kd</span> = DGAIN &mdash; 편차 변화 속도에 대응하는 강도<br>'
'<span style="color:rgba(255,255,255,0.5);">&tau;<sub>d</sub></span> = DRAT &mdash; 미분 동작의 감쇠 시정수 (초)</div>'

'<p>각 파라미터를 0으로 설정하면 해당 동작을 끌 수 있습니다. PGAIN=0이면 P 제외(I+D만), '
'INTG=0이면 I 제외(P+D만), DGAIN=0이면 D 제외(P+I만). 출력은 TPSC(출력 상한)와 '
'BTSC(출력 하한) 사이로 제한되며, 한계에 걸리면 적분값 누적이 자동으로 멈춥니다(Anti-reset Windup).</p>'

'<p>DACT(Derivative Action)로 미분을 어디에 적용할지 선택합니다:</p>'
'<ul style="margin:8px 0; padding-left:20px; color:rgba(255,255,255,0.7); line-height:1.6;">'
'<li><b>Normal</b> &mdash; Error 변화에 미분 적용. 가장 일반적</li>'
'<li><b>SetPoint</b> &mdash; SP 변화에만 적용. SP 변경 시 출력이 튀는 것(Derivative Kick) 방지</li>'
'<li><b>Process</b> &mdash; PV 변화에만 적용. SP 변경에 무반응. 가장 안정적</li></ul>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 출력 예외 상황</h4>'
'<ul style="margin:8px 0; padding-left:20px; color:rgba(255,255,255,0.7); line-height:1.7;">'
'<li><b>Track 신호</b> &mdash; 출력이 TRIN 값을 추적. 해제 시 TRAT 속도로 제어값으로 복귀</li>'
'<li><b>Raise/Lower Inhibit</b> &mdash; 하위에서 "더 이상 올리지/내리지 마" 신호를 보내면 해당 방향 출력 변화 차단</li>'
'<li><b>Invalid 출력</b> &mdash; 품질 BAD, 드롭 알람. 마지막 GOOD 값 유지</li></ul>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">5. Dead Band (불감대)</h4>'
'<p>DBND(Dead Band)를 설정하면 Controller Error에 불감대가 적용됩니다. '
'DBND 값은 양쪽 대칭(bilateral)으로 적용되어, DBND=5이면 -5%~+5% 범위가 불감대 영역이 됩니다.</p>'

'<p><b>불감대 내에서의 Error 계산:</b></p>'
'<div style="padding:12px 14px; background:rgba(0,0,0,0.3); border-radius:8px; font-family:monospace; margin:10px 0; line-height:2.0; font-size:12px; color:#7dd3fc;">'
'|Error| &le; DBND 일 때:<br>'
'&nbsp;&nbsp;Effective Error = Error &times; ERRD<br><br>'
'|Error| &gt; DBND 일 때:<br>'
'&nbsp;&nbsp;Effective Error = Error (원래 값 그대로 사용)'
'</div>'

'<p>ERRD(Dead Band Ratio)는 일반적으로 0~1 범위의 값으로, 불감대 안에서 Error를 얼마나 감쇠시킬지 결정합니다.</p>'

'<p><b>예시 (DBND=5, ERRD=0.5):</b></p>'
'<table style="width:100%; border-collapse:collapse; font-size:11px; margin:10px 0;">'
'<tr style="background:rgba(79,195,247,0.08);"><th style="padding:6px 10px; text-align:left; color:#4fc3f7;">실제 Error</th>'
'<th style="padding:6px 10px; text-align:left; color:#4fc3f7;">불감대 내?</th>'
'<th style="padding:6px 10px; text-align:left; color:#4fc3f7;">적용 Error</th></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">2%</td><td>예 (|2| &le; 5)</td><td>2 &times; 0.5 = <b>1%</b></td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">4%</td><td>예 (|4| &le; 5)</td><td>4 &times; 0.5 = <b>2%</b></td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">-3%</td><td>예 (|-3| &le; 5)</td><td>-3 &times; 0.5 = <b>-1.5%</b></td></tr>'
'<tr><td style="padding:5px 10px;">8%</td><td>아니오 (|8| &gt; 5)</td><td><b>8%</b> (원래 값)</td></tr></table>'

'<p><b>불감대 내 미분 비활성화:</b> Error가 불감대 범위 안에 있으면 미분(D) 동작은 자동으로 꺼집니다. '
'이는 작은 Error 진동에 의해 미분항이 과도하게 반응하는 것을 방지합니다.</p>'

'<p><b>Hold &amp; Track 전환 메커니즘:</b> Error가 불감대 경계를 넘나들 때(진입 또는 이탈 시) '
'비례항의 급격한 변화를 방지하기 위해 Hold &amp; Track 동작이 수행됩니다. '
'전환 사이클 동안 출력은 이전 값(Last Value)을 유지하고, 적분항이 현재 출력과 일치하도록 재계산(Re-balance)됩니다. '
'이를 통해 불감대 진입/이탈 시 출력이 급변(bump)하지 않고 부드럽게 전환됩니다.</p>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">6. Tracking Signal</h4>'
'<p>TRSIG(Tracking Signal) 포트의 각 비트는 PID 출력의 추적, 억제, 모드 등을 제어합니다. '
'아래 테이블에서 <span style="color:#ff9800;">*</span> 표시는 Track 신호(Bit 16)가 없을 때만 동작하며, '
'<span style="color:#ff9800;">**</span> 표시는 Track 신호가 없을 때만 통과하고 Section 2-6 정의에 따라 설정됩니다.</p>'

'<table style="width:100%; border-collapse:collapse; font-size:11px; margin:10px 0;">'
'<tr style="background:rgba(79,195,247,0.08);"><th style="padding:6px 10px; text-align:left; color:#4fc3f7; width:55px;">Bit</th>'
'<th style="padding:6px 10px; text-align:left; color:#4fc3f7; width:140px;">신호</th>'
'<th style="padding:6px 10px; text-align:left; color:#4fc3f7;">상세 동작</th></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">16</td><td>Track</td>'
'<td>출력을 TRIN(Track Input) 값으로 강제 추적. 해제 시 TRAT(Track Rate) 속도로 원래 제어 출력값으로 복귀. '
'Track이 활성화되면 PID 계산은 중단되고 적분항이 현재 TRIN에 맞게 재조정됨</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">17</td><td>Track if Lower <span style="color:#ff9800;">*</span></td>'
'<td>TRIN 값이 현재 PID 계산 출력보다 낮을 때만 추적. Manual 모드에서는 무시됨</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">18</td><td>Track if Higher <span style="color:#ff9800;">*</span></td>'
'<td>TRIN 값이 현재 PID 계산 출력보다 높을 때만 추적. Manual 모드에서는 무시됨</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">19</td><td>Lower Inhibit <span style="color:#ff9800;">*</span></td>'
'<td>출력 감소 방향 차단. 하위 장치에서 "더 이상 내리지 마" 요청 시 사용</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">20</td><td>Raise Inhibit <span style="color:#ff9800;">*</span></td>'
'<td>출력 증가 방향 차단. 하위 장치에서 "더 이상 올리지 마" 요청 시 사용</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">21</td><td>Conditional Track <span style="color:#ff9800;">**</span></td>'
'<td>캐스케이드 구조에서 하위 제어기 출력 포화 시 상위 제어기의 적분항 연동. Section 8 참조</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">25</td><td>Manual</td>'
'<td>현재 Manual 모드임을 표시. Manual 모드에서는 Track if Lower/Higher(Bit 17/18) 무시됨</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">26</td><td>Auto</td>'
'<td>현재 Auto 모드임을 표시</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:5px 10px;">30</td><td>High Limit Reached</td>'
'<td>출력이 상한(TPSC)에 도달했음을 표시</td></tr>'
'<tr><td style="padding:5px 10px;">31</td><td>Low Limit Reached</td>'
'<td>출력이 하한(BTSC)에 도달했음을 표시</td></tr></table>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">7. PID 타입 (TYPE)</h4>'
'<ul style="margin:8px 0; padding-left:20px; color:rgba(255,255,255,0.7); line-height:1.6;">'
'<li><b>NORMAL</b> &mdash; 표준 PID. 대부분의 경우 사용</li>'
'<li><b>ESG</b> &mdash; 비례항에 Error&sup2; 적용. 작은 편차에서 부드럽게, 큰 편차에서 강하게</li>'
'<li><b>ESI</b> &mdash; 적분항에 Error&sup2; 적용. 큰 편차에서 적분 속도 증가</li></ul>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">8. 캐스케이드 모드</h4>'
'<p>CASC를 CASCADED로 설정하면 캐스케이드 하위 제어기로 동작합니다. 상위 PID 출력이 하위 PID의 목표값이 되는 이중 루프 구조입니다. '
'<b>CASCADED는 반드시 하위 제어기에만 설정하며, 상위 제어기에는 설정하지 않습니다.</b></p>'

'<div style="text-align:center; font-size:10px; color:rgba(255,255,255,0.4); margin-top:8px;">▼ 캐스케이드 구조</div>'
+ svg_cascade +

'<p><b>Conditional Tracking 동작 순서:</b></p>'
'<ol style="margin:8px 0; padding-left:20px; color:rgba(255,255,255,0.7); line-height:1.8; font-size:12px;">'
'<li>하위 제어기(Controller B)의 출력이 상한(TPSC) 또는 하한(BTSC)에 도달하여 포화(Saturation) 발생</li>'
'<li>하위 제어기가 TRKOUT(Track Output)을 통해 상위 제어기(Controller A)에 포화 상태를 알림</li>'
'<li>상위 제어기는 Error의 방향을 확인하여 분기 판단:<br>'
'<div style="padding:8px 14px; background:rgba(0,0,0,0.25); border-radius:6px; margin:6px 0; font-size:11px; line-height:1.8;">'
'&bull; <b>하위 출력이 상한 포화 + 상위 Error가 출력을 더 올리는 방향</b>: 상위 적분항 누적 중지 (Windup 방지)<br>'
'&bull; <b>하위 출력이 하한 포화 + 상위 Error가 출력을 더 내리는 방향</b>: 상위 적분항 누적 중지 (Windup 방지)<br>'
'&bull; <b>Error 방향이 포화 해제 방향인 경우</b>: 상위 제어기 정상 동작 유지</div></li>'
'<li>포화가 해제되면 하위 제어기는 Conditional Track 신호를 해제하고, 상위 제어기가 즉시 정상 제어를 재개</li></ol>'

'<p><b>Track Output 계산식:</b></p>'
'<div style="padding:12px 14px; background:rgba(0,0,0,0.3); border-radius:8px; font-family:monospace; margin:10px 0; line-height:2.0; font-size:12px; color:#7dd3fc;">'
'INDIRECT 모드 (ACT = Indirect):<br>'
'&nbsp;&nbsp;TRKOUT = TPSC - (OUT - BTSC)<br>'
'&nbsp;&nbsp;<span style="color:rgba(255,255,255,0.4);">→ 출력이 상한에 가까울수록 TRKOUT이 작아짐</span><br><br>'
'DIRECT 모드 (ACT = Direct):<br>'
'&nbsp;&nbsp;TRKOUT = BTSC + (TPSC - OUT)<br>'
'&nbsp;&nbsp;<span style="color:rgba(255,255,255,0.4);">→ 출력이 하한에 가까울수록 TRKOUT이 커짐</span>'
'</div>'

'<p><b>Conditional Tracking이 없을 때의 문제점:</b> 하위 제어기가 포화 상태에 있는 동안 상위 제어기의 '
'적분항이 계속 누적됩니다(Windup). 하위 포화가 해제되더라도 상위의 과도하게 쌓인 적분항이 정상 범위로 돌아오는 데 '
'추가 Dead Time이 발생합니다. 이 지연은 <b>느린 프로세스(예: 온도 제어)에서 특히 심각</b>하여, '
'수 분에서 수십 분의 불필요한 지연과 오버슈트를 초래할 수 있습니다.</p>'

'<h4 style="color:#4fc3f7; margin:20px 0 8px;">9. 포트 정의</h4>'
'<p>PID 블록의 연결 포트(Variable)와 파라미터(R/S/X/LU) 전체 목록입니다.</p>'

'<h5 style="color:rgba(79,195,247,0.8); margin:14px 0 6px; font-size:12px;">연결 포트 (Variable)</h5>'
'<table style="width:100%; border-collapse:collapse; font-size:11px; margin:10px 0;">'
'<tr style="background:rgba(79,195,247,0.08);">'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">포트</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">LC Field</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">타입</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">필수</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">기본값</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">설명</th></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">PV</td><td>IN1</td><td>Input</td><td>필수</td><td>-</td><td>공정 변수 (Process Variable)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">STPT</td><td>IN2</td><td>Input</td><td>선택</td><td>50%</td><td>설정점 (Set Point). 미연결 시 내부값 사용</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">TRIN</td><td>IN3</td><td>Input</td><td>선택</td><td>0</td><td>트래킹 입력 (Track Input). Track 모드에서 추적할 값</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">TRSIG</td><td>IN4</td><td>Input</td><td>선택</td><td>0</td><td>트래킹 신호 (Tracking Signal). 비트별 제어 신호</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">OUT</td><td>OUT1</td><td>Output</td><td>필수</td><td>-</td><td>제어 출력 (0~100%)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">DEVA</td><td>OUT2</td><td>Output</td><td>선택</td><td>-</td><td>편차 출력 (Deviation Alarm). |Error| 값</td></tr>'
'<tr><td style="padding:4px 8px;">TOUT</td><td>OUT3</td><td>Output</td><td>선택</td><td>-</td><td>트래킹 출력 (Track Output). 캐스케이드 상위로 피드백</td></tr></table>'

'<h5 style="color:rgba(79,195,247,0.8); margin:14px 0 6px; font-size:12px;">파라미터 (R/S/X/LU)</h5>'
'<table style="width:100%; border-collapse:collapse; font-size:11px; margin:10px 0;">'
'<tr style="background:rgba(79,195,247,0.08);">'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">파라미터</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">LC Field</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">타입</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">기본값</th>'
'<th style="padding:6px 8px; text-align:left; color:#4fc3f7;">설명</th></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">PGAIN</td><td>R1</td><td>Real</td><td>1.0</td><td>비례 게인 (Proportional Gain)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">INTG</td><td>R2</td><td>Real</td><td>0</td><td>적분 시간 (Integral Time, sec/repeat). 0=적분 없음</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">DGAIN</td><td>R3</td><td>Real</td><td>0</td><td>미분 게인 (Derivative Gain). 0=미분 없음</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">DRAT</td><td>R4</td><td>Real</td><td>0</td><td>미분 필터 시정수 (Derivative Rate, 초)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">PVG</td><td>R5</td><td>Real</td><td>1.0</td><td>PV 게인 (PV Gain). 정규화 용도</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">PVB</td><td>R6</td><td>Real</td><td>0</td><td>PV 바이어스 (PV Bias). 정규화 용도</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">SPTG</td><td>R7</td><td>Real</td><td>1.0</td><td>SP 게인 (Set Point Gain). 정규화 용도</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">SPTB</td><td>R8</td><td>Real</td><td>0</td><td>SP 바이어스 (Set Point Bias). 정규화 용도</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">TPSC</td><td>R9</td><td>Real</td><td>100</td><td>출력 상한 (Top Scale, %)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">BTSC</td><td>R10</td><td>Real</td><td>0</td><td>출력 하한 (Bottom Scale, %)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">TRAT</td><td>R11</td><td>Real</td><td>0</td><td>트래킹 복귀 속도 (Track Rate, %/sec). 0=즉시 복귀</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">DBND</td><td>R12</td><td>Real</td><td>0</td><td>불감대 범위 (Dead Band, %). 0=불감대 없음</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">ERRD</td><td>R13</td><td>Real</td><td>0</td><td>불감대 내 Error 감쇠비 (0~1)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">ACT</td><td>S1</td><td>Select</td><td>INDIRECT</td><td>동작 방향 (INDIRECT: SP-PV, DIRECT: PV-SP)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">TYPE</td><td>S2</td><td>Select</td><td>NORMAL</td><td>PID 타입 (NORMAL / ESG / ESI)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">DACT</td><td>S3</td><td>Select</td><td>NORMAL</td><td>미분 적용 대상 (NORMAL / SETPOINT / PROCESS)</td></tr>'
'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px 8px;">CASC</td><td>S4</td><td>Select</td><td>NORMAL</td><td>캐스케이드 설정 (NORMAL / CASCADED)</td></tr></table>'
)

symbols['PID']['detailFull'] = pid_detail
with open('data/ovation_symbols.json', 'w', encoding='utf-8') as f:
    json.dump(symbols, f, ensure_ascii=False, indent=2)

print(f'PID detailFull (SVG 포함) 저장 완료: {len(pid_detail)}자')
