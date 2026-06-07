import { sql } from "@/lib/db"

function hashDigits(input: string, length: number): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  const mod = 10 ** length
  return String(Math.abs(h) % mod).padStart(length, "0")
}

/** Deterministic 4-digit card PIN for display after parent approval */
export function getChildCardPin(childId: string): string {
  return hashDigits(`${childId}:pin`, 4)
}

export async function generatePinRevealCode(childId: string): Promise<string> {
  const code = String(Math.floor(1000 + Math.random() * 9000))
  await sql`
    INSERT INTO pin_reveal_codes (child_id, code, used, expires_at)
    VALUES (${childId}, ${code}, false, now() + interval '5 minutes')
  `
  return code
}

export async function verifyPinRevealCode(
  childId: string,
  code: string
): Promise<{ valid: boolean; pin?: string; error?: string }> {
  const normalized = code.trim()
  if (!/^\d{4}$/.test(normalized)) {
    return { valid: false, error: "Invalid or expired code" }
  }

  const rows = (await sql`
    SELECT id FROM pin_reveal_codes
    WHERE child_id = ${childId}
      AND code = ${normalized}
      AND used = false
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  `) as Array<{ id: number }>

  if (!rows[0]) {
    return { valid: false, error: "Invalid or expired code" }
  }

  await sql`
    UPDATE pin_reveal_codes SET used = true WHERE id = ${rows[0].id}
  `

  return { valid: true, pin: getChildCardPin(childId) }
}
