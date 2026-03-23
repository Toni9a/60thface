# Face Pipeline

This pipeline runs locally on the MacBook against the raw event photos. It is the source of truth for face detection, clustering, and review exports.

## Flow

1. Index photos from the raw gallery folder.
2. Detect faces with `face_recognition`.
3. Generate embeddings for each detected face.
4. Cluster similar embeddings into candidate identities.
5. Export thumbnails and review data to JSON.
6. Approve clusters into `data/people.json`.

## Files

- `src/cluster_faces.py`: main pipeline entry point
- `src/review_actions.py`: small CLI for approving a cluster label
- `output/faces.json`: generated face-level debug output
- `output/face-crops/`: cropped faces for review
- `../data/review/clusters.json`: review-ready cluster export
- `../data/people.json`: approved named people

## Environment

Expected environment variables:

- `GALLERY_SOURCE_DIR`: absolute path to the raw photo folder
- `OUTPUT_DIR`: optional override for generated artifacts

## Install

Create and activate a virtual environment, then install requirements:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
```

## Run

Full run against the event photos:

```bash
python3 pipeline/src/cluster_faces.py
```

Trial run on a subset:

```bash
python3 pipeline/src/cluster_faces.py --limit 40
```

Inventory only, no face detection:

```bash
python3 pipeline/src/cluster_faces.py --skip-detection
```

Approve a reviewed cluster into `people.json`:

```bash
python3 pipeline/src/review_actions.py --cluster-id cluster-001 --label "Irene"
```

## Notes

- `face_recognition` may require native build tooling depending on the machine setup.
- The clustering algorithm is currently threshold-based connected-component grouping. It is simple, inspectable, and a good first pass for human review.
- Merge, split, and reject actions still need a proper admin UI. The JSON contract now supports that next step.
