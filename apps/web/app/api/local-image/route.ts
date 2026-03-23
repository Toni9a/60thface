import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  try {
    const data = await readFile(path);
    const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

    return new Response(data, {
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
