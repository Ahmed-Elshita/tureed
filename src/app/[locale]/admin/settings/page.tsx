import { getSettings } from "@/lib/settings";
import PaymentGatewayToggle from "@/components/admin/PaymentGatewayToggle";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold text-dark">الإعدادات</h1>
      <PaymentGatewayToggle initialEnabled={settings.paymentGatewayEnabled} initialProvider={settings.paymentProvider} />
    </div>
  );
}
