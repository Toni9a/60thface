"use client";

import { useMemo, useState } from "react";
import { buildFaceCropUrl } from "../../lib/image-source";

type FaceItem = {
  id: string;
  photoId: string;
  photoPath: string;
  bbox: { top: number; right: number; bottom: number; left: number };
  thumbnailPath: string | null;
  suggestions: Array<{
    name: string;
    distance: number;
  }>;
};

export function UnclusteredInbox({
  initialFaces,
  knownNames,
}: {
  initialFaces: FaceItem[];
  knownNames: string[];
}) {
  const [faces, setFaces] = useState(initialFaces);
  const [index, setIndex] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const active = faces[index] ?? null;
  const progressLabel = useMemo(() => {
    if (faces.length === 0 || !active) {
      return "Queue complete";
    }
    return `${index + 1} of ${faces.length}`;
  }, [active, faces.length, index]);

  async function submit(action: "approve-unclustered" | "reject-unclustered") {
    if (!active) {
      return;
    }

    const name = draftName.trim();
    if (action === "approve-unclustered" && !name) {
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
          unclusteredFaceId: active.id,
          action,
          label: name,
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Save failed.");
      }

      setFaces((current) => current.filter((item) => item.id !== active.id));
      setIndex((current) => {
        const nextLength = faces.length - 1;
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
    if (faces.length === 0) {
      return;
    }
    setDraftName("");
    setError("");
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) {
        return 0;
      }
      if (next >= faces.length) {
        return faces.length - 1;
      }
      return next;
    });
  }

  if (!active) {
    return (
      <article className="cluster-card">
        <h2>Unclustered Queue Clear</h2>
        <p className="panel-copy">There are no unclustered faces left in the current run.</p>
      </article>
    );
  }

  return (
    <article className="cluster-card">
      <div className="people-card-header">
        <div>
          <p className="eyebrow">Unclustered Face</p>
          <h2>{progressLabel}</h2>
          <p className="panel-copy">{active.photoId}</p>
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

      <div className="unclustered-face-stage">
        <div className="unclustered-face-frame">
          <img
            src={buildFaceCropUrl(active)}
            alt={active.photoId}
          />
        </div>
      </div>

      <div className="people-edit-bar">
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          list="known-people-names-unclustered"
          className="review-input"
          placeholder="Match existing name or type a new one"
          disabled={busy}
        />
        <datalist id="known-people-names-unclustered">
          {knownNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => void submit("approve-unclustered")}
          className="review-button"
          disabled={busy}
        >
          {busy ? "Saving..." : "Save Name"}
        </button>
        <button
          type="button"
          onClick={() => void submit("reject-unclustered")}
          className="review-button review-button-muted"
          disabled={busy}
        >
          Not Useful
        </button>
      </div>
      {error ? <p className="review-error">{error}</p> : null}
    </article>
  );
}
