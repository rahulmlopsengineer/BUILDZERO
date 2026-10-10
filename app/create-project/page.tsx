"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Layers, Code2, Globe,
  Sparkles, SendHorizonal, Zap, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────
type Framework = "nextjs" | "react" | "html-css-js";
type Step = "framework" | "chat" | "generating" | "done";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface GeneratedFile {
  fileName: string;
  filePath: string;
  content: string;
  language: string;
}

const MAX_QUESTIONS = 5;

// ── Framework options ──────────────────────────────────────
const FRAMEWORKS = [
  {
    id:    "nextjs" as Framework,
    name:  "Next.js",
    desc:  "Full-stack · App Router · TypeScript · Tailwind",
    icon:  <Layers size={28} />,
    tag:   "Full-stack",
    ring:  "hover:border-white/40 hover:shadow-[0_0_24px_rgba(255,255,255,0.06)]",
    badge: "bg-white/8 text-white border-white/15",
    glow:  "rgba(255,255,255,0.04)",
  },
  {
    id:    "react" as Framework,
    name:  "React",
    desc:  "React 18 · Vite · TypeScript · Tailwind",
    icon:  <Code2 size={28} />,
    tag:   "Frontend SPA",
    ring:  "hover:border-accent-blue/40 hover:shadow-[0_0_24px_rgba(91,173,238,0.1)]",
    badge: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    glow:  "rgba(91,173,238,0.06)",
  },
  {
    id:    "html-css-js" as Framework,
    name:  "HTML / CSS / JS",
    desc:  "Pure HTML · CSS · JavaScript · No build tools",
    icon:  <Globe size={28} />,
    tag:   "Static",
    ring:  "hover:border-accent-amber/40 hover:shadow-[0_0_24px_rgba(232,168,58,0.1)]",
    badge: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
    glow:  "rgba(232,168,58,0.06)",
  },
];

// ── File dot color ─────────────────────────────────────────
function fileDotColor(fileName: string) {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) return "bg-accent-blue";
  if (fileName.endsWith(".css"))  return "bg-purple";
  if (fileName.endsWith(".json")) return "bg-accent-amber";
  if (fileName.endsWith(".html")) return "bg-accent-red";
  if (fileName.endsWith(".js"))   return "bg-accent-green";
  return "bg-text-3";
}

