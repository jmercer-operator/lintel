"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import {
  createEmailTemplateAction,
  updateEmailTemplateAction,
  deleteEmailTemplateAction,
} from "@/lib/actions";
import type { EmailTemplate, EmailTemplateCategory } from "@/lib/types";
import { EMAIL_TEMPLATE_CATEGORY_LABELS } from "@/lib/types";

const ALL_CATEGORIES: EmailTemplateCategory[] = [
  "welcome",
  "follow_up",
  "document",
  "inspection",
  "contract",
  "settlement",
  "marketing",
  "custom",
];

const SAMPLE_DATA = {
  first_name: "John",
  last_name: "Smith",
  project_name: "Crossley & Bourke",
  lot_number: "301",
  agent_name: "Sarah Mitchell",
  settlement_date: "15 June 2026",
};

function substitutePreview(text: string): string {
  return text
    .replace(/\{\{first_name\}\}/g, SAMPLE_DATA.first_name)
    .replace(/\{\{last_name\}\}/g, SAMPLE_DATA.last_name)
    .replace(/\{\{project_name\}\}/g, SAMPLE_DATA.project_name)
    .replace(/\{\{lot_number\}\}/g, SAMPLE_DATA.lot_number)
    .replace(/\{\{agent_name\}\}/g, SAMPLE_DATA.agent_name)
    .replace(/\{\{settlement_date\}\}/g, SAMPLE_DATA.settlement_date);
}

interface Props {
  templates: EmailTemplate[];
}

export function TemplatesClient({ templates }: Props) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategory, setFormCategory] = useState<EmailTemplateCategory>("custom");

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  function openAddModal() {
    setEditingTemplate(null);
    setFormName("");
    setFormSubject("");
    setFormBody("");
    setFormCategory("custom");
    setError(null);
    setShowFormModal(true);
  }

  function openEditModal(tmpl: EmailTemplate) {
    setEditingTemplate(tmpl);
    setFormName(tmpl.name);
    setFormSubject(tmpl.subject);
    setFormBody(tmpl.body);
    setFormCategory(tmpl.category as EmailTemplateCategory);
    setError(null);
    setShowFormModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", formName);
    fd.set("subject", formSubject);
    fd.set("body", formBody);
    fd.set("category", formCategory);

    let result;
    if (editingTemplate) {
      fd.set("id", editingTemplate.id);
      result = await updateEmailTemplateAction(fd);
    } else {
      result = await createEmailTemplateAction(fd);
    }

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setShowFormModal(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const fd = new FormData();
    fd.set("id", deletingId);
    const result = await deleteEmailTemplateAction(fd);
    setDeleting(false);
    if (!result.error) {
      setShowDeleteConfirm(false);
      setDeletingId(null);
      router.refresh();
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Back + Header */}
      <Link
        href="/more"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-heading mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        More
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-heading">Email Templates</h1>
        <Button onClick={openAddModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Template
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeCategory === "all"
              ? "bg-[#1A9E6F] text-white"
              : "bg-bg-alt text-secondary hover:text-heading"
          }`}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === cat
                ? "bg-[#1A9E6F] text-white"
                : "bg-bg-alt text-secondary hover:text-heading"
            }`}
          >
            {EMAIL_TEMPLATE_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Template list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary">No templates found</p>
          <Button variant="secondary" onClick={openAddModal} className="mt-4">
            Create Template
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tmpl) => (
            <Card key={tmpl.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-heading">{tmpl.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1A9E6F]/10 text-[#1A9E6F]">
                      {EMAIL_TEMPLATE_CATEGORY_LABELS[tmpl.category as EmailTemplateCategory] || tmpl.category}
                    </span>
                  </div>
                  <p className="text-sm text-secondary mb-1">
                    Subject: {tmpl.subject}
                  </p>
                  <p className="text-xs text-secondary line-clamp-2">
                    {tmpl.body.substring(0, 120)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setPreviewTemplate(tmpl);
                      setShowPreview(true);
                    }}
                    className="p-2 rounded-[6px] hover:bg-bg-alt transition-colors text-secondary hover:text-heading cursor-pointer"
                    title="Preview"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="p-2 rounded-[6px] hover:bg-bg-alt transition-colors text-secondary hover:text-heading cursor-pointer"
                    title="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(tmpl.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 rounded-[6px] hover:bg-red-50 transition-colors text-secondary hover:text-red-600 cursor-pointer"
                    title="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingTemplate ? "Edit Template" : "Add Template"}
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[8px] text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F]"
              placeholder="Template name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as EmailTemplateCategory)}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F]"
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EMAIL_TEMPLATE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Subject</label>
            <input
              type="text"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F]"
              placeholder="Email subject (use {{first_name}}, {{project_name}}, etc.)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Body</label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-border rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6F]/20 focus:border-[#1A9E6F] resize-none"
              placeholder="Email body..."
            />
            <p className="text-xs text-secondary mt-1">
              Variables: {"{{first_name}}"}, {"{{last_name}}"}, {"{{project_name}}"}, {"{{lot_number}}"}, {"{{agent_name}}"}, {"{{settlement_date}}"}
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowFormModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName || !formSubject || !formBody}>
              {saving ? "Saving..." : editingTemplate ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Template Preview"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div className="p-4 bg-bg-alt rounded-[10px]">
              <p className="text-xs text-secondary mb-1">Subject</p>
              <p className="font-semibold text-heading">
                {substitutePreview(previewTemplate.subject)}
              </p>
            </div>
            <div className="p-4 bg-bg-alt rounded-[10px]">
              <p className="text-xs text-secondary mb-2">Body</p>
              <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">
                {substitutePreview(previewTemplate.body)}
              </p>
            </div>
            <p className="text-xs text-secondary">
              Preview uses sample data: {SAMPLE_DATA.first_name} {SAMPLE_DATA.last_name}, {SAMPLE_DATA.project_name}, Lot {SAMPLE_DATA.lot_number}
            </p>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Template"
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Are you sure you want to delete this template? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
