// SnapGear Camera Store — Procedural GBA Pixel-Art Overworld & 4 Walkable Room Interiors
// Maps: town | home (My Home) | sony (Sony Pro Store) | gear (Photo Gear Store) | sqllab (SQL Admin Room)

import { retroAudio } from "./audio.js";

const TILE = 16;
const OUTLINE = "#363038";

// Hand-crafted 1-bit crisp pixel bitmap font (ZERO anti-alias blur!)
const PIXEL_FONT = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "111", "011"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["110", "001", "010", "100", "111"],
  "3": ["110", "001", "010", "001", "110"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "110", "001", "110"],
  "6": ["011", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "110"],
  " ": ["00", "00", "00", "00", "00"]
};

function drawPixelText(ctx, text, centerX, topY, color, shadowColor = null) {
  const upper = String(text || "").toUpperCase();
  const glyphs = [];
  let totalW = 0;
  for (let i = 0; i < upper.length; i++) {
    const g = PIXEL_FONT[upper[i]] || PIXEL_FONT[" "];
    glyphs.push(g);
    totalW += g[0].length + (i < upper.length - 1 ? 1 : 0);
  }
  let curX = Math.round(centerX - totalW / 2);
  const startY = Math.round(topY);
  for (const g of glyphs) {
    for (let r = 0; r < g.length; r++) {
      const row = g[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === "1") {
          if (shadowColor) px(ctx, curX + c + 1, startY + r + 1, shadowColor, 1, 1);
          px(ctx, curX + c, startY + r, color, 1, 1);
        }
      }
    }
    curX += g[0].length + 1;
  }
}

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
// PIXEL ART PRIMITIVES (Trees, 4 Town Buildings, Landmarks, Gear, Chibi)
// =========================================================================

function drawOakTree(ctx, x, y) {
  px(ctx, x + 3, y + 26, "rgba(18,45,32,0.28)", 22, 4);
  px(ctx, x + 10, y + 18, "#4c3220", 8, 10);
  px(ctx, x + 11, y + 18, "#7c5234", 6, 9);
  px(ctx, x + 12, y + 19, "#9a6a44", 2, 7);
  px(ctx, x + 4, y + 3, "#2a4424", 20, 17);
  px(ctx, x + 2, y + 6, "#2a4424", 24, 13);
  px(ctx, x + 5, y + 4, "#4b7d38", 18, 15);
  px(ctx, x + 3, y + 7, "#4b7d38", 22, 11);
  px(ctx, x + 5, y + 4, "#6aa348", 16, 10);
  px(ctx, x + 4, y + 7, "#6aa348", 19, 7);
  px(ctx, x + 7, y + 5, "#8ec45c", 11, 5);
  px(ctx, x + 6, y + 7, "#8ec45c", 6, 3);
  px(ctx, x + 9, y + 5, "#b0dc78", 5, 2);
  px(ctx, x + 5, y + 16, "#37602a", 18, 3);
  px(ctx, x + 8, y + 18, "#2a4c22", 12, 1);
}

function drawStreetLamp(ctx, x, y) {
  px(ctx, x + 4, y + 27, "rgba(18,35,30,0.28)", 8, 3);
  px(ctx, x + 6, y + 10, "#383e48", 4, 18);
  px(ctx, x + 7, y + 10, "#707888", 2, 17);
  px(ctx, x + 5, y + 25, "#4a5260", 6, 3);
  box(ctx, x + 3, y + 2, 10, 9, "#f8f4d0", "#383e48");
  px(ctx, x + 2, y + 1, "#383e48", 12, 2);
  px(ctx, x + 4, y + 3, "#fffce6", 8, 6);
  px(ctx, x + 6, y + 4, "#ffffff", 4, 3);
}

function drawFountain(ctx, x, y, tick) {
  px(ctx, x + 2, y + 38, "rgba(16,42,36,0.26)", 44, 5);
  box(ctx, x + 2, y + 14, 44, 26, "#a8b0bc", "#3c424c");
  px(ctx, x + 3, y + 15, "#d0d6e0", 42, 2);
  px(ctx, x + 3, y + 37, "#767e8a", 42, 2);
  box(ctx, x + 5, y + 17, 38, 18, "#4c98e4", "#326498");
  px(ctx, x + 6, y + 18, "#6cb4f8", 36, 4);
  const phase = (tick >> 4) % 4;
  px(ctx, x + 8 + phase, y + 22, "#c8eaff", 5, 1);
  px(ctx, x + 30 - phase, y + 29, "#c8eaff", 6, 1);
  px(ctx, x + 12, y + 31 - (phase % 2), "#a4d6ff", 4, 1);
  box(ctx, x + 19, y + 12, 10, 16, "#c4cad4", "#3c424c");
  box(ctx, x + 15, y + 10, 18, 5, "#dce2ec", "#3c424c");
  box(ctx, x + 21, y + 4, 6, 7, "#dce2ec", "#3c424c");
  const sp = (tick >> 3) % 2;
  px(ctx, x + 23, y + 1 - sp, "#e6f8ff", 2, 4);
  px(ctx, x + 19, y + 3 + sp, "#a8e0ff", 2, 2);
  px(ctx, x + 27, y + 3 + sp, "#a8e0ff", 2, 2);
  px(ctx, x + 16, y + 14, "#9cd8ff", 2, 8);
  px(ctx, x + 30, y + 14, "#9cd8ff", 2, 8);
  px(ctx, x + 6, y + 23, "#1f4288", 14, 8);
  drawPixelText(ctx, "D2C", x + 13, y + 24, "#ffffff");
}

