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
    private levelText!: Phaser.GameObjects.Text;
    private stageText!: Phaser.GameObjects.Text;
    private enemyCountText!: Phaser.GameObjects.Text;
    private joystickBase!: Phaser.GameObjects.Arc;
    private joystickThumb!: Phaser.GameObjects.Arc;
    private joystickActive = false;

    constructor() {
        super('ShooterScene');
    }

    init(data: { stats?: any, level?: number, stage?: number }) {
        // 1. Get data from Registry (where the initial DB fetch is stored)
        const registryData = this.registry.get('initialData');

        // 2. Logic: Prioritize direct data (restarts) then Registry (initial load)
        if (data && (data.level || data.stats)) {
            this.level = data.level || 1;
            this.stage = data.stage || 1;
            this.stats = { ...this.stats, ...data.stats };
        } else if (registryData) {
            // MAP DB NAMES (shooterLevel) -> GAME NAMES (level)
            this.level = registryData.shooterLevel ?? 1;
            this.stage = registryData.shooterStage ?? 1;
            this.stats = { ...this.stats, ...registryData };
        }

        // Reset game state for a fresh run
        this.enemiesKilled = 0;
        this.isGameOver = false;
        this.isBossPhase = false;
        this.isStarted = false;
    }
    saveProgress() {
        this.syncStageToDatabase();
    }

    async syncStageToDatabase() {
        if (!this.stats.walletAddress) return;
        try {
            await fetch('/api/games/shooter/sync-stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: this.stats.walletAddress,
                    level: this.level, // Make sure this is sent!
                    stage: this.stage  // Make sure this is sent!
                })
            });
        } catch (error) {
            console.error("Failed to sync stage:", error);
        }
    }

    preload() { }

    create() {
        this.isManualReady = false;
        this.cameras.main.setBackgroundColor(0x050510);

        // 1. Star backgrounds
        this.stars1 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_slow').setOrigin(0).setScrollFactor(0).setAlpha(0.5);
        this.stars2 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_medium').setOrigin(0).setScrollFactor(0).setAlpha(0.7);
        this.stars3 = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars_fast').setOrigin(0).setScrollFactor(0);

        // 2. Load ship, enemies, and UI
        this.setupGame();

        // 3. Intro Overlay & Boss Warnings
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1).setOrigin(0).setDepth(20000);
        const titleText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, `LEVEL ${this.level} - STAGE ${this.stage}`,
            { fontSize: '42px', color: '#eab308', fontStyle: '900 italic', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20001);

        const isBossStage = this.stage === 5;
        const subText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 30,
            isBossStage ? "WARNING: BOSS SIGNATURE DETECTED" : "INITIALIZING COMBAT PROTOCOL...",
            { fontSize: '14px', color: isBossStage ? '#ff0000' : '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20001);

        if (isBossStage) {
            this.tweens.add({ targets: subText, alpha: 0, duration: 200, yoyo: true, repeat: -1 });
        }

        // 4. Particle Setup
        this.particleManager = this.add.particles(0, 0, 'flare', {
            speed: { min: -200, max: 200 },
            scale: { start: 1.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            emitting: false
        });

        // 5. Fade out Intro & Auto-Start Countdown
        this.tweens.add({
            targets: [overlay, titleText, subText],
            alpha: 0,
            duration: 500,
            delay: 1500,
            onComplete: () => {
                overlay.destroy();
                titleText.destroy();
                subText.destroy();
                this.isManualReady = true;
                this.startGameLogic(); // This triggers the 3-2-1 countdown
            }
        });

        // 6. --- UPDATED EVENT LISTENERS ---
        EventBus.off('start-game');
        EventBus.off('apply-upgrades');
        EventBus.off('redeploy-player');
        EventBus.off('pause-game');
        EventBus.off('resume-stage');

        EventBus.on('start-game', () => {
            this.isStarted = true;
            if (this.physics) this.physics.resume();
            this.startGameLogic();
        }, this);

        EventBus.on('redeploy-player', () => {
            this.scene.restart({ stats: this.stats, level: this.level, stage: this.stage });
        });

        EventBus.on('pause-game', (pause: boolean) => {
            if (this.isManualReady && this.physics) {
                pause ? this.physics.pause() : (this.isStarted && this.physics.resume());
            }
        });

        EventBus.on('apply-upgrades', (data: any) => {

            if (data.weaponLevel) this.stats.weaponLevel = data.weaponLevel;
            if (data.shieldLevel) this.stats.shieldLevel = data.shieldLevel;
            if (data.shoeLevel) this.stats.shoeLevel = data.shoeLevel;
            if (data.lifeLevel) this.stats.lifeLevel = data.lifeLevel;

            this.updatePlayerStats();

            // Only show the flash/tint if the player sprite is actually created
            if (this.player && this.player.active) {
                this.applyPowerUpEffect();
            }
        });

        EventBus.on('resume-stage', () => {
            this.isManualReady = true;
            this.isStarted = true;
            if (this.physics) this.physics.resume();
        }, this);
        // 7. Mark as ready for React
        this.time.delayedCall(200, () => {
            EventBus.emit('current-scene-ready', this);
        });

        // 8. Cleanup on shutdown
        this.events.on('shutdown', () => {
            this.isManualReady = false;
            EventBus.off('start-game');
            EventBus.off('pause-game');
            EventBus.off('apply-upgrades');
            EventBus.off('redeploy-player');
            EventBus.off('resume-stage');

            if (this.fireEvent) this.fireEvent.remove();
        });

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            const { width, height } = gameSize;

            this.cameras.main.setViewport(0, 0, width, height);

            // Reposition UI
            this.levelText.setPosition(20, 20);
            this.stageText.setPosition(20, 50);
            this.enemyCountText.setPosition(20, 80);

            // Position Info Text (the one at the very top)
            if (this.infoText) this.infoText.setPosition(width * 0.02, height * 0.02);

            this.physics.world.setBounds(0, 0, width, height);

            this.stars1.setSize(width, height);
            this.stars2.setSize(width, height);
            this.stars3.setSize(width, height);

            // IMPORTANT: Reset joystick if active to prevent the player from getting stuck
            if (this.joystickActive) {
                this.hideJoystick();
            }
        });
    }

    setupGame() {
        // 1. Get dynamic dimensions from the Scale Manager
        const { width, height } = this.scale;

        this.updatePlayerStats();
        this.health = this.maxHealth;
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.rewards = this.physics.add.group();

        // 2. Position player relative to the NEW dynamic width/height
        // width * 0.1 puts the player 10% from the left edge regardless of screen size
        this.player = this.physics.add.sprite(width * 0.1, height / 2, 'player');
        this.player.setCollideWorldBounds(true).setRotation(Phaser.Math.DegToRad(90));
        this.player.setDisplaySize(50, 50);
        this.player.setDrag(5000);

        if (!this.textures.exists('flare')) {
            const flare = this.make.graphics({ x: 0, y: 0 }, false)
                .fillStyle(0xffffff, 1)
                .fillCircle(4, 4, 4);
            flare.generateTexture('flare', 8, 8);
            flare.destroy();
        }

        this.bossHealthBar = this.add.graphics().setDepth(100);
        this.playerHealthBar = this.add.graphics().setDepth(100);

        // 3. Update info text and HUD positioning to be relative to screen edges
        this.infoText = this.add.text(width * 0.02, height * 0.02, '', { fontSize: '18px', color: '#fff', fontStyle: 'bold' });

        // Use absolute margins (20px) but they will now always stay at the top-left of the viewport
        this.levelText = this.add.text(20, 20, `LEVEL: ${this.level}`, { fontSize: '22px', color: '#ffffff', fontFamily: 'monospace' }).setDepth(50000);
        this.stageText = this.add.text(20, 50, `STAGE: ${this.stage}`, { fontSize: '18px', color: '#eab308', fontFamily: 'monospace' }).setDepth(50000);
        this.enemyCountText = this.add.text(20, 80, `TARGET: ${this.enemiesKilled}/${this.enemiesToKill}`, { fontSize: '18px', color: '#ff4444', fontFamily: 'monospace' }).setDepth(50000);

        // 4. Ensure background TileSprites fill the entire dynamic screen
        if (this.stars1) this.stars1.setSize(width, height);
        if (this.stars2) this.stars2.setSize(width, height);
        if (this.stars3) this.stars3.setSize(width, height);

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
        // 1. Calculate safe vertical bounds based on current height
        const y = Phaser.Math.Between(50, this.scale.height - 50);
        const texture = Math.random() > 0.5 ? 'enemy1' : 'enemy2';

        // 2. Spawn exactly 50px past the dynamic right edge
        const enemy = this.enemies.create(this.scale.width + 50, y, texture);
        enemy.setDisplaySize(50, 50);

        const difficultyStep = ((this.level - 1) * 5) + (this.stage - 1);
        const multiplier = Math.pow(1.5, difficultyStep);
        enemy.setData('hp', 2 * multiplier);

        // 3. Adjust speed based on level
        enemy.setVelocityX(-200 - (this.level * 25));

        if (Math.random() > 0.7) {
            this.time.delayedCall(Phaser.Math.Between(500, 2000), () => {
                if (this.isManualReady && enemy.active) {
                    const eb = this.enemyBullets.create(enemy.x, enemy.y, 'e_bullet');
                    if (eb) {
                        eb.setDisplaySize(15, 15);
                        eb.setVelocityX(-300 * (1 + (difficultyStep * 0.15)));
                        for (let i = 0; i < 3; i++) {
                            this.createMuzzleFlash(
                                enemy.x + Phaser.Math.Between(-20, 20),
                                enemy.y + Phaser.Math.Between(-20, 20),
                                0xff3333,
                                1.2
                            );
                        }
                    }
                }
            });
        }
    }

    spawnBoss() {
        this.isBossPhase = true;
        this.cameras.main.shake(1000, 0.01);

        const { width, height } = this.scale;
        const difficultyStep = ((this.level - 1) * 5) + (this.stage - 1);
        const multiplier = Math.pow(1.5, difficultyStep);
        const maxHp = 500 * multiplier;

        // 1. Spawn off-screen relative to dynamic width
        this.boss = this.physics.add.sprite(width + 150, height / 2, 'boss1');
        this.boss.setDisplaySize(200, 200).setRotation(Phaser.Math.DegToRad(-90));
        this.boss.setData('hp', maxHp).setData('maxHp', maxHp);
        this.physics.add.overlap(this.bullets, this.boss, (boss, bullet) => this.handleHit(bullet, boss), undefined, this);

        // 2. Tween to a position 200px from the current right edge
        this.tweens.add({
            targets: this.boss,
            x: width - 200,
            duration: 2000,
            onComplete: () => {
                if (this.boss) {
                    // Vertical movement stays within the current height
                    this.tweens.add({
                        targets: this.boss,
                        y: { from: 150, to: height - 150 },
                        duration: 2000,
                        yoyo: true,
                        repeat: -1
                    });
                }
            }
        });

        this.time.addEvent({
            delay: Math.max(150, 1000 / multiplier),
            callback: () => {
                if (this.isManualReady && this.boss?.active && this.player.active) {
                    const eb = this.enemyBullets.create(this.boss.x, this.boss.y, 'e_bullet');
                    if (eb) {
                        eb.setDisplaySize(20, 20);
                        this.physics.moveToObject(eb, this.player, 400);
                        for (let i = 0; i < 8; i++) {
                            this.createMuzzleFlash(
                                this.boss.x + Phaser.Math.Between(-80, 80),
                                this.boss.y + Phaser.Math.Between(-80, 80),
                                0xff0000,
                                2.0
                            );
                        }
                    }
                }
            },
            loop: true
        });
    }

    handleHit(bullet: any, target: any) {
        bullet.destroy();
        this.createExplosion(target.x, target.y, 0xffffff, 5);

        // Visual feedback for hitting the boss
        if (target === this.boss) {
            target.setTint(0xff0000); // Flash Red
            this.time.delayedCall(50, () => {
                if (target && target.active) target.clearTint();
            });
        }

        // Calculate damage based on Weapon Level
        const playerDamage = 10 * (1 + (this.stats.weaponLevel - 1) * 0.35);
        let hp = target.getData('hp') - playerDamage;
        target.setData('hp', hp);

        // Check if the target is destroyed
        if (hp <= 0) {
            if (target === this.boss) {
                this.onBossKilled();
            } else {
                // Logic for regular enemies
                this.createExplosion(target.x, target.y, 0xff4444, 25);
                this.enemiesKilled++;

                // Update the UI counter
                this.enemyCountText.setText(`TARGET: ${this.enemiesKilled}/${this.enemiesToKill}`);

                // 12% chance to drop a special bomb (TAG, LAAM, or Health)
                if (Math.random() > 0.88) {
                    this.spawnSpecialBomb(target.x, target.y);
                }

                target.destroy();
            }
        }
    }

    onBossKilled() {
        this.isBossPhase = false;
        if (this.boss) {
            this.createExplosion(this.boss.x, this.boss.y, 0xeab308, 100);
            this.cameras.main.shake(500, 0.02);
            this.boss.destroy();
        }
        if (this.stage < 5) {
            this.stage++;
        } else {
            this.level++;
            this.stage = 1;
        }
        this.enemiesKilled = 0;
        this.saveProgress();
        EventBus.emit('stage-cleared', { stage: this.stage });
        this.scene.restart({ stats: this.stats, level: this.level, stage: this.stage });
    }

    takeDamage(amount: number) {
        if (this.isGameOver) return;
        this.cameras.main.flash(100, 255, 0, 0, false);

        // Update the internal health
        this.health -= amount * Math.max(0.1, 1 - (this.stats.shieldLevel - 1) * 0.15);

        // ADD THIS LINE: Send the NEW health value to React
        EventBus.emit('health-changed', { health: this.health });

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
        bomb.setDisplaySize(30, 30);
        const roll = Phaser.Math.Between(1, 100);
        if (roll <= 10) bomb.setData('rewardType', 'TAG').setTint(0xff00ff);
        else if (roll <= 30) bomb.setData('rewardType', 'LAAM').setTint(0xfbb124);
        else bomb.setData('rewardType', 'HEALTH');
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

        const pointer = this.input.activePointer;

        // --- MOVEMENT LOGIC (Joystick for Mobile/PC) ---
        if (pointer.isDown) {
            // Trigger joystick only if touching the left half of the screen
            if (!this.joystickActive && pointer.x < this.scale.width / 2) {
                this.showJoystick(pointer.x, pointer.y);
            }

            if (this.joystickActive) {
                this.handleJoystickMovement(pointer);
            }
        } else {
            this.hideJoystick(); // Resets velocity to 0 when finger is lifted
        }

        // --- YOUR ORIGINAL GAME LOGIC ---

        // 1. Scroll Backgrounds
        this.stars1.tilePositionX += 0.5;
        this.stars2.tilePositionX += 1.2;
        this.stars3.tilePositionX += 2.5;

        // 2. Refresh UI
        this.drawBossUI();
        this.drawPlayerHealthBar();

        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.x < -100) {
                enemy.destroy();
            }
        });

        this.bullets.getChildren().forEach((bullet: any) => {
            if (bullet.x > this.scale.width + 100) {
                bullet.destroy();
            }
        });
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
            const b = this.bullets.create(this.player.x, this.player.y, 'bullet');
            b.setDisplaySize(20, 20);
            b.setVelocityX(800);
            const flashX = this.player.x + Math.cos(this.player.rotation - Math.PI / 2) * 30;
            const flashY = this.player.y + Math.sin(this.player.rotation - Math.PI / 2) * 30;
            this.createMuzzleFlash(flashX, flashY, 0x00ffff, 1.5);

            if (this.stats.weaponLevel > 1) {
                const shakeIntensity = 0.001 * this.stats.weaponLevel;
                this.cameras.main.shake(50, shakeIntensity);
                const recoilStrength = 5 * this.stats.weaponLevel;
                const angle = this.player.rotation - Phaser.Math.DegToRad(90);
                this.player.x -= Math.cos(angle) * recoilStrength;
                this.player.y -= Math.sin(angle) * recoilStrength;
            }
        }
    }

    showFloatingText(x: number, y: number, text: string, color: string) {
        const t = this.add.text(x, y, text, { fontSize: '22px', color, fontStyle: 'bold' }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }

    private createMuzzleFlash(x: number, y: number, color: number, scale: number) {
        const flash = this.add.image(x, y, 'flare').setTint(color).setAlpha(1).setScale(scale).setBlendMode('ADD');
        this.tweens.add({
            targets: flash,
            scale: scale * 2,
            alpha: 0,
            duration: 100,
            onComplete: () => flash.destroy()
        });
    }

    private createExplosion(x: number, y: number, color: number, count: number = 20) {
        if (this.particleManager) {
            this.particleManager.setParticleTint(color);
            this.particleManager.emitParticleAt(x, y, count);
        }
    }

    private createCountdown() {
        const colors = [0xff0000, 0xff8800, 0x00ff00];
        ['3', '2', '1'].forEach((val, i) => {
            this.time.delayedCall(i * 400, () => {
                const txt = this.add.text(this.scale.width / 2, this.scale.height / 2, val, { fontSize: '120px', color: '#ffffff', fontStyle: 'bold' })
                    .setOrigin(0.5).setDepth(30000).setTint(colors[i]);
                this.tweens.add({ targets: txt, scale: 2, alpha: 0, duration: 350, onComplete: () => txt.destroy() });
            });
        });
    }

    private showJoystick(x: number, y: number) {
        if (!this.joystickBase) {
            this.joystickBase = this.add.circle(x, y, 50, 0xffffff, 0.2).setDepth(100000);
            this.joystickThumb = this.add.circle(x, y, 25, 0xffffff, 0.5).setDepth(100001);
        }
        this.joystickBase.setPosition(x, y).setVisible(true);
        this.joystickThumb.setPosition(x, y).setVisible(true);
        this.joystickActive = true;
    }

    private hideJoystick() {
        if (this.joystickBase) {
            this.joystickBase.setVisible(false);
            this.joystickThumb.setVisible(false);
        }
        this.joystickActive = false;
        this.player.setVelocity(0, 0);
    }

    private handleJoystickMovement(pointer: Phaser.Input.Pointer) {
        const dist = Phaser.Math.Distance.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
        const maxDist = 50;
        const deadzone = 5; // Pixels to ignore

        if (dist < deadzone) {
            this.player.setVelocity(0, 0);
            this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
            return;
        }

        const moveDist = Math.min(dist, maxDist);
        this.joystickThumb.setPosition(
            this.joystickBase.x + Math.cos(angle) * moveDist,
            this.joystickBase.y + Math.sin(angle) * moveDist
        );

        const force = moveDist / maxDist;
        const baseSpeed = 500 * (1 + (this.stats.shoeLevel - 1) * 0.35);
        const finalSpeed = baseSpeed * force;

        this.player.setVelocity(Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed);
        this.player.setRotation(angle + Phaser.Math.DegToRad(90));
    }
}