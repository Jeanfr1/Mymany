# META_APP_REVIEW.md — Advanced Access step-by-step

> **Read this first:** App Review / **Advanced Access** is only needed if third-party
> account owners (not you) must authorize the app, OR if Standard Access does not let the
> app act for your own connected accounts toward the public. **Test with a real (non-tester)
> account first** — you may not need any of this. If you do, follow the steps below.
>
> ⚠️ **No approval is guaranteed.** App Review takes **~2–4 weeks per submission** and each
> permission is reviewed separately.

## Permissions that would need Advanced Access
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`

## Prerequisites

| Requirement | Status |
|---|---|
| App in **Live** mode | ✅ done |
| Privacy Policy URL (same domain as app) | ✅ `…/privacy` |
| Data Deletion URL | ✅ `…/data-deletion` |
| App icon (1024×1024), category, contact email | ⬜ set in Settings → Basic |
| **Business Verification** | ⬜ **the main gate** (see Phase 2) |
| Screencast per permission | ⬜ (see Phase 3) |

## Phase 1 — Polish the app (Settings → Basic)
1. **App icon** — upload a 1024×1024 PNG.
2. **Category** — choose the closest (e.g., Business/Messaging).
3. **Contact email** — a monitored address.
4. Confirm **Privacy Policy URL** and **Data Deletion URL** are set and on the **same domain**
   as the app (Meta rejects mismatched domains).

## Phase 2 — Business Verification (the gate)
Advanced Access requires a **verified business**.
1. Go to **Meta Business Settings → Security Center** (business.facebook.com/settings).
2. Start **Business Verification**.
3. Provide business details and a supporting document (business registration, utility bill,
   or phone/address verification depending on what Meta asks).
4. Wait for approval (days).

> 🚧 **Honest blocker:** this step needs a **real business identity/documents**. If you don't
> have a registered business, this is where App Review usually stalls. If your goal is only
> to automate **your own** accounts, prefer the "test with a real account" path and avoid
> review entirely if it works.

## Phase 3 — Record the screencast(s) — the hard part
Record **one screen video per permission**. Each must show the **complete journey**:

1. Open the app's **Connection** page.
2. Click **Connect Instagram** → **the Instagram OAuth consent screen must be VISIBLE**,
   showing the permission being requested. *(Missing consent screen = automatic rejection.)*
3. Authorize using a **real Instagram Business/Creator account** (a real account, not a
   throwaway "test user").
4. **Demonstrate the permission in action** and show the data rendered in the app:
   - `manage_comments`: a comment with the keyword → the **private reply** being sent →
     show it in the **Events/Queue** tab and in Instagram.
   - `manage_messages`: a DM with the keyword → the **auto message** being sent → show it in
     the dashboard and in Instagram.
5. Keep it clear; add captions/narration explaining each step.

## Phase 4 — Submit for review
1. App Dashboard → use case **"Gerenciar mensagens e conteúdo no Instagram"** →
   step **"5. Concluir a análise do app"** (App Review).
2. For **each** permission provide:
   - A **use-case description** scoped to exactly what the app does (no more).
   - The **screencast**.
   - **Step-by-step reviewer instructions** to reproduce, including a test account if needed.
3. Submit.

## Phase 5 — Wait & iterate
- ~2–4 weeks. If rejected, read the reason, fix, resubmit.

## ✅ Rejection-proofing checklist (the common failures)
- [ ] Screencast uses a **real** Business/Creator account (not a test user)
- [ ] **OAuth consent screen is shown** in the screencast
- [ ] Requested data is **actually rendered** in the app after authorization
- [ ] **Business Verification completed BEFORE** submitting
- [ ] Privacy policy is on the **same domain** as the app
- [ ] **Data deletion URL** present
- [ ] Every requested permission is **demonstrated** (don't request what you don't show)

## Sources
Requirements verified against Meta's App Review docs and current (2026) community guidance.
