# StudyShare Frontend (`React 19 + TypeScript + Vite`)

This directory contains the client application for **StudyShare**, engineered with React 19, strict TypeScript, and the **DAQ Consulting Monochrome Architectural Design System**.

---

## Architecture Overview

```text
frontend/src/
├── components/
│   ├── AdminView.tsx           # Moderation queue, report triage, user directory, and audit log
│   ├── AppShell.tsx            # Collapsible sidebar rail, top bar, theme/reading/lite toggles, mobile nav
│   ├── AuthModal.tsx           # Modal wrapper for inline authentication prompts
│   ├── BookmarksView.tsx       # Personal Saved Library with search, course filter, and offline fallback
│   ├── BrowseView.tsx          # Primary resource catalog, Your Semester strip, and 4-step student guide
│   ├── Login.tsx               # Sign-in form with 1-click demo student/faculty credentials
│   ├── OnboardingModal.tsx     # Post-signup course, semester, department, and theme personalization
│   ├── ProfileView.tsx         # Contributor stats, reputation breakdown, uploads, and activity feed
│   ├── ResourceCard.tsx        # Scannable study card with trust badges, inline vote/save, and download action
│   ├── ResourceDetailView.tsx  # Inline PDF/image preview, rating widget, version history, and report modal
│   ├── ResourceEmptyState.tsx  # Contextual empty state with 1-click filter reset and course search actions
│   ├── ResourceFilterBar.tsx   # Course -> Unit -> Topic selectors, Exam Prep chips, and search bar
│   ├── ResourceSkeleton.tsx    # Layout-stable loading placeholders
│   ├── Signup.tsx              # Student account registration with academic metadata
│   └── UploadView.tsx          # Drag-and-drop auto-fill uploader with duplicate detection & inline unit/topic creation
├── context/
│   ├── AuthContext.tsx         # Session hydration, onboarding trigger, and auth state provider
│   └── ToastContext.tsx        # Accessible aria-live notification system
├── services/
│   ├── httpClient.ts           # Shared fetch wrapper, ApiError normalization, in-memory token + HttpOnly refresh retry
│   ├── localStorage.ts         # Versioned taxonomy cache (v2), offline bookmarks, download history, dev diagnostics
│   ├── authApi.ts              # Login, signup, session profile (/api/auth/me), and logout
│   ├── taxonomyApi.ts          # Course -> Unit -> Topic hierarchy with background revalidation
│   ├── resourcesApi.ts         # Catalog listing, duplicate check, upload/versioning, votes, ratings, bookmarks
│   ├── usersApi.ts             # Contributor profile, activity log, and paginated user bookmarks
│   ├── adminApi.ts             # Reports, resource removal/restoration, user bans/warnings, audit trail
│   └── api.ts                  # Barrel re-export for seamless module imports
├── styles/
│   ├── tokens.css              # Dark (#000000) and Light (#F8FAFC) theme tokens, fonts, and motion curves
│   ├── reset.css               # Base element resets, blueprint grid, form inputs, and scrollbars
│   ├── motion.css              # Route transitions, vote/bookmark/star pop animations, upload shimmer
│   ├── layout.css              # Collapsible sidebar rail and typographic utility classes
│   ├── components.css          # DAQ buttons, cards, crosshair corners, rank badges, and verified seals
│   ├── accessibility.css       # Focus-visible rings, skip-to-main link, and Comfortable Reading Mode
│   └── responsive.css          # 44x44px touch targets, mobile safe-area padding, Low-Bandwidth Mode, reduced motion
└── types/
    └── index.ts                # End-to-end TypeScript contracts matching FastAPI Pydantic schemas
```

---

## Security & Token Storage Model (`src/services/httpClient.ts`)

- **Short-Lived Access Token**: Stored in memory (`inMemoryAccessToken`) and tab-scoped `sessionStorage` (`studyshare_access_token`) so page reloads stay authenticated within the active tab without persisting tokens in `localStorage`.
- **Long-Lived Refresh Token**: Issued by the FastAPI backend as an `HttpOnly`, `SameSite=Lax` cookie (`studyshare_refresh_token`) and rotated on every `/api/auth/refresh` call. Never written to `localStorage` or `sessionStorage`.

---

## Accessibility & Campus Network Modes

1. **Theme Toggle (`data-theme="dark" | "light"`)**: Instant switch between high-contrast pitch-black dark mode and daylight paper mode.
2. **Comfortable Reading Mode (`data-reading-mode="comfortable"`)**: Increases base font size (`16px`), line height (`1.72`), and card padding for long study sessions.
3. **Low-Bandwidth Lite Mode (`data-low-bandwidth="true"`)**: Disables background grids, glass blurs, and CSS animations while serving cached course taxonomy (`studyshare_taxonomy_cache_v2`) and offline bookmarks (`studyshare_offline_bookmarks_v1`).

---

## Development Scripts

```bash
# Start Vite development server with HMR on http://localhost:5173
npm run dev

# Run ESLint across all TypeScript/React files
npm run lint

# Type-check with tsc -b and build production bundle into dist/
npm run build

# Preview production build locally
npm run preview
```
