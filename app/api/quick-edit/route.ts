import { streamAI } from "@/lib/providers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { instruction, code, language } = await req.json();

  const system = `You are an expert code editor.
Return ONLY the modified code — no explanations, no markdown fences, no preamble.
Preserve indentation and formatting exactly.`;

  const user = `Language: ${language || "typescript"}

Code:
${code}

Instruction: ${instruction}`;

  const enc = new TextEncoder();

  const readable = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const chunk of streamAI({ system, user, maxTokens: 4000 })) {
          ctrl.enqueue(enc.encode(`0:${JSON.stringify(chunk.text)}\n`));
        }
        ctrl.enqueue(enc.encode(`d:{"finishReason":"stop"}\n`));
        ctrl.close();
      } catch (err) {
        ctrl.enqueue(enc.encode(`3:${JSON.stringify(String(err))}\n`));
        ctrl.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":            "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control":           "no-cache",
    },
  });
}