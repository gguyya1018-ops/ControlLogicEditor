#!/usr/bin/env python3
"""Batch 3: Add detailFull for PIDFF, LEADLAG, PREDICTOR, TRANSFER, DIGITAL, DEVICEX, MASTATION, BALANCER, LEVELCOMP, STEAMFLOW, STEAMTABLE"""
import json
import os

JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'ovation_symbols.json')

detail_full_map = {}

# ============================================================
# PIDFF
# ============================================================
detail_full_map['PIDFF'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">PIDFF 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-70 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>PIDFF 블록은 표준 PID 제어에 Feed Forward(피드포워드) 입력을 추가한 고급 제어 블록입니다. PV(공정변수)와 STPT(설정값)의 편차를 기반으로 비례(P), 적분(I), 미분(D) 동작을 수행하며, 여기에 FF(피드포워드) 신호를 FFG(게인)과 FFB(바이어스)로 스케일링하여 합산합니다. 피드포워드는 외란(Disturbance)이 PV에 영향을 주기 전에 미리 보상하므로, PID 단독 대비 과도응답이 크게 개선됩니다. Anti-reset Windup, 출력 제한(TPSC/BTSC), 캐스케이드(CASC), 트래킹(TRIN/TOUT), 에러 불감대(DBND) 등 PID 블록의 모든 기능을 포함합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 24)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SPTG</td><td>입력</td><td>R3</td><td>설정값 게인 (기본값: 1.0, 0으로 초기화 금지)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SPTB</td><td>입력</td><td>R4</td><td>설정값 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PVG</td><td>입력</td><td>R1</td><td>공정변수 게인 (기본값: 1.0, 0으로 초기화 금지)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PVB</td><td>입력</td><td>R2</td><td>공정변수 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FFG</td><td>입력</td><td>S5</td><td>피드포워드 게인 (기본값: 1.0, 0으로 초기화 금지)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FFB</td><td>출력</td><td>S6</td><td>피드포워드 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DACT</td><td>입력</td><td>X5 Bit 4</td><td>미분 동작 타입 (Normal/Set point/Process)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TYPE</td><td>입력</td><td>X5 Bits 0,1</td><td>PID 타입 (NORMAL/ESG: 오차제곱 비례/ESI: 오차제곱 적분)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ACTN</td><td>입력</td><td>X5 Bit 2</td><td>동작 방향 (INDIRECT: SP-PV / DIRECT: PV-SP)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CASC</td><td>입력</td><td>X5 Bit 3</td><td>캐스케이드 모드 (NORMAL/CASCADED)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DBND</td><td>입력</td><td>S3</td><td>PID 오차 불감대 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ERRD</td><td>입력</td><td>S4</td><td>PID 오차 불감대 게인 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PGAIN</td><td>입력</td><td>R8</td><td>비례 게인 (기본값: 1.0, 0이면 비례 동작 미포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">INTG</td><td>입력</td><td>R9</td><td>적분 시간 [초/반복] (기본값: 10.0, 0이면 적분 동작 미포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DGAIN</td><td>입력</td><td>S1</td><td>미분 게인 (기본값: 0.0, 0이면 미분 동작 미포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DRAT</td><td>입력</td><td>S2</td><td>미분 감쇠 상수 [초] (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R7</td><td>트래킹 램프 속도 [단위/초] (기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PV</td><td>입력</td><td>Variable</td><td>공정변수 아날로그 입력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FF</td><td>입력</td><td>Variable</td><td>피드포워드 입력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">STPT</td><td>입력</td><td>Variable</td><td>설정값(Set Point)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값 (상위 블록으로 전달)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 제어 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹 아날로그 입력 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>기본 PID 출력에 피드포워드 성분을 합산합니다: <b>OUT = PID출력 + (FF x FFG + FFB)</b>. PID 부분은 표준 PID와 동일하게 에러(STPT - PV 또는 PV - STPT)에 대해 비례/적분/미분 동작을 수행합니다. 피드포워드는 외란 변수(예: 연료량, 부하 변화)를 미리 감지하여 PV가 변하기 전에 보상하므로, 과도 편차를 최소화합니다. TPSC/BTSC로 출력이 제한되면 적분 와인드업이 방지되고, FF 성분도 PID 적분과 독립적으로 관리되어 포화 탈출 시간이 단축됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>보일러 급수 제어:</b> PID로 드럼 수위를 제어하면서 FF로 증기 유량을 입력하여, 부하 변동 시 급수량을 선제적으로 조절합니다. <b>과열기 온도 제어:</b> PID로 증기 온도를 제어하면서 FF로 연료량을 입력하여, 연소 변화에 따른 온도 변동을 사전에 보상합니다. <b>연소 제어:</b> O2 트림 PID에 부하 변화율을 FF로 입력하여 과도 상태에서의 공기비 편차를 줄입니다.</p>'''

# ============================================================
# LEADLAG
# ============================================================
detail_full_map['LEADLAG'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">LEADLAG 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-52 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>LEADLAG 블록은 1차 리드/래그(Lead/Lag) 보상기입니다. 전달함수 OUT(s) = IN(s) x (1 + s x LEAD) / (1 + s x LAG)에 따라 동작합니다. LEAD > LAG이면 위상 진행(리드 보상)으로 입력 변화 시 출력이 먼저 크게 반응한 후 정상값으로 수렴하고, LEAD < LAG이면 위상 지연(래그 보상)으로 입력을 부드럽게 필터링합니다. LEAD=0, LAG>0이면 순수 1차 로우패스 필터로 동작하며, 둘 다 0이면 게인만 적용됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 33)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R3</td><td>입력 게인 (기본값: 1.0, 0이면 알람 발생)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R1</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R2</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">LEAD</td><td>입력</td><td>R4</td><td>리드 시정수 [초] (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">LAG</td><td>입력</td><td>R5</td><td>래그 시정수 [초] (기본값: 30.0, 5xLAG 후 약 98% 정착)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R6</td><td>트래킹 램프 속도 [단위/초] (기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 변수</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력값 (모드/상태 신호 포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력 변수</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>입력에 IN1G를 곱한 후, 리드-래그 전달함수를 적용합니다. 리드 성분은 입력 변화의 미분값에 비례하여 출력을 앞당기고, 래그 성분은 1차 지연으로 고주파 잡음을 감쇠합니다. 정상상태에서는 OUT = IN1 x IN1G입니다. 출력은 TPSC/BTSC 범위로 클램핑되며, TRIN 연결 시 트래킹 모드에서 범프리스 전환을 지원합니다. 약 5 x LAG 시간 경과 후 출력이 98%에 도달합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>피드포워드 시간 보상:</b> 보일러 급수 제어에서 증기 유량 FF 신호에 LEADLAG를 적용하여, 급수 배관의 시간 지연에 맞게 FF 신호의 위상을 조정합니다. <b>노이즈 필터링:</b> LAG만 사용(LEAD=0)하여 압력, 유량 센서의 고주파 잡음을 제거합니다. <b>온도 보상:</b> 느린 온도 센서 응답을 리드 보상하여 실제 온도 변화에 더 빠르게 반응하도록 합니다.</p>'''

# ============================================================
# PREDICTOR
# ============================================================
detail_full_map['PREDICTOR'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">PREDICTOR 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-73 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>PREDICTOR 블록은 Smith Predictor 구조를 구현하여 프로세스의 큰 시간지연(Dead Time)을 보상하는 제어 블록입니다. 시간지연이 큰 공정에서 일반 PID는 이미 지나간 상태를 기반으로 제어하여 진동이 발생하기 쉽습니다. PREDICTOR는 프로세스 모델을 내부에 가지고 있어, 제어 출력이 실제 PV에 반영될 미래 값을 예측하여 PID에 제공함으로써 이 문제를 해결합니다. 프로세스 모델 파라미터로 TDLY(시간지연), FOTC(1차 시정수), SOTC(2차 시정수), GAIN(모델 게인)을 설정합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 106)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PVG</td><td>입력</td><td>R1</td><td>공정변수 게인 (기본값: 1.0, 0이면 알람 발생)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PVB</td><td>입력</td><td>R2</td><td>공정변수 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R3</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R4</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TDLY</td><td>입력</td><td>T3</td><td>프로세스 시간지연 [초] (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">GAIN</td><td>입력</td><td>T4</td><td>프로세스 모델 게인 (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FOTC</td><td>입력</td><td>T1</td><td>1차 시정수 [초] (기본값: 10.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SOTC</td><td>입력</td><td>T2</td><td>2차 시정수 [초] (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PV</td><td>입력</td><td>Variable</td><td>공정변수 아날로그 입력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CTRL</td><td>입력</td><td>Variable</td><td>하류 PID 제어 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DLIN</td><td>입력</td><td>Variable</td><td>TRANSPORT 블록의 출력 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>예측된 PV 아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DOUT</td><td>출력</td><td>Variable</td><td>TRANSPORT 블록으로의 아날로그 출력</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>Smith Predictor는 프로세스의 내부 모델을 사용합니다. CTRL(PID 출력)을 받아 모델(GAIN, FOTC, SOTC)을 통해 시간지연 없는 예측 PV를 계산하고, 실제 PV와의 차이(모델 오차)를 보정하여 OUT으로 출력합니다. PID는 이 OUT을 PV 대신 사용하므로, 마치 시간지연이 없는 것처럼 튜닝할 수 있습니다. TDLY는 TRANSPORT 블록과 함께 시간지연을 모델링하며, DOUT→TRANSPORT→DLIN 경로로 지연된 모델 출력을 피드백합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>석탄 이송 제어:</b> 석탄 분쇄기에서 버너까지 이송 시간이 30초 이상인 경우, TDLY=30으로 설정하여 PID가 시간지연 없이 튜닝할 수 있게 합니다. <b>pH 제어:</b> 약품 투입 후 혼합까지 긴 시간지연이 있는 폐수 처리 공정에서 제어 안정성을 크게 향상시킵니다. <b>열교환기 온도 제어:</b> 열매체 순환 지연이 큰 시스템에서 과도 응답을 개선합니다.</p>'''

# ============================================================
# TRANSFER
# ============================================================
detail_full_map['TRANSFER'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">TRANSFER 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-111 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>TRANSFER 블록은 디지털 FLAG 신호에 의해 2개의 아날로그 입력(IN1, IN2) 중 하나를 선택하여 출력하는 범프리스(Bumpless) 전환 블록입니다. FLAG=FALSE이면 IN1, FLAG=TRUE이면 IN2가 선택됩니다. 단순 스위칭이 아닌, TRR1/TRR2(트래킹 램프 레이트)에 따라 부드럽게 전환하여 출력 급변을 방지합니다. 비선택 입력 쪽에 트래킹 신호(TRK1, TRK2)를 출력하여 상위 블록이 현재 출력을 추종하게 합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 42)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R3</td><td>입력1 게인 (기본값: 1.0, 0이면 알람)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R4</td><td>입력1 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2G</td><td>입력</td><td>R1</td><td>입력2 게인 (기본값: 1.0, 0이면 알람)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2B</td><td>입력</td><td>R2</td><td>입력2 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R5</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R6</td><td>출력 하한값 (기본값: -100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SLEW</td><td>입력</td><td>X1 Bit 0</td><td>내부 트래킹 옵션 (OFF: 트래킹 없음 / ON: 전환 시 트래킹)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRR1</td><td>입력</td><td>R7</td><td>IN1→IN2 전환 램프 속도 [단위/초] (기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRR2</td><td>입력</td><td>R9</td><td>IN2→IN1 전환 램프 속도 [단위/초] (기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OTRK</td><td>출력</td><td>X1 Bit 2</td><td>출력 트래킹 옵션 (OFF/ON, 기본: ON)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FLAG</td><td>출력</td><td>Variable</td><td>디지털 선택 신호 (FALSE=IN1, TRUE=IN2)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK1</td><td>출력</td><td>Variable</td><td>입력1 트래킹 출력 (모드/상태 신호 포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK2</td><td>출력</td><td>Variable</td><td>입력2 트래킹 출력 (모드/상태 신호 포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 트래킹 값 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>FLAG에 따라 IN1 또는 IN2를 선택합니다. 전환 시 SLEW=ON이면 TRR1/TRR2 속도로 현재 값에서 새 입력까지 부드럽게 램프하여 출력 급변(범프)을 방지합니다. 비선택 입력에 대해 TRK1/TRK2로 현재 출력값을 전달하여, 상위 제어기(PID 등)가 출력을 추종하게 하여 전환 시 불연속을 제거합니다. 각 입력에 게인(IN1G/IN2G)과 바이어스(IN1B/IN2B)를 적용할 수 있으며, 출력은 TPSC/BTSC로 제한됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>최고/최저 선택:</b> 두 개의 제어기 출력 중 하나를 운전 조건에 따라 선택합니다(예: 고부하/저부하 PID). <b>A/B 소스 전환:</b> 2대의 급수 펌프 중 운전 펌프를 전환할 때 제어 출력을 범프리스로 전환합니다. <b>자동/수동 모드 전환:</b> 자동 제어 출력과 수동 설정값 사이의 부드러운 전환에 활용합니다.</p>'''

# ============================================================
# DIGITAL
# ============================================================
detail_full_map['DIGITAL'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">DIGITAL 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-31 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>DIGITAL 블록은 7가지 디지털 디바이스 타입을 통합 제어하는 범용 디바이스 블록입니다. 지원 타입: SAMPLER(제어 샘플러), SOV(솔레노이드 밸브), 2-Position Valve(2위치 밸브), 3-Position Valve(3위치 밸브), Motor Start/Stop(모터 기동/정지), Variable Speed Motor(가변속 모터), Breaker(차단기). 타입별로 입출력 포트 구성과 제어 로직이 자동으로 달라지며, 공통적으로 기동/정지 명령, 피드백 확인, 타임아웃 알람, 인터록(Permissive) 조건을 지원합니다. DEVICEX보다 간단한 장비에 적합합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<p style="color:rgba(255,255,255,0.5); font-size:11px; margin-bottom:8px;">* DIGITAL은 타입별로 포트 구성이 다릅니다. 아래는 공통 및 대표적인 포트입니다.</p>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 30)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SPRI</td><td>입력</td><td>X2</td><td>운전원 키보드 우선순위 (0=ON, 1=OFF)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BASE</td><td>입력</td><td>C6</td><td>누적 운전 시간 단위 (0=시간, 1=분, 2=초)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DLY1~DLY6</td><td>입력</td><td>C0~C5</td><td>타입별 타임아웃 지연 시간 (Ready/Stop/Start 등)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>피드백 입력 1 (Ready/Open/Running Contact 등)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>피드백 입력 2 (Running/Close Contact 등)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3~IN14</td><td>입력</td><td>Variable</td><td>원격 명령, 모드 전환, 인터록 등 (타입별 상이)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT1</td><td>출력</td><td>Variable</td><td>주 출력 (Running/Start/Open Output)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT2~OUT5</td><td>출력</td><td>Variable</td><td>추가 출력 (Stop/Close/Reverse 등, 타입별 상이)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ALRM</td><td>입력</td><td>Variable</td><td>디바이스 알람 (디지털)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">STAT</td><td>입력</td><td>Variable</td><td>알람 및 모드 상태 (Packed)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">RUN</td><td>출력</td><td>Variable</td><td>누적 운전 시간 (아날로그)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>타입 설정에 따라 내부 상태 머신이 자동으로 구성됩니다. <b>SOV:</b> 단순 ON/OFF, IN1(Remote Run)으로 원격 제어, OUT1(Running)으로 상태 출력. <b>2-Position Valve:</b> Open/Close 명령, 피드백 확인, 타임아웃 알람. <b>3-Position Valve:</b> Open/Close/Stop 3방향, DLY1~DLY2로 동작 시간 설정. <b>Motor:</b> Ready→Start→Running→Stop 시퀀스, DLY1~DLY3으로 각 단계 허용 시간 설정, 인터록(Permissive) 확인. <b>Variable Speed Motor:</b> 정/역회전, 고속/저속 4방향 제어. <b>Breaker:</b> Open/Close, 인터록 조건. 모든 타입에서 피드백 미수신 시 알람이 발생하고, RUN 포트로 누적 운전 시간을 추적합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>솔레노이드 밸브 제어:</b> SOV 타입으로 연료 차단 밸브, 소화 밸브 등을 ON/OFF 제어합니다. <b>모터 기동/정지:</b> Motor 타입으로 펌프, 팬 모터의 시퀀스 제어와 인터록을 구현합니다. <b>차단기 제어:</b> Breaker 타입으로 MCC 차단기를 원격 투입/차단하고, 동작 실패 시 알람을 발생시킵니다. <b>3방향 밸브:</b> 댐퍼, 3위치 밸브의 Open/Close/Stop 시퀀스를 관리합니다.</p>'''

# ============================================================
# DEVICEX
# ============================================================
detail_full_map['DEVICEX'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">DEVICEX 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-28 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>DEVICEX 블록은 장비(모터, 밸브, 펌프 등)의 기동/정지(Open/Close 또는 Start/Stop)를 제어하고 피드백 상태를 감시하는 고급 디바이스 제어 블록입니다. DVCE(Device Record)를 통해 장비와 통신하며, TYPE으로 Open/Close(밸브)와 Start/Stop(모터) 타입을 선택합니다. 인터록(OPRM/CPRM), 비상 제어(EMOP/EMCL), 모드 관리(LOC/MAN/AUTO), 타임아웃 알람(OPFL), 펄스 출력(PT), 지연 시간(DTIM) 등 DIGITAL보다 더 풍부한 기능을 제공합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 47)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SET</td><td>입력</td><td>D2</td><td>기동(Open/Start) 타임아웃 (기본값: 20)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">RSET</td><td>입력</td><td>YT</td><td>정지(Close/Stop) 타임아웃 (기본값: 20)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">EM</td><td>입력</td><td>C4</td><td>비상 오버라이드 명령 (기본값: 9)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PT</td><td>입력</td><td>D4</td><td>출력 펄스 시간 (기본값: 0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TR</td><td>입력</td><td>YP</td><td>응답 허용 루프 수 (기본값: 0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CZ</td><td>입력</td><td>C7</td><td>구성 설정 (기본값: 0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TU</td><td>입력</td><td>D0</td><td>타임아웃 단위 (0=0.1초, 1=초, 2=분)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TYPE</td><td>입력</td><td>C8</td><td>디바이스 타입 (Open/Close 또는 Start/Stop)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DTIM</td><td>입력</td><td>D5</td><td>명령 지연 시간 [초] (기본값: 0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DVCE</td><td>입력</td><td>Variable</td><td>디바이스 레코드 (필수)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1~IN3</td><td>입력</td><td>Variable</td><td>디바이스 피드백 입력 1~3</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OPRM</td><td>입력</td><td>Variable</td><td>열림(Open) 인터록 조건</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CPRM</td><td>입력</td><td>Variable</td><td>닫힘(Close) 인터록 조건</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">ARE/MRE/LRE</td><td>입력</td><td>Variable</td><td>Auto/Manual/Local 모드 강제 전환(Reject)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">AOPL/ACLL/ASTL</td><td>입력</td><td>Variable</td><td>Auto 모드 Open/Close/Stop 로직</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">LOPL/LCLL/LSTL</td><td>입력</td><td>Variable</td><td>Local 모드 Open/Close/Stop 로직</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">EMOP/EMCL</td><td>입력</td><td>Variable</td><td>비상 Open(Start) / 비상 Close(Stop)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TMEN</td><td>입력</td><td>Variable</td><td>전환 타이머 활성화</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT1~OUT4</td><td>출력</td><td>Variable</td><td>디바이스 출력 1~4</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">LOC/MAN/AUTO</td><td>입력</td><td>Variable</td><td>현재 모드 상태 (Local/Manual/Auto)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OPFL</td><td>입력</td><td>Variable</td><td>응답 실패(Failure-to-Respond) 알람</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIP</td><td>입력</td><td>Variable</td><td>트립 보고</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">STAT</td><td>입력</td><td>Variable</td><td>디바이스 상태</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DEST</td><td>입력</td><td>Variable</td><td>지연 출력</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>DVCE 레코드를 통해 물리적 장비와 통신합니다. 운전원 또는 자동 로직이 Open/Start 명령을 내리면, OPRM 인터록 조건을 확인한 후 명령을 출력합니다. SET 타임아웃 내에 피드백(IN1~IN3)이 확인되지 않으면 OPFL 알람이 발생합니다. 비상 시 EMOP/EMCL이 인터록을 무시하고 즉시 동작합니다. 모드는 LOC(로컬)→MAN(수동)→AUTO(자동) 3단계이며, ARE/MRE/LRE로 강제 전환됩니다. PT>0이면 펄스형 출력, DTIM>0이면 명령 지연이 적용됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>밸브 제어:</b> FD 팬 입구 댐퍼, 급수 밸브 등의 Open/Close 제어에 사용합니다. OPRM으로 열림 인터록(예: 팬 운전 확인)을 연결합니다. <b>모터 제어:</b> BFP, CWP 등의 Start/Stop에 사용합니다. 기동 인터록, 피드백 타임아웃, 비상 정지를 통합 관리합니다. <b>비상 차단:</b> EMCL로 화재/트립 시 즉시 장비를 정지시키는 안전 로직을 구현합니다.</p>'''

# ============================================================
# MASTATION
# ============================================================
detail_full_map['MASTATION'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">MASTATION 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-58 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>MASTATION 블록은 운전원이 CRT 화면에서 제어 출력의 수동/자동(Manual/Auto) 모드를 전환하고 수동 조작할 수 있게 하는 인터페이스 블록입니다. 자동 모드에서는 IN1(PID 등 상위 제어기 출력)이 그대로 OUT으로 전달되고, 수동 모드에서는 운전원이 Raise/Lower 버튼으로 출력을 직접 조작합니다. PCNT/TIME으로 수동 조작 속도를 설정하며, FP로 전원 복구 시 초기 모드를 지정합니다. TRIN/TOUT 트래킹으로 범프리스 전환을 지원합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 10)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1G</td><td>입력</td><td>R5</td><td>입력 게인 (기본값: 1.0, 0이면 알람)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1B</td><td>입력</td><td>R6</td><td>입력 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R7</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R8</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPBS</td><td>입력</td><td>R2</td><td>바이어스 바 상한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTBS</td><td>입력</td><td>R3</td><td>바이어스 바 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PCNT</td><td>입력</td><td>X1</td><td>처음 4초간 변화율 [%] (기본값: 4)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TIME</td><td>입력</td><td>X2</td><td>풀스케일까지 남은 램프 시간 [초] (기본값: 25)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FP</td><td>입력</td><td>G0 Bit 8</td><td>전원 복구 시 초기 모드 (MANUAL/AUTO)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TYPE</td><td>입력</td><td>G0 Bits 0,1</td><td>인터페이스 타입 (SOFT/RLI/RVP)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DRVE</td><td>입력</td><td>G0 Bit 9</td><td>전동 드라이브 여부 (NO/YES)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CARD</td><td>입력</td><td>X5</td><td>PCI 카드 번호 (1, 2)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">RDNT</td><td>입력</td><td>X3 Bit 0</td><td>RVP 카드 이중화 (NO/YES)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PRLI</td><td>입력</td><td>G0 Bit 2</td><td>RLI 우선순위 (YES/NO)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PRAR/PRAT</td><td>입력</td><td>S1/S2</td><td>우선순위 Raise 속도/목표값</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PLWR/PLWT</td><td>입력</td><td>S3/S4</td><td>우선순위 Lower 속도/목표값</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">REJQ</td><td>입력</td><td>G0 Bits 6,7</td><td>입력 품질 불량 시 수동 전환 (BAD/NOTGOOD/OFF)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CNFG</td><td>입력</td><td>G0 Bit 5</td><td>구성 타입 (NORMAL/BALANCER)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R1</td><td>트래킹 램프 속도 (기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>자동 모드 아날로그 입력 (PID 출력 등)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>트래킹 출력 (모드/상태 신호 포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">MODE</td><td>입력</td><td>Variable</td><td>MAMODE 블록 출력 (외부 모드 제어)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력 (밸브/제어기로)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRIN</td><td>입력</td><td>Variable</td><td>트래킹/제한 모드 신호 및 값 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BIAS</td><td>입력</td><td>Variable</td><td>바이어스 바 아날로그 출력 (선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p><b>자동 모드:</b> IN1 x IN1G + IN1B가 OUT으로 전달됩니다. 상위 PID의 출력이 그대로 밸브/액추에이터로 갑니다. <b>수동 모드:</b> 운전원이 CRT의 Raise/Lower 버튼으로 출력을 직접 조작합니다. 처음 4초간 PCNT%만큼 변화한 후, 나머지 TIME초에 걸쳐 풀스케일까지 램프합니다(2단 속도). <b>전환:</b> 자동→수동 시 현재 출력값을 유지하고, 수동→자동 시 TRIN 트래킹으로 범프리스 전환합니다. REJQ가 BAD이면 IN1 품질이 BAD일 때 자동으로 수동 전환되어 안전을 보장합니다. BIAS 바를 연결하면 자동 모드에서도 운전원이 미세 보정을 가할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>PID 루프 인터페이스:</b> PID→MASTATION→밸브 구조로 거의 모든 제어 루프에 사용됩니다. 운전원이 수동으로 밸브를 조작하거나 자동 제어로 전환합니다. <b>캐스케이드 2차측:</b> 캐스케이드 제어의 내측 루프에 MASTATION을 배치하여 2차 PID와 밸브 사이에서 모드 전환을 관리합니다. <b>설정값 스테이션:</b> 설정값을 운전원이 수동 입력하거나 자동 프로그램에서 받는 인터페이스로 활용합니다.</p>'''

# ============================================================
# BALANCER
# ============================================================
detail_full_map['BALANCER'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">BALANCER 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-17 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>BALANCER 블록은 최대 16개의 하위 알고리즘(MASTATION 등)의 출력을 균형 있게 조율하는 제어 블록입니다. 병렬 운전 장비(보일러, 펌프, 팬 등)의 부하를 균등 분배하거나 우선순위에 따라 배분합니다. 하위 블록이 모두 트래킹을 요청할 때, TRK 설정에 따라 HIGHEST(최대값), LOWEST(최소값), AVERAGE(평균값) 중 하나로 트래킹합니다. NMIN으로 하위 블록 수를 설정하며, 하위 MASTATION 중 하나가 수동으로 전환되면 나머지 블록의 출력을 자동 재분배합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 79)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">NMIN</td><td>입력</td><td>X1</td><td>하위 알고리즘 수 (최대 16, 기본값: 1)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">CNTL</td><td>입력</td><td>G3 Bit 0</td><td>제어 모드 (NORMAL/BALANCER)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK</td><td>출력</td><td>G3 Bits 1,2</td><td>트래킹 타입 (HIGHEST/LOWEST/AVERAGE)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">GAIN</td><td>입력</td><td>R1</td><td>입력 게인 (기본값: 1.0, 0이면 알람)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BIAS</td><td>입력</td><td>R2</td><td>입력 바이어스 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TPSC</td><td>입력</td><td>R3</td><td>출력 상한값 (기본값: 100.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BTSC</td><td>입력</td><td>R4</td><td>출력 하한값 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRAT</td><td>입력</td><td>R5</td><td>트래킹 램프 속도 [단위/초] (기본값: 2.5)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 (상위 제어기 출력)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TOUT</td><td>출력</td><td>Variable</td><td>상위 블록으로의 트래킹 출력 (모드/상태 포함)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>아날로그 출력 (하위 블록들로)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TRK01~TRK16</td><td>출력</td><td>Variable</td><td>하위 알고리즘별 트래킹 피드백 신호 (TRK01, TRK02는 필수, TRK03~TRK16은 선택)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>IN1 x GAIN + BIAS를 기본 출력으로 하여 하위 MASTATION들에 동일한 설정값을 전달합니다. 각 하위 블록은 TRK01~TRK16을 통해 자신의 현재 출력과 모드 상태를 BALANCER에 피드백합니다. 모든 하위 블록이 자동 모드이면 BALANCER가 정상 출력합니다. 하위 블록 중 하나가 수동으로 전환되면, BALANCER는 TRK 설정에 따라 나머지 자동 블록들의 값을 조정하여 전체 부하 균형을 유지합니다. CNTL=BALANCER 모드에서는 MA 밸런싱 로직이 활성화되어 더 정밀한 부하 분배가 가능합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>병렬 펌프 부하 분배:</b> 3대의 급수 펌프를 PID→BALANCER→MASTATION(x3) 구조로 연결하여, 각 펌프의 출력을 균등하게 분배합니다. 1대를 수동으로 전환해도 나머지 2대가 자동 보상합니다. <b>병렬 팬 제어:</b> FD 팬 2대의 댐퍼를 동시에 제어하면서 균등 개도를 유지합니다. <b>복수 보일러 부하 배분:</b> 여러 보일러의 연소율을 우선순위에 따라 배분합니다.</p>'''

# ============================================================
# LEVELCOMP
# ============================================================
detail_full_map['LEVELCOMP'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">LEVELCOMP 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-53 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>LEVELCOMP 블록은 가압 드럼의 밀도 보정 수위를 계산하는 스팀 블록입니다. 차압식 수위계는 기준 레그(Reference Leg)와 변동 레그(Variable Leg) 사이의 차압으로 수위를 측정하는데, 드럼 내부의 물과 증기 밀도가 압력/온도에 따라 변하므로 운전 조건이 바뀌면 같은 수위에서도 차압이 달라집니다. LEVELCOMP는 현재 압력(PRES)과 기준 레그 온도(TEMP)를 기반으로 내부 수증기표를 조회하여 밀도 차이를 보상하고 정확한 수위(OUT)를 계산합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 112)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">VCAL</td><td>입력</td><td>R1</td><td>교정 유체 비체적 [ft3/lb] (기본값: 0.016049)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">MAX</td><td>출력</td><td>R2</td><td>최대 수위 범위 (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">MIN</td><td>입력</td><td>R3</td><td>최소 수위 범위 (기본값: 0.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TEMP</td><td>입력</td><td>R4</td><td>기준 레그 수온 [F]</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PRES</td><td>입력</td><td>Variable</td><td>드럼 압력 [PSI] (아날로그)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>드럼 수위 트랜스미터 (아날로그)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>밀도 보정된 수위 출력 (아날로그)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>차압식 수위 측정의 원리: 기준 레그(항상 물로 채워진 관)와 변동 레그(드럼 내 물+증기) 사이의 차압이 수위에 비례합니다. 그러나 밀도가 변하면 이 비례 관계가 틀어집니다. LEVELCOMP는 (1) PRES로 드럼 압력에서의 포화수/포화증기 밀도를 수증기표에서 조회하고, (2) TEMP로 기준 레그 물의 밀도를 계산하며, (3) VCAL(교정 조건 밀도)과 비교하여 보정 계수를 산출합니다. IN1(원시 수위 신호)에 이 보정 계수를 적용하여 실제 수위 OUT을 출력합니다. 보일러 기동 시 드럼 압력이 0에서 운전 압력까지 변하면 보정 없이는 30% 이상의 수위 오차가 발생할 수 있습니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>보일러 드럼 수위 제어:</b> 3요소 제어(급수 유량, 증기 유량, 수위)의 핵심인 드럼 수위 신호를 밀도 보정하여 PID에 정확한 수위를 제공합니다. <b>기동 시 수위 관리:</b> 냉태 기동에서 압력 0→170bar 변화 시에도 정확한 수위를 계산하여 과수위/저수위 트립을 방지합니다. <b>탈기기/가압 탱크:</b> 압력 변화가 있는 모든 가압 용기의 수위 보정에 적용됩니다.</p>'''

# ============================================================
# STEAMFLOW
# ============================================================
detail_full_map['STEAMFLOW'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">STEAMFLOW 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-102 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>STEAMFLOW 블록은 차압식 유량계의 증기 유량을 비체적(Specific Volume)으로 보상하여 정확한 질량 유량을 계산하는 블록입니다. 차압식 유량계(오리피스, 벤추리 등)의 신호는 유체 밀도에 영향을 받으며, 증기는 압력/온도에 따라 밀도가 크게 변합니다. TYPE 설정으로 입력이 차압(DELTAP)인지 유량(FLOW)인지를 선택하고, IN2로 비체적을 입력받아 BASE(기준 비체적)와 비교하여 유량을 보정합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">DIAG</td><td>입력</td><td>LU-Integer</td><td>튜닝 다이어그램 번호 (기본값: 22)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">TYPE</td><td>입력</td><td>X1</td><td>입력 타입 (DELTAP: 차압 입력 / FLOW: 유량 입력)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">SCAL</td><td>입력</td><td>R1</td><td>스케일링 팩터 (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">BASE</td><td>입력</td><td>R2</td><td>기준 비체적 (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">GAIN</td><td>입력</td><td>R3</td><td>비체적 게인 (기본값: 1.0)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>유량 트랜스미터 차압/유량 입력 (아날로그)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>비체적 입력 (아날로그, STEAMTABLE 출력 연결)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>보정된 질량 유량 출력 (아날로그)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>TYPE=DELTAP일 때: OUT = SCAL x sqrt(IN1 x BASE / (IN2 x GAIN)). 차압의 제곱근에 밀도 보정 계수를 곱하여 질량 유량을 계산합니다. TYPE=FLOW일 때: OUT = SCAL x IN1 x sqrt(BASE / (IN2 x GAIN)). 이미 유량 단위인 입력에 밀도비의 제곱근만 보정합니다. IN2는 보통 STEAMTABLE 블록에서 계산한 비체적을 연결하며, BASE는 유량계 교정 시의 기준 비체적입니다. 설계 조건과 실제 운전 조건의 비체적 비율로 유량을 보정합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>주증기 유량 측정:</b> 보일러 출구 주증기 유량을 오리피스 차압과 압력/온도로 보정하여 정확한 질량 유량을 얻습니다. 3요소 급수 제어의 증기 유량 입력으로 사용합니다. <b>재열 증기 유량:</b> 저압 재열기의 증기 유량을 보정하여 재열기 보호 로직에 활용합니다. <b>추기 유량 보정:</b> 터빈 추기 유량의 밀도 변화를 보상하여 정확한 열수지 계산에 기여합니다.</p>'''

# ============================================================
# STEAMTABLE
# ============================================================
detail_full_map['STEAMTABLE'] = '''<h3 style="color:#4fc3f7; margin:0 0 4px;">STEAMTABLE 상세 매뉴얼</h3>
<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section 3-103 기반</div>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>
<p>STEAMTABLE 블록은 ASME(미국기계학회) 수증기표를 기반으로 물과 증기의 열역학적 성질을 계산하는 블록입니다. 압력(IN1)과 온도(IN2)를 입력하면 엔탈피, 비체적, 엔트로피 등의 열역학 물성값을 출력합니다. UNIT 설정으로 영국 단위(English)와 SI 단위를 선택할 수 있으며, 입력이 유효 범위를 벗어나면 FLAG 출력이 TRUE가 되어 오류를 알립니다. STEAMFLOW, LEVELCOMP 등 다른 스팀 블록의 기초 데이터를 제공합니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 포트 설명</h4>
<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0;">
<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px; color:#4fc3f7;">포트</th><th style="text-align:left; padding:4px; color:#4fc3f7;">방향</th><th style="text-align:left; padding:4px; color:#4fc3f7;">타입</th><th style="text-align:left; padding:4px; color:#4fc3f7;">설명</th></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">UNIT</td><td>입력</td><td>X1</td><td>단위 계통 (0=English, 1=SI)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">PROQ</td><td>입력</td><td>X4</td><td>품질 전파 (ON: 입력 품질을 출력에 전파)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN1</td><td>입력</td><td>Variable</td><td>아날로그 입력 1 (압력)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN2</td><td>입력</td><td>Variable</td><td>아날로그 입력 2 (온도, 선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">IN3</td><td>입력</td><td>Variable</td><td>아날로그 입력 3 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT</td><td>출력</td><td>Variable</td><td>주 아날로그 출력 (엔탈피/비체적 등)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT1</td><td>출력</td><td>Variable</td><td>보조 아날로그 출력 1 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT2</td><td>출력</td><td>Variable</td><td>보조 아날로그 출력 2 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">OUT3</td><td>출력</td><td>Variable</td><td>보조 아날로그 출력 3 (선택)</td></tr>
<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:4px;">FLAG</td><td>출력</td><td>Variable</td><td>오류 플래그 (범위 초과 시 TRUE)</td></tr>
</table>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 동작 원리</h4>
<p>ASME 수증기표를 내장하여, 입력된 압력과 온도에 해당하는 물/증기의 열역학 성질을 보간법으로 계산합니다. 과열 증기 영역(온도 > 포화 온도)에서는 과열 증기 물성을, 포화선 근처에서는 포화수/포화증기 물성을 계산합니다. UNIT=0이면 압력 PSI, 온도 F, 엔탈피 BTU/lb, 비체적 ft3/lb 단위이고, UNIT=1이면 압력 kPa, 온도 C, 엔탈피 kJ/kg, 비체적 m3/kg 단위입니다. 유효 범위를 벗어나면 FLAG=TRUE가 되고 출력은 마지막 유효값을 유지합니다. PROQ=ON이면 입력 품질(BAD/GOOD)이 출력으로 전파됩니다.</p>

<h4 style="color:#4fc3f7; margin:20px 0 8px;">4. 활용 예시</h4>
<p><b>비체적 계산:</b> STEAMFLOW 블록에 증기 비체적을 제공하여 유량 보정에 사용합니다. STEAMTABLE(압력,온도)→비체적→STEAMFLOW 구조가 일반적입니다. <b>엔탈피 계산:</b> 보일러 효율 계산, 터빈 열소비율(Heat Rate) 감시, 열교환기 성능 평가에 필요한 증기/물 엔탈피를 실시간 계산합니다. <b>과열도 감시:</b> 포화 온도와 실제 온도의 차이(과열도)를 계산하여 과열기 보호 및 터빈 증기 품질 감시에 활용합니다. <b>밀도 보정:</b> LEVELCOMP와 함께 드럼 수위의 밀도 보정 데이터를 제공합니다.</p>'''


def main():
    # Read fresh copy
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = []
    for name, html in detail_full_map.items():
        if name in data:
            data[name]['detailFull'] = html
            updated.append(name)
        else:
            print(f"WARNING: {name} not found in JSON!")

    # Write back
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Updated {len(updated)} symbols: {', '.join(updated)}")


if __name__ == '__main__':
    main()
