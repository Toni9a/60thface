import Link from "next/link";
import { notFound } from "next/navigation";
import { getMomentPageData } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function MomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMomentPageData(id);

  if (!data) {
    notFound();
  }

  return (
    <main className="content-shell">
      <section className="content-header">
        <p className="eyebrow">Timeline Section</p>
        <h1>{data.section.title}</h1>
        <p className="panel-copy">
          {data.section.photos.length > 0
            ? `${data.section.photos.length} photos currently assigned.`
            : "No timeline photos have been assigned to this section yet."}
        </p>
        <Link href="/" className="inline-link">
          Back home
        </Link>
      </section>

      {data.section.coverPhoto ? (
        <section className="cover-panel">
          <img src={data.section.coverPhoto.url} alt={data.section.title} />
        </section>
      ) : null}

      <section className="photo-wall">
        {data.section.photos.map((photo) => (
          <figure key={photo.id} className="gallery-card">
            <img src={photo.url} alt={photo.filename} />
            <figcaption>{photo.id}</figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
