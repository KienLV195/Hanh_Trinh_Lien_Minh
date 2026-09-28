import Phaser from "phaser";
import type { CharacterId } from "@htlm/game-domain";
import type { LevelFiveBridge, LevelFiveSceneState } from "./level-five-bridge";
import {
  getLevelFiveSpawn,
  LEVEL_FIVE_CHECKPOINTS,
  LEVEL_FIVE_FINISH_X,
  LEVEL_FIVE_PLATFORMS,
  LEVEL_FIVE_WORLD
} from "./level-five-map";
import {
  canTriggerCheckpoint,
  canTriggerFinish,
  isLevelFiveMovementLocked
} from "./level-five-rules";
import {
  createGate,
  drawStorybookWorld,
  leafBurst,
  updateGate,
  type StoryGate
} from "./level-five-art";

const MOVE_SPEED = 300;
const MOVE_ACCELERATION = 1_650;
const JUMP_SPEED = 610;

export class LevelFivePlatformerScene extends Phaser.Scene {
  private bridge!: LevelFiveBridge;
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<"left" | "right" | "jump", Phaser.Input.Keyboard.Key>;
  private state!: LevelFiveSceneState;
  private waitingForServer = false;
  private unsubscribeState: (() => void) | null = null;
  private portrait!: Phaser.GameObjects.Image;
  private portraitScale = 1;
  private gates: StoryGate[] = [];
  private finishGate!: StoryGate;
  private wasGrounded = false;
  private landUntil = 0;
  private happyUntil = 0;
  private shadow!: Phaser.GameObjects.Ellipse;

  constructor() {
    super("LevelFivePlatformerScene");
  }

  preload(): void {
    const characterId = this.registry.get("levelFiveCharacterId") as CharacterId;
    this.load.image("level-five-player", `/characters/${characterId}-master.png`);
  }

