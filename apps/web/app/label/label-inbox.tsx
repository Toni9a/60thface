"use client";

import { useMemo, useState } from "react";
import { buildFaceCropUrl } from "../../lib/image-source";

type QueueItem = {
  id: string;
  faceCount: number;
  photoCount: number;
  faces: Array<{
    id: string;
    photoId: string;
    photoPath: string;
    bbox: { top: number; right: number; bottom: number; left: number };
    thumbnailPath: string | null;
  }>;
  suggestions: Array<{
    name: string;
    distance: number;
  }>;
};

export function LabelInbox({
  initialQueue,
  knownNames,
}: {
  initialQueue: QueueItem[];
  knownNames: string[];
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const active = queue[index] ?? null;
  const progressLabel = useMemo(() => {
    if (queue.length === 0 || !active) {
      return "Queue complete";
    }
    return `${index + 1} of ${queue.length}`;
  }, [active, index, queue.length]);

  async function submit(action: "approve" | "not-face") {
    if (!active) {
      return;
    }

    const name = draftName.trim();
    if (action === "approve" && !name) {
      setError("Type a name or tap a suggestion first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/review/cluster", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          clusterId: active.id,
          action,
          label: name,
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Save failed.");
      }

      setQueue((current) => current.filter((item) => item.id !== active.id));
      setIndex((current) => {
        const nextLength = queue.length - 1;
        return Math.max(0, Math.min(current, nextLength - 1));
      });
      setDraftName("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  function skip(direction: 1 | -1 = 1) {
    if (queue.length === 0) {
      return;
    }
    setDraftName("");
    setError("");
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) {
        return 0;
      }
      if (next >= queue.length) {
        return queue.length - 1;
      }
      return next;
    });
  }

  if (!active) {
    return (
      <article className="cluster-card">
        <h2>Labeling Queue Clear</h2>
        <p className="panel-copy">There are no pending clusters in the current full-gallery run.</p>
      </article>
    );
  }

  return (
    <article className="cluster-card">
      <div className="people-card-header">
        <div>
          <p className="eyebrow">Label Inbox</p>
          <h2>{progressLabel}</h2>
          <p className="panel-copy">
            {active.faceCount} faces across {active.photoCount} photos
          </p>
        </div>
        <div className="hero-actions" style={{ marginTop: 0 }}>
          <button type="button" onClick={() => skip(-1)} className="inline-link">
            Previous
          </button>
          <button type="button" onClick={() => skip(1)} className="inline-link">
            Skip
          </button>
        </div>
      </div>

      <div className="suggestion-bar">
        {active.suggestions.map((suggestion) => (
          <button
            key={`${active.id}-${suggestion.name}`}
            type="button"
            className="cluster-tag suggestion-chip"
            onClick={() => setDraftName(suggestion.name)}
          >
            {suggestion.name}
          </button>
        ))}
      </div>

      <div className="thumb-grid">
        {active.faces.map((face) => (
          <figure key={face.id} className="thumb-card">
            <div className="thumb-frame">
              <img
                src={buildFaceCropUrl(face)}
                alt={face.photoId}
              />
            </div>
            <figcaption className="thumb-caption">{face.photoId}</figcaption>
          </figure>
        ))}
      </div>

      <div className="people-edit-bar">
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          list="known-people-names"
          className="review-input"
          placeholder="Type a new name or choose an existing one"
          disabled={busy}
        />
        <datalist id="known-people-names">
          {knownNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => void submit("approve")}
          className="review-button"
          disabled={busy}
        >
          {busy ? "Saving..." : "Save Name"}
        </button>
        <button
          type="button"
          onClick={() => void submit("not-face")}
          className="review-button review-button-muted"
          disabled={busy}
        >
          Not Face
        </button>
      </div>
      {error ? <p className="review-error">{error}</p> : null}
    </article>
  );
}
