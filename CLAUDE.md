# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single-file JavaScript snippet (`spouse-continue-form.js`) injected into an OpnForm multi-step form at `forms.codescar.eu/forms/prototype`. No build step, no dependencies, no tests.

## How to develop

Edit `spouse-continue-form.js` directly, then inject it into the target page via the browser console or OpnForm's custom code settings. Enable debug mode by setting `const DEBUG = true` on line 5.

## Architecture

The snippet runs as an IIFE and does the following in order:

1. **Early exit** — if the `incoming_afm` field ID is already in the URL query string, skip everything (this is the second visit / spouse flow).
2. **MutationObserver** — watches `document.body` for DOM changes to detect when the submit button appears (the form is multi-step; the button only exists on the final step).
3. **localStorage read** — on button click, reads form data from OpnForm's own pending-submission key (pattern: `openform-{version}-pending-submission-{form_id}-{timestamp}`). Picks the entry with the most fields, since multiple stale entries may exist from previous sessions.
4. **Condition check** — proceeds only if `marriage_status === 'ΕΓΓΑΜΟΣ/Η'` AND `spouse_send_email` is falsy.
5. **Intercept** — calls `e.stopImmediatePropagation()` + `e.preventDefault()` with `useCapture: true` to block OpnForm's own Vue click handler (without this, the form submits twice).
6. **Background POST** — submits to `/api/forms/prototype/answer` with the localStorage data.
7. **Redirect** — on success, redirects to the same form URL with `incoming_afm`, `marriage_status`, and `is_spouse=true` as query params.

If the condition is NOT met, the script does nothing and OpnForm's handler runs normally.

## Key field IDs

| Logical name      | UUID                                   |
|-------------------|----------------------------------------|
| marriage_status   | 50aa1cce-bc06-419d-bc86-328a795993bd  |
| spouse_send_email | 191b9a50-02bc-4f1a-ae3e-1c24884d2a85  |
| afm               | aa903600-6858-447c-ae9c-91220500b152  |
| incoming_afm      | d41b8d88-40e2-49be-ace5-7996ba1ea713  |
| is_spouse         | 90ef9493-e385-4e98-9061-1ee40f5538a0  |
| name              | 0f989032-f684-42c2-99c1-870afe25569b  |
| name_spouse       | c69c7bf2-b386-4f94-9f60-0151f815a5e6  |

## Why these patterns were chosen

- **MutationObserver over setInterval** — more efficient; the button appears only when Vue re-renders the final step.
- **localStorage over DOM** — OpnForm is a Vue SPA using `@submit.prevent`; field inputs from earlier steps are removed from the DOM by the time the submit button appears. OpnForm itself stores all field values in localStorage throughout navigation.
- **Field count to pick the right localStorage entry** — multiple stale `pending-submission` keys accumulate across sessions; the most complete one (highest field count) is the current submission.
- **useCapture + stopImmediatePropagation** — OpnForm's Vue button handler is registered in the bubble phase; using capture ensures our handler fires first and can fully block theirs when needed.
