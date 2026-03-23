import Link from "next/link";
import { getPeopleSuggestionsData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function PeopleSuggestionsPage() {
  const data = await getPeopleSuggestionsData();

  return (
    <main className="review-shell">
      <section className="panel review-header">
        <p className="eyebrow">Duplicate Suggestions</p>
        <h1>Possible Same Person</h1>
        <p className="panel-copy">
          These are the closest-looking grouped people based on face embeddings from the current scan.
        </p>
        <p className="panel-copy">
          If two cards are actually the same person, rename both rows to the same final name in
          the people editor.
        </p>
        <div className="hero-actions">
          <Link href="/people" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To People
          </Link>
          <Link href="/" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To Home
          </Link>
        </div>
        <p className="review-note">Showing top {data.suggestions.length} suggestions across {data.totalPeople} grouped people.</p>
      </section>

      <section className="review-grid">
        {data.suggestions.map((suggestion, index) => (
          <article key={`${suggestion.left.id}-${suggestion.right.id}`} className="cluster-card">
            <div className="people-card-header">
              <div>
                <p className="eyebrow">Suggestion {index + 1}</p>
                <h2>
                  {suggestion.left.name} / {suggestion.right.name}
                </h2>
              </div>
              <div className="cluster-meta">
                <span className="cluster-tag">
                  closest face {suggestion.closestFaceDistance.toFixed(3)}
                </span>
                <span className="cluster-tag">
                  centroid {suggestion.centroidDistance.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="suggestion-grid">
              <section className="suggestion-person">
                <div className="suggestion-header">
                  <div>
                    <h3>{suggestion.left.name}</h3>
                    <p className="panel-copy">
                      {suggestion.left.photoCount} photos, {suggestion.left.faceCount} faces
                    </p>
                  </div>
                  <Link href={`/people?search=${encodeURIComponent(suggestion.left.name)}`} className="inline-link">
                    Open in editor
                  </Link>
                </div>
                <div className="thumb-grid">
                  {suggestion.left.samples.map((face) => (
                    <figure key={face.faceId} className="thumb-card">
                      <div className="thumb-frame">
                        <img
                          src={`/api/face-crop?path=${encodeURIComponent(
                            face.photoPath,
                          )}&top=${face.bbox.top}&right=${face.bbox.right}&bottom=${face.bbox.bottom}&left=${face.bbox.left}`}
                          alt={face.photoId}
                        />
                      </div>
                      <figcaption className="thumb-caption">{face.photoId}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <section className="suggestion-person">
                <div className="suggestion-header">
                  <div>
                    <h3>{suggestion.right.name}</h3>
                    <p className="panel-copy">
                      {suggestion.right.photoCount} photos, {suggestion.right.faceCount} faces
                    </p>
                  </div>
                  <Link href={`/people?search=${encodeURIComponent(suggestion.right.name)}`} className="inline-link">
                    Open in editor
                  </Link>
                </div>
                <div className="thumb-grid">
                  {suggestion.right.samples.map((face) => (
                    <figure key={face.faceId} className="thumb-card">
                      <div className="thumb-frame">
                        <img
                          src={`/api/face-crop?path=${encodeURIComponent(
                            face.photoPath,
                          )}&top=${face.bbox.top}&right=${face.bbox.right}&bottom=${face.bbox.bottom}&left=${face.bbox.left}`}
                          alt={face.photoId}
                        />
                      </div>
                      <figcaption className="thumb-caption">{face.photoId}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
