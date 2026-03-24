import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildPhotoUrl } from "./image-source";
import { isLocalAdminEnabled } from "./local-admin";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const REVIEW_DIR = path.join(DATA_DIR, "review");

type TimelineSection = {
  id: string;
  title: string;
  coverPhoto: string | null;
  photoIds: string[];
};

type Person = {
  id: string;
  name: string;
  photoIds: string[];
  faceIds?: string[];
  sourceClusterId?: string;
  sourceClusterIds?: string[];
  sourceClusterKeys?: string[];
};

type PhotoRecord = {
  id: string;
  filename: string;
  absolute_path: string;
};

type SiteConfig = {
  eventTitle: string;
  heroPhotoId: string | null;
  heroCaption: string;
};

const GOOGLE_PHOTOS_URL = "https://photos.app.goo.gl/Kp7RE6Y4wH6wEXsJ8";

const SECTION_DESCRIPTIONS: Record<string, string> = {
  arriving: "The Birthday Girl makes her grand entrance",
  food: "The scrumptious starters (and one too many drinks for some of you)",
  trivia: "Some Teams begging for half points. Poems & Sparklers for the wonderful IB",
  "cutting-the-cake": "Some Teams begging for half points. Poems & Sparklers for the wonderful IB",
  "dance-floor": "Burning those calories - 60 is the new 30",
};

type ReviewSummary = {
  photoCount: number;
  faceCount: number;
  clusterCount: number;
  unclusteredFaceCount: number;
  failedPhotoCount: number;
};

type ReviewCluster = {
  id: string;
  faceCount: number;
  photoCount: number;
  photoIds: string[];
  sampleThumbnails: Array<{
    faceId: string;
    thumbnailPath: string | null;
    photoId: string;
  }>;
  faces: Array<{
    id: string;
    photoId: string;
    photoPath: string;
    bbox: { top: number; right: number; bottom: number; left: number };
    thumbnailPath: string | null;
  }>;
  review: {
    status: string;
    label: string | null;
  };
};

type FaceEntry = {
  faceId: string;
  photoId: string;
  photoPath: string;
  bbox: { top: number; right: number; bottom: number; left: number };
};

type FaceEncodingEntry = FaceEntry & {
  encoding: number[];
  thumbnailPath: string | null;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortPeopleForHomepage<
  T extends {
    name: string;
  },
>(people: T[]) {
  const preferredOrder = ["ib", "remi", "tobi", "tayo", "temi", "gbone", "marlene"];

  function score(name: string) {
    const normalized = name.trim().toLowerCase();
    const matchIndex = preferredOrder.findIndex(
      (preferred) =>
        normalized === preferred ||
        normalized.startsWith(`${preferred} `) ||
        normalized.includes(preferred),
    );
    return matchIndex === -1 ? Number.MAX_SAFE_INTEGER : matchIndex;
  }

  return [...people].sort((left, right) => {
    const leftScore = score(left.name);
    const rightScore = score(right.name);
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return left.name.localeCompare(right.name);
  });
}

function isUnnamedPerson(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.startsWith("person") ||
    normalized.startsWith("perz") ||
    normalized.startsWith("pers") ||
    normalized === "unknown" ||
    normalized === "unnamed"
  );
}

