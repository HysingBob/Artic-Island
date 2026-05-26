import Phaser from 'phaser';

interface Venue {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
}

// Approximate venue placements on our placeholder Tromsø map
const VENUES: Venue[] = [
  { id: 'polaria',     name: 'Polaria',           x: 220, y: 320, color: 0x4fc3f7 },
  { id: 'radhuset',    name: 'Rådhuset',          x: 380, y: 420, color: 0xffcc80 },
  { id: 'driv',        name: 'Driv',              x: 350, y: 350, color: 0xef5350 },
  { id: 'biblioteket', name: 'Tromsø Library',    x: 410, y: 380, color: 0xa5d6a7 },
  { id: 'blarock',     name: 'Blårock',           x: 340, y: 400, color: 0x42a5f5 },
  { id: 'verdensteatret', name: 'Verdensteatret', x: 370, y: 390, color: 0xab47bc },
  { id: 'kulturhuset', name: 'Kulturhuset',       x: 390, y: 360, color: 0xffa726 },
  { id: 'domkirka',    name: 'Domkirka',          x: 400, y: 410, color: 0xffee58 },
  { id: 'mack',        name: 'Mack Brewery',      x: 430, y: 430, color: 0x8d6e63 },
  { id: 'bukta',       name: 'Bukta',             x: 280, y: 280, color: 0x66bb6a },
];

const PLAYER_SPEED = 160;

export class MapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private venueGraphics: Phaser.GameObjects.Arc[] = [];
  private venueLabels: Phaser.GameObjects.Text[] = [];
  private hudText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MapScene' });
  }

  create(): void {
    // ── Terrain ──────────────────────────────────────
    this.drawWater();
    this.drawIsland();
    this.drawBridge();
    this.drawMainland();

    // ── Venues ───────────────────────────────────────
    this.drawVenues();

    // ── Player ───────────────────────────────────────
    this.player = this.add.rectangle(400, 300, 14, 14, 0xffffff);
    this.player.setStrokeStyle(2, 0x90caf9);

    // ── Input ────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();

    // ── HUD ──────────────────────────────────────────
    this.hudText = this.add.text(10, 10, 'Walk around Tromsø! Use arrow keys.', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(100);
  }

  update(_time: number, delta: number): void {
    this.handleMovement(delta);
    this.checkVenueProximity();
  }

  // ────────────────────────────────────────────────────
  //  Drawing helpers
  // ────────────────────────────────────────────────────

  private drawWater(): void {
    // Northern sea: deep blue
    this.add.rectangle(400, 150, 800, 300, 0x0d2137).setDepth(-1);
    // Southern fjord
    this.add.rectangle(400, 500, 800, 200, 0x0d2137).setDepth(-1);
  }

  private drawIsland(): void {
    const g = this.add.graphics();
    g.setDepth(0);

    // Main Tromsø island — rough elongated shape (north-south)
    // Using filled polygon: thicker in the middle, tapering north and south
    g.fillStyle(0x2e4a2e, 0.9);
    g.beginPath();
    g.moveTo(280, 170);  // top-left
    g.lineTo(480, 160);  // top-right (north tip)
    g.lineTo(500, 220);  // east coast upper
    g.lineTo(520, 260);  // east coast — wider
    g.lineTo(510, 320);  // east coast — widest point (city center)
    g.lineTo(490, 380);  // east coast — narrowing
    g.lineTo(440, 430);  // east coast lower
    g.lineTo(380, 460);  // southern tip
    g.lineTo(300, 440);  // west coast lower
    g.lineTo(260, 390);  // west coast — wider
    g.lineTo(240, 340);  // west coast — widest point
    g.lineTo(250, 270);  // west coast upper
    g.lineTo(260, 210);  // west coast — tapering
    g.closePath();
    g.fillPath();

    // Urban area highlight (city center, lighter green-grey)
    g.fillStyle(0x3d5a3d, 0.7);
    g.fillRect(330, 300, 120, 90);

    // City center label
    this.add.text(390, 340, 'Sentrum', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#c8e6c9',
    }).setDepth(1).setOrigin(0.5);
  }

  private drawBridge(): void {
    const g = this.add.graphics();
    g.setDepth(0);
    // Tromsø Bridge — line from island east to mainland
    g.lineStyle(4, 0x78909c, 0.9);
    g.beginPath();
    g.moveTo(490, 340);
    g.lineTo(580, 260);
    g.lineTo(640, 180);
    g.strokePath();

    // Bridge label
    const bridgeLabel = this.add.text(545, 285, 'Tromsøbrua', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#b0bec5',
    }).setDepth(0);
    bridgeLabel.setAngle(-40);
  }

  private drawMainland(): void {
    const g = this.add.graphics();
    g.setDepth(-0.5);
    // Tromsdalen side (mainland, east of bridge)
    g.fillStyle(0x1e3a1e, 0.8);
    g.beginPath();
    g.moveTo(580, 140);
    g.lineTo(720, 140);
    g.lineTo(780, 300);
    g.lineTo(680, 380);
    g.lineTo(580, 300);
    g.closePath();
    g.fillPath();

    // Cathedral
    g.fillStyle(0x7a7a6e, 1);
    g.fillTriangle(620, 173, 614, 190, 626, 190);
    this.add.text(620, 195, 'Ishavs-\nkatedralen', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#cfd8dc',
      align: 'center',
    }).setDepth(1).setOrigin(0.5, 0);
  }

  private drawVenues(): void {
    for (const v of VENUES) {
      const dot = this.add.circle(v.x, v.y, 5, v.color);
      dot.setStrokeStyle(1.5, 0xffffff);
      dot.setDepth(2);
      this.venueGraphics.push(dot);

      const label = this.add.text(v.x, v.y - 10, v.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5, 1).setDepth(3);
      this.venueLabels.push(label);
    }
  }

  // ────────────────────────────────────────────────────
  //  Player movement
  // ────────────────────────────────────────────────────

  private handleMovement(delta: number): void {
    const dt = delta / 1000;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown) vx += 1;
    if (this.cursors.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown)  vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;
    }

    this.player.x += vx * dt;
    this.player.y += vy * dt;

    // Clamp to world bounds
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, 780);
    this.player.y = Phaser.Math.Clamp(this.player.y, 20, 580);
  }

  // ────────────────────────────────────────────────────
  //  Venue proximity
  // ────────────────────────────────────────────────────

  private checkVenueProximity(): void {
    let near: Venue | null = null;
    for (const v of VENUES) {
      const dx = this.player.x - v.x;
      const dy = this.player.y - v.y;
      if (dx * dx + dy * dy < 20 * 20) {
        near = v;
        break;
      }
    }

    if (near) {
      this.hudText.setText(`📍 Near ${near.name} — press SPACE to see events`);
    } else {
      this.hudText.setText('Walk around Tromsø! Use arrow keys.');
    }
  }
}