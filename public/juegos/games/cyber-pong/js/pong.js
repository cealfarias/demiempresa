// Cyber Pong Neo - Motor de Ping Pong Arcade con Físicas y Sonido Contundente
class CyberPongGame {
    constructor() {
        this.canvas = document.getElementById('pong-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Dimensiones del campo arcade
        this.width = 800;
        this.height = 500;
        this.setupCanvas();

        // Configuración y Modos
        this.mode = '1p'; // '1p' (vs IA) o '2p' (2 Jugadores local)
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.pointsToWin = 7;

        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;

        // Marcadores
        this.score1 = 0;
        this.score2 = 0;
        this.currentRally = 0;
        this.bestRally = parseInt(localStorage.getItem('cyber_pong_best_rally') || '0', 10);

        // Paletas
        const paddleH = 92;
        const paddleW = 14;
        this.paddle1 = {
            x: 24,
            y: this.height / 2 - paddleH / 2,
            width: paddleW,
            height: paddleH,
            speed: 8.5,
            color: '#00f5d4'
        };

        this.paddle2 = {
            x: this.width - 24 - paddleW,
            y: this.height / 2 - paddleH / 2,
            width: paddleW,
            height: paddleH,
            speed: 7.5,
            color: '#ff006e'
        };

        // Pelota
        this.ball = {
            x: this.width / 2,
            y: this.height / 2,
            radius: 8,
            vx: 0,
            vy: 0,
            baseSpeed: 7,
            currentSpeed: 7,
            trail: []
        };

        this.particles = [];
        this.screenShake = 0;

        // Entradas
        this.keys = {};
        this.touch1Y = null;
        this.touch2Y = null;

        this.bindEvents();
        this.updateUI();
        this.resetBall(1);
        this.startLoop();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    start() {
        window.pongAudio.init();
        this.score1 = 0;
        this.score2 = 0;
        this.currentRally = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.isRunning = true;

        this.resetPaddles();
        this.resetBall(Math.random() < 0.5 ? 1 : -1);

        document.getElementById('game-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');

        window.pongAudio.startMusic();
        this.updateUI();
    }

    resetPaddles() {
        this.paddle1.y = this.height / 2 - this.paddle1.height / 2;
        this.paddle2.y = this.height / 2 - this.paddle2.height / 2;
    }

    resetBall(direction = 1) {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        this.ball.currentSpeed = this.ball.baseSpeed;
        this.ball.trail = [];

        // Ángulo de saque aleatorio entre -35° y +35°
        const angle = (Math.random() * 70 - 35) * (Math.PI / 180);
        this.ball.vx = Math.cos(angle) * this.ball.currentSpeed * direction;
        this.ball.vy = Math.sin(angle) * this.ball.currentSpeed;

        this.currentRally = 0;
        this.updateUI();
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            window.pongAudio.stopMusic();
            pauseOverlay.classList.remove('hidden');
        } else {
            pauseOverlay.classList.add('hidden');
            window.pongAudio.startMusic();
        }
    }

    gameOver(winner) {
        this.isGameOver = true;
        this.isRunning = false;
        window.pongAudio.playVictory();

        const overlay = document.getElementById('game-overlay');
        const winnerName = winner === 1 ? '¡JUGADOR 1 GANA!' : (this.mode === '1p' ? '¡LA CPU GANA!' : '¡JUGADOR 2 GANA!');
        document.getElementById('overlay-title').innerText = winnerName;
        document.getElementById('overlay-desc').innerText = `Marcador Final: ${this.score1} - ${this.score2} | Rally Máximo: ${this.bestRally}`;
        document.getElementById('btn-overlay-play').innerText = 'Jugar Otra Partida ↺';
        overlay.classList.remove('hidden');
        this.updateUI();
    }

    // --- LÓGICA DE INTELIGENCIA ARTIFICIAL (IA) ---
    updateAI() {
        if (this.mode !== '1p') return;

        const p2 = this.paddle2;
        const b = this.ball;
        const targetY = b.y - p2.height / 2;

        let aiSpeed = p2.speed;
        let reactionError = 0;

        if (this.difficulty === 'easy') {
            aiSpeed = 4.8;
            reactionError = Math.sin(Date.now() * 0.003) * 25; // Pequeño margen de error
        } else if (this.difficulty === 'medium') {
            aiSpeed = 6.8;
            reactionError = Math.sin(Date.now() * 0.005) * 12;
        } else {
            // Imposible / Pro: Reflejos inmediatos y máxima velocidad
            aiSpeed = 9.2;
            reactionError = 0;
        }

        // Solo persigue activamente si la bola viene hacia su lado
        if (b.vx > 0) {
            const desiredY = targetY + reactionError;
            if (p2.y < desiredY - 5) {
                p2.y += aiSpeed;
            } else if (p2.y > desiredY + 5) {
                p2.y -= aiSpeed;
            }
        } else {
            // Vuelve suavemente al centro del campo
            const centerY = this.height / 2 - p2.height / 2;
            if (p2.y < centerY - 10) p2.y += 2.5;
            else if (p2.y > centerY + 10) p2.y -= 2.5;
        }

        p2.y = Math.max(0, Math.min(this.height - p2.height, p2.y));
    }

    // --- ACTUALIZACIÓN DE FÍSICA ---
    update() {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;

        // 1. Control Jugador 1
        const p1 = this.paddle1;
        if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp'] && this.mode === '1p') p1.y -= p1.speed;
        if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown'] && this.mode === '1p') p1.y += p1.speed;
        if (this.touch1Y !== null) {
            p1.y = this.touch1Y - p1.height / 2;
        }
        p1.y = Math.max(0, Math.min(this.height - p1.height, p1.y));

        // 2. Control Jugador 2 (o IA)
        const p2 = this.paddle2;
        if (this.mode === '2p') {
            if (this.keys['ArrowUp']) p2.y -= p2.speed;
            if (this.keys['ArrowDown']) p2.y += p2.speed;
            if (this.touch2Y !== null) {
                p2.y = this.touch2Y - p2.height / 2;
            }
            p2.y = Math.max(0, Math.min(this.height - p2.height, p2.y));
        } else {
            this.updateAI();
        }

        // 3. Movimiento y trayectoria de la Pelota
        const b = this.ball;

        // Guardar estela de movimiento
        b.trail.unshift({ x: b.x, y: b.y, speed: b.currentSpeed });
        if (b.trail.length > 8) b.trail.pop();

        b.x += b.vx;
        b.y += b.vy;

        // 4. Rebote en paredes superior e inferior
        if (b.y - b.radius <= 0) {
            b.y = b.radius;
            b.vy *= -1;
            window.pongAudio.playWallHit();
            this.createHitParticles(b.x, b.y, '#ffffff', 8);
        } else if (b.y + b.radius >= this.height) {
            b.y = this.height - b.radius;
            b.vy *= -1;
            window.pongAudio.playWallHit();
            this.createHitParticles(b.x, b.y, '#ffffff', 8);
        }

        // 5. Colisión con Paleta 1 (Izquierda)
        if (b.vx < 0 && b.x - b.radius <= p1.x + p1.width && b.x + b.radius >= p1.x) {
            if (b.y >= p1.y && b.y <= p1.y + p1.height) {
                b.x = p1.x + p1.width + b.radius;
                this.handlePaddleBounce(p1, 1);
            }
        }

        // 6. Colisión con Paleta 2 (Derecha)
        if (b.vx > 0 && b.x + b.radius >= p2.x && b.x - b.radius <= p2.x + p2.width) {
            if (b.y >= p2.y && b.y <= p2.y + p2.height) {
                b.x = p2.x - b.radius;
                this.handlePaddleBounce(p2, -1);
            }
        }

        // 7. Punto / Anotación
        if (b.x < 0) {
            // Punto para Jugador 2 / CPU
            this.score2++;
            this.triggerGoal(2);
        } else if (b.x > this.width) {
            // Punto para Jugador 1
            this.score1++;
            this.triggerGoal(1);
        }

        // 8. Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.alpha -= pt.decay;
            if (pt.alpha <= 0) this.particles.splice(i, 1);
        }

        if (this.screenShake > 0) this.screenShake *= 0.82;
        if (this.screenShake < 0.2) this.screenShake = 0;
    }

