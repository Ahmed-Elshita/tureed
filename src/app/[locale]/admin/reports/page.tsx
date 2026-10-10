import { db } from "@/lib/db";
import ReportRow from "@/components/admin/ReportRow";

export default async function AdminReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const reports = await db.report.findMany({
    where: { resolved: false },
    include: { product: { select: { titleAr: true, slug: true } }, reporter: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">البلاغات</h1>
      <p className="mb-6 text-sm text-mute">{reports.length} بلاغ مفتوح — &quot;إيقاف الإعلان&quot; بيحوّله لحالة مرفوض فورًا ويشيل أي تمييز عليه.</p>
      <div className="space-y-3">
        {reports.map((r) => (
          <ReportRow
            key={r.id}
            id={r.id}
            reason={r.reason}
            note={r.note}
            createdAt={r.createdAt.toISOString()}
            reporterName={r.reporter.name}
            productTitle={r.product.titleAr}
            productSlug={r.product.slug}
            locale={locale}
          />
        ))}
        {reports.length === 0 && <p className="text-sm text-mute">مفيش بلاغات مفتوحة 🎉</p>}
      </div>
    </div>
  );
}
