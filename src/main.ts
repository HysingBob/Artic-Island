import Phaser from 'phaser';
import { MovementScene } from './scenes/MovementScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 720,
  backgroundColor: '#1a2a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MovementScene],
};

new Phaser.Game(config);