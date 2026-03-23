import Link from "next/link";
import { getPeopleGalleryData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function PeopleGalleryPage() {
  const data = await getPeopleGalleryData();

  return (
    <main className="content-shell">
      <section className="content-header">
        <p className="eyebrow">People Gallery</p>
        <h1>Browse By Person</h1>
        <p className="panel-copy">
          Tap a face to see the photos currently grouped to that person.
        </p>
        <Link href="/" className="inline-link">
          Back home
        </Link>
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
                  src={`/api/face-crop?path=${encodeURIComponent(
                    person.preview.photoPath,
                  )}&top=${person.preview.bbox.top}&right=${person.preview.bbox.right}&bottom=${person.preview.bbox.bottom}&left=${person.preview.bbox.left}`}
                  alt={person.name}
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