function isNeedsReviewPerson(person: {
  name: string;
  photoIds: string[];
  memberIds: string[];
}) {
  return (
    isUnnamedPerson(person.name) ||
    person.photoIds.length <= 3 ||
    person.memberIds.length > 1
  );
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function readDataFiles(): Promise<{
  people: { people: Person[] };
  photos: { photos: PhotoRecord[] };
  review: { summary: ReviewSummary; clusters: ReviewCluster[] };
  timeline: { sections: TimelineSection[] };
  site: SiteConfig;
}> {
  const [people, photos, review, timeline, site] = await Promise.all([
    readJsonFile<{ people: Person[] }>(path.join(DATA_DIR, "people.json")),
    readJsonFile<{ photos: PhotoRecord[] }>(path.join(DATA_DIR, "photos.json")),
    readJsonFile<{ summary: ReviewSummary; clusters: ReviewCluster[] }>(
      path.join(DATA_DIR, "review", "clusters.json"),
    ),
    readJsonFile<{ sections: TimelineSection[] }>(
      path.join(DATA_DIR, "timeline.json"),
    ),
    readJsonFile<SiteConfig>(path.join(DATA_DIR, "site.json")),
  ]);

  return { people, photos, review, timeline, site };
}

async function loadFaceIndex(): Promise<Map<string, FaceEntry>> {
  const fs = await import("node:fs/promises");
  const reviewFiles = [
    path.join(REVIEW_DIR, "clusters.json"),
    path.join(REVIEW_DIR, "clusters-pre-cluster001-rerun.json"),
    path.join(REVIEW_DIR, "clusters-pre-threshold-030.json"),
  ];

  try {
    const batchFiles = await fs.readdir(path.join(REVIEW_DIR, "batches"));
    for (const file of batchFiles) {
      if (file.endsWith(".json")) {
        reviewFiles.push(path.join(REVIEW_DIR, "batches", file));
      }
    }
  } catch {
    // ignore missing archive dir
  }

  const index = new Map<string, FaceEntry>();

  for (const filePath of reviewFiles) {
    try {
      const payload = await readJsonFile<{
        clusters?: Array<{
          faces?: Array<{
            id: string;
            photoId: string;
            photoPath: string;
            bbox: { top: number; right: number; bottom: number; left: number };
          }>;
        }>;
        unclusteredFaces?: Array<{
          id: string;
          photoId: string;
          photoPath: string;
          bbox: { top: number; right: number; bottom: number; left: number };
        }>;
      }>(filePath);

      for (const cluster of payload.clusters ?? []) {
        for (const face of cluster.faces ?? []) {
          if (!index.has(face.id)) {
            index.set(face.id, {
              faceId: face.id,
              photoId: face.photoId,
              photoPath: face.photoPath,
              bbox: face.bbox,
            });
          }
        }
      }

      for (const face of payload.unclusteredFaces ?? []) {
        if (!index.has(face.id)) {
          index.set(face.id, {
            faceId: face.id,
            photoId: face.photoId,
            photoPath: face.photoPath,
            bbox: face.bbox,
          });
        }
      }
    } catch {
      // ignore unreadable review files
    }
  }

  return index;
}

async function loadFaceEncodingIndex(): Promise<Map<string, FaceEncodingEntry>> {
  const payload = await readJsonFile<{
    faces?: Array<{
      id: string;
      photoId: string;
      photoPath: string;
      bbox: { top: number; right: number; bottom: number; left: number };
      thumbnailPath: string | null;
      encoding: number[];
    }>;
  }>(path.join(REPO_ROOT, "pipeline", "output", "faces.json"));

  return new Map(
    (payload.faces ?? []).map((face) => [
      face.id,
      {
        faceId: face.id,
        photoId: face.photoId,
        photoPath: face.photoPath,
        bbox: face.bbox,
        thumbnailPath: face.thumbnailPath,
        encoding: face.encoding,
      },
    ]),
  );
}

function groupPeople(people: Person[]) {
  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      photoIds: Set<string>;
      faceIds: Set<string>;
      sourceIds: Set<string>;
      memberIds: Set<string>;
      slug: string;
    }
  >();

  for (const person of people) {
    const key = person.name.trim().toLowerCase();
    const sourceIds = [
      person.id,
      ...(person.sourceClusterIds ?? []),
      ...(person.sourceClusterId ? [person.sourceClusterId] : []),
    ];
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        id: person.id,
        name: person.name,
        slug: slugify(person.name) || person.id,
        photoIds: new Set(person.photoIds),
        faceIds: new Set(person.faceIds ?? []),
        sourceIds: new Set(sourceIds),
        memberIds: new Set([person.id]),
      });
      continue;
    }

    for (const photoId of person.photoIds) {
      existing.photoIds.add(photoId);
    }
    for (const faceId of person.faceIds ?? []) {
      existing.faceIds.add(faceId);
    }
    for (const sourceId of sourceIds) {
      existing.sourceIds.add(sourceId);
    }
    existing.memberIds.add(person.id);
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function buildPhotoMap(photos: PhotoRecord[]) {
  return new Map(photos.map((photo) => [photo.id, photo]));
}

