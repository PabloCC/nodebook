"use server";

import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = formData.get("type") === "course" ? "course" : "study";
  if (!name) return;

  const id = crypto.randomUUID();
  await db.insert(workspaces).values({ id, name, type, createdAt: Date.now() });
  redirect(`/workspace/${id}`);
}

export async function renameWorkspace(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.update(workspaces).set({ name: trimmed }).where(eq(workspaces.id, id));
  revalidatePath("/");
  revalidatePath(`/workspace/${id}`);
}

export async function deleteWorkspace(id: string) {
  await db.delete(workspaces).where(eq(workspaces.id, id));
  revalidatePath("/");
}
