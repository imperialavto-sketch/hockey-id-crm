# Sprint 6 — Global QA Pass Report

**Дата:** март 2025  
**Цель:** финальный product/UI/UX/QA проход перед состоянием «готово к пилоту / демо / первым пользователям».

---

## A. QA Summary

**Общее состояние приложения:** Hockey ID после Sprints 1–5 — цельный flagship-продукт с едиными error/empty компонентами, отполированными основными экранами и production-safe подпиской. Оставшиеся расхождения были в основном в том, что часть high-traffic экранов (Schedule, Marketplace, Profile, Notifications, Bookings, Home) всё ещё использовала локальные error-блоки вместо общего ErrorStateView, а два экрана (Schedule, Home) не имели защиты от setState после unmount.

**Найдено high-priority issues:** 8  
- 6 экранов с локальными error-блоками вместо ErrorStateView (consistency + единый retry/haptic).  
- 2 экрана с возможным setState после unmount (Schedule, Home) — риск при быстром уходе с экрана.

**Исправлено в рамках спринта:** 8  
- Все 6 экранов переведены на ErrorStateView.  
- На Schedule и Home добавлен mountedRef и проверки перед setState после async.

---

## B. Fixed Issues

| № | Экран / файл | Проблема | Что сделано | Зачем важно |
|---|--------------|----------|-------------|-------------|
| 1 | **Schedule** `app/(tabs)/schedule.tsx` | Локальный error-блок (иконка + текст + Retry), нет защиты от unmount. | Заменён блок на ErrorStateView (variant="network", title/subtitle, onAction=load). В load() добавлен mountedRef, все setState после await и в finally обёрнуты в проверку mountedRef. Удалены стили errorContainer, errorTitle, errorSub, retryBtn, retryBtnText. | Единый вид ошибок, предсказуемый Retry, отсутствие setState после unmount при быстром уходе с вкладки. |
| 2 | **Marketplace** `app/(tabs)/marketplace.tsx` | Локальный error-блок. | Заменён на ErrorStateView (variant="network", «Не удалось загрузить тренеров», onAction=loadCoaches). Стили error-блока сведены к errorContainer: { flex: 1 }. | Консистентность с остальными экранами, один стандарт ошибки и Retry. |
| 3 | **Profile** `app/(tabs)/profile.tsx` | Локальный error-блок. | Заменён на ErrorStateView (variant="network", «Не удалось загрузить профиль», onAction=loadProfile). Добавлен errorWrap: { flex: 1 }, удалены старые error-стили. | Единый error/retry на экране профиля, важном для пилота. |
| 4 | **Notifications** `app/notifications/index.tsx` | Локальный error-блок. | Заменён на ErrorStateView (variant="network", «Не удалось загрузить уведомления», onAction с setLoading(true) + load()). Добавлен errorWrap, удалены errorContainer, errorTitle, errorSub, retryBtn, retryBtnText. | Консистентность и понятный retry для уведомлений. |
| 5 | **Bookings** `app/bookings/index.tsx` | Локальный error-блок. | Заменён на ErrorStateView (variant="network", «Не удалось загрузить бронирования», onAction=load). Добавлен errorWrap, удалены старые error-стили. | Единый стандарт на экране бронирований. |
| 6 | **Home** `app/(tabs)/index.tsx` | Локальный error-блок (errorText без разбивки title/sub), нет защиты от unmount. | Заменён на ErrorStateView (variant="network", «Ошибка загрузки», «Проверьте соединение…», onAction=loadData). Добавлены mountedRef и проверки в loadData перед setState после await и в finally. Добавлен errorWrap, удалены errorContainer, errorText, retryBtn, retryBtnText. | Единый вид ошибки на главном экране и защита от setState после unmount. |

---

## C. Remaining Minor Issues

- **Notifications header:** borderBottomColor до сих пор хардкод `"rgba(255,255,255,0.06)"`. Можно заменить на `colors.surfaceLevel1Border` при следующем точечном pass.  
- **Bookings customHeader:** аналогично borderBottomColor хардкод. Не критично для пилота.  
- **Отдельные экраны (video-analysis, coach flow, chat [id]):** при желании позже можно проверить error/empty на использование ErrorStateView/EmptyStateView; не входило в scope Sprint 6.  
- **Мелкие theme-токены:** в ряде мест ещё встречаются жёсткие rgba для границ/фона; замена на токены — следующий шаг по желанию, не блокер пилота.

---

## D. Readiness Assessment

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| **UI consistency** | 9/10 | Единый FlagshipScreen, ErrorStateView, EmptyStateView на основных экранах. Мелкие отличия в header/бордерах не мешают. |
| **UX maturity** | 9/10 | Понятные loading (скелетоны), error с Retry, empty states. Нет тупиковых сценариев на проверенных экранах. |
| **Stability** | 9/10 | Подписка и ключевые экраны с try/catch и finally; Schedule и Home защищены от setState после unmount. Риск «вечной загрузки» и предупреждений unmount снижен. |
| **Pilot readiness** | Готов к пилоту | Цельный premium-уровень, единые состояния ошибок, стабильная загрузка. Подходит для демо и первых тестовых пользователей. |

---

## E. Recommended Final Step

1. **Перед релизом пилота:** пройти по основным сценариям вручную (вход → главная → профиль игрока → паспорт → расписание → лента → подписка → команда → чат → участники → уведомления → бронирования) и при падении API проверить, что везде показывается ErrorStateView и Retry отрабатывает.  
2. **Опционально:** заменить оставшиеся хардкоды границ (notifications/header, bookings/header) на `colors.surfaceLevel1Border`.  
3. **Не делать:** массовый рефактор, смену API, доработки таббара и роутинга — текущее состояние достаточное для пилота.

---

*Sprint 6 выполнен как дисциплинированный final QA pass: исправлены только реальные high-value issues (единый error state и защита от unmount), без расширения scope и без переписывания уже сильных экранов.*
