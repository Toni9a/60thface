import path from "node:path";
import {
  appendPeopleLog,
  nowIso,
  PEOPLE_PATH,
  readJson,
  type PeoplePayload,
  writeJson,
} from "../../../../lib/people-store";
import { isLocalAdminEnabled } from "../../../../lib/local-admin";

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

function appendPersonRecord(
  peoplePayload: PeoplePayload,
  payload: {
    id: string;
    name: string;
    photoIds: string[];
    faceIds: string[];
    sourceClusterId?: string;
    sourceClusterIds?: string[];
    sourceClusterKeys?: string[];
  },
) {
  peoplePayload.people.push({
    id: payload.id,
    name: payload.name,
    photoIds: payload.photoIds,
    faceIds: payload.faceIds,
    sourceClusterId: payload.sourceClusterId,
    sourceClusterIds: payload.sourceClusterIds,
    sourceClusterKeys: payload.sourceClusterKeys,
  });
}

function buildSourceKey(cluster: ReviewCluster) {
  return `${cluster.id}:${cluster.faces.map((face) => face.id).sort().join("|")}`;
}

export async function POST(request: Request) {
  if (!isLocalAdminEnabled()) {
    return new Response("Local admin only", { status: 403 });
  }
  const body = (await request.json()) as {
    clusterId?: string;
    action?: string;
    label?: string;
    faceId?: string;
    unclusteredFaceId?: string;
  };
  const clusterId = String(body.clusterId ?? "").trim();
  const action = String(body.action ?? "").trim();
  const label = String(body.label ?? "").trim();
  const faceId = String(body.faceId ?? "").trim();
  const unclusteredFaceId = String(body.unclusteredFaceId ?? "").trim();

  if (!clusterId && !unclusteredFaceId) {
    return new Response("Missing review target", { status: 400 });
  }

  if (
    action !== "approve" &&
    action !== "not-face" &&
    action !== "remove-face" &&
    action !== "approve-unclustered" &&
    action !== "reject-unclustered"
  ) {
    return new Response("Unsupported action", { status: 400 });
  }

  if ((action === "approve" || action === "approve-unclustered") && !label) {
    return new Response("Name is required to approve this face", { status: 400 });
  }

  if (action === "remove-face" && !faceId) {
    return new Response("Missing face id", { status: 400 });
  }

  const [clustersPayload, peoplePayload] = await Promise.all([
    readJson<ClustersPayload>(CLUSTERS_PATH),
    readJson<PeoplePayload>(PEOPLE_PATH),
  ]);

  if (action === "approve-unclustered" || action === "reject-unclustered") {
    const unclusteredFace = (clustersPayload.unclusteredFaces ?? []).find(
      (entry) => entry.id === unclusteredFaceId,
    );

    if (!unclusteredFace) {
      return new Response("Unclustered face not found", { status: 404 });
    }

    if (action === "approve-unclustered") {
      const sourceKey = `unclustered:${unclusteredFace.id}`;
      appendPersonRecord(peoplePayload, {
        id: sourceKey,
        name: label,
        photoIds: [unclusteredFace.photoId],
        faceIds: [unclusteredFace.id],
        sourceClusterIds: [],
        sourceClusterKeys: [sourceKey],
      });

      await appendPeopleLog(peoplePayload, {
        action: "approve-unclustered-face",
        faceId: unclusteredFace.id,
        label,
        photoId: unclusteredFace.photoId,
      });
    } else {
      await appendPeopleLog(peoplePayload, {
        action: "reject-unclustered-face",
        faceId: unclusteredFace.id,
        photoId: unclusteredFace.photoId,
      });
    }

    clustersPayload.unclusteredFaces = (clustersPayload.unclusteredFaces ?? []).filter(
      (entry) => entry.id !== unclusteredFaceId,
    );
    clustersPayload.summary.unclusteredFaceCount = clustersPayload.unclusteredFaces.length;
    clustersPayload.generatedAt = nowIso();
    peoplePayload.updatedAt = nowIso();
    peoplePayload.people.sort((left, right) => left.name.localeCompare(right.name));

    await Promise.all([
      writeJson(CLUSTERS_PATH, clustersPayload),
      writeJson(PEOPLE_PATH, peoplePayload),
    ]);

    return Response.json({ ok: true });
  }

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
    appendPersonRecord(peoplePayload, {
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
