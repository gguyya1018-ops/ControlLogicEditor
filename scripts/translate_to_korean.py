"""영어 포트 설명과 detailFull 내 영어 텍스트를 한글로 번역"""
import json, sys, os

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_PATH = os.path.join(BASE_DIR, 'data', 'ovation_symbols.json')

TRANS = {
    # Common
    'Tuning Diagram number': '튜닝 다이어그램 번호',
    'Analog input variable': '아날로그 입력 변수',
    'Analog output variable': '아날로그 출력 변수',
    'Analog input 1': '아날로그 입력 1',
    'Analog input 2': '아날로그 입력 2',
    'Analog input 3': '아날로그 입력 3',
    'Analog input 4': '아날로그 입력 4',
    'Analog Input': '아날로그 입력',
    'Analog input': '아날로그 입력',
    'Analog Output': '아날로그 출력',
    'Analog output': '아날로그 출력',
    'Digital input': '디지털 입력',
    'Digital Input': '디지털 입력',
    'Digital output': '디지털 출력',
    'Digital Output': '디지털 출력',
    'Digital Output1': '디지털 출력1',
    'Digital Output2': '디지털 출력2',
    'Track output value and status output signals': '트래킹 출력값 및 상태 출력 신호',
    'Track output value mode and status signals': '트래킹 출력값 모드 및 상태 신호',
    'Track output value mode and status signals for Input 1 variable': '입력1 변수의 트래킹 출력값 모드 및 상태 신호',
    'Track output value mode and status signals for Input 2 variable': '입력2 변수의 트래킹 출력값 모드 및 상태 신호',
    'Track output value mode and status signals for Input 3 variable': '입력3 변수의 트래킹 출력값 모드 및 상태 신호',
    'Track output value mode and status signals for Input 4 variable': '입력4 변수의 트래킹 출력값 모드 및 상태 신호',
    'Track output value': '트래킹 출력값',
    'Track Input': '트래킹 입력',
    'Track input': '트래킹 입력',
    'Track rate': '트래킹 속도',
    'Mode and Status output signals': '모드 및 상태 출력 신호',
    'Error flag output': '에러 플래그 출력',
    'Error flag': '에러 플래그',
    'Valid output flag': '유효 출력 플래그',
    'Enable Calculations': '연산 활성화',
    'Enable input': '활성화 입력',
    'Enable Input Digital': '활성화 입력 디지털',

    # Gain/Bias/Scale
    'Gain on input variable': '입력 변수 이득',
    'Gain on the input': '입력 이득',
    'Gain on input 1': '입력1 이득',
    'Gain on input 2': '입력2 이득',
    'Gain on input 3': '입력3 이득',
    'Gain on input 4': '입력4 이득',
    'Gain on Input 1': '입력1 이득',
    'Gain on Input 2': '입력2 이득',
    'Gain on Input 3': '입력3 이득',
    'Gain on Input 4': '입력4 이득',
    'Gain on input': '입력 이득',
    'Bias on input variable': '입력 변수 바이어스',
    'Bias on input 1': '입력1 바이어스',
    'Bias on input 2': '입력2 바이어스',
    'Bias on input2': '입력2 바이어스',
    'Bias on input 3': '입력3 바이어스',
    'Bias on input 4': '입력4 바이어스',
    'Bias on Input 1': '입력1 바이어스',
    'Bias on Input 2': '입력2 바이어스',
    'Bias on Input 3': '입력3 바이어스',
    'Bias on Input 4': '입력4 바이어스',
    'Bias on input': '입력 바이어스',
    'Bias on the input': '입력 바이어스',
    'Maximum value of the output point': '출력 포인트 최대값',
    'Minimum value of the output point': '출력 포인트 최소값',
    'Maximum value of output': '출력 최대값',
    'Minimum value of output': '출력 최소값',
    'Top scale': '상한 스케일',
    'Bottom scale': '하한 스케일',

    # Steam
    'Temperature input': '온도 입력',
    'Pressure input': '압력 입력',
    'Enthalpy output': '엔탈피 출력',
    'Enthalpy input': '엔탈피 입력',
    'Temperature output': '온도 출력',
    'Pressure output': '압력 출력',
    'Specific Volume output': '비체적 출력',
    'Entropy output': '엔트로피 출력',
    'Enthalpy of Saturated Liquid output': '포화액 엔탈피 출력',
    'Entropy of Saturated Liquid output': '포화액 엔트로피 출력',
    'Specific Volume of Saturated Liquid output': '포화액 비체적 출력',
    'Pressure of Saturated Liquid output': '포화액 압력 출력',
    'Saturation Temperature output': '포화 온도 출력',
    'Saturation Pressure output': '포화 압력 출력',
    'Differential pressure analog input': '차압 아날로그 입력',
    'Analog Specific Volume Input': '아날로그 비체적 입력',
    'Analog Flow Transmitter Delta Pressure Input': '유량 트랜스미터 차압 입력',

    # Monitor
    'Set point for the high signal monitor trip point': '상한 감시 설정값',
    'Set point for the low signal monitor trip point': '하한 감시 설정값',
    'Dead band for the high monitor': '상한 감시 데드밴드',
    'Dead band for the low monitor': '하한 감시 데드밴드',
    'Dead band': '데드밴드',
    'High Alarm monitor value': '상한 알람 감시값',
    'Low Alarm monitor value': '하한 알람 감시값',
    'Alarm monitor value': '알람 감시값',
    'Rate of change limit in units per second': '초당 변화율 제한값 (단위/초)',
    'Positive rate of change alarm set point': '양방향 변화율 알람 설정값',
    'Positive rate dead band': '양방향 변화율 데드밴드',
    'Negative rate of change alarm set point': '음방향 변화율 알람 설정값',
    'Negative rate dead band': '음방향 변화율 데드밴드',

    # Device
    'Local Open Logic': '로컬 열림 로직',
    'Local Close Logic': '로컬 닫힘 로직',
    'Local Stop Logic': '로컬 정지 로직',
    'Start Device': '디바이스 시작',
    'Start Input Digital': '시작 입력 디지털',
    'Count Complete Output': '카운트 완료 출력',
    'Feedforward Input': '피드포워드 입력',
    'Feedforward Bias output': '피드포워드 바이어스 출력',
    'Down stream PID control output': '하류 PID 제어 출력',
    'Process variable analog input': '프로세스 변수 아날로그 입력',
    'Analog/Digital input': '아날로그/디지털 입력',

    # MAMODE
    'Priority Lower input': '우선 하강 입력',
    'Priority Raise input': '우선 상승 입력',
    'Lower Inhibit input': '하강 금지 입력',
    'Raise Inhibit input': '상승 금지 입력',
    'Manual Request input': '수동 요청 입력',
    'Setpoint Track output': '설정값 트래킹 출력',
    'Analog bias bar variable output': '아날로그 바이어스 바 변수 출력',

    # Sequencer/Drum
    'Number of Steps': '스텝 수',
    'Maximum number of steps': '최대 스텝 수',
    'Number of inputs': '입력 수',
    'Possible selected output value': '선택 가능 출력값',
    'Analog input value': '아날로그 입력값',
    'Analog output value': '아날로그 출력값',
    'Percent change of output in first four seconds': '처음 4초간 출력 변화율(%)',
    'Output values for Step': '스텝 출력값',

    # Polynomial
    'Zero coefficient of the polynomial equation': '다항식 0차 계수',
    'First coefficient of the polynomial equation': '다항식 1차 계수',
    'Second coefficient of the polynomial equation': '다항식 2차 계수',
    'Third coefficient of the polynomial equation': '다항식 3차 계수',
    'Fourth coefficient of the polynomial equation': '다항식 4차 계수',
    'Fifth coefficient of the polynomial equation': '다항식 5차 계수',

    # DRPI
    'Maximum number of steps per rod': '봉당 최대 스텝 수',
    'Maximum Steps for Rapid Refuel': '급속 재장전 최대 스텝',
    'Number of Steps Between Coils': '코일 간 스텝 수',

    # Misc
    'Reset count': '리셋 카운트',
    'High Limit Reached': '상한 도달',
    'Low Limit Reached': '하한 도달',
    'LC Field': 'LC 필드',
    'Device Number for Step': '스텝의 디바이스 번호',
    'Smoothing constant': '평활 상수',
    'Number of samples': '샘플 수',
    'Sample time': '샘플 시간',
    'Initial value': '초기값',
    'Time base': '시간 기준',
    'Target count': '목표 카운트',
    'Action type': '동작 타입',
    'Control word': '제어 워드',
    'Card number': '카드 번호',
    'Card type': '카드 타입',
    'Primary status': '주 상태',
    'Secondary status': '보조 상태',
    'Input variable': '입력 변수',
    'Output variable': '출력 변수',
    'Alarm input': '알람 입력',
    'Quality check type': '품질 검사 타입',
    'Hardware point': '하드웨어 포인트',
    'Fail input': '고장 입력',
    'Scale factor': '스케일 팩터',
    'Trend point': '트렌드 포인트',
    'Recorder card': '레코더 카드',
    'Value to assign': '할당할 값',
    'Pack word': '패킹 워드',
    'Bit position': '비트 위치',
    'Number of digits': '자릿수',
}

