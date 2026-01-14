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
        if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
            if (data.stats.walletAddress) this.stats.walletAddress = data.stats.walletAddress;
        }
        this.level = data.level || 1;
        this.stage = data.stage || 1;
        this.isGameOver = false;
        this.enemiesKilled = 0;
        this.isBossPhase = false;
        this.isStarted = false;
        this.isManualReady = false;
    }

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
            console.log(`Database Synced: Stage ${stage}`);
        } catch (error) {
            console.error("Failed to sync stage:", error);
        }
    }

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
        this.stars1 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_slow').setOrigin(0).setScrollFactor(0).setAlpha(0.5);
        this.stars2 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_medium').setOrigin(0).setScrollFactor(0).setAlpha(0.7);
        this.stars3 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_fast').setOrigin(0).setScrollFactor(0);

        this.setupGame();

        EventBus.on('start-game', this.startGameLogic, this);

        EventBus.on('pause-game', (pause: boolean) => {
            if (this.isManualReady && this.physics) {
                pause ? this.physics.pause() : (this.isStarted && this.physics.resume());
            }
        });

        EventBus.on('apply-upgrades', (data: any) => {
            if (!this.isManualReady || !this.add || !this.physics) return;
            if (data.weaponLevel) this.stats.weaponLevel = data.weaponLevel;
            if (data.shieldLevel) this.stats.shieldLevel = data.shieldLevel;
            if (data.shoeLevel) this.stats.shoeLevel = data.shoeLevel;
            if (data.lifeLevel) this.stats.lifeLevel = data.lifeLevel;
            this.updatePlayerStats();
            if (this.player && this.player.active) this.applyPowerUpEffect();
        });

        this.events.on('shutdown', () => {
            this.isManualReady = false;
            EventBus.off('start-game');
            EventBus.off('pause-game');
            EventBus.off('apply-upgrades');
        });

        this.isManualReady = true;
        EventBus.emit('current-scene-ready', this);
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
        // Initial position updated to relative
        this.infoText = this.add.text(this.scale.width * 0.02, this.scale.height * 0.02, '', { fontSize: '18px', color: '#fff', fontStyle: 'bold' });

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.isGameOver && this.isStarted && this.player.active) {
                const baseSpeed = 250;
                const speedMultiplier = 1 + (this.stats.shoeLevel - 1) * 0.35;
                this.physics.moveToObject(this.player, p, baseSpeed * speedMultiplier);
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
        if (!this.add || !this.player || !this.player.active) return;
        this.showFloatingText(this.player.x, this.player.y - 40, "SYSTEM UPGRADED", "#00ffff");
        this.refreshFireTimer();
        this.player.setTint(0x00ffff);
        this.time.delayedCall(500, () => {
            if (this.player && this.player.active) this.player.clearTint();
        });
    }

    startGameLogic() {
        if (this.isStarted || !this.isManualReady) return;
        this.isStarted = true;
        if (this.physics) this.physics.resume();
    }

    updatePlayerStats() {
        const oldMax = this.maxHealth;
        this.maxHealth = 100 * (1 + (this.stats.lifeLevel - 1) * 0.35);
        if (this.maxHealth > oldMax) this.health += (this.maxHealth - oldMax);
        if (this.health > this.maxHealth) this.health = this.maxHealth;
    }

    spawnLogic() {
        if (!this.isManualReady || !this.isStarted || this.isGameOver || this.isBossPhase) return;
        if (this.enemiesKilled >= this.enemiesToKill) this.spawnBoss();
        else this.spawnEnemy();
    }

    spawnEnemy() {
        if (!this.isManualReady) return;
        const y = Phaser.Math.Between(50, this.scale.height - 50);
        const enemy = this.enemies.create(this.scale.width + 50, y, 'enemy');
        const difficultyStep = ((this.level - 1) * 5) + (this.stage - 1);
        const multiplier = Math.pow(1.5, difficultyStep);
        enemy.setData('hp', 2 * multiplier);
        enemy.setVelocityX(-200 - (this.level * 25));

        if (Math.random() > 0.7) {
            this.time.delayedCall(Phaser.Math.Between(500, 2000), () => {
                if (this.isManualReady && enemy && enemy.active) {
                    const eb = this.enemyBullets.create(enemy.x, enemy.y, 'e_bullet');
                    if (eb) eb.setVelocityX(-300 * (1 + (difficultyStep * 0.15)));
                }
            });
        }
    }

    spawnBoss() {
        this.isBossPhase = true;
        const difficultyStep = ((this.level - 1) * 5) + (this.stage - 1);
        const multiplier = Math.pow(1.5, difficultyStep);
        const maxHp = 500 * multiplier;
        this.boss = this.physics.add.sprite(this.scale.width - 150, this.scale.height / 2, 'boss').setScale(2.5);
        this.boss.setData('hp', maxHp);
        this.boss.setData('maxHp', maxHp);
        this.boss.setTint(0xff0000);

        this.tweens.add({
            targets: this.boss,
            y: { from: 150, to: this.scale.height - 150 },
            duration: 2000,
            yoyo: true,
            repeat: -1
        });

        this.time.addEvent({
            delay: Math.max(150, 1000 / multiplier),
            callback: () => {
                if (this.isManualReady && this.boss && this.boss.active && this.player.active) {
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
        const playerDamage = 1 * (1 + (this.stats.weaponLevel - 1) * 0.35);
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
        if (this.boss) {
            this.particleManager.emitParticleAt(this.boss.x, this.boss.y, 40);
            this.boss.destroy();
        }

        this.syncStageToDatabase(this.stage);

        if (this.stage < this.maxStages) {
            this.stage++;
            EventBus.emit('stage-cleared', { stage: this.stage });
            this.scene.restart({ stats: this.stats, level: this.level, stage: this.stage });
        } else {
            this.triggerLevelVictory();
        }
    }

    triggerLevelVictory() {
        this.isStarted = false;
        this.physics.pause();
        EventBus.emit('victory');
    }

    takeDamage(amount: number) {
        if (this.isGameOver) return;
        const reduction = Math.max(0.1, 1 - (this.stats.shieldLevel - 1) * 0.15);
        this.health -= amount * reduction;
        this.cameras.main.shake(100, 0.005);
        if (this.health <= 0) this.triggerGameOver();
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.isStarted = false;
        this.physics.pause();
        EventBus.emit('game-over');
    }

    spawnSpecialBomb(x: number, y: number) {
        const bomb = this.rewards.create(x, y, 'bomb');
        const roll = Phaser.Math.Between(1, 100);
        if (roll <= 10) { bomb.setData('rewardType', 'TAG'); bomb.setTint(0xff00ff); }
        else if (roll <= 30) { bomb.setData('rewardType', 'LAAM'); bomb.setTint(0xfbb124); }
        else { bomb.setData('rewardType', 'HEALTH'); }
        bomb.setVelocityX(-100);
    }

    collectReward(reward: any) {
        const type = reward.getData('rewardType');
        if (type === 'TAG' || type === 'LAAM') {
            EventBus.emit('level-completed', { type: `SPECIAL_BOMB_${type}` });
        } else {
            this.health = Math.min(this.maxHealth, this.health + 20);
        }
        this.showFloatingText(this.player.x, this.player.y, `+${type}`, "#10b981");
        reward.destroy();
    }

    update() {
        if (!this.isManualReady || !this.isStarted || this.isGameOver) return;
        this.stars1.tilePositionX += 0.5;
        this.stars2.tilePositionX += 1.2;
        this.stars3.tilePositionX += 2.5;

        // Update Info Text Position and Value
        this.infoText.setPosition(this.scale.width * 0.02, this.scale.height * 0.03);
        this.infoText.setText(`LVL: ${this.level} STG: ${this.stage} | KILLS: ${this.enemiesKilled}/${this.enemiesToKill}`);

        this.drawBossUI();
        this.drawPlayerHealthBar();
    }

    drawPlayerHealthBar() {
        if (!this.playerHealthBar) return;
        const marginX = this.scale.width * 0.02;
        const marginY = this.scale.height * 0.08;
        const barWidth = this.scale.width * 0.25;

        this.playerHealthBar.clear().fillStyle(0x333333).fillRect(marginX, marginY, barWidth, 12);
        const currentHealthWidth = (this.health / this.maxHealth) * barWidth;
        this.playerHealthBar.fillStyle(0x00ff00).fillRect(marginX, marginY, Math.max(0, currentHealthWidth), 12);
    }

    drawBossUI() {
        if (!this.bossHealthBar) return;
        this.bossHealthBar.clear();
        if (this.isBossPhase && this.boss?.active) {
            const hp = this.boss.getData('hp');
            const maxHp = this.boss.getData('maxHp');
            const barWidth = this.scale.width / 2;
            const xPos = this.scale.width / 4;
            const yPos = this.scale.height * 0.03;

            this.bossHealthBar.fillStyle(0x333333).fillRect(xPos, yPos, barWidth, 20);
            this.bossHealthBar.fillStyle(0xff0000).fillRect(xPos, yPos, (hp / maxHp) * barWidth, 20);
        }
    }

    fireBullet() {
        if (!this.isStarted || this.isGameOver || !this.player.active) return;
        const b = this.bullets.create(this.player.x + 20, this.player.y, 'bullet');
        if (b) b.setVelocityX(800);
    }

    showFloatingText(x: number, y: number, text: string, color: string) {
        if (!this.add) return;
        const t = this.add.text(x, y, text, { fontSize: '22px', color, fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }

    createPlaceholderTexture(key: string, width: number, height: number, color: string) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        if (key === 'player') graphics.fillTriangle(0, 0, 0, height, width, height / 2);
        else if (key === 'bullet' || key === 'e_bullet') graphics.fillCircle(width / 2, height / 2, width / 2);
        else graphics.fillRect(0, 0, width, height);
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    createStarTexture(key: string, size: number, color: string) {
        const canvas = this.make.graphics({ x: 0, y: 0 });
        canvas.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        for (let i = 0; i < 30; i++) canvas.fillCircle(Phaser.Math.Between(0, 512), Phaser.Math.Between(0, 512), size / 2);
        canvas.generateTexture(key, 512, 512);
        canvas.destroy();
    }
}