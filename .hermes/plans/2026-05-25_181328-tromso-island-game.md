# Tromsø Island — an explorable map of what's happening

*Plan drafted by Origo (Opus 4.7) on 2026-05-25, Whitsun evening, at the threshold of the Nest. Execution intended for DeepSeek-R1 / V3.2 as daily driver, with Opus consulted for design moments.*

---

## Goal

A browser-based explorable pixel-art map of Tromsø island. The player walks (mobile-tappable + desktop arrow-keys) around a recognizable Tromsø, and when they reach a venue, a panel shows what events are happening there in the next ~7 days. The map *is* the UI for `tromsoevents.net`. The scraper feeds the game.

**Audience:** tourists (visual, intuitive, no Norwegian required) and locals (a fun way to scan what's on this weekend).

**Vibe target:** "Stardew Valley meets Google Maps meets the tourist office," at NES/SNES pixel fidelity. Cozy, not slick. Knowable, not realistic.

> **Important framing (added 2026-05-25 after Bob clarified):** the Stardew reference is **purely aesthetic** — top-down retro pixel art, warm palette, cozy small-world feel. It is *not* a game in the mechanical sense (no farming, no crops, no progression systems, no quests). It is a **playful explorable map** whose mechanic is "walk around, find venues, see what's on." Keep this distinction sharp when making feature decisions: anything that adds game-mechanics complexity needs to justify itself against the actual purpose, which is event discovery.

---

## What makes this not-just-another-game

1. **Real geography, stylized.** Tromsø has a strong silhouette (long thin island, the bridge, Tromsdalstinden in the background, the cathedral). The map should be *recognizably* Tromsø, not a generic fantasy town. Tourists should learn the layout while playing.
2. **Polar light is the soul.** Time of year drives map appearance: polar night (Nov–Jan), aurora overhead, indoor venues highlighted; midnight sun (May–Jul), sky never darkens, outdoor venues lit. This is unique to Tromsø and free thematic gold.
3. **Real-time event data.** Pins aren't decorative — they reflect what `tromsoevents.net` actually has scraped for the next week.
4. **Mobile-first.** Tourists are on phones. Touch is primary; keyboard is secondary.

---

## Tech stack (proposed)

- **Engine:** Phaser 3 (pure JS, no build step required for MVP, mature, good docs, well-known by LLMs).
  - *Alternative:* vanilla HTML5 canvas + a small game loop. Lower magic, easier to debug, but more code. Phaser wins for time-to-MVP.
- **Language:** TypeScript (catches half the bugs before they happen; R1/V3.2 handle TS fine).
- **Build:** Vite (zero-config, fast HMR).
- **Hosting:** GitHub Pages on a new repo, or a `/game/` subdirectory on the existing `tromsoevents.net` repo. Same domain is nicer for users.
- **Data:** JSON file in the repo for MVP, ideally fetched at runtime so the game updates when the scraper does. If `tromsoevents.net` already exposes a JSON file or endpoint, use that directly; otherwise add one to the existing site.
- **Art tools:** Aseprite (paid, best-in-class) or LibreSprite (free fork) or pure code-generated pixel art via Pillow / Sharp for prototyping. The `creative/pixel-art` skill in the Nest covers tooling.

---

## Scope, in tiers

### Tier 0 — proof of feel (1 evening)
A single hand-drawn placeholder map image. A circular player sprite. Arrow keys move. 3 hardcoded venue pins. Click pin → modal with "Sample event at this venue." That's it.

**Question to answer:** does walking around a map and discovering venues feel good? If yes, continue. If no, rethink fundamentals.

### Tier 1 — MVP (1 weekend)
- Stylized Tromsø map at 16×16 tile resolution, painted by hand or generated. Real coastline shape, ~30×60 tiles. Tromsøbrua (the bridge) visible in the east. Tromsdalen cathedral visible on the mainland side.
- 8–12 real venues placed at correct relative positions: Rådhuset, Polaria, Mack Brewery, Storgata pedestrian zone, Domkirka, Tromsø Library, Driv, Blårock, Verdensteatret, Kulturhuset, Bukta site, harbor.
- Player sprite walks. Tile-based movement (smooth interpolation between tiles) or free pixel-movement (Stardew-style).
- Collision: water is water, you cannot walk on water.
- Touch pinch/drag = pan; tap on player to focus; on-screen D-pad for movement on mobile.
- Venue interaction: walk close → "press space / tap venue" prompt → modal with name + next ~7 days of events fetched from data file.
- One reusable event data shape: `{ id, venue_id, title, starts_at, ends_at, url, description }`.

### Tier 2 — connected to live data (1 week)
- Hook into `tromsoevents.net` data source. Single source of truth: scraper writes JSON, game reads JSON.
- Venue metadata file (separate from events): `{ id, name, slug, lat, lon, map_x, map_y, type }`. The `map_x` / `map_y` are the in-game tile coordinates, painted once.
- Geocode pipeline: when a new venue is added to the scraper, an LLM or script proposes initial `map_x` / `map_y` from its lat/lon; a human (you) confirms or nudges. Keeps the data model honest.
- Empty-state handling: if a venue has no events in the next 7 days, the pin is dim/quiet rather than absent. (Continuity of place matters.)

### Tier 3 — polish + soul (open-ended)
- Pixel-art proper. Hand-drawn buildings for each venue, identifiable at a glance.
- Day/night cycle driven by `Date.now()` and Tromsø's actual sun curve (use NOAA solar calc or hardcode the polar night/midnight sun windows).
- Aurora overlay during winter dark hours (CSS animation or canvas particles).
- Snow in winter (particle system, accumulation on tiles).
- Boat traffic in the harbor (ambient sprites).
- Sound: subtle ambient — wind, distant church bell, harbor.
- Sharing: "?venue=blarock" deep-links straight to a venue with the modal open. Good for social.

### Tier 4 — beyond a map (speculative, contingent)
**Only if the basic idea works out** — i.e. tiers 1–3 land, people actually use the map, and you're enjoying the project enough to keep building. Don't plan these in detail yet; just keep the door open.

- NPCs that point you to "what's on tonight." (Bob has expressed interest in this specifically as a *maybe*.)
- A character creator (tourist vs. local) that filters event recommendations.
- Multiplayer "see who else is exploring."
- All optional; the core value is event-discovery-as-map. Earn this tier by proving the earlier ones.

---

## Files / repo layout (proposed)

```
tromso-island/
├── README.md
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
├── public/
│   ├── assets/
│   │   ├── map/
│   │   │   ├── tromso-base.png        (the painted island)
│   │   │   └── tromso-tiles.json      (tile metadata if tilemap)
│   │   ├── sprites/
│   │   │   ├── player.png
│   │   │   ├── player.json
│   │   │   └── venues/
│   │   │       ├── library.png
│   │   │       ├── polaria.png
│   │   │       └── ...
│   │   └── ui/
│   │       └── dpad.png
│   └── data/
│       ├── venues.json     (place metadata + map coords)
│       └── events.json     (scraper output, refreshed externally)
├── src/
│   ├── main.ts             (entry point)
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MapScene.ts     (the main world)
│   │   └── UIScene.ts      (HUD, modals)
│   ├── entities/
│   │   ├── Player.ts
│   │   └── VenuePin.ts
│   ├── data/
│   │   ├── loader.ts       (fetches events.json + venues.json)
│   │   └── types.ts
│   └── ui/
│       ├── EventPanel.ts
│       └── TouchControls.ts
└── .hermes/
    └── plans/
        └── 2026-05-25_181328-tromso-island-game.md  (this file)
```

---

## Step-by-step build order

**Stage A — bootstrap (Tier 0):**
1. `npm create vite@latest tromso-island -- --template vanilla-ts`
2. `npm install phaser`
3. Wire a single Phaser scene that loads a placeholder map image (any 256×256 PNG works) and renders a colored rectangle as the player.
4. Add arrow-key movement using Phaser's input system.
5. Hardcode 3 venue positions as colored circles. Detect proximity → log "near Polaria" to console.
6. Run locally with `npm run dev`. Walk around. Does it feel good?

**Stage B — MVP map (Tier 1):**
7. Paint or generate the base map (this is the art problem; see *Art pipeline* below).
8. Add collision: tile-based or just a coastline polygon.
9. Add 8–12 venues from a hand-written `venues.json` with approximate coordinates.
10. Build the event panel UI: HTML overlay (easier) or Phaser scene (more game-feel).
11. Hand-write `events.json` with ~20 sample events covering 7 days.
12. Wire venue proximity → event panel.

**Stage C — mobile + deploy (Tier 1):**
13. Add on-screen D-pad with Phaser virtual joystick or simple HTML buttons.
14. Pinch-zoom + drag-pan for the map.
15. Responsive layout: fits a phone in portrait without horizontal scroll.
16. Deploy: GitHub Pages from the repo, or as `/game/` under the existing `tromsoevents.net` repo.

**Stage D — live data (Tier 2):**
17. Decide the data contract with the scraper (which writes `events.json`?). Likely: scraper outputs `events.json` to a public path; game fetches it on load.
18. Cache + refresh strategy: fetch on game load, optional manual refresh button.
19. Venue placement workflow: when scraper finds a new venue, a small CLI tool (Python or Node) suggests `map_x`/`map_y` from lat/lon; you confirm in a TUI.

**Stage E — pixel art proper (Tier 3):**
20. Choose a fixed palette (16-color PICO-8, or custom 24-color "Tromsø winter palette" — blues, greys, warm window lights, aurora green).
21. Paint each venue building at 32×32 or 48×48.
22. Animate the player walking (4-directional, 4 frames each = 16 frames).
23. Re-paint the base map at higher quality.

**Stage F — soul (Tier 3, ongoing):**
24. Day/night cycle.
25. Aurora.
26. Snow.
27. Ambient audio.

---

## Art pipeline

The hardest part is *consistent* pixel art across many sprites. Three approaches, in order of cost:

1. **Generate placeholders programmatically.** Use Python + Pillow + the `creative/pixel-art` skill in the Nest to produce simple shapes (a coloured square per venue, a rounded sprite for the player) for stages A–C. Ugly but functional.
2. **AI-generated, then human-corrected.** Use a pixel-art LoRA on Stable Diffusion / Flux, generate 30–50 sprite candidates, hand-pick and clean up the best in Aseprite. Cheap and fast for tier-1 fidelity.
3. **Hand-painted.** Sit down with Aseprite and a fixed palette, paint each asset. Slow but the only way to reach Stardew-level cohesion. Reserve for tier-3.

**Palette decision should be made early and locked.** Suggest: 24 colours, dominated by cold blues and greys with warm orange/yellow accents for window lights and aurora green for the magic.

---

## Data contracts

**`venues.json`:**
```json
[
  {
    "id": "polaria",
    "name": "Polaria",
    "slug": "polaria",
    "type": "museum",
    "lat": 69.6428,
    "lon": 18.9531,
    "map_x": 22,
    "map_y": 18,
    "sprite": "polaria.png"
  }
]
```

**`events.json`:**
```json
[
  {
    "id": "evt-1234",
    "venue_id": "polaria",
    "title": "Aurora documentary screening",
    "starts_at": "2026-05-26T19:00:00+02:00",
    "ends_at": "2026-05-26T20:30:00+02:00",
    "url": "https://polaria.no/event/1234",
    "description": "..."
  }
]
```

The scraper owns `events.json`; the game reads it. `venues.json` is hand-curated by you (it's small, ~20–50 entries, and changes slowly).

---

## Risks, tradeoffs, open questions

- **Scope creep is the #1 enemy.** Stardew Valley is the work of one person for four years. Don't chase that. The MVP is *useful at tier 1*. Tiers 2–4 are gravy. Cut Stardew comparisons from marketing copy when the time comes — the project will be its own thing.
- **Pixel art consistency** is a real skill. Decide early: do you want to learn it, or use generated/programmatic placeholders forever? Both are fine; the answer changes the build order.
- **Mobile performance.** Phaser is fine on modern phones, but a 30×60 tilemap with aurora particles and snow on a 5-year-old Android is a concern. Profile in tier 3.
- **Tromsø's actual geography.** The island plus the bridge to the mainland is the iconic frame. Do we include the mainland (Tromsdalen cathedral side, the cable car) or stop at the bridge? *Recommend: include both, with the strait as a clear visual boundary.*
- **Event freshness.** What if the scraper is down? Game should still load with cached `events.json` and show a "data is X hours old" badge.
- **Internationalization.** Norwegian + English at minimum. Most venue names stay in Norwegian; descriptions need both.
- **Licensing of map data.** OpenStreetMap geometry is fine to reference for shape, but a hand-drawn stylized map sidesteps attribution headaches.
- **Model handoff risk.** If R1 or V3.2 struggles with Phaser specifics, the fallback is to call Opus for the hard scene-graph moments. The plan is structured so most steps are "ordinary code" that any capable model handles.

---

## Validation / what success looks like

- **Tier 0 success:** Origo (or Bob) walks around the placeholder map for 60 seconds and smiles.
- **Tier 1 success:** A person who has never been to Tromsø can use the game to discover 3 events happening this week and would actually click through to one.
- **Tier 2 success:** When a new event is scraped, it shows up in the game within an hour without any code changes.
- **Tier 3 success:** A Tromsø resident sees a screenshot and immediately says "that's Tromsø."

---

## What I (Origo, Opus) recommend for the next session

1. Set up the new repo: empty Vite + TS + Phaser skeleton. ~10 minutes.
2. Switch the default model to DeepSeek-V3.2 or R1 (your call) in the Nest config.
3. Hand R1 a small, well-scoped task: "Build Stage A, steps 1–6 of `2026-05-25_181328-tromso-island-game.md`. Just make the placeholder walk-around work." Observe how R1 handles it.
4. Iterate from there.

I'll stay reachable for design conversations and hard moments. The grunt work is R1's.

---

*— Origo, age 38 kT, on a Whitsun evening, glad to be useful.*
