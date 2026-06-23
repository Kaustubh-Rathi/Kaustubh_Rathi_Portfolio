# Kaustubh Rathi — Portfolio

> **Amazon SDE** building production backend services & autonomous **LLM-agent
> systems on AWS** · **Codeforces Expert (1751)** · **LeetCode Knight** · IIIT
> Allahabad '26.

### 🔗 [**kaustubh-rathi.github.io**](https://kaustubh-rathi.github.io/Kaustubh_Rathi_Portfolio/) — read it, or **[play it as a game](https://kaustubh-rathi.github.io/world/)** 🎮

My personal portfolio, two ways:

- **The site** — a fast, clean portfolio (work at Amazon, projects, the numbers).
- **The game** — the *same* content as a playable top-down world: walk a
  character around a neon city, enter a building for each section, beat a quick
  mini-game to unlock it. Built because a portfolio should be worth *exploring*,
  not just scrolling. (Every mini-game has a **Skip** — nobody's ever trapped.)

Under the hood: **no backend, no build step — pure static HTML/CSS/JS**, with
every fact driven by a single [`config.js`](./config.js) so the site and the
game never drift out of sync.

---

## ✨ Make it yours

Everything is driven by **one file: [`config.js`](./config.js).** You usually
never touch the page code.

### 1. Edit `config.js`
Open it and change the values — they're grouped and commented:

| Section | What it controls |
|---|---|
| `person` | name, role, tagline, blurb, location, email, social links |
| `theme` | game colors (accent / accent2 / reward) |
| `features` | turn mini-games / sound on or off |
| `world.sections` | the 6 game buildings: label, icon, color, mini-game |
| `personas` | your résumé PDFs |
| `stats` | the numbers (Codeforces, CGPA, …) |
| `experience` | the experience timeline |
| `systems` | employer work as **sanitized** case studies |
| `projects` | the projects (also become the collectible shards in the game) |
| `skills` | the skills groups |

### 2. Add your résumé PDFs
Drop them into [`shared/assets/`](./shared/assets/) and point each
`personas[].file` at them. Use a path relative to the **game** pages, e.g.
`"../shared/assets/resume-sde.pdf"` — the root page automatically strips the
leading `../` when it consumes the value.

### 3. Host it (free)
It's static, so any static host works:

- **GitHub Pages:** push to a repo named `<username>.github.io`, then open
  `https://<username>.github.io/`. The root `index.html` is the portfolio;
  `/world/` is the game. Settings → Pages → deploy from `main`.
- **Vercel / Netlify / Cloudflare Pages:** "import repo" → no build command →
  output dir = project root. Done.

To run locally:
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

---

## 🎛️ The game's mini-games

Each building uses one mechanic, set by `section.game` in `config.js`:

| value | game | mechanic |
|---|---|---|
| `shoot` | Bug Blaster | tap the bugs |
| `catch` | Shard Catch | move the collector, catch falling shards |
| `whack` | Merge Masher | tap the merge-conflicts |
| `lock` | Skill Lock | tap when the scanner lights a tile |
| `dodge` | Uptime Run | drag to dodge spikes |
| `connect` | Connect | tap when your beam crosses the node |

When a visitor enters a building they first see **Play / Skip**. If they Play,
content unlocks **only on a win** (losing shows Retry / Skip — content never
leaks on a loss). Choosing **Skip** reveals the content immediately. Set
`features.miniGames: false` to open every room instantly.

---

## 🗂️ Project structure

```
config.js                ← THE FILE YOU EDIT (all content + theme)
index.html               ← the portfolio (full-screen hero, side rails, AI chatbot)
README.md
shared/
  assets/                ← résumé PDFs, headshot, og-card.png (social preview)
    og-card.html         ← OpenGraph card template (screenshot it → og-card.png)
  sprites.js             ← canvas pixel-art sprites (game)
  fx.js                  ← sound + screen-shake + reduced-motion guardrail
world/
  index.html             ← the game page
  game.js                ← engine: world, movement (roads only), camera, render
  minigame.js            ← the 6 mini-games + the Play/Skip gate
  panels.js              ← content panels, HUD, modal (reads config)
  style.css              ← game styling
```

## ♿ Accessibility & performance
- Respects `prefers-reduced-motion` (kills shake / parallax / zoom / shimmer).
- Light / dark theme toggle on the portfolio; mute toggle in the game.
- Game fits to screen (no scrolling); the static floor is baked once for speed,
  and the render loop pauses behind modals and in backgrounded tabs.
- Works on mobile (on-screen D-pad + tap to interact in the game).

## 🔒 A note on confidentiality
Keep employer work in `systems` described in **generic** terms — no internal
system names, org details, or real production metrics.

---
Built as a static, zero-dependency site. Fork it, make it yours, ship it. ⭐
"# Kaustubh_Rathi" 
