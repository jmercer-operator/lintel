"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  uploadProgressPictureAction,
  deleteProgressPictureAction,
  uploadProgressVideoAction,
  deleteProgressVideoAction,
} from "@/lib/actions";

interface Props {
  projectId: string;
  pictures: string[];
  videos: string[];
}

export function ProgressMediaTab({ projectId, pictures, videos }: Props) {
  const router = useRouter();
  const [uploadingPics, setUploadingPics] = useState(false);
  const [uploadingVids, setUploadingVids] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const picInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  async function handlePictureUpload(files: FileList) {
    setUploadingPics(true);
    setError(null);
    const formData = new FormData();
    formData.set("project_id", projectId);
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }
    const result = await uploadProgressPictureAction(formData);
    if (result.error) setError(result.error);
    else router.refresh();
    setUploadingPics(false);
  }

  async function handleVideoUpload(files: FileList) {
    setUploadingVids(true);
    setError(null);
    const formData = new FormData();
    formData.set("project_id", projectId);
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }
    const result = await uploadProgressVideoAction(formData);
    if (result.error) setError(result.error);
    else router.refresh();
    setUploadingVids(false);
  }

  async function handleDeletePicture(url: string) {
    if (!confirm("Delete this picture?")) return;
    setDeletingUrl(url);
    const formData = new FormData();
    formData.set("project_id", projectId);
    formData.set("url", url);
    const result = await deleteProgressPictureAction(formData);
    if (result.error) setError(result.error);
    else router.refresh();
    setDeletingUrl(null);
  }

  async function handleDeleteVideo(url: string) {
    if (!confirm("Delete this video?")) return;
    setDeletingUrl(url);
    const formData = new FormData();
    formData.set("project_id", projectId);
    formData.set("url", url);
    const result = await deleteProgressVideoAction(formData);
    if (result.error) setError(result.error);
    else router.refresh();
    setDeletingUrl(null);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-[var(--radius-input)] text-error text-sm">
          {error}
        </div>
      )}

      {/* Progress Pictures */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-heading">Progress Pictures</h3>
            <p className="text-xs text-muted mt-1">{pictures.length} {pictures.length === 1 ? "picture" : "pictures"}</p>
          </div>
          <>
            <input
              ref={picInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) handlePictureUpload(files);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => picInputRef.current?.click()}
              disabled={uploadingPics}
            >
              {uploadingPics ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Pictures
                </>
              )}
            </Button>
          </>
        </div>

        {pictures.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary text-sm">
            No progress pictures uploaded yet
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pictures.map((url, i) => (
              <div key={i} className="group relative">
                <div className="aspect-[4/3] rounded-[var(--radius-input)] bg-bg-alt overflow-hidden">
                  <img
                    src={url}
                    alt={`Progress ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeletePicture(url)}
                    disabled={deletingUrl === url}
                    className="p-1 bg-white rounded shadow-sm hover:bg-error/10 text-secondary hover:text-error cursor-pointer disabled:opacity-50"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Progress Videos */}
      <Card padding="sm">
        <div className="px-4 py-4 sm:px-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-heading">Progress Videos</h3>
            <p className="text-xs text-muted mt-1">{videos.length} {videos.length === 1 ? "video" : "videos"}</p>
          </div>
          <>
            <input
              ref={vidInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) handleVideoUpload(files);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => vidInputRef.current?.click()}
              disabled={uploadingVids}
            >
              {uploadingVids ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Videos
                </>
              )}
            </Button>
          </>
        </div>

        {videos.length === 0 ? (
          <div className="px-6 py-8 text-center text-secondary text-sm">
            No progress videos uploaded yet
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((url, i) => (
              <div key={i} className="group relative">
                <div className="rounded-[var(--radius-input)] bg-bg-alt overflow-hidden">
                  <video
                    src={url}
                    controls
                    preload="metadata"
                    className="w-full aspect-video"
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeleteVideo(url)}
                    disabled={deletingUrl === url}
                    className="p-1 bg-white rounded shadow-sm hover:bg-error/10 text-secondary hover:text-error cursor-pointer disabled:opacity-50"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
