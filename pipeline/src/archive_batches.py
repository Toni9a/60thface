from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(
        description="Run gallery batches and archive each review output to its own json file."
    )
    parser.add_argument("--batch-size", type=int, default=120, help="Photos per batch.")
    parser.add_argument(
        "--max-photos",
        type=int,
        default=None,
        help="Optional cap on total photos to cover when generating batches.",
    )
    parser.add_argument(
        "--distance-threshold",
        type=float,
        default=0.46,
        help="Clustering distance threshold to use for the archived first-pass batches.",
    )
    parser.add_argument(
        "--max-image-size",
        type=int,
        default=1600,
        help="Resize images so the longest side is at most this many pixels before detection.",
    )
    parser.add_argument(
        "--source-dir",
        default="/Users/toni/galleryface/Gallery",
        help="Raw gallery source directory.",
    )
    parser.add_argument(
        "--batches-dir",
        default=str(repo_root / "data" / "review" / "batches"),
        help="Directory where archived batch review json files will be written.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    source_dir = Path(args.source_dir)
    if not source_dir.exists():
        raise SystemExit(f"Gallery source directory not found: {source_dir}")

    photo_paths = sorted(
        path
        for path in source_dir.iterdir()
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    total_photos = len(photo_paths) if args.max_photos is None else min(len(photo_paths), args.max_photos)
    batches_dir = Path(args.batches_dir)
    batches_dir.mkdir(parents=True, exist_ok=True)

    review_path = repo_root / "data" / "review" / "clusters.json"
    python_bin = repo_root / ".venv" / "bin" / "python"
    cluster_script = repo_root / "pipeline" / "src" / "cluster_faces.py"

    for offset in range(0, total_photos, args.batch_size):
        command = [
            str(python_bin),
            str(cluster_script),
            "--limit",
            str(args.batch_size),
            "--offset",
            str(offset),
            "--distance-threshold",
            str(args.distance_threshold),
            "--max-image-size",
            str(args.max_image_size),
        ]
        print(f"Running batch offset {offset}...")
        subprocess.run(command, cwd=repo_root, check=True)
        destination = batches_dir / f"batch-{offset:04d}.json"
        shutil.copy2(review_path, destination)
        print(f"Archived {destination}")


if __name__ == "__main__":
    main()
