"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Repeat, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";
import { CRM_TRAINING_CREATE_COPY } from "@/lib/crmTrainingCreateCopy";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
}

interface BatchCreateResponse {
  ok?: boolean;
  readinessSummary?: {
    weeksCount: number;
    weeksWithVisibilityGap: number;
    totalMissingAssignments: number;
  };
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue";

const LABEL_CLASS = "text-sm font-medium text-slate-400";

const WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

function FormSection({
  kicker,
  title,
  hint,
  children,
}: {
  kicker: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/[0.1] p-0">
      <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{kicker}</p>
        <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </Card>
  );
}

function TrainingCreateNav() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/schedule"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {CRM_TRAINING_CREATE_COPY.backTrainings}
      </Link>
      <Link
        href="/schedule"
        className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
      >
        {CRM_TRAINING_CREATE_COPY.backSchedule}
      </Link>
    </div>
  );
}

function TrainingCreateHero() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
        {CRM_TRAINING_CREATE_COPY.heroEyebrow}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
        {CRM_TRAINING_CREATE_COPY.heroTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
        {CRM_TRAINING_CREATE_COPY.heroSubtitle}
      </p>
    </div>
  );
}

export default function ScheduleCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamIdFromUrl = searchParams.get("teamId") ?? "";
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsFetchError, setTeamsFetchError] = useState(false);
  const [teamsRetryTick, setTeamsRetryTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [postSubmitInfo, setPostSubmitInfo] = useState("");
  const [recurring, setRecurring] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    startDate: todayIso,
    startTime: "18:00",
    durationMinutes: 90,
    location: "",
    teamId: teamIdFromUrl,
    notes: "",
    weekdays: [1, 3, 5] as number[],
    weeks: 4,
  });

  useEffect(() => {
    if (teamIdFromUrl) setForm((f) => ({ ...f, teamId: teamIdFromUrl }));
  }, [teamIdFromUrl]);

  useEffect(() => {
    setTeamsLoading(true);
    setTeamsFetchError(false);
    fetch("/api/teams")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("fetch failed");
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.teams)) return data.teams;
        return [];
      })
      .then(setTeams)
      .catch(() => {
        setTeamsFetchError(true);
        setTeams([]);
      })
      .finally(() => setTeamsLoading(false));
  }, [teamsRetryTick]);

  const safeTeams = Array.isArray(teams) ? teams : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPostSubmitInfo("");
    setLoading(true);

    try {
      if (recurring) {
        const res = await fetch("/api/trainings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            teamId: form.teamId,
            startDate: form.startDate,
            startTime: form.startTime,
            durationMinutes: form.durationMinutes,
            location: form.location || null,
            notes: form.notes || null,
            weekdays: form.weekdays,
            weeks: form.weeks,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? "Ошибка создания");
          setLoading(false);
          return;
        }
        const batch = data as BatchCreateResponse;
        if ((batch.readinessSummary?.weeksWithVisibilityGap ?? 0) > 0) {
          const weeks = String(batch.readinessSummary?.weeksWithVisibilityGap ?? 0);
          const missing = String(batch.readinessSummary?.totalMissingAssignments ?? 0);
          router.push(
            `/schedule?readinessGap=1&gapWeeks=${encodeURIComponent(weeks)}&missingAssignments=${encodeURIComponent(missing)}`
          );
          return;
        }
        router.push("/schedule");
        return;
      }

      const [year, month, day] = form.startDate.split("-").map(Number);
      const [hour, min] = form.startTime.split(":").map(Number);
      const start = new Date(year, month - 1, day, hour || 18, min || 0, 0);
      const end = new Date(start.getTime() + (form.durationMinutes || 90) * 60 * 1000);

      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: "ice",
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          locationName: form.location || null,
          teamId: form.teamId || undefined,
          notes: form.notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        setLoading(false);
        return;
      }

      router.push(`/schedule/${data.id}`);
    } catch {
      setError("Ошибка сохранения");
      setLoading(false);
    }
  };

  if (teamsLoading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <TrainingCreateNav />
          <TrainingCreateHero />
          <Card className="mx-auto max-w-3xl border-white/[0.1]">
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">
                  {CRM_TRAINING_CREATE_COPY.teamsLoadingTitle}
                </p>
                <p className="mt-1 text-sm text-slate-500">{CRM_TRAINING_CREATE_COPY.teamsLoadingHint}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (teamsFetchError) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <TrainingCreateNav />
          <TrainingCreateHero />
          <div
            className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_TRAINING_CREATE_COPY.teamsErrorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_TRAINING_CREATE_COPY.teamsErrorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setTeamsRetryTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_TRAINING_CREATE_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (safeTeams.length === 0) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <TrainingCreateNav />
          <TrainingCreateHero />
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.1] bg-white/[0.04] px-6 py-16 text-center sm:px-10">
            <p className="text-lg font-semibold text-slate-200">{CRM_TRAINING_CREATE_COPY.emptyTeamsTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {CRM_TRAINING_CREATE_COPY.emptyTeamsHint}
            </p>
            <Link href="/teams" className="mt-8 inline-block">
              <Button className="gap-2">{CRM_TRAINING_CREATE_COPY.emptyTeamsCta}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <TrainingCreateNav />
        <TrainingCreateHero />
        <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              {error}
            </div>
          ) : null}
          {postSubmitInfo ? (
            <div
              role="status"
              className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
            >
              {postSubmitInfo}
            </div>
          ) : null}

          <FormSection
            kicker={CRM_TRAINING_CREATE_COPY.sectionMainKicker}
            title={CRM_TRAINING_CREATE_COPY.sectionMainTitle}
            hint={CRM_TRAINING_CREATE_COPY.sectionMainHint}
          >
            <div>
              <label htmlFor="training-team" className={LABEL_CLASS}>
                {CRM_TRAINING_CREATE_COPY.labelTeam}{" "}
                <span className="text-neon-blue/90" aria-hidden>
                  *
                </span>
              </label>
              <select
                id="training-team"
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                className={INPUT_CLASS}
                required
              >
                <option value="">{CRM_TRAINING_CREATE_COPY.selectTeamPlaceholder}</option>
                {safeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ageGroup})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="training-title" className={LABEL_CLASS}>
                {CRM_TRAINING_CREATE_COPY.labelTitle}{" "}
                <span className="text-neon-blue/90" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="training-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLASS}
                placeholder={CRM_TRAINING_CREATE_COPY.placeholderTitle}
                required
              />
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="mt-1 rounded border-white/[0.2] bg-white/[0.05] text-neon-blue focus:ring-neon-blue"
                />
                <div className="min-w-0">
                  <label htmlFor="recurring" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
                    <Repeat className="h-4 w-4 shrink-0 text-neon-blue/90" aria-hidden />
                    {CRM_TRAINING_CREATE_COPY.recurringLabel}
                  </label>
                  <p className="mt-1 text-xs text-slate-600">{CRM_TRAINING_CREATE_COPY.recurringHelper}</p>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            kicker={CRM_TRAINING_CREATE_COPY.sectionTimeKicker}
            title={CRM_TRAINING_CREATE_COPY.sectionTimeTitle}
            hint={CRM_TRAINING_CREATE_COPY.sectionTimeHint}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="training-date" className={LABEL_CLASS}>
                  {recurring ? CRM_TRAINING_CREATE_COPY.labelDateRecurring : CRM_TRAINING_CREATE_COPY.labelDate}{" "}
                  <span className="text-neon-blue/90" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="training-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  min={todayIso}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div>
                <label htmlFor="training-time" className={LABEL_CLASS}>
                  {CRM_TRAINING_CREATE_COPY.labelTime}{" "}
                  <span className="text-neon-blue/90" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="training-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="training-duration" className={LABEL_CLASS}>
                {CRM_TRAINING_CREATE_COPY.labelDuration}{" "}
                <span className="text-neon-blue/90" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="training-duration"
                type="number"
                min={30}
                max={180}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: parseInt(e.target.value, 10) || 90 })
                }
                className={cn(INPUT_CLASS, "max-w-[140px]")}
              />
            </div>

            {recurring ? (
              <>
                <div>
                  <span className={LABEL_CLASS}>{CRM_TRAINING_CREATE_COPY.labelWeekdays}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                      const checked = form.weekdays.includes(d);
                      return (
                        <label
                          key={d}
                          className={cn(
                            "cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                            checked
                              ? "border-neon-blue/40 bg-neon-blue/15 text-neon-blue"
                              : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/[0.12]"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({
                                  ...form,
                                  weekdays: [...form.weekdays, d].sort((a, b) => a - b),
                                });
                              } else {
                                setForm({
                                  ...form,
                                  weekdays: form.weekdays.filter((x) => x !== d),
                                });
                              }
                            }}
                            className="sr-only"
                          />
                          {WEEKDAY_SHORT[d]}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="training-weeks" className={LABEL_CLASS}>
                    {CRM_TRAINING_CREATE_COPY.labelWeeks}
                  </label>
                  <input
                    id="training-weeks"
                    type="number"
                    min={1}
                    max={12}
                    value={form.weeks}
                    onChange={(e) =>
                      setForm({ ...form, weeks: parseInt(e.target.value, 10) || 4 })
                    }
                    className={cn(INPUT_CLASS, "max-w-[120px]")}
                  />
                </div>
              </>
            ) : null}
          </FormSection>

          <FormSection
            kicker={CRM_TRAINING_CREATE_COPY.sectionDetailsKicker}
            title={CRM_TRAINING_CREATE_COPY.sectionDetailsTitle}
            hint={CRM_TRAINING_CREATE_COPY.sectionDetailsHint}
          >
            <div>
              <label htmlFor="training-location" className={LABEL_CLASS}>
                {CRM_TRAINING_CREATE_COPY.labelLocation}{" "}
                <span className="text-xs font-normal text-slate-600">({CRM_TRAINING_CREATE_COPY.optional})</span>
              </label>
              <input
                id="training-location"
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={INPUT_CLASS}
                placeholder={CRM_TRAINING_CREATE_COPY.placeholderLocation}
              />
            </div>

            <div>
              <label htmlFor="training-notes" className={LABEL_CLASS}>
                {CRM_TRAINING_CREATE_COPY.labelNotes}{" "}
                <span className="text-xs font-normal text-slate-600">({CRM_TRAINING_CREATE_COPY.optional})</span>
              </label>
              <textarea
                id="training-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                className={INPUT_CLASS}
                placeholder={CRM_TRAINING_CREATE_COPY.placeholderNotes}
              />
            </div>
          </FormSection>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.1] bg-white/[0.03] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" disabled={loading} className="gap-2 sm:min-w-[200px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {loading
                  ? CRM_TRAINING_CREATE_COPY.submitting
                  : recurring
                    ? CRM_TRAINING_CREATE_COPY.submitRecurring
                    : CRM_TRAINING_CREATE_COPY.submitSingle}
              </Button>
              <Link href="/schedule">
                <Button type="button" variant="secondary">
                  {CRM_TRAINING_CREATE_COPY.cancel}
                </Button>
              </Link>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 sm:max-w-[220px] sm:text-right">
              {recurring ? CRM_TRAINING_CREATE_COPY.footerHintRecurring : CRM_TRAINING_CREATE_COPY.footerHintSingle}
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
