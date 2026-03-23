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
    name?: string;
  };
  const personId = String(body.personId ?? "").trim();
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const name = String(body.name ?? "").trim();

  if (!personId && memberIds.length === 0) {
    return new Response("Missing person target", { status: 400 });
  }

  if (!name) {
    return new Response("Name cannot be empty", { status: 400 });
  }

  const peoplePayload = await readJson<PeoplePayload>(PEOPLE_PATH);
  const targetEntries = peoplePayload.people.filter((entry) =>
    memberIds.length > 0 ? memberIds.includes(entry.id) : entry.id === personId,
  );
  const person = targetEntries[0];

  if (!person || targetEntries.length === 0) {
    return new Response("Person not found", { status: 404 });
  }

  const previousName = person.name;
  for (const entry of targetEntries) {
    entry.name = name;
  }

  peoplePayload.updatedAt = new Date().toISOString();
  peoplePayload.people.sort((left, right) => left.name.localeCompare(right.name));

  await writeJson(PEOPLE_PATH, peoplePayload);
  await appendPeopleLog(peoplePayload, {
    action: "rename-person",
    personId: personId || null,
    memberIds,
    previousName,
    name,
  });
  const nextData = await getPeopleAdminData();
  return Response.json({ ok: true, people: nextData.people });
}
