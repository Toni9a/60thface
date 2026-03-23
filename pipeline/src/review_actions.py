from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply basic naming or review updates to exported face clusters."
    )
    parser.add_argument(
        "--clusters-file",
        default=str(
            Path(__file__).resolve().parents[2] / "data" / "review" / "clusters.json"
        ),
        help="Path to the generated review clusters file.",
    )
    parser.add_argument(
        "--people-file",
        default=str(Path(__file__).resolve().parents[2] / "data" / "people.json"),
        help="Path to the approved people file.",
    )
    parser.add_argument("--cluster-id", required=True, help="Cluster id to update.")
    parser.add_argument("--label", required=True, help="Approved name for the cluster.")
    return parser.parse_args()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    args = parse_args()
    clusters_path = Path(args.clusters_file)
    people_path = Path(args.people_file)

    clusters_payload = read_json(clusters_path)
    people_payload = read_json(people_path)

    target_cluster = None
    for cluster in clusters_payload.get("clusters", []):
        if cluster.get("id") == args.cluster_id:
            cluster["review"]["status"] = "approved"
            cluster["review"]["label"] = args.label
            target_cluster = cluster
            break

    if target_cluster is None:
        raise SystemExit(f"Cluster not found: {args.cluster_id}")

    existing_people = people_payload.get("people", [])
    existing_people = [
        person for person in existing_people if person.get("id") != args.cluster_id
    ]
    existing_people.append(
        {
            "id": args.cluster_id,
            "name": args.label,
            "photoIds": target_cluster.get("photoIds", []),
            "faceIds": [face["id"] for face in target_cluster.get("faces", [])],
            "sourceClusterId": args.cluster_id,
        }
    )

    people_payload["updatedAt"] = utc_now()
    people_payload["people"] = sorted(existing_people, key=lambda person: person["name"])
    clusters_payload["generatedAt"] = utc_now()

    write_json(clusters_path, clusters_payload)
    write_json(people_path, people_payload)
    print(f"Approved {args.cluster_id} as '{args.label}'")


if __name__ == "__main__":
    main()
