"use client";

import { Files, Settings, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function ActivityBar({ onToggleSidebar, sidebarOpen }: ActivityBarProps) {
  const items = [
    { icon: Files,     label: "Explorer",   active: true,  onClick: onToggleSidebar },
  ];

  return (
    <div className="w-[46px] bg-bg-1 border-r border-border flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {items.map(({ icon: Icon, label, active, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          title={label}
          className={cn(
            "w-[34px] h-[34px] flex items-center justify-center rounded-lg border-none cursor-pointer transition-all relative",
            active && sidebarOpen
              ? "text-purple bg-purple/15 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-[18px] before:bg-purple before:rounded-r"
              : "text-text-3 bg-transparent hover:text-text-2 hover:bg-bg-3"
          )}
        >
          <Icon size={17} />
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onToggleSidebar}
        title="Toggle Sidebar"
        className="w-[34px] h-[34px] flex items-center justify-center rounded-lg border-none cursor-pointer text-text-3 bg-transparent hover:text-text-2 hover:bg-bg-3 transition-all"
      >
        <PanelLeft size={17} />
      </button>
      <button
        title="Settings"
        className="w-[34px] h-[34px] flex items-center justify-center rounded-lg border-none cursor-pointer text-text-3 bg-transparent hover:text-text-2 hover:bg-bg-3 transition-all"
      >
        <Settings size={17} />
      </button>
    </div>
  );
}
