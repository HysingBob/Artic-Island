import Phaser from 'phaser';

const TILE = 48;
const PAN_SPEED = 250;

// ── colors ───────────────────────────────────────────
const BG   = 0x1a2a1a;
const GRID = 0x2a4a2a;

interface PlacedObject {
  tileX: number;
  tileY: number;
  name: string;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
}

export class MovementScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;
  private objects: PlacedObject[] = [];

  // camera world position
  private camWX = 0;
  private camWY = 0;

  // drag-to-pan
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartCamX = 0;
  private dragStartCamY = 0;

  constructor() { super({ key: 'MovementScene' }); }

  create(): void {
    // ── textures ────────────────────────────────────
    this.createBuildingTexture();

    // ── placed objects ──────────────────────────────
    this.addPlacedObject(4, 2, 'Kongsbakken vgs.');

    // ── camera ──────────────────────────────────────
    const cam = this.cameras.main;
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

    // ── touch drag-to-pan ───────────────────────────
    this.setupTouch();

    // ── scroll wheel zoom (desktop) ─────────────────
    this.input.on('wheel', (_pointer: never, _gos: never, _dx: number, dy: number) => {
      // placeholder — zoom can come later
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // ── keyboard pan ────────────────────────────────
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 1) { vx /= len; vy /= len; }
      this.camWX += vx * PAN_SPEED * dt;
      this.camWY += vy * PAN_SPEED * dt;
    }

    // ── move camera ─────────────────────────────────
    const cam = this.cameras.main;
    cam.scrollX = this.camWX - cam.centerX;
    cam.scrollY = this.camWY - cam.centerY;

    // ── draw grid ────────────────────────────────────
    this.drawGrid();

    // ── HUD ──────────────────────────────────────────
    const col = Math.floor(this.camWX / TILE);
    const row = Math.floor(this.camWY / TILE);
    this.hudText.setText([
      `pos  (${Math.round(this.camWX)}, ${Math.round(this.camWY)})`,
      `tile (${col}, ${row})`,
      this.dragging ? '(dragging)' : '(keyboard)',
    ].join('\n'));
  }

  // ── building texture (via canvas, never on display list) ──

  private createBuildingTexture(): void {
    const W = 32, H = 32;
    const canvas = this.textures.createCanvas('kongsbakken', W, H)!;
    const ctx = canvas.getContext();

    ctx.fillStyle = '#4a3a3a';
    ctx.beginPath();
    ctx.moveTo(W / 2, 1);
    ctx.lineTo(1, 8);
    ctx.lineTo(W - 1, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8b4a3a';
    ctx.fillRect(2, 8, W - 4, 20);

    ctx.fillStyle = '#6b3a2a';
    ctx.fillRect(2, 16, W - 4, 2);
    ctx.fillRect(2, 24, W - 4, 1);

    ctx.fillStyle = '#ffecb3';
    [6, 13, 20].forEach(c => {
      [10, 18].forEach(r => {
        ctx.fillRect(c, r, 4, 4);
        ctx.strokeStyle = '#5d3a2a';
        ctx.lineWidth = 1;
        ctx.strokeRect(c, r, 4, 4);
      });
    });

    ctx.fillStyle = '#4a3020';
    ctx.fillRect(13, 22, 6, 6);
    ctx.strokeStyle = '#3a2010';
    ctx.strokeRect(13, 22, 6, 6);

    ctx.fillStyle = '#d4a84b';
    ctx.beginPath();
    ctx.arc(17.5, 25, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(1, 28, W - 2, 2);

    canvas.refresh();
  }

  // ── placed objects ──────────────────────────────────

  private addPlacedObject(tileX: number, tileY: number, name: string): void {
    const wx = (tileX + 0.5) * TILE;
    const wy = (tileY + 0.5) * TILE;

    const sprite = this.add.sprite(wx, wy, 'kongsbakken');
    sprite.setOrigin(0.5, 0.8);
    sprite.setScale(1.5);
    sprite.setDepth(5);

    this.add.text(wx, wy - 28, name, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(6);

    this.objects.push({ tileX, tileY, name, sprite, label: null! });
  }

  // ── grid ────────────────────────────────────────────

  private gridGfx: Phaser.GameObjects.Graphics | null = null;

  private drawGrid(): void {
    if (this.gridGfx) this.gridGfx.destroy();
    const g = this.add.graphics();
    g.setDepth(-1);

    const cam = this.cameras.main;
    const x0 = cam.scrollX, y0 = cam.scrollY;
    const W = cam.width, H = cam.height;

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

  // ── drag-to-pan (anywhere on screen) ────────────────

  private setupTouch(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartX = p.x;
      this.dragStartY = p.y;
      this.dragStartCamX = this.camWX;
      this.dragStartCamY = this.camWY;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;
      // invert: dragging finger right → map moves right (camera moves left)
      this.camWX = this.dragStartCamX - dx;
      this.camWY = this.dragStartCamY - dy;
    });

    this.input.on('pointerup', () => {
      this.dragging = false;
    });
  }
}
