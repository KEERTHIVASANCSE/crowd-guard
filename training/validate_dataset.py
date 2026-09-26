import os
from pathlib import Path

CLASSES = ["person", "car", "smoke", "fire", "gun", "knife", "grenade", "explosion", "fight", "fall"]

def validate_dataset():
    """
    Validates YOLO annotations:
    1. Every label file has a matching image.
    2. Bounding boxes are normalized within [0.0, 1.0].
    3. Class IDs are within [0, 9].
    4. Computes class distribution summary.
    """
    base_dir = Path(__file__).resolve().parent.parent / "dataset"
    splits = ["train", "val", "test"]
    class_counts = {c: 0 for c in CLASSES}
    total_annotations = 0
    errors = []

    print("=== Validating SentinelVision Multi-Threat Dataset ===")

    for split in splits:
        img_dir = base_dir / "images" / split
        lbl_dir = base_dir / "labels" / split

        if not lbl_dir.exists():
            continue

        label_files = list(lbl_dir.glob("*.txt"))
        print(f"[{split.upper()}] Checking {len(label_files)} label files...")

        for lbl_path in label_files:
            # Check matching image
            img_path_jpg = img_dir / f"{lbl_path.stem}.jpg"
            img_path_png = img_dir / f"{lbl_path.stem}.png"
            if not img_path_jpg.exists() and not img_path_png.exists():
                errors.append(f"Missing image for label: {lbl_path.name}")

            with open(lbl_path, "r") as f:
                lines = f.readlines()
                for line_idx, line in enumerate(lines):
                    parts = line.strip().split()
                    if len(parts) != 5:
                        errors.append(f"{lbl_path.name}:{line_idx + 1} - Malformed annotation line")
                        continue

                    try:
                        cls_id = int(parts[0])
                        x, y, w, h = map(float, parts[1:])
                    except ValueError:
                        errors.append(f"{lbl_path.name}:{line_idx + 1} - Non-numeric coordinate values")
                        continue

                    if cls_id < 0 or cls_id >= len(CLASSES):
                        errors.append(f"{lbl_path.name}:{line_idx + 1} - Invalid class ID {cls_id}")
                    else:
                        class_counts[CLASSES[cls_id]] += 1
                        total_annotations += 1

                    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                        errors.append(f"{lbl_path.name}:{line_idx + 1} - Coordinates out of normalized [0, 1] bounds")

    print(f"\nTotal Annotations Validated: {total_annotations}")
    print("Class Distribution:")
    for c, cnt in class_counts.items():
        print(f"  - {c.upper()}: {cnt}")

    if errors:
        print(f"\n⚠️ Found {len(errors)} validation warnings/errors:")
        for err in errors[:10]:
            print(f"  • {err}")
    else:
        print("\n✅ Dataset integrity verified. No annotation bounds errors found.")

if __name__ == "__main__":
    validate_dataset()
