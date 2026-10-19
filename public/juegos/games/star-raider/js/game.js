// Star Raider Neo - Motor de Juego Shoot'em Up con Niveles y Progresión Galáctica
class StarRaiderGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensiones arcade vertical
        this.width = 480;
        this.height = 640;
        this.setupCanvas();

        // Estado del juego
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;

        this.score = 0;
        this.currentSector = 1; // 1 a 5
        this.highScore = parseInt(localStorage.getItem('star_raider_high_score') || '0', 10);

        // Definición de Sectores (Niveles)
        this.sectors = [
            {
                name: 'Sector Alfa: Cinturón de Asteroides',
                bgTint: '#070913',
                enemiesToBoss: 18,
                bossType: 'titan_meteor',
                bossName: '☄️ TITÁN METEOROIDE',
                bossHp: 25
            },
            {
                name: 'Sector Beta: Frente de Cazas Alienígenas',
                bgTint: '#0d0a1a',
                enemiesToBoss: 24,
                bossType: 'alien_gunship',
                bossName: '🛸 CAÑONERA DE ASALTO',
                bossHp: 38
            },
            {
                name: 'Sector Gamma: Campo de Minas Espaciales',
                bgTint: '#08141c',
                enemiesToBoss: 28,
                bossType: 'carrier',
                bossName: '🛸 PORTA-DRONES MATRIZ',
                bossHp: 50
            },
            {
                name: 'Sector Delta: Fortaleza Orbital',
                bgTint: '#1a0914',
                enemiesToBoss: 32,
                bossType: 'dreadnought',
                bossName: '⚔️ DESTRUCTOR DREADNOUGHT',
                bossHp: 65
            },
            {
                name: 'Sector Omega: Núcleo de la Nave Nodriza',
                bgTint: '#160824',
                enemiesToBoss: 36,
                bossType: 'mothership',
                bossName: '👑 LA NAVE NODRIZA FINAL',
                bossHp: 90
            }
        ];

        // Estrellas de fondo parallax (con soporte de hiperespacio)
        this.stars = [];
        this.isWarping = false;
        this.warpTimer = 0;
        this.initStars();

        // Entidades
        this.player = null;
        this.playerLasers = [];
        this.playerMissiles = [];
        this.alienLasers = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.activeBoss = null;

        // Contadores del sector actual
        this.enemiesDefeatedInSector = 0;
        this.spawnTimer = 0;
        this.screenShake = 0;
        this.sectorClearTimer = 0;

        // Controles de entrada
        this.keys = {};
        this.touchPos = null;
        this.isPointerDown = false;

        this.bindEvents();
        this.updateUI();
        this.startLoop();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 90; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 0.6,
                alpha: Math.random() * 0.7 + 0.3
            });
        }
    }

    resetPlayer() {
        this.player = {
            x: this.width / 2,
            y: this.height - 80,
            width: 36,
            height: 38,
            speed: 5.6,
            lives: 3,
            weaponLevel: 1, // Progresión del 1 al 6
            bombs: 2,       // Bombas EMP
            hasShield: false,
            invulnerableTime: 0,
            shootCooldown: 0,
            missileCooldown: 0,
            shootInterval: 13
        };
    }

    start() {
        window.shooterAudio.init();
        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.score = 0;
        this.currentSector = 1;

        this.resetPlayer();
        this.playerLasers = [];
        this.playerMissiles = [];
        this.alienLasers = [];
        this.enemies = [];
        this.powerups = [];
        this.particles = [];
        this.activeBoss = null;
        this.isWarping = false;

        this.initSector(1);

        document.getElementById('game-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');

        window.shooterAudio.startMusic();
        this.updateUI();
    }

    initSector(sectorNum) {
        this.currentSector = Math.min(this.sectors.length, Math.max(1, sectorNum));
        this.enemiesDefeatedInSector = 0;
        this.spawnTimer = 0;
        this.activeBoss = null;
        this.isWarping = false;

        // Otorga +1 bomba al entrar en un nuevo sector
        if (this.player) {
            this.player.bombs = Math.min(4, this.player.bombs + 1);
        }

        this.showSectorBanner(this.sectors[this.currentSector - 1].name);
        this.updateUI();
    }

    showSectorBanner(text) {
        const banner = document.getElementById('sector-banner');
        if (banner) {
            banner.innerText = text;
            banner.classList.remove('hidden');
            setTimeout(() => {
                banner.classList.add('hidden');
            }, 3000);
        }
    }

    triggerSectorClear() {
        this.isWarping = true;
        this.warpTimer = 160; // Cuadros de animación de hiperespacio
        window.shooterAudio.playLevelClear();
        this.score += 1500 * this.currentSector;

        // Si ya completó el sector final (Sector 5)
        if (this.currentSector >= this.sectors.length) {
            setTimeout(() => {
                this.victoryGame();
            }, 2500);
            return;
        }

        setTimeout(() => {
            this.initSector(this.currentSector + 1);
        }, 3200);
    }

    victoryGame() {
        this.isRunning = false;
        const overlay = document.getElementById('game-overlay');
        document.getElementById('overlay-title').innerText = '🏆 ¡GALAXIA SALVADA!';
        document.getElementById('overlay-desc').innerText = `¡Has destruido la Nave Nodriza Alienígena! Puntaje Final: ${this.score.toLocaleString()}`;
        document.getElementById('btn-overlay-play').innerText = 'Jugar Otra Vez 🚀';
        overlay.classList.remove('hidden');
        this.updateUI();
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            window.shooterAudio.stopMusic();
            pauseOverlay.classList.remove('hidden');
        } else {
            pauseOverlay.classList.add('hidden');
            window.shooterAudio.startMusic();
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        window.shooterAudio.playGameOver();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('star_raider_high_score', this.highScore.toString());
        }

        const overlay = document.getElementById('game-overlay');
        document.getElementById('overlay-title').innerText = 'GAME OVER';
        document.getElementById('overlay-desc').innerText = `Sector ${this.currentSector} | Puntaje: ${this.score.toLocaleString()}`;
        document.getElementById('btn-overlay-play').innerText = 'Reintentar Sector ↺';
        overlay.classList.remove('hidden');
        this.updateUI();
    }

    // --- SISTEMA DE ARMAS DEL JUGADOR ---
    shoot() {
        if (!this.player || this.player.shootCooldown > 0) return;

        const p = this.player;
        const level = p.weaponLevel;

        window.shooterAudio.playShoot();

        // Nivel 1: Láser Simple (1x)
        if (level === 1) {
            this.playerLasers.push({ x: p.x, y: p.y - 18, vx: 0, vy: -12, color: '#00f5d4', damage: 1 });
        }
        // Nivel 2: Cañón Gemelo Dual (2x)
        else if (level === 2) {
            this.playerLasers.push({ x: p.x - 10, y: p.y - 14, vx: 0, vy: -12.5, color: '#00f5d4', damage: 1 });
            this.playerLasers.push({ x: p.x + 10, y: p.y - 14, vx: 0, vy: -12.5, color: '#00f5d4', damage: 1 });
        }
        // Nivel 3: Dispersión Tridente (3x)
        else if (level === 3) {
            this.playerLasers.push({ x: p.x, y: p.y - 18, vx: 0, vy: -12.5, color: '#ffbe0b', damage: 1 });
            this.playerLasers.push({ x: p.x - 12, y: p.y - 12, vx: -2.2, vy: -12, color: '#ffbe0b', damage: 1 });
            this.playerLasers.push({ x: p.x + 12, y: p.y - 12, vx: 2.2, vy: -12, color: '#ffbe0b', damage: 1 });
        }
        // Nivel 4: Cuádruple Plasma Blaster (4x)
        else if (level === 4) {
            this.playerLasers.push({ x: p.x - 8, y: p.y - 18, vx: -0.5, vy: -13, color: '#ff006e', damage: 1.4 });
            this.playerLasers.push({ x: p.x + 8, y: p.y - 18, vx: 0.5, vy: -13, color: '#ff006e', damage: 1.4 });
            this.playerLasers.push({ x: p.x - 18, y: p.y - 10, vx: -3, vy: -12, color: '#3a86ff', damage: 1 });
            this.playerLasers.push({ x: p.x + 18, y: p.y - 10, vx: 3, vy: -12, color: '#3a86ff', damage: 1 });
        }
        // Nivel 5: Hyperbeam Quíntuple (5x)
        else if (level === 5) {
            this.playerLasers.push({ x: p.x, y: p.y - 20, vx: 0, vy: -14, color: '#00f5d4', damage: 1.8 });
            this.playerLasers.push({ x: p.x - 12, y: p.y - 16, vx: -1.5, vy: -13.5, color: '#ff006e', damage: 1.4 });
            this.playerLasers.push({ x: p.x + 12, y: p.y - 16, vx: 1.5, vy: -13.5, color: '#ff006e', damage: 1.4 });
            this.playerLasers.push({ x: p.x - 22, y: p.y - 10, vx: -3.8, vy: -12, color: '#ffbe0b', damage: 1.2 });
            this.playerLasers.push({ x: p.x + 22, y: p.y - 10, vx: 3.8, vy: -12, color: '#ffbe0b', damage: 1.2 });
        }
        // Nivel 6: Armada Omega (Cañón Pesado + Misiles Teledirigidos automáticos)
        else {
            this.playerLasers.push({ x: p.x - 10, y: p.y - 20, vx: -0.6, vy: -14, color: '#00f5d4', damage: 2 });
            this.playerLasers.push({ x: p.x + 10, y: p.y - 20, vx: 0.6, vy: -14, color: '#00f5d4', damage: 2 });
            this.playerLasers.push({ x: p.x - 24, y: p.y - 12, vx: -3.5, vy: -12.5, color: '#ff006e', damage: 1.5 });
            this.playerLasers.push({ x: p.x + 24, y: p.y - 12, vx: 3.5, vy: -12.5, color: '#ff006e', damage: 1.5 });

            // Disparar misil teledirigido cada cierto tiempo
            if (p.missileCooldown <= 0) {
                this.launchHomingMissile(p.x - 20, p.y);
                this.launchHomingMissile(p.x + 20, p.y);
                p.missileCooldown = 28;
                window.shooterAudio.playMissile();
            }
        }

        p.shootCooldown = p.shootInterval;
    }

    launchHomingMissile(x, y) {
        this.playerMissiles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 3,
            vy: -4,
            speed: 7.5,
            damage: 3.5,
            target: null,
            life: 120
        });
    }

    // Usar Bomba EMP
    useBomb() {
        if (!this.player || this.player.bombs <= 0 || !this.isRunning || this.isPaused) return;

        this.player.bombs--;
        window.shooterAudio.playBomb();
        this.screenShake = 16;

        // 1. Eliminar todos los proyectiles alienígenas
        this.alienLasers = [];

        // 2. Dañar intensamente a todos los enemigos y jefes
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.hp -= 6;
            this.createExplosion(e.x, e.y, '#00f5d4', false);
            if (e.hp <= 0) {
                this.destroyEnemy(e, i);
            }
        }

        // Si hay jefe activo, sufre daño masivo
        if (this.activeBoss) {
            this.activeBoss.hp -= 15;
            this.createExplosion(this.activeBoss.x, this.activeBoss.y, '#ff006e', true);
            if (this.activeBoss.hp <= 0) {
                this.destroyBoss();
            }
        }

        // Efecto visual de onda expansiva
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * 12,
                vy: Math.sin(angle) * 12,
                size: 5,
                color: '#00f5d4',
                alpha: 1,
                decay: 0.03
            });
        }

        this.updateUI();
    }

    // --- GENERACIÓN SEGÚN EL SECTOR ---
    spawnEnemy() {
        const sec = this.sectors[this.currentSector - 1];

        // ¿Toca invocar al Jefe del Sector?
        if (this.enemiesDefeatedInSector >= sec.enemiesToBoss && !this.activeBoss && this.enemies.length === 0) {
            this.spawnBoss(sec);
            return;
        }

        if (this.activeBoss) return; // No generar esbirros menores si el jefe está activo

        const roll = Math.random();

        // Variedad de enemigos según el nivel/sector
        if (this.currentSector === 1) {
            // Sector 1: Meteoritos comunes y scouts ligeros
            if (roll < 0.6) this.spawnMeteor('normal');
            else this.spawnAlien('scout');
        } else if (this.currentSector === 2) {
            // Sector 2: Meteoritos de fuego + cazas interceptores
            if (roll < 0.45) this.spawnMeteor(roll < 0.25 ? 'fire' : 'normal');
            else this.spawnAlien('interceptor');
        } else if (this.currentSector === 3) {
            // Sector 3: Minas espaciales magnéticas + drones
            if (roll < 0.35) this.spawnMine();
            else if (roll < 0.7) this.spawnAlien('interceptor');
            else this.spawnMeteor('fire');
        } else if (this.currentSector === 4) {
            // Sector 4: Cruceros acorazados pesados + meteoritos metálicos
            if (roll < 0.3) this.spawnCruiser();
            else if (roll < 0.6) this.spawnAlien('interceptor');
            else this.spawnMeteor('metal');
        } else {
            // Sector 5: Armada completa élite
            if (roll < 0.25) this.spawnCruiser();
            else if (roll < 0.5) this.spawnMine();
            else if (roll < 0.75) this.spawnAlien('interceptor');
            else this.spawnMeteor('metal');
        }
    }

    spawnMeteor(type = 'normal') {
        const size = Math.random() < 0.4 ? 'large' : (Math.random() < 0.6 ? 'medium' : 'small');
        const radius = size === 'large' ? 30 : (size === 'medium' ? 19 : 12);
        const hpBase = size === 'large' ? 4 : (size === 'medium' ? 2 : 1);
        const hp = type === 'metal' ? hpBase * 2 : hpBase;

        const points = [];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            points.push({ x: Math.cos(angle) * radius * (0.8 + Math.random() * 0.4), y: Math.sin(angle) * radius * (0.8 + Math.random() * 0.4) });
        }

        this.enemies.push({
            type: 'meteor',
            subType: type,
            size: size,
            radius: radius,
            points: points,
            x: Math.random() * (this.width - radius * 2) + radius,
            y: -radius - 10,
            vx: (Math.random() - 0.5) * 1.8,
            vy: Math.random() * 1.5 + 1.2 + this.currentSector * 0.2,
            angle: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.06,
            hp: hp,
            maxHp: hp,
            scoreValue: (size === 'large' ? 150 : 80) * this.currentSector
        });
    }

    spawnAlien(alienType = 'scout') {
        const isInterceptor = alienType === 'interceptor';
        this.enemies.push({
            type: 'alien',
            alienType: alienType,
            x: Math.random() * (this.width - 70) + 35,
            y: -35,
            vx: (Math.random() - 0.5) * (isInterceptor ? 3.0 : 2.0),
            vy: Math.random() * 1.2 + (isInterceptor ? 2.0 : 1.5),
            width: isInterceptor ? 36 : 30,
            height: 30,
            hp: isInterceptor ? 4 : 2,
            maxHp: isInterceptor ? 4 : 2,
            shootTimer: Math.random() * 50 + 40,
            scoreValue: (isInterceptor ? 200 : 120) * this.currentSector
        });
    }

    spawnMine() {
        this.enemies.push({
            type: 'mine',
            radius: 14,
            x: Math.random() * (this.width - 50) + 25,
            y: -25,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 1.4,
            pulse: 0,
            hp: 2,
            maxHp: 2,
            scoreValue: 180 * this.currentSector
        });
    }

    spawnCruiser() {
        this.enemies.push({
            type: 'cruiser',
            width: 54,
            height: 44,
            x: Math.random() * (this.width - 100) + 50,
            y: -50,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 1.1,
            hp: 10,
            maxHp: 10,
            shield: 4,
            shootTimer: 45,
            scoreValue: 400 * this.currentSector
        });
    }

    spawnBoss(sec) {
        window.shooterAudio.playBossWarning();
        this.screenShake = 12;

        this.activeBoss = {
            name: sec.bossName,
            type: sec.bossType,
            x: this.width / 2,
            y: -80,
            targetY: 110,
            width: sec.bossType === 'mothership' ? 140 : 100,
            height: sec.bossType === 'mothership' ? 90 : 65,
            hp: sec.bossHp,
            maxHp: sec.bossHp,
            vx: 2.2,
            attackTimer: 0,
            phase: 1
        };

        this.updateUI();
    }

    destroyBoss() {
        if (!this.activeBoss) return;
        const b = this.activeBoss;

        // Gran explosión apoteósica
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createExplosion(b.x + (Math.random() - 0.5) * b.width, b.y + (Math.random() - 0.5) * b.height, '#ff006e', true);
                window.shooterAudio.playExplosion(true);
            }, i * 150);
        }

        this.score += 5000 * this.currentSector;
        this.activeBoss = null;

        // Soltar recompensas de lujo
        this.powerups.push({ x: b.x - 20, y: b.y, vy: 1.5, type: 'weapon', rotation: 0 });
        this.powerups.push({ x: b.x + 20, y: b.y, vy: 1.5, type: 'shield', rotation: 0 });
        this.powerups.push({ x: b.x, y: b.y - 15, vy: 1.5, type: 'life', rotation: 0 });

        this.updateUI();
        this.triggerSectorClear();
    }

    // --- BUCLE PRINCIPAL DE ACTUALIZACIÓN ---
    update() {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;

        // Efecto hiperespacio
        const starSpeedMultiplier = this.isWarping ? 12 : 1;

        // 1. Mover estrellas
        this.stars.forEach(s => {
            s.y += s.speed * starSpeedMultiplier;
            if (s.y > this.height) {
                s.y = 0;
                s.x = Math.random() * this.width;
            }
        });

        if (this.isWarping) {
            this.warpTimer--;
            if (this.warpTimer <= 0) this.isWarping = false;
            return; // Durante el salto de hiperespacio no hay combate
        }

        // 2. Control del jugador
        const p = this.player;
        if (p) {
            if (p.shootCooldown > 0) p.shootCooldown--;
            if (p.missileCooldown > 0) p.missileCooldown--;
            if (p.invulnerableTime > 0) p.invulnerableTime--;

            if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) p.x -= p.speed;
            if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) p.x += p.speed;
            if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) p.y -= p.speed;
            if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) p.y += p.speed;

            if (this.keys[' ']) this.shoot();

            if (this.touchPos && this.isPointerDown) {
                const dx = this.touchPos.x - p.x;
                const dy = (this.touchPos.y - 45) - p.y;
                p.x += dx * 0.2;
                p.y += dy * 0.2;
                this.shoot();
            }

            p.x = Math.max(p.width / 2, Math.min(this.width - p.width / 2, p.x));
            p.y = Math.max(this.height * 0.35, Math.min(this.height - p.height / 2 - 10, p.y));
        }

        // 3. Generación periódica
        this.spawnTimer++;
        if (this.spawnTimer > Math.max(26, 75 - this.currentSector * 8)) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // 4. Actualizar Láseres del Jugador
        for (let i = this.playerLasers.length - 1; i >= 0; i--) {
            const l = this.playerLasers[i];
            l.x += l.vx;
            l.y += l.vy;
            if (l.y < -20 || l.x < -10 || l.x > this.width + 10) {
                this.playerLasers.splice(i, 1);
            }
        }

        // 5. Actualizar Misiles Teledirigidos del Jugador
        for (let i = this.playerMissiles.length - 1; i >= 0; i--) {
            const m = this.playerMissiles[i];
            m.life--;

            // Buscar enemigo más cercano si no tiene objetivo
            if (!m.target || m.target.hp <= 0) {
                let closest = this.activeBoss || null;
                let minDist = closest ? 9999 : 450;
                this.enemies.forEach(e => {
                    const d = Math.hypot(e.x - m.x, e.y - m.y);
                    if (d < minDist) {
                        minDist = d;
                        closest = e;
                    }
                });
                m.target = closest;
            }

            // Guiado hacia el objetivo
            if (m.target) {
                const angle = Math.atan2(m.target.y - m.y, m.target.x - m.x);
                m.vx += Math.cos(angle) * 0.6;
                m.vy += Math.sin(angle) * 0.6;
                const currentSpd = Math.hypot(m.vx, m.vy);
                m.vx = (m.vx / currentSpd) * m.speed;
                m.vy = (m.vy / currentSpd) * m.speed;
            }

            m.x += m.vx;
            m.y += m.vy;

            // Estela de humo
            if (Math.random() < 0.6) {
                this.particles.push({
                    x: m.x,
                    y: m.y,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5,
                    size: 3,
                    color: '#ffbe0b',
                    alpha: 0.8,
                    decay: 0.05
                });
            }

            // Impacto del misil
            let hit = false;
            if (this.activeBoss && Math.hypot(this.activeBoss.x - m.x, this.activeBoss.y - m.y) < this.activeBoss.width / 2) {
                this.activeBoss.hp -= m.damage;
                this.createExplosion(m.x, m.y, '#ffbe0b', false);
                window.shooterAudio.playHit();
                if (this.activeBoss.hp <= 0) this.destroyBoss();
                hit = true;
            } else {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const e = this.enemies[j];
                    const hitRad = e.radius || 20;
                    if (Math.hypot(e.x - m.x, e.y - m.y) < hitRad + 6) {
                        e.hp -= m.damage;
                        this.createExplosion(m.x, m.y, '#ffbe0b', false);
                        window.shooterAudio.playHit();
                        if (e.hp <= 0) this.destroyEnemy(e, j);
                        hit = true;
                        break;
                    }
                }
            }

            if (hit || m.life <= 0 || m.y < -30) {
                this.playerMissiles.splice(i, 1);
            }
        }

        // 6. Actualizar Láseres Alienígenas
        for (let i = this.alienLasers.length - 1; i >= 0; i--) {
            const al = this.alienLasers[i];
            al.x += al.vx;
            al.y += al.vy;

            if (p && p.invulnerableTime <= 0) {
                if (Math.hypot(al.x - p.x, al.y - p.y) < 18) {
                    this.alienLasers.splice(i, 1);
                    this.hitPlayer();
                    continue;
                }
            }

            if (al.y > this.height + 20) {
                this.alienLasers.splice(i, 1);
            }
        }

        // 7. Actualizar Jefe si está activo
        if (this.activeBoss) {
            const b = this.activeBoss;

            // Entrada suave a la pantalla
            if (b.y < b.targetY) {
                b.y += 1.5;
            } else {
                // Movimiento horizontal oscilante
                b.x += b.vx;
                if (b.x < b.width / 2 + 10 || b.x > this.width - b.width / 2 - 10) {
                    b.vx *= -1;
                }

                // Ataques del jefe
                b.attackTimer++;
                const fireRate = b.hp < b.maxHp * 0.4 ? 25 : 45; // Furia bajo el 40% de vida

                if (b.attackTimer % fireRate === 0) {
                    window.shooterAudio.playAlienShoot();

                    if (b.type === 'mothership') {
                        // Disparo en abanico quíntuple
                        for (let a = -2; a <= 2; a++) {
                            this.alienLasers.push({ x: b.x + a * 18, y: b.y + b.height / 2, vx: a * 1.5, vy: 5 });
                        }
                    } else {
                        // Disparo doble dirigido
                        this.alienLasers.push({ x: b.x - 25, y: b.y + b.height / 2, vx: -0.8, vy: 5.5 });
                        this.alienLasers.push({ x: b.x + 25, y: b.y + b.height / 2, vx: 0.8, vy: 5.5 });
                    }
                }
            }

            // Colisión de los láseres del jugador contra el Jefe
            for (let j = this.playerLasers.length - 1; j >= 0; j--) {
                const l = this.playerLasers[j];
                if (Math.abs(l.x - b.x) < b.width / 2 && Math.abs(l.y - b.y) < b.height / 2) {
                    this.playerLasers.splice(j, 1);
                    b.hp -= l.damage;
                    this.createHitSparks(l.x, l.y, l.color, 5);
                    window.shooterAudio.playHit();

                    if (b.hp <= 0) {
                        this.destroyBoss();
                        break;
                    }
                }
            }
        }

        // 8. Actualizar Enemigos comunes
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.x += e.vx;
            e.y += e.vy;

            if (e.type === 'meteor') {
                e.angle += e.vRot;
                if (e.x < e.radius || e.x > this.width - e.radius) e.vx *= -1;
            } else if (e.type === 'alien') {
                if (e.x < 30 || e.x > this.width - 30) e.vx *= -1;
                e.shootTimer--;
                if (e.shootTimer <= 0) {
                    this.alienLasers.push({ x: e.x, y: e.y + e.height / 2, vx: (p ? (p.x - e.x) * 0.015 : 0), vy: 5.5 });
                    window.shooterAudio.playAlienShoot();
                    e.shootTimer = Math.random() * 60 + 50;
                }
            } else if (e.type === 'mine') {
                e.pulse += 0.08;
            } else if (e.type === 'cruiser') {
                if (e.x < 50 || e.x > this.width - 50) e.vx *= -1;
                e.shootTimer--;
                if (e.shootTimer <= 0) {
                    this.alienLasers.push({ x: e.x - 14, y: e.y + 20, vx: -1, vy: 5 });
                    this.alienLasers.push({ x: e.x + 14, y: e.y + 20, vx: 1, vy: 5 });
                    window.shooterAudio.playAlienShoot();
                    e.shootTimer = 55;
                }
            }

            // Colisiones de láseres contra el enemigo
            for (let j = this.playerLasers.length - 1; j >= 0; j--) {
                const l = this.playerLasers[j];
                const hitDist = e.radius || (e.width ? e.width / 2 : 20);
                if (Math.hypot(l.x - e.x, l.y - e.y) < hitDist) {
                    this.playerLasers.splice(j, 1);
                    e.hp -= l.damage;
                    this.createHitSparks(l.x, l.y, l.color);
                    window.shooterAudio.playHit();

                    if (e.hp <= 0) {
                        this.destroyEnemy(e, i);
                        break;
                    }
                }
            }

            // Colisión con el jugador
            if (p && p.invulnerableTime <= 0 && this.enemies[i]) {
                const bodyDist = (e.radius || 20) + 12;
                if (Math.hypot(e.x - p.x, e.y - p.y) < bodyDist) {
                    this.destroyEnemy(e, i);
                    this.hitPlayer();
                    continue;
                }
            }

            if (e.y > this.height + 60) {
                this.enemies.splice(i, 1);
            }
        }

        // 9. Power-ups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pw = this.powerups[i];
            pw.y += pw.vy;
            pw.rotation += 0.04;

            if (p && Math.hypot(pw.x - p.x, pw.y - p.y) < 26) {
                this.applyPowerup(pw.type);
                this.powerups.splice(i, 1);
                continue;
            }

            if (pw.y > this.height + 30) {
                this.powerups.splice(i, 1);
            }
        }

        // 10. Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.alpha -= pt.decay;
            if (pt.alpha <= 0) this.particles.splice(i, 1);
        }

        if (this.screenShake > 0) this.screenShake *= 0.85;
        if (this.screenShake < 0.2) this.screenShake = 0;
    }

    destroyEnemy(e, index) {
        this.enemies.splice(index, 1);
        this.enemiesDefeatedInSector++;
        this.score += e.scoreValue;

        const isBig = e.size === 'large' || e.type === 'cruiser';
        this.createExplosion(e.x, e.y, e.subType === 'fire' ? '#fb5607' : (e.type === 'mine' ? '#ffbe0b' : '#ff006e'), isBig);
        window.shooterAudio.playExplosion(isBig);
        this.screenShake = isBig ? 8 : 4;

        // Si es una Mina, detona en 4 esquirlas
        if (e.type === 'mine') {
            for (let a = 0; a < 4; a++) {
                const angle = (a / 4) * Math.PI * 2;
                this.alienLasers.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4
                });
            }
        }

        // Si es meteorito grande, se divide en 2 medianos
        if (e.type === 'meteor' && e.size === 'large') {
            for (let k = -1; k <= 1; k += 2) {
                const points = [];
                for (let v = 0; v < 8; v++) {
                    const angle = (v / 8) * Math.PI * 2;
                    points.push({ x: Math.cos(angle) * 17 * (0.8 + Math.random() * 0.4), y: Math.sin(angle) * 17 * (0.8 + Math.random() * 0.4) });
                }
                this.enemies.push({
                    type: 'meteor',
                    subType: e.subType,
                    size: 'medium',
                    radius: 17,
                    points: points,
                    x: e.x + k * 14,
                    y: e.y,
                    vx: k * 1.8 + (Math.random() - 0.5),
                    vy: e.vy * 0.9,
                    angle: Math.random() * Math.PI,
                    vRot: (Math.random() - 0.5) * 0.08,
                    hp: 2,
                    maxHp: 2,
                    scoreValue: 100
                });
            }
        }

        // Probabilidad de soltar Power-up (15%)
        if (Math.random() < 0.16) {
            const types = ['weapon', 'shield', 'bomb', 'life'];
            const roll = Math.random();
            const chosen = roll < 0.5 ? 'weapon' : (roll < 0.75 ? 'shield' : (roll < 0.9 ? 'bomb' : 'life'));
            this.powerups.push({ x: e.x, y: e.y, vy: 1.8, type: chosen, rotation: 0 });
        }

        this.updateUI();
    }

    applyPowerup(type) {
        window.shooterAudio.playPowerup();
        const p = this.player;
        if (!p) return;

        if (type === 'weapon') {
            p.weaponLevel = Math.min(6, p.weaponLevel + 1); // ¡Hasta nivel 6!
            this.score += 250;
        } else if (type === 'shield') {
            p.hasShield = true;
            this.score += 150;
        } else if (type === 'bomb') {
            p.bombs = Math.min(4, p.bombs + 1);
            this.score += 200;
        } else if (type === 'life') {
            p.lives = Math.min(5, p.lives + 1);
            this.score += 350;
        }

        this.createHitSparks(p.x, p.y, '#00f5d4', 25);
        this.updateUI();
    }

    hitPlayer() {
        const p = this.player;
        if (!p) return;

        if (p.hasShield) {
            p.hasShield = false;
            p.invulnerableTime = 35;
            this.createHitSparks(p.x, p.y, '#3a86ff', 22);
            window.shooterAudio.playHit();
            this.screenShake = 6;
            this.updateUI();
            return;
        }

        p.lives--;
        p.invulnerableTime = 60;
        p.weaponLevel = Math.max(1, p.weaponLevel - 1);
        this.createExplosion(p.x, p.y, '#00f5d4', true);
        window.shooterAudio.playExplosion(true);
        this.screenShake = 12;

        if (p.lives <= 0) {
            this.gameOver();
        } else {
            this.updateUI();
        }
    }

    createHitSparks(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: Math.random() * 3 + 1.5,
                color: color,
                alpha: 1,
                decay: Math.random() * 0.05 + 0.04
            });
        }
    }

    createExplosion(x, y, mainColor, isBig = false) {
        const count = isBig ? 36 : 18;
        const colors = [mainColor, '#ffbe0b', '#ffffff', '#fb5607'];
        for (let i = 0; i < count; i++) {
            const speed = (Math.random() * 6 + 1.5) * (isBig ? 1.6 : 1);
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    }

    // --- RENDERIZADO VISUAL ---
    draw() {
        this.ctx.save();

        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(sx, sy);
        }

        // Tinte de fondo según el sector
        const sec = this.sectors[this.currentSector - 1] || this.sectors[0];
        this.ctx.fillStyle = sec.bgTint;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Estrellas (en hiperespacio se alargan)
        this.stars.forEach(s => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            if (this.isWarping) {
                this.ctx.fillRect(s.x, s.y, 2, s.speed * 18);
            } else {
                this.ctx.fillRect(s.x, s.y, s.size, s.size);
            }
        });

        // 1. Láseres del Jugador
        this.playerLasers.forEach(l => {
            this.ctx.save();
            this.ctx.fillStyle = l.color;
            this.ctx.shadowColor = l.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(l.x - 2.5, l.y - 12, 5, 18);
            this.ctx.restore();
        });

        // 2. Misiles del Jugador
        this.playerMissiles.forEach(m => {
            this.ctx.save();
            this.ctx.translate(m.x, m.y);
            const angle = Math.atan2(m.vy, m.vx) + Math.PI / 2;
            this.ctx.rotate(angle);
            this.ctx.fillStyle = '#ffbe0b';
            this.ctx.fillRect(-2.5, -7, 5, 14);
            this.ctx.fillStyle = '#ff006e';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -10);
            this.ctx.lineTo(3, -6);
            this.ctx.lineTo(-3, -6);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 3. Láseres Alienígenas
        this.alienLasers.forEach(al => {
            this.ctx.save();
            this.ctx.fillStyle = '#ff006e';
            this.ctx.shadowColor = '#ff006e';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(al.x, al.y, 4.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 4. Power-ups
        this.powerups.forEach(pw => {
            this.ctx.save();
            this.ctx.translate(pw.x, pw.y);
            this.ctx.rotate(pw.rotation);

            const colorMap = { weapon: '#ffbe0b', shield: '#3a86ff', bomb: '#ff006e', life: '#06d6a0' };
            const color = colorMap[pw.type] || '#fff';
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-12, -12, 24, 24);

            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const icon = pw.type === 'weapon' ? 'W' : (pw.type === 'shield' ? 'S' : (pw.type === 'bomb' ? 'B' : '+'));
            this.ctx.fillText(icon, 0, 1);
            this.ctx.restore();
        });

        // 5. Enemigos comunes
        this.enemies.forEach(e => {
            if (e.type === 'meteor') this.drawMeteor(e);
            else if (e.type === 'alien') this.drawAlien(e);
            else if (e.type === 'mine') this.drawMine(e);
            else if (e.type === 'cruiser') this.drawCruiser(e);
        });

        // 6. Jefe si está activo
        if (this.activeBoss) {
            this.drawBoss(this.activeBoss);
        }

        // 7. Jugador
        if (this.player) {
            this.drawPlayer();
        }

        // 8. Partículas
        this.particles.forEach(pt => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, pt.alpha);
            this.ctx.fillStyle = pt.color;
            this.ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
            this.ctx.restore();
        });

        this.ctx.restore();
    }

    drawMeteor(e) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);
        this.ctx.rotate(e.angle);

        const fillColor = e.subType === 'fire' ? '#e76f51' : (e.subType === 'metal' ? '#4a5568' : '#2b2d42');
        const strokeColor = e.subType === 'fire' ? '#ffbe0b' : (e.subType === 'metal' ? '#a0aec0' : '#8d99ae');

        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        e.points.forEach((pt, i) => {
            if (i === 0) this.ctx.moveTo(pt.x, pt.y);
            else this.ctx.lineTo(pt.x, pt.y);
        });
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawAlien(e) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);
        const color = e.alienType === 'interceptor' ? '#ff006e' : '#8338ec';

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 15);
        this.ctx.lineTo(18, -12);
        this.ctx.lineTo(9, -15);
        this.ctx.lineTo(0, -7);
        this.ctx.lineTo(-9, -15);
        this.ctx.lineTo(-18, -12);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#00f5d4';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawMine(e) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);

        const pulseScale = 1 + Math.sin(e.pulse) * 0.15;
        this.ctx.scale(pulseScale, pulseScale);

        this.ctx.fillStyle = '#ffbe0b';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ff006e';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawCruiser(e) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);

        this.ctx.fillStyle = '#1e3d59';
        this.ctx.strokeStyle = '#00f5d4';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(0, 22);
        this.ctx.lineTo(26, -18);
        this.ctx.lineTo(-26, -18);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Núcleo
        this.ctx.fillStyle = '#ff006e';
        this.ctx.fillRect(-6, -6, 12, 12);

        this.ctx.restore();
    }

    drawBoss(b) {
        this.ctx.save();
        this.ctx.translate(b.x, b.y);

        // Chasis del Jefe
        this.ctx.fillStyle = '#2b0938';
        this.ctx.strokeStyle = '#ff006e';
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        this.ctx.moveTo(0, b.height / 2);
        this.ctx.lineTo(b.width / 2, -b.height / 4);
        this.ctx.lineTo(b.width / 3, -b.height / 2);
        this.ctx.lineTo(-b.width / 3, -b.height / 2);
        this.ctx.lineTo(-b.width / 2, -b.height / 4);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Ojo / Núcleo del Jefe
        const coreGlow = b.hp < b.maxHp * 0.4 ? '#ff006e' : '#00f5d4';
        this.ctx.fillStyle = coreGlow;
        this.ctx.shadowColor = coreGlow;
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawPlayer() {
        const p = this.player;
        if (p.invulnerableTime > 0 && Math.floor(p.invulnerableTime / 4) % 2 === 0) return;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);

        // Fuego del propulsor
        const flameHeight = Math.random() * 8 + 12;
        this.ctx.fillStyle = '#ffbe0b';
        this.ctx.beginPath();
        this.ctx.moveTo(-6, p.height / 2);
        this.ctx.lineTo(0, p.height / 2 + flameHeight);
        this.ctx.lineTo(6, p.height / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Chasis
        this.ctx.fillStyle = '#00f5d4';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.height / 2);
        this.ctx.lineTo(p.width / 2, p.height / 2);
        this.ctx.lineTo(p.width / 4, p.height / 3);
        this.ctx.lineTo(0, p.height / 2 - 4);
        this.ctx.lineTo(-p.width / 4, p.height / 3);
        this.ctx.lineTo(-p.width / 2, p.height / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Cabina
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -4, 4, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Cañones adicionales según el nivel de arma
        if (p.weaponLevel >= 3) {
            this.ctx.fillStyle = '#ffbe0b';
            this.ctx.fillRect(-p.width / 2 - 2, 0, 3, 10);
            this.ctx.fillRect(p.width / 2 - 1, 0, 3, 10);
        }

        // Escudo
        if (p.hasShield) {
            this.ctx.strokeStyle = 'rgba(58, 134, 255, 0.75)';
            this.ctx.lineWidth = 2.5;
            this.ctx.shadowColor = '#3a86ff';
            this.ctx.shadowBlur = 12;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.width * 0.8, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    startLoop() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updateUI() {
        document.getElementById('score-val').innerText = this.score.toLocaleString();
        document.getElementById('sector-val').innerText = `${this.currentSector} / 5`;
        document.getElementById('highscore-val').innerText = this.highScore.toLocaleString();

        const livesContainer = document.getElementById('lives-val');
        if (this.player && livesContainer) {
            livesContainer.innerText = '❤️'.repeat(Math.max(0, this.player.lives));
        }

        const bombsContainer = document.getElementById('bombs-val');
        if (this.player && bombsContainer) {
            bombsContainer.innerText = '💣'.repeat(Math.max(0, this.player.bombs));
        }

        const weaponEl = document.getElementById('weapon-val');
        if (this.player && weaponEl) {
            const names = [
                'Láser 1x',
                'Dual 2x',
                'Tridente 3x',
                'Plasma 4x',
                'Hyper 5x',
                '🚀 OMEGA 6x'
            ];
            weaponEl.innerText = names[this.player.weaponLevel - 1] || 'OMEGA 6x';
            weaponEl.style.color = this.player.weaponLevel === 6 ? '#00f5d4' : '#ffbe0b';
        }

        // Barra de vida del Jefe en el HUD
        const bossBar = document.getElementById('boss-hud-bar');
        const bossFill = document.getElementById('boss-hp-fill');
        const bossNameEl = document.getElementById('boss-name-label');

        if (this.activeBoss && bossBar && bossFill && bossNameEl) {
            bossBar.classList.remove('hidden');
            bossNameEl.innerText = this.activeBoss.name;
            const pct = Math.max(0, (this.activeBoss.hp / this.activeBoss.maxHp) * 100);
            bossFill.style.width = `${pct}%`;
        } else if (bossBar) {
            bossBar.classList.add('hidden');
        }
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    bindEvents() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                e.preventDefault();
                this.togglePause();
            } else if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                this.useBomb();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                this.toggleSFX();
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                this.toggleMusic();
            } else if (e.key === 'Enter' && !this.isRunning) {
                this.start();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Eventos táctiles y ratón en el lienzo
        const onPointerDown = (e) => {
            e.preventDefault();
            window.shooterAudio.init();
            this.isPointerDown = true;
            this.touchPos = this.getCanvasCoords(e);
            if (this.isRunning) {
                this.shoot();
            }
        };

        const onPointerMove = (e) => {
            if (this.isPointerDown) {
                e.preventDefault();
                this.touchPos = this.getCanvasCoords(e);
            }
        };

        const onPointerUp = (e) => {
            this.isPointerDown = false;
            this.touchPos = null;
        };

        this.canvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp, { passive: false });

        // Botón Start en Overlay
        document.getElementById('btn-overlay-play').addEventListener('click', () => {
            this.start();
        });

        // Botones Pausa
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());

        // Botones Audio
        document.getElementById('btn-music').addEventListener('click', () => this.toggleMusic());
        document.getElementById('btn-sound').addEventListener('click', () => this.toggleSFX());

        // Botones táctiles inferiores para móviles
        const fireBtn = document.getElementById('touch-fire');
        if (fireBtn) {
            const fireHandler = (e) => {
                e.preventDefault();
                window.shooterAudio.init();
                this.shoot();
            };
            fireBtn.addEventListener('touchstart', fireHandler, { passive: false });
            fireBtn.addEventListener('click', fireHandler);
        }

        const bombBtn = document.getElementById('touch-bomb');
        if (bombBtn) {
            const bombHandler = (e) => {
                e.preventDefault();
                this.useBomb();
            };
            bombBtn.addEventListener('touchstart', bombHandler, { passive: false });
            bombBtn.addEventListener('click', bombHandler);
        }
    }

    toggleSFX() {
        const en = window.shooterAudio.toggleSFX();
        const btn = document.getElementById('btn-sound');
        if (btn) btn.innerText = en ? '🔊' : '🔇';
    }

    toggleMusic() {
        const en = window.shooterAudio.toggleMusic();
        const btn = document.getElementById('btn-music');
        if (btn) btn.innerText = en ? '🎵' : '🎶';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.starGame = new StarRaiderGame();
});
