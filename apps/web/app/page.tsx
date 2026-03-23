import { getHomepageData } from "../lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main className="album-shell">
      <section className="landing-frame">
        <div className="hero-stage">
          <div className="hero-copy">
            <p className="eyebrow">Private Event Album</p>
            <h1>{data.eventTitle}</h1>
            <p className="intro">{data.heroCaption}</p>
          </div>
          <div className="hero-photo-shell">
            {data.heroPhoto ? (
              <img
                src={data.heroPhoto.url}
                alt={data.eventTitle}
                className="hero-photo"
              />
            ) : (
              <div className="hero-photo-placeholder">Pick a header photo in Curate</div>
            )}
          </div>
          <div className="hero-actions hero-actions-home">
            <Link href="/all-photos" className="hero-link hero-link-home">
              <span>View All Photos</span>
              <span className="cta-arrow">›</span>
            </Link>
            <Link href="/people-gallery" className="hero-link hero-link-home">
              <span>People Gallery</span>
              <span className="cta-arrow">›</span>
            </Link>
          </div>
        </div>

        <div className="quick-links">
          {data.sections.map((section) => (
            <a key={section.id} href={section.anchorHref} className="moment-card">
              <div className="moment-thumb">
                {section.coverPhoto ? (
                  <img src={section.coverPhoto.url} alt={section.title} />
                ) : (
                  <div className="moment-placeholder">{section.title}</div>
                )}
              </div>
              <div className="moment-copy">
                <span>{section.title}</span>
                <span className="meta">
                  {section.photoIds.length > 0 ? `${section.photoIds.length} photos in this stretch` : "Jump point ready"}
                </span>
              </div>
              <span className="moment-arrow">›</span>
            </a>
          ))}
        </div>

        <section className="people-strip">
          <div className="people-strip-header">
            <h2>Choose a Person</h2>
          </div>
          <div className="face-row">
            {data.featuredPeople.map((person) => (
              <Link
                key={person.id}
                href={`/people-gallery/${person.slug}`}
                className="face-pill"
              >
                <div className="face-pill-photo">
                  {person.face ? (
                    <img
                      src={`/api/face-crop?path=${encodeURIComponent(
                        person.face.photoPath,
                      )}&top=${person.face.bbox.top}&right=${person.face.bbox.right}&bottom=${person.face.bbox.bottom}&left=${person.face.bbox.left}`}
                      alt={person.name}
                    />
                  ) : (
                    <div className="face-placeholder">{person.name.slice(0, 1)}</div>
                  )}
                </div>
                <span>{person.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-ribbon">
        <span>{data.photoCount} photos indexed</span>
        <span>{data.reviewSummary.clusterCount} cleanup clusters pending internal review history</span>
        <div className="hero-actions">
          <Link href="/curate" className="hero-link hero-link-dark">
            Curate Covers
          </Link>
          <Link href="/review" className="hero-link hero-link-dark">
            Review Faces
          </Link>
          <Link href="/people" className="hero-link hero-link-dark">
            Edit Names
          </Link>
        </div>
      </section>
    </main>
  );
}
