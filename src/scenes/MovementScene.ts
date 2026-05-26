import Phaser from 'phaser';

const TILE = 48;
const PLAYER_SPEED = 200;

// ── colors ───────────────────────────────────────────
const BG     = 0x1a2a1a;
const GRID   = 0x2a4a2a;
const PLAYER_FILL  = 0xffffff;
const PLAYER_STROKE = 0x90caf9;

interface PlacedObject {
  tileX: number;
  tileY: number;
  name: string;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
}

export class MovementScene extends Phaser.Scene {
  private wx = 0;
  private wy = 0;
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;
  private objects: PlacedObject[] = [];

  // virtual joystick
  private joyVisible = false;
  private joyBase!: Phaser.GameObjects.Arc;
  private joyThumb!: Phaser.GameObjects.Arc;
  private joyBaseX = 0;
  private joyBaseY = 0;
  private joyRadius = 60;
  private joyDX = 0;
  private joyDY = 0;

  constructor() { super({ key: 'MovementScene' }); }

  create(): void {
    const cam = this.cameras.main;
    const cx = cam.centerX;
    const cy = cam.centerY;

    // ── build textures ──────────────────────────────
    this.createBuildingTexture();

    // ── placed objects ──────────────────────────────
    this.addPlacedObject(4, 2, 'Kongsbakken vgs.');

    // ── player ──────────────────────────────────────
    this.player = this.add.rectangle(cx, cy, 12, 14, PLAYER_FILL);
    this.player.setStrokeStyle(2, PLAYER_STROKE);
    this.player.setDepth(10);

    // ── camera ──────────────────────────────────────
    cam.setBounds(-50000, -50000, 100000, 100000);
    cam.scrollX = 0;
    cam.scrollY = 0;

    // ── keyboard ────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();

    // ── HUD ─────────────────────────────────────────
    this.hudText = this.add.text(8, 8, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8e6c9',
      backgroundColor: '#00000088', padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // ── joystick ────────────────────────────────────
    this.joyBase = this.add.circle(0, 0, this.joyRadius, 0xffffff, 0.12);
    this.joyBase.setStrokeStyle(2, 0xffffff, 0.25);
    this.joyBase.setDepth(50).setVisible(false).setScrollFactor(0);

    this.joyThumb = this.add.circle(0, 0, 22, 0xffffff, 0.3);
    this.joyThumb.setStrokeStyle(2, 0xffffff, 0.5);
    this.joyThumb.setDepth(51).setVisible(false).setScrollFactor(0);

    this.setupTouch();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    if (this.joyVisible) { vx = this.joyDX; vy = this.joyDY; }

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 1) { vx /= len; vy /= len; }
    }

    this.wx += vx * PLAYER_SPEED * dt;
    this.wy += vy * PLAYER_SPEED * dt;

    const cam = this.cameras.main;
    cam.scrollX = this.wx - cam.centerX;
    cam.scrollY = this.wy - cam.centerY;

    // ── draw grid ────────────────────────────────────
    this.drawGrid();

    // ── collision with buildings ─────────────────────
    this.applyObjectCollision();

    // ── proximity labels ─────────────────────────────
    this.updateProximityLabels();

