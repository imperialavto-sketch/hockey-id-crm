"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Pin,
  Pencil,
  Trash2,
  EyeOff,
  Send,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { CRM_TEAM_ANNOUNCEMENTS_COPY } from "@/lib/crmTeamAnnouncementsCopy";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/rbac";

type AnnouncementPost = {
  id: string;
  teamId: string;
  type: string;
  title: string;
  body: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

function kindLabel(type: string): string {
  const k = type?.trim() ?? "";
  const kinds = CRM_TEAM_ANNOUNCEMENTS_COPY.kinds as Record<string, string>;
  if (kinds[k]) return kinds[k];
  const legacy: Record<string, string> = {
    announcement: "general",
    news: "general",
    schedule_update: "schedule_change",
    match_day: "game_day",
    photo_post: "general",
  };
  const canon = legacy[k];
  return (canon && kinds[canon]) || CRM_TEAM_ANNOUNCEMENTS_COPY.legacyKindFallback;
}

/** Для формы редактирования: приводим старые type к каноническим option value. */
function formKindFromStored(type: string, allowed: string[]): string {
  const k = type?.trim() ?? "";
  if (allowed.includes(k)) return k;
  const legacy: Record<string, string> = {
    announcement: "general",
    news: "general",
    schedule_update: "schedule_change",
    match_day: "game_day",
    photo_post: "general",
  };
  const c = legacy[k];
  if (c && allowed.includes(c)) return c;
  return allowed[0] ?? "general";
}

function canHardDeleteRole(role: UserRole | undefined): boolean {
  return (
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "MAIN_COACH"
  );
}

export default function TeamAnnouncementsManagePage() {
  const params = useParams();
  const teamId = (params?.id as string) ?? "";
  const { user } = useAuth();
  const [teamName, setTeamName] = useState<string | null>(null);
  const [posts, setPosts] = useState<AnnouncementPost[]>([]);
  const [allowedKinds, setAllowedKinds] = useState<string[]>([
    "general",
    "schedule_change",
    "game_day",
    "important",
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formKind, setFormKind] = useState("general");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [formPublish, setFormPublish] = useState(true);

  const canDelete = useMemo(() => canHardDeleteRole(user?.role), [user?.role]);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(false);
    try {
      const [teamRes, annRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`, { credentials: "include" }).then((r) =>
          r.json().catch(() => ({}))
        ),
        fetch(`/api/teams/${teamId}/announcements`, { credentials: "include" }).then(
          (r) => r.json().catch(() => ({}))
        ),
      ]);
      if (teamRes?.name) setTeamName(String(teamRes.name));
      if (annRes?.ok && Array.isArray(annRes.posts)) {
        setPosts(annRes.posts as AnnouncementPost[]);
        if (Array.isArray(annRes.allowedKinds) && annRes.allowedKinds.length > 0) {
          setAllowedKinds(annRes.allowedKinds.map(String));
        }
      } else {
        setPosts([]);
        setError(true);
      }
    } catch {
      setError(true);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormKind(allowedKinds[0] ?? "general");
    setFormTitle("");
    setFormBody("");
    setFormPinned(false);
    setFormPublish(true);
    setCreating(false);
    setEditingId(null);
  };

  const startCreate = () => {
    resetForm();
    setCreating(true);
    setFormKind(allowedKinds[0] ?? "general");
  };

  const startEdit = (p: AnnouncementPost) => {
    setCreating(false);
    setEditingId(p.id);
    setFormKind(formKindFromStored(p.type, allowedKinds));
    setFormTitle(p.title);
    setFormBody(p.body);
    setFormPinned(p.isPinned);
    setFormPublish(p.isPublished);
  };

  const submitCreate = async (asDraft: boolean) => {
    if (!formTitle.trim()) {
      alert(CRM_TEAM_ANNOUNCEMENTS_COPY.validationTitle);
      return;
    }
    if (!formBody.trim()) {
      alert(CRM_TEAM_ANNOUNCEMENTS_COPY.validationBody);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/announcements`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formKind,
          title: formTitle.trim(),
          body: formBody.trim(),
          isPinned: formPinned,
          publish: asDraft ? false : formPublish,
        }),
      });
      if (res.ok) {
        resetForm();
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Не удалось сохранить");
      }
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editingId) return;
    if (!formTitle.trim()) {
      alert(CRM_TEAM_ANNOUNCEMENTS_COPY.validationTitle);
      return;
    }
    if (!formBody.trim()) {
      alert(CRM_TEAM_ANNOUNCEMENTS_COPY.validationBody);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/announcements/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formKind,
          title: formTitle.trim(),
          body: formBody.trim(),
          isPinned: formPinned,
          isPublished: formPublish,
        }),
      });
      if (res.ok) {
        resetForm();
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Не удалось сохранить");
      }
    } finally {
      setSaving(false);
    }
  };

  const patchPost = async (postId: string, patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/announcements/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) await load();
      else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Не удалось обновить");
      }
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm(CRM_TEAM_ANNOUNCEMENTS_COPY.confirmDelete)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/announcements/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        resetForm();
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Недостаточно прав или ошибка удаления");
      }
    } finally {
      setSaving(false);
    }
  };

  const showForm = creating || editingId !== null;

  return (
    <div className="min-h-[50vh] space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/teams/${teamId}`}
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {CRM_TEAM_ANNOUNCEMENTS_COPY.backToTeam}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-neon-blue/10">
              <Megaphone className="h-5 w-5 text-neon-blue" aria-hidden />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
                {CRM_TEAM_ANNOUNCEMENTS_COPY.pageTitle}
              </h1>
              {teamName ? (
                <p className="text-sm text-slate-400">{teamName}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            {CRM_TEAM_ANNOUNCEMENTS_COPY.pageSubtitle}
          </p>
        </div>
        {!showForm ? (
          <Button type="button" className="gap-2 self-start" onClick={startCreate}>
            <Send className="h-4 w-4" aria-hidden />
            {CRM_TEAM_ANNOUNCEMENTS_COPY.newCta}
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card className="border-white/10 p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            {editingId
              ? CRM_TEAM_ANNOUNCEMENTS_COPY.editTitle
              : CRM_TEAM_ANNOUNCEMENTS_COPY.createTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                {CRM_TEAM_ANNOUNCEMENTS_COPY.kindLabel}
              </span>
              <select
                value={formKind}
                onChange={(e) => setFormKind(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
              >
                {allowedKinds.map((k) => (
                  <option key={k} value={k} className="bg-slate-900">
                    {kindLabel(k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                {CRM_TEAM_ANNOUNCEMENTS_COPY.titleLabel}
              </span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                placeholder="Кратко, по сути"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                {CRM_TEAM_ANNOUNCEMENTS_COPY.bodyLabel}
              </span>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
                placeholder="Текст для родителей"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="rounded border-white/20 bg-white/5"
              />
              {CRM_TEAM_ANNOUNCEMENTS_COPY.pinLabel}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={formPublish}
                onChange={(e) => setFormPublish(e.target.checked)}
                className="rounded border-white/20 bg-white/5"
              />
              {CRM_TEAM_ANNOUNCEMENTS_COPY.publishLabel}
            </label>
            <p className="text-xs text-slate-500 sm:w-full">
              {CRM_TEAM_ANNOUNCEMENTS_COPY.publishHelp}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={saving}
            >
              {CRM_TEAM_ANNOUNCEMENTS_COPY.cancel}
            </Button>
            {editingId ? (
              <Button type="button" onClick={() => void submitEdit()} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {CRM_TEAM_ANNOUNCEMENTS_COPY.saveEdit}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void submitCreate(true)}
                  disabled={saving}
                >
                  {CRM_TEAM_ANNOUNCEMENTS_COPY.saveDraft}
                </Button>
                <Button type="button" onClick={() => void submitCreate(false)} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {CRM_TEAM_ANNOUNCEMENTS_COPY.saveCreate}
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
        </div>
      ) : error ? (
        <Card className="border-amber-500/30 bg-amber-500/10 p-6">
          <p className="font-medium text-amber-100">
            {CRM_TEAM_ANNOUNCEMENTS_COPY.loadErrorTitle}
          </p>
          <p className="mt-1 text-sm text-amber-200/80">
            {CRM_TEAM_ANNOUNCEMENTS_COPY.loadErrorHint}
          </p>
          <Button type="button" className="mt-4" onClick={() => void load()}>
            {CRM_TEAM_ANNOUNCEMENTS_COPY.retry}
          </Button>
        </Card>
      ) : posts.length === 0 ? (
        <Card className="border-white/10 p-10 text-center">
          <p className="font-display text-lg font-semibold text-white">
            {CRM_TEAM_ANNOUNCEMENTS_COPY.emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {CRM_TEAM_ANNOUNCEMENTS_COPY.emptyHint}
          </p>
          {!showForm ? (
            <Button type="button" className="mt-6 gap-2" onClick={startCreate}>
              <Send className="h-4 w-4" aria-hidden />
              {CRM_TEAM_ANNOUNCEMENTS_COPY.newCta}
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card
              key={p.id}
              className={cn(
                "border-white/10 p-4 sm:p-5",
                !p.isPublished && "opacity-90 ring-1 ring-amber-500/20"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-neon-blue/15 px-2 py-0.5 text-xs font-medium text-neon-blue">
                      {kindLabel(p.type)}
                    </span>
                    {p.isPinned ? (
                      <span title="Закреплено">
                        <Pin className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-xs font-medium",
                        p.isPublished
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-500/20 text-slate-400"
                      )}
                    >
                      {p.isPublished
                        ? CRM_TEAM_ANNOUNCEMENTS_COPY.statusPublished
                        : CRM_TEAM_ANNOUNCEMENTS_COPY.statusHidden}
                    </span>
                  </div>
                  <h3 className="mt-2 font-medium text-white">{p.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-400">{p.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {CRM_TEAM_ANNOUNCEMENTS_COPY.authorLine}: {p.authorName} ·{" "}
                    {new Date(p.updatedAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <button
                    type="button"
                    title={p.isPinned ? "Открепить" : "Закрепить"}
                    onClick={() =>
                      void patchPost(p.id, { isPinned: !p.isPinned })
                    }
                    disabled={saving || editingId === p.id}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-amber-400 disabled:opacity-40"
                  >
                    {p.isPinned ? (
                      <Pin className="h-4 w-4 rotate-45" aria-hidden />
                    ) : (
                      <Pin className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    title={
                      p.isPublished
                        ? CRM_TEAM_ANNOUNCEMENTS_COPY.unpublishLabel
                        : CRM_TEAM_ANNOUNCEMENTS_COPY.publishCta
                    }
                    onClick={() =>
                      void patchPost(p.id, { isPublished: !p.isPublished })
                    }
                    disabled={saving || editingId === p.id}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-neon-blue disabled:opacity-40"
                  >
                    <EyeOff className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Редактировать"
                    onClick={() => startEdit(p)}
                    disabled={saving}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      title={CRM_TEAM_ANNOUNCEMENTS_COPY.deleteCta}
                      onClick={() => void deletePost(p.id)}
                      disabled={saving || editingId === p.id}
                      className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
