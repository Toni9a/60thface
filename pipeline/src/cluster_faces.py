from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass
class PhotoRecord:
    id: str
    filename: str
    absolute_path: str


@dataclass
class FaceRecord:
    id: str
    photoId: str
    photoPath: str
    bbox: dict[str, int]
    encoding: list[float]
    thumbnailPath: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Index photos, detect faces, cluster identities, and export review data."
    )
    parser.add_argument(
        "--source-dir",
        default=os.environ.get("GALLERY_SOURCE_DIR", "/Users/toni/galleryface/Gallery"),
        help="Absolute path to the raw photo directory.",
    )
    parser.add_argument(
        "--output-dir",
        default=os.environ.get("OUTPUT_DIR"),
        help="Optional directory for generated thumbnails and debug artifacts.",
    )
    parser.add_argument(
        "--distance-threshold",
        type=float,
        default=0.46,
        help="Max embedding distance to treat two faces as the same person.",
    )
    parser.add_argument(
        "--min-cluster-size",
        type=int,
        default=2,
        help="Minimum number of faces required to keep a cluster.",
    )
    parser.add_argument(
        "--detection-model",
        choices=("hog", "cnn"),
        default="hog",
        help="face_recognition face location model.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit for faster trial runs.",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip this many photos before applying the limit.",
    )
    parser.add_argument(
        "--photo-ids-file",
        default=None,
        help="Optional JSON file containing a list of photo ids to process.",
    )
    parser.add_argument(
        "--skip-detection",
        action="store_true",
        help="Only index photos and write metadata without face analysis.",
    )
    parser.add_argument(
        "--max-image-size",
        type=int,
        default=1600,
        help="Resize images so the longest side is at most this many pixels before face detection.",
    )
    return parser.parse_args()


def list_photos(source_dir: Path) -> Iterable[Path]:
    for path in sorted(source_dir.iterdir()):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def load_requested_photo_ids(photo_ids_file: str | None) -> set[str] | None:
    if not photo_ids_file:
        return None

    payload = json.loads(Path(photo_ids_file).read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        photo_ids = payload.get("photoIds", [])
    else:
        photo_ids = payload

    if not isinstance(photo_ids, list):
        raise SystemExit("photo ids file must contain a list or an object with photoIds")

    return {str(photo_id).strip().lower() for photo_id in photo_ids if str(photo_id).strip()}


def build_photo_records(
    source_dir: Path,
    limit: int | None,
    offset: int,
    requested_photo_ids: set[str] | None,
) -> list[PhotoRecord]:
    paths = list(list_photos(source_dir))
    if requested_photo_ids is not None:
        paths = [path for path in paths if path.stem.lower() in requested_photo_ids]
    if offset:
        paths = paths[offset:]
    if limit is not None:
        paths = paths[:limit]
    return [
        PhotoRecord(
            id=path.stem.lower(),
            filename=path.name,
            absolute_path=str(path.resolve()),
        )
        for path in paths
    ]


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_face_recognition():
    try:
        import face_recognition  # type: ignore
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Missing dependency 'face_recognition'. Install pipeline requirements first."
        ) from exc
    return face_recognition


def maybe_load_pillow():
    try:
        from PIL import Image  # type: ignore
    except ModuleNotFoundError:
        return None
    return Image


def load_numpy():
    try:
        import numpy as np  # type: ignore
    except ModuleNotFoundError as exc:
        raise SystemExit("Missing dependency 'numpy'. Install pipeline requirements first.") from exc
    return np


def save_thumbnail(
    photo_path: Path,
    bbox: tuple[int, int, int, int],
    output_dir: Path,
    face_id: str,
):
    Image = maybe_load_pillow()
    if Image is None:
        return None

    top, right, bottom, left = bbox
    with Image.open(photo_path) as image:
        crop = image.crop((left, top, right, bottom))
        crop.thumbnail((256, 256))
        output_dir.mkdir(parents=True, exist_ok=True)
        destination = output_dir / f"{face_id}.jpg"
        crop.save(destination, format="JPEG", quality=90)
        return str(destination)


