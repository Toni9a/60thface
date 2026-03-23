"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Target = {
  id: string;
  label: string;
  photoId: string | null;
  photo: {
    id: string;
    filename: string;
    absolutePath: string;
    url: string;
  } | null;
};

type Photo = {
  id: string;
  filename: string;
  absolutePath: string;
  url: string;
};

export function CurationClient({
  targets,
  photos,
}: {
  targets: Target[];
  photos: Photo[];
}) {
  const router = useRouter();
  const [activeTargetId, setActiveTargetId] = useState(targets[0]?.id ?? "hero");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const filteredPhotos = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return photos;
    }

    return photos
      .filter(
        (photo) =>
          photo.id.toLowerCase().includes(normalized) ||
          photo.filename.toLowerCase().includes(normalized),
      );
  }, [photos, deferredQuery]);

  async function assign(photoId: string | null) {
    setError("");
    setNote("");

    const response = await fetch("/api/curate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        targetId: activeTargetId,
        photoId,
      }),
    });

    if (!response.ok) {
      setError((await response.text()) || "Could not save cover choice.");
      return;
    }

    setNote(photoId ? `Saved ${photoId}.` : "Cleared selection.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="curation-shell">
      <div className="curation-targets">
        {targets.map((target) => (
          <button
            key={target.id}
            type="button"
            className={`target-card ${activeTargetId === target.id ? "target-card-active" : ""}`}
            onClick={() => setActiveTargetId(target.id)}
          >
            <div className="target-thumb">
              {target.photo ? (
                <img src={target.photo.url} alt={target.label} />
              ) : (
                <div className="moment-placeholder">{target.label}</div>
              )}
            </div>
            <div className="target-copy">
              <strong>{target.label}</strong>
              <span>{target.photoId ?? "No photo selected"}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="curation-toolbar">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="review-input"
          placeholder="Search by photo id like 6q3a8491"
          disabled={isPending}
        />
        <button
          type="button"
          className="review-button review-button-muted"
          onClick={() => void assign(null)}
          disabled={isPending}
        >
          Clear Selection
        </button>
      </div>

      <p className="review-note">
        Showing {filteredPhotos.length} of {photos.length} photos.
      </p>

      {note ? <p className="review-note">{note}</p> : null}
      {error ? <p className="review-error">{error}</p> : null}

      <div className="curation-grid">
        {filteredPhotos.map((photo) => (
          <article key={photo.id} className="curation-photo-card">
            <div className="curation-photo">
              <img src={photo.url} alt={photo.filename} />
            </div>
            <div className="curation-photo-copy">
              <strong>{photo.id}</strong>
              <span>{photo.filename}</span>
            </div>
            <button
              type="button"
              className="review-button"
              onClick={() => void assign(photo.id)}
              disabled={isPending}
            >
              Use For Active Slot
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
