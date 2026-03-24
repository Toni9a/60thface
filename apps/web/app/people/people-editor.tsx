"use client";

import { useEffect, useState } from "react";
import { buildFaceCropUrl } from "../../lib/image-source";

export type AdminPerson = {
  id: string;
  name: string;
  photoIds: string[];
  sourceIds: string[];
  memberIds: string[];
  photos: Array<{
    faceId: string;
    photoId: string;
    photoPath: string | null;
    bbox: { top: number; right: number; bottom: number; left: number } | null;
  }>;
};

export function PeopleEditor({
  person,
  onRename,
  onRemovePhoto,
}: {
  person: AdminPerson;
  onRename: (memberIds: string[], name: string) => Promise<void>;
  onRemovePhoto: (memberIds: string[], photoId: string) => Promise<void>;
}) {
  const [draftName, setDraftName] = useState(person.name);
  const [isSaving, setIsSaving] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftName(person.name);
    setError("");
    setIsSaving(false);
    setRemovingPhotoId(null);
  }, [person.name, person.memberIds]);

  async function save() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onRename(person.memberIds, trimmed);
    } catch (message: unknown) {
      setError(typeof message === "string" ? message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removePhoto(photoId: string) {
    setRemovingPhotoId(photoId);
    setError("");
    try {
      await onRemovePhoto(person.memberIds, photoId);
    } catch (message: unknown) {
      setError(typeof message === "string" ? message : "Remove failed.");
    } finally {
      setRemovingPhotoId(null);
    }
  }

  return (
    <article className="cluster-card people-card">
      <div className="people-card-header">
        <div>
          <p className="eyebrow">Current Name</p>
          <h2>{person.name}</h2>
        </div>
        <div className="cluster-meta">
          <span className="cluster-tag">{person.photoIds.length} photos</span>
          <span className="cluster-tag">
            {person.sourceIds.length} source cluster
            {person.sourceIds.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="people-edit-bar">
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void save();
            }
          }}
          className="review-input"
        />
        <button
          type="button"
          onClick={() => void save()}
          className="review-button"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Name"}
        </button>
      </div>

      {error ? <p className="review-error">{error}</p> : null}

      <div className="thumb-grid">
        {person.photos.map((photo) => (
          <figure key={photo.faceId} className="thumb-card">
            <div className="thumb-frame" style={{ position: "relative" }}>
              {photo.photoPath && photo.bbox ? (
                <img
                  src={buildFaceCropUrl({
                    photoPath: photo.photoPath,
                    bbox: photo.bbox,
                  })}
                  alt={photo.photoId}
                />
              ) : (
                <div className="thumb-fallback">{photo.photoId}</div>
              )}
              <button
                type="button"
                onClick={() => void removePhoto(photo.photoId)}
                disabled={removingPhotoId === photo.photoId}
                aria-label={`Remove ${photo.photoId}`}
                className="thumb-remove"
              >
                {removingPhotoId === photo.photoId ? "..." : "x"}
              </button>
            </div>
            <figcaption className="thumb-caption">{photo.photoId}</figcaption>
          </figure>
        ))}
      </div>
    </article>
  );
}
