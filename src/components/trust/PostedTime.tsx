import { useLocale } from "next-intl";
import { timeAgo } from "@/lib/timeAgo";

export default function PostedTime({ date }: { date: Date }) {
  const locale = useLocale() as "ar" | "en";
  return <span className="text-xs text-mute">🕐 {timeAgo(date, locale)}</span>;
}
