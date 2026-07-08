/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimal self-contained server bundle for the Docker runner stage.
  output: "standalone",
  experimental: {
    // Native/binary packages must stay external to the webpack server bundle.
    // @neondatabase/serverless must also be external so the standalone trace
    // ships it as a package — db/conn.mjs (boot migrations) imports it by name.
    serverComponentsExternalPackages: ["@node-rs/argon2", "pg", "@neondatabase/serverless"],
  },
};

export default nextConfig;
