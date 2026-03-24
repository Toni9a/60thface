import Link from "next/link";
import { getPeopleAdminData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function PeopleSummaryPage() {
  const data = await getPeopleAdminData();

  return (
    <main className="review-shell">
      <section className="panel review-header">
        <p className="eyebrow">People Summary</p>
        <h1>All Grouped Names</h1>
        <p className="panel-copy">
          This page shows every current grouped name, how many photos are attached, and how many
          raw records sit underneath it.
        </p>
        <div className="hero-actions">
          <Link href="/people" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To People
          </Link>
          <Link href="/" className="hero-link" style={{ color: "var(--brand-deep)" }}>
            Back To Home
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="summary-table">
          <div className="summary-row summary-row-head">
            <span>Name</span>
            <span>Photos</span>
            <span>Raw Records</span>
          </div>
          {data.people.map((person) => (
            <Link
              key={person.memberIds.join("|")}
              href={`/people?search=${encodeURIComponent(person.name)}`}
              className="summary-row"
            >
              <span>{person.name}</span>
              <span>{person.photoIds.length}</span>
              <span>{person.memberIds.length}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
