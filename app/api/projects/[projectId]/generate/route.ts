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

// ── Richer file manifests with component library structure ──────────
const FRAMEWORK_FILES: Record<Framework, string[]> = {
  nextjs: [
    "app/globals.css",
    "app/layout.tsx",
    "app/page.tsx",
    "components/ui/button.tsx",
    "components/ui/card.tsx",
    "components/ui/badge.tsx",
    "components/ui/input.tsx",
    "components/Navbar.tsx",
    "components/Hero.tsx",
    "components/Features.tsx",
    "components/Testimonials.tsx",
    "components/CTA.tsx",
    "components/Footer.tsx",
    "lib/cn.ts",
  ],
  react: [
    "index.html",
    "src/index.css",
    "src/main.tsx",
    "src/App.tsx",
    "src/lib/cn.ts",
    "src/components/ui/button.tsx",
    "src/components/ui/card.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/input.tsx",
    "src/components/Navbar.tsx",
    "src/components/Hero.tsx",
    "src/components/Features.tsx",
    "src/components/Testimonials.tsx",
    "src/components/CTA.tsx",
    "src/components/Footer.tsx",
  ],
  "html-css-js": [
    "index.html",
    "styles/main.css",
    "styles/components.css",
    "scripts/main.js",
    "scripts/animations.js",
  ],
  "vanilla-js": [
    "index.html",
    "styles/main.css",
    "styles/components.css",
    "src/main.js",
    "src/app.js",
    "src/components.js",
  ],
};

// ── Package.json with component library deps ───────────────────────
const FRAMEWORK_PACKAGE_JSON: Partial<Record<Framework, string>> = {
  react: JSON.stringify({
    name: "buildzero-app",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite --port 3000 --host 0.0.0.0",
      build: "tsc -b && vite build",
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      clsx: "^2.1.1",
      "tailwind-merge": "^2.6.0",
      "lucide-react": "^0.475.0",
      "class-variance-authority": "^0.7.0",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.1",
      vite: "^5.4.2",
      typescript: "^5.5.3",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      tailwindcss: "^3.4.4",
      postcss: "^8.4.38",
      autoprefixer: "^10.4.19",
    },
  }, null, 2),
  "vanilla-js": JSON.stringify({
    name: "buildzero-app",
    type: "module",
    version: "0.0.0",
    scripts: { dev: "node _server.mjs" },
  }, null, 2),
  "html-css-js": JSON.stringify({
    name: "buildzero-app",
    version: "0.0.0",
    scripts: { dev: "node _server.mjs" },
  }, null, 2),
  nextjs: JSON.stringify({
    name: "buildzero-app",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint"
    },
    dependencies: {
      next: "15.0.0",
      react: "18.3.1",
      "react-dom": "18.3.1",
      "lucide-react": "^0.475.0",
      "clsx": "^2.1.1",
      "tailwind-merge": "^2.6.0"
    },
    devDependencies: {
      typescript: "^5.0.0",
      "@types/node": "^20.0.0",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      postcss: "^8.0.0",
      tailwindcss: "^3.4.0",
      eslint: "^8.0.0",
      "eslint-config-next": "15.0.0"
    }
  }, null, 2),
};

// ── Component library architecture prompt ──────────────────────────
const COMPONENT_LIB = `
COMPONENT LIBRARY ARCHITECTURE (shadcn/ui + Radix UI style):

Create reusable UI primitives in components/ui/. These are the building blocks ALL page components must use:

1. button.tsx — Variants: "default" (gradient), "outline", "ghost", "destructive". Sizes: sm/default/lg.
   Use a simple variant props pattern with cn() for conditional classes. Must include hover animations and focus rings.

2. card.tsx — Export: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
   Style: bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl. Hover: bg-white/8 -translate-y-0.5.

3. badge.tsx — Variants: default/secondary/outline/success/warning. Pill shape with colored backgrounds.

4. input.tsx — Dark themed, focus:ring-indigo-500, rounded-xl. Include label and error state support.

5. cn.ts — Class name merge utility:
   import { clsx } from "clsx"; import { twMerge } from "tailwind-merge";
   export function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

ALL page components (Navbar, Hero, Features, Testimonials, CTA, Footer) MUST import and compose these UI primitives.
Hero uses <Button>, Features uses <Card>, CTA uses <Button> + <Input>, etc.

ICONS: Use lucide-react icons (import { Icon } from "lucide-react") for visual richness throughout.
`;

