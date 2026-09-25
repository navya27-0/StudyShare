# StudyShare — Design System & Visual Specification

**Version:** 1.0.0  
**Status:** Canonical Design Direction  
**Product Class:** High-density Academic Resource Ledger & Internal Tool  
**Target Users:** College students navigating syllabi, past exams, lab manuals, and notes between classes under fluctuating connectivity.

---

## 1. Design Philosophy & Character

StudyShare is built like an engineering ledger or research index — not a bubbly ed-tech app or generic SaaS startup.

1. **Academic Utility over Decorative Fluff**: High information density, clear visual hierarchy, and instant scannability. A student opening this 5 minutes before an exam in a basement lab needs to find *Unit 3: Normalization Question Bank (PDF)* in two taps without fighting floating modal prompts or scroll animations.
2. **Tactile Paper Aesthetics**: Grounded in warm archival tones (`#FBF9F5` base paper, deep charcoal ink `#1E1B18`, burnt terracotta accent `#C85A32`), replacing the ubiquitous cold blue/purple gradient aesthetic with an intentional editorial warmth.
3. **Mechanical Snappiness**: Transitions mimic physical card catalogues and precision tools (Linear, Notion, GitHub). Motion is functional, deterministic, and executes in ≤ 120ms.

---

## 2. Color Palette & Token System

The palette relies on warm paper neutrals, carbon ink, and a single dominant terracotta accent, supplemented by disciplined functional accents.

### 2.1 Core Neutral Tokens (Light Mode)

| Token Name | Hex | CSS Variable | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Paper Canvas** | `#FBF9F5` | `--bg-canvas` | Main viewport canvas, body background. |
| **Paper Raised** | `#FFFFFF` | `--bg-surface` | Primary card surfaces, modals, popovers. |
| **Paper Subdued** | `#F3EFEA` | `--bg-subdued` | Sidebar rail, filter toolbars, table headers. |
| **Paper Muted** | `#EAE4DC` | `--bg-muted` | Active pill selections, hover fills, code blocks. |
| **Border Subtle** | `#E5DFD5` | `--border-subtle` | Default card borders, divider lines, grid rules. |
| **Border Strong** | `#C8BFB2` | `--border-strong` | Active input outlines, card hover borders. |
| **Ink Primary** | `#1E1B18` | `--text-primary` | Headings, document titles, active tab labels. |
| **Ink Secondary** | `#5C554E` | `--text-secondary` | Subject codes, authors, page counts, descriptions. |
| **Ink Tertiary** | `#8C827A` | `--text-muted` | Timestamps, download tallies, subtle breadcrumbs. |

### 2.2 Accent Tokens

| Token Name | Hex | CSS Variable | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Terracotta Core** | `#C85A32` | `--accent-core` | Primary actions, upvoted state, active filter indicator. |
| **Terracotta Hover**| `#A84723` | `--accent-hover` | Button active/hover state. |
| **Terracotta Tint** | `#FDF1EB` | `--accent-tint` | Upvoted card pill background, highlighted item wash. |
| **Terracotta Border**| `#E8A287`| `--accent-border`| Subtle emphasis border for selected items. |

### 2.3 Functional Status Tokens

| Role | Tone | Hex | Wash Background | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Verified / Solution** | Laurel Green | `#2A6A4E` | `#EAF4EE` | Verified syllabus, professor-approved, answer keys. |
| **Exam / Question Bank**| Ochre Gold | `#B87318` | `#FDF6E8` | Previous Year Questions (PYQs), formula sheets. |
| **Lab Manual / Code**   | Slate Teal | `#286474` | `#E9F3F6` | Lab records, code repositories, raw data. |
| **Reported / Flagged**  | Crimson Ink | `#BD2B2B` | `#FCEBEB` | Outdated syllabus, corrupt file, copyright flag. |

### 2.4 Dark Mode ("Late Night Library / Carbon Stone")

Dark mode is an intentional charcoal ledger, not an inverted grayish haze:

