import { Preloader } from './scenes/Preloader';
import { ShooterScene } from './scenes/ShooterScene';
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: typeof window !== 'undefined' ? Phaser.AUTO : Phaser.HEADLESS,
    // Remove hardcoded width/height here
    parent: 'game-container',
    backgroundColor: '#050510',

    scale: {
        mode: Phaser.Scale.RESIZE, // Change from FIT to RESIZE
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
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