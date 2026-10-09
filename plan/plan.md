# Traccia Fondi — User Accounts, Persistent Tracing & Automated Email Campaign

Traccia Fondi is an Italian-language fund-tracing platform for victims of online financial scams. Users now self-register, maintain a profile, and start a tracing procedure that runs persistently in the background — triggering two professional automated emails at 24 h and 50 h after the trace starts.

**Who it's for:** Italian victims of forex, crypto, SEPA, PostePay, and card scams who need an organised case and a guided recovery path.

---

## Core Features & Experience

### Self-Registration & Profile
- Public sign-up form: first name, last name, email, password, phone number, date of birth.
- After registration the user lands on a profile page showing their info and their active/past trace.
- Login restores the same profile and trace state.

### Tracing Panel (unchanged flow, new persistence)
- User fills in the same trace form (amount tier, access code, optional documents).
- On submit the trace starts and is saved to their account permanently — not lost on page refresh.
- The panel shows a professional "live search" UI: the existing radar animation, scrolling log lines, and a human-readable elapsed counter ("Searching for 2 hours 14 minutes" — no countdown, no exact clock). Every time the user returns to the trace page the timer resumes from the real elapsed time stored in the DB.
- No completion state is triggered by the frontend timer anymore — the trace runs until the backend jobs fire.

### Automated Email at 24 Hours
- Exactly 24 hours after `trace.created_at`, Resend sends a professional email to the user's registered address.
- Subject (IT): *"Aggiornamento sul tuo caso — prime transazioni rilevate"*
- Content: informs the user that in the first 24 hours the system identified 2–3 transactions showing where the funds moved, that the investigation is continuing for full disclosure, and that they should not share credentials with anyone. Signed "Traccia Fondi — Case Intelligence Team."
- English mirror if the user's language preference is EN.
- Email uses the existing Traccia Fondi HTML banner style (dark background, teal/blue gradient header, same template pattern as the existing recovery email).

### Automated Email at 50 Hours
- Exactly 50 hours after `trace.created_at`, Resend sends a second professional email.
- Subject (IT): *"Fondi localizzati — il tuo caso è pronto per il recupero"*
- Content: confirms that the full trace is complete, states the located amount (from `trace.located_amount`) and the destination name (from the access code), and says a dedicated case agent will contact them shortly. Includes a security reminder. Same branded template.
- English mirror if the user's language preference is EN.

### Scheduling Mechanism
- A lightweight background scheduler (APScheduler) runs inside the FastAPI process.
- On startup it loads all traces that have not yet received email-1 or email-2 and schedules them. New traces are scheduled at creation time.
- Flags on the trace document: `email_24h_sent` (bool), `email_50h_sent` (bool).
- If the server restarts before a scheduled time, the startup loader re-queues any unsent jobs.

### Admin Panel Enhancements
- Existing "Traces" and "Access Codes" tabs remain unchanged in function.
- **New "Users" tab** showing all registered accounts.
- Default view: 20 rows per page. Page-size selector: 20 / 50 / 100.
- Search bar filtering across first name, last name, email, and phone number (client-side filter on the loaded page, no extra API needed for MVP).
- Each row shows: name, email, phone, date of birth, registration date, whether a trace exists, trace status (24h email sent / 50h email sent).

---

## User Flow

1. Visitor lands on homepage → clicks "Start" → goes to `/register`.
2. Fills name, surname, email, password, phone, date of birth → account created, auto-logged in.
3. Lands on `/app` (profile + trace dashboard).
4. Clicks "Start Tracing" → fills amount tier, access code, optional docs → submits.
5. Trace is saved to their account. Panel shows radar + live logs + elapsed time counter.
6. User can close the browser and return — the trace continues on the server clock.
7. At 24 h → receives professional email (language-matched).
8. At 50 h → receives professional email with located funds and destination.
9. Admin sees the user in the Users tab, can search by name/email/phone, and sees email delivery status on the trace row.

---

## UI/UX Feel

- Registration page matches existing dark aesthetic (same card style, teal accents, security disclaimer).
- Profile page: two-column layout — left shows personal info, right shows trace status card.
- Tracing panel elapsed display: large monospace counter ("02h 14m searching...") beneath the radar, pulsing green dot, no countdown.
- Emails: dark HTML template, teal/blue gradient header with "Traccia Fondi" logo text, white body on dark card, teal highlights for key data (amount, destination), red warning block at the bottom ("never share credentials").

---

## Implementation Phases

### Phase 1 — MVP (built now)
- Self-registration endpoint and frontend form.
- User profile page (`/app`) showing info + trace state.
- Persistent trace linked to user account (trace retrieved on login, timer resumes from real elapsed).
- Background scheduler with 24 h and 50 h email jobs.
- Both professional branded emails (IT + EN).
- Admin Users tab with pagination (20/50/100) and search.

### Phase 2 — Polish
- Password reset via email.
- User can update profile info.
- Admin can manually trigger/resend scheduled emails.

### Phase 3 — Extended
- Multiple traces per user (case history).
- Admin notes per user visible on the user detail modal.

---

## Assumptions

- Access codes are still required to start a trace (unchanged).
- One active trace per user at a time (same as current one-email-one-trace rule, now tied to account instead of email uniqueness).
- Language preference is stored on the user record at registration time based on the browser/i18n setting and used for email language selection.
- The APScheduler `AsyncIOScheduler` runs in-process; no Redis or Celery is introduced.
- Passwords are hashed with bcrypt (replacing current plaintext storage for admin-created users; new self-registered users always get hashed passwords).
- The existing admin-created user flow (admin creates users manually) is kept for backward compatibility but the new self-registration path is the primary one.
- Phone number is stored as a plain string, no validation beyond non-empty.
- The 24 h and 50 h timers are based on UTC `trace.created_at`; no timezone conversion is applied.
- If Resend is not configured (no API key), email jobs log a warning and mark the flag as sent to avoid repeated retries.
