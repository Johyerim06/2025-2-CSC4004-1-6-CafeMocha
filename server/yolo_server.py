from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from ultralytics import YOLO
import io
from PIL import Image
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # CORS 허용 (Next.js에서 요청 가능하도록)

# 모델 파일 경로
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'best.pt')

# 모델 로드 (서버 시작 시 한 번만)
print(f"모델 로딩 중: {MODEL_PATH}")
model = None

def load_model():
    global model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {MODEL_PATH}")
        model = YOLO(MODEL_PATH)
        print("모델 로딩 완료!")
    return model

# gunicorn 사용 시 모델 미리 로드 (모듈 import 시 실행)
# 직접 실행 시에도 if __name__ == '__main__'에서 로드됨
try:
    load_model()
except Exception as e:
    print(f"초기 모델 로딩 실패 (첫 요청 시 재시도): {str(e)}")

@app.route('/api/yolo/detect', methods=['POST'])
def detect_objects():
    try:
        # 이미지 파일 받기
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'message': '이미지 파일이 제공되지 않았습니다.'
            }), 400
        
        image_file = request.files['image']
        
        # 이미지 읽기
        image_bytes = image_file.read()
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # RGB로 변환 (RGBA나 다른 형식일 경우)
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # PIL Image를 numpy array로 변환 (팀원 코드 스타일에 맞춤)
        image = np.array(pil_image)
        
        # 모델 로드
        yolo_model = load_model()
        
        # YOLO 추론 실행 (팀원 코드 스타일: model.predict 사용)
        results = yolo_model.predict(
            source=image,
            conf=0.18,          # 신뢰도 임계값
            iou=0.65,           # IoU 임계값
            agnostic_nms=True,  # 클래스 무관 NMS
            augment=True,       # 테스트 시간 증강
            verbose=False       # 출력 최소화
        )
        
        # 결과 파싱 (팀원 코드 스타일: results[0].boxes 사용)
        detected_objects = []
        
        # 탐지된 박스 개수 (팀원 코드 스타일)
        count = len(results[0].boxes)
        
        # 각 박스 정보 추출
        for box in results[0].boxes:
            # 바운딩 박스 좌표
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            
            # 신뢰도
            confidence = float(box.conf[0])
            
            # 클래스 레이블
            class_id = int(box.cls[0])
            label = results[0].names[class_id] if hasattr(results[0], 'names') else f'class_{class_id}'
            
            detected_objects.append({
                'label': label,
                'confidence': confidence,
                'bbox': [x1, y1, x2, y2]
            })
        
        return jsonify({
            'success': True,
            'count': count,
            'objects': detected_objects
        })
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'객체 탐지 중 오류가 발생했습니다: {str(e)}',
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None
    })

if __name__ == '__main__':
    # 모델 미리 로드
    try:
        load_model()
        # 배포 환경에서는 환경 변수에서 포트 읽기 (Railway, Render 등)
        port = int(os.environ.get('PORT', 8000))
        # 배포 환경에서는 debug=False
        debug = os.environ.get('DEBUG', 'False').lower() == 'true'
        print(f"서버 시작: http://0.0.0.0:{port}")
        app.run(host='0.0.0.0', port=port, debug=debug)
    except Exception as e:
        print(f"서버 시작 실패: {str(e)}")
        print(f"모델 경로 확인: {MODEL_PATH}")
        print(f"파일 존재 여부: {os.path.exists(MODEL_PATH)}")