function buildChronologicalSections(
  sections: TimelineSection[],
  photos: PhotoRecord[],
) {
  const photoOrder = new Map(photos.map((photo, index) => [photo.id, index]));
  const ordered = sections
    .map((section, index) => ({
      ...section,
      originalIndex: index,
      anchorIndex:
        section.coverPhoto && photoOrder.has(section.coverPhoto)
          ? (photoOrder.get(section.coverPhoto) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER - 1000 + index,
    }))
    .sort((left, right) =>
      left.anchorIndex === right.anchorIndex
        ? left.originalIndex - right.originalIndex
        : left.anchorIndex - right.anchorIndex,
    );

  return ordered.map((section, index) => {
    const nextSection = ordered[index + 1];
    const startIndex = index === 0 ? 0 : section.anchorIndex;
    const endIndex = nextSection ? nextSection.anchorIndex : photos.length;
    const inferredPhotoIds =
      Number.isFinite(startIndex) && startIndex < photos.length
        ? photos.slice(startIndex, endIndex).map((photo) => photo.id)
        : [];

    return {
      ...section,
      inferredPhotoIds,
    };
  });
}

function toPhotoView(photo: PhotoRecord | undefined) {
  if (!photo) {
    return null;
  }

  return {
    id: photo.id,
    filename: photo.filename,
    absolutePath: photo.absolute_path,
    url: buildPhotoUrl(photo),
  };
}

export async function getHomepageData() {
  const files = await readDataFiles();
  const faceIndex = await loadFaceIndex();
  const groupedPeople = groupPeople(files.people.people);
  const photoMap = buildPhotoMap(files.photos.photos);
  const sections = buildChronologicalSections(
    files.timeline.sections,
    files.photos.photos,
  );
  const fallbackHero = files.photos.photos[0];
  const heroPhoto = toPhotoView(
    photoMap.get(files.site.heroPhotoId ?? "") ?? fallbackHero,
  );

  return {
    eventTitle: files.site.eventTitle,
    heroCaption: files.site.heroCaption,
    googlePhotosUrl: GOOGLE_PHOTOS_URL,
    adminEnabled: isLocalAdminEnabled(),
    photoCount: files.photos.photos.length,
    reviewSummary: files.review.summary,
    heroPhoto,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: SECTION_DESCRIPTIONS[section.id] ?? null,
      photoIds: section.inferredPhotoIds,
      coverPhotoId: section.coverPhoto,
      anchorHref: `/all-photos#moment-${section.id}`,
      coverPhoto: toPhotoView(
        photoMap.get(section.coverPhoto ?? "") ??
          photoMap.get(section.inferredPhotoIds[0] ?? ""),
      ),
    })),
    featuredPeople: sortPeopleForHomepage(groupedPeople).slice(0, 8).map((person) => {
      const face = Array.from(person.faceIds)
        .map((faceId) => faceIndex.get(faceId))
        .find((entry) => Boolean(entry));

      return {
        id: person.id,
        slug: person.slug,
        name: person.name,
        photoCount: person.photoIds.size,
        face: face ?? null,
      };
    }),
  };
}

export async function getReviewData(): Promise<{
  summary: ReviewSummary;
  clusters: ReviewCluster[];
  pendingCount: number;
}> {
  const files = await readDataFiles();
  const pendingClusters = files.review.clusters.filter(
    (cluster) => cluster.review.status === "pending",
  );

  return {
    summary: files.review.summary,
    clusters: pendingClusters,
    pendingCount: pendingClusters.length,
  };
}

