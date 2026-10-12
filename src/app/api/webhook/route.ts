// WhatsApp (Meta) webhook verification handshake.
// Meta calls GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// and expects the challenge echoed back as plain text when the token matches.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = process.env.WEBHOOK_VERIFY_TOKEN;

  if (!expected || token !== expected || challenge === null) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
