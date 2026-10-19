// ============================================================
// NEON SURVIVOR: CYBER SIEGE - Motor del Juego (Vampire Survivors)
// ============================================================

class NeonSurvivorGame {
    constructor() {
        this.canvas = document.getElementById('survivor-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.WIDTH = 540;
        this.HEIGHT = 720;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Estado del Juego
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.gameTime = 0; // segundos sobrevividos
        this.kills = 0;

        // Cámara y Mundo (Área de 2000x2000)
        this.WORLD_SIZE = 2200;
        this.camera = { x: 0, y: 0 };

        // Jugador
        this.player = {
            x: this.WORLD_SIZE / 2,
            y: this.WORLD_SIZE / 2,
            radius: 18,
            speed: 180,
            hp: 100,
            maxHp: 100,
            level: 1,
            xp: 0,
            nextXp: 15,
            magnetRadius: 110,
            angle: 0,
            invulnerableTimer: 0
        };

        // Armas y Habilidades Mejorables
        this.weapons = {
            blaster: { level: 1, timer: 0, interval: 0.45, damage: 25, range: 350 },
            drones: { count: 1, angle: 0, speed: 2.5, damage: 18, distance: 75 },
            tesla: { level: 0, timer: 0, interval: 1.8, damage: 45, targets: 3 },
            emp: { level: 0, timer: 0, interval: 3.5, damage: 60, radius: 140 }
        };

        // Entidades
        this.enemies = [];
        this.projectiles = [];
        this.xpGems = [];
        this.particles = [];
        this.damageNumbers = [];
        this.teslaBolts = [];

        // Spawner
        this.spawnTimer = 0;
        this.bossSpawned = false;

        // Entrada
        this.keys = { up: false, down: false, left: false, right: false };
        this.joystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dirX: 0, dirY: 0 };

        this.initDom();
        this.bindEvents();
        this.renderMenu();
    }

