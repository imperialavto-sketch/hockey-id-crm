/**
 * SMS sending — stub for future integration.
 * When provider is chosen, implement sendInviteSMS.
 *
 * Example message:
 * "Вас пригласили в Hockey ID для игрока Голыш Марк.
 *  Скачайте приложение и войдите по номеру телефона."
 */

export type AuthCodeSmsSendResult = {
  ok: boolean;
  correlationId?: string;
  finalChannel?: string;
  finalMode?: string;
  attempts: unknown[];
  lastErrorCode?: string;
  lastErrorMessage?: string;
};

/** True when production SMS credentials are present (extend when wiring a provider). */
export function isSmscConfigured(): boolean {
  return Boolean(
    process.env.SMSC_LOGIN?.trim() && process.env.SMSC_PASSWORD?.trim()
  );
}

/** Parent phone OTP; non-production succeeds without sending (code still in store / logs). */
export async function sendAuthCodeSMS(
  _phone: string,
  _code: string
): Promise<AuthCodeSmsSendResult> {
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, attempts: [] };
  }
  if (!isSmscConfigured()) {
    return {
      ok: false,
      attempts: [],
      lastErrorCode: "sms_not_configured",
      lastErrorMessage: "SMS provider not configured",
    };
  }
  return {
    ok: false,
    attempts: [],
    lastErrorCode: "sms_not_implemented",
    lastErrorMessage: "SMS send not implemented",
  };
}

export async function sendInviteSMS(
  _phone: string,
  _playerName: string
): Promise<void> {
  // TODO: integrate SMS provider (Twilio, SMS.ru, etc.)
  // const message = `Вас пригласили в Hockey ID для игрока ${playerName}. Скачайте приложение и войдите по номеру телефона.`;
  // await smsProvider.send(phone, message);
  return;
}
