// OTP delivery over the OFFICIAL Meta WhatsApp Cloud API (free tier, no
// monthly fee; you need a Meta business app + an approved AUTHENTICATION
// template). Unofficial WhatsApp-Web libraries are deliberately NOT used:
// they violate WhatsApp's ToS and get the number banned.
export interface WhatsAppProvider {
  readonly isDevOnly: boolean;
  // Resolves { success:false } instead of throwing so callers can fall back to SMS.
  sendOtp(phone: string, code: string): Promise<{ success: boolean }>;
}

class ConsoleWhatsAppProvider implements WhatsAppProvider {
  readonly isDevOnly = true;
  async sendOtp(phone: string, code: string) {
    // eslint-disable-next-line no-console
    console.log(`[DEV WHATSAPP] to ${phone}: code ${code}`);
    return { success: true };
  }
}

class MetaWhatsAppCloudProvider implements WhatsAppProvider {
  readonly isDevOnly = false;
  async sendOtp(phone: string, code: string) {
    const version = process.env.WHATSAPP_API_VERSION || "v21.0";
    const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const template = process.env.WHATSAPP_OTP_TEMPLATE || "otp_login";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/^\+/, ""),
          type: "template",
          template: {
            name: template,
            language: { code: "ar" },
            components: [
              { type: "body", parameters: [{ type: "text", text: code }] },
              // Authentication templates with a copy-code button need this too.
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
            ],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("[WHATSAPP] send failed", res.status, await res.text().catch(() => ""));
        return { success: false };
      }
      return { success: true };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[WHATSAPP] send error", e);
      return { success: false };
    }
  }
}

const hasMetaConfig = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
export const whatsappProvider: WhatsAppProvider = hasMetaConfig
  ? new MetaWhatsAppCloudProvider()
  : new ConsoleWhatsAppProvider();
