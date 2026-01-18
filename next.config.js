/** @type {import('next').NextConfig} */
const repo = process.env.NEXT_PUBLIC_GH_REPO || "";
const basePath = repo ? `/${repo}` : "";

const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined
};

export default nextConfig;