export async function getPeopleAdminData() {
  const files = await readDataFiles();
  const faceIndex = await loadFaceIndex();
  const grouped = groupPeople(files.people.people);

  return {
    people: grouped.map((person) => ({
      id: person.id,
      name: person.name,
      photoIds: Array.from(person.photoIds).sort(),
      sourceIds: Array.from(person.sourceIds).sort(),
      memberIds: Array.from(person.memberIds).sort(),
      photos: Array.from(person.photoIds)
        .sort()
        .map((photoId) => {
          const face = Array.from(person.faceIds)
            .map((faceId) => faceIndex.get(faceId))
            .find((entry) => entry?.photoId === photoId);

          return {
            faceId: face?.faceId ?? `${person.id}-${photoId}`,
            photoId,
            photoPath: face?.photoPath ?? null,
            bbox: face?.bbox ?? null,
          };
        }),
    })),
  };
}

export async function getGalleryPageData() {
  const files = await readDataFiles();
  const sections = buildChronologicalSections(
    files.timeline.sections,
    files.photos.photos,
  );
  const sectionAnchors = new Map(
    sections
      .filter((section) => section.coverPhoto)
      .map((section) => [section.coverPhoto as string, section]),
  );

  return {
    eventTitle: files.site.eventTitle,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      anchorHref: `#moment-${section.id}`,
      coverPhotoId: section.coverPhoto,
    })),
    photos: files.photos.photos.map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      url: buildPhotoUrl(photo),
      sectionMarker: sectionAnchors.get(photo.id)
        ? {
            id: sectionAnchors.get(photo.id)?.id ?? "",
            title: sectionAnchors.get(photo.id)?.title ?? "",
            description:
              SECTION_DESCRIPTIONS[sectionAnchors.get(photo.id)?.id ?? ""] ?? "",
          }
        : null,
    })),
  };
}

export async function getPeopleGalleryData() {
  const files = await readDataFiles();
  const faceIndex = await loadFaceIndex();
  const groupedPeople = groupPeople(files.people.people);

  return {
    eventTitle: files.site.eventTitle,
    people: groupedPeople
      .map((person) => {
        const preview = Array.from(person.faceIds)
          .map((faceId) => faceIndex.get(faceId))
          .find((entry) => Boolean(entry));

        return {
          id: person.id,
          slug: person.slug,
          name: person.name,
          photoCount: person.photoIds.size,
          preview,
        };
      })
      .sort((left, right) => {
        if (right.photoCount !== left.photoCount) {
          return right.photoCount - left.photoCount;
        }
        return left.name.localeCompare(right.name);
      }),
  };
}

export async function getPersonPageData(slug: string) {
  const files = await readDataFiles();
  const faceIndex = await loadFaceIndex();
  const photoMap = buildPhotoMap(files.photos.photos);
  const person = groupPeople(files.people.people).find(
    (entry) => entry.slug === slug,
  );

  if (!person) {
    return null;
  }

  return {
    eventTitle: files.site.eventTitle,
    person: {
      id: person.id,
      slug: person.slug,
      name: person.name,
      photoCount: person.photoIds.size,
      photos: Array.from(person.photoIds)
        .sort()
        .map((photoId) => {
          const photo = photoMap.get(photoId);
          const face = Array.from(person.faceIds)
            .map((faceId) => faceIndex.get(faceId))
            .find((entry) => entry?.photoId === photoId);

          return {
            id: photoId,
            url: photo ? buildPhotoUrl(photo) : null,
            absolutePath: photo?.absolute_path ?? null,
            face,
          };
        }),
    },
  };
}

export async function getMomentPageData(sectionId: string) {
  const files = await readDataFiles();
  const photoMap = buildPhotoMap(files.photos.photos);
  const section = buildChronologicalSections(
    files.timeline.sections,
    files.photos.photos,
  ).find((entry) => entry.id === sectionId);

  if (!section) {
    return null;
  }

  return {
    eventTitle: files.site.eventTitle,
    section: {
      id: section.id,
      title: section.title,
      description: SECTION_DESCRIPTIONS[section.id] ?? null,
      coverPhoto: toPhotoView(
        photoMap.get(section.coverPhoto ?? "") ??
          photoMap.get(section.inferredPhotoIds[0] ?? ""),
      ),
      photos: section.inferredPhotoIds
        .map((photoId) => photoMap.get(photoId))
        .filter((photo): photo is PhotoRecord => Boolean(photo))
        .map((photo) => ({
          id: photo.id,
          filename: photo.filename,
          url: buildPhotoUrl(photo),
        })),
    },
  };
}

