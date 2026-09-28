import Phaser from "phaser";

export class CorePreloadScene extends Phaser.Scene {
  constructor() {
    super("CorePreloadScene");
  }

  create(): void {
    this.scene.start((this.registry.get("entryScene") as string | undefined) ?? "SkeletonScene");
  }
}
