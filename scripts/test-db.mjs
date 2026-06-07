import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^DATABASE_URL=(.+)$/)
  if (m) process.env.DATABASE_URL = m[1].trim()
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

// Mask password in logs
const masked = url.replace(/:([^:@/]+)@/, ":****@")
console.log("Connecting with:", masked)

// Direct db.*.supabase.co is IPv6-only; Windows/Node often needs pooler URL or IPv6-first DNS
import dns from "dns"
dns.setDefaultResultOrder("ipv6first")

const sql = postgres(url, { ssl: "require", prepare: false, max: 1 })

async function tryConnect(label, connectionUrl) {
  const masked = connectionUrl.replace(/:([^:@/]+)@/, ":****@")
  console.log(`\n--- ${label} ---`)
  console.log(masked)
  const client = postgres(connectionUrl, { ssl: "require", prepare: false, max: 1 })
  try {
    const [{ now }] = await client`SELECT now() as now`
    console.log("OK — connected. Server time:", now)
    const wallets = await client`SELECT child_id, xp_balance FROM wallets LIMIT 5`
    console.log("wallets rows:", wallets.length, wallets)
    return true
  } catch (e) {
    console.error("FAILED:", e.message)
    if (e.code) console.error("code:", e.code)
    return false
  } finally {
    await client.end()
  }
}

const directOk = await tryConnect("Direct (db.*.supabase.co)", url)

if (!directOk) {
  const parsed = new URL(url)
  const pooler = postgres({
    host: "2a05:d018:175d:b601:31a:978a:f1c7:6aad",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: decodeURIComponent(parsed.password),
    ssl: "require",
    prepare: false,
    max: 1,
  })
  console.log("\n--- Direct via IPv6 literal (object config) ---")
  try {
    const [{ now }] = await pooler`SELECT now() as now`
    console.log("OK — connected. Server time:", now)
  } catch (e) {
    console.error("FAILED:", e.message, e.code ?? "")
  } finally {
    await pooler.end()
  }
}

if (!directOk) {
  const m = url.match(/postgresql:\/\/postgres:([^@]+)@/)
  const password = m?.[1] ?? ""
  const ref = "exsbxsmvhancvxvtecuc"
  const regions = [
    "eu-central-1",
    "us-east-1",
    "us-west-1",
    "ap-southeast-1",
  ]
  for (const region of regions) {
    const pooler = `postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`
    if (await tryConnect(`Pooler ${region}`, pooler)) break
  }
}
