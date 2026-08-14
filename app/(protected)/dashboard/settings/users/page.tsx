"use client";

import { useState } from "react";
import UserManagementView from "../components/UserManagementView";
import RoleManagementView from "../components/RoleManagementView";
import { Users, Shield } from "@phosphor-icons/react";
import { Tabs } from "@heroui/react";

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState("users");

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
      {/* HEADER (Tipe C: Table Page) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "700",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Manajemen Akses
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
              lineHeight: 1.6,
            }}
          >
            Pusat kendali pengguna dan pengaturan peran (role) sistem Mahalu
            Spa.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-2xl shadow-sm">
          <div className="p-2 bg-accent/10 rounded-xl text-accent">
            <Users size={20} weight="bold" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Status Akses
            </span>
            <span className="text-sm font-bold text-foreground">
              Aktif & Terkendali
            </span>
          </div>
        </div>
      </div>

      {/* TABS FOR USERS AND ROLES */}
      <div className="flex flex-col gap-4">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
        >
          <Tabs.ListContainer>
            <Tabs.List
              aria-label="Access Management Tabs"
              className="gap-6 w-full relative rounded-none p-0 border-b border-separator"
            >
              <Tabs.Tab
                id="users"
                className="max-w-fit px-0 h-12 font-bold data-[selected=true]:text-accent"
              >
                <div className="flex items-center space-x-2">
                  <Users
                    size={18}
                    weight={activeTab === "users" ? "fill" : "bold"}
                  />
                  <span>Daftar Pengguna</span>
                </div>
                <Tabs.Indicator className="bg-accent" />
              </Tabs.Tab>
              <Tabs.Tab
                id="roles"
                className="max-w-fit px-0 h-12 font-bold data-[selected=true]:text-accent"
              >
                <Tabs.Separator />
                <div className="flex items-center space-x-2">
                  <Shield
                    size={18}
                    weight={activeTab === "roles" ? "fill" : "bold"}
                  />
                  <span>Pengaturan Role</span>
                </div>
                <Tabs.Indicator className="bg-accent" />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="users">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <UserManagementView />
            </div>
          </Tabs.Panel>
          <Tabs.Panel id="roles">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RoleManagementView />
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
}
