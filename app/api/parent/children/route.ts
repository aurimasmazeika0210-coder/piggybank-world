import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { addChild, getChildLoginOtp, getChildren, getParentBySession } from "@/lib/auth"
import { getCardFrozen } from "@/lib/card-freeze"
import { formatCardNumberDisplay, maskCardNumber } from "@/lib/card-display"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const children = await getChildren(parent.id)
    const enriched = await Promise.all(
      children.map(async (child) => {
        let wallet: Array<{ xp_balance: number; card_frozen?: boolean }> = []
        try {
          wallet = (await sql`
            SELECT xp_balance, card_frozen FROM wallets WHERE child_id = ${child.id}
          `) as typeof wallet
        } catch {
          wallet = (await sql`
            SELECT xp_balance FROM wallets WHERE child_id = ${child.id}
          `) as typeof wallet
        }

        const spent = (await sql`
          SELECT COALESCE(SUM(amount_pc), 0) as total
          FROM transaction_decisions
          WHERE child_id = ${child.id}
            AND decision = 'approved'
            AND decided_at >= now() - interval '24 hours'
        `) as Array<{ total: number }>

        const otp = await getChildLoginOtp(child.id)

        let cardNumber: string | null = null
        try {
          const cardRows = (await sql`
            SELECT card_number FROM children WHERE id = ${child.id}
          `) as Array<{ card_number: string | null }>
          cardNumber = cardRows[0]?.card_number ?? null
        } catch {
          cardNumber = null
        }

        return {
          id: child.id,
          name: child.name,
          surname: child.surname ?? "",
          age: child.age,
          avatarEmoji: child.avatar_emoji,
          avatar: "",
          balance: Number(wallet[0]?.xp_balance ?? 0),
          spent: Number(spent[0]?.total ?? 0),
          cardLastFour: child.card_last_four,
          cardNumber: formatCardNumberDisplay(cardNumber, child.card_last_four),
          cardNumberMasked: maskCardNumber(cardNumber, child.card_last_four),
          loginCode: otp.code,
          loginCodeExpiresAt: otp.expiresAt,
          loginCodeExpiresIn: otp.expiresIn,
          color: child.color,
          cardFrozen:
            Boolean(wallet[0]?.card_frozen) || (await getCardFrozen(child.id)),
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (e) {
    console.error("[parent/children GET]", e)
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      name,
      surname,
      password,
      age,
      avatarEmoji,
      cardNumber,
      cardHolder,
      cardCvv,
      cardExpiry,
    } = await req.json()
    if (!name?.trim() || !surname?.trim() || !password || !age || !avatarEmoji) {
      return NextResponse.json(
        { error: "Name, surname, password, age, and avatar are required" },
        { status: 400 }
      )
    }
    if (String(password).length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      )
    }

    const child = await addChild(parent.id, name, Number(age), avatarEmoji, {
      surname,
      password,
      cardNumber,
      cardHolder,
      cardCvv,
      cardExpiry,
    })
    const otp = await getChildLoginOtp(child.id)

    const { createNotification } = await import("@/lib/notifications")
    await createNotification(
      parent.id,
      "👶 Child added",
      `${child.name} has been added to your account`,
      "success"
    )

    return NextResponse.json({
      id: child.id,
      name: child.name,
      surname: child.surname ?? surname,
      age: child.age,
      avatarEmoji: child.avatar_emoji,
      cardLastFour: child.card_last_four,
      loginCode: otp.code,
      loginCodeExpiresAt: otp.expiresAt,
      loginCodeExpiresIn: otp.expiresIn,
      color: child.color,
    })
  } catch (e) {
    console.error("[parent/children POST]", e)
    const msg = e instanceof Error ? e.message : ""
    return NextResponse.json(
      { error: msg.includes("violates") ? "Could not save child settings. Try again or check the database." : "Failed to add child" },
      { status: 500 }
    )
  }
}