    handlePaddleBounce(paddle, dirX) {
        const b = this.ball;

        // Calcular punto de impacto relativo (-1 arriba, 0 centro, +1 abajo)
        const hitOffset = (b.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        const clampedOffset = Math.max(-0.95, Math.min(0.95, hitOffset));

        // Ángulo de rebote (hasta 60 grados)
        const maxAngle = 60 * (Math.PI / 180);
        const bounceAngle = clampedOffset * maxAngle;

        // Aumentar velocidad y rally
        this.currentRally++;
        if (this.currentRally > this.bestRally) {
            this.bestRally = this.currentRally;
            localStorage.setItem('cyber_pong_best_rally', this.bestRally.toString());
        }

        b.currentSpeed = Math.min(17.5, b.currentSpeed + 0.45);
        b.vx = Math.cos(bounceAngle) * b.currentSpeed * dirX;
        b.vy = Math.sin(bounceAngle) * b.currentSpeed;

        // Si la velocidad supera 11.5, ¡es un SMASH!
        const isSmash = b.currentSpeed > 11.5;
        if (isSmash) {
            window.pongAudio.playSmash();
            this.screenShake = 10;
        } else {
            window.pongAudio.playPaddleHit(b.currentSpeed / b.baseSpeed);
            this.screenShake = 3;
        }

        this.createHitParticles(b.x, b.y, paddle.color, isSmash ? 24 : 14);
        this.updateUI();
    }

    triggerGoal(scoringPlayer) {
        window.pongAudio.playPoint();
        this.screenShake = 14;
        this.createHitParticles(this.ball.x, this.ball.y, scoringPlayer === 1 ? '#00f5d4' : '#ff006e', 35);
        this.updateUI();

        if (this.score1 >= this.pointsToWin || this.score2 >= this.pointsToWin) {
            this.gameOver(this.score1 >= this.pointsToWin ? 1 : 2);
        } else {
            // Pausa breve antes del siguiente saque
            setTimeout(() => {
                if (this.isRunning) {
                    this.resetBall(scoringPlayer === 1 ? -1 : 1);
                }
            }, 700);
        }
    }

    createHitParticles(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 5 + 1.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: Math.random() * 4 + 2,
                color: color,
                alpha: 1,
                decay: Math.random() * 0.04 + 0.03
            });
        }
    }

    // --- RENDERIZADO VISUAL RETRO CYBERPUNK ---
    draw() {
        this.ctx.save();

        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(sx, sy);
        }

        // Fondo del campo
        this.ctx.fillStyle = '#0a0d1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Línea central divisoria punteada
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([12, 12]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Marcadores gigantes de fondo
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.font = '900 110px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.score1, this.width / 4, this.height / 2);
        this.ctx.fillText(this.score2, (this.width / 4) * 3, this.height / 2);

        // 1. Estela luminosa de la pelota
        this.ball.trail.forEach((t, i) => {
            const alpha = (1 - i / this.ball.trail.length) * 0.5;
            const radius = this.ball.radius * (1 - i / (this.ball.trail.length * 1.5));
            this.ctx.save();
            this.ctx.fillStyle = t.speed > 11.5 ? `rgba(255, 0, 110, ${alpha})` : `rgba(0, 245, 212, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 2. Pelota activa
        const b = this.ball;
        const isSmash = b.currentSpeed > 11.5;
        this.ctx.save();
        this.ctx.fillStyle = isSmash ? '#ff006e' : '#ffffff';
        this.ctx.shadowColor = isSmash ? '#ff006e' : '#00f5d4';
        this.ctx.shadowBlur = isSmash ? 20 : 12;
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // 3. Paleta 1 (Jugador 1 - Cyan)
        const p1 = this.paddle1;
        this.ctx.save();
        this.ctx.fillStyle = p1.color;
        this.ctx.shadowColor = p1.color;
        this.ctx.shadowBlur = 14;
        this.ctx.beginPath();
        this.ctx.roundRect(p1.x, p1.y, p1.width, p1.height, 7);
        this.ctx.fill();
        this.ctx.restore();

        // 4. Paleta 2 (Jugador 2 / CPU - Magenta)
        const p2 = this.paddle2;
        this.ctx.save();
        this.ctx.fillStyle = p2.color;
        this.ctx.shadowColor = p2.color;
        this.ctx.shadowBlur = 14;
        this.ctx.beginPath();
        this.ctx.roundRect(p2.x, p2.y, p2.width, p2.height, 7);
        this.ctx.fill();
        this.ctx.restore();

        // 5. Partículas
        this.particles.forEach(pt => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, pt.alpha);
            this.ctx.fillStyle = pt.color;
            this.ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
            this.ctx.restore();
        });

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
        document.getElementById('score1-val').innerText = this.score1;
        document.getElementById('score2-val').innerText = this.score2;
        document.getElementById('rally-val').innerText = this.currentRally;
        document.getElementById('best-rally-val').innerText = this.bestRally;

        // Etiqueta del jugador 2
        const p2Label = document.getElementById('p2-label');
        if (p2Label) {
            p2Label.innerText = this.mode === '1p' ? `CPU (${this.difficulty.toUpperCase()})` : 'JUGADOR 2';
        }

        // Botones activos de modo
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-mode-${this.mode}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Selector de dificultad
        const diffSelector = document.getElementById('difficulty-group');
        if (diffSelector) {
            diffSelector.style.display = this.mode === '1p' ? 'flex' : 'none';
        }
        document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
        const activeDiff = document.getElementById(`btn-diff-${this.difficulty}`);
        if (activeDiff) activeDiff.classList.add('active');
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
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

        // Control con ratón en el lienzo
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isRunning || this.isPaused) return;
            const pos = this.getCanvasCoords(e);
            this.paddle1.y = pos.y - this.paddle1.height / 2;
        });

        // Soporte multitáctil para móviles y tablets
        const handleTouch = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.height / rect.height;

            this.touch1Y = null;
            this.touch2Y = null;

            for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                const touchX = t.clientX - rect.left;
                const touchY = (t.clientY - rect.top) * scaleY;

                if (this.mode === '1p') {
                    // En 1 jugador, cualquier parte de la pantalla controla la pala
                    this.touch1Y = touchY;
                } else {
                    // En 2 jugadores, mitad izquierda para P1, mitad derecha para P2
                    if (touchX < rect.width / 2) {
                        this.touch1Y = touchY;
                    } else {
                        this.touch2Y = touchY;
                    }
                }
            }
        };

        this.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        this.canvas.addEventListener('touchmove', handleTouch, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.touch1Y = null;
                this.touch2Y = null;
            }
        });

        // Botón Start en Overlay
        document.getElementById('btn-overlay-play').addEventListener('click', () => {
            this.start();
        });

        // Botón Pausa
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());

        // Botones de Modo (1P vs 2P)
        document.getElementById('btn-mode-1p').addEventListener('click', () => {
            this.mode = '1p';
            this.updateUI();
        });
        document.getElementById('btn-mode-2p').addEventListener('click', () => {
            this.mode = '2p';
            this.updateUI();
        });

        // Dificultad IA
        ['easy', 'medium', 'hard'].forEach(diff => {
            const btn = document.getElementById(`btn-diff-${diff}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.difficulty = diff;
                    this.updateUI();
                });
            }
        });

        // Audio
        document.getElementById('btn-sound').addEventListener('click', () => this.toggleSFX());
        document.getElementById('btn-music').addEventListener('click', () => this.toggleMusic());
    }

    toggleSFX() {
        const en = window.pongAudio.toggleSFX();
        const btn = document.getElementById('btn-sound');
        if (btn) btn.innerText = en ? '🔊' : '🔇';
    }

    toggleMusic() {
        const en = window.pongAudio.toggleMusic();
        const btn = document.getElementById('btn-music');
        if (btn) btn.innerText = en ? '🎵' : '🎶';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.pongGame = new CyberPongGame();
});
