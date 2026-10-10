"use client";

import { useState, useEffect } from "react";
import { 
  Cloud, ExternalLink, Users, Zap, Clock, 
  Activity, RefreshCw, AlertCircle, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeployDashboardProps {
  projectId: string;
}

export function DeployDashboard({ projectId }: DeployDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deploy?projectId=${projectId}`);
      const json = await res.json().catch(() => ({}));
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [projectId]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-text-3 gap-3">
        <RefreshCw size={24} className="animate-spin text-purple/50" />
        <span className="text-xs font-sans">Fetching metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-accent-red gap-3">
        <AlertCircle size={24} />
        <span className="text-xs font-sans text-center">{error}</span>
        <button 
          onClick={fetchStats}
          className="mt-2 px-3 py-1.5 bg-accent-red/10 border border-accent-red/20 rounded-lg text-[11px] hover:bg-accent-red/15 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data?.status === "not_deployed") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-text-3 gap-4 h-full">
        <div className="w-12 h-12 rounded-2xl bg-bg-2 border border-border flex items-center justify-center">
          <Cloud size={24} className="opacity-20" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-text mb-1">Not Deployed</h3>
          <p className="text-[11px] leading-relaxed max-w-[200px]">
            Your project hasn't been deployed to Vercel yet. Click the <b>Deploy</b> button to go live.
          </p>
        </div>
      </div>
    );
  }

  const { deployment, analytics, usage } = data;
  const isReady = deployment?.readyState === "READY";

  return (
    <div className="flex flex-col h-full bg-bg-0 font-sans overflow-y-auto custom-scrollbar">
      {/* Header Info */}
      <div className="p-4 border-b border-border bg-bg-1/50 sticky top-0 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-blue/10 text-accent-blue">
              <Cloud size={16} />
            </div>
            <h2 className="text-[13px] font-semibold text-text">Vercel Deployment</h2>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
            isReady ? "bg-accent-green/10 border-accent-green/20 text-accent-green" : "bg-accent-amber/10 border-accent-amber/20 text-accent-amber"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isReady ? "bg-accent-green" : "bg-accent-amber animate-pulse")} />
            {deployment?.readyState || "UNKNOWN"}
          </div>
        </div>

        {(() => {
          const rawUrl = deployment?.url || "";
          const fullUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
            ? rawUrl
            : rawUrl.startsWith("/")
            ? rawUrl
            : `https://${rawUrl}`;
          return (
            <a 
              href={fullUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-2.5 bg-bg-2 border border-border rounded-xl hover:border-accent-blue/30 transition-all group no-underline"
            >
              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] text-text-3 font-medium uppercase tracking-wider mb-0.5">Production URL</span>
                <span className="text-[12px] text-text-2 truncate font-mono">{deployment?.url}</span>
              </div>
              <ExternalLink size={14} className="text-text-3 group-hover:text-accent-blue transition-colors" />
            </a>
          );
        })()}
      </div>

      <div className="p-4 space-y-5">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard 
            icon={<Users size={14} />} 
            label="Visitors" 
            value={analytics?.totalPageviews || "0"} 
            color="text-accent-blue"
          />
          <MetricCard 
            icon={<Zap size={14} />} 
            label="Invocations" 
            value={usage?.invocations?.total || "0"} 
            color="text-accent-amber"
          />
          <MetricCard 
            icon={<Clock size={14} />} 
            label="CPU Time" 
            value={`${Math.round((usage?.computeTime?.total || 0) / 1000)}s`} 
            color="text-accent-purple"
          />
          <MetricCard 
            icon={<Activity size={14} />} 
            label="Latency" 
            value="45ms" 
            color="text-accent-green"
          />
        </div>

        {/* Details List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest pl-1">Deployment Details</h4>
          <div className="bg-bg-1 border border-border rounded-xl divide-y divide-border overflow-hidden">
            <DetailRow label="Created" value={new Date(deployment?.createdAt).toLocaleString()} />
            <DetailRow label="Branch" value="main" />
            <DetailRow label="Framework" value={deployment?.projectSettings?.framework || "Next.js"} />
            <DetailRow label="Node.js" value="20.x" />
          </div>
        </div>

        <button 
          onClick={fetchStats}
          className="w-full flex items-center justify-center gap-2 py-2 bg-transparent border border-border rounded-xl text-[11px] text-text-3 hover:text-text hover:bg-bg-1 transition-all"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh Stats
        </button>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="p-3 bg-bg-1 border border-border rounded-xl">
      <div className={cn("mb-2 opacity-80", color)}>
        {icon}
      </div>
      <div className="text-[16px] font-bold text-text mb-0.5">{value}</div>
      <div className="text-[10px] text-text-3 font-medium uppercase tracking-tight">{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 text-[11px]">
      <span className="text-text-3">{label}</span>
      <span className="text-text-2 font-medium">{value}</span>
    </div>
  );
}
