import Phaser from "phaser";
import { CHARACTERS, type LevelId } from "@htlm/game-domain";
import { CHARACTER_ASSETS, JOURNEY_MAP_ASSETS } from "@htlm/asset-manifest";
import type { GameBridge } from "../game-bridge";
import { isAllianceCenterUnlocked, JOURNEY_AREAS, JOURNEY_TRAIL, MAP_SIZE, type JourneyArea } from "../journey-map-config";

// Independent layers stay editable; no gameplay or network state lives here.
const DEPTH = { background: 0, distant: 10, midground: 20, foreground: 30, landmarks: 40, characters: 50, fx: 60, labels: 70 };
type AreaVisual = Phaser.GameObjects.GameObject & { setAlpha(value: number): unknown };
type AreaView = { visuals: AreaVisual[]; target: Phaser.GameObjects.Zone; glow: Phaser.GameObjects.Arc; badge: Phaser.GameObjects.Text };
type AllianceCenterView = { visuals: AreaVisual[]; target: Phaser.GameObjects.Zone; glow: Phaser.GameObjects.Arc; badge: Phaser.GameObjects.Text };

export class JourneyMapScene extends Phaser.Scene {
  private focusedIndex = -1;
  private bridge: GameBridge | undefined;
  private reducedMotion = false;
  private areaViews = new Map<LevelId, AreaView>();
  private allianceCenter: AllianceCenterView | undefined;
  private journeyState: { mode: "dev" | "host"; completedLevelIds: readonly LevelId[]; availableLevelId: LevelId | null } = { mode: "dev", completedLevelIds: [], availableLevelId: null };

  constructor() { super("JourneyMapScene"); }

  preload(): void {
    for (const area of JOURNEY_AREAS) {
      const landmark = JOURNEY_MAP_ASSETS.landmarks[area.levelId];
      const character = CHARACTER_ASSETS[area.characterId].poses.master;
      if (landmark && !this.textures.exists(landmark.key)) this.load.image(landmark.key, landmark.url);
      if (character && !this.textures.exists(character.key)) this.load.image(character.key, character.url);
    }
  }

  create(): void {
    this.focusedIndex = -1;
    this.bridge = this.registry.get("gameBridge") as GameBridge | undefined;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.cameras.main.setBackgroundColor(0xf4ebd0).setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);
    this.drawTerrain();
    this.drawTrail();
    JOURNEY_AREAS.forEach((area, index) => this.drawArea(area, index));
    this.drawFinale();
    this.drawAtmosphere();
    this.returnToOverview(false);

