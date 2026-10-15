import {
  applyWhatsAppRsvp,
  type WhatsAppRsvpResult,
} from "@/lib/db/whatsappRsvp";
import {
  extractIncomingMessages,
  isValidWebhookSignature,
  sendWhatsAppText,
} from "@/lib/whatsapp";

// WhatsApp (Meta) webhook verification handshake.
// Meta calls GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// and expects the challenge echoed back as plain text when the token matches.
// The token is read from WHATSAPP_VERIFY_TOKEN, or the older
// WEBHOOK_VERIFY_TOKEN name so existing deployments keep working.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = (
    process.env.WHATSAPP_VERIFY_TOKEN || process.env.WEBHOOK_VERIFY_TOKEN
  )?.trim();

  if (
    mode !== "subscribe" ||
    !expected ||
    token !== expected ||
    challenge === null
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// Guest replies to RSVP messages. Meta POSTs every incoming message (and
// delivery status updates) here, signed with the app secret. Each RSVP answer
// updates the guest in Supabase and gets a short confirmation reply.
//
// Meta retries until it gets a 200, so per-message failures are logged
// rather than failing the whole delivery.
export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    console.error("WHATSAPP_APP_SECRET is not set; rejecting webhook POST");
    return new Response("Not configured", { status: 503 });
  }

  const rawBody = await request.text();
  if (
    !isValidWebhookSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      appSecret,
    )
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  for (const message of extractIncomingMessages(payload)) {
    if (alreadyHandled(message.id)) continue;
    try {
      const result = await applyWhatsAppRsvp(
        message.from,
        message.text,
        message.buttonPayload,
      );
      const reply = replyText(result);
      if (reply) await sendWhatsAppText(message.from, reply);
    } catch (error) {
      console.error(`Failed to handle WhatsApp message ${message.id}`, error);
    }
  }

  return new Response("OK", { status: 200 });
}

// Meta may deliver the same message more than once. Remembered in this
// process only, which is enough to avoid double confirmation replies; the
// RSVP update itself is safe to repeat.
const handledMessageIds = new Set<string>();
const MAX_REMEMBERED_IDS = 5_000;

function alreadyHandled(id: string): boolean {
  if (handledMessageIds.has(id)) return true;
  if (handledMessageIds.size >= MAX_REMEMBERED_IDS) handledMessageIds.clear();
  handledMessageIds.add(id);
  return false;
}

function replyText(result: WhatsAppRsvpResult): string | null {
  if (!result.ok) {
    switch (result.reason) {
      case "unrecognized":
        return 'לא הצלחנו להבין את התשובה 🙏 אפשר להשיב "כן", "לא", או את מספר המגיעים (למשל: כן 3).';
      case "closed":
        return "אישורי ההגעה לאירוע נסגרו. לשינויים יש לפנות למארגנים.";
      // Not a guest we messaged; stay quiet.
      case "not_found":
        return null;
    }
  }
  const { answer, event } = result;
  if (!answer.attending) {
    return `תודה על העדכון. רשמנו שלא תוכלו להגיע לאירוע של ${event.coupleNames}.`;
  }
  const count = answer.count ?? result.guest.partySize;
  return `תודה! אישרנו הגעה של ${count} ${count === 1 ? "אורח" : "אורחים"} לאירוע של ${event.coupleNames} 🎉`;
}
