"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { AgentForm } from "@/components/AgentForm";
import type { Agent, ProjectWithStats } from "@/lib/types";

interface Props {
  agents: (Agent & { project_count: number; lot_count: number })[];
  projects: ProjectWithStats[];
}

export function AgentsClient({ agents, projects }: Props) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-heading">Agents</h1>
          <p className="text-secondary text-sm mt-1">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} — {agents.filter((a) => a.status === "active").length} active
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon />
          Add Agent
        </Button>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => router.push(`/agents/${agent.id}`)}
            className="cursor-pointer"
          >
            <Card className="hover:border-emerald-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {agent.logo_url ? (
                    <img
                      src={agent.logo_url}
                      alt={`${agent.first_name} ${agent.last_name}`}
                      className="w-10 h-10 rounded-[8px] object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-[8px] bg-emerald-primary/10 flex items-center justify-center text-emerald-primary font-semibold text-sm flex-shrink-0">
                      {agent.first_name[0]}{agent.last_name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-heading">{agent.first_name} {agent.last_name}</h3>
                    {agent.agency && <p className="text-xs text-secondary">{agent.agency}</p>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                  agent.status === "active"
                    ? "bg-[#1A9E6F]/10 text-[#1A9E6F]"
                    : "bg-bg-alt text-secondary"
                }`}>
                  {agent.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-border">
                <div>
                  <p className="text-lg font-bold text-heading font-mono">{agent.project_count}</p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">Projects</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-heading font-mono">{agent.lot_count}</p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">Lots</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-heading font-mono">
                    {agent.commission_rate ? `${agent.commission_rate}%` : "—"}
                  </p>
                  <p className="text-[10px] text-secondary uppercase tracking-wider">Commission</p>
                </div>
              </div>

              {agent.phone && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-secondary font-mono">{agent.phone}</p>
                </div>
              )}

            </Card>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="bg-white rounded-[14px] border border-border p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h2 className="text-lg font-semibold text-heading mb-2">No Agents Yet</h2>
          <p className="text-secondary text-sm mb-4">Add your first agent to start managing your network.</p>
          <Button onClick={() => setShowAddModal(true)}>Add Agent</Button>
        </div>
      )}

      {/* Add Agent Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Agent">
        <AgentForm
          projects={projects}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
