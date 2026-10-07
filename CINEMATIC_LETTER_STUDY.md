# Drift · cinematic motion and tactile paper study

7 October 2026. Isolated study requested before production visual changes. User
prioritizes paper fibers, edges and tangible lighting; keep the approved pencil
world and the quiet warm-paper identity. No production renderer changes in this
round. No deployment, real send, or live weather request for these controls.

Open `cinematic-letter-studies.html` through the existing local server at
`http://127.0.0.1:8735/cinematic-letter-studies.html`.

## Compare

### Revision after user review, 7 October

The user prefers the original swipe-up release and requests an extension of that
gesture rather than the earlier autoplay release film. **All three release
variants now run the real `openDrift`, `dDown`, `dMove`, `dUp`, wind resistance,
threshold and hand-to-wind handoff.** The footer is replay only; its scrubber is
disabled for release. A uses the native 2.6-second flight. B extends the same
flight to 5.4 seconds and adds restrained camera follow; C uses 4.6 seconds and
less follow. Recorded wind / rotations / curl remain the native calculation,
sampled against an eased retreat. Camera offset is zero at handoff and by the
time the paper disappears. Reduced motion uses
the native still/direct transition. There is no study release RAF or real send.

Paper substrate is now white `[253,253,252]` in both schemes. This replaces the
native dark paper palette only inside this study's drawPaper adapter. Neutral
fibers are baked; the existing candle layer is separate, warm near the writing
sheet's top and fading toward its lower half. Paper outside writing/candle light
remains white at night. Front and back are made from the same substrate.
The former release timeline in `cinematic-motion.js` remains an earlier shot
experiment and is no longer the release UI; arrival still uses its timeline.

Latest cadence request: extend the float and make the return to the globe smooth.
Retreat eases from the hand; paper opacity fades over flight .55–.72 and world
opacity over .50–.99, with zero velocity at fade boundaries. Globe zoom settles
from 1.26× its route-fit zoom to exactly that route-fit zoom. Wind streaks and
grain fade with paper opacity. Hint text fades before the transition; app controls
emerge over .85–1.00 so closing the hero produces no control-opacity jump.
All these changes are in the study adapter; production `index.html` is untouched.
`CINEMATIC_RELEASE_TRANSITION_TESTS.json` checks 30/60/120 Hz, monotone retreat,
fade/zoom continuity and exact endpoints. `CINEMATIC_RELEASE_DISSOLVE_QA.json`
records real gestures and bounded samples of the rendered transition.

The descriptions below of the earlier B/C release film are superseded by this
revision. Current evidence is `VISUAL_REFINEMENT_BROWSER_QA.json`, including equal
day/night texture pixel samples, actual swipe interactions and mobile viewport.

- **A — current:** the app's actual held paper, release and arrival functions,
  actual original text texture and compose styles. Study-only send controls and
  synthetic letter are still substituted, so this is not a delivery test.
- **B — quiet:** original swipe release with restrained camera follow and longer
  flight before the native cut to the pencil globe. Arrival moves
  from globe to distant paper, descends, flexes once after contact, then rests
  until picked up. Pickup ends in a still front-facing letter.
- **C — concise:** original swipe release with shorter flight than B. Arrival
  uses the prior flowing study. Same paper, wind and contact behavior.

Tabs: compose, release, arrival, paper. Replay/pause and scrub the film; choose
5 / 18 / 34 km/h recorded fixture wind, day/night and reduced motion. Arrival
supports canvas tap, Enter/Space and a separate pickup button. The paper tab has
a close-up toggle. Compose is a real textarea; its text and names carry into the
paper shots. Refresh resets all study content.

## Paper and writing

Use the app's `drawPaper` and `dWarp` instead of a separate look. The study adds
deterministic small fibers, restrained micrograin, side-lit edge compression and
a roughly one-pixel deckle alpha silhouette. A fresh letter has no invented
weather stains or old fold scars. Front and back come from the same surface;
ink appears on the front only.

