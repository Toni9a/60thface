import { getHomepageData } from "../lib/data";
import Link from "next/link";
import { buildFaceCropUrl } from "../lib/image-source";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <main className="album-shell">
      <section className="landing-frame">
        <div className="hero-stage">
          <div className="hero-topbar">
            <a
              href={data.googlePhotosUrl}
              target="_blank"
              rel="noreferrer"
              className="google-photos-link"
              aria-label="View in Google Photos"
            >
              <span>Add your own</span>
            </a>
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Private Event Album</p>
            <h1>{data.eventTitle}</h1>
            <p className="intro">{data.heroCaption}</p>
          </div>
          <div className="hero-photo-shell">
            {data.heroPhoto ? (
              <img
                src={data.heroPhoto.mediumUrl ?? data.heroPhoto.url}
                alt={data.eventTitle}
                className="hero-photo"
                fetchPriority="high"
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
          {data.adminEnabled ? (
            <Link href="/label" className="hero-link hero-link-home">
              <span>Label Faces</span>
              <span className="cta-arrow">›</span>
            </Link>
          ) : null}
          {data.adminEnabled ? (
            <Link href="/unclustered" className="hero-link hero-link-home">
              <span>Singles Inbox</span>
              <span className="cta-arrow">›</span>
            </Link>
          ) : null}
        </div>
        </div>

        <div className="quick-links">
          {data.sections.map((section) => (
            <a key={section.id} href={section.anchorHref} className="moment-card">
              <div className="moment-thumb">
                {section.coverPhoto ? (
                  <img
                    src={section.coverPhoto.thumbUrl ?? section.coverPhoto.url}
                    alt={section.title}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="moment-placeholder">{section.title}</div>
                )}
              </div>
              <div className="moment-copy">
                <span>{section.title}</span>
                {section.description ? <span className="meta">{section.description}</span> : null}
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
                      src={buildFaceCropUrl(person.face)}
                      alt={person.name}
                      loading="lazy"
                      decoding="async"
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

      {data.adminEnabled ? <section className="admin-ribbon">
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
      </section> : null}
    </main>
  );
}
