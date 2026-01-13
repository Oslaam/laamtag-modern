import { Preloader } from './scenes/Preloader';
import { ShooterScene } from './scenes/ShooterScene';
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#050510',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [
        Preloader,
        ShooterScene
    ]
};

// Ensure the word 'export' is here and it is a named function
export const StartGame = (parent: string) => {
    return new Phaser.Game({ ...config, parent });
};