  create(): void {
    this.bridge = this.registry.get("levelFiveBridge") as LevelFiveBridge;
    this.state = this.registry.get("levelFiveState") as LevelFiveSceneState;
    this.physics.world.setBounds(0, 0, LEVEL_FIVE_WORLD.width, LEVEL_FIVE_WORLD.height + 180);
    drawStorybookWorld(this);

    const platforms: Phaser.GameObjects.Rectangle[] = [];
    for (const shape of LEVEL_FIVE_PLATFORMS) {
      const platform = this.add
        .rectangle(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width, shape.height)
        .setVisible(false);
      this.physics.add.existing(platform, true);
      platforms.push(platform);
    }

    const checkpointZones: Array<{ index: 1 | 2 | 3 | 4 | 5; zone: Phaser.GameObjects.Zone }> = [];
    for (const checkpoint of LEVEL_FIVE_CHECKPOINTS) {
      const floor = LEVEL_FIVE_PLATFORMS.find(
        (p) => checkpoint.x >= p.x && checkpoint.x <= p.x + p.width
      )!.y;
      this.gates.push(createGate(this, checkpoint.x, floor, `CÂU ${checkpoint.index}`));
      const zone = this.add.zone(checkpoint.x, 540, 70, 210);
      this.physics.add.existing(zone, true);
      checkpointZones.push({ index: checkpoint.index, zone });
    }

    const finishZone = this.add.zone(LEVEL_FIVE_FINISH_X, 530, 100, 240);
    this.physics.add.existing(finishZone, true);
    this.finishGate = createGate(this, LEVEL_FIVE_FINISH_X, 650, "ĐÍCH ĐẾN LIÊN MINH", true);

    const spawn = getLevelFiveSpawn(this.state.checkpointProgress);
    this.player = this.physics.add
      .image(spawn.x, spawn.y, "level-five-player")
      .setDisplaySize(74, 104)
      .setCollideWorldBounds(false);
    this.player.setMaxVelocity(MOVE_SPEED, 900).setDragX(1_800);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(42, 88).setOffset(16, 12);
    // Keep the Phase 1 collision image unchanged; animate an independent portrait.
    this.player.setVisible(false);
    this.createPortrait();
    this.shadow = this.add.ellipse(spawn.x, spawn.y, 45, 10, 0x3f6246, 0.16).setDepth(3);
    for (const platform of platforms) this.physics.add.collider(this.player, platform);

    for (const checkpoint of checkpointZones)
      this.physics.add.overlap(this.player, checkpoint.zone, () =>
        this.onCheckpoint(checkpoint.index)
      );
    this.physics.add.overlap(this.player, finishZone, () => this.onFinish());

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    };
    this.cameras.main.setBounds(0, 0, LEVEL_FIVE_WORLD.width, LEVEL_FIVE_WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(100, 80).setFollowOffset(-120, 0);
    this.refreshGates();
    this.unsubscribeState = this.bridge.on("setState", (state) => this.applyState(state));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeState?.();
      this.unsubscribeState = null;
      this.input.keyboard?.removeAllKeys(true);
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.gates = [];
    });
    this.bridge.emit("ready", { scene: this.scene.key });
  }

  override update(time: number): void {
    if (!this.player?.body) return;
    if (this.player.y > LEVEL_FIVE_WORLD.height + 90) this.respawn();
    this.animatePortrait(time);
    const locked = isLevelFiveMovementLocked(this.state, this.waitingForServer);
    if (locked) {
      this.player.setVelocityX(0).setAccelerationX(0);
      return;
    }
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    if (left === right) this.player.setAccelerationX(0);
    else {
      this.player.setAccelerationX(left ? -MOVE_ACCELERATION : MOVE_ACCELERATION);
      this.player.setFlipX(left);
    }
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump);
    if (grounded && jumpPressed) this.player.setVelocityY(-JUMP_SPEED);
    // Preserve Phase 1's collision-image scale, independently of the portrait.
    const moving = Math.abs(this.player.body.velocity.x) > 1;
    this.player.setDisplaySize(
      74 * (moving && grounded ? 1.02 : 1),
      104 * (grounded ? 0.98 : 1.03)
    );
  }

  private onCheckpoint(index: 1 | 2 | 3 | 4 | 5): void {
    if (!canTriggerCheckpoint(this.state, index, this.waitingForServer)) return;
    this.waitingForServer = true;
    this.player.setVelocity(0, 0);
    const sign = this.gates[index - 1]!.sign;
    this.tweens.add({ targets: sign, angle: 4, duration: 140, yoyo: true, repeat: 1 });
    this.bridge.emit("checkpointReached", { checkpointIndex: index });
  }

  private onFinish(): void {
    if (!canTriggerFinish(this.state, this.waitingForServer)) return;
    this.waitingForServer = true;
    this.player.setVelocity(0, 0);
    this.bridge.emit("finishReached", {});
  }

  private respawn(): void {
    const spawn = getLevelFiveSpawn(this.state.checkpointProgress);
    this.player.setPosition(spawn.x, spawn.y).setVelocity(0, 0);
  }

  private createPortrait(): void {
    const texture = this.textures.get("level-five-player");
    const source = texture.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, source.width, source.height).data;
    let top = source.height,
      bottom = 0,
      left = source.width,
      right = 0;
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        if (pixels[(y * source.width + x) * 4 + 3]! < 24) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    if (bottom <= top) {
      top = 0;
      bottom = source.height - 1;
      left = 0;
      right = source.width - 1;
    }
    texture.add("portrait", 0, left, top, right - left + 1, bottom - top + 1);
    this.portraitScale = 112 / (bottom - top + 1);
    this.portrait = this.add
      .image(this.player.x, this.player.y, "level-five-player", "portrait")
      .setOrigin(0.5, 1)
      .setScale(this.portraitScale)
      .setDepth(5);
  }

  private animatePortrait(time: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    const running = grounded && Math.abs(body.velocity.x) > 15;
    if (grounded && !this.wasGrounded) {
      this.landUntil = time + 130;
      if (body.x > 150) leafBurst(this, body.center.x, body.bottom, 4);
    }
    this.wasGrounded = grounded;
    let bob = grounded ? Math.sin(time / 520) * 0.6 : 0,
      sx = 1,
      sy = 1,
      angle = 0;
    if (running) {
      bob = Math.abs(Math.sin(time / 85)) * 2;
      angle = Math.sin(time / 85) * 1.4;
      sx = 1.01;
      sy = 0.99;
    }
    if (!grounded) {
      sy = body.velocity.y < 0 ? 1.035 : 1.01;
      sx = 0.985;
    }
    if (time < this.landUntil) {
      sx = 1.035;
      sy = 0.965;
    }
    if (time < this.happyUntil) {
      bob = Math.sin(((this.happyUntil - time) / 550) * Math.PI) * 15;
      angle = Math.sin(time / 90) * 3;
    }
    this.portrait
      .setPosition(body.center.x, body.bottom - bob)
      .setScale(this.portraitScale * sx, this.portraitScale * sy)
      .setAngle(angle)
      .setFlipX(this.player.flipX);
    this.shadow.setPosition(body.center.x, body.bottom + 2).setVisible(grounded);
  }

  private refreshGates(): void {
    this.gates.forEach((gate, i) =>
      updateGate(
        this,
        gate,
        i < this.state.checkpointProgress
          ? "completed"
          : i === this.state.checkpointProgress
            ? "current"
            : "locked"
      )
    );
    updateGate(
      this,
      this.finishGate,
      this.state.mode === "finished"
        ? "completed"
        : this.state.checkpointProgress === 5
          ? "current"
          : "locked"
    );
    if (this.state.mode !== "finished") this.finishGate.emblem.setText("✦");
  }

  private applyState(state: LevelFiveSceneState): void {
    const previous = this.state;
    this.state = state;
    this.waitingForServer = false;
    this.refreshGates();
    if (state.checkpointProgress > previous.checkpointProgress) {
      const gate = this.gates[state.checkpointProgress - 1]!;
      leafBurst(this, gate.root.x, gate.root.y - 90);
      this.happyUntil = this.time.now + 550;
      const score = this.add
        .text(gate.root.x, gate.root.y - 115, "+20", {
          fontFamily: "Georgia, serif",
          fontSize: "29px",
          fontStyle: "bold",
          color: "#426c44",
          stroke: "#fff3c9",
          strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(10);
      this.tweens.add({
        targets: score,
        y: score.y - 42,
        alpha: 0,
        duration: 850,
        onComplete: () => score.destroy()
      });
    }
    if (state.mode === "retry_cooldown" && state.retryAvailableAt !== previous.retryAvailableAt) {
      const gate = this.gates[state.checkpointProgress];
      if (gate) {
        this.tweens.add({ targets: gate.sign, angle: -4, duration: 85, yoyo: true, repeat: 2 });
        const feedback = this.add
          .text(gate.root.x, gate.root.y - 94, "Thử lại", {
            fontSize: "17px",
            color: "#995537",
            backgroundColor: "#fff2d9"
          })
          .setOrigin(0.5)
          .setDepth(10);
        this.tweens.add({
          targets: feedback,
          alpha: 0,
          duration: 800,
          onComplete: () => feedback.destroy()
        });
      }
    }
    if (state.mode === "finished" && previous.mode !== "finished") {
      this.happyUntil = this.time.now + 550;
      leafBurst(this, LEVEL_FIVE_FINISH_X, 460, 24);
    }
  }
}
