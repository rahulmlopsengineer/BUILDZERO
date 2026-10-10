import { streamAI } from "@/lib/providers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { messages, fileContext } = await req.json();

  const history = (messages as Array<{ role: string; content: string }>)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const system = `You are an expert AI coding assistant inside Polaris IDE.
Be concise and precise. Use markdown code blocks for all code examples.
${fileContext ? `\nCurrently open file:\n\`\`\`\n${fileContext.slice(0, 3000)}\n\`\`\`` : ""}`;

  const enc = new TextEncoder();

  const readable = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const chunk of streamAI({ system, user: history, maxTokens: 1000 })) {
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