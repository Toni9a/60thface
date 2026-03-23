import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonPageData } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPersonPageData(slug);

  if (!data) {
    notFound();
  }

  return (
    <main className="content-shell">
      <section className="content-header">
        <p className="eyebrow">Person Gallery</p>
        <h1>{data.person.name}</h1>
        <p className="panel-copy">{data.person.photoCount} grouped photos.</p>
        <div className="hero-actions">
          <Link href="/people-gallery" className="inline-link">
            Back to people
          </Link>
          <Link href="/" className="inline-link">
            Back home
          </Link>
        </div>
      </section>

      <section className="photo-wall">
        {data.person.photos.map((photo) => (
          <figure key={photo.id} className="gallery-card gallery-card-tall">
            {photo.url ? <img src={photo.url} alt={photo.id} /> : null}
            <figcaption>{photo.id}</figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
