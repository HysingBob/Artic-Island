import Phaser from 'phaser';

const TILE = 48;
const BASE_SPEED = 200;
const MAX_SPEED = 500;

const BG   = 0x1a2a1a;
const GRID = 0x2a4a2a;

interface PlacedObject {
  tileX: number;
  tileY: number;
  name: string;
  sprite: Phaser.GameObjects.Sprite;
}

export class MovementScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;
  private objects: PlacedObject[] = [];

  // camera world position (where the center cursor points)
  private camWX = 0;
  private camWY = 0;

  // touch steering
  private touching = false;
  private steerDX = 0;
  private steerDY = 0;   // -1..1 direction from center

  constructor() { super({ key: 'MovementScene' }); }

  create(): void {
    // ── textures ────────────────────────────────────
    this.createBuildingTexture();

    // ── placed objects ──────────────────────────────
    this.addPlacedObject(4, 2, 'Kongsbakken vgs.');

    // ── center cursor (fixed to screen) ─────────────
    const cam = this.cameras.main;
    const cursor = this.add.circle(cam.centerX, cam.centerY, 20, 0xffffff, 0.15);
    cursor.setStrokeStyle(2, 0xffffff, 0.4);
    cursor.setDepth(100).setScrollFactor(0);

    // inner dot
    this.add.circle(cam.centerX, cam.centerY, 4, 0xffffff, 0.35)
      .setDepth(101).setScrollFactor(0);

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

    // ── touch steering ──────────────────────────────
    this.setupTouch();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    let vx = 0, vy = 0;

    // keyboard
    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    // touch steering overrides keyboard
    if (this.touching) {
      vx = this.steerDX;
      vy = this.steerDY;
    }

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      const speed = BASE_SPEED + (len - 0.15) * (MAX_SPEED - BASE_SPEED); // further = faster
      vx = (vx / len) * Math.min(len, 1); // clamp direction but keep speed scaling
      this.camWX += vx * speed * dt;
      this.camWY += vy * speed * dt;
    }

    const cam = this.cameras.main;
    cam.scrollX = this.camWX - cam.centerX;
    cam.scrollY = this.camWY - cam.centerY;

    this.drawGrid();

    const col = Math.floor(this.camWX / TILE);
    const row = Math.floor(this.camWY / TILE);
    this.hudText.setText([
      `pos  (${Math.round(this.camWX)}, ${Math.round(this.camWY)})`,
      `tile (${col}, ${row})`,
      this.touching ? '(steering)' : '(keyboard)',
    ].join('\n'));
  }

  // ── building texture ────────────────────────────────

  private createBuildingTexture(): void {
    const W = 32, H = 32;
    const canvas = this.textures.createCanvas('kongsbakken', W, H)!;
    const ctx = canvas.getContext();

    ctx.fillStyle = '#4a3a3a';
    ctx.beginPath(); ctx.moveTo(W/2,1); ctx.lineTo(1,8); ctx.lineTo(W-1,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8b4a3a'; ctx.fillRect(2, 8, W-4, 20);
    ctx.fillStyle = '#6b3a2a'; ctx.fillRect(2, 16, W-4, 2); ctx.fillRect(2, 24, W-4, 1);
    ctx.fillStyle = '#ffecb3';
    [6,13,20].forEach(c => [10,18].forEach(r => {
      ctx.fillRect(c, r, 4, 4); ctx.strokeStyle='#5d3a2a'; ctx.lineWidth=1; ctx.strokeRect(c, r, 4, 4);
    }));
    ctx.fillStyle = '#4a3020'; ctx.fillRect(13, 22, 6, 6);
    ctx.strokeStyle = '#3a2010'; ctx.strokeRect(13, 22, 6, 6);
    ctx.fillStyle = '#d4a84b'; ctx.beginPath(); ctx.arc(17.5, 25, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(1, 28, W-2, 2);
    canvas.refresh();
  }

  // ── placed objects ──────────────────────────────────

  private addPlacedObject(tileX: number, tileY: number, name: string): void {
    const wx = (tileX + 0.5) * TILE;
    const wy = (tileY + 0.5) * TILE;
    const sprite = this.add.sprite(wx, wy, 'kongsbakken');
    sprite.setOrigin(0.5, 0.8).setScale(1.5).setDepth(5);
    this.add.text(wx, wy - 28, name, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(6);
    this.objects.push({ tileX, tileY, name, sprite });
  }

  // ── grid ────────────────────────────────────────────

  private gridGfx: Phaser.GameObjects.Graphics | null = null;
  private drawGrid(): void {
    if (this.gridGfx) this.gridGfx.destroy();
    const g = this.add.graphics().setDepth(-1);
    const cam = this.cameras.main;
    const x0 = cam.scrollX, y0 = cam.scrollY, W = cam.width, H = cam.height;
    g.fillStyle(BG, 1); g.fillRect(x0, y0, W, H);
    g.lineStyle(1, GRID, 0.5);
    const sc = Math.floor(x0/TILE)-1, ec = Math.ceil((x0+W)/TILE)+1;
    const sr = Math.floor(y0/TILE)-1, er = Math.ceil((y0+H)/TILE)+1;
    for (let c = sc; c <= ec; c++) { const x = c*TILE; g.beginPath(); g.moveTo(x,sr*TILE); g.lineTo(x,er*TILE); g.strokePath(); }
    for (let r = sr; r <= er; r++) { const y = r*TILE; g.beginPath(); g.moveTo(sc*TILE,y); g.lineTo(ec*TILE,y); g.strokePath(); }
    this.gridGfx = g;
  }

  // ── touch: steer from center ────────────────────────

  private setupTouch(): void {
    const cam = this.cameras.main;

    const updateSteer = (px: number, py: number) => {
      const cx = cam.centerX;
      const cy = cam.centerY;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 12) {
        // too close to center — dead zone
        this.steerDX = 0;
        this.steerDY = 0;
      } else {
        // direction from center, speed proportional to distance
        this.steerDX = dx / cam.width;   // normalised to screen size
        this.steerDY = dy / cam.height;
      }
    };

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touching = true;
      updateSteer(p.x, p.y);
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.touching || !p.isDown) return;
      updateSteer(p.x, p.y);
    });

    this.input.on('pointerup', () => {
      this.touching = false;
      this.steerDX = 0;
      this.steerDY = 0;
    });
  }
}
