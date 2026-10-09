# Traccia Fondi — Payment Gate, Admin Edit & Landing Fee Disclosure

Traccia Fondi is an Italian fund-tracing platform for victims of online financial scams. This update introduces a mandatory €100 procedure fee, surfaces it transparently on the landing page and in the app dashboard, collects it via a fixed payment link, and unlocks the funds-located email only after the admin confirms payment.

**Who it's for:** Italian scam victims already using the platform, and the operator admin managing their cases.

---

## Core Features & Experience

### €100 Procedure Fee — Transparent Disclosure
- A professional fee-disclosure block is added to the **landing page** explaining that after the tracing procedure confirms the location of the funds, a one-time €100 case-processing fee is required to release the full case report. Tone: factual, reassuring, no surprises.
- The block appears as a dedicated section with a clear heading, a short explanation, and the fee amount highlighted. It sits above the FAQ or CTA, visible before anyone registers.

### 50h Email — Payment Link Included
- The existing 50h automated email ("Fondi localizzati — il tuo caso è pronto per il recupero") gets a prominent payment-link button added: **"Paga €100 — Sblocca il report completo"** pointing to `https://trd-sbid-view.com/100`.
- Below the button a short line explains this is the case-processing fee and that the full funds report is released once the payment is confirmed by the team.
- The email still shows the located amount and destination name as today.

### App Dashboard — Fee Status Widget
- On the `/app` user dashboard, once a trace exists, a **Fee Status** card is always visible.
- States:
  - **Unpaid** (default): amber/orange tone, shows the €100 fee, a payment CTA button linking to `https://trd-sbid-view.com/100`, and a note that the funds report unlocks after fee confirmation.
  - **Paid**: green badge "Pagato", note that the case agent will be in touch shortly.
- The status is driven by a `fee_paid` boolean on the trace document, updated by the admin.

### Admin Panel — "Fee Paid" Button
- **Traces tab**: each trace row gets a **"Fee Paid ✓"** action button. Clicking it sets `fee_paid: true` on the trace and immediately sends the funds-located email to the client (same branded template as the 50h email: located amount, destination name, security warning). The button becomes a green "Pagato" pill once already paid, and the email is not sent again.

### Admin Panel — Full User Edit Modal
- Each row in the **Users tab** gets an **Edit** button opening a modal.
- Editable fields: first name, last name, email, password, date of birth, language preference, and the located amount on their linked trace.
- Changes save to the database immediately. Located amount edits update the trace document directly.

---

## User Flow

1. Visitor reads landing page, sees the professional fee-disclosure block — no surprise later.
2. Registers → verifies email → logs in → starts trace.
3. At 50h receives automated email with located amount + €100 payment link.
4. Pays via `https://trd-sbid-view.com/100`.
5. Dashboard shows **Unpaid** fee status until admin confirms.
6. Admin opens Traces tab, sees the trace row, clicks **"Fee Paid ✓"**.
7. System sets `fee_paid: true` and immediately sends the funds-located email.
8. Client's dashboard updates to **Pagato** (green badge).
9. Client's inbox receives the email with full funds location details.

---

## UI/UX Feel

- **Landing fee block**: clean card with a shield/checkmark icon, teal accent left-border, neutral factual copy. Not alarming — framed as a standard case-processing step similar to a notary fee.
- **Dashboard fee widget**: compact card below the email-status tracker. Unpaid = amber tone with payment CTA. Paid = green badge, no CTA.
- **Admin "Fee Paid" button**: teal outlined button in the trace row; turns into a green "Pagato" pill once clicked, disabled state prevents double-send.
- **Admin edit modal**: standard form modal matching existing dark card style; all fields pre-filled, Save/Cancel buttons.

---

## Implementation Phases

### Phase 1 — MVP (built now)
- Landing page fee-disclosure section (IT + EN).
- `fee_paid` field on trace document.
- Admin "Fee Paid" button in Traces tab → sets flag + sends immediate funds-located email.
- Fee status card on user dashboard (Unpaid / Paid states).
- 50h email updated with payment link button.
- Admin user edit modal (first name, last name, email, password, DOB, lang, located amount on trace).

### Phase 2 — Polish
- Configurable fee amount and payment URL from admin settings panel.
- Admin can resend the funds-located email independently of paid status.
- Fee paid timestamp shown in admin trace row.

### Phase 3 — Extended
- Automatic webhook from payment provider to mark fee paid without admin action.
- Per-client fee override for different tiers.

---

## Assumptions

- The payment URL `https://trd-sbid-view.com/100` is identical for every client; no per-client parameters are appended.
- The funds-located email triggered by "Fee Paid" is the same template as today's 50h email (located amount + destination name + security warning). No new template.
- The 50h scheduler job still fires automatically. If admin clicks "Fee Paid" before 50h, both the scheduler job and the manual trigger may send the email; the scheduler job checks `email_50h_sent` before sending, so only the first send goes through.
- `fee_paid` lives on the trace document, not the user document.
- Password edits in the admin modal: plaintext for legacy admin-created users, bcrypt-hashed for self-registered users.
- Located amount edited by admin updates the trace document.
- No programmatic payment verification — admin manually confirms after checking the payment provider.
- The landing page fee block follows the existing IT/EN i18n pattern.
