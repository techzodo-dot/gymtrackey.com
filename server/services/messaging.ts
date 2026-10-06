import nodemailer from "nodemailer";
import type { ReminderChannel } from "@prisma/client";

export type SendResult = { ok: boolean; error?: string };

/** Provider-agnostic messaging. Add Twilio/etc. by implementing this interface and registering it. */
export interface MessageProvider {
  channel: ReminderChannel;
  configured(): boolean;
  send(to: string, text: string, subject?: string): Promise<SendResult>;
}

class SmtpEmailProvider implements MessageProvider {
  channel = "EMAIL" as const;
  configured = () => !!process.env.EMAIL_SERVER;
  async send(to: string, text: string, subject = "GymTrackey") {
    try {
      await nodemailer.createTransport(process.env.EMAIL_SERVER!).sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
      return { ok: true };
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "send failed" }; }
  }
}

/** Meta WhatsApp Cloud API (template-free text; production use needs approved templates). */
class MetaWhatsAppProvider implements MessageProvider {
  channel = "WHATSAPP" as const;
  configured = () => !!(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID);
  async send(to: string, text: string) {
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: text } }),
      });
      return r.ok ? { ok: true } : { ok: false, error: `WhatsApp API ${r.status}` };
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "send failed" }; }
  }
}

class UnconfiguredSms implements MessageProvider {
  channel = "SMS" as const;
  configured = () => false;
  async send(): Promise<SendResult> { return { ok: false, error: "SMS provider not configured" }; }
}

const providers: Record<ReminderChannel, MessageProvider> = {
  EMAIL: new SmtpEmailProvider(), WHATSAPP: new MetaWhatsAppProvider(), SMS: new UnconfiguredSms(),
};
export const providerFor = (c: ReminderChannel) => providers[c];
/** Test hook / future provider swap. */
export const registerProvider = (p: MessageProvider) => { providers[p.channel] = p; };

export const DEFAULT_TEMPLATE =
  "Hi {{member_name}}, your {{gym_name}} membership payment of ₹{{amount}} is due on {{due_date}}. Please renew your membership to continue your gym access.";

export function renderTemplate(t: string, vars: Record<string, string>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}
