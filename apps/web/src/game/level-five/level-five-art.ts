import type Phaser from "phaser";
import { LEVEL_FIVE_PLATFORMS, LEVEL_FIVE_WORLD, type PlatformShape } from "./level-five-map";

// Small, reusable painted textures. None of these objects participates in physics.
const INK = "#527155";
function texture(
  scene: Phaser.Scene,
  name: string,
  w: number,
  h: number,
  paint: (c: CanvasRenderingContext2D) => void
): string {
  const key = `l5-${name}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const c = tex.context;
  c.lineCap = "round";
  c.lineJoin = "round";
  paint(c);
  // Sparse deterministic pigment flecks, painted once, not a runtime filter.
  c.save();
  c.globalCompositeOperation = "source-atop";
  c.fillStyle = "rgba(255,248,214,.13)";
  for (let i = 0; i < (w * h) / 170; i++) {
    const x = (i * 137.31) % w,
      y = (i * 71.17) % h;
    c.fillRect(x, y, 2, 1);
  }
  c.restore();
  tex.refresh();
  return key;
}
function path(
  c: CanvasRenderingContext2D,
  d: string,
  fill: string,
  stroke?: string,
  width = 2
): void {
  const p = new Path2D(d);
  c.fillStyle = fill;
  c.fill(p);
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke(p);
  }
}

export function createStorybookTextures(scene: Phaser.Scene): void {
  texture(scene, "sky", 1280, 720, (c) => {
    const wash = c.createLinearGradient(0, 0, 0, 720);
    wash.addColorStop(0, "#a8d8df");
    wash.addColorStop(0.55, "#e4edcf");
    wash.addColorStop(1, "#fff0c4");
    c.fillStyle = wash;
    c.fillRect(0, 0, 1280, 720);
    const light = c.createRadialGradient(970, 115, 12, 970, 115, 290);
    light.addColorStop(0, "#fff5cd");
    light.addColorStop(0.18, "#fff5cdcc");
    light.addColorStop(1, "#fff5cd00");
    c.fillStyle = light;
    c.fillRect(0, 0, 1280, 720);
  });
  texture(scene, "cloud", 280, 110, (c) => {
    path(
      c,
      "M12 77 Q2 53 37 49 Q30 20 66 25 Q90 -1 124 28 Q162 2 184 40 Q225 22 235 56 Q275 46 270 79 Q255 96 211 91 Q162 108 117 92 Q59 103 12 77Z",
      "#fff9e9",
      "#e4ead2",
      2
    );
    path(c, "M26 78 Q86 87 126 78 Q205 92 254 77 Q239 96 178 95 Q86 98 26 78Z", "#e9e9cf");
  });
  texture(scene, "hills", 1024, 360, (c) => {
    path(
      c,
      "M0 160 Q150 80 240 118 Q330 156 426 72 Q562 -8 689 86 Q807 147 900 120 Q981 98 1024 160 L1024 360 L0 360Z",
      "#9fc5a0"
    );
    path(
      c,
      "M0 245 Q159 181 279 227 Q410 135 569 202 Q741 104 878 220 Q963 213 1024 245 L1024 360 L0 360Z",
      "#86b799"
    );
    for (let y = 244; y < 350; y += 23)
      path(
        c,
        `M0 ${y} Q180 ${y - 28} 365 ${y + 8} T740 ${y - 7} T1024 ${y}`,
        "transparent",
        "#b4cf9f",
        5
      );
    for (let x = 40; x < 960; x += 184)
      path(c, `M${x} 222 l22 -15 27 17 -5 0 v17 h-38 v-19Z`, "#789f8d");
  });
  texture(scene, "house", 310, 245, (c) => {
    path(c, "M37 117 L266 114 L261 233 L40 233Z", "#ecd39a", "#aa8b62", 3);
    path(
      c,
      "M7 126 Q32 94 58 56 L232 48 Q257 91 303 111 L286 129 Q198 110 7 138Z",
      "#b16c51",
      "#825e48",
      3
    );
    path(c, "M18 125 Q127 99 287 118", "transparent", "#e3a070", 6);
    for (let i = 0; i < 9; i++)
      path(
        c,
        `M${62 + i * 20} 59 Q${62 + i * 23} 85 ${33 + i * 28} 118`,
        "transparent",
        "#ce8b61",
        3
      );
    path(c, "M133 157 Q159 146 183 156 L183 231 L133 231Z", "#617461", "#997c55", 4);
    for (const x of [62, 214]) {
      c.fillStyle = "#6a806b";
      c.fillRect(x, 157, 29, 35);
      c.strokeStyle = "#d6ba82";
      c.strokeRect(x + 5, 162, 19, 25);
    }
    path(c, "M26 234 L277 234 L286 241 L19 241Z", "#bda77c");
  });
  texture(scene, "bamboo", 180, 310, (c) => {
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 15;
      path(
        c,
        `M${x} 302 Q${x - 15} 151 ${x + (i % 2 ? 20 : -24)} 30`,
        "transparent",
        i % 2 ? "#669659" : "#7fa35d",
        9
      );
      for (let y = 70; y < 300; y += 38)
        path(c, `M${x - 6} ${y} l12 -2`, "transparent", "#c1cc80", 2);
    }
    for (let i = 0; i < 17; i++) {
      const x = 48 + ((i * 23) % 83),
        y = 28 + ((i * 43) % 220),
        dir = i % 2 ? 1 : -1;
      path(
        c,
        `M${x} ${y} q${dir * 18} -32 ${dir * 52} -20 q${-dir * 24} 28 ${-dir * 52} 20Z`,
        i % 3 ? "#5f8f5a" : "#9fbb68"
      );
    }
  });
  texture(scene, "rice", 160, 90, (c) => {
    for (let i = 0; i < 13; i++) {
      const x = 8 + i * 12,
        y = 20 + ((i * 17) % 22);
      path(
        c,
        `M${x} 90 Q${x + 8} 45 ${x + 20} ${y} M${x} 88 Q${x - 18} 44 ${x - 4} 34`,
        "transparent",
        "#7b9b49",
        2
      );
      path(c, `M${x + 20} ${y} q18 0 17 18 q-16 -2 -17 -18Z`, "#d6c26a");
    }
  });
  texture(scene, "banana", 200, 230, (c) => {
    path(c, "M96 228 Q110 130 97 54 L113 58 Q119 155 110 228Z", "#a5ae65");
    for (let i = 0; i < 6; i++) {
      c.save();
      c.translate(104, 63 + i * 9);
      c.rotate((i - 2.5) * 0.5);
      path(c, "M0 0 Q-70 -90 -95 3 Q-46 -17 0 0Z", i % 2 ? "#83a568" : "#67945c", INK);
      path(c, "M0 0 Q-49 -40 -85 -1", "transparent", "#b6c87d");
      c.restore();
    }
  });
  texture(scene, "flowers", 110, 48, (c) => {
    for (let i = 0; i < 6; i++) {
      const x = 9 + i * 18,
        y = 12 + ((i * 7) % 17);
      path(c, `M${x} 47 Q${x + 7} 30 ${x} ${y}`, "transparent", "#69904e", 2);
      c.fillStyle = i % 2 ? "#e8b06c" : "#f7e6b0";
      for (let j = 0; j < 5; j++) {
        c.beginPath();
        c.ellipse(x + Math.cos(j * 1.26) * 5, y + Math.sin(j * 1.26) * 5, 4, 3, j, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#ba8751";
      c.fillRect(x - 2, y - 2, 4, 4);
    }
  });
  texture(scene, "leaf", 18, 12, (c) =>
    path(c, "M1 10 Q4 -4 17 2 Q15 13 1 10Z", "#bac774", "#7c9c55", 1)
  );
}

export function drawStorybookWorld(scene: Phaser.Scene): void {
  createStorybookTextures(scene);
  scene.add.image(0, 0, "l5-sky").setOrigin(0).setScrollFactor(0).setDepth(-10);
  for (let i = 0; i < 8; i++) {
    const cloud = scene.add
      .image(i * 430, 85 + (i % 3) * 65, "l5-cloud")
      .setScrollFactor(0.08)
      .setDepth(-9)
      .setScale(0.65 + (i % 3) * 0.13)
      .setAlpha(0.8);
    scene.tweens.add({
      targets: cloud,
      x: cloud.x + 75,
      duration: 35000 + i * 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  for (let x = 0; x < 2700; x += 1024)
    scene.add
      .image(x, 265, "l5-hills")
      .setOrigin(0)
      .setScrollFactor(0.2)
      .setDepth(-8)
      .setAlpha(0.82);
  const fields = scene.add.graphics().setScrollFactor(0.4).setDepth(-7);
  fields.fillStyle(0xbdcd88);
  fields.fillRect(0, 530, 4000, 190);
  for (let i = 0; i < 12; i++) {
    fields.lineStyle(5, i % 2 ? 0xd8d495 : 0xa4b674, 0.7);
    fields.lineBetween(0, 551 + i * 16, 4000, 520 + i * 28);
  }
  for (let x = 60; x < 3700; x += 250) {
    const village = x < 900 || x > 2600;
    if (village && x % 3)
      scene.add
        .image(x, 563, "l5-house")
        .setOrigin(0.5, 1)
        .setScrollFactor(0.4)
        .setScale(0.64 + (x % 3) * 0.1)
        .setDepth(-6);
    else {
      const plant = scene.add
        .image(x, 568, x > 1600 ? "l5-bamboo" : "l5-banana")
        .setOrigin(0.5, 1)
        .setScrollFactor(0.4)
        .setDepth(-6)
        .setScale(0.75);
      if (x > 1600)
        scene.tweens.add({
          targets: plant,
          angle: 1.2,
          duration: 3500 + (x % 600),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
    }
    const rice = scene.add
      .image(x + 80, 604, "l5-rice")
      .setOrigin(0.5, 1)
      .setScrollFactor(0.45)
      .setDepth(-5)
      .setAlpha(0.8);
    if (x % 3 === 0)
      scene.tweens.add({
        targets: rice,
        angle: 2,
        duration: 2800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
  }
  // Water is below the gaps; no false walkable bridge spans an empty collider.
  const water = scene.add.graphics().setDepth(-3);
  water.fillStyle(0x79b8b4);
  water.fillRect(0, 691, LEVEL_FIVE_WORLD.width, 29);
  water.lineStyle(2, 0xd3e7c5, 0.7);
  for (let x = 20; x < 6400; x += 73) water.lineBetween(x, 701 + (x % 11), x + 28, 701 + (x % 11));
  for (const [index, shape] of LEVEL_FIVE_PLATFORMS.entries()) {
    drawPlatform(scene, shape, [3, 5, 6].includes(index));
    if (shape.width > 500)
      scene.add
        .image(shape.x + 180, shape.y + 9, "l5-flowers")
        .setOrigin(0.5, 1)
        .setDepth(4);
  }
  const regions = ["Làng quê", "Ruộng lúa", "Con mương", "Lũy tre", "Đường làng", "Sân hội làng"];
  [150, 1550, 2670, 3510, 4440, 5660].forEach((x, i) => {
    scene.add
      .text(x, 315, regions[i]!, {
        fontFamily: "Georgia, serif",
        fontSize: "25px",
        color: "#567b61",
        fontStyle: "italic"
      })
      .setAlpha(0.75);
  });
  const start = scene.add.graphics();
  start.fillStyle(0x947246);
  start.fillRoundedRect(160, 543, 8, 107, 4);
  start.fillStyle(0xf4e4b4);
  start.fillRoundedRect(44, 520, 246, 47, 9);
  start.lineStyle(2, 0xb0905e);
  start.strokeRoundedRect(44, 520, 246, 47, 9);
  scene.add
    .text(167, 542, "HÀNH TRÌNH BẮT ĐẦU →", {
      fontFamily: "sans-serif",
      fontSize: "15px",
      color: "#44674b",
      fontStyle: "bold"
    })
    .setOrigin(0.5);
  // At most one drifting leaf at a time, away from the walkable silhouettes.
  scene.time.addEvent({
    delay: 6500,
    loop: true,
    callback: () => {
      const leaf = scene.add
        .image(scene.cameras.main.scrollX + 900, 180, "l5-leaf")
        .setDepth(-2)
        .setAlpha(0.6);
      scene.tweens.add({
        targets: leaf,
        x: leaf.x - 140,
        y: 410,
        angle: 170,
        alpha: 0,
        duration: 4300,
        onComplete: () => leaf.destroy()
      });
    }
  });
}

function drawPlatform(scene: Phaser.Scene, s: PlatformShape, bridge: boolean): void {
  const g = scene.add.graphics().setDepth(0);
  if (bridge) {
    g.fillStyle(0x9b754c);
    g.fillRect(s.x, s.y, s.width, 19);
    g.lineStyle(3, 0x765a3d);
    g.strokeRect(s.x, s.y, s.width, 19);
    for (let x = s.x + 3; x < s.x + s.width; x += 26) {
      g.fillStyle(0xc7a16b);
      g.fillRoundedRect(x, s.y + 2, 22, 12, 3);
      g.lineStyle(1, 0x8c6943);
      g.lineBetween(x + 3, s.y + 7, x + 18, s.y + 6);
    }
    for (const x of [s.x + 14, s.x + s.width - 25]) {
      g.fillStyle(0x987647);
      g.fillRoundedRect(x, s.y + 16, 12, s.height, 4);
      g.lineStyle(3, 0xc3a174);
      g.lineBetween(x + 4, s.y + 23, x + 4, 715);
    }
    g.lineStyle(6, 0x9b754c);
    g.lineBetween(s.x + 20, s.y + 29, s.x + s.width - 20, 713);
  } else {
    g.fillStyle(0xa58054);
    g.fillRect(s.x, s.y, s.width, s.height);
    g.fillStyle(0xc7a271);
    g.fillRect(s.x, s.y + 12, s.width, 17);
    g.fillStyle(0x54734a);
    g.fillRect(s.x, s.y, s.width, 9);
    g.fillStyle(0x96b761);
    g.fillRect(s.x, s.y, s.width, 5);
    for (let x = s.x + 9; x < s.x + s.width - 5; x += 19) {
      g.fillStyle(x % 3 ? 0x7ca256 : 0xaac371);
      g.fillEllipse(x, s.y + 6, 25, 12);
      g.lineStyle(2, 0xadc976);
      g.lineBetween(x, s.y + 1, x - 3, s.y - 5);
      g.fillStyle(0xdfbd86, 0.55);
      g.fillEllipse(x + 2, s.y + 36 + (x % 21), 5 + (x % 5), 3);
    }
    g.lineStyle(2, 0x806546, 0.5);
    for (let x = s.x + 35; x < s.x + s.width; x += 101) {
      g.lineBetween(x, s.y + 20, x - 5, s.y + 42);
      g.lineBetween(x - 5, s.y + 42, x + 7, s.y + 51);
    }
  }
}

export interface StoryGate {
  root: Phaser.GameObjects.Container;
  sign: Phaser.GameObjects.Container;
  emblem: Phaser.GameObjects.Text;
  doors: Phaser.GameObjects.Rectangle[];
  glow: Phaser.GameObjects.Ellipse;
  ribbon: Phaser.GameObjects.Triangle;
  status: string;
}
export function createGate(
  scene: Phaser.Scene,
  x: number,
  floor: number,
  label: string,
  finish = false
): StoryGate {
  const root = scene.add.container(x, floor).setDepth(2);
  const g = scene.add.graphics();
  const width = finish ? 205 : 124,
    height = finish ? 233 : 182;
  const glow = scene.add.ellipse(0, -height + 35, width + 35, 125, 0xffe5a0, 0.22);
  root.add(glow);
  for (const side of [-1, 1]) {
    g.fillStyle(0x536f45);
    g.fillRoundedRect((side * width) / 2 - 6, -height, 12, height, 5);
    g.fillStyle(0xa6b86d);
    g.fillRoundedRect((side * width) / 2 - 4, -height, 4, height, 3);
    for (let y = -height + 18; y < 0; y += 27) {
      g.lineStyle(3, 0xc1cc84);
      g.lineBetween((side * width) / 2 - 7, y, (side * width) / 2 + 7, y - 1);
    }
  }
  g.lineStyle(12, 0x849959);
  g.lineBetween(-width / 2 - 12, -height, width / 2 + 12, -height + 3);
  root.add(g);
  const doors = [-1, 1].map((side) =>
    scene.add
      .rectangle((side * width) / 4, -58, width / 2 - 10, 7, 0xb49a64)
      .setOrigin(side < 0 ? 0 : 1, 0.5)
      .setX((side * width) / 2)
  );
  root.add(doors);
  const sign = scene.add.container(0, -height + 38);
  const timber = scene.add.graphics();
  timber.fillStyle(0xf4dfac);
  timber.fillRoundedRect(-width / 2 - 8, -23, width + 16, 46, 8);
  timber.lineStyle(2, 0xb69962);
  timber.strokeRoundedRect(-width / 2 - 8, -23, width + 16, 46, 8);
  timber.lineStyle(1, 0xd1b57f, 0.7);
  timber.lineBetween(-width / 2 + 2, 16, width / 2 - 6, 14);
  timber.lineBetween(-width / 2 + 9, -16, width / 2 - 1, -18);
  for (const side of [-1, 1]) {
    timber.lineStyle(3, 0x987951);
    timber.lineBetween(side * (width / 2 - 12), -23, side * (width / 2 - 12), -39);
  }
  sign.add(timber);
  sign.add(
    scene.add
      .text(0, 0, label, {
        fontFamily: "sans-serif",
        fontSize: finish ? "16px" : "18px",
        fontStyle: "bold",
        color: "#496b48"
      })
      .setOrigin(0.5)
  );
  root.add(sign);
  const emblem = scene.add
    .text(0, -height + 94, finish ? "✦" : "?", {
      fontFamily: "Georgia, serif",
      fontSize: finish ? "46px" : "32px",
      fontStyle: "bold",
      color: "#9c742c",
      stroke: "#fff2c9",
      strokeThickness: 5
    })
    .setOrigin(0.5);
  root.add(emblem);
  const ribbon = scene.add
    .triangle(-width / 2, -height + 30, 0, 0, 28, 6, 3, 33, 0xdd926b)
    .setOrigin(0, 0.1);
  root.add(ribbon);
  if (finish) {
    const colors = [0x729fc5, 0x82a76e, 0xd4b25c, 0xd9917b, 0xe2a262, 0x71aba4, 0xc68d9a];
    colors.forEach((color, i) => {
      const flag = scene.add
        .triangle(-94 + i * 31, -height - 15, 0, 0, 25, 0, 13, 27, color)
        .setOrigin(0.5, 0);
      root.add(flag);
      scene.tweens.add({
        targets: flag,
        angle: 5,
        duration: 1600 + i * 110,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });
    root.add(
      scene.add
        .text(0, -height - 57, "CỔNG LIÊN MINH", {
          fontFamily: "Georgia, serif",
          fontSize: "23px",
          fontStyle: "bold",
          color: "#44694e"
        })
        .setOrigin(0.5)
    );
    root.add(scene.add.image(-width / 2, 0, "l5-flowers").setOrigin(0.5, 1));
    root.add(scene.add.image(width / 2, 0, "l5-flowers").setOrigin(0.5, 1));
  }
  return { root, sign, emblem, doors, glow, ribbon, status: "" };
}

export function updateGate(
  scene: Phaser.Scene,
  gate: StoryGate,
  status: "locked" | "current" | "completed"
): void {
  if (gate.status === status) return;
  gate.status = status;
  scene.tweens.killTweensOf([gate.emblem, gate.ribbon, gate.glow, ...gate.doors]);
  gate.root.setAlpha(status === "locked" ? 0.55 : 1);
  gate.emblem.setText(status === "completed" ? "✓" : "?");
  gate.glow.setAlpha(status === "current" ? 0.65 : status === "completed" ? 0.3 : 0);
  gate.doors.forEach((door, i) =>
    scene.tweens.add({
      targets: door,
      angle: status === "completed" ? (i ? 70 : -70) : 0,
      duration: 450,
      ease: "Sine.easeOut"
    })
  );
  if (status === "current") {
    scene.tweens.add({
      targets: gate.emblem,
      y: gate.emblem.y - 5,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    scene.tweens.add({
      targets: gate.ribbon,
      angle: 7,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
}

export function leafBurst(scene: Phaser.Scene, x: number, y: number, count = 12): void {
  for (let i = 0; i < count; i++) {
    const leaf = scene.add
      .image(x, y, "l5-leaf")
      .setDepth(9)
      .setTint(i % 3 ? 0xffffff : 0xf8d684);
    scene.tweens.add({
      targets: leaf,
      x: x + Math.cos(i * 2.4) * (40 + i * 3),
      y: y - 25 - (i % 5) * 14,
      angle: i * 65,
      alpha: 0,
      duration: 650 + i * 12,
      onComplete: () => leaf.destroy()
    });
  }
}
