/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com', 'avatar.vercel.sh', 'via.placeholder.com'],
  },
};

module.exports = nextConfig;
