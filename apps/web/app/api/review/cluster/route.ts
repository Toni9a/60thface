import path from "node:path";
import {
  appendPeopleLog,
  nowIso,
  PEOPLE_PATH,
  readJson,
  type PeoplePayload,
  writeJson,
} from "../../../../lib/people-store";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const CLUSTERS_PATH = path.join(REPO_ROOT, "data", "review", "clusters.json");

type ReviewCluster = {
  id: string;
  photoIds: string[];
  faceCount: number;
  photoCount: number;
  sampleFaceIds: string[];
  sampleThumbnails: Array<{
    faceId: string;
    thumbnailPath: string | null;
    photoId: string;
  }>;
  faces: Array<{
    id: string;
    photoId: string;
    photoPath: string;
    bbox: Record<string, number>;
    thumbnailPath: string | null;
  }>;
  review: {
    status: string;
    label: string | null;
    notes: string;
    mergeInto: string | null;
    rejected: boolean;
  };
};

type ClustersPayload = {
  generatedAt: string | null;
  summary: {
    photoCount: number;
    faceCount: number;
    clusterCount: number;
    unclusteredFaceCount: number;
    failedPhotoCount: number;
  };
  clusters: ReviewCluster[];
  unclusteredFaces?: Array<{
    id: string;
    photoId: string;
    photoPath: string;
    bbox: Record<string, number>;
    thumbnailPath: string | null;
  }>;
};

function buildSourceKey(cluster: ReviewCluster) {
  return `${cluster.id}:${cluster.faces.map((face) => face.id).sort().join("|")}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clusterId?: string;
    action?: string;
    label?: string;
    faceId?: string;
  };
  const clusterId = String(body.clusterId ?? "").trim();
  const action = String(body.action ?? "").trim();
  const label = String(body.label ?? "").trim();
  const faceId = String(body.faceId ?? "").trim();

  if (!clusterId) {
    return new Response("Missing cluster id", { status: 400 });
  }

  if (action !== "approve" && action !== "not-face" && action !== "remove-face") {
    return new Response("Unsupported action", { status: 400 });
  }

  if (action === "approve" && !label) {
    return new Response("Name is required to approve a cluster", { status: 400 });
  }

  if (action === "remove-face" && !faceId) {
    return new Response("Missing face id", { status: 400 });
  }

  const [clustersPayload, peoplePayload] = await Promise.all([
    readJson<ClustersPayload>(CLUSTERS_PATH),
    readJson<PeoplePayload>(PEOPLE_PATH),
  ]);

  const cluster = clustersPayload.clusters.find((entry) => entry.id === clusterId);
  if (!cluster) {
    return new Response("Cluster not found", { status: 404 });
  }

  const sourceKey = buildSourceKey(cluster);
  peoplePayload.people = peoplePayload.people.filter(
    (person) => !(person.sourceClusterKeys ?? []).includes(sourceKey),
  );

  if (action === "approve") {
    cluster.review.status = "approved";
    cluster.review.label = label;
    cluster.review.rejected = false;
    peoplePayload.people.push({
      id: sourceKey,
      name: label,
      photoIds: cluster.photoIds,
      faceIds: cluster.faces.map((face) => face.id),
      sourceClusterId: clusterId,
      sourceClusterIds: [clusterId],
      sourceClusterKeys: [sourceKey],
    });

    await appendPeopleLog(peoplePayload, {
      action: "approve-cluster",
      clusterId,
      sourceKey,
      label,
      photoIds: cluster.photoIds,
      faceIds: cluster.faces.map((face) => face.id),
    });
  } else if (action === "not-face") {
    cluster.review.status = "rejected";
    cluster.review.label = null;
    cluster.review.rejected = true;
    cluster.review.notes = "Marked as not a face from the review UI.";

    await appendPeopleLog(peoplePayload, {
      action: "reject-cluster",
      clusterId,
      sourceKey,
      faceIds: cluster.faces.map((face) => face.id),
    });
  } else {
    const removedFace = cluster.faces.find((face) => face.id == faceId);
    if (!removedFace) {
      return new Response("Face not found in cluster", { status: 404 });
    }

    cluster.faces = cluster.faces.filter((face) => face.id !== faceId);
    cluster.faceCount = cluster.faces.length;
    cluster.photoIds = Array.from(new Set(cluster.faces.map((face) => face.photoId))).sort();
    cluster.photoCount = cluster.photoIds.length;
    cluster.sampleFaceIds = cluster.faces.slice(0, 12).map((face) => face.id);
    cluster.sampleThumbnails = cluster.faces.slice(0, 12).map((face) => ({
      faceId: face.id,
      thumbnailPath: face.thumbnailPath,
      photoId: face.photoId,
    }));

    clustersPayload.unclusteredFaces = clustersPayload.unclusteredFaces ?? [];
    clustersPayload.unclusteredFaces.push(removedFace);
    clustersPayload.summary.unclusteredFaceCount += 1;

    if (cluster.faceCount < 2) {
      for (const face of cluster.faces) {
        clustersPayload.unclusteredFaces.push(face);
        clustersPayload.summary.unclusteredFaceCount += 1;
      }

      clustersPayload.clusters = clustersPayload.clusters.filter(
        (entry) => entry.id !== clusterId,
      );
      clustersPayload.summary.clusterCount = clustersPayload.clusters.length;
    }

    await appendPeopleLog(peoplePayload, {
      action: "remove-face-from-cluster",
      clusterId,
      sourceKey,
      faceId,
      photoId: removedFace.photoId,
    });
  }

  clustersPayload.generatedAt = nowIso();
  clustersPayload.summary.clusterCount = clustersPayload.clusters.length;
  peoplePayload.updatedAt = nowIso();
  peoplePayload.people.sort((left, right) => left.name.localeCompare(right.name));

  await Promise.all([
    writeJson(CLUSTERS_PATH, clustersPayload),
    writeJson(PEOPLE_PATH, peoplePayload),
  ]);

  return Response.json({ ok: true });
}
