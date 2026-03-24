import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isLocalAdminEnabled } from "../../../lib/local-admin";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const SITE_PATH = path.join(REPO_ROOT, "data", "site.json");
const TIMELINE_PATH = path.join(REPO_ROOT, "data", "timeline.json");

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJson(filePath: string, payload: unknown) {
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export async function POST(request: Request) {
  if (!isLocalAdminEnabled()) {
    return new Response("Local admin only", { status: 403 });
  }
  const body = (await request.json()) as {
    targetId?: string;
    photoId?: string | null;
  };

  const targetId = String(body.targetId ?? "").trim();
  const photoId =
    body.photoId === null ? null : String(body.photoId ?? "").trim() || null;

  if (!targetId) {
    return new Response("Missing target id", { status: 400 });
  }

  const [site, timeline] = await Promise.all([
    readJson<{
      eventTitle: string;
      heroPhotoId: string | null;
      heroCaption: string;
    }>(SITE_PATH),
    readJson<{
      sections: Array<{
        id: string;
        title: string;
        coverPhoto: string | null;
        photoIds: string[];
      }>;
    }>(TIMELINE_PATH),
  ]);

  if (targetId === "hero") {
    site.heroPhotoId = photoId;
    await writeJson(SITE_PATH, site);
    return Response.json({ ok: true });
  }

  if (!targetId.startsWith("section:")) {
    return new Response("Unsupported target", { status: 400 });
  }

  const sectionId = targetId.replace("section:", "");
  const section = timeline.sections.find((entry) => entry.id === sectionId);

  if (!section) {
    return new Response("Section not found", { status: 404 });
  }

  section.coverPhoto = photoId;
  await writeJson(TIMELINE_PATH, timeline);
  return Response.json({ ok: true });
}
