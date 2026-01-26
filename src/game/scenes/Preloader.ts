import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Progress Bar UI
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRoundedRect(width / 2 - 160, height / 2, 320, 30, 10);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 30,
            text: 'INITIALIZING SYSTEMS...',
            style: { font: '14px monospace', color: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 + 15,
            text: '0%',
            style: { font: '12px monospace', color: '#eab308' }
        }).setOrigin(0.5, 0.5);

        // 2. Load Progress Logic
        this.load.on('progress', (value: number) => {
            percentText.setText(Math.floor(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xeab308, 1);
            progressBar.fillRoundedRect(width / 2 - 155, height / 2 + 5, 310 * value, 20, 5);
        });

        // Inside the 'complete' event listener
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();

            // Fetch the data we injected in main.ts
            const initialData = this.registry.get('initialData') || { level: 1, stage: 1 };

            // Start the shooter scene with the DB stats
            this.scene.start('ShooterScene', initialData);
        });

        // --- LOAD TRANSPARENT ASSETS ---
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/ship.png');
        this.load.image('enemy1', 'https://labs.phaser.io/assets/sprites/ufo.png');
        this.load.image('enemy2', 'https://labs.phaser.io/assets/sprites/slime.png');
        this.load.image('boss1', 'https://labs.phaser.io/assets/sprites/bsquadron1.png');
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/bullet.png');
        this.load.image('e_bullet', 'https://labs.phaser.io/assets/sprites/enemy-bullet.png');
        this.load.image('bomb', 'https://labs.phaser.io/assets/sprites/mine.png');

        // Background stars logic (Keep textures small for performance)
        this.createStarTexture('stars_slow', 2, '#555555');
        this.createStarTexture('stars_medium', 3, '#888888');
        this.createStarTexture('stars_fast', 4, '#ffffff');
    }

    createStarTexture(key: string, size: number, color: string) {
        const g = this.make.graphics({ x: 0, y: 0 }).fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        for (let i = 0; i < 30; i++) g.fillCircle(Phaser.Math.Between(0, 512), Phaser.Math.Between(0, 512), size / 2);
        g.generateTexture(key, 512, 512).destroy();
    }
}