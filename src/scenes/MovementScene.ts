import Phaser from 'phaser';

const TILE = 48;
const MIN_SPEED = 150;
const MAX_SPEED = 600;

const BG   = 0x1a2a1a;
const GRID = 0x2a4a2a;

export class MovementScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hudText!: Phaser.GameObjects.Text;
  private cursorRing!: Phaser.GameObjects.Arc;
  private cursorDot!: Phaser.GameObjects.Arc;

  private camWX = 0;
  private camWY = 0;
  private touching = false;
  private steerDX = 0;
  private steerDY = 0;

  constructor() { super({ key: 'MovementScene' }); }

  create(): void {
    this.createBuildingTexture();
    this.addPlacedObject(4, 2, 'Kongsbakken vgs.');

    const cam = this.cameras.main;
    const cx = cam.centerX, cy = cam.centerY;

    // center cursor — ring
    this.cursorRing = this.add.circle(cx, cy, 22, 0xffffff, 0.12);
    this.cursorRing.setStrokeStyle(2, 0xffffff, 0.35);
    this.cursorRing.setDepth(100).setScrollFactor(0);

    // center dot
    this.cursorDot = this.add.circle(cx, cy, 4, 0xffffff, 0.4);
    this.cursorDot.setDepth(101).setScrollFactor(0);

    cam.setBounds(-50000, -50000, 100000, 100000);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.hudText = this.add.text(8, 8, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8e6c9',
      backgroundColor: '#00000088', padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setDepth(100);

    this.setupTouch();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // collect input
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    if (this.touching) { vx = this.steerDX; vy = this.steerDY; }

    // move camera
    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      // map len (0..1) to speed (MIN_SPEED..MAX_SPEED) with a floor
      const t = Phaser.Math.Clamp(len, 0, 1);
      const speed = MIN_SPEED + t * (MAX_SPEED - MIN_SPEED);
      this.camWX += (vx / len) * speed * dt;
      this.camWY += (vy / len) * speed * dt;
    }

    const cam = this.cameras.main;
    cam.scrollX = this.camWX - cam.centerX;
    cam.scrollY = this.camWY - cam.centerY;

    // cursor feedback — brighter when moving
    const moving = vx !== 0 || vy !== 0;
    this.cursorRing.setFillStyle(0xffffff, moving ? 0.28 : 0.12);
    this.cursorRing.setStrokeStyle(2, 0xffffff, moving ? 0.55 : 0.35);

    this.drawGrid();

    const col = Math.floor(this.camWX / TILE);
    const row = Math.floor(this.camWY / TILE);
    this.hudText.setText([
      `pos  (${Math.round(this.camWX)}, ${Math.round(this.camWY)})`,
      `tile (${col}, ${row})`,
      this.touching ? '(touch — hold to steer)' : '(keyboard)',
    ].join('\n'));
  }

  // ── building texture ────────────────────────────────

  private createBuildingTexture(): void {
    const W = 32, H = 32;
    const canvas = this.textures.createCanvas('kongsbakken', W, H)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#4a3a3a';
    ctx.beginPath(); ctx.moveTo(W/2,1); ctx.lineTo(1,8); ctx.lineTo(W-1,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8b4a3a'; ctx.fillRect(2,8,W-4,20);
    ctx.fillStyle = '#6b3a2a'; ctx.fillRect(2,16,W-4,2); ctx.fillRect(2,24,W-4,1);
    ctx.fillStyle = '#ffecb3';
    [6,13,20].forEach(c => [10,18].forEach(r => {
      ctx.fillRect(c,r,4,4); ctx.strokeStyle='#5d3a2a'; ctx.lineWidth=1; ctx.strokeRect(c,r,4,4);
    }));
    ctx.fillStyle = '#4a3020'; ctx.fillRect(13,22,6,6);
    ctx.strokeStyle = '#3a2010'; ctx.strokeRect(13,22,6,6);
    ctx.fillStyle = '#d4a84b'; ctx.beginPath(); ctx.arc(17.5,25,0.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(1,28,W-2,2);
    canvas.refresh();
  }

  private addPlacedObject(tileX: number, tileY: number, name: string): void {
    const wx = (tileX + 0.5) * TILE, wy = (tileY + 0.5) * TILE;
    this.add.sprite(wx, wy, 'kongsbakken').setOrigin(0.5,0.8).setScale(1.5).setDepth(5);
    this.add.text(wx, wy-28, name, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(6);
  }

  // ── grid ────────────────────────────────────────────

  private gridGfx: Phaser.GameObjects.Graphics | null = null;
  private drawGrid(): void {
    if (this.gridGfx) this.gridGfx.destroy();
    const g = this.add.graphics().setDepth(-1);
    const cam = this.cameras.main;
    const x0 = cam.scrollX, y0 = cam.scrollY, W = cam.width, H = cam.height;
    g.fillStyle(BG,1); g.fillRect(x0,y0,W,H);
    g.lineStyle(1,GRID,0.5);
    const sc = Math.floor(x0/TILE)-1, ec = Math.ceil((x0+W)/TILE)+1;
    const sr = Math.floor(y0/TILE)-1, er = Math.ceil((y0+H)/TILE)+1;
    for (let c=sc;c<=ec;c++){const x=c*TILE;g.beginPath();g.moveTo(x,sr*TILE);g.lineTo(x,er*TILE);g.strokePath();}
    for (let r=sr;r<=er;r++){const y=r*TILE;g.beginPath();g.moveTo(sc*TILE,y);g.lineTo(ec*TILE,y);g.strokePath();}
    this.gridGfx=g;
  }

  // ── steer from center ───────────────────────────────

  private setupTouch(): void {
    const cam = this.cameras.main;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touching = true;
      this.updateSteerVec(p.x, p.y, cam);
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.touching || !p.isDown) return;
      this.updateSteerVec(p.x, p.y, cam);
    });

    this.input.on('pointerup', () => {
      this.touching = false;
      this.steerDX = 0;
      this.steerDY = 0;
    });
  }

  private updateSteerVec(px: number, py: number, cam: Phaser.Cameras.Scene2D.Camera): void {
    const dx = px - cam.centerX;
    const dy = py - cam.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 18) {
      this.steerDX = 0;
      this.steerDY = 0;
      return;
    }
    // normalise and scale: edge of screen = full speed
    const maxDist = Math.sqrt(cam.width*cam.width + cam.height*cam.height) / 2;
    const t = Phaser.Math.Clamp(dist / maxDist, 0, 1);
    this.steerDX = (dx / dist) * t;
    this.steerDY = (dy / dist) * t;
  }
}