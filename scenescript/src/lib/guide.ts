import {formats,newElement} from './model.ts';
import {applyTextPreset,textPresets} from './text-presets.ts';

export const artisticEffectKeys=['liquid','exposure','paper','stopMotion','afterimages','reveal','glitch','print','kaleidoscope','lighting'] as const;
const artisticElement=newElement('shape','artistic-defaults');
export const artisticEffectDefaults=Object.fromEntries(artisticEffectKeys.map(key=>[key,artisticElement[key]]));
export const aiArtExample={version:'1.0',title:'Mirrored light',format:'square',scenes:[{id:'art',duration:6,transition:'none',background:'#18232b',elements:[{
 id:'motif',type:'shape',shapeType:'star',x:15,y:15,width:70,height:70,animation:'none',
 fillGradient:{type:'linear',angle:35,stops:[{color:'#ff546d',position:0},{color:'#ffd25a',position:45},{color:'#4ac7df',position:100}]},
 kaleidoscope:{enabled:true,segments:8,speed:10,zoom:1.5},
 lighting:{enabled:true,strength:.8,ambient:.3,centerX:40,centerY:30,radius:70,orbit:15,speed:12,shadowOpacity:.5}
}]}]};

import {guideFieldCatalog,guideFonts} from './guide-fields.ts';

export const aiMinimalExample={version:'1.0',title:'Hello SceneScript',format:'landscape',scenes:[{id:'intro',duration:5,transition:'none',elements:[{id:'headline',type:'text',text:'Hello SceneScript',x:10,y:35,width:80,height:30,animation:'none'}]}]};
export const aiCameraExample={version:'1.0',title:'Comic page camera',format:'landscape',scenes:[{id:'page',duration:12,transition:'none',background:'#f4ecd8',camera:{stations:[{at:0,x:0,y:0,width:100,hold:1},{at:3,x:0,y:20,width:50,hold:2,easing:'ease-in-out'},{at:8,x:50,y:20,width:50,hold:1,easing:'ease-in-out'},{at:10,x:0,y:0,width:100,hold:2,easing:'ease-in-out'}]},elements:[{id:'panel_left',type:'shape',x:4,y:25,width:42,height:40,fillColor:'#b86445',animation:'none'},{id:'panel_right',type:'shape',x:54,y:25,width:42,height:40,fillColor:'#285f80',animation:'none'},{id:'label_left',type:'text',text:'Panel 1',x:7,y:35,width:36,height:15,fontSize:64,animation:'none'},{id:'label_right',type:'text',text:'Panel 2',x:57,y:35,width:36,height:15,fontSize:64,animation:'none'}]}]};
export const aiSpeechExample={version:'1.0',title:'External narration workflow',format:'landscape',scenes:[{id:'opening',duration:5,transition:'none',narration:{text:'Welcome to our story. Let us take a closer look.',instructions:'Warm, calm narration. A short pause after the first sentence.',speaker:'Narrator'},elements:[{id:'opening_title',type:'text',text:'Our story',animation:'none'}]}]};
export const aiGuideExamples=[aiMinimalExample,aiCameraExample,aiArtExample,aiSpeechExample];
const presetExamples=textPresets.map(preset=>{const e=applyTextPreset(newElement('text','preset'),preset);return preset+': '+JSON.stringify({font:e.font,color:e.color,...(e.bold?{bold:true}:{}),...(e.textGradient?{textGradient:e.textGradient}:{}),textEffects:Object.fromEntries(Object.entries(e.textEffects).filter(([,v])=>v.enabled))});}).join('\n');