| Token Name | Dark Hex | CSS Variable |
| :--- | :--- | :--- |
| **Dark Canvas** | `#121110` | `--bg-canvas` |
| **Dark Surface** | `#1B1917` | `--bg-surface` |
| **Dark Subdued** | `#24211E` | `--bg-subdued` |
| **Dark Border Subtle** | `#2F2B26` | `--border-subtle` |
| **Dark Border Strong** | `#453F38` | `--border-strong` |
| **Dark Text Primary** | `#F2EFE9` | `--text-primary` |
| **Dark Text Secondary** | `#A8A196` | `--text-secondary` |
| **Dark Text Muted** | `#70685E` | `--text-muted` |
| **Dark Accent Core** | `#E06D44` | `--accent-core` |
| **Dark Accent Tint** | `#2B1D16` | `--accent-tint` |

---

## 3. Typography Hierarchy

### 3.1 Typeface Selection & Justification

- **Display & Technical Data Face**: `Space Grotesk` (Weights: 500, 600, 700)
- **Workhorse Body & UI Face**: `Plus Jakarta Sans` (Weights: 400, 500, 600, 700)

> **Pairing Rationale:** *Space Grotesk gives course codes (`CS204`), unit indexes, and technical headings a crisp architectural rhythm, while Plus Jakarta Sans delivers neutral, open-aperture clarity for dense resource lists, file metadata, and student comments on low-resolution mobile displays.*

### 3.2 Type Scale

