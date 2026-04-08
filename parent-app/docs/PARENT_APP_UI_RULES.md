# Parent App UI Rules (Implementation Guide)

Purpose: keep future `parent-app` work aligned with the current flagship visual and motion language.

## 1) Canonical Surface Primitives

Use these as the default building blocks:

- `FlagshipScreen` — primary page shell and safe-area behavior.
- `GlassCardV2` / `GlassSurface` — main elevated content containers.
- `SectionCard` — grouped section content with consistent heading and body spacing.
- `PrimaryButton`, `SecondaryButton`, `GhostButton` — canonical action hierarchy.
- `ErrorStateView`, `EmptyStateView`, `SkeletonBlock` — standard loading/empty/error states.
- `ScreenHeader` (or screen-specific header wrappers) — standard top navigation/header pattern.

Rule: prefer existing primitives over ad hoc `View` + custom styles.

## 2) Typography Hierarchy

Keep text roles predictable and reusable:

- Hero/screen title: strongest heading style (`textOnGlass.heading` + bold weight).
- Section title: one level below hero; never compete with hero.
- Card title: concise, high contrast, but lower than section title.
- Body/description: `textOnGlass.secondary` for readable long text.
- Meta/caption/helper: `textOnGlass.meta` for timestamps, labels, supporting copy.

Rule: do not invent per-screen typography scales if an existing role fits.

## 3) Spacing Rhythm

Base spacing tokens come from `constants/theme` (`spacing.*`).

- Use tokenized paddings/margins only (`spacing.md`, `spacing.lg`, `spacing.sectionGap`, etc.).
- Preserve vertical rhythm: hero block -> primary block -> secondary blocks.
- Keep consistent card internals via primitive props (`padding="lg"`, `padding="md"`).
- Avoid arbitrary numeric spacing unless there is no token equivalent.

Rule: when in doubt, align to neighboring flagship screens instead of creating new spacing patterns.

## 4) Emphasis Rules (Glow / Highlight)

Emphasis is intentionally sparse:

- Allowed:
  - Top hero/summary card per screen.
  - Key upsell/premium card.
  - Single highest-priority CTA cluster if needed.
- Avoid:
  - Multiple glowing cards in one viewport.
  - Competing highlighted cards in the same section stack.
  - Decorative glow on secondary/supporting rows.

Rule: one focal emphasis at a time; everything else should support it.

## 5) Motion Vocabulary (Required)

Import from `@/lib/animations` and compose with these helpers only:

- `screenReveal(0)` — hero/header anchor.
- `ENTRY.*` — named timing tiers (`hero`, `primary`, `secondary`, ...).
- `entryAfterHero(step)` — ordered section cascade after hero/header.
- `listItemReveal(index, baseDelay?)` — cohesive row/list flow.
- `cardInnerReveal(step)` — micro-stagger inside a single card only.

Recommended order:

1. Hero/header (`screenReveal(0)`).
2. Primary summary (`entryAfterHero(1)` or `ENTRY.primary`).
3. Secondary sections (`entryAfterHero(2+)`).
4. List rows (`listItemReveal(index, ENTRY.primary|secondary|...)`).

Rule: keep timing legible; avoid many blocks entering simultaneously.

## 6) Forbidden Legacy Patterns

Do not introduce new usages of:

- `screenReveal(STAGGER * n)` in screen files.
- Fractional multipliers (`STAGGER * 0.5`, `* 1.25`, `* 2.5`, etc.).
- One-off formulas like `STAGGER + index * 40` / custom index math for lists.
- New local stagger constants that duplicate `ENTRY`, `entryAfterHero`, `listItemReveal`.
- Mixed timing systems in a single screen (e.g. helper-based sections + ad hoc row delays).

If a screen has conditional sections, use step offsets (`const offset = condition ? 1 : 0`) while staying on `entryAfterHero(...)`.

## 7) Cursor-Oriented Implementation Checklist

When editing or creating a parent-app screen:

1. Start from existing flagship primitives (`FlagshipScreen`, `SectionCard`, `GlassCardV2`).
2. Set entry order first (hero -> primary -> secondary).
3. Apply list cohesion with `listItemReveal`.
4. Limit emphasis (glow/highlight) to one focal area.
5. Run a quick grep before finishing:
   - Disallow `screenReveal(STAGGER`
   - Disallow fractional stagger multipliers
   - Disallow custom `+ index *` delay math when `listItemReveal` applies

This guide is intentionally short: prefer consistency over novelty.
