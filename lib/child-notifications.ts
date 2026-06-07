import { sql } from "@/lib/db"
import { logChildActivity } from "@/lib/child-activities"

export async function notifyChild(
  childId: string,
  title: string,
  body: string,
  type: string,
  activityType?: string,
  amountPc = 0
): Promise<void> {
  try {
    await sql`
      INSERT INTO child_notifications (child_id, title, body, type)
      VALUES (${childId}, ${title}, ${body}, ${type})
    `
  } catch {
    // child_notifications table optional until migration is run
  }

  if (activityType) {
    await logChildActivity(childId, activityType, body, amountPc, "completed")
  }
}
