export interface PaymentProvider {
  charge(amountEgp: number, description: string): Promise<{ success: boolean; reference: string }>;
}

// Always "succeeds" and returns a fake reference — this is what runs
// whether the admin toggle is on or off, until a real provider below is
// uncommented and wired to real API keys. The toggle in PlatformSettings
// is what production code should check before treating any charge here
// as real money — see how boosts/orders use isPaymentGatewayEnabled().
class MockPaymentProvider implements PaymentProvider {
  async charge(amountEgp: number, description: string) {
    // eslint-disable-next-line no-console
    console.log(`[MOCK PAYMENT] charging ${amountEgp} EGP — ${description}`);
    return { success: true, reference: `MOCK-${Date.now()}` };
  }
}

// Two realistic options for Egypt, both commented until real merchant
// accounts + API keys exist:
//
// class PaymobProvider implements PaymentProvider {
//   async charge(amountEgp: number, description: string) {
//     const res = await fetch("https://accept.paymob.com/api/...", { ... });
//     const data = await res.json();
//     return { success: data.success, reference: data.id };
//   }
// }
//
// class FawryProvider implements PaymentProvider {
//   async charge(amountEgp: number, description: string) {
//     const res = await fetch("https://atfawry.fawrystaging.com/...", { ... });
//     const data = await res.json();
//     return { success: data.statusCode === 200, reference: data.referenceNumber };
//   }
// }

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
