# Hockey ID — Product, UI, UX & Code Quality Audit

**Дата:** март 2025  
**Цель:** структурированная оценка текущего состояния мобильного приложения, приоритеты и roadmap без хаотичных переделок.

---

## A. Executive Summary

**Текущее состояние:** Приложение находится на стадии **зрелого MVP с островками flagship-качества**. Основные пользовательские сценарии (профиль игрока, паспорт, расписание, подписка, маркетплейс, чат) реализованы и работают. Часть экранов уже приведена к единому премиум-уровню (PlayerProfileScreen, passport, schedule); остальные используют общую дизайн-систему выборочно.

**Общий уровень зрелости:** 7/10 — production-ready по функционалу, визуальная и UX-согласованность в процессе унификации.

**Что уже сделано сильно:**
- Единая тема (colors, spacing, radius, typography, shadows), FlagshipScreen, PlayerScreenBackground.
- Три ключевых экрана доведены до flagship: **PlayerProfileScreen**, **passport**, **schedule** — чёткие состояния (loading / not_found / api error / ready), retry, haptic, скелетоны, безопасная асинхронность.
- Tab bar (FloatingGlassTabBar), навигация, большинство экранов на FlagshipScreen, переиспользуемые карточки (SectionCard, ActionLinkCard, SkeletonBlock).

**Главный bottleneck:** Неравномерность качества между экранами: **Лента (Feed)** и ещё 2–3 экрана используют старый паттерн (Screen вместо FlagshipScreen, спиннер вместо скелетона, другой визуал). Нет единого стандарта error/empty (иконка в круге, title/sub, retry). Мелкие технические долги (дубли в JSX, отсутствие try/catch в subscription loadPlans).

---

## B. What is already polished

| Зона / экран | Почему считается сильным |
|--------------|---------------------------|
| **PlayerProfileScreen** (`app/player/[id]/index.tsx`) | Разделение состояний (loading / not_found / network / ready), retry + haptic, mountedRef в loadProfile и openChat, отдельный videoLoading и скелетон секции видео, error-экран с header и icon wrap, скелетон профиля, theme tokens. |
| **Паспорт игрока** (`app/player/[id]/passport.tsx`) | FlagshipScreen + PassportBackground, PassportSkeleton, not_found vs network, retry, haptic в header, SectionCard/PassportInfoCard. |
| **План / Расписание** (`app/(tabs)/schedule.tsx`) | FlagshipScreen, ScheduleSkeleton, error с retry, пустое состояние с hero + emptyCard, section cards, useFocusEffect, theme. |
| **Подписка** (index, membership, success) | FlagshipScreen, PlansSkeleton, SectionCard, ActionLinkCard, theme tokens (в т.ч. PlanCard, PricingToggle). |
| **Marketplace Packages** | FlagshipScreen, скелетон, empty state с иконкой, screenReveal. |
| **Feed Detail, Announcement Detail** | FlagshipScreen, кастомный header, скелетоны, empty/error с retry. |
| **Профиль (tabs), Чат (tabs), Маркетплейс (tabs), Уведомления, Бронирования** | FlagshipScreen, скелетоны, error с title/sub и retry, hero-блоки, SectionCard. |
| **Команда — лента** (`team/feed.tsx`) | FlagshipScreen, FeedSkeleton, error state, кастомный header. |
| **Дизайн-система** | theme.ts: colors, spacing, radius, radii, typography, shadows, buttonStyles, glassCard; FlagshipScreen с contentTopPadding по header; SkeletonBlock, SectionCard, ActionLinkCard, triggerHaptic. |

---

## C. Main gaps

1. **Лента (tabs) — другой layout и loading**  
   Используется `Screen` вместо `FlagshipScreen` → нет PlayerScreenBackground, другой safe area и ритм. При загрузке — только `ActivityIndicator` + текст, без скелетона. Error/empty по смыслу есть (retry, EmptyState), но визуал не в одном стиле с остальными экранами.

2. **Нет единого error/empty компонента**  
   На PlayerProfileScreen — errorIconWrap, errorTitle, errorSub, retry. На schedule/marketplace/profile — похожий набор, но свои стили. На passport — один errorText без разбивки title/sub и без иконки в круге. Имеет смысл вынести один переиспользуемый блок (например `ErrorStateView` / `EmptyStateView`) с опцией retry и haptic.

3. **Subscription: loadPlans без try/catch**  
   При падении `getSubscriptionPlans()` `setLoading(false)` не вызывается (нет `finally`/catch), экран может остаться в вечной загрузке. Нет отдельного error state для подписки.

