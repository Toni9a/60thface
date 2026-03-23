import Link from "next/link";
import { getGalleryPageData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function AllPhotosPage() {
  const data = await getGalleryPageData();

  return (
    <main className="content-shell">
      <section className="content-header">
        <p className="eyebrow">Gallery</p>
        <h1>All Photos</h1>
        <p className="panel-copy">
          {data.eventTitle} includes {data.photos.length} photos in the current local album.
        </p>
        <div className="hero-actions">
          <Link href="/" className="inline-link">
            Back home
          </Link>
          {data.sections.map((section) => (
            <a key={section.id} href={section.anchorHref} className="inline-link">
              {section.title}
            </a>
          ))}
        </div>
      </section>

      <section className="photo-wall">
        {data.photos.map((photo) => (
          <div key={photo.id} className="photo-wall-slot">
            {photo.sectionMarker ? (
              <div id={`moment-${photo.sectionMarker.id}`} className="section-anchor-card">
                <p className="eyebrow">Jumped To</p>
                <h2>{photo.sectionMarker.title}</h2>
                <p className="panel-copy">
                  This is the start of the {photo.sectionMarker.title.toLowerCase()} stretch in the gallery timeline.
                </p>
              </div>
            ) : null}
            <figure className="gallery-card">
              <img src={photo.url} alt={photo.filename} />
              <figcaption>{photo.id}</figcaption>
            </figure>
          </div>
        ))}
      </section>
    </main>
  );
}
