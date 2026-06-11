import Link from "next/link";
import { desc } from "drizzle-orm";

// Reads the local SQLite DB on every request — never prerender.
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { createWorkspace, deleteWorkspace } from "@/lib/actions/workspaces";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";

export default async function Home() {
  const all = await db
    .select()
    .from(workspaces)
    .orderBy(desc(workspaces.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-semibold text-ink">MyNodebook</h1>
          <p className="mt-1 text-sm text-muted">
            Build, organize, and study structured knowledge from your sources.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm font-medium text-ink hover:underline"
        >
          Settings
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">New workspace</h2>
        <form
          action={createWorkspace}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            name="name"
            required
            placeholder='e.g. "Python for Beginners"'
            className="input-field min-w-64 flex-1"
          />
          <select
            name="type"
            defaultValue="study"
            className="rounded-lg border border-hairline bg-canvas px-3.5 py-2 text-sm"
          >
            <option value="study">Study</option>
            <option value="course">Course</option>
          </select>
          <button type="submit" className="btn-primary">
            Create
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">Workspaces</h2>
        {all.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No workspaces yet. Create one above to get started.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline-soft rounded-xl border border-hairline bg-canvas">
            {all.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <Link href={`/workspace/${ws.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium hover:underline">
                    {ws.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {ws.type === "course" ? "Course" : "Study"} ·{" "}
                    {new Date(ws.createdAt).toLocaleDateString()}
                  </span>
                </Link>
                <ConfirmButton
                  title="Delete workspace?"
                  message={`"${ws.name}" and all of its sources and notes will be permanently deleted.`}
                  onConfirm={deleteWorkspace.bind(null, ws.id)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted hover:text-error"
                >
                  Delete
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