function drawPlazaCameraLandmark(ctx, x, y, tick, flashAlpha) {
  px(ctx, x + 6, y + 28, "rgba(18,36,28,0.28)", 20, 3);
  px(ctx, x + 15, y + 18, "#30343c", 2, 11);
  for (let i = 0; i < 10; i++) {
    px(ctx, x + 14 - Math.floor(i * 0.65), y + 19 + i, "#30343c", 2, 1);
    px(ctx, x + 16 + Math.floor(i * 0.65), y + 19 + i, "#30343c", 2, 1);
  }
  box(ctx, x + 3, y + 5, 26, 15, "#5c5048", "#262228");
  px(ctx, x + 4, y + 6, "#d4c8b8", 24, 4);
  px(ctx, x + 5, y + 3, "#262228", 6, 3);
  px(ctx, x + 6, y + 4, "#e0e4ec", 4, 2);
  px(ctx, x + 22, y + 3, "#c83830", 3, 2);
  px(ctx, x + 4, y + 10, "#e04038", 4, 1);
  px(ctx, x + 8, y + 10, "#f0a030", 4, 1);
  px(ctx, x + 12, y + 10, "#50b868", 4, 1);
  px(ctx, x + 16, y + 10, "#3880d8", 4, 1);
  box(ctx, x + 10, y + 7, 12, 11, "#383e48", "#1e2028");
  box(ctx, x + 12, y + 9, 8, 7, "#285088", "#1a1e26");
  px(ctx, x + 13, y + 10, "#70b8f8", 3, 2);
  px(ctx, x + 14, y + 10, "#ffffff", 1, 1);
  if ((tick >> 5) % 2 === 0) px(ctx, x + 24, y + 7, "#ff4838", 2, 2);
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,235,${flashAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x + 23, y + 7, 16 * flashAlpha + 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Building 1 (Top-Left): Cozy Character Home (inspired by akshayakula.com's brick home!)
function drawMyHomeBuilding(ctx, x, y, isNight) {
  const w = 96;
  const h = 70;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  // Chimney
  box(ctx, x + 74, y + 1, 10, 14, "#9c4434", "#3c201a");
  px(ctx, x + 73, y, "#4c2c24", 12, 3);
  // Warm slate gabled roof
  box(ctx, x + 2, y + 8, w - 4, 24, "#5d687a", "#2a303c");
  for (let ry = y + 11; ry < y + 30; ry += 4) {
    px(ctx, x + 4, ry, "#768298", w - 8, 1);
    px(ctx, x + 4, ry + 2, "#485060", w - 8, 1);
  }
  // Center gable peak
  box(ctx, x + 30, y + 2, 36, 12, "#6c788c", "#2a303c");
  // Crisp 1-bit pixel signboard "MY HOME"
  box(ctx, x + 26, y + 13, 44, 13, "#f8edd0", "#4c3018");
  px(ctx, x + 27, y + 14, "#fff8e6", 42, 1);
  drawPixelText(ctx, "MY HOME", x + 48, y + 17, "#482812");

  // Warm brick & cream cottage walls
  box(ctx, x + 4, y + 32, w - 8, 36, "#c25e48", "#3e241e");
  for (let by = y + 34; by < y + 66; by += 4) {
    px(ctx, x + 5, by, "#a44a38", w - 10, 1);
    for (let bx = x + 6 + ((by % 8) ? 4 : 0); bx < x + w - 6; bx += 8) {
      px(ctx, bx, by, "#a44a38", 1, 4);
    }
  }
  // White trim porch surround
  box(ctx, x + 36, y + 38, 24, 30, "#f4f2ec", "#3e241e");

  // Windows with dark shutters
  const wc = isNight ? "#ffe498" : "#a8dcfa";
  for (const wx of [x + 12, x + 68]) {
    px(ctx, wx - 3, y + 40, "#4c2c28", 3, 15);
    px(ctx, wx + 16, y + 40, "#4c2c28", 3, 15);
    box(ctx, wx, y + 40, 16, 15, wc, "#fcfcfc");
    px(ctx, wx + 7, y + 41, "#fcfcfc", 2, 13);
    px(ctx, wx + 1, y + 47, "#fcfcfc", 14, 2);
  }

  // Front red cottage door
  box(ctx, x + 41, y + 44, 14, 23, "#b8342c", "#3e1816");
  px(ctx, x + 43, y + 46, "#d44c42", 10, 8);
  px(ctx, x + 51, y + 55, "#f4d060", 2, 2);
  // Welcome doormat
  px(ctx, x + 40, y + 67, "#d8a860", 16, 3);
}

// Building 2 (Top-Right): Walkable Sony Pro Store
function drawSonyStudioBuilding(ctx, x, y, isNight) {
  const w = 84;
  const h = 68;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  // Signature royal-blue boutique awning roof
  box(ctx, x + 2, y + 4, w - 4, 24, "#2c54a8", "#162a58");
  for (let rx = x + 6; rx < x + w - 6; rx += 8) {
    px(ctx, rx, y + 6, "#4472cc", 3, 20);
  }
  px(ctx, x + 4, y + 6, "#6ea0f4", w - 8, 2);
  // Modern dark-charcoal & glass flagship body
  box(ctx, x + 4, y + 28, w - 8, 38, "#303644", "#161a22");
  px(ctx, x + 5, y + 29, "#464e62", w - 10, 3);
  // Crisp 1-bit pixel signboard "SONY PRO"
  box(ctx, x + 15, y + 12, 54, 13, "#141820", "#fcfcfc");
  drawPixelText(ctx, "SONY PRO", x + 42, y + 16, "#ffe478");

  const wc = isNight ? "#ffe498" : "#9ad4f8";
  for (const wx of [x + 9, x + 57]) {
    box(ctx, wx, y + 37, 18, 18, wc, "#1c222e");
    px(ctx, wx + 2, y + 39, "#dcf4ff", 14, 4);
    px(ctx, wx + 5, y + 46, "#242834", 8, 6);
    px(ctx, wx + 7, y + 48, "#48a0f8", 4, 3);
  }
  // Sliding glass store door
  box(ctx, x + 33, y + 40, 18, 26, isNight ? "#ffd984" : "#78baf0", "#161c28");
  px(ctx, x + 41, y + 41, "#263042", 2, 24);
  px(ctx, x + 36, y + 66, "#3868c8", 12, 2);
}

// Building 3 (Bottom-Left): Walkable Photo Gear Store
function drawGearWorkshopBuilding(ctx, x, y, isNight) {
  const w = 84;
  const h = 64;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  box(ctx, x + 2, y + 4, w - 4, 21, "#c86c38", "#4e2814");
  for (let rx = x + 6; rx < x + w - 6; rx += 8) {
    px(ctx, rx, y + 6, "#e0844c", 3, 17);
  }
  box(ctx, x + 4, y + 25, w - 8, 37, "#e6dfd0", "#443a30");
  px(ctx, x + 5, y + 52, "#9a8e7c", w - 10, 9);
  // Crisp 1-bit pixel signboard "PHOTO GEAR"
  box(ctx, x + 10, y + 10, 64, 13, "#fcfcfc", "#4e2814");
  drawPixelText(ctx, "PHOTO GEAR", x + 42, y + 14, "#3e2210");

  const wc = isNight ? "#ffe49e" : "#9cd0ec";
  for (const wx of [x + 9, x + 57]) {
    box(ctx, wx, y + 34, 18, 16, wc, "#4c3c2e");
    px(ctx, wx + 2, y + 36, "#e4f6ff", 14, 3);
    px(ctx, wx + 5, y + 42, "#c83834", 8, 5);
  }
  // Double wood shop door
  box(ctx, x + 33, y + 38, 18, 24, "#8a5a36", "#3e2618");
  px(ctx, x + 41, y + 39, "#4c301c", 2, 22);
  px(ctx, x + 36, y + 62, "#c84038", 12, 2);
}

// Building 4 (Bottom-Right): Walkable SQL Admin Lab
function drawSqlAdminBuilding(ctx, x, y, tick) {
  const w = 84;
  const h = 64;
  px(ctx, x + 2, y + h - 2, "rgba(16,32,26,0.3)", w - 4, 5);
  px(ctx, x + 66, y - 5, "#3a4250", 2, 11);
  px(ctx, x + 65, y - 7, (tick >> 4) % 2 ? "#48f098" : "#228855", 4, 3);
  box(ctx, x + 2, y + 4, w - 4, 18, "#263242", "#121820");
  px(ctx, x + 4, y + 6, "#3e526a", w - 8, 3);
  box(ctx, x + 4, y + 22, w - 8, 40, "#344052", "#161c26");
  // Crisp 1-bit pixel signboard "SQL ADMIN"
  box(ctx, x + 12, y + 9, 60, 13, "#0e1820", "#46c88a");
  drawPixelText(ctx, "SQL ADMIN", x + 42, y + 13, "#7effbe");

  for (const wx of [x + 9, x + 57]) {
    box(ctx, wx, y + 30, 18, 22, "#121c26", "#1e2a38");
    for (let row = 0; row < 4; row++) {
      px(ctx, wx + 2, y + 33 + row * 5, "#243444", 14, 3);
      const blink = ((tick >> 4) + row + wx) % 3 === 0;
      px(ctx, wx + 12, y + 34 + row * 5, blink ? "#58f4a4" : "#3888d8", 2, 1);
    }
  }
  box(ctx, x + 33, y + 38, 18, 24, "#4078a8", "#16202a");
  px(ctx, x + 35, y + 40, "#94d4ff", 5, 10);
  px(ctx, x + 36, y + 62, "#46c88a", 12, 2);
}

// =========================================================================
// CUSTOM PIXEL-ART PRODUCT SPRITES (for Store Display Pedestals)
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
    px(ctx, x + 10, y + 1, "#f0efe8", 2, 2);
    px(ctx, x + 3, y + 5, "#d83834", 8, 3);
    px(ctx, x + 3, y + 8, "#e0bc5c", 8, 3);
    px(ctx, x + 1, y + 4, "#d0d4dc", 1, 3);
  } else if (kind === "tripod") {
    px(ctx, x + 6, y + 1, "#d0d4dc", 2, 2);
    box(ctx, x + 4, y + 3, 6, 4, "#2a2e36", "#14161c");
    px(ctx, x + 6, y + 4, "#e03838", 2, 2);
    px(ctx, x + 6, y + 7, "#242830", 2, 7);
    px(ctx, x + 3, y + 8, "#242830", 2, 5);
    px(ctx, x + 9, y + 8, "#242830", 2, 5);
    px(ctx, x + 2, y + 12, "#14161c", 2, 2);
    px(ctx, x + 10, y + 12, "#14161c", 2, 2);
  } else if (kind === "grip") {
    px(ctx, x + 5, y + 1, "#c8ced8", 4, 2);
    box(ctx, x + 4, y + 3, 6, 8, "#262a34", "#12141a");
    px(ctx, x + 6, y + 5, "#e04038", 2, 2);
    px(ctx, x + 3, y + 11, "#262a34", 3, 3);
    px(ctx, x + 8, y + 11, "#262a34", 3, 3);
  } else {
    box(ctx, x + 3, y + 2, 5, 11, "#6c482c", "#1a1410");
    box(ctx, x + 8, y + 4, 4, 6, "#323844", "#14161c");
    px(ctx, x + 9, y + 6, "#e03838", 2, 2);
  }
}

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
  px(ctx, x + 3, y + 14, "rgba(18,32,26,0.3)", 10, 3);

  const leftLegY = y + 12 + (step < 0 ? -1 : 0);
  const rightLegY = y + 12 + (step > 0 ? -1 : 0);
  px(ctx, x + 4, leftLegY, "#20222a", 3, 4);
  px(ctx, x + 9, rightLegY, "#20222a", 3, 4);
  px(ctx, x + 4, leftLegY, pants, 3, 2);
  px(ctx, x + 9, rightLegY, pants, 3, 2);

  box(ctx, x + 3, y + 6, 10, 7, shirt, OUTLINE);
  px(ctx, x + 4, y + 7, shade(shirt, 1.18), 8, 2);
  if (cameraStrap) {
    px(ctx, x + 5, y + 7, "#202228", 1, 3);
    px(ctx, x + 10, y + 7, "#202228", 1, 3);
    px(ctx, x + 6, y + 9, "#2a2e38", 4, 3);
    px(ctx, x + 7, y + 10, "#70c0ff", 2, 1);
  }

  px(ctx, x + 2, y + 7 + (step > 0 ? 1 : 0), skin, 1, 4);
  px(ctx, x + 13, y + 7 + (step < 0 ? 1 : 0), skin, 1, 4);

  box(ctx, x + 2, y - 3, 12, 10, skin, OUTLINE);
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
    px(ctx, x + 5, y + 2, "#1e1e26", 2, 2);
    px(ctx, x + 9, y + 2, "#1e1e26", 2, 2);
    px(ctx, x + 5, y + 2, "#ffffff", 1, 1);
    px(ctx, x + 9, y + 2, "#ffffff", 1, 1);
  }
}

function shortProductLabel(name) {
  return String(name || "")
    .replace(/^Sony\s+/i, "")
    .replace(/^Manfrotto\s+/i, "")
    .slice(0, 24);
}

// =========================================================================
// MAIN PIXEL WORLD CONTROLLER (5 Connected Maps!)
// =========================================================================

export class SnapGearPixelWorld {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.labelsEl = document.getElementById("worldLabels");
    this.cb = callbacks;

