# Component Library

## Overview

Shared React components used across student and admin pages. All components are in `components/` and use Tailwind CSS 4 with the project's custom theme.

---

## Form Components

### `SubmitButton`

**Location:** `components/form-buttons.tsx`

**Purpose:** Submit button for forms with loading state.

**Props:**
```typescript
{
  children: React.ReactNode,
  pending?: boolean,           // Show loading state if true
  pendingLabel?: string,       // Text while pending (default "Loading...")
  className?: string,          // Tailwind classes
  disabled?: boolean,          // Disabled state
}
```

**Usage:**
```tsx
<SubmitButton pendingLabel="Creating...">
  Create class
</SubmitButton>
```

**Behavior:**
- Shows spinner + label while pending
- Disables during submission
- Restores after action completes

**Styling:** `btn-primary` with loading animation

---

### `ConfirmSubmitButton`

**Location:** `components/form-buttons.tsx`

**Purpose:** Submit button with confirmation dialog before action.

**Props:**
```typescript
{
  children: React.ReactNode,
  confirmMessage: string,      // Text for confirmation dialog
  pendingLabel?: string,       // While submitting
  className?: string,          // Tailwind classes
  disabled?: boolean,
}
```

**Usage:**
```tsx
<ConfirmSubmitButton
  confirmMessage="Delete this application? Can't undo."
  pendingLabel="Deleting..."
>
  Delete
</ConfirmSubmitButton>
```

**Behavior:**
- On click: show browser `confirm()` dialog
- If user confirms: submit form
- If user cancels: do nothing

**Styling:** `btn-danger` (red) for destructive actions

---

## Class Display Components

### `ClassForm`

**Location:** `components/class-form.tsx`

**Purpose:** Form to create or edit a class (admin only).

**Props:**
```typescript
{
  initial?: ClassRecord,  // If editing, pass existing class
}
```

**Fields:**
- `title` (text, required)
- `description` (textarea)
- `instructor` (text)
- `schedule` (text, e.g., "4 Aug 2026, 8pm")
- `location` (text)
- `capacity` (number, ≥ 1)
- `isOpen` (checkbox)
- `waitlistEnabled` (checkbox)

**Usage:**
```tsx
// Create new
<ClassForm />

// Edit existing
<ClassForm initial={cls} />
```

**Behavior:**
- Calls `saveClass` server action on submit
- Shows validation errors
- Disabled during submission

---

### `SeatMeter`

**Location:** `components/class-status.tsx`

**Purpose:** Visual progress bar showing seat occupancy.

**Props:**
```typescript
{
  cls: ClassRecord,  // Must include capacity, applicant counts
}
```

**Display:**
- Progress bar: `confirmedCount / capacity`
- Text: "X of Y seats taken"
- Subtext (if waitlist): "+Z waiting"
- Color: green (under capacity), red (full)

**Usage:**
```tsx
<SeatMeter cls={cls} />

// Output:
// 2 of 3 seats taken
// +1 waiting
```

**Styling:** Tailwind progress bar with custom colors

---

### `StatusPill`

**Location:** `components/class-status.tsx`

**Purpose:** Badge showing class status.

**Props:**
```typescript
{
  cls: ClassRecord,
}
```

**States:**
- `"Open"` (green) — accepting applications
- `"Closed"` (grey) — not accepting
- `"Waitlist"` (sky blue) — full but accepting waitlist
- `"Full"` (orange) — full, no waitlist

**Usage:**
```tsx
<StatusPill cls={cls} />
```

**Styling:** Rounded pill with background color matching status

---

## Admin Components

### `ShareTools`

**Location:** `components/share-tools.tsx`

**Purpose:** QR code + copy link for sharing class with students.

**Props:**
```typescript
{
  url: string,  // Full URL to class page (e.g., https://example.com/classes/3)
}
```

**Display:**
- QR code (SVG, 200x200px)
- Readable URL in `<code>` tag (truncated if long)
- "Copy link" button
- "Open" link to class page

**Usage:**
```tsx
<ShareTools url="https://example.com/classes/3" />
```

**Behavior:**
- QR renders server-side (no client JS needed)
- Copy button uses `navigator.clipboard.writeText()` with fallback
- Works in dark mode (white QR on transparent)

**Styling:** Cards with rounded corners, code font

---

### `Pagination`

**Location:** `components/pagination.tsx`