4. **Экраны на старом Screen**  
   `app/(tabs)/feed.tsx` — Screen; `app/team/chat.tsx`, `app/team/create-post.tsx`, `app/team/members.tsx` — Screen + AppHeader. Нет флагманского фона и единого отступа сверху.

5. **Player Hub (tabs) — дубли в JSX**  
   В `app/(tabs)/player/index.tsx` внутри `ScrollView` продублированы `showsVerticalScrollIndicator` и `refreshControl` как дочерние узлы (строки ~298–306). Это мусор в разметке и потенциально путаница при рендере.

6. **Passport error state слабее профиля**  
   Нет errorIconWrap, errorTitle/errorSub — один блок с иконкой и errorText. Для единообразия можно подтянуть под тот же паттерн, что и на PlayerProfileScreen (без смены логики).

7. **Мелкие несогласованности**  
   Часть экранов использует `radius.sm`/`radius.lg`, часть — захардкоженные 14/20. В нескольких местах ещё встречаются `rgba(255,255,255,0.08)` вместо `colors.surfaceLevel1Border`. Не критично, но для полной консистентности можно постепенно заменить.

8. **Login**  
   Отдельный визуальный контекст (SafeAreaView, без FlagshipScreen) — осознанно, но стили (кнопки, инпуты) можно ещё раз проверить на соответствие buttonStyles/theme.

---

## D. Screen priority ranking

| № | Экран / раздел | Зачем | Impact (product / wow / retention) | Сложность |
|---|----------------|--------|-----------------------------------|-----------|
| 1 | **Лента (tabs)** `app/(tabs)/feed.tsx` | High-traffic, сейчас выпадает по layout и loading. Привести к FlagshipScreen + скелетон + единый error/empty. | Высокий (первое впечатление от контента) | Низкая |
| 2 | **Subscription loadPlans** | Исправить try/catch + error state, чтобы при падении API не зависать. | Стабильность, доверие | Низкая |
| 3 | **Team Chat / Create Post / Members** | Перевести на FlagshipScreen (и при необходимости общий header-паттерн) для единого ощущения раздела «Команда». | Согласованность, средний трафик | Низкая–средняя |
| 4 | **Общий Error/Empty блок** | Вынести один компонент (иконка в круге, title, sub, retry, haptic) и постепенно использовать на schedule, marketplace, profile, passport. | Единообразие, меньше дублей | Средняя |
| 5 | **Home (tabs)** | Уже FlagshipScreen + скелетон + error. Проверить safe async (mountedRef при loadData) и визуал error (icon wrap, title/sub) при желании подтянуть под общий стандарт. | Средний | Низкая |
| 6 | **Passport error block** | Привести к тому же виду, что на PlayerProfileScreen (icon wrap, errorTitle, errorSub), без смены логики. | Полировка | Низкая |
| 7 | **Video Analysis (list/detail)** | Уже FlagshipScreen, скелетоны, mounted. Проверить empty/error копии и консистентность с другими экранами. | Средний | Низкая |
| 8 | **Coach flow (coach/[id], booking, checkout)** | Уже FlagshipScreen. При необходимости — единый error/empty и скелетоны там, где ещё спиннер. | Средний | Низкая–средняя |

---

## E. Design system maturity

**Уже сформировано:**
- **Colors, spacing, radius, typography, shadows** — в theme.ts, активно используются на flagship-экранах.
- **FlagshipScreen** — фон (PlayerScreenBackground по умолчанию), safe area, опциональный header, scroll/flex, contentTopPadding.
- **Карточки:** SectionCard, ActionLinkCard, PlanCard, PackageCard, PressableCard; glassCard / cardStyles в theme.
- **Кнопки:** buttonStyles.primary/secondary/ghost/danger; PRESSED_OPACITY, triggerHaptic на CTAs.
- **Загрузка:** SkeletonBlock, локальные *Skeleton (ProfileSkeleton, ScheduleSkeleton, HubSkeleton и т.д.).
- **Hero-паттерн:** heroSection, heroIconWrap, heroTitle, heroSub на schedule, profile, chat, player hub.

**Стоит стандартизировать:**
- **Error state:** один компонент (иконка в круге, title, sub, retry, optional onRetry + haptic).
- **Empty state:** один компонент с иконкой в круге, title, sub, опциональная кнопка (уже есть EmptyState в ui, но не везде используется и стили можно свести к theme).
- **Header экрана с back:** повторяется на многих экранах (customHeader, backBtn, headerTitle, headerBtn) — можно вынести в `ScreenHeader` с опцией правой кнопки (share, add и т.д.) для уменьшения дублирования.

---

## F. Technical cleanup opportunities

