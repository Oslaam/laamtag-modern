import { Preloader } from './scenes/Preloader';
import { ShooterScene } from './scenes/ShooterScene';
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: typeof window !== 'undefined' ? Phaser.AUTO : Phaser.HEADLESS,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#050510',

    scale: {
        mode: Phaser.Scale.FIT,           // Fits the game to the parent container
        autoCenter: Phaser.Scale.CENTER_BOTH, // Centers it
        width: 1024,                     // Logic width
        height: 768,                     // Logic height
    },

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [Preloader, ShooterScene]
};

// Ensure the word 'export' is here and it is a named function
export const StartGame = (
    parent: string,
    data?: {
        level: number;
        stage: number;
        stats: any;
    }
) => {
    return new Phaser.Game({
        ...config,
        parent,
        callbacks: {
            preBoot: (game) => {
                // Injects DB data or defaults if data is missing
                game.registry.set('initialData', data || {
                    level: 1,
                    stage: 1,
                    stats: {}
                });
            }
        }
    });
};