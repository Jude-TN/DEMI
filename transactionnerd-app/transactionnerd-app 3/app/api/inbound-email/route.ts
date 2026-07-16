import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { summarizeEmailForStream } from "@/lib/ai";

/**
 * Inbound email webhook.
 *
 * Point your email provider's inbound-parse webhook at this URL, e.g.
 * https://yourapp.vercel.app/api/inbound-email
 *
 * This is written for Postmark's inbound webhook JSON shape. If you use
 * Mailgun or SendGrid instead, adjust the field names in `parsePayload`
 * below to match their payload - the rest of the logic stays the same.
 */

function parsePayload(body: any) {
  // Postmark inbound webhook shape
  return {
    to: body.To || body.to || "",
    from: body.From || body.from || "",
    subject: body.Subject || body.subject || "",
    text: body.TextBody || body.text || body.stripped_text || "",
  };
}

// Extracts "88bimini-ave" from "88bimini-ave@deals.transactionnerd.com"
function extractSlug(toHeader: string) {
  const match = toHeader.match(/([a-z0-9-]+)@/i);
  return match ? match[1].toLowerCase() : null;
}

export async function POST(req: NextRequest) {
  // Basic shared-secret check. Set INBOUND_EMAIL_SECRET and configure your
  // email provider to send it as a query param: ?secret=xxx
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.INBOUND_EMAIL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { to, from, subject, text } = parsePayload(body);

  const slug = extractSlug(to);
  if (!slug) {
    return NextResponse.json({ error: "No transaction slug found in To address" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, address")
    .eq("email_slug", slug)
    .single();

  if (!transaction) {
    return NextResponse.json({ error: `No transaction found for slug: ${slug}` }, { status: 404 });
  }

  let summary: string;
  try {
    summary = await summarizeEmailForStream({
      address: transaction.address,
      subject,
      from,
      body: text,
    });
  } catch (err) {
    return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
  }

  // The model returns exactly "SKIP" for emails with nothing relevant to log.
  if (!summary || summary.trim().toUpperCase() === "SKIP") {
    return NextResponse.json({ skipped: true });
  }

  const { error: insertError } = await supabase.from("stream_entries").insert({
    transaction_id: transaction.id,
    source: "email",
    content: summary,
    raw_email: text?.slice(0, 5000),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, transaction_id: transaction.id, summary });
}
