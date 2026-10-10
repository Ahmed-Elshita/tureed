export default function RatingStars({ avg, count }: { avg: number | null; count: number }) {
  if (!avg || count === 0) return null;
  const full = Math.round(avg);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
      <span className="text-mute">
        {avg.toFixed(1)} ({count})
      </span>
    </span>
  );
}
