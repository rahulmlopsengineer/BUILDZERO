"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Github, Loader2, Sparkles, Code2, Zap, Globe, ArrowRight, AlertCircle } from "lucide-react";

const FEATURES = [
  { icon: <Code2 size={15} />, text: "AI writes your entire codebase" },
  { icon: <Zap size={15} />,   text: "Live preview with WebContainers" },
  { icon: <Sparkles size={15} />, text: "Claude agent edits files for you" },
  { icon: <Globe size={15} />, text: "Next.js, React, HTML/CSS, Vanilla JS" },
];

function SignInForm() {
  const [loading, setLoading] = useState<"google" | "github" | "demo" | null>(null);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  async function handleSignIn(provider: "google" | "github" | "demo") {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-0 flex font-sans overflow-hidden">

      {/* ── Left panel — branding ───────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-bg-1 border-r border-border p-12 relative overflow-hidden">
        {/* Grid bg */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(#7c6ef5 1px,transparent 1px),linear-gradient(90deg,#7c6ef5 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Purple glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-blue/5 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple flex items-center justify-center shadow-[0_0_24px_rgba(124,110,245,0.5)]">
            <svg width="18" height="18" viewBox="0 0 12 12" fill="none">
              <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.3" />
            </svg>
          </div>
          <span className="text-[18px] font-semibold text-text tracking-tight">BUILDZERO IDE</span>
        </div>

        {/* Hero copy */}
        <div className="relative">
          <h1 className="text-[38px] font-semibold text-text tracking-tight leading-[1.15] mb-5">
            Build apps with<br />
            <span className="text-purple">AI, in your browser</span>
          </h1>
          <p className="text-[15px] text-text-2 leading-relaxed mb-10">
            Describe your project, answer 5 questions, and Claude AI generates
            your complete codebase — then live-previews it instantly.
          </p>

          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-[13.5px] text-text-2">
                <div className="w-7 h-7 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple flex-shrink-0">
                  {f.icon}
                </div>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative border-t border-border pt-8">
          <p className="text-[13px] text-text-3 italic leading-relaxed">
            "From idea to running app in under 60 seconds."
          </p>
        </div>
      </div>

      {/* ── Right panel — auth form ─────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Mobile grid */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none lg:hidden"
          style={{
            backgroundImage: "linear-gradient(#7c6ef5 1px,transparent 1px),linear-gradient(90deg,#7c6ef5 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-12 h-12 rounded-2xl bg-purple flex items-center justify-center shadow-[0_0_32px_rgba(124,110,245,0.45)] mb-4">
              <svg width="22" height="22" viewBox="0 0 12 12" fill="none">
                <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.3" />
              </svg>
            </div>
            <h1 className="text-[22px] font-semibold text-text tracking-tight">BUILDZERO IDE</h1>
            <p className="text-text-3 text-[13px] mt-1">AI-powered cloud development</p>
          </div>

          {/* Desktop heading */}
          <div className="mb-8 hidden lg:block">
            <h2 className="text-[26px] font-semibold text-text tracking-tight">Welcome back</h2>
            <p className="text-[14px] text-text-3 mt-1">Sign in to your workspace</p>
          </div>

          {/* Card */}
          <div className="bg-bg-1 border border-border rounded-2xl p-7 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

            {errorParam && (
              <div className="p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-xl flex items-center gap-2 text-accent-amber text-[12px] animate-in fade-in duration-200">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>
                  {errorParam === "Configuration"
                    ? "OAuth configuration updated. Try signing in again or use 1-Click Demo Access."
                    : `Authentication notice: ${errorParam}`}
                </span>
              </div>
            )}

            {/* Quick Demo Access banner / Primary button */}
            <button
              onClick={() => handleSignIn("demo")}
              disabled={loading !== null}
              className="w-full flex items-center justify-between px-4 h-12 rounded-xl bg-purple text-white text-[13.5px] font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all shadow-[0_0_24px_rgba(124,110,245,0.4)] border-none font-sans"
            >
              <div className="flex items-center gap-2.5">
                {loading === "demo" ? (
                  <Loader2 size={17} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={17} className="text-yellow-300" />
                )}
                <span>1-Click Demo Access (Skip Sign-In)</span>
              </div>
              <ArrowRight size={15} />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-text-3">or continue with provider</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google */}
            <button
              onClick={() => handleSignIn("google")}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border-2 bg-bg-2 text-text text-[13.5px] font-medium hover:bg-bg-3 hover:border-purple/30 disabled:opacity-50 cursor-pointer transition-all font-sans"
            >
              {loading === "google" ? (
                <Loader2 size={17} className="animate-spin text-purple" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            {/* GitHub */}
            <button
              onClick={() => handleSignIn("github")}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border-2 bg-bg-2 text-text text-[13.5px] font-medium hover:bg-bg-3 hover:border-purple/30 disabled:opacity-50 cursor-pointer transition-all font-sans"
            >
              {loading === "github" ? (
                <Loader2 size={17} className="animate-spin text-purple" />
              ) : (
                <Github size={18} />
              )}
              Continue with GitHub
            </button>

            <p className="text-center text-[11.5px] text-text-3 leading-relaxed pt-2">
              Full workspace permissions (Code Push, Deploy, Live Preview) enabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-0 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-purple" /></div>}>
      <SignInForm />
    </Suspense>
  );
}