B/C bake the actual text layout at twice the pixel density (760 × 1079), scaling
UVs and text coordinates together. Blank paragraphs are retained. A uses the
native 380 × 540 builder. This adapter checks the builder's source layout; if
that function changes, audit the study adapter before reuse.

Writing: narrower 620 px sheet, quieter recipient fields, consistent paper ink
for night labels, 16 px / 2.02 lines on mobile and 17 px / 2.12 on desktop.
The initial text expands its textarea to match content, allowing the paper's
outer scroll area to own scrolling. Existing app input/keyboard handlers remain;
the study immediately stops idle tilt when a writing field receives focus.

Textures are cached by dimensions, DPR, scheme and traces; maximum three entries
and six million pixels. Resize or a new line can rebuild the surface; typing on
the same dimensions reuses it. No random grain is regenerated during a film
frame. DPR is capped at 2 and the app's distance mesh LOD is reused. The front
and back letter textures are replaced, not accumulated.

## Motion and isolation

`tools/cinematic-motion.js` is an analytic shot timeline. Monotone cubic Hermite
interpolation keeps camera velocity continuous through traveling keyframes;
endpoints and changes of direction have zero tangents. Wind flex is sampled
continuously and stops on contact. A landed letter does not bob above its shadow.
Visible elapsed time controls film duration; hidden tabs pause without skipping
the shot when reopened. Reduced motion uses still paper / a direct scene change.

This page loads `tools/study-storage.js` before its iframe. All app settings,
names, draft content and synthetic letters use that in-memory fixture. It does
not read the user's browser storage. The study controls replace weather with
known values and do not call the provider. App boot may fetch local wind cache
assets, as in the existing previews.

One continuous render owner: B/C arrival and paper suppress the child's renderer,
then manually render its real globe only when visible. Compose, every release
variant and A restore the app runtime. Static paper and completed arrival shots
have no study RAF. The covered iframe is inert during arrival/paper films; the
actual release iframe stays interactive and accessible.

## Verification and integration boundary

`node tools/test_cinematic_motion.cjs` passes 12 direction/scene/wind cases,
sampled at 120 Hz: finite bounds, perspective safety, continuous velocity,
cut-after-disappearance, rest without hover, pickup continuity, readable front,
reduced motion, and differing camera/wind behavior. See
`CINEMATIC_MOTION_TESTS.json` and `CINEMATIC_LETTER_BROWSER_QA.json`.

Browser checks cover 390 × 844 and desktop, production globe at release end,
arrival contact/pick/read, reference A, C with stronger wind, real typing with
no transform and no inner textarea overflow, day/night and reduced motion.
Draw samples are JavaScript callback cost only, not GPU cost or a physical
phone FPS claim. An unattributed MutationObserver error was already present in
the browser log before the current checks; it has no source URL, and this study
does not create a MutationObserver. Do not label browser logs clean.

Physical phone keyboard/safe-area/performance remain to verify. The existing
allowlisted four-hour LAN helper supports this page:
`node tools/preview-mobile.cjs <private-LAN-IPv4> 8736 cinematic-letter-studies.html`.
No LAN listener was started for this round; use the token URL printed by the
helper when starting it.

Update 7 Oct 2026: approved B departure and white substrate/candle separation are
now integrated into the production runtime. B release uses that native tick and
paint directly; A uses the frozen pre-cinematic release reference for comparison.
`tools/release-choreography.js` is shared by study and offline app. See
`PRODUCTION_CINEMATIC_RELEASE.md` for actual gesture/storage/browser evidence.
Arrival B/C and the extra material fibers/edges remain study-only; animals are paused.

For further direction integration, use the single production
runtime and keep the release transaction boundary: journey time starts only
after successful persistence at the real gesture. Never delay the simulation
until a cinematic finishes. Add a real accessible reader after arrival; the
study's static canvas ending is a visual pose, not the production reading UI.
Preserve actual arrived weather/age/coating when adapting the material beyond
this fresh-paper example.
