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
          <h1 className="text-2xl font-bold">MyNodebook</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Build, organize, and study structured knowledge from your sources.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Settings
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          New workspace
        </h2>
        <form
          action={createWorkspace}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            name="name"
            required
            placeholder='e.g. "Python for Beginners"'
            className="min-w-64 flex-1 rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <select
            name="type"
            defaultValue="study"
            className="rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm"
          >
            <option value="study">Study</option>
            <option value="course">Course</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Workspaces
        </h2>
        {all.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No workspaces yet. Create one above to get started.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {all.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <Link href={`/workspace/${ws.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium hover:underline">
                    {ws.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {ws.type === "course" ? "Course" : "Study"} ·{" "}
                    {new Date(ws.createdAt).toLocaleDateString()}
                  </span>
                </Link>
                <ConfirmButton
                  title="Delete workspace?"
                  message={`"${ws.name}" and all of its sources and notes will be permanently deleted.`}
                  onConfirm={deleteWorkspace.bind(null, ws.id)}
                  className="rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-red-50 hover:text-red-600"
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
