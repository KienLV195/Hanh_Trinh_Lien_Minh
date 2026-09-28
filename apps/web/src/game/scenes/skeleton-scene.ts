import Phaser from "phaser";
import type { GameBridge } from "../game-bridge";

export class SkeletonScene extends Phaser.Scene {
  constructor() {
    super("SkeletonScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x173e3a, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x2f766f, 1);
    graphics.fillEllipse(width * 0.72, height * 0.82, width * 0.8, height * 0.52);
    graphics.fillStyle(0x5b9c75, 1);
    graphics.fillEllipse(width * 0.25, height * 0.9, width * 0.85, height * 0.48);

    this.add
      .text(width / 2, height * 0.42, "HÀNH TRÌNH LIÊN MINH", {
        color: "#f6edcf",
        fontFamily: "Segoe UI, Arial, sans-serif",
        fontSize: "48px",
        fontStyle: "bold",
        align: "center"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.53, "PHASER READY", {
        color: "#c7e5d7",
        fontFamily: "Segoe UI, Arial, sans-serif",
        fontSize: "22px",
        letterSpacing: 5
      })
      .setOrigin(0.5);

    const marker = this.add.circle(width * 0.32, height * 0.7, 13, 0xf0aa4d);
    this.tweens.add({
      targets: marker,
      x: width * 0.68,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });

    const bridge = this.registry.get("gameBridge") as GameBridge | undefined;
    bridge?.emit("phaser:ready", { scene: this.scene.key });
  }
}
