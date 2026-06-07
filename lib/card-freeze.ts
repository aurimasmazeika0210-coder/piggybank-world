import { sql } from "@/lib/db"

async function readFrozenFromWallets(childId: string): Promise<boolean | null> {
  try {
    const rows = (await sql`
      SELECT card_frozen FROM wallets WHERE child_id = ${childId}
    `) as Array<{ card_frozen: boolean }>
    if (!rows[0]) return null
    return Boolean(rows[0].card_frozen)
  } catch {
    return null
  }
}

async function readFrozenFromChildren(childId: string): Promise<boolean | null> {
  try {
    const rows = (await sql`
      SELECT card_frozen FROM children WHERE id = ${childId}
    `) as Array<{ card_frozen: boolean }>
    if (!rows[0]) return null
    return Boolean(rows[0].card_frozen)
  } catch {
    return null
  }
}

export async function getCardFrozen(childId: string): Promise<boolean> {
  const fromWallet = await readFrozenFromWallets(childId)
  if (fromWallet !== null) return fromWallet
  const fromChild = await readFrozenFromChildren(childId)
  if (fromChild !== null) return fromChild
  return false
}

async function writeFrozenToWallets(childId: string, frozen: boolean): Promise<boolean> {
  try {
    const updated = (await sql`
      UPDATE wallets
      SET card_frozen = ${frozen}, updated_at = NOW()
      WHERE child_id = ${childId}
      RETURNING child_id
    `) as Array<{ child_id: string }>

    if (updated[0]) return true

    await sql`
      INSERT INTO wallets (child_id, xp_balance, trusty_score, card_frozen)
      VALUES (${childId}, 0, 75, ${frozen})
    `
    return true
  } catch {
    return false
  }
}

async function writeFrozenToChildren(childId: string, frozen: boolean): Promise<boolean> {
  try {
    await sql`
      UPDATE children SET card_frozen = ${frozen} WHERE id = ${childId}
    `
    return true
  } catch {
    return false
  }
}

export async function setCardFrozen(
  childId: string,
  frozen: boolean
): Promise<boolean> {
  if (await writeFrozenToWallets(childId, frozen)) return true
  if (await writeFrozenToChildren(childId, frozen)) return true
  return false
}
