import OpenAI from "openai";

/**
 * DeepSeek speaks the OpenAI protocol, so we reuse the OpenAI SDK and
 * just point it at a different base URL.
 *
 * This file is server-only. The key is read from process.env and is never
 * sent to the browser — no `NEXT_PUBLIC_` prefix anywhere.
 */

export class DeepSeekError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY is not set. Add it to .env.local and restart the dev server.",
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
      timeout: 120_000,
      maxRetries: 1,
    });
  }

  return client;
}

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

/** Turn an SDK error into a message that tells the user what to actually do. */
function toDeepSeekError(error: unknown): DeepSeekError {
  const err = error as { status?: number; message?: string };

  if (err.status === 401) {
    return new DeepSeekError(
      "DeepSeek rejected the API key. Check DEEPSEEK_API_KEY in your environment.",
      401,
    );
  }
  if (err.status === 402) {
    return new DeepSeekError(
      "DeepSeek account is out of credit. Top up at platform.deepseek.com.",
      402,
    );
  }
  if (err.status === 429) {
    return new DeepSeekError(
      "DeepSeek is rate limiting the account. Wait a moment and try again.",
      429,
    );
  }

  return new DeepSeekError(
    err.message || "Could not reach DeepSeek. Check your connection and try again.",
    err.status,
  );
}

/**
 * Ask DeepSeek for a JSON object and parse it.
 *
 * `response_format: json_object` makes the model emit valid JSON instead of
 * prose wrapped in markdown fences. We still strip fences defensively,
 * because a model under load occasionally ignores the flag.
 */
export async function completeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  { temperature = 0.4 }: { temperature?: number } = {},
): Promise<T> {
  const openai = getClient();

  let raw: string | null | undefined;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    raw = completion.choices[0]?.message?.content;
  } catch (error) {
    throw toDeepSeekError(error);
  }

  if (!raw) {
    throw new DeepSeekError("DeepSeek returned an empty response. Try again.");
  }

  return parseJSONResponse<T>(raw);
}

/**
 * Ask DeepSeek for plain prose and return it as-is.
 *
 * Used for the cover letter, whose prompt ends with "Return ONLY the finished
 * cover letter" — wrapping that in JSON mode would fight the instruction.
 */
export async function completeText(
  systemPrompt: string,
  userPrompt: string,
  { temperature = 0.7, maxTokens = 1200 }: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const openai = getClient();

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    if (!raw) {
      throw new DeepSeekError("DeepSeek returned an empty cover letter. Try again.");
    }

    // Models occasionally wrap prose in fences despite being told not to.
    return raw
      .replace(/^```(?:\w+)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  } catch (error) {
    if (error instanceof DeepSeekError) throw error;
    throw toDeepSeekError(error);
  }
}

/** Strip markdown fences and parse, with a readable error if it still fails. */
export function parseJSONResponse<T>(raw: string): T {
  let text = raw.trim();

  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  // Last resort: grab the outermost braces.
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new DeepSeekError(
      "DeepSeek returned something that was not valid JSON. Try generating again.",
    );
  }
}