with open(SYMBOLS_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. 포트 description 번역
port_count = 0
for sym_id, sym in data.items():
    for p in sym.get('ports', []):
        desc = p.get('description', '')
        if not desc:
            continue
        # 한글이 이미 포함되어 있으면 건너뜀
        has_korean = any('\uac00' <= c <= '\ud7a3' for c in desc)
        if has_korean:
            continue

        # 정확 매칭
        if desc in TRANS:
            p['description'] = TRANS[desc]
            port_count += 1
            continue

        # 부분 매칭 (긴 것부터)
        translated = desc
        for eng, kor in sorted(TRANS.items(), key=lambda x: -len(x[0])):
            if eng in translated:
                translated = translated.replace(eng, kor)
        if translated != desc:
            p['description'] = translated
            port_count += 1

# 2. detailFull 내 영어도 번역
detail_count = 0
for sym_id, sym in data.items():
    df = sym.get('detailFull', '')
    if not df:
        continue
    new_df = df
    for eng, kor in sorted(TRANS.items(), key=lambda x: -len(x[0])):
        if eng in new_df:
            new_df = new_df.replace(eng, kor)
    if new_df != df:
        sym['detailFull'] = new_df
        detail_count += 1

with open(SYMBOLS_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'포트 description 번역: {port_count}개')
print(f'detailFull 내 번역: {detail_count}개 심볼')

# 아직 영어만 남은 포트 확인
remaining = 0
for sym_id, sym in data.items():
    for p in sym.get('ports', []):
        desc = p.get('description', '')
        if desc and not any('\uac00' <= c <= '\ud7a3' for c in desc):
            if remaining < 20:
                print(f'  미번역: {sym_id}.{p["name"]}: {desc}')
            remaining += 1
print(f'미번역 포트: {remaining}개')
