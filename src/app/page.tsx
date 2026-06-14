import Link from "next/link";
import { desc } from "drizzle-orm";

// Reads the local SQLite DB on every request — never prerender.
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { createWorkspace, deleteWorkspace } from "@/lib/actions/workspaces";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { ImportButton } from "@/components/ui/ImportButton";
import { SettingsLink } from "@/components/ui/SettingsLink";

export default async function Home() {
  const all = await db
    .select()
    .from(workspaces)
    .orderBy(desc(workspaces.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display text-ink">MyNodebook</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Build, organize, and study structured knowledge from your sources.
          </p>
        </div>
        <SettingsLink />
      </header>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-3">
          <h2 className="badge text-muted">New workspace</h2>
          <ImportButton />
        </div>
        <form
          action={createWorkspace}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            name="name"
            required
            placeholder='e.g. "Python for Beginners"'
            className="input-field w-full flex-1 sm:w-auto sm:min-w-64"
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

      <section className="mt-12">
        <h2 className="badge text-muted">Workspaces</h2>
        {all.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-hairline px-6 py-12 text-center">
            <p className="font-display text-lg text-ink">Nothing here yet</p>
            <p className="mt-1.5 text-sm text-muted">
              Create your first workspace above to start collecting sources.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-hairline-soft overflow-hidden rounded-xl border border-hairline bg-canvas">
            {all.map((ws) => (
              <li
                key={ws.id}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-soft"
              >
                <Link href={`/workspace/${ws.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[17px] text-ink">
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
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted opacity-0 transition-[color,opacity] hover:text-error group-hover:opacity-100"
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
