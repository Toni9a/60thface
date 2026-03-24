import Link from "next/link";
import { getGalleryPageData } from "../../lib/data";
import { GuestPhotoWall } from "../components/guest-photo-wall";

export const dynamic = "force-dynamic";

export default async function AllPhotosPage() {
  const data = await getGalleryPageData();

  return (
    <main className="content-shell">
      <section className="content-header">
        <div className="content-header-top">
          <div>
            <p className="eyebrow">Gallery</p>
            <h1>All Photos</h1>
            <p className="panel-copy">
              {data.eventTitle} includes {data.photos.length} photos in the current album.
            </p>
          </div>
          <Link href="/" className="inline-link">
            Back home
          </Link>
        </div>
        <div className="hero-actions">
          {data.sections.map((section) => (
            <a key={section.id} href={section.anchorHref} className="inline-link">
              {section.title}
            </a>
          ))}
        </div>
      </section>

      <GuestPhotoWall photos={data.photos} />
    </main>
  );
}
