// Sending an SMS costs real money per message (a few cents to a few
// piasters depending on the gateway and country), which is why this is
// a swappable interface rather than a hardcoded vendor call. In dev, the
// code is just logged to the server console so you can test the whole
// login flow without spending anything or signing up for a gateway.
export interface SmsProvider {
  // true for the console provider: it "delivers" by printing the code in the
  // server log, which is fine on a laptop and a disaster in production.
  readonly isDevOnly: boolean;
  send(phone: string, message: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  readonly isDevOnly = true;
  async send(phone: string, message: string) {
    // eslint-disable-next-line no-console
    console.log(`[DEV SMS] to ${phone}: ${message}`);
  }
}

// Uncomment and fill in once you pick a real gateway. Two realistic
// options for Egypt: a local aggregator (cheaper per-SMS, EGP billing,
// e.g. Vodafone/Orange Egypt bulk SMS APIs) or an international one like
// Twilio (easier API, priced in USD, higher per-SMS cost for EG numbers).
//
// class TwilioSmsProvider implements SmsProvider {
//   async send(phone: string, message: string) {
//     const client = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
//     await client.messages.create({ to: phone, from: process.env.TWILIO_FROM, body: message });
//   }
// }

export const smsProvider: SmsProvider = new ConsoleSmsProvider();
