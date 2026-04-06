"""2차 번역: 패턴 기반 + 단어 단위 영어→한글 번역"""
import json, sys, re, os

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_PATH = os.path.join(BASE_DIR, 'data', 'ovation_symbols.json')

# 단어/구문 번역 사전 (긴 것부터 매칭)
WORD_TRANS = {
    'Specific Volume': '비체적',
    'Set Point': '설정값',
    'Set point': '설정값',
    'Dead band': '데드밴드',
    'Dead Band': '데드밴드',
    'Top of Scale': '상한 스케일',
    'Bottom of Scale': '하한 스케일',
    'Top Scale': '상한 스케일',
    'Bottom Scale': '하한 스케일',
    'Tuning Diagram Number': '튜닝 다이어그램 번호',
    'Tuning Diagram number': '튜닝 다이어그램 번호',
    'Track output': '트래킹 출력',
    'Track Output': '트래킹 출력',
    'Track input': '트래킹 입력',
    'Track Input': '트래킹 입력',
    'Track rate': '트래킹 속도',
    'Track Rate': '트래킹 속도',
    'Alarm Check': '알람 검사',
    'Rate of change': '변화율',
    'Analog or digital': '아날로그 또는 디지털',
    'analog or digital': '아날로그 또는 디지털',
    'Spring return': '스프링 복귀',
    'Emergency Stop': '비상 정지',
    'Emergency stop': '비상 정지',
    'Permissive Trip': '허가 트립',
    'Open feedback': '열림 피드백',
    'Close feedback': '닫힘 피드백',
    'Run feedback': '가동 피드백',
    'Stop feedback': '정지 피드백',
    'Local Open': '로컬 열림',
    'Local Close': '로컬 닫힘',
    'Local Stop': '로컬 정지',
    'Priority Lower': '우선 하강',
    'Priority Raise': '우선 상승',
    'Lower Inhibit': '하강 금지',
    'Raise Inhibit': '상승 금지',
    'Manual Request': '수동 요청',
    'High Limit': '상한 제한',
    'Low Limit': '하한 제한',
    'High Alarm': '상한 알람',
    'Low Alarm': '하한 알람',
    'Positive rate': '양방향 변화율',
    'Negative rate': '음방향 변화율',
    'Saturated Liquid': '포화액',
    'Saturation Temperature': '포화 온도',
    'Saturation Pressure': '포화 압력',
    'Differential pressure': '차압',
    'Flow Transmitter': '유량 트랜스미터',
    'Delta Pressure': '차압',
    'Output values': '출력값',
    'Device Number': '디바이스 번호',
    'Programmable key': '프로그래머블 키',
    'Bias bar': '바이어스 바',
    'Process variable': '프로세스 변수',
    'Down stream': '하류',
    'control output': '제어 출력',
    'Valid output': '유효 출력',
    'Count Complete': '카운트 완료',
    'Start Input': '시작 입력',
    'Enable Input': '활성화 입력',
    'Feedforward': '피드포워드',
    'Feed Forward': '피드포워드',
    'Lead time': '리드 시정수',
    'Lag time': '래그 시정수',
    'time constant': '시정수',
    'Smith Predictor': 'Smith Predictor',
    'Input': '입력',
    'Output': '출력',
    'Analog': '아날로그',
    'Digital': '디지털',
    'analog': '아날로그',
    'digital': '디지털',
    'Gain': '이득',
    'Bias': '바이어스',
    'Scale': '스케일',
    'Alarm': '알람',
    'alarm': '알람',
    'Monitor': '감시',
    'monitor': '감시',
    'Status': '상태',
    'status': '상태',
    'Control': '제어',
    'control': '제어',
    'Reset': '리셋',
    'reset': '리셋',
    'Enable': '활성화',
    'enable': '활성화',
    'Track': '트래킹',
    'Feedback': '피드백',
    'feedback': '피드백',
    'Demand': '요구값',
    'Deviation': '편차',
    'deviation': '편차',
    'Setpoint': '설정값',
    'setpoint': '설정값',
    'Variable': '변수',
    'variable': '변수',
    'Maximum': '최대',
    'maximum': '최대',
    'Minimum': '최소',
    'minimum': '최소',
    'Number': '수',
    'number': '수',
    'Value': '값',
    'value': '값',
    'Point': '포인트',
    'point': '포인트',
    'Limit': '제한',
    'limit': '제한',
    'Rate': '변화율',
    'rate': '변화율',
    'Time': '시간',
    'time': '시간',
    'Count': '카운트',
    'count': '카운트',
    'Flag': '플래그',
    'flag': '플래그',
    'Error': '에러',
    'error': '에러',
    'Quality': '품질',
    'quality': '품질',
    'Constant': '상수',
    'constant': '상수',
    'Factor': '팩터',
    'factor': '팩터',
    'Type': '유형',
    'type': '유형',
    'Mode': '모드',
    'mode': '모드',
    'Manual': '수동',
    'manual': '수동',
    'Auto': '자동',
    'auto': '자동',
    'Open': '열림',
    'Close': '닫힘',
    'Stop': '정지',
    'Start': '시작',
    'Run': '가동',
    'Fail': '고장',
    'fail': '고장',
    'Trip': '트립',
    'trip': '트립',
    'Override': '오버라이드',
    'Interlock': '인터락',
    'Select': '선택',
    'select': '선택',
    'Selected': '선택된',
    'selected': '선택된',
    'Direction': '방향',
    'direction': '방향',
    'Sample': '샘플',
    'sample': '샘플',
    'Smoothing': '평활',
    'smoothing': '평활',
    'Average': '평균',
    'Calculation': '연산',
    'Expression': '수식',
    'Coefficient': '계수',
    'coefficient': '계수',
    'Polynomial': '다항식',
    'Interpolation': '보간',
    'Interval': '구간',
    'Argument': '인수',
    'Recorder': '레코더',
    'Pack': '패킹',
    'Packed': '패킹된',
    'packed': '패킹된',
    'Unpack': '언패킹',
    'Pressure': '압력',
    'pressure': '압력',
    'Temperature': '온도',
    'temperature': '온도',
    'Enthalpy': '엔탈피',
    'enthalpy': '엔탈피',
    'Entropy': '엔트로피',
    'entropy': '엔트로피',
    'Volume': '체적',
    'volume': '체적',
    'Saturated': '포화',
    'Steam': '증기',
    'Flow': '유량',
    'Gravity': '비중',
    'Property': '물성',
    'Query': '조회',
    'Unit': '단위',
    'unit': '단위',
    'Step': '스텝',
    'step': '스텝',
    'Device': '디바이스',
    'device': '디바이스',
    'Master': '마스터',
    'Sequence': '시퀀스',
    'Drum': '드럼',
    'Card': '카드',
    'card': '카드',
    'Primary': '주',
    'Secondary': '보조',
    'Bit': '비트',
    'bit': '비트',
    'Position': '위치',
    'position': '위치',
    'Digit': '자릿수',
    'Word': '워드',
    'word': '워드',
    'Fuel': '연료',
    'Initial': '초기',
    'initial': '초기',
    'Outer': '외측',
    'Inner': '내측',
    'Shift': '시프트',
    'Logic': '로직',
    'logic': '로직',
    'Trend': '트렌드',
    'Hardware': '하드웨어',
    'Software': '소프트웨어',
    'Configuration': '설정',
    'Condition': '조건',
    'per second': '/초',
    'units': '단위',
    'seconds': '초',
    'the': '',
    'of': '',
    'on': '',
    'for': '',
    'in': '',
    'and': '및',
    'or': '또는',
    'with': '',
    'from': '',
    'to': '',
    'is': '',
    'a ': '',
    'an ': '',
    'if ': '',
    'Possible': '가능한',
    'Negative': '음',
    'Positive': '양',
    'Complete': '완료',
    'Length': '길이',
}