function buildPrompt(framework: Framework, project: {
  name: string; description: string; onboardingAnswers: Record<string, string>;
}) {
  const files = FRAMEWORK_FILES[framework].map((f) => `- ${f}`).join("\n");

  // Structure user's chat answers cleanly
  const answerEntries = Object.entries(project.onboardingAnswers ?? {});
  const structuredAnswers = answerEntries.length > 0
    ? answerEntries.map(([q, a], i) => `${i + 1}. ${q.substring(0, 200)}\n   → ${a}`).join("\n\n")
    : "";

  const designSystem = getDesignSystemPrompt(framework);

  const system = `${designSystem}

${COMPONENT_LIB}

OUTPUT FORMAT RULES (critical):
1. Output ONLY <file> XML blocks — no explanation, no markdown, no preamble
2. Each file: <file path="relative/path/file.ext">\ncomplete content\n</file>
3. Paths must NOT start with /
4. Every file MUST be 100% complete — no "// TODO", no "..." placeholders, no truncation
5. Files must work together as a cohesive, fully functional project
6. Create UI primitive components FIRST, then page-level components that import them
7. Use **NAMED EXPORTS** for ALL components (e.g., export function Navbar() { ... })
8. Use the cn() utility for all conditional class names`;

  const user = `Build a FULLY FUNCTIONAL, PRODUCTION-QUALITY project with stunning design:

PROJECT: ${project.name}
DESCRIPTION: ${project.description}
FRAMEWORK: ${framework}

USER REQUIREMENTS:
${structuredAnswers || "No specific requirements — use best practices for this type of project."}

FILES TO GENERATE (in this exact order):
${files}

DESIGN RULES:
- Dark theme: #0f0f13 / slate-950 backgrounds
- Gradient accents: indigo (#6366f1) → violet (#8b5cf6) → cyan (#06b6d4)
- Glassmorphism: bg-white/5 backdrop-blur-xl border-white/10
- Gradient text on ALL main headings
- shadcn/ui-style reusable Button, Card, Badge, Input in components/ui/
- Smooth hover transitions on every interactive element
- Scroll-triggered fade-in animations
- Fully responsive mobile-first layout
- Real content relevant to: "${project.name}"
- At least 5 distinct visual sections on the main page
- Professional, startup-quality polish

Start IMMEDIATELY with <file path="...">`;

  return { system, user };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const { projectId } = await params;
  await connectDB();

  // Optional refinement instruction from client
  let refinement: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    refinement = body?.refinement?.trim() || undefined;
  } catch { /* no body */ }

  let user = await User.findOne({ email: session.user.email });
  if (!user) {
    user = await User.create({
      email:      session.user.email,
      name:       session.user.name ?? "User",
      image:      session.user.image ?? "",
      provider:   "demo",
      providerId: session.user.email,
    });
  }

  const project = await Project.findOne({ _id: projectId, userId: user._id });
  if (!project) return new Response("Project not found", { status: 404 });

  const enc = new TextEncoder();
  const sse = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

  const readableStream = new ReadableStream({
    async start(ctrl) {
      try {
        ctrl.enqueue(sse({ type: "status", message: refinement ? "Applying your refinement…" : "Connecting to AI…" }));

        const { system, user: userPrompt } = buildPrompt(
          project.framework as Framework,
          {
            name:              project.name,
            description:       project.description,
            onboardingAnswers: (project.onboardingAnswers as Record<string, string>) ?? {},
          }
        );

        // If refining, append the refinement instruction to the user prompt
        const finalUserPrompt = refinement
          ? `${userPrompt}\n\nREFINEMENT REQUEST: The user wants you to update the website with this change:\n"${refinement}"\n\nRegenerate ALL files incorporating this change. Keep everything that was good before.`
          : userPrompt;

        ctrl.enqueue(sse({ type: "status", message: refinement ? "Regenerating with changes…" : "Designing your UI with AI…" }));

        let buf = "", insideFile = false, curPath = "", contentBuf = "";
        const fileCount = { n: 0 };

        for await (const chunk of streamAI({ system, user: finalUserPrompt, maxTokens: 8000 })) {
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

        // Inject framework config files (vite.config, tsconfig) for React
        if (project.framework === "react") {
          const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 3000, host: '0.0.0.0' } });
`;
          const tsConfig = JSON.stringify({ compilerOptions: { target: "ES2020", useDefineForClassFields: true, lib: ["ES2020","DOM","DOM.Iterable"], module: "ESNext", skipLibCheck: true, moduleResolution: "bundler", allowImportingTsExtensions: true, isolatedModules: true, jsx: "react-jsx", strict: true }, include: ["src"] }, null, 2);
          for (const [path, content2, lang] of [["vite.config.ts", viteConfig, "typescript"], ["tsconfig.json", tsConfig, "json"]] as const) {
            await Project.findByIdAndUpdate(projectId, {
              $push: { files: { fileName: path, filePath: path, content: content2, language: lang, fileType: "text" } },
            });
            ctrl.enqueue(sse({ type: "file", fileName: path, filePath: path, content: content2, language: lang }));
          }
        }

        // Also save the framework-specific package.json to DB
        const frameworkPkg = FRAMEWORK_PACKAGE_JSON[project.framework as Framework];
        if (frameworkPkg) {
          await Project.findByIdAndUpdate(projectId, {
            $pull: { files: { filePath: "package.json" } },
          });
          await Project.findByIdAndUpdate(projectId, {
            $push: { files: { fileName: "package.json", filePath: "package.json", content: frameworkPkg, language: "json", fileType: "text" } },
          });
          ctrl.enqueue(sse({ type: "file", fileName: "package.json", filePath: "package.json", content: frameworkPkg, language: "json" }));
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