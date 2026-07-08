/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimal self-contained server bundle for the Docker runner stage.
  output: "standalone",
  experimental: {
    // Native/binary packages must stay external to the webpack server bundle.
    serverComponentsExternalPackages: ["@node-rs/argon2", "pg"],
  },
};

export default nextConfig;
