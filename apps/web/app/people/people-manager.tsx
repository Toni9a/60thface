"use client";

import { useMemo, useState } from "react";
import { PeopleEditor, type AdminPerson } from "./people-editor";

export function PeopleManager({
  initialPeople,
  initialQuery = "",
}: {
  initialPeople: AdminPerson[];
  initialQuery?: string;
}) {
  const [people, setPeople] = useState(initialPeople);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const filteredPeople = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return people;
    }

    return people.filter((person) => {
      return (
        person.name.toLowerCase().includes(normalized) ||
        person.photoIds.some((photoId) => photoId.includes(normalized))
      );
    });
  }, [people, query]);

  async function rename(memberIds: string[], name: string) {
    const response = await fetch("/api/people/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        memberIds,
        name,
      }),
    });

    if (!response.ok) {
      throw (await response.text()) || "Save failed.";
    }

    const payload = (await response.json()) as { people?: AdminPerson[] };
    setPeople(payload.people ?? []);
    setStatus(`Saved ${name}.`);
    setError("");
  }

  async function removePhoto(memberIds: string[], photoId: string) {
    const response = await fetch("/api/people/remove-photo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        memberIds,
        photoId,
      }),
    });

    if (!response.ok) {
      throw (await response.text()) || "Remove failed.";
    }

    const payload = (await response.json()) as { people?: AdminPerson[] };
    setPeople(payload.people ?? []);
    setStatus(`Removed ${photoId}.`);
    setError("");
  }

  return (
    <>
      <section className="panel review-header">
        <p className="eyebrow">Local Admin</p>
        <h1>People Matching</h1>
        <p className="panel-copy">
          Each row is one grouped person. Rename it, then remove wrong photos from that same row.
        </p>
        <div className="review-actions">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="review-input"
            placeholder="Search by current name or photo id"
          />
        </div>
        {status ? <p className="review-note">{status}</p> : null}
        {error ? <p className="review-error">{error}</p> : null}
      </section>

      <section className="review-grid">
        {filteredPeople.length === 0 ? (
          <article className="cluster-card">
            <h2>No Matching People</h2>
            <p className="panel-copy">Try a different search or approve more clusters.</p>
          </article>
        ) : (
          filteredPeople.map((person) => (
            <PeopleEditor
              key={person.memberIds.join("|")}
              person={person}
              onRename={rename}
              onRemovePhoto={removePhoto}
            />
          ))
        )}
      </section>
    </>
  );
}
