#!/usr/bin/env python3
"""Batch 2: Add detailFull to SUM, MULTIPLY, DIVIDE, SQUAREROOT, FUNCTION, CALCBLOCK, GAINBIAS, SELECTOR, HISELECT, LOSELECT, MEDIANSEL, RATELIMIT"""
import json
import os

JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'ovation_symbols.json')

detail_fulls = {}

# ============================================================
# SUM
# ============================================================
detail_fulls['SUM'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">SUM 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-105 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>SUM 알고리즘은 최대 4개의 아날로그 입력을 가중 합산하는 블록입니다. 각 입력에 개별 Gain(이득)과 Bias(바이어스)를 적용할 수 있어 단순 덧셈뿐 아니라 가중 합산, 차이 계산 등 다양한 연산이 가능합니다.</p>
<p><b>수식:</b> OUT = (IN1 × G1 + B1) + (IN2 × G2 + B2) + (IN3 × G3 + B3) + (IN4 × G4 + B4)</p>
<p>IN1은 필수 입력이며, IN2~IN4는 선택입니다. 미사용 입력은 0으로 처리됩니다. 각 입력의 Gain을 절대로 0으로 초기화하면 안 됩니다(0 설정 시 알람 발생).</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 84)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R3</td><td>입력1 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R4</td><td>입력1 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2G</td><td>입력</td><td>R1</td><td>입력2 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2B</td><td>입력</td><td>R2</td><td>입력2 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3G</td><td>입력</td><td>R8</td><td>입력3 Gain (기본값: 1.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3B</td><td>입력</td><td>R9</td><td>입력3 Bias (기본값: 0.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4G</td><td>입력</td><td>S1</td><td>입력4 Gain (기본값: 1.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4B</td><td>입력</td><td>S2</td><td>입력4 Bias (기본값: 0.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R7</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3</td><td>입력</td><td>Variable</td><td>아날로그 입력 3 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4</td><td>입력</td><td>Variable</td><td>아날로그 입력 4 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값, 모드 및 상태 신호</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>각 입력에 Gain을 곱하고 Bias를 더한 후 4개의 결과를 합산합니다. 출력은 TPSC(상한)와 BTSC(하한) 범위로 클램핑됩니다.</p>
<p>TRIN 포트가 연결되면 트래킹 모드에서 정상 모드로 전환 시 TRAT 속도로 램프하여 범프리스 전환을 지원합니다. TOUT는 현재 출력 상태를 하류 블록에 전달합니다.</p>
<p>입력이 Invalid(무효)하면 출력은 알람 상태가 됩니다. Gain을 음수로 설정하면 해당 입력을 빼는 효과가 됩니다(예: G2=-1로 설정 시 감산).</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>보일러 급수 편차 계산:</b> IN1에 드럼 수위(G1=1), IN2에 급수 유량(G2=-1)을 연결하면 OUT = 수위 - 유량 편차를 구할 수 있습니다.</p>
<p><b>다중 신호 합산:</b> 여러 연료 유량을 합산하여 총 연료 투입량을 계산할 때 4개 입력을 모두 활용합니다.</p>
<p><b>가중 평균:</b> 각 입력의 Gain을 가중치로 설정하여 가중 합산을 구현할 수 있습니다.</p>'''

# ============================================================
# MULTIPLY
# ============================================================
detail_fulls['MULTIPLY'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">MULTIPLY 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-61 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>MULTIPLY 알고리즘은 2개의 아날로그 입력을 곱하는 블록입니다. 각 입력에 Gain과 Bias를 적용한 후 곱셈을 수행합니다.</p>
<p><b>수식:</b> OUT = (IN1 × G1 + B1) × (IN2 × G2 + B2)</p>
<p>각 입력의 Gain을 절대로 0으로 초기화하면 안 됩니다(0 설정 시 알람 발생). 출력은 TPSC/BTSC로 상/하한이 제한됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 82)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R1</td><td>입력1 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R2</td><td>입력1 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2G</td><td>입력</td><td>R3</td><td>입력2 Gain (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2B</td><td>입력</td><td>R4</td><td>입력2 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R7</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값, 모드 및 상태 신호</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>각 입력에 Gain을 곱하고 Bias를 더한 후, 두 결과를 곱하여 출력합니다. 출력은 TPSC/BTSC 범위로 클램핑됩니다.</p>
<p>TRIN 포트를 통해 트래킹 모드를 지원하며, 트래킹에서 정상 모드 전환 시 TRAT 속도로 램프합니다. TOUT는 현재 출력 상태를 하류에 전달합니다.</p>
<p>입력이 Invalid하면 출력은 알람 상태가 됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>비율 제어(Ratio Control):</b> 공기-연료비(A/F Ratio) × 연료 유량 = 필요 공기량을 계산할 때, IN1에 A/F Ratio, IN2에 연료 유량을 연결합니다.</p>
<p><b>보상 계산:</b> 온도 보상 계수 × 측정값으로 온도 보정된 유량을 구할 수 있습니다.</p>
<p><b>면적 계산:</b> 길이 × 폭 등 물리량의 곱셈이 필요한 경우에 활용합니다.</p>'''

# ============================================================
# DIVIDE
# ============================================================
detail_fulls['DIVIDE'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">DIVIDE 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-32 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>DIVIDE 알고리즘은 2개의 아날로그 입력을 나누는 블록입니다. 분자(IN1)를 분모(IN2)로 나누며, 각 입력에 Gain과 Bias를 적용합니다.</p>
<p><b>수식:</b> OUT = (IN1 × G1 + B1) / (IN2 × G2 + B2)</p>
<p>분모가 0이 되면 무한대가 발생하므로, 이 경우 출력은 부호에 따라 TPSC 또는 BTSC로 제한됩니다. 분모 0은 DCS에서 주의가 필요합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 81)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R1</td><td>입력1(분자) Gain (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R2</td><td>입력1(분자) Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2G</td><td>입력</td><td>R3</td><td>입력2(분모) Gain (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2B</td><td>입력</td><td>R4</td><td>입력2(분모) Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: -100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R7</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1 - 분자 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2 - 분모 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값, 모드 및 상태 신호</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>분자(IN1×G1+B1)를 분모(IN2×G2+B2)로 나누어 출력합니다. 분모가 0이 되면 출력은 부호에 따라 TPSC 또는 BTSC로 클램핑됩니다.</p>
<p>각 입력의 Gain을 0으로 설정하면 알람 상태가 됩니다. 트래킹 모드(TRIN)를 지원하여 범프리스 전환이 가능합니다.</p>
<p>입력이 Invalid하면 출력은 알람 상태가 됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>공기-연료비 계산:</b> A/F Ratio = 공기 유량 / 연료 유량으로 연소 제어에서 비율을 모니터링합니다.</p>
<p><b>효율 계산:</b> 효율 = 출력 / 입력으로 보일러, 터빈 등의 효율을 실시간 산출합니다.</p>
<p><b>정규화:</b> 측정값을 기준값으로 나누어 퍼센트 단위로 정규화할 때 사용합니다.</p>'''

# ============================================================
# SQUAREROOT
# ============================================================
detail_fulls['SQUAREROOT'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">SQUAREROOT 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-100 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>SQUAREROOT 알고리즘은 아날로그 입력의 제곱근을 계산하는 블록입니다. 입력에 Gain과 Bias를 적용한 후 제곱근을 취합니다.</p>
<p><b>수식:</b> OUT = √(IN1 × G + B)</p>
<p>주로 차압식 유량계(오리피스, 벤츄리 등)에서 차압(DP)을 유량으로 변환할 때 사용됩니다. 유량 ∝ √(DP)이므로 이 블록이 필수적입니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 77)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R1</td><td>입력 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R2</td><td>입력 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R3</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R4</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R5</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값, 모드 및 상태 신호</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>입력에 Gain을 곱하고 Bias를 더한 후 제곱근을 취합니다. 입력값(IN1×G+B)이 음수이면 제곱근 계산이 불가하므로 출력은 0으로 제한됩니다.</p>
<p>Gain을 0으로 설정하면 알람 상태가 됩니다. 출력은 TPSC/BTSC 범위로 클램핑됩니다.</p>
<p>트래킹 모드(TRIN)를 지원하며, TOUT로 현재 상태를 하류 블록에 전달합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>차압→유량 변환:</b> 오리피스 유량계의 DP 신호를 유량 값으로 변환합니다. 유량 = K × √(DP)에서 K를 Gain으로 설정합니다.</p>
<p><b>벤츄리 유량 계산:</b> 벤츄리 미터, 노즐 등 차압식 유량 측정 기기의 신호 처리에 활용합니다.</p>
<p><b>일반 제곱근 연산:</b> 수학적으로 제곱근이 필요한 모든 계산에 사용할 수 있습니다.</p>'''

# ============================================================
# FUNCTION
# ============================================================
detail_fulls['FUNCTION'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">FUNCTION 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-39 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>FUNCTION 알고리즘은 구간별 선형 함수(Piecewise Linear Function)를 생성하는 블록입니다. 최대 12개의 X-Y 좌표점(Breakpoint)으로 정의된 비선형 함수를 구현합니다.</p>
<p>입력값(IN1)에 대응하는 출력값을 좌표점 사이의 선형 보간(Linear Interpolation)으로 계산합니다. 입력에 Gain과 Bias를 적용한 후 함수를 통과시킵니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 105)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">GAIN</td><td>입력</td><td>T7</td><td>입력 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BIAS</td><td>입력</td><td>T8</td><td>입력 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>T9</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>U1</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>U2</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BPTS</td><td>입력</td><td>X1</td><td>브레이크포인트 수 (X,Y 좌표쌍 개수, 기본값: 2)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값, 모드 및 상태 신호</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>좌표점은 (X1,Y1), (X2,Y2), ... 형태로 정의하며, X값은 반드시 오름차순이어야 합니다. 입력이 첫 번째 X값보다 작으면 첫 구간의 기울기로 외삽(Extrapolation)되고, 마지막 X값보다 크면 마지막 구간의 기울기로 외삽됩니다.</p>
<p>좌표점 수가 많을수록 더 정밀한 함수 근사가 가능하지만 처리 시간이 증가합니다. 일반적으로 5~10개 좌표점이면 대부분의 곡선을 충분히 근사합니다.</p>
<p>입력에 Gain과 Bias를 먼저 적용한 후 함수 테이블을 참조합니다. 출력은 TPSC/BTSC로 클램핑됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>밸브 특성 보상(Characterizer):</b> 밸브의 비선형 유량 특성을 선형화하기 위해 밸브 개도(%) vs 유량(%) 관계를 좌표점으로 입력합니다.</p>
<p><b>온도-물성 변환 테이블:</b> 온도에 따른 비체적, 밀도, 점도 등의 물성값을 테이블로 구현합니다.</p>
<p><b>센서 선형화:</b> 비선형 센서(열전대 등)의 출력을 선형 온도값으로 변환할 때 사용합니다.</p>'''

# ============================================================
# CALCBLOCK
# ============================================================
detail_fulls['CALCBLOCK'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">CALCBLOCK 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-21 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>CALCBLOCK 알고리즘은 사용자가 복잡한 수학 방정식을 직접 프로그래밍할 수 있는 범용 계산 블록입니다.</p>
<p>최대 18개의 아날로그/디지털 입력(IN1~IN18), 30개의 내부 인수(ARG1~ARG30), 10개의 상수(CON1~CON10)를 사용하여 사칙연산, 삼각함수, 제곱근, 로그, 지수, 논리 연산, 비교 연산 등을 수행할 수 있습니다.</p>
<p>ENBL(Enable) 입력이 TRUE일 때만 계산이 실행되며, FALSE이면 마지막 결과값을 유지합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 46)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ARG1~ARG10</td><td>입력</td><td>G0~G9</td><td>내부 인수 1~10 (ARG1 필수, 나머지 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">AR30</td><td>입력</td><td>YT</td><td>내부 인수 30 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CON1~CON10</td><td>입력</td><td>S7~T7</td><td>상수 1~10 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ENBL</td><td>입력</td><td>Variable</td><td>계산 활성화 신호 (선택, TRUE=실행)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1~IN18</td><td>입력</td><td>Variable</td><td>아날로그/디지털 입력 1~18 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>계산 결과 출력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">VALI</td><td>입력</td><td>Variable</td><td>출력 유효성 플래그 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>Ovation의 CalcBlock 수식 편집기에서 수식을 작성합니다. 사칙연산(+, -, *, /), 삼각함수(SIN, COS, TAN), 제곱근(SQRT), 로그(LOG), 지수(EXP), 논리 연산(AND, OR, NOT), 비교 연산(>, <, =) 등을 지원합니다.</p>
<p>ENBL이 FALSE이면 마지막 계산 결과를 유지하고, TRUE일 때만 새로운 계산을 수행합니다. 계산 결과가 유효하지 않으면 VALI 플래그로 상태를 알립니다.</p>
<p>표준 블록(SUM, MULTIPLY 등)으로 처리하기 어려운 복잡한 수식을 하나의 블록으로 통합할 수 있어 시트를 단순화합니다. 다만 디버깅이 어려울 수 있으므로 가능하면 표준 블록 사용을 권장합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>열교환기 효율 계산:</b> 효율 = (출구온도 - 입구온도) / (열원온도 - 입구온도) × 100 같은 복합 수식을 하나의 블록에서 처리합니다.</p>
<p><b>증기 엔탈피 계산:</b> 온도와 압력을 입력으로 근사식을 통해 증기 엔탈피를 실시간으로 산출합니다.</p>
<p><b>조건부 계산:</b> 비교 연산과 논리 연산을 조합하여 운전 조건에 따른 분기 계산을 구현합니다.</p>'''

# ============================================================
# GAINBIAS
# ============================================================
detail_fulls['GAINBIAS'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">GAINBIAS 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-40 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>GAINBIAS 알고리즘은 아날로그 입력에 Gain(이득)을 곱하고 Bias(바이어스)를 더한 후 출력 범위를 제한하는 가장 기본적인 스케일링 블록입니다.</p>
<p><b>수식:</b> OUT = (IN1 × GAIN) + BIAS</p>
<p>스케일링 공식: GAIN = (OUT_MAX - OUT_MIN) / (IN_MAX - IN_MIN), BIAS = OUT_MIN - GAIN × IN_MIN</p>
<p>Gain을 절대로 0으로 초기화하면 안 됩니다(0 설정 시 알람 발생).</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 76)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">GAIN</td><td>입력</td><td>R1</td><td>입력 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BIAS</td><td>입력</td><td>R2</td><td>입력 Bias (기본값: 0.1)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R3</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R4</td><td>출력 하한값 (기본값: -100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R5</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PROQ</td><td>입력</td><td>X1 Bit 1</td><td>품질 전파 옵션: ON=정상 품질 선택, OFF=항상 GOOD 품질 (기본값: ON)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값, 모드 및 상태 신호</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>입력에 GAIN을 곱하고 BIAS를 더하여 출력합니다. 출력은 BTSC(하한) 이상 TPSC(상한) 이하로 클램핑됩니다.</p>
<p>PROQ(Quality Propagation) 옵션이 ON이면 입력 품질을 출력에 그대로 전파하고, OFF이면 출력 품질을 항상 GOOD으로 설정합니다.</p>
<p>트래킹 모드(TRIN)를 지원하여 범프리스 전환이 가능합니다. TRAT로 전환 속도를 제어합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>신호 단위 변환:</b> 0~10V → 0~100% 변환 시 GAIN=10, BIAS=0으로 설정합니다. 4~20mA → 0~100% 시 GAIN=6.25, BIAS=-25로 설정합니다.</p>
<p><b>엔지니어링 단위 스케일링:</b> 센서 원시값을 공학 단위(온도, 압력 등)로 변환합니다.</p>
<p><b>오프셋 보정:</b> 센서 영점 편차(Zero Offset)를 BIAS로 보정합니다. 가장 기본적이고 자주 사용되는 블록입니다.</p>'''

# ============================================================
# SELECTOR
# ============================================================
detail_fulls['SELECTOR'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">SELECTOR 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-88 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>SELECTOR 알고리즘은 N개의 아날로그 입력 중 선택 인덱스(SEL)로 하나를 선택하여 출력하는 전환 블록입니다.</p>
<p>최대 8개의 입력(IN1~IN8) 중에서 SEL 값에 해당하는 입력이 OUT으로 전달됩니다. SEL=1이면 IN1, SEL=2이면 IN2, ... SEL=8이면 IN8이 선택됩니다.</p>
<p>운전 모드별 다른 소스나 파라미터를 전환할 때 유용합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 89)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">NMIN</td><td>입력</td><td>X1</td><td>입력 개수 (기본값: 0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN7</td><td>입력</td><td>Variable</td><td>아날로그 입력 7 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIN1</td><td>입력</td><td>Variable</td><td>디지털 입력 - 입력 주소 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIN2</td><td>입력</td><td>Variable</td><td>디지털 입력 - 입력 주소 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIN3</td><td>입력</td><td>Variable</td><td>디지털 입력 - 입력 주소 3 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력 (필수)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>SEL(선택 인덱스) 값에 해당하는 입력을 OUT으로 전달합니다. SEL 값이 유효 범위(1~N) 밖이면 출력은 무효 상태가 됩니다.</p>
<p>각 입력에 개별 Gain과 Bias를 적용할 수 있어 입력 스케일링이 가능합니다. 출력은 TPSC/BTSC 범위로 제한됩니다.</p>
<p>트래킹 신호를 지원하여, 선택되지 않은 입력의 하류 블록이 자동으로 현재 출력값을 추적하도록 합니다. 이를 통해 입력 전환 시 범프리스 전환이 보장됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>운전 모드별 설정값 전환:</b> 보일러 기동/정상/정지 모드에 따라 3개의 다른 설정값 소스를 SEL로 전환합니다.</p>
<p><b>센서 이중화 전환:</b> 주 센서 고장 시 예비 센서로 자동 전환하는 로직에 활용합니다.</p>
<p><b>조건별 파라미터 적용:</b> 부하 범위에 따라 다른 PID 게인 세트를 선택할 때 사용합니다.</p>'''

# ============================================================
# HISELECT
# ============================================================
detail_fulls['HISELECT'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">HISELECT 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-44 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>HISELECT 알고리즘은 최대 4개의 아날로그 입력 중 가장 큰 값을 선택하여 출력하는 High Select(고선택) 블록입니다.</p>
<p><b>수식:</b> OUT = MAX(IN1×G1+B1, IN2×G2+B2, IN3×G3+B3, IN4×G4+B4)</p>
<p>각 입력에 Gain과 Bias를 적용한 후 최대값을 선택합니다. IN1, IN2는 필수이며 IN3, IN4는 선택입니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 83)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R1</td><td>입력1 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R2</td><td>입력1 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2G</td><td>입력</td><td>R3</td><td>입력2 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2B</td><td>입력</td><td>R4</td><td>입력2 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3G</td><td>입력</td><td>R8</td><td>입력3 Gain (기본값: 1.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3B</td><td>입력</td><td>R9</td><td>입력3 Bias (기본값: 0.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4G</td><td>입력</td><td>S1</td><td>입력4 Gain (기본값: 1.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4B</td><td>입력</td><td>S2</td><td>입력4 Bias (기본값: 0.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R7</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">QUAL</td><td>입력</td><td>X1</td><td>품질 옵션: WORSE=최악 품질 선택, SELECTED=선택된 입력 품질 사용</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3</td><td>입력</td><td>Variable</td><td>아날로그 입력 3 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4</td><td>입력</td><td>Variable</td><td>아날로그 입력 4 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK1</td><td>출력</td><td>Variable</td><td>입력1 트래킹 출력 (모드/상태)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK2</td><td>출력</td><td>Variable</td><td>입력2 트래킹 출력 (모드/상태)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK3</td><td>출력</td><td>Variable</td><td>입력3 트래킹 출력 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK4</td><td>출력</td><td>Variable</td><td>입력4 트래킹 출력 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>각 입력에 Gain/Bias를 적용한 후 최대값을 선택하여 출력합니다. 출력은 TPSC/BTSC로 클램핑됩니다.</p>
<p>QUAL 옵션이 WORSE이면 모든 입력 중 최악의 품질을 출력 품질로 사용하고, SELECTED이면 선택된 입력의 품질을 사용합니다.</p>
<p>선택되지 않은 입력의 TRK 출력이 자동으로 현재 출력값을 추적하여, 입력 전환 시 범프리스(Bumpless) 전환을 보장합니다. 이는 Override 제어에서 핵심적인 기능입니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>안전 보호(Override) 제어:</b> 연소화로 온도 제한 2개 센서 중 높은 온도를 선택하여 보호 신호로 사용합니다. 하나의 센서가 고장나도 나머지가 보호합니다.</p>
<p><b>High Select 제어:</b> 보일러 드럼 수위 제어에서 수위 요구량과 최소 급수량 중 큰 값을 선택합니다.</p>
<p><b>최대값 모니터링:</b> 여러 지점의 온도 중 최대값을 실시간 모니터링할 때 활용합니다.</p>'''

# ============================================================
# LOSELECT
# ============================================================
detail_fulls['LOSELECT'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">LOSELECT 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-55 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>LOSELECT 알고리즘은 최대 4개의 아날로그 입력 중 가장 작은 값을 선택하여 출력하는 Low Select(저선택) 블록입니다.</p>
<p><b>수식:</b> OUT = MIN(IN1×G1+B1, IN2×G2+B2, IN3×G3+B3, IN4×G4+B4)</p>
<p>각 입력에 Gain과 Bias를 적용한 후 최소값을 선택합니다. IN1, IN2는 필수이며 IN3, IN4는 선택입니다. Override 제어(제한 제어)에서 핵심적으로 사용됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 80)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R1</td><td>입력1 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R2</td><td>입력1 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2G</td><td>입력</td><td>R3</td><td>입력2 Gain (기본값: 1.0). 0으로 설정하면 알람 발생</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2B</td><td>입력</td><td>R4</td><td>입력2 Bias (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3G</td><td>입력</td><td>R8</td><td>입력3 Gain (기본값: 1.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3B</td><td>입력</td><td>R9</td><td>입력3 Bias (기본값: 0.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4G</td><td>입력</td><td>S1</td><td>입력4 Gain (기본값: 1.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4B</td><td>입력</td><td>S2</td><td>입력4 Bias (기본값: 0.0, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R7</td><td>트래킹 전환 속도 (units/sec, 기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">QUAL</td><td>입력</td><td>X1</td><td>품질 옵션: WORSE=최악 품질 선택, SELECTED=선택된 입력 품질 사용</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3</td><td>입력</td><td>Variable</td><td>아날로그 입력 3 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN4</td><td>입력</td><td>Variable</td><td>아날로그 입력 4 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK1</td><td>출력</td><td>Variable</td><td>입력1 트래킹 출력 (모드/상태)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK2</td><td>출력</td><td>Variable</td><td>입력2 트래킹 출력 (모드/상태)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>각 입력에 Gain/Bias를 적용한 후 최소값을 선택하여 출력합니다. 출력은 TPSC/BTSC로 클램핑됩니다.</p>
<p>QUAL 옵션이 WORSE이면 모든 입력 중 최악의 품질을, SELECTED이면 선택된 입력의 품질을 사용합니다.</p>
<p>TRK1/TRK2 트래킹 출력으로 선택되지 않은 입력의 하류 블록이 자동으로 현재 출력값을 추적합니다. 입력 전환 시 범프리스 전환이 보장됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>Override 제어:</b> 보일러 연료 제어에서 연료 요구량(IN1), 공기 유량 제한(IN2), 압력 제한(IN3) 중 최소값을 선택하여 안전한 연료량을 결정합니다.</p>
<p><b>제약 제어(Constraint Control):</b> 터빈 부하 제어에서 여러 제약 조건(온도, 압력, 응력) 중 가장 제한적인 값을 선택합니다.</p>
<p><b>최소값 선택:</b> 여러 센서 중 가장 낮은 값을 안전 보호 신호로 사용할 때 활용합니다.</p>'''

# ============================================================
# MEDIANSEL
# ============================================================
detail_fulls['MEDIANSEL'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">MEDIANSEL 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-60 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>MEDIANSEL 알고리즘은 3개의 아날로그 입력 중 중간값(Median)을 선택하여 출력하는 중간값 선택기입니다.</p>
<p>삼중 모듈 이중화(TMR, Triple Modular Redundancy)의 핵심 블록으로, 3개의 센서 중 하나가 고장이나 편차를 보여도 중간값 선택에 의해 정상 값이 자동 선택됩니다.</p>
<p>품질(Quality) 검사와 편차(Deviation) 감시 기능이 내장되어 있어, 센서 고장을 자동 감지하고 알람을 발생시킵니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 62)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CNTL</td><td>입력</td><td>X1</td><td>제어 워드: Bit0=MRE 출력 타입(0:원샷/1:유지), Bit1=고/저 출력 선택, Bit2=품질 알람 타입(0:BAD/1:Not GOOD)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ALDB</td><td>입력</td><td>R1</td><td>알람 편차 데드밴드 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CNDB</td><td>입력</td><td>R2</td><td>제어 편차 데드밴드 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">HMTR</td><td>입력</td><td>R3</td><td>High 알람 모니터 값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">LMTR</td><td>입력</td><td>R4</td><td>Low 알람 모니터 값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XA</td><td>입력</td><td>Variable</td><td>트랜스미터 A 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XB</td><td>입력</td><td>Variable</td><td>트랜스미터 B 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XC</td><td>입력</td><td>Variable</td><td>트랜스미터 C 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>중간값 출력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">HI</td><td>입력</td><td>Variable</td><td>High 알람 모니터링 출력 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">LO</td><td>입력</td><td>Variable</td><td>Low 알람 모니터링 출력 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XBQ</td><td>입력</td><td>Variable</td><td>전체 트랜스미터 품질 알람 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XABQ</td><td>입력</td><td>Variable</td><td>트랜스미터 A 품질 알람 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XBBQ</td><td>입력</td><td>Variable</td><td>트랜스미터 B 품질 알람 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XCBQ</td><td>입력</td><td>Variable</td><td>트랜스미터 C 품질 알람 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ABDC/ABDA</td><td>입력</td><td>Variable</td><td>A-B 편차 알람 (제어/경보, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ACDC/ACDA</td><td>입력</td><td>Variable</td><td>A-C 편차 알람 (제어/경보, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BCDC/BCDA</td><td>입력</td><td>Variable</td><td>B-C 편차 알람 (제어/경보, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">XALM</td><td>입력</td><td>Variable</td><td>트랜스미터 오작동 알람 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">MRE</td><td>입력</td><td>Variable</td><td>수동 거부(Manual Reject) 출력 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PBPT</td><td>입력</td><td>Variable</td><td>패킹된 디지털 상태 비트 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>3개 입력이 모두 유효하면 중간값을 선택합니다. 1개가 BAD 품질이면 나머지 2개 중 CNTL 설정에 따라 높은 값 또는 낮은 값을 선택합니다. 2개 이상이 BAD이면 출력은 무효 상태가 됩니다.</p>
<p>ALDB(알람 편차 데드밴드)로 센서 간 편차를 감시합니다. 편차가 ALDB를 초과하면 해당 쌍의 편차 알람(ABDA, ACDA, BCDA)이 발생합니다. CNDB는 제어 편차용 데드밴드입니다.</p>
<p>HMTR/LMTR은 출력값의 고/저 알람 한계를 설정합니다. PBPT 포트로 모든 상태를 패킹된 디지털 워드로 한 번에 출력할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>보일러 드럼 수위 측정:</b> 3개의 수위 트랜스미터를 연결하여 TMR 구성. 하나가 고장나도 안정적인 수위 값을 제공합니다.</p>
<p><b>터빈 속도 감시:</b> 3개의 속도 센서 중 중간값을 선택하여 과속 보호에 활용합니다.</p>
<p><b>원자력/화력 발전소 중요 계측:</b> 신뢰성이 요구되는 안전 관련 계측에서 TMR 이중화를 구현합니다.</p>'''

# ============================================================
# RATELIMIT
# ============================================================
detail_fulls['RATELIMIT'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">RATELIMIT 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-80 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>RATELIMIT 알고리즘은 아날로그 입력의 변화율(Rate of Change)을 제한하는 블록입니다.</p>
<p>입력(IN1)이 급격히 변해도 출력(OUT)은 RALM(Rate Alarm, 변화율 제한값) 이내로만 변화합니다. RALM은 초당 변화량(units/sec) 단위로 설정합니다.</p>
<p>변화율이 제한을 초과하면 FOUT(Flag Output) 플래그가 TRUE가 되어 제한 발생을 알립니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 20)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">RALM</td><td>입력</td><td>R1</td><td>변화율 제한값 (units/sec, 기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FOUT</td><td>출력</td><td>Variable</td><td>변화율 초과 플래그 (디지털 출력, 필수)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>매 실행 주기마다 현재 입력과 이전 출력의 차이를 계산합니다. 차이가 RALM × (실행주기/1000) 이내이면 입력을 그대로 출력하고, 초과하면 제한된 양만큼만 변화합니다.</p>
<p>변화 방향(증가/감소)에 관계없이 동일한 RALM 값이 적용됩니다. 변화율이 제한을 초과하면 FOUT가 TRUE가 되고, 제한이 해소되면 자동으로 FALSE로 복귀합니다.</p>
<p>RALM=0으로 설정하면 출력이 변하지 않으므로 주의가 필요합니다. 적절한 RALM 값 설정이 중요합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>설정값 변화율 제한:</b> 보일러 부하 지령의 변화율을 RALM=5(%/sec)로 제한하여 급격한 부하 변동을 방지합니다.</p>
<p><b>터빈 밸브 개도 제한:</b> 터빈 제어밸브의 급격한 개폐를 방지하여 기계적 충격을 줄입니다.</p>
<p><b>급격한 신호 변화 억제:</b> 노이즈가 많은 센서 신호에서 비정상적으로 빠른 변화를 필터링합니다.</p>'''


def main():
    # Read the file fresh
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    for name, html in detail_fulls.items():
        if name in data:
            data[name]['detailFull'] = html
            count += 1
            print(f"  Added detailFull to {name}")
        else:
            print(f"  WARNING: {name} not found in JSON!")

    # Write back
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {count}/12 symbols updated.")


if __name__ == '__main__':
    main()
