#!/usr/bin/env python3
"""
86개 심볼에 fullDesc와 diagramDesc를 추가하는 스크립트.
동시 수정 안전: 실행 직전에 파일을 읽고, 해당 필드만 수정 후 저장.
"""
import json
import sys
import os

JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'ovation_symbols.json')

# fullDesc와 diagramDesc 데이터
descriptions = {
    "A2": {
        "fullDesc": "A2 블록은 Ovation 시스템에서 사용되는 보조 알고리즘 블록입니다.\n\nA2 레코드 필드에 저장된 값을 다른 블록과 연결하는 용도로 활용됩니다. 단독으로 사용되기보다는 PACK16, UNPACK16 등과 함께 패킹된 데이터를 처리할 때 참조됩니다.\n\n세부 포트 정보가 없는 범용 레코드 타입으로, 시스템 내부 데이터 전달에 사용됩니다.",
        "diagramDesc": "Ovation 시스템의 보조 레코드 블록으로, 패킹 데이터 처리 시 내부적으로 참조됩니다."
    },
    "C5": {
        "fullDesc": "C5 블록은 Ovation 시스템에서 사용되는 보조 알고리즘 블록입니다.\n\nC5 레코드 타입의 데이터를 다른 블록과 연결하는 용도로 활용됩니다. 단독 제어 기능보다는 시스템 내부 데이터 구조의 일부로 동작합니다.\n\n세부 포트 정보가 없는 범용 레코드 타입으로, 특수 데이터 처리에 사용됩니다.",
        "diagramDesc": "Ovation 시스템의 보조 레코드 블록으로, 시스템 내부 데이터 처리에 사용됩니다."
    },
    "ABSVALUE": {
        "fullDesc": "ABSVALUE 블록은 입력값의 절대값을 출력하는 블록입니다.\n\nOUT = |IN1|. 입력 IN1이 양수이면 그대로, 음수이면 부호를 반전하여 항상 0 이상의 값을 출력합니다.\n\n예를 들어 IN1 = -25.3이면 OUT = 25.3, IN1 = 12.7이면 OUT = 12.7입니다.\n\n편차(Deviation)의 크기만 필요할 때, 양/음 방향 구분 없이 변화량의 크기를 감시할 때, 또는 음수 입력을 양수로 변환해야 하는 계산 로직에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1)의 절대값을 계산하여 출력(OUT)합니다. 음수는 양수로 변환됩니다."
    },
    "ALARMMON": {
        "fullDesc": "ALARMMON 블록은 최대 16개의 포인트 알람 상태를 감시하는 블록입니다.\n\n입력으로 연결된 포인트 중 하나라도 알람 상태(Alarm Status = TRUE)이면 OUT이 TRUE가 됩니다. 모든 입력이 정상이면 OUT은 FALSE입니다.\n\nDIAG 포트로 진단 정보를 확인할 수 있으며, ALRM은 알람 모드를 설정합니다. IN16은 최대 16개의 입력을 연결할 수 있는 포트입니다. FOUT은 필터링된 출력을 제공합니다.\n\n여러 프로세스 포인트의 알람 상태를 하나의 출력으로 집약하여, 운전원에게 종합 알람을 표시하거나 상위 제어 로직에 알람 집합 신호를 전달할 때 사용합니다.",
        "diagramDesc": "최대 16개 포인트의 알람 상태를 감시하여, 하나라도 알람이면 출력(OUT)이 TRUE가 됩니다."
    },
    "ANALOG": {
        "fullDesc": "ANALOG 블록은 로컬 아날로그 루프 컨트롤러와의 인터페이스를 제공하는 디바이스 블록입니다.\n\n아날로그 출력 디바이스 알고리즘으로, IN1(주 입력)과 IN2(보조 입력)를 받아 OUT으로 제어 출력을 내보냅니다. IN1G/IN1B, IN2G/IN2B는 각 입력의 Gain/Bias 스케일링 파라미터입니다.\n\nTPSC(Top Scale)와 BTSC(Bottom Scale)로 출력 범위를 제한하며, DLAY는 출력 지연 시간을 설정합니다. ODBN(Output Dead Band)과 IDBN(Input Dead Band)으로 불감대를 설정하여 불필요한 출력 변동을 방지합니다.\n\nMAX는 최대 출력 변화율을 제한하고, SENS는 감도를 설정합니다. DEVA는 편차 출력, TRIN은 트래킹 입력, DIGIN은 디지털 입력, TOUT은 트래킹 출력, SHED는 부하 차단 상태를 나타냅니다.\n\n현장의 아날로그 루프 컨트롤러에 제어 출력을 전달하고, 디바이스 상태를 감시하는 용도로 사용됩니다.",
        "diagramDesc": "로컬 아날로그 루프 컨트롤러와 인터페이스하는 디바이스 블록입니다. 아날로그 입력(IN1, IN2)을 스케일링하여 제어 출력(OUT)을 생성합니다."
    },
    "ANALOGDRUM": {
        "fullDesc": "ANALOGDRUM 블록은 아날로그 출력을 가진 소프트웨어 드럼 컨트롤러입니다.\n\n하나의 아날로그 출력(OUT)으로 최대 30스텝, 또는 두 개의 아날로그 출력(OUT, OUT2)으로 최대 15스텝까지 운용할 수 있습니다. 각 스텝마다 R01~R30으로 목표값과 시간을 설정합니다.\n\nINC(증가)와 DEC(감소)로 스텝을 전진/후퇴시키며, TMOD는 시간 모드를 설정합니다. TRIN은 트래킹 입력으로, 외부에서 현재 스텝을 강제로 지정할 수 있습니다. NMIN은 최소 스텝 수를 설정합니다.\n\nSTEP 출력은 현재 스텝 번호를 나타내며, OUT과 OUT2가 각 스텝에 해당하는 아날로그 값을 출력합니다.\n\n보일러 기동/정지 시 온도나 압력을 단계별로 올리거나 내리는 승온/승압 프로파일 제어에 주로 사용됩니다.",
        "diagramDesc": "소프트웨어 드럼 컨트롤러로, 최대 30스텝의 아날로그 출력 시퀀스를 제어합니다. INC/DEC로 스텝을 이동하며 OUT에 해당 스텝의 값을 출력합니다."
    },
    "ANNUNCIATOR": {
        "fullDesc": "ANNUNCIATOR 블록은 램프 박스의 알람 창(Window) 상태를 계산하는 블록입니다.\n\n입력 IN1(알람 로직 결과), 현재 창 상태(OUT), 운전자 인터페이스(ACK: 확인, RSET: 리셋, TEST: 테스트)를 조합하여 알람 상태를 결정합니다.\n\n출력으로 FAST(고속 점멸), SLOW(저속 점멸), MDFY(변경), STAT(상태)를 제공하며, HORN과 CHIM은 경보음을 제어합니다. PHRN(Horn 우선순위)과 PCHM(Chime 우선순위)으로 경보음 우선순위를 설정합니다.\n\n발전소 제어실의 알람 표시 패널에서 각 알람 창의 점멸 패턴, 경보음, 확인/리셋 동작을 구현하는 데 사용됩니다.",
        "diagramDesc": "알람 창(Annunciator Window) 상태를 계산합니다. 알람 입력(IN1)과 운전자 조작(ACK, RSET, TEST)에 따라 점멸 패턴과 경보음 출력을 제어합니다."
    },
    "ANTILOG": {
        "fullDesc": "ANTILOG 블록은 입력값을 스케일링한 후 역로그(Antilog)를 계산하여 출력하는 블록입니다.\n\nBASE 파라미터로 밑(Base)을 선택합니다. Base 10(상용 역로그) 또는 자연상수 e(자연 역로그)를 선택할 수 있습니다. SCAL은 입력값에 적용할 스케일 팩터입니다.\n\nOUT = BASE^(IN1 × SCAL). 예를 들어 BASE=10, SCAL=1, IN1=2이면 OUT = 10^2 = 100입니다.\n\nDIAG로 진단 정보를 확인하며, FOUT은 필터링된 출력입니다.\n\npH 계산, dB 값을 선형 값으로 변환, 로그 스케일 데이터를 원래 값으로 복원하는 등의 수학적 변환에 사용됩니다.",
        "diagramDesc": "입력(IN1)을 스케일링한 후 역로그(Base 10 또는 자연)를 계산하여 출력(OUT)합니다."
    },
    "ARCCOSINE": {
        "fullDesc": "ARCCOSINE 블록은 입력값의 아크코사인(역코사인)을 계산하는 블록입니다.\n\nOUT = arccos(IN1). 입력 IN1은 -1.0에서 1.0 사이의 값이어야 하며, 출력 OUT은 라디안(0~π) 단위입니다.\n\n예를 들어 IN1 = 0.5이면 OUT = π/3 (약 1.047 라디안, 60도)입니다. IN1이 범위를 벗어나면 오류가 발생합니다.\n\n각도 계산, 삼각함수 역변환 등 수학적 연산이 필요한 제어 로직에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1)의 아크코사인을 라디안 단위로 계산하여 출력(OUT)합니다. 입력 범위는 -1~1입니다."
    },
    "ARCSINE": {
        "fullDesc": "ARCSINE 블록은 입력값의 아크사인(역사인)을 계산하는 블록입니다.\n\nOUT = arcsin(IN1). 입력 IN1은 -1.0에서 1.0 사이의 값이어야 하며, 출력 OUT은 라디안(-π/2~π/2) 단위입니다.\n\n예를 들어 IN1 = 0.5이면 OUT = π/6 (약 0.524 라디안, 30도)입니다. IN1이 범위를 벗어나면 오류가 발생합니다.\n\n각도 계산, 삼각함수 역변환 등 수학적 연산이 필요한 제어 로직에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1)의 아크사인을 라디안 단위로 계산하여 출력(OUT)합니다. 입력 범위는 -1~1입니다."
    },
    "ARCTANGENT": {
        "fullDesc": "ARCTANGENT 블록은 입력값의 아크탄젠트(역탄젠트)를 계산하는 블록입니다.\n\nOUT = arctan(IN1). 입력 IN1은 임의의 실수값을 받을 수 있으며, 출력 OUT은 라디안(-π/2~π/2) 단위입니다.\n\n예를 들어 IN1 = 1.0이면 OUT = π/4 (약 0.785 라디안, 45도)입니다.\n\n각도 계산, 방위각 연산, 삼각함수 역변환 등 수학적 연산이 필요한 제어 로직에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1)의 아크탄젠트를 라디안 단위로 계산하여 출력(OUT)합니다."
    },
    "ASSIGN": {
        "fullDesc": "ASSIGN 블록은 하나의 프로세스 포인트의 값과 품질(Quality)을 동일한 레코드 타입의 다른 포인트로 전송하는 블록입니다.\n\nIN1에 연결된 포인트의 값(Value)과 품질 상태(Quality Status)를 OUT에 연결된 포인트로 그대로 복사합니다. 두 포인트는 같은 레코드 타입이어야 합니다.\n\n단순한 값 전달뿐 아니라 품질 정보까지 함께 전송하므로, 소스 포인트가 BAD 품질이면 대상 포인트도 BAD 품질로 설정됩니다.\n\n포인트 간 값/품질 복사, 다른 컨트롤러의 포인트 미러링, 데이터 전달 경로 구성 등에 사용됩니다.",
        "diagramDesc": "프로세스 포인트의 값과 품질을 동일 레코드 타입의 다른 포인트로 전송합니다."
    },
    "ATREND": {
        "fullDesc": "ATREND 블록은 아날로그 또는 디지털 포인트의 값을 스트립 차트 레코더로 출력하여 트렌딩하는 블록입니다.\n\nTRND에 연결된 포인트의 값을 CARD에 지정된 스트립 차트 레코더 카드로 전송합니다. 이를 통해 운전원이 프로세스 변수의 시간에 따른 변화를 시각적으로 확인할 수 있습니다.\n\n사용자가 지정한 포인트를 실시간으로 레코더에 출력하므로, 중요한 프로세스 변수의 추세 감시, 튜닝 시 응답 확인, 이력 기록 등에 활용됩니다.",
        "diagramDesc": "지정된 포인트(TRND)의 값을 스트립 차트 레코더(CARD)로 출력하여 트렌딩합니다."
    },
    "AVALGEN": {
        "fullDesc": "AVALGEN 블록은 아날로그 포인트를 초기화하는 값 생성기 블록입니다.\n\nVALU에 설정된 값을 OUT에 연결된 아날로그 포인트에 기록합니다. DIAG 포트로 진단 정보를 확인할 수 있습니다.\n\n컨트롤러 시작 시 아날로그 포인트의 초기값을 설정하거나, 특정 상수값을 제어 로직에 공급하는 용도로 사용됩니다. 예를 들어 기본 설정값, 참조 상수, 초기 조건 값 등을 설정할 때 활용합니다.",
        "diagramDesc": "아날로그 포인트를 지정된 값(VALU)으로 초기화하는 값 생성기입니다."
    },
    "BCDNIN": {
        "fullDesc": "BCDNIN 블록은 N자리 BCD(Binary Coded Decimal) 입력을 읽어 실수 값으로 변환하는 블록입니다.\n\n패킹된 포인트(IN)에서 BCD 형식의 데이터를 읽고, 이를 실수(Real Number)로 변환하여 출력 레코드(OUT)의 AV 필드에 저장합니다.\n\nBITP는 BCD 데이터의 시작 비트 위치, NDIG는 변환할 자릿수를 설정합니다. CNTL은 제어 파라미터이며, DIAG로 진단 정보를 확인합니다.\n\n외부 장치(PLC, 계기 등)에서 BCD 형식으로 전송된 데이터를 Ovation 시스템의 아날로그 값으로 변환할 때 사용됩니다.",
        "diagramDesc": "패킹된 BCD 입력(IN)을 실수 값으로 변환하여 출력(OUT)합니다. BITP로 시작 비트, NDIG로 자릿수를 지정합니다."
    },
    "BCDNOUT": {
        "fullDesc": "BCDNOUT 블록은 실수 값을 N자리 BCD(Binary Coded Decimal)로 변환하여 패킹 출력 포인트에 기록하는 블록입니다.\n\n입력(IN)에서 실수 값을 읽고, BCD 형식으로 변환하여 지정된 자릿수만큼 출력 패킹 포인트에 기록합니다.\n\nBITP는 BCD 데이터의 시작 비트 위치, NDIG는 변환할 자릿수를 설정합니다. CNTL은 제어 파라미터이며, DIAG로 진단 정보를 확인합니다.\n\nOvation 시스템의 아날로그 값을 BCD 형식으로 외부 장치(PLC, 표시기 등)에 전송할 때 사용됩니다.",
        "diagramDesc": "실수 입력(IN)을 BCD 형식으로 변환하여 패킹 출력(OUT)에 기록합니다. BITP로 시작 비트, NDIG로 자릿수를 지정합니다."
    },
    "BILLFLOW": {
        "fullDesc": "BILLFLOW 블록은 AGA3 규격에 따른 가스 유량 계산을 수행하는 블록입니다.\n\n오리피스 플레이트를 통한 가스 유량을 AGA(American Gas Association) Report No. 3 기준으로 계산합니다. 정압(SP), 차압(DP), 온도(TEMP), 비중(GRAV) 등의 입력을 받아 보정된 유량(OUT)을 산출합니다.\n\nXDO는 오리피스 직경, DI는 파이프 내경, PB/TB는 기준 압력/온도, TAP은 탭 유형, CU는 단위 계수, C02/N2는 CO2/질소 함량, SC는 비열 계수, BP는 기압을 설정합니다.\n\nFLOW는 유량 유형 선택이며, DIAG로 진단 정보를 확인합니다.\n\n천연가스 등 가스류의 정밀 유량 측정/계산, 가스 거래량 산정(Billing), 가스 터빈 연료 유량 감시 등에 사용됩니다.",
        "diagramDesc": "AGA3 규격에 따라 오리피스 가스 유량을 계산합니다. 정압(SP), 차압(DP), 온도(TEMP), 비중(GRAV) 등을 입력받아 보정된 유량(OUT)을 산출합니다."
    },
    "CALCBLOCKD": {
        "fullDesc": "CALCBLOCKD 블록은 CALCBLOCK의 디지털 버전으로, 사용자 정의 수식을 계산하는 확장 블록입니다.\n\n최대 18개의 아날로그 입력(IN1~IN18), 10개의 인수(ARG1~ARG10, AR30), 10개의 상수(CON1~CON10)를 사용하여 사용자가 정의한 수식을 계산합니다. ENBL 입력으로 계산 활성화/비활성화를 제어합니다.\n\n결과는 OUT으로 출력되며, VALI는 계산 결과의 유효성을 나타냅니다. DIAG로 진단 정보를 확인합니다.\n\n표준 블록으로 구현하기 어려운 복잡한 수식이나 특수 계산이 필요할 때, 사용자가 직접 수식을 정의하여 사용하는 범용 계산 블록입니다.",
        "diagramDesc": "사용자 정의 수식을 계산하는 확장 블록입니다. 최대 18개 입력, 10개 인수, 10개 상수를 조합하여 OUT에 결과를 출력합니다."
    },
    "COSINE": {
        "fullDesc": "COSINE 블록은 입력값의 코사인을 계산하는 블록입니다.\n\nOUT = cos(IN1). 입력 IN1은 라디안 단위의 각도이며, 출력 OUT은 -1.0에서 1.0 사이의 값입니다.\n\n예를 들어 IN1 = 0이면 OUT = 1.0, IN1 = π/2(약 1.571)이면 OUT = 0, IN1 = π(약 3.142)이면 OUT = -1.0입니다.\n\n삼각함수 계산이 필요한 제어 로직, 위상 계산, 좌표 변환 등에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1, 라디안)의 코사인을 계산하여 출력(OUT)합니다. 출력 범위는 -1~1입니다."
    },
    "DBEQUALS": {
        "fullDesc": "DBEQUALS 블록은 두 아날로그 입력 값의 편차를 감시하는 High/Low 비교기 블록입니다.\n\nIN1과 IN2 두 입력값의 차이가 DBND(Dead Band) 범위 이내이면 OUT이 TRUE, 범위를 벗어나면 FALSE가 됩니다. RTRN은 리턴 데드밴드를 설정합니다.\n\nDIAG로 진단 정보를 확인합니다.\n\n두 프로세스 변수가 일치하는지(허용 오차 이내) 확인할 때 사용합니다. 예를 들어 설정값과 실제값의 일치 확인, 중복 센서 간 편차 감시, 밸브 지령값과 피드백 값의 일치 확인 등에 활용됩니다.",
        "diagramDesc": "두 아날로그 입력(IN1, IN2)의 편차가 데드밴드(DBND) 이내인지 감시하여, 일치하면 OUT이 TRUE가 됩니다."
    },
    "DEVICESEQ": {
        "fullDesc": "DEVICESEQ 블록은 제어 로직 기능과 MASTERSEQ 알고리즘 사이의 인터페이스를 제공하는 디바이스 시퀀서 블록입니다.\n\nMSTR은 연결된 MASTERSEQ 블록의 포인트입니다. MASTERSEQ에서 STRT(시작) 명령을 받으면 해당 제어 기능을 실행하고, 결과를 PASS(성공)/FAIL(실패)로 보고합니다.\n\nRDY는 디바이스가 준비되었음을 나타내며, TARG는 목표 상태, ACT는 현재 실행 상태를 나타냅니다. TIME은 스텝 실행 제한 시간을 설정합니다.\n\n시퀀셜 제어에서 각 단계(스텝)의 실행 상태를 MASTERSEQ에 보고하고, MASTERSEQ의 명령에 따라 개별 디바이스를 제어하는 용도로 사용됩니다.",
        "diagramDesc": "MASTERSEQ와 개별 제어 로직을 연결하는 디바이스 시퀀서입니다. MASTERSEQ의 명령(STRT)에 따라 실행하고 결과(PASS/FAIL)를 보고합니다."
    },
    "DIGCOUNT": {
        "fullDesc": "DIGCOUNT 블록은 N개의 디지털 입력 중 M개 이상이 TRUE인지 판별하는 디지털 카운터 블록입니다.\n\nN개의 디지털 입력(IN1~IN12, 최대 12개) 중 M개(MTRU) 이상이 TRUE이면 FLAG 출력이 TRUE가 됩니다. NMIN은 감시할 입력의 총 수(N)를 설정합니다.\n\nOUT은 현재 TRUE인 입력의 개수를 아날로그 값으로 출력합니다. DIAG로 진단 정보를 확인합니다.\n\n예를 들어 3개의 센서 중 2개 이상이 알람이면 트립하는 '2 out of 3' 투표 로직(Voting Logic)에 사용됩니다. 다중 센서 투표, 다수결 판정 등에 활용됩니다.",
        "diagramDesc": "최대 12개 디지털 입력 중 M개 이상이 TRUE이면 FLAG가 TRUE가 됩니다. 투표 로직(Voting Logic)에 사용됩니다."
    },
    "DIGDRUM": {
        "fullDesc": "DIGDRUM 블록은 디지털 출력을 가진 소프트웨어 드럼 컨트롤러입니다.\n\n최대 32개의 디지털 출력과 최대 50스텝까지 운용할 수 있습니다. 각 스텝마다 I01~I40으로 입력 조건과 시간을 설정합니다.\n\nINC(증가)와 DEC(감소)로 스텝을 전진/후퇴시키며, TMOD는 시간 모드를 설정합니다. TRIN은 트래킹 입력으로, 외부에서 현재 스텝을 강제 지정할 수 있습니다. NMIN은 최소 스텝 수, TYPE은 드럼 타입을 설정합니다.\n\nSTEP 출력은 현재 스텝 번호를 나타내며, O01, O31, O32 등이 각 스텝에 해당하는 디지털 출력입니다.\n\n보일러 기동/정지 시 밸브 개폐, 펌프 기동/정지 등의 순서를 단계별로 제어하는 시퀀스 제어에 주로 사용됩니다.",
        "diagramDesc": "소프트웨어 드럼 컨트롤러로, 최대 50스텝의 디지털 출력 시퀀스를 제어합니다. INC/DEC로 스텝을 이동하며 각 스텝의 디지털 출력을 설정합니다."
    },
    "DROPSTATUS": {
        "fullDesc": "DROPSTATUS 블록은 특정 컨트롤러의 드롭 상태 레코드(DU)에서 레코드 필드의 내용을 읽어 출력하는 블록입니다.\n\nAOUT은 아날로그 출력으로 레코드 필드의 값을 출력하며, POUT은 패킹 출력으로 상태 정보를 출력합니다.\n\n컨트롤러의 통신 상태, 연결 상태 등 드롭 수준의 시스템 상태 정보를 제어 로직에서 활용할 수 있게 해줍니다. 네트워크 진단, 컨트롤러 상태 감시 등에 사용됩니다.",
        "diagramDesc": "컨트롤러의 드롭 상태 레코드(DU) 필드 내용을 아날로그(AOUT)와 패킹(POUT) 출력으로 제공합니다."
    },
    "DRPI": {
        "fullDesc": "DRPI 블록은 디지털 제어봉 위치 표시기(Digital Rod Position Indicator) 블록입니다.\n\n그레이 코드(Gray Code) 입력(IN1)을 실제 제어봉 위치로 변환합니다. MNIN은 최소 입력값, GAP은 갭 검출 임계값, TOPG는 상단 갭, FUEL은 연료부 길이, BOTS는 하단 스텝, MAXS는 최대 스텝, STEP은 스텝 크기를 설정합니다.\n\nROD는 제어봉 위치(아날로그), SHUT은 셧다운 상태, TRIP은 트립 상태, OUT은 디지털 출력, RODZ는 제어봉 존(Zone) 정보를 출력합니다.\n\n원자력 발전소에서 제어봉의 정확한 위치를 감시하고 표시하는 데 사용됩니다.",
        "diagramDesc": "그레이 코드 입력(IN1)을 실제 제어봉 위치(ROD)로 변환하는 디지털 제어봉 위치 표시기입니다."
    },
    "DVALGEN": {
        "fullDesc": "DVALGEN 블록은 디지털 포인트를 초기화하는 값 생성기 블록입니다.\n\nVALU에 설정된 값(TRUE/FALSE)을 OUT에 연결된 디지털 포인트에 기록합니다. DIAG 포트로 진단 정보를 확인할 수 있습니다.\n\n컨트롤러 시작 시 디지털 포인트의 초기값을 설정하거나, 특정 상수 디지털 값을 제어 로직에 공급하는 용도로 사용됩니다. 예를 들어 초기 상태 설정, 테스트용 고정 신호 등에 활용합니다.",
        "diagramDesc": "디지털 포인트를 지정된 값(VALU)으로 초기화하는 값 생성기입니다."
    },
    "FIELD": {
        "fullDesc": "FIELD 블록은 하드웨어 아날로그 출력 변수 포인트에 사용되는 I/O 기록 블록입니다.\n\nIN1의 아날로그 값을 하드웨어 출력 포인트에 기록합니다. TOUT은 트래킹 출력으로 현재 하드웨어 출력의 실제 값을 피드백합니다. HWPT는 하드웨어 포인트 참조이며, FAIL은 하드웨어 출력 실패 시 TRUE가 됩니다.\n\n제어 로직의 출력을 실제 현장 디바이스(밸브, 댐퍼 등)에 전달하는 최종 출력 단계에서 사용됩니다. 하드웨어 출력 카드와 직접 연결되는 인터페이스 블록입니다.",
        "diagramDesc": "하드웨어 아날로그 출력 포인트에 제어값(IN1)을 기록합니다. FAIL로 출력 실패 여부를 감시합니다."
    },
    "FIFO": {
        "fullDesc": "FIFO 블록은 선입선출(First In - First Out) 큐 동작을 제공하는 블록입니다.\n\n최대 16개의 입력(IN1~IN16)을 순서대로 큐에 넣고, 먼저 들어온 값부터 OUT으로 출력합니다. RTAT는 큐 회전(Rotate) 입력이며, CLR은 큐를 초기화(Clear)합니다.\n\nFLAG는 큐 상태를 나타내는 디지털 출력으로, 큐가 비어있거나 가득 찬 상태를 표시합니다.\n\n순서가 중요한 트랜잭션 처리, 데이터 버퍼링, 이벤트 큐 관리 등에 사용됩니다. 예를 들어 연료 투입 순서 관리, 작업 대기열 처리 등에 활용합니다.",
        "diagramDesc": "선입선출(FIFO) 큐를 제공합니다. 최대 16개 입력을 순서대로 저장하고 먼저 들어온 값부터 출력(OUT)합니다."
    },
    "GASFLOW": {
        "fullDesc": "GASFLOW 블록은 압력 및 온도 보정된 가스 유량을 계산하는 블록입니다.\n\n이상 기체(Ideal Gas)에 대한 질량 또는 체적 유량을 계산합니다. PRES(압력)와 TEMP(온도)로 보정하며, GAIN은 유량 보정 계수입니다.\n\nTPSC(Top Scale)와 BTSC(Bottom Scale)로 출력 범위를 설정합니다. PUSR은 사용자 정의 압력, IN1은 유량 입력, TRIN은 트래킹 입력입니다.\n\nTOUT은 트래킹 출력, PACT는 실제 적용된 압력, TACT는 실제 적용된 온도를 출력합니다. OUT은 보정된 유량 출력입니다.\n\n가스 유량의 압력/온도 보정이 필요한 유량 측정, 연료 가스 유량 감시, 공기 유량 계산 등에 사용됩니다.",
        "diagramDesc": "이상 기체의 압력/온도 보정 유량을 계산합니다. 압력(PRES)과 온도(TEMP)로 보정된 유량을 OUT으로 출력합니다."
    },
    "HIGHLOWMON": {
        "fullDesc": "HIGHLOWMON 블록은 상한과 하한을 동시에 감시하는 신호 감시 블록입니다.\n\n입력(IN1)이 HISP(상한 설정값)를 초과하거나 LOSP(하한 설정값) 미만이면 OUT이 TRUE가 됩니다. HIDB와 LODB는 각각 상한/하한의 리셋 데드밴드로, 알람이 해제되는 복귀점을 설정합니다.\n\n설정값은 고정(Fixed) 또는 가변(Variable) 리밋으로 구성할 수 있습니다. DIAG로 진단 정보를 확인합니다.\n\n프로세스 변수가 정상 범위를 벗어나는지 감시할 때 사용합니다. 예를 들어 온도, 압력, 레벨 등이 상/하한 범위를 벗어나면 알람을 발생시키는 로직에 활용됩니다.",
        "diagramDesc": "입력(IN1)이 상한(HISP) 초과 또는 하한(LOSP) 미만이면 OUT이 TRUE가 됩니다. 상/하한 동시 감시 블록입니다."
    },
    "HIGHMON": {
        "fullDesc": "HIGHMON 블록은 상한을 감시하는 신호 감시 블록입니다.\n\n입력(IN1)이 HISP(상한 설정값)를 초과하면 OUT이 TRUE가 됩니다. HIDB는 리셋 데드밴드로, 알람이 해제되는 복귀점을 설정합니다. 즉, IN1이 HISP-HIDB 이하로 내려와야 OUT이 FALSE로 복귀합니다.\n\n설정값은 고정(Fixed) 또는 가변(Variable) 리밋으로 구성할 수 있습니다. DIAG로 진단 정보를 확인합니다.\n\n프로세스 변수가 상한을 초과하는지 감시할 때 사용합니다. 과압, 과온, 과유량 등의 상한 알람/트립 로직에 활용됩니다.",
        "diagramDesc": "입력(IN1)이 상한 설정값(HISP)을 초과하면 OUT이 TRUE가 됩니다. 데드밴드(HIDB)로 복귀점을 설정합니다."
    },
    "HSCLTP": {
        "fullDesc": "HSCLTP 블록은 압축수(Compressed Liquid)의 엔탈피(H)와 엔트로피(S)를 계산하는 증기표 블록입니다.\n\n온도(TEMP)와 압력(PRES)을 입력받아 해당 조건에서의 압축수 엔탈피(ENTHALPY)를 출력합니다. FLAG는 계산 유효성을 나타내며, 입력이 유효 범위를 벗어나면 오류를 표시합니다.\n\nIAPWS(International Association for the Properties of Water and Steam) 증기표에 기반한 열역학적 물성치 계산 블록입니다.\n\n발전소의 급수, 복수 등 압축수 영역의 엔탈피 계산, 열효율 산정, 에너지 수지 계산 등에 사용됩니다.",
        "diagramDesc": "온도(TEMP)와 압력(PRES)으로 압축수의 엔탈피(ENTHALPY)를 계산하는 증기표 블록입니다."
    },
    "HSLT": {
        "fullDesc": "HSLT 블록은 포화액(Saturated Liquid)의 엔탈피(H)를 온도로부터 계산하는 증기표 블록입니다.\n\n온도(TEMP)를 입력받아 해당 포화 온도에서의 포화액 엔탈피(ENTHALPY)를 출력합니다. FLAG는 계산 유효성을 나타내며, 입력이 유효 범위를 벗어나면 오류를 표시합니다.\n\n발전소의 드럼, 급수 가열기 등 포화 상태의 물/증기 엔탈피 계산에 사용됩니다.",
        "diagramDesc": "온도(TEMP)로 포화액의 엔탈피(ENTHALPY)를 계산하는 증기표 블록입니다."
    },
    "HSTVSVP": {
        "fullDesc": "HSTVSVP 블록은 포화 증기(Saturated Vapor)의 엔탈피(H), 엔트로피(S), 온도, 비체적을 압력으로부터 계산하는 증기표 블록입니다.\n\n압력(PRES)을 입력받아 해당 포화 압력에서의 포화 증기 엔탈피(ENTHALPY), 엔트로피(ENTROPY), 온도(TEMP), 비체적(VOLUME)을 출력합니다. FLAG는 계산 유효성을 나타냅니다.\n\n발전소의 터빈 입구, 증기 드럼 등 포화 증기 영역의 열역학적 물성치 계산에 사용됩니다.",
        "diagramDesc": "압력(PRES)으로 포화 증기의 엔탈피, 엔트로피, 온도, 비체적을 계산하는 증기표 블록입니다."
    },
    "HSVSSTP": {
        "fullDesc": "HSVSSTP 블록은 과열 증기(Superheated Steam)의 엔탈피(H), 엔트로피(S), 비체적을 온도와 압력으로부터 계산하는 증기표 블록입니다.\n\n온도(TEMP)와 압력(PRES)을 입력받아 과열 증기의 엔탈피(ENTHALPY), 엔트로피(ENTROPY), 비체적(VOLUME)을 출력합니다. FLAG는 계산 유효성을 나타냅니다.\n\n발전소의 과열기, 재열기, 터빈 입구 등 과열 증기 영역의 열역학적 물성치 계산, 열효율 산정에 사용됩니다.",
        "diagramDesc": "온도(TEMP)와 압력(PRES)으로 과열 증기의 엔탈피, 엔트로피, 비체적을 계산하는 증기표 블록입니다."
    },
    "INTERP": {
        "fullDesc": "INTERP 블록은 선형 테이블 룩업 및 보간(Interpolation) 기능을 제공하는 블록입니다.\n\n최대 10개의 X-Y 좌표 쌍(X1~X10, Y1~Y10)으로 구성된 테이블에서, 입력(XIN)에 해당하는 Y 값을 선형 보간하여 YOUT으로 출력합니다. NUMR은 테이블 포인트 수를 설정합니다.\n\nTYPE은 보간 유형을 설정하며, TPSC/BTSC는 출력 스케일 범위입니다. VALID는 보간 결과의 유효성을 나타냅니다. DIAG로 진단 정보를 확인합니다.\n\n비선형 센서 보정, 특성 곡선 근사, 함수 변환 테이블 등에 사용됩니다. 예를 들어 열전대 보정, 밸브 특성 곡선 보정 등에 활용합니다.",
        "diagramDesc": "X-Y 테이블에서 입력(XIN)에 해당하는 값을 선형 보간하여 출력(YOUT)합니다. 최대 10개 포인트의 룩업 테이블을 지원합니다."
    },
    "KEYBOARD": {
        "fullDesc": "KEYBOARD 블록은 프로그래머블 키 인터페이스로, 제어 키를 컨트롤러에 연결하는 블록입니다.\n\n10개의 제어 키(Start/Open, Stop/Close, Auto, Man, ↑, ↓, △, ▽)를 가장 기본적인 형태로 컨트롤러에 인터페이스합니다. PK1~PK8은 프로그래머블 키 입력이며, LENG는 키 입력 길이를 설정합니다.\n\n출력으로 OPEN(열기), CLOS(닫기), SPUP(설정값 증가), SPDN(설정값 감소), AUTO(자동), MAN(수동), INC(증가), DEC(감소)를 제공합니다. DIAG로 진단 정보를 확인합니다.\n\n운전원의 수동 조작 인터페이스를 제어 로직에 연결할 때 사용됩니다.",
        "diagramDesc": "제어 키(Start/Stop, Auto/Man, 증가/감소 등)를 컨트롤러에 연결하는 프로그래머블 키 인터페이스입니다."
    },
    "LATCHQUAL": {
        "fullDesc": "LATCHQUAL 블록은 아날로그 또는 디지털 포인트의 품질(Quality)을 래치/언래치하는 블록입니다.\n\nSET이 TRUE가 되면 IN1 포인트의 품질을 QUAL에 지정된 품질 상태로 래치(고정)합니다. RSET이 TRUE가 되면 래치를 해제하여 원래 품질로 복원합니다.\n\n포인트의 품질을 강제로 설정하거나, 특정 조건에서 품질 상태를 유지해야 할 때 사용합니다. 예를 들어 센서 고장 시 해당 포인트를 BAD 품질로 강제 설정하거나, 유지보수 중 품질을 고정하는 등에 활용됩니다.",
        "diagramDesc": "포인트의 품질(Quality)을 래치/언래치합니다. SET으로 품질을 고정하고 RSET으로 해제합니다."
    },
    "LOG": {
        "fullDesc": "LOG 블록은 입력값의 상용 로그(Base 10 Logarithm)를 계산하는 블록입니다.\n\nOUT = log₁₀(IN1) + BIAS. 입력 IN1은 양수여야 하며, BIAS는 출력에 더해지는 바이어스 값입니다.\n\n예를 들어 IN1 = 100, BIAS = 0이면 OUT = 2.0입니다. IN1이 0 이하이면 오류가 발생합니다. DIAG로 진단 정보를 확인합니다.\n\npH 계산, dB 변환, 로그 스케일 변환 등 수학적 로그 연산이 필요한 제어 로직에 사용됩니다.",
        "diagramDesc": "입력(IN1)의 상용 로그(Base 10)를 계산하고 BIAS를 더하여 출력(OUT)합니다."
    },
    "LOWMON": {
        "fullDesc": "LOWMON 블록은 하한을 감시하는 신호 감시 블록입니다.\n\n입력(IN1)이 LOSP(하한 설정값) 미만이면 OUT이 TRUE가 됩니다. LODB는 리셋 데드밴드로, 알람이 해제되는 복귀점을 설정합니다. 즉, IN1이 LOSP+LODB 이상으로 올라와야 OUT이 FALSE로 복귀합니다.\n\n설정값은 고정(Fixed) 또는 가변(Variable) 리밋으로 구성할 수 있습니다. DIAG로 진단 정보를 확인합니다.\n\n프로세스 변수가 하한 미만인지 감시할 때 사용합니다. 저압, 저온, 저유량, 저레벨 등의 하한 알람/트립 로직에 활용됩니다.",
        "diagramDesc": "입력(IN1)이 하한 설정값(LOSP) 미만이면 OUT이 TRUE가 됩니다. 데드밴드(LODB)로 복귀점을 설정합니다."
    },
    "MAMODE": {
        "fullDesc": "MAMODE 블록은 MASTATION 알고리즘과 연계하여 자동/수동 모드를 관리하는 블록입니다.\n\nPLW(Permit Lower)와 PRA(Permit Raise)로 하한/상한 허가를 설정합니다. LWI(Lower Input)와 RAI(Raise Input)는 하강/상승 입력이며, MRE(Manual Request)와 ARE(Auto Request)는 수동/자동 요청입니다.\n\nBACT는 블록 활성 상태, STRK는 스트로크 입력, TRK는 트래킹 상태를 나타냅니다.\n\n출력으로 AUTO(자동 모드), MAN(수동 모드), LOC(로컬 모드), MODE(현재 모드)를 제공합니다.\n\nMASTATION과 함께 디바이스의 자동/수동/로컬 모드 전환 로직을 구현할 때 사용됩니다.",
        "diagramDesc": "MASTATION과 연계하여 자동/수동/로컬 모드를 관리합니다. AUTO, MAN, LOC 출력으로 현재 모드 상태를 제공합니다."
    },
    "MASTERSEQ": {
        "fullDesc": "MASTERSEQ 블록은 순차 제어(Sequential Control)의 마스터 시퀀서 알고리즘입니다.\n\n제어 기능의 순차적 실행을 감독하는 상위 시퀀서로, 최대 30개의 DEVICESEQ 디바이스(DV01~DV30)를 관리합니다. 각 스텝마다 ST01~ST30으로 스텝 조건을 설정합니다.\n\nENBL(활성화), OVRD(오버라이드), PRCD(진행), RSET(리셋), TKIN(트래킹 입력)으로 시퀀서를 제어합니다. TMOD는 시간 모드, NMIN은 최소 스텝 수입니다.\n\n출력으로 FAIL(실패), HOLD(대기), DONE(완료), STEP(현재 스텝)을 제공합니다.\n\n발전소 기동/정지 시퀀스, 설비 시운전 절차, 복잡한 순차 제어 등에서 마스터 시퀀서로 사용됩니다.",
        "diagramDesc": "순차 제어의 마스터 시퀀서로, 최대 30개의 DEVICESEQ를 관리하며 스텝별로 순차 실행합니다. STEP으로 현재 진행 단계를 출력합니다."
    },
    "NLOG": {
        "fullDesc": "NLOG 블록은 입력값의 자연 로그(Natural Logarithm)를 계산하는 블록입니다.\n\nOUT = ln(IN1) + BIAS. 입력 IN1은 양수여야 하며, BIAS는 출력에 더해지는 바이어스 값입니다.\n\n예를 들어 IN1 = e(약 2.718), BIAS = 0이면 OUT = 1.0입니다. IN1이 0 이하이면 오류가 발생합니다. DIAG로 진단 정보를 확인합니다.\n\n자연 로그 기반 수학적 연산이 필요한 제어 로직, 지수 함수의 역변환 등에 사용됩니다.",
        "diagramDesc": "입력(IN1)의 자연 로그(ln)를 계산하고 BIAS를 더하여 출력(OUT)합니다."
    },
    "PACK16": {
        "fullDesc": "PACK16 블록은 최대 16개의 디지털 값을 패킹 포인트 레코드에 묶어 넣는 블록입니다.\n\n16개의 선택적 디지털 입력(D0~D15)을 받아, 각 입력을 LP 또는 그 이상의 패킹 포인트 레코드의 A2 필드 해당 비트 위치에 저장합니다. PBPT는 대상 패킹 포인트를 지정합니다.\n\n예를 들어 D0=TRUE, D1=FALSE, D2=TRUE이면 패킹 값의 비트 0=1, 비트 1=0, 비트 2=1이 됩니다.\n\n여러 개의 디지털 신호를 하나의 패킹 포인트로 통합하여 PLC나 외부 시스템에 전송할 때, 또는 통신 효율을 위해 디지털 신호를 묶을 때 사용됩니다.",
        "diagramDesc": "최대 16개 디지털 입력(D0~D15)을 하나의 패킹 포인트(PBPT)에 묶어 저장합니다."
    },
    "PNTSTATUS": {
        "fullDesc": "PNTSTATUS 블록은 포인트 레코드의 상태 워드에서 지정된 2개 비트의 상태를 출력하는 블록입니다.\n\nSTAT은 상태 워드 선택, BITA와 BITB는 각각 감시할 비트 번호를 지정합니다. ENBL은 활성화 입력이며, IN1은 대상 포인트입니다.\n\n출력으로 OUTA와 OUTB가 각각 BITA와 BITB 위치의 비트 상태(TRUE/FALSE)를 출력합니다. DIAG로 진단 정보를 확인합니다.\n\n포인트의 상태 워드에서 특정 비트를 추출하여 제어 로직에 활용할 때 사용합니다. 예를 들어 알람 상태, 품질 비트, 모드 상태 등의 개별 비트를 확인하는 데 활용됩니다.",
        "diagramDesc": "포인트 상태 워드에서 지정된 2개 비트(BITA, BITB)의 상태를 디지털 출력(OUTA, OUTB)으로 제공합니다."
    },
    "POLYNOMIAL": {
        "fullDesc": "POLYNOMIAL 블록은 5차 다항식 함수를 계산하는 블록입니다.\n\nOUT = CX0 + CX1×IN1 + CX2×IN1² + CX3×IN1³ + CX4×IN1⁴ + CX5×IN1⁵. 입력(IN1)에 대해 계수(CX0~CX5)로 정의된 5차 다항식을 계산하여 OUT으로 출력합니다.\n\nCX0은 상수항, CX1~CX5는 각 차수의 계수입니다. DIAG로 진단 정보를 확인합니다.\n\n비선형 함수의 다항식 근사, 센서 보정 곡선, 특성 곡선 계산 등에 사용됩니다. INTERP 블록보다 더 정밀한 곡선 근사가 필요할 때 활용합니다.",
        "diagramDesc": "5차 다항식(CX0 + CX1·IN1 + ... + CX5·IN1⁵)을 계산하여 출력(OUT)합니다."
    },
    "PSLT": {
        "fullDesc": "PSLT 블록은 포화액(Saturated Liquid)의 압력을 온도로부터 계산하는 증기표 블록입니다.\n\n온도(TEMP)를 입력받아 해당 포화 온도에서의 포화 압력(PRES)을 출력합니다. FLAG는 계산 유효성을 나타내며, 입력이 유효 범위를 벗어나면 오류를 표시합니다.\n\n발전소의 드럼 압력 계산, 포화 조건 확인, 열역학적 상태 결정 등에 사용됩니다.",
        "diagramDesc": "온도(TEMP)로 포화액의 압력(PRES)을 계산하는 증기표 블록입니다."
    },
    "PSVS": {
        "fullDesc": "PSVS 블록은 포화 증기(Saturated Vapor)의 압력을 엔트로피(S)로부터 계산하는 증기표 블록입니다.\n\n엔트로피를 입력받아 해당 조건에서의 포화 증기 압력(PRES)과 비체적(VOLUME)을 출력합니다. FLAG는 계산 유효성을 나타냅니다.\n\n터빈 팽창 과정의 열역학적 상태 계산, 증기 사이클 분석 등에 사용됩니다.",
        "diagramDesc": "엔트로피(S)로 포화 증기의 압력(PRES)과 비체적(VOLUME)을 계산하는 증기표 블록입니다."
    },
    "PULSECNT": {
        "fullDesc": "PULSECNT 블록은 디지털 입력의 FALSE→TRUE 전환 횟수를 세는 펄스 카운터 블록입니다.\n\n디지털 입력(IN1)이 FALSE에서 TRUE로 전환될 때마다 OUT 값이 1씩 증가합니다. RSET이 TRUE가 되면 카운트를 0으로 리셋합니다.\n\n장비 기동 횟수 카운트, 이벤트 발생 횟수 집계, 유량 펄스 카운트 등에 사용됩니다.",
        "diagramDesc": "디지털 입력(IN1)의 FALSE→TRUE 전환 횟수를 세어 출력(OUT)합니다. RSET으로 카운트를 리셋합니다."
    },
    "QAVERAGE": {
        "fullDesc": "QAVERAGE 블록은 N개의 아날로그 입력의 비가중 평균을 계산하되, BAD 품질의 입력을 자동으로 제외하는 블록입니다.\n\n최대 8개의 입력(IN8까지)을 받아 평균을 계산합니다. 품질이 BAD인 입력은 자동으로 제외하고 나머지 유효한 입력만으로 평균을 산출합니다.\n\nOUT은 유효한 입력들의 평균값입니다.\n\n다중 센서의 평균값 계산에서 고장 센서를 자동으로 제외하고 싶을 때 사용합니다. 예를 들어 3개의 온도 센서 중 하나가 고장 나도 나머지 2개의 평균으로 정상 운전을 계속할 수 있습니다.",
        "diagramDesc": "최대 8개 아날로그 입력의 평균을 계산하되, BAD 품질 입력은 자동으로 제외합니다."
    },
    "QUALITYMON": {
        "fullDesc": "QUALITYMON 블록은 1개 입력 포인트의 품질(Quality)을 검사하는 블록입니다.\n\n입력(IN1)의 품질 상태가 CHK(체크 대상 품질 유형)에 지정된 품질과 일치하면 OUT이 TRUE가 됩니다. DIAG로 진단 정보를 확인합니다.\n\n예를 들어 CHK를 BAD로 설정하면, IN1의 품질이 BAD일 때 OUT이 TRUE가 됩니다.\n\n센서 품질 감시, 데이터 유효성 확인, 품질 기반 로직 분기 등에 사용됩니다. 특정 포인트의 품질 상태에 따라 제어 로직의 동작을 변경하는 용도로 활용합니다.",
        "diagramDesc": "입력(IN1)의 품질이 지정된 유형(CHK)과 일치하면 OUT이 TRUE가 됩니다. 포인트 품질 검사용 블록입니다."
    },
    "RATECHANGE": {
        "fullDesc": "RATECHANGE 블록은 평활된 입력값의 변화율(Rate of Change)을 계산하는 블록입니다.\n\n입력(IN1)을 SMTH(평활 계수)로 평활(Smoothing)한 후, 그 값의 시간당 변화율을 계산하여 OUT으로 출력합니다. DIAG로 진단 정보를 확인합니다.\n\n변화율이 양수이면 입력이 증가 중, 음수이면 감소 중임을 나타냅니다. SMTH 값이 클수록 노이즈에 덜 민감하지만 응답이 느려집니다.\n\n프로세스 변수의 변화 속도 감시, 추세 분석, 변화율 기반 알람/제어 등에 사용됩니다.",
        "diagramDesc": "입력(IN1)을 평활한 후 변화율(Rate of Change)을 계산하여 출력(OUT)합니다."
    },
    "RATEMON": {
        "fullDesc": "RATEMON 블록은 변화율(Rate of Change)을 감시하는 블록으로, 리셋 데드밴드와 고정/가변 변화율 한계를 지원합니다.\n\n입력(IN1)의 변화율이 PRAT(양의 변화율 한계)를 초과하거나 NRAT(음의 변화율 한계)를 초과하면 OUT이 TRUE가 됩니다. PDB와 NDB는 각각 양/음 방향의 리셋 데드밴드입니다.\n\nDIAG로 진단 정보를 확인합니다.\n\n프로세스 변수가 너무 빠르게 변하는지 감시할 때 사용합니다. 급격한 온도 변화, 압력 급변, 유량 급변 등의 이상 상태를 감지하는 알람 로직에 활용됩니다.",
        "diagramDesc": "입력(IN1)의 변화율이 설정 한계(PRAT/NRAT)를 초과하면 OUT이 TRUE가 됩니다. 변화율 감시 블록입니다."
    },
    "RESETSUM": {
        "fullDesc": "RESETSUM 블록은 리셋 가능한 누적 합산기 블록입니다.\n\n RUN이 TRUE인 동안 입력(IN1)의 값을 GAIN 계수로 스케일링하여 누적합니다. RSET이 TRUE가 되면 누적값을 0으로 리셋합니다. TRST는 리셋 시 사용할 트래킹 값입니다.\n\nRCNT는 리셋 카운트, FFLG는 실패 플래그입니다. OUT은 누적합, FOUT은 필터링된 출력입니다. DIAG로 진단 정보를 확인합니다.\n\n유량 적산, 에너지 누적, 생산량 집계 등 시간에 따른 누적 계산에 사용됩니다.",
        "diagramDesc": "입력(IN1)을 누적 합산하며, RSET으로 리셋할 수 있습니다. 유량 적산, 에너지 누적 등에 사용됩니다."
    },
    "RPACNT": {
        "fullDesc": "RPACNT 블록은 Ovation 펄스 어큐뮬레이터 카드에서 펄스 카운트를 읽는 블록입니다.\n\nIN1에 연결된 펄스 어큐뮬레이터 카드에서 펄스 카운트 값을 읽어 OUT으로 출력합니다. RSET이 TRUE가 되면 카운트를 리셋합니다. FOUT은 필터링된 출력입니다.\n\n터빈 속도 측정, 유량계 펄스 집계, 회전 속도 측정 등 하드웨어 펄스 카운터 카드와 인터페이스하는 데 사용됩니다.",
        "diagramDesc": "Ovation 펄스 어큐뮬레이터 카드에서 펄스 카운트를 읽어 출력(OUT)합니다."
    },
    "RPAWIDTH": {
        "fullDesc": "RPAWIDTH 블록은 Ovation 펄스 어큐뮬레이터 카드에서 펄스 폭(Width)을 읽는 블록입니다.\n\nOUT으로 펄스 폭 값을 출력합니다. 펄스의 HIGH 구간 또는 LOW 구간의 지속 시간을 측정합니다.\n\n펄스 폭 기반 측정(PWM 신호 분석, 주파수 측정 등)에서 하드웨어 펄스 카드와 인터페이스하는 데 사용됩니다.",
        "diagramDesc": "Ovation 펄스 어큐뮬레이터 카드에서 펄스 폭(Width)을 읽어 출력(OUT)합니다."
    },
    "RUNAVERAGE": {
        "fullDesc": "RUNAVERAGE 블록은 지정된 샘플링 간격으로 수집된 샘플의 이동 평균을 계산하는 블록입니다.\n\nTIME과 UNIT으로 샘플링 간격(시간 단위)을 설정하고, NUM으로 평균에 사용할 샘플 수를 설정합니다. 매 샘플링 간격마다 IN1의 값을 수집하여, 최근 NUM개 샘플의 평균을 OUT으로 출력합니다.\n\nDIAG로 진단 정보를 확인합니다.\n\n노이즈가 많은 프로세스 변수의 평활화, 장기 추세 분석, 평균 부하 계산 등에 사용됩니다. SMOOTH 블록보다 더 긴 시간 범위의 평균이 필요할 때 활용합니다.",
        "diagramDesc": "지정된 간격으로 입력(IN1)을 샘플링하여 최근 N개 샘플의 이동 평균을 출력(OUT)합니다."
    },
    "RVPSTATUS": {
        "fullDesc": "RVPSTATUS 블록은 Ovation 밸브 포지셔너(RVP) 카드의 상태를 감시하는 블록입니다.\n\nRVP 카드의 상태 레지스터(STAT)와 명령 레지스터(CMD)를 읽어 표시합니다. PCI는 PCI 버스 정보, ENBL은 활성화 상태입니다. DIAG로 진단 정보를 확인합니다.\n\n밸브 포지셔너 카드의 하드웨어 상태 진단, 통신 상태 확인, 카드 장애 감지 등에 사용됩니다.",
        "diagramDesc": "Ovation 밸브 포지셔너(RVP) 카드의 상태/명령 레지스터를 읽어 표시하는 진단 블록입니다."
    },
    "SATOSP": {
        "fullDesc": "SATOSP 블록은 하나의 아날로그 값을 패킹 포인트 레코드로 전송하는 블록입니다.\n\nIN에 연결된 아날로그 값을 PACK에 지정된 패킹 포인트 레코드에 기록합니다. 프로그래머블 컨트롤러(PLC)에서 사용하기 위한 데이터 변환 용도입니다.\n\nOvation의 아날로그 값을 PLC 등 외부 시스템에 패킹 형태로 전달할 때 사용됩니다. SPTOSA(패킹→아날로그)의 반대 기능입니다.",
        "diagramDesc": "아날로그 값(IN)을 패킹 포인트 레코드(PACK)로 전송합니다. PLC 인터페이스에 사용됩니다."
    },
    "SETPOINT": {
        "fullDesc": "SETPOINT 블록은 소프트/하드 수동 로더 스테이션 기능을 수행하는 블록입니다.\n\n수동 로더(Manual Loader)로서, 운전원이 설정값을 직접 입력하거나 증가/감소시킬 수 있습니다. TPSC(Top Scale)와 BTSC(Bottom Scale)로 출력 범위를 제한하며, PCNT는 변화율(%)을, TIME은 변화 시간을 설정합니다.\n\nCARD와 CNUM은 하드웨어 키보드 카드 연결 정보입니다. OUT은 설정값 출력이며, TRIN은 트래킹 입력, TOUT은 트래킹 출력입니다. DIAG로 진단 정보를 확인합니다.\n\n운전원이 수동으로 설정값을 조작하는 스테이션, PID 블록에 설정값을 공급하는 로더, 램프(Ramp) 기능이 필요한 설정값 관리 등에 사용됩니다.",
        "diagramDesc": "수동 로더 스테이션으로, 운전원이 설정값을 직접 조작합니다. TPSC/BTSC로 범위를 제한하며 OUT으로 설정값을 출력합니다."
    },
    "SINE": {
        "fullDesc": "SINE 블록은 입력값의 사인을 계산하는 블록입니다.\n\nOUT = sin(IN1). 입력 IN1은 라디안 단위의 각도이며, 출력 OUT은 -1.0에서 1.0 사이의 값입니다.\n\n예를 들어 IN1 = 0이면 OUT = 0, IN1 = π/2(약 1.571)이면 OUT = 1.0, IN1 = π(약 3.142)이면 OUT = 0입니다.\n\n삼각함수 계산이 필요한 제어 로직, 위상 계산, 좌표 변환, 진동 분석 등에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1, 라디안)의 사인을 계산하여 출력(OUT)합니다. 출력 범위는 -1~1입니다."
    },
    "SLCAIN": {
        "fullDesc": "SLCAIN 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드에서 최대 16개의 아날로그 값을 읽는 I/O 입력 블록입니다.\n\nCARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에서 아날로그 입력 값을 읽어 OUT16(최대 16포인트)으로 출력합니다. TYPE은 카드 유형을 설정합니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)로 이중화 카드의 상태를 감시합니다. DIAG로 진단 정보를 확인합니다.\n\n원격 I/O 카드(QLC/LC)를 통해 외부 장치의 아날로그 신호를 Ovation 제어 로직으로 읽어들이는 데 사용됩니다.",
        "diagramDesc": "QLC/LC 카드에서 최대 16개 아날로그 값을 읽는 I/O 입력 블록입니다. PSTA/SSTA로 카드 상태를 감시합니다."
    },
    "SLCAOUT": {
        "fullDesc": "SLCAOUT 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드에 최대 16개의 아날로그 값을 쓰는 I/O 출력 블록입니다.\n\nIN16(최대 16포인트)의 아날로그 값을 CARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에 기록합니다. TYPE은 카드 유형을 설정합니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)로 이중화 카드의 상태를 감시합니다. DIAG로 진단 정보를 확인합니다.\n\nOvation 제어 로직의 아날로그 출력을 원격 I/O 카드(QLC/LC)를 통해 외부 장치에 전달하는 데 사용됩니다.",
        "diagramDesc": "QLC/LC 카드에 최대 16개 아날로그 값을 쓰는 I/O 출력 블록입니다. PSTA/SSTA로 카드 상태를 감시합니다."
    },
    "SLCDIN": {
        "fullDesc": "SLCDIN 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드에서 최대 16개의 디지털 값을 읽는 I/O 입력 블록입니다.\n\nCARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에서 디지털 입력 값을 읽어 OUT16(최대 16포인트)으로 출력합니다. TYPE은 카드 유형을 설정합니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)로 이중화 카드의 상태를 감시합니다. DIAG로 진단 정보를 확인합니다.\n\n원격 I/O 카드(QLC/LC)를 통해 외부 장치의 디지털 신호를 Ovation 제어 로직으로 읽어들이는 데 사용됩니다.",
        "diagramDesc": "QLC/LC 카드에서 최대 16개 디지털 값을 읽는 I/O 입력 블록입니다. PSTA/SSTA로 카드 상태를 감시합니다."
    },
    "SLCDOUT": {
        "fullDesc": "SLCDOUT 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드에 최대 16개의 디지털 값을 쓰는 I/O 출력 블록입니다.\n\nIN16(최대 16포인트)의 디지털 값을 CARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에 기록합니다. TYPE은 카드 유형을 설정합니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)로 이중화 카드의 상태를 감시합니다. DIAG로 진단 정보를 확인합니다.\n\nOvation 제어 로직의 디지털 출력을 원격 I/O 카드(QLC/LC)를 통해 외부 장치에 전달하는 데 사용됩니다.",
        "diagramDesc": "QLC/LC 카드에 최대 16개 디지털 값을 쓰는 I/O 출력 블록입니다. PSTA/SSTA로 카드 상태를 감시합니다."
    },
    "SLCPIN": {
        "fullDesc": "SLCPIN 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드에서 최대 16개의 패킹 포인트를 읽는 I/O 입력 블록입니다.\n\nCARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에서 패킹 입력 값을 읽어 OUT16(최대 16포인트)으로 출력합니다. TYPE은 카드 유형을 설정합니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)로 이중화 카드의 상태를 감시합니다. DIAG로 진단 정보를 확인합니다.\n\n원격 I/O 카드(QLC/LC)를 통해 패킹 데이터를 Ovation 제어 로직으로 읽어들이는 데 사용됩니다.",
        "diagramDesc": "QLC/LC 카드에서 최대 16개 패킹 포인트를 읽는 I/O 입력 블록입니다. PSTA/SSTA로 카드 상태를 감시합니다."
    },
    "SLCPOUT": {
        "fullDesc": "SLCPOUT 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드에 최대 16개의 패킹 포인트를 쓰는 I/O 출력 블록입니다.\n\nIN16(최대 16포인트)의 패킹 값을 CARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에 기록합니다. TYPE은 카드 유형을 설정합니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)로 이중화 카드의 상태를 감시합니다. DIAG로 진단 정보를 확인합니다.\n\nOvation 제어 로직의 패킹 출력을 원격 I/O 카드(QLC/LC)를 통해 외부 장치에 전달하는 데 사용됩니다.",
        "diagramDesc": "QLC/LC 카드에 최대 16개 패킹 포인트를 쓰는 I/O 출력 블록입니다. PSTA/SSTA로 카드 상태를 감시합니다."
    },
    "SLCSTATUS": {
        "fullDesc": "SLCSTATUS 블록은 Group 1 QLC 또는 Ovation Link Controller(LC) 카드의 하드웨어 및 사용자 애플리케이션 상태 정보를 읽는 블록입니다.\n\nCARD에 지정된 QLC/LC 카드(또는 이중화 카드 쌍)에서 주 카드(P: Primary)와 보조 카드(S: Secondary)의 상태를 읽습니다. PFID/SFID는 펌웨어 ID, PPR1/SPR1과 PPR2/SPR2는 프로세서 상태, PAUX/SAUX는 보조 상태입니다.\n\nPSTA(주 카드 상태)와 SSTA(보조 카드 상태)는 전체 카드 상태를 요약합니다. DIAG로 진단 정보를 확인합니다.\n\n원격 I/O 카드(QLC/LC)의 하드웨어 진단, 펌웨어 상태 확인, 이중화 카드 상태 감시 등에 사용됩니다.",
        "diagramDesc": "QLC/LC 카드의 하드웨어 및 애플리케이션 상태 정보를 읽는 진단 블록입니다. 이중화 카드의 주/보조 상태를 모두 감시합니다."
    },
    "SMOOTH": {
        "fullDesc": "SMOOTH 블록은 아날로그 입력값을 평활(Smoothing)하는 블록입니다.\n\n입력(IN1)에 1차 지수 평활(First-order Exponential Smoothing)을 적용하여 OUT으로 출력합니다. SMTH는 평활 계수(Smoothing Factor)로, 값이 클수록 더 강한 평활 효과를 줍니다.\n\nDIAG로 진단 정보를 확인합니다.\n\n노이즈가 많은 센서 신호의 평활화, 급격한 변동 완화, PID 입력 전처리 등에 사용됩니다. RUNAVERAGE보다 간단한 실시간 평활이 필요할 때 활용합니다.",
        "diagramDesc": "아날로그 입력(IN1)에 지수 평활을 적용하여 노이즈를 제거한 값을 출력(OUT)합니다."
    },
    "SPTOSA": {
        "fullDesc": "SPTOSA 블록은 패킹 포인트 레코드의 값을 아날로그 포인트 레코드로 전송하는 블록입니다.\n\nPACK에 연결된 패킹 포인트의 값을 읽어 OUT에 연결된 아날로그 포인트에 기록합니다.\n\nPLC 등 외부 시스템에서 패킹 형태로 전달된 데이터를 Ovation의 아날로그 값으로 변환할 때 사용됩니다. SATOSP(아날로그→패킹)의 반대 기능입니다.",
        "diagramDesc": "패킹 포인트(PACK)의 값을 아날로그 포인트(OUT)로 전송합니다. SATOSP의 역방향 변환입니다."
    },
    "SSLT": {
        "fullDesc": "SSLT 블록은 포화액(Saturated Liquid)의 엔트로피(S)를 온도로부터 계산하는 증기표 블록입니다.\n\n온도(TEMP)를 입력받아 해당 포화 온도에서의 포화액 엔트로피(ENTROPY)를 출력합니다. FLAG는 계산 유효성을 나타내며, 입력이 유효 범위를 벗어나면 오류를 표시합니다.\n\n발전소의 열역학적 사이클 분석, 엔트로피 기반 효율 계산 등에 사용됩니다.",
        "diagramDesc": "온도(TEMP)로 포화액의 엔트로피(ENTROPY)를 계산하는 증기표 블록입니다."
    },
    "STEPTIME": {
        "fullDesc": "STEPTIME 블록은 자동 스텝 타이머 블록입니다.\n\n설정된 시간 간격으로 자동으로 스텝을 진행합니다. HOLD가 TRUE이면 타이머를 일시 정지합니다. TMOD는 시간 모드, TRIN은 트래킹 입력, UNIT은 시간 단위를 설정합니다.\n\nSTEP은 현재 스텝 번호를 출력합니다. RHRS/RMIN/RSEC는 남은 시간(시/분/초), EHRS/EMIN/ESEC는 경과 시간(시/분/초)을 출력합니다. DIAG로 진단 정보를 확인합니다.\n\n시간 기반 순차 제어, 자동 승온/승압 프로그램의 타이머, 드럼 컨트롤러의 시간 관리 등에 사용됩니다.",
        "diagramDesc": "자동 스텝 타이머로, 설정된 시간 간격으로 스텝을 진행합니다. 남은 시간과 경과 시간을 출력합니다."
    },
    "SYSTEMTIME": {
        "fullDesc": "SYSTEMTIME 블록은 컨트롤러의 시스템 시간(UTC)을 읽어 각 시간 요소를 아날로그 출력으로 제공하는 블록입니다.\n\nRUN 플래그가 TRUE인 동안, 컨트롤러의 UTC 시간에서 SEC(초), MIN(분), HOUR(시), DAYM(일), MNTH(월), YEAR(연)을 개별 아날로그 출력으로 분리합니다. TNUP은 컨트롤러 가동 시간을 출력합니다.\n\n시간 기반 제어 로직(교대 근무 구분, 일일/월별 집계 등), 타임스탬프 생성, 시간 조건 분기 등에 사용됩니다.",
        "diagramDesc": "컨트롤러의 시스템 시간(UTC)을 초/분/시/일/월/년 개별 아날로그 출력으로 제공합니다."
    },
    "TANGENT": {
        "fullDesc": "TANGENT 블록은 입력값의 탄젠트를 계산하는 블록입니다.\n\nOUT = tan(IN1). 입력 IN1은 라디안 단위의 각도이며, 출력 OUT은 탄젠트 값입니다.\n\n예를 들어 IN1 = 0이면 OUT = 0, IN1 = π/4(약 0.785)이면 OUT = 1.0입니다. IN1이 π/2에 가까우면 출력이 매우 큰 값이 됩니다.\n\n삼각함수 계산이 필요한 제어 로직, 경사각 계산, 기하학적 연산 등에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1, 라디안)의 탄젠트를 계산하여 출력(OUT)합니다."
    },
    "TIMECHANGE": {
        "fullDesc": "TIMECHANGE 블록은 컨트롤러의 UTC 시간 변경을 감지하는 블록입니다.\n\n컨트롤러의 시간을 이전 값과 비교하여, 시간이 변경되면 해당 출력을 펄스로 발생시킵니다. HCHG는 시(Hour) 변경, MCHG는 분(Minute) 변경, SCHG는 초(Second) 변경을 감지합니다.\n\n시간 변경 이벤트에 따른 주기적 작업 트리거, 시간 동기화 감시, 정시 이벤트 발생 등에 사용됩니다.",
        "diagramDesc": "컨트롤러의 시간 변경을 감지하여 시(HCHG)/분(MCHG)/초(SCHG) 변경 시 펄스를 출력합니다."
    },
    "TIMEDETECT": {
        "fullDesc": "TIMEDETECT 블록은 컨트롤러의 UTC 시간에서 교대 근무 변경, 일 변경, 주 변경을 감지하는 블록입니다.\n\nSHF1, SHF2, SHF3는 3교대 근무 시간을 설정합니다. WEEK은 주간 시작 요일을 설정합니다.\n\n출력으로 DCHG(일 변경), SHFT(교대 변경), WCHG(주 변경)를 제공합니다. DIAG로 진단 정보를 확인합니다.\n\n교대 근무별 데이터 집계, 일일/주간 리셋, 근무 교대 시 로직 변경 등 시간 기반 이벤트 감지에 사용됩니다.",
        "diagramDesc": "교대 근무 변경(SHFT), 일 변경(DCHG), 주 변경(WCHG)을 감지하는 시간 검출기입니다."
    },
    "TIMEMON": {
        "fullDesc": "TIMEMON 블록은 시스템 시간 기반으로 시간 범위 플래그와 주기적 펄스를 제공하는 블록입니다.\n\nRUN 플래그가 TRUE인 동안 동작합니다. HR2/MIN2/SEC2로 설정된 종료 시간과 비교하여, 현재 시간이 지정된 범위 내에 있으면 FLG1을 TRUE로 설정합니다.\n\nSHR/SMIN/SSEC는 시작 시간, IHR/IMIN은 주기적 펄스의 간격을 설정합니다. FLG2는 주기적 펄스 출력입니다. DIAG로 진단 정보를 확인합니다.\n\n시간 범위 내에서만 동작하는 제어 로직, 정기적 샘플링 트리거, 시간대별 다른 설정값 적용 등에 사용됩니다.",
        "diagramDesc": "시스템 시간 기반으로 시간 범위 플래그(FLG1)와 주기적 펄스(FLG2)를 제공합니다."
    },
    "TRANSLATOR": {
        "fullDesc": "TRANSLATOR 블록은 미리 정의된 테이블에 따라 입력을 출력으로 변환하는 셀렉터+시퀀서 블록입니다.\n\n아날로그 입력(IN1)의 값에 따라 미리 정의된 테이블(I01~I40)에서 해당하는 출력(OUT)을 선택합니다. 테이블의 각 항목은 입력 범위와 해당 출력값을 정의합니다.\n\nDIAG로 진단 정보를 확인합니다.\n\n비선형 매핑, 룩업 테이블, 상태 코드에 따른 출력 변환, 조건별 출력 선택 등에 사용됩니다. INTERP와 달리 보간 없이 이산적(Discrete) 매핑을 수행합니다.",
        "diagramDesc": "미리 정의된 테이블에 따라 입력(IN1)을 해당하는 출력(OUT)으로 변환하는 셀렉터+시퀀서 블록입니다."
    },
    "TRANSPORT": {
        "fullDesc": "TRANSPORT 블록은 아날로그 입력을 샘플링하여 시간 지연된 값을 출력하는 전송 지연(Transport Delay) 블록입니다.\n\nTSAM은 샘플링 주기, NSAM은 저장할 샘플 수를 설정합니다. 총 지연 시간 = TSAM × NSAM입니다. INIT가 TRUE이면 버퍼를 현재 입력값으로 초기화합니다.\n\n입력(IN1)을 주기적으로 샘플링하여 내부 버퍼에 저장하고, NSAM 주기 전의 값을 OUT으로 출력합니다. DIAG로 진단 정보를 확인합니다.\n\n프로세스의 전송 지연(Dead Time) 모사, 컨베이어 벨트 지연 보상, 파이프라인 지연 모델링 등에 사용됩니다.",
        "diagramDesc": "아날로그 입력(IN1)을 샘플링하여 설정된 시간만큼 지연된 값을 출력(OUT)합니다. 전송 지연(Dead Time) 모사에 사용됩니다."
    },
    "TRNSFNDX": {
        "fullDesc": "TRNSFNDX 블록은 최대 64개의 출력 중 인덱스로 선택하여 입력값을 저장하는 블록입니다.\n\nIN2에 지정된 인덱스 번호에 해당하는 출력(O64 중 하나)에 IN1의 값을 저장합니다. NMIN은 사용할 출력의 수를 설정합니다.\n\n다중 목적지 중 하나를 인덱스로 선택하여 데이터를 전달하는 디멀티플렉서(Demultiplexer) 기능을 합니다.\n\n인덱스 기반 데이터 분배, 다중 채널 출력 선택, 순차적 데이터 저장 등에 사용됩니다.",
        "diagramDesc": "인덱스(IN2)로 최대 64개 출력 중 하나를 선택하여 입력(IN1)의 값을 저장합니다."
    },
    "TSLH": {
        "fullDesc": "TSLH 블록은 포화액(Saturated Liquid)의 온도를 엔탈피(H)로부터 계산하는 증기표 블록입니다.\n\n엔탈피(ENTHALPY)를 입력받아 해당 엔탈피에서의 포화 온도(TEMP)를 출력합니다. FLAG는 계산 유효성을 나타내며, 입력이 유효 범위를 벗어나면 오류를 표시합니다.\n\n발전소의 엔탈피 기반 온도 역산, 열역학적 상태 결정 등에 사용됩니다.",
        "diagramDesc": "엔탈피(ENTHALPY)로 포화액의 온도(TEMP)를 계산하는 증기표 블록입니다."
    },
    "TSLP": {
        "fullDesc": "TSLP 블록은 포화액(Saturated Liquid)의 포화 온도를 압력으로부터 계산하는 증기표 블록입니다.\n\n압력(PRES)을 입력받아 해당 포화 압력에서의 포화 온도(TEMP)를 출력합니다. FLAG는 계산 유효성을 나타내며, 입력이 유효 범위를 벗어나면 오류를 표시합니다.\n\n발전소의 드럼 온도 계산, 포화 조건 확인, 과열도 계산 등에 사용됩니다. PSLT(온도→압력)의 반대 기능입니다.",
        "diagramDesc": "압력(PRES)으로 포화액의 포화 온도(TEMP)를 계산하는 증기표 블록입니다."
    },
    "UNPACK16": {
        "fullDesc": "UNPACK16 블록은 패킹 포인트 레코드의 A2 필드에서 최대 16개의 디지털 값을 언패킹하여 개별 출력으로 분리하는 블록입니다.\n\nPBPT에 지정된 패킹 LP 포인트의 A2 레코드 필드에서 각 비트를 읽어 D0~D15의 개별 디지털 출력으로 분리합니다.\n\n예를 들어 패킹 값의 비트 0=1, 비트 1=0, 비트 2=1이면 D0=TRUE, D1=FALSE, D2=TRUE입니다.\n\nPLC나 외부 시스템에서 패킹 형태로 전달된 디지털 신호를 개별 디지털 포인트로 분리할 때 사용됩니다. PACK16의 역방향 기능입니다.",
        "diagramDesc": "패킹 포인트(PBPT)에서 최대 16개의 디지털 값(D0~D15)을 개별 출력으로 언패킹합니다. PACK16의 역기능입니다."
    },
    "VCLTP": {
        "fullDesc": "VCLTP 블록은 압축수(Compressed Liquid)의 비체적(Specific Volume)을 온도와 압력으로부터 계산하는 증기표 블록입니다.\n\n온도(TEMP)와 압력(PRES)을 입력받아 해당 조건에서의 압축수 비체적(VOLUME)을 출력합니다. FLAG는 계산 유효성을 나타냅니다.\n\n발전소의 급수 밀도 계산, 펌프 설계 조건 확인, 열역학적 물성치 계산 등에 사용됩니다.",
        "diagramDesc": "온도(TEMP)와 압력(PRES)으로 압축수의 비체적(VOLUME)을 계산하는 증기표 블록입니다."
    },
    "VSLT": {
        "fullDesc": "VSLT 블록은 포화액(Saturated Liquid)의 비체적(Specific Volume)을 온도로부터 계산하는 증기표 블록입니다.\n\n온도(TEMP)를 입력받아 해당 포화 온도에서의 포화액 비체적(VOLUME)을 출력합니다. FLAG는 계산 유효성을 나타냅니다.\n\n발전소의 포화 상태 물의 밀도/비체적 계산, 열역학적 물성치 산정에 사용됩니다.",
        "diagramDesc": "온도(TEMP)로 포화액의 비체적(VOLUME)을 계산하는 증기표 블록입니다."
    },
    "X3STEP": {
        "fullDesc": "X3STEP 블록은 허용 오차 내에서 디바이스를 제어하고 운전원이 튜닝할 수 있는 블록입니다.\n\nIN1과 IN2를 비교하여, 허용 오차 범위 내에서 디바이스 출력(DEVO)을 조정합니다. OUT은 아날로그 출력이며, TRIN은 트래킹 입력, TOUT은 트래킹 출력입니다.\n\nDIG1과 DIG2는 디지털 출력으로, 디바이스의 열기/닫기 또는 증가/감소 명령을 내보냅니다. DIAG로 진단 정보를 확인합니다.\n\n3위치 제어(Open/Stop/Close)가 필요한 밸브, 댐퍼, 루버 등의 디바이스를 허용 오차 내에서 자동/수동으로 제어할 때 사용됩니다.",
        "diagramDesc": "허용 오차 내에서 디바이스를 3위치(Open/Stop/Close) 제어합니다. DIG1/DIG2로 열기/닫기 명령을 출력합니다."
    }
}

def main():
    # 실행 직전에 파일 읽기
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    skipped = 0

    for symbol_name, desc_data in descriptions.items():
        if symbol_name not in data:
            print(f"WARNING: {symbol_name} not found in JSON, skipping")
            skipped += 1
            continue

        symbol = data[symbol_name]

        # fullDesc가 이미 있으면 건너뛰지 않음 (덮어쓰기)
        # 다른 에이전트가 동시에 detailFull을 추가할 수 있으므로 fullDesc/diagramDesc만 수정
        symbol['fullDesc'] = desc_data['fullDesc']
        symbol['diagramDesc'] = desc_data['diagramDesc']
        updated += 1

    # 저장
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Updated: {updated}, Skipped: {skipped}")
    print(f"Total descriptions prepared: {len(descriptions)}")

    # 검증: fullDesc가 아직 비어있는 심볼 확인
    remaining = [k for k, v in data.items() if not v.get('fullDesc', '').strip()]
    print(f"Remaining symbols without fullDesc: {len(remaining)}")
    if remaining:
        print(f"Remaining: {remaining}")

if __name__ == '__main__':
    main()
