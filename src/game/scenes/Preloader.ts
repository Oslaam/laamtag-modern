import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Create the background "track" for the progress bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRoundedRect(width / 2 - 160, height / 2, 320, 30, 10);

        // 2. Loading text
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 30,
            text: 'INITIALIZING SYSTEMS...',
            style: { font: '14px monospace', color: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        // 3. Percentage text
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 + 15,
            text: '0%',
            style: { font: '12px monospace', color: '#eab308' }
        }).setOrigin(0.5, 0.5);

        // 4. Update the bar as assets load
        this.load.on('progress', (value: number) => {
            percentText.setText(Math.floor(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xeab308, 1);
            progressBar.fillRoundedRect(width / 2 - 155, height / 2 + 5, 310 * value, 20, 5);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();

            // Pull the data from the registry we set in main.ts
            const initialData = this.registry.get('initialData');

            // Pass it to the ShooterScene
            this.scene.start('ShooterScene', initialData);
        });

        // --- LOAD YOUR ASSETS HERE ---
        // For now, we simulate a load by creating a delay or loading a few items
        // In the future, you'll put this.load.image('key', 'path') here
        for (let i = 0; i < 50; i++) {
            this.load.image('logo_' + i, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        }
    }
}