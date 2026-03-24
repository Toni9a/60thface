import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { NextRequest } from "next/server";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function getContentType(pathOrUrl: string) {
  const extension = pathOrUrl.slice(pathOrUrl.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[extension] ?? "image/jpeg";
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  const src = request.nextUrl.searchParams.get("src");
  const width = Number(request.nextUrl.searchParams.get("w") ?? "0");
  const quality = Number(request.nextUrl.searchParams.get("q") ?? "78");

  if (!path && !src) {
    return new Response("Missing image source", { status: 400 });
  }

  try {
    const input = path
      ? await readFile(path)
      : Buffer.from(await (await fetch(src as string)).arrayBuffer());

    if (!width || Number.isNaN(width) || width < 64) {
      return new Response(input, {
        headers: {
          "content-type": getContentType(path ?? (src as string)),
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }

    const buffer = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: Number.isNaN(quality) ? 78 : quality, mozjpeg: true })
      .toBuffer();

    return new Response(buffer, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
