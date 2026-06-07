import { sql } from "@/lib/db"

export async function notifyParent(
  parentId: string,
  title: string,
  body: string,
  type: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO notifications (parent_id, title, body, type)
      VALUES (${parentId}, ${title}, ${body}, ${type})
    `
  } catch {
    // notifications table optional until migration is run
  }
}
