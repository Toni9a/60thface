import Link from "next/link";
import { getCurationData } from "../../lib/data";
import { CurationClient } from "./curation-client";

export const dynamic = "force-dynamic";

export default async function CuratePage() {
  const data = await getCurationData();

  return (
    <main className="content-shell">
      <section className="content-header">
        <p className="eyebrow">Local Admin</p>
        <h1>Curate Header And Section Covers</h1>
        <p className="panel-copy">
          Pick the main hero image and the thumbnail photo for each timeline section.
        </p>
        <div className="hero-actions">
          <Link href="/" className="inline-link">
            Back home
          </Link>
          <Link href="/review" className="inline-link">
            Review faces
          </Link>
        </div>
      </section>

      <CurationClient targets={data.targets} photos={data.photos} />
    </main>
  );
}
