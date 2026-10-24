---
version: 1
slug: "apps-web-src-match-shop-tsx"
primary_target: "apps/web/src/match/Shop.tsx"
related_targets: ["apps/web/src/match/LocalGame.tsx"]
---

# Shop and economy HUD — F0-P6B.5-B

Scope: Shop.tsx, economic controls and classification trim in LocalGame. Operate; desktop PC game, keyboard and mouse. Preserve arena geometry, nine-slot bench, five authoritative offers and all economy/clock rules.

## Histórico F0-P5.3 — direction contract

THESIS: Five recruitment portraits embedded in one game dock, replacing dashboard-style cards and web-admin controls. The user explicitly specifies the PC TFT functional hierarchy.

OWN-WORLD: Jade-black plates, ivory lettering, brass currency, three cost metals. Authored stepped SVG corners and engraved icon family, no copied Riot assets. Keep existing fonts and actual DOLEA/prototype art.

STORY: Read provisional synergies above the portrait, compare the five characters, see name/price in the bottom rail, then recruit or manage XP, refresh and lock. Lock preserves next-round offers; it must not disable purchases.

FIRST VIEWPORT: Arena dominates. Bench immediately above five equal portrait cards; gold and XP to the left, refresh and lock to the right. Portrait occupies most of each card; upper two-row trait stack and a separate lower name/cost plate. A brief receipt marks a successful purchase.

FORM: User-pinned PC tactical game HUD; local component redesign in the established jade/amber world, code-led, no concept tournament or seed required.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Histórico P6A — traits and unified ability extension

This local extension inherits the established HUD and preserves the arena, nine-slot bench and five-offer dock geometry. It introduces no replacement visual world or global token scale. DESIGN.md and `.impeccable/design.json` retain the incumbent system; the following rules describe this surface's added content and local overrides.

- **Formation traits:** place the compact trait list beneath participants in the existing left rail. Each row pairs its icon and name with a text state, level when active, and a tabular count toward the next threshold. Jade and amber active treatments supplement those labels; inactive icons remain visible. Show only represented traits; the empty state explains deployment. Below 1100px, rows become a horizontal strip rather than taking a new canvas column.
- **Trait detail:** hover, keyboard focus and click expose the same contextual tooltip with description, thresholds, reached-state text, distinct deployed contributors and the provisional-balance note. Escape dismisses it. Keep the tooltip above the HUD, bounded by the viewport with its own scroll; it must not resize the arena. Activation uses a brief 220ms brightness cue and tooltip opacity uses 120ms; reduced motion removes both animations and transitions.
- **Shared content icons:** trait and ability IDs resolve through `ContentIcon` to original 32-unit SVG assets under `public/assets/icons`, with a neutral fallback for missing IDs or failed loads. Preserve crisp edges and containment. Icons are decorative beside readable labels: 14px in offers, 25px in trait rows, 20px in inspector trait labels and 36px in the ability heading. Keep the existing economic `GameIcon` family for currency and actions. Offer traits remain opaque and noninteractive; show «Sinergias provisionales» only when no listed affinity has a configured trait definition.
- **One primary ability:** lead the contextual inspector with one icon, name and explicit Activa/Pasiva/Mixta type. Display mana cost only for an active component; otherwise state «Sin maná». A mixed ability keeps separately labeled passive and active descriptions beneath that shared heading. Vitals and effective combat statistics follow, then trait labels and unit actions. Temporary modifiers and a positive shield receive text explanations; never imply that the displayed statistics exclude applied modifiers.
- **Inspector override:** retain the overlay, internal scrolling, explicit close and Escape behavior. P6A uses a 320px width, a 44 × 56px portrait and a 22px unit name to give the ability priority. At desktop heights up to 800px, top inset and padding compact to 8px and 12px. At widths up to 650px, width is `min(320px, calc(100% - 24px))` and top is 145px. These are local overrides, not changes to arena or shop dimensions. Load `traits.css` after `recruitment.css` so they remain effective.

Documentation evidence: source comparison of `TraitRail.tsx`, `ContentIcon.tsx`, `traits.css`, `UnitInspector.tsx`, `Shop.tsx`, `LocalGame.tsx` and the four original SVG icons. This records implemented presentation and inheritance; visual review and functional QA remain separate evidence owned by the P6A build.

