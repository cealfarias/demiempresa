// ============================================================
// COSMIC FUSION: SUPERNOVA - Motor del Juego (Estilo Suika 2048)
// ============================================================

const TIERS = [
    { tier: 1, name: 'Asteroide', radius: 16, pts: 2, color: '#9e9e9e', aura: 'rgba(180, 180, 180, 0.45)', detail: '#757575' },
    { tier: 2, name: 'Luna Plateada', radius: 23, pts: 4, color: '#e0e0e0', aura: 'rgba(220, 235, 255, 0.5)', detail: '#bdbdbd' },
    { tier: 3, name: 'Marte Rojo', radius: 31, pts: 8, color: '#ff5722', aura: 'rgba(255, 87, 34, 0.55)', detail: '#d84315' },
    { tier: 4, name: 'Mercurio Cian', radius: 40, pts: 16, color: '#00e5ff', aura: 'rgba(0, 229, 255, 0.6)', detail: '#00b0ff' },
    { tier: 5, name: 'Venus Esmeralda', radius: 50, pts: 32, color: '#00e676', aura: 'rgba(0, 230, 118, 0.6)', detail: '#00c853' },
    { tier: 6, name: 'Planeta Tierra', radius: 61, pts: 64, color: '#2979ff', aura: 'rgba(41, 121, 255, 0.65)', detail: '#00e676' },
    { tier: 7, name: 'Neptuno Violeta', radius: 73, pts: 128, color: '#7c4dff', aura: 'rgba(124, 77, 255, 0.7)', detail: '#651fff' },
    { tier: 8, name: 'Saturno Dorado', radius: 86, pts: 256, color: '#ffd600', aura: 'rgba(255, 214, 0, 0.75)', detail: '#ffab00' },
    { tier: 9, name: 'Júpiter Gigante', radius: 100, pts: 512, color: '#ff9100', aura: 'rgba(255, 145, 0, 0.8)', detail: '#ff3d00' },
    { tier: 10, name: 'Estrella Solar', radius: 116, pts: 1024, color: '#ff3d00', aura: 'rgba(255, 61, 0, 0.85)', detail: '#ffff00' },
    { tier: 11, name: 'Supernova Cósmica', radius: 134, pts: 2048, color: '#d500f9', aura: 'rgba(213, 0, 249, 0.95)', detail: '#00f7ff' }
];

class CosmicFusionGame {
    constructor() {
        this.canvas = document.getElementById('cosmic-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.WIDTH = 460;
        this.HEIGHT = 650;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Dimensiones del Contenedor de Cristal Espacial
        this.jarLeft = 24;
        this.jarRight = this.WIDTH - 24;
        this.jarBottom = this.HEIGHT - 20;
        this.dangerY = 135; // Línea roja de límite superior

        // Estado del Juego
        this.bodies = [];
        this.particles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('cosmicFusion_best') || '0', 10);
        this.isRunning = false;
        this.isGameOver = false;

        // Dropper / Nave Sonda
        this.dropperX = this.WIDTH / 2;
        this.currentTier = 1;
        this.nextTier = 1;
        this.canDrop = true;
        this.dropCooldown = 0;

        // Temporizador de peligro (si tocan la línea roja)
        this.dangerTimer = 0;
        this.maxDangerTime = 2.4; // segundos antes del Game Over

        this.initDom();
        this.bindEvents();
        this.resetGame();
        this.renderMenu();
    }