**Purpose:** Navigate between paginated results.

**Props:**
```typescript
{
  basePath: string,           // e.g., "/admin/classes/3"
  page: number,               // Current page (1-indexed)
  pageCount: number,          // Total pages
  searchParams: Record<string, string>,  // Query string to preserve
  paramName?: string,         // Query param name (default "page")
}
```

**Display:**
- Previous/Next buttons
- Page numbers (first, last, current ± 1)
- Ellipsis between gaps (e.g., "1 ... 5 6 7 ... 10")
- Disabled state at boundaries

**Usage:**
```tsx
<Pagination
  basePath="/admin/classes/3"
  page={2}
  pageCount={5}
  searchParams={{}}
/>

// Renders:
// Previous | 1 ... 4 5 6 ... 10 | Next
```

**Behavior:**
- Preserves all query params except `paramName`
- Disables Previous on page 1, Next on last page
- Links are GET (no form submission)

---

### `CopyButton`

**Location:** `components/copy-button.tsx`

**Purpose:** Copy text to clipboard with feedback.

**Props:**
```typescript
{
  text: string,          // Text to copy
  children?: React.ReactNode,  // Button label
  className?: string,    // Tailwind classes
}
```

**Usage:**
```tsx
<CopyButton text="https://example.com/classes/3">
  Copy link
</CopyButton>
```

**Behavior:**
- On click: copy to clipboard
- Show "Copied!" for 2 seconds
- Fallback to `prompt()` if clipboard unavailable
- Works on mobile (if HTTPS or localhost)

**Fallback Chain:**
1. `navigator.clipboard.writeText()` (preferred)
2. `execCommand('copy')` with textarea (older browsers)
3. `window.prompt()` (last resort)

---

## WhatsApp Component

### `WhatsAppButton`

**Location:** `components/whatsapp-button.tsx`

**Purpose:** Button to open WhatsApp chat with pre-filled message.

**Props:**
```typescript
{
  phoneE164: string,        // Digits only: "60123456789"
  label: string,            // Display text (usually phone number)
  message?: string,         // Pre-filled message
  className?: string,       // Tailwind classes
}
```

**Usage:**
```tsx
<WhatsAppButton
  phoneE164="60123456789"
  label="+60 12 345 6789"
  message="Hi, about your application for AI Workshop..."
  className="btn-whatsapp"
/>
```

**Behavior:**
- On click: open `https://wa.me/60123456789?text=...`
- Works on phone (WhatsApp app), desktop (web)
- URL-encodes message

**Styling:** Green WhatsApp brand color (custom `btn-whatsapp` class)

---

## Layout Components

### Root Layout

**Location:** `app/layout.tsx`

**Wrapper for all pages.**

**Features:**
- Tailwind provider
- Font loading (system fonts)
- Metadata (title, description)
- Dark mode support (system preference)

---

### Admin Layout

**Location:** `app/admin/(protected)/layout.tsx`

**Wrapper for `/admin/*` pages.**

**Features:**
- Header with navigation (Classes, Team, Activity)
- Session info (signed in as username)
- Sign out button
- "Student view" link
- Enforces `requireAdmin()` middleware

**Navigation:**
- Home icon → `/admin`
- Classes → `/admin` (same)
- Team → `/admin/team`
- Activity → `/admin/activity`

---

## Error & Loading Boundaries

### `error.tsx`

**Location:** `app/error.tsx`

**Catches errors in page components.**

**Display:**
- "Something went wrong" message
- "Try again" button (resets error)
- "Back to classes" link
- Error digest (for debugging)

---

### `global-error.tsx`

**Location:** `app/global-error.tsx`

**Last-resort boundary (replaces whole document).**

**Display:**
- Minimal HTML (no external CSS)
- "Application failed to start" message
- "Try again" button

---

### `loading.tsx`

**Location:** `app/loading.tsx`

**Shows skeleton while page loads.**

**Display:**
- Animated skeleton for class cards
- "Loading classes..." screen reader text

---

## Form Helper Utilities

### `ApplyForm` (Client Component)

**Location:** `app/classes/[id]/apply-form.tsx`

**Purpose:** Student application form.

**Props:**
```typescript
{
  classId: number,
  classTitle: string,
  waitlistOnly: boolean,  // Show "Join waitlist" vs "Apply"
}
```

