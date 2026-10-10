import { auth }        from "@/lib/auth";
import { connectDB }   from "@/lib/mongoose";
import { User }        from "@/models/User";
import { Project, type Framework } from "@/models/Project";
import { streamAI }    from "@/lib/providers";
import { getDesignSystemPrompt } from "@/lib/design-system";

export const runtime     = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    css: "css", html: "html", json: "json", md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

// More files = richer UI
const FRAMEWORK_FILES: Record<Framework, string[]> = {
  nextjs: [
    "tailwind.config.ts",
    "app/globals.css",
    "app/layout.tsx",
    "app/page.tsx",
    "components/Navbar.tsx",
    "components/Hero.tsx",
    "components/Features.tsx",
    "components/Footer.tsx",
  ],
  react: [
    "tailwind.config.ts",
    "src/index.css",
    "src/main.tsx",
    "src/App.tsx",
    "src/components/Navbar.tsx",
    "src/components/Hero.tsx",
    "src/components/Features.tsx",
  ],
  "html-css-js": [
    "index.html",
    "styles/main.css",
    "scripts/main.js",
  ],
  "vanilla-js": [
    "index.html",
    "styles/main.css",
    "src/main.js",
    "src/components/app.js",
  ],
};

function buildPrompt(framework: Framework, project: {
  name: string; description: string; onboardingAnswers: Record<string, string>;
}) {
  const files   = FRAMEWORK_FILES[framework].map((f) => `- ${f}`).join("\n");
  const answers = Object.entries(project.onboardingAnswers ?? {})
    .map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n");

  // Get the rich design system prompt for this framework
  const designSystem = getDesignSystemPrompt(framework);

  const system = `${designSystem}

OUTPUT FORMAT RULES (critical):
1. Output ONLY <file> XML blocks — no explanation, no markdown, no preamble
2. Each file: <file path="relative/path/file.ext">\\ncomplete content\\n</file>
3. Paths must NOT start with /
4. Every file MUST be 100% complete — no "// TODO", no "..." placeholders
5. Files must work together as a cohesive project`;

  const user = `Build this project with stunning, professional UI design:

Project Name: ${project.name}
Description: ${project.description}
${answers ? `\nUser requirements:\n${answers}` : ""}

Generate these files — make each one complete, beautiful, and production-quality:
${files}

DESIGN REQUIREMENTS:
- Dark theme with gradient accents (indigo/violet/cyan palette)
- Glassmorphism cards with backdrop blur
- Gradient text on main headings
- Animated elements and smooth hover transitions  
- Professional startup-quality visual design
- Fully responsive layout
- Real content relevant to: ${project.name} — ${project.description}

Start immediately with the first <file path="..."> tag.`;

  return { system, user };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const { projectId } = await params;
  await connectDB();

  const user = await User.findOne({ email: session.user.email });
  if (!user) return new Response("User not found", { status: 404 });

  const project = await Project.findOne({ _id: projectId, userId: user._id });
  if (!project) return new Response("Project not found", { status: 404 });

  const enc = new TextEncoder();
  const sse = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

  const readableStream = new ReadableStream({
    async start(ctrl) {
      try {
        ctrl.enqueue(sse({ type: "status", message: "Connecting to local Ollama…" }));

        const { system, user: userPrompt } = buildPrompt(
          project.framework as Framework,
          {
            name:              project.name,
            description:       project.description,
            onboardingAnswers: (project.onboardingAnswers as Record<string, string>) ?? {},
          }
        );

        ctrl.enqueue(sse({ type: "status", message: "Designing your UI with Ollama…" }));

        let buf = "", insideFile = false, curPath = "", contentBuf = "";
        const fileCount = { n: 0 };

        for await (const chunk of streamAI({ system, user: userPrompt, maxTokens: 16000 })) {
          buf += chunk.text;

          while (buf.length > 0) {
            if (!insideFile) {
              const m = buf.match(/<file\s+path="([^"]+)">/);
              if (!m) { buf = buf.slice(-50); break; }
              const idx = buf.indexOf(m[0]);
              curPath = m[1].trim(); contentBuf = ""; insideFile = true;
              buf = buf.slice(idx + m[0].length);
            } else {
              const closeIdx = buf.indexOf("</file>");
              if (closeIdx === -1) {
                if (buf.length > 9) { contentBuf += buf.slice(0, buf.length - 9); buf = buf.slice(buf.length - 9); }
                break;
              }
              contentBuf += buf.slice(0, closeIdx);
              buf = buf.slice(closeIdx + 7);
              insideFile = false;

              const filePath = curPath;
              const content  = contentBuf.trim();
              const fileName = filePath.split("/").pop() ?? filePath;
              const language = detectLanguage(filePath);
              fileCount.n++;

              ctrl.enqueue(sse({ type: "file", fileName, filePath, content, language }));
              ctrl.enqueue(sse({ type: "status", message: `✓ ${fileName} (${fileCount.n} files)` }));

              Project.findByIdAndUpdate(projectId, {
                $push: { files: { fileName, filePath, content, language, fileType: "text" } },
              }).catch(console.error);

              contentBuf = ""; curPath = "";
            }
          }
        }

        await Project.findByIdAndUpdate(projectId, { $set: { status: "ready" } });
        ctrl.enqueue(sse({ type: "done", projectId, fileCount: fileCount.n }));
        ctrl.close();

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[generate] error:", msg);
        ctrl.enqueue(sse({ type: "error", message: msg }));
        await Project.findByIdAndUpdate(projectId, { $set: { status: "error" } }).catch(() => {});
        ctrl.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type":      "text/event-stream; charset=utf-8",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
