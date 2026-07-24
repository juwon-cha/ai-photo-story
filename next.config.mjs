/** @type {import('next').NextConfig} */
const nextConfig = {
  // 데모/포트폴리오 목적: 빌드가 lint 경고로 막히지 않게 함 (타입 체크는 유지)
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
