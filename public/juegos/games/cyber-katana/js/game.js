// ============================================================
// CYBER KATANA: LASER SLICE - Motor del Juego (Estilo Fruit Ninja)
// ============================================================

class CyberKatanaGame {
    constructor() {
        this.canvas = document.getElementById('katana-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.WIDTH = 480;
        this.HEIGHT = 650;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Estado del juego
        this.isRunning = false;
        this.isGameOver = false;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('cyberKatana_best') || '0', 10);
        this.lives = 3;
        this.slowMoTimer = 0; // tiempo bala

        // Entidades
        this.targets = [];
        this.halves = [];
        this.particles = [];
        this.floatingTexts = [];

        // Rastro de la espada láser (Katana Trail)
        this.bladeTrail = [];
        this.isSwiping = false;
        this.currentStrokeSlices = 0;
        this.strokeTimer = 0;

        // Generador de objetivos
        this.spawnTimer = 0;
        this.gravity = 980; // px/s²

        this.initDom();
        this.bindEvents();
        this.renderMenu();
    }

    initDom() {
        this.dom = {
            scoreVal: document.getElementById('score-val'),
            bestVal: document.getElementById('best-val'),
            livesContainer: document.getElementById('lives-box'),
            overlay: document.getElementById('game-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayDesc: document.getElementById('overlay-desc'),
            btnPlay: document.getElementById('btn-play-overlay'),
            btnMusic: document.getElementById('btn-music'),
            btnSound: document.getElementById('btn-sound')
        };
    }

    bindEvents() {
        this.dom.btnPlay.addEventListener('click', () => this.start());
        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.katanaAudio.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
        });
        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.katanaAudio.toggleSFX();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
        });

        // Eventos de Ratón
        const addTrailPoint = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (clientX - rect.left) * (this.WIDTH / rect.width);
            const y = (clientY - rect.top) * (this.HEIGHT / rect.height);

            const now = performance.now();
            this.bladeTrail.push({ x, y, time: now });

            // Comprobar colisión de corte con el último segmento
            if (this.bladeTrail.length >= 2) {
                const p1 = this.bladeTrail[this.bladeTrail.length - 2];
                const p2 = this.bladeTrail[this.bladeTrail.length - 1];
                this.checkSliceSegment(p1, p2);
            }
        };

        this.canvas.addEventListener('mousedown', (e) => {
            this.isSwiping = true;
            this.bladeTrail = [];
            this.currentStrokeSlices = 0;
            addTrailPoint(e.clientX, e.clientY);
            window.katanaAudio.playSwish();
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isSwiping) {
                addTrailPoint(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isSwiping) {
                this.finishStroke();
                this.isSwiping = false;
            }
        });

        // Eventos Táctiles (Móviles)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.isSwiping = true;
                this.bladeTrail = [];
                this.currentStrokeSlices = 0;
                addTrailPoint(e.touches[0].clientX, e.touches[0].clientY);
                window.katanaAudio.playSwish();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isSwiping && e.touches.length > 0) {
                addTrailPoint(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.finishStroke();
            this.isSwiping = false;
        }, { passive: false });
    }

    start() {
        window.katanaAudio.init();
        window.katanaAudio.startMusic();

        this.isRunning = true;
        this.isGameOver = false;
        this.score = 0;
        this.lives = 3;
        this.slowMoTimer = 0;

        this.targets = [];
        this.halves = [];
        this.particles = [];
        this.floatingTexts = [];
        this.bladeTrail = [];

        this.updateHUD();
        this.dom.overlay.classList.add('hidden');

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    finishStroke() {
        if (this.currentStrokeSlices >= 3) {
            // ¡COMBO!
            const bonus = this.currentStrokeSlices * 15;
            this.score += bonus;
            const midP = this.bladeTrail[Math.floor(this.bladeTrail.length / 2)] || { x: this.WIDTH / 2, y: this.HEIGHT / 2 };
            this.spawnFloatingText(`¡COMBO x${this.currentStrokeSlices}! +${bonus}`, midP.x, midP.y, '#ffd700', 22);
        }
        this.currentStrokeSlices = 0;
    }

    // ============================================================
    // BUCLE PRINCIPAL
    // ============================================================
    loop(timestamp) {
        if (!this.isRunning) return;
        let dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        // Efecto Cámara Lenta / Tiempo Bala
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            dt *= 0.3; // 70% más lento
        }

        this.update(dt);
        this.render();

        if (this.isRunning && !this.isGameOver) {
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    update(dt) {
        // 1. Decaimiento del Rastro de la Katana
        const now = performance.now();
        this.bladeTrail = this.bladeTrail.filter(p => now - p.time < 120);

        // 2. Spawner de Núcleos y Bombas
        this.spawnTimer += dt;
        if (this.spawnTimer > 1.4) {
            this.spawnTimer = 0;
            this.spawnWave();
        }

        // 3. Actualizar Objetivos voladores
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.vy += this.gravity * dt;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            t.angle += t.vAngle;

            // Si cae abajo sin cortar
            if (t.y > this.HEIGHT + 50 && t.vy > 0) {
                if (t.type !== 'bomb') {
                    this.loseLife();
                }
                this.targets.splice(i, 1);
            }
        }

        // 4. Actualizar Mitades cortadas
        for (let i = this.halves.length - 1; i >= 0; i--) {
            const h = this.halves[i];
            h.vy += this.gravity * 1.2 * dt;
            h.x += h.vx * dt;
            h.y += h.vy * dt;
            h.angle += h.vAngle;
            if (h.y > this.HEIGHT + 80) {
                this.halves.splice(i, 1);
            }
        }

        // 5. Partículas y Textos
        this.updateEffects(dt);

        this.updateHUD();
    }

    spawnWave() {
        const count = Math.floor(Math.random() * 3) + 1; // 1 a 3 núcleos
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (this.WIDTH - 140) + 70;
            const y = this.HEIGHT + 40;
            const targetX = this.WIDTH / 2 + (Math.random() - 0.5) * 160;
            const vx = (targetX - x) * 1.4;
            const vy = -(Math.random() * 160 + 680); // Impulso ascendente

            const rand = Math.random();
            let type = 'plasma';
            let color = '#00f7ff';
            let pts = 10;
            let radius = 28;

            if (rand < 0.18) {
                type = 'bomb';
                color = '#ff0055';
                radius = 26;
            } else if (rand < 0.28) {
                type = 'chrono';
                color = '#7c4dff';
                pts = 30;
                radius = 26;
            } else if (rand < 0.6) {
                type = 'crystal';
                color = '#ff00e5';
                pts = 20;
                radius = 27;
            } else if (rand < 0.75) {
                type = 'solar';
                color = '#ffd700';
                pts = 50;
                radius = 30;
            }

            this.targets.push({
                x, y, vx, vy,
                radius, type, color, pts,
                angle: 0,
                vAngle: (Math.random() - 0.5) * 0.12
            });
        }
    }

    checkSliceSegment(p1, p2) {
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            const dist = this.distPointToSegment(t.x, t.y, p1.x, p1.y, p2.x, p2.y);

            if (dist < t.radius) {
                // ¡Corte exitoso!
                this.sliceTarget(t, i, p1, p2);
            }
        }
    }

    distPointToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const l2 = dx * dx + dy * dy;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    sliceTarget(target, idx, p1, p2) {
        this.targets.splice(idx, 1);

        // Si cortaste una Bomba EMP
        if (target.type === 'bomb') {
            window.katanaAudio.playBombExplosion();
            this.spawnExplosion(target.x, target.y, '#ff0055', 40);
            this.loseLife();
            return;
        }

        // Si cortaste un Núcleo Chrono (Slow-mo)
        if (target.type === 'chrono') {
            this.slowMoTimer = 4.0;
            window.katanaAudio.playSlowMo();
            this.spawnFloatingText('¡TIEMPO BALA!', target.x, target.y, '#00f7ff', 24);
        }

        this.currentStrokeSlices++;
        this.score += target.pts;
        window.katanaAudio.playSlice(this.currentStrokeSlices);

        // Separación de dos mitades
        const cutAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpX = Math.cos(cutAngle + Math.PI / 2) * 160;
        const perpY = Math.sin(cutAngle + Math.PI / 2) * 160;

        // Mitad 1
        this.halves.push({
            x: target.x, y: target.y,
            vx: target.vx + perpX,
            vy: target.vy + perpY - 60,
            radius: target.radius,
            color: target.color,
            angle: cutAngle,
            vAngle: 0.15,
            isLeft: true
        });

        // Mitad 2
        this.halves.push({
            x: target.x, y: target.y,
            vx: target.vx - perpX,
            vy: target.vy - perpY - 60,
            radius: target.radius,
            color: target.color,
            angle: cutAngle,
            vAngle: -0.15,
            isLeft: false
        });

        // Chispas y salpicaduras de energía de corte
        this.spawnExplosion(target.x, target.y, target.color, 25);
        this.spawnFloatingText(`+${target.pts}`, target.x, target.y - 10, target.color, 16);
    }

    spawnExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 260 + 50;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3.5 + 1.5,
                color,
                life: 0.4, maxLife: 0.4
            });
        }
    }

    spawnFloatingText(text, x, y, color, size = 18) {
        this.floatingTexts.push({
            text, x, y, color, size,
            vy: -45,
            life: 0.65, maxLife: 0.65
        });
    }

    loseLife() {
        this.lives--;
        if (this.lives <= 0) {
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.isRunning = false;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('cyberKatana_best', this.bestScore.toString());
        }

        this.dom.overlayTitle.textContent = '¡HOJA LÁSER CAÍDA!';
        this.dom.overlayDesc.innerHTML = `Puntuación Final: <b style="color:#00f7ff; font-size:1.4rem;">${this.score}</b><br>Récord: <b>${this.bestScore}</b>`;
        this.dom.btnPlay.textContent = 'Reintentar Desenvaine ⚔️';
        this.dom.overlay.classList.remove('hidden');
    }

    updateHUD() {
        this.dom.scoreVal.textContent = this.score;
        this.dom.bestVal.textContent = Math.max(this.score, this.bestScore);

        let hearts = '';
        for (let i = 0; i < 3; i++) {
            hearts += (i < this.lives) ? '🔋' : '⚡';
        }
        this.dom.livesContainer.textContent = hearts;
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

        // 1. Fondo Cyberpunk Dojo
        this.drawBackground();

        // 2. Objetivos voladores
        this.drawTargets();

        // 3. Mitades cortadas
        this.drawHalves();

        // 4. Efectos de partículas y combos
        this.drawEffects();

        // 5. Rastro de Espada Láser Brillante
        this.drawBladeTrail();

        // 6. Efecto de marco / viñeta slow-motion si está activo
        if (this.slowMoTimer > 0) {
            ctx.strokeStyle = 'rgba(0, 247, 255, 0.4)';
            ctx.lineWidth = 8;
            ctx.strokeRect(0, 0, this.WIDTH, this.HEIGHT);
        }
    }

    drawBackground() {
        const ctx = this.ctx;
        ctx.fillStyle = '#070612';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Rayos de luz volumétricos de fondo
        const grad = ctx.createLinearGradient(0, 0, 0, this.HEIGHT);
        grad.addColorStop(0, 'rgba(189, 0, 255, 0.15)');
        grad.addColorStop(0.5, 'rgba(0, 247, 255, 0.08)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    }

    drawTargets() {
        const ctx = this.ctx;
        this.targets.forEach(t => {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);

            // Aura de brillo neón
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 15;

            if (t.type === 'bomb') {
                // Bomba EMP oscura con símbolo de peligro
                ctx.fillStyle = '#1a050f';
                ctx.beginPath();
                ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#ff0055';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💣', 0, 6);
            } else {
                // Núcleo de Plasma
                const radGrad = ctx.createRadialGradient(0, 0, t.radius * 0.2, 0, 0, t.radius);
                radGrad.addColorStop(0, '#ffffff');
                radGrad.addColorStop(0.4, t.color);
                radGrad.addColorStop(1, '#05021a');

                ctx.fillStyle = radGrad;
                ctx.beginPath();
                ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.restore();
            ctx.shadowBlur = 0;
        });
    }

    drawHalves() {
        const ctx = this.ctx;
        this.halves.forEach(h => {
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.rotate(h.angle);

            ctx.fillStyle = h.color;
            ctx.shadowColor = h.color;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            if (h.isLeft) {
                ctx.arc(0, 0, h.radius, Math.PI * 0.5, Math.PI * 1.5);
            } else {
                ctx.arc(0, 0, h.radius, -Math.PI * 0.5, Math.PI * 0.5);
            }
            ctx.closePath();
            ctx.fill();

            ctx.restore();
            ctx.shadowBlur = 0;
        });
    }

    drawBladeTrail() {
        const ctx = this.ctx;
        if (this.bladeTrail.length < 2) return;

        // Resplandor exterior de la hoja de sable
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.moveTo(this.bladeTrail[0].x, this.bladeTrail[0].y);
        for (let i = 1; i < this.bladeTrail.length; i++) {
            ctx.lineTo(this.bladeTrail[i].x, this.bladeTrail[i].y);
        }
        ctx.stroke();

        // Núcleo blanco caliente de la hoja láser
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawEffects() {
        const ctx = this.ctx;
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        this.floatingTexts.forEach(ft => {
            const alpha = ft.life / ft.maxLife;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${ft.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    renderMenu() {
        this.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.katanaGame = new CyberKatanaGame();
});
