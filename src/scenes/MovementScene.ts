import Phaser from 'phaser';

const TILE = 48;
const PLAYER_SPEED = 200;

// ── colors ───────────────────────────────────────────
const BG     = 0x1a2a1a;  // dark grass
const GRID   = 0x2a4a2a;  // grid lines
const PLAYER_FILL  = 0xffffff;
const PLAYER_STROKE = 0x90caf9;

export class MovementScene extends Phaser.Scene {
  // world position (continuous, unbounded)
  private wx = 0;
  private wy = 0;

  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;

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
    // ── player sprite (always screen-center) ────────
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    this.player = this.add.rectangle(cx, cy, 12, 14, PLAYER_FILL);
    this.player.setStrokeStyle(2, PLAYER_STROKE);
    this.player.setDepth(10);

    // ── camera ──────────────────────────────────────
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    // world bounds: very large so it feels infinite
    this.cameras.main.setBounds(-50000, -50000, 100000, 100000);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;

    // ── input ───────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();

    // ── HUD ─────────────────────────────────────────
    this.hudText = this.add.text(8, 8, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8e6c9',
      backgroundColor: '#00000088', padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    // ── virtual joystick ────────────────────────────
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

    // ── movement ────────────────────────────────────
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    // joystick overrides keyboard if active
    if (this.joyVisible) {
      vx = this.joyDX;
      vy = this.joyDY;
    }

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 1) { vx /= len; vy /= len; }
    }

    // update world position
    this.wx += vx * PLAYER_SPEED * dt;
    this.wy += vy * PLAYER_SPEED * dt;

    // scroll camera to world position
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    this.cameras.main.scrollX = this.wx - cx;
    this.cameras.main.scrollY = this.wy - cy;

    // ── draw grid ────────────────────────────────────
    this.drawGrid();

    // ── HUD ──────────────────────────────────────────
    const tileCol = Math.floor(this.wx / TILE);
    const tileRow = Math.floor(this.wy / TILE);
    this.hudText.setText([
      `pos  (${Math.round(this.wx)}, ${Math.round(this.wy)})`,
      `tile (${tileCol}, ${tileRow})`,
      `${this.joyVisible ? '(touch)' : '(keyboard)'}`,
    ].join('\n'));
  }

  // ── grid rendering ──────────────────────────────────

  private gridGfx: Phaser.GameObjects.Graphics | null = null;

  private drawGrid(): void {
    // rebuild graphics each frame — simple and works for infinite scroll
    if (this.gridGfx) this.gridGfx.destroy();
    const g = this.add.graphics();
    g.setDepth(-1);

    // background
    const cam = this.cameras.main;
    const x0 = cam.scrollX;
    const y0 = cam.scrollY;
    const W = cam.width;
    const H = cam.height;

    g.fillStyle(BG, 1);
    g.fillRect(x0, y0, W, H);

    // grid lines
    g.lineStyle(1, GRID, 0.5);

    const startCol = Math.floor(x0 / TILE) - 1;
    const endCol   = Math.ceil((x0 + W) / TILE) + 1;
    const startRow = Math.floor(y0 / TILE) - 1;
    const endRow   = Math.ceil((y0 + H) / TILE) + 1;

    for (let col = startCol; col <= endCol; col++) {
      const x = col * TILE;
      g.beginPath();
      g.moveTo(x, startRow * TILE);
      g.lineTo(x, endRow * TILE);
      g.strokePath();
    }
    for (let row = startRow; row <= endRow; row++) {
      const y = row * TILE;
      g.beginPath();
      g.moveTo(startCol * TILE, y);
      g.lineTo(endCol * TILE, y);
      g.strokePath();
    }

    this.gridGfx = g;
  }

  // ── touch / virtual joystick ────────────────────────

  private setupTouch(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // place joystick at touch point if in lower-left quadrant
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;
      if (pointer.x < W * 0.5 && pointer.y > H * 0.4) {
        this.joyBaseX = pointer.x;
        this.joyBaseY = pointer.y;
        this.joyBase.setPosition(pointer.x, pointer.y).setVisible(true);
        this.joyThumb.setPosition(pointer.x, pointer.y).setVisible(true);
        this.joyVisible = true;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.joyVisible || !pointer.isDown) return;
      const dx = pointer.x - this.joyBaseX;
      const dy = pointer.y - this.joyBaseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampR = Math.min(dist, this.joyRadius);
      const angle = Math.atan2(dy, dx);

      this.joyThumb.setPosition(
        this.joyBaseX + Math.cos(angle) * clampR,
        this.joyBaseY + Math.sin(angle) * clampR,
      );

      // normalised direction, proportional to distance
      if (dist > 8) {
        const strength = Math.min(dist / this.joyRadius, 1);
        this.joyDX = Math.cos(angle) * strength;
        this.joyDY = Math.sin(angle) * strength;
      } else {
        this.joyDX = 0;
        this.joyDY = 0;
      }
    });

    this.input.on('pointerup', () => {
      this.joyVisible = false;
      this.joyDX = 0;
      this.joyDY = 0;
      this.joyBase.setVisible(false);
      this.joyThumb.setVisible(false);
    });
  }
}
