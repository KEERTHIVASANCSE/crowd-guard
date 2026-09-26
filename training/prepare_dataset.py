import os
import shutil
import random
from pathlib import Path

def prepare_and_split_dataset(source_dir: str = "raw_data", split_ratio=(0.7, 0.2, 0.1)):
    """
    Splits annotated images and corresponding label .txt files into
    dataset/images/{train,val,test} and dataset/labels/{train,val,test}.
    """
    base_dir = Path(__file__).resolve().parent.parent
    dataset_dir = base_dir / "dataset"

    src_path = Path(source_dir)
    if not src_path.exists():
        print(f"[INFO] Raw source directory '{source_dir}' not found. Dataset folders initialized ready for image drops.")
        return

    images = list(src_path.glob("*.jpg")) + list(src_path.glob("*.png")) + list(src_path.glob("*.jpeg"))
    print(f"Found {len(images)} raw images in {source_dir}")

    random.seed(42)
    random.shuffle(images)

    n_total = len(images)
    n_train = int(n_total * split_ratio[0])
    n_val = int(n_total * split_ratio[1])

    train_imgs = images[:n_train]
    val_imgs = images[n_train:n_train + n_val]
    test_imgs = images[n_train + n_val:]

    splits = [('train', train_imgs), ('val', val_imgs), ('test', test_imgs)]

    for split_name, split_files in splits:
        img_dest = dataset_dir / "images" / split_name
        lbl_dest = dataset_dir / "labels" / split_name
        img_dest.mkdir(parents=True, exist_ok=True)
        lbl_dest.mkdir(parents=True, exist_ok=True)

        for img_p in split_files:
            shutil.copy2(img_p, img_dest / img_p.name)
            txt_p = img_p.with_suffix(".txt")
            if txt_p.exists():
                shutil.copy2(txt_p, lbl_dest / txt_p.name)

    print(f"Dataset prepared successfully: {len(train_imgs)} train, {len(val_imgs)} val, {len(test_imgs)} test.")

if __name__ == "__main__":
    prepare_and_split_dataset()