- **Минимально-инвазивные:**
  1. **Player Hub:** удалить дублирующие дочерние узлы внутри ScrollView (`showsVerticalScrollIndicator`, `refreshControl` продублированы как дети).
  2. **Subscription:** обернуть `loadPlans` в try/catch, в catch вызывать `setLoading(false)` и выставлять error state; показать error UI с retry.
  3. **Home loadData:** при желании добавить mountedRef и не вызывать setState после unmount (по аналогии с loadProfile в PlayerProfileScreen).
  4. **Passport loadProfile:** добавить mountedRef в loadProfile для безопасности при быстром уходе с экрана (опционально, т.к. экран уже стабилен).

- **Без большого rewrite:** не трогать архитектуру навигации, не переписывать сервисы и API-контракты. Рефактор только там, где явно дублируется разметка или есть баг (вечная загрузка, мусор в JSX).

---

## G. Recommended next roadmap

**Сейчас:**
1. Исправить баг в **Player Hub** — убрать дублирующие строки в ScrollView.
2. Исправить **Subscription** — try/catch в loadPlans + error state + retry.
3. Провести **premium pass по Ленте (tabs):** перевести на FlagshipScreen, заменить спиннер на скелетон ленты, привести error/empty к общему стилю (и при возможности к будущему общему компоненту).

**После:**
4. Ввести общий **ErrorStateView** (и при необходимости **EmptyStateView**) и заменить повторяющиеся блоки на schedule, marketplace, profile, passport.
5. Перевести **team/chat**, **team/create-post**, **team/members** на FlagshipScreen.
6. Подтянуть **passport** error block к виду PlayerProfileScreen (icon wrap, title/sub).

**Потом (по приоритету):**
7. Home: при желании mountedRef в loadData; error-блок — под общий ErrorStateView.
8. Video Analysis, Coach flow — проверить empty/error и скелетоны, подключить общие компоненты где уместно.

**Куда не лезть пока:**
- Не переписывать глобальную навигацию и структуру роутов.
- Не менять API и бизнес-логику подписки, чата, маркетплейса.
- Не трогать уже отполированные экраны (PlayerProfileScreen, schedule) без явной причины — только точечные правки (например, замена своего error-блока на общий).

---

## H. Verified premium screens (short)

**passport.tsx**  
- **Уровень:** flagship. FlagshipScreen, PassportBackground, skeleton, not_found/network, retry, haptic.  
- **Сильные стороны:** структура, карточки, share sheet.  
- **Мелкий gap:** error-блок без иконки в круге и без разбивки title/sub — можно подтянуть позже через общий компонент.  
- **Возвращаться сейчас:** не обязательно.

**schedule.tsx**  
- **Уровень:** flagship. FlagshipScreen, skeleton, error с retry, empty с hero + emptyCard.  
- **Сильные стороны:** hero, section cards, useFocusEffect.  
- **Мелкий gap:** при желании error оформить через общий ErrorStateView.  
- **Возвращаться сейчас:** не обязательно.

**PlayerProfileScreen (app/player/[id]/index.tsx)**  
- **Уровень:** flagship. Состояния разделены, safe async, video loading отдельно, скелетоны, error с header и icon wrap.  
- **Сильные стороны:** эталон состояний и error/empty.  
- **Мелкий gap:** нет.  
- **Возвращаться сейчас:** не нужно.

---

## I. Final block

### TOP 3 next screens to polish
1. **Лента (tabs)** — `app/(tabs)/feed.tsx`: FlagshipScreen, скелетон, единый error/empty.
2. **Subscription** — исправление loadPlans (try/catch + error state + retry).
3. **Team Chat / Create Post / Members** — переход на FlagshipScreen для согласованности раздела «Команда».

### TOP 3 systemic UI issues to fix
1. **Единый error/empty компонент** — иконка в круге, title, sub, retry, haptic; постепенное внедрение на всех экранах с ошибками/пустыми состояниями.
2. **Оставшиеся экраны на Screen** — Feed (tabs), team/chat, team/create-post, team/members перевести на FlagshipScreen.
3. **Loading на ключевых экранах** — везде, где ещё только ActivityIndicator, ввести скелетон (в первую очередь Лента).

### TOP 3 things we should NOT touch right now
1. **Архитектура навигации и табов** — FloatingGlassTabBar и структура (tabs) работают, менять не нужно.
2. **Уже отполированные экраны (PlayerProfileScreen, schedule, passport)** — не переделывать; только точечная замена своего error-блока на общий, когда он появится.
3. **API и бизнес-логика** — контракты сервисов, подписка, чат, маркетплейс не менять ради «красоты» кода.

---

*Аудит выполнен по состоянию кода на март 2025. При изменении приоритетов продукта рекомендации можно пересматривать точечно.*
