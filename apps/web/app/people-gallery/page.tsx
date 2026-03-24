import Link from "next/link";
import { getPeopleGalleryData } from "../../lib/data";
import { buildFaceCropUrl } from "../../lib/image-source";

export const dynamic = "force-dynamic";

export default async function PeopleGalleryPage() {
  const data = await getPeopleGalleryData();

  return (
    <main className="content-shell">
      <section className="content-header">
        <div className="content-header-top">
          <div>
            <p className="eyebrow">People Gallery</p>
            <h1>Browse By Person</h1>
            <p className="panel-copy">
              Tap a face to see the photos currently grouped to that person.
            </p>
          </div>
          <Link href="/" className="inline-link">
            Back home
          </Link>
        </div>
      </section>

      <section className="people-directory">
        {data.people.map((person) => (
          <Link
            key={person.id}
            href={`/people-gallery/${person.slug}`}
            className="directory-card"
          >
            <div className="directory-photo">
              {person.preview ? (
                <img
                  src={buildFaceCropUrl(person.preview)}
                  alt={person.name}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="face-placeholder">{person.name.slice(0, 1)}</div>
              )}
            </div>
            <div className="directory-copy">
              <strong>{person.name}</strong>
              <span>{person.photoCount} photos</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
