"""
predict.py — Diabetic Retinopathy prediction module.

Usage (standalone):
    python predict.py path/to/retinal_image.jpg

Expects:
    model/dr_model.h5  — pretrained Keras model with 5-class softmax output
                         Input shape: (None, 224, 224, 3), values in [0, 1]
"""

import os
import sys
import numpy as np
from PIL import Image
import tensorflow as tf

# ─── Configuration ─────────────────────────────────────────────────────────────

# Path to the pretrained Keras model (relative to this file)
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model", "dr_model.h5")

# Target input size expected by the model
IMAGE_SIZE = (224, 224)

# DR stage labels (model output index → human-readable name)
DR_LABELS: dict[int, str] = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}

# ─── Model cache ───────────────────────────────────────────────────────────────

_model: tf.keras.Model | None = None


def load_model() -> tf.keras.Model:
    """
    Load the pretrained model from disk once and cache it in memory.
    Raises FileNotFoundError if model/dr_model.h5 does not exist.
    """
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Pretrained model not found at: {MODEL_PATH}\n"
                "Place your trained dr_model.h5 file inside the 'model/' directory."
            )
        print(f"[INFO] Loading model from {MODEL_PATH} …", flush=True)
        _model = tf.keras.models.load_model(MODEL_PATH)
        print("[INFO] Model loaded successfully.", flush=True)
    return _model


# ─── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess_image(image_source) -> np.ndarray:
    """
    Load a retinal fundus image and prepare it for model inference.

    Args:
        image_source: File path (str) or file-like object (BytesIO, etc.)

    Returns:
        NumPy array of shape (1, 224, 224, 3) with float32 values in [0, 1].

    Steps:
        1. Open and convert to RGB  (removes alpha channel / handles grayscale)
        2. Resize to 224 × 224 using high-quality Lanczos resampling
        3. Normalize pixel values from [0, 255] to [0.0, 1.0]
        4. Add batch dimension
    """
    img = Image.open(image_source).convert("RGB")
    img = img.resize(IMAGE_SIZE, Image.LANCZOS)
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)  # → (1, 224, 224, 3)
    return img_array


# ─── Prediction ────────────────────────────────────────────────────────────────

def predict_dr(image_source) -> dict:
    """
    Predict the Diabetic Retinopathy stage from a retinal fundus image.

    Args:
        image_source: File path (str) or file-like object (BytesIO, etc.)

    Returns:
        {
            "prediction":        "Severe NPDR",   # human-readable label
            "stage":             3,               # integer 0-4
            "confidence":        0.87,            # model confidence for top class
            "all_probabilities": {               # per-class softmax scores
                "No DR":           0.02,
                "Mild NPDR":       0.04,
                "Moderate NPDR":   0.05,
                "Severe NPDR":     0.87,
                "Proliferative DR":0.02,
            }
        }

    Raises:
        FileNotFoundError: if model/dr_model.h5 is missing.
        Exception: on image decode errors or inference failures.
    """
    model = load_model()
    img_array = preprocess_image(image_source)

    # Run inference (suppress verbose TF output)
    raw_output = model.predict(img_array, verbose=0)

    # raw_output shape: (1, 5) — 5-class softmax probabilities
    probabilities: np.ndarray = raw_output[0]

    predicted_stage = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_stage])

    return {
        "prediction":  DR_LABELS[predicted_stage],
        "stage":       predicted_stage,
        "confidence":  round(confidence, 4),
        "all_probabilities": {
            DR_LABELS[i]: round(float(p), 4)
            for i, p in enumerate(probabilities)
        },
    }


# ─── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: image not found at '{image_path}'")
        sys.exit(1)

    try:
        result = predict_dr(image_path)
        print(json.dumps(result, indent=2))
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        sys.exit(1)
