import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonPageData } from "../../../lib/data";
import { GuestPhotoWall } from "../../components/guest-photo-wall";

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

      <GuestPhotoWall
        photos={data.person.photos.filter((photo) => photo.url).map((photo) => ({
          id: photo.id,
          filename: photo.id,
          url: photo.url as string,
        }))}
        tall
      />
    </main>
  );
}
