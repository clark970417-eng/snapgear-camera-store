// SnapGear Camera Store — Procedural GBA Pixel-Art Overworld & Mart Engine
// Visual craft modeled after akshayakula.com's 16x16 pixel-art canvas engine

import { retroAudio } from "./audio.js";

const TILE = 16;
const OUTLINE = "#363038";

function hash2d(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 1540483477;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)));
  return `rgb(${r},${g},${b})`;
}

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function box(ctx, x, y, w, h, fill, border = OUTLINE) {
  px(ctx, x, y, border, w, h);
  px(ctx, x + 1, y + 1, fill, w - 2, h - 2);
}

// =========================================================================
// PIXEL ART PRIMITIVES (Trees, Buildings, Landmarks, Gear Sprites, Chibi NPCs)
// =========================================================================

function drawOakTree(ctx, x, y) {
  // Ground shadow
  px(ctx, x + 3, y + 26, "rgba(18,45,32,0.28)", 22, 4);
  // Trunk
  px(ctx, x + 10, y + 18, "#4c3220", 8, 10);
  px(ctx, x + 11, y + 18, "#7c5234", 6, 9);
  px(ctx, x + 12, y + 19, "#9a6a44", 2, 7);
  // Layered shaded pixel foliage
  px(ctx, x + 4, y + 3, "#2a4424", 20, 17);
  px(ctx, x + 2, y + 6, "#2a4424", 24, 13);
  px(ctx, x + 5, y + 4, "#4b7d38", 18, 15);
  px(ctx, x + 3, y + 7, "#4b7d38", 22, 11);
  // Mid leaf cluster
  px(ctx, x + 5, y + 4, "#6aa348", 16, 10);
  px(ctx, x + 4, y + 7, "#6aa348", 19, 7);
  // Sunlit crown highlights
  px(ctx, x + 7, y + 5, "#8ec45c", 11, 5);
  px(ctx, x + 6, y + 7, "#8ec45c", 6, 3);
  px(ctx, x + 9, y + 5, "#b0dc78", 5, 2);
  // Deep shadow underside
  px(ctx, x + 5, y + 16, "#37602a", 18, 3);
  px(ctx, x + 8, y + 18, "#2a4c22", 12, 1);
}

function drawStreetLamp(ctx, x, y) {
  px(ctx, x + 4, y + 27, "rgba(18,35,30,0.28)", 8, 3);
  // Post
  px(ctx, x + 6, y + 10, "#383e48", 4, 18);
  px(ctx, x + 7, y + 10, "#707888", 2, 17);
  px(ctx, x + 5, y + 25, "#4a5260", 6, 3);
  // Lantern housing
  box(ctx, x + 3, y + 2, 10, 9, "#f8f4d0", "#383e48");
  px(ctx, x + 2, y + 1, "#383e48", 12, 2);
  px(ctx, x + 4, y + 3, "#fffce6", 8, 6);
  px(ctx, x + 6, y + 4, "#ffffff", 4, 3);
}

function drawFountain(ctx, x, y, tick) {
  // Base shadow
  px(ctx, x + 2, y + 38, "rgba(16,42,36,0.26)", 44, 5);
  // Stone basin outer
  box(ctx, x + 2, y + 14, 44, 26, "#a8b0bc", "#3c424c");
  px(ctx, x + 3, y + 15, "#d0d6e0", 42, 2);
  px(ctx, x + 3, y + 37, "#767e8a", 42, 2);
  // Water pool
  box(ctx, x + 5, y + 17, 38, 18, "#4c98e4", "#326498");
  px(ctx, x + 6, y + 18, "#6cb4f8", 36, 4);
  // Animated water ripples
  const phase = (tick >> 4) % 4;
  px(ctx, x + 8 + phase, y + 22, "#c8eaff", 5, 1);
  px(ctx, x + 30 - phase, y + 29, "#c8eaff", 6, 1);
  px(ctx, x + 12, y + 31 - (phase % 2), "#a4d6ff", 4, 1);
  // Center tiered pillar
  box(ctx, x + 19, y + 12, 10, 16, "#c4cad4", "#3c424c");
  box(ctx, x + 15, y + 10, 18, 5, "#dce2ec", "#3c424c");
  box(ctx, x + 21, y + 4, 6, 7, "#dce2ec", "#3c424c");
  // Water spout arcs
  const sp = (tick >> 3) % 2;
  px(ctx, x + 23, y + 1 - sp, "#e6f8ff", 2, 4);
  px(ctx, x + 19, y + 3 + sp, "#a8e0ff", 2, 2);
  px(ctx, x + 27, y + 3 + sp, "#a8e0ff", 2, 2);
  px(ctx, x + 16, y + 14, "#9cd8ff", 2, 8);
  px(ctx, x + 30, y + 14, "#9cd8ff", 2, 8);
  // Small blue "D2C" emblem plaque on basin
  px(ctx, x + 8, y + 23, "#264e96", 9, 8);
  px(ctx, x + 9, y + 24, "#ffffff", 7, 1);
  px(ctx, x + 10, y + 26, "#ffffff", 5, 1);
  px(ctx, x + 9, y + 28, "#ffffff", 7, 1);
}

