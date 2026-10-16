import {demoProject,formats,fonts,animations,newElement} from './model';
import {defaultTextEffects} from './text-effects';
import {applyTextPreset,textPresets} from './text-presets';

// Single source for the localized AI pages, /ai/ and /ai.txt.
export const aiGuide = `# SceneScript format 1.0

Create editable animated presentations for the browser-based SceneScript editor.
This guide describes the existing format 1.0, not proposed features.

## Project background music

Optional root field music (null/omitted disables generated music). Music runs continuously across
scene changes, pauses with playback and seeks with the project timeline. Recording
countdown is silent. Enable system/tab audio in your screen recorder.
The music object provides no lyrics/vocals fields, executable expressions or
realistic sampled instruments. Lyrics may be ordinary displayed text. Imported
speech uses audios/narration separately; embedded video audio is also supported.
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

The root videos map stores at most 30 video assets, each once, for reuse across
scenes and the project background. Each asset has exactly three required fields:
- name: string, at most 200 UTF-16 code units; display name, not a file path.
- data: nonempty standard Base64 data URL, data:video/<MIME-subtype>;base64,<bytes>.
  The runtime matches the prefix case-insensitively; use canonical lowercase
  prefixes such as data:video/webm;base64, or data:video/mp4;base64, for authoring.
  MIME subtypes contain ASCII letters/digits, dots, plus signs or hyphens.
  Base64URL/whitespace are not accepted; the payload length must be a multiple
  of four, with at most two trailing padding characters. Maximum 32 MiB decoded
  bytes per video; the complete input JSON is limited to 160 MiB UTF-8.
  MIME strings containing mpegurl, dash+xml or playlist are rejected.
- duration: required finite number, 0.001–86400 seconds. Supply the real file
  duration, not the selected excerpt length. The browser import/recording preload
  decodes every video and rejects a measured duration differing by more than
  0.2 seconds. parseProject checks metadata/bytes syntactically, not media codecs,
  actual duration or the presence of a sound track.
A schematic asset entry is {name:"clip.webm",data:"data:video/webm;base64,...",duration:40}.
The ellipsis is NOT importable video data. Never invent Base64 or duration: obtain
real bytes/metadata or agree on later user import. WebM/MP4 and other standalone
video files require browser support for their actual codecs. External URLs,
playlists and external HLS/DASH streams are not supported.

Video settings are shared by element.video and root backgroundVideo:
- asset: "" by default; empty or an own key in the root videos map, max 100 code
  units. This is the VIDEO namespace, not the images in assets.
- start: 0 by default; finite number, 0 <= start < the referenced duration.
- end: null by default, meaning referenced file end; a finite explicit end must
  satisfy start < end <= duration. This is an absolute file timestamp, not a length.
- loop: false by default; boolean. True repeats ONLY [start, end) for as long as
  the element/project remains active, not the whole scene or presentation.
- muted: true by default; boolean. Set false to request embedded video audio.
- volume: 1 by default; finite number 0–1. No sound is synthesized for silent files.
- fit: "cover" by default; "contain" or "cover", centered in the video box.
All settings are optional inside an object; unknown setting keys are rejected.
Explicit null is accepted for the whole settings object and end only; all other
settings reject null. When asset is "", range validation uses 86400 seconds as
its upper duration bound. Thus start < 86400 and numeric end <= 86400 still apply,
even though no video is played. {} normalizes to the full default settings object,
not to null. An omitted end remains null in normalized JSON (not a numeric duration).
Example settings for a genuine 40-second clip:
{asset:"clip",start:3.5,end:35.6,loop:false,muted:true,volume:1,fit:"contain"}.

For a video element, elapsed time is scene-local time minus element.at. Its
box uses ordinary position, dimensions, opacity, rotation, radius, stacking and
entrance-animation settings. A non-looping excerpt pauses at its last selected
frame (the timeline target is end - 0.001 seconds, clamped no earlier than start);
it remains visible until scene end, but its audio stops at the selected end.
Looping maps elapsed time modulo excerpt length. Pausing/seeking uses the same
videoTime mapping. Native video playback seeks when drift exceeds the renderer's
threshold, so it is synchronized playback, not guaranteed frame-accurate decoding.
Outgoing-scene video views are frozen and muted during transitions. In live preview/recording, active-scene
video audio is gated by playback/countdown and scene-fade audibility, not by
individual element.opacity; even an element with opacity 0 can be audible.

backgroundVideo uses global project time, starts at project time zero and continues
across scenes. It is above the project simulation but beneath all scene layers;
opaque scene backgrounds may hide it visually without muting its audio. Disable
scene backgrounds or lower their opacity to reveal it. Null or an empty asset
reference gives no project video. Countdown is silent/frozen; pause stops audio.
Autoplay policies can prevent native playback/audio. Enable tab/system audio in
a screen recorder when sound is wanted. Direct file export has separate codec
requirements (see Recording, editing and delivery). Save large projects as files;
browser local storage is limited.

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
All time fields use seconds. Ranges below include both endpoints unless a strict
inequality is stated (notably video start/end ranges).
String limits are measured with JavaScript string.length (UTF-16 code units);
for example, a supplementary Unicode character generally consumes two units.

### Root

Required fields:
- version: exactly "1.0".
- title: string, maximum 200 UTF-16 code units (empty is accepted). Use a suitable video/upload title.
- format: ${Object.entries(formats).map(([k,v])=>`"${k}" (${v[0]} × ${v[1]} project pixels)`).join('; ')}.
- scenes: ordered array of 1–100 scenes.
Optional fields:
- description: plain-text string, maximum 5000 UTF-16 code units, default "".
  A useful upload description; line breaks are allowed. Explicit null is rejected.
- firstComment: plain-text string, maximum 5000 UTF-16 code units, default "".
  Suggest a useful first comment to post below the video (for example a question
  inviting discussion). Line breaks are allowed; explicit null is rejected.
  Publication metadata only: not rendered in scenes or posted automatically.
- hashtags: string, maximum 2000 UTF-16 code units, default ""; explicit null is
  rejected. Author a comma-separated list, e.g. "#SceneScript, #Video" (NOT an
  array). The validator checks type/length, not hashtag syntax or comma placement.
- music: omitted/null means disabled; otherwise a music object (see Project background music).
- backgroundSimulation: omitted/null means disabled; otherwise a simulation object (see Simulations).
- thumbnail: omitted/null disables the publication cover image. Otherwise an
  independent object with REQUIRED name (string, max 200 UTF-16 code units) and
  data (PNG/JPEG/WebP base64 data URL, max decoded 8 MiB). Unknown keys are rejected.
  This is embedded image data, NOT an assets ID, URL, path or SVG. It has no ID
  namespace, is not counted in the 100 image assets and is not scene content.
  The editor also decodes it and enforces the shared 40-megapixel image limit.
  Users can import/replace it using the thumbnail plus button, open a large
  preview, download the original image separately, or remove it. It is stored
  in project JSON and counts toward the total 160 MiB JSON limit, but is never
  rendered in the presentation or included in the exported video.
  Prefer a landscape 16:9 cover for a conventional video; this is authoring
  guidance, not a validation rule or guarantee of platform upload acceptance.
  Example structure: {"thumbnail":{"name":"cover.png",
  "data":"data:image/png;base64,<ACTUAL ENCODED IMAGE BYTES>"}}. The placeholder
  is NOT valid data; omit thumbnail until a real image is available. A text-only
  model must not invent base64 audio/image bytes. The generating agent needs
  actual image-generation/file tools, or the user can import the file manually.
- audios: independent audio-ID to {name,data,duration} map; omitted/null becomes {}.
- narration: omitted/null disables the project-wide voice track. See Embedded audio.
- audioDucking: boolean, default false; null rejected. Lowers synthetic project music
  during active narration, not video audio or other narration. See Embedded audio.
- assets: object mapping image IDs to assets; omitted/null normalizes to {}.
- videos: object mapping video IDs to video assets; at most 30. Omitted/null
  normalizes to {}. Entries require name/data/duration; see Embedded videos for
  types, limits and browser checks. References resolve against this map only.
- backgroundVideo: omitted/null normalizes to null (no project video); otherwise
  a video-settings object as described in Embedded videos. {} gets all playback
  defaults, including asset "", and produces no video; a nonempty asset must
  resolve in videos. A reference is validated even when muted or hidden.
Title, description, firstComment and hashtags are editable publication metadata stored in
project JSON, not scene content or MP4/WebM container metadata. Each has its own
clipboard button. For a complete video draft provide suitable values for all
three. No automatic upload or platform-specific length/content guarantees exist.
Project coordinates and text sizes are independent of the editor UI's font-size
and appearance settings. The stage is uniformly scaled to its displayed size;
the logical resolution is not a guarantee of recorded video resolution.

### Embedded audio and narration (format 1.0)

Speech is generated externally and imported, not generated by SceneScript.
Root audios supports up to 30 assets. Each requires name (max 200 UTF-16 code
units), data (nonempty audio/* base64 data URL, max decoded 32 MiB, no playlists),
and duration (actual seconds, 0.001–3600). MP3/WAV are recommended; Ogg, M4A/AAC,
FLAC, WebM or other audio containers work only if this browser decodes them.
Only mono/stereo is supported so live playback and export use the same channels.
The editor validates decoding and duration agreement (tolerance 0.2 seconds).
Decoded audio is limited to 64 MiB per file; playback preparation has a 128 MiB
budget across referenced files. Keep clips compact. Audio counts toward the
existing 160 MiB total JSON budget. A text-only model cannot invent valid audio
bytes: provide a real external file or leave audios/narration empty.

Root narration spans scene changes continuously. Each scene may additionally
have one narration clip, starting relative to that scene and cut at its end.
They can overlap (their samples add); do not unintentionally double a voice.
Both accept null/omission (disabled) or an object with these defaults:
- asset:""; empty or an existing audios ID. It never refers to images/videos.
- at:0; seconds from project/scene start, 0–scope duration.
- start:0; file offset, 0 <= start < referenced file duration.
- end:null; file end; a number must satisfy start < end <= file duration.
- volume:1; 0–1. muted:false; boolean.
- fadeIn:0, fadeOut:0; 0–3600 seconds; gain is the minimum of both fade factors.
- text:""; plain-text script/note, maximum 10000 UTF-16 code units. Not spoken
  automatically, not rendered, and not automatically converted to subtitles.
Unknown settings and null individual fields are rejected except end:null.
An empty asset is an accepted unassigned clip, producing no sound; its trim is
checked against a 3600-second placeholder duration. Muted references still validate.
Playback duration is min(end-start, remaining scope time after at), not a scene
extension. Fades use that clipped duration. No standalone-audio looping is provided.
Preview/recording uses scheduled decoded Web Audio; pause stops sources, seeking
and resuming rebuild them at the appropriate file offset. Offline export mixes
these decoded samples together with music and video sound when audio is enabled.

When audioDucking=true, active, unmuted, nonzero-volume narration lowers synthetic
music to 30%, with a 0.15-second lead-in and 0.3-second recovery. Overlapping clips
use the strongest reduction rather than multiplying reductions. This does not
change the stored music volume. Live music applies this gain through its
100-millisecond scheduler; offline export calculates it per sample. Silent portions inside a file are not detected.
The audio gallery supports import, native listening, rename, download, replacement
and deletion. Replacing preserves the ID/name and clip settings, clamps trims to
the new duration, and resets end to null if it would no longer exceed start.
Deleting clears matching project and scene assignments. The narration dialog
edits a draft; Apply commits, Cancel/Escape discards it. Choosing no asset disables
that assignment. Its native audio preview plays the selected file excerpt only;
project timing/fades/ducking are previewed by the presentation player.

Example settings (requires a real audios.voice asset):
{"narration":{"asset":"voice","at":0.5,"start":1,"end":5,
"volume":0.8,"fadeIn":0.1,"fadeOut":0.2,"text":"Your narration script"}}

### IDs and references

Image asset keys, video asset keys, scene IDs and element IDs must contain
1–100 ASCII letters, digits, underscores or hyphens. Scene IDs are unique across
scenes; element IDs are unique across the entire project, not just one scene.
Audio IDs use the same 1–100-character ID syntax and form another independent
namespace in audios. Every nonempty narration.asset at root or scene level must
resolve to an own key in audios.
Images (assets), videos (videos), scenes and elements are separate namespaces:
the same ID may appear once in each without conflict. Music instrument IDs form
another independent namespace within music.
Every nonempty backgroundAsset or asset reference must resolve to an own key
in assets, even if the reference is irrelevant to the element's type.
Every nonempty element.video.asset or backgroundVideo.asset must resolve to
an own key in videos, even on a non-video element (where playback is ignored).
General element.asset and scene.backgroundAsset always refer to images in assets;
they cannot select videos. A matching ID in the wrong namespace does not resolve.
Bubble tail.element selects a globally unique element ID, but it must be in the
same scene as the bubble. tail.anchor selects a name from that element's anchors,
a local namespace independent of assets and other elements' anchor names.
Group IDs use the same syntax and are unique per scene, with no collision with
that scene’s element IDs. Group members resolve only to same-scene element IDs
and each element may belong to at most one group (see Groups below).
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
- narration: null; optional scene-local imported speech clip (see Embedded audio).
- camera: null; optional deterministic scene camera (see Scene camera below).
- groups: []; flat group controllers (see Groups below); omitted defaults to [], null is rejected.
- background: "#263b42"; #RRGGBB color.
- backgroundEnabled: true; boolean. False hides scene color/gradient and background image, revealing the project simulation. Background settings are retained; scene elements are unaffected.
- backgroundOpacity: 1; number 0–1, applies to the scene color/gradient and background image only, not its elements.
- backgroundGradient: null; optional gradient object (see Gradients below).
- backgroundAsset: ""; empty or an existing asset ID, maximum 100 code units.
- transition: "fade"; allowed "none", "fade", "crossfade", "slide-left", "slide-right", "slide-up", "slide-down", "wipe-left", "wipe-right", "wipe-up", "wipe-down", "zoom-in", "zoom-out", "through-black".
- transitionDuration: 0.5; number, 0.01–3600 seconds.
Scene durations add up to the total duration; transitions do not add time.

### Elements

Required: id and type. type must be "video", "text", "image", "shape" (a geometric form) or "simulation" or "bubble".
Optional fields and their defaults:
- space: "scene"; "scene" follows the camera, "screen" stays fixed in the viewport (see Coordinate spaces). Null is rejected.
- crop: null; optional intrinsic image rectangle (see Image crops and panel templates below).
- placement: null; optional static affine matrix (see Groups below).
- video: for type "video", omission supplies {asset:"",start:0,end:null,loop:false,
  muted:true,volume:1,fit:"cover"}; for other types omission supplies null.
  Explicit video:null is accepted for EVERY type, including "video". An object
  on any type is normalized/validated with the same settings and references;
  only type "video" plays it. See Embedded videos for asset/start/end/loop/muted/
  volume/fit. The validator does not require a video object or nonempty video.asset
  for type "video"; for actual video playback you MUST provide an existing videos
  ID in video.asset. No implicit lookup in the general image asset field occurs.
- simulation: null for text/image/shape/video, default particles configuration for simulation elements; simulation elements must not explicitly set this to null.
- text: "Your story starts here." for text, "Hello!" for bubble, otherwise ""; string, max 10000
  UTF-16 code units.
- asset: ""; empty or an existing asset ID, max 100 code units.
- x: 10; y: 35 (10 for bubble); each -100 to 100, percentages of canvas width/height.
- width: 80 (40 for bubble); height: 30 (24 for bubble); each 0.1–200, percentages of canvas width/height.
- color: "#ffffff" for text/image/video/simulation, "#b86445" for shape, "#222222" for bubble; #RRGGBB color.
- font: "Arial"; allowed ${fonts.map(f=>`"${f}"`).join(', ')}.
- textEffects: optional object (see Text effects and presets below); omitted defaults to all effects disabled.
- textGradient: null; optional gradient object for text/bubble glyph fill (see Text effects and presets below).
- fontSize: 90 (48 for bubble); number, 1–500 project pixels, not percentages or UI pixels.
- align: "center"; allowed "left", "center", "right".
- name: ""; optional display title, at most 200 characters. Does not change rendered text or IDs.
- shapeType: "rectangle"; allowed "rectangle", "ellipse", "triangle", "diamond", "star", "arrow". Used by shape elements only.
- fillGradient: null; optional gradient object (see Gradients below), for shapes.
- fillColor: shape/bubble fill color (#RRGGBB) or "none". Omitted/null uses legacy color except for bubble, which defaults to "#ffffff".
- borderColor: "none" ("#222222" for bubble); #RRGGBB or "none", for shapes/bubbles.
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
- fit: "contain"; allowed "contain" or "cover". Used for image rendering; for an
  actual video, video.fit alone controls fitting, independently of this field.
  Both fields are validated/preserved; general fit does not override video.fit.
- motionPath: null; optional movement path on any element type (see Motion paths).
- animation: "fade"; allowed ${animations.map(a=>`"${a}"`).join(', ')}.
- at: 0; number, 0 to the containing scene's duration, relative to scene start.
- animationDuration: 1; number, 0.01–3600 seconds.
- anchors: {}; up to 16 named local anchor points; explicit null rejected.
- bubble: default bubble object for type bubble, null for other types. Type bubble
  requires a non-null object; see Native comic bubbles.
- until: null; optional exclusive scene-local end, greater than at and no later
  than scene.duration. Explicit null means scene end.
- exitAnimation: "none"; none/fade/slide-left/slide-right/slide-up/slide-down/zoom-out.
- exitDuration: .5; number, .01–3600 seconds.
Type-irrelevant fields are accepted, validated and preserved, but may have no
visual effect. All omitted optional element fields use these defaults.

A video element with null video or empty video.asset is an accepted unassigned
video, not a playback-ready clip. The live preview/recording renderer falls back
to its image placeholder, or to general asset if a valid image reference was also
provided (using general fit). Do not rely on this fallback for video authoring:
the file-export renderer omits placeholders; a non-null video object with empty
asset renders no video there and does not fall back to the image asset.

### Image crops and panel templates

Optional element field crop defaults to null when omitted; explicit null disables
cropping. Otherwise it requires exactly {x,y,width,height}. Values are finite
percentages of the original intrinsic image viewport, NOT of the element box.
x/y are 0–100; width/height are >0–100; x+width and y+height must not exceed 100
(with 1e-9 tolerance for floating-point arithmetic). Empty/outside rectangles and
null coordinate values are rejected. Crop objects on other element types are
validated/preserved but visually ignored. No asset reference is required merely
to hold crop settings; actual image display still requires a nonempty image asset.

First clip the original image to crop; then center-fit that clipped rectangle
using the existing element fit (contain: letterboxing; cover: fill and clip).
Without crop, the existing raster/SVG rendering is unchanged. Multiple elements
can show different crops of one asset without repeating Base64 data. Reset means
crop:null. Anchors remain local percentages of the element box; cropping does not
automatically relocate speaker anchors. The visual crop dialog uses original-image percentages and supports
numeric fields, moving the rectangle and resizing its corners (editor minimum
width/height 0.01%; the runtime also accepts smaller positive rectangles). Apply commits one
Undo/Redo step; Cancel/Escape discards the draft. It never modifies the image data.

Cropped SVGs stay live SVGs inside a clipped outer viewport, not raster snapshots.
Original viewBox origins and internal aspect-ratio mapping are retained. The SVG
intrinsic viewport uses positive numeric/px width/height when present, otherwise
viewBox dimensions, otherwise 300x150. Percentage/physical-unit root dimensions
are not used to define the crop viewport. Supported SMIL animation stays governed
by the presentation playhead, including seek, pause and export freezing. The
crop rectangle is static; it does not follow animated objects. SVG safe-profile
restrictions still apply. Raster images use their decoded natural dimensions.
Editor selection handles are never included in presentation/recording/export.

Panel templates are editor authoring helpers, NOT a new JSON field or element
type. Full frame, Two panels, Three panels and Detail inset append ordinary
image and rectangle-shape elements to the current scene. Each panel has a white
frame surface with a dark 4-project-pixel border and an inset image; panel gaps
are percentages of project width/height. All images reuse the chosen asset,
start with full-image crop, fit:cover and animation:none. The user can edit each
crop, frame, timing and layer independently, or use existing flat groups. Existing
scene elements are not deleted. Applying the template is one Undo/Redo step and
must fit the existing 100-element scene limit (two elements per panel).
AI authors can generate these same ordinary elements directly with explicit crops.
Scene cameras and scene/screen element coordinate spaces are supported (see below).

Panel example: /panels.scenescript.json — one original embedded SVG illustration,
full view, character close-up and two independent cropped panels. No external
assets or additional copies of the image payload are needed.

### Scene camera

Optional scene.camera defaults to null for omission or explicit null (identity).
An object requires only stations: an ordered array of 1–32 stations. Unknown
camera/station fields are rejected. Stations require at, x, y, width. All are
finite numbers. at is arrival in scene seconds, 0–scene.duration; the first
station must have at:0. x/y are the top-left in project percentages, 0–100.
width is 1–100 percent of project width. The height uses the SAME percentage
of project height, preserving the project aspect ratio, even for portrait and
square. x+width and y+width must be <=100 (floating tolerance 1e-9).
There is no independent height, rotation or perspective.

Optional station.hold defaults to 0 seconds (0–scene.duration); null is rejected.
The rectangle stays fixed from at through at+hold. Optional station.easing
defaults to "linear"; alternatively "ease-in-out" uses smoothstep p*p*(3-2*p).
Null is rejected. Easing belongs to the DESTINATION station; the first station's
easing is preserved but unused. Next arrival must be strictly greater than the
previous at+hold. at+hold cannot exceed scene duration. After the final arrival,
the last rectangle is held until the scene ends regardless of its hold value.
Identical rectangles at successive stations can describe additional holds.

Between holds/arrivals, interpolate x, y and width with the same eased fraction.
The resulting project-to-screen transform is scale=100/width and translation
(-x*projectWidth/width, -y*projectHeight/width), with origin (0,0).
It is applied AFTER element entry/exit, motionPath, rotation, placement and flat
group transforms. Scene background color/gradient/image and scene-space elements
(including bubbles, simulations and videos) share this transform. Screen-space
elements do not; see Coordinate spaces below for cross-space anchors. Continuous project
simulation/video backgrounds are NOT transformed and retain project-time clocks.
Camera never changes positions, group membership, audio intervals or volume;
it adds no duration. The final camera composition is clipped to the viewport,
then scene transitions are applied. Outgoing scenes hold their final camera
at exactly scene.duration. Pause, seek, restart and export evaluate the same
pure scene-time calculation, not an accumulated animation clock.

Example for a five-second scene (full view, one-second hold, move, hold, detail):

\`\`\`json
{"camera":{"stations":[
 {"at":0,"x":0,"y":0,"width":100,"hold":1},
 {"at":3,"x":10,"y":10,"width":50,"hold":0.5,"easing":"ease-in-out"},
 {"at":5,"x":40,"y":40,"width":25,"easing":"linear"}
]}}
\`\`\`

The scene settings open a draft editor with station controls, a scrubber and
camera playback preview. Apply commits one undo step; Cancel/Escape discard.
Disable camera saves null. Overview is editor-only and temporarily ignores the
camera while paused; playback, recording and export always use the saved camera.
Element/anchor/path handles are shown only in overview or without a camera.
Opening those handle editors automatically switches to overview; it does not
change the saved camera.
In the camera dialog, select a station using its frame icon to open an overview
with a camera rectangle. Drag the rectangle to move it; corner handles resize
it with the project aspect ratio. Arrow keys move the frame by 0.1 percentage
points; Shift uses 1. Corner arrow keys resize proportionally, keeping the
opposite corner fixed. Controls stay inside the project and keep width >=1.
The overview/frame selection is editor state, not JSON. Pointer cancellation
restores the original draft. All draft edits commit as one Apply/Undo step.
Frames/handles exist only in the editing dialog, never in recording/export.
The camera example at /camera.scenescript.json uses one shared animated SVG,
a full-to-manager-to-briefcase shot, a screen-fixed narrator and a screen-space
speech bubble whose tail tracks the scene-space mouth during the camera move,
and a final two-panel scene.

Schema checks station shape and individual bounds; runtime additionally checks
first arrival, ordering, hold intervals, scene duration and rectangle sums.

### Coordinate spaces

Every element supports optional space: "scene" (default) or "screen". Omission
normalizes to "scene"; explicit null and unknown values are rejected. This is
available for every existing element type, not just text and bubbles. Without
a camera both spaces render identically. x/y, width/height, motionPath, placement
and group offsets still use the same project-percentage/pixel conventions in
the element's own space. "screen" means exempt from the SCENE CAMERA, not from
its own animation, motion, rotation, placement, opacity or scene transitions.
It does not persist the element across scenes or add time. Camera/space do not
change any audio intervals, mute settings or levels.

For local element geometry L, the composed own-space matrix is
M = group * placement * element (the existing entry/exit/motion transform).
Its final pre-transition screen matrix is C*M in scene space and M in screen
space, where C is the scene-time camera matrix. Backgrounds remain scene space;
continuous project backgrounds remain outside the scene composition. All
scene elements retain the original array z-order, even when scene/screen spaces
are interleaved: screen elements are NOT an automatically topmost overlay.
Clipping is applied at the final viewport, not before camera compensation.
Transitions are applied after composing BOTH spaces, with the outgoing camera
and anchored bubble tail evaluated at exactly the outgoing scene duration.

Flat groups infer their space from their members. Every member must have the
same space, even without a camera; mixed-space groups are rejected by runtime.
Groups have no separate space field, and group.space is unknown/invalid.
Grouping incompatible selections is disabled with an explanatory tooltip.
Changing a group's space in the editor changes all members in one undo step.
Changing only one member of a multi-member group to a different space is
rejected; dissolve the group or use the group settings instead.

Anchor positions remain percentages of the target ELEMENT BOX, not intrinsic
image/crop coordinates. An anchored bubble can reference a speaker in either
space. Compute the speaker mouth with its final pre-transition screen matrix,
then apply the inverse final screen matrix of the bubble to obtain its local
tail tip. This includes entry/exit, motionPath, rotation, placement, group and
camera transformations. Scene-to-screen and screen-to-scene references both
work deterministically during pause, seek, restart and export. Manual tails
remain local to the bubble and do not track another element. If a speaker is
hidden by its interval or group, its geometric anchor still resolves as before;
there is no automatic tail suppression or clipping at the speaker's box.
Overview temporarily uses C=identity for both rendering and anchor conversion.

Example element fields (inside an ordinary scene, with a valid speaker anchor):
space: "screen", type: "bubble", bubble.tail.mode: "anchor",
bubble.tail.element: "manager", bubble.tail.anchor: "mouth".
No new element types, rigging, nested groups or general keyframe system are added.
Schema validates the space enum/default; homogeneous group membership is a
runtime constraint because it requires resolving scene element references.

### Native comic bubbles and speaker anchors

Version remains 1.0. Old projects need no migration. Flat group controllers are
supported (see Groups below); nested coordinate containers and
character rigging are not supported. A scene is a comic
panel/shot; reuse image assets for recurring characters instead of repeating Base64.

For type "bubble", provide normal text/runs and typography, position/size,
opacity/rotation, fillColor, borderColor and borderWidth. These are one object:
body, text and tail move together; the tail can extend outside the body box.
Text/runs remain safe literal text, never HTML. No automatic font shrinking or
layout displacement occurs. The editor warns about text overflow and clips only
the text. Canvas clipping still applies to the complete bubble.
radius, fit, shapeType, fillGradient and borderStyle do not change bubble geometry;
bubble outlines are solid and centered on the contour. borderWidth is not clamped
to body dimensions. Large widths can obscure text: keep widths modest.

bubble fields (all optional; unknown fields rejected):
- kind: "speech" (default) or "thought". Speech has a rounded, superelliptic body
  and one closed contour including its tail: no seam or second border at the base.
  Thought has a cloud-like contour and three progressively smaller dots.
- padding: 0–500 project pixels (24). Added to the safe-body inset: 9% of width/
  height for speech; 20% for thought. The remaining centered text rectangle is
  clipped independently. Excessive padding can leave zero available text space.
- lineHeight: .5–4 (1.2), unitless multiplier; applies to text/runs.
- tail: object with these defaults:
  mode "manual"; target {x:50,y:150}; element ""; anchor ""; base null;
  width 36; curve 0.
  mode is "none", "manual" or "anchor". None removes the tail/dots.
  target is a required x/y pair if supplied, each −1000–1000: percentages relative
  to the untransformed bubble BODY width/height; (0,0) is its upper-left corner.
  It is preserved even in anchor mode but only manual mode uses it.
  element/anchor are empty or 1–100 ASCII letters/digits/_/-. In anchor mode they
  must resolve to an element and one of its named anchors IN THE SAME SCENE.
  They are NOT image/video/audio asset references, and need not precede the bubble.
  base is null for automatic attachment direction, or −360–360 degrees: 0 points
  right, 90 down. width is 1–500 project pixels, determining speech attachment
  width (clamped angularly on small bodies) or thought dot size.
  curve is −1–1; bends the speech tail perpendicular to the center-to-target vector.
  Thought dots are placed at 25%, 55% and 85% of the contour-to-target line,
  with radii 12/8/4 pixels × min(1,min(bodyWidth,bodyHeight)/200) × (1+width/100).
  base/curve affect speech only. For an interior target the tail/dots are omitted;
  no division-by-zero or inverted contour is created.
Omitted bubble/tail fields use defaults. Explicit null is accepted only for
tail.base inside a bubble object. Full bubble:null disables the object only on
non-bubble types. A validated bubble object on other types is preserved but not drawn.

anchors is an optional element object mapping names to {x,y}, each 0–100 local
percent, relative to the untransformed element rectangle, not actual image pixels.
Names use the identifier syntax above, maximum 16 per element, unique within that
element. Reused names on different elements are allowed. Extra fields/nulls reject.
An image using contain may have letterboxing: place the mouth anchor accordingly.
Anchor transforms follow Motion Path, entry/exit rotation, translation and scale,
placement, flat groups and the element's scene/screen camera mapping. The target
is transformed from final pre-transition screen coordinates into the bubble's
local space using its inverse final screen transform (see Coordinate spaces).
The bubble itself never moves to follow its speaker. Hidden speakers still supply
their timeline-computed anchor: bubble and speaker visibility are independent.
Editor anchor renaming updates references; deleting anchors/elements detaches
dependent tails to their last evaluated manual point (clamped to its allowed range).
Duplicating a scene assigns new element IDs and remaps its speaker references.
Dragging a tail target in expanded preview changes it to manual mode.
Editor handles, selection outlines and overflow warnings are never exported.

### Element ends and exit animations

until is either null/omitted (scene end) or a finite scene-local time > at and
<= scene.duration. Explicit ends use visibility [at,until), regardless of opacity.
For backward compatibility, null ends preserve the old final stopped frame:
an element can still be displayed at the exact final scene endpoint. Explicit
ends never have this exception. No end or exit animation adds timeline duration.
exitAnimation defaults to none; exitDuration defaults to .5, valid .01–3600 seconds.
An exit occupies the last min(exitDuration, end-at) seconds of its interval.
fade uses a linear opacity factor from 1 to 0. Slides use cubic ease-out and
80 project pixels in the indicated direction; zoom-out scales from 1 to .7 with
cubic ease-out. Entry animation progress remains unchanged if entry and exit
overlap: opacity and scale factors multiply, slide offsets add. This is deterministic
even for extremely short intervals.
Transform order (rightmost operation is applied first): Motion Path translation,
rotation (element plus path orientation), combined entry/exit local translation,
combined scale. All operations use the element center as transform-origin.
An element end stops/mutes associated video playback and bounds exported video
audio, including looped clips. Exit opacity alone does NOT fade video audio.
Project music, project/scene narration and project background video keep their
existing scopes. The editor shows the selected interval in its timing settings;
scene-relative draggable interval tracks and collapsible group tracks are available.

Comic example: /comic.scenescript.json — original SVG characters, three English
dialogue beats, speech/thought bubbles, a moving mouth anchor, explicit ends and
fade-outs. Fetch and import this JSON like the existing /example.scenescript.json.

### Groups, affine placement and timeline editing

Optional scene field groups is an array (default [] when omitted; explicit null is
invalid), max 50. A group is a flat controller over existing scene elements: it
contains members, not nested child elements. Members retain their original
project-percentage positions, own animation clocks and the scene elements array
layer order. Grouping does not reorder layers or change element IDs. Each group
requires id and members (1–100 existing same-scene element IDs, no duplicates).
An element can belong to only one group. Groups cannot contain groups.
Group IDs are unique within their scene and must not collide with an element ID
in that scene; they are a separate namespace from asset/video/audio/scene IDs.
Speaker references still target element IDs, never group IDs. Duplicating a scene
remaps group IDs, members and speaker references; hidden speakers keep supplying
anchors after all element/placement/group transforms.

Group fields/defaults: name "Group" (max 200); x/y 0 (-1000..1000 project % offsets);
pivot {x:50,y:50} (project %, each -1000..1000); rotation 0 (-360..360 degrees);
opacity 1 (0..1); at 0; until null; animation "none"; animationDuration 1;
exitAnimation "none"; exitDuration .5; motionPath null. Group animation supports
none/fade/slide-left/slide-up/zoom/pan (not typewriter); exit options and motionPath
options are the same as for elements. Timing limits/null rules match element at,
until, animationDuration and exitDuration. Motion-path coordinates are project %
offsets added to the group offset; the group rotates/scales about pivot. Member
animations are composed first, then placement, then the group transform. Opacity
multiplies and visibility requires both member and group intervals. Group opacity
is visual only; it does not change video volume. Video audio stops outside the
intersection of the member and group intervals; music/narration are unaffected.

Optional element placement is null/omitted for identity, otherwise an affine matrix
{a,b,c,d,e,f} mapping project pixels: x'=a*x+c*y+e, y'=b*x+d*y+f. All six coefficients
are required, finite and within -1000000..1000000; abs(a*d-b*c) must be >=1e-8.
This is static authoring data, not executable code. It applies to the whole animated
element before its current group, including anchors and bubble tails. The editor
uses it to preserve geometry when dissolving a translated/rotated/scaled group.
Ungroup freezes the group's transform and visual opacity at the current playhead;
it does not preserve the group's future animation or group visibility gate. Choose
a visible frame first (invisible/fully transparent groups cannot be dissolved).
Member animations remain intact. Resetting a baked placement is an explicit action.

The editor supports project Undo/Redo (30 undo steps; sequential typing coalesces).
New/imported projects start a fresh history; history is not saved in JSON. Native
text-field shortcuts remain native; toolbar Undo/Redo restores whole-project
edits. Global Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y work outside text fields.
Timeline tracks show scene-relative intervals, entry/exit regions and a playhead.
Move an interval or its start/end by pointer or arrow keys (0.1 s; Shift 1 s).
Optional pointer snapping uses a 0.1-second grid. Explicit ends must stay >at and
within scene duration. Moving an omitted-end interval makes its new end explicit;
editing just its start keeps until:null. Timelines do not shift independent
motionPath.start or video clip start/end when element at changes. Group tracks
can collapse; children remain independently editable. These controls do not add
JSON fields. No nested groups, general keyframe tracks or character rigging are supported.

### Motion paths

motionPath applies to text, images, shapes, simulations, videos and bubbles. Omit it or
use null to disable it. An object (including {}) supplies these defaults:
- type: "line"; allowed "line", "bezier" (cubic), "ellipse" (including circles), or "segments" (a connected route).
- start: 0 seconds from SCENE start, independently of element.at; 0–scene.duration.
- duration: 3 seconds per traversal; 0.01–3600.
- easing: "linear" (approximately constant own-space project-pixel speed; camera movement can change visible speed) or "ease-in-out".
- repeat: "once", "loop" or "ping-pong"; default "once". Loop jumps back to the
  start (continuous on an ellipse); ping-pong reverses direction every traversal.
- after: "hold" or "reset"; default "hold". Only once uses this: keep endpoint,
  or return to path start as soon as duration has elapsed.
- orient: false; true adds the path's own-space tangent angle to element.rotation.
  Reversed ping-pong motion faces the reverse direction. Zero tangents use 0 degrees.
- from: {x:0,y:0}, to: {x:30,y:0}; used for line and bezier.
- control1: {x:10,y:-20}, control2: {x:20,y:20}; cubic bezier controls.
- center: {x:0,y:0}, radiusX:15, radiusY:15; used for ellipse.
- segments: one default line segment; 1–32 objects (see Connected routes below).
- startAngle:0 degrees (-360–360); clockwise:true; used for ellipse. 0 starts
  at the rightmost point; positive clockwise angles move downwards on screen.

Points are relative offsets from the element's base x/y anchor, NOT absolute
positions. X uses canvas width, Y canvas height; each point coordinate is -200–200.
Provided point objects require both x and y. Radii are 0.1–200 in the same axis
percentages. A circle requires radiusX * canvasWidth == radiusY * canvasHeight;
equal percentage radii produce an ellipse on a non-square canvas. The editor's
Set circle action adjusts radii for the current project format. Changing format
preserves stored percentages rather than automatically preserving circularity.
All shape-specific fields are accepted, validated and preserved on every path
type. Unknown keys and explicit null for individual fields are rejected.

Before start the element remains at the path's initial offset. Element.at still
controls visibility; entrance animation and motion run independently. Path translation
is added to the base position, without being rotated/scaled by element transforms.
Existing entrance effects and base rotation remain active. Elements rotate about
their box center, not about the path anchor. Paths can extend off-canvas.
Scene end clips movement; paths never extend project duration. Bézier/ellipse
speed uses a deterministic 256-segment arc-length approximation. Seeking,
preview, recording and export calculate motion from the same scene-local time.
The expanded preview offers draggable path/control/radius handles; these guides
are editor-only and never appear in recording or exported video.

Example: move 40% right and 10% up over four seconds, starting at scene second 1:
{"motionPath":{"type":"line","start":1,"duration":4,
"from":{"x":0,"y":0},"to":{"x":40,"y":-10},"orient":false}}

#### Connected routes (motionPath.type = "segments")

The route starts at motionPath.from. Each segment starts at the previous segment's
endpoint and uses these defaults when fields are omitted:
- type: "line"; "line" or "bezier" (cubic).
- to: {x:20,y:0}; endpoint relative to the ELEMENT BASE position, not the previous point.
- control1: {x:0,y:0}, control2: {x:10,y:0}; Bézier controls in the same coordinates.
- duration: 2 seconds, 0.01–3600, for this movement only.
- pause: 0 seconds, 0–3600, holds at this segment's endpoint AFTER movement.
- easing: "linear" or "ease-in-out"; default "linear", applies per segment.

segments omitted supplies [{type:"line",to:{x:20,y:0},control1:{x:0,y:0},
control2:{x:10,y:0},duration:2,pause:0,easing:"linear"}]. Empty arrays, null,
more than 32 segments, unknown fields and null segment fields are rejected.
Provided point objects require both x/y; the existing -200–200 bounds apply.
Segment fields are validated even for a non-segments path. On a segments path,
root duration/easing/to/control1/control2 remain validated and preserved but do
not control movement: traversal duration is the SUM of segment duration + pause.
Root start, repeat, after, orient and from retain their normal meaning.
A pause holds the arriving segment's tangent orientation. Ping-pong reflects the
entire route timeline, INCLUDING pauses, and reverses orientation on the return
journey. Only once uses after; hold keeps the last endpoint, reset returns to from.
Seeking and scene-end clipping work as with the simple paths. Bézier sections
use the same arc-length approximation independently; sharp corners can change
heading instantly. The editor does not automatically smooth segment joins.

Example with a line, a one-second pause and a curve:
{"motionPath":{"type":"segments","from":{"x":0,"y":0},"segments":[
 {"type":"line","to":{"x":20,"y":-10},"duration":2,"pause":1},
 {"type":"bezier","to":{"x":50,"y":0},"control1":{"x":30,"y":-20},
  "control2":{"x":40,"y":10},"duration":3,"pause":0,"easing":"ease-in-out"}]}}

Editor templates (wave, zigzag, spiral, flight path) generate ordinary segments;
there is no JSON template field. Template sections evenly divide the remaining
scene time after path start (minimum 0.01 seconds each). Spiral is a polygonal
approximation. Reordering
or deleting a segment reconnects the endpoints in their new array order, without
automatically moving controls. Adding creates a line 20 percentage points to the
right (clamped at x=200), duration 2, pause 0. Convert to segments preserves a
simple line/Bézier path as one section. Copy/Paste path uses an in-memory editor
buffer (not the system clipboard), deep-copies the entire configuration and does
not alter element position. A copied start time must fit the destination scene.
These editor actions replace the selected element's path, without linking elements.

### Omitted fields versus explicit null

Scene camera accepts omission/null as identity; station fields never accept null.

Authoring guidance: omit fields to request defaults. Use null only for the
explicitly supported disabled/automatic cases below; a defaulted full example
may legitimately contain these nulls.
Actual validator behavior is asymmetric:
- Missing required fields are rejected.
- Root audios omitted/null becomes {}; narration omitted/null disables it at root
  and scene level. Narration.end:null means file end; other settings reject null.
- Root assets/videos omitted OR null normalize to {} (schema authoring uses objects).
- Root backgroundVideo omitted OR null normalizes to null; {} remains a default
  settings object with no asset. Root music/backgroundSimulation omitted/null disable them.
- Root thumbnail omitted/null disables it; thumbnail.name/data reject null.
- Root description/firstComment/hashtags default to "" only on omission, not on explicit null.
- Optional scene fields use their default when omitted OR null, EXCEPT groups:
  groups defaults to [] only on omission; explicit null is rejected.
- Scene id/elements and asset name/data do not accept null.
- Element crop omitted/null disables cropping; individual crop fields reject null.
- Element placement omitted/null means identity; matrix coefficients reject null.
- Group fields default only on omission, except until and motionPath also accept
  null. Required id/members reject null. Group pivot requires both x and y.
- Element motionPath omitted/null disables path movement; individual path fields reject null.
- Element fillGradient accepts explicit null, meaning solid/no gradient.
- Element fillColor omitted OR null uses legacy element.color (or its type default), except bubble, which uses white.
- Element video:null is accepted on ALL types. On a video element, omission instead
  creates the default settings object; on other types omission produces null.
  Object-valued video on other types still validates but is not played.
- In video settings (including backgroundVideo), end:null means file end; omission
  also produces null. Other individual video settings reject null.
- Element simulation accepts null except on type "simulation", which requires a simulation object.
- Element until omitted/null means scene end. bubble omitted supplies the bubble
  default only for type bubble; explicit bubble:null is rejected on type bubble,
  accepted on other types. Bubble object fields reject null except tail.base.
  anchors omitted means {}; anchors:null is rejected; coordinate fields reject null.
- Apart from the exceptions above, other element fields reject explicit null:
  element defaults apply only to omitted fields, not explicit null.
- Root version/title/description/firstComment/hashtags/format/scenes do not accept null.
/schema.json describes the typed authoring structure, not every normalization
exception. Runtime validation/import is authoritative; the schema alone does
not enforce cross-field/reference resolution (including video namespaces), global
ID uniqueness, selected video end > start or bounds against referenced duration,
Base64 block/padding validity and decoded-byte limits, safe SVG contents, forbidden
stream MIME names, real media decoding or
measured duration, whole-JSON byte size, image dimensions, music polyphony or
particle budgets. Camera station ordering/holds/duration/rectangle bounds,
homogeneous group spaces, group membership exclusivity, same-scene member references,
group/element ID collisions, interval bounds against scene duration and matrix
invertibility and image crop x+width/y+height bounds also require runtime validation. Video/image authoring prefixes in the schema are canonical
lowercase, while the video runtime prefix is case-insensitive. Schema maxLength
counts Unicode code points; runtime limits use UTF-16 code units. The typed schema
intentionally excludes some accepted null-to-default forms (root assets/videos,
most optional scene fields and element fillColor:null); use the runtime to check
those normalization cases. VideoSettings start < 86400 and numeric end > 0 are
structural bounds; tighter asset-dependent/cross-field rules remain runtime checks.

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
Allura, Great Vibes, Parisienne and Sacramento are bundled script fonts, served
from this website without third-party font requests. Other families are local
system fonts and can fall back when unavailable.
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
radius sets the element container's rounded corners except for bubbles (whose
contour is controlled by bubble.kind): it clips
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
- draw: shape elements only visually; progressively draws the outline during the
  first 80% of animationDuration, then fades in the fill over the last 20%.
  Uses border settings; when borderColor is none or borderWidth is zero, a
  4-project-pixel outline is used (fillColor, or color if fillColor is none).
  Other element types have no drawing effect. Not allowed on groups.
- typewriter: displays floor(codePointCount × progress) Unicode code points of
  text. It uses Array.from, NOT grapheme clusters. Combining marks, flags and
  joined emoji can therefore appear in parts; complete emoji/grapheme handling
  is not guaranteed. The partially revealed text is laid out again as it grows.
  This affects text and bubble text only; it does not reveal image, shape or simulation pixels.
- pan: a slow linear zoom from 100% to 110%, with NO sideways panning. It does
  not repeat, and holds 110% after animationDuration.
For animations other than fade, element opacity is the configured opacity.
By default elements remain until scene end. until can end them earlier; exitAnimation
adds the documented exit factors without extending the scene.

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
Supported sound comes from embedded audio narration, synthetic project music and
unmuted embedded videos. There is no speech generator or standalone audio element
type; audio narration belongs to the project or scene.
Motion paths may loop or ping-pong. Selected video excerpts may loop; safe SVG SMIL repeatCount also supports finite
repetition or indefinite repetition. These do NOT add a scene/presentation loop
field. Arbitrary executable code, free-form keyframes, custom element types beyond
the documented type enum, are not supported. The documented exitAnimation enum is supported.

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
SceneScript does not capture the screen itself. Alternatively, the project toolbar
provides local frame-by-frame video export: MP4 (H.264/AAC) if supported by the
browser encoders, or WebM (VP9/Opus). Choose 480p/720p/1080p (short edge),
24/30/60 fps and optionally narration, music and unmuted video audio. Export includes the
whole project, transitions, SVG animation and continuous project backgrounds,
without editor controls, countdown or restart screen. Video trims, loops, volume
and mute are honored; video audio stops at the selected end unless looped.
Export settings are UI-only, not JSON fields. Export runs locally and may be
slower than real time; leave the tab open. Playback support alone does not guarantee file export: the exporter needs media
decoders as well as the configured encoders. If audio is selected and potentially
audible narration/music/video exists, the relevant audio encoder is also required. For MP4,
a bundled local AAC software encoder is loaded if native AAC encoding is unavailable.
No audio track is added when there is no potentially audible audio or audio is disabled. Export audio includes assigned narration and uses mute, volume, trims and video loops, not
visual element opacity or scene-fade factors. There is no automatic MP4-to-WebM fallback or server
transcoding: unsupported settings report an error, and the user may choose WebM
or different settings. Export honors timeline scene fades even on a stopped editor
playhead (unlike the paused-preview fade exception above). There is no fixed output file-size limit. Output is buffered in browser memory,
so available memory and browser limits can still prevent very large exports. Export can be cancelled and never replaces
the editable project. Leaving recording
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
Scene.backgroundGradient, shape element.fillGradient and text/bubble
element.textGradient accept null (default,
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

## Text effects and presets (optional, format 1.0)

Text and bubble elements support textEffects and textGradient. These are element
fields, NOT TextRun fields. They apply across all runs, including typewriter text,
and are rendered in preview, recording view and video export. All effects are
static and may be combined. Existing projects retain their appearance when these
fields are omitted.

textEffects defaults (generated from the implementation):
${JSON.stringify(defaultTextEffects(),null,2)}

textEffects must be an object, not null; omitted subobjects and fields use defaults.
Only glow, shadow and outline are allowed. Each enabled value is boolean, each
color is #RRGGBB. glow.intensity: 0..100 project pixels (default 16); zero hides glow.
Glow uses three centered shadows with blur radii intensity × .25, .6 and 1.
shadow.blur: 0..100 project pixels (6); shadow.x/y: -100..100 project pixels (4/4);
shadow.opacity: 0..1 (.7). Zero opacity hides the shadow; zero blur makes it sharp.
outline.width: 0..20 project pixels (2); zero hides it. The outline is painted
behind the glyph fill. Negative x/y shadow offsets are supported.
These distances scale with the logical project canvas, not the editor UI font size.
Effects may be clipped by the text box, bubble text area or canvas; allow enough
space around the text for thick outlines, shadows and glow.

textGradient is null (default, solid text) or a gradient object using the exact
Gradients specification above: linear, radial or conic, 2..16 sorted stops,
positions, opacity, angle and center. It colors glyphs only, not the text box or
bubble background. A gradient overrides element.color and run.color visually;
setting it to null restores those colors without losing them. Each formatted
run and wrapped line fragment starts its own gradient. Transparent stops reveal
what is behind the glyphs, rather than the solid text color.
Keep element.color and any run.color valid even when textGradient is active.
For neon, choose a dark background explicitly; no preset changes the background.

The editor offers Neon Pink, Neon Blue, Gold and Comic buttons. Preset names are
NOT JSON fields or enum values: do not output preset, textPreset or a preset ID.
Write their ordinary appearance fields instead. The following settings are
generated from the same implementation used by the editor:
${textPresets.map(preset=>{const e=applyTextPreset(newElement('text','preset-example'),preset);return preset+':\n'+JSON.stringify({color:e.color,...(preset==='comic'?{bold:true}:{}),textGradient:e.textGradient,textEffects:e.textEffects},null,2);}).join('\n\n')}

Applying a preset replaces text colors, gradient and all effects throughout the
text. Run colors are removed so they inherit the new element color. Comic also
sets element.bold=true and removes run.bold overrides. Other presets do not
change bold; fonts, sizes, other formatting, content, layout and animation remain.
There is no saved preset identity; all values can be edited afterward.
Reset effects means textEffects at the defaults above and textGradient:null;
it retains text colors and bold/other formatting. Undo restores the previous style.

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
