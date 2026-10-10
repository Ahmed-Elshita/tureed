import type { MetadataRoute } from "next";

// Blocks account/admin/API surfaces from being crawled or indexed —
// there is nothing for a search engine to show there, and crawling them
// just wastes crawl budget that should go to category/product pages.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tureed.example.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/admin", "/*/cart", "/*/profile", "/*/my-ads", "/*/login", "/*/product/*/boost", "/*/product/*/edit", "/*/product/new"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
