"""
SentinelVision AI - Model Evaluation & Validation Suite
Computes mAP@0.5, mAP@0.5:0.95, Precision, Recall, and Confusion Matrices.
"""

import argparse
import json
import os
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Evaluate SentinelVision AI Model")
    parser.add_argument(
        "--weights",
        type=str,
        default="weights/best.pt",
        help="Path to trained model weights (.pt)"
    )
    parser.add_argument(
        "--data",
        type=str,
        default="configs/data.yaml",
        help="Path to data configuration YAML file"
    )
    parser.add_argument(
        "--split",
        type=str,
        default="val",
        choices=["val", "test"],
        help="Dataset split to evaluate on ('val' or 'test')"
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=16,
        help="Batch size"
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Image size"
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="",
        help="Path to export evaluation metrics as JSON"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    print("=" * 60)
    print("SentinelVision AI - Model Evaluation Suite")
    print(f"Weights     : {args.weights}")
    print(f"Data config : {args.data}")
    print(f"Split       : {args.split}")
    print("=" * 60)

    weights_path = Path(args.weights).resolve()
    if not weights_path.exists():
        print(f"[ERROR] Model weights not found: {weights_path}")
        sys.exit(1)

    data_path = Path(args.data).resolve()
    if not data_path.exists():
        print(f"[ERROR] Data config not found: {data_path}")
        sys.exit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics package not installed.")
        sys.exit(1)

    print(f"[INFO] Loading model: {weights_path}...")
    model = YOLO(str(weights_path))

    print(f"[INFO] Running validation on '{args.split}' split...")
    metrics = model.val(
        data=str(data_path),
        split=args.split,
        batch=args.batch,
        imgsz=args.imgsz,
        plots=True,
        save_json=True
    )

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    try:
        mp = float(metrics.box.mp)
        mr = float(metrics.box.mr)
        map50 = float(metrics.box.map50)
        map50_95 = float(metrics.box.map)

        print(f"Mean Precision (P)    : {mp:.4f} ({mp*100:.1f}%)")
        print(f"Mean Recall (R)       : {mr:.4f} ({mr*100:.1f}%)")
        print(f"mAP @ 0.50            : {map50:.4f} ({map50*100:.1f}%)")
        print(f"mAP @ 0.50:0.95       : {map50_95:.4f} ({map50_95*100:.1f}%)")

        # Per-class metrics
        class_names = model.names
        print("\nPer-Class Performance:")
        print(f"{'Class':<20} {'P':<10} {'R':<10} {'mAP50':<10} {'mAP50-95':<10}")
        print("-" * 60)
        for i, name in class_names.items():
            if i < len(metrics.box.p):
                cp = float(metrics.box.p[i])
                cr = float(metrics.box.r[i])
                c_map50 = float(metrics.box.all_ap[i, 0]) if hasattr(metrics.box, 'all_ap') else 0.0
                c_map = float(metrics.box.ap[i]) if hasattr(metrics.box, 'ap') else 0.0
                print(f"{name:<20} {cp:<10.3f} {cr:<10.3f} {c_map50:<10.3f} {c_map:<10.3f}")

        if args.output_json:
            export_data = {
                "weights": str(weights_path),
                "split": args.split,
                "overall": {
                    "precision": mp,
                    "recall": mr,
                    "map50": map50,
                    "map50_95": map50_95
                },
                "per_class": {
                    name: {
                        "precision": float(metrics.box.p[i]) if i < len(metrics.box.p) else 0.0,
                        "recall": float(metrics.box.r[i]) if i < len(metrics.box.r) else 0.0
                    }
                    for i, name in class_names.items()
                }
            }
            with open(args.output_json, "w") as f:
                json.dump(export_data, f, indent=2)
            print(f"\n[INFO] Exported metrics JSON to: {args.output_json}")

    except Exception as e:
        print(f"[NOTE] Completed validation. Metrics output: {metrics}")


if __name__ == "__main__":
    main()
