import Phaser from "phaser";
import type { CharacterId } from "@htlm/game-domain";
import type { LevelFiveBridge, LevelFiveSceneState } from "./level-five-bridge";
import { getLevelFiveSpawn, LEVEL_FIVE_CHECKPOINTS, LEVEL_FIVE_FINISH_X, LEVEL_FIVE_PLATFORMS, LEVEL_FIVE_WORLD } from "./level-five-map";
import { canTriggerCheckpoint, canTriggerFinish, isLevelFiveMovementLocked } from "./level-five-rules";

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

  constructor() { super("LevelFivePlatformerScene"); }

  preload(): void {
    const characterId = this.registry.get("levelFiveCharacterId") as CharacterId;
    this.load.image("level-five-player", `/characters/${characterId}-master.png`);
  }

  create(): void {
    this.bridge = this.registry.get("levelFiveBridge") as LevelFiveBridge;
    this.state = this.registry.get("levelFiveState") as LevelFiveSceneState;
    this.physics.world.setBounds(0, 0, LEVEL_FIVE_WORLD.width, LEVEL_FIVE_WORLD.height + 180);
    this.drawBackdrop();

    const platforms: Phaser.GameObjects.Rectangle[] = [];
    for (const shape of LEVEL_FIVE_PLATFORMS) {
      const platform = this.add.rectangle(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width, shape.height, 0x6f9b58)
        .setStrokeStyle(4, 0x496f43);
      this.physics.add.existing(platform, true);
      platforms.push(platform);
    }

    const checkpointZones: Array<{ index: 1 | 2 | 3 | 4 | 5; zone: Phaser.GameObjects.Zone }> = [];
    for (const checkpoint of LEVEL_FIVE_CHECKPOINTS) {
      this.add.rectangle(checkpoint.x, 540, 14, 180, 0xd08b3e).setStrokeStyle(3, 0x805126);
      this.add.text(checkpoint.x - 42, 430, `CỔNG ${checkpoint.index}`, { color: "#405b3e", fontFamily: "sans-serif", fontSize: "22px", fontStyle: "bold" });
      const zone = this.add.zone(checkpoint.x, 540, 70, 210);
      this.physics.add.existing(zone, true);
      checkpointZones.push({ index: checkpoint.index, zone });
    }

    const finishZone = this.add.zone(LEVEL_FIVE_FINISH_X, 530, 100, 240);
    this.physics.add.existing(finishZone, true);
    this.add.rectangle(LEVEL_FIVE_FINISH_X, 510, 18, 280, 0x375d49);
    this.add.triangle(LEVEL_FIVE_FINISH_X + 55, 405, 0, 0, 105, 30, 0, 60, 0xe98355).setOrigin(.5);
    this.add.text(LEVEL_FIVE_FINISH_X - 58, 355, "VỀ ĐÍCH", { color: "#375d49", fontFamily: "sans-serif", fontSize: "24px", fontStyle: "bold" });

    const spawn = getLevelFiveSpawn(this.state.checkpointProgress);
    this.player = this.physics.add.image(spawn.x, spawn.y, "level-five-player").setDisplaySize(74, 104).setCollideWorldBounds(false);
    this.player.setMaxVelocity(MOVE_SPEED, 900).setDragX(1_800);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(42, 88).setOffset(16, 12);
    for (const platform of platforms) this.physics.add.collider(this.player, platform);

    for (const checkpoint of checkpointZones) this.physics.add.overlap(this.player, checkpoint.zone, () => this.onCheckpoint(checkpoint.index));
    this.physics.add.overlap(this.player, finishZone, () => this.onFinish());

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    };
    this.cameras.main.setBounds(0, 0, LEVEL_FIVE_WORLD.width, LEVEL_FIVE_WORLD.height);
    this.cameras.main.startFollow(this.player, true, .09, .09);
    this.unsubscribeState = this.bridge.on("setState", (state) => { this.state = state; this.waitingForServer = false; });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.unsubscribeState?.(); this.unsubscribeState = null; });
    this.bridge.emit("ready", { scene: this.scene.key });
  }

  override update(): void {
    if (!this.player?.body) return;
    if (this.player.y > LEVEL_FIVE_WORLD.height + 90) this.respawn();
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
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.jump);
    if (grounded && jumpPressed) this.player.setVelocityY(-JUMP_SPEED);
    const moving = Math.abs(this.player.body.velocity.x) > 1;
    this.player.setDisplaySize(74 * (moving && grounded ? 1.02 : 1), 104 * (grounded ? .98 : 1.03));
  }

  private onCheckpoint(index: 1 | 2 | 3 | 4 | 5): void {
    if (!canTriggerCheckpoint(this.state, index, this.waitingForServer)) return;
    this.waitingForServer = true;
    this.player.setVelocity(0, 0);
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

  private drawBackdrop(): void {
    this.add.rectangle(LEVEL_FIVE_WORLD.width / 2, 360, LEVEL_FIVE_WORLD.width, 720, 0xdff2dd);
    for (let x = 80; x < LEVEL_FIVE_WORLD.width; x += 460) {
      this.add.circle(x, 160 + (x % 3) * 18, 52, 0xffffff, .72);
      this.add.circle(x + 55, 170 + (x % 3) * 18, 40, 0xffffff, .72);
    }
    for (let x = 0; x < LEVEL_FIVE_WORLD.width; x += 520) {
      this.add.triangle(x + 180, 610, 0, 220, 220, 0, 440, 220, 0xabc98b, .85);
      this.add.rectangle(x + 390, 605, 9, 90, 0x507c50);
      this.add.circle(x + 390, 530, 32, 0x6f9b58);
    }
    this.add.text(70, 500, "BẮT ĐẦU", { color: "#375d49", fontFamily: "sans-serif", fontSize: "26px", fontStyle: "bold" });
  }
}
