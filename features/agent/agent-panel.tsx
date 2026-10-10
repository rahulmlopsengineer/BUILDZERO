"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, SendHorizonal, Loader2, FileCode, ChevronDown, ChevronRight, Sparkles, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────
interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  changedFiles?: ChangedFile[];
  isStreaming?: boolean;
}

interface ChangedFile {
  filePath: string;
  fileName: string;
  content: string;
}

interface AgentPanelProps {
  projectId: string;
  currentFile?: { path: string; content: string; name: string };
  onFileChange?: (filePath: string, fileName: string, content: string) => void;
}

// ── Component ─────────────────────────────────────────────
export function AgentPanel({ projectId, currentFile, onFileChange }: AgentPanelProps) {
  const [messages, setMessages]     = useState<AgentMessage[]>([
    {
      role:    "assistant",
      content: "Hi! I'm your AI coding agent. I can read your project files and make changes based on your instructions.\n\nTry asking me to:\n- **Add a feature** to the current file\n- **Fix a bug** you're seeing\n- **Refactor** a component\n- **Add styling** or animations",
    },
  ]);
  const [input, setInput]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setError(null);

    const userMsg: AgentMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Add streaming assistant message placeholder
    const assistantMsg: AgentMessage = {
      role: "assistant", content: "", changedFiles: [], isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    const assistantIdx = messages.length + 1; // index in array after adding user + assistant

    try {
      const res = await fetch(`/api/projects/${projectId}/agent`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:     text,
          currentFile: currentFile
            ? { path: currentFile.path, content: currentFile.content }
            : undefined,
        }),
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      if (!res.body) throw new Error("No response body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   fullText  = "";
      const changedFiles: ChangedFile[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));

            if (evt.type === "text") {
              fullText += evt.delta;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: fullText, isStreaming: true };
                }
                return next;
              });
            } else if (evt.type === "file") {
              const cf: ChangedFile = {
                filePath: evt.filePath,
                fileName: evt.fileName,
                content:  evt.content,
              };
              changedFiles.push(cf);
              // Apply to editor immediately
              onFileChange?.(evt.filePath, evt.fileName, evt.content);

              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    changedFiles: [...(last.changedFiles ?? []), cf],
                    isStreaming: true,
                  };
                }
                return next;
              });
            } else if (evt.type === "done") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, isStreaming: false };
                }
                return next;
              });
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          } catch (parseErr) {
            // Ignore JSON parse errors for malformed chunks
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          next[next.length - 1] = { ...last, isStreaming: false, content: last.content || "Sorry, something went wrong." };
        }
        return next;
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, projectId, currentFile, onFileChange, messages.length]);

  function clearChat() {
    setMessages([{
      role: "assistant",
      content: "Chat cleared. What would you like to change?",
    }]);
    setError(null);
  }

  return (
    <div className="flex flex-col h-full bg-bg-1 font-sans">

      {/* Header */}
      <div className="h-[38px] flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-accent-amber" />
          <span className="text-sm font-medium text-text">AI Agent</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 text-accent-amber">
            Claude Sonnet
          </span>
        </div>
        <button
          onClick={clearChat}
          title="Clear chat"
          className="w-6 h-6 flex items-center justify-center rounded border-none bg-transparent text-text-3 hover:text-accent-red hover:bg-bg-3 cursor-pointer transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Context chip */}
      {currentFile && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-2 border-b border-border text-[11px] text-text-3 flex-shrink-0">
          <FileCode size={10} />
          Focused on:
          <span className="bg-bg-3 border border-border rounded px-1.5 py-px font-mono text-text-2">
            {currentFile.name}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {messages.map((m, i) => (
          <AgentMessageBubble key={i} message={m} />
        ))}

        {error && (
          <div className="flex items-start gap-2 text-[12px] text-accent-red bg-accent-red/5 border border-accent-red/15 rounded-lg p-2.5">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-border flex-shrink-0">
        <div className={cn(
          "border rounded-[10px] bg-bg-2 overflow-hidden transition-colors",
          isLoading ? "border-accent-amber/30" : "border-border-2 focus-within:border-purple/50"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask the agent to change your code…"
            disabled={isLoading}
            rows={3}
            className="w-full bg-transparent outline-none resize-none text-[12.5px] text-text placeholder:text-text-3 px-2.5 py-2 min-h-[60px] max-h-[120px] font-sans leading-snug disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border">
            <div className="flex items-center gap-2 text-[10px] text-text-3">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-accent-amber">
                  <Loader2 size={11} className="animate-spin" />
                  Agent is working…
                </span>
              ) : (
                <>
                  <span className="bg-bg-4 border border-border-2 rounded px-1 font-mono">⏎</span>
                  send
                  <span className="bg-bg-4 border border-border-2 rounded px-1 font-mono">⇧⏎</span>
                  newline
                </>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="w-7 h-7 rounded-lg bg-accent-amber flex items-center justify-center text-bg-0 border-none cursor-pointer disabled:opacity-40 hover:opacity-85 transition-opacity shadow-[0_0_10px_rgba(232,168,58,0.3)]"
            >
              <SendHorizonal size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Individual message bubble ──────────────────────────────
function AgentMessageBubble({ message }: { message: AgentMessage }) {
  const [showFiles, setShowFiles] = useState(true);

  // Strip <file> blocks from displayed text
  const displayText = message.content
    .replace(/<file\s+path="[^"]+">[\s\S]*?<\/file>/g, "")
    .trim();

  return (
    <div className={cn("text-[12.5px] leading-relaxed", message.role === "user" && "flex justify-end")}>
      {message.role === "assistant" ? (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-[18px] h-[18px] rounded-full bg-accent-amber/15 border border-accent-amber/25 flex items-center justify-center flex-shrink-0">
              <Bot size={10} className="text-accent-amber" />
            </div>
            <span className="text-[11.5px] font-medium text-text-2">Agent</span>
            {message.isStreaming && (
              <span className="flex gap-1 items-center">
                {[0,1,2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-accent-amber animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                ))}
              </span>
            )}
          </div>

          {displayText && (
            <div className="ml-[26px] bg-bg-2 border border-border rounded-[10px] px-3 py-2 text-text-2">
              <div
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: displayText
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/`([^`]+)`/g, `<code class="bg-bg-3 border border-border rounded px-1 py-px text-accent-teal font-mono text-[11px]">$1</code>`),
                }}
              />
            </div>
          )}

          {/* Changed files */}
          {(message.changedFiles?.length ?? 0) > 0 && (
            <div className="ml-[26px] mt-2">
              <button
                onClick={() => setShowFiles((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-text-3 hover:text-text-2 border-none bg-transparent cursor-pointer font-sans mb-1.5 transition-colors"
              >
                {showFiles ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                {message.changedFiles!.length} file{message.changedFiles!.length > 1 ? "s" : ""} modified
              </button>

              {showFiles && (
                <div className="space-y-1">
                  {message.changedFiles!.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-0 border border-border rounded-lg"
                    >
                      <FileCode size={11} className="text-accent-teal flex-shrink-0" />
                      <span className="font-mono text-[11px] text-text-2 flex-1 truncate">{f.filePath}</span>
                      <span className="text-[10px] text-accent-green flex-shrink-0">✓ Applied</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-[85%] bg-purple/15 border border-purple/20 rounded-[10px] rounded-tr-sm px-3 py-2 text-text">
          {message.content}
        </div>
      )}
    </div>
  );
}
