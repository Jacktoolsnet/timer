import {demoProject,formats,fonts,animations} from './model';

// Single source for the localized AI pages, /ai/ and /ai.txt.
export const aiGuide = `# SceneScript format 1.0

Create editable animated presentations for the browser-based SceneScript editor.
This guide describes the existing format 1.0, not proposed features.

## Project background music

Optional root field music (null/omitted means silent). Music runs continuously across
scene changes, pauses with playback and seeks with the project timeline. Recording
countdown is silent. Enable system/tab audio in your screen recorder.
No audio files, lyrics, executable expressions, or realistic sampled instruments.
These are synthetic timbres, NOT an external AI audio-generation service.

music fields and defaults: enabled true; mode "generated" or "score" (default
"generated"); style "calm", "focus", "uplifting" (default "calm"); tempo 40–180
BPM (72); key integer MIDI 48–72 (60); seed uint32 (1); volume 0–1 (.35);
fadeIn/fadeOut 0–10 seconds (1/2); instruments 1–8; notes max 10000.
Generated music uses instrument 1 for chords, 2 for melody (or 1 if absent),
3 for bass if present. Later instruments are only used by explicit score notes.
Style changes rhythms/harmony, not instrument settings. Seed is reproducible.
Default instruments are pad, handpan, bass; UI also offers kalimba, harp and bell
presets. Preset names are NOT instrument JSON types: describe each timbre explicitly.

Each instrument has unique id (ASCII letters/digits/_/-, 1–100 characters), name
(max 100), wave sine/triangle/sawtooth/square/noise; partials 1–8 objects with ratio
.25–16 and gain 0–1 (at least one positive). Partials are normalized; ratio 1 is
fundamental, 2 is an octave. Noise ignores pitch/partials and uses seeded noise.
ADSR: attack 0–2 s, decay 0–3 s, sustain 0–1, release 0–5 s; volume 0–1;
filter none/lowpass/highpass/bandpass; cutoff 40–20000 Hz (limited to rendering
Nyquist), resonance .1–10. echo {delay:.05–1 seconds,feedback:0–.6,mix:0–.5}
uses six repeats; reverb 0–.5 adds a short synthetic room. Unspecified instrument
fields use pad defaults (not the preset suggested by its name): name=id,
wave=sine, partials=[{ratio:1,gain:1},{ratio:2,gain:.15}], attack=.3, decay=.5,
sustain=.7, release=1.2, volume=.35, filter=lowpass, cutoff=1800, resonance=.7,
echo={delay:.25,feedback:.2,mix:0}, reverb=.22.
Numbers above are explanatory; JSON numbers must use a leading zero (0.3, not .3).

Score notes: {instrument:"ID",at:0,duration:1,pitch:60,velocity:.7}.
at is absolute PROJECT seconds, within project duration; duration .05–16 seconds
is held duration before release, pitch integer MIDI 21–108 (69 = A440), velocity
0–1. Notes must reference existing IDs. Maximum 32 overlapping audible notes,
INCLUDING release and effect tails. Note tails are cut at project end.
Use mode "score" for specific melodies/chords; tempo does not rescale explicit
second-based notes. All instrument parameters and notes are editable in the UI.
Example optional root music property:
{"enabled":true,"mode":"score","volume":0.3,"instruments":[
 {"id":"glass","name":"Soft glass","wave":"sine","partials":[
 {"ratio":1,"gain":1},{"ratio":2.71,"gain":0.12}],"attack":0.01,
 "decay":0.4,"sustain":0.1,"release":1.2,"volume":0.5,
 "filter":"lowpass","cutoff":5000,"resonance":0.7,
 "echo":{"delay":0.3,"feedback":0.2,"mix":0.1},"reverb":0.15}],
 "notes":[{"instrument":"glass","at":0,"duration":0.5,"pitch":60,"velocity":0.7},
 {"instrument":"glass","at":1,"duration":0.5,"pitch":64,"velocity":0.6}]}

## Embedded videos

Optional root videos: object of max 30 unique IDs mapping to
{name:"clip.webm",data:"data:video/webm;base64,...",duration:12.4}.
Each file max 32 MiB decoded; whole JSON max 160 MiB. duration is the ACTUAL
finite duration in seconds (.001–86400), verified by browser decoding on import.
WebM and MP4 are supported when the browser supports their codecs; other video
MIME types are accepted only if the browser can decode them. Standalone files
only: playlists and external streams (HLS/DASH) are not supported. Never invent Base64
or duration: obtain real video bytes/metadata or ask the user to import a file.
Videos are embedded once and referenced across scenes; no external URLs/scripts.

Element type "video" uses video settings instead of image asset:
video:{asset:"clip",start:3.5,end:35.6,loop:false,muted:true,volume:1,fit:"contain"}.
start defaults 0; end null means file end; 0 <= start < end <= actual duration.
loop repeats ONLY the selected range; otherwise the last frame remains visible.
muted defaults true, volume 0–1, fit contain/cover (default cover).
Element at is the scene entry time; video elapsed time = scene time minus at.
Regular position, dimensions, opacity, rotation and entrance animations apply.
Optional root backgroundVideo uses the SAME settings, with global project time.
It continues across scenes underneath their backgrounds and elements; disable
scene backgrounds or lower their opacity to see it. Project simulation is below
project video. Pause, seek and restart follow the presentation; countdown is silent
and frozen. Enable tab/system audio in the recorder if video sound is wanted.
Large projects should be saved as files; browser local storage is limited.

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
Optional: music, null (default) or a music object (see Project background music above).
Optional: backgroundSimulation, null (default) or a simulation object (see Simulations below).
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
  data:image/png;base64, data:image/jpeg;base64, data:image/webp;base64,
  or data:image/svg+xml;base64,
The Base64 payload must use the standard alphabet, complete four-character
blocks and appropriate trailing padding; whitespace and Base64URL are rejected.
External URLs and other MIME prefixes are rejected. SVG is validated using the
safe SVG profile below, not accepted as arbitrary executable markup.

Each raster image must be at most 8 MiB; SVG must be at most 1 MiB of UTF-8 bytes, measured before
Base64 encoding. This means the bytes of the PNG/JPEG/WebP file, not the
uncompressed pixel buffer. The validator computes that byte count from payload
length and trailing padding; direct image upload also checks File.size.
The complete input JSON must be at most 160 MiB as UTF-8, including Base64 data,
all other fields and whitespace. File loading also checks the selected file's
byte size. Export checks the size of its complete, pretty-printed JSON Blob;
extra export indentation can make an otherwise near-limit project too large.
1 MiB = 1,048,576 bytes. Base64 adds approximately one third to file-byte size,
plus the data URL prefix, JSON and padding overhead.

The browser import path decodes every asset using Image.decode(), rejects
undecodable images and rejects naturalWidth × naturalHeight > 40,000,000 pixels
(40 megapixels per image). Direct image upload and recording-view preload use
this check too. parseProject itself checks structure, Base64 syntax and byte
limits and validates SVG XML, but does not decode raster images or check dimensions.
The file picker accepts PNG, JPEG, WebP and SVG. SVG is recognized by
image/svg+xml or a .svg filename and validated before it enters the project.
Other images require a supported raster MIME type.

Encode actual image-file bytes only when you have access to both those bytes
and an encoding tool. Base64 must never be invented. Store each image once and
reuse its asset ID. If genuine image data is unavailable, do not create fake
asset objects: use only the existing empty asset/backgroundAsset references
and agree on later image import with the user before final JSON output.
An image element with asset "" displays the editor's image placeholder; a scene
with backgroundAsset "" uses its background color or backgroundGradient. No additional placeholder
fields exist. In the UI, import the image, then choose it in the image element's
asset selector or the scene's background-image selector. Importing while an
image element is selected also assigns the new image to that element.

### Scenes

Each scene must have id and elements (an ordered array of 0–100 elements).
Element array order defines back-to-front stacking: elements[0] is behind
elements[1], and the last element is in front. Backgrounds are behind all elements.
The editor list uses the same order: moving an element up sends it backward,
moving it down brings it forward. Selection does not change its layer.
There is no separate zIndex field.
Later elements are painted on top of earlier elements.
Optional fields and their defaults:
- name: "Scene"; string, maximum 200 UTF-16 code units.
- duration: 5; number, 0.1–3600 seconds.
- background: "#263b42"; #RRGGBB color.
- backgroundEnabled: true; boolean. False hides scene color/gradient and background image, revealing the project simulation. Background settings are retained; scene elements are unaffected.
- backgroundOpacity: 1; number 0–1, applies to the scene color/gradient and background image only, not its elements.
- backgroundGradient: null; optional gradient object (see Gradients below).
- backgroundAsset: ""; empty or an existing asset ID, maximum 100 code units.
- transition: "fade"; allowed "none", "fade", "crossfade", "slide-left", "slide-right", "slide-up", "slide-down", "wipe-left", "wipe-right", "wipe-up", "wipe-down", "zoom-in", "zoom-out", "through-black".
- transitionDuration: 0.5; number, 0.01–3600 seconds.
Scene durations add up to the total duration; transitions do not add time.

### Elements

Required: id and type. type must be "video", "text", "image", "shape" (a geometric form) or "simulation".
Optional fields and their defaults:
- simulation: null for text/image/shape, default particles configuration for simulation elements; simulation elements must not explicitly set this to null.
- text: "Your story starts here." for text, otherwise ""; string, max 10000
  UTF-16 code units.
- asset: ""; empty or an existing asset ID, max 100 code units.
- x: 10; y: 35; each -100 to 100, percentages of canvas width/height.
- width: 80; height: 30; each 0.1–200, percentages of canvas width/height.
- color: "#ffffff" for text/image, "#b86445" for shape; #RRGGBB color.
- font: "Arial"; allowed ${fonts.map(f=>`"${f}"`).join(', ')}.
- fontSize: 90; number, 1–500 project pixels, not percentages or UI pixels.
- align: "center"; allowed "left", "center", "right".
- name: ""; optional display title, at most 200 characters. Does not change rendered text or IDs.
- shapeType: "rectangle"; allowed "rectangle", "ellipse", "triangle", "diamond", "star", "arrow". Used by shape elements only.
- fillGradient: null; optional gradient object (see Gradients below), for shapes.
- fillColor: shape fill color (#RRGGBB) or "none". Omitted uses legacy color.
- borderColor: "none"; #RRGGBB or "none", for shapes.
- borderStyle: "solid"; allowed "solid", "dashed", "dotted", "double". Shape outline line style; ignored when borderColor is "none" or borderWidth is zero. A double line needs sufficient width (at least 3 project pixels) to be visible.
- borderWidth: 4; number, 0–500 project pixels. Zero hides the border. The border is inside the existing element bounds and follows radius; rendered width is clamped to half the smaller shape dimension.
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
- Element fillGradient accepts explicit null, meaning solid/no gradient.
- Element simulation accepts null except on type "simulation", which requires a simulation object.
- Other element fields reject explicit null, including otherwise optional fields:
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
exists. For shapes, fillColor and borderColor independently support "none"; both may be transparent.
color controls the text foreground; bold controls its font weight; italic, underline and strikethrough enable the corresponding text styles.

### Images, backgrounds and shapes

An image element fills its box with an img sized to 100% width/height:
- contain preserves aspect ratio and shows the entire image, centered on both
  axes; unused space is transparent, exposing lower layers/background.
- cover preserves aspect ratio, fills the box, and centrally crops excess.
No object-position field exists. Background images always use centered cover
across the whole canvas, above the background color and below all elements.
color does not tint an actual image. It is the container's foreground color
and can affect the text of an empty-image placeholder, not image pixels.
For shape, fillColor sets the selected form’s fill (or "none"); missing fillColor inherits
legacy color. borderColor independently sets its outline (or "none"). Text is not drawn.
radius sets the element container's rounded corners for every type: it clips
text and images and rounds rectangle fills. For non-rectangle shapes, radius is ignored. Large radii follow browser CSS border-
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
  This affects text elements only; it does not reveal image, shape or simulation pixels.
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

## Additional scene transitions
The transition belongs to the incoming scene and runs during its first
transitionDuration seconds. It never adds time to the project. Directions name
the movement/reveal direction (slide-left brings the next scene from the right).
- crossfade: the full incoming scene, including background, blends over the previous scene.
- slide-left/right/up/down: push the previous scene out while moving the incoming scene in.
- wipe-left/right/up/down: progressively reveal the incoming scene over the previous scene.
- zoom-in: incoming scene scales from 0.7 to 1 while blending over the previous scene.
- zoom-out: incoming scene scales from 1.3 to 1 while blending over the previous scene.
- through-black: first half fades the previous scene to black; second half fades
  the incoming scene from black. At the midpoint the entire frame is black.
  Without a previous scene the first half stays black.
The previous scene is held at its final element-animation state; its entry
transition is not replayed. On the first scene, these transitions start over black.
Progress is linear, clamped to 0–1; unlike the legacy fade-in, these new
transitions also retain their exact state when pausing or seeking.
The same renderer is used in compact preview, expanded preview and recording.
All existing element animations run independently during the scene transition.
Existing none/fade values and their behavior remain supported.

Shape geometry: triangle points up; arrow points right (use rotation to change
orientation); star has five outer points. Ellipse becomes a circle only when its
rendered width and height match. Geometry fills the configured percentage bounds;
width/height percentages use different canvas axes, so equal percentages do not
necessarily create a circle. Non-rectangles use built-in SVG geometry with no
external SVG imports. Fill, border color, width and all four line styles follow
the real contour. Both fill and border may be "none". Default/missing shapeType
is rectangle, preserving older projects. Radius applies only to rectangles.

## Safe SVG assets and deterministic animation
SVG assets use data:image/svg+xml;base64, encoding the actual UTF-8 SVG source.
Maximum 1 MiB source bytes, 2000 elements, 32 nesting levels and 100 animations.
An SVG asset can be used by an image element or as a scene background. Normal
asset references, fit, geometry, element animations and scene transitions apply.
Import errors reject the SVG rather than silently stripping unknown features.

Require a root svg element with xmlns="http://www.w3.org/2000/svg" and a positive
viewBox, or positive numeric width/height from which a viewBox can be derived.
Supported static elements: svg, g, defs, path, rect, circle, ellipse, line,
polyline, polygon, text, tspan, linearGradient, radialGradient, stop, clipPath,
title, desc. Nested svg roots are not supported. IDs must be unique identifiers
starting with a letter or underscore; references use only url(#local-id).
Gradient references are permitted for fill/stroke, clipPath references for
clip-path. Nested clipping and missing references are rejected. The renderer
prefixes IDs separately for each instance to avoid collisions.
Standard geometry, transform (matrix/translate/scale/rotate/skewX/skewY), paint,
opacity, stroke style, basic text/font attributes and gradient attributes are
supported. Numeric values must be finite and bounded to ±100000. Prefer explicit
attributes. Inline style declarations are accepted ONLY for supported paint,
stroke, opacity, clipping and basic font properties and converted to attributes.

No scripts, on* handlers, links, external references, href/use, foreignObject,
embedded image, filter, mask, style element, CSS animations, remote fonts,
DOCTYPE, entities or XML processing instructions (apart from the XML declaration).
This is a deliberately limited profile, not a full SVG editor or arbitrary SVG player.

Supported animations are animate and animateTransform on graphic parents:
- animate: attributeName may be opacity, fill, stroke, fill-opacity,
  stroke-opacity, stroke-width, stroke-dashoffset, x/y, x1/y1/x2/y2, cx/cy,
  r/rx/ry, width/height. Animated paint must be a color, not a URL/reference.
- animateTransform: attributeName="transform", type="translate", "scale" or "rotate".
- Provide dur (0.01–3600 seconds) and either from/to or values (max 200 entries).
- begin defaults to 0; only a numeric time from 0–3600 seconds is supported.
  Timing accepts seconds, an s suffix or ms. No event-based or chained begins.
- repeatCount defaults to 1; a positive number up to 1000 or indefinite is allowed.
- fill may be freeze or remove; calcMode may be linear, discrete or spline.
  Optional keyTimes must match values and monotonically cover 0–1; keySplines
  must contain four 0–1 values per segment. No additive/accumulated animation.

During preview/recording, SceneScript pauses the SVG's own clock and explicitly
sets its time from the project playhead. Image element SVG time is
max(0, sceneLocalTime - element.at); background SVG time is sceneLocalTime.
Thus countdowns do not advance SVG animation, pause freezes it, seeking rewinds
it and repeated recording starts from the same state. During transitions the
previous SVG scene is held at its final time. Asset thumbnails may animate
independently and are not the authoritative presentation preview.
Example SVG source (encode these exact UTF-8 bytes with a real encoding tool):
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <circle cx="30" cy="50" r="15" fill="#ff8800">
    <animate attributeName="cx" from="30" to="170" dur="2s" repeatCount="indefinite" />
  </circle>
</svg>

## Gradients (optional, format 1.0)
Scene.backgroundGradient and shape element.fillGradient accept null (default,
legacy solid color) or this object:
{"type":"linear","angle":90,"x":50,"y":50,"stops":[
 {"color":"#263b42","position":0,"opacity":1},
 {"color":"#ff8800","position":50,"opacity":0.8},
 {"color":"#ffffff","position":100,"opacity":0}
]}
Types: linear, radial, conic. angle: -360..360 degrees, default 90; CSS convention:
0 points up, 90 right. Conic angle is its starting angle, clockwise.
x/y: center in percent 0..100, default 50; used by radial/conic only.
Radial uses an ellipse reaching the farthest corner.
stops: 2..16, sorted ascending by position (0..100 percent), #RRGGBB color,
opacity 0..1 (default 1). Equal positions produce hard edges. No repeating gradients.
Gradients override the solid scene background / shape fillColor; null restores it.
A transparent gradient shows content behind it, not the fallback solid color.
The stage behind scene layers is black (or the outgoing scene during a transition).
Shape borders remain independent. All six shape types support all three gradients.
Scene background images render above the gradient; transparent images reveal it.
The editor's None fill switch clears the gradient and sets fillColor to "none".
Keep background and fillColor as valid legacy solid colors (or "none" for fillColor).
Gradients are static, deterministic and included in JSON save/import.

## Simulations: particles, snow and bubbles (format 1.0)
Two uses:
1. Project.backgroundSimulation: null (disabled by default) or a simulation object.
   It uses absolute project time, starting at zero. It remains a single background
   behind all scene layers and does not restart, slide or zoom on scene changes.
   Set scene.backgroundEnabled to false to reveal it, or keep it true with
   backgroundOpacity between 0 and 1 for a tint (0 hides the background too).
   An opaque scene background hides the simulation but does not stop its clock.
2. Element.type: "simulation", with an element.simulation object.
   It has a transparent background and uses scene-local time minus element.at,
   clamped to zero. Standard x/y/width/height, rotation, opacity, radius, layer order,
   at and entrance animation controls also apply. It restarts at the start of its
   containing scene, unlike the project-level background.
Example simulation object:
{"type":"snow","color":"#ffffff","count":60,"speed":1,"size":6,"opacity":0.75,"seed":1}
Required type: particles, snow or bubbles. Other fields default as follows:
color #ffffff; count 60 (integer 1..200); speed 1 (0.1..5 multiplier);
size 5 for particles, 6 for snow, 18 for bubbles (1..100, particle radius in project pixels); opacity 0.75 (0..1);
seed 1 (integer 0..4294967295).
Switching effect types also updates size if it still equals the old type's default;
custom sizes and other settings are preserved. Imported omitted sizes use the
selected type's default.
Each scene supports at most 5000 particles across its simulation elements plus
the project simulation. Prefer a few effects with modest counts for recording.
Particles float upward and pulse softly; snow drifts downward; bubbles rise
with transparent interiors and highlighted outlines.
Trajectories are computed from time and seed, never from a wall-clock random
generator or incremental per-frame state. Pause, seek, replay and recording use
the same timeline. Outgoing scene-element simulations freeze at that scene's
end during a transition, while the project simulation keeps its global clock.
Through-black transitions temporarily cover the project simulation, without
resetting it. Transparent scene areas otherwise reveal the live simulation.
Canvas rendering uses bounded backing resolution for performance; no external
assets, scripts, physics engine, sound or executable expressions are supported.
Fire and waves are not yet available. Do not invent simulation types.
`;
