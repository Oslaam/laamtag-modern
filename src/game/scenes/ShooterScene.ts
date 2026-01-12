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

    // Parallax Layers
    private stars1!: Phaser.GameObjects.TileSprite;
    private stars2!: Phaser.GameObjects.TileSprite;
    private stars3!: Phaser.GameObjects.TileSprite;

    // Particles
    private particleManager!: Phaser.GameObjects.Particles.ParticleEmitter;

    // DB-Synced Stats
    private stats = {
        weaponLevel: 1,
        shieldLevel: 1,
        shoeLevel: 1,
        lifeLevel: 3
    };

    private level = 1;
    private stage = 1;
    private enemiesKilled = 0;
    private health = 100;
    private maxHealth = 100;
    private isGameOver = false;
    private isBossPhase = false;
    private isShopOpen = false;
    private isStarted = false;

    private infoText!: Phaser.GameObjects.Text;
    private shopContainer!: Phaser.GameObjects.Container;
    private baseUpgradeCost = 1;
    private costMultiplier = 1.2;

    constructor() {
        super('ShooterScene');
    }

    init(data: { stats?: any }) {
        if (data.stats) {
            this.stats = data.stats;
        }
        this.isGameOver = false;
        this.enemiesKilled = 0;
        this.isBossPhase = false;
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
        this.cameras.main.setBackgroundColor(0x050510);
        this.stars1 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_slow').setOrigin(0).setScrollFactor(0).setAlpha(0.5);
        this.stars2 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_medium').setOrigin(0).setScrollFactor(0).setAlpha(0.7);
        this.stars3 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_fast').setOrigin(0).setScrollFactor(0);

        // Reset Event Listeners
        EventBus.off('sync-stats');
        EventBus.off('start-game');
        EventBus.off('pause-game');
        EventBus.off('purchase-success');

        this.setupGame();
        this.createVisualShop();
        this.applyPowerUpEffect();

        this.physics.pause();
        this.isStarted = false;

        // SYNC HANDLER
        EventBus.on('sync-stats', (data: any) => {
            if (!this.sys || !this.scene.isActive()) return;
            if (data.level) this.level = data.level;
            if (data.stage) this.stage = data.stage;
            if (data.weaponLevel) this.stats.weaponLevel = data.weaponLevel;
            if (data.shieldLevel !== undefined) this.stats.shieldLevel = data.shieldLevel;
            if (data.shoeLevel) this.stats.shoeLevel = data.shoeLevel;
            if (data.lifeLevel) this.stats.lifeLevel = data.lifeLevel;

            this.updatePlayerStats();
            this.updateShopVisuals();
        });

        EventBus.on('start-game', () => this.startGameLogic());

        EventBus.on('pause-game', (pause: boolean) => {
            if (!this.sys) return;
            pause ? this.physics.pause() : (this.isStarted && this.physics.resume());
        });

        EventBus.on('purchase-success', (data: { item: string, newLevel: number }) => {
            if (!this.sys) return;
            (this.stats as any)[data.item] = data.newLevel;
            this.updateShopVisuals();
            this.updatePlayerStats();
        });

        EventBus.emit('current-scene-ready', this);

        EventBus.on('reward-processed', (data: any) => {
            if (!this.sys || !this.player) return;

            // 1. If it's a critical hit, show big red text first
            if (data.isCritical) {
                this.showFloatingText(this.player.x, this.player.y - 80, "CRITICAL HIT! 2X", "#ff0000");
                this.cameras.main.flash(200, 255, 0, 0); // Flash red for impact
            }

            // 2. Show the rewards
            if (data.type === 'SPECIAL_BOMB_LAAM') {
                const color = data.isCritical ? "#ff0000" : "#fbbf24";
                this.showFloatingText(this.player.x, this.player.y - 40, `+${data.laam} LAAM`, color);
            }
            else if (data.type === 'SPECIAL_BOMB_TAG') {
                const color = data.isCritical ? "#ff0000" : "#f0f";
                this.showFloatingText(this.player.x, this.player.y - 40, `+${data.tag} TAG`, color);
            }
        });
    }

    setupGame() {
        this.isGameOver = false;
        this.isBossPhase = false;
        this.enemiesKilled = 0;

        this.updatePlayerStats();
        this.health = this.maxHealth;

        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.rewards = this.physics.add.group();

        this.player = this.physics.add.sprite(100, this.scale.height / 2, 'player');
        this.player.setCollideWorldBounds(true);

        const flare = this.make.graphics({ x: 0, y: 0 });
        flare.fillStyle(0xffffff, 1);
        flare.fillCircle(4, 4, 4);
        flare.generateTexture('flare', 8, 8);
        flare.destroy();

        this.particleManager = this.add.particles(0, 0, 'flare', {
            lifespan: 500,
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            emitting: false
        });

        this.add.particles(0, 0, 'flare', {
            speed: 20,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            follow: this.player,
            followOffset: { x: -15, y: 0 }
        });

        this.bossHealthBar = this.add.graphics().setDepth(100);
        this.playerHealthBar = this.add.graphics().setDepth(100);

        this.infoText = this.add.text(20, 20, '', {
            fontSize: '16px', color: '#fff', backgroundColor: '#000000aa'
        });

        const moveSpeed = 200 * (1 + (this.stats.shoeLevel - 1) * 0.15);

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.isGameOver && !this.isShopOpen && this.isStarted) {
                this.physics.moveToObject(this.player, p, moveSpeed);
            }
        });

        this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.handleHit(b, e), undefined, this);
        this.physics.add.overlap(this.player, this.enemies, () => this.takeDamage(15), undefined, this);
        this.physics.add.overlap(this.player, this.enemyBullets, (p, eb) => {
            (eb as any).destroy();
            this.takeDamage(10);
        }, undefined, this);
        this.physics.add.overlap(this.player, this.rewards, (p, r) => this.collectReward(r), undefined, this);

        this.time.addEvent({
            delay: Math.max(500, 1000 - (this.level * 10)),
            callback: () => this.spawnLogic(),
            loop: true
        });

        const fireRate = Math.max(150, 500 - (this.stats.weaponLevel * 30));
        this.time.addEvent({
            delay: fireRate,
            callback: () => this.fireBullet(),
            loop: true
        });
    }

    applyPowerUpEffect() {
        if (this.stats.weaponLevel > 1 || this.stats.shoeLevel > 1) {
            this.tweens.add({
                targets: this.player,
                alpha: 0.2,
                duration: 100,
                repeat: 5,
                yoyo: true,
                onComplete: () => {
                    this.player.setAlpha(1);
                    this.showFloatingText(this.player.x, this.player.y - 40, "SYSTEMS UPGRADED", "#00ffff");
                }
            });
        }
    }

    startGameLogic() {
        if (this.isStarted) return;
        this.isStarted = true;
        this.physics.resume();
        this.showFloatingText(this.scale.width / 2, this.scale.height / 2, 'MISSION START!', '#fbbf24');
    }

    updatePlayerStats() {
        this.maxHealth = 100 + (this.stats.lifeLevel * 20);
        if (this.health > this.maxHealth) this.health = this.maxHealth;
    }

    spawnLogic() {
        if (!this.isStarted || this.isGameOver || this.isShopOpen) return;
        if (this.stage === 5 && this.enemiesKilled >= 100 && !this.isBossPhase) {
            this.spawnBoss();
        } else if (this.enemiesKilled >= 100 && this.stage < 5) {
            this.advanceStage();
        } else if (!this.isBossPhase) {
            this.spawnEnemy();
        }
    }

    spawnEnemy() {
        const y = Phaser.Math.Between(50, this.scale.height - 50);
        const enemy = this.enemies.create(this.scale.width + 50, y, 'enemy');
        enemy.setVelocityX(-150 - (this.level * 10));

        this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (enemy.active && !this.isGameOver) {
                    const eb = this.enemyBullets.create(enemy.x, enemy.y, 'e_bullet');
                    this.physics.moveToObject(eb, this.player, 200 + (this.level * 5));
                }
            }
        });
    }

    advanceStage() {
        this.stage++;
        this.enemiesKilled = 0;
        this.saveProgress();
        this.showFloatingText(this.scale.width / 2, this.scale.height / 2, `STAGE ${this.stage}`, '#fbbf24');
    }

    spawnBoss() {
        this.isBossPhase = true;
        const maxHp = 100 * this.level;
        this.boss = this.physics.add.sprite(this.scale.width - 150, this.scale.height / 2, 'boss').setScale(2);
        this.boss.setData('hp', maxHp);
        this.boss.setData('maxHp', maxHp);
        this.boss.setTint(0xff0000);

        this.tweens.add({
            targets: this.boss,
            y: { from: 100, to: this.scale.height - 100 },
            duration: 2000,
            yoyo: true,
            repeat: -1
        });
    }

    handleHit(bullet: any, target: any) {
        bullet.destroy();
        this.particleManager.emitParticleAt(target.x, target.y, 15);
        const damage = 1 + (this.stats.weaponLevel * 0.5);

        if (target === this.boss) {
            const hp = target.getData('hp') - damage;
            target.setData('hp', hp);
            this.cameras.main.flash(50, 255, 255, 255, true);

            if (hp <= 0) {
                this.triggerVictory();
            }
        } else {
            this.enemiesKilled++;
            if (Math.random() > 0.9) this.spawnSpecialBomb(target.x, target.y);
            target.destroy();
        }
    }

    triggerVictory() {
        if (this.isGameOver) return;
        this.physics.pause();
        this.isStarted = false;

        // Boss explosion effect
        if (this.boss) {
            this.particleManager.emitParticleAt(this.boss.x, this.boss.y, 100);
            this.boss.destroy();
        }

        // Tell React to show the Victory Screen
        EventBus.emit('victory');
    }

    completeLevel() {
        this.isBossPhase = false;
        // Note: We don't send a type here, so the API defaults to "Level Win" rewards
        EventBus.emit('level-completed', { level: this.level });
        this.level++;
        this.stage = 1;
        this.enemiesKilled = 0;
        this.scene.restart({ stats: this.stats });
    }

    spawnSpecialBomb(x: number, y: number) {
        const bomb = this.rewards.create(x, y, 'bomb');
        bomb.setScale(1.5); // Make it slightly larger than a health pack

        // Roll for the type of reward (0-100)
        const roll = Phaser.Math.Between(1, 100);

        if (roll <= 5) { // 5% chance for TAG (Very Scarce)
            bomb.setData('rewardType', 'TAG');
            bomb.setTint(0xff00ff); // Purple tint for TAG
        } else if (roll <= 20) { // 15% chance for LAAM (Scarce)
            bomb.setData('rewardType', 'LAAM');
            bomb.setTint(0xfbb124); // Gold/Orange tint for LAAM
        } else { // 80% chance for just Health
            bomb.setData('rewardType', 'HEALTH');
            // Default green color
        }
    }

    collectReward(reward: any) {
        const type = reward.getData('rewardType');

        if (type === 'TAG' || type === 'LAAM') {
            // Only trigger the DB update if it's a currency bomb
            EventBus.emit('level-completed', { type: `SPECIAL_BOMB_${type}` });
            this.showFloatingText(this.player.x, this.player.y - 30, "JACKPOT!", "#fff");
        } else {
            // It's a Health bomb
            this.health = Math.min(this.maxHealth, this.health + 20);
            this.showFloatingText(this.player.x, this.player.y, "+HEALTH", "#10b981");
        }

        reward.destroy();
    }

    takeDamage(amount: number) {
        const reducedDmg = Math.max(1, amount - (this.stats.shieldLevel * 2));
        this.health -= reducedDmg;
        this.cameras.main.flash(100, 255, 0, 0);
        this.cameras.main.shake(150, 0.01);
        if (this.health <= 0) this.triggerGameOver();
    }

    triggerGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.isStarted = false;
        this.physics.pause();

        EventBus.emit('game-over');

        this.particleManager.emitParticleAt(this.player.x, this.player.y, 50);
        this.player.setAlpha(0);
    }

    createVisualShop() {
        this.shopContainer = this.add.container(this.scale.width / 2, this.scale.height / 2).setDepth(1000).setVisible(false);
        const bg = this.add.rectangle(0, 0, 400, 500, 0x000000, 0.9).setStrokeStyle(2, 0xeab308);
        const title = this.add.text(0, -220, 'UPGRADE SHOP', { fontSize: '20px', color: '#eab308' }).setOrigin(0.5);
        const closeBtn = this.add.text(180, -230, 'X', { fontSize: '24px', color: '#fff' }).setInteractive().on('pointerdown', () => this.toggleShop());

        this.shopContainer.add([bg, title, closeBtn]);
        this.updateShopVisuals();

        this.add.text(this.scale.width - 100, 60, '🛒 SHOP', {
            backgroundColor: '#eab308', padding: { x: 10, y: 5 }, color: '#000'
        }).setInteractive().on('pointerdown', () => this.toggleShop());
    }

    updateShopVisuals() {
        if (!this.sys || !this.add || !this.shopContainer) return;
        const toRemove = this.shopContainer.list.filter(o => o.getData('isButton'));
        toRemove.forEach(o => o.destroy());

        const items = [
            { id: 'weaponLevel', label: 'WEAPON' },
            { id: 'shieldLevel', label: 'SHIELD' },
            { id: 'shoeLevel', label: 'ENGINE' },
            { id: 'lifeLevel', label: 'HULL' }
        ];

        items.forEach((item, i) => {
            const y = -120 + (i * 80);
            const lvl = (this.stats as any)[item.id];
            const cost = this.baseUpgradeCost * Math.pow(this.costMultiplier, lvl);

            const btn = this.add.text(0, y,
                `${item.label} (LVL ${lvl})\nCost: ${cost.toFixed(0)} TAG`,
                { backgroundColor: '#1f2937', padding: { x: 20, y: 10 }, align: 'center', fontSize: '14px' }
            ).setOrigin(0.5).setInteractive().setData('isButton', true);

            btn.on('pointerdown', () => EventBus.emit('attempt-purchase', { item: item.id, cost: cost }));
            this.shopContainer.add(btn);
        });
    }

    toggleShop() {
        if (this.isGameOver) return;
        this.isShopOpen = !this.isShopOpen;
        this.shopContainer.setVisible(this.isShopOpen);
        this.isShopOpen ? this.physics.pause() : (this.isStarted && this.physics.resume());
    }

    async saveProgress() {
        const wallet = this.registry.get('walletAddress');
        if (!wallet) return;
        try {
            await fetch('/api/games/shooter/sync-stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: wallet, stage: this.stage })
            });
        } catch (e) { console.error("Failed to sync stage to DB", e); }
    }

    update() {
        if (!this.isStarted || this.isGameOver || this.isShopOpen) return;

        this.stars1.tilePositionX += 0.5;
        this.stars2.tilePositionX += 1.2;
        this.stars3.tilePositionX += 2.5;

        this.infoText.setText(
            `STAGE: ${this.stage} | KILLS: ${this.enemiesKilled}/100\n` +
            `WEAPON POWER: LVL ${this.stats.weaponLevel}`
        );

        this.drawBossUI();
        this.drawPlayerHealthBar();
    }

    drawPlayerHealthBar() {
        this.playerHealthBar.clear();
        const x = 20; const y = 70; const width = 200;
        this.playerHealthBar.fillStyle(0x333333);
        this.playerHealthBar.fillRect(x, y, width, 10);
        const healthWidth = Math.max(0, (this.health / this.maxHealth) * width);
        this.playerHealthBar.fillStyle(this.health < (this.maxHealth * 0.3) ? 0xff0000 : 0x00ff00);
        this.playerHealthBar.fillRect(x, y, healthWidth, 10);
    }

    drawBossUI() {
        this.bossHealthBar.clear();
        if (this.isBossPhase && this.boss?.active) {
            const hp = this.boss.getData('hp');
            const maxHp = this.boss.getData('maxHp');
            this.bossHealthBar.fillStyle(0x333333);
            this.bossHealthBar.fillRect(this.scale.width / 4, 20, this.scale.width / 2, 20);
            this.bossHealthBar.fillStyle(0xff0000);
            this.bossHealthBar.fillRect(this.scale.width / 4, 20, Math.max(0, (hp / maxHp) * (this.scale.width / 2)), 20);
        }
    }

    fireBullet() {
        if (!this.isStarted || this.isGameOver || this.isShopOpen) return;
        const b = this.bullets.create(this.player.x + 20, this.player.y, 'bullet');
        if (b) b.setVelocityX(600);
    }

    showFloatingText(x: number, y: number, text: string, color: string) {
        const t = this.add.text(x, y, text, { fontSize: '20px', color, fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }

    createPlaceholderTexture(key: string, width: number, height: number, color: string) {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
        graphics.fillStyle(colorNum, 1);
        graphics.lineStyle(2, 0xffffff, 1);

        if (key === 'player') {
            graphics.beginPath();
            graphics.moveTo(0, 0);
            graphics.lineTo(width, height / 2);
            graphics.lineTo(0, height);
            graphics.closePath();
            graphics.fillPath();
            graphics.strokePath();
        } else if (key === 'bullet' || key === 'e_bullet') {
            graphics.fillCircle(width / 2, height / 2, width / 2);
        } else {
            graphics.fillRoundedRect(0, 0, width, height, 8);
            graphics.strokeRoundedRect(0, 0, width, height, 8);
        }
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    createStarTexture(key: string, size: number, color: string) {
        const canvas = this.make.graphics({ x: 0, y: 0 });
        canvas.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        for (let i = 0; i < 30; i++) {
            canvas.fillCircle(Phaser.Math.Between(0, 512), Phaser.Math.Between(0, 512), size / 2);
        }
        canvas.generateTexture(key, 512, 512);
        canvas.destroy();
    }
}