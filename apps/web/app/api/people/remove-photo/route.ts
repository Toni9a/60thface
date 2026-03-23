import {
  appendPeopleLog,
  PEOPLE_PATH,
  readJson,
  type PeoplePayload,
  writeJson,
} from "../../../../lib/people-store";
import { getPeopleAdminData } from "../../../../lib/data";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    personId?: string;
    memberIds?: string[];
    photoId?: string;
  };
  const personId = String(body.personId ?? "").trim();
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const photoId = String(body.photoId ?? "").trim();

  if (!personId && memberIds.length === 0) {
    return new Response("Missing person target", { status: 400 });
  }

  if (!photoId) {
    return new Response("Missing photo id", { status: 400 });
  }

  const peoplePayload = await readJson<PeoplePayload>(PEOPLE_PATH);
  const targetEntries = peoplePayload.people.filter((entry) =>
    memberIds.length > 0 ? memberIds.includes(entry.id) : entry.id === personId,
  );
  const person = targetEntries[0];

  if (!person || targetEntries.length === 0) {
    return new Response("Person not found", { status: 404 });
  }

  const affectedPersonIds: string[] = [];
  const removedFaceIds = new Set<string>();

  for (const entry of targetEntries) {
    const hadPhoto = entry.photoIds.includes(photoId);
    const nextPhotoIds = entry.photoIds.filter((id) => id !== photoId);
    const entryRemovedFaceIds = (entry.faceIds ?? []).filter((faceId) =>
      faceId.startsWith(`${photoId}-face-`),
    );
    const nextFaceIds = (entry.faceIds ?? []).filter(
      (faceId) => !faceId.startsWith(`${photoId}-face-`),
    );

    if (!hadPhoto && entryRemovedFaceIds.length === 0) {
      continue;
    }

    affectedPersonIds.push(entry.id);
    for (const faceId of entryRemovedFaceIds) {
      removedFaceIds.add(faceId);
    }

    entry.photoIds = Array.from(new Set(nextPhotoIds)).sort();
    entry.faceIds = Array.from(new Set(nextFaceIds)).sort();
  }

  peoplePayload.people = peoplePayload.people.filter(
    (entry) => entry.photoIds.length > 0 || (entry.faceIds ?? []).length > 0,
  );
  peoplePayload.updatedAt = new Date().toISOString();
  peoplePayload.people.sort((left, right) => left.name.localeCompare(right.name));

  await writeJson(PEOPLE_PATH, peoplePayload);
  await appendPeopleLog(peoplePayload, {
    action: "remove-photo-from-person",
    personId: personId || null,
    memberIds,
    personName: person.name,
    photoId,
    affectedPersonIds,
    removedFaceIds: Array.from(removedFaceIds).sort(),
  });

  const nextData = await getPeopleAdminData();
  return Response.json({
    ok: true,
    affectedPersonIds,
    removedFaceIds: Array.from(removedFaceIds).sort(),
    people: nextData.people,
  });
}
