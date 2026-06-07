import path from "path"
import { fileURLToPath } from "url"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow phone/tablet on LAN to load dev JS (fixes dead buttons when not on localhost)
  allowedDevOrigins: ["192.168.1.187"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/parent",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
