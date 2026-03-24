import Link from "next/link";
import { getLabelInboxData } from "../../lib/data";
import { LabelInbox } from "./label-inbox";
import { isLocalAdminEnabled } from "../../lib/local-admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LabelPage() {
  if (!isLocalAdminEnabled()) {
    notFound();
  }
  const data = await getLabelInboxData();

  return (
    <main className="review-shell">
      <section className="panel review-header">
        <p className="eyebrow">Full Gallery Labeling</p>
        <h1>Face Label Inbox</h1>
        <p className="panel-copy">
          One cluster at a time. Type a new name, pick an existing suggestion, skip, or reject as
          not a face.
        </p>
        <p className="panel-copy">
          {data.summary.faceCount} faces across {data.summary.photoCount} photos in the current run.
        </p>
        <div className="hero-actions">
          <Link href="/people" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To People
          </Link>
          <Link href="/review" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Full Review Grid
          </Link>
        </div>
      </section>

      <section className="review-grid">
        <LabelInbox initialQueue={data.queue} knownNames={data.knownNames} />
      </section>
    </main>
  );
}
