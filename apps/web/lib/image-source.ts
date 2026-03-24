function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getFilename(filePath: string) {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] ?? filePath;
}

export function getPublicPhotoBaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_PHOTO_BASE_URL ??
    process.env.PHOTO_BASE_URL ??
    "";
  return value ? trimTrailingSlash(value) : "";
}

export function buildPublicPhotoUrl(filenameOrPath: string) {
  const baseUrl = getPublicPhotoBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const filename = getFilename(filenameOrPath);
  return `${baseUrl}/${encodeURIComponent(filename)}`;
}

export function buildPhotoUrl(photo: {
  absolute_path: string;
  filename: string;
}) {
  return (
    buildPublicPhotoUrl(photo.filename) ??
    `/api/local-image?path=${encodeURIComponent(photo.absolute_path)}`
  );
}

export function buildSizedPhotoUrl(
  photo: {
    absolute_path: string;
    filename: string;
  },
  width: number,
  quality = 78,
) {
  const remoteSource = buildPublicPhotoUrl(photo.filename);
  if (remoteSource) {
    return `/api/image?src=${encodeURIComponent(remoteSource)}&w=${width}&q=${quality}`;
  }

  return `/api/image?path=${encodeURIComponent(photo.absolute_path)}&w=${width}&q=${quality}`;
}

export function buildFaceCropUrl(face: {
  photoPath: string;
  bbox: { top: number; right: number; bottom: number; left: number };
}) {
  const remoteSource = buildPublicPhotoUrl(face.photoPath);
  if (remoteSource) {
    return `/api/face-crop?src=${encodeURIComponent(remoteSource)}&top=${face.bbox.top}&right=${face.bbox.right}&bottom=${face.bbox.bottom}&left=${face.bbox.left}`;
  }

  return `/api/face-crop?path=${encodeURIComponent(face.photoPath)}&top=${face.bbox.top}&right=${face.bbox.right}&bottom=${face.bbox.bottom}&left=${face.bbox.left}`;
}