// One self-contained copy/paste specification for all AI pages and /ai.txt.
// Structural declarations come from schema + factories; prose explains semantics.
export const aiGuide = `# SceneScript 1.0 — complete authoring specification

## 1. Start here
SceneScript turns JSON into an editable animated presentation/video in a browser.
A Project contains sequential Scenes; each Scene contains layered Elements.
Elements can be text, images, shapes, speech/thought bubbles, video or simulations.
A scene camera can visit panels on a whole comic page, pause and zoom into details.
This document is self-contained: no website access, linked manual or schema download
is needed. It describes existing features only. Read §§1–4 first, then the feature
sections you need; §11 defines every field and §12 contains complete examples.

Authoring workflow:
- Reuse the user's topic, audience, aspect ratio, style and desired duration.
  Ask only about materially missing details; if told not to ask, make reasonable
  assumptions. Ordinary conversation is allowed while planning.
- Identify the target audience FIRST: use the user's audience, or infer a plausible
  one from the requested video (language, interests, prior knowledge and needs).
  Shape the content AND YouTube publication copy for that audience; see §3.
  Research relevant audience/search terms when browsing tools are available;
  otherwise choose reasoned topic-relevant terms, never claim live trend research.
- Arrange real content and reading time before adding effects. Omit unused fields.
- Every completed video project MUST have a suitable cover in Project.thumbnail.
  Reuse a suitable supplied/existing cover; if missing, create a real thumbnail
  with available image-generation tools, matching the audience, topic and format.
  If no such tool is available, arrange a real image with the user BEFORE final
  output. A prompt, filename or invented Base64 is NOT a completed cover.
- Resolve missing media with the user BEFORE final output. Never invent Base64.
- Final deliverable: exactly ONE valid JSON object, with no Markdown fence,
  introduction or explanation outside it. Do not output the notation from §11.

Smallest useful example (copyable JSON; expanded examples are in §12):
${JSON.stringify(aiMinimalExample)}
Examples demonstrate syntax, not finished publication packages: add audience-specific
metadata and a real cover when authoring a completed video. Legacy imports may omit them.

## 2. Notation and universal rules
The following is specification notation, NOT JSON syntax:
  field!: Type                 required field
  field: Type = value          optional field; omission uses the stated default
  field: Type                  optional; inheritance/conditional rules below apply
  num[a..b], int[a..b]          inclusive numeric bounds; int requires whole numbers
  num(a..b], num[a..b)          parenthesis excludes that endpoint
  str[a..b]                    string length in UTF-16 code units
  A | B                        either type/value; null only where explicitly allowed
  Array<T>[a..b]               array of T with a..b entries
  Map<ID,T>[a..b]              object keyed by IDs, containing T values
  = {}                        the object's subfield defaults apply (not an enable switch)
  = inherit Element.field     inherit the containing element's actual value
  ∞                           no separate per-field upper bound; global budgets still apply
A capitalized type name refers to its field block in §11, not a JSON discriminator.
Only documented field names may be emitted; !, Type names, ranges and section
references never go into JSON. JSON has no comments or trailing commas.

Universal requirements:
- Root must be an object. version is the STRING "1.0". Do not add $schema.
- Unknown fields are rejected. Numbers are finite JSON numbers, not strings;
  booleans are true/false, not 0/1 or strings. Numeric literals need a leading zero.
- Color = six-digit #RRGGBB (case-insensitive). No named/alpha/shorthand colors.
  Only fillColor/borderColor also accept "none".
- ID = 1–100 ASCII letters/digits/_/-. Scene IDs are unique project-wide;
  Element IDs are unique across ALL scenes. Asset/audio/video namespaces are
  independent. Each nonempty reference MUST resolve in its correct namespace,
  even if muted, disabled or irrelevant to the element's type.
- All times are seconds. All lengths are PROJECT pixels unless explicitly %.
  ${Object.entries(formats).map(([k,v])=>k+'='+v[0]+'×'+v[1]).join('; ')}.
  The UI scales this canvas; recorded/exported resolution may differ.
- Omit optional fields for defaults; do not substitute null or empty strings.
  Explicit null is not a general way to request defaults; see §10.
- Total JSON: <=160 MiB UTF-8 including Base64/whitespace; 1 MiB=1,048,576 bytes.
  Avoid approaching the limit: pretty-printing adds bytes. Browser memory/storage
  can impose smaller practical limits. Base64 adds roughly one third to file size.

## 3. Content, coordinates and appearance
Project.scenes plays in array order; durations add up with no transition tail time.
Scene.elements paints back-to-front: later entries cover earlier ones. Backgrounds
are below all elements. There is no zIndex. Element x/y is the box's untransformed
TOP-LEFT in % of project width/height; width/height uses the same axis percentages.
They are not coordinates relative to another element. Rotation/scaling use the
box center. Outside-canvas content is clipped; do not rely on automatic layout.

Element types and conditional defaults (all unspecified values are in §11):
- text: literal text, defaults text="Your story starts here.", color="#ffffff".
- shape: geometric form; text="", color="#b86445". shapeType selects the form;
  fillColor defaults to color; borderColor is independent. Either paint can be
  "none". Rectangle radius rounds corners; other shapes ignore radius.
- image: asset refers to Project.assets; text="", color="#ffffff". fit="contain"
  centers the whole image with transparent margins; "cover" fills and clips.
  Background images always use centered cover. No object-position or tint field.
- bubble: defaults text="Hello!", x=10,y=10,width=40,height=24,fontSize=48,
  color="#222222",fillColor="#ffffff",borderColor="#222222",bubble={}; see §6.
- simulation: requires non-null simulation; omission creates particles defaults.
  text="",color="#ffffff". See §7. Other types default simulation:null.
- video: video is VideoSettings; omission supplies playback defaults. Other types
  default video:null. text="",color="#ffffff". Only video.asset selects a video;
  Element.asset always selects an IMAGE. For real playback set video.asset.
Text/image/shape/video defaults: x=10,y=35,width=80,height=30,fontSize=90.
Non-bubble types default bubble:null. All types accept/validate retained settings
for other types, but those may do nothing visually. In particular draw is visually
shape-only; paper, afterimages and particle exits have STRICT type limits (§7).

Typography:
- Text is textContent, never HTML/Markdown. Newlines and whitespace are preserved;
  normal wrapping occurs at break opportunities; long words may be clipped.
- Text is vertically centered; align sets horizontal alignment. No auto-fit,
  automatic font shrinking, text padding or lineHeight field exists for ordinary
  text; bubbles have their own padding/lineHeight. Size boxes generously.
- Nonempty runs replaces text with concatenated run.text; <=2000 runs and <=10000
  total UTF-16 units. Omitted run styles INHERIT actual element styles, not static
  font/color/bold defaults. All formatting fields remain validated.
- Allura, Great Vibes, Parisienne and Sacramento are bundled; other fonts are local
  system fonts and can fall back. Font enum:
  ${guideFonts}
- Element.textGradient colors glyphs, not the box; overrides element/run colors
  visually, but retained colors must still validate. Each run/wrapped fragment
  starts its own gradient. textEffects applies across runs; leave box space for
  glow/outline/shadow, which may be clipped. These effects are for text/bubbles.

Gradients: scene.backgroundGradient, shape.fillGradient, text/bubble.textGradient.
Provide type and 2–16 stops sorted by position; equal positions make hard edges.
Opacity is per stop. Gradients override solid paint, not blend over its fallback;
transparent stops reveal underlying layers. angle follows CSS (0 up, 90 right);
radial/conic x/y is the center, radial reaches the farthest corner. No repeating
or animated gradients. Background images draw above scene color/gradient.

YouTube publication package (populate for completed videos, not only when asked):
- Project.title is the proposed YOUTUBE TITLE, not an internal project label.
  Write a compelling, clear audience-specific hook/video promise, with natural
  relevant search terms. Keep it truthful; no misleading clickbait or guarantees.
- Project.description is the proposed YOUTUBE DESCRIPTION, not a scene-by-scene
  synopsis, production notes or an explanation of how the animation works. Open
  with why this audience should watch, then useful context and the video's value;
  add a suitable call to action only when helpful. It must still match the video.
- Project.hashtags: select a small focused set of relevant topic/audience hashtags
  to support discovery, not generic tag stuffing or invented trending claims.
  hashtags is a comma-separated STRING (e.g. "#Topic, #Audience"), not an array.
- Project.firstComment: a ready-to-paste audience engagement starter when useful.
- Project.thumbnail: the actual cover/YouTube thumbnail. It MUST be present for a
  completed video; create one if no suitable cover exists (workflow in §1).
  Use an independent raster {name,data}, never an asset ID/SVG or a prompt.
These are plain publication texts and a cover saved in JSON for manual use on
YouTube, not scene text, video-container metadata, automatically posted comments
or uploads. The thumbnail is never rendered in video. See §8 for media limits.

## 4. Timeline, entry/exit and scene transitions
Times reset to zero at each scene; Project duration=sum(scene.duration).
Element.at controls when it appears. until:null means scene end; explicit until
must be >at and <=scene.duration and is EXCLUSIVE. Hidden speakers may still
supply anchors. Entry progress p=clamp((sceneTime-at)/animationDuration,0,1).

Entry animation:
- none: immediately visible at at; animationDuration still must be >=0.01.
- fade: opacity multiplied by p (linear).
- slide-left / slide-up: start 80 project pixels right/below, ease to zero.
- zoom: scale 0.7→1. Slides/zoom use cubic ease-out 1-(1-p)^3.
- pan: scale 1→1.1 linearly; NO sideways pan, no repeat.
- typewriter: reveals floor(UnicodeCodePoints*p); text/bubbles only; runs retain
  formatting. Code points are not grapheme clusters: joined emoji can split.
- draw: shape outline in first 80%, fill fades in last 20%. Uses border settings,
  or a 4px outline in fillColor/color if borderWidth=0 or borderColor="none".
  No bitmap-to-line tracing; no drawing effect on non-shapes; forbidden on groups.
Exit occupies the last min(exitDuration,end-at) seconds, adding no duration:
none; fade (linear opacity); slides (80px in named direction); zoom-out (1→0.7);
particle exits (§7). Slide/zoom exits use cubic ease-out. Entry/exit may overlap:
opacities/scales multiply, slide offsets add. Motion-path offset, element/path
rotation, local slide and scale compose around the box center; placement then
group transforms then camera are applied. Rotation also rotates local slide.

Scene transition (applies to the incoming scene; first scene has no outgoing one):
- none: no fade/transform. fade: incoming elements/background IMAGE fade in over
  their OWN immediate background color; NOT a crossfade from the previous scene.
- crossfade: full incoming scene opacity 0→1 over the held outgoing scene.
- slide-left/right/up/down: incoming travels in named direction from one viewport
  away; previous scene travels out in same direction. Linear progress.
- wipe-left/right/up/down: reveals incoming scene by clipping in named direction;
  outgoing stays underneath. zoom-in: incoming scale 0.7→1 and opacity 0→1.
- zoom-out: incoming scale 1.3→1 and opacity 0→1; outgoing stays underneath.
- through-black: outgoing fades first half; incoming second half; black overlays.
Non-fade transition progress is linear and clamped; it is retained when paused or
seeking. First-scene transitions run over black. Viewport size sets slide travel.
Transitions overlap the start of a scene, do not extend durations or mute narration.

Accepted edge cases (not rejection rules): at==scene.duration is legal but usually
invisible during playback; animationDuration/transitionDuration may exceed scene
length, leaving a partial animation. At intermediate boundaries select the next
scene at time 0; at project end keep the last scene's endpoint. until:null retains
that stopped-endpoint compatibility; explicit until never does. Preview suppresses
scene fade while paused/seeking; playback AND export honor it. Elements' own
animations still follow the selected time. Plan useful at<end and enough reading
time after entrances; prefer short captions, good contrast, sparse effects. The
optional safe zone (12% sides,10% top,18% bottom) is guidance, not a validation rule.

## 5. Comic pages and scene cameras
Use ONE Scene for a whole page: one full-page image (or arranged panel Elements),
then camera.stations for the reading route. Keeping panels in separate Scenes
creates cuts/transitions instead of a flight across one page. §12 has a complete
asset-free two-panel camera example; a real page can replace its panel elements.

CameraStation fields: at=ARRIVAL in scene seconds, x/y=viewport top-left in project
%, width=% of project width. Height uses the SAME percentage of project height:
project aspect ratio is always preserved. No independent height, rotation or 3D.
- First station MUST have at=0; 1–32 stations in authored order.
- x+width<=100 AND y+width<=100; all rectangles inside project.
- Hold at a station from at to at+hold; at+hold<=scene.duration.
- Next at MUST be > previous at+hold. Remaining time is the travel duration.
- easing belongs to the DESTINATION: linear or ease-in-out (smoothstep).
- After last arrival hold that view until scene end, regardless of last hold.
- Coordinates/width interpolate together; scale=100/width. A width of 50 means
  2× zoom, width 25 means 4×. A panel shaped differently from the project frame
  needs margins or cropping. There is no automatic panel detection.
Example schedule: overview at0 hold1 → left panel at3 hold2 → right panel at8
hold1 → overview at10, scene ends12. This means travel during 1–3, 5–8 and 9–10.

space="scene" (default) follows the camera; space="screen" is exempt ONLY from
that camera, useful for narrator text/subtitles. Own animations/group transforms
still apply; screen-space Elements are not automatically topmost layers and do
not persist across Scenes. Background color/gradient/image follows the camera;
continuous project simulation/video does not. Camera never alters media time,
audio volume, element geometry or duration. Outgoing camera holds scene-end pose.
Overview, camera-frame handles and safe-zone guides are editor-only, not JSON.

Image crop is independent: Crop x/y/width/height are % of the ORIGINAL intrinsic
image, not project or element. Require positive size and x+width,y+height<=100.
Clip that rectangle first, then fit it using contain/cover. Reuse one asset for
multiple panels/crops without duplicating its payload. SVG crops stay live;
anchors remain box-local and do not automatically follow a changed crop.
Panel templates are editor helpers creating ordinary image+rectangle Elements,
not a template field/type. Camera movement is continuous even under stopMotion.

### Reusable 3D stages and characters (first prototype)
Project.characters and Project.stages are independent ID maps (max 30 each).
Characters are procedural block robots: name, height and body/head/limb/accent colors.
Stages currently share one built-in block plaza geometry, customized by name and
sky/ground/block colors; a stage name does NOT generate arbitrary scenery.
Scene.stage3d=null/omitted disables 3D. Otherwise stage references Project.stages;
actors (max 12) reference Project.characters. Unlisted characters are absent.
Actors have scene-local unique IDs, independent of 2D Element IDs. Each scene
explicitly supplies positions/actions: no implicit cross-scene state or persistence.
Positions x/z and toX/toZ use 3D WORLD UNITS, not 2D percentages; Y is up, feet
stand on the ground. rotation is yaw in degrees; scale multiplies character height.
at/duration define one action interval within the scene. Actors remain visible
before/after it; positions interpolate linearly and clamp to their endpoints.
Actions: idle (subtle breathing), walk (arm/leg cycles), wave (right-arm gesture).
Rotations are explicit; movement does not automatically face the travel direction.
Camera yaw/pitch are degrees, distance/targetX/Y/Z world units; orbit is yaw degrees
per second, using scene-local time. This is independent of Scene.camera's 2D crop.
The 3D stage is an opaque background above ordinary scene backgrounds, below all
2D elements; the 2D scene camera transforms it too. Use screen-space captions.
Absolute-time poses are shared by preview, stills and video export. WebGL2 is
required; unavailable graphics/context loss is an error, never a silent blank export.
The 3D dialog selects resource type/ID on the left and edits its shared definition
with an isolated live preview on the right (even without a scene assignment).
Scene actors/camera remain in a separate expandable section; previews never add
actors or modify scene cameras. Confirm applies drafts; closing discards them.
Each character/stage can be exported/imported independently. Imports are independent
copies across projects;
ID collisions offer copy or explicit update. No GLB import, arbitrary JavaScript,
physics, lip sync, automatic rigging or arbitrary character shapes in this prototype.
Minimal syntax example (add publication copy and a real cover for final delivery):
{"version":"1.0","title":"Hello robots","format":"landscape","characters":{"robot":{}},"stages":{"plaza":{}},"scenes":[{"id":"hello","duration":5,"stage3d":{"stage":"plaza","actors":[{"id":"r1","character":"robot","action":"wave"}]},"elements":[]}]}

## 6. Bubbles, anchors, groups and motion paths
Bubble = one movable body+text+tail. kind=speech (rounded) or thought (cloud+3 dots).
Use normal text/runs/font/color, plus fillColor/borderColor/borderWidth. Border is
solid; shapeType, borderStyle, fit, fillGradient and radius do not set bubble shape.
Text has extra safe inset (speech 9%, thought 20%) PLUS padding; excessive padding
leaves no text space. Text clips independently; tail may extend outside body box.
- tail.mode="manual": target x/y in % of untransformed BUBBLE body; values can
  extend beyond 100. target inside body suppresses tail/dots.
- "anchor": tail.element is a SAME-SCENE element ID, tail.anchor a key in its
  anchors map. Neither is an asset ID. Missing target/reference rejects import.
- "none": no tail/dots. base:null attaches automatically; numeric base is degrees
  (0 right,90 down). width controls speech attachment/thought dot size; curve bends
  speech perpendicular to target direction. base/curve affect speech only.
Anchor x/y is 0–100% of the speaker's untransformed element BOX, not actual image
pixels (consider contain margins). Full motion/placement/group/camera transforms
are applied, including cross-space inverse mapping. The bubble itself does not
follow its speaker automatically. Visibility of speaker/bubble is independent.

Groups are FLAT controllers on existing same-scene element IDs, not containers:
- 1–100 members, each may belong to only ONE group. No nested groups. Same space
  for every member; mixed scene/screen group is invalid. Group has no space field.
- Group IDs unique per scene and cannot collide with that scene's element IDs.
- Members keep own project-% coordinates, order and clocks; group adds x/y offsets,
  rotates/scales about project-% pivot, multiplies opacity and gates visibility.
- Group allows entry none/fade/slide-left/slide-up/zoom/pan and non-particle exits;
  not typewriter/draw or artistic objects. Group video audio follows the intersection
  of member/group intervals, not their opacity. Narration/music unaffected.
Placement is a STATIC pixel affine matrix: x'=a*x+c*y+e,y'=b*x+d*y+f;
all six coefficients required and abs(a*d-b*c)>=1e-8. Member animation → placement
→ group. Ungroup can bake current transform/opacity to placement; not future
motion or the group visibility gate. Ordinary authoring usually omits placement.

MotionPath is separate from entry animation and works on all element types/groups:
- start is SCENE time, independent of Element.at. Paths add relative x/y offsets
  to the base position (X % of project width, Y % of height), NOT absolute positions.
  Before start, stay at initial path offset. Scene end cuts motion, no extra time.
- line: from→to. bezier: cubic from/control1/control2/to. ellipse: center/radiusX/Y,
  startAngle 0 at right; clockwise positive moves downward. Equal % radii are NOT
  a pixel circle on a non-square canvas: radiusX*canvasW=radiusY*canvasH is a circle.
- easing=linear approximates constant own-space pixel speed (256-segment arc-length
  table for curves); ease-in-out eases it. Camera can change apparent screen speed.
- repeat=once/loop/ping-pong. Loop jumps to start except closed ellipse; ping-pong
  reverses traversal and orientation. after=hold/reset applies to once only.
- orient adds tangent angle to Element.rotation; zero tangent gives 0. It does not
  rotate the path displacement itself. Elements still rotate about their own center.
- type=segments: begin at from; each segment begins at previous endpoint. Segment.to
  and controls remain offsets from ELEMENT BASE, not previous endpoint. Segment
  duration is movement; pause holds AFTER arriving. Traversal length=sum(duration+
  pause). Root duration/easing/to/controls are preserved/validated but do not drive
  segments motion. Root start/from/repeat/after/orient do. Ping-pong reverses the
  whole timeline including pauses; a pause retains the arriving tangent.
- All supplied shape-specific path fields validate even when unused by selected
  type. No automatic smoothing at sharp segment joins. Wave/zigzag/spiral/flight
  templates create ordinary segments; no pathTemplate or custom expression field.

## 7. Artistic effects and simulations
Every artistic OBJECT goes on Element, never Project, Scene or Group. Omitted
objects have enabled=false; set enabled:true explicitly to see them. Field names,
ranges and defaults are in §11. Do not invent effect/effects/morph/morphing/preset
objects. These are deterministic 2D effects, not automatic morphing or 3D rendering.

All twelve options (Element field names are case-sensitive):
1. Line drawing: animation="draw"; shape only; see §4.
2. Particle dissolution: exitAnimation="particles-dust" / "particles-sparks" /
   "particles-confetti"; ONLY text/image/shape. 48 actual-color fragments; dust
   drifts/shrinks, sparks scatter up, confetti tumbles/falls. Uses exitDuration,
   clamped to visible interval; ends at until/scene end without extending it.
3. Liquid distortion: element.liquid; water/melt warp; strength/wavelength in
   project pixels, speed multiplier; strength 0 bypasses. Does not change geometry.
4. Double exposure: element.exposure; screen/multiply/overlay/soft-light/lighten
   against lower layers in SAME scene. strength multiplies existing opacity:
   0 HIDES the element; disabled restores normal rendering. No silhouette extraction.
5. Collage / paper: element.paper; ONLY text/image/shape when enabled. Occupies
   original bounds, padding scales content without reflow and clamps for tiny boxes.
   Roughness clips inward; straight edge/roughness0=rectangle; texture0=no grain;
   shadow0=no outside shadow. Seed keeps edges/grain stable. No layout changes.
6. Stop motion: element.stopMotion; hold visual sample frames starting at at.
   Optional seeded per-frame jitter/rotation; both 0 = pure stepped motion.
   Entry/path/typewriter/draw/SVG/simulation, liquid/glitch/reveal/kaleidoscope/
   lighting/particles use sampled time. Real visibility, video footage, camera,
   group movement, audio and scene transitions remain continuous. First wobble=0;
   exact scene endpoint is evaluated so effects can complete. Export fps unchanged.
7. Afterimages: element.afterimages; ONLY text/image/shape when enabled. True
   historical content/poses at current sampled time-index*spacing; skip pre-at
   samples, oldest first behind source. Weight=opacity*(count+1-index)/(count+1),
   times historical visibility/opacity/exposure strength and current scene fade.
   No recursive trails/cross-scene history or lifetime extension; current camera.
   Tint recolors RGB preserving alpha; ghosts use normal compositing, main Element
   retains exposure mode. Static content can produce overlapping identical ghosts.
8. Mask reveal: element.reveal; direction/circle/seeded brush. Delay/duration relative
   to at, sampled clock. Before delay fully masked; at completion no mask. Circle
   origin is box %, brush strokes alternate. Does not extend visibility; long masks
   may never finish. Includes prior effects/outside shadows; particles carry revealed
   pixels beyond mask. No external mask assets. Use animation=none for pure reveal.
9. Glitch / channel shift: element.glitch; seeded horizontal band + RGB offsets
   in project pixels. Frame=floor(max(0,sampledTime-at)*rate); rate0 holds the pattern.
   Either offset0 disables just that component; BOTH0 bypass. No opacity flashing.
   RGB screen recombination may alter edge alpha/color; not geometrically lossless.
10. Halftone / printmaking: element.print; luminance controls dot/line ink coverage.
    size in project pixels, angle in degrees; ink/paper colors. Source alpha retained,
    no paper fill in transparent gaps. strength blends with original; 0 bypasses.
    Static screen geometry; not physical CMYK simulation.
11. Kaleidoscope: element.kaleidoscope; even 4–16 alternating mirrored sectors,
    clipped to element box. Center in box %, zoom magnifies source; rotation sets
    sector orientation, speed rotates SOURCE motif (degrees/s relative to at).
    Speed0 freezes only motif rotation, not its media/animation. Transparent gaps
    can occur; adjust zoom/center. Narrow 2-project-pixel clip overlaps avoid seams
    but may increase translucent edge alpha. Up to 16 visual copies per element.
12. Light and shadow: element.lighting; colored multiplicative 2D spotlight with
    alpha-shaped cast shadow, NOT 3D normals/occlusion/inter-element shadow casting.
    Center is box %, radius=% LONGER side. Center multiplier per color channel=
    1-strength+strength*color/255, outer multiplier=1-strength+strength*ambient.
    Radial interpolation; black stays black; it never brightens beyond original.
    angle0=light from right,90=below,-90=above; shadow points opposite. angle(t)=
    angle+speed*max(0,sampledTime-at). Orbit radius=% SHORTER side; move center by
    orbit*cos(angle(t)),orbit*sin(angle(t)). Orbit0: speed rotates only shadow.
    Speed0: static light. strength0 bypasses ALL; shadowOpacity0 removes ONLY shadow;
    shadowBlur0 sharp. Source alpha retained except optional outside cast shadow.

Processing order: source/line drawing → paper → liquid → glitch → print →
kaleidoscope → lighting → reveal → particles; afterimages reconstruct earlier
processed sources/poses, never recursive trails. Exposure is applied once at layer
compositing. Use few complementary effects: copies, shadows and particles can be
expensive. Text glow/outline/shadow is separate from lighting/paper/exposure.

Simulation object (NOT particle exit): type particles/snow/bubbles; particles float
up and pulse, snow drifts down, bubbles rise with highlighted transparent interiors.
Element.simulation uses sampled sceneTime-at and transparent canvas; Project.
backgroundSimulation uses continuous PROJECT time behind scene layers, never
restarting at scene changes. Hide/lower scene backgrounds to reveal it. Default
size particles5/snow6/bubbles18 project pixels; all other defaults in §11.
Max 5000 simulated particles per scene, including project background count.
Seeded trajectories are replayable, not accumulated physics; no fire/waves types,
sound, external scripts or scene-loop field. Rendering resolution is bounded.

Text preset BUTTONS are NOT JSON fields or enum values. Author explicit settings;
for neon use a dark background. These compact settings come from editor factories:
${presetExamples}

## 8. Real media and Safe SVG assets and deterministic animation
Editor UI: the thumbnail stays in the project panel. Below it, Resources opens
image/video/audio management (including speech file exchange); 3D resources opens
characters/stages. Media edits apply directly and remain undoable. This UI grouping
does not change the JSON asset maps, references or publication thumbnail semantics.

References and limits:
- Element.asset / Scene.backgroundAsset → Project.assets (ImageAsset).
- Element.video.asset / Project.backgroundVideo.asset → Project.videos (VideoAsset).
- Project/Scene.narration.asset → Project.audios (AudioAsset).
- Empty reference "" means unassigned, NOT a URL/path. Never fake bytes or IDs.
- ImageData: exact lowercase data:image/png;base64, data:image/jpeg;base64,
  data:image/webp;base64, or data:image/svg+xml;base64, then actual file bytes.
  RasterData excludes SVG. Raster <=8 MiB; SVG <=1 MiB UTF-8 before Base64.
  Max100 image assets; browser decode required and <=40,000,000 natural pixels.
- VideoData: data:video/<subtype>;base64, bytes <=32 MiB; <=30 files; real duration
  0.001–86400s. AudioData analogous data:audio/<subtype>;base64, <=32 MiB; <=30 files;
  real duration 0.001–3600s. Use canonical lowercase; video prefix is runtime
  case-insensitive. Reject playlists/streams (mpegurl/dash+xml/playlist for video;
  mpegurl/playlist for audio). Subtype characters: ASCII letters, digits, dot, plus, hyphen; no spaces/slashes.
- Standard Base64 alphabet, nonempty payload, full four-character blocks with
  appropriate = padding. No whitespace/Base64URL/external URLs. Encode only real
  available bytes with an encoding tool. Reuse assets rather than duplicating data.
- Browser must decode every media file and agree with stated duration within 0.2s.
  Supported containers depend on browser; MP4/WebM video and MP3/WAV audio are
  useful choices, not guaranteed codec support. Audio mono/stereo only, decoded
  <=64 MiB per file and <=128 MiB referenced preparation budget. Text-only agents
  cannot synthesize valid image/audio/video bytes; arrange later real-file import.
- asset="" may show an editor placeholder, which is NOT dependable export content.
  For a video, null/empty video.asset is unassigned, not a playable clip. Live
  fallback to an image/placeholder differs from file export; author video.asset.

Safe SVG profile (supported subset, not arbitrary SVG):
- Root svg with xmlns="http://www.w3.org/2000/svg" and positive viewBox, or positive
  numeric width/height deriving one. <=2000 nodes,32 levels,100 animations.
- Static tags: svg,g,defs,path,rect,circle,ellipse,line,polyline,polygon,text,tspan,
  linearGradient,radialGradient,stop,clipPath,title,desc. No nested svg roots.
- Unique IDs beginning with letter/_; local url(#id) references only for paint/
  clip-path; no nested clipping or missing refs. Instances get isolated ID prefixes.
- Finite numeric geometry bounded ±100000; standard geometry/transform
  (matrix/translate/scale/rotate/skewX/skewY), paint/stroke/opacity, basic fonts,
  gradient attributes. Inline style ONLY for accepted paint/stroke/opacity/clip/
  basic font properties, converted to attributes; prefer explicit attributes.
- No scripts, on* handlers, links, href/use, external refs, foreignObject, embedded
  image, filter, mask, style element, CSS animation, remote fonts, DOCTYPE/entities
  or XML processing instructions except XML declaration. Reject, do not strip.
- animate: opacity,fill,stroke,fill-opacity,stroke-opacity,stroke-width,
  stroke-dashoffset,x,y,x1,y1,x2,y2,cx,cy,r,rx,ry,width,height. Paint animation must
  use colors, not references. animateTransform: attributeName=transform and
  type=translate/scale/rotate. Graphic parents only; no additive/accumulate.
- Require dur=0.01–3600s and from/to OR values (<=200). begin defaults0, numeric
  0–3600s only, not event/chained expressions. Seconds/s/ms supported.
  repeatCount defaults1, positive <=1000 or indefinite. fill=freeze/remove;
  calcMode=linear/discrete/spline. keyTimes must match values and monotonically
  cover0..1; keySplines has four0..1 values per segment.
- Image SVG clock=max(0,sampledSceneTime-at); background SVG clock=sceneTime.
  Pause/seek/recording use the playhead, not wall time; outgoing scene holds end.
  Cropped SVG viewport: numeric/px dimensions, else viewBox, else300×150;
  percent/physical root dimensions do not define the crop viewport.

Example SVG source ONLY (encode its UTF-8 with an actual tool before using as data):
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><circle cx="30" cy="50" r="15" fill="#ff8800"><animate attributeName="cx" from="30" to="170" dur="2s" repeatCount="indefinite"/></circle></svg>

## 9. Video, narration and synthetic music
VideoSettings selects [start,end) inside the referenced file: 0<=start<file.duration;
end:null uses file end, otherwise start<end<=file.duration. Empty asset uses a
86400s placeholder bound for validation but produces no video. Element video
starts at Element.at; general Element.fit does NOT override VideoSettings.fit.
Loop repeats excerpt; without loop the last picture is held (end-0.001, no earlier
than start), while audio stops at excerpt end. until/group visibility clips video
and its audio. Visual opacity/exit fade does NOT fade video audio. Native preview
seeks to correct drift, not guaranteed frame-accurate decoding. Outgoing scene
video freezes/mutes during transitions. Live scene fade can gate audibility;
offline exported sound follows mute/volume/trims/scopes, not visual fades/opacity.
Project.backgroundVideo uses continuous project time from0, above project
simulation and below all scenes; opaque scenes may hide it WITHOUT muting audio.

Narration is imported speech, NOT speech generation or subtitle text. Each Project
and each Scene has ONE narration assignment; use scene assignments for separate
files per scene, or a project assignment for one continuous voice track. Both may
coexist/overlap; avoid doubling a voice. narration.text is the actual SCRIPT;
instructions is delivery direction (never read aloud), speaker is a human-readable
voice/character label, not a provider voice ID. These strings can be saved BEFORE
an audio file exists: omit asset or set asset:"". Empty/unassigned drafts are silent.

External speech workflow (no cloud API/key needed):
1. AI writes Scene.narration.text, instructions and speaker; never fake audio bytes.
2. Editor "Export speech scripts (ZIP)" creates one UTF-8 TXT per NONBLANK script,
   including project narration if present. Already voiced scripts may be exported
   again for regeneration. Unzip, copy ONLY the SCRIPT section to the speech service;
   apply speaker/direction separately using that service's supported controls.
3. Save generated MP3 with the EXACT filename printed in the TXT header; WAV and
   other supported audio extensions may use the same basename. No added (1) suffix.
4. "Assign speech files" accepts multiple AUDIO files, not TXT/ZIP. Basenames match
   generated scope/scene-ID + content fingerprint (text/instructions/speaker), not
   scene index/display name. Rename/reorder/retime is safe; after changing the script,
   speaker or direction export AGAIN. Old, unknown or duplicate names reject the
   WHOLE batch without changes. Import subsets is allowed. Matching does not verify
   what the speaker actually said; filenames are not authentication.
5. Each file is decoded and its real duration measured. Matching assignments reset
   file trim to start=0,end=null while retaining narration.at/volume/mute/fades and
   script metadata. Reimports replace the assignment without altering shared clips.
   Existing audio budgets (30 assets,32 MiB/file,160 MiB total JSON) still apply.
6. Short scenes automatically EXTEND to at + imported clip duration; never shorten
   or speed up speech. A project-wide track extends the LAST scene if total time is
   insufficient. Per-scene max3600s remains; impossible extensions cancel the batch.
   Explicit element/group until values, camera stations and paths are NOT stretched;
   the final camera view holds to the new end. Later scene start times shift.
   Manual shortening below assigned narration is blocked; trim, move or remove it
   first. Ordinary editor assignment/replacement/import also fits narration timing.
   Deleting an audio file keeps its script metadata for regeneration. Undo restores
   the whole batch, assignments AND durations. Save the SceneScript JSON afterward.

Legacy runtime playback still clips to scope; pure JSON validation alone does not
extend anything. In the editor, audio-backed narration scopes are fitted on load.
start/end trims select the file excerpt (3600s placeholder bound when unassigned).
Playback length=min(end-start,remaining scope after at); fade gain=min(fadeIn,
fadeOut factors) on that interval. Text/direction/voice labels are not rendered or
spoken automatically. No standalone-audio element or narration loop; muted refs
still validate and retain their timing floor. §12d is a complete draft example.
audioDucking=true lowers synthetic music to30% during active/unmuted/nonzero-volume
narration, 0.15s lead-in and0.3s recovery; overlap takes strongest reduction. It
never ducks video audio/other narration, and does not detect silence within files.

Music is local SYNTHETIC timbres, not a remote AI-audio service, vocals or samples.
Project.music:null disables. An object defaults enabled:true (unlike art objects).
mode=generated: seeded chords/melody/bass with instruments1/2/3 (fallback to1),
styles calm/focus/uplifting. No lyrics. Later instruments only serve explicit notes.
mode=score: notes use ABSOLUTE project seconds; tempo does not rescale note times.
Default ensemble if instruments omitted: pad,handpan,bass with unique matching IDs.
Provided instruments each default to PAD settings, regardless of name; name defaults
id. UI instrument preset names are not JSON types: describe wave/partials/ADSR etc.
Partials normalized, at least one gain>0; noise ignores pitch/partials. cutoff is
limited to renderer Nyquist. Echo uses six repeats; release/echo/reverb extend voices.
Max32 overlapping audible notes INCLUDING release/effect tails; <=10000 score notes.
Generated scores are also polyphony-checked. Notes must reference own instrument IDs;
pitch is MIDI21..108 (69=A440). End-of-project cuts tails; no extra duration. Music
pauses/seeks with project playback and spans scenes; enable tab/system recording
sound when needed. Countdown is silent/frozen for all media.

## 10. Nulls, validation and delivery checklist
For NEW JSON omit unused fields rather than using null indiscriminately. Supported
null semantics/legacy normalizations (not additional fields to emit):
- Root assets/videos/audios omitted OR null → {}; music/backgroundSimulation/
  backgroundVideo/narration/thumbnail omitted OR null → disabled. Metadata strings,
  version/title/format/scenes and audioDucking reject null.
- Scene optional fields use defaults on omission OR null, EXCEPT groups:null rejects;
  id/elements never null. camera/narration/gradients null disable them.
- Element crop/placement/motionPath/until/fillGradient/textGradient allow null.
  fillColor omitted/null inherits legacy color (bubble:white). simulation:null is
  legal except on simulation type. video:null is legal for every type, but omission
  on video creates default playback settings. bubble:null is illegal on bubble
  type, otherwise allowed. anchors:null rejects. Other Element fields reject null.
- Group fields default on omission only; until/motionPath also accept null. Required
  point/matrix coordinates reject null. Narration/VideoSettings.end:null=file end;
  other individual settings reject null. Bubble.tail.base:null=automatic direction.
- Nested defaults do not relax required keys. {} works for all-optional objects
  such as lighting, not Camera (needs stations) or Gradient (needs type and stops).

The field catalog derives from the typed schema; runtime/import additionally
checks references, global IDs, scene/scope times, camera ordering/holds/bounds,
group space/exclusivity, crop sums, matrix determinant, real-media bytes/decoding,
SVG safety, duration agreement, polyphony and particle budgets. Schema maxLength
counts code points; runtime string limits count UTF-16. Legacy null normalization
can accept cases the typed schema deliberately excludes. Runtime is authoritative.

Before final JSON output check:
1. Required root/scene/element fields, unique IDs, exact spelling/case; no unknowns.
2. Correct coordinate/time scopes, all references resolved, no invented media bytes.
3. Duration/holds/reading time; ordinary text fits its box, especially portrait.
4. Correct type restrictions: enabled paper/afterimages/particle exits only on
   text/image/shape; group entries/exits exclude draw/typewriter/particles.
5. Defaults omitted; enabled:true for wanted object effects; exposure.strength0 hides,
   while print/lighting/liquid strength0 bypasses; glitch needs both offsets0.
6. Audience-specific YouTube title, description and relevant hashtags ready;
   suitable real thumbnail present (reuse existing, otherwise create it).
7. Return plain valid JSON only after planning/media arrangements are settled.

JSON is the editable project, NOT a video file. The editor can import pasted JSON
or a .scenescript.json file and save it; recent editing/undo state is not project
content. Preview/recording never exports handles, selection outlines or safe zones.
Direct MP4/WebM export is browser-side, requires compatible decoders and encoders;
MP4 can use bundled local AAC fallback. Export size (480p/720p/1080p short edge),
24/30/60 fps and audio choice are UI-only, NOT Project fields. No server transcoding or
automatic MP4→WebM fallback. Export can be cancelled; it does not replace editable
JSON. Export writes to a selected file (where supported) or a temporary local
browser file, not one growing video ArrayBuffer. Large exports recommend direct
file output. Free disk/browser quota is required; size estimates are approximate.
Without disk storage only small exports are allowed. Temporary completed videos
can be deleted in the export dialog; later exports clean them up after 24 hours.
Wait for downloads to finish before clearing them. No upload or resumable export.
Elapsed time and approximate rendering time remaining are UI-only, based on recent
measured export speed; final file saving is shown as a separate phase.
Screen recording is another route; capture tab/system audio if wanted.
For visual review, the preview's Images & contact sheet dialog exports a PNG at
an exact project time (native project resolution) or contact sheets from selected
scene-local times. It uses the SAME renderer/clock as video export, including
camera, animation and real transitions, without editor overlays. At 0 s a fade
may still be black. Contact sheets label scene IDs and local/project seconds;
up to six samples per PNG, multiple pages in one ZIP with frames.json mapping.
Send these images back to the authoring AI to review actual layout and speaker
positions instead of guessing from JSON. These controls are UI-only, not fields.
The editor requires a viewport >=768 CSS pixels (tablet/desktop), not a landscape
project; phone-shaped videos are supported. AI documentation remains accessible
on smaller viewports. No automatic publishing or platform acceptance guarantees exist.

## 11. Field catalog (specification notation, not output JSON)
Every block below defines one object type. Follow the reference from its parent's
field; there are no hidden/unlinked field definitions or external dependencies.

${guideFieldCatalog}

## 12. Complete JSON examples
These are actual JSON, not catalog notation. They deliberately omit unused/default
fields. Keep the requested project's own content instead of copying sample text.

### 12a. Static text; no media required
${JSON.stringify(aiMinimalExample,null,2)}

### 12b. Camera visits two panels and returns to the page overview
Replace the colored panels/labels with real artwork if desired; camera settings
remain ordinary Scene.camera stations, not a panel-detection feature.
${JSON.stringify(aiCameraExample,null,2)}

### 12c. Kaleidoscope and moving light on a colorful star
${JSON.stringify(aiArtExample,null,2)}

### 12d. Speech script before external generation (no audio bytes yet)
${JSON.stringify(aiSpeechExample,null,2)}
`.trim();