def detect_faces(
    photos: list[PhotoRecord],
    detection_model: str,
    face_crop_dir: Path,
    max_image_size: int,
) -> tuple[list[FaceRecord], list[dict[str, str]]]:
    face_recognition = load_face_recognition()
    Image = maybe_load_pillow()
    np = load_numpy()
    detections: list[FaceRecord] = []
    failures: list[dict[str, str]] = []

    for photo in photos:
        photo_path = Path(photo.absolute_path)
        try:
            if Image is None:
                image = face_recognition.load_image_file(photo.absolute_path)
                boxes = face_recognition.face_locations(image, model=detection_model)
                encodings = face_recognition.face_encodings(image, known_face_locations=boxes)
                scale = 1.0
            else:
                with Image.open(photo_path) as pil_image:
                    image = pil_image.convert("RGB")
                    longest_side = max(image.size)
                    scale = (
                        min(1.0, max_image_size / float(longest_side))
                        if max_image_size > 0
                        else 1.0
                    )
                    if scale < 1.0:
                        resized = image.resize(
                            (
                                max(1, int(image.width * scale)),
                                max(1, int(image.height * scale)),
                            ),
                            Image.Resampling.LANCZOS,
                        )
                    else:
                        resized = image

                    resized_array = np.array(resized)
                    boxes = face_recognition.face_locations(
                        resized_array,
                        model=detection_model,
                    )
                    encodings = face_recognition.face_encodings(
                        resized_array,
                        known_face_locations=boxes,
                    )
        except Exception as exc:  # noqa: BLE001
            failures.append({"photoId": photo.id, "reason": str(exc)})
            continue

        for index, (bbox, encoding) in enumerate(zip(boxes, encodings, strict=False)):
            top, right, bottom, left = bbox
            if scale < 1.0:
                top = int(round(top / scale))
                right = int(round(right / scale))
                bottom = int(round(bottom / scale))
                left = int(round(left / scale))
            face_id = f"{photo.id}-face-{index + 1}"
            full_size_bbox = (top, right, bottom, left)
            thumbnail_path = save_thumbnail(photo_path, full_size_bbox, face_crop_dir, face_id)
            detections.append(
                FaceRecord(
                    id=face_id,
                    photoId=photo.id,
                    photoPath=photo.absolute_path,
                    bbox={
                        "top": top,
                        "right": right,
                        "bottom": bottom,
                        "left": left,
                    },
                    encoding=[float(value) for value in encoding],
                    thumbnailPath=thumbnail_path,
                )
            )

    return detections, failures


def embedding_distance(left: list[float], right: list[float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right, strict=True)))


