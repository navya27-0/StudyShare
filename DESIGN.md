# Design System Specification — StudyShare

## 1. Visual Direction & Domain Aesthetic
- **Domain**: University Academic Resource & Revision Platform
- **Aesthetic Persona**: **DAQ Consulting Monochrome Architectural System**
- **Core Philosophy**: High-contrast editorial clarity paired with precision `1px` architectural hairlines, instant scannability under exam pressure, and zero decorative clutter. Every card, badge, and control is designed to help students answer four questions within five seconds:
  1. *What is this platform?*
  2. *How do I find study material for my course?*
  3. *Which notes or past papers can I trust?*
  4. *How do I preview, save, or upload material?*

---

## 2. Color Palette & Atmospheric Polarity (`src/styles/tokens.css`)

StudyShare supports **Adaptive Dual Theme Polarity** (`[data-theme="dark"]` default and `[data-theme="light"]` paper mode), persisted in `localStorage` (`studyshare-theme`).

### Dark Mode ("The Neural Core" — Default)
| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg-canvas` | `#000000` | Primary pitch-black viewport canvas with subtle `40px` blueprint grid |
| `--bg-surface` | `#080808` | Resource cards, modals, filter bar, and navigation rail |
| `--bg-subdued` | `#0F0F0F` | Secondary wells, hover states, and recessed panels |
| `--bg-muted` | `#171717` | Badges, keyboard shortcut pills, and active toggles |
| `--text-primary` | `#FFFFFF` | Primary headings, titles, and active controls |
| `--text-secondary` | `rgba(255, 255, 255, 0.90)` | Course names, descriptions, and body copy |
| `--text-muted` | `rgba(255, 255, 255, 0.74)` | Metadata timestamps, byte sizes, and secondary labels (WCAG AA compliant) |
| `--accent-core` | `#FFFFFF` | Primary pill CTA fill and focus ring highlight |
| `--accent-contrast` | `#000000` | Foreground text inside primary CTA buttons |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Hairline structural borders |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | Interactive hover borders and active dividers |

### Light Mode ("Architectural Paper" — `[data-theme="light"]`)
| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` | Crisp daylight paper canvas |
| `--bg-surface` | `#FFFFFF` | Pure white card and modal surface |
| `--bg-subdued` | `#F1F5F9` | Subtle slate-tinted secondary surface |
| `--bg-muted` | `#E2E8F0` | Muted tag and chip background |
| `--text-primary` | `#09090B` | Deep carbon ink for primary titles |
| `--text-secondary` | `#1E293B` | High-contrast slate for body copy |
| `--text-muted` | `#3F3F46` | Accessible muted zinc for metadata |
| `--accent-core` | `#09090B` | Primary button fill in light mode |
| `--accent-contrast` | `#FFFFFF` | Foreground text on primary buttons |

### Semantic Status & Trust Signals
| Signal | Dark Mode | Light Mode | Usage |
| :--- | :--- | :--- | :--- |
| **Verified (`--status-verified`)** | `#10B981` | `#059669` | Faculty/syllabus verified badge, downloaded indicator, positive net votes |
| **Exam / Gold (`--status-exam`)** | `#F59E0B` | `#D97706` | Star ratings, Exam Prep mode, Top Ranked #1 badge, duplicate warnings |
| **Lab / Info (`--status-lab`)** | `#06B6D4` | `#0891B2` | Lab record badges and informational callouts |
| **Danger (`--status-danger`)** | `#F43F5E` | `#E11D48` | Destructive moderation actions, validation errors, and ban states |

---

## 3. Typography & Scannable Hierarchy

| Token | Font Stack | Role |
| :--- | :--- | :--- |
| `--font-display` | `'Syne', 'Space Grotesk', sans-serif` | Architectural section headers and display titles |
| `--font-serif` | `'Instrument Serif', 'Newsreader', Georgia, serif` | Editorial italic accents (`.academic-serif-italic`) |
| `--font-body` | `'Plus Jakarta Sans', -apple-system, sans-serif` | Primary UI copy, resource titles, descriptions, and form controls |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | Course codes (`CS201`), version tags (`v2`), byte sizes, and tabular metrics (`.tabular-nums`) |

---

## 4. Motion & Interaction Timing (`src/styles/motion.css`)

All transitions use GPU-accelerated `transform` and `opacity` properties with `--ease-standard: cubic-bezier(0.16, 1, 0.3, 1)`:
- **Primary Button & Card Hover (`160ms–200ms`)**: Subtle `-1.5px` to `-2.5px` lift with border brightening.
- **Route & View Transitions (`140ms–240ms`)**:
  - `.page-trans-drill-in`: `220ms cubic-bezier(0.16, 1, 0.3, 1)` when opening a resource detail view.
  - `.page-trans-drill-back`: `140ms cubic-bezier(0.2, 0, 0, 1)` when returning to the catalog.
  - `.page-trans-crossfade`: `160ms` when switching top-level tabs.
- **Micro-Interactions (`160ms–180ms`)**: Tactile spring feedback on `.vote-pop-up`, `.vote-pop-down`, `.bookmark-pop`, and `.star-pop`.
- **Sidebar Collapse (`190ms–230ms`)**: Smooth width interpolation between `248px` expanded and `68px` icon rail.

---

## 5. Modular Stylesheet Architecture (`src/styles/`)

Instead of a monolithic stylesheet, styles are partitioned by responsibility and imported via `src/index.css`:
- [`src/styles/tokens.css`](frontend/src/styles/tokens.css): Dark and Light theme CSS custom properties, typography stacks, radii, and easing curves.
- [`src/styles/reset.css`](frontend/src/styles/reset.css): Element resets, blueprint background grid, form controls, and custom scrollbars.
- [`src/styles/motion.css`](frontend/src/styles/motion.css): Keyframes, route transitions, micro-interaction pops, and upload progress shimmer.
- [`src/styles/layout.css`](frontend/src/styles/layout.css): Collapsible sidebar rail rules and typographic helper classes.
- [`src/styles/components.css`](frontend/src/styles/components.css): Reusable `.daq-btn-primary`, `.daq-btn-secondary`, `.daq-card`, `.daq-tag`, `.daq-crosshair`, `.ledger-resource-card`, `.verified-seal`, and `.rank-badge` components.
- [`src/styles/accessibility.css`](frontend/src/styles/accessibility.css): `:focus-visible` outlines, `.sr-only`, `.skip-to-main`, and Comfortable Reading Mode (`[data-reading-mode="comfortable"]`).
- [`src/styles/responsive.css`](frontend/src/styles/responsive.css): `44×44px` `.touch-target` sizing, mobile bottom-nav safe-area padding, Low-Bandwidth Lite Mode (`[data-low-bandwidth="true"]`), and `@media (prefers-reduced-motion: reduce)`.
