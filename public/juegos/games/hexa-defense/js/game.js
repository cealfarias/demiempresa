// ============================================================
// HEXA DEFENSE: NEON CORE - Motor del Juego (Tower Defense Táctico)
// ============================================================

const TURRET_TYPES = {
    laser: { name: 'Láser Pulsar', cost: 100, range: 110, damage: 32, rate: 0.15, color: '#ff0055', icon: '🔴', desc: 'Rayo continuo de alto daño' },
    tesla: { name: 'Bobina Tesla', cost: 150, range: 100, damage: 45, rate: 0.8, color: '#00f7ff', icon: '⚡', desc: 'Descarga eléctrica en cadena' },
    cryo: { name: 'Emisor Criogénico', cost: 125, range: 90, damage: 10, rate: 0.5, slow: 0.5, color: '#00ff88', icon: '❄️', desc: 'Ralentiza un 50% el avance' },
    plasma: { name: 'Mortero Plasma', cost: 180, range: 140, damage: 85, rate: 1.4, splash: 55, color: '#ffd700', icon: '💣', desc: 'Explosión de área masiva' }
};

class HexaDefenseGame {
    constructor() {
        this.canvas = document.getElementById('hexa-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.WIDTH = 480;
        this.HEIGHT = 640;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Estado del Juego
        this.isRunning = false;
        this.isGameOver = false;
        this.gameWon = false;
        this.gameSpeed = 1;

        // Recursos y Núcleo
        this.credits = 350;
        this.coreHp = 100;
        this.wave = 1;
        this.maxWaves = 10;
        this.waveActive = false;

        // Camino de Circuito (Waypoints)
        this.path = [
            { x: -30, y: 110 },
            { x: 380, y: 110 },
            { x: 380, y: 250 },
            { x: 90, y: 250 },
            { x: 90, y: 410 },
            { x: 390, y: 410 },
            { x: 390, y: 560 },
            { x: 240, y: 560 } // Núcleo
        ];

        // Nodos de Construcción Hexagonales
        this.buildNodes = [
            // Fila 1
            { id: 1, x: 100, y: 60, turret: null },
            { id: 2, x: 240, y: 60, turret: null },
            // Fila 2
            { id: 3, x: 160, y: 180, turret: null },
            { id: 4, x: 300, y: 180, turret: null },
            // Fila 3
            { id: 5, x: 160, y: 330, turret: null },
            { id: 6, x: 300, y: 330, turret: null },
            // Fila 4
            { id: 7, x: 140, y: 490, turret: null },
            { id: 8, x: 300, y: 490, turret: null },
            { id: 9, x: 430, y: 490, turret: null }
        ];

        // Entidades
        this.creeps = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.laserBeams = [];

        // Selección de nodo actual
        this.selectedNode = null;
        this.selectedBuildType = 'laser';

        this.initDom();
        this.bindEvents();
        this.renderMenu();
    }

    initDom() {
        this.dom = {
            creditsVal: document.getElementById('credits-val'),
            coreHpFill: document.getElementById('core-hp-fill'),
            coreHpText: document.getElementById('core-hp-text'),
            waveVal: document.getElementById('wave-val'),
            btnStartWave: document.getElementById('btn-start-wave'),
            btnSpeed: document.getElementById('btn-speed'),
            buildDrawer: document.getElementById('build-drawer'),
            overlay: document.getElementById('game-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayDesc: document.getElementById('overlay-desc'),
            btnPlayOverlay: document.getElementById('btn-play-overlay'),
            btnMusic: document.getElementById('btn-music'),
            btnSound: document.getElementById('btn-sound')
        };
    }

    bindEvents() {
        this.dom.btnPlayOverlay.addEventListener('click', () => this.start());
        this.dom.btnStartWave.addEventListener('click', () => this.startNextWave());
        this.dom.btnSpeed.addEventListener('click', () => {
            this.gameSpeed = (this.gameSpeed === 1) ? 2 : 1;
            this.dom.btnSpeed.textContent = `${this.gameSpeed}x ⏩`;
        });
        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.hexaAudio.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
        });
        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.hexaAudio.toggleSFX();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
        });

        // Click / Touch en el canvas para seleccionar nodo
        const handleCanvasTap = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const tapX = (clientX - rect.left) * (this.WIDTH / rect.width);
            const tapY = (clientY - rect.top) * (this.HEIGHT / rect.height);

            // Buscar si hizo clic en un nodo de construcción
            let clickedNode = null;
            for (const node of this.buildNodes) {
                if (Math.hypot(node.x - tapX, node.y - tapY) < 28) {
                    clickedNode = node;
                    break;
                }
            }

            if (clickedNode) {
                this.selectedNode = clickedNode;
                this.openBuildDrawer(clickedNode);
            } else {
                this.selectedNode = null;
                this.closeBuildDrawer();
            }
        };

        this.canvas.addEventListener('click', (e) => handleCanvasTap(e.clientX, e.clientY));
        this.canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                handleCanvasTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        });
    }

    start() {
        window.hexaAudio.init();
        window.hexaAudio.startMusic();

        this.isRunning = true;
        this.isGameOver = false;
        this.gameWon = false;
        this.credits = 350;
        this.coreHp = 100;
        this.wave = 1;
        this.waveActive = false;
        this.gameSpeed = 1;

        this.creeps = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.laserBeams = [];
        this.buildNodes.forEach(n => { n.turret = null; });

        this.dom.overlay.classList.add('hidden');
        this.dom.btnStartWave.disabled = false;
        this.dom.btnStartWave.textContent = 'Iniciar Oleada 1 ⚔️';
        this.updateHUD();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    startNextWave() {
        if (this.waveActive || !this.isRunning || this.isGameOver) return;
        this.waveActive = true;
        this.dom.btnStartWave.disabled = true;
        this.dom.btnStartWave.textContent = `Oleada ${this.wave} en Curso...`;

        // Generar creeps para la oleada
        const creepCount = 6 + this.wave * 3;
        const isBossWave = (this.wave === 5 || this.wave === 10);

        for (let i = 0; i < creepCount; i++) {
            setTimeout(() => {
                if (!this.isRunning || this.isGameOver) return;
                const hp = 45 + this.wave * 28;
                const isFast = (i % 3 === 0);
                this.creeps.push({
                    x: this.path[0].x,
                    y: this.path[0].y,
                    wpIdx: 1,
                    hp, maxHp: hp,
                    speed: isFast ? 80 : 55,
                    reward: isFast ? 15 : 20,
                    radius: isFast ? 10 : 13,
                    color: isFast ? '#00f7ff' : '#ff0055',
                    type: isFast ? 'fast' : 'regular',
                    slowFactor: 1
                });
            }, i * 850);
        }

        // Si es oleada de jefe
        if (isBossWave) {
            setTimeout(() => {
                if (!this.isRunning || this.isGameOver) return;
                const bossHp = 400 + this.wave * 180;
                this.creeps.push({
                    x: this.path[0].x,
                    y: this.path[0].y,
                    wpIdx: 1,
                    hp: bossHp, maxHp: bossHp,
                    speed: 38,
                    reward: 120,
                    radius: 20,
                    color: '#ffd700',
                    type: 'boss',
                    slowFactor: 1
                });
            }, creepCount * 850 + 400);
        }
    }

    openBuildDrawer(node) {
        const drawer = this.dom.buildDrawer;
        drawer.innerHTML = '';
        drawer.classList.remove('hidden');

        if (!node.turret) {
            // Menú de Construcción
            const title = document.createElement('h4');
            title.textContent = 'Construir Torre Defensiva:';
            drawer.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'turret-select-grid';

            Object.keys(TURRET_TYPES).forEach(key => {
                const t = TURRET_TYPES[key];
                const btn = document.createElement('button');
                btn.className = 'turret-option-btn';
                btn.innerHTML = `<span>${t.icon} <b>${t.name}</b></span><span>🪙 ${t.cost}</span>`;
                btn.disabled = (this.credits < t.cost);
                btn.onclick = () => {
                    this.buildTurret(node, key);
                };
                grid.appendChild(btn);
            });
            drawer.appendChild(grid);
        } else {
            // Menú de Torre Existente: Mejorar o Vender
            const turret = node.turret;
            const upgradeCost = Math.round(turret.typeInfo.cost * 0.7 * turret.level);
            const sellValue = Math.round(turret.typeInfo.cost * 0.6);

            drawer.innerHTML = `
                <h4>${turret.typeInfo.icon} ${turret.typeInfo.name} (Nivel ${turret.level})</h4>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button id="btn-upgrade-turret" class="turret-option-btn" style="flex:1;">
                        ⬆️ Mejorar (🪙 ${upgradeCost})
                    </button>
                    <button id="btn-sell-turret" class="turret-option-btn" style="flex:1; border-color:#ff0055;">
                        💰 Vender (🪙 ${sellValue})
                    </button>
                </div>
            `;

            document.getElementById('btn-upgrade-turret').onclick = () => this.upgradeTurret(node, upgradeCost);
            document.getElementById('btn-sell-turret').onclick = () => this.sellTurret(node, sellValue);
        }
    }

    closeBuildDrawer() {
        this.dom.buildDrawer.classList.add('hidden');
    }

    buildTurret(node, typeKey) {
        const info = TURRET_TYPES[typeKey];
        if (this.credits < info.cost) return;

        this.credits -= info.cost;
        node.turret = {
            type: typeKey,
            typeInfo: info,
            level: 1,
            range: info.range,
            damage: info.damage,
            rate: info.rate,
            timer: 0,
            angle: 0
        };

        window.hexaAudio.playBuild();
        this.updateHUD();
        this.closeBuildDrawer();
    }

    upgradeTurret(node, cost) {
        if (this.credits < cost) return;
        this.credits -= cost;
        const t = node.turret;
        t.level++;
        t.damage = Math.round(t.damage * 1.4);
        t.range = Math.round(t.range * 1.15);
        window.hexaAudio.playBuild();
        this.updateHUD();
        this.closeBuildDrawer();
    }

    sellTurret(node, value) {
        this.credits += value;
        node.turret = null;
        window.hexaAudio.playBuild();
        this.updateHUD();
        this.closeBuildDrawer();
    }

    // ============================================================
    // BUCLE PRINCIPAL
    // ============================================================
    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05) * this.gameSpeed;
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        if (this.isRunning && !this.isGameOver && !this.gameWon) {
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    update(dt) {
        this.laserBeams = [];

        // 1. Actualizar Torretas
        this.buildNodes.forEach(node => {
            if (!node.turret) return;
            const t = node.turret;
            t.timer += dt;

            // Buscar creep objetivo dentro de rango
            let target = null;
            let maxProgress = -1;

            this.creeps.forEach(c => {
                const dist = Math.hypot(c.x - node.x, c.y - node.y);
                if (dist <= t.range && c.wpIdx > maxProgress) {
                    maxProgress = c.wpIdx;
                    target = c;
                }
            });

            if (target) {
                t.angle = Math.atan2(target.y - node.y, target.x - node.x);

                if (t.type === 'laser') {
                    // Láser continuo
                    this.laserBeams.push({ x1: node.x, y1: node.y, x2: target.x, y2: target.y, color: t.typeInfo.color });
                    target.hp -= t.damage * dt * 4;
                    if (Math.random() < 0.2) window.hexaAudio.playLaser();
                    if (target.hp <= 0) this.killCreep(target);
                } else if (t.timer >= t.rate) {
                    t.timer = 0;
                    if (t.type === 'tesla') {
                        // Rayo eléctrico en cadena
                        this.fireTesla(node, target, t);
                    } else if (t.type === 'cryo') {
                        // Pulso criogénico
                        this.fireCryo(node, t);
                    } else if (t.type === 'plasma') {
                        // Proyectil de mortero
                        this.firePlasma(node, target, t);
                    }
                }
            }
        });

        // 2. Actualizar Proyectiles de Plasma
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 15) {
                // Impacto AoE
                window.hexaAudio.playExplosion();
                this.spawnExplosion(p.targetX, p.targetY, '#ffd700', 20);
                this.creeps.forEach(c => {
                    if (Math.hypot(c.x - p.targetX, c.y - p.targetY) < p.splash) {
                        c.hp -= p.damage;
                        if (c.hp <= 0) this.killCreep(c);
                    }
                });
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * p.speed * dt;
                p.y += (dy / dist) * p.speed * dt;
            }
        }

        // 3. Actualizar Creeps a lo largo del circuito
        for (let i = this.creeps.length - 1; i >= 0; i--) {
            const c = this.creeps[i];
            const targetWp = this.path[c.wpIdx];
            const dx = targetWp.x - c.x;
            const dy = targetWp.y - c.y;
            const dist = Math.hypot(dx, dy);

            const effectiveSpeed = c.speed * c.slowFactor;
            c.slowFactor = Math.min(1, c.slowFactor + dt * 0.5); // Recuperación de frío

            if (dist < 6) {
                c.wpIdx++;
                if (c.wpIdx >= this.path.length) {
                    // ¡Llegó al Núcleo!
                    this.coreHp -= (c.type === 'boss') ? 35 : 10;
                    window.hexaAudio.playCoreHit();
                    this.spawnExplosion(c.x, c.y, '#ff0055', 25);
                    this.creeps.splice(i, 1);

                    if (this.coreHp <= 0) {
                        this.triggerGameOver();
                        return;
                    }
                    continue;
                }
            } else {
                c.x += (dx / dist) * effectiveSpeed * dt;
                c.y += (dy / dist) * effectiveSpeed * dt;
            }
        }

        // 4. Chequeo de fin de oleada
        if (this.waveActive && this.creeps.length === 0) {
            this.finishWave();
        }

        // 5. Partículas y Textos
        this.updateEffects(dt);
        this.updateHUD();
    }

    fireTesla(node, target, turret) {
        window.hexaAudio.playLaser();
        let prev = { x: node.x, y: node.y };
        const hit = [target];
        target.hp -= turret.damage;
        if (target.hp <= 0) this.killCreep(target);

        // Buscar hasta 2 adyacentes
        this.creeps.forEach(c => {
            if (!hit.includes(c) && hit.length < 3 && Math.hypot(c.x - target.x, c.y - target.y) < 70) {
                hit.push(c);
                c.hp -= turret.damage * 0.7;
                if (c.hp <= 0) this.killCreep(c);
            }
        });

        hit.forEach(h => {
            this.laserBeams.push({ x1: prev.x, y1: prev.y, x2: h.x, y2: h.y, color: '#00f7ff' });
            prev = { x: h.x, y: h.y };
        });
    }

    fireCryo(node, turret) {
        window.hexaAudio.playLaser();
        this.spawnExplosion(node.x, node.y, '#00ff88', 15);
        this.creeps.forEach(c => {
            if (Math.hypot(c.x - node.x, c.y - node.y) <= turret.range) {
                c.slowFactor = turret.typeInfo.slow;
                c.hp -= turret.damage;
                if (c.hp <= 0) this.killCreep(c);
            }
        });
    }

    firePlasma(node, target, turret) {
        this.projectiles.push({
            x: node.x, y: node.y,
            targetX: target.x, targetY: target.y,
            speed: 280,
            damage: turret.damage,
            splash: turret.typeInfo.splash
        });
    }

    killCreep(creep) {
        const idx = this.creeps.indexOf(creep);
        if (idx !== -1) {
            this.creeps.splice(idx, 1);
            this.credits += creep.reward;
            this.spawnExplosion(creep.x, creep.y, creep.color, 12);
            this.spawnFloatingText(`+${creep.reward}`, creep.x, creep.y - 10, '#ffd700');
        }
    }

    finishWave() {
        this.waveActive = false;
        this.credits += 60 + this.wave * 15; // Bono de oleada

        if (this.wave >= this.maxWaves) {
            this.gameWon = true;
            this.dom.overlayTitle.textContent = '¡NÚCLEO DEFENDIDO!';
            this.dom.overlayDesc.innerHTML = `Has destruido todas las oleadas del ciber-virus.<br>Créditos acumulados: <b style="color:#ffd700;">🪙 ${this.credits}</b>`;
            this.dom.btnPlayOverlay.textContent = 'Jugar Otra Campaña 🛡️';
            this.dom.overlay.classList.remove('hidden');
            return;
        }

        this.wave++;
        this.dom.btnStartWave.disabled = false;
        this.dom.btnStartWave.textContent = `Iniciar Oleada ${this.wave} ⚔️`;
    }

    spawnExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 90 + 20;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1,
                color,
                life: 0.35, maxLife: 0.35
            });
        }
    }

    spawnFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text, x, y, color,
            vy: -30,
            life: 0.6, maxLife: 0.6
        });
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        this.dom.overlayTitle.textContent = '¡NÚCLEO CORROMPIDO!';
        this.dom.overlayDesc.innerHTML = `El virus infectó la base en la oleada ${this.wave}.<br>Refuerza tus defensas estratégicas.`;
        this.dom.btnPlayOverlay.textContent = 'Reintentar Defensa 🛡️';
        this.dom.overlay.classList.remove('hidden');
    }

    updateHUD() {
        this.dom.creditsVal.textContent = this.credits;
        this.dom.waveVal.textContent = `${this.wave} / ${this.maxWaves}`;
        this.dom.coreHpFill.style.width = `${Math.max(0, this.coreHp)}%`;
        this.dom.coreHpText.textContent = `${Math.max(0, this.coreHp)}%`;
    }

    updateEffects(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    // ============================================================
    // RENDERIZADO VISUAL
    // ============================================================
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        // 1. Cuadrícula de Circuito de Fondo
        this.drawCircuitBackground();

        // 2. Ruta y Pistas Neón
        this.drawPath();

        // 3. Núcleo Central
        this.drawCore();

        // 4. Nodos de Construcción y Torretas
        this.drawBuildNodes();

        // 5. Creeps / Virus
        this.drawCreeps();

        // 6. Rayos Láser y Proyectiles
        this.drawLasersAndProjectiles();

        // 7. Partículas y Textos
        this.drawEffects();
    }

    drawCircuitBackground() {
        const ctx = this.ctx;
        ctx.fillStyle = '#060611';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        ctx.strokeStyle = 'rgba(0, 247, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y < this.HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.WIDTH, y);
            ctx.stroke();
        }
    }

    drawPath() {
        const ctx = this.ctx;
        // Pista carretera
        ctx.strokeStyle = 'rgba(10, 25, 45, 0.85)';
        ctx.lineWidth = 36;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();

        // Línea de datos central luminosa
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = -performance.now() * 0.04;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawCore() {
        const ctx = this.ctx;
        const corePos = this.path[this.path.length - 1];

        ctx.save();
        ctx.translate(corePos.x, corePos.y);

        // Resplandor del núcleo
        ctx.fillStyle = '#00f7ff';
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // Anillo exterior
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        ctx.shadowBlur = 0;
    }

    drawBuildNodes() {
        const ctx = this.ctx;
        this.buildNodes.forEach(node => {
            const isSelected = (this.selectedNode === node);

            ctx.save();
            ctx.translate(node.x, node.y);

            // Base hexagonal
            ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(0, 247, 255, 0.4)';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.15)' : 'rgba(12, 20, 36, 0.85)';

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3;
                const px = Math.cos(a) * 24;
                const py = Math.sin(a) * 24;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Si tiene torreta
            if (node.turret) {
                const t = node.turret;
                // Rango si está seleccionado
                if (isSelected) {
                    ctx.strokeStyle = 'rgba(0, 247, 255, 0.25)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, t.range, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Cuerpo de la torreta
                ctx.rotate(t.angle);
                ctx.fillStyle = t.typeInfo.color;
                ctx.shadowColor = t.typeInfo.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();

                // Cañón
                ctx.fillRect(0, -3, 18, 6);
            } else {
                // Símbolo + para construir
                ctx.fillStyle = 'rgba(0, 247, 255, 0.5)';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('+', 0, 5);
            }

            ctx.restore();
            ctx.shadowBlur = 0;
        });
    }

    drawCreeps() {
        const ctx = this.ctx;
        this.creeps.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);

            ctx.fillStyle = c.color;
            ctx.shadowColor = c.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
            ctx.fill();

            // Barra de vida sobre el creep
            const barW = c.radius * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-c.radius, -c.radius - 8, barW, 4);
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(-c.radius, -c.radius - 8, barW * (c.hp / c.maxHp), 4);

            ctx.restore();
            ctx.shadowBlur = 0;
        });
    }

    drawLasersAndProjectiles() {
        const ctx = this.ctx;
        // Rayos Láser
        this.laserBeams.forEach(b => {
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 3;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // Proyectiles Mortero
        this.projectiles.forEach(p => {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
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

        this.floatingTexts.forEach(ft => {
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 6;
            ctx.fillText(ft.text, ft.x, ft.y);
        });
        ctx.shadowBlur = 0;
    }

    renderMenu() {
        this.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.hexaGame = new HexaDefenseGame();
});
