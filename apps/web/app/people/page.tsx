import Link from "next/link";
import { getPeopleAdminData } from "../../lib/data";
import { PeopleManager } from "./people-manager";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
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
      </section>
      <PeopleManager initialPeople={data.people} initialQuery={initialQuery} />
    </main>
  );
}