| Scale | Size | Line Height | Weight | Font Family | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-1` | 32px (2rem) | 1.15 | 700 | Space Grotesk | Major Subject Page Heading (`CS302: Data Structures`) |
| `h1` | 24px (1.5rem) | 1.25 | 600 | Space Grotesk | Unit headers, Section titles (`Unit 3: B-Trees`) |
| `h2` | 18px (1.125rem) | 1.3 | 600 | Space Grotesk | Card headers, modal titles, drawer headings |
| `body-base` | 15px (0.9375rem) | 1.5 | 400 | Plus Jakarta Sans | Resource descriptions, comments, general body text |
| `body-medium`| 14px (0.875rem) | 1.45 | 500 | Plus Jakarta Sans | Dense list items, card details, metadata snippets |
| `caption` | 12px (0.75rem) | 1.4 | 600 | Plus Jakarta Sans | Tags, badges, file types (`PDF`, `DOCX`), dates |
| `code-mono` | 12px (0.75rem) | 1.35 | 500 | JetBrains Mono / Space Grotesk | Course codes (`EC401`), file sizes (`4.2 MB`), semester pills |

---

## 4. Spacing Scale & Grid Architecture

We strictly use an 8-point base grid with 4-point micro steps.

### 4.1 Spacing Scale

- `space-1` = `4px` (Micro gaps, icon-to-label spacing)
- `space-2` = `8px` (Badge padding, tag spacing, inline button gap)
- `space-3` = `12px` (Dense card internal spacing, compact inputs)
- `space-4` = `16px` (Standard card padding, form group gap)
- `space-5` = `20px` (Expanded card margins, modular dividers)
- `space-6` = `24px` (Section headers, sidebar padding)
- `space-8` = `32px` (Major container separation)
- `space-12` = `48px` (Page boundary margins)

### 4.2 Layout Rhythm & Asymmetry

- **Desktop (>= 1024px)**:
  - Left Sidebar Rail (260px fixed width): Sticky Subject & Unit tree navigation.
  - Center Content Stream (fluid min 640px, max 880px): Dense list of resources with quick filtering.
  - Right Utility / Inspect Panel (280px or contextual drawer): Quick preview, file metadata, contributor info.
- **Tablet (768px - 1023px)**:
  - Collapsible subject rail + 1-column responsive card stream.
- **Mobile (< 768px)**:
  - Single column with sticky horizontal pill rail for Units (`Unit 1`, `Unit 2`, `PYQs`, `Lab`). Fast thumb accessibility.

---

## 5. Component States: Resource Card Specification

Resource cards must communicate status at a glance without requiring students to decipher microcopy.

### 5.1 Card Anatomy
1. **Left Status Spine**: A 3px vertical color border indicating active user engagement or verification state.
2. **Header Bar**: Type badge (`PDF`, `Notes`, `Exam Bank`) + Course/Unit tag (`CS201 • Unit 03`) + Bookmark button.
3. **Core Title**: 16px Space Grotesk Semi-bold.
4. **Metadata Row**: Contributor name, upload age, verified syllabus tag, file size & page count.
5. **Interactive Footer**: Compact upvote pill, comment counter, quick preview trigger, direct download.

### 5.2 The 5 Distinct Visual States

```
+----------------------------------------------------------------------------------+
| DEFAULT STATE                                                                    |
| [PDF] CS201 • Unit 03                                            [Bookmark Icon] |
| Complete Dynamic Programming Lecture Slides & Solved Problems                    |
| By Prof. K. Sharma • 4 days ago • 4.2 MB (48 Pages)                              |
| [ ▲ 142 ]   [ 💬 18 ]                                         [Preview] [Download] |
+----------------------------------------------------------------------------------+
| UPVOTED STATE (User has upvoted)                                                 |
| █ [PDF] CS201 • Unit 03                                          [Bookmark Icon] |
| █ Complete Dynamic Programming Lecture Slides & Solved Problems                  |
| █ By Prof. K. Sharma • 4 days ago • 4.2 MB (48 Pages)                            |
| █ [ ▲ 143 (Solid Terracotta) ]   [ 💬 18 ]                    [Preview] [Download] |
| *(Left spine turns solid 3px Terracotta; Vote pill fills with terracotta wash)*    |
+----------------------------------------------------------------------------------+
| DOWNVOTED / LOW SCORE STATE                                                      |
|   [PDF] CS201 • Unit 03                                          [Bookmark Icon] |
|   Handwritten Rough Notes (Incomplete Pages)                                      |
|   By Anonymous • Low Community Rating (Score: -4)                                |
|   [ ▼ -4 (Dimmed Stone) ]                                                        |
| *(Entire card drops to 65% opacity; background turns flat muted stone)*           |
+----------------------------------------------------------------------------------+
| REPORTED / FLAGGED STATE                                                         |
| ▌ ⚠ FLAGGED: OUTDATED SYLLABUS / CORRUPT FILE                     [Resolve Report] |
| ▌ 2018 Midterm Exam Paper (Previous Regulation R16)                              |
| ▌ Marked by 3 students • Content hidden from default view until confirmed       |
| ▌ [ Show Contents Anyway ]                                                       |
| *(Left spine turns crimson; subtle diagonal wash pattern; content gated)*        |
+----------------------------------------------------------------------------------+
| BOOKMARKED STATE                                                                 |
| [PDF] CS201 • Unit 03                                     [ ★ SAVED IN REVISION ]|
| Complete Dynamic Programming Lecture Slides & Solved Problems                    |
| By Prof. K. Sharma • 4 days ago • 4.2 MB (48 Pages)                              |
| *(Solid terracotta badge indicator in top right; warm amber border highlight)*   |
+----------------------------------------------------------------------------------+
```

---

## 6. Motion Principles

1. **Duration Cap:** Micro-interactions run at **80ms to 120ms**. Modal/drawer entries take **140ms max**. Never exceed 150ms.
2. **No Ambient Motion:** No floating cards, no infinite loops, no slow fade-ins when scrolling down a feed.
3. **Hardware Acceleration:** Every transition uses `opacity` and `transform: translateY(...)` with `cubic-bezier(0.16, 1, 0.3, 1)`.
4. **Immediate Tactile Feedback:** Buttons push in `scale(0.98)` on `:active` with zero delay to reassure students on lagging hostel connections that their click was registered.

---

## 7. Iconography & Asset Standards

- **Library**: **Lucide Icons** exclusively.
- **Stroke Width**: `1.75px` across all sizes (balanced between thin elegance and mobile legibility).
- **Default Sizes**:
  - `14px` for inline metadata indicators (clock, file size, pages).
  - `16px` for navigation pills and secondary actions.
  - `20px` for primary navigation rail headers and modal close triggers.
- **Style Rule**: Monoline outlined by default; solid fills are strictly reserved for active states (e.g. active bookmark, active star).
