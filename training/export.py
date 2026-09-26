"""
SentinelVision AI - Model Export & Optimization Engine
Exports trained PyTorch (.pt) weights to ONNX, TensorRT, or TorchScript
for high-throughput, low-latency edge surveillance inference.
"""

import argparse
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Export SentinelVision AI Model")
    parser.add_argument(
        "--weights",
        type=str,
        default="weights/best.pt",
        help="Path to PyTorch weights (.pt)"
    )
    parser.add_argument(
        "--format",
        type=str,
        default="onnx",
        choices=["onnx", "engine", "torchscript", "openvino"],
        help="Target export format ('onnx', 'engine' for TensorRT, 'torchscript', 'openvino')"
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Inference image resolution"
    )
    parser.add_argument(
        "--half",
        action="store_true",
        help="Export in FP16 half-precision"
    )
    parser.add_argument(
        "--simplify",
        action="store_true",
        default=True,
        help="Simplify ONNX graph via onnxsim"
    )
    parser.add_argument(
        "--opset",
        type=int,
        default=12,
        help="ONNX opset version"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    print("=" * 60)
    print("SentinelVision AI - Model Export Pipeline")
    print(f"Weights : {args.weights}")
    print(f"Format  : {args.format}")
    print(f"FP16    : {args.half}")
    print("=" * 60)

    weights_path = Path(args.weights).resolve()
    if not weights_path.exists():
        print(f"[ERROR] Weights file not found: {weights_path}")
        sys.exit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics package not installed.")
        sys.exit(1)

    print(f"[INFO] Loading model: {weights_path}...")
    model = YOLO(str(weights_path))

    print(f"[INFO] Exporting to format: {args.format}...")
    try:
        export_path = model.export(
            format=args.format,
            imgsz=args.imgsz,
            half=args.half,
            simplify=args.simplify,
            opset=args.opset
        )
        print("\n" + "=" * 60)
        print("[SUCCESS] Export completed successfully!")
        print(f"Target artifact: {export_path}")
        print("=" * 60)
    except Exception as e:
        print(f"[ERROR] Export failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