def cluster_faces(
    faces: list[FaceRecord],
    distance_threshold: float,
    min_cluster_size: int,
) -> tuple[list[list[FaceRecord]], list[FaceRecord]]:
    if not faces:
        return [], []

    parent = list(range(len(faces)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for left_index in range(len(faces)):
        for right_index in range(left_index + 1, len(faces)):
            distance = embedding_distance(
                faces[left_index].encoding,
                faces[right_index].encoding,
            )
            if distance <= distance_threshold:
                union(left_index, right_index)

    grouped: dict[int, list[FaceRecord]] = {}
    for index, face in enumerate(faces):
        grouped.setdefault(find(index), []).append(face)

    clusters: list[list[FaceRecord]] = []
    unclustered: list[FaceRecord] = []
    for members in grouped.values():
        members.sort(key=lambda face: face.id)
        if len(members) >= min_cluster_size:
            clusters.append(members)
        else:
            unclustered.extend(members)

    clusters.sort(key=len, reverse=True)
    unclustered.sort(key=lambda face: face.id)
    return clusters, unclustered


def summarize_cluster(cluster_id: str, faces: list[FaceRecord]) -> dict:
    photo_ids = sorted({face.photoId for face in faces})
    sample_faces = faces[: min(12, len(faces))]
    return {
        "id": cluster_id,
        "faceCount": len(faces),
        "photoCount": len(photo_ids),
        "photoIds": photo_ids,
        "sampleFaceIds": [face.id for face in sample_faces],
        "sampleThumbnails": [
            {"faceId": face.id, "thumbnailPath": face.thumbnailPath, "photoId": face.photoId}
            for face in sample_faces
        ],
        "faces": [
            {
                "id": face.id,
                "photoId": face.photoId,
                "photoPath": face.photoPath,
                "bbox": face.bbox,
                "thumbnailPath": face.thumbnailPath,
            }
            for face in faces
        ],
        "review": {
            "status": "pending",
            "label": None,
            "notes": "",
            "mergeInto": None,
            "rejected": False,
        },
    }


def export_outputs(
    repo_root: Path,
    source_dir: Path,
    all_photos: list[PhotoRecord],
    photos: list[PhotoRecord],
    faces: list[FaceRecord],
    clusters: list[list[FaceRecord]],
    unclustered: list[FaceRecord],
    failures: list[dict[str, str]],
    args: argparse.Namespace,
) -> None:
    data_dir = repo_root / "data"
    generated_dir = Path(args.output_dir) if args.output_dir else repo_root / "pipeline" / "output"
    timestamp = utc_now()

    write_json(
        data_dir / "photos.json",
        {
            "generatedAt": timestamp,
            "sourceDirectory": str(source_dir.resolve()),
            "photos": [asdict(photo) for photo in all_photos],
        },
    )

    write_json(
        generated_dir / "faces.json",
        {
            "generatedAt": timestamp,
            "faceCount": len(faces),
            "faces": [
                {
                    "id": face.id,
                    "photoId": face.photoId,
                    "photoPath": face.photoPath,
                    "bbox": face.bbox,
                    "thumbnailPath": face.thumbnailPath,
                    "encoding": face.encoding,
                }
                for face in faces
            ],
        },
    )

    write_json(
        data_dir / "review" / "clusters.json",
        {
            "generatedAt": timestamp,
            "sourceDirectory": str(source_dir.resolve()),
            "settings": {
                "distanceThreshold": args.distance_threshold,
                "minClusterSize": args.min_cluster_size,
                "detectionModel": args.detection_model,
                "maxImageSize": args.max_image_size,
                "limit": args.limit,
                "offset": args.offset,
                "photoIdsFile": args.photo_ids_file,
            },
            "summary": {
                "photoCount": len(photos),
                "faceCount": len(faces),
                "clusterCount": len(clusters),
                "unclusteredFaceCount": len(unclustered),
                "failedPhotoCount": len(failures),
            },
            "clusters": [
                summarize_cluster(f"cluster-{index + 1:03d}", cluster)
                for index, cluster in enumerate(clusters)
            ],
            "unclusteredFaces": [
                {
                    "id": face.id,
                    "photoId": face.photoId,
                    "photoPath": face.photoPath,
                    "bbox": face.bbox,
                    "thumbnailPath": face.thumbnailPath,
                }
                for face in unclustered
            ],
            "failures": failures,
        },
    )


def run() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir).expanduser().resolve()
    repo_root = Path(__file__).resolve().parents[2]
    generated_dir = Path(args.output_dir).expanduser().resolve() if args.output_dir else repo_root / "pipeline" / "output"
    face_crop_dir = generated_dir / "face-crops"

    if not source_dir.exists():
        raise SystemExit(f"Gallery source directory not found: {source_dir}")

    requested_photo_ids = load_requested_photo_ids(args.photo_ids_file)
    all_photos = build_photo_records(
        source_dir,
        limit=None,
        offset=0,
        requested_photo_ids=None,
    )
    photos = build_photo_records(
        source_dir,
        args.limit,
        args.offset,
        requested_photo_ids,
    )

    if args.skip_detection:
        export_outputs(
            repo_root=repo_root,
            source_dir=source_dir,
            all_photos=all_photos,
            photos=photos,
            faces=[],
            clusters=[],
            unclustered=[],
            failures=[],
            args=args,
        )
        print(f"Indexed {len(photos)} photos from {source_dir} without face detection")
        return

    faces, failures = detect_faces(
        photos=photos,
        detection_model=args.detection_model,
        face_crop_dir=face_crop_dir,
        max_image_size=args.max_image_size,
    )
    clusters, unclustered = cluster_faces(
        faces=faces,
        distance_threshold=args.distance_threshold,
        min_cluster_size=args.min_cluster_size,
    )

    export_outputs(
        repo_root=repo_root,
        source_dir=source_dir,
        all_photos=all_photos,
        photos=photos,
        faces=faces,
        clusters=clusters,
        unclustered=unclustered,
        failures=failures,
        args=args,
    )

    print(f"Indexed {len(photos)} photos from {source_dir}")
    print(f"Detected {len(faces)} faces")
    print(f"Formed {len(clusters)} clusters")
    if unclustered:
        print(f"Left {len(unclustered)} faces unclustered")
    if failures:
        print(f"Skipped {len(failures)} photos due to processing errors")


if __name__ == "__main__":
    run()
