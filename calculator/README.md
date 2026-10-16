# Jacktools Calculator

Static Astro 7 + TypeScript tool for https://calculator.jacktools.net.
Shares Stopwatch's framework, four languages (DE/EN/ES/FR), palettes, visual
styles, font scaling, theme controls, hosting/legal conventions and support footer.
No backend, external fonts, analytics or advertising. No deployment performed.

## Development

```bash
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.17.0
npm ci
npm run dev -- --port 4324
npm test
npm run test:e2e
npm run build
```

Deploy the **contents of `dist/`** to the configured domain root. Routes use
trailing slashes. robots.txt and sitemap.xml are included. Do not upload source,
node_modules or tests. Browser tests use port 4323 and installed Chromium.

New calculation, undo, redo and settings sit beside the subtotal key in the
keypad. Settings opens a native modal with rounding and local-saving options;
Escape or Close dismisses it and returns focus to the settings button. In the two-column layout,
the calculator follows page scrolling alongside long tapes; on short screens
its contents scroll within the card. The mobile stacked layout scrolls normally.

Focus view hides the header, introduction, guide and footer but keeps calculator,
tape and options dialog usable. It optionally enters browser fullscreen, with a
plain focus-layout fallback when unsupported or denied. The focus button, Escape
or exiting owned fullscreen restores the normal view and prior page position.
Escape closes an open options dialog first, without leaving focus view.

Options can place the calculator left or right of the tape in the two-column
layout and focus view. Mobile always keeps it above the tape. Position is an
appearance preference (not a calculation step); persistence uses the existing
opt-in “Remember settings on this device” appearance storage.

Whole-tape copy, print/PDF, CSV, JSON export and JSON import are icon buttons in
a horizontal sticky toolbar above the calculation title. Labels appear on hover
and keyboard focus. Left/right arrows, Home/End navigate the toolbar; Escape
dismisses its tooltip. The toolbar stays with the tape regardless of which side
the calculator occupies, including focus and mobile layouts.

The calculation title is displayed as a heading with a pencil button. Its modal
editor saves explicitly (Save/Enter); Cancel, Escape and backdrop dismiss changes.
Empty titles use a localized untitled heading. Title updates support undo/redo,
local saving and existing file/print exports.

Value and step name/note share a palette-tinted input panel. Value comes first,
with the name directly below; keyboard tab order follows the visual order.

The add/confirm key uses the Return arrow (↵). Its tooltip and accessible name
reflect add, edit or insert mode while the icon and button geometry stay fixed.
Physical Enter keeps its existing behaviour.

Each step has an accessible on/off slide switch at the top right beside the
operation, with visible Active/Disabled text. A separate bottom toolbar has icon
buttons for edit, insert, move up/down and delete. Localized tooltips appear on
hover/focus; arrows and Home/End navigate, skipping unavailable moves.

Each tape entry always heads with its step number and operation (for example,
“01 Startwert”). A non-empty custom note/name appears on a separate line below.
Notes never replace the operation heading; existing saved names remain intact.

Step cards have padded number badges, separate notes and explicit entered-value /
result columns. Input and result use the same selected display precision and font size. The input uses a distinct darker
palette tone; the result retains the strong arithmetic accent. Both have readable
light/dark variants. Original input precision is preserved in data, editing and the
value tooltip. Disabled steps keep their entered value (including %),
show a disabled badge and no applied result; following calculations skip them.

The book icon opens fictional example calculations in all four languages: a
monthly family budget, holiday planning and a tradesperson invoice calculation.
Values are illustrative euros, not statistical averages or complete invoices.
Examples use two-decimal per-step rounding and remain fully editable. Loading
requires confirmation before replacing existing calculations or drafts and is
undoable as one change. Appearance preferences are preserved.

The result display also shows the next operation on its right (symbol and label),
with the help button on the left. There is no separate operation tile.

## Calculation rules

Each active operation processes the previous result (table-calculator logic,
not algebraic operator precedence). Set replaces the result; notes/subtotals do
not change it. Percentage increase/discount use the running result. Tax removal
returns net = previous result / (1 + rate / 100). Tax rates are user-entered.
Exact reduced BigInt fractions avoid binary floating-point drift. Display-only
rounding is the default; optional per-step rounding uses half away from zero,
with 0–8 decimal places. Thus 1 / 3 × 3 is 1.00 by default or 0.99 with per-step
rounding at two decimals. No thousands separators; decimal point/comma accepted.
Limits: 500 steps, 24 integer/12 fractional input digits, 250-character internal
numerators/denominators, 100 undo snapshots. Errors invalidate following results;
correct/delete/disable the offending step to recover. Set does not bypass errors.

## Editing and data

No operation dropdown: standard operations use the keypad; seven adjacent special
keys select start/replace, percentage increase, discount, gross tax addition, included-tax removal,
subtotal and note. The selected operation is labelled and highlighted. Detailed
localized explanations appear only in a modal opened with the info button next
in the result display. Hovering or changing operations does not expand the
keypad. Escape or Close dismisses the explanation. Special keys preserve the entered value and are confirmed
with =.

Name/edit/insert/delete steps; disable without deleting; reorder with arrows or
drag-and-drop. Undo/redo cover calculation mutations, including new/import.
Typing digits outside an editable field routes them to the value field. Typing
letters outside a text field (or in the value field) starts/continues the step
name. This labels the current step without changing its operation. Existing
name/title edits, overlays, appearance menus, IME and modifier shortcuts are
left alone. Numeric input is not redirected into a disabled note/subtotal value.

Keyboard: enter adds a step; after entering a number, + - * / commits it and
selects the next operation. Consecutive operators replace the selection even in an empty field. Use ± or paste a signed number to enter a negative value. These
shortcuts act only in the value field, not in names/notes.

Saving the current calculation is separately opt-in and off by default:
`jacktools.calculator.document-consent.v1` and `jacktools.calculator.document.v1`.
Appearance saving uses the shared-tool convention with calculator-specific keys.
The footer's local-settings delete button removes both saved preferences and the
saved calculation, but leaves the currently visible calculation usable. Disabling
appearance saving does not remove the calculation. Undo history/draft input are
not persisted. Without saving, reload/language changes lose the calculation; a
browser navigation warning is requested after changes (browser-dependent).

JSON export/import is validated and versioned; no executable data is loaded.
CSV uses UTF-8 BOM, semicolon delimiters and quoting; formula-like cells are
prefixed with an apostrophe. Print/PDF provides a plain, named calculation tape
with active steps only and rounding rules. Files are browser downloads;
no calculation data is sent to a server. Local saving is not a backup—download
important work as JSON. No currency conversions or automatic tax-rate selection.

Currency is optional per-calculation metadata (`currency`, an allowlisted ISO code).
The default is no currency; older version-1 files without this field still load.
Currency labels appear on results, print/PDF, CSV and clipboard exports. JSON and
opt-in local document saving retain the selection, including undo/redo. Selecting
another currency never converts values or changes decimal places or rounding.
Print/PDF includes active steps only, with note, operation and result columns.

Usage notes are available in all four tool languages, with a shared localized
content model, linked contents and matching footer/hreflang links. They document
the current receipt view, keyboard behaviour, rounding, currency, opt-in saving
and the differences between JSON, CSV, clipboard and active-only print/PDF.
