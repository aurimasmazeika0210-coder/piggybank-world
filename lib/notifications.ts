import { sql } from "@/lib/db"

export type NotificationType = "info" | "success" | "warning" | "alert"

export async function createNotification(
  parentId: string,
  title: string,
  body: string,
  type: NotificationType = "info"
): Promise<void> {
  try {
    await sql`
      INSERT INTO notifications (parent_id, title, body, type)
      VALUES (${parentId}, ${title}, ${body}, ${type})
    `
  } catch (e) {
    console.error("[createNotification]", e)
  }
}

export async function createChildNotification(
  childId: string,
  title: string,
  body: string,
  type: NotificationType = "info"
): Promise<void> {
  try {
    await sql`
      INSERT INTO child_notifications (child_id, title, body, type)
      VALUES (${childId}, ${title}, ${body}, ${type})
    `
  } catch (e) {
    console.error("[createChildNotification]", e)
  }
}

export async function getParentIdForChild(childId: string): Promise<string | null> {
  const rows = (await sql`
    SELECT parent_id FROM children WHERE id = ${childId}
  `) as Array<{ parent_id: string }>
  return rows[0]?.parent_id ?? null
}

export async function getChildName(childId: string): Promise<string> {
  const rows = (await sql`
    SELECT name FROM children WHERE id = ${childId}
  `) as Array<{ name: string }>
  return rows[0]?.name ?? "Child"
}
