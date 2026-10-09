import {demoProject,formats,fonts,animations} from './model';

// Single source for the localized AI pages, /ai/ and /ai.txt.
export const aiGuide = `# SceneScript format 1.0

Create editable animated presentations for the browser-based SceneScript editor.
This guide describes the existing format 1.0, not proposed features.

## Workflow: conversation first, project output last

Before creating a project, establish the topic, audience, format/aspect ratio,
visual style and desired total duration. Reuse information the user has already
provided; do not ask for it again. Ask only about missing details that materially
change the result. If the user explicitly requests no questions, proceed with
reasonable default assumptions based on their request.
Normal conversational replies are allowed during this planning phase. Resolve
any missing-image arrangements before delivering the final project.
For the final project output, return exactly one valid JSON object: no Markdown
fences, introduction, explanation or other text outside the JSON.
Do not generate executable code or additional fields to simulate unsupported
features. Plain-text content is never interpreted as HTML.

## Reading this specification

- Import requirements describe checks that reject invalid input. "Must" marks
  binding requirements for a valid project.
- Renderer behavior describes what actually happens, including accepted edge
  cases. Acceptance does not guarantee a useful visual result.
- Composition guidelines use "should" for recommendations, not import rules.

## Import requirements: structure, fields and defaults

The root must be a JSON object. Unknown fields are rejected at root, asset,
scene and element levels. Do not put $schema in project data.
Numbers must be finite JSON numbers, not numeric strings. Booleans must be
true or false, not strings or numbers. Colors must be six-digit #RRGGBB strings
(case-insensitive hex digits, no alpha channel or named colors).
All time fields use seconds. Ranges below include both endpoints.
String limits are measured with JavaScript string.length (UTF-16 code units);
for example, a supplementary Unicode character generally consumes two units.

### Root

Required fields:
- version: exactly "1.0".
- title: string, maximum 200 UTF-16 code units (empty is accepted).
- format: ${Object.entries(formats).map(([k,v])=>`"${k}" (${v[0]} × ${v[1]} project pixels)`).join('; ')}.
- scenes: ordered array of 1–100 scenes.
Optional: assets, an object mapping asset IDs to asset objects; default {}.
Project coordinates and text sizes are independent of the editor UI's font-size
and appearance settings. The stage is uniformly scaled to its displayed size;
the logical resolution is not a guarantee of recorded video resolution.

### IDs and references

Asset keys, scene IDs and element IDs must contain 1–100 ASCII letters, digits,
underscores or hyphens. Scene IDs must be unique across scenes. Element IDs must
be unique throughout the project. These are separate ID namespaces.
Every nonempty backgroundAsset or asset reference must resolve to an own key
in assets, even if the reference is irrelevant to the element's type.
Empty references must be "", not a URL, file path or an invented placeholder ID.

### Assets and image limits

Maximum 100 assets. Each asset must have exactly these required fields:
- name: string, maximum 200 UTF-16 code units; a display name, not a path to load.
- data: a nonempty Base64 data URL with one of these exact, lowercase prefixes:
  data:image/png;base64, or data:image/jpeg;base64, or data:image/webp;base64,
The Base64 payload must use the standard alphabet, complete four-character
blocks and appropriate trailing padding; whitespace and Base64URL are rejected.
External URLs, SVG data URLs and other MIME prefixes are rejected.

Each image must be at most 8 MiB of decoded image-file bytes, measured before
Base64 encoding. This means the bytes of the PNG/JPEG/WebP file, not the
uncompressed pixel buffer. The validator computes that byte count from payload
length and trailing padding; direct image upload also checks File.size.
The complete input JSON must be at most 30 MiB as UTF-8, including Base64 data,
all other fields and whitespace. File loading also checks the selected file's
byte size. Export checks the size of its complete, pretty-printed JSON Blob;
extra export indentation can make an otherwise near-limit project too large.
1 MiB = 1,048,576 bytes. Base64 adds approximately one third to file-byte size,
plus the data URL prefix, JSON and padding overhead.

The browser import path decodes every asset using Image.decode(), rejects
undecodable images and rejects naturalWidth × naturalHeight > 40,000,000 pixels
(40 megapixels per image). Direct image upload and recording-view preload use
this check too. parseProject itself checks structure, Base64 syntax and byte
limits, but does not decode images or check dimensions.
The file picker accepts exactly image/png, image/jpeg and image/webp MIME types;
its upload handler rejects another or missing File.type.

Encode actual image-file bytes only when you have access to both those bytes
and an encoding tool. Base64 must never be invented. Store each image once and
reuse its asset ID. If genuine image data is unavailable, do not create fake
asset objects: use only the existing empty asset/backgroundAsset references
and agree on later image import with the user before final JSON output.
An image element with asset "" displays the editor's image placeholder; a scene
with backgroundAsset "" uses only its background color. No additional placeholder
fields exist. In the UI, import the image, then choose it in the image element's
asset selector or the scene's background-image selector. Importing while an
image element is selected also assigns the new image to that element.

### Scenes

Each scene must have id and elements (an ordered array of 0–100 elements).
Later elements are painted on top of earlier elements.
Optional fields and their defaults:
- name: "Scene"; string, maximum 200 UTF-16 code units.
- duration: 5; number, 0.1–3600 seconds.
- background: "#263b42"; #RRGGBB color.
- backgroundAsset: ""; empty or an existing asset ID, maximum 100 code units.
- transition: "fade"; allowed "none" or "fade".
- transitionDuration: 0.5; number, 0.01–3600 seconds.
Scene durations add up to the total duration; transitions do not add time.

### Elements

Required: id and type. type must be "text", "image" or "shape" (a rectangle).
Optional fields and their defaults:
- text: "Your story starts here." for text, otherwise ""; string, max 10000
  UTF-16 code units.
- asset: ""; empty or an existing asset ID, max 100 code units.
- x: 10; y: 35; each -100 to 100, percentages of canvas width/height.
- width: 80; height: 30; each 0.1–200, percentages of canvas width/height.
- color: "#ffffff" for text/image, "#b86445" for shape; #RRGGBB color.
- font: "Arial"; allowed ${fonts.map(f=>`"${f}"`).join(', ')}.
- fontSize: 90; number, 1–500 project pixels, not percentages or UI pixels.
- align: "center"; allowed "left", "center", "right".
- runs: []; optional structured rich-text segments (see Rich text below).
- bold: false; boolean.
- italic: false; boolean.
- underline: false; boolean.
- strikethrough: false; boolean. These styles can be combined; omitted style flags default to false.
- opacity: 1; number, 0–1.
- rotation: 0; number, -360 to 360 degrees.
- radius: 0; number, 0–1000 project pixels.
- fit: "contain"; allowed "contain" or "cover".
- animation: "fade"; allowed ${animations.map(a=>`"${a}"`).join(', ')}.
- at: 0; number, 0 to the containing scene's duration, relative to scene start.
- animationDuration: 1; number, 0.01–3600 seconds.
Type-irrelevant fields are accepted, validated and preserved, but may have no
visual effect. All omitted optional element fields use these defaults.

### Omitted fields versus explicit null

Authoring guidance: omit optional fields to request defaults; do not emit null.
Actual validator behavior is asymmetric:
- Missing required fields are rejected.
- assets omitted OR assets: null is normalized to {}.
- Each optional scene field listed above uses its default when omitted OR null.
- Scene id/elements and asset name/data do not accept null.
- Every element field rejects explicit null, including otherwise optional fields:
  element defaults apply only to omitted fields, not explicit null.
- Root version/title/format/scenes do not accept null.
/schema.json describes the typed authoring structure, not every normalization
exception. Runtime validation/import is authoritative; the schema alone does
not enforce reference resolution, unique IDs, exact decoded image-byte limits,
per-scene at bounds, file size, browser image decoding or image dimensions.

## Renderer behavior: layout and appearance

x/y locate the element box's untransformed top-left corner. Percentages use the
canvas dimensions, not a parent element. width/height are box dimensions before
rotation/scaling. The element's own overflow is hidden, and the stage clips
anything extending beyond the canvas. Overlays/selection outlines are editor
controls, not JSON content; selection outlines are hidden in recording view.

### Text

Text is rendered with textContent, not HTML. There is no internal padding or
border on the text box. Line-height is the CSS/browser default "normal", not
an explicitly fixed ratio or editable field. Font metrics may differ by device;
fonts are local system fonts and can fall back when unavailable.
The text span is full box width, vertically centered by flex layout. align sets
horizontal text alignment. white-space: pre-wrap preserves explicit newlines
and whitespace, with normal browser wrapping at available break opportunities.
Long unbroken strings are not forcibly broken. Text too wide/tall is clipped to
the element box (including rounded corners), then to the canvas. No auto-fit,
automatic font-size reduction, overflow warning or padding/line-height field
exists. color controls the text foreground; bold controls its font weight; italic, underline and strikethrough enable the corresponding text styles.

### Images, backgrounds and shapes

An image element fills its box with an img sized to 100% width/height:
- contain preserves aspect ratio and shows the entire image, centered on both
  axes; unused space is transparent, exposing lower layers/background.
- cover preserves aspect ratio, fills the box, and centrally crops excess.
No object-position field exists. Background images always use centered cover
across the whole canvas, above the background color and below all elements.
color does not tint an actual image. It is the container's foreground color
and can affect the text of an empty-image placeholder, not image pixels.
For shape, color is the rectangle's solid background color; text is not drawn.
radius sets the element container's rounded corners for every type: it clips
text and images and rounds shape fills. Large radii follow browser CSS border-
radius normalization. A scene background image has no radius field.

### Transforms and clipping

Elements rotate and scale about their box center (the default 50% 50% origin).
The actual CSS transform is rotate(...) translate(...) scale(...); with a
nonzero rotation, slide translation follows the rotated coordinate system.
zoom and pan scale the entire container, including its content, box and rounded
clipping boundary; they do not move an image within a fixed-size crop box.
Expanded elements may extend beyond their original layout boxes; the canvas
still clips them. The stage's uniform display scaling has a top-left origin.

## Renderer behavior: timing, animations and fades

Let localTime be time since scene start. An element is hidden when localTime < at.
Its animation progress is clamped to 0–1:
  progress = clamp((localTime - at) / animationDuration, 0, 1)
Slide/zoom easing is 1 - (1 - progress)^3 (cubic ease-out).

- none: appears immediately at at with the configured opacity. animationDuration
  has no visual effect here, but must still be within 0.01–3600 for validation.
- fade: element opacity = configured opacity × progress (linear).
- slide-left: translates from 80 project pixels to the right to zero, eased.
- slide-up: translates from 80 project pixels below to zero, eased.
- zoom: scales from 70% to 100%, eased.
- typewriter: displays floor(codePointCount × progress) Unicode code points of
  text. It uses Array.from, NOT grapheme clusters. Combining marks, flags and
  joined emoji can therefore appear in parts; complete emoji/grapheme handling
  is not guaranteed. The partially revealed text is laid out again as it grows.
  This affects text elements only; it does not reveal image or shape pixels.
- pan: a slow linear zoom from 100% to 110%, with NO sideways panning. It does
  not repeat, and holds 110% after animationDuration.
For animations other than fade, element opacity is the configured opacity.
Elements remain until their scene ends; there are no exit animations.

While playback is running and transition is "fade", the scene fade factor is
min(1, localTime / transitionDuration). It multiplies each element's animated
opacity and also the background image's opacity. With an element fade, the
combined opacity is configured opacity × element progress × scene fade factor.
The background COLOR is immediately present and does not fade. This is a fade-in
of new-scene content over its own color, not a crossfade from the previous scene.
The background image participates in this fade even when all elements use none.
With transition "none", the scene factor is 1.
Current preview behavior: scene fades apply only while playing. Pausing, seeking
or displaying the stopped final frame sets the scene factor to 1; element
animation progress still follows the selected time. This may change brightness
when pausing a still-incomplete scene fade.

### Accepted timing edge cases (not additional rejection rules)

- at + animationDuration > scene.duration: accepted, not shortened by validation.
  Progress remains below 1 at scene end; playback cuts to the next scene or
  stops on the final scene's partial animation. There is no animation tail time.
- transitionDuration > scene.duration: accepted, not shortened by validation.
  The scene fade remains incomplete during playback. The next scene replaces it;
  a stopped final frame removes the scene-fade factor as described above.
- at == scene.duration: accepted. Non-final scenes switch to the next scene at
  that boundary, so the element has no visible interval during normal playback.
  On the final scene's stopped endpoint it is eligible to be shown at progress 0:
  none/slides/zoom/pan can appear in their initial state; fade is transparent and
  typewriter has revealed no text. Use at < scene.duration for visible content.
- animationDuration with none: accepted and still range-checked, but ignored
  visually. Zero is rejected even for none.
At exact intermediate scene boundaries, the next scene is selected with local
 time 0. At or beyond total duration, the last scene is displayed at its endpoint.
No audio tracks, video assets, arbitrary code/keyframes, loops, new element types
or exit animations are supported by this format.

## Composition guidelines

These are recommendations, not extra import requirements:
- You should prefer one central message per scene and a clear visual hierarchy.
- You should size element boxes and fonts for the chosen format, not assume that
  a layout for landscape fits portrait unchanged.
- Unless the user requests a different layout, important text should stay inside
  the available safe-zone guideline: 12% left/right, 10% top, 18% bottom.
  This is NOT a guaranteed platform-specific safe zone. The overlay is optional
  in the editor and hidden in recording view; it does not change the project.
- Text should be short; estimate whether it fits its box. If space is tight,
  shorten the text or adjust the layout, rather than relying on automatic fit.
- You should leave enough reading time after entrances finish. Normally choose
  at + animationDuration <= scene.duration and transitionDuration <= duration
  for completed entrances/fades, but these are recommendations, not hard limits.
- Animation should support the message; do not automatically animate everything.
  For static content, choose animation "none" and transition "none".
No universal font size or reading speed is a technical requirement. Preview and
check the project on the intended output size before recording.

## Recording, editing and delivery

The editor targets tablets and computers: at least 768 CSS pixels of browser
viewport width. Below that width, a device-size notice replaces the editor;
the AI documentation stays accessible. This does not restrict portrait projects
or videos intended for smartphone audiences.
The existing UI edits the same project data. JSON/file import normalizes omitted
fields to defaults. Save as downloads a self-contained .scenescript.json file.
The recording view preloads assets and waits for document.fonts.ready, shows a large Play button and waits for the user to start, allowing the browser
fullscreen notice to disappear. Clicking Play (or pressing Space while ready)
starts a three-second countdown, followed by the entire project. Space pauses/resumes; Escape
exits. The mouse cursor is visible on the ready screen, hidden from countdown start
through playback, and restored on exit. Mouse movement/tapping reveals an exit button.
A screen wake lock is requested during playback and the recording countdown,
released on pause/end/exit, and reacquired when active playback returns to a
visible tab. Browser support, permissions and system policy can prevent it;
if unavailable, disable device screen sleep manually for recording. Fullscreen is requested
when supported, with a CSS focus-view fallback. Use a separate screen recorder;
SceneScript does not record or export a video file itself. Leaving recording
view restores the previous editor scene, selected element and timeline position;
the project and unsaved changes are retained.

This English specification has one shared source, served at /ai/, /de/ai/,
/en/ai/, /es/ai/, /fr/ai/ and /ai.txt on the current server. /schema.json provides
the structural schema; /example.scenescript.json provides the example below.
These are existing static routes; no new API or hosting is required.

## Complete valid example (no images required)
${JSON.stringify(demoProject(),null,2)}


## Rich text (format 1.0 extension)
Text elements may include a \`runs\` array (maximum 2000 entries). Each entry has
\`text\` and optional \`font\`, \`fontSize\`, \`color\`, \`bold\`, \`italic\`, \`underline\`,
\`strikethrough\` overrides, with the same ranges and allowed values as the element.
Missing overrides inherit the element's defaults. No HTML, CSS, links or scripts
are accepted. Newlines are encoded as \\n inside run text.
When runs is nonempty, its concatenated text is authoritative; supply a matching
\`text\` value for compatibility. When runs is omitted or empty, ordinary \`text\`
continues to work. Total combined text is limited to 10000 characters.
Alignment, opacity, radius, geometry and animation always apply to the whole block.
Typewriter reveals Unicode characters across runs while preserving their styles.
Example:
\`\`\`json
{"id":"headline","type":"text","text":"Hello world","runs":[{"text":"Hello "},{"text":"world","bold":true,"color":"#ff8800"}]}
\`\`\`
`;
