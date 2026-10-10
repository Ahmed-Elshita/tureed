import { NextRequest, NextResponse } from "next/server";
import { getSettings, setPaymentGateway } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";

const VALID_PROVIDERS = ["paymob", "fawry", "stripe"];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (body.provider !== undefined && body.provider !== null && !VALID_PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }

  const updated = await setPaymentGateway(body.enabled, body.provider ?? null);
  return NextResponse.json(updated);
}
