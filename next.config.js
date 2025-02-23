/** @type {import('next').NextConfig} */
const nextConfig = {
  // original
  output: 'standalone',
  // for github pages static export
  // output: 'export', // <=== enables static exports
  // reactStrictMode: true,
  // images: {
  //   unoptimized: true
  // }
};

module.exports = nextConfig;
