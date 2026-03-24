import Link from "next/link";
import { getPeopleAdminData } from "../../lib/data";
import { PeopleManager } from "./people-manager";
import { isLocalAdminEnabled } from "../../lib/local-admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  if (!isLocalAdminEnabled()) {
    notFound();
  }
  const data = await getPeopleAdminData();
  const params = (await searchParams) ?? {};
  const initialQuery = String(params.search ?? "").trim();

  return (
    <main className="review-shell">
      <section className="hero-actions" style={{ marginBottom: 20 }}>
        <Link href="/" className="hero-link" style={{ color: "var(--brand-deep)" }}>
          Back To Home
        </Link>
        <Link href="/review" className="hero-link" style={{ color: "var(--brand-deep)" }}>
          Back To Review
        </Link>
        <Link
          href="/people-suggestions"
          className="hero-link"
          style={{ color: "var(--brand-deep)" }}
        >
          Duplicate Suggestions
        </Link>
        <Link
          href="/people-summary"
          className="hero-link"
          style={{ color: "var(--brand-deep)" }}
        >
          All Names
        </Link>
        <Link
          href="/people-unnamed"
          className="hero-link"
          style={{ color: "var(--brand-deep)" }}
        >
          Unnamed Faces
        </Link>
      </section>
      <PeopleManager initialPeople={data.people} initialQuery={initialQuery} />
    </main>
  );
}