    // ── HUD ──────────────────────────────────────────
    const tileCol = Math.floor(this.wx / TILE);
    const tileRow = Math.floor(this.wy / TILE);
    this.hudText.setText([
      `pos  (${Math.round(this.wx)}, ${Math.round(this.wy)})`,
      `tile (${tileCol}, ${tileRow})`,
      `${this.joyVisible ? '(touch)' : '(keyboard)'}`,
    ].join('\n'));
  }

  // ── pixel-art building generator ────────────────────

  private createBuildingTexture(): void {
    const W = 32;
    const H = 32;
    const g = this.add.graphics();

    // roof — dark grey triangle
    g.fillStyle(0x4a3a3a, 1);
    g.fillTriangle(W / 2, 1, 1, 8, W - 1, 8);

    // main facade — warm brick red
    g.fillStyle(0x8b4a3a, 1);
    g.fillRect(2, 8, W - 4, 20);

    // horizontal bands (architectural detail)
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(2, 16, W - 4, 2);
    g.fillRect(2, 24, W - 4, 1);

    // windows — yellow lit
    const winW = 4;
    const winH = 4;
    const cols = [6, 13, 20]; // 3 columns of windows
    const rows = [10, 18];

    g.fillStyle(0xffecb3, 0.9);
    for (const r of rows) {
      for (const c of cols) {
        g.fillRect(c, r, winW, winH);
        // window frame
        g.lineStyle(1, 0x5d3a2a, 0.8);
        g.strokeRect(c, r, winW, winH);
      }
    }

    // door — bottom center
    g.fillStyle(0x4a3020, 1);
    g.fillRect(13, 22, 6, 6);
    g.lineStyle(1, 0x3a2010, 1);
    g.strokeRect(13, 22, 6, 6);

    // door knob
    g.fillStyle(0xd4a84b, 1);
    g.fillCircle(17.5, 25, 0.8);

    // base
    g.fillStyle(0x5a4a3a, 1);
    g.fillRect(1, 28, W - 2, 2);

    // ── convert to texture ──────────────────────────
    g.generateTexture('kongsbakken', W, H);
    g.destroy();
  }

  // ── placed objects ──────────────────────────────────

  private addPlacedObject(tileX: number, tileY: number, name: string): void {
    const wx = (tileX + 0.5) * TILE;
    const wy = (tileY + 0.5) * TILE;

    const sprite = this.add.sprite(wx, wy, 'kongsbakken');
    sprite.setOrigin(0.5, 0.8); // anchor near bottom
    sprite.setScale(1.5);       // scale up from 32px to 48px
    sprite.setDepth(5);

    const label = this.add.text(wx, wy - 28, name, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
      backgroundColor: '#000000aa', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(6).setVisible(false);

    this.objects.push({ tileX, tileY, name, sprite, label });
  }

  // ── collision ───────────────────────────────────────

  private applyObjectCollision(): void {
    const pw = 10; // player half-size
    const ph = 12;
    const bw = 18; // building half-size
    const bh = 20;

    for (const obj of this.objects) {
      const bx = (obj.tileX + 0.5) * TILE;
      const by = (obj.tileY + 0.5) * TILE;

      // AABB overlap
      const overlapX = (pw + bw) - Math.abs(this.wx - bx);
      const overlapY = (ph + bh) - Math.abs(this.wy - by);

      if (overlapX > 0 && overlapY > 0) {
        // push out along shallowest axis
        if (overlapX < overlapY) {
          this.wx += (this.wx < bx ? -1 : 1) * overlapX;
        } else {
          this.wy += (this.wy < by ? -1 : 1) * overlapY;
        }
      }
    }
  }

  // ── proximity ───────────────────────────────────────

  private updateProximityLabels(): void {
    for (const obj of this.objects) {
      const bx = (obj.tileX + 0.5) * TILE;
      const by = (obj.tileY + 0.5) * TILE;
      const dx = this.wx - bx;
      const dy = this.wy - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      obj.label.setVisible(dist < 50);
    }
  }

  // ── grid ────────────────────────────────────────────

  private gridGfx: Phaser.GameObjects.Graphics | null = null;

  private drawGrid(): void {
    if (this.gridGfx) this.gridGfx.destroy();
    const g = this.add.graphics();
    g.setDepth(-1);

    const cam = this.cameras.main;
    const x0 = cam.scrollX;
    const y0 = cam.scrollY;
    const W = cam.width;
    const H = cam.height;

    g.fillStyle(BG, 1);
    g.fillRect(x0, y0, W, H);

    g.lineStyle(1, GRID, 0.5);
    const sc = Math.floor(x0 / TILE) - 1;
    const ec = Math.ceil((x0 + W) / TILE) + 1;
    const sr = Math.floor(y0 / TILE) - 1;
    const er = Math.ceil((y0 + H) / TILE) + 1;

    for (let c = sc; c <= ec; c++) {
      const x = c * TILE;
      g.beginPath(); g.moveTo(x, sr * TILE); g.lineTo(x, er * TILE); g.strokePath();
    }
    for (let r = sr; r <= er; r++) {
      const y = r * TILE;
      g.beginPath(); g.moveTo(sc * TILE, y); g.lineTo(ec * TILE, y); g.strokePath();
    }
    this.gridGfx = g;
  }

  // ── joystick ────────────────────────────────────────

  private setupTouch(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;
      if (p.x < W * 0.5 && p.y > H * 0.4) {
        this.joyBaseX = p.x; this.joyBaseY = p.y;
        this.joyBase.setPosition(p.x, p.y).setVisible(true);
        this.joyThumb.setPosition(p.x, p.y).setVisible(true);
        this.joyVisible = true;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.joyVisible || !p.isDown) return;
      const dx = p.x - this.joyBaseX;
      const dy = p.y - this.joyBaseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampR = Math.min(dist, this.joyRadius);
      const angle = Math.atan2(dy, dx);
      this.joyThumb.setPosition(
        this.joyBaseX + Math.cos(angle) * clampR,
        this.joyBaseY + Math.sin(angle) * clampR,
      );
      if (dist > 8) {
        const s = Math.min(dist / this.joyRadius, 1);
        this.joyDX = Math.cos(angle) * s;
        this.joyDY = Math.sin(angle) * s;
      } else { this.joyDX = 0; this.joyDY = 0; }
    });
    this.input.on('pointerup', () => {
      this.joyVisible = false; this.joyDX = 0; this.joyDY = 0;
      this.joyBase.setVisible(false); this.joyThumb.setVisible(false);
    });
  }
}