## Histórico P6B.4 direction contract (supersedes top traits)
THESIS: A continuous PC tactical scene with readable combat progression and a compact metal recruitment instrument.
OWN-WORLD: Mar de Cristal charcoal, deep jade, aged brass, original stepped glyphs and inset metal rails. Existing character originals remain untouched.
STORY: See the arena and larger fighters; read authoritative progress on selection; recruit from portraits with traits directly above their names.
FIRST VIEWPORT: Arena remains dominant, contextual inspector closed, five portraits, bottom left trait stack and name, bottom right gold, compact economy controls.
FORM: Explicitly pinned PC HUD; code-led refinement of existing geometry, no new illustration or layout tournament.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


## Current authority — F0-P6B.5-B Festival Pop C × Neon Playground

This implemented, explicitly approved contract supersedes all visual-world, typography, dimensions and icon-rendering rules in the historical sections above. Their mechanical constraints remain. The user selection supersedes the old exploratory report's undecided status and Royal Pop recommendation. Source: `design-exploration/f0-p6b5a2/neon-playground/{screen-1920,inspector-1920,components-1920}.png` and `tokens.json`; build contract: `artifacts/p6b5b/CONTRACT.md`. Root DESIGN.md and `.impeccable/design.json` carry the current system.

THESIS: A colorful PC autobattler scene around the continuous Mar de Cristal arena, with five dominant recruitment portraits and readable authoritative combat information.

OWN-WORLD: Festival Pop C angular SVG frames, layered blue outlines, clipped lavender/white card diagonals, diamond medallions, midnight field and subtle plum lower wash. Exact Neon semantic palette: lime actions, magenta economic accent, gold currency/stars; local Bungee served as FestivalPop with DM Sans data. Reuse approved authored paths, original DOLEA/VARGAS and provisional fallbacks. Content glyphs retain original stable IDs and CONTENT_ICONS association/fallback semantics. No Royal Pop or new direction.

STORY: Read the continuous arena and legal fighters; inspect real statistics, ability/passive and combat progression on selection; compare five portraits through the lower-left traits, lower-left name and lower-right price; recruit or manage XP, refresh and lock. Lock preserves next-round offers and permits purchasing. No invented reference-state counters.

FIRST VIEWPORT: At 1920 × 1080: phase (586,18,650,87); settings (1830,18,65,61); nine-slot bench (354,696,1164,104); economy (23,805,246,231); five-offer group (283,805,1375,231); right controls (1672,805,225,231). Contextual inspector is hidden without selection and opens at (1530,141,360,654). Portrait/name/cost hierarchy and lower-left trait stack are fixed. Original offer frame is 258 × 231; control 230 × 70; compact settings has proportion-correct 65 × 61 geometry. Keep controls, five offers and bench visible without document scroll at the five requested desktop sizes; inspector and traits may scroll internally.

FORM: Explicit user-approved full world implementation, not an exploration round. Reuse original vector materials, local licensed type and real React/Phaser components. `neonTokens.css` holds the 64 exact semantic colors; `neonHud.css` is the final cascade for composition/type/states. The darker urgent-clock ink and prototype lower wash are documented additions; do not invent other palette values.

PRESERVATION: Keep 56 calibrated hexagons, projection/camera, legal centers, true DOLEA/VARGAS scale 1.4, anchors and hit bounds. Camera reserve keeps the lowest legal cells above the bench; actual illustration crop (about 312,8,1395,785 at 1920) differs from static (280,66,1460,822) for that reason. Do not change camera to copy the static crop. Runtime purchases use one star and phase controls follow real automatic-round state; advanced counters appear only when the combat snapshot supplies them. Inspector retains true AD/AP/crit and ability detail with internal scrolling, icon-led full-width stacked HP/mana, and a close control outside the scroll region. Preserve Escape, focus, reduced motion, no audio, DEV gating, separate storage and public rejection of DEV saves. The fixed 18.4 comparison fixture is DEV-only; normal clock is unchanged.

FINISH: Root system and product authority updated after implementation; captures and validation remain in `artifacts/p6b5b`. No new test count or final review verdict is asserted by this brief. Stop before F0-P7A; no remote/push.