    const unsubscribe = this.bridge?.on("map:navigate", ({ target }) => {
      if (target === "overview") this.returnToOverview();
      else if (target === "next") this.nextArea();
      else if (target === "previous") this.previousArea();
      else if (target === "alliance-center") this.focusAllianceCenter();
      else this.focusArea(target);
    });
    const unsubscribeState = this.bridge?.on("map:setState", (state) => {
      this.journeyState = state;
      this.applyJourneyState();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe?.();
      unsubscribeState?.();
      this.tweens.killAll();
    });
    this.bridge?.emit("phaser:ready", { scene: this.scene.key });
  }

  focusArea(levelId: LevelId): void {
    const index = JOURNEY_AREAS.findIndex((area) => area.levelId === levelId);
    const area = JOURNEY_AREAS[index];
    if (!area) return;
    this.focusedIndex = index;
    this.moveCamera(area.x, area.y + 30, 1.12);
    this.bridge?.emit("map:centerFocused", { focused: false });
    this.bridge?.emit("map:focused", { levelId });
  }

  returnToOverview(animate = true): void {
    this.focusedIndex = -1;
    this.moveCamera(MAP_SIZE.width / 2, MAP_SIZE.height / 2,
      Math.min(this.scale.width / MAP_SIZE.width, this.scale.height / MAP_SIZE.height), animate);
    this.bridge?.emit("map:centerFocused", { focused: false });
    this.bridge?.emit("map:focused", { levelId: null });
  }

  nextArea(): void {
    const area = JOURNEY_AREAS[Math.min(this.focusedIndex + 1, JOURNEY_AREAS.length - 1)];
    if (area) this.focusArea(area.levelId);
  }

  previousArea(): void {
    if (this.focusedIndex <= 0) this.returnToOverview();
    else {
      const area = JOURNEY_AREAS[this.focusedIndex - 1];
      if (area) this.focusArea(area.levelId);
    }
  }

  private moveCamera(x: number, y: number, zoom: number, animate = true): void {
    const camera = this.cameras.main;
    // Tween a shared centre/zoom value so rapid commands cannot stack camera effects.
    this.tweens.killTweensOf(camera);
    const duration = animate && !this.reducedMotion ? 1050 : 0;
    const destinationX = x - camera.width / 2;
    const destinationY = y - camera.height / 2;
    if (!duration) {
      camera.setZoom(zoom).centerOn(x, y);
      return;
    }
    this.tweens.add({ targets: camera, zoom, scrollX: destinationX, scrollY: destinationY,
      duration, ease: "Sine.inOut" });
  }

  private drawTerrain(): void {
    const ground = this.add.graphics().setDepth(DEPTH.background);
    ground.fillStyle(0xe4e5bd).fillRect(0, 0, MAP_SIZE.width, MAP_SIZE.height);
    ground.fillStyle(0xf2ead0).fillRect(0, 0, MAP_SIZE.width, 240);
    const hills = this.add.graphics().setDepth(DEPTH.distant).setScrollFactor(.97);
    for (let i = 0; i < 9; i++) {
      hills.fillStyle(i % 2 ? 0xbbcda8 : 0xcbd6b5, .8);
      hills.fillEllipse(i * 450, 250 + (i % 3) * 25, 920, 360);
    }
    const terrain = this.add.graphics().setDepth(DEPTH.midground);
    terrain.fillStyle(0xd0dbaa, .65);
    terrain.fillEllipse(650, 850, 1250, 1040);
    terrain.fillEllipse(2470, 990, 1550, 1110);
    terrain.fillStyle(0xeaddb3, .6).fillEllipse(1480, 1430, 1260, 610);
    const river = new Phaser.Curves.Spline([
      new Phaser.Math.Vector2(1050, 100), new Phaser.Math.Vector2(1020, 570),
      new Phaser.Math.Vector2(1080, 1020), new Phaser.Math.Vector2(940, 1500),
      new Phaser.Math.Vector2(1190, 1850)
    ]);
    const water = river.getPoints(110);
    terrain.lineStyle(68, 0xa5bc96, .6).strokePoints(water, false);
    terrain.lineStyle(46, 0x90beb7, 1).strokePoints(water, false);
    terrain.lineStyle(3, 0xd4e5c9, .9).strokePoints(water, false);

    // Seeded brush flecks: texture without shaders, external libraries or per-frame work.
    const rng = new Phaser.Math.RandomDataGenerator(["hanh-trinh-map-paper"]);
    for (let i = 0; i < 1600; i++) {
      terrain.fillStyle(i % 2 ? 0x889667 : 0xfff7d7, .12);
      terrain.fillEllipse(rng.between(0, 3200), rng.between(240, 1800), rng.between(2, 8), 2);
    }
    const vegetation = this.add.graphics().setDepth(DEPTH.foreground);
    for (let i = 0; i < 90; i++) {
      const x = rng.between(50, 3150);
      const y = rng.between(240, 1740);
      if (JOURNEY_AREAS.some((area) => Phaser.Math.Distance.Between(x, y, area.x, area.y) < 355)) continue;
      if (Math.abs(x - 1030) < 100) continue;
      vegetation.fillStyle(0x788755, .25).fillEllipse(x + 10, y + 40, 78, 25);
      vegetation.fillStyle(0x8f8059).fillRoundedRect(x - 5, y, 10, 42, 3);
      vegetation.fillStyle(i % 2 ? 0x79965f : 0x98ad71).fillEllipse(x, y - 12, 77, 82);
      vegetation.fillStyle(0xb9c68a, .65).fillEllipse(x - 15, y - 30, 39, 42);
    }
    for (let i = 0; i < 7; i++) {
      const shimmer = this.add.ellipse(1030 + Math.sin(i * 2) * 30, 360 + i * 210, 22, 3, 0xecf1d8, .6).setDepth(DEPTH.fx);
      if (!this.reducedMotion) this.tweens.add({ targets: shimmer, alpha: .15, x: shimmer.x + 12, duration: 1900 + i * 170, yoyo: true, repeat: -1 });
    }
  }

  private drawTrail(): void {
    const trail = new Phaser.Curves.Spline(JOURNEY_TRAIL.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    const points = trail.getPoints(260);
    const graphics = this.add.graphics().setDepth(DEPTH.foreground + 1);
    graphics.lineStyle(57, 0xbca679, .35).strokePoints(points, false);
    graphics.lineStyle(43, 0xe5c591, 1).strokePoints(points, false);
    graphics.lineStyle(24, 0xf3ddb0, .8).strokePoints(points, false);
    for (let i = 0; i < points.length; i += 5) {
      const point = points[i];
      if (point) graphics.fillStyle(0xbda573, .45).fillEllipse(point.x + 8, point.y + 3, 7, 3);
    }
    const bridge = this.add.graphics({ x: 1050, y: 670 }).setDepth(DEPTH.foreground + 2).setAngle(-10);
    bridge.fillStyle(0x987a52).fillRoundedRect(-67, -33, 134, 66, 5);
    for (let x = -62; x < 65; x += 13) bridge.fillStyle(0xceae79).fillRect(x, -30, 10, 60);
    bridge.lineStyle(5, 0x715b3e).lineBetween(-74, -38, 74, -38).lineBetween(-74, 38, 74, 38);
    this.add.text(135, 1585, "KHỞI HÀNH", { fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "30px", color: "#546749", fontStyle: "bold" }).setOrigin(.5).setDepth(DEPTH.labels);
    const start = this.add.graphics({ x: 140, y: 1520 }).setDepth(DEPTH.landmarks);
    start.lineStyle(9, 0x8e7650).lineBetween(-50, 0, -50, -115).lineBetween(50, 0, 50, -115);
    start.fillStyle(0xc19256).fillTriangle(-80, -108, 0, -150, 80, -108);
  }

  private drawArea(area: JourneyArea, index: number): void {
    const visuals: AreaVisual[] = [];
    const glow = this.add.circle(area.x, area.y, 255, area.accent, 0).setDepth(DEPTH.landmarks - 1);
    const asset = JOURNEY_MAP_ASSETS.landmarks[area.levelId];
    if (asset && this.textures.exists(asset.key)) {
      visuals.push(this.add.image(area.x, area.y, asset.key).setDisplaySize(590, 393).setDepth(DEPTH.landmarks));
    } else {
      const fallback = this.add.graphics({ x: area.x, y: area.y }).setDepth(DEPTH.landmarks);
      fallback.fillStyle(0xdfc68f).fillRoundedRect(-125, -90, 250, 180, 12);
      fallback.fillStyle(area.accent).fillTriangle(-145, -90, 0, -165, 145, -90);
      fallback.fillStyle(0x6a7855).fillRect(-30, 0, 60, 90);
      visuals.push(fallback);
    }
    const character = CHARACTERS.find((item) => item.id === area.characterId)!;
    const figure = CHARACTER_ASSETS[area.characterId].poses.master;
    if (figure && this.textures.exists(figure.key)) {
      visuals.push(this.add.image(area.x - 222, area.y + 185, figure.key).setOrigin(.5, 1).setDisplaySize(72, 108).setDepth(DEPTH.characters));
    }
    const sign = this.add.container(area.x, area.y + 205).setDepth(DEPTH.labels);
    const wood = this.add.graphics();
    wood.fillStyle(0x887047).fillRect(-155, 15, 10, 53).fillRect(145, 15, 10, 53);
    wood.fillStyle(0xf7e7bb).fillRoundedRect(-235, -33, 470, 88, 8);
    wood.lineStyle(3, 0xa58c5d).strokeRoundedRect(-235, -33, 470, 88, 8);
    wood.fillStyle(area.accent).fillTriangle(-222, -28, -183, -28, -222, 11);
    const name = this.add.text(0, -10, `${String(index + 1).padStart(2, "0")}  ${area.icon}  ${character.name}`, {
      fontFamily: "Segoe UI, sans-serif", fontSize: "32px", fontStyle: "bold", color: "#3f5140"
    }).setOrigin(.5);
    const title = this.add.text(0, 26, area.title, { fontFamily: "Segoe UI, sans-serif", fontSize: "25px", color: "#605b44" }).setOrigin(.5);
    sign.add([wood, name, title]);
    visuals.push(sign);
    const target = this.add.zone(area.x, area.y + 25, 590, 480).setDepth(DEPTH.labels + 1).setInteractive({ useHandCursor: true });
    target.on("pointerdown", () => this.handleAreaClick(area.levelId));
    const badge = this.add.text(area.x, area.y - 205, "", { fontFamily: "Segoe UI, sans-serif", fontSize: "22px", fontStyle: "bold", color: "#fff8df", backgroundColor: "#526a47", padding: { x: 11, y: 6 } }).setOrigin(.5).setDepth(DEPTH.labels + 2).setVisible(false);
    this.areaViews.set(area.levelId, { visuals, target, glow, badge });
    if (index === 4 || index === 6) {
      const pennant = this.add.triangle(area.x + 210, area.y - 45, 0, 0, 42, 12, 0, 28, area.accent).setOrigin(0, 0).setDepth(DEPTH.fx);
      if (!this.reducedMotion) this.tweens.add({ targets: pennant, scaleX: .8, angle: 4, duration: 1800 + index * 100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
  }

  private handleAreaClick(levelId: LevelId): void {
    if (this.journeyState.mode === "host" && this.journeyState.availableLevelId !== levelId && !this.journeyState.completedLevelIds.includes(levelId)) return;
    this.focusArea(levelId);
  }

  private applyJourneyState(): void {
    for (const [levelId, view] of this.areaViews) {
      this.tweens.killTweensOf(view.glow);
      view.glow.setAlpha(0).setScale(1);
      const completed = this.journeyState.completedLevelIds.includes(levelId);
      const available = this.journeyState.availableLevelId === levelId;
      const locked = this.journeyState.mode === "host" && !completed && !available;
      view.visuals.forEach((visual) => visual.setAlpha(locked ? .38 : 1));
      if (locked) view.target.disableInteractive();
      else view.target.setInteractive({ useHandCursor: true });
      view.badge.setVisible(this.journeyState.mode === "host");
      if (completed) view.badge.setText("✓ HOÀN THÀNH").setBackgroundColor("#4f7650");
      else if (available) {
        view.badge.setText("CHẶNG TIẾP THEO").setBackgroundColor("#9b6d2f");
        view.glow.setAlpha(.2);
        if (!this.reducedMotion) this.tweens.add({ targets: view.glow, alpha: .08, scale: 1.12, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      } else view.badge.setText("ĐANG KHÓA").setBackgroundColor("#777365");
    }
    this.applyAllianceCenterState();
  }

  private drawFinale(): void {
    const x = 2790, y = 1370;
    const visuals: AreaVisual[] = [];
    const glow = this.add.circle(x, y - 20, 250, 0xd5a94f, 0).setDepth(DEPTH.landmarks - 1);
    const platform = this.add.graphics({ x, y }).setDepth(DEPTH.landmarks);
    platform.fillStyle(0xc9b787).fillEllipse(0, 55, 440, 155);
    platform.fillStyle(0xf2e1b0).fillEllipse(0, 36, 420, 144);
    platform.lineStyle(4, 0xb89a66).strokeEllipse(0, 36, 390, 119);
    visuals.push(platform);
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 - Math.PI / 2;
      const petal = this.add.ellipse(x + Math.cos(angle) * 68, y - 53 + Math.sin(angle) * 68,
        38, 87, JOURNEY_AREAS[i]?.accent ?? 0x708057, .85).setRotation(angle + Math.PI / 2).setDepth(DEPTH.landmarks + 1);
      petal.setStrokeStyle(3, 0xfff5d6, .8);
      visuals.push(petal);
    }
    visuals.push(this.add.circle(x, y - 53, 23, 0xf9eac0).setDepth(DEPTH.landmarks + 2));
    visuals.push(this.add.text(x, y + 135, "TRUNG TÂM LIÊN MINH", { fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "32px", color: "#536449", fontStyle: "bold" }).setOrigin(.5).setDepth(DEPTH.labels));
    visuals.push(this.add.text(x, y + 178, "Bảy người đồng hành · Một hành trình", { fontFamily: "Segoe UI, sans-serif", fontSize: "23px", color: "#746e50" }).setOrigin(.5).setDepth(DEPTH.labels));
    const target = this.add.zone(x, y, 540, 430).setDepth(DEPTH.labels + 1);
    target.on("pointerdown", () => {
      if (isAllianceCenterUnlocked(this.journeyState.completedLevelIds)) this.focusAllianceCenter();
    });
    const badge = this.add.text(x, y - 195, "THU THẬP ĐỦ 7 MẢNH ĐỂ MỞ KHÓA", { fontFamily: "Segoe UI, sans-serif", fontSize: "19px", fontStyle: "bold", color: "#fff8df", backgroundColor: "#777365", padding: { x: 12, y: 7 } }).setOrigin(.5).setDepth(DEPTH.labels + 2).setVisible(false);
    this.allianceCenter = { visuals, target, glow, badge };
  }

  private applyAllianceCenterState(): void {
    const view = this.allianceCenter;
    if (!view) return;
    const unlocked = isAllianceCenterUnlocked(this.journeyState.completedLevelIds);
    this.tweens.killTweensOf(view.glow);
    view.glow.setAlpha(0).setScale(1);
    view.badge.setVisible(this.journeyState.mode === "host");
    view.visuals.forEach((visual) => visual.setAlpha(this.journeyState.mode === "host" && !unlocked ? .42 : 1));
    if (!unlocked) {
      view.target.disableInteractive();
      view.badge.setText("THU THẬP ĐỦ 7 MẢNH ĐỂ MỞ KHÓA").setBackgroundColor("#777365");
      return;
    }
    view.target.setInteractive({ useHandCursor: true });
    view.badge.setText("ĐÃ MỞ KHÓA · NHẤN ĐỂ KHÁM PHÁ").setBackgroundColor("#9b6d2f");
    view.glow.setAlpha(.22);
    if (!this.reducedMotion) this.tweens.add({ targets: view.glow, alpha: .08, scale: 1.12, duration: 1250, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  private focusAllianceCenter(): void {
    if (this.journeyState.mode === "host" && !isAllianceCenterUnlocked(this.journeyState.completedLevelIds)) return;
    this.focusedIndex = -1;
    this.moveCamera(2790, 1370, 1.18);
    this.bridge?.emit("map:focused", { levelId: null });
    this.bridge?.emit("map:centerFocused", { focused: true });
  }

  private drawAtmosphere(): void {
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.graphics({ x: 210 + i * 670, y: 65 + (i % 2) * 80 }).setDepth(DEPTH.distant + 1).setScrollFactor(.94);
      cloud.fillStyle(0xfff9e8, .72).fillEllipse(0, 0, 200, 48).fillEllipse(-42, -16, 89, 52).fillEllipse(30, -25, 106, 71);
      if (!this.reducedMotion) this.tweens.add({ targets: cloud, x: cloud.x + 65, duration: 16000 + i * 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
  }
}
