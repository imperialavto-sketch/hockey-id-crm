/**
 * SMS sending — stub for future integration.
 * When provider is chosen, implement sendInviteSMS.
 *
 * Example message:
 * "Вас пригласили в Hockey ID для игрока Голыш Марк.
 *  Скачайте приложение и войдите по номеру телефона."
 */

export async function sendInviteSMS(
  _phone: string,
  _playerName: string
): Promise<void> {
  // TODO: integrate SMS provider (Twilio, SMS.ru, etc.)
  // const message = `Вас пригласили в Hockey ID для игрока ${playerName}. Скачайте приложение и войдите по номеру телефона.`;
  // await smsProvider.send(phone, message);
  return;
}