export async function getCurationData() {
  const files = await readDataFiles();
  const photoMap = buildPhotoMap(files.photos.photos);

  return {
    eventTitle: files.site.eventTitle,
    heroPhotoId: files.site.heroPhotoId,
    heroCaption: files.site.heroCaption,
    targets: [
      {
        id: "hero",
        label: "Main Header",
        photoId: files.site.heroPhotoId,
        photo: toPhotoView(photoMap.get(files.site.heroPhotoId ?? "")),
      },
      ...files.timeline.sections.map((section) => ({
        id: `section:${section.id}`,
        label: section.title,
        photoId: section.coverPhoto,
        photo: toPhotoView(photoMap.get(section.coverPhoto ?? "")),
      })),
    ],
    photos: files.photos.photos.map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      absolutePath: photo.absolute_path,
      url: buildPhotoUrl(photo),
    })),
  };
}

function averageEncoding(encodings: number[][]) {
  if (encodings.length === 0) {
    return null;
  }

  const width = encodings[0]?.length ?? 0;
  const sums = new Array<number>(width).fill(0);
  for (const encoding of encodings) {
    for (let index = 0; index < width; index += 1) {
      sums[index] += encoding[index] ?? 0;
    }
  }
  return sums.map((value) => value / encodings.length);
}

function euclideanDistance(left: number[], right: number[]) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    total += delta * delta;
  }
  return Math.sqrt(total);
}

export async function getPeopleSuggestionsData() {
  const files = await readDataFiles();
  const faceEncodings = await loadFaceEncodingIndex();
  const groupedPeople = groupPeople(files.people.people);

  const enriched = groupedPeople
    .map((person) => {
      const faces = Array.from(person.faceIds)
        .map((faceId) => faceEncodings.get(faceId))
        .filter((face): face is FaceEncodingEntry => Boolean(face));

      return {
        id: person.id,
        slug: person.slug,
        name: person.name,
        memberIds: Array.from(person.memberIds).sort(),
        photoCount: person.photoIds.size,
        faceCount: faces.length,
        faces,
        centroid: averageEncoding(faces.map((face) => face.encoding)),
      };
    })
    .filter((person) => person.centroid && person.faces.length > 0);

  const suggestions: Array<{
    left: {
      id: string;
      name: string;
      slug: string;
      photoCount: number;
      faceCount: number;
      samples: FaceEncodingEntry[];
    };
    right: {
      id: string;
      name: string;
      slug: string;
      photoCount: number;
      faceCount: number;
      samples: FaceEncodingEntry[];
    };
    centroidDistance: number;
    closestFaceDistance: number;
  }> = [];

  for (let leftIndex = 0; leftIndex < enriched.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < enriched.length; rightIndex += 1) {
      const left = enriched[leftIndex];
      const right = enriched[rightIndex];

      if (left.name.trim().toLowerCase() === right.name.trim().toLowerCase()) {
        continue;
      }

      const centroidDistance = euclideanDistance(
        left.centroid as number[],
        right.centroid as number[],
      );

      let closestFaceDistance = Number.POSITIVE_INFINITY;
      for (const leftFace of left.faces) {
        for (const rightFace of right.faces) {
          const distance = euclideanDistance(leftFace.encoding, rightFace.encoding);
          if (distance < closestFaceDistance) {
            closestFaceDistance = distance;
          }
        }
      }

      suggestions.push({
        left: {
          id: left.id,
          name: left.name,
          slug: left.slug,
          photoCount: left.photoCount,
          faceCount: left.faceCount,
          samples: left.faces.slice(0, 3),
        },
        right: {
          id: right.id,
          name: right.name,
          slug: right.slug,
          photoCount: right.photoCount,
          faceCount: right.faceCount,
          samples: right.faces.slice(0, 3),
        },
        centroidDistance,
        closestFaceDistance,
      });
    }
  }

  suggestions.sort((left, right) => {
    if (left.closestFaceDistance !== right.closestFaceDistance) {
      return left.closestFaceDistance - right.closestFaceDistance;
    }
    return left.centroidDistance - right.centroidDistance;
  });

  return {
    totalPeople: groupedPeople.length,
    suggestions: suggestions.slice(0, 30),
  };
}

