import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class ShooterScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private enemies!: Phaser.Physics.Arcade.Group;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemyBullets!: Phaser.Physics.Arcade.Group;
    private rewards!: Phaser.Physics.Arcade.Group;
    private boss?: Phaser.Physics.Arcade.Sprite;
    private bossHealthBar!: Phaser.GameObjects.Graphics;
    private playerHealthBar!: Phaser.GameObjects.Graphics;
    private stars1!: Phaser.GameObjects.TileSprite;
    private stars2!: Phaser.GameObjects.TileSprite;
    private stars3!: Phaser.GameObjects.TileSprite;
    private particleManager!: Phaser.GameObjects.Particles.ParticleEmitter;

    private stats = {
        weaponLevel: 1,
        shieldLevel: 1,
        shoeLevel: 1,
        lifeLevel: 1,
        walletAddress: ''
    };

    private level = 1;
    private stage = 1;
    private maxStages = 5;
    private enemiesKilled = 0;
    private enemiesToKill = 100;
    private health = 100;
    private maxHealth = 100;
    private isGameOver = false;
    private isBossPhase = false;
    private isStarted = false;
    private infoText!: Phaser.GameObjects.Text;
    private fireEvent?: Phaser.Time.TimerEvent;
    private isManualReady = false;

    constructor() {
        super('ShooterScene');
    }

    init(data: { stats?: any, level?: number, stage?: number }) {
        // 1. Properly merge the stats (upgrades) from React/DB
        if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
        }

        // 2. Use the passed level/stage, otherwise keep current, otherwise default to 1
        // Use ?? (Nullish Coalescing) to ensure 0 doesn't get skipped
        this.level = data.level ?? this.level ?? 1;
        this.stage = data.stage ?? this.stage ?? 1;

        // 3. Reset game state flags for the new stage
        this.enemiesKilled = 0;
        this.isGameOver = false;
        this.isBossPhase = false;
        this.isStarted = false;
        // this.isManualReady remains false until 'start-game' or 'resume-stage' event
    }

    // --- DB Sync ---
    async syncStageToDatabase(stage: number) {
        if (!this.stats.walletAddress) return;
        try {
            await fetch('/api/games/shooter/sync-stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: this.stats.walletAddress,
                    stage: stage
                })
            });
        } catch (error) {
            console.error("Failed to sync stage:", error);
        }
    }

    // --- Textures ---
    preload() {
        this.createPlaceholderTexture('player', 32, 32, '#3b82f6');
        this.createPlaceholderTexture('enemy', 32, 32, '#ef4444');
        this.createPlaceholderTexture('bullet', 8, 8, '#fbbf24');
        this.createPlaceholderTexture('e_bullet', 8, 8, '#ff00ff');
        this.createPlaceholderTexture('boss', 64, 64, '#991b1b');
        this.createPlaceholderTexture('bomb', 16, 16, '#10b981');
        this.createStarTexture('stars_slow', 2, '#555555');
        this.createStarTexture('stars_medium', 3, '#888888');
        this.createStarTexture('stars_fast', 4, '#ffffff');
    }

    create() {
        this.isManualReady = false;
        this.cameras.main.setBackgroundColor(0x050510);

        // 1. Background Layers
        this.stars1 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_slow').setOrigin(0).setScrollFactor(0).setAlpha(0.5);
        this.stars2 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_medium').setOrigin(0).setScrollFactor(0).setAlpha(0.7);
        this.stars3 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_fast').setOrigin(0).setScrollFactor(0);

        // 2. Initialize Game Objects
        this.setupGame();

        // 3. Transition Overlay
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8).setOrigin(0).setDepth(20000);
        const titleText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, `LEVEL ${this.level} - STAGE ${this.stage}`,
            { fontSize: '42px', color: '#eab308', fontStyle: '900 italic', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20001);
        const subText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 30,
            this.stage === 5 ? "WARNING: BOSS SIGNATURE DETECTED" : "INITIALIZING COMBAT PROTOCOL...",
            { fontSize: '14px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20001);

        this.tweens.add({
            targets: [overlay, titleText, subText],
            alpha: 0,
            duration: 500,
            delay: 1000,
            onComplete: () => {
                overlay.destroy();
                titleText.destroy();
                subText.destroy();
            }
        });

        // 4. Event Listeners
        EventBus.off('start-game');
        EventBus.off('apply-upgrades');

        EventBus.on('start-game', this.startGameLogic, this);

        EventBus.on('start-game', this.startGameLogic, this);
        EventBus.on('pause-game', (pause: boolean) => {
            if (this.isManualReady && this.physics) {
                pause ? this.physics.pause() : (this.isStarted && this.physics.resume());
            }
        });
        EventBus.on('apply-upgrades', (data: any) => {
            if (!this.isManualReady) return;
            if (data.weaponLevel) this.stats.weaponLevel = data.weaponLevel;
            if (data.shieldLevel) this.stats.shieldLevel = data.shieldLevel;
            if (data.shoeLevel) this.stats.shoeLevel = data.shoeLevel;
            if (data.lifeLevel) this.stats.lifeLevel = data.lifeLevel;
            this.updatePlayerStats();
            if (this.player && this.player.active) this.applyPowerUpEffect();
        });

        // 5. Cleanup on Shutdown (Crucial for Next.js)
        this.events.on('shutdown', () => {
            this.isManualReady = false;
            EventBus.off('start-game');
            EventBus.off('pause-game');
            EventBus.off('apply-upgrades');
            EventBus.off('resume-stage');
        });

        EventBus.on('resume-stage', () => {
            this.isManualReady = true;
            this.isStarted = true;
            this.physics.resume();
        }, this);

        this.time.delayedCall(50, () => {
            this.isManualReady = true;
            EventBus.emit('current-scene-ready', this);
        });
    }

    setupGame() {
        this.updatePlayerStats();
        this.health = this.maxHealth;

        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.rewards = this.physics.add.group();

        this.player = this.physics.add.sprite(100, this.scale.height / 2, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setMaxVelocity(1000, 1000);

        const flare = this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
        flare.generateTexture('flare', 8, 8);
        flare.destroy();

        this.particleManager = this.add.particles(0, 0, 'flare', {
            lifespan: 300,
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            emitting: false
        });

        this.bossHealthBar = this.add.graphics().setDepth(100);
        this.playerHealthBar = this.add.graphics().setDepth(100);
        this.infoText = this.add.text(this.scale.width * 0.02, this.scale.height * 0.02, '', { fontSize: '18px', color: '#fff', fontStyle: 'bold' });

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.isGameOver && this.isStarted && this.player.active) {
                const baseSpeed = 450;
                const maxSpeed = baseSpeed * (1 + (this.stats.shoeLevel - 1) * 0.35);
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
                const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, p.x, p.y);

                if (dist < 10) {
                    this.player.setVelocity(0, 0);
                } else {
                    this.player.setRotation(angle);
                    this.player.setVelocity(Math.cos(angle) * maxSpeed, Math.sin(angle) * maxSpeed);
                }
            }
        });

        this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.handleHit(b, e), undefined, this);
        this.physics.add.overlap(this.player, this.enemies, () => this.takeDamage(20), undefined, this);
        this.physics.add.overlap(this.player, this.enemyBullets, (p, eb) => { (eb as any).destroy(); this.takeDamage(10); }, undefined, this);
        this.physics.add.overlap(this.player, this.rewards, (p, r) => this.collectReward(r), undefined, this);

        this.time.addEvent({ delay: 1000, callback: () => this.spawnLogic(), loop: true });
        this.refreshFireTimer();
        this.physics.pause();
    }

    refreshFireTimer() {
        if (this.fireEvent) this.fireEvent.remove();
        const fireRate = Math.max(80, 400 - (this.stats.weaponLevel - 1) * 40);
        this.fireEvent = this.time.addEvent({ delay: fireRate, callback: () => this.fireBullet(), loop: true });
    }

    applyPowerUpEffect() {
        this.showFloatingText(this.player.x, this.player.y - 40, "SYSTEM UPGRADED", "#00ffff");
        this.refreshFireTimer();
        this.player.setTint(0x00ffff);
        this.time.delayedCall(500, () => { if (this.player?.active) this.player.clearTint(); });
    }

    startGameLogic() {
        if (!this.physics || !this.isManualReady) return;

        this.isStarted = true;

        this.createCountdown();

        this.physics.resume();

        if (this.player && this.player.active) {
            this.player.setActive(true).setVisible(true);
        }
    }

    updatePlayerStats() {
        const oldMax = this.maxHealth;
        this.maxHealth = 100 * (1 + (this.stats.lifeLevel - 1) * 0.35);
        if (this.maxHealth > oldMax) this.health += (this.maxHealth - oldMax);
        this.health = Math.min(this.health, this.maxHealth);
    }

    spawnLogic() {
        if (!this.isManualReady || !this.isStarted || this.isGameOver || this.isBossPhase || !this.player?.active) return;
        if (this.stage === 5 && this.enemiesKilled >= this.enemiesToKill) this.spawnBoss();
        else if (this.enemiesKilled >= this.enemiesToKill) this.onBossKilled();
        else this.spawnEnemy();
    }

    spawnEnemy() {
        const y = Phaser.Math.Between(50, this.scale.height - 50);
        const enemy = this.enemies.create(this.scale.width + 50, y, 'enemy');
        const difficultyStep = ((this.level - 1) * 5) + (this.stage - 1);
        const multiplier = Math.pow(1.5, difficultyStep);
        enemy.setData('hp', 2 * multiplier);
        enemy.setVelocityX(-200 - (this.level * 25));

        if (Math.random() > 0.7) {
            this.time.delayedCall(Phaser.Math.Between(500, 2000), () => {
                if (this.isManualReady && enemy.active) {
                    const eb = this.enemyBullets.create(enemy.x, enemy.y, 'e_bullet');
                    if (eb) eb.setVelocityX(-300 * (1 + (difficultyStep * 0.15)));
                }
            });
        }
    }

    spawnBoss() {
        this.isBossPhase = true;
        this.cameras.main.shake(1000, 0.01);
        this.cameras.main.flash(500, 153, 27, 27);

        const difficultyStep = ((this.level - 1) * 5) + (this.stage - 1);
        const multiplier = Math.pow(1.5, difficultyStep);
        const maxHp = 500 * multiplier;

        this.boss = this.physics.add.sprite(this.scale.width + 100, this.scale.height / 2, 'boss').setScale(2.5);
        this.boss.setData('hp', maxHp).setData('maxHp', maxHp).setTint(0xff0000);

        this.tweens.add({
            targets: this.boss,
            x: this.scale.width - 150,
            duration: 2000,
            onComplete: () => {
                if (this.boss) {
                    this.tweens.add({ targets: this.boss, y: { from: 150, to: this.scale.height - 150 }, duration: 2000, yoyo: true, repeat: -1 });
                }
            }
        });

        this.time.addEvent({
            delay: Math.max(150, 1000 / multiplier),
            callback: () => {
                if (this.isManualReady && this.boss?.active && this.player.active) {
                    const eb = this.enemyBullets.create(this.boss.x, this.boss.y, 'e_bullet');
                    if (eb) this.physics.moveToObject(eb, this.player, 400);
                }
            },
            loop: true
        });
    }

    handleHit(bullet: any, target: any) {
        bullet.destroy();
        this.particleManager.emitParticleAt(target.x, target.y, 5);
        const playerDamage = 10 * (1 + (this.stats.weaponLevel - 1) * 0.35);
        let hp = target.getData('hp') - playerDamage;
        target.setData('hp', hp);

        if (hp <= 0) {
            if (target === this.boss) this.onBossKilled();
            else {
                this.enemiesKilled++;
                if (Math.random() > 0.88) this.spawnSpecialBomb(target.x, target.y);
                target.destroy();
            }
        }
    }

    onBossKilled() {
        this.isBossPhase = false;
        if (this.boss) this.boss.destroy();

        // If we are in Stage 1, 2, 3, or 4...
        if (this.stage < 5) {
            this.stage++;
            this.enemiesKilled = 0; // Reset count for the new stage

            // Tell React to update the DB and open the Shop
            EventBus.emit('stage-cleared', { stage: this.stage });

            // STOP physics and spawning so Stage 2 doesn't start while Shop is open
            this.physics.pause();
            this.isManualReady = false;
        }
        // If we just killed the Stage 5 Boss...
        else {
            this.level++;
            this.stage = 1;

            // Trigger the Reward API in React
            EventBus.emit('level-completed', { type: 'BOSS_WIN' });

            // Full restart only for Level change to reset environment
            this.scene.restart({ stats: this.stats, level: this.level, stage: this.stage });
        }
    }

    takeDamage(amount: number) {
        if (this.isGameOver) return;
        this.health -= amount * Math.max(0.1, 1 - (this.stats.shieldLevel - 1) * 0.15);
        this.cameras.main.shake(100, 0.005);
        if (this.health <= 0) {
            this.isGameOver = true;
            this.isStarted = false;
            this.physics.pause();
            EventBus.emit('game-over');
        }
    }

    spawnSpecialBomb(x: number, y: number) {
        const bomb = this.rewards.create(x, y, 'bomb');
        const roll = Phaser.Math.Between(1, 100);
        if (roll <= 10) { bomb.setData('rewardType', 'TAG').setTint(0xff00ff); }
        else if (roll <= 30) { bomb.setData('rewardType', 'LAAM').setTint(0xfbb124); }
        else { bomb.setData('rewardType', 'HEALTH'); }
        bomb.setVelocityX(-100);
    }

    collectReward(reward: any) {
        const type = reward.getData('rewardType');
        if (type === 'TAG' || type === 'LAAM') EventBus.emit('level-completed', { type: `SPECIAL_BOMB_${type}` });
        else this.health = Math.min(this.maxHealth, this.health + 20);
        this.showFloatingText(this.player.x, this.player.y, `+${type}`, "#10b981");
        reward.destroy();
    }

    update() {
        if (!this.isManualReady || !this.isStarted || this.isGameOver) return;

        // Friction for smooth stopping
        if (this.player?.active && this.input.activePointer.velocity.x === 0 && this.input.activePointer.velocity.y === 0) {
            const body = this.player.body as Phaser.Physics.Arcade.Body;
            this.player.setVelocity(body.velocity.x * 0.9, body.velocity.y * 0.9);
        }

        // Cleanup off-screen enemy bullets to save memory
        this.enemyBullets.getChildren().forEach((b: any) => {
            if (b.x < -50) b.destroy();
        });

        this.stars1.tilePositionX += 0.5;
        this.stars2.tilePositionX += 1.2;
        this.stars3.tilePositionX += 2.5;

        this.infoText.setPosition(this.scale.width * 0.02, this.scale.height * 0.03);
        this.infoText.setText(`LVL: ${this.level} STG: ${this.stage} | KILLS: ${this.enemiesKilled}/${this.enemiesToKill}`);

        this.drawBossUI();
        this.drawPlayerHealthBar();
    }

    drawPlayerHealthBar() {
        const marginX = this.scale.width * 0.02, marginY = this.scale.height * 0.08, barWidth = this.scale.width * 0.25;
        this.playerHealthBar.clear().fillStyle(0x333333).fillRect(marginX, marginY, barWidth, 12);
        this.playerHealthBar.fillStyle(0x00ff00).fillRect(marginX, marginY, Math.max(0, (this.health / this.maxHealth) * barWidth), 12);
    }

    drawBossUI() {
        this.bossHealthBar.clear();
        if (this.isBossPhase && this.boss?.active) {
            const barWidth = this.scale.width / 2, x = this.scale.width / 4, y = this.scale.height * 0.03;
            this.bossHealthBar.fillStyle(0x333333).fillRect(x, y, barWidth, 20);
            this.bossHealthBar.fillStyle(0xff0000).fillRect(x, y, (this.boss.getData('hp') / this.boss.getData('maxHp')) * barWidth, 20);
        }
    }

    fireBullet() {
        if (this.isStarted && !this.isGameOver && this.player?.active) {
            this.bullets.create(this.player.x + 20, this.player.y, 'bullet').setVelocityX(800);
        }
    }

    showFloatingText(x: number, y: number, text: string, color: string) {
        const t = this.add.text(x, y, text, { fontSize: '22px', color, fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }

    createPlaceholderTexture(key: string, w: number, h: number, color: string) {
        const g = this.make.graphics({ x: 0, y: 0 }).fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        if (key === 'player') g.fillTriangle(0, 0, 0, h, w, h / 2);
        else if (key === 'bullet' || key === 'e_bullet') g.fillCircle(w / 2, h / 2, w / 2);
        else g.fillRect(0, 0, w, h);
        g.generateTexture(key, w, h).destroy();
    }

    createStarTexture(key: string, size: number, color: string) {
        const g = this.make.graphics({ x: 0, y: 0 }).fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        for (let i = 0; i < 30; i++) g.fillCircle(Phaser.Math.Between(0, 512), Phaser.Math.Between(0, 512), size / 2);
        g.generateTexture(key, 512, 512).destroy();
    }

    private createCountdown() {
        const colors = [0xff0000, 0xff8800, 0x00ff00];
        ['3', '2', '1'].forEach((val, i) => {
            this.time.delayedCall(i * 400, () => {
                const txt = this.add.text(this.scale.width / 2, this.scale.height / 2, val, { fontSize: '120px', color: '#ffffff', fontStyle: 'bold' })
                    .setOrigin(0.5).setDepth(30000).setTint(colors[i]);
                this.tweens.add({ targets: txt, scale: 2, alpha: 0, duration: 350, onComplete: () => txt.destroy() });
                this.cameras.main.shake(100, 0.005);
            });
        });
    }
}