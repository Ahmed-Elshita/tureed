/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // `next build`'s bundled ESLint integration doesn't yet support
    // ESLint 9's flat config (eslint.config.mjs) — it fails with an
    // "Unknown options" error unrelated to actual lint issues. The
    // project is still linted for real: run `npm run lint` (plain
    // `eslint`) as its own CI step, which this build does NOT skip.
    ignoreDuringBuilds: true,
  },
  // No `images.remotePatterns` here on purpose: the app uses plain <img>
  // tags throughout (see the eslint-disable comments next to each), never
  // next/image. If next/image is adopted later, scope remotePatterns to
  // the actual upload/CDN domain(s) in use — a wildcard hostname turns
  // Next's image optimizer into an open proxy that will fetch (and
  // expose the server making requests to) any URL a client supplies.
};

module.exports = withNextIntl(nextConfig);
