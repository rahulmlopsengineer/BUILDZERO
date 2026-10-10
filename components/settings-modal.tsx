"use client";

import { useState, useEffect } from "react";
import { X, Shield, Key, Building, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [token, setToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  async function fetchSettings() {
    setFetching(true);
    try {
      const res = await fetch("/api/user/vercel");
      const data = await res.json().catch(() => ({}));
      setHasToken(data.hasToken);
      setTeamId(data.vercelTeamId || "");
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    if (!token && !hasToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vercelToken: token, vercelTeamId: teamId }),
      });
      if (res.ok) {
        setSuccess(true);
        setHasToken(true);
        setToken("");
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-1 border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-2/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center text-purple">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-text">Vercel Settings</h2>
              <p className="text-[12px] text-text-3">Manage your personal deployment credentials</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-3 text-text-3 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {fetching ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={24} className="animate-spin text-purple" />
              <p className="text-[13px] text-text-3">Fetching your settings...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[13px] font-medium text-text-2 mb-1.5">
                  <Key size={14} className="text-purple" />
                  Vercel API Token
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={hasToken ? "•••••••••••••••• (Encrypted)" : "Enter your Vercel Token"}
                    className="w-full h-10 px-4 bg-bg-2 border border-border rounded-xl text-[13px] text-text placeholder:text-text-3 focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/20 transition-all font-sans"
                  />
                  {hasToken && !token && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-0.5 bg-accent-green/10 text-accent-green rounded-full text-[10px] font-medium border border-accent-green/20">
                      <CheckCircle2 size={10} />
                      Configured
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-text-3 leading-relaxed">
                  Generate a token in your <a href="https://vercel.com/settings/tokens" target="_blank" className="text-purple hover:underline">Vercel Settings</a>. 
                  It will be encrypted before storing.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[13px] font-medium text-text-2 mb-1.5">
                  <Building size={14} className="text-purple" />
                  Vercel Team ID <span className="text-text-4 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="team_xxxxxxxxxxxx"
                  className="w-full h-10 px-4 bg-bg-2 border border-border rounded-xl text-[13px] text-text placeholder:text-text-3 focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/20 transition-all font-sans"
                />
                <p className="text-[11px] text-text-3 leading-relaxed">
                  Required if your projects are under a Vercel Team.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-bg-2/30 border-t border-border flex items-center justify-between">
          <div className="h-5 flex items-center">
            {success && (
              <span className="text-[12px] text-accent-green font-medium flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
                <CheckCircle2 size={14} />
                Settings saved!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-text-3 hover:text-text transition-colors border-none bg-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || (!token && !hasToken)}
              className="flex items-center gap-2 h-9 px-6 bg-purple rounded-xl text-white text-[13px] font-medium border-none cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(124,110,245,0.2)] font-sans"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {hasToken && !token ? "Update settings" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
