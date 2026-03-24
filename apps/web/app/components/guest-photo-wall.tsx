"use client";

import { useMemo, useState } from "react";

type Marker = {
  id: string;
  title: string;
  description?: string;
};

type Photo = {
  id: string;
  filename: string;
  url: string;
  cardUrl?: string;
  sectionMarker?: Marker | null;
};

export function GuestPhotoWall({
  photos,
  tall = false,
}: {
  photos: Photo[];
  tall?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const activePhoto = activeIndex === null ? null : photos[activeIndex] ?? null;
  const photoClassName = tall ? "gallery-card gallery-card-tall" : "gallery-card";

  const canGoPrevious = useMemo(
    () => activeIndex !== null && activeIndex > 0,
    [activeIndex],
  );
  const canGoNext = useMemo(
    () => activeIndex !== null && activeIndex < photos.length - 1,
    [activeIndex, photos.length],
  );

  function close() {
    setActiveIndex(null);
    setTouchStart(null);
  }

  function goPrevious() {
    setActiveIndex((current) =>
      current === null ? current : Math.max(0, current - 1),
    );
  }

  function goNext() {
    setActiveIndex((current) =>
      current === null ? current : Math.min(photos.length - 1, current + 1),
    );
  }

  return (
    <>
      <section className="photo-wall">
        {photos.map((photo, index) => (
          <div key={photo.id} className="photo-wall-slot">
            {photo.sectionMarker ? (
              <div id={`moment-${photo.sectionMarker.id}`} className="section-anchor-card">
                <p className="eyebrow">Jumped To</p>
                <h2>{photo.sectionMarker.title}</h2>
                {photo.sectionMarker.description ? (
                  <p className="panel-copy">{photo.sectionMarker.description}</p>
                ) : null}
              </div>
            ) : null}
            <figure
              className={`${photoClassName} gallery-card-clickable`}
              onClick={() => setActiveIndex(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
            >
              <img
                src={photo.cardUrl ?? photo.url}
                alt={photo.filename}
                loading="lazy"
                decoding="async"
              />
              <figcaption>{photo.id}</figcaption>
            </figure>
          </div>
        ))}
      </section>

      {activePhoto ? (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="lightbox-stage"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) =>
              setTouchStart(event.changedTouches[0]?.clientX ?? null)
            }
            onTouchEnd={(event) => {
              const end = event.changedTouches[0]?.clientX ?? null;
              if (touchStart === null || end === null) {
                return;
              }
              const delta = end - touchStart;
              if (delta > 40 && canGoPrevious) {
                goPrevious();
              } else if (delta < -40 && canGoNext) {
                goNext();
              }
              setTouchStart(null);
            }}
          >
            <button type="button" className="lightbox-close" onClick={close}>
              Close
            </button>
            <div className="lightbox-image-shell">
              <img src={activePhoto.url} alt={activePhoto.filename} className="lightbox-image" />
            </div>
            <div className="lightbox-meta">
              <span>{activePhoto.id}</span>
              <span>{(activeIndex ?? 0) + 1} / {photos.length}</span>
            </div>
            <div className="lightbox-actions">
              <button
                type="button"
                className="review-button review-button-muted"
                onClick={goPrevious}
                disabled={!canGoPrevious}
              >
                Previous
              </button>
              <button
                type="button"
                className="review-button"
                onClick={goNext}
                disabled={!canGoNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
