/**
 * lib/providers/index.ts — AI Model Providers (Groq & Gemini)
 */

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface StreamChunk { text: string }
export interface GenerateOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

// ── Groq Client (Fast Code Generation) ───────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// openai/gpt-oss-120b: best for full project code generation (no free-tier OTPM cap)
const GROQ_CODE_MODEL  = process.env.GROQ_CODE_MODEL  ?? "openai/gpt-oss-120b";
// openai/gpt-oss-20b: faster & cheaper for short chat responses
const GROQ_CHAT_MODEL  = process.env.GROQ_CHAT_MODEL  ?? "openai/gpt-oss-20b";

/** Full project code generation — streams from openai/gpt-oss-120b */
export async function* streamAI(opts: GenerateOptions): AsyncGenerator<StreamChunk> {
  const stream = await groq.chat.completions.create({
    model: GROQ_CODE_MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    stream: true,
    messages: [
      { role: "system", content: opts.system },
      { role: "user",   content: opts.user },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) yield { text };
  }
}

/** Short onboarding chat — streams from openai/gpt-oss-20b (fast) */
export async function* streamChatAI(opts: GenerateOptions): AsyncGenerator<StreamChunk> {
  const stream = await groq.chat.completions.create({
    model: GROQ_CHAT_MODEL,
    max_tokens: opts.maxTokens ?? 400,
    stream: true,
    messages: [
      { role: "system", content: opts.system },
      { role: "user",   content: opts.user },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) yield { text };
  }
}

// ── Gemini Client (Chat & PDK Blueprint) ─────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

export async function generateGemini(opts: GenerateOptions): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: opts.system,
  });

  const result = await model.generateContent(opts.user);
  const response = await result.response;
  return response.text();
}

/**
 * streamGemini 
 * For real-time chat interactions (onboarding)
 */
export async function* streamGemini(opts: GenerateOptions, history: any[] = []): AsyncGenerator<StreamChunk> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: opts.system,
  });

  const mappedHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || " " }],
  }));

  // Gemini requires history to start with 'user' role
  if (mappedHistory.length > 0 && mappedHistory[0].role === "model") {
    mappedHistory.unshift({ role: "user", parts: [{ text: "Start" }] });
  }

  const chat = model.startChat({
    history: mappedHistory,
  });

  const result = await chat.sendMessageStream(opts.user);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield { text };
  }
}
