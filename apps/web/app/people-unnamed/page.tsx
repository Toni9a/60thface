import Link from "next/link";
import { getUnnamedPeopleData } from "../../lib/data";
import { buildFaceCropUrl } from "../../lib/image-source";

export const dynamic = "force-dynamic";

export default async function UnnamedPeoplePage() {
  const data = await getUnnamedPeopleData();

  return (
    <main className="review-shell">
      <section className="panel review-header">
        <p className="eyebrow">Needs Review</p>
        <h1>People To Clean Up</h1>
        <p className="panel-copy">
          This page shows placeholders, tiny groups, and fragmented names that still likely need
          cleanup.
        </p>
        <div className="hero-actions">
          <Link href="/people" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To People
          </Link>
          <Link href="/" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To Home
          </Link>
        </div>
      </section>

      <section className="review-grid">
        {data.people.length === 0 ? (
          <article className="cluster-card">
            <h2>No Cleanup Candidates</h2>
            <p className="panel-copy">Everything currently looks named and consolidated.</p>
          </article>
        ) : (
          data.people.map((person) => (
            <article key={person.memberIds.join("|")} className="cluster-card people-card">
              <div className="people-card-header">
                <div>
                  <p className="eyebrow">Current Name</p>
                  <h2>{person.name}</h2>
                </div>
                <div className="cluster-meta">
                  <span className="cluster-tag">{person.photoIds.length} photos</span>
                  <span className="cluster-tag">{person.memberIds.length} raw records</span>
                </div>
              </div>
              <div className="thumb-grid">
                {person.photos.map((photo) => (
                  <figure key={photo.faceId} className="thumb-card">
                    <div className="thumb-frame">
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
                    </div>
                    <figcaption className="thumb-caption">{photo.photoId}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="hero-actions">
                <Link
                  href={`/people?search=${encodeURIComponent(person.name)}`}
                  className="inline-link"
                >
                  Open In People Editor
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
