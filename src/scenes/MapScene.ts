import Phaser from 'phaser';
import { TILE_MAP, MAP_COLS, MAP_ROWS } from '../data/map';
import { VENUES, Venue } from '../data/venues';

const TILE = 30;                          // pixels per tile
const MAP_W = MAP_COLS * TILE;            // 480
const MAP_H = MAP_ROWS * TILE;            // 960
const PLAYER_SPEED = 140;

// ── color palette ────────────────────────────────────
const C_WATER_DEEP  = 0x0a1a2f;
const C_WATER_SHORE = 0x0d2544;
const C_LAND         = 0x3a5a3a;
const C_LAND_URBAN   = 0x4a6a4a;
const C_MAINLAND      = 0x2e4a2e;
const C_BRIDGE         = 0x6a7a7a;

export class MapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private venueDots: Phaser.GameObjects.Arc[] = [];
  private venueLabels: Phaser.GameObjects.Text[] = [];
  private hudText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'MapScene' }); }

  create(): void {
    // ── draw tilemap ────────────────────────────────
    this.drawTilemap();

    // ── venues ──────────────────────────────────────
    this.drawVenues();

    // ── player (spawn in sentrum) ───────────────────
    const spawnX = 9.5 * TILE;
    const spawnY = 15 * TILE;
    this.player = this.add.rectangle(spawnX, spawnY, 12, 14, 0xffffff);
    this.player.setStrokeStyle(2, 0x90caf9);
    this.player.setDepth(10);

    // ── camera ──────────────────────────────────────
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // ── input ───────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ── hud ─────────────────────────────────────────
    this.hudText = this.add.text(4, 4, 'Walk around Tromsø! Arrow keys.', {
      fontFamily: 'monospace', fontSize: '12px', color: '#fff',
      backgroundColor: '#00000088', padding: { x: 5, y: 2 },
    }).setScrollFactor(0).setDepth(100);
  }

  update(_time: number, delta: number): void {
    this.handleMovement(delta);
    this.checkVenueProximity();
  }

  // ── tilemap rendering ──────────────────────────────

  private drawTilemap(): void {
    const g = this.add.graphics();
    g.setDepth(-1);

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = TILE_MAP[row][col];
        const x = col * TILE;
        const y = row * TILE;

        switch (tile) {
          case 0: // deep water
            g.fillStyle(C_WATER_DEEP, 1);
            break;
          case 1: { // land — urban in the center rows, greener elsewhere
            const isUrban = row >= 10 && row <= 18 && col >= 6 && col <= 11;
            g.fillStyle(isUrban ? C_LAND_URBAN : C_LAND, 1);
            break;
          }
          case 2: // mainland
            g.fillStyle(C_MAINLAND, 1);
            break;
          case 3: // bridge
            g.fillStyle(C_BRIDGE, 1);
            break;
        }
        g.fillRect(x, y, TILE, TILE);

        // subtle grid lines
        g.lineStyle(1, 0x000000, 0.12);
        g.strokeRect(x, y, TILE, TILE);
      }
    }

    // ── labels ───────────────────────────────────────
    this.add.text(9.5 * TILE, 14.5 * TILE, 'Sentrum', {
      fontFamily: 'monospace', fontSize: '11px', color: '#c8e6c9',
      backgroundColor: '#00000055', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(1);

    // Bridge label
    const bl = this.add.text(12.5 * TILE, 14 * TILE, 'Tromsø-\nbrua', {
      fontFamily: 'monospace', fontSize: '9px', color: '#cfd8dc',
      backgroundColor: '#00000055', padding: { x: 2, y: 1 },
      align: 'center',
    }).setOrigin(0.5).setDepth(1);
    bl.setAngle(-30);

    // Mainland / cathedral
    this.add.text(13.5 * TILE, 14 * TILE, 'Ishavs-\nkatedralen', {
      fontFamily: 'monospace', fontSize: '9px', color: '#bcaaa4',
      backgroundColor: '#00000044', padding: { x: 2, y: 1 },
      align: 'center',
    }).setOrigin(0.5).setDepth(1);

    // Compass
    const cx = 15.5 * TILE;
    const cy = 2 * TILE;
    const cg = this.add.graphics().setDepth(5);
    cg.fillStyle(0xffffff, 0.7);
    cg.fillTriangle(cx, cy - 14, cx - 5, cy, cx + 5, cy);
    this.add.text(cx, cy + 4, 'N', {
      fontFamily: 'monospace', fontSize: '9px', color: '#fff',
    }).setOrigin(0.5).setDepth(5);
  }

  // ── venues ─────────────────────────────────────────

  private drawVenues(): void {
    for (const v of VENUES) {
      const px = (v.tileX + 0.5) * TILE;
      const py = (v.tileY + 0.5) * TILE;
      const dot = this.add.circle(px, py, 4, v.color);
      dot.setStrokeStyle(1.5, 0xffffff);
      dot.setDepth(3);
      this.venueDots.push(dot);

      const lbl = this.add.text(px, py - 8, v.name, {
        fontFamily: 'monospace', fontSize: '8px', color: '#ffffff',
        backgroundColor: '#000000aa', padding: { x: 2, y: 1 },
      }).setOrigin(0.5, 1).setDepth(4);
      this.venueLabels.push(lbl);
    }
  }

  // ── movement + water collision ─────────────────────

  private handleMovement(delta: number): void {
    const dt = delta / 1000;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }

    const nx = this.player.x + vx * dt;
    const ny = this.player.y + vy * dt;

    // water collision — check each axis independently for wall-sliding
    if (this.isWalkable(nx, this.player.y)) {
      this.player.x = nx;
    }
    if (this.isWalkable(this.player.x, ny)) {
      this.player.y = ny;
    }

    // world clamp
    this.player.x = Phaser.Math.Clamp(this.player.x, 8, MAP_W - 8);
    this.player.y = Phaser.Math.Clamp(this.player.y, 8, MAP_H - 8);
  }

  private isWalkable(px: number, py: number): boolean {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;
    const tile = TILE_MAP[row][col];
    return tile === 1 || tile === 2 || tile === 3; // land, mainland, bridge
  }

  // ── venue proximity ────────────────────────────────

  private nearVenue: Venue | null = null;

  private checkVenueProximity(): void {
    this.nearVenue = null;
    for (const v of VENUES) {
      const dx = this.player.x - (v.tileX + 0.5) * TILE;
      const dy = this.player.y - (v.tileY + 0.5) * TILE;
      if (dx * dx + dy * dy < 22 * 22) {
        this.nearVenue = v;
        break;
      }
    }
    if (this.nearVenue) {
      this.hudText.setText(`📍 ${this.nearVenue.name} — press SPACE`);
    } else {
      this.hudText.setText('Walk around Tromsø! Arrow keys.');
    }
  }
}
