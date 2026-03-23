import { access, appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "../..");

export const PEOPLE_PATH = path.join(REPO_ROOT, "data", "people.json");
export const PEOPLE_LOG_PATH = path.join(REPO_ROOT, "data", "people-log.jsonl");

export type StoredPerson = {
  id: string;
  name: string;
  photoIds: string[];
  faceIds?: string[];
  sourceClusterId?: string;
  sourceClusterIds?: string[];
  sourceClusterKeys?: string[];
};

export type PeoplePayload = {
  updatedAt: string | null;
  people: StoredPerson[];
};

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeJson(filePath: string, payload: unknown) {
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

async function ensurePeopleLogSeeded(peoplePayload: PeoplePayload) {
  try {
    await access(PEOPLE_LOG_PATH);
    return;
  } catch {
    // Seed the append-only log with the current approved-people snapshot once.
  }

  const seedEntry = {
    timestamp: nowIso(),
    action: "snapshot",
    peopleCount: peoplePayload.people.length,
    people: peoplePayload.people.map((person) => ({
      id: person.id,
      name: person.name,
      photoIds: person.photoIds,
      faceIds: person.faceIds ?? [],
      sourceClusterKeys: person.sourceClusterKeys ?? [],
    })),
  };

  await appendFile(PEOPLE_LOG_PATH, `${JSON.stringify(seedEntry)}\n`, "utf-8");
}

export async function appendPeopleLog(
  peoplePayload: PeoplePayload,
  entry: Record<string, unknown>,
) {
  await ensurePeopleLogSeeded(peoplePayload);
  const payload = {
    timestamp: nowIso(),
    ...entry,
  };
  await appendFile(PEOPLE_LOG_PATH, `${JSON.stringify(payload)}\n`, "utf-8");
}
