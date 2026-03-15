"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/Button";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-12 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-pink font-display text-2xl font-bold text-white shadow-[0_0_30px_rgba(0,212,255,0.5)]">
          H
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide text-white">
            Hockey ID CRM
          </h1>
          <p className="text-slate-400">Мировой лидер в управлении хоккейными школами</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-2xl glass-card p-8">
        <h2 className="text-center font-display text-xl font-semibold text-white">
          Вход
        </h2>
        <LoginForm />
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        Демо: admin@hockey.edu / coach@hockey.edu / parent@example.com • Пароль: admin123
      </p>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      router.replace("/dashboard");
      return;
    }
    setError(result.error);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-400">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
          placeholder="admin@hockey.edu"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-400">Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
          placeholder="••••••••"
          required
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Вход…" : "Войти"}
      </Button>
    </form>
  );
}
