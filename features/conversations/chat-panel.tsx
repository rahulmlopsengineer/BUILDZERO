"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import { SendHorizonal, Plus, List, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatPanelProps {
  fileContext?: string;
  fileName?: string;
}

export function ChatPanel({ fileContext, fileName }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/messages",
    body: { fileContext },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm Claude, your AI coding assistant. I can see your open file and help you write, refactor, explain, or debug code. What would you like to do?",
      },
    ],
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full flex flex-col bg-bg-1 border-l border-border flex-shrink-0 h-full">
      {/* Header */}
      <div className="h-[38px] flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">AI Chat</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple/15 border border-purple/30 text-purple">
            Claude Sonnet
          </span>
        </div>
        <div className="flex gap-1">
          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-3 text-text-3 hover:text-text-2 transition-colors">
            <Plus size={13} />
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-3 text-text-3 hover:text-text-2 transition-colors">
            <List size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="text-[12.5px] leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={cn(
                  "w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0",
                  m.role === "assistant"
                    ? "bg-purple/15 border border-purple/30 text-purple"
                    : "bg-bg-4 text-text-2"
                )}
              >
                {m.role === "assistant" ? <Sparkles size={9} /> : "A"}
              </div>
              <span className="text-[11.5px] font-medium text-text-2">
                {m.role === "assistant" ? "Claude" : "You"}
              </span>
            </div>

            {m.role === "assistant" ? (
              <div className="ml-6 bg-bg-2 border border-border rounded-[10px] px-3 py-2 text-text-2">
                <div className="prose prose-invert prose-sm max-w-none prose-code:text-accent-teal prose-code:bg-bg-3 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-bg-0 prose-pre:border prose-pre:border-border">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="ml-6 text-text-2">{m.content}</div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 ml-6">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-border flex-shrink-0">
        <form
          onSubmit={handleSubmit}
          className="border border-border-2 rounded-[10px] bg-bg-2 overflow-hidden focus-within:border-purple/50 transition-colors"
        >
          {fileName && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border text-[11px] text-text-3">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3.5 4.5h5M3.5 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Context:
              <span className="flex items-center gap-1 bg-bg-3 border border-border-2 rounded-full px-2 py-px font-mono text-text-2">
                <span className="w-[5px] h-[5px] rounded-full bg-accent-blue inline-block" />
                {fileName}
              </span>
            </div>
          )}

          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            placeholder="Ask Claude anything about your code…"
            className="w-full bg-transparent outline-none resize-none text-[12.5px] text-text placeholder:text-text-3 px-2.5 py-2 min-h-[60px] max-h-[120px] font-sans leading-snug"
            rows={3}
          />

          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border">
            <div className="flex items-center gap-2 text-[10px] text-text-3">
              <span className="bg-bg-4 border border-border-2 rounded px-1 font-mono">⏎</span> send
              <span className="bg-bg-4 border border-border-2 rounded px-1 font-mono">⇧⏎</span> newline
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-7 h-7 rounded-lg bg-purple flex items-center justify-center text-white disabled:opacity-40 hover:opacity-85 transition-all shadow-[0_0_10px_rgba(124,110,245,0.4)]"
            >
              <SendHorizonal size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
