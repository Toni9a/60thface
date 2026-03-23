"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ReviewActions({
  clusterId,
  faces,
}: {
  clusterId: string;
  faces: Array<{ id: string; photoId: string; thumbnailPath: string | null }>;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit(action: "approve" | "not-face" | "remove-face", faceId?: string) {
    if (action === "approve" && !label.trim()) {
      setError("Enter a name before approving.");
      return;
    }

    if (action === "remove-face" && !faceId) {
      setError("Missing face selection.");
      return;
    }

    setError("");

    const response = await fetch("/api/review/cluster", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        clusterId,
        action,
        label: label.trim(),
        faceId,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      setError(message || "Action failed.");
      return;
    }

    if (action === "approve") {
      setLabel("");
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <div className="thumb-grid">
        {faces.map((face) => (
          <figure key={face.id} className="thumb-card">
            <div className="thumb-frame thumb-frame-actionable">
              <img
                src={`/api/local-image?path=${encodeURIComponent(
                  face.thumbnailPath ?? "",
                )}`}
                alt={face.id}
              />
              <button
                type="button"
                onClick={() => void submit("remove-face", face.id)}
                className="thumb-remove"
                disabled={isPending}
                aria-label={`Remove ${face.photoId} from cluster`}
                title={`Remove ${face.photoId}`}
              >
                x
              </button>
            </div>
            <figcaption className="thumb-caption">{face.photoId}</figcaption>
          </figure>
        ))}
      </div>

      <div className="review-actions">
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Person name"
          className="review-input"
          disabled={isPending}
        />
        <button
          type="button"
          onClick={() => void submit("approve")}
          className="review-button"
          disabled={isPending}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => void submit("not-face")}
          className="review-button review-button-muted"
          disabled={isPending}
        >
          Not Face
        </button>
      </div>
      {error ? <p className="review-error">{error}</p> : null}
    </>
  );
}
