"use client";

import Link from "next/link";
import { 
  ArrowRight, Terminal, Zap, Layers, Play, CheckCircle2, 
  Cpu, MessageSquare, Monitor, FileCode2, RefreshCw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import TechText from "@/components/TechText";
import Orb from "@/components/Orb";
import GooeyNav from "@/components/GooeyNav";
import MagicBento from "@/components/MagicBento";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-0 text-text selection:bg-purple/30 font-sans">
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-bg-0/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple flex items-center justify-center shadow-[0_0_15px_rgba(124,110,245,0.4)]">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.4" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-white">BuildZero</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="text-sm text-text-3 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="px-5 py-2 bg-white text-black font-medium text-[13px] rounded-full hover:bg-gray-200 transition-colors">
              Start Building
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex flex-col justify-center border-b border-border">
          <div className="absolute inset-0 bg-bg-0 flex items-center justify-center overflow-hidden">
            {/* Interactive WebGL Orb background */}
            <div className="absolute w-[600px] h-[600px] sm:w-[750px] sm:h-[750px] md:w-[850px] md:h-[850px] top-10 md:top-6 opacity-75 pointer-events-auto">
              <Orb
                hoverIntensity={0.6}
                rotateOnHover={true}
                hue={0}
                forceHoverState={false}
                backgroundColor="#0e0f11"
              />
            </div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-6 w-full text-center z-10 pt-10">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-2 border border-border text-text-2 text-xs mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse" />
                BuildZero is now in public beta
              </div>
              <h1 className="sr-only">Build Web Apps At Light Speed.</h1>
              <div className="w-full max-w-4xl mx-auto mb-6 flex flex-col items-center justify-center gap-1 select-none" aria-hidden="true">
                <div className="w-full h-[60px] sm:h-[80px] md:h-[95px] relative">
                  <TechText
                    text="Build Web Apps"
                    fontWeight={700}
                    fontSize={110}
                    reveal="letter"
                    dashLength={4}
                    dashGap={2}
                    specks={15}
                    color="#ffffff"
                    accentColor="#a855f7"
                    speed={1.2}
                    labels={false}
                    selection={false}
                    draggable={false}
                  />
                </div>
                <div className="w-full h-[60px] sm:h-[80px] md:h-[95px] relative">
                  <TechText
                    text="At Light Speed."
                    fontWeight={700}
                    fontSize={110}
                    reveal="letter"
                    dashLength={4}
                    dashGap={2}
                    specks={15}
                    color="#38bdf8"
                    accentColor="#818cf8"
                    speed={1.2}
                    labels={false}
                    selection={false}
                    draggable={false}
                  />
                </div>
              </div>
              <p className="text-lg md:text-xl text-text-3 mb-10 max-w-2xl mx-auto leading-relaxed">
                The intelligent, zero-friction development environment. Turn prompts into complete applications instantly, running directly in your browser.
              </p>
              
              <div className="flex items-center justify-center mt-2">
                <GooeyNav
                  items={[
                    { label: "Start Building →", href: "/dashboard" },
                    { label: "▶ View Demo", href: "#demo" },
                  ]}
                  particleCount={16}
                  particleDistances={[90, 10]}
                  particleR={100}
                  initialActiveIndex={0}
                  animationTime={1200}
                  timeVariance={400}
                  colors={[1, 2, 3, 1, 2, 3, 1, 4]}
                />
              </div>
            </div>

            <div className="mt-20 mx-auto max-w-5xl rounded-2xl border border-border bg-bg-1 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative animate-fade-in-up delay-200">
              <div className="h-10 border-b border-border bg-bg-2 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-red" />
                <div className="w-3 h-3 rounded-full bg-accent-amber" />
                <div className="w-3 h-3 rounded-full bg-accent-green" />
                <div className="mx-auto text-[11px] text-text-3 font-medium flex items-center gap-2">
                  <Monitor size={12} /> app.buildzero.dev
                </div>
                <div className="w-16" />
              </div>
              <div className="flex flex-col md:flex-row h-[420px] bg-bg-0 text-left">
                <div className="w-full md:w-[45%] border-b md:border-b-0 md:border-r border-border p-6 font-mono text-[13px] overflow-hidden relative">
                  <div className="text-purple mb-4 text-xs flex items-center gap-2 bg-purple/10 border border-purple/20 w-fit px-2 py-1 rounded">
                    <RefreshCw size={12} className="animate-spin" /> Compiling AI instructions...
                  </div>
                  <div className="text-blue-400">import <span className="text-text-2">React, {'{'} useState {'}'}</span> from <span className="text-accent-green">"react"</span>;</div>
                  
                  <div className="text-text-2 mt-4"><span className="text-purple">export default</span> <span className="text-blue-400">function</span> <span className="text-accent-amber">Dashboard</span>() {'{'}</div>
                  <div className="pl-4 text-text-3 mt-1">const [loading] = <span className="text-blue-400">useState</span>(false);</div>
                  <div className="pl-4 text-blue-400 mt-3">return (</div>
                  <div className="pl-8 text-text-3">&lt;<span className="text-blue-300">div</span> className=<span className="text-accent-green">"min-h-screen bg-black"</span>&gt;</div>
                  <div className="pl-12 text-text-3">&lt;<span className="text-blue-300">h1</span> className=<span className="text-accent-green">"text-2xl font-bold"</span>&gt;Analytics&lt;/<span className="text-blue-300">h1</span>&gt;</div>
                  <div className="pl-12 text-text-3">&lt;<span className="text-blue-300">MetricsGrid</span> /&gt;</div>
                  <div className="pl-8 text-text-3">&lt;/<span className="text-blue-300">div</span>&gt;</div>
                  <div className="pl-4 text-blue-400">);</div>
                  <div className="text-text-2">{'}'}</div>

                  <div className="w-2 h-4 bg-purple/80 absolute top-[280px] left-[32px] animate-pulse" />
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-0 to-transparent" />
                </div>
                
                <div className="w-full md:w-[55%] bg-bg-1 relative p-6 flex flex-col justify-center">
                  <div className="w-full h-full border border-border-2 rounded-xl bg-bg-0/60 shadow-inner flex flex-col items-center justify-center overflow-hidden">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-purple/10 rounded-2xl mx-auto flex items-center justify-center mb-5 border border-purple/20">
                        <Zap size={24} className="text-purple" />
                      </div>
                      <h2 className="text-[22px] font-bold text-text mb-2 tracking-tight">Live Server Running</h2>
                      <p className="text-text-3 text-[13px] max-w-[250px] mx-auto leading-relaxed">Instant HMR inside secure WebContainers without latency.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PIPELINE SECTION */}
        <section className="py-32 bg-bg-0 relative border-b border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24 cursor-default">
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">Under The Hood</h2>
              <p className="text-text-3 text-lg">A complete Node.js architecture executed entirely inside the browser.</p>
            </div>

            <MagicBento
              cards={[
                {
                  color: '#13141a',
                  label: 'Step 1',
                  title: '1. Concept Prompt',
                  description: 'Natural language requirement parsing',
                  icon: <div className="w-14 h-14 rounded-xl bg-bg-2 border border-white/10 flex items-center justify-center"><MessageSquare size={22} className="text-text-2" /></div>
                },
                {
                  color: '#13141a',
                  label: 'Step 2',
                  title: '2. AI Generation',
                  description: 'Writes robust full-stack codebase',
                  icon: <div className="w-14 h-14 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center"><Cpu size={22} className="text-purple" /></div>
                },
                {
                  color: '#13141a',
                  label: 'Step 3',
                  title: '3. Virtual Structure',
                  description: 'Files mounted to in-memory system',
                  icon: <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><FileCode2 size={22} className="text-blue-400" /></div>
                },
                {
                  color: '#13141a',
                  label: 'Step 4',
                  title: '4. WebContainer',
                  description: 'Zero-latency secure preview server',
                  icon: <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center"><Monitor size={22} className="text-accent-green" /></div>
                },
              ]}
              textAutoHide={false}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={false}
              enableMagnetism={true}
              clickEffect={true}
              particleCount={10}
              spotlightRadius={280}
              glowColor="124, 110, 245"
              gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-32 bg-bg-1" id="demo">
          <div className="max-w-7xl mx-auto px-6">
            <MagicBento
              cards={[
                {
                  color: '#0e0f11',
                  title: 'Multi-Framework Output',
                  description: 'Instantly deploy Next.js, React, HTML/CSS, or Vanilla JS templates securely.',
                  icon: <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-purple/10 border-purple/20"><Layers className="text-purple" /></div>
                },
                {
                  color: '#0e0f11',
                  title: 'Instant Booting',
                  description: 'Node.js environments load in milliseconds. Forget agonizing VM spin-ups.',
                  icon: <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-accent-amber/10 border-accent-amber/20"><Zap className="text-accent-amber" /></div>
                },
                {
                  color: '#0e0f11',
                  title: 'Hot Module Reloading',
                  description: 'AI code insertions immediately reflect in the integrated browser preview seamlessly.',
                  icon: <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-blue-500/10 border-blue-500/20"><Terminal className="text-blue-400" /></div>
                },
                {
                  color: '#0e0f11',
                  title: 'True Browser Execution',
                  description: 'Running full Node CLI tools locally without remote servers.',
                  icon: <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-accent-green/10 border-accent-green/20"><RefreshCw className="text-accent-green" /></div>
                },
              ]}
              textAutoHide={false}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={false}
              enableMagnetism={true}
              clickEffect={true}
              particleCount={12}
              spotlightRadius={300}
              glowColor="124, 110, 245"
              gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
        </section>

        {/* DEV EXPERIENCE SECTION */}
        <section className="py-32 bg-bg-0 overflow-hidden relative border-t border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              
              <div className="w-full lg:w-1/2">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-[1.15] tracking-tight">
                  Developer experience, <br className="hidden md:block"/> strictly <span className="text-purple">reimagined.</span>
                </h2>
                <p className="text-lg text-text-3 mb-10 leading-relaxed max-w-lg">
                  We threw away the friction of traditional environment setup. Enjoy automatic dependency resolution, intelligent error-handling algorithms, and an unbreakable link between AI design and pure execution.
                </p>
                <ul className="space-y-5">
                  <li className="flex items-center gap-4 text-[15px] font-medium text-text-2">
                    <div className="w-6 h-6 rounded-full bg-purple/10 flex items-center justify-center text-purple flex-shrink-0 border border-purple/20">
                      <CheckCircle2 size={13} />
                    </div>
                    <span>Zero local configuration or docker setup required</span>
                  </li>
                  <li className="flex items-center gap-4 text-[15px] font-medium text-text-2">
                    <div className="w-6 h-6 rounded-full bg-purple/10 flex items-center justify-center text-purple flex-shrink-0 border border-purple/20">
                      <CheckCircle2 size={13} />
                    </div>
                    <span>Automated error parsing and CLI auto-fix loops</span>
                  </li>
                  <li className="flex items-center gap-4 text-[15px] font-medium text-text-2">
                    <div className="w-6 h-6 rounded-full bg-purple/10 flex items-center justify-center text-purple flex-shrink-0 border border-purple/20">
                      <CheckCircle2 size={13} />
                    </div>
                    <span>Local browser-filesystem synchronization</span>
                  </li>
                </ul>
              </div>

              <div className="w-full lg:w-1/2 relative">
                <div className="relative rounded-2xl border border-border-2 bg-bg-1 p-6 z-10 shadow-2xl">
                  <div className="flex items-center justify-between mb-5 border-b border-border-2 pb-3">
                    <div className="flex items-center gap-3">
                      <Terminal className="text-text-3" size={16} />
                      <span className="text-xs font-mono font-medium text-text-2">dev-server</span>
                    </div>
                    <div className="text-[10px] text-text-3 font-mono">WebContainer Core</div>
                  </div>
                  <div className="font-mono text-[13px] space-y-2.5 opacity-90 pb-2">
                    <div className="flex gap-2"><span className="text-accent-green">➜</span><span className="text-text-3">npm run dev</span></div>
                    <div><span className="text-blue-400 font-bold">VITE</span> <span className="text-text-3">v5.4.2 ready in</span> <span className="text-white">120 ms</span></div>
                    <div className="text-text-3 pt-2"><span className="text-accent-green font-bold">  ➜</span>  Local:   <span className="text-blue-400 underline">http://localhost:3000/</span></div>
                    <div className="text-text-3"><span className="text-text-3 font-bold">  ➜</span>  Network: use --host to expose</div>
                    <div className="text-text-3 pt-2"><span className="text-purple">12:34:00 PM</span> [vite] hmr update <span className="text-white">/src/App.tsx</span></div>
                  </div>
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-purple/15 blur-[100px] rounded-full z-0 pointer-events-none" />
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 bg-bg-0 relative border-t border-border overflow-hidden">
          <div className="absolute inset-0 bg-purple/5" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1/2 bg-purple/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Ready to bring ideas to life?</h2>
            <p className="text-[17px] text-text-3 mb-10 max-w-2xl mx-auto leading-relaxed">
              Start building complete applications seamlessly from your browser. 
              No credit card required. Pure innovation awaits.
            </p>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-9 py-4 bg-white text-black rounded-xl font-bold text-[14px] hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              Launch Editor Space <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-bg-1 text-center text-text-3 text-[13px] border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-purple flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <polygon points="6,1 11,4.5 9,11 3,11 1,4.5" fill="none" stroke="white" strokeWidth="1.4" />
              </svg>
            </div>
            <span className="font-semibold text-text-2 tracking-tight text-[14px]">BuildZero</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 font-medium">
            <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-white transition-colors">GitHub Repository</Link>
            <Link href="#" className="hover:text-white transition-colors">Integration</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
