import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";

// This one check protects EVERY /admin/* page (products, users,
// ad-requests, settings, ...) since they all render inside this layout.
// A non-admin — logged out, or logged in as an ordinary buyer/seller —
// gets redirected to the homepage before any admin data is fetched or
// rendered, so PII (phone numbers, pending listings, etc.) never reaches
// a browser that shouldn't see it. This was previously the single
// biggest gap in the codebase: every /admin page and action route was
// reachable by anyone who had the URL.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const admin = await requireAdmin();
  if (!admin) redirect(`/${locale}`);

  return (
    <div className="flex min-h-screen bg-gray-bg">
      <Sidebar />
      <div className="flex-1 p-7">{children}</div>
    </div>
  );
}
