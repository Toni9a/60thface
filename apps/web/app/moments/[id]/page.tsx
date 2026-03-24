import Link from "next/link";
import { notFound } from "next/navigation";
import { getMomentPageData } from "../../../lib/data";
import { GuestPhotoWall } from "../../components/guest-photo-wall";

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
        <p className="panel-copy">{data.section.description ?? `${data.section.photos.length} photos currently assigned.`}</p>
        <Link href="/" className="inline-link">
          Back home
        </Link>
      </section>

      {data.section.coverPhoto ? (
        <section className="cover-panel">
          <img
            src={data.section.coverPhoto.mediumUrl ?? data.section.coverPhoto.url}
            alt={data.section.title}
            loading="eager"
            decoding="async"
          />
        </section>
      ) : null}

      <GuestPhotoWall photos={data.section.photos} />
    </main>
  );
}
