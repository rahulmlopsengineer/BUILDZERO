/**
 * GET /api/test-claude
 * Quick endpoint to verify your Anthropic API key works.
 * Open in browser: http://localhost:3000/api/test-claude
 */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "ANTHROPIC_API_KEY is not set in .env.local",
    }, { status: 500 });
  }

  if (!key.startsWith("sk-ant-")) {
    return NextResponse.json({
      ok: false,
      error: `API key looks wrong — should start with "sk-ant-", got: ${key.slice(0, 10)}...`,
    }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey: key });

    const start = Date.now();
    const msg = await client.messages.create({
      model:      "claude-haiku-3-20240307",
      max_tokens: 30,
      messages:   [{ role: "user", content: 'Reply with exactly: {"ok":true}' }],
    });
    const ms = Date.now() - start;

    return NextResponse.json({
      ok:       true,
      model:    "claude-haiku-3-20240307",
      latency:  `${ms}ms`,
      response: msg.content[0],
      keyPrefix: key.slice(0, 14) + "...",
    });

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error,
      keyPrefix: key.slice(0, 14) + "...",
    }, { status: 500 });
  }
}