import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  const src = request.nextUrl.searchParams.get("src");
  const top = Number(request.nextUrl.searchParams.get("top"));
  const right = Number(request.nextUrl.searchParams.get("right"));
  const bottom = Number(request.nextUrl.searchParams.get("bottom"));
  const left = Number(request.nextUrl.searchParams.get("left"));

  if (
    (!path && !src) ||
    [top, right, bottom, left].some((value) => Number.isNaN(value))
  ) {
    return new Response("Missing crop parameters", { status: 400 });
  }

  try {
    const input = path
      ? await readFile(path)
      : Buffer.from(await (await fetch(src as string)).arrayBuffer());
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const buffer = await sharp(input)
      .extract({ left, top, width, height })
      .resize(256, 256, { fit: "inside" })
      .jpeg({ quality: 90 })
      .toBuffer();

    return new Response(buffer, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response("Could not crop image", { status: 404 });
  }
}