    initDom() {
        this.dom = {
            hpFill: document.getElementById('hp-fill'),
            hpText: document.getElementById('hp-text'),
            xpFill: document.getElementById('xp-fill'),
            levelText: document.getElementById('level-val'),
            timerText: document.getElementById('timer-val'),
            killsText: document.getElementById('kills-val'),
            overlay: document.getElementById('game-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayDesc: document.getElementById('overlay-desc'),
            btnPlay: document.getElementById('btn-play-overlay'),
            upgradeModal: document.getElementById('upgrade-modal'),
            upgradeCardsBox: document.getElementById('upgrade-cards'),
            btnMusic: document.getElementById('btn-music'),
            btnSound: document.getElementById('btn-sound')
        };
    }

    bindEvents() {
        this.dom.btnPlay.addEventListener('click', () => this.start());
        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.survivorAudio.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
        });
        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.survivorAudio.toggleSFX();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
        });

        // Teclado PC
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.up = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.down = true;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.up = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.down = false;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
        });

        // Joystick Táctil en Móvil
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                const touchX = (e.touches[0].clientX - rect.left) * (this.WIDTH / rect.width);
                const touchY = (e.touches[0].clientY - rect.top) * (this.HEIGHT / rect.height);
                this.joystick.active = true;
                this.joystick.startX = touchX;
                this.joystick.startY = touchY;
                this.joystick.currentX = touchX;
                this.joystick.currentY = touchY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.joystick.active && e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                this.joystick.currentX = (e.touches[0].clientX - rect.left) * (this.WIDTH / rect.width);
                this.joystick.currentY = (e.touches[0].clientY - rect.top) * (this.HEIGHT / rect.height);
                const dx = this.joystick.currentX - this.joystick.startX;
                const dy = this.joystick.currentY - this.joystick.startY;
                const dist = Math.hypot(dx, dy);
                if (dist > 8) {
                    this.joystick.dirX = dx / dist;
                    this.joystick.dirY = dy / dist;
                } else {
                    this.joystick.dirX = 0;
                    this.joystick.dirY = 0;
                }
            }
        }, { passive: false });

        const endTouch = () => {
            this.joystick.active = false;
            this.joystick.dirX = 0;
            this.joystick.dirY = 0;
        };
        this.canvas.addEventListener('touchend', endTouch);
        this.canvas.addEventListener('touchcancel', endTouch);
    }

    start() {
        window.survivorAudio.init();
        window.survivorAudio.startMusic();

        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.gameTime = 0;
        this.kills = 0;
        this.bossSpawned = false;

        this.player.x = this.WORLD_SIZE / 2;
        this.player.y = this.WORLD_SIZE / 2;
        this.player.hp = 100;
        this.player.maxHp = 100;
        this.player.level = 1;
        this.player.xp = 0;
        this.player.nextXp = 15;
        this.player.speed = 180;
        this.player.magnetRadius = 110;

        this.weapons = {
            blaster: { level: 1, timer: 0, interval: 0.42, damage: 28, range: 360 },
            drones: { count: 1, angle: 0, speed: 2.6, damage: 22, distance: 75 },
            tesla: { level: 0, timer: 0, interval: 1.8, damage: 50, targets: 3 },
            emp: { level: 0, timer: 0, interval: 3.5, damage: 65, radius: 140 }
        };

        this.enemies = [];
        this.projectiles = [];
        this.xpGems = [];
        this.particles = [];
        this.damageNumbers = [];
        this.teslaBolts = [];

        this.dom.overlay.classList.add('hidden');
        this.dom.upgradeModal.classList.add('hidden');
        this.updateHUD();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    // ============================================================
    // BUCLE PRINCIPAL
    // ============================================================
    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        if (!this.isPaused) {
            this.update(dt);
        }
        this.render();

        if (this.isRunning && !this.isGameOver) {
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    update(dt) {
        this.gameTime += dt;

        // 1. Movimiento del Jugador
        let mx = 0;
        let my = 0;
        if (this.keys.up) my -= 1;
        if (this.keys.down) my += 1;
        if (this.keys.left) mx -= 1;
        if (this.keys.right) mx += 1;

        if (this.joystick.active) {
            mx = this.joystick.dirX;
            my = this.joystick.dirY;
        } else {
            const len = Math.hypot(mx, my);
            if (len > 0) {
                mx /= len;
                my /= len;
            }
        }

        if (mx !== 0 || my !== 0) {
            this.player.x += mx * this.player.speed * dt;
            this.player.y += my * this.player.speed * dt;
            this.player.angle = Math.atan2(my, mx);
        }

        // Límites del mundo
        this.player.x = Math.max(50, Math.min(this.WORLD_SIZE - 50, this.player.x));
        this.player.y = Math.max(50, Math.min(this.WORLD_SIZE - 50, this.player.y));

        if (this.player.invulnerableTimer > 0) {
            this.player.invulnerableTimer -= dt;
        }

        // Cámara centrada en el jugador
        this.camera.x = this.player.x - this.WIDTH / 2;
        this.camera.y = this.player.y - this.HEIGHT / 2;

        // 2. Disparo Automático de Armas
        this.updateWeapons(dt);

        // 3. Spawning de Enemigos y Dificultad Dinámica
        this.updateSpawner(dt);

        // 4. Actualizar Enemigos y Colisiones
        this.updateEnemies(dt);

        // 5. Actualizar Proyectiles
        this.updateProjectiles(dt);

        // 6. Gemas de XP y Magnetismo
        this.updateGems(dt);

        // 7. Partículas y Efectos
        this.updateEffects(dt);

        // 8. Actualizar HUD
        this.updateHUD();
    }

    updateWeapons(dt) {
        // Blaster Primario (Auto-apunta al enemigo más cercano)
        const wBlaster = this.weapons.blaster;
        wBlaster.timer += dt;
        if (wBlaster.timer >= wBlaster.interval && this.enemies.length > 0) {
            let nearest = null;
            let minDist = wBlaster.range;
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = e;
                }
            });

            if (nearest) {
                wBlaster.timer = 0;
                const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
                this.projectiles.push({
                    x: this.player.x,
                    y: this.player.y,
                    vx: Math.cos(angle) * 580,
                    vy: Math.sin(angle) * 580,
                    damage: wBlaster.damage,
                    color: '#00f7ff',
                    radius: 5,
                    life: 0.7
                });
                window.survivorAudio.playLaser();
            }
        }

        // Drones Orbitales (Giran alrededor del jugador)
        const wDrones = this.weapons.drones;
        wDrones.angle += wDrones.speed * dt;
        for (let i = 0; i < wDrones.count; i++) {
            const droneAngle = wDrones.angle + (i * (Math.PI * 2 / wDrones.count));
            const dx = this.player.x + Math.cos(droneAngle) * wDrones.distance;
            const dy = this.player.y + Math.sin(droneAngle) * wDrones.distance;

            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - dx, e.y - dy);
                if (dist < e.radius + 12) {
                    this.damageEnemy(e, wDrones.damage * dt * 3.5, false);
                }
            });
        }

        // Rayo Tesla en Cadena
        const wTesla = this.weapons.tesla;
        if (wTesla.level > 0) {
            wTesla.timer += dt;
            if (wTesla.timer >= wTesla.interval && this.enemies.length > 0) {
                wTesla.timer = 0;
                this.triggerTeslaChain();
            }
        }
    }

    triggerTeslaChain() {
        const sorted = [...this.enemies].sort((a, b) =>
            Math.hypot(a.x - this.player.x, a.y - this.player.y) -
            Math.hypot(b.x - this.player.x, b.y - this.player.y)
        );

        const targets = sorted.slice(0, this.weapons.tesla.targets);
        if (targets.length === 0) return;

        window.survivorAudio.playTesla();
        let prev = { x: this.player.x, y: this.player.y };
        targets.forEach(t => {
            this.teslaBolts.push({
                x1: prev.x, y1: prev.y,
                x2: t.x, y2: t.y,
                life: 0.15
            });
            this.damageEnemy(t, this.weapons.tesla.damage, true);
            prev = { x: t.x, y: t.y };
        });
    }

    updateSpawner(dt) {
        this.spawnTimer += dt;
        const spawnRate = Math.max(0.18, 0.75 - (this.gameTime / 180) * 0.45);
        if (this.spawnTimer >= spawnRate) {
            this.spawnTimer = 0;
            // Spawnear fuera de la pantalla de la cámara
            const angle = Math.random() * Math.PI * 2;
            const dist = 450 + Math.random() * 80;
            const spawnX = this.player.x + Math.cos(angle) * dist;
            const spawnY = this.player.y + Math.sin(angle) * dist;

            const rand = Math.random();
            let type = 'drone';
            let hp = 30 + Math.floor(this.gameTime * 0.25);
            let speed = 90;
            let radius = 14;
            let color = '#ff0055';

            if (rand < 0.3) {
                // Rápido
                type = 'crawler';
                hp = 18 + Math.floor(this.gameTime * 0.15);
                speed = 135;
                radius = 11;
                color = '#00f7ff';
            } else if (rand > 0.85) {
                // Bruto pesado
                type = 'brute';
                hp = 85 + Math.floor(this.gameTime * 0.5);
                speed = 65;
                radius = 22;
                color = '#bd00ff';
            }

            this.enemies.push({
                x: spawnX,
                y: spawnY,
                hp, maxHp: hp,
                speed, radius, color, type
            });
        }
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            e.x += Math.cos(angle) * e.speed * dt;
            e.y += Math.sin(angle) * e.speed * dt;

            // Daño al jugador por contacto
            const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
            if (dist < this.player.radius + e.radius) {
                if (this.player.invulnerableTimer <= 0) {
                    this.player.hp -= 15;
                    this.player.invulnerableTimer = 0.5;
                    this.spawnDamageNumber('15', this.player.x, this.player.y - 15, '#ff0055');
                    if (this.player.hp <= 0) {
                        this.triggerGameOver();
                        return;
                    }
                }
            }
        }
    }

    damageEnemy(enemy, amount, isCrit = false) {
        enemy.hp -= amount;
        this.spawnDamageNumber(Math.round(amount), enemy.x, enemy.y - 10, isCrit ? '#ffd700' : '#ffffff');

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    killEnemy(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) {
            this.enemies.splice(idx, 1);
            this.kills++;
            window.survivorAudio.playExplosion();

            // Gemas de XP
            this.xpGems.push({
                x: enemy.x,
                y: enemy.y,
                val: enemy.type === 'brute' ? 8 : 3,
                radius: 6,
                color: enemy.type === 'brute' ? '#ffd700' : '#00ff88'
            });

            // Chispas
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: enemy.x, y: enemy.y,
                    vx: (Math.random() - 0.5) * 120,
                    vy: (Math.random() - 0.5) * 120,
                    radius: Math.random() * 3 + 1,
                    color: enemy.color,
                    life: 0.35, maxLife: 0.35
                });
            }
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Colisión con enemigos
            for (let j = 0; j < this.enemies.length; j++) {
                const e = this.enemies[j];
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < e.radius + p.radius) {
                    this.damageEnemy(e, p.damage, Math.random() < 0.2);
                    p.life = 0;
                    break;
                }
            }

            if (p.life <= 0) this.projectiles.splice(i, 1);
        }
    }

    updateGems(dt) {
        for (let i = this.xpGems.length - 1; i >= 0; i--) {
            const g = this.xpGems[i];
            const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);

            // Succión magnética
            if (dist < this.player.magnetRadius) {
                const angle = Math.atan2(this.player.y - g.y, this.player.x - g.x);
                const magnetSpeed = 380;
                g.x += Math.cos(angle) * magnetSpeed * dt;
                g.y += Math.sin(angle) * magnetSpeed * dt;

                if (dist < this.player.radius + g.radius) {
                    this.player.xp += g.val;
                    window.survivorAudio.playGem();
                    this.xpGems.splice(i, 1);

                    if (this.player.xp >= this.player.nextXp) {
                        this.levelUp();
                    }
                }
            }
        }
    }

    levelUp() {
        this.player.level++;
        this.player.xp -= this.player.nextXp;
        this.player.nextXp = Math.floor(this.player.nextXp * 1.4);
        window.survivorAudio.playLevelUp();
        this.openUpgradeModal();
    }

    openUpgradeModal() {
        this.isPaused = true;
        const choices = [
            { id: 'blaster', title: '🔫 Plasma Potenciado', desc: '+30% Daño de Disparo y cadencia más veloz.' },
            { id: 'drone', title: '🛸 Dron Orbital Extra', desc: '+1 Dron giratorio que tritura enemigos cercanos.' },
            { id: 'tesla', title: '⚡ Rayo Tesla en Cadena', desc: 'Descargas eléctricas saltan entre enemigos.' },
            { id: 'speed', title: '👟 Propulsores Tácticos', desc: '+20% Velocidad de Movimiento.' },
            { id: 'magnet', title: '🧲 Imán Cuántico', desc: '+50% Alcance de absorción de gemas XP.' },
            { id: 'health', title: '❤️ Nanobots Médicos', desc: '+40 Vida Máxima y restauración completa de salud.' }
        ];

        // Escoger 3 al azar
        const shuffled = choices.sort(() => 0.5 - Math.random()).slice(0, 3);
        this.dom.upgradeCardsBox.innerHTML = '';
        shuffled.forEach(c => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<h3>${c.title}</h3><p>${c.desc}</p>`;
            card.onclick = () => this.applyUpgrade(c.id);
            this.dom.upgradeCardsBox.appendChild(card);
        });

        this.dom.upgradeModal.classList.remove('hidden');
    }

    applyUpgrade(id) {
        if (id === 'blaster') {
            this.weapons.blaster.damage += 12;
            this.weapons.blaster.interval = Math.max(0.18, this.weapons.blaster.interval * 0.88);
        } else if (id === 'drone') {
            this.weapons.drones.count = Math.min(5, this.weapons.drones.count + 1);
            this.weapons.drones.damage += 8;
        } else if (id === 'tesla') {
            this.weapons.tesla.level++;
            this.weapons.tesla.damage += 20;
            this.weapons.tesla.targets++;
        } else if (id === 'speed') {
            this.player.speed *= 1.2;
        } else if (id === 'magnet') {
            this.player.magnetRadius *= 1.5;
        } else if (id === 'health') {
            this.player.maxHp += 40;
            this.player.hp = this.player.maxHp;
        }

        this.dom.upgradeModal.classList.add('hidden');
        this.isPaused = false;
        this.lastTime = performance.now();
    }

    spawnDamageNumber(text, x, y, color) {
        this.damageNumbers.push({
            text, x, y, color,
            vy: -40,
            life: 0.6, maxLife: 0.6
        });
    }

    updateEffects(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y += d.vy * dt;
            d.life -= dt;
            if (d.life <= 0) this.damageNumbers.splice(i, 1);
        }

        for (let i = this.teslaBolts.length - 1; i >= 0; i--) {
            const b = this.teslaBolts[i];
            b.life -= dt;
            if (b.life <= 0) this.teslaBolts.splice(i, 1);
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        this.dom.overlayTitle.textContent = '¡SISTEMA ANULADO!';
        const mins = Math.floor(this.gameTime / 60);
        const secs = Math.floor(this.gameTime % 60).toString().padStart(2, '0');
        this.dom.overlayDesc.innerHTML = `Sobreviviste: <b>${mins}:${secs}</b><br>Nivel alcanzado: <b>${this.player.level}</b> &bull; Bajas: <b style="color:#00f7ff;">${this.kills}</b>`;
        this.dom.btnPlay.textContent = 'Reintentar Asedio ⚡';
        this.dom.overlay.classList.remove('hidden');
    }

    updateHUD() {
        this.dom.hpFill.style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
        this.dom.hpText.textContent = `${Math.round(Math.max(0, this.player.hp))} / ${this.player.maxHp}`;

        this.dom.xpFill.style.width = `${Math.min(100, (this.player.xp / this.player.nextXp) * 100)}%`;
        this.dom.levelText.textContent = `NV. ${this.player.level}`;

        const mins = Math.floor(this.gameTime / 60);
        const secs = Math.floor(this.gameTime % 60).toString().padStart(2, '0');
        this.dom.timerText.textContent = `${mins}:${secs}`;
        this.dom.killsText.textContent = this.kills;
    }

    // ============================================================
    // RENDERIZADO VISUAL NEÓN 2D CON ILUMINACIÓN DINÁMICA
    // ============================================================
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Suelo Cuadriculado Cyberpunk
        this.drawWorldGrid();

        // 2. Gemas de XP en el suelo
        this.drawGems();

        // 3. Enemigos
        this.drawEnemies();

        // 4. Proyectiles y Rayos Tesla
        this.drawProjectiles();

        // 5. Jugador y Drones Orbitales
        this.drawPlayerAndDrones();

        // 6. Números de daño y chispas
        this.drawEffects();

        ctx.restore();

        // 7. Iluminación / Viñeta de linterna oscura alrededor del jugador
        this.drawDynamicLighting();

        // 8. Joystick táctil en pantalla si está activo
        if (this.joystick.active) {
            this.drawVirtualJoystick();
        }
    }

    drawWorldGrid() {
        const ctx = this.ctx;
        const gridSize = 80;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;

        ctx.fillStyle = '#080814';
        ctx.fillRect(this.camera.x, this.camera.y, this.WIDTH, this.HEIGHT);

        ctx.strokeStyle = 'rgba(0, 247, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x <= startX + this.WIDTH + gridSize; x += gridSize) {
            ctx.moveTo(x, this.camera.y);
            ctx.lineTo(x, this.camera.y + this.HEIGHT);
        }
        for (let y = startY; y <= startY + this.HEIGHT + gridSize; y += gridSize) {
            ctx.moveTo(this.camera.x, y);
            ctx.lineTo(this.camera.x + this.WIDTH, y);
        }
        ctx.stroke();
    }

    drawGems() {
        const ctx = this.ctx;
        this.xpGems.forEach(g => {
            ctx.fillStyle = g.color;
            ctx.shadowColor = g.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    drawEnemies() {
        const ctx = this.ctx;
        this.enemies.forEach(e => {
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 10;

            if (e.type === 'crawler') {
                // Hexágono rápido
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    const px = Math.cos(a) * e.radius;
                    const py = Math.sin(a) * e.radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            } else if (e.type === 'brute') {
                // Octágono pesado
                ctx.beginPath();
                ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                // Dron básico
                ctx.beginPath();
                ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });
        ctx.shadowBlur = 0;
    }

    drawProjectiles() {
        const ctx = this.ctx;
        // Rayos Tesla
        this.teslaBolts.forEach(b => {
            ctx.strokeStyle = '#00f7ff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00f7ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            // zigzag
            const midX = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 20;
            const midY = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 20;
            ctx.lineTo(midX, midY);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
        });

        // Balas de plasma
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    drawPlayerAndDrones() {
        const ctx = this.ctx;
        const p = this.player;

        // Drones Orbitales
        const wDrones = this.weapons.drones;
        for (let i = 0; i < wDrones.count; i++) {
            const droneAngle = wDrones.angle + (i * (Math.PI * 2 / wDrones.count));
            const dx = p.x + Math.cos(droneAngle) * wDrones.distance;
            const dy = p.y + Math.sin(droneAngle) * wDrones.distance;

            ctx.fillStyle = '#00ff88';
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(dx, dy, 7, 0, Math.PI * 2);
            ctx.fill();

            // Estela
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, wDrones.distance, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Jugador
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Chasis del Cyber Commando
        ctx.fillStyle = (p.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) ? '#ff0055' : '#00f7ff';
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Cañón frontal
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, -4, 14, 8);

        ctx.restore();
        ctx.shadowBlur = 0;
    }

    drawEffects() {
        const ctx = this.ctx;
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        this.damageNumbers.forEach(d => {
            ctx.fillStyle = d.color;
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = d.color;
            ctx.shadowBlur = 6;
            ctx.fillText(d.text, d.x, d.y);
        });
        ctx.shadowBlur = 0;
    }

    drawDynamicLighting() {
        const ctx = this.ctx;
        // Gradiente radial centrado en el jugador en coordenadas de pantalla
        const screenX = this.WIDTH / 2;
        const screenY = this.HEIGHT / 2;
        const lightGrad = ctx.createRadialGradient(screenX, screenY, 90, screenX, screenY, 380);
        lightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        lightGrad.addColorStop(0.7, 'rgba(4, 4, 12, 0.6)');
        lightGrad.addColorStop(1, 'rgba(2, 2, 8, 0.96)');

        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    }

    drawVirtualJoystick() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.joystick.startX, this.joystick.startY, 45, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 247, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(this.joystick.currentX, this.joystick.currentY, 22, 0, Math.PI * 2);
        ctx.fill();
    }

    renderMenu() {
        this.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.survivorGame = new NeonSurvivorGame();
});