**Fields:**
- Name (text)
- Country (dropdown, ISO codes with flags)
- Phone (text, local format)

**Validation:**
- Name required
- Phone validated via `parsePhone()`
- Shows error message if invalid

**Usage:**
```tsx
<ApplyForm
  classId={3}
  classTitle="AI Workshop"
  waitlistOnly={false}
/>
```

---

### `WithdrawForm` (Client Component)

**Location:** `app/withdraw/[token]/withdraw-form.tsx`

**Purpose:** Student withdrawal confirmation.

**Props:**
```typescript
{
  token: string,
  classTitle: string,
  name: string,
  waitlisted: boolean,  // Show "queue position" vs "seat"
}
```

**Display:**
- Confirmation message
- "Yes, withdraw me" button
- "Keep my place" link

**Behavior:**
- On submit: calls `submitWithdrawal()` server action
- Shows "Withdrawn" success page after

---

## Custom Tailwind Classes

### Button Variants

**Defined in `app/globals.css`** (Tailwind v4 theme):

```css
@layer components {
  .btn-primary { @apply px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700; }
  .btn-secondary { @apply px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300; }
  .btn-danger { @apply px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700; }
  .btn-whatsapp { @apply px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium; }
}
```

### Card & Spacing

```css
.card { @apply rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900; }
.label { @apply block text-sm font-medium text-slate-900 dark:text-slate-100; }
.input { @apply w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600; }
```

---

## Component Tree

```
app/
├── layout.tsx (Root)
│   ├── page.tsx (Student dashboard)
│   │   └── ClassCard
│   │       ├── SeatMeter
│   │       ├── StatusPill
│   │       └── Link to /classes/[id]
│   │
│   ├── classes/[id]/page.tsx
│   │   ├── ApplyForm
│   │   │   └── Country selector + phone input
│   │   ├── SeatMeter
│   │   └── StatusPill
│   │
│   ├── withdraw/[token]/page.tsx
│   │   └── WithdrawForm
│   │       └── Confirm + cancel buttons
│   │
│   └── admin/(protected)/layout.tsx (Admin)
│       ├── error.tsx (Error boundary)
│       │
│       ├── page.tsx (Dashboard)
│       │   └── ClassCard with counts
│       │
│       ├── classes/[id]/page.tsx
│       │   ├── ClassForm
│       │   ├── ShareTools
│       │   ├── Pagination
│       │   └── ApplicantTable
│       │       ├── WhatsAppButton
│       │       ├── ConfirmSubmitButton
│       │       └── RemoveButton
│       │
│       ├── team/page.tsx
│       │   ├── AddAdminForm
│       │   └── ChangePasswordForm
│       │
│       └── activity/page.tsx
│           └── AuditTable
│               └── Pagination
```

---

## Styling Guidelines

### Theme Colors

```typescript
// Primary (indigo)
.bg-indigo-600  // Buttons, highlights
.text-indigo-600

// Secondary (slate)
.bg-slate-100   // Backgrounds
.text-slate-600 // Muted text

// Status (green = open, red = error, sky = waitlist)
.bg-green-500
.bg-red-600
.bg-sky-500

// Dark mode
@media (prefers-color-scheme: dark) {
  /* Inversions handled by Tailwind */
}
```

### Spacing

- Padding: `p-4`, `px-5`, `py-3` (4px base unit)
- Margin: `mt-6`, `mb-4` (6px base unit)
- Gap: `gap-4` (flex/grid spacing)

### Typography

- Headings: `text-2xl font-bold` (page titles)
- Subheadings: `text-lg font-semibold` (section titles)
- Body: `text-base` (default)
- Muted: `text-slate-600 dark:text-slate-400`
- Code: `font-mono text-xs` (phone numbers, tokens)

---

## Best Practices

1. **Use Tailwind only** — No CSS-in-JS, no BEM classes
2. **No inline styles** — All styling via Tailwind classes
3. **Responsive first** — Use `sm:`, `md:`, `lg:` prefixes
4. **Dark mode** — Test with `prefers-color-scheme: dark`
5. **Accessibility** — Add `role`, `aria-label` where needed
6. **Type-safe** — All props typed, no `any`
7. **Reuse components** — Don't duplicate code across pages

---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — Component hierarchy
- `components/` — All component source code
- `app/globals.css` — Tailwind configuration
- `tailwind.config.js` — Theme tokens
