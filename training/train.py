"""
SentinelVision AI - Custom Dataset Training Pipeline
Trains a multi-threat detection model (person, vehicle, fire, smoke, weapons, etc.)
using Ultralytics YOLO architecture.
"""

import argparse
import os
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Train SentinelVision AI Threat Detection Model")
    parser.add_argument(
        "--data",
        type=str,
        default="configs/data.yaml",
        help="Path to data configuration YAML file"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8s.pt",
        help="Base model architecture (e.g., yolov8n.pt, yolov8s.pt, yolov8m.pt)"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=16,
        help="Batch size (-1 for AutoBatch)"
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Image resolution (default 640)"
    )
    parser.add_argument(
        "--device",
        type=str,
        default="",
        help="Device to run on (e.g., '0' for CUDA GPU, 'cpu', or '' for auto-detect)"
    )
    parser.add_argument(
        "--project",
        type=str,
        default="runs/train",
        help="Directory to save training runs"
    )
    parser.add_argument(
        "--name",
        type=str,
        default="sentinel_threat_v1",
        help="Experiment run name"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of DataLoader worker threads"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    print("=" * 60)
    print("SentinelVision AI - Model Training Engine")
    print(f"Data config : {args.data}")
    print(f"Base model  : {args.model}")
    print(f"Epochs      : {args.epochs}")
    print(f"Batch size  : {args.batch}")
    print(f"Image size  : {args.imgsz}")
    print(f"Run name    : {args.name}")
    print("=" * 60)

    data_path = Path(args.data).resolve()
    if not data_path.exists():
        print(f"[ERROR] Data config file not found: {data_path}")
        sys.exit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics package not installed. Run 'pip install ultralytics'")
        sys.exit(1)

    print(f"[INFO] Initializing base model: {args.model}...")
    model = YOLO(args.model)

    # Train
    print("[INFO] Initiating training process...")
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device if args.device else None,
        project=args.project,
        name=args.name,
        workers=args.workers,
        pretrained=True,
        verbose=True,
        save=True,
        plots=True
    )

    best_weight = Path(args.project) / args.name / "weights" / "best.pt"
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    if best_weight.exists():
        print(f"[SUCCESS] Best weights saved at: {best_weight}")
        print(f"To deploy to SentinelVision AI, copy to 'weights/best_threat.pt':")
        print(f"  cp {best_weight} weights/best_threat.pt")
    else:
        print(f"[INFO] Training artifacts saved under: {Path(args.project) / args.name}")
    print("=" * 60)


if __name__ == "__main__":
    main()
