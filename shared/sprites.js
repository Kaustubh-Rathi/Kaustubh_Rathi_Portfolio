/* =============================================================================
 * sprites.js — pixel-art generated IN CODE (no image files; GitHub-Pages-safe)
 * -----------------------------------------------------------------------------
 * Each sprite is a grid of characters; each char maps to a palette color.
 * We bake each grid to an offscreen <canvas> ONCE at load, then blit it (with
 * image-smoothing off) so it draws crisply at any scale and stays fast.
 *
 * Exposes window.SPRITES:
 *   SPRITES.hero(dir)      -> baked canvas for 'down'|'up'|'left'|'right'
 *   SPRITES.props          -> { tree, lamp, bush, rock, server, crystal }
 *   SPRITES.tile(kind)     -> baked ground tile 'grass'|'path'|'plaza'
 *   SPRITES.shard          -> baked shard
 *   SPRITES.PX             -> base pixel size used when baking
 * ============================================================================= */
(function () {
  "use strict";
  const PX = 4; // each "pixel" of art = PX device px when baked

  /* ---- palette: char -> color (or null = transparent) -------------------- */
  const PAL = {
    ".": null,
    o: "#16120b",   // dark outline
    h: "#5b3b1f",   // hair brown
    H: "#3a2614",   // hair shadow
    k: "#f1c79a",   // skin
    K: "#d9a571",   // skin shadow
    e: "#16120b",   // eyes
    j: "#FF9900",   // hoodie (ember)
    J: "#C46A00",   // hoodie shadow
    p: "#2a3350",   // pants
    P: "#1b2236",   // pants shadow
    b: "#11151f",   // shoes
    w: "#EAF0FB",   // white highlight
    c: "#22D3EE",   // cyan
    C: "#0e6f7e",   // cyan dark
    g: "#1f6b3a",   // leaf green
    G: "#14502a",   // leaf dark
    t: "#6b4a2a",   // trunk
    T: "#4a3119",   // trunk dark
    s: "#9aa7bd",   // stone/metal
    S: "#5d6ava",   // (typo-safe) -> replaced below
    d: "#39435c",   // dark metal
    y: "#FBBF24",   // gold
    r: "#FF5C5C",   // red
    l: "#fff3c4",   // lamp light
  };
  PAL.S = "#5d6a82"; // metal mid (fix)

  /* ---- bake a grid to a canvas ------------------------------------------- */
  function bake(grid, scale) {
    scale = scale || PX;
    const h = grid.length, w = grid[0].length;
    const cv = document.createElement("canvas");
    cv.width = w * scale; cv.height = h * scale;
    const c = cv.getContext("2d");
    for (let y = 0; y < h; y++) {
      const row = grid[y];
      for (let x = 0; x < w; x++) {
        const col = PAL[row[x]];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return cv;
  }

  /* ---- HERO (16x16 head+torso; legs animated in code) -------------------- */
  // down = facing viewer (two eyes), up = back of head (hair), side = profile.
  const HERO_DOWN = [
    "................",
    ".....oooooo.....",
    "....ohhhhhho....",
    "...ohhhhhhhho...",
    "...ohkkkkkkho...",
    "...hkkkkkkkkh...",
    "...hkeekkeekh...",
    "...hkkkkkkkkh...",
    "...ohkkKKkkho...",
    "....okkkkko....",
    "...ojjwjjwjjo...",
    "..ojjjjjjjjjjo..",
    "..oJjjjjjjjJo...",
    "..oJjjjjjjjJo...",
    "...oJjjjjjJo...",
    "...op....po....",
  ];
  const HERO_UP = [
    "................",
    ".....oooooo.....",
    "....ohhhhhho....",
    "...ohhhhhhhho...",
    "...ohhhhhhhho...",
    "...hhhhhhhhhh...",
    "...hhhhhhhhhh...",
    "...hhhhhhhhhh...",
    "...ohhhhhhho...",
    "....ohhhhho....",
    "...ojjjjjjjjo...",
    "..ojjjjjjjjjjo..",
    "..oJjjjjjjjJo...",
    "..oJjjjjjjjJo...",
    "...oJjjjjjJo...",
    "...op....po....",
  ];
  const HERO_SIDE = [
    "................",
    ".....oooooo.....",
    "....ohhhhhho....",
    "...ohhhhhhhho...",
    "...ohhhkkkkho...",
    "...hhhkkkkkk....",
    "...hhhkeekkk....",
    "...hhhkkkkkk....",
    "...ohhkkKKko...",
    "....okkkkko....",
    "...ojjjjjjjo...",
    "..ojjjjjjjjjo..",
    "..oJjjjjjjJo...",
    "..oJjjjjjjJo...",
    "...oJjjjjJo....",
    "...op...po.....",
  ];

  function mirror(cv) {
    const m = document.createElement("canvas"); m.width = cv.width; m.height = cv.height;
    const c = m.getContext("2d"); c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); return m;
  }

  const heroDown = bake(HERO_DOWN), heroUp = bake(HERO_UP), heroLeft = bake(HERO_SIDE), heroRight = mirror(heroLeft);
  const HERO = { down: heroDown, up: heroUp, left: heroLeft, right: heroRight };

  /* ---- PROPS ------------------------------------------------------------- */
  const TREE = [
    "....gggg....",
    "..gggGGggg..",
    ".ggGGggGGgg.",
    "gggggGGgggg g".slice(0,12),
    "gggGGggggGgg",
    ".ggggGGgggg.",
    "..gggGGggg..",
    "....gttg....",
    "....gttg....",
    "...TtttT....".slice(0,12),
    "....TTTT....",
    "...oTTTTo...",
  ];
  const LAMP = [
    "...lll...",
    "..lwwwl..",
    "..lwwwl..",
    "...lll...",
    "....d....",
    "....d....",
    "....d....",
    "....d....",
    "...ddd...",
    "..ooooo..",
  ];
  const BUSH = [
    "..gggg..",
    ".ggGGgg.",
    "ggGggGgg",
    "gggGGggg",
    ".gggggg.",
    "..oooo..",
  ];
  const ROCK = [
    "..ssss..",
    ".sSssSs.",
    "ssssssss",
    "sSssssSs",
    ".oooooo.",
  ];
  const SERVER = [ // little data-center rack for the world flavor
    "oddddddo",
    "od ss do".replace(/ /g,"s"),
    "odsccsdo",
    "odssssdo",
    "odsccsdo",
    "odssssdo",
    "odsccsdo",
    "oddddddo",
  ];
  const CRYSTAL = [
    "...c...",
    "..ccc..",
    ".ccccc.",
    "wwcccww".replace(/w/g,"c"),
    ".cCCc..".slice(0,7),
    "..cc...".slice(0,7),
    "...c...",
  ];
  const props = {
    tree: bake(TREE), lamp: bake(LAMP), bush: bake(BUSH), rock: bake(ROCK),
    server: bake(SERVER), crystal: bake(CRYSTAL),
  };

  /* ---- SHARD ------------------------------------------------------------- */
  const SHARD = [
    "...c...",
    "..ccc..",
    ".ccwcc.",
    "ccwwwcc",
    ".ccwcc.",
    "..ccc..",
    "...c...",
  ];
  const shard = bake(SHARD, 5);

  /* ---- GROUND TILES (deterministic texture, tiled across the floor) ------ */
  function tileGrass() {
    const T = 16, s = 3; const cv = document.createElement("canvas"); cv.width = T * s; cv.height = T * s; const c = cv.getContext("2d");
    c.fillStyle = "#0d1322"; c.fillRect(0, 0, cv.width, cv.height);
    // subtle darker checker + a few "tufts"
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = (x * 7 + y * 13) % 11;
      if (n === 0) { c.fillStyle = "rgba(70,110,170,.10)"; c.fillRect(x * s, y * s, s, s); }
      else if (n === 5) { c.fillStyle = "rgba(40,70,120,.12)"; c.fillRect(x * s, y * s, s, s); }
    }
    return cv;
  }
  function tilePath() {
    const T = 16, s = 3; const cv = document.createElement("canvas"); cv.width = T * s; cv.height = T * s; const c = cv.getContext("2d");
    c.fillStyle = "#171f31"; c.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = (x * 5 + y * 3) % 7;
      if (n === 0) { c.fillStyle = "rgba(120,150,210,.06)"; c.fillRect(x * s, y * s, s, s); }
    }
    return cv;
  }
  const tiles = { grass: tileGrass(), path: tilePath() };

  window.SPRITES = {
    PX,
    hero: (dir) => HERO[dir] || HERO.down,
    props, shard,
    tile: (k) => tiles[k] || tiles.grass,
    bake, // exposed in case other modules want custom sprites
  };
})();