def translate_text(text):
    """영어 텍스트를 한글로 번역"""
    if not text:
        return text
    # 이미 한글 포함이면 건너뜀
    if any('\uac00' <= c <= '\ud7a3' for c in text):
        return text

    result = text
    # 긴 구문부터 매칭
    for eng, kor in sorted(WORD_TRANS.items(), key=lambda x: -len(x[0])):
        if eng in result:
            result = result.replace(eng, kor)

    # 잔여 공백 정리
    result = re.sub(r'\s+', ' ', result).strip()
    result = result.strip(' ,.:;')
    return result


def main():
    with open(SYMBOLS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    port_count = 0
    for sym_id, sym in data.items():
        for p in sym.get('ports', []):
            desc = p.get('description', '')
            if not desc:
                continue
            if any('\uac00' <= c <= '\ud7a3' for c in desc):
                continue
            new_desc = translate_text(desc)
            if new_desc != desc:
                p['description'] = new_desc
                port_count += 1

    # detailFull 재생성 (포트 테이블 부분 업데이트를 위해)
    # 기존 detailFull에서 포트 테이블 부분만 교체
    detail_count = 0
    for sym_id, sym in data.items():
        df = sym.get('detailFull', '')
        if not df:
            continue
        new_df = df
        for eng, kor in sorted(WORD_TRANS.items(), key=lambda x: -len(x[0])):
            # SVG 내부는 건드리지 않기 위해 SVG 밖의 텍스트만 치환
            # 간단하게 전체 치환 (SVG 내부엔 영어가 거의 없음)
            if eng in new_df and len(eng) > 3:  # 짧은 단어는 위험
                new_df = new_df.replace(eng, kor)
        if new_df != df:
            sym['detailFull'] = new_df
            detail_count += 1

    with open(SYMBOLS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'2차 포트 번역: {port_count}개')
    print(f'detailFull 번역: {detail_count}개')

    # 잔여 확인
    remaining = 0
    for sym_id, sym in data.items():
        for p in sym.get('ports', []):
            desc = p.get('description', '')
            if desc and not any('\uac00' <= c <= '\ud7a3' for c in desc):
                remaining += 1
                if remaining <= 5:
                    print(f'  미번역: {sym_id}.{p["name"]}: {desc}')
    print(f'잔여 미번역: {remaining}개')


if __name__ == '__main__':
    main()
