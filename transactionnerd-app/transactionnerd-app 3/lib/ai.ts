import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Turns a raw CC'd email into a single plain-language stream entry,
 * written for an agent who has no context beyond the transaction address.
 */
export async function summarizeEmailForStream(params: {
  address: string;
  subject: string;
  from: string;
  body: string;
}): Promise<string> {
  const { address, subject, from, body } = params;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system:
      "You write single-sentence updates for a real estate transaction activity stream. " +
      "The reader is a busy real estate agent checking on their deal. " +
      "Rules: one sentence, plain language, no jargon, no greeting, no signature, " +
      "state only the concrete fact or status change, never invent details not in the email. " +
      "If the email contains nothing relevant to the deal's status, respond with exactly: SKIP.",
    messages: [
      {
        role: "user",
        content:
          `Transaction: ${address}\nFrom: ${from}\nSubject: ${subject}\n\nEmail body:\n${body}\n\n` +
          "Write the one-sentence stream update.",
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
  return text;
}

/**
 * Rolls up the last N stream entries into a short "this week's summary"
 * block shown at the top of the agent's view.
 */
export async function summarizeWeek(entries: string[]): Promise<string> {
  if (entries.length === 0) {
    return "No updates yet. Your TC team will post here as things happen.";
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    system:
      "You summarize a real estate transaction's recent activity into 2-3 short sentences " +
      "for the listing/buyer's agent. Plain language, reassuring but honest tone, end by " +
      "stating clearly whether anything is needed from the agent right now.",
    messages: [
      {
        role: "user",
        content: `Recent activity log entries, oldest to newest:\n${entries.join("\n")}\n\nWrite the summary.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text.trim() : "";
}