    initDom() {
        this.dom = {
            scoreVal: document.getElementById('score-val'),
            bestVal: document.getElementById('best-val'),
            nextPreviewCanvas: document.getElementById('next-canvas'),
            overlay: document.getElementById('game-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayDesc: document.getElementById('overlay-desc'),
            btnPlay: document.getElementById('btn-play-overlay'),
            btnMusic: document.getElementById('btn-music'),
            btnSound: document.getElementById('btn-sound')
        };
        this.nextCtx = this.dom.nextPreviewCanvas.getContext('2d');
    }

    bindEvents() {
        this.dom.btnPlay.addEventListener('click', () => this.startGame());
        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.cosmicAudio.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
        });
        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.cosmicAudio.toggleSFX();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
        });

        // Controles de Ratón
        const updateDropperPos = (clientX) => {
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = (clientX - rect.left) * (this.WIDTH / rect.width);
            const r = TIERS[this.currentTier - 1].radius;
            this.dropperX = Math.max(this.jarLeft + r + 6, Math.min(this.jarRight - r - 6, canvasX));
        };

        this.canvas.addEventListener('mousemove', (e) => {
            updateDropperPos(e.clientX);
        });

        this.canvas.addEventListener('mousedown', (e) => {
            updateDropperPos(e.clientX);
            this.dropPlanet();
        });

        // Controles Táctiles (Móviles / Tablets)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                updateDropperPos(e.touches[0].clientX);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                updateDropperPos(e.touches[0].clientX);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.dropPlanet();
        }, { passive: false });
    }

    resetGame() {
        this.bodies = [];
        this.particles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.dangerTimer = 0;
        this.isGameOver = false;
        this.canDrop = true;
        this.currentTier = this.getRandomSpawnTier();
        this.nextTier = this.getRandomSpawnTier();
        this.updateHUD();
        this.drawNextPreview();
    }

    getRandomSpawnTier() {
        // Al inicio solo sueltas asteroides, lunas o marte (niveles 1 a 3, a veces 4)
        const rand = Math.random();
        if (rand < 0.45) return 1;
        if (rand < 0.75) return 2;
        if (rand < 0.93) return 3;
        return 4;
    }

    startGame() {
        window.cosmicAudio.init();
        window.cosmicAudio.startMusic();
        this.resetGame();
        this.isRunning = true;
        this.dom.overlay.classList.add('hidden');
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    dropPlanet() {
        if (!this.isRunning || this.isGameOver || !this.canDrop) return;

        const info = TIERS[this.currentTier - 1];
        const body = {
            id: Math.random().toString(36).substring(2, 9),
            tier: this.currentTier,
            x: this.dropperX,
            y: 90,
            vx: 0,
            vy: 2.5,
            radius: info.radius,
            mass: Math.pow(info.radius, 2),
            color: info.color,
            aura: info.aura,
            detail: info.detail,
            scaleX: 1,
            scaleY: 1,
            squashVel: 0,
            angle: Math.random() * Math.PI * 2,
            vAngle: (Math.random() - 0.5) * 0.04,
            settled: false
        };

        this.bodies.push(body);
        window.cosmicAudio.playDrop();

        this.canDrop = false;
        this.dropCooldown = 0.5; // Cooldown suave

        // Pasar al siguiente
        this.currentTier = this.nextTier;
        this.nextTier = this.getRandomSpawnTier();
        this.drawNextPreview();
    }

    // ============================================================
    // FÍSICA Y SIMULACIÓN 2D CON SUB-PASOS
    // ============================================================
    update(dt) {
        if (this.dropCooldown > 0) {
            this.dropCooldown -= dt;
            if (this.dropCooldown <= 0) {
                this.canDrop = true;
            }
        }

        const subSteps = 6;
        const subDt = dt / subSteps;
        const gravity = 1200; // px / s²
        const restitution = 0.22; // Rebote elástico cósmico
        const friction = 0.985;

        for (let step = 0; step < subSteps; step++) {
            // 1. Integración de movimiento
            this.bodies.forEach(b => {
                b.vy += gravity * subDt;
                b.vx *= Math.pow(friction, subDt * 60);
                b.vy *= Math.pow(friction, subDt * 60);
                b.x += b.vx * subDt;
                b.y += b.vy * subDt;
                b.angle += b.vAngle;

                // Colisión con Paredes y Suelo del Contenedor
                if (b.x - b.radius < this.jarLeft) {
                    b.x = this.jarLeft + b.radius;
                    b.vx = -b.vx * restitution;
                    this.applySquash(b, 0.2);
                }
                if (b.x + b.radius > this.jarRight) {
                    b.x = this.jarRight - b.radius;
                    b.vx = -b.vx * restitution;
                    this.applySquash(b, 0.2);
                }
                if (b.y + b.radius > this.jarBottom) {
                    b.y = this.jarBottom - b.radius;
                    b.vy = -b.vy * restitution;
                    b.settled = true;
                    this.applySquash(b, 0.25);
                }
            });

            // 2. Colisión Círculo - Círculo y Detección de Fusión
            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const b1 = this.bodies[i];
                    const b2 = this.bodies[j];
                    if (!b1 || !b2) continue;

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = b1.radius + b2.radius;

                    if (dist < minDist) {
                        // ¿Tienen el mismo Tier y no son la Supernova máxima? -> ¡FUSIÓN!
                        if (b1.tier === b2.tier && b1.tier < TIERS.length) {
                            this.mergeBodies(i, j);
                            return; // Salir del sub-paso para reajustar array
                        }

                        // Respuesta elástica normal
                        const overlap = minDist - dist;
                        const nx = dx / (dist || 1);
                        const ny = dy / (dist || 1);

                        // Separación proporcional a la masa
                        const totalMass = b1.mass + b2.mass;
                        const m1Ratio = b2.mass / totalMass;
                        const m2Ratio = b1.mass / totalMass;

                        b1.x -= nx * overlap * m1Ratio;
                        b1.y -= ny * overlap * m1Ratio;
                        b2.x += nx * overlap * m2Ratio;
                        b2.y += ny * overlap * m2Ratio;

                        // Velocidad relativa
                        const kx = b1.vx - b2.vx;
                        const ky = b1.vy - b2.vy;
                        const p = 2 * (nx * kx + ny * ky) / totalMass;

                        b1.vx -= p * b2.mass * nx * (1 + restitution);
                        b1.vy -= p * b2.mass * ny * (1 + restitution);
                        b2.vx += p * b1.mass * nx * (1 + restitution);
                        b2.vy += p * b1.mass * ny * (1 + restitution);

                        const impactSpeed = Math.hypot(kx, ky);
                        if (impactSpeed > 40) {
                            window.cosmicAudio.playBounce(Math.min(2, impactSpeed / 100));
                            this.applySquash(b1, 0.15);
                            this.applySquash(b2, 0.15);
                        }
                    }
                }
            }
        }

        // Actualizar elasticidad visual (squash & stretch)
        this.bodies.forEach(b => {
            b.squashVel += (1 - b.scaleX) * 0.25;
            b.squashVel *= 0.8;
            b.scaleX += b.squashVel;
            b.scaleY = 2 - b.scaleX; // Mantiene volumen aproximado
        });

        // 3. Chequeo de Peligro / Game Over
        let isDanger = false;
        this.bodies.forEach(b => {
            if (b.y - b.radius < this.dangerY && b.y > 100 && (Math.abs(b.vy) < 20)) {
                isDanger = true;
            }
        });

        if (isDanger) {
            this.dangerTimer += dt;
            if (Math.floor(this.dangerTimer * 10) % 6 === 0) {
                window.cosmicAudio.playWarning();
            }
            if (this.dangerTimer >= this.maxDangerTime) {
                this.triggerGameOver();
            }
        } else {
            this.dangerTimer = Math.max(0, this.dangerTimer - dt * 1.5);
        }

        // 4. Actualizar partículas y textos flotantes
        this.updateEffects(dt);
    }

    applySquash(b, amount) {
        b.scaleX = 1 + amount;
        b.scaleY = 1 - amount;
    }

    mergeBodies(idx1, idx2) {
        const b1 = this.bodies[idx1];
        const b2 = this.bodies[idx2];
        const nextTier = b1.tier + 1;
        const info = TIERS[nextTier - 1];

        const midX = (b1.x + b2.x) / 2;
        const midY = (b1.y + b2.y) / 2;

        // Puntos y Sonido
        this.score += info.pts;
        this.updateHUD();
        window.cosmicAudio.playMerge(nextTier);

        // Crear partículas cósmicas radiantes
        this.spawnMergeShockwave(midX, midY, info.color, info.radius);
        this.spawnFloatingText(`+${info.pts}`, midX, midY - 10, info.color);

        // Crear nuevo planeta fusionado
        const merged = {
            id: Math.random().toString(36).substring(2, 9),
            tier: nextTier,
            x: midX,
            y: midY,
            vx: (b1.vx + b2.vx) * 0.4,
            vy: (b1.vy + b2.vy) * 0.4 - 20, // Pequeño impulso ascendente
            radius: info.radius,
            mass: Math.pow(info.radius, 2),
            color: info.color,
            aura: info.aura,
            detail: info.detail,
            scaleX: 1.4, // Nace con squash expansivo
            scaleY: 0.6,
            squashVel: 0,
            angle: 0,
            vAngle: (Math.random() - 0.5) * 0.05,
            settled: true
        };

        // Eliminar ambos cuerpos y añadir el nuevo
        if (idx1 > idx2) {
            this.bodies.splice(idx1, 1);
            this.bodies.splice(idx2, 1);
        } else {
            this.bodies.splice(idx2, 1);
            this.bodies.splice(idx1, 1);
        }
        this.bodies.push(merged);
    }

    spawnMergeShockwave(x, y, color, radius) {
        // Anillo de choque expansivo
        this.particles.push({
            type: 'ring',
            x, y,
            radius: 10,
            maxRadius: radius * 1.8,
            color,
            alpha: 1,
            life: 25,
            maxLife: 25
        });

        // Chispas estelares
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                type: 'spark',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 2,
                color,
                life: 30,
                maxLife: 30
            });
        }
    }

    spawnFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text, x, y,
            vy: -1.4,
            alpha: 1,
            color,
            life: 40,
            maxLife: 40
        });
    }

    updateEffects(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;
            p.alpha = p.life / p.maxLife;
            if (p.type === 'ring') {
                p.radius += (p.maxRadius - p.radius) * 0.2;
            } else {
                p.x += p.vx;
                p.y += p.vy;
            }
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life--;
            ft.alpha = ft.life / ft.maxLife;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        window.cosmicAudio.playGameOver();

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('cosmicFusion_best', this.bestScore.toString());
        }

        this.dom.overlayTitle.textContent = '¡LÍMITE ESTELAR EXCEDIDO!';
        this.dom.overlayDesc.innerHTML = `Tu contenedor cósmico se desbordó.<br>Puntuación Final: <b style="color: #00f7ff; font-size: 1.4rem;">${this.score}</b>`;
        this.dom.btnPlay.textContent = 'Jugar Otra Vez 🪐';
        this.dom.overlay.classList.remove('hidden');
    }

    updateHUD() {
        this.dom.scoreVal.textContent = this.score;
        this.dom.bestVal.textContent = Math.max(this.score, this.bestScore);
    }

    drawNextPreview() {
        const ctx = this.nextCtx;
        const w = this.dom.nextPreviewCanvas.width;
        const h = this.dom.nextPreviewCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const info = TIERS[this.nextTier - 1];
        ctx.save();
        ctx.translate(w / 2, h / 2);

        // Aura
        const auraGrad = ctx.createRadialGradient(0, 0, info.radius * 0.3, 0, 0, info.radius * 1.3);
        auraGrad.addColorStop(0, info.aura);
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, info.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo
        this.drawCelestialBody(ctx, 0, 0, info.radius * 0.85, info, 0);
        ctx.restore();
    }

    // ============================================================
    // RENDERIZADO VISUAL ESPACIAL MODERNO
    // ============================================================
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        // 1. Fondo Espacial con Nebulosa y Estrellas
        this.drawNebulaBackground();

        // 2. Contenedor de Cristal Espacial (Bordes y Sombra Glassmorphism)
        this.drawGlassJar();

        // 3. Línea Roja de Advertencia (Parpadea si hay peligro)
        this.drawDangerLine();

        // 4. Rayo Guía Láser desde el Dropper
        if (this.canDrop && this.isRunning && !this.isGameOver) {
            this.drawAimingRay();
        }

        // 5. Planetas en el Contenedor
        this.bodies.forEach(b => {
            const info = TIERS[b.tier - 1];
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.scale(b.scaleX, b.scaleY);
            ctx.rotate(b.angle);

            // Aura de brillo exterior
            const auraGrad = ctx.createRadialGradient(0, 0, b.radius * 0.5, 0, 0, b.radius * 1.4);
            auraGrad.addColorStop(0, info.aura);
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(0, 0, b.radius * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Dibujar planeta estilizado
            this.drawCelestialBody(ctx, 0, 0, b.radius, info, b.angle);
            ctx.restore();
        });

        // 6. Dropper / Sonda Superior con el planeta actual flotando
        if (this.isRunning && !this.isGameOver) {
            this.drawDropperProbe();
        }

        // 7. Partículas y Efectos de Fusión
        this.drawEffects();
    }

    drawNebulaBackground() {
        const ctx = this.ctx;
        // Fondo negro profundo
        ctx.fillStyle = '#06040d';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Resplandor de nebulosa violeta/azul
        const grad = ctx.createRadialGradient(this.WIDTH / 2, this.HEIGHT / 2, 80, this.WIDTH / 2, this.HEIGHT / 2, 350);
        grad.addColorStop(0, 'rgba(80, 20, 140, 0.22)');
        grad.addColorStop(0.6, 'rgba(10, 40, 90, 0.15)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    }

    drawGlassJar() {
        const ctx = this.ctx;
        const w = this.jarRight - this.jarLeft;
        const h = this.jarBottom - this.dangerY;

        // Relleno de cristal esmerilado suave
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.beginPath();
        ctx.roundRect(this.jarLeft, this.dangerY, w, h, [0, 0, 24, 24]);
        ctx.fill();

        // Borde de cristal brillante de neón cian suave
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.jarLeft, this.dangerY);
        ctx.lineTo(this.jarLeft, this.jarBottom - 24);
        ctx.quadraticCurveTo(this.jarLeft, this.jarBottom, this.jarLeft + 24, this.jarBottom);
        ctx.lineTo(this.jarRight - 24, this.jarBottom);
        ctx.quadraticCurveTo(this.jarRight, this.jarBottom, this.jarRight, this.jarBottom - 24);
        ctx.lineTo(this.jarRight, this.dangerY);
        ctx.stroke();
    }

    drawDangerLine() {
        const ctx = this.ctx;
        const isBlinking = this.dangerTimer > 0;
        ctx.save();
        ctx.strokeStyle = isBlinking ? '#ff0055' : 'rgba(255, 0, 85, 0.35)';
        ctx.lineWidth = isBlinking ? 2.5 : 1.5;
        ctx.setLineDash([8, 6]);

        ctx.beginPath();
        ctx.moveTo(this.jarLeft, this.dangerY);
        ctx.lineTo(this.jarRight, this.dangerY);
        ctx.stroke();

        if (isBlinking) {
            ctx.fillStyle = '#ff0055';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'right';
            const secsLeft = Math.max(0, this.maxDangerTime - this.dangerTimer).toFixed(1);
            ctx.fillText(`¡PELIGRO! ${secsLeft}s`, this.jarRight - 10, this.dangerY - 8);
        }
        ctx.restore();
    }

    drawAimingRay() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);

        ctx.beginPath();
        ctx.moveTo(this.dropperX, 100);
        ctx.lineTo(this.dropperX, this.jarBottom);
        ctx.stroke();
        ctx.restore();
    }

    drawDropperProbe() {
        const ctx = this.ctx;
        const x = this.dropperX;
        const y = 60;
        const info = TIERS[this.currentTier - 1];

        // Sonda / Platillo espacial
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#1c223a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cúpula
        ctx.fillStyle = '#00f7ff';
        ctx.beginPath();
        ctx.arc(0, -3, 8, Math.PI, 0);
        ctx.fill();

        ctx.restore();

        // Planeta listo para ser soltado (si está cargado)
        if (this.canDrop) {
            ctx.save();
            ctx.translate(x, 90);
            this.drawCelestialBody(ctx, 0, 0, info.radius, info, 0);
            ctx.restore();
        }
    }

    drawCelestialBody(ctx, x, y, r, info, angle) {
        // Base degradada del planeta
        const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, info.color);
        grad.addColorStop(1, info.detail);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Detalles decorativos según el Tier
        if (info.tier === 8) {
            // Saturno: Anillos elípticos
            ctx.strokeStyle = 'rgba(255, 230, 100, 0.75)';
            ctx.lineWidth = r * 0.22;
            ctx.beginPath();
            ctx.ellipse(x, y, r * 1.5, r * 0.45, 0.4, 0, Math.PI * 2);
            ctx.stroke();
        } else if (info.tier === 6) {
            // Tierra: Continentes verdes
            ctx.fillStyle = '#00c853';
            ctx.beginPath();
            ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.35, 0, Math.PI * 2);
            ctx.arc(x + r * 0.3, y + r * 0.2, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (info.tier === 9) {
            // Júpiter: Gran mancha roja y bandas
            ctx.strokeStyle = 'rgba(255, 60, 0, 0.6)';
            ctx.lineWidth = r * 0.18;
            ctx.beginPath();
            ctx.ellipse(x, y - r * 0.2, r * 0.9, r * 0.2, 0, 0, Math.PI * 2);
            ctx.ellipse(x, y + r * 0.2, r * 0.9, r * 0.2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (info.tier >= 10) {
            // Sol y Supernova: Corona ardiente pulsante
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, r + 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Borde suave con relieve
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawEffects() {
        const ctx = this.ctx;
        // Partículas
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            if (p.type === 'ring') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // Textos flotantes
        this.floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        if (this.isRunning && !this.isGameOver) {
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    renderMenu() {
        this.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.cosmicGame = new CosmicFusionGame();
});