export async function getUnnamedPeopleData() {
  const data = await getPeopleAdminData();

  return {
    people: data.people.filter((person) => isNeedsReviewPerson(person)),
  };
}

export async function getLabelInboxData() {
  const files = await readDataFiles();
  const groupedPeople = groupPeople(files.people.people);
  const faceEncodings = await loadFaceEncodingIndex();
  const pendingClusters = files.review.clusters.filter(
    (cluster) => cluster.review.status === "pending",
  );

  const peopleCentroids = groupedPeople
    .map((person) => {
      const faces = Array.from(person.faceIds)
        .map((faceId) => faceEncodings.get(faceId))
        .filter((face): face is FaceEncodingEntry => Boolean(face));

      return {
        name: person.name,
        centroid: averageEncoding(faces.map((face) => face.encoding)),
      };
    })
    .filter((person) => person.centroid);

  const queue = pendingClusters.map((cluster) => {
    const encodings = cluster.faces
      .map((face) => faceEncodings.get(face.id))
      .filter((face): face is FaceEncodingEntry => Boolean(face))
      .map((face) => face.encoding);
    const centroid = averageEncoding(encodings);
    const suggestions = centroid
      ? peopleCentroids
          .map((person) => ({
            name: person.name,
            distance: euclideanDistance(centroid, person.centroid as number[]),
          }))
          .sort((left, right) => left.distance - right.distance)
          .slice(0, 6)
      : [];

    return {
      id: cluster.id,
      faceCount: cluster.faceCount,
      photoCount: cluster.photoCount,
      faces: cluster.faces,
      suggestions,
    };
  });

  return {
    knownNames: groupedPeople.map((person) => person.name).sort((a, b) => a.localeCompare(b)),
    queue,
    summary: files.review.summary,
  };
}

export async function getUnclusteredInboxData() {
  const files = await readDataFiles();
  const groupedPeople = groupPeople(files.people.people);
  const faceEncodings = await loadFaceEncodingIndex();

  const peopleCentroids = groupedPeople
    .map((person) => {
      const faces = Array.from(person.faceIds)
        .map((faceId) => faceEncodings.get(faceId))
        .filter((face): face is FaceEncodingEntry => Boolean(face));

      return {
        name: person.name,
        centroid: averageEncoding(faces.map((face) => face.encoding)),
      };
    })
    .filter((person) => person.centroid);

  const faces = (files.review as {
    summary: ReviewSummary;
    clusters: ReviewCluster[];
    unclusteredFaces?: Array<{
      id: string;
      photoId: string;
      photoPath: string;
      bbox: { top: number; right: number; bottom: number; left: number };
      thumbnailPath: string | null;
    }>;
  }).unclusteredFaces ?? [];

  return {
    summary: files.review.summary,
    knownNames: groupedPeople.map((person) => person.name).sort((a, b) => a.localeCompare(b)),
    faces: faces.map((face) => {
      const encodingEntry = faceEncodings.get(face.id);
      const suggestions = encodingEntry
        ? peopleCentroids
            .map((person) => ({
              name: person.name,
              distance: euclideanDistance(
                encodingEntry.encoding,
                person.centroid as number[],
              ),
            }))
            .sort((left, right) => left.distance - right.distance)
            .slice(0, 6)
        : [];

      return {
        ...face,
        suggestions,
      };
    }),
  };
}
