import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Meta WhatsApp Cloud API: sending messages and reading webhook payloads.
// Needs WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_ID (the sending number's
// Phone number ID, not the phone number itself). WHATSAPP_ACCOUNT_ID (the
// WhatsApp Business Account) isn't needed for sending; it's for managing
// templates and numbers.

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || "v23.0";
const SEND_TIMEOUT_MS = 15_000;

export type WhatsAppSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; reason: "not_configured" | "invalid_number" | "failed" };

// Meta wants international digits without "+". Israeli local numbers
// ("050-1234567") get their leading 0 swapped for 972.
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

async function postMessage(
  to: string,
  message: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
  if (!accessToken || !phoneId) return { ok: false, reason: "not_configured" };

  const recipient = toWhatsAppNumber(to);
  if (recipient.length < 10 || recipient.length > 15) {
    return { ok: false, reason: "invalid_number" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          ...message,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      console.error(
        `WhatsApp send responded ${response.status}`,
        await response.text().catch(() => ""),
      );
      return { ok: false, reason: "failed" };
    }
    const data = (await response.json().catch(() => null)) as {
      messages?: { id?: string }[];
    } | null;
    return { ok: true, messageId: data?.messages?.[0]?.id ?? null };
  } catch (error) {
    console.error("WhatsApp send request failed", error);
    return { ok: false, reason: "failed" };
  }
}

// Free-form text. WhatsApp only delivers these within 24 hours of the
// recipient's last message to us; to start a conversation, use a template.
export function sendWhatsAppText(
  to: string,
  text: string,
): Promise<WhatsAppSendResult> {
  return postMessage(to, {
    type: "text",
    text: { preview_url: true, body: text },
  });
}

// A message template approved in WhatsApp Manager. `bodyParams` fill the
// template body's {{1}}, {{2}}, ... in order.
export function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[] = [],
): Promise<WhatsAppSendResult> {
  return postMessage(to, {
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(bodyParams.length > 0 && {
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      }),
    },
  });
}

// Checks the X-Hub-Signature-256 header Meta signs each webhook POST with,
// using the app secret (App settings → Basic → App secret).
export function isValidWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest();
  const received = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

export interface IncomingWhatsAppMessage {
  id: string;
  // The sender's number as Meta sends it: international digits, no "+".
  from: string;
  // Typed text, or the title of a tapped quick-reply / list button.
  text: string;
  // The payload/id of a tapped button, when the message is a button reply.
  buttonPayload: string | null;
  timestamp: string;
}

// Pulls the guest messages out of a webhook payload. Delivery/read status
// updates and message types without text (images, stickers...) are skipped.
export function extractIncomingMessages(
  payload: unknown,
): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = [];
  const body = payload as {
    object?: string;
    entry?: { changes?: { field?: string; value?: { messages?: unknown[] } }[] }[];
  } | null;
  if (body?.object !== "whatsapp_business_account") return messages;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      for (const raw of change.value?.messages ?? []) {
        const message = raw as {
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string; payload?: string };
          interactive?: {
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string };
          };
        };
        if (!message.id || !message.from) continue;

        let text: string | undefined;
        let buttonPayload: string | null = null;
        if (message.type === "text") {
          text = message.text?.body;
        } else if (message.type === "button") {
          text = message.button?.text;
          buttonPayload = message.button?.payload ?? null;
        } else if (message.type === "interactive") {
          const reply =
            message.interactive?.button_reply ?? message.interactive?.list_reply;
          text = reply?.title;
          buttonPayload = reply?.id ?? null;
        }
        if (!text) continue;

        messages.push({
          id: message.id,
          from: message.from,
          text,
          buttonPayload,
          timestamp: message.timestamp ?? "",
        });
      }
    }
  }
  return messages;
}
