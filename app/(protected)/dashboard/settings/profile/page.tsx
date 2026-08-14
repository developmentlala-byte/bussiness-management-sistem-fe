"use client";

import { useState } from "react";
import { 
  User as UserIcon, 
  ShieldCheck, 
  CaretRight
} from "@phosphor-icons/react";
import { useAuthStore } from "@/app/libs/use-user";
import ProfileView from "../components/ProfileView";
import SecurityView from "../components/SecurityView";

const TABS = [
  { id: "profile", label: "Profil Saya", icon: UserIcon, description: "Atur informasi pribadi Anda" },
  { id: "security", label: "Keamanan", icon: ShieldCheck, description: "Kelola password dan keamanan" },
];

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div
      className="relative flex flex-col w-full"
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        gap: "var(--space-6)",
      }}
    >
      {/* HEADER */}
      <div className="flex flex-col">
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: "700",
            letterSpacing: "-0.025em",
            color: "var(--foreground)",
          }}
        >
          Profil Saya
        </h1>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
            lineHeight: 1.6,
          }}
        >
          Kelola informasi pribadi dan keamanan akun Anda di sini.
        </p>
      </div>

      {/* LAYOUT: SIDEBAR + CONTENT (SPLIT PANEL TIPE B) */}
      <div className="flex flex-col min-[1080px]:flex-row gap-6 min-[1080px]:gap-8 flex-1 min-h-0">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full min-[1080px]:w-72 shrink-0">
          <div className="min-[1080px]:sticky min-[1080px]:top-6 space-y-4">
            <h2 className="text-[11px] font-extrabold text-muted uppercase tracking-wider px-2">
              Menu Pengaturan
            </h2>

            <div className="flex flex-col gap-2 w-full">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center justify-between p-3 min-[1080px]:px-4 min-[1080px]:py-4 rounded-2xl transition-all outline-none border ${
                      isActive
                        ? "bg-accent border-accent text-accent-foreground shadow-sm"
                        : "bg-surface border-border/50 text-muted hover:text-foreground hover:bg-surface-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 pointer-events-none">
                      <div className={`p-2 rounded-xl ${isActive ? "bg-white/20" : "bg-default/10"}`}>
                        <Icon
                          className="size-5"
                          weight={isActive ? "fill" : "bold"}
                        />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold">
                          {tab.label}
                        </span>
                        <span className={`text-[10px] ${isActive ? "text-accent-foreground/70" : "text-muted"}`}>
                          {tab.description}
                        </span>
                      </div>
                    </div>
                    
                    <CaretRight 
                      className={`w-4 h-4 transition-transform ${isActive ? "translate-x-1" : "text-muted/50"}`} 
                      weight="bold" 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 relative z-10">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            {activeTab === "profile" && <ProfileView />}
            {activeTab === "security" && <SecurityView />}
          </div>
        </div>
      </div>
    </div>
  );
}
