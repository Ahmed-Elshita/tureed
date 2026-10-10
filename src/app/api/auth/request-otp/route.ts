import { NextRequest, NextResponse } from "next/server";
import { getClientIp, normalizePhone } from "@/lib/validate";
import { requestOtp } from "@/lib/auth";
import { smsProvider } from "@/lib/sms";
import { whatsappProvider } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/spamGuard";

export async function POST(req: NextRequest) {
  // In production the dev providers only print codes in the server log:
  // nobody could log in and the log would collect valid OTPs.
  if (process.env.NODE_ENV === "production" && whatsappProvider.isDevOnly && smsProvider.isDevOnly) {
    return NextResponse.json({ error: "otp_delivery_not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  if (!phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const ip = getClientIp(req);
  const perPhone = await checkRateLimit(`otp:${phone}`, 3, 10 * 60);
  const perIp = await checkRateLimit(`otp-ip:${ip}`, 10, 10 * 60);
  if (!perPhone.allowed || !perIp.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const code = await requestOtp(phone, "login");

  // WhatsApp first (free tier); SMS only as a fallback if WhatsApp failed.
  let channel: "whatsapp" | "sms" = "whatsapp";
  const wa = await whatsappProvider.sendOtp(phone, code);
  if (!wa.success) {
    channel = "sms";
    await smsProvider.send(phone, `Tureed: your login code is ${code}. Expires in 5 minutes.`);
  }

  return NextResponse.json({ ok: true, channel });
}
