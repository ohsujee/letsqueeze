# PROMPTS INTERROGATION SCENE — Assets superposés

> Assets à générer pour la scène d'interrogatoire Alibi (phase play).
> Le principe : un décor de base + des éléments isolés qu'on compose en CSS
> avec z-index et animations légères.
>
> Style : cohérent avec la game card Alibi (warm amber + dark noir).
> Reference : style Duolingo-inspired flat, voir `PROMPTS_FLAT_CARTOON.md`.

---

## ⚙️ CONVENTIONS GÉNÉRALES POUR TOUS LES ASSETS

**Format** : **9:16 portrait** (ex: 1080×1920 ou 1440×2560) — pile le ratio
mobile. Tous les assets doivent être générés dans ce format, même si le sujet
lui-même est plus petit (l'objet est centré dans un canvas 9:16).

**Background** : **TOUS** les assets (sauf l'asset décor de la salle) doivent
avoir un **fond bleu foncé saturé uniforme** `#0a1a3a` (dark navy blue). Ce
fond est choisi parce que :
- Les IA ne savent pas générer de vrais PNG transparents fiables
- Le bleu foncé est **facile à key-out en post-prod** (Photoshop, Remove.bg, etc.)
- Il ne risque pas de contaminer les bords des objets (aucun objet n'a de
  couleur proche de ce bleu — l'univers est warm noir donc amber/brown/red)

**IMPORTANT à inclure dans chaque prompt d'élément superposé** :
```
Background: fully uniform flat dark navy blue color (#0a1a3a) filling the
entire 9:16 canvas. The background MUST be a single solid color with no
texture, no gradient, no lighting variation, no shadow spill. The color
#0a1a3a is chosen specifically so the background can be removed/keyed-out
in post-production — make sure NO part of the subject uses this exact
blue color.
```

---

## 📦 ASSET 1 — DECOR DE BASE (interrogation room empty)

**Usage** : background de la scène, remplit l'écran entier en fond. **Aucune
table, aucun objet, aucun personnage** — juste la salle vide prête pour les
overlays.

**Taille de sortie** : 1080×1920 (portrait mobile) ou 1440×2560.

**Filename** : `/public/images/alibi/interrogation-room-bg.webp`

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces (not everywhere),
  hard-edged, placed to suggest volume. Minimal — not on every shape.
- NO outlines — shapes defined by color contrast alone.
- Palette: warm noir interrogation — deep muted browns, charcoal,
  warm amber accents, muted blue-grey for the mirror glass.
- Background: deep solid dark base with flat hard-edged lighting zones.

STRICT RULES:
- NO gradients or color transitions (every surface is ONE flat fill)
- NO glow, bloom, lens flare, light halos, or light effects
- NO blur of any kind — all edges are hard and crisp
- NO text, words, letters, numbers, signs, or UI elements
- NO black outlines (shapes defined by color contrast alone)
- NO realistic lighting — flat cartoon color zones only
- NO characters, NO props, NO table, NO lamp visible in the frame
- NO venetian blinds, NO windows with light stripes, NO decorative
  wall patterns
- NO shape on the floor that could be mistaken for a table, rug,
  or furniture footprint — the floor is a UNIFORM flat surface

---

CAMERA WORK: First-person point of view from the SUSPECT's seat
at the interrogation table. The camera is at seated eye-level,
looking STRAIGHT FORWARD at the back wall of the room. Slight
downward tilt of maybe 5 degrees so we see a bit of the floor in
front of us. No dutch angle, no rotation — the frame is perfectly
vertical. This is a mobile portrait composition.

Scene: EMPTY INTERROGATION ROOM INTERIOR — dark, oppressive,
cinematic noir police interrogation room. The room is EMPTY of
furniture in this shot because all furniture (table, lamp) will
be overlaid as separate PNG assets on top of this backdrop.

The hero feature of the back wall is a large classic ONE-WAY
MIRROR / observation window — a big rectangular glass panel that
looks dark and reflective, suggesting that behind it hidden
detectives may be watching. This is the iconic interrogation room
detail that immediately reads "police interrogation" without any
text or other cues.

NO CHARACTERS, NO TABLE, NO LAMP, NO DOSSIER, NO PROPS — this is
an EMPTY ROOM BACKDROP ONLY, designed as a layer below overlay
assets. Everything must be rendered in flat cartoon style matching
the Alibi game card aesthetic.

COMPOSITION (critical for CSS layering):
- VERTICAL portrait orientation (9:16 ratio, 1080×1920 target)
- The frame is divided into three flat horizontal zones:
  * TOP 60% — the BACK WALL of the interrogation room, featuring
    the one-way mirror as the hero element
  * MIDDLE 5% — the baseboard / wall-to-floor transition line
  * BOTTOM 35% — the FLOOR, a uniform dark surface receding
    subtly into perspective. This area will be mostly hidden by
    the table overlay, but should still look like a believable
    empty floor with no distinguishing shapes.

---

BACK WALL DESIGN (top 60% of frame):

The wall is a flat charcoal grey-brown color (#2a2218) with subtle
cool undertones to contrast against the warm amber lamp light
that will be added later via overlay. The wall material reads as
painted concrete or industrial wall panels — muted, institutional,
grim. NOT cozy, NOT wood-paneled.

Wall features (in order of prominence):

1. ONE-WAY MIRROR (hero element — centered and large):
- A single large rectangular observation window occupying the
  central area of the back wall
- Position: horizontally centered, top of the mirror at about
  12% from the top of the frame, bottom of the mirror at about
  45% from the top of the frame (so the mirror is about 33% of
  the frame height tall)
- Width: about 55% of the frame width (spanning from 22% to 77%
  horizontally)
- Frame around the mirror: a thick dark metal frame (#1a140a) about
  8-10 pixels equivalent thick, with a slightly lighter top edge
  (#3a2a18) suggesting the lamp lights it from above
- Rivets or bolts: 4 small flat circular dots (#1a140a) one in
  each corner of the metal frame, suggesting heavy industrial
  mounting
- Mirror glass surface: a cool dark blue-grey color (#2a3548) —
  a FLAT solid fill, NOT a gradient, NOT transparent. The glass
  reads as reflective but opaque from this side.
- Inside the mirror glass, add ONE simple reflection cue: a single
  large flat rectangular zone at the BOTTOM of the mirror in a
  slightly darker blue-grey (#1e2838) suggesting a reflected dark
  floor below. This makes the mirror feel 3D without actually
  reflecting anything specific.
- NO detailed reflections, NO scene reflected inside, NO people,
  NO lamp reflection — the mirror glass is almost featureless,
  just the two-tone dark blue-grey.

2. Wall panels / texture hint:
- The wall is NOT a single uniform flat color — it has very subtle
  vertical panel divisions suggesting industrial wall construction
- 3 to 4 faint vertical darker lines (#1a140a, 1-2px equivalent)
  evenly spaced across the wall, behind and around the mirror,
  suggesting wall panel seams
- These lines are BARELY visible — just enough to give the wall
  texture, not enough to dominate

3. Wall corner darkening:
- Top-left and top-right corners of the wall slightly darker
  (#1a140a) fading to the base wall color (#2a2218) toward the
  center — this frames the mirror and draws the eye to it
- Rendered as FLAT irregular shapes (hard-edged), not gradients

4. Overhead lamp mounting point + baked-in warm halo (critical):
- At the very top center of the wall (near the top edge of the
  frame), a small dark circle or rectangular bracket (#1a140a)
  suggesting where the overhead lamp cord attaches to the ceiling
- AROUND this attachment point, bake in a STATIC WARM AMBER HALO
  directly onto the wall — this is the ONLY warm zone in the
  background asset and it anchors the scene's warmth. Rendered
  as flat hard-edged concentric shapes (NOT a gradient):
  * Innermost warm zone: flat amber patch (#3a2a18) surrounding
    the attachment point, about 15% of the frame width wide
  * Outer warm zone: slightly cooler warm tint (#2a2218 — matches
    the base wall) fading the halo back into the wall base
- The halo is ROUGHLY CIRCULAR but with hard-edged flat zones,
  NOT a soft gradient
- This halo is STATIC — baked into the wall — it does NOT animate
  when the lamp swings. It represents the ambient warmth of the
  overhead lamp as a stylized flat cartoon convention.
- The halo stays within the TOP 15% of the frame — it does not
  extend down to the mirror or the rest of the wall
- NO light rays, NO cone projecting outward from this halo — it
  is a tight localized warm zone at the ceiling only

---

BASEBOARD / WALL-FLOOR TRANSITION (middle 5% of frame):

- A thin horizontal darker band (#0a0605) about 3% of the frame
  height where the wall meets the floor
- A subtle highlight line (#3a2a18) at the top edge of the
  baseboard suggesting light catches the top rim
- This is a simple hard-edged line, not decorated

---

FLOOR DESIGN (bottom 35% of frame):

The floor is a UNIFORM institutional dark concrete or tile
surface, receding slightly into perspective. This area will be
covered by the table overlay asset — but even without the table,
the floor must read as a believable empty interrogation room
floor with NO shapes that look like furniture.

- Base color: very dark warm brown-grey (#1a140a)
- Subtle vanishing perspective hint: the floor gradually becomes
  slightly lighter toward the horizon/baseboard (#221810) and
  slightly darker toward the bottom of the frame (#0a0605) — but
  these are FLAT zones with hard edges, NOT gradients
- Tile or concrete joints: 3 to 4 very faint horizontal lines
  (#0a0605, 1px equivalent) going across the floor at regular
  spacing, suggesting concrete expansion joints or large tiles.
  These lines are PERPENDICULAR to the viewer's line of sight
  (horizontal across the frame), NOT receding away.
- NO vertical planks, NO wood grain, NO diagonal shapes, NO
  wood floor pattern — this is institutional concrete/tile
- NO lighter patch in the center, NO warm glow zone on the floor,
  NO shape that resembles a table footprint or a rug outline

CRITICAL: The floor must look COMPLETELY UNIFORM and
featureless enough that there is no visual "shape" that could
be mistaken for an object lying on the floor. The table asset
will be overlaid on top — the floor just needs to exist as a
believable empty surface beneath it.

---

MOOD:
- Cinematic noir police interrogation room
- Cold, institutional, oppressive atmosphere
- Not cozy, not warm on its own — the warmth will come from the
  overhead lamp overlay layer, not from this backdrop
- The one-way mirror is the psychological anchor of the scene —
  the suspect knows someone is watching
- Silent, tense, empty waiting room feeling

Color palette:
- Wall base: #2a2218 (muted charcoal brown)
- Wall corner darkening: #1a140a
- Wall panel seams: #1a140a (barely visible)
- Lamp attachment bracket: #1a140a
- Baked-in warm halo at ceiling: #3a2a18 (inner), #2a2218 (outer)
- Mirror metal frame: #1a140a (frame), #3a2a18 (top highlight)
- Mirror rivets: #1a140a
- Mirror glass surface: #2a3548 (main), #1e2838 (reflected dark
  floor zone at bottom of mirror)
- Baseboard: #0a0605 (band), #3a2a18 (highlight line)
- Floor base: #1a140a
- Floor perspective zones: #221810 (lighter, near horizon),
  #0a0605 (darker, bottom of frame)
- Floor joints: #0a0605

AVOID: Venetian blinds, window light stripes, any windows with
sunlight, any warm amber glow baked into the background (the
warmth comes from a separate lamp overlay), any visible table,
any visible lamp, any characters, any chairs, any dossier,
any papers, any cups, any wall decorations, any clocks, any
posters, any doors, any text, any signs, any numbers. Also
avoid any shape on the floor that could be confused with a
table footprint, a rug, or any other furniture. Avoid wood
flooring, parquet, planks, or herringbone patterns. Avoid
gradients, blur, glow, lens flare, soft lighting, volumetric
effects, or realistic rendering. The final asset must be a
clean flat cartoon EMPTY interrogation room backdrop with a
single prominent one-way mirror as its hero feature, ready
for layered overlays on top.
```

---

## 📦 ASSET 2 — OVERHEAD LAMP (swinging fixture only)

**Usage** : lampe isolée superposée au plafond de la scène, animée en CSS
(rotate ±6° infinite) pour l'effet pendule. **IMPORTANT** : la lampe n'a
**PAS** de cône de lumière baked dans l'image — juste le fixture physique
(dôme + cord + ampoule). L'éclairage amber de la scène est déjà baked dans
les autres assets. La lampe swing en pure décoration physique — on ne
simule pas la projection de lumière.

**Format** : **9:16 portrait** (ex: 1080×1920). Le sujet (lampe) est centré
en haut du canvas, laissant beaucoup d'espace bleu en bas qui sera recadré
en post-prod.

**Filename après post-prod** : `/public/images/alibi/interrogation-lamp.png`

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces (not everywhere),
  hard-edged, placed to suggest volume. Minimal — not on every shape.
- NO outlines — shapes defined by color contrast alone.
- Palette: dark industrial metal (charcoal browns) + glowing warm
  amber bulb. No other colors on the lamp itself.

BACKGROUND (critical — for post-production removal):
- Fully uniform flat dark navy blue color (#0a1a3a) filling the entire
  9:16 canvas (1080×1920 or 1440×2560 aspect ratio)
- The background MUST be a single solid color — NO texture, NO gradient,
  NO lighting variation, NO shadow spill, NO vignette
- The color #0a1a3a is chosen specifically so the background can be
  removed / keyed-out in post-production (Photoshop, Remove.bg, etc.)
- CRITICAL: NO part of the subject (lamp dome, cord, bulb) may use this
  exact blue color or anything close to it — the lamp is warm brown/amber
  which is the opposite of the background, ensuring clean separation

STRICT RULES:
- NO gradients or color transitions (flat zones only)
- NO glow, bloom, lens flare, or light halos extending outward
- NO blur of any kind
- NO text, words, letters, or UI elements
- NO black outlines (shapes defined by color contrast)
- No environment, no ceiling, no wall, no characters
- NO light cone, NO light rays, NO projected light shape
- Format: 9:16 portrait with uniform #0a1a3a background

---

Subject: SINGLE OVERHEAD INTERROGATION LAMP — isolated PHYSICAL
FIXTURE ONLY, transparent background. Classic industrial pendant
lamp hanging from a ceiling cord. The cord is long and straight
so the asset can be rotated around its top edge in CSS to
simulate a swinging pendulum animation.

CRITICAL: This asset contains ONLY the physical lamp (metal dome,
cord, bulb). It does NOT contain a cone of light projecting
downward. The scene's warm amber lighting is already baked into
the other layered assets (background, table, characters) — we
don't need the lamp PNG to simulate the light itself. The lamp
just swings physically as a decorative cue, and the viewer
accepts the stylization.

CAMERA WORK: Straight front view, eye-level, no rotation. Vertical
portrait composition. The lamp dome is in the lower half of the
frame, the cord extends straight up to the top edge of the frame.

COMPOSITION:
- VERTICAL narrow portrait format (about 3:5 ratio)
- The CORD extends from the very TOP EDGE of the frame (pivot
  point for CSS rotation) straight DOWN the center to about 65%
  of the frame height
- The LAMP DOME is positioned below the cord, occupying from
  about 65% to 85% of the frame height
- The BULB visible through the opening of the dome, at the bottom
- Bottom 15% of the frame is empty (transparent) — just a tiny
  buffer space so the swing animation doesn't clip
- Everything outside the lamp and cord is fully transparent

LAMP DESIGN (Duolingo-flat style, NOT realistic):

1. Ceiling attachment fixture (very top of frame):
- A small flat rectangle or circle (#1a140a) about 20px equivalent
  wide, attached to the top edge of the frame
- This represents the ceiling mount — where the cord attaches

2. Cord:
- A thin straight vertical line (#1a140a) about 3-4px equivalent
  thick
- Extends from the ceiling attachment straight down to the top
  of the lamp dome
- Perfectly straight (not curved or wavy)

3. Lamp dome (the main fixture body):
- Classic round industrial pendant lamp shape — like an upside-down
  bowl or bell. Simple silhouette, NOT detailed.
- Main body color: dark charcoal metal (#2a2218)
- Top of the dome (where the cord attaches) has a slightly LIGHTER
  warm tint patch (#3a2e20) as a flat hard-edged shape suggesting
  the rim catches some warm reflected light
- The left and right outer edges of the dome slightly darker
  (#1a140a) as flat curved shapes suggesting the dome's curvature
- A thin horizontal rim/band at the bottom of the dome (#1a140a)
  about 2-3px equivalent tall, suggesting the metal rim around
  the bulb opening
- Size: the dome is about 70% of the frame width wide at its
  widest point

4. Bulb (visible through the dome opening):
- A simple rounded shape at the bottom of the dome, partially
  visible (like a bulb hanging down through the opening)
- Color: warm amber (#fbbf24) as the main bulb body
- A smaller bright core in the center of the bulb (#fde68a)
  suggesting the filament glow — a flat shape, NOT a gradient
- The bulb has a thin darker line at the top where it attaches
  to the dome interior (#8a5010)
- NO glow rays, NO light projection, NO halo around the bulb —
  just the bulb shape itself

5. Minimal inner rim glow (optional, very tight):
- A very small warm tint zone (#3a2810) ONLY immediately around
  the bulb opening inside the dome — about 3-5px equivalent,
  suggesting the bulb's proximity lights the inner metal slightly
- This is ENTIRELY contained inside the dome silhouette — no
  light escapes beyond the physical shape of the lamp
- Hard edges, flat color zone, not a gradient

IMPORTANT: The PNG must end at the physical outline of the lamp
(dome + cord + bulb). There is NO radial glow extending outward,
NO amber cone projecting downward, NO soft halo around the lamp.
The swinging animation is PURELY the physical fixture moving —
the "light" is a stylized convention baked into the rest of the
scene.

Color palette:
- Ceiling attachment: #1a140a
- Cord: #1a140a
- Lamp dome main: #2a2218
- Dome top highlight: #3a2e20
- Dome edge shadows: #1a140a
- Dome bottom rim: #1a140a
- Bulb main: #fbbf24
- Bulb core glow: #fde68a
- Bulb attachment line: #8a5010
- Inner dome warm tint (tiny area only): #3a2810
- Transparent: all space outside the physical lamp and cord

AVOID (CRITICAL):
- NO cone of light, NO light rays, NO projected light shape
  below the lamp
- NO halo or glow extending beyond the physical lamp outline
- NO radial gradient suggesting light diffusion
- NO bright amber zones outside the lamp dome and bulb
- NO environment, no ceiling surface, no wall, no floor
- NO characters, no table, no other objects
- NO text, letters, numbers
- NO realistic rendering, no photographic lighting
- NO blur, gradients, or soft edges anywhere

The final PNG must be a CLEAN ISOLATED LAMP FIXTURE with a
transparent background — just the physical object ready to be
rotated around its top edge via CSS to simulate a pendulum swing.
```

---

## 📦 ASSET 3 — INTERROGATION TABLE (foreground)

**Usage** : table vue de l'avant (suspect POV), bord proche touche le bas de
l'écran. Superposée par-dessus le décor et les enquêteurs.

**Format** : **9:16 portrait** (ex: 1080×1920). La table est positionnée dans
le tiers inférieur du canvas (bord proche en bas), le reste du canvas est
rempli du fond bleu key-out.

**Filename après post-prod** : `/public/images/alibi/interrogation-table.png`

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces (not everywhere),
  hard-edged, placed to suggest volume. Minimal — not on every shape.
- NO outlines — shapes defined by color contrast alone.
- Palette: dark wood browns with warm amber top highlights from
  the overhead lamp.

BACKGROUND (critical — for post-production removal):
- Fully uniform flat dark navy blue color (#0a1a3a) filling the entire
  9:16 canvas
- The background MUST be a single solid color — NO texture, NO gradient,
  NO lighting variation, NO shadow spill, NO vignette
- The color #0a1a3a is chosen specifically so the background can be
  removed / keyed-out in post-production
- CRITICAL: NO part of the table (wood, shadows, highlights) may use
  this exact blue color or anything close to it — the table is warm
  brown which is the opposite of the background

STRICT RULES:
- NO gradients or color transitions (flat zones only)
- NO glow, bloom, lens flare, or light effects
- NO blur of any kind
- NO text, words, letters, or UI elements
- NO black outlines
- No characters, no objects ON the table — empty table only
- Format: 9:16 portrait with uniform #0a1a3a background

---

Subject: WOODEN INTERROGATION TABLE seen from the SUSPECT'S
first-person point of view. Camera is seated at the near edge of
the table, looking forward across the table surface toward the
interrogator's side. Isolated asset with transparent background —
the table is the ONLY subject.

CAMERA WORK: First-person seated POV, looking slightly down at
the table surface. The near edge of the table fills the entire
bottom of the frame width. The far edge (where the inspector
stands) is narrower due to natural perspective. This is NOT a
3D render — it's a flat cartoon drawing that SUGGESTS perspective
through shape and composition.

COMPOSITION:
- HORIZONTAL wide format (about 3:2 ratio)
- The NEAR edge of the table (closest to camera) is at the VERY
  BOTTOM of the frame, filling the full width (100% wide)
- The FAR edge of the table is NARROWER, about 55-60% of the
  bottom width, positioned around 15% from the top of the frame
- This creates a strong PERSPECTIVE TRAPEZOID shape — the table
  top surface recedes into the distance
- The table occupies roughly the BOTTOM 85% of the frame
- Above the table's far edge (top 15% of the frame) is TRANSPARENT
  — this is where the back wall and inspectors will show through
- The trapezoid edges are STRAIGHT LINES, not curves

TABLE DESIGN:
- Heavy wooden interrogation table, industrial / noir feel
- Top surface: dark wood brown (#3a2410) as base color
- Warm amber light patch in the CENTER-LEFT of the table surface
  where the overhead lamp shines — rendered as a flat irregular
  rounded shape in lighter warm wood (#5a3810, #6a4218). Hard
  edges, not gradient.
- Outer edges of the table surface darker (#2a1a08) especially
  toward the far corners
- The near edge (bottom of frame) shows the THICKNESS of the table
  top as a horizontal band about 5-8% of the frame height, in
  darker wood (#2a1a08) with a thin highlight line at the top edge
  (#5a4520) suggesting where the top surface meets the side
- Very subtle scratches or marks on the surface — 2 or 3 small
  dark zones (flat shapes, #1a0e05) just enough to feel USED,
  NOT a repeating pattern
- Optional: one tiny round dark mark suggesting a coffee cup stain
  (a flat dark circle, #2a1a08)
- Wood grain hint — 2 or 3 very faint diagonal streaks suggesting
  wood planks, but MINIMAL (not a quadrillage pattern)

LIGHTING:
- Top-left area: warmer lighter wood (hit by amber lamp from above)
- Bottom-right and far corners: darker shadowed wood
- The near edge thickness band stays dark throughout

Color palette:
- Table top base: #3a2410
- Amber light zone (from lamp): #5a3810, #6a4218
- Dark corners/shadows: #2a1a08, #1a0e05
- Near edge thickness: #2a1a08, #1a0e05
- Near edge highlight: #5a4520
- Wear marks: #1a0e05

AVOID: Any objects on the table (no dossier, no papers, no lamp
reflection, no coffee cup, no pen), any visible chairs, any
environment beyond the table, realistic wood texture, photo-like
lighting, gradients, glow, blur, text of any kind. Empty table
top only, transparent background above the table's far edge,
ready for overlays.
```

---

## 📦 ASSET 4 — INSPECTOR CHARACTER (×3 variants)

**Usage** : personnages isolés à superposer DERRIÈRE la table, au niveau du
bord lointain, visibles de la poitrine vers le haut (comme si debout derrière
la table). On prévoit 3 variantes pour la diversité.

**Format** : **9:16 portrait** (ex: 1080×1920) pour chaque variante. Le
personnage est centré et occupe environ 60-70% de la hauteur du canvas, le
reste est rempli du fond bleu key-out.

**Filenames après post-prod** :
- `/public/images/alibi/inspector-1.png` (bad cop)
- `/public/images/alibi/inspector-2.png` (good cop)
- `/public/images/alibi/inspector-3.png` (veteran)

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

CHARACTER DESIGN (critical):
- Big expressive head (about 1/3 of total visible body height)
- UNIQUE body proportions — each of the 3 variants should look
  completely different (tall/thin, short/stocky, medium/lean)
- Eyes: large white ovals with big black pupils. Pupils placed
  expressively — intense, suspicious, piercing. NOT friendly.
  Thick eyebrows angled down for determination, or one raised
  for skepticism.
- Mouth: grim line, smirk, or slightly open mid-question.
  NOT a smile. Inspectors are intimidating.
- NO nose in most cases (or minimal if it defines the character)
- Hair/accessories are PRIMARY identity markers — each variant has
  a DISTINCT hairstyle/hat/accessory for instant recognition.
- Hands simplified as mittens/blobs with thumb, clear gesture.
- Arms are simple tubular shapes, bendy but here held with authority.
- Clothing in muted warm noir colors — NOT bright primary.

EXPRESSIONS & POSES:
- Characters have ATTITUDE — authority, intimidation, determination
- Slight diagonal lean (NOT stiff frontal) for energy
- Each variant has a DIFFERENT body language

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces (upper body
  hit by amber lamp = lighter warm tint; lower body = darker base).
- NO outlines — shapes defined by color contrast alone.
- Palette: warm noir — dark charcoal, burnt sienna, olive,
  mustard, beige, tan. NOT primary colors. AVOID dark blues
  (which would clash with the background key-out).

BACKGROUND (critical — for post-production removal):
- Fully uniform flat dark navy blue color (#0a1a3a) filling the entire
  9:16 canvas
- The background MUST be a single solid color — NO texture, NO gradient,
  NO lighting variation, NO shadow spill, NO vignette
- The color #0a1a3a is chosen specifically so the background can be
  removed / keyed-out in post-production
- CRITICAL: NO part of the character (skin, hair, clothing, accessories)
  may use this exact blue color or anything close to it — inspectors
  wear warm noir palette (browns, tans, burnt sienna) which contrasts
  strongly with the blue background. DO NOT use dark navy shirts/coats.

STRICT RULES:
- NO gradients or color transitions
- NO glow, bloom, lens flare
- NO blur of any kind
- NO text, words, letters, numbers
- NO black outlines
- NO environment beyond the uniform blue background
- Single character per image
- Visible from WAIST UP (not full body)
- Format: 9:16 portrait with uniform #0a1a3a background

---

Subject: SINGLE INSPECTOR CHARACTER, isolated with transparent
background, visible from the WAIST UP, standing upright and
FACING THE CAMERA directly as if standing on the other side of
an interrogation table.

CAMERA WORK: Straight front view, eye-level, slight downward
angle as if looking at them from a seated suspect's position.
No dutch angle. Character centered in frame.

COMPOSITION:
- VERTICAL portrait
- Character centered, visible from WAIST UP (top 2/3 of body)
- Head roughly 1/3 of the visible character height
- Character fills most of the frame vertically
- Standing pose with weight slightly shifted — NOT perfectly
  symmetrical stiff pose
- The bottom of the frame cuts them off at the waist/belt level

LIGHTING (flat color zones, NOT gradients):
- Upper body (head, shoulders, top of arms, upper chest) rendered
  in LIGHTER WARMER versions of their base colors — as if lit
  from above by an amber lamp
- Lower body (lower chest, belt area) in DARKER base colors
- This creates a natural "lit from above" feel using only TWO
  flat tones per surface
- Example: navy shirt (#1e3a5f) with warm-tinted shoulders (#2a4a6f)

---

VARIANT 1 — "BAD COP" (#1)

Subject: Tall and lanky tough detective with a stern intimidating
presence. Arms crossed over chest, glaring directly at the camera
with suspicion. A classic bad cop.

Character details:
- Body type: Tall, lean, broad shoulders
- Skin tone: Medium brown
- Hair: Short dark buzz cut, slightly receding hairline suggested
  by shape
- Face: Square jaw suggested by head shape, permanent scowl,
  thick angled-down eyebrows, piercing dark eyes, grim tight-lipped
  mouth with one corner slightly down
- Clothing: Dark burgundy / oxblood dress shirt (#5a1a1a top,
  #3a0a0a lower) with collar slightly open, no tie, sleeves rolled
  up showing forearms crossed. A faded dark brown leather holster
  strap visible across the chest (#5a3a20).
- Pose: Arms crossed tightly over chest, shoulders squared,
  slight lean forward toward the camera, head tilted slightly
  down so eyes look UP at the viewer (intimidating angle)
- Attitude: Pure intimidation, "I know you're lying"

Color palette for this variant:
- Shirt: #5a1a1a (lit), #3a0a0a (shadow)
- Skin: #8a5030 (warm), #6a3820 (shadow)
- Hair: #1a0e05
- Holster strap: #5a3a20
- Eyes: #fff (whites), #1a0e05 (pupils)

---

VARIANT 2 — "GOOD COP" (#2)

Subject: Medium-height clever detective with an inquisitive
approach. Holds a small open notepad in one hand, pen in the
other, one eyebrow raised skeptically. A smart interrogator who
catches contradictions.

Character details:
- Body type: Medium build, slightly lean
- Skin tone: Warm beige / East Asian features
- Hair: Messy medium-length dark hair pushed to one side
- Face: Round glasses (#2a1a08 frames), one eyebrow raised,
  mouth slightly open mid-question, sharp dark pupils looking
  straight at camera through the glasses
- Clothing: Olive green button-up shirt (#4a5a20 lit, #2a3810
  shadow) with a loose burnt-sienna tie (#b45309, #8a3010),
  sleeves buttoned. Small inspector badge clipped to the chest
  pocket (a gold/mustard flat shape #d97706).
- Pose: One hand holding up a small open cream notepad (#f0e8d8)
  at chest level, other hand holding a pen (#2a1a08 with mustard
  cap), leaning slightly forward, head tilted to one side as if
  listening carefully
- Attitude: "Interesting... keep talking"

Color palette for this variant:
- Shirt: #4a5a20 (lit), #2a3810 (shadow)
- Tie: #b45309 (lit), #8a3010 (shadow)
- Skin: #d9a878 (warm), #a07850 (shadow)
- Hair: #1a0e05
- Glasses: #2a1a08
- Badge: #d97706
- Notepad: #f0e8d8
- Pen: #2a1a08, #d97706
- Eyes: #fff, #1a0e05

---

VARIANT 3 — "VETERAN" (#3)

Subject: Short stocky older detective who has seen it all.
Hands on hips, confident knowing smirk. Wears a battered fedora.
A classic noir veteran who doesn't need to yell — they already
know how it ends.

Character details:
- Body type: Short and stocky, thick-set, broad chest
- Skin tone: Light with a slight tan and age lines suggested
  (#e0b890 with subtle #a07850 shadow marks on cheeks)
- Hair: Grey-white stubble visible around the edge of the hat
- Face: Square weathered features, thick grey-white mustache
  (#c0a080), knowing confident smirk (one side of mouth up),
  tired but sharp dark eyes with crow's feet suggested by
  small shadow marks, thick grey eyebrows
- Headwear: Classic battered fedora hat in dark charcoal
  (#3a2a10 top, #2a1a08 shadow band)
- Clothing: Beige/tan trench coat (#8a6a40 lit, #5a4020 shadow)
  over a white/cream dress shirt (#e8d9a8) with a loose dark
  burgundy tie (#8a1010, #5a0a0a). Coat collar slightly turned up.
- Pose: Both hands on hips, elbows out, shoulders squared, slight
  confident lean back (NOT forward). Head straight with knowing
  smirk.
- Attitude: "I've heard every excuse in the book, kid"

Color palette for this variant:
- Fedora: #3a2a10, #2a1a08
- Trench coat: #8a6a40 (lit), #5a4020 (shadow)
- Shirt: #e8d9a8, #c8b890
- Tie: #8a1010, #5a0a0a
- Skin: #e0b890, #a07850
- Hair/mustache: #c0a080
- Eyes: #fff, #1a0e05

---

STRICT for all 3 variants: Each character is a SEPARATE image in
9:16 portrait format with uniform #0a1a3a dark navy blue background
(for post-production key-out). Waist-up view only. Facing camera
directly. Warm lighting from above (lighter top / darker bottom for
flat shading). No environment, no table, no other characters, no text,
no badges with text, no glow, no gradient, no blur. The character must
NOT use any dark navy blue colors close to #0a1a3a. Just the isolated
character ready to be placed behind the interrogation table overlay
after background removal.
```

---

## 📦 ASSET 5 — CLOSED DOSSIER (on table)

**Usage** : dossier fermé, posé sur la table. État "waiting for question" pour
le suspect.

**Format** : **9:16 portrait** (ex: 1080×1920). Le dossier est centré dans
le canvas, le reste est rempli du fond bleu key-out.

**Filename après post-prod** : `/public/images/alibi/dossier-closed.png`

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces, hard-edged.
- NO outlines — shapes defined by color contrast alone.
- Palette: warm manila cream, dark browns, burgundy red accents.

BACKGROUND (critical — for post-production removal):
- Fully uniform flat dark navy blue color (#0a1a3a) filling the entire
  9:16 canvas
- The background MUST be a single solid color — NO texture, NO gradient,
  NO lighting variation, NO shadow spill, NO vignette
- The color #0a1a3a is chosen specifically so the background can be
  removed / keyed-out in post-production
- CRITICAL: NO part of the dossier (paper, stamps, clips) may use this
  exact blue color — the dossier is warm manila cream / burgundy red
  which contrasts strongly with the blue background

STRICT RULES:
- NO gradients or color transitions
- NO glow, bloom, lens flare
- NO blur of any kind
- NO text, words, letters, numbers — including on the stamp
- NO black outlines
- Format: 9:16 portrait with uniform #0a1a3a background

---

Subject: CLOSED MANILA CASE FILE / DOSSIER seen from slightly
above at a 3/4 top-down angle, as if sitting on a table and seen
by someone leaning over it. Isolated object, transparent background,
ready to overlay on a table in the scene.

CAMERA WORK: Top-down 3/4 view (about 70 degrees from vertical),
the dossier fills most of the frame. Slight rotation angle
(5-10 degrees) for a natural "casually placed" feel, NOT perfectly
aligned with the frame.

COMPOSITION:
- HORIZONTAL frame
- Dossier fills ~75% of the frame, centered
- A hard-edged drop shadow beneath the dossier (flat dark shape
  offset down-right by ~8px equivalent) suggesting it rests on a
  surface. The shadow is a simple flat dark rectangle (#0a0605),
  NOT blurred.
- Slight rotation (5-10 degrees counter-clockwise) for casual feel

DOSSIER DESIGN:
- Classic manila folder shape — rectangle with slightly creased,
  worn corners
- Cover base color: warm manila cream (#c8ad75)
- Top-left area (hit by overhead lamp) in lighter manila (#d4b87a,
  #e0c48a) — flat hard-edged shape suggesting top-lighting
- Bottom-right in darker manila shadow (#8a6a30, #6a4a20)
- A large RED RUBBER STAMP mark on the cover, positioned diagonally
  (15-20 degrees rotation). The stamp is rendered as a SHAPE
  (not text) — a rectangular zone with ragged/worn edges in bright
  red (#cc2020) with darker red spots (#8a1010) suggesting ink
  thickness variation. The stamp is about 40% of the dossier width.
  NO letters or words inside the stamp — just the ink shape.
- Small metal paperclip in the top-right corner (a flat mustard/gold
  shape #d97706 with darker accent #8a5010)
- Edge of papers sticking out slightly on the right side — 3-4 thin
  horizontal layers of cream/white paper (#f0e8d8, #d8d0b8) visible
  at the edge, stacked
- A worn tape strip across one corner (slightly torn) in beige/red
  (#c8ad75 with #8a1010 accent)
- Very subtle wear marks — 2 or 3 small dark flat zones (#6a4a20)
  suggesting the folder has been handled many times

LIGHTING:
- Top-left surfaces (upper-left quadrant): lighter warm manila
  (hit by overhead lamp)
- Bottom-right surfaces: darker manila shadow
- The stamp color stays consistent (red ink doesn't change tone)

Color palette:
- Dossier base: #c8ad75
- Dossier lit surfaces: #d4b87a, #e0c48a
- Dossier shadow surfaces: #8a6a30, #6a4a20
- Paper layers: #f0e8d8, #d8d0b8
- Red stamp: #cc2020, #8a1010
- Paperclip: #d97706, #8a5010
- Drop shadow beneath: #0a0605

AVOID: Any text, letters, words, or numbers (including inside the
stamp), any realistic photo paper texture, any blur, any glow,
any gradient, any environment, any other objects, any visible
table surface (that will be the overlay below). Transparent
background outside the dossier and its shadow.
```

---

## 📦 ASSET 6 — OPEN DOSSIER (with empty page)

**Usage** : dossier ouvert, affichant une page crème vide où on overlay
le texte de la question via HTML/CSS.

**Format** : **9:16 portrait** (ex: 1080×1920). Le dossier ouvert est centré
dans le canvas, le reste est rempli du fond bleu key-out.

**Filename après post-prod** : `/public/images/alibi/dossier-open.png`

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces, hard-edged.
- NO outlines — shapes defined by color contrast alone.
- Palette: warm manila cream, dark browns, burgundy red accents.

BACKGROUND (critical — for post-production removal):
- Fully uniform flat dark navy blue color (#0a1a3a) filling the entire
  9:16 canvas
- The background MUST be a single solid color — NO texture, NO gradient,
  NO lighting variation, NO shadow spill, NO vignette
- The color #0a1a3a is chosen specifically so the background can be
  removed / keyed-out in post-production
- CRITICAL: NO part of the dossier (paper, stamps, clips, photo
  silhouette) may use this exact blue color — the dossier is warm
  manila cream / burgundy which contrasts strongly with the blue

STRICT RULES:
- NO gradients or color transitions
- NO glow, bloom, lens flare
- NO blur of any kind
- NO text, words, letters, numbers — CRITICAL for this asset
- NO black outlines
- The center of the right page MUST be completely empty and flat
  cream colored (this is where HTML text will be overlaid)
- Format: 9:16 portrait with uniform #0a1a3a background

---

Subject: OPEN MANILA CASE FILE / DOSSIER lying flat open on a
table, showing both inside covers. The LEFT side has some
decorative details (photo placeholder, stamps). The RIGHT side
is a BLANK CREAM PAGE where HTML text will be overlaid dynamically.
Isolated object, transparent background.

CAMERA WORK: Top-down 3/4 view (about 70 degrees from vertical),
slight tilt. The dossier is lying OPEN flat. Slight rotation
(3-5 degrees) for natural placement feel.

COMPOSITION:
- HORIZONTAL frame (about 7:5 ratio)
- Open dossier fills ~80% of the frame
- LEFT HALF: inside of the left folder flap with decorative details
- RIGHT HALF: a SINGLE BLANK CREAM PAGE — mostly empty, this is
  the critical area
- Drop shadow beneath the whole dossier (flat dark rectangle
  #0a0605 offset down-right)

LEFT SIDE — Inside folder flap with details:
- Manila cream base color (#c8ad75)
- A small red ink stamp in the top-left corner of the flap —
  circular stamp SHAPE (no text/letters) in bright red (#cc2020)
  with darker spots (#8a1010) suggesting ink variation, about
  25% of the left half width
- A small photo placeholder: a rectangle (#f0e8d8 background)
  containing a simple dark silhouette head-and-shoulders shape
  (#2a1a08) — just a generic dark portrait shape suggesting
  "suspect photo", NO facial features
- A paper clip attaching the photo (#d97706 flat shape)
- One or two small decorative dots or marks (flat dark shapes
  #6a4a20) suggesting notes or checkmarks — but NO actual text

RIGHT SIDE — Blank page for HTML overlay (critical):
- A SINGLE CREAM PAPER PAGE sticking out of the right flap
- The page is LARGE, filling most of the right half of the frame
- Page color: cream (#f0e8d8) — a SOLID flat color
- NO lines, NO text, NO marks, NO rulings, NO header
- A thin darker cream border (#d8c8a0) around the page edge
  suggesting paper thickness
- ONE small red stamp mark in the TOP-RIGHT CORNER of the page
  only (a tiny red rectangular ink zone #cc2020, about 10% of
  the page size) — this is decoration, NOT text
- The REST of the page (about 85% of the page area) is COMPLETELY
  EMPTY flat cream (#f0e8d8) — this is where HTML text will be
  overlaid via CSS
- The bottom-right corner has a tiny page-curl shadow suggesting
  the page is real paper (small flat dark triangle #8a6a30)

FOLDER EDGES:
- Outer folder edges darker manila (#8a6a30, #6a4a20)
- The crease in the middle where the folder opens is a darker
  vertical line (#5a4520)
- Top-left area of the whole dossier: lighter (hit by overhead lamp)
- Bottom-right: darker shadow

LIGHTING:
- Top-left surfaces lit with warmer lighter tones
- Bottom-right surfaces darker
- The center of the right page stays a MEDIUM flat cream tone
  (#f0e8d8) — not too light, not too dark — so HTML text overlaid
  on it in dark color will be readable

Color palette:
- Dossier cream base: #c8ad75
- Dossier lit areas: #d4b87a, #e0c48a
- Dossier shadow areas: #8a6a30, #6a4a20
- Folder crease: #5a4520
- Right page: #f0e8d8 (flat cream)
- Right page border: #d8c8a0
- Red stamps: #cc2020, #8a1010
- Photo placeholder bg: #f0e8d8
- Photo silhouette: #2a1a08
- Paper clip: #d97706
- Page curl shadow: #8a6a30
- Drop shadow beneath: #0a0605

AVOID (CRITICAL): ABSOLUTELY NO TEXT on the right page —
no letters, no words, no numbers, no lorem ipsum, no placeholder
text, no dashes, no handwriting marks, no ruling lines. The
center of the right page must be COMPLETELY EMPTY flat cream.
Also avoid: gradients, blur, glow, realistic paper texture,
multiple pages, any environment beyond the dossier, any other
objects. Transparent background outside the dossier.
```

---

## 📦 ASSET 7 — NOTEPAD (suspect writing)

**Usage** : bloc-notes qui slide-in pour l'input de réponse du suspect. On
overlay un textarea HTML par-dessus la zone de papier ligné.

**Format** : **9:16 portrait** (ex: 1080×1920). Le notepad est centré dans
le canvas, le reste est rempli du fond bleu key-out.

**Filename après post-prod** : `/public/images/alibi/notepad.png`

```
Flat cartoon illustration inspired by Duolingo's character design system.
Solid color fills only — NO gradients, NO blur, NO glow, NO neon,
NO photorealistic lighting, NO volumetric effects.

COLOR RULES:
- Solid fills only. Every surface = ONE flat color.
- Shadows: single darker shade on select surfaces, hard-edged.
- NO outlines — shapes defined by color contrast alone.
- Palette: warm cream paper, muted BROWN rulings (NOT blue — we
  avoid blue to prevent conflict with the background key-out),
  red margin line.

BACKGROUND (critical — for post-production removal):
- Fully uniform flat dark navy blue color (#0a1a3a) filling the entire
  9:16 canvas
- The background MUST be a single solid color — NO texture, NO gradient,
  NO lighting variation, NO shadow spill, NO vignette
- The color #0a1a3a is chosen specifically so the background can be
  removed / keyed-out in post-production
- CRITICAL: NO part of the notepad (paper, ruling lines, pencil) may
  use this exact blue color. AVOID blue ruled lines entirely — use
  WARM BROWN ruled lines instead (#c4b8a0) so there is zero risk of
  the ruling lines being confused with the background during key-out.

STRICT RULES:
- NO gradients or color transitions
- NO glow, bloom, lens flare
- NO blur of any kind
- NO text, words, letters, numbers — the page must be empty
- NO black outlines
- NO blue ruling lines (use warm brown instead)
- Format: 9:16 portrait with uniform #0a1a3a background

---

Subject: LINED NOTEPAD / LEGAL PAD sitting on a surface as if the
suspect is about to write their answer. Isolated asset with
transparent background. The ruled lines are decoration — the
HTML textarea will be overlaid on top.

CAMERA WORK: Top-down 3/4 view (about 75 degrees from vertical),
slight tilt. The notepad is lying on the table ready to be used.
Slight rotation (2-4 degrees) for natural placement.

COMPOSITION:
- VERTICAL or slightly horizontal (about 4:3 ratio), filling most
  of the frame
- Slight rotation (2-4 degrees) for natural placement feel
- Drop shadow beneath the notepad (flat dark rectangle #0a0605
  offset down-right)

NOTEPAD DESIGN:
- Classic yellow legal pad or cream-colored lined paper
- Paper base color: warm cream (#f0e8d8) or soft warm yellow
  (#f5e6a8) — pick the cream option for better contrast with
  the warm lamp lighting
- TOP of the pad: a darker band about 8% of the pad height
  representing the glued spine / binder (#8a6a30) with small
  visible "staple" or stitching details — tiny dark circles or
  short lines (#2a1a08) evenly spaced across the top band
- HORIZONTAL RULED LINES across the paper — thin faint lines
  (#c4b8a0) evenly spaced, about 10-12 lines visible across the
  writable area. The lines are SUBTLE — thin and low contrast
  so that HTML text overlaid on top remains readable.
- LEFT MARGIN: a single vertical red line (#cc2020) running the
  full height of the writable area, about 15% from the left edge
  of the pad — as on real legal pads
- Slight paper corner curl or crease suggestion — 2 small dark
  zones in the corners (#c8ad75) indicating paper wear
- A small yellow pencil lying diagonally at the bottom-right
  corner: a flat yellow rectangle (#f59e0b lit, #d97706 shadow)
  with a dark tip (#2a1a08) and a pink eraser end (#e8a090)

LIGHTING:
- Top edge of the paper lit warmer (amber-tinted cream #f5ede0)
- Bottom edge slightly darker cream (#d4bc88)
- The red margin line and ruled lines stay consistent tone

CRITICAL: The writable area of the paper MUST remain clearly
EMPTY of text. The ruled lines are background decoration, but
there should be no text on the lines — the HTML textarea will
be placed on top dynamically. The ruled lines must be subtle
enough that dark HTML text overlaid on them will still be
readable.

Color palette:
- Paper base: #f0e8d8
- Paper lit area: #f5ede0
- Paper shadow area: #d4bc88
- Top binder band: #8a6a30
- Binder stitching dots: #2a1a08
- Ruled lines: #c4b8a0
- Red margin line: #cc2020
- Pencil body: #f59e0b, #d97706
- Pencil tip: #2a1a08
- Pencil eraser: #e8a090
- Drop shadow beneath: #0a0605

AVOID: Any text, letters, words, numbers, or handwriting on the
paper. Any gradients, blur, glow, realistic paper texture, pages
behind the pad (single pad only), environment beyond the pad,
other objects. Transparent background outside the pad and its
shadow.
```

---

## 🎬 COMPOSITION CSS (reference)

Voici comment les assets vont être assemblés dans la scène :

```html
<div class="interro-scene">
  <!-- z: 0 — décor de fond -->
  <img src="/images/alibi/interrogation-room-bg.webp" class="scene-bg" />

  <!-- z: 1 — enquêteurs DERRIÈRE la table -->
  <div class="scene-inspectors">
    <img src="/images/alibi/inspector-1.png" />
    <img src="/images/alibi/inspector-2.png" />
    <img src="/images/alibi/inspector-3.png" />
  </div>

  <!-- z: 2 — table couvre le bas des enquêteurs -->
  <img src="/images/alibi/interrogation-table.png" class="scene-table" />

  <!-- z: 3 — lampe qui swing (animation CSS) -->
  <motion.img
    src="/images/alibi/interrogation-lamp.png"
    class="scene-lamp"
    animate={{ rotate: [-6, 6, -6] }}
    transition={{ duration: 4, repeat: Infinity }}
  />

  <!-- z: 4 — dossier posé sur la table -->
  <div class="scene-dossier">
    <img src="/images/alibi/dossier-open.png" />
    <div class="dossier-text-overlay">
      {question.text}  {/* HTML text overlaid on the cream page */}
    </div>
  </div>

  <!-- z: 5 — timer HUD + boutons -->
  <div class="scene-hud">...</div>
</div>
```

---

## 📏 CHECKLIST DE COHÉRENCE VISUELLE

Pour que les assets s'assemblent bien, vérifier pour chaque :

- [ ] **Format 9:16 portrait** (ex: 1080×1920) pour tous les assets
- [ ] **Background uniforme #0a1a3a** (dark navy blue) pour tous les
      éléments superposés — **sauf** l'Asset 1 (la salle elle-même qui
      a ses propres couleurs)
- [ ] **Aucun bleu sur le sujet** — vérifier qu'aucune partie de l'objet
      n'utilise un bleu proche de #0a1a3a (sinon le key-out va trouer
      l'objet)
- [ ] **Source de lumière cohérente** : overhead amber from above,
      partie haute claire / partie basse sombre
- [ ] **Palette cohérente** : warm noir (amber/manila/dark browns/red/
      burgundy/tan/olive)
- [ ] **Style flat cartoon** : pas de gradient, pas de blur, outlines
      par contraste
- [ ] **Pas de texte** dans aucun asset — tout texte viendra en HTML

## 🎨 POST-PRODUCTION

Après génération IA, workflow manuel en post-prod :
1. Ouvrir l'image dans Photoshop (ou équivalent)
2. Sélectionner la couleur bleu foncé `#0a1a3a` du background (outil
   "Select > Color Range" ou baguette magique avec tolérance adaptée)
3. Delete → background devient transparent
4. Vérifier qu'aucun pixel de bleu parasite ne reste sur le sujet
5. Crop au plus près du sujet si besoin
6. Sauvegarder en PNG transparent dans `public/images/alibi/`

---

## 🎯 ORDRE DE GÉNÉRATION SUGGÉRÉ

1. **Asset 1** (décor) — base, définit la palette exacte
2. **Asset 3** (table) — teste la perspective et la couleur wood
3. **Asset 4 variant 1** (bad cop) — teste la taille et le style
4. Compose ces 3 en CSS pour valider le layout avant de continuer
5. **Asset 4 variants 2 et 3** — diversité
6. **Asset 2** (lampe) — ajoute l'animation swing
7. **Asset 5** (dossier fermé) — teste l'overlay sur table
8. **Asset 6** (dossier ouvert) — teste l'overlay HTML text
9. **Asset 7** (notepad) — l'input du suspect

---

*Destination des fichiers : `public/images/alibi/`*
*Format : WebP pour le background (plus léger), PNG pour les overlays (transparence).*
