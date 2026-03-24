/**
 * Coach auth service — login via Next.js CRM /api/auth/login.
 * Returns mobileToken for Bearer auth.
 * Demo mode: coach@hockey.edu / admin123 logs in locally without API.
 */

import { API_BASE_URL, isDemoMode } from '@/lib/config';
import type { CoachUser } from '@/context/AuthContext';

const DEMO_EMAIL = 'coach@hockey.edu';
const DEMO_PASSWORD = 'admin123';

const MOCK_DEMO: { mobileToken: string; user: CoachUser; role: string } = {
  mobileToken: 'demo-mock-token',
  user: {
    id: 'demo-coach',
    email: DEMO_EMAIL,
    name: 'Demo Coach',
    role: 'coach',
  },
  role: 'coach',
};

export interface LoginResponse {
  user: CoachUser;
  role: string;
  mobileToken: string;
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<LoginResponse> {
  if (
    isDemoMode &&
    email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() &&
    password === DEMO_PASSWORD
  ) {
    return MOCK_DEMO;
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? 'Неверный email или пароль');
  }
  if (!data?.mobileToken || !data?.user) {
    throw new Error('Сервер не вернул сессию');
  }
  return data;
}
