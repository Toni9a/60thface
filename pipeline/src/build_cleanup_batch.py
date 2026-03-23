from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(
        description="Build a cleanup rerun manifest from the current unresolved review data."
    )
    parser.add_argument(
        "--batches-dir",
        default=None,
        help="Optional directory of archived batch review json files to aggregate.",
    )
    parser.add_argument(
        "--clusters-file",
        default=str(repo_root / "data" / "review" / "clusters.json"),
        help="Path to the current review clusters json file.",
    )
    parser.add_argument(
        "--output-file",
        default=str(repo_root / "data" / "review" / "cleanup-photo-ids.json"),
        help="Where to write the cleanup photo-id manifest.",
    )
    return parser.parse_args()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def collect_photo_ids_from_payload(payload: dict) -> tuple[set[str], int, int]:
    pending_clusters = [
        cluster
        for cluster in payload.get("clusters", [])
        if cluster.get("review", {}).get("status") == "pending"
    ]
    unclustered_faces = payload.get("unclusteredFaces", [])

    photo_ids = set()
    for cluster in pending_clusters:
        for photo_id in cluster.get("photoIds", []):
            photo_ids.add(str(photo_id).strip().lower())

    for face in unclustered_faces:
        photo_id = str(face.get("photoId", "")).strip().lower()
        if photo_id:
            photo_ids.add(photo_id)

    return photo_ids, len(pending_clusters), len(unclustered_faces)


def main() -> None:
    args = parse_args()
    photo_ids: set[str] = set()
    pending_cluster_count = 0
    unclustered_face_count = 0
    source_files: list[str] = []

    if args.batches_dir:
        batches_dir = Path(args.batches_dir)
        batch_files = sorted(batches_dir.glob("batch-*.json"))
        if not batch_files:
            raise SystemExit(f"No batch files found in {batches_dir}")

        for batch_file in batch_files:
            payload = read_json(batch_file)
            batch_photo_ids, batch_pending, batch_unclustered = collect_photo_ids_from_payload(payload)
            photo_ids.update(batch_photo_ids)
            pending_cluster_count += batch_pending
            unclustered_face_count += batch_unclustered
            source_files.append(str(batch_file.resolve()))
    else:
        clusters_payload = read_json(Path(args.clusters_file))
        batch_photo_ids, pending_cluster_count, unclustered_face_count = collect_photo_ids_from_payload(
            clusters_payload
        )
        photo_ids.update(batch_photo_ids)
        source_files.append(str(Path(args.clusters_file).resolve()))

    write_json(
        Path(args.output_file),
        {
            "generatedAt": utc_now(),
            "sourceFiles": source_files,
            "pendingClusterCount": pending_cluster_count,
            "unclusteredFaceCount": unclustered_face_count,
            "photoIds": sorted(photo_ids),
        },
    )

    print(
        f"Built cleanup manifest with {len(photo_ids)} photos from "
        f"{pending_cluster_count} pending clusters and {unclustered_face_count} unclustered faces"
    )


if __name__ == "__main__":
    main()
