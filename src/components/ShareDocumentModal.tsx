"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentType: "project_document" | "client_document";
  documentName: string;
  projectId?: string;
}

export function ShareDocumentModal({
  open,
  onClose,
  documentId,
  documentType,
  documentName,
  projectId,
}: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareType, setShareType] = useState<"contact" | "agent">("contact");
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    // Fetch contacts and agents
    async function fetchRecipients() {
      try {
        const [contactsRes, agentsRes] = await Promise.all([
          fetch("/api/contacts-list" + (projectId ? `?project_id=${projectId}` : "")),
          fetch("/api/agents-list"),
        ]);
        if (contactsRes.ok) {
          const data = await contactsRes.json();
          setContacts(data.contacts || []);
        }
        if (agentsRes.ok) {
          const data = await agentsRes.json();
          setAgents(data.agents || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchRecipients();
    setSelectedIds([]);
    setSuccess(false);
    setSearch("");
  }, [open, projectId]);

  const recipients = shareType === "contact" ? contacts : agents;
  const filtered = recipients.filter((r) => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleShare() {
    if (selectedIds.length === 0) return;
    setSharing(true);
    const fd = new FormData();
    fd.set("document_type", documentType);
    fd.set("document_id", documentId);
    fd.set("shared_with_type", shareType);
    fd.set("delivery_method", "portal");
    for (const id of selectedIds) {
      fd.append("shared_with_ids", id);
    }
    try {
      const res = await fetch("/api/share-document", { method: "POST", body: fd });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => onClose(), 1500);
      }
    } catch {
      // handle error
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Share: ${documentName}`}>
      <div className="space-y-4">
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[#1A9E6F]/10 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A9E6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="font-semibold text-heading">Shared successfully!</p>
            <p className="text-sm text-secondary mt-1">
              Document shared with {selectedIds.length} {shareType === "contact" ? "contact" : "agent"}{selectedIds.length !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <>
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShareType("contact"); setSelectedIds([]); }}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-[8px] transition-colors cursor-pointer ${
                  shareType === "contact"
                    ? "bg-[#1A9E6F] text-white"
                    : "bg-bg-alt text-secondary hover:text-heading"
                }`}
              >
                Contacts
              </button>
              <button
                onClick={() => { setShareType("agent"); setSelectedIds([]); }}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-[8px] transition-colors cursor-pointer ${
                  shareType === "agent"
                    ? "bg-[#1A9E6F] text-white"
                    : "bg-bg-alt text-secondary hover:text-heading"
                }`}
              >
                Agents
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${shareType === "contact" ? "contacts" : "agents"}...`}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F]"
            />

            {/* Recipients list */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-secondary text-center py-4">
                  No {shareType === "contact" ? "contacts" : "agents"} found
                </p>
              ) : (
                filtered.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 p-2 rounded-[8px] hover:bg-bg-alt transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleSelection(r.id)}
                      className="w-4 h-4 rounded border-border text-[#1A9E6F] focus:ring-[#1A9E6F]/20"
                    />
                    <div>
                      <p className="text-sm font-medium text-heading">
                        {r.first_name} {r.last_name}
                      </p>
                      {r.email && (
                        <p className="text-xs text-secondary">{r.email}</p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={sharing || selectedIds.length === 0}
              >
                {sharing ? "Sharing..." : `Share with ${selectedIds.length} selected`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
