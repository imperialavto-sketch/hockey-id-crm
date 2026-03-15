"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Shield,
  Settings,
  Bell,
  Plug,
  Save,
  Plus,
  Search,
  Pencil,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "school", label: "Общие настройки школы", icon: Building2 },
  { id: "users", label: "Пользователи и роли", icon: Users },
  { id: "permissions", label: "Права доступа", icon: Shield },
  { id: "system", label: "Системные настройки", icon: Settings },
  { id: "notifications", label: "Уведомления", icon: Bell },
  { id: "integrations", label: "Внешние интеграции", icon: Plug },
];

const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: "Администратор",
  MAIN_COACH: "Главный тренер",
  COACH: "Тренер",
  SCHOOL_MANAGER: "Менеджер школы",
  PARENT: "Родитель",
};

const MODULES = [
  "Dashboard",
  "Школа",
  "Команды",
  "Игроки",
  "Тренеры",
  "Расписание",
  "Финансы",
  "Аналитика",
  "Коммуникации",
  "Настройки",
];

const MODULE_KEYS: Record<string, string> = {
  Dashboard: "dashboard",
  "Школа": "school",
  "Команды": "teams",
  "Игроки": "players",
  "Тренеры": "coaches",
  "Расписание": "schedule",
  "Финансы": "finance",
  "Аналитика": "analytics",
  "Коммуникации": "communications",
  "Настройки": "settings",
};

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div>
        <p className="font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-slate-500">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-neon-blue" : "bg-white/20"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("school");
  const [loading, setLoading] = useState(true);

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">Настройки</h1>
        <p className="mt-1 text-slate-400">Школа, роли, права доступа и системные параметры</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="w-full shrink-0 lg:w-56">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <tab.icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 lg:hidden" />
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "school" && <SchoolTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "permissions" && <PermissionsTab />}
          {activeTab === "system" && <SystemTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}