// ── Component ──────────────────────────────────────────────
export default function CreateProjectPage() {
  const router = useRouter();

  const [step, setStep]               = useState<Step>("framework");
  const [framework, setFramework]     = useState<Framework | null>(null);
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [answers, setAnswers]         = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ]       = useState(0);
  const [inputValue, setInputValue]   = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [genFiles, setGenFiles]       = useState<GeneratedFile[]>([]);
  const [genStatus, setGenStatus]     = useState("");
  const [projectId, setProjectId]     = useState<string | null>(null);
  const [genError, setGenError]       = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining]   = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const FALLBACK_QUESTIONS = [
    "What's the **name** of your project?",
    "What **type of website or app** are you building? (e.g., Portfolio, E-commerce, SaaS, Landing Page)",
    "What key **features or pages** would you like to include?",
    "Who is your **target audience**?",
    "What **visual style or design preferences** do you have? (e.g., modern dark theme, minimalist, vibrant)",
  ];

  // ── Ask AI for the next question ───────────────────────
  async function askClaude(chatHistory: ChatMessage[], fw: Framework): Promise<string> {
    const userCount = chatHistory.filter((m) => m.role === "user").length;
    try {
      const res = await fetch("/api/chat-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framework: fw, messages: chatHistory }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error || !data.reply?.trim()) {
        return FALLBACK_QUESTIONS[userCount] ?? "What else would you like to specify for your project?";
      }
      return data.reply.trim();
    } catch {
      return FALLBACK_QUESTIONS[userCount] ?? "What else would you like to specify for your project?";
    }
  }

  // ── Select framework → start chat ─────────────────────
  async function selectFramework(fw: Framework) {
    setFramework(fw);
    setStep("chat");
    setCurrentQ(0);
    setAnswers({});
    setMessages([]);
    setIsTyping(true);

    const reply = await askClaude([], fw);
    setIsTyping(false);
    setMessages([
      {
        role: "assistant",
        content: reply,
      },
    ]);
    inputRef.current?.focus();
  }

  // ── Send answer ────────────────────────────────────────
  async function handleSend() {
    if (!inputValue.trim() || !framework) return;
    const text = inputValue.trim();
    setInputValue("");

    // Store answer keyed by question number
    const lastAssistantMsg = messages.filter(m => m.role === "assistant").pop();
    const questionKey = lastAssistantMsg?.content ?? `Q${currentQ + 1}`;
    const newAnswers = { ...answers, [questionKey]: text };
    setAnswers(newAnswers);

    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setIsTyping(true);

    const nextQ = currentQ + 1;
    setCurrentQ(nextQ);

    if (nextQ < MAX_QUESTIONS) {
      const reply = await askClaude(updatedMessages, framework);
      setIsTyping(false);

      if (reply === "__COMPLETE__") {
        setCurrentQ(MAX_QUESTIONS);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Perfect! I have everything I need. 🎉\n\nClick **Create Project** below — AI will generate your complete codebase and you'll see each file appear in real time.",
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } else {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Perfect! I have everything I need. 🎉\n\nClick **Create Project** below — AI will generate your complete codebase and you'll see each file appear in real time.",
        },
      ]);
    }
    inputRef.current?.focus();
  }

  // ── Create project + stream ────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!framework) return;
    setStep("generating");
    setGenFiles([]);
    setGenError(null);

    // Extract project name from first answer, description from second
    const answerValues = Object.values(answers);
    const projectName = (answerValues[0] ?? "My Project")
      .replace(/[^a-zA-Z0-9 \-_]/g, "").trim().slice(0, 60) || "My Project";
    const description = answerValues[1] ?? "";

    // Abort controller — cancel if user navigates away or times out
    const abortCtrl = new AbortController();
    // 90-second hard timeout
    const timeoutId = setTimeout(() => abortCtrl.abort("timeout"), 90_000);

    try {
      // 1. Create project stub in MongoDB
      setGenStatus("Creating project…");
      const createRes = await fetch("/api/projects", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: projectName, description, framework, onboardingAnswers: answers }),
        signal:  abortCtrl.signal,
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => createRes.statusText);
        throw new Error(`Failed to create project (${createRes.status}): ${errText}`);
      }

      const { project } = await createRes.json().catch(() => ({}));
      if (!project?._id) throw new Error("Server returned invalid project object");
      setProjectId(project._id);
      setGenStatus("Connecting to Claude AI…");

      // 2. Stream generation
      const genRes = await fetch(`/api/projects/${project._id}/generate`, {
        method: "POST",
        signal: abortCtrl.signal,
      });

      if (!genRes.ok) {
        const errText = await genRes.text().catch(() => genRes.statusText);
        throw new Error(`Generation failed (${genRes.status}): ${errText}`);
      }
      if (!genRes.body) throw new Error("No response body from server");

      const reader  = genRes.body.getReader();
      const decoder = new TextDecoder();
      let   tail    = "";
      let   gotFile = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        tail += decoder.decode(value, { stream: true });
        const lines = tail.split("\n");
        tail = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "status") {
              setGenStatus(evt.message);
            } else if (evt.type === "file") {
              gotFile = true;
              setGenFiles((p) => [...p, evt]);
            } else if (evt.type === "done") {
              clearTimeout(timeoutId);
              setStep("done");
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          } catch (parseErr) {
            // ignore JSON parse errors on malformed chunks
          }
        }
      }

      // If stream ended but we never got a "done" event
      if (gotFile) setStep("done");

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("timeout") || msg.includes("abort")) {
        setGenError("Request timed out after 90 seconds. Check your ANTHROPIC_API_KEY and try again.");
      } else {
        setGenError(msg);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [framework, answers]);

  // ── Refine — re-generate with user feedback ─────────────
  const handleRefine = useCallback(async () => {
    if (!projectId || !refineInput.trim()) return;
    setIsRefining(true);
    setGenFiles([]);
    setGenError(null);
    setStep("generating");
    setGenStatus("Applying your changes…");

    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort("timeout"), 90_000);

    try {
      const genRes = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refinement: refineInput.trim() }),
        signal: abortCtrl.signal,
      });

      if (!genRes.ok) throw new Error(`Refine failed (${genRes.status})`);
      if (!genRes.body) throw new Error("No response body");

      const reader  = genRes.body.getReader();
      const decoder = new TextDecoder();
      let   tail    = "";
      let   gotFile = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        tail += decoder.decode(value, { stream: true });
        const lines = tail.split("\n");
        tail = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "status") setGenStatus(evt.message);
            else if (evt.type === "file") { gotFile = true; setGenFiles(p => [...p, evt]); }
            else if (evt.type === "done") { clearTimeout(timeoutId); setStep("done"); }
            else if (evt.type === "error") throw new Error(evt.message);
          } catch { /* ignore parse errors */ }
        }
      }

      if (gotFile) setStep("done");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      setGenError(msg);
    } finally {
      clearTimeout(timeoutId);
      setIsRefining(false);
      setRefineInput("");
    }
  }, [projectId, refineInput]);

  const allAnswered = framework && currentQ >= MAX_QUESTIONS;
  const progress    = framework ? Math.min(currentQ, MAX_QUESTIONS) / MAX_QUESTIONS : 0;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-0 font-sans flex flex-col text-text">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(#7c6ef5 1px,transparent 1px),linear-gradient(90deg,#7c6ef5 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Header ── */}
      <header className="relative border-b border-border bg-bg-1/80 backdrop-blur-sm px-6 h-14 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === "framework" ? router.push("/dashboard") : setStep("framework")}
            className="flex items-center gap-1.5 text-[13px] text-text-3 hover:text-text border-none bg-transparent cursor-pointer font-sans transition-colors"
          >
            <ArrowLeft size={14} />
            {step === "framework" ? "Dashboard" : "Back"}
          </button>
          <span className="text-text-3 text-[13px]">/</span>
          <span className="text-[13px] text-text-2">New Project</span>
          {framework && (
            <>
              <span className="text-text-3 text-[13px]">/</span>
              <span className="text-[13px] text-purple">{FRAMEWORKS.find(f=>f.id===framework)?.name}</span>
            </>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {(["framework","chat","generating"] as Step[]).map((s, i) => {
            const stepOrder = ["framework","chat","generating","done"];
            const cur = stepOrder.indexOf(step);
            const idx = stepOrder.indexOf(s);
            return (
              <div key={s} className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                cur === idx ? "w-6 bg-purple" : cur > idx ? "w-1.5 bg-purple/40" : "w-1.5 bg-bg-4"
              )} />
            );
          })}
        </div>
      </header>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-hidden">

        {/* ── STEP 1: Framework ── */}
        {step === "framework" && (
          <div className="w-full max-w-3xl animate-[fadeIn_0.3s_ease]">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple/10 border border-purple/20 text-purple text-[12px] mb-5">
                <Sparkles size={12} />
                AI-powered project generation
              </div>
              <h1 className="text-[34px] font-semibold tracking-tight mb-3">
                Choose your framework
              </h1>
              <p className="text-text-3 text-[15px] max-w-md mx-auto leading-relaxed">
                Pick a stack and AI will generate your entire project after a short conversation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => selectFramework(fw.id)}
                  className={cn(
                    "group relative flex flex-col items-start gap-4 p-6 rounded-2xl bg-bg-1 border-2 border-border cursor-pointer text-left transition-all duration-150",
                    fw.ring
                  )}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="text-text-2 group-hover:text-text transition-colors">
                      {fw.icon}
                    </div>
                    <span className={cn("text-[10.5px] px-2.5 py-1 rounded-full font-medium border", fw.badge)}>
                      {fw.tag}
                    </span>
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-text mb-1">{fw.name}</p>
                    <p className="text-[13px] text-text-3 leading-relaxed">{fw.desc}</p>
                  </div>
                  <ArrowRight
                    size={15}
                    className="absolute bottom-5 right-5 text-text-3 opacity-0 group-hover:opacity-100 transition-all translate-x-0 group-hover:translate-x-1 duration-150"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Chat ── */}
        {step === "chat" && framework && (
          <div className="w-full max-w-lg flex flex-col animate-[fadeIn_0.3s_ease]" style={{ height: "calc(100vh - 140px)", maxHeight: "680px" }}>

            {/* Badge */}
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium border", FRAMEWORKS.find(f=>f.id===framework)?.badge)}>
                {FRAMEWORKS.find(f=>f.id===framework)?.icon && (
                  <span className="w-3 h-3">{FRAMEWORKS.find(f=>f.id===framework)?.icon}</span>
                )}
                {FRAMEWORKS.find(f=>f.id===framework)?.name}
              </div>
              <span className="text-[11px] text-text-3">·</span>
              <span className="text-[11px] text-text-3">
                {Math.min(currentQ, MAX_QUESTIONS)} / {MAX_QUESTIONS} questions
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mb-4 min-h-0">
              {messages.filter((m) => m.content?.trim()).map((m, i) => (
                <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-purple/15 border border-purple/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={12} className="text-purple" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                      m.role === "assistant"
                        ? "bg-bg-2 border border-border text-text-2 rounded-tl-sm"
                        : "bg-purple/20 border border-purple/25 text-text rounded-tr-sm"
                    )}
                    dangerouslySetInnerHTML={{
                      __html: m.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\n/g, "<br/>"),
                    }}
                  />
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-purple/15 border border-purple/25 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={12} className="text-purple" />
                  </div>
                  <div className="bg-bg-2 border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0,1,2].map((j) => (
                      <span
                        key={j}
                        className="w-1.5 h-1.5 rounded-full bg-purple animate-bounce"
                        style={{ animationDelay: `${j * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Progress */}
            <div className="mb-3 flex-shrink-0">
              <div className="h-1 bg-bg-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple rounded-full transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {/* Input / Create button */}
            <div className="flex-shrink-0">
              {!allAnswered ? (
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type your answer…"
                    className="flex-1 bg-bg-2 border border-border-2 rounded-xl px-4 py-2.5 text-[13.5px] text-text placeholder:text-text-3 outline-none focus:border-purple/50 transition-colors font-sans"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="w-11 h-11 rounded-xl bg-purple flex items-center justify-center text-white border-none cursor-pointer disabled:opacity-40 hover:opacity-85 transition-opacity flex-shrink-0"
                  >
                    <SendHorizonal size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2.5 h-12 bg-purple rounded-xl text-white text-[14px] font-semibold border-none cursor-pointer hover:opacity-85 transition-opacity shadow-[0_0_28px_rgba(124,110,245,0.4)] font-sans"
                >
                  <Zap size={16} />
                  Create Project with AI
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3 & 4: Generating / Done ── */}
        {(step === "generating" || step === "done") && (
          <div className="w-full max-w-2xl animate-[fadeIn_0.3s_ease]">

            {/* Status header */}
            <div className="text-center mb-8">
              {step === "generating" ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-purple/15 border border-purple/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_32px_rgba(124,110,245,0.2)]">
                    <Loader2 size={28} className="text-purple animate-spin" />
                  </div>
                  <h2 className="text-[24px] font-semibold tracking-tight">Generating your project…</h2>
                  <p className="text-text-3 text-[13.5px] mt-2">{genStatus}</p>
                </>
              ) : genError ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border border-accent-red/25 flex items-center justify-center mx-auto mb-5">
                    <RefreshCw size={26} className="text-accent-red" />
                  </div>
                  <h2 className="text-[22px] font-semibold">Generation failed</h2>
                  <p className="text-accent-red text-[13px] mt-2 max-w-md mx-auto">{genError}</p>
                  <button
                    onClick={() => { setStep("chat"); setGenFiles([]); setGenError(null); }}
                    className="mt-4 text-[13px] text-purple underline cursor-pointer border-none bg-transparent font-sans"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/25 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(78,202,154,0.15)]">
                    <Check size={28} className="text-accent-green" />
                  </div>
                  <h2 className="text-[24px] font-semibold tracking-tight">Project created!</h2>
                  <p className="text-text-3 text-[13.5px] mt-2">
                    {genFiles.length} file{genFiles.length !== 1 ? "s" : ""} generated
                  </p>
                </>
              )}
            </div>

            {/* Live file list */}
            <div className="bg-bg-1 border border-border rounded-2xl overflow-hidden mb-6 max-h-80 overflow-y-auto">
              {genFiles.length === 0 && step === "generating" && (
                <div className="flex items-center justify-center gap-2.5 py-8 text-text-3 text-[13px]">
                  <Loader2 size={15} className="animate-spin" />
                  Waiting for first file…
                </div>
              )}
              {genFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0"
                  style={{ animation: "fadeIn 0.25s ease both", animationDelay: `${i * 0.025}s` }}
                >
                  <span className={cn("w-[7px] h-[7px] rounded-full flex-shrink-0", fileDotColor(f.fileName))} />
                  <span className="font-mono text-[12px] text-text-2 flex-1 truncate">{f.filePath}</span>
                  <span className="text-[10.5px] text-text-3 flex-shrink-0">{f.content.split("\n").length} lines</span>
                  <Check size={11} className="text-accent-green flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* CTA */}
            {step === "done" && projectId && !genError && (
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="w-full flex items-center justify-center gap-2.5 h-12 bg-purple rounded-xl text-white text-[14px] font-semibold border-none cursor-pointer hover:opacity-85 transition-opacity shadow-[0_0_28px_rgba(124,110,245,0.35)] font-sans"
                >
                  Open in BuildZero
                  <ArrowRight size={16} />
                </button>

                {/* ── Refine ── */}
                <div className="bg-bg-1 border border-border rounded-2xl p-4">
                  <p className="text-[12px] text-text-3 mb-2.5 font-medium uppercase tracking-wide">Refine your website</p>
                  <div className="flex gap-2">
                    <input
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !isRefining && refineInput.trim() && handleRefine()}
                      placeholder="e.g. make it dark themed, add a contact section…"
                      className="flex-1 bg-bg-2 border border-border-2 rounded-xl px-3 py-2 text-[13px] text-text placeholder:text-text-3 outline-none focus:border-purple/50 transition-colors font-sans"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refineInput.trim() || isRefining}
                      className="px-4 h-9 rounded-xl bg-purple/20 border border-purple/30 text-purple text-[13px] font-medium cursor-pointer disabled:opacity-40 hover:bg-purple/30 transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      {isRefining ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      {isRefining ? "Refining…" : "Refine"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}