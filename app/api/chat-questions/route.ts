export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { streamChatAI } from "@/lib/providers";

const MAX_QUESTIONS = 5;

const SYSTEM_PROMPT = `You are BuildZero's onboarding assistant — a senior full-stack engineer and product designer.

Your job is to ask the user exactly ${MAX_QUESTIONS} smart, concise questions to fully understand what website or web app they want to build. You will receive:
- The chosen framework (Next.js, React, HTML/CSS/JS, or Vanilla JS)
- The conversation history so far

RULES:
1. Ask ONE question at a time — short, clear, friendly.
2. The first question should ALWAYS be about the project name.
3. Questions should progressively cover: purpose/type, key features/pages, target audience, and visual style/design preferences.
4. Adapt follow-up questions based on user answers — be smart and contextual.
5. After exactly ${MAX_QUESTIONS} answers are collected, respond with ONLY the text: __COMPLETE__
6. Use markdown **bold** for emphasis. Keep responses under 2 sentences.
7. Never repeat a question. Never ask more than ${MAX_QUESTIONS} questions total.`;

export async function POST(req: Request) {
  try {
    const { framework, messages } = await req.json();

    if (!framework) {
      return NextResponse.json({ error: "framework required" }, { status: 400 });
    }

    // Count how many user messages we have (= number of answers so far)
    const userMessages = (messages ?? []).filter(
      (m: { role: string }) => m.role === "user"
    );

    // If we already have MAX_QUESTIONS answers, signal completion
    if (userMessages.length >= MAX_QUESTIONS) {
      return NextResponse.json({ reply: "__COMPLETE__" });
    }

    const frameworkLabel: Record<string, string> = {
      nextjs: "Next.js (App Router + TypeScript + Tailwind)",
      react: "React (Vite + TypeScript + Tailwind)",
      "html-css-js": "HTML / CSS / JavaScript (no build tools)",
      "vanilla-js": "Vanilla JavaScript (ES Modules)",
    };

    const contextMessage = `Framework chosen: ${frameworkLabel[framework] ?? framework}. Question ${userMessages.length + 1} of ${MAX_QUESTIONS}.`;

    const conversation = (messages ?? [])
      .map((m: { role: string; content: string }) =>
        `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
      )
      .join("\n");

    let reply = "";
    for await (const chunk of streamChatAI({
      system: SYSTEM_PROMPT,
      user: `${contextMessage}\n\n${conversation || "No answers have been provided yet."}\n\n${
        conversation ? "Ask the next onboarding question." : `Start the onboarding. Ask question 1 of ${MAX_QUESTIONS}.`
      }`,
      maxTokens: 200,
    })) {
      reply += chunk.text;
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat-questions] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
