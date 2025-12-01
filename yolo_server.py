import os
import subprocess

# ============================
# 0. 의존성 자동 설치
# ============================
def ensure_dependencies():
    # 1) torch 설치
    try:
        import torch
    except ImportError:
        print("Torch 설치 시작...")
        subprocess.run([
            "pip", "install", "torch",
            "--index-url", "https://download.pytorch.org/whl/cpu"
        ], check=True)
        print("Torch 설치 완료")

    # 2) ultralytics 설치
    try:
        from ultralytics import YOLO
    except ImportError:
        print("Ultralytics 설치 시작...")
        subprocess.run(["pip", "install", "ultralytics"], check=True)
        print("Ultralytics 설치 완료")


ensure_dependencies()

# ============================
# 1. YOLO 서버 시작
# ============================
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import numpy as np
import cv2
import io
import requests

app = Flask(__name__)
CORS(app)

# ============================
# 2. 모델 다운로드
# ============================

MODEL_URL = "https://drive.google.com/uc?export=download&id=179RY3nUVnF4zBiGZRgEIP09WQM3mImMF"
MODEL_PATH = "best.pt"

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("모델 다운로드 중...")
        r = requests.get(MODEL_URL)
        with open(MODEL_PATH, "wb") as f:
            f.write(r.content)
        print("모델 다운로드 완료!")

download_model()

# 모델 로드
model = YOLO(MODEL_PATH)
print("모델 로딩 완료!")

# ============================
# 3. 팀원 코드 기능 포함 API
# ============================

@app.route("/api/yolo/detect", methods=["POST"])
def detect():
    """
    - 이미지에서 객체 탐지
    - count 반환
    - bbox 그린 이미지 저장 후 URL 제공
    """

    if "image" not in request.files:
        return jsonify({"success": False, "message": "이미지 없음"}), 400

    image_file = request.files["image"]
    pil = Image.open(io.BytesIO(image_file.read())).convert("RGB")

    # PIL → numpy → OpenCV 변환
    img = np.array(pil)
    img_cv = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # YOLO 실행 (팀원 코드의 설정 그대로 적용)
    results = model.predict(
        source=img_cv,
        conf=0.13,
        iou=0.4,
        agnostic_nms=True,
        augment=True,
        verbose=False
    )

    boxes = results[0].boxes
    count = len(boxes)

    # 박스 그려진 이미지
    res_img = results[0].plot(line_width=3)

    # 좌상단 count 텍스트 박스 (팀원 코드 동일)
    cv2.rectangle(res_img, (10, 10), (300, 80), (0, 0, 255), -1)
    cv2.putText(
        res_img,
        f"Count: {count}",
        (20, 65),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.8,
        (255, 255, 255),
        3,
        cv2.LINE_AA
    )

    # 파일 저장
    OUTPUT_PATH = "result.jpg"
    cv2.imwrite(OUTPUT_PATH, res_img)

    # 응답
    return jsonify({
        "success": True,
        "count": count,
        "image_url": "/api/yolo/result"
    })


@app.route("/api/yolo/result", methods=["GET"])
def download_result():
    """박스 그려진 result.jpg 다운로드"""
    if not os.path.exists("result.jpg"):
        return jsonify({"success": False, "message": "결과 이미지 없음"}), 404

    return send_file("result.jpg", mimetype="image/jpeg")


@app.route("/health")
def health():
    return {"status": "ok", "model": os.path.exists(MODEL_PATH)}


# ============================
# 4. 서버 시작
# ============================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
