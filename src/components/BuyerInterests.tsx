"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { INTEREST_LEVEL_COLORS, formatPrice } from "@/lib/types";
import type { BuyerInterest, InterestLevel, Project } from "@/lib/types";
import { createBuyerInterestAction, removeBuyerInterestAction } from "@/lib/actions";

interface Props {
  interests: BuyerInterest[];
  contactId: string;
  projects: Project[];
}

const INTEREST_LEVELS: { value: InterestLevel; label: string }[] = [
  { value: "enquiry", label: "Enquiry" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "strong", label: "Strong" },
  { value: "offer", label: "Offer" },
];

export function BuyerInterests({ interests, contactId, projects }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [stockItems, setStockItems] = useState<Array<{ id: string; lot_number: string; price: number | null }>>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (!selectedProjectId) {
      setStockItems([]);
      return;
    }
    setLoadingStock(true);
    fetch(`/api/stock?project_id=${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        setStockItems(data || []);
        setLoadingStock(false);
      })
      .catch(() => setLoadingStock(false));
  }, [selectedProjectId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("contact_id", contactId);

    const result = await createBuyerInterestAction(formData);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    setSelectedProjectId("");
    router.refresh();
  }

  async function handleRemove(interest: BuyerInterest) {
    setRemoving(interest.id);
    const formData = new FormData();
    formData.set("id", interest.id);
    formData.set("contact_id", contactId);
    await removeBuyerInterestAction(formData);
    setRemoving(null);
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-heading">Interested In</h3>
        <Button size="sm" onClick={() => setShowModal(true)}>
          + Add Interest
        </Button>
      </div>

      {interests.length === 0 ? (
        <p className="text-sm text-secondary text-center py-6">No interests recorded</p>
      ) : (
        <div className="space-y-2">
          {interests.map((interest) => {
            const colors = INTEREST_LEVEL_COLORS[interest.interest_level as InterestLevel];
            return (
              <div
                key={interest.id}
                className="flex items-center justify-between p-3 bg-bg-alt rounded-[8px] border border-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-heading font-mono">
                      Lot {interest.lot_number}
                    </span>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${colors.bg} ${colors.text}`}>
                      {interest.interest_level}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    {interest.project_name}
                    {interest.price != null && ` · ${formatPrice(interest.price)}`}
                  </p>
                  {interest.notes && (
                    <p className="text-xs text-muted mt-1">{interest.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(interest)}
                  disabled={removing === interest.id}
                  className="ml-2 p-1.5 text-muted hover:text-[#E05252] transition-colors cursor-pointer flex-shrink-0"
                  title="Remove interest"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Interest Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setSelectedProjectId(""); }} title="Add Interest">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#E05252]/10 text-[#E05252] text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Lot</label>
            <select
              name="stock_id"
              required
              disabled={!selectedProjectId || loadingStock}
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">{loadingStock ? "Loading..." : "Select a lot..."}</option>
              {stockItems.map((s) => (
                <option key={s.id} value={s.id}>
                  Lot {s.lot_number} {s.price != null ? `— ${formatPrice(s.price)}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Interest Level</label>
            <select
              name="interest_level"
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none"
            >
              {INTEREST_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-[var(--radius-input)] bg-white focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setShowModal(false); setSelectedProjectId(""); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Interest"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
