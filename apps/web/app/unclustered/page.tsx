import Link from "next/link";
import { getUnclusteredInboxData } from "../../lib/data";
import { UnclusteredInbox } from "./unclustered-inbox";

export const dynamic = "force-dynamic";

export default async function UnclusteredPage() {
  const data = await getUnclusteredInboxData();

  return (
    <main className="review-shell">
      <section className="panel review-header">
        <p className="eyebrow">Unclustered Faces</p>
        <h1>Singles Inbox</h1>
        <p className="panel-copy">
          These faces were detected but did not land in a cluster. Match them to an existing
          person, create a new name, skip, or mark them as not useful.
        </p>
        <p className="panel-copy">
          {data.summary.unclusteredFaceCount} unclustered faces in the current run.
        </p>
        <div className="hero-actions">
          <Link href="/label" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Cluster Inbox
          </Link>
          <Link href="/people" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            People Editor
          </Link>
        </div>
      </section>

      <section className="review-grid">
        <UnclusteredInbox initialFaces={data.faces} knownNames={data.knownNames} />
      </section>
    </main>
  );
}
