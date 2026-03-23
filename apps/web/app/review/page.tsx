import Link from "next/link";
import { getReviewData } from "../../lib/data";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const review = await getReviewData();

  return (
    <main className="review-shell">
      <section className="panel review-header">
        <p className="eyebrow">Local Admin Review</p>
        <h1>Face Clusters</h1>
        <p className="panel-copy">
          Review candidate identities from the latest local pipeline run.
        </p>
        <p className="panel-copy">
          {review.summary.faceCount} faces detected across{" "}
          {review.summary.photoCount} photos. {review.summary.clusterCount} clusters
          are ready for naming and {review.summary.unclusteredFaceCount} faces still
          need help.
        </p>
        <p className="panel-copy">
          {review.pendingCount} clusters currently need review.
        </p>
        <Link href="/" className="hero-link" style={{ color: "var(--brand-deep)" }}>
          Back To Home
        </Link>
        <Link
          href="/people"
          className="hero-link"
          style={{ color: "var(--brand-deep)", marginLeft: "12px" }}
        >
          Edit People Names
        </Link>
      </section>

      <section className="review-grid">
        {review.clusters.length === 0 ? (
          <article className="cluster-card">
            <h2>Review Queue Clear</h2>
            <p className="panel-copy">
              There are no pending clusters on the current review run.
            </p>
          </article>
        ) : (
          review.clusters.map((cluster) => (
            <article key={cluster.id} className="cluster-card">
              <h2>{cluster.id}</h2>
              <div className="cluster-meta">
                <span className="cluster-tag">{cluster.faceCount} faces</span>
                <span className="cluster-tag">{cluster.photoCount} photos</span>
                <span className="cluster-tag">
                  status: {cluster.review.status}
                </span>
              </div>

              <ReviewActions clusterId={cluster.id} faces={cluster.faces} />

              <p className="review-note">
                Use `Remove` on any thumbnail that does not belong in the cluster.
                `Not Face` still rejects the whole cluster as a false positive.
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