function SchoolTab() {
  const [data, setData] = useState({
    name: "",
    logoUrl: "",
    city: "",
    country: "",
    address: "",
    phone: "",
    email: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/school")
      .then((r) => r.json())
      .then((s) => {
        setData({
          name: s?.name ?? "",
          logoUrl: s?.logoUrl ?? "",
          city: s?.city ?? "",
          country: s?.country ?? "",
          address: s?.address ?? "",
          phone: s?.phone ?? "",
          email: s?.email ?? "",
          description: s?.description ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings/school", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
  };

  if (loading) return <Card><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neon-blue" /></div></Card>;

  return (
    <Card>
      <h2 className="mb-6 font-display text-lg font-semibold text-white">Общие настройки школы</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Название школы</label>
          <input
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">URL логотипа</label>
          <input
            value={data.logoUrl}
            onChange={(e) => setData({ ...data, logoUrl: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
            placeholder="https://..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Город</label>
            <input
              value={data.city}
              onChange={(e) => setData({ ...data, city: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Страна</label>
            <input
              value={data.country}
              onChange={(e) => setData({ ...data, country: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Адрес</label>
          <input
            value={data.address}
            onChange={(e) => setData({ ...data, address: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Телефон</label>
            <input
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Email</label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Описание школы</label>
          <textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </Card>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<{ id: string; name: string; email: string; phone: string | null; role: string; teamId?: string; teamName?: string; status: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "COACH",
    teamId: "",
    status: "Активен",
  });

  const fetchData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    Promise.all([
      fetch(`/api/users?${params}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([u, t]) => {
        setUsers(Array.isArray(u) ? u : []);
        setTeams(Array.isArray(t) ? t : t?.teams ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [search, roleFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        teamId: form.teamId || null,
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", password: "", role: "COACH", teamId: "", status: "Активен" });
      fetchData();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    await fetch(`/api/users/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        teamId: form.teamId || null,
        status: form.status,
        ...(form.password && { password: form.password }),
      }),
    });
    setEditId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить пользователя?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-white">Пользователи и роли</h2>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Добавить пользователя
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-xl border border-white/20 bg-white/5 py-2 pl-9 pr-4 text-sm text-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        >
          <option value="">Все роли</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neon-blue" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="px-4 py-3">ФИО</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Команда</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{u.name}</td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-neon-blue/40 bg-neon-blue/20 px-2 py-0.5 text-xs text-neon-blue">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.teamName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{u.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditId(u.id); setForm({ name: u.name, email: u.email, phone: u.phone ?? "", password: "", role: u.role, teamId: u.teamId ?? "", status: u.status }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <button onClick={() => handleDelete(u.id)} className="text-neon-pink hover:bg-neon-pink/10 rounded p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {users.length === 0 && !loading && (
        <p className="py-12 text-center text-slate-500">Нет пользователей (CRM в демо-режиме использует mock-пользователей)</p>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Добавить пользователя</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">ФИО *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Телефон</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Пароль *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Роль</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
                  {Object.entries(ROLE_LABELS).filter(([k]) => k !== "PARENT").map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Команда</label>
                <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
                  <option value="">—</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Создать</Button>
                <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Редактировать пользователя</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">ФИО</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Новый пароль (оставьте пустым, чтобы не менять)</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Роль</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Команда</label>
                <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
                  <option value="">—</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Сохранить</Button>
                <Button type="button" variant="secondary" onClick={() => setEditId(null)}>Отмена</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Card>
  );
}

function PermissionsTab() {
  const [roles, setRoles] = useState<{ id: string; name: string; permissions: { id: string; module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then(setRoles)
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, []);

  type PermItem = { id?: string; module: string; canView?: boolean; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean };
  const getPerm = (role: { permissions: PermItem[] }, moduleKey: string): PermItem | undefined =>
    role.permissions?.find((p) => p.module === moduleKey);

  const handleToggle = (roleId: string, moduleKey: string, field: "canView" | "canCreate" | "canEdit" | "canDelete", value: boolean) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        const perms = [...(r.permissions || [])];
        const idx = perms.findIndex((p) => p.module === moduleKey);
        const p = idx >= 0 ? { ...perms[idx], [field]: value } : { id: "", module: moduleKey, canView: false, canCreate: false, canEdit: false, canDelete: false, [field]: value };
        if (idx >= 0) perms[idx] = p;
        else perms.push(p);
        return { ...r, permissions: perms };
      })
    );
  };

  const handleSave = async (roleId: string) => {
    setSaving(roleId);
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      const perms = MODULES.map((m) => {
        const key = MODULE_KEYS[m];
        const p = getPerm(role, key);
        return { id: p?.id, module: key, canView: p?.canView ?? true, canCreate: p?.canCreate ?? false, canEdit: p?.canEdit ?? false, canDelete: p?.canDelete ?? false };
      });
      await fetch(`/api/roles/${roleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
    }
    setSaving(null);
  };

  if (loading) return <Card><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neon-blue" /></div></Card>;

  return (
    <Card>
      <h2 className="mb-6 font-display text-lg font-semibold text-white">Матрица прав доступа</h2>
      {roles.length === 0 ? (
        <p className="text-slate-500">Запустите seed для создания ролей: node scripts/seed-settings.js</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-4 py-3 text-slate-400">Модуль</th>
                {roles.map((r) => (
                  <th key={r.id} className="px-4 py-3 text-white">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod} className="border-b border-white/5">
                  <td className="px-4 py-3 text-slate-300">{mod}</td>
                  {roles.map((r) => {
                    const key = MODULE_KEYS[mod];
                    const p = getPerm(r, key);
                    return (
                      <td key={r.id} className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((f) => (
                            <label key={f} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p?.[f] ?? false}
                                onChange={(e) => handleToggle(r.id, key, f, e.target.checked)}
                                className="rounded border-white/30 bg-white/5 text-neon-blue"
                              />
                              <span className="text-xs text-slate-500">
                                {f === "canView" && "Просмотр"}
                                {f === "canCreate" && "Созд."}
                                {f === "canEdit" && "Ред."}
                                {f === "canDelete" && "Удал."}
                              </span>
                            </label>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2">
            {roles.map((r) => (
              <Button key={r.id} size="sm" onClick={() => handleSave(r.id)} disabled={saving === r.id}>
                {saving === r.id ? "…" : `Сохранить ${r.name}`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SystemTab() {
  const [data, setData] = useState({
    theme: "dark",
    language: "ru",
    timezone: "Europe/Moscow",
    dateFormat: "DD.MM.YYYY",
    currency: "RUB",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/system")
      .then((r) => r.json())
      .then((s) => setData({
        theme: s?.theme ?? "dark",
        language: s?.language ?? "ru",
        timezone: s?.timezone ?? "Europe/Moscow",
        dateFormat: s?.dateFormat ?? "DD.MM.YYYY",
        currency: s?.currency ?? "RUB",
      }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings/system", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
  };

  if (loading) return <Card><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neon-blue" /></div></Card>;

  return (
    <Card>
      <h2 className="mb-6 font-display text-lg font-semibold text-white">Системные настройки</h2>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Тема</label>
          <select value={data.theme} onChange={(e) => setData({ ...data, theme: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
            <option value="dark">Тёмная</option>
            <option value="light">Светлая</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Язык</label>
          <select value={data.language} onChange={(e) => setData({ ...data, language: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Часовой пояс</label>
          <select value={data.timezone} onChange={(e) => setData({ ...data, timezone: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
            <option value="Europe/Moscow">Москва</option>
            <option value="Europe/Samara">Самара</option>
            <option value="Asia/Yekaterinburg">Екатеринбург</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Формат даты</label>
          <select value={data.dateFormat} onChange={(e) => setData({ ...data, dateFormat: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
            <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Валюта</label>
          <select value={data.currency} onChange={(e) => setData({ ...data, currency: e.target.value })} className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white">
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>
        <Button onClick={handleSave} disabled={saving}>Сохранить</Button>
      </div>
    </Card>
  );
}

function NotificationsTab() {
  const [data, setData] = useState({
    emailEnabled: true,
    pushEnabled: true,
    systemEnabled: true,
    newMessages: true,
    newPayments: true,
    overduePayments: true,
    newTrainings: true,
    scheduleChanges: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((s) => setData({
        emailEnabled: s?.emailEnabled ?? true,
        pushEnabled: s?.pushEnabled ?? true,
        systemEnabled: s?.systemEnabled ?? true,
        newMessages: s?.newMessages ?? true,
        newPayments: s?.newPayments ?? true,
        overduePayments: s?.overduePayments ?? true,
        newTrainings: s?.newTrainings ?? true,
        scheduleChanges: s?.scheduleChanges ?? true,
      }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
  };

  if (loading) return <Card><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neon-blue" /></div></Card>;

  return (
    <Card>
      <h2 className="mb-6 font-display text-lg font-semibold text-white">Уведомления</h2>
      <div className="space-y-4">
        <ToggleRow label="Email уведомления" desc="Получать уведомления на почту" checked={data.emailEnabled} onChange={(v) => setData({ ...data, emailEnabled: v })} />
        <ToggleRow label="Push уведомления" desc="Уведомления в браузере" checked={data.pushEnabled} onChange={(v) => setData({ ...data, pushEnabled: v })} />
        <ToggleRow label="Системные уведомления" desc="Внутри CRM" checked={data.systemEnabled} onChange={(v) => setData({ ...data, systemEnabled: v })} />
        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="mb-4 text-sm font-medium text-slate-400">Типы уведомлений</h3>
          <div className="space-y-4">
            <ToggleRow label="Новые обращения" checked={data.newMessages} onChange={(v) => setData({ ...data, newMessages: v })} />
            <ToggleRow label="Новые оплаты" checked={data.newPayments} onChange={(v) => setData({ ...data, newPayments: v })} />
            <ToggleRow label="Просроченные оплаты" checked={data.overduePayments} onChange={(v) => setData({ ...data, overduePayments: v })} />
            <ToggleRow label="Новые тренировки" checked={data.newTrainings} onChange={(v) => setData({ ...data, newTrainings: v })} />
            <ToggleRow label="Изменения расписания" checked={data.scheduleChanges} onChange={(v) => setData({ ...data, scheduleChanges: v })} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="mt-4">Сохранить</Button>
      </div>
    </Card>
  );
}

function IntegrationsTab() {
  const items = [
    { id: "trackhockey", name: "TrackHockey", status: "Отключено", desc: "Синхронизация данных хоккеистов" },
    { id: "stripe", name: "Stripe", status: "Отключено", desc: "Приём платежей" },
    { id: "google", name: "Google Calendar", status: "Отключено", desc: "Синхронизация расписания" },
    { id: "smtp", name: "Email SMTP", status: "Отключено", desc: "Отправка писем" },
  ];
  return (
    <Card>
      <h2 className="mb-6 font-display text-lg font-semibold text-white">Внешние интеграции</h2>
      <p className="mb-6 text-sm text-slate-500">Подключите внешние сервисы для расширения возможностей CRM.</p>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="font-medium text-white">{item.name}</p>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${item.status === "Подключено" ? "text-neon-green" : "text-slate-500"}`}>
                {item.status}
              </span>
              <Button size="sm" variant="secondary">Подключить</Button>
              <Button size="sm" variant="ghost">Настроить</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
