import { db } from "./db";

const SINGLETON_ID = "singleton";

export async function getSettings() {
  return db.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function isPaymentGatewayEnabled() {
  const settings = await getSettings();
  return settings.paymentGatewayEnabled;
}

export async function setPaymentGateway(enabled: boolean, provider: string | null) {
  return db.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { paymentGatewayEnabled: enabled, paymentProvider: provider },
    create: { id: SINGLETON_ID, paymentGatewayEnabled: enabled, paymentProvider: provider },
  });
}
