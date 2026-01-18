/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  
  // 👇 这里我们直接写死你的仓库名，不再依赖环境变量
  basePath: '/reading-kg-pwa',
  
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;