    this.mapId = "town"; // "town" | "home" | "sony" | "gear" | "sqllab"
    this.tick = 0;
    this.storeData = null;
    this.modalOpen = false;
    this.timeMode = "auto";
    this.cameraFlash = 0;

    this.player = {
      x: 11 * TILE,
      y: 8 * TILE,
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
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: Math.random() * 384,
        y: Math.random() * 272,
        vx: 0.14 + Math.random() * 0.16,
        vy: 0.06 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
        color: i % 3 === 0 ? "rgba(232,120,56,0.72)" : i % 3 === 1 ? "rgba(240,184,72,0.72)" : "rgba(216,80,56,0.72)"
      });
    }
  }

  setStoreData(storeData) {
    this.storeData = storeData;
    this.rebuildMaps();
    this.bgDirty = true;
    this.renderWorldLabels();
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

  makeSolidGrid(cols, rows, boxes) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
    for (const [tx, ty, tw, th] of boxes) {
      for (let y = ty; y < ty + th; y++) {
        for (let x = tx; x < tx + tw; x++) {
          if (y >= 0 && y < rows && x >= 0 && x < cols) grid[y][x] = true;
        }
      }
    }
    return grid;
  }

  buildShopInteriorConfig({ id, title, products, exitReturn, clerkName, clerkShirt, theme }) {
    const cols = 18;
    const rows = 12;
    const solid = this.makeSolidGrid(cols, rows, [
      [0, 0, cols, 3],
      [0, rows - 1, cols, 1],
      [0, 0, 1, rows],
      [cols - 1, 0, 1, rows],
      [2, 3, 4, 2], // Checkout counter
      [14, 3, 3, 2] // Info / catalog kiosk
    ]);
    // Open exit mat
    solid[11][8] = false;
    solid[11][9] = false;

    // Spacious product pedestals with plenty of room for crisp price + BUY tags
    const slots = [
      { tx: 5, ty: 6 },
      { tx: 9, ty: 6 },
      { tx: 13, ty: 6 },
      { tx: 7, ty: 9 },
      { tx: 11, ty: 9 },
      { tx: 15, ty: 8 },
      { tx: 3, ty: 8 }
    ];

    const placedProducts = products.slice(0, slots.length).map((prod, idx) => {
      const slot = slots[idx];
      solid[slot.ty][slot.tx] = true;
      return { prod, tx: slot.tx, ty: slot.ty };
    });

    const zones = [
      {
        id: `${id}_checkout`,
        kind: "station",
        labelText: "💳 CHECKOUT",
        labelPos: { x: 4 * TILE, y: 3.15 * TILE },
        x: 2 * TILE,
        y: 3 * TILE,
        w: 4 * TILE,
        h: 2 * TILE,
        approach: { tx: 4, ty: 5 },
        instantClick: true,
        title: "CHECKOUT COUNTER",
        meta: "D2C Cash Register",
        sub: "Click to open Cart & complete purchase",
        onInteract: () => this.cb.openCart()
      },
      {
        id: `${id}_kiosk`,
        kind: "station",
        labelText: "📋 ALL CATALOG",
        labelPos: { x: 15.5 * TILE, y: 3.15 * TILE },
        x: 14 * TILE,
        y: 3 * TILE,
        w: 3 * TILE,
        h: 2 * TILE,
        approach: { tx: 15, ty: 5 },
        instantClick: true,
        title: "FULL CATALOG KIOSK",
        meta: "Compare all SnapGear products",
        sub: "Click to open the full D2C product catalog",
        onInteract: () => this.cb.openCatalog()
      },
      {
        id: `${id}_exit`,
        kind: "exit",
        x: 8 * TILE,
        y: 11 * TILE,
        w: 2 * TILE,
        h: 1 * TILE,
        approach: { tx: 8, ty: 10 },
        instantClick: true,
        title: "EXIT TO TOWN",
        meta: "Step back outside to SnapGear Town",
        sub: "Walk onto mat or click to exit",
        onInteract: () => this.switchMap("town", exitReturn.tx, exitReturn.ty, "down")
      },
      ...placedProducts.map(({ prod, tx, ty }) => ({
        id: `${id}_prod_${prod.product_id}`,
        kind: "product",
        prod,
        tx,
        ty,
        x: tx * TILE - 3,
        y: ty * TILE - 5,
        w: TILE + 6,
        h: TILE + 6,
        approach: { tx, ty: ty + 1 },
        instantClick: true,
        title: `#${prod.product_id} ${prod.name}`,
        meta: `NT$${Number(prod.price).toLocaleString()} · Stock: ${prod.stock}`,
        sub: "Click to inspect specs, Add to Cart, or Buy Now",
        onInteract: () => this.cb.openProductDetail(prod.product_id)
      }))
    ];

    const npcs = [
      {
        id: `${id}_clerk`,
        tx: 3,
        ty: 3,
        dir: "down",
        hair: "#2d221c",
        skin: "#f6cc9e",
        shirt: clerkShirt,
        pants: "#222a3c",
        title: clerkName,
        meta: "Store Specialist",
        sub: "Click to talk or go to Checkout",
        onInteract: () => {
          this.cb.showDialogue(
            [
              `${clerkName.toUpperCase()}: Welcome! Walk up to any display pedestal and press Z (or click it) to add gear to your cart.`,
              `${clerkName.toUpperCase()}: When you're ready to pay, come right back to this CHECKOUT counter!`
            ],
            [
              { label: "🛒 Go to Checkout", onClick: () => this.cb.openCart() },
              { label: "📋 Full Store Catalog", onClick: () => this.cb.openCatalog() }
            ]
          );
        }
      }
    ];

    return {
      id,
      title,
      theme,
      cols,
      rows,
      w: cols * TILE,
      h: rows * TILE,
      solid,
      zones,
      npcs,
      products: placedProducts,
      exitReturn
    };
  }

  rebuildMaps() {
    const products = this.storeData?.products || [];
    const customers = this.storeData?.customers || [];
    const orders = this.storeData?.orders || [];

    const sonyProducts = products.filter((p) => Number(p.supplier_id) === 1);
    const gearProducts = products.filter((p) => Number(p.supplier_id) !== 1);

    // =====================================================================
    // MAP 1: SNAPGEAR CAMERA TOWN (24x17 tiles = 384x272)
    // All 4 buildings have clean front doors you can walk straight into!
    // =====================================================================
    const townCols = 24;
    const townRows = 17;
    const townSolid = this.makeSolidGrid(townCols, townRows, [
      [0, 0, townCols, 2],
      [0, townRows - 1, townCols, 1],
      [0, 0, 1, townRows],
      [townCols - 1, 0, 1, townRows],
      // Top-left: MY HOME (x=2..7, y=2..5; door at 5,5 -> step onto 5,6)
      [2, 2, 6, 4],
      // Top-right: SONY PRO (x=16..20, y=2..5; door at 18,5 -> step onto 18,6)
      [16, 2, 5, 4],
      // Bottom-left: PHOTO GEAR (x=2..6, y=10..13; door at 4,13 -> step onto 4,14)
      [2, 10, 5, 4],
      // Bottom-right: SQL ADMIN (x=17..21, y=10..13; door at 19,13 -> step onto 19,14)
      [17, 10, 5, 4],
      // Plaza camera landmark (11..12, y=5..6)
      [11, 5, 2, 2],
      // Fountain (10..12, y=10..12)
      [10, 10, 3, 3]
    ]);

    const custByName = (idx, fallbackName) => customers[idx] || { name: fallbackName, sale_count: 0, gross_spent: 0 };
    const alex = custByName(0, "Alex Chen");
    const mia = custByName(1, "Mia Wang");
    const jason = custByName(2, "Jason Lin");

    const townZones = [
      {
        id: "my_home_bldg",
        kind: "building",
        x: 2 * TILE,
        y: 1.5 * TILE,
        w: 6 * TILE,
        h: 4.5 * TILE,
        approach: { tx: 5, ty: 6 },
        instantClick: true,
        title: "MY HOME",
        meta: "Your Photographer Home & Gear Room",
        sub: "Click or walk to door to enter your home",
        onInteract: () => this.switchMap("home", 9, 10, "up")
      },
      {
        id: "sony_store_bldg",
        kind: "building",
        x: 16 * TILE,
        y: 1.6 * TILE,
        w: 5.25 * TILE,
        h: 4.4 * TILE,
        approach: { tx: 18, ty: 6 },
        instantClick: true,
        title: "SONY PRO STORE",
        meta: `Walk inside to buy ${sonyProducts.length} Sony accessories`,
        sub: "NP-FZ100 Battery, BC-QZ1 Charger, GP-VPT2BT Grip",
        onInteract: () => this.switchMap("sony", 9, 10, "up")
      },
      {
        id: "gear_store_bldg",
        kind: "building",
        x: 2 * TILE,
        y: 9.8 * TILE,
        w: 5.25 * TILE,
        h: 4.2 * TILE,
        approach: { tx: 4, ty: 14 },
        instantClick: true,
        title: "PHOTO GEAR STORE",
        meta: `Walk inside to buy ${gearProducts.length} Photo Gear items`,
        sub: "SanDisk 128GB SD Card, Manfrotto PIXI Tripod",
        onInteract: () => this.switchMap("gear", 9, 10, "up")
      },
      {
        id: "sql_admin_bldg",
        kind: "building",
        x: 17 * TILE,
        y: 9.8 * TILE,
        w: 5.25 * TILE,
        h: 4.2 * TILE,
        approach: { tx: 19, ty: 14 },
        instantClick: true,
        title: "SQL ADMIN LAB",
        meta: "Walk inside to access the SQLite Server Room",
        sub: "Password-protected SQL Console & Table Editor",
        onInteract: () => this.switchMap("sqllab", 9, 10, "up")
      },
      {
        id: "camera_landmark",
        kind: "prop",
        x: 11 * TILE,
        y: 5 * TILE,
        w: 2 * TILE,
        h: 2 * TILE,
        approach: { tx: 11, ty: 7 },
        instantClick: true,
        title: "SNAPGEAR STUDIO CAMERA",
        meta: "Click for flash & town guide",
        sub: "SnapGear Direct-to-Consumer Camera Town",
        onInteract: () => {
          this.cameraFlash = 1.0;
          retroAudio.shutter();
          this.cb.showDialogue(
            [
              "CLICK! *FLASH*\nWelcome to SNAPGEAR CAMERA TOWN!",
              "Visit MY HOME north-west, shop inside SONY PRO & PHOTO GEAR, or step inside SQL ADMIN LAB to edit the SQLite database!"
            ],
            [
              { label: "🏠 Go to My Home", onClick: () => this.switchMap("home", 9, 10, "up") },
              { label: "📷 Enter Sony Pro", onClick: () => this.switchMap("sony", 9, 10, "up") },
              { label: "🎒 Enter Photo Gear", onClick: () => this.switchMap("gear", 9, 10, "up") }
            ]
          );
        }
      },
      {
        id: "fountain",
        kind: "prop",
        x: 10 * TILE,
        y: 10 * TILE,
        w: 3 * TILE,
        h: 3 * TILE,
        approach: { tx: 11, ty: 9 },
        instantClick: true,
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
        ty: 6,
        dir: "down",
        patrol: [[9, 6], [10, 4], [13, 4], [13, 6]],
        hair: "#241d28",
        skin: "#f2c498",
        shirt: "#3868c8",
        pants: "#283044",
        title: "SNAPGEAR GUIDE",
        meta: "Town Concierge",
        sub: "Press Z or click to chat",
        onInteract: () => {
          this.cb.showDialogue(
            [
              `${this.getGreeting()}\nWelcome to SNAPGEAR CAMERA TOWN!`,
              "Every building has its own walkable room: MY HOME, SONY PRO Store, PHOTO GEAR Store, and SQL ADMIN LAB!"
            ],
            [
              { label: "📋 Browse All Products", onClick: () => this.cb.openCatalog() },
              { label: "🏠 Enter My Home", onClick: () => this.switchMap("home", 9, 10, "up") },
              { label: "🔒 Enter SQL Admin Lab", onClick: () => this.switchMap("sqllab", 9, 10, "up") }
            ]
          );
        }
      },
      {
        id: "npc_alex",
        tx: 14,
        ty: 7,
        dir: "left",
        patrol: [[14, 7], [18, 7], [18, 8], [13, 8]],
        hair: "#1c1c24",
        skin: "#eab98c",
        shirt: "#2d8a68",
        pants: "#2e3646",
        title: `${alex.name} (Customer #1)`,
        meta: `Sales: ${alex.sale_count} · Spent: NT$${Number(alex.gross_spent || 0).toLocaleString()}`,
        sub: "SQLite customers table NPC",
        onInteract: () => {
          this.cb.showDialogue([
            `${alex.name.toUpperCase()}: I pick up all my batteries inside SONY PRO!\nMy SQLite record shows ${alex.sale_count} sale order(s) (NT$${Number(alex.gross_spent || 0).toLocaleString()}).`,
            `${alex.name.toUpperCase()}: Walk right inside SONY PRO or PHOTO GEAR to buy gear straight off the pedestals!`
          ]);
        }
      },
      {
        id: "npc_mia",
        tx: 8,
        ty: 10,
        dir: "right",
        patrol: [[8, 10], [8, 14], [5, 14], [8, 14]],
        hair: "#5a3424",
        skin: "#f6cca4",
        shirt: "#d85058",
        pants: "#3a4458",
        title: `${mia.name} (Customer #2)`,
        meta: `Sales: ${mia.sale_count} · Spent: NT$${Number(mia.gross_spent || 0).toLocaleString()}`,
        sub: "SQLite customers table NPC",
        onInteract: () => {
          this.cb.showDialogue([
            `${mia.name.toUpperCase()}: I just bought 2 SanDisk 128GB SD Cards inside PHOTO GEAR!`,
            `${mia.name.toUpperCase()}: My live SQLite spend total is NT$${Number(mia.gross_spent || 0).toLocaleString()}.`
          ]);
        }
      },
      {
        id: "npc_jason",
        tx: 14,
        ty: 11,
        dir: "up",
        patrol: [[14, 11], [14, 14], [17, 14], [14, 14]],
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
              `${jason.name.toUpperCase()}: Comparing the Manfrotto PIXI Tripod in PHOTO GEAR and the Sony GP-VPT2BT Grip in SONY PRO!`,
              `${jason.name.toUpperCase()}: Both rooms let you buy directly with live SQLite checkout.`
            ],
            [{ label: "📋 Compare All Gear", onClick: () => this.cb.openCatalog() }]
          );
        }
      }
    ];
    for (const npc of townNpcs) {
      npc.px = npc.tx * TILE;
      npc.py = npc.ty * TILE;
      npc.walkFrame = 0;
      npc.stepAccum = 0;
      npc.patrolIdx = 1;
      npc.pause = 40 + Math.floor(Math.random() * 60);
    }

    // =====================================================================
    // MAP 2: MY HOME (18x12 tiles = 288x192 — Character's cozy home!)
    // =====================================================================
    const homeCols = 18;
    const homeRows = 12;
    const homeSolid = this.makeSolidGrid(homeCols, homeRows, [
      [0, 0, homeCols, 3],
      [0, homeRows - 1, homeCols, 1],
      [0, 0, 1, homeRows],
      [homeCols - 1, 0, 1, homeRows],
      [2, 3, 4, 2],  // Kitchen / counter
      [13, 3, 3, 2], // Photographer PC Desk
      [2, 7, 3, 3],  // Cozy Bed
      [13, 7, 3, 2]  // Camera Gear Display Cabinet
    ]);
    homeSolid[11][8] = false;
    homeSolid[11][9] = false;

    const homeZones = [
      {
        id: "home_pc",
        kind: "station",
        labelText: "💻 MY PC · ONLINE SHOP",
        labelPos: { x: 14.5 * TILE, y: 3.1 * TILE },
        x: 13 * TILE,
        y: 3 * TILE,
        w: 3 * TILE,
        h: 2 * TILE,
        approach: { tx: 14, ty: 5 },
        instantClick: true,
        title: "PHOTOGRAPHER WORKSTATION PC",
        meta: "Browse Full D2C Catalog from Home",
        sub: "Click to open all SnapGear products & prices",
        onInteract: () => this.cb.openCatalog()
      },
      {
        id: "home_cabinet",
        kind: "station",
        labelText: "📷 MY GEAR & ORDERS",
        labelPos: { x: 14.5 * TILE, y: 7.0 * TILE },
        x: 13 * TILE,
        y: 7 * TILE,
        w: 3 * TILE,
        h: 2 * TILE,
        approach: { tx: 14, ty: 9 },
        instantClick: true,
        title: "MY CAMERA GEAR & ORDER HISTORY",
        meta: `${orders.length} orders tracked in SQLite`,
        sub: "Click to inspect orders, receipts & store services",
        onInteract: () => this.cb.openOrders()
      },
      {
        id: "home_bed",
        kind: "station",
        labelText: "🛏 REST · SWITCH TIME",
        labelPos: { x: 3.5 * TILE, y: 7.0 * TILE },
        x: 2 * TILE,
        y: 7 * TILE,
        w: 3 * TILE,
        h: 3 * TILE,
        approach: { tx: 5, ty: 8 },
        instantClick: true,
        title: "COZY BED",
        meta: "Take a quick nap to cycle Day / Dusk / Night",
        sub: "Click to switch town lighting phase",
        onInteract: () => {
          const next = this.cycleTimeMode();
          this.cb.onTimeModeChange?.(next);
          this.cb.showDialogue([
            `You took a quick camera-break nap!\nTown lighting mode is now set to: ${next.toUpperCase()}.`
          ]);
        }
      },
      {
        id: "home_kitchen",
        kind: "prop",
        x: 2 * TILE,
        y: 3 * TILE,
        w: 4 * TILE,
        h: 2 * TILE,
        approach: { tx: 4, ty: 5 },
        instantClick: true,
        title: "COFFEE BAR",
        meta: "Fresh espresso before a shoot!",
        sub: "Home kitchen counter",
        onInteract: () => {
          this.cb.showDialogue([
            "Fresh pour-over coffee is brewing!\nGrab your camera bag and visit SONY PRO or PHOTO GEAR in town."
          ]);
        }
      },
      {
        id: "home_exit",
        kind: "exit",
        x: 8 * TILE,
        y: 11 * TILE,
        w: 2 * TILE,
        h: 1 * TILE,
        approach: { tx: 8, ty: 10 },
        instantClick: true,
        title: "EXIT TO SNAPGEAR TOWN",
        meta: "Step outside to explore the stores",
        sub: "Walk onto mat or click to exit",
        onInteract: () => this.switchMap("town", 5, 6, "down")
      }
    ];

    // =====================================================================
    // MAP 3: SONY PRO STORE (Walkable interior for Supplier #1 products)
    // =====================================================================
    const sonyConfig = this.buildShopInteriorConfig({
      id: "sony",
      title: "SONY PRO STORE · CLICK ANY ITEM TO BUY",
      products: sonyProducts,
      exitReturn: { tx: 18, ty: 6 },
      clerkName: "Sony Pro Specialist",
      clerkShirt: "#2c54a8",
      theme: "sony"
    });

    // =====================================================================
    // MAP 4: PHOTO GEAR STORE (Walkable interior for Supplier #2 products)
    // =====================================================================
    const gearConfig = this.buildShopInteriorConfig({
      id: "gear",
      title: "PHOTO GEAR STORE · CLICK ANY ITEM TO BUY",
      products: gearProducts,
      exitReturn: { tx: 4, ty: 14 },
      clerkName: "Photo Gear Specialist",
      clerkShirt: "#c86c38",
      theme: "gear"
    });

    // =====================================================================
    // MAP 5: SQL ADMIN LAB (Walkable SQLite Server Room — inside same app!)
    // =====================================================================
    const sqlCols = 18;
    const sqlRows = 12;
    const sqlSolid = this.makeSolidGrid(sqlCols, sqlRows, [
      [0, 0, sqlCols, 3],
      [0, sqlRows - 1, sqlCols, 1],
      [0, 0, 1, sqlRows],
      [sqlCols - 1, 0, 1, sqlRows],
      [2, 3, 3, 2],  // Left server rack
      [13, 3, 3, 2], // Right server rack
      [7, 4, 4, 2],  // Central SQL Mainframe Console
      [2, 7, 3, 2],  // Transactions Terminal
      [13, 7, 3, 2]  // Schema & Backup Terminal
    ]);
    sqlSolid[11][8] = false;
    sqlSolid[11][9] = false;

    const sqlZones = [
      {
        id: "sql_mainframe",
        kind: "station",
        labelText: "🔒 OPEN SQL ADMIN",
        labelPos: { x: 9 * TILE, y: 4.05 * TILE },
        x: 7 * TILE,
        y: 4 * TILE,
        w: 4 * TILE,
        h: 2 * TILE,
        approach: { tx: 9, ty: 6 },
        instantClick: true,
        title: "SQLITE MAINFRAME CONSOLE",
        meta: "snapgear.db · Password Protected",
        sub: "Click to open Table Editor & SQL Console right here",
        onInteract: () => this.cb.openAdmin("tables")
      },
      {
        id: "sql_query_term",
        kind: "station",
        labelText: "⚡ RAW SQL CONSOLE",
        labelPos: { x: 3.5 * TILE, y: 7.0 * TILE },
        x: 2 * TILE,
        y: 7 * TILE,
        w: 3 * TILE,
        h: 2 * TILE,
        approach: { tx: 5, ty: 8 },
        instantClick: true,
        title: "SQL QUERY TERMINAL",
        meta: "Run live SELECT / INSERT / UPDATE / DELETE",
        sub: "Click to open Raw SQL Editor (Password required)",
        onInteract: () => this.cb.openAdmin("sql")
      },
      {
        id: "sql_schema_term",
        kind: "station",
        labelText: "🗄 SCHEMA & BACKUP",
        labelPos: { x: 14.5 * TILE, y: 7.0 * TILE },
        x: 13 * TILE,
        y: 7 * TILE,
        w: 3 * TILE,
        h: 2 * TILE,
        approach: { tx: 12, ty: 8 },
        instantClick: true,
        title: "SCHEMA & EXPORT RACK",
        meta: "Inspect 6 normalized tables & export .sql",
        sub: "Click to open Schema & Backup (Password required)",
        onInteract: () => this.cb.openAdmin("schema")
      },
      {
        id: "sql_exit",
        kind: "exit",
        x: 8 * TILE,
        y: 11 * TILE,
        w: 2 * TILE,
        h: 1 * TILE,
        approach: { tx: 8, ty: 10 },
        instantClick: true,
        title: "EXIT TO SNAPGEAR TOWN",
        meta: "Return outside to town",
        sub: "Walk onto mat or click to exit",
        onInteract: () => this.switchMap("town", 19, 14, "down")
      }
    ];

    const sqlNpcs = [
      {
        id: "sql_dba",
        tx: 11,
        ty: 4,
        dir: "down",
        hair: "#1a202c",
        skin: "#e8be98",
        shirt: "#248864",
        pants: "#1e2634",
        title: "DATABASE ADMINISTRATOR",
        meta: "SnapGear SQLite Engineer",
        sub: "Click to open Admin Panel",
        onInteract: () => {
          this.cb.showDialogue(
            [
              "DBA: Welcome to the SQL ADMIN LAB!\nAll 6 normalized tables run live right inside this app.",
              "DBA: Step up to any terminal and enter the administrator password to edit tables or execute SQL."
            ],
            [
              { label: "🔒 Open SQL Admin Panel", onClick: () => this.cb.openAdmin("tables") },
              { label: "⚡ Open Raw SQL Console", onClick: () => this.cb.openAdmin("sql") }
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
      home: {
        id: "home",
        title: "MY HOME · PHOTOGRAPHER STUDIO",
        cols: homeCols,
        rows: homeRows,
        w: homeCols * TILE,
        h: homeRows * TILE,
        solid: homeSolid,
        zones: homeZones,
        npcs: [],
        products: [],
        exitReturn: { tx: 5, ty: 6 }
      },
      sony: sonyConfig,
      gear: gearConfig,
      sqllab: {
        id: "sqllab",
        title: "SQL ADMIN LAB · SERVER ROOM",
        cols: sqlCols,
        rows: sqlRows,
        w: sqlCols * TILE,
        h: sqlRows * TILE,
        solid: sqlSolid,
        zones: sqlZones,
        npcs: sqlNpcs,
        products: [],
        exitReturn: { tx: 19, ty: 14 }
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
    this.cb.closeDialogue?.();
    const fade = document.getElementById("fade");
    retroAudio.door();
    if (fade) fade.classList.add("on");
    this.player.path = [];
    this.player.pendingAction = null;

    window.setTimeout(() => {
      this.mapId = targetMap;
      const cfg = this.mapConfigs[targetMap];
      this.player.x = (spawnTx ?? (targetMap === "town" ? 11 : 9)) * TILE;
      this.player.y = (spawnTy ?? (targetMap === "town" ? 8 : 10)) * TILE;
      this.player.dir = dir;
      this.bgDirty = true;
      retroAudio.setMode(targetMap === "town" || targetMap === "home" ? "town" : "mart");
      this.resize();
      this.cb.onMapChange?.(targetMap, cfg.title);
      if (fade) fade.classList.remove("on");
    }, 210);
  }

  resize() {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.canvas.width = cfg.w;
    this.canvas.height = cfg.h;

    const isInterior = this.mapId !== "town";
    const padX = isInterior ? 48 : 0;
    const padY = isInterior ? 96 : 0;
    const scale = Math.max(1.2, Math.min((vw - padX) / cfg.w, (vh - padY) / cfg.h));
    const drawW = Math.round(cfg.w * scale);
    const drawH = Math.round(cfg.h * scale);
    const left = Math.round((vw - drawW) / 2);
    const top = Math.round((vh - drawH) / 2);

    this.canvas.style.width = `${drawW}px`;
    this.canvas.style.height = `${drawH}px`;
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;

    if (this.labelsEl) {
      this.labelsEl.style.left = `${left}px`;
      this.labelsEl.style.top = `${top}px`;
      this.labelsEl.style.width = `${drawW}px`;
      this.labelsEl.style.height = `${drawH}px`;
    }

    this.scale = scale;
    document.documentElement.style.setProperty("--s", scale.toFixed(3));
    this.renderWorldLabels();
  }

  renderWorldLabels() {
    if (!this.labelsEl) return;
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return;
    this.labelsEl.innerHTML = "";

    const toPctX = (wx) => `${((wx / cfg.w) * 100).toFixed(3)}%`;
    const toPctY = (wy) => `${((wy / cfg.h) * 100).toFixed(3)}%`;

    for (const z of cfg.zones) {
      if (z.kind === "building" && z.labelPos) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `wl-building ${z.labelClass || ""}`;
        el.style.left = toPctX(z.labelPos.x);
        el.style.top = toPctY(z.labelPos.y);
        el.textContent = z.labelText;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          retroAudio.blip();
          this.cb.closeDialogue?.();
          z.onInteract?.();
        });
        this.labelsEl.appendChild(el);
      } else if (z.kind === "station" && z.labelPos) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "wl-station";
        el.style.left = toPctX(z.labelPos.x);
        el.style.top = toPctY(z.labelPos.y);
        el.textContent = z.labelText;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          retroAudio.blip();
          this.cb.closeDialogue?.();
          this.walkToAndInteract(z);
        });
        this.labelsEl.appendChild(el);
      } else if (z.kind === "product" && z.prod) {
        const p = z.prod;
        const soldOut = Number(p.stock) <= 0;
        const el = document.createElement("button");
        el.type = "button";
        el.className = `wl-product ${soldOut ? "soldout" : ""}`;
        el.style.left = toPctX(z.tx * TILE + TILE / 2);
        el.style.top = toPctY((z.ty + 1) * TILE + 1);
        el.title = `${p.name} — NT$${Number(p.price).toLocaleString()} (Stock: ${p.stock}). Walk up to inspect & add to cart!`;
        el.innerHTML = `
          <span class="wl-product-name">${shortProductLabel(p.name)}</span>
          <span class="wl-product-row">
            <span class="wl-product-price">NT$${Number(p.price).toLocaleString()}</span>
            <span class="wl-product-buy">${soldOut ? "OUT" : "+ CART"}</span>
          </span>
        `;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          retroAudio.blip();
          this.cb.closeDialogue?.();
          this.walkToAndInteract(z);
        });
        this.labelsEl.appendChild(el);
      }
    }
  }

  findPath(startTx, startTy, goalTx, goalTy) {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return [];
    const { cols, rows, solid } = cfg;
    const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));
    let gx = clamp(goalTx, cols);
    let gy = clamp(goalTy, rows);

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

  walkToAndInteract(hit) {
    const curTx = Math.round(this.player.x / TILE);
    const curTy = Math.round(this.player.y / TILE);
    const ax = hit.approach?.tx ?? curTx;
    const ay = hit.approach?.ty ?? curTy;
    if (Math.hypot(curTx - ax, curTy - ay) <= 1.25) {
      hit.onInteract?.();
    } else {
      this.player.path = this.findPath(curTx, curTy, ax, ay);
      this.player.pendingAction = hit.onInteract || null;
    }
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      wx: ((clientX - rect.left) / rect.width) * this.canvas.width,
      wy: ((clientY - rect.top) / rect.height) * this.canvas.height
    };
  }

  findInteractiveAt(wx, wy) {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return null;
    for (const npc of cfg.npcs) {
      const nx = npc.px ?? npc.tx * TILE;
      const ny = (npc.py ?? npc.ty * TILE) - 4;
      if (wx >= nx - 2 && wx <= nx + TILE + 2 && wy >= ny && wy <= ny + TILE + 6) {
        return { ...npc, x: nx, y: ny, w: TILE, h: TILE + 4, approach: { tx: Math.round(nx / TILE), ty: Math.round((ny + 4) / TILE) + 1 } };
      }
    }
    for (const z of cfg.zones) {
      if (wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h) return z;
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
        document.getElementById("musBtn")?.classList.toggle("off", muted);
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();

      if (e.code === "KeyZ" || e.code === "Space" || e.code === "Enter") {
        if (this.cb.isDialogueOpen()) this.cb.advanceDialogue();
        else this.interactFacing();
        return;
      }
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        this.player.path = [];
        this.player.pendingAction = null;
      }
    });

    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.modalOpen) return;
      const { wx, wy } = this.screenToWorld(e.clientX, e.clientY);
      const hit = this.findInteractiveAt(wx, wy);
      this.hoverZone = hit;
      if (hit) this.showTip(hit, e.clientX, e.clientY);
      else this.hideTip();
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

      if (hit) {
        retroAudio.blip();
        this.walkToAndInteract(hit);
        return;
      }

      const curTx = Math.round(this.player.x / TILE);
      const curTy = Math.round(this.player.y / TILE);
      this.player.path = this.findPath(curTx, curTy, Math.floor(wx / TILE), Math.floor(wy / TILE));
      this.player.pendingAction = null;
    });

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
          const dx = clientX - (r.left + r.width / 2);
          const dy = clientY - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy);
          const cl = Math.min(32, d);
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
        pad.addEventListener("pointermove", (e) => { if (e.pointerId === activeId) updatePad(e.clientX, e.clientY); });
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
    const cx = this.player.x + 8;
    const cy = this.player.y + 8;
    let hit = this.findInteractiveAt(cx + off[0] * 16, cy + off[1] * 16);
    if (!hit) {
      // Fallback: find closest interactive object/product/station within 26px of player
      let bestDist = 26;
      for (const z of cfg.zones) {
        const zx = z.x + z.w / 2;
        const zy = z.y + z.h / 2;
        const d = Math.hypot(cx - zx, cy - zy);
        if (d < bestDist) {
          bestDist = d;
          hit = z;
        }
      }
      for (const n of cfg.npcs) {
        const nx = (n.px ?? n.tx * TILE) + 8;
        const ny = (n.py ?? n.ty * TILE) + 8;
        const d = Math.hypot(cx - nx, cy - ny);
        if (d < bestDist) {
          bestDist = d;
          hit = n;
        }
      }
    }
    if (hit) {
      retroAudio.blip();
      hit.onInteract?.();
    }
  }

  canOccupy(pxX, pxY) {
    const cfg = this.mapConfigs[this.mapId];
    const pts = [[pxX + 3, pxY + 5], [pxX + 12, pxY + 5], [pxX + 3, pxY + 14], [pxX + 12, pxY + 14]];
    for (const [x, y] of pts) {
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (tx < 0 || tx >= cfg.cols || ty < 0 || ty >= cfg.rows || cfg.solid[ty][tx]) return false;
    }
    return true;
  }

  update() {
    this.tick++;
    if (this.cameraFlash > 0) this.cameraFlash = Math.max(0, this.cameraFlash - 0.05);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(this.tick / 28 + p.phase) * 0.1;
      if (p.x > 390) p.x = -6;
      if (p.y > 276) p.y = -6;
    }

    if (this.modalOpen || this.cb.isDialogueOpen()) return;

    // Update patrolling NPCs
    const curCfg = this.mapConfigs[this.mapId];
    if (curCfg && curCfg.npcs) {
      for (const npc of curCfg.npcs) {
        if (!npc.patrol || npc.patrol.length < 2) continue;
        if (npc.px == null) {
          npc.px = npc.tx * TILE;
          npc.py = npc.ty * TILE;
        }
        // Pause if player is standing close by
        if (Math.hypot(this.player.x - npc.px, this.player.y - npc.py) < 22) {
          npc.walkFrame = 0;
          continue;
        }
        if (npc.pause > 0) {
          npc.pause--;
          npc.walkFrame = 0;
          continue;
        }
        const [gx, gy] = npc.patrol[npc.patrolIdx % npc.patrol.length];
        const tx = gx * TILE;
        const ty = gy * TILE;
        const dxN = tx - npc.px;
        const dyN = ty - npc.py;
        const distN = Math.hypot(dxN, dyN);
        const npcSpeed = 0.55;
        if (distN <= npcSpeed) {
          npc.px = tx;
          npc.py = ty;
          npc.patrolIdx = (npc.patrolIdx + 1) % npc.patrol.length;
          npc.pause = 60 + ((this.tick + npc.tx * 17) % 80);
          npc.walkFrame = 0;
        } else {
          npc.px += (dxN / distN) * npcSpeed;
          npc.py += (dyN / distN) * npcSpeed;
          npc.dir = Math.abs(dxN) >= Math.abs(dyN) ? (dxN < 0 ? "left" : "right") : (dyN < 0 ? "up" : "down");
          npc.stepAccum = (npc.stepAccum || 0) + npcSpeed;
          if (npc.stepAccum >= 6) {
            npc.stepAccum = 0;
            npc.walkFrame = ((npc.walkFrame || 0) + 1) % 4;
          }
        }
      }
    }

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
      this.player.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
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
        this.player.dir = Math.abs(ddx) >= Math.abs(ddy) ? (ddx < 0 ? "left" : "right") : (ddy < 0 ? "up" : "down");
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

    if (this.mapId === "town" && this.player.dir === "up") {
      if (tx === 5 && ty === 6) this.switchMap("home", 9, 10, "up");
      else if (tx === 18 && ty === 6) this.switchMap("sony", 9, 10, "up");
      else if (tx === 4 && ty === 14) this.switchMap("gear", 9, 10, "up");
      else if (tx === 19 && ty === 14) this.switchMap("sqllab", 9, 10, "up");
    } else if (this.mapId !== "town" && (tx === 8 || tx === 9) && ty === 11 && this.player.dir === "down") {
      const ret = this.mapConfigs[this.mapId]?.exitReturn || { tx: 11, ty: 8 };
      this.switchMap("town", ret.tx, ret.ty, "down");
    }
  }

  // =========================================================================
  // BACKGROUND BAKING FOR ALL 5 MAPS
  // =========================================================================

  bakeBackground() {
    const cfg = this.mapConfigs[this.mapId];
    this.offscreenBg.width = cfg.w;
    this.offscreenBg.height = cfg.h;
    const ctx = this.offscreenCtx;
    const phase = this.getTimePhase();
    const isNight = phase === "night" || phase === "dusk";

    if (this.mapId === "town") this.bakeTownBg(ctx, cfg, isNight);
    else if (this.mapId === "home") this.bakeHomeBg(ctx, cfg);
    else if (this.mapId === "sony") this.bakeShopBg(ctx, cfg, "sony");
    else if (this.mapId === "gear") this.bakeShopBg(ctx, cfg, "gear");
    else if (this.mapId === "sqllab") this.bakeSqlLabBg(ctx, cfg);

    this.bgDirty = false;
  }

  bakeTownBg(ctx, cfg, isNight) {
    px(ctx, 0, 0, "#5ad082", cfg.w, cfg.h);
    for (let y = 0; y < cfg.h; y += 4) {
      for (let x = 0; x < cfg.w; x += 4) {
        const r = hash2d(x, y);
        if (r > 0.84) px(ctx, x, y, "#4cc074", 2, 2);
        else if (r < 0.08) px(ctx, x, y, "#6ee094", 2, 1);
      }
    }

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
        for (let x = rx + offset; x < rx + rw; x += 12) px(ctx, x, y, "#aba49a", 1, 6);
      }
      px(ctx, rx, ry, "#989288", rw, 1);
      px(ctx, rx, ry + rh - 1, "#989288", rw, 1);
    };

    // Main horizontal avenue (y=7..8) + Center Square Plaza (x=9..14, y=2..8)
    drawBrickRect(1, 7, 22, 2);
    drawBrickRect(9, 2, 6, 6);
    // Front door pads for top buildings (My Home & Sony Pro)
    drawBrickRect(5, 6, 1, 1);
    drawBrickRect(18, 6, 1, 1);
    // Vertical avenues down to the lower street
    drawBrickRect(8, 9, 1, 6);
    drawBrickRect(14, 9, 1, 6);
    // Lower front avenue serving Photo Gear (x=4, y=14) & SQL Admin (x=19, y=14)
    drawBrickRect(3, 14, 18, 2);

    // Wildflowers on grass
    for (let ty = 2; ty < cfg.rows - 1; ty++) {
      for (let tx = 1; tx < cfg.cols - 1; tx++) {
        const r = hash2d(tx * 13, ty * 29);
        if (r > 0.72 && !cfg.solid[ty][tx]) {
          if (ty === 7 || ty === 8 || ty === 14 || ty === 15 || (tx >= 9 && tx <= 14 && ty <= 8)) continue;
          const fx = tx * TILE + 3 + Math.floor(hash2d(tx, ty) * 7);
          const fy = ty * TILE + 3 + Math.floor(hash2d(ty, tx) * 7);
          const isRed = r > 0.85;
          px(ctx, fx, fy, isRed ? "#e04450" : "#fcfcfc", 3, 3);
          px(ctx, fx + 1, fy + 1, isRed ? "#ffd858" : "#f0c840", 1, 1);
        }
      }
    }

    // Perimeter oak trees (top, left, right, and neat bottom hedge)
    for (let tx = 0; tx < cfg.cols; tx += 2) drawOakTree(ctx, tx * TILE - 6, -4);
    for (let ty = 1; ty < cfg.rows - 1; ty += 2) {
      drawOakTree(ctx, -10, ty * TILE - 4);
      drawOakTree(ctx, (cfg.cols - 1) * TILE - 2, ty * TILE - 4);
    }
    // Bottom decorative hedge border (row 16)
    for (let x = 0; x < cfg.w; x += 16) {
      box(ctx, x, (cfg.rows - 1) * TILE + 2, 16, 14, "#3b7430", "#22461c");
      px(ctx, x + 2, (cfg.rows - 1) * TILE + 4, "#5ea446", 12, 4);
    }

    // All 4 walkable buildings
    drawMyHomeBuilding(ctx, 2 * TILE, 1.6 * TILE, isNight);
    drawSonyStudioBuilding(ctx, 16 * TILE, 1.7 * TILE, isNight);
    drawGearWorkshopBuilding(ctx, 2 * TILE, 9.9 * TILE, isNight);
    drawSqlAdminBuilding(ctx, 17 * TILE, 9.9 * TILE, 0);

    // Street lamps
    this.lampCoords = [
      [8.2 * TILE, 5.2 * TILE],
      [15.0 * TILE, 5.2 * TILE],
      [7.2 * TILE, 12.2 * TILE],
      [15.4 * TILE, 12.2 * TILE]
    ];
    for (const [lx, ly] of this.lampCoords) drawStreetLamp(ctx, lx, ly);
  }

  drawWoodFloor(ctx, w, h, startY = 44) {
    const woodA = "#e0a868";
    const woodB = "#ecbc80";
    const woodC = "#c88c50";
    const seam = "#a86c3c";
    for (let y = startY; y < h; y++) {
      const row = (y - startY) >> 2;
      const sub = (y - startY) & 3;
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
  }

  drawExitMat(ctx) {
    box(ctx, 8 * TILE, 11 * TILE + 2, 2 * TILE, 12, "#c84038", "#581c18");
    px(ctx, 8 * TILE + 2, 11 * TILE + 4, "#f8e0a0", 2 * TILE - 4, 8);
    drawPixelText(ctx, "EXIT", 9 * TILE, 11 * TILE + 6, "#581c18");
  }

  bakeHomeBg(ctx, cfg) {
    const { w, h } = cfg;
    this.drawWoodFloor(ctx, w, h, 44);

    // Checkered kitchen tile corner (top-left)
    for (let y = 44; y < 96; y += 8) {
      for (let x = 16; x < 104; x += 8) {
        const even = (((x - 16) / 8 + (y - 44) / 8) % 2) === 0;
        px(ctx, x, y, even ? "#f4f0e0" : "#b0d0e0", 8, 8);
      }
    }

    // Cozy central blue rug with golden camera emblem (homage to akshayakula.com/resume/!)
    box(ctx, 108, 84, 72, 54, "#365eb4", "#203874");
    px(ctx, 111, 87, "#4d78d0", 66, 48);
    box(ctx, 115, 91, 58, 40, "#365eb4", "#f0c858");
    // Gold camera motif in center of rug
    px(ctx, 136, 104, "#f4d060", 16, 11);
    px(ctx, 140, 101, "#f4d060", 8, 3);
    px(ctx, 141, 107, "#244284", 6, 5);
    px(ctx, 143, 108, "#94d4ff", 2, 2);

    // Cream & wood top wall
    px(ctx, 0, 0, "#f8ecc8", w, 44);
    for (let x = 0; x < w; x += 8) px(ctx, x, 4, "#e8d8b0", 1, 22);
    px(ctx, 0, 0, "#4a3830", w, 3);
    px(ctx, 0, 26, "#6a4428", w, 2);
    px(ctx, 0, 28, "#b87848", w, 13);
    px(ctx, 0, 41, "#5a3820", w, 2);

    // Daylight window with curtains
    box(ctx, 124, 6, 40, 20, "#98d4f8", OUTLINE);
    px(ctx, 126, 8, "#cceeff", 36, 6);
    px(ctx, 143, 7, "#fcfcfc", 2, 18);
    px(ctx, 126, 15, "#fcfcfc", 36, 2);
    box(ctx, 118, 6, 8, 20, "#e88088", OUTLINE);
    box(ctx, 162, 6, 8, 20, "#e88088", OUTLINE);

    // Wall "MY HOME" wooden plaque
    box(ctx, 64, 8, 46, 14, "#f0d8a0", "#503820");
    drawPixelText(ctx, "MY HOME", 87, 12, "#482812");

    // Kitchen counter (top-left x=2..5, y=3..4)
    box(ctx, 2 * TILE, 3.2 * TILE, 4 * TILE, 1.5 * TILE, "#e8eef4", "#3c4452");
    px(ctx, 2 * TILE + 2, 3.2 * TILE + 2, "#ffffff", 4 * TILE - 4, 4);
    box(ctx, 2.3 * TILE, 3.4 * TILE, 12, 10, "#485264", "#20242c"); // espresso machine
    px(ctx, 2.5 * TILE, 3.6 * TILE, "#e04038", 4, 2);

    // Photographer PC Desk (top-right x=13..15, y=3..4)
    box(ctx, 13 * TILE, 3.2 * TILE, 3 * TILE, 1.6 * TILE, "#b87c48", "#4c301c");
    box(ctx, 13.6 * TILE, 2.7 * TILE, 22, 15, "#1a2434", "#10141c");
    px(ctx, 13.7 * TILE, 2.9 * TILE, "#58b0f8", 18, 9);
    px(ctx, 13.9 * TILE, 3.1 * TILE, "#ffffff", 10, 2);
    px(ctx, 13.8 * TILE, 3.9 * TILE, "#dce0e8", 16, 4);

    // Cozy Bed (bottom-left x=2..4, y=7..9)
    box(ctx, 2 * TILE, 7 * TILE, 3 * TILE, 2.8 * TILE, "#fcfcfc", "#4a3020");
    px(ctx, 2 * TILE + 2, 7 * TILE + 2, "#8a5834", 3 * TILE - 4, 7); // headboard
    px(ctx, 2 * TILE + 6, 7.6 * TILE, "#ffffff", 36, 10); // pillow
    px(ctx, 2 * TILE + 2, 8.3 * TILE, "#3878c8", 3 * TILE - 4, 22); // blanket
    px(ctx, 2 * TILE + 2, 8.3 * TILE, "#6ca8f0", 3 * TILE - 4, 4);

    // Camera Gear Display Cabinet (bottom-right x=13..15, y=7..8) — contents rendered dynamically from purchased gear!
    box(ctx, 13 * TILE, 7 * TILE, 3 * TILE, 2 * TILE, "#8a5a38", "#3e2618");
    box(ctx, 13.2 * TILE, 7.2 * TILE, 42, 24, "#1e2a38", "#3e2618");
    px(ctx, 13.3 * TILE, 7.9 * TILE, "#304054", 38, 1);

    // Potted plants
    for (const [pxx, pyy] of [[18, 160], [256, 160]]) {
      box(ctx, pxx, pyy + 8, 12, 8, "#b8643c", "#4c2818");
      px(ctx, pxx + 1, pyy, "#3a8c44", 10, 9);
      px(ctx, pxx + 3, pyy - 2, "#62b858", 6, 6);
    }

    this.drawExitMat(ctx);
  }

  bakeShopBg(ctx, cfg, theme) {
    const { w, h } = cfg;
    const isSony = theme === "sony";

    if (isSony) {
      // Sleek slate gallery floor for SONY PRO
      px(ctx, 0, 44, "#d8dee8", w, h - 44);
      for (let y = 44; y < h; y += 16) {
        for (let x = 0; x < w; x += 16) {
          const even = (((x / 16) + ((y - 44) / 16)) % 2) === 0;
          px(ctx, x, y, even ? "#e4e8f0" : "#cdd4e2", 16, 16);
          px(ctx, x, y, "#f2f5fa", 15, 1);
          px(ctx, x + 15, y, "#b4bccd", 1, 16);
        }
      }
      // Dark Sony flagship wall
      px(ctx, 0, 0, "#242a38", w, 44);
      px(ctx, 0, 0, "#141820", w, 3);
      px(ctx, 0, 38, "#3868c8", w, 4);
      px(ctx, 0, 42, "rgba(0,0,0,0.28)", w, 3);
      box(ctx, 108, 10, 72, 16, "#141820", "#ffe478");
      drawPixelText(ctx, "SONY PRO", 144, 15, "#ffe478");
    } else {
      // Warm timber & cream studio floor for PHOTO GEAR
      this.drawWoodFloor(ctx, w, h, 44);
      const cx0 = 4 * TILE;
      const cy0 = 5 * TILE;
      const cw = 11 * TILE;
      const ch = 5 * TILE;
      for (let y = 0; y < ch; y += 8) {
        for (let x = 0; x < cw; x += 8) {
          const even = ((x / 8 + y / 8) % 2) === 0;
          px(ctx, cx0 + x, cy0 + y, even ? "#f6f2e4" : "#d8c8b0", 8, 8);
        }
      }
      px(ctx, cx0 - 2, cy0 - 2, "#7a5234", cw + 4, 2);
      px(ctx, cx0 - 2, cy0 + ch, "#7a5234", cw + 4, 2);
      // Warm cream workshop wall
      px(ctx, 0, 0, "#f4e8cc", w, 44);
      px(ctx, 0, 0, "#4c301c", w, 3);
      px(ctx, 0, 28, "#b87444", w, 13);
      px(ctx, 0, 41, "#5a3820", w, 2);
      box(ctx, 102, 10, 84, 16, "#fcfcfc", "#4e2814");
      drawPixelText(ctx, "PHOTO GEAR", 144, 15, "#3e2210");
    }

    // Checkout Counter (top-left x=2..5, y=3..4)
    const counterFill = isSony ? "#384256" : "#d8a868";
    const counterHi = isSony ? "#505d76" : "#f4d094";
    box(ctx, 2 * TILE, 3.6 * TILE, 4 * TILE, 1.3 * TILE, counterFill, "#20242c");
    px(ctx, 2 * TILE + 2, 3.6 * TILE + 2, counterHi, 4 * TILE - 4, 4);
    box(ctx, 4.6 * TILE, 3.2 * TILE, 14, 12, "#464e5e", "#20242c");
    px(ctx, 4.6 * TILE + 3, 3.2 * TILE + 2, "#68f0a4", 8, 4);
    box(ctx, 2.3 * TILE, 4.1 * TILE, 24, 9, "#d43428", "#681812");
    drawPixelText(ctx, "PAY", 2.3 * TILE + 12, 4.1 * TILE + 2, "#ffffff");

    // Full Catalog Kiosk (top-right x=14..16, y=3..4)
    box(ctx, 14 * TILE, 3.4 * TILE, 3 * TILE, 1.5 * TILE, "#4a5468", "#20242c");
    box(ctx, 14.4 * TILE, 2.8 * TILE, 20, 14, "#182840", "#101620");
    px(ctx, 14.5 * TILE, 3.0 * TILE, "#72c4ff", 16, 8);

    // Plants
    for (const [pxx, pyy] of [[16, 158], [260, 158]]) {
      box(ctx, pxx, pyy + 8, 12, 8, "#b8643c", "#4c2818");
      px(ctx, pxx + 1, pyy, "#3a8c44", 10, 9);
      px(ctx, pxx + 3, pyy - 2, "#62b858", 6, 6);
    }

    this.drawExitMat(ctx);
  }

  bakeSqlLabBg(ctx, cfg) {
    const { w, h } = cfg;
    // Cool dark server-room tile floor
    px(ctx, 0, 44, "#1e2734", w, h - 44);
    for (let y = 44; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        const even = (((x / 16) + ((y - 44) / 16)) % 2) === 0;
        px(ctx, x, y, even ? "#243040" : "#1c2634", 16, 16);
        px(ctx, x, y, "#2e3d52", 15, 1);
      }
    }
    // Glowing emerald circuit path from door to central mainframe
    px(ctx, 8.8 * TILE, 96, "#2c8a64", 6, 80);
    px(ctx, 9 * TILE, 96, "#5ef0a8", 2, 80);

    // Tech top wall
    px(ctx, 0, 0, "#141c26", w, 44);
    px(ctx, 0, 39, "#2d8a68", w, 3);
    box(ctx, 102, 10, 84, 16, "#0d161e", "#46c88a");
    drawPixelText(ctx, "SQL ADMIN LAB", 144, 15, "#7effbe");

    // Left & Right Server Racks (x=2..4 & x=13..15, y=3..4)
    for (const sx of [2 * TILE, 13 * TILE]) {
      box(ctx, sx, 2.8 * TILE, 3 * TILE, 2.1 * TILE, "#283444", "#0e141c");
      for (let r = 0; r < 4; r++) {
        px(ctx, sx + 4, 3.0 * TILE + r * 7, "#16202a", 40, 5);
        px(ctx, sx + 8, 3.1 * TILE + r * 7, "#58f4a4", 4, 2);
        px(ctx, sx + 15, 3.1 * TILE + r * 7, "#48a8f8", 8, 2);
      }
    }

    // Central SQL Mainframe Desk (x=7..10, y=4..5)
    box(ctx, 7 * TILE, 4.2 * TILE, 4 * TILE, 1.7 * TILE, "#38485c", "#121820");
    box(ctx, 7.6 * TILE, 3.5 * TILE, 44, 18, "#0e1a22", "#46c88a");
    px(ctx, 7.8 * TILE, 3.7 * TILE, "#58f4a4", 24, 2);
    px(ctx, 7.8 * TILE, 4.0 * TILE, "#78d4ff", 34, 2);
    px(ctx, 7.8 * TILE, 4.3 * TILE, "#58f4a4", 18, 2);

    // Side Terminals (x=2..4 & x=13..15, y=7..8)
    for (const tx of [2 * TILE, 13 * TILE]) {
      box(ctx, tx, 7 * TILE, 3 * TILE, 1.8 * TILE, "#38485c", "#121820");
      box(ctx, tx + 8, 6.6 * TILE, 32, 16, "#0e1a22", "#58a8e8");
      px(ctx, tx + 11, 6.8 * TILE, "#72f4b4", 18, 2);
      px(ctx, tx + 11, 7.1 * TILE, "#9cd8ff", 24, 2);
    }

    this.drawExitMat(ctx);
  }

  render() {
    const cfg = this.mapConfigs[this.mapId];
    if (!cfg) return;
    if (this.bgDirty) this.bakeBackground();

    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cfg.w, cfg.h);
    ctx.drawImage(this.offscreenBg, 0, 0);

    if (this.mapId === "town") {
      drawSqlAdminBuilding(ctx, 17 * TILE, 9.9 * TILE, this.tick);
      drawFountain(ctx, 10 * TILE, 10 * TILE, this.tick);
      drawPlazaCameraLandmark(ctx, 11 * TILE, 5 * TILE, this.tick, this.cameraFlash);
    }

    // Dynamically render purchased camera gear sprites inside MY HOME's display cabinet!
    if (this.mapId === "home") {
      const purchased = this.cb.getPurchasedProducts?.() || [];
      const uniqueKinds = [];
      for (const item of purchased) {
        if (!uniqueKinds.includes(item.spriteKind)) uniqueKinds.push(item.spriteKind);
      }
      uniqueKinds.slice(0, 3).forEach((kind, idx) => {
        drawProductPixelSprite(ctx, kind, 13 * TILE + 11 + idx * 13, 7 * TILE + 16, this.tick);
      });
    }

    // Dynamic Product Pedestals in SONY PRO & PHOTO GEAR stores
    if (cfg.products && cfg.products.length > 0) {
      for (const item of cfg.products) {
        const pxX = item.tx * TILE;
        const pxY = item.ty * TILE;
        px(ctx, pxX + 1, pxY + 13, "rgba(25,20,15,0.24)", 14, 4);
        box(ctx, pxX, pxY, 16, 15, "#eef4fa", "#3c4658");
        px(ctx, pxX + 1, pxY + 1, "#ffffff", 14, 2);
        px(ctx, pxX + 1, pxY + 11, "#9aa8bc", 14, 3);
        const st = Number(item.prod.stock);
        const ledColor = st <= 0 ? "#e03830" : st <= 5 ? "#f0a828" : "#2ed878";
        px(ctx, pxX + 12, pxY + 12, ledColor, 2, 2);
        drawProductPixelSprite(ctx, item.prod.meta?.spriteKind || "handle", pxX + 8, pxY + 5, this.tick);
      }
    }

    const entities = [
      ...cfg.npcs.map((n) => {
        const nx = n.px ?? n.tx * TILE;
        const ny = n.py ?? n.ty * TILE;
        return {
          y: ny,
          draw: () =>
            drawChibi(ctx, Math.round(nx), Math.round(ny), {
              dir: n.dir,
              frame: n.walkFrame || 0,
              hair: n.hair,
              skin: n.skin,
              shirt: n.shirt,
              pants: n.pants
            })
        };
      }),
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

    if (this.hoverZone) {
      const z = this.hoverZone;
      ctx.strokeStyle = "rgba(255, 240, 120, 0.92)";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.floor(z.x) + 0.5, Math.floor(z.y) + 0.5, Math.floor(z.w) - 1, Math.floor(z.h) - 1);
    }

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

      for (const p of this.particles) {
        if (phase === "night") {
          const glow = 0.4 + 0.6 * Math.abs(Math.sin(this.tick / 20 + p.phase));
          ctx.fillStyle = `rgba(248, 255, 160, ${glow.toFixed(2)})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
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