function drawPlazaCameraLandmark(ctx, x, y, tick, flashAlpha) {
  // Tripod legs (homage to akshayakula.com's camera-on-tripod!)
  px(ctx, x + 6, y + 28, "rgba(18,36,28,0.28)", 20, 3);
  px(ctx, x + 15, y + 18, "#30343c", 2, 11);
  for (let i = 0; i < 10; i++) {
    px(ctx, x + 14 - Math.floor(i * 0.65), y + 19 + i, "#30343c", 2, 1);
    px(ctx, x + 16 + Math.floor(i * 0.65), y + 19 + i, "#30343c", 2, 1);
  }
  // Retro rangefinder camera body
  box(ctx, x + 3, y + 5, 26, 15, "#5c5048", "#262228");
  px(ctx, x + 4, y + 6, "#d4c8b8", 24, 4); // silver top plate
  px(ctx, x + 5, y + 3, "#262228", 6, 3); // viewfinder hump
  px(ctx, x + 6, y + 4, "#e0e4ec", 4, 2);
  px(ctx, x + 22, y + 3, "#c83830", 3, 2); // red shutter button
  // Rainbow retro stripe
  px(ctx, x + 4, y + 10, "#e04038", 4, 1);
  px(ctx, x + 8, y + 10, "#f0a030", 4, 1);
  px(ctx, x + 12, y + 10, "#50b868", 4, 1);
  px(ctx, x + 16, y + 10, "#3880d8", 4, 1);
  // Lens barrel
  box(ctx, x + 10, y + 7, 12, 11, "#383e48", "#1e2028");
  box(ctx, x + 12, y + 9, 8, 7, "#285088", "#1a1e26");
  px(ctx, x + 13, y + 10, "#70b8f8", 3, 2);
  px(ctx, x + 14, y + 10, "#ffffff", 1, 1);
  // Blinking REC LED
  if ((tick >> 5) % 2 === 0) {
    px(ctx, x + 24, y + 7, "#ff4838", 2, 2);
  }
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,235,${flashAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x + 23, y + 7, 16 * flashAlpha + 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnapGearMartBuilding(ctx, x, y, isNight) {
  const w = 96;
  const h = 72;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  // Blue PokéMart pitched roof
  box(ctx, x + 2, y + 6, w - 4, 28, "#3868c8", "#203468");
  for (let rx = x + 6; rx < x + w - 6; rx += 8) {
    px(ctx, rx, y + 7, "#5084e4", 2, 24);
    px(ctx, rx + 4, y + 7, "#2a50a4", 2, 24);
  }
  px(ctx, x + 4, y + 7, "#76a8f8", w - 8, 3);
  px(ctx, x + 2, y + 32, "#1c2c58", w - 4, 3);
  // Pixel camera icon perched on roof left
  box(ctx, x + 12, y + 11, 16, 12, "#2c3440", "#181e28");
  px(ctx, x + 15, y + 9, "#2c3440", 7, 2);
  box(ctx, x + 17, y + 13, 7, 7, "#64b4f8", "#181e28");
  px(ctx, x + 18, y + 14, "#ffffff", 2, 2);
  // Signboard "SNAPGEAR"
  box(ctx, x + 31, y + 12, 54, 15, "#fcfcfc", "#203468");
  px(ctx, x + 33, y + 14, "#3868c8", 50, 11);
  // Tiny pixel text bar motif inside sign
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SNAPGEAR", x + 58, y + 22);

  // Cream/slate storefront facade
  box(ctx, x + 4, y + 34, w - 8, 36, "#ececf2", "#383c48");
  px(ctx, x + 5, y + 35, "#ffffff", w - 10, 3);
  px(ctx, x + 5, y + 64, "#b8bcc8", w - 10, 5);

  // Left & Right showcase windows with glowing camera gear silhouettes
  const winGlow = isNight ? "#ffe8a4" : "#9cd4f8";
  const winHi = isNight ? "#fff8d8" : "#d4f0ff";
  for (const wx of [x + 10, x + 64]) {
    box(ctx, wx, y + 41, 22, 18, winGlow, "#384252");
    px(ctx, wx + 2, y + 43, winHi, 18, 4);
    // Display gear silhouette inside window
    px(ctx, wx + 4, y + 51, "#38404c", 6, 5);
    px(ctx, wx + 13, y + 49, "#c84038", 5, 7);
    px(ctx, wx + 1, y + 50, "#4c5868", 20, 1);
  }
  // Automatic sliding glass doors (center)
  box(ctx, x + 37, y + 43, 22, 26, isNight ? "#ffd884" : "#78b8ec", "#2c3648");
  px(ctx, x + 47, y + 44, "#3c4658", 2, 24);
  px(ctx, x + 39, y + 45, "#e0f6ff", 6, 8);
  px(ctx, x + 51, y + 45, "#e0f6ff", 6, 8);
  // Door mat
  px(ctx, x + 40, y + 69, "#c84038", 16, 3);
}

function drawSonyStudioBuilding(ctx, x, y, isNight) {
  const w = 80;
  const h = 68;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  // Slate gabled roof
  box(ctx, x + 2, y + 4, w - 4, 24, "#586070", "#2c303a");
  for (let ry = y + 7; ry < y + 26; ry += 4) {
    px(ctx, x + 4, ry, "#6e788a", w - 8, 1);
    px(ctx, x + 4, ry + 2, "#464d5c", w - 8, 1);
  }
  // Brick facade (homage to Akshay's brick house!)
  box(ctx, x + 4, y + 28, w - 8, 38, "#b85644", "#3c2824");
  for (let by = y + 30; by < y + 64; by += 4) {
    px(ctx, x + 5, by, "#9c4434", w - 10, 1);
    for (let bx = x + 6 + ((by % 8) ? 4 : 0); bx < x + w - 6; bx += 8) {
      px(ctx, bx, by, "#9c4434", 1, 4);
    }
  }
  // Sign "SONY PRO"
  box(ctx, x + 16, y + 20, 48, 13, "#20242e", "#101218");
  ctx.fillStyle = "#f8d878";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SONY PRO", x + 40, y + 29);

  // Windows
  const wc = isNight ? "#ffe296" : "#a8daf8";
  for (const wx of [x + 10, x + 54]) {
    box(ctx, wx, y + 38, 16, 16, wc, "#fcfcfc");
    px(ctx, wx + 7, y + 39, "#fcfcfc", 2, 14);
    px(ctx, wx + 1, y + 46, "#fcfcfc", 14, 2);
  }
  // Door
  box(ctx, x + 32, y + 44, 16, 22, "#6c442c", "#342018");
  px(ctx, x + 44, y + 54, "#f0c858", 2, 2);
}

function drawGearWorkshopBuilding(ctx, x, y, isNight) {
  const w = 80;
  const h = 64;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  // Warm amber-terracotta workshop roof
  box(ctx, x + 2, y + 4, w - 4, 20, "#c86c38", "#4e2814");
  for (let rx = x + 6; rx < x + w - 6; rx += 8) {
    px(ctx, rx, y + 6, "#e0844c", 3, 16);
  }
  // Timber & stone lower wall
  box(ctx, x + 4, y + 24, w - 8, 38, "#dfd6c4", "#443a30");
  px(ctx, x + 5, y + 52, "#9a8e7c", w - 10, 9);
  // Sign "GEAR LAB"
  box(ctx, x + 15, y + 17, 50, 12, "#fcfcfc", "#4e2814");
  ctx.fillStyle = "#503018";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.fillText("PHOTO GEAR", x + 40, y + 26);

  const wc = isNight ? "#ffe49e" : "#9cd0ec";
  box(ctx, x + 10, y + 35, 18, 15, wc, "#4c3c2e");
  box(ctx, x + 52, y + 35, 18, 15, wc, "#4c3c2e");
  // Double wood door
  box(ctx, x + 32, y + 39, 16, 23, "#8a5a36", "#3e2618");
  px(ctx, x + 39, y + 40, "#4c301c", 2, 21);
}

function drawSqlAdminBuilding(ctx, x, y, tick) {
  const w = 80;
  const h = 68;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  // Modern tech tower roof with antenna
  px(ctx, x + 64, y - 6, "#3a4250", 2, 12);
  px(ctx, x + 63, y - 8, (tick >> 4) % 2 ? "#48f098" : "#228855", 4, 3);
  box(ctx, x + 2, y + 4, w - 4, 16, "#2c3848", "#161c24");
  px(ctx, x + 4, y + 6, "#445870", w - 8, 3);
  // Main server hall body
  box(ctx, x + 4, y + 20, w - 8, 46, "#3a4658", "#1a202c");
  // Sign "SQL HQ"
  box(ctx, x + 16, y + 14, 48, 13, "#141c24", "#0e1218");
  ctx.fillStyle = "#78f4b8";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SQL ADMIN", x + 40, y + 23);

  // Server rack windows with blinking LEDs
  for (const wx of [x + 10, x + 52]) {
    box(ctx, wx, y + 32, 18, 22, "#16202a", "#222c38");
    for (let row = 0; row < 4; row++) {
      px(ctx, wx + 2, y + 35 + row * 5, "#283848", 14, 3);
      const blink = ((tick >> 4) + row + wx) % 3 === 0;
      px(ctx, wx + 12, y + 36 + row * 5, blink ? "#58f4a4" : "#3888d8", 2, 1);
    }
  }
  // Security glass door
  box(ctx, x + 32, y + 42, 16, 24, "#4c88b8", "#1a222c");
  px(ctx, x + 34, y + 44, "#94d4ff", 5, 10);
}

// =========================================================================
// CUSTOM PIXEL-ART PRODUCT SPRITES (for SnapGear Mart Pedestals)
// =========================================================================

function drawProductPixelSprite(ctx, kind, cx, cy, tick) {
  const bob = Math.round(Math.sin(tick / 18) * 0.8);
  const x = cx - 7;
  const y = cy - 7 + bob;

  if (kind === "battery") {
    box(ctx, x + 2, y + 2, 10, 12, "#2a2e38", "#14161c");
    px(ctx, x + 4, y + 3, "#464d5c", 6, 3);
    px(ctx, x + 4, y + 1, "#d8a830", 2, 2);
    px(ctx, x + 8, y + 1, "#d8a830", 2, 2);
    px(ctx, x + 4, y + 8, "#3898f0", 6, 2);
  } else if (kind === "charger") {
    box(ctx, x + 1, y + 4, 12, 10, "#2c323c", "#14161c");
    px(ctx, x + 3, y + 2, "#404856", 6, 6);
    px(ctx, x + 10, y + 6, (tick >> 5) % 2 ? "#4cf088" : "#22a858", 2, 2);
    px(ctx, x + 2, y + 11, "#525a6a", 10, 2);
  } else if (kind === "sdcard") {
    box(ctx, x + 2, y + 1, 10, 13, "#24262e", "#101218");
    px(ctx, x + 10, y + 1, "#f0efe8", 2, 2); // notched SD corner
    px(ctx, x + 3, y + 5, "#d83834", 8, 3); // crimson band
    px(ctx, x + 3, y + 8, "#e0bc5c", 8, 3); // gold band
    px(ctx, x + 1, y + 4, "#d0d4dc", 1, 3); // lock switch
  } else if (kind === "tripod") {
    // Mini tripod with crimson ball-head button
    px(ctx, x + 6, y + 1, "#d0d4dc", 2, 2);
    box(ctx, x + 4, y + 3, 6, 4, "#2a2e36", "#14161c");
    px(ctx, x + 6, y + 4, "#e03838", 2, 2);
    px(ctx, x + 6, y + 7, "#242830", 2, 7);
    px(ctx, x + 3, y + 8, "#242830", 2, 5);
    px(ctx, x + 9, y + 8, "#242830", 2, 5);
    px(ctx, x + 2, y + 12, "#14161c", 2, 2);
    px(ctx, x + 10, y + 12, "#14161c", 2, 2);
  } else if (kind === "grip") {
    // Shooting grip + shutter button
    px(ctx, x + 5, y + 1, "#c8ced8", 4, 2);
    box(ctx, x + 4, y + 3, 6, 8, "#262a34", "#12141a");
    px(ctx, x + 6, y + 5, "#e04038", 2, 2);
    px(ctx, x + 3, y + 11, "#262a34", 3, 3);
    px(ctx, x + 8, y + 11, "#262a34", 3, 3);
  } else {
    // Camera cage side handle
    box(ctx, x + 3, y + 2, 5, 11, "#6c482c", "#1a1410");
    box(ctx, x + 8, y + 4, 4, 6, "#323844", "#14161c");
    px(ctx, x + 9, y + 6, "#e03838", 2, 2);
  }
}

// =========================================================================
// CHIBI PIXEL CHARACTER SPRITE (16x20 — exact GBA Pokémon proportions!)
// =========================================================================

function drawChibi(ctx, x, y, opts) {
  const {
    dir = "down",
    frame = 0,
    hair = "#201e24",
    skin = "#f0c094",
    shirt = "#3868c8",
    pants = "#343a4c",
    cameraStrap = false
  } = opts;

  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  // Shadow
  px(ctx, x + 3, y + 14, "rgba(18,32,26,0.3)", 10, 3);

  // Legs / shoes
  const leftLegY = y + 12 + (step < 0 ? -1 : 0);
  const rightLegY = y + 12 + (step > 0 ? -1 : 0);
  px(ctx, x + 4, leftLegY, "#20222a", 3, 4);
  px(ctx, x + 9, rightLegY, "#20222a", 3, 4);
  px(ctx, x + 4, leftLegY, pants, 3, 2);
  px(ctx, x + 9, rightLegY, pants, 3, 2);

  // Torso
  box(ctx, x + 3, y + 6, 10, 7, shirt, OUTLINE);
  px(ctx, x + 4, y + 7, shade(shirt, 1.18), 8, 2);
  if (cameraStrap) {
    // Tiny hanging pixel camera on player's chest!
    px(ctx, x + 5, y + 7, "#202228", 1, 3);
    px(ctx, x + 10, y + 7, "#202228", 1, 3);
    px(ctx, x + 6, y + 9, "#2a2e38", 4, 3);
    px(ctx, x + 7, y + 10, "#70c0ff", 2, 1);
  }

  // Arms
  px(ctx, x + 2, y + 7 + (step > 0 ? 1 : 0), skin, 1, 4);
  px(ctx, x + 13, y + 7 + (step < 0 ? 1 : 0), skin, 1, 4);

  // Head
  box(ctx, x + 2, y - 3, 12, 10, skin, OUTLINE);
  // Hair cap
  px(ctx, x + 2, y - 4, OUTLINE, 12, 5);
  px(ctx, x + 3, y - 3, hair, 10, 4);
  px(ctx, x + 4, y - 3, shade(hair, 1.25), 5, 1);

  if (dir === "up") {
    px(ctx, x + 3, y - 1, hair, 10, 6);
  } else if (dir === "left") {
    px(ctx, x + 3, y + 1, "#1e1e26", 2, 2);
    px(ctx, x + 8, y - 1, hair, 5, 5);
  } else if (dir === "right") {
    px(ctx, x + 11, y + 1, "#1e1e26", 2, 2);
    px(ctx, x + 3, y - 1, hair, 5, 5);
  } else {
    // Down-facing cute eyes
    px(ctx, x + 5, y + 2, "#1e1e26", 2, 2);
    px(ctx, x + 9, y + 2, "#1e1e26", 2, 2);
    px(ctx, x + 5, y + 2, "#ffffff", 1, 1);
    px(ctx, x + 9, y + 2, "#ffffff", 1, 1);
  }
}

// =========================================================================
// MAIN PIXEL WORLD CONTROLLER
// =========================================================================

export class SnapGearPixelWorld {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cb = callbacks;

    this.mapId = "town"; // "town" | "mart"
    this.tick = 0;
    this.storeData = null;
    this.modalOpen = false;
    this.timeMode = "auto"; // "auto" | "day" | "dusk" | "night"
    this.cameraFlash = 0;

    // Player state
    this.player = {
      x: 11 * TILE,
      y: 9 * TILE,
      dir: "down",
      walkFrame: 0,
      stepAccum: 0,
      path: [],
      pendingAction: null
    };

    this.keys = new Set();
    this.touchVec = { x: 0, y: 0, dash: false };
    this.hoverZone = null;
    this.particles = [];
    this.mapConfigs = {};
    this.offscreenBg = document.createElement("canvas");
    this.offscreenCtx = this.offscreenBg.getContext("2d");
    this.bgDirty = true;

    this.initParticles();
    this.rebuildMaps();
    this.bindInputs();
    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: Math.random() * 384,
        y: Math.random() * 256,
        vx: 0.16 + Math.random() * 0.2,
        vy: 0.08 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
        color: i % 3 === 0 ? "#e87838" : i % 3 === 1 ? "#f0b848" : "#d85038"
      });
    }
  }

  setStoreData(storeData) {
    this.storeData = storeData;
    this.rebuildMaps();
    this.bgDirty = true;
  }

  setModalOpen(open) {
    this.modalOpen = open;
    if (open) {
      this.keys.clear();
      this.player.path = [];
      this.hideTip();
    }
  }

  getTimePhase() {
    if (this.timeMode !== "auto") return this.timeMode;
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h >= 5 && h < 7.5) return "dawn";
    if (h >= 7.5 && h < 17.5) return "day";
    if (h >= 17.5 && h < 20) return "dusk";
    return "night";
  }

  cycleTimeMode() {
    const order = ["auto", "day", "dusk", "night"];
    const next = order[(order.indexOf(this.timeMode) + 1) % order.length];
    this.timeMode = next;
    this.bgDirty = true;
    return next;
  }

  // ---- Build collision grids, zones, NPCs, and dynamic product pedestals ----
  rebuildMaps() {
    const products = this.storeData?.products || [];
    const customers = this.storeData?.customers || [];

    // 1. OVERWORLD TOWN (24x16 tiles = 384x256)
    const townCols = 24;
    const townRows = 16;
    const townSolid = Array.from({ length: townRows }, () => Array(townCols).fill(false));
    const markSolid = (grid, tx, ty, tw, th) => {
      for (let y = ty; y < ty + th; y++) {
        for (let x = tx; x < tx + tw; x++) {
          if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
            grid[y][x] = true;
          }
        }
      }
    };

    // Border trees
    for (let x = 0; x < townCols; x++) {
      townSolid[0][x] = true;
      townSolid[1][x] = true;
      townSolid[townRows - 1][x] = true;
    }
    for (let y = 0; y < townRows; y++) {
      townSolid[y][0] = true;
      townSolid[y][townCols - 1] = true;
    }

    // Building footprints
    // SnapGear Mart (top-left): tiles x=2..7, y=2..6 (door at 5,6 -> walkable at 5,7)
    markSolid(townSolid, 2, 2, 6, 4);
    // Sony Studio (top-right): tiles x=16..20, y=2..5
    markSolid(townSolid, 16, 2, 5, 4);
    // Photo Gear Workshop (bottom-left): tiles x=2..6, y=10..13
    markSolid(townSolid, 2, 10, 5, 4);
    // SQL Admin Lab (bottom-right): tiles x=17..21, y=10..13
    markSolid(townSolid, 17, 10, 5, 4);
    // Plaza camera landmark (tiles 11..12, y=6..7)
    markSolid(townSolid, 11, 6, 2, 2);
    // Fountain (tiles 10..12, y=11..13)
    markSolid(townSolid, 10, 11, 3, 3);

    const custByName = (idx, fallbackName) => {
      const c = customers[idx];
      if (!c) return { name: fallbackName, sale_count: 0, gross_spent: 0 };
      return c;
    };
    const alex = custByName(0, "Alex Chen");
    const mia = custByName(1, "Mia Wang");
    const jason = custByName(2, "Jason Lin");

    const townZones = [
      {
        id: "mart_door",
        kind: "building",
        x: 2 * TILE,
        y: 2 * TILE,
        w: 6 * TILE,
        h: 4.6 * TILE,
        approach: { tx: 5, ty: 7 },
        doorTile: { tx: 5, ty: 6 },
        title: "SNAPGEAR CAMERA MART",
        meta: `${products.length} products live from SQLite`,
        sub: "Click or walk to door to enter store",
        onInteract: () => this.switchMap("mart", 9, 10, "up")
      },
      {
        id: "sony_studio",
        kind: "building",
        x: 16 * TILE,
        y: 2 * TILE,
        w: 5 * TILE,
        h: 4.5 * TILE,
        approach: { tx: 18, ty: 6 },
        title: "SONY PRO SHOWROOM",
        meta: "Supplier #1 · Sony Distributor",
        sub: "Click to browse Sony batteries, chargers & grips",
        onInteract: () => this.cb.openCatalog({ supplierId: 1 })
      },
      {
        id: "gear_workshop",
        kind: "building",
        x: 2 * TILE,
        y: 10 * TILE,
        w: 5 * TILE,
        h: 4.2 * TILE,
        approach: { tx: 4, ty: 9 },
        title: "PHOTO GEAR WORKSHOP",
        meta: "Supplier #2 · Photo Gear Distributor",
        sub: "Click to browse SanDisk & Manfrotto accessories",
        onInteract: () => this.cb.openCatalog({ supplierId: 2 })
      },
      {
        id: "sql_lab",
        kind: "building",
        x: 17 * TILE,
        y: 10 * TILE,
        w: 5 * TILE,
        h: 4.4 * TILE,
        approach: { tx: 19, ty: 9 },
        title: "SQL ADMIN LAB",
        meta: "Live SQLite 6-Table Backend",
        sub: "Click to inspect tables & run SQL queries",
        onInteract: () => this.cb.openAdmin()
      },
      {
        id: "camera_landmark",
        kind: "prop",
        x: 11 * TILE,
        y: 6 * TILE,
        w: 2 * TILE,
        h: 2 * TILE,
        approach: { tx: 11, ty: 8 },
        title: "SNAPGEAR STUDIO CAMERA",
        meta: "Click for flash & store overview",
        sub: "SnapGear Direct-to-Consumer Camera Store",
        onInteract: () => {
          this.cameraFlash = 1.0;
          retroAudio.shutter();
          this.cb.showDialogue(
            [
              "CLICK! *FLASH*\nWelcome to SNAPGEAR CAMERA STORE!",
              `We carry ${products.length} genuine camera accessories synced live with SQLite.\nWalk into SNAPGEAR MART or click SHOP CATALOG to buy!`
            ],
            [
              { label: "🏪 Enter Mart", onClick: () => this.switchMap("mart", 9, 10, "up") },
              { label: "📷 Shop Catalog", onClick: () => this.cb.openCatalog() }
            ]
          );
        }
      },
      {
        id: "fountain",
        kind: "prop",
        x: 10 * TILE,
        y: 11 * TILE,
        w: 3 * TILE,
        h: 3 * TILE,
        approach: { tx: 11, ty: 10 },
        title: "D2C PLAZA FOUNTAIN",
        meta: "Normalized 6-Table SQLite Architecture",
        sub: "Click to inspect Orders & Store Services",
        onInteract: () => this.cb.openOrders()
      }
    ];

    const townNpcs = [
      {
        id: "npc_host",
        tx: 9,
        ty: 7,
        dir: "down",
        hair: "#241d28",
        skin: "#f2c498",
        shirt: "#3868c8",
        pants: "#283044",
        title: "SNAPGEAR GUIDE",
        meta: "Store Concierge",
        sub: "Press Z or click to chat",
        onInteract: () => {
          const greeting = this.getGreeting();
          this.cb.showDialogue(
            [
              `${greeting}\nWelcome to SNAPGEAR CAMERA TOWN!`,
              "Enter the blue SNAPGEAR MART north-west to browse every shelf, or click SHOP CATALOG at the top to order directly!"
            ],
            [
              { label: "📷 Browse All Products", onClick: () => this.cb.openCatalog() },
              { label: "🏪 Walk Inside Mart", onClick: () => this.switchMap("mart", 9, 10, "up") },
              { label: "🗄 Open SQL Admin", onClick: () => this.cb.openAdmin() }
            ]
          );
        }
      },
      {
        id: "npc_alex",
        tx: 14,
        ty: 6,
        dir: "left",
        hair: "#1c1c24",
        skin: "#eab98c",
        shirt: "#2d8a68",
        pants: "#2e3646",
        title: `${alex.name} (Customer #1)`,
        meta: `Sales: ${alex.sale_count} · Spent: NT$${Number(alex.gross_spent || 0).toLocaleString()}`,
        sub: "SQLite customers table NPC",
        onInteract: () => {
          this.cb.showDialogue([
            `${alex.name.toUpperCase()}: I love SnapGear's instant checkout!\nMy SQLite record shows ${alex.sale_count} sale order(s) (NT$${Number(alex.gross_spent || 0).toLocaleString()}).`,
            `${alex.name.toUpperCase()}: Even when I returned my battery for a refund, the stock_changes ledger updated right away!`
          ]);
        }
      },
      {
        id: "npc_mia",
        tx: 8,
        ty: 11,
        dir: "right",
        hair: "#5a3424",
        skin: "#f6cca4",
        shirt: "#d85058",
        pants: "#3a4458",
        title: `${mia.name} (Customer #2)`,
        meta: `Sales: ${mia.sale_count} · Spent: NT$${Number(mia.gross_spent || 0).toLocaleString()}`,
        sub: "SQLite customers table NPC",
        onInteract: () => {
          this.cb.showDialogue([
            `${mia.name.toUpperCase()}: Shooting 4K video all weekend!\nI picked up SanDisk 128GB SD Cards here — super fast and matched Sony/CameraPro retail prices.`,
            `${mia.name.toUpperCase()}: My live SQLite order total is NT$${Number(mia.gross_spent || 0).toLocaleString()}!`
          ]);
        }
      },
      {
        id: "npc_jason",
        tx: 15,
        ty: 12,
        dir: "up",
        hair: "#322820",
        skin: "#e6b486",
        shirt: "#c88830",
        pants: "#303646",
        title: `${jason.name} (Customer #3)`,
        meta: `Sales: ${jason.sale_count} · Spent: NT$${Number(jason.gross_spent || 0).toLocaleString()}`,
        sub: "SQLite customers table NPC",
        onInteract: () => {
          this.cb.showDialogue(
            [
              `${jason.name.toUpperCase()}: I'm deciding between the Manfrotto PIXI Tripod (NT$990) and the Sony GP-VPT2BT Grip (NT$3,980)!`,
              `${jason.name.toUpperCase()}: Check out my account in the Checkout dropdown if you want to place an order for me!`
            ],
            [{ label: "📷 Compare in Catalog", onClick: () => this.cb.openCatalog() }]
          );
        }
      }
    ];

    for (const npc of townNpcs) {
      townSolid[npc.ty][npc.tx] = true;
    }

    // 2. SNAPGEAR MART INTERIOR (18x12 tiles = 288x192)
    const martCols = 18;
    const martRows = 12;
    const martSolid = Array.from({ length: martRows }, () => Array(martCols).fill(false));
    for (let x = 0; x < martCols; x++) {
      martSolid[0][x] = true;
      martSolid[1][x] = true;
      martSolid[2][x] = true;
      martSolid[martRows - 1][x] = true;
    }
    for (let y = 0; y < martRows; y++) {
      martSolid[y][0] = true;
      martSolid[y][martCols - 1] = true;
    }
    // Exit mat tiles (8,11 and 9,11) walkable to exit
    martSolid[11][8] = false;
    martSolid[11][9] = false;

    // Checkout counter (top-left x=2..5, y=3..4)
    markSolid(martSolid, 2, 3, 4, 2);
    // Service desk (left-mid x=1..2, y=7..8)
    markSolid(martSolid, 1, 7, 2, 2);
    // SQL Back-Office Terminal (top-right x=14..16, y=3..4)
    markSolid(martSolid, 14, 3, 3, 2);

    // Dynamic Product Display Pedestals (populated LIVE from SQLite products!)
    const pedestalSlots = [
      { tx: 6, ty: 5 },
      { tx: 9, ty: 5 },
      { tx: 12, ty: 5 },
      { tx: 6, ty: 8 },
      { tx: 9, ty: 8 },
      { tx: 12, ty: 8 },
      { tx: 14, ty: 8 },
      { tx: 4, ty: 8 },
      { tx: 15, ty: 6 },
      { tx: 4, ty: 6 }
    ];

    const martProducts = products.slice(0, pedestalSlots.length).map((prod, idx) => {
      const slot = pedestalSlots[idx];
      martSolid[slot.ty][slot.tx] = true;
      return { prod, tx: slot.tx, ty: slot.ty };
    });

    const martZones = [
      {
        id: "checkout_counter",
        kind: "counter",
        x: 2 * TILE,
        y: 3 * TILE,
        w: 4 * TILE,
        h: 2 * TILE,
        approach: { tx: 4, ty: 5 },
        title: "CHECKOUT COUNTER",
        meta: "D2C Cash Register · Clerk",
        sub: "Click or press Z to open Shopping Cart & Pay",
        onInteract: () => this.cb.openCart()
      },
      {
        id: "sql_terminal",
        kind: "terminal",
        x: 14 * TILE,
        y: 3 * TILE,
        w: 3 * TILE,
        h: 2 * TILE,
        approach: { tx: 15, ty: 5 },
        title: "SQLITE ADMIN TERMINAL",
        meta: "snapgear.db · Live SQL Admin",
        sub: "Click to edit products, prices & SQL directly",
        onInteract: () => this.cb.openAdmin()
      },
      {
        id: "service_desk",
        kind: "desk",
        x: 1 * TILE,
        y: 7 * TILE,
        w: 2 * TILE,
        h: 2 * TILE,
        approach: { tx: 3, ty: 7 },
        title: "WARRANTY & SERVICE DESK",
        meta: "Orders, Restocks & 7-Day Refunds",
        sub: "Click to view store services & order ledger",
        onInteract: () => this.cb.openOrders()
      },
      {
        id: "mart_exit",
        kind: "exit",
        x: 8 * TILE,
        y: 11 * TILE,
        w: 2 * TILE,
        h: 1 * TILE,
        approach: { tx: 8, ty: 10 },
        title: "EXIT TO SNAPGEAR PLAZA",
        meta: "Return outside to town",
        sub: "Walk onto mat or click to step outside",
        onInteract: () => this.switchMap("town", 5, 7, "down")
      },
      ...martProducts.map(({ prod, tx, ty }) => ({
        id: `prod_${prod.product_id}`,
        kind: "product",
        prod,
        x: tx * TILE - 2,
        y: ty * TILE - 4,
        w: TILE + 4,
        h: TILE + 4,
        approach: { tx, ty: ty + 1 },
        title: `#${prod.product_id} ${prod.name}`,
        meta: `NT$${Number(prod.price).toLocaleString()} · Stock: ${prod.stock}`,
        sub: "Click or press Z to inspect & Buy Now",
        onInteract: () => this.cb.openProductDetail(prod.product_id)
      }))
    ];

    const martNpcs = [
      {
        id: "mart_clerk",
        tx: 3,
        ty: 3,
        dir: "down",
        hair: "#382820",
        skin: "#f6cc9e",
        shirt: "#3868c8",
        pants: "#222a3c",
        title: "SNAPGEAR CLERK",
        meta: "D2C Checkout & Inquiries",
        sub: "Click to checkout or open full catalog",
        onInteract: () => {
          this.cb.showDialogue(
            [
              "CLERK: Welcome to SNAPGEAR MART!\nEvery display pedestal holds live stock from our SQLite database.",
              "CLERK: Click any glowing gear pedestal to inspect specs & buy, or jump straight to checkout!"
            ],
            [
              { label: "📷 Full Catalog Grid", onClick: () => this.cb.openCatalog() },
              { label: "🛒 Go to Checkout", onClick: () => this.cb.openCart() }
            ]
          );
        }
      }
    ];

    this.mapConfigs = {
      town: {
        id: "town",
        title: "SNAPGEAR CAMERA TOWN",
        cols: townCols,
        rows: townRows,
        w: townCols * TILE,
        h: townRows * TILE,
        solid: townSolid,
        zones: townZones,
        npcs: townNpcs,
        products: []
      },
      mart: {
        id: "mart",
        title: "SNAPGEAR MART · SHOWROOM",
        cols: martCols,
        rows: martRows,
        w: martCols * TILE,
        h: martRows * TILE,
        solid: martSolid,
        zones: martZones,
        npcs: martNpcs,
        products: martProducts
      }
    };
  }

  getGreeting() {
    const h = new Date().getHours();
    if (h < 5) return "Burning the midnight oil?";
    if (h < 12) return "Good morning, photographer!";
    if (h < 17) return "Good afternoon, creator!";
    if (h < 21) return "Good evening!";
    return "Late-night gear shopping?";
  }

  switchMap(targetMap, spawnTx, spawnTy, dir = "down") {
    if (!this.mapConfigs[targetMap]) return;
    const fade = document.getElementById("fade");
    retroAudio.door();
    if (fade) fade.classList.add("on");
    this.player.path = [];
    this.player.pendingAction = null;

    window.setTimeout(() => {
      this.mapId = targetMap;
      const cfg = this.mapConfigs[targetMap];
      this.player.x = (spawnTx ?? (targetMap === "mart" ? 9 : 5)) * TILE;
      this.player.y = (spawnTy ?? (targetMap === "mart" ? 10 : 7)) * TILE;
      this.player.dir = dir;
      this.bgDirty = true;
      retroAudio.setMode(targetMap);
      this.resize();
      this.cb.onMapChange?.(targetMap, cfg.title);
      if (fade) fade.classList.remove("on");
    }, 220);
  }

  resize() {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.canvas.width = cfg.w;
    this.canvas.height = cfg.h;

    // Fit crisply inside viewport like akshayakula.com (overworld fills wide; interior centered in dark frame)
    const padX = this.mapId === "mart" ? 48 : 0;
    const padY = this.mapId === "mart" ? 96 : 0;
    const scale = Math.max(1.2, Math.min((vw - padX) / cfg.w, (vh - padY) / cfg.h));
    const drawW = Math.round(cfg.w * scale);
    const drawH = Math.round(cfg.h * scale);
    this.canvas.style.width = `${drawW}px`;
    this.canvas.style.height = `${drawH}px`;
    this.canvas.style.left = `${Math.round((vw - drawW) / 2)}px`;
    this.canvas.style.top = `${Math.round((vh - drawH) / 2)}px`;
    this.scale = scale;
    document.documentElement.style.setProperty("--s", scale.toFixed(3));
  }

  // ---- A* Pathfinding for crisp click-to-walk ----
  findPath(startTx, startTy, goalTx, goalTy) {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return [];
    const { cols, rows, solid } = cfg;
    const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));
    let gx = clamp(goalTx, cols);
    let gy = clamp(goalTy, rows);

    // If clicked tile is blocked, pick closest walkable neighbor
    if (solid[gy][gx]) {
      const dirs = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [-1, 1], [1, -1], [-1, -1]
      ];
      let best = null;
      let bestD = Infinity;
      for (const [dx, dy] of dirs) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !solid[ny][nx]) {
          const d = Math.hypot(nx - startTx, ny - startTy);
          if (d < bestD) {
            bestD = d;
            best = [nx, ny];
          }
        }
      }
      if (!best) return [];
      [gx, gy] = best;
    }

    const key = (x, y) => `${x},${y}`;
    const open = [{ x: startTx, y: startTy, g: 0, f: Math.abs(gx - startTx) + Math.abs(gy - startTy) }];
    const came = new Map();
    const gScore = new Map([[key(startTx, startTy), 0]]);
    const closed = new Set();

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      const ck = key(cur.x, cur.y);
      if (cur.x === gx && cur.y === gy) {
        const path = [];
        let k = ck;
        while (came.has(k)) {
          const [pxx, pyy] = k.split(",").map(Number);
          path.unshift({ x: pxx * TILE, y: pyy * TILE });
          k = came.get(k);
        }
        return path;
      }
      closed.add(ck);
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || solid[ny][nx]) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;
        const tentG = cur.g + 1;
        if (tentG < (gScore.get(nk) ?? Infinity)) {
          came.set(nk, ck);
          gScore.set(nk, tentG);
          open.push({ x: nx, y: ny, g: tentG, f: tentG + Math.abs(gx - nx) + Math.abs(gy - ny) });
        }
      }
    }
    return [];
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const wx = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const wy = ((clientY - rect.top) / rect.height) * this.canvas.height;
    return { wx, wy };
  }

  findInteractiveAt(wx, wy) {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return null;
    for (const npc of cfg.npcs) {
      const nx = npc.tx * TILE;
      const ny = npc.ty * TILE - 4;
      if (wx >= nx - 2 && wx <= nx + TILE + 2 && wy >= ny && wy <= ny + TILE + 6) {
        return {
          ...npc,
          x: nx,
          y: ny,
          w: TILE,
          h: TILE + 4,
          approach: { tx: npc.tx, ty: npc.ty + 1 }
        };
      }
    }
    for (const z of cfg.zones) {
      if (wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h) {
        return z;
      }
    }
    return null;
  }

  showTip(zone, clientX, clientY) {
    const tip = document.getElementById("tip");
    if (!tip || !zone) return;
    tip.innerHTML = `<b>${zone.title}</b><span class="tip-meta">${zone.meta || ""}</span><span class="tip-sub">${zone.sub || ""}</span>`;
    tip.classList.add("on");
    const left = Math.min(window.innerWidth - 290, Math.max(12, clientX + 16));
    const top = Math.min(window.innerHeight - 110, Math.max(60, clientY - 12));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  hideTip() {
    const tip = document.getElementById("tip");
    if (tip) tip.classList.remove("on");
  }

  bindInputs() {
    window.addEventListener("keydown", (e) => {
      if (this.modalOpen) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

      if (e.code === "KeyM") {
        const muted = retroAudio.toggleMute();
        const btn = document.getElementById("musBtn");
        if (btn) btn.classList.toggle("off", muted);
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "KeyZ" || e.code === "Space" || e.code === "Enter") {
        if (this.cb.isDialogueOpen()) {
          this.cb.advanceDialogue();
        } else {
          this.interactFacing();
        }
        return;
      }
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        this.player.path = [];
        this.player.pendingAction = null;
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.modalOpen) return;
      const { wx, wy } = this.screenToWorld(e.clientX, e.clientY);
      const hit = this.findInteractiveAt(wx, wy);
      this.hoverZone = hit;
      if (hit) {
        this.showTip(hit, e.clientX, e.clientY);
      } else {
        this.hideTip();
      }
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.hoverZone = null;
      this.hideTip();
    });

    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.modalOpen) return;
      if (this.cb.isDialogueOpen()) {
        this.cb.advanceDialogue();
        return;
      }
      const { wx, wy } = this.screenToWorld(e.clientX, e.clientY);
      const hit = this.findInteractiveAt(wx, wy);
      const curTx = Math.round(this.player.x / TILE);
      const curTy = Math.round(this.player.y / TILE);

      if (hit) {
        retroAudio.blip();
        const ax = hit.approach?.tx ?? Math.floor(wx / TILE);
        const ay = hit.approach?.ty ?? Math.floor(wy / TILE);
        const dist = Math.hypot(curTx - ax, curTy - ay);
        if (dist <= 1.6) {
          hit.onInteract?.();
        } else {
          this.player.path = this.findPath(curTx, curTy, ax, ay);
          this.player.pendingAction = hit.onInteract || null;
          if (this.player.path.length === 0) {
            hit.onInteract?.();
          }
        }
        return;
      }

      const goalTx = Math.floor(wx / TILE);
      const goalTy = Math.floor(wy / TILE);
      this.player.path = this.findPath(curTx, curTy, goalTx, goalTy);
      this.player.pendingAction = null;
    });

    // Touch controls setup
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add("touch");
      const pad = document.getElementById("touchPad");
      const knob = document.getElementById("touchKnob");
      const btnA = document.getElementById("tbtnA");
      const btnB = document.getElementById("tbtnB");
      if (pad && knob) {
        let activeId = null;
        const updatePad = (clientX, clientY) => {
          const r = pad.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = clientX - cx;
          const dy = clientY - cy;
          const maxR = 32;
          const d = Math.hypot(dx, dy);
          const cl = Math.min(maxR, d);
          const ang = Math.atan2(dy, dx);
          knob.style.transform = `translate(${Math.cos(ang) * cl}px, ${Math.sin(ang) * cl}px)`;
          this.touchVec.x = d > 8 ? Math.cos(ang) : 0;
          this.touchVec.y = d > 8 ? Math.sin(ang) : 0;
        };
        pad.addEventListener("pointerdown", (e) => {
          activeId = e.pointerId;
          pad.setPointerCapture(e.pointerId);
          updatePad(e.clientX, e.clientY);
        });
        pad.addEventListener("pointermove", (e) => {
          if (e.pointerId === activeId) updatePad(e.clientX, e.clientY);
        });
        const endPad = (e) => {
          if (e.pointerId === activeId) {
            activeId = null;
            knob.style.transform = "translate(0,0)";
            this.touchVec.x = 0;
            this.touchVec.y = 0;
          }
        };
        pad.addEventListener("pointerup", endPad);
        pad.addEventListener("pointercancel", endPad);
      }
      if (btnA) {
        btnA.addEventListener("pointerdown", () => {
          if (this.cb.isDialogueOpen()) this.cb.advanceDialogue();
          else this.interactFacing();
        });
      }
      if (btnB) {
        btnB.addEventListener("pointerdown", () => { this.touchVec.dash = true; });
        btnB.addEventListener("pointerup", () => { this.touchVec.dash = false; });
        btnB.addEventListener("pointercancel", () => { this.touchVec.dash = false; });
      }
    }
  }

  interactFacing() {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return;
    const off = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.player.dir];
    const fx = this.player.x + 8 + off[0] * 16;
    const fy = this.player.y + 8 + off[1] * 16;
    const hit = this.findInteractiveAt(fx, fy);
    if (hit) {
      retroAudio.blip();
      hit.onInteract?.();
    }
  }

  canOccupy(pxX, pxY) {
    const cfg = this.mapConfigs[this.mapId];
    const pts = [
      [pxX + 3, pxY + 5],
      [pxX + 12, pxY + 5],
      [pxX + 3, pxY + 14],
      [pxX + 12, pxY + 14]
    ];
    for (const [x, y] of pts) {
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (tx < 0 || tx >= cfg.cols || ty < 0 || ty >= cfg.rows) return false;
      if (cfg.solid[ty][tx]) return false;
    }
    return true;
  }

  update() {
    this.tick++;
    if (this.cameraFlash > 0) this.cameraFlash = Math.max(0, this.cameraFlash - 0.05);

    // Update ambient leaves / fireflies
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(this.tick / 28 + p.phase) * 0.1;
      if (p.x > 390) p.x = -6;
      if (p.y > 262) p.y = -6;
    }

    if (this.modalOpen || this.cb.isDialogueOpen()) return;

    const dash = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.touchVec.dash;
    const speed = dash ? 2.15 : 1.3;
    let dx = 0;
    let dy = 0;

    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) dx -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) dx += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) dy -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) dy += 1;

    if (dx === 0 && dy === 0 && (this.touchVec.x !== 0 || this.touchVec.y !== 0)) {
      dx = this.touchVec.x;
      dy = this.touchVec.y;
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const vx = (dx / len) * speed;
      const vy = (dy / len) * speed;
      if (Math.abs(dx) >= Math.abs(dy)) this.player.dir = dx < 0 ? "left" : "right";
      else this.player.dir = dy < 0 ? "up" : "down";

      if (this.canOccupy(this.player.x + vx, this.player.y)) this.player.x += vx;
      if (this.canOccupy(this.player.x, this.player.y + vy)) this.player.y += vy;
      this.player.stepAccum += speed;
      if (this.player.stepAccum >= 7) {
        this.player.stepAccum = 0;
        this.player.walkFrame = (this.player.walkFrame + 1) % 4;
      }
      this.checkStepTriggers();
    } else if (this.player.path.length > 0) {
      const target = this.player.path[0];
      const ddx = target.x - this.player.x;
      const ddy = target.y - this.player.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist <= speed) {
        this.player.x = target.x;
        this.player.y = target.y;
        this.player.path.shift();
        if (this.player.path.length === 0 && this.player.pendingAction) {
          const act = this.player.pendingAction;
          this.player.pendingAction = null;
          act();
        }
      } else {
        const stepS = 1.65;
        this.player.x += (ddx / dist) * stepS;
        this.player.y += (ddy / dist) * stepS;
        if (Math.abs(ddx) >= Math.abs(ddy)) this.player.dir = ddx < 0 ? "left" : "right";
        else this.player.dir = ddy < 0 ? "up" : "down";
        this.player.stepAccum += stepS;
        if (this.player.stepAccum >= 7) {
          this.player.stepAccum = 0;
          this.player.walkFrame = (this.player.walkFrame + 1) % 4;
        }
      }
    } else {
      this.player.walkFrame = 0;
    }
  }

  checkStepTriggers() {
    const tx = Math.round(this.player.x / TILE);
    const ty = Math.round(this.player.y / TILE);
    if (this.mapId === "town" && tx === 5 && ty === 6 && this.player.dir === "up") {
      this.switchMap("mart", 9, 10, "up");
    } else if (this.mapId === "mart" && (tx === 8 || tx === 9) && ty === 11 && this.player.dir === "down") {
      this.switchMap("town", 5, 7, "down");
    }
  }

  // ---- Render Static Background Layer to Offscreen Canvas ----
  bakeBackground() {
    const cfg = this.mapConfigs[this.mapId];
    this.offscreenBg.width = cfg.w;
    this.offscreenBg.height = cfg.h;
    const ctx = this.offscreenCtx;
    const phase = this.getTimePhase();
    const isNight = phase === "night" || phase === "dusk";

    if (this.mapId === "town") {
      this.bakeTownBg(ctx, cfg, isNight);
    } else {
      this.bakeMartBg(ctx, cfg);
    }
    this.bgDirty = false;
  }

  bakeTownBg(ctx, cfg, isNight) {
    // 1. Lush GBA pixel grass
    px(ctx, 0, 0, "#5ad082", cfg.w, cfg.h);
    for (let y = 0; y < cfg.h; y += 4) {
      for (let x = 0; x < cfg.w; x += 4) {
        const r = hash2d(x, y);
        if (r > 0.84) px(ctx, x, y, "#4cc074", 2, 2);
        else if (r < 0.08) px(ctx, x, y, "#6ee094", 2, 1);
      }
    }

    // 2. Crisp stone brick plaza & walkways (exact akshayakula.com vibe!)
    const drawBrickRect = (tx, ty, tw, th) => {
      const rx = tx * TILE;
      const ry = ty * TILE;
      const rw = tw * TILE;
      const rh = th * TILE;
      px(ctx, rx, ry, "#c8c2b8", rw, rh);
      for (let y = ry; y < ry + rh; y += 6) {
        px(ctx, rx, y, "#aba49a", rw, 1);
        px(ctx, rx, y + 1, "#dbd6ce", rw, 1);
        const offset = ((y - ry) / 6) % 2 === 0 ? 0 : 6;
        for (let x = rx + offset; x < rx + rw; x += 12) {
          px(ctx, x, y, "#aba49a", 1, 6);
        }
      }
      // Subtle grass edge border
      px(ctx, rx, ry, "#989288", rw, 1);
      px(ctx, rx, ry + rh - 1, "#989288", rw, 1);
    };

    // Main horizontal avenue
    drawBrickRect(1, 8, 22, 2);
    // Center square plaza
    drawBrickRect(9, 2, 6, 7);
    // Walkways to buildings & fountain
    drawBrickRect(5, 6, 1, 2);
    drawBrickRect(18, 6, 1, 2);
    drawBrickRect(8, 10, 1, 5);
    drawBrickRect(14, 10, 1, 5);
    drawBrickRect(4, 9, 2, 1);
    drawBrickRect(19, 9, 2, 1);

    // 3. Cute pixel red & white wildflowers on grass
    for (let ty = 2; ty < cfg.rows - 1; ty++) {
      for (let tx = 1; tx < cfg.cols - 1; tx++) {
        const r = hash2d(tx * 13, ty * 29);
        if (r > 0.72 && !cfg.solid[ty][tx]) {
          // Skip brick paths
          if (ty === 8 || ty === 9 || (tx >= 9 && tx <= 14 && ty <= 8)) continue;
          const fx = tx * TILE + 3 + Math.floor(hash2d(tx, ty) * 7);
          const fy = ty * TILE + 3 + Math.floor(hash2d(ty, tx) * 7);
          const isRed = r > 0.85;
          px(ctx, fx, fy, isRed ? "#e04450" : "#fcfcfc", 3, 3);
          px(ctx, fx + 1, fy + 1, isRed ? "#ffd858" : "#f0c840", 1, 1);
        }
      }
    }

    // 4. Perimeter oak trees (dense emerald border framing the town!)
    for (let tx = 0; tx < cfg.cols; tx += 2) {
      drawOakTree(ctx, tx * TILE - 6, -4);
      drawOakTree(ctx, tx * TILE - 6, (cfg.rows - 2) * TILE + 6);
    }
    for (let ty = 1; ty < cfg.rows - 1; ty += 2) {
      drawOakTree(ctx, -10, ty * TILE - 4);
      drawOakTree(ctx, (cfg.cols - 1) * TILE - 2, ty * TILE - 4);
    }

    // 5. Four iconic buildings
    drawSnapGearMartBuilding(ctx, 2 * TILE, 1.5 * TILE, isNight);
    drawSonyStudioBuilding(ctx, 16 * TILE, 1.8 * TILE, isNight);
    drawGearWorkshopBuilding(ctx, 2 * TILE, 10 * TILE, isNight);
    drawSqlAdminBuilding(ctx, 17 * TILE, 9.8 * TILE, 0);

    // 6. Street lamps
    this.lampCoords = [
      [8.2 * TILE, 6.2 * TILE],
      [15.0 * TILE, 6.2 * TILE],
      [7.2 * TILE, 12.6 * TILE],
      [15.4 * TILE, 12.6 * TILE]
    ];
    for (const [lx, ly] of this.lampCoords) {
      drawStreetLamp(ctx, lx, ly);
    }
  }

  bakeMartBg(ctx, cfg) {
    const w = cfg.w;
    const h = cfg.h;

    // 1. Warm oak wood-plank gallery floor (modeled directly after rooms.js!)
    const woodA = "#e0a868";
    const woodB = "#ecbc80";
    const woodC = "#c88c50";
    const seam = "#a86c3c";
    for (let y = 44; y < h; y++) {
      const row = (y - 44) >> 2;
      const sub = (y - 44) & 3;
      for (let x = 0; x < w; x++) {
        const shift = Math.floor(hash2d(row, 7) * 24);
        const plank = Math.floor((x + shift) / 24);
        const t = hash2d(plank, row * 3 + 1);
        let c = t < 0.32 ? woodC : t < 0.78 ? woodA : woodB;
        if (sub === 3) c = seam;
        else if (sub === 0) c = shade(c, 1.05);
        if ((x + shift) % 24 === 0 && sub !== 3) c = seam;
        px(ctx, x, y, c);
      }
    }

    // 2. Blue-and-cream checkered boutique display floor in center
    const cx0 = 5 * TILE;
    const cy0 = 4 * TILE;
    const cw = 9 * TILE;
    const ch = 6 * TILE;
    for (let y = 0; y < ch; y += 8) {
      for (let x = 0; x < cw; x += 8) {
        const even = ((x / 8 + y / 8) % 2) === 0;
        px(ctx, cx0 + x, cy0 + y, even ? "#f4f0e0" : "#b2d0e2", 8, 8);
        px(ctx, cx0 + x, cy0 + y, even ? "#fffcf4" : "#cae2f0", 7, 1);
        px(ctx, cx0 + x + 7, cy0 + y, even ? "#dcd4c0" : "#90b0c4", 1, 8);
      }
    }
    // Trim around checkered floor
    px(ctx, cx0 - 2, cy0 - 2, "#8a6040", cw + 4, 2);
    px(ctx, cx0 - 2, cy0 + ch, "#8a6040", cw + 4, 2);
    px(ctx, cx0 - 2, cy0, "#8a6040", 2, ch);
    px(ctx, cx0 + cw, cy0, "#8a6040", 2, ch);

    // 3. Top cream-and-wood paneled boutique wall
    px(ctx, 0, 0, "#f8ecc8", w, 44);
    for (let x = 0; x < w; x += 8) {
      px(ctx, x, 4, "#e8d8b0", 1, 22);
    }
    px(ctx, 0, 0, "#4a3830", w, 3);
    px(ctx, 0, 3, "#c8a878", w, 2);
    px(ctx, 0, 26, "#6a4428", w, 2);
    px(ctx, 0, 28, "#b87848", w, 13);
    for (let x = 0; x < w; x += 8) {
      px(ctx, x, 28, "#8a5430", 1, 13);
      px(ctx, x + 1, 28, "#d09060", 1, 13);
    }
    px(ctx, 0, 41, "#5a3820", w, 2);
    px(ctx, 0, 43, "rgba(50,30,15,0.22)", w, 3);

    // Wall Window (center-left)
    box(ctx, 108, 6, 36, 18, "#98d4f8", OUTLINE);
    px(ctx, 110, 8, "#cceeff", 32, 5);
    px(ctx, 114, 11, "#ffffff", 7, 2);
    px(ctx, 125, 7, "#fcfcfc", 2, 16);
    px(ctx, 110, 14, "#fcfcfc", 32, 2);

    // Wall "SNAPGEAR" Boutique Plaque (center-right)
    box(ctx, 156, 7, 62, 16, "#284c96", "#182c58");
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SNAPGEAR", 187, 18);

    // Wall Camera Poster (far left)
    box(ctx, 32, 6, 26, 18, "#262c38", OUTLINE);
    box(ctx, 38, 10, 14, 10, "#505868", "#12161c");
    px(ctx, 43, 13, "#70c4ff", 4, 4);

    // 4. Checkout Counter (top-left x=2..5, y=3..4)
    box(ctx, 2 * TILE, 3.6 * TILE, 4 * TILE, 1.3 * TILE, "#d8a868", "#4c3220");
    px(ctx, 2 * TILE + 2, 3.6 * TILE + 2, "#f4d094", 4 * TILE - 4, 4);
    // Retro cash register on counter
    box(ctx, 4.6 * TILE, 3.2 * TILE, 14, 12, "#464e5e", "#20242c");
    px(ctx, 4.6 * TILE + 3, 3.2 * TILE + 2, "#68f0a4", 8, 4);
    // "PAY" badge
    box(ctx, 2.3 * TILE, 4.1 * TILE, 26, 9, "#e04030", "#681812");
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAY", 2.3 * TILE + 13, 4.1 * TILE + 7);

    // 5. SQL Back-Office Terminal (top-right x=14..16, y=3..4)
    box(ctx, 14 * TILE, 3.4 * TILE, 3 * TILE, 1.5 * TILE, "#586274", "#242834");
    box(ctx, 14.3 * TILE, 2.7 * TILE, 22, 16, "#142028", "#222834");
    px(ctx, 14.3 * TILE + 2, 2.7 * TILE + 2, "#4ef4a0", 12, 2);
    px(ctx, 14.3 * TILE + 2, 2.7 * TILE + 5, "#80d8ff", 16, 2);
    px(ctx, 14.3 * TILE + 2, 2.7 * TILE + 8, "#4ef4a0", 9, 2);
    px(ctx, 14.4 * TILE, 3.9 * TILE, "#dce0e8", 18, 4); // keyboard

    // 6. Customer Service & Warranty Desk (left x=1..2, y=7..8)
    box(ctx, 1 * TILE, 7 * TILE, 2 * TILE, 2 * TILE, "#c89058", "#4c3220");
    px(ctx, 1 * TILE + 2, 7 * TILE + 2, "#e8b878", 2 * TILE - 4, 4);
    box(ctx, 1.2 * TILE, 7.3 * TILE, 14, 10, "#fcfcfc", "#384868");
    px(ctx, 1.4 * TILE, 7.5 * TILE, "#3868c8", 8, 2);
    px(ctx, 1.4 * TILE, 7.8 * TILE, "#e04030", 6, 2);

    // 7. Potted pixel plants in corners
    for (const [pxx, pyy] of [[14, 158], [260, 158]]) {
      box(ctx, pxx, pyy + 8, 12, 8, "#b8643c", "#4c2818");
      px(ctx, pxx + 1, pyy, "#3a8c44", 10, 9);
      px(ctx, pxx + 3, pyy - 2, "#62b858", 6, 6);
    }

    // 8. Exit Welcome Mat at bottom center (tiles 8..9, y=11)
    box(ctx, 8 * TILE, 11 * TILE + 2, 2 * TILE, 12, "#c84038", "#581c18");
    px(ctx, 8 * TILE + 3, 11 * TILE + 5, "#f8e0a0", 2 * TILE - 6, 6);
    ctx.fillStyle = "#581c18";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", 9 * TILE, 11 * TILE + 10);
  }

  render() {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return;
    if (this.bgDirty) this.bakeBackground();

    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cfg.w, cfg.h);
    ctx.drawImage(this.offscreenBg, 0, 0);

    // Dynamic animated landmarks in town
    if (this.mapId === "town") {
      drawSqlAdminBuilding(ctx, 17 * TILE, 9.8 * TILE, this.tick);
      drawFountain(ctx, 10 * TILE, 11 * TILE, this.tick);
      drawPlazaCameraLandmark(ctx, 11 * TILE, 6 * TILE, this.tick, this.cameraFlash);
    }

    // Dynamic Product Pedestals in SnapGear Mart
    if (this.mapId === "mart") {
      for (const item of cfg.products) {
        const pxX = item.tx * TILE;
        const pxY = item.ty * TILE;
        // Shadow
        px(ctx, pxX + 1, pxY + 13, "rgba(40,25,15,0.22)", 14, 4);
        // Glass showcase pedestal
        box(ctx, pxX, pxY, 16, 15, "#eef4fa", "#3c4658");
        px(ctx, pxX + 1, pxY + 1, "#ffffff", 14, 2);
        px(ctx, pxX + 1, pxY + 11, "#9aa8bc", 14, 3);
        // Stock indicator LED on front of pedestal
        const st = Number(item.prod.stock);
        const ledColor = st <= 0 ? "#e03830" : st <= 5 ? "#f0a828" : "#2ed878";
        px(ctx, pxX + 12, pxY + 12, ledColor, 2, 2);
        // Custom pixel camera accessory sprite
        drawProductPixelSprite(ctx, item.prod.meta?.spriteKind || "handle", pxX + 8, pxY + 5, this.tick);
      }
    }

    // Y-sorted entities (Player + NPCs)
    const entities = [
      ...cfg.npcs.map((n) => ({
        y: n.ty * TILE,
        draw: () =>
          drawChibi(ctx, n.tx * TILE, n.ty * TILE, {
            dir: n.dir,
            frame: 0,
            hair: n.hair,
            skin: n.skin,
            shirt: n.shirt,
            pants: n.pants
          })
      })),
      {
        y: this.player.y,
        draw: () =>
          drawChibi(ctx, Math.round(this.player.x), Math.round(this.player.y), {
            dir: this.player.dir,
            frame: this.player.walkFrame,
            hair: "#1e1e26",
            skin: "#f2c498",
            shirt: "#e04840",
            pants: "#2e3c58",
            cameraStrap: true
          })
      }
    ];
    entities.sort((a, b) => a.y - b.y);
    for (const ent of entities) ent.draw();

    // Hover highlight pixel bracket
    if (this.hoverZone) {
      const z = this.hoverZone;
      ctx.strokeStyle = "rgba(255, 240, 120, 0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.floor(z.x) + 0.5, Math.floor(z.y) + 0.5, Math.floor(z.w) - 1, Math.floor(z.h) - 1);
    }

    // Day / Dawn / Dusk / Night Lighting Overlay (town only)
    if (this.mapId === "town") {
      const phase = this.getTimePhase();
      if (phase === "dawn") {
        ctx.fillStyle = "rgba(240, 160, 110, 0.14)";
        ctx.fillRect(0, 0, cfg.w, cfg.h);
      } else if (phase === "dusk") {
        ctx.fillStyle = "rgba(180, 90, 70, 0.2)";
        ctx.fillRect(0, 0, cfg.w, cfg.h);
      } else if (phase === "night") {
        ctx.fillStyle = "rgba(14, 24, 52, 0.34)";
        ctx.fillRect(0, 0, cfg.w, cfg.h);
      }

      // Warm glowing street lamp halos at dusk/night
      if ((phase === "night" || phase === "dusk") && this.lampCoords) {
        for (const [lx, ly] of this.lampCoords) {
          const g = ctx.createRadialGradient(lx + 8, ly + 6, 2, lx + 8, ly + 6, 28);
          g.addColorStop(0, "rgba(255, 244, 180, 0.48)");
          g.addColorStop(1, "rgba(255, 232, 140, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lx + 8, ly + 6, 28, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Drifting leaves (day) or fireflies (night)
      for (const p of this.particles) {
        if (phase === "night") {
          const glow = 0.4 + 0.6 * Math.abs(Math.sin(this.tick / 20 + p.phase));
          ctx.fillStyle = `rgba(248, 255, 160, ${glow.toFixed(2)})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        } else {
          px(ctx, p.x, p.y, p.color, 2, 1);
        }
      }
    }
  }

  loop(now) {
    const dt = now - this.lastTime;
    if (dt >= 16) {
      this.lastTime = now;
      this.update();
      this.render();
    }
    requestAnimationFrame(this.loop);
  }
}
