// ============================================================
// TURBO DRIFT NEO - Motor del Juego de Carreras Arcade Retro
// ============================================================

class TurboDriftGame {
    constructor() {
        this.canvas = document.getElementById('racer-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Configuración de resolución interna de renderizado
        this.WIDTH = 480;
        this.HEIGHT = 640;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Estado del juego
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;

        // Carretera
        this.roadWidth = 320;
        this.roadLeft = (this.WIDTH - this.roadWidth) / 2;
        this.roadRight = this.roadLeft + this.roadWidth;
        this.lanes = 4;
        this.laneWidth = this.roadWidth / this.lanes;
        this.roadScroll = 0;
        this.curve = 0;
        this.targetCurve = 0;
        this.curveTimer = 0;

        // Jugador
        this.player = {
            x: this.WIDTH / 2,
            y: this.HEIGHT - 130,
            width: 44,
            height: 76,
            speed: 0,          // km/h reales simulados
            maxSpeed: 210,     // km/h crucero
            turboSpeed: 300,   // km/h con nitro
            accel: 1.8,
            decel: 1.2,
            brakeDecel: 4.5,
            handling: 5.5,
            angle: 0,
            isBraking: false,
            isTurbo: false,
            turboDuration: 0,
            turboGauge: 100,   // 0 a 100%
            spinTimer: 0,      // por pisar mancha de aceite
            invulnerableTimer: 0,
            crashed: false
        };

        // Combustible y Marcadores
        this.fuel = 100;       // %
        this.distance = 0;     // metros
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('turboDrift_bestScore') || '0', 10);
        this.bestDist = parseFloat(localStorage.getItem('turboDrift_bestDist') || '0.00');

        // Entidades y Sistema de Partículas
        this.traffic = [];
        this.items = [];       // bidones combustible, monedas, aceite
        this.particles = [];
        this.roadsideDeco = []; // palmeras, farolas, postes
        this.skidmarks = [];

        // Tráfico Spawner
        this.spawnTrafficTimer = 0;
        this.spawnItemTimer = 0;
        this.spawnDecoTimer = 0;

        // Entrada / Controles
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            turbo: false,
            horn: false
        };

        // Ciclo Ambiental Synthwave (atardecer a noche neón)
        this.skyHue = 280;

        this.initDom();
        this.bindEvents();
        this.initDecorations();
        this.updateHUD();
        this.renderMenuBackdrop();
    }

    initDom() {
        this.dom = {
            speedVal: document.getElementById('speed-val'),
            fuelBar: document.getElementById('fuel-bar-fill'),
            fuelPct: document.getElementById('fuel-pct'),
            distVal: document.getElementById('dist-val'),
            scoreVal: document.getElementById('score-val'),
            bestVal: document.getElementById('best-val'),
            turboGaugeFill: document.getElementById('turbo-gauge-fill'),
            turboStatus: document.getElementById('turbo-status'),
            overlay: document.getElementById('game-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayDesc: document.getElementById('overlay-desc'),
            btnPlay: document.getElementById('btn-play-overlay'),
            pauseOverlay: document.getElementById('pause-overlay'),
            btnResume: document.getElementById('btn-resume'),
            btnPause: document.getElementById('btn-pause'),
            btnMusic: document.getElementById('btn-music'),
            btnSound: document.getElementById('btn-sound')
        };
    }

    bindEvents() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (!this.isRunning && (e.code === 'Enter' || e.code === 'Space')) {
                this.start();
                return;
            }
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    this.keys.turbo = true;
                    this.triggerTurbo();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.down = true;
                    break;
                case 'KeyH':
                    this.honk();
                    break;
                case 'KeyP':
                    this.togglePause();
                    break;
                case 'KeyM':
                    this.toggleSound();
                    break;
                case 'KeyN':
                    this.toggleMusic();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    this.keys.turbo = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.down = false;
                    break;
            }
        });

        // Botones UI Top
        this.dom.btnPlay.addEventListener('click', () => this.start());
        this.dom.btnResume.addEventListener('click', () => this.togglePause());
        this.dom.btnPause.addEventListener('click', () => this.togglePause());

        this.dom.btnMusic.addEventListener('click', () => this.toggleMusic());
        this.dom.btnSound.addEventListener('click', () => this.toggleSound());

        // Controles Táctiles en Pantalla
        const bindTouchBtn = (id, onDown, onUp) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const startHandler = (e) => {
                e.preventDefault();
                onDown();
            };
            const endHandler = (e) => {
                e.preventDefault();
                if (onUp) onUp();
            };
            btn.addEventListener('touchstart', startHandler, { passive: false });
            btn.addEventListener('touchend', endHandler, { passive: false });
            btn.addEventListener('mousedown', startHandler);
            btn.addEventListener('mouseup', endHandler);
            btn.addEventListener('mouseleave', endHandler);
        };

        bindTouchBtn('touch-left', () => { this.keys.left = true; }, () => { this.keys.left = false; });
        bindTouchBtn('touch-right', () => { this.keys.right = true; }, () => { this.keys.right = false; });
        bindTouchBtn('touch-turbo', () => { this.triggerTurbo(); }, () => { this.keys.turbo = false; });
        bindTouchBtn('touch-brake', () => { this.keys.down = true; }, () => { this.keys.down = false; });
        bindTouchBtn('touch-horn', () => { this.honk(); });

        // Touch Drag directo en el Canvas para móviles
        let touchStartX = null;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                touchStartX = (e.touches[0].clientX - rect.left) * (this.WIDTH / rect.width);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && touchStartX !== null) {
                const rect = this.canvas.getBoundingClientRect();
                const currentX = (e.touches[0].clientX - rect.left) * (this.WIDTH / rect.width);
                const diff = currentX - touchStartX;
                if (diff < -15) {
                    this.keys.left = true;
                    this.keys.right = false;
                } else if (diff > 15) {
                    this.keys.right = true;
                    this.keys.left = false;
                } else {
                    this.keys.left = false;
                    this.keys.right = false;
                }
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => {
            touchStartX = null;
            this.keys.left = false;
            this.keys.right = false;
        }, { passive: true });
    }

    initDecorations() {
        this.roadsideDeco = [];
        for (let i = 0; i < 12; i++) {
            this.roadsideDeco.push({
                side: i % 2 === 0 ? -1 : 1, // -1 = izquierda, 1 = derecha
                y: i * 65,
                type: i % 3 === 0 ? 'palm' : (i % 3 === 1 ? 'light' : 'sign')
            });
        }
    }

    start() {
        window.racerAudio.init();
        window.racerAudio.startEngine();
        window.racerAudio.startMusic();

        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;

        this.player.x = this.WIDTH / 2;
        this.player.y = this.HEIGHT - 130;
        this.player.speed = 40;
        this.player.angle = 0;
        this.player.spinTimer = 0;
        this.player.invulnerableTimer = 0;
        this.player.crashed = false;
        this.player.turboGauge = 100;
        this.player.turboDuration = 0;

        this.fuel = 100;
        this.distance = 0;
        this.score = 0;
        this.traffic = [];
        this.items = [];
        this.particles = [];
        this.skidmarks = [];

        this.dom.overlay.classList.add('hidden');
        this.dom.pauseOverlay.classList.add('hidden');

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.dom.pauseOverlay.classList.remove('hidden');
            window.racerAudio.stopEngine();
        } else {
            this.dom.pauseOverlay.classList.add('hidden');
            window.racerAudio.startEngine();
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    toggleSound() {
        const enabled = window.racerAudio.toggleSFX();
        this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
    }

    toggleMusic() {
        const enabled = window.racerAudio.toggleMusic();
        this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
    }

    honk() {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;
        window.racerAudio.playHorn();

        // Asustar a los coches cercanos para que se aparten de carril
        this.traffic.forEach(car => {
            if (car.y < this.player.y && car.y > this.player.y - 250 && Math.abs(car.x - this.player.x) < 55) {
                car.targetLaneOffset = (car.x < this.WIDTH / 2) ? -35 : 35;
                car.alertBlink = 20;
            }
        });
    }

    triggerTurbo() {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;
        if (this.player.turboGauge >= 30 && this.player.turboDuration <= 0) {
            this.player.turboDuration = 120; // 2 segundos a 60fps
            this.player.turboGauge = Math.max(0, this.player.turboGauge - 35);
            window.racerAudio.playTurbo();

            // Partículas de nitro
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: this.player.x + (Math.random() * 20 - 10),
                    y: this.player.y + 40,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 4 + 3,
                    radius: Math.random() * 5 + 3,
                    color: Math.random() > 0.5 ? '#00f7ff' : '#0066ff',
                    life: 25,
                    maxLife: 25
                });
            }
        }
    }

    gameOver(reason = 'crash') {
        this.isGameOver = true;
        this.isRunning = false;
        window.racerAudio.playGameOver();

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('turboDrift_bestScore', this.bestScore.toString());
        }
        const distKm = parseFloat((this.distance / 1000).toFixed(2));
        if (distKm > this.bestDist) {
            this.bestDist = distKm;
            localStorage.setItem('turboDrift_bestDist', this.bestDist.toFixed(2));
        }

        setTimeout(() => {
            if (reason === 'fuel') {
                this.dom.overlayTitle.textContent = '¡SIN COMBUSTIBLE!';
                this.dom.overlayDesc.innerHTML = `Tu tanque quedó seco.<br>Distancia recorrida: <b>${(this.distance / 1000).toFixed(2)} km</b><br>Puntuación Final: <b style="color: #ffde59;">${this.score}</b>`;
            } else {
                this.dom.overlayTitle.textContent = '¡COLISIÓN TOTAL!';
                this.dom.overlayDesc.innerHTML = `Destruiste el superdeportivo a alta velocidad.<br>Distancia: <b>${(this.distance / 1000).toFixed(2)} km</b><br>Puntuación: <b style="color: #ffde59;">${this.score}</b>`;
            }
            this.dom.btnPlay.textContent = 'Volver a Correr 🏁';
            this.dom.overlay.classList.remove('hidden');
        }, 800);
    }

    // ============================================================
    // BUCLE PRINCIPAL (UPDATE & RENDER)
    // ============================================================
    loop(timestamp) {
        if (!this.isRunning || this.isPaused) return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        if (this.isRunning && !this.isGameOver) {
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    update(dt) {
        // 1. Manejo de Turbo
        if (this.player.turboDuration > 0) {
            this.player.turboDuration--;
            this.player.isTurbo = true;
            // Acelerar bruscamente
            if (this.player.speed < this.player.turboSpeed) {
                this.player.speed += 3.5;
            }
        } else {
            this.player.isTurbo = false;
            // Recargar turbo lentamente con conducción continua
            if (this.player.turboGauge < 100) {
                this.player.turboGauge += 0.08;
            }
        }

        // 2. Aceleración / Frenado del jugador
        if (this.player.spinTimer > 0) {
            // Derrape descontrolado por aceite
            this.player.spinTimer--;
            this.player.angle += 0.35;
            this.player.speed = Math.max(40, this.player.speed - 2.5);
            if (Math.random() < 0.4) {
                window.racerAudio.playScreech();
            }
        } else {
            // Conducción normal
            if (this.keys.down) {
                this.player.speed = Math.max(30, this.player.speed - this.player.brakeDecel);
                this.player.isBraking = true;
            } else {
                this.player.isBraking = false;
                const targetMax = this.player.isTurbo ? this.player.turboSpeed : this.player.maxSpeed;
                if (this.player.speed < targetMax) {
                    this.player.speed += this.player.accel;
                } else if (this.player.speed > targetMax) {
                    this.player.speed -= this.player.decel;
                }
            }

            // Dirección
            let targetAngle = 0;
            if (this.keys.left) {
                this.player.x -= this.player.handling * (this.player.speed / 130);
                targetAngle = -0.15;
            }
            if (this.keys.right) {
                this.player.x += this.player.handling * (this.player.speed / 130);
                targetAngle = 0.15;
            }
            this.player.angle += (targetAngle - this.player.angle) * 0.2;
        }

        // Límite de arcén / borde de carretera con castigo de velocidad
        const minX = this.roadLeft - 20;
        const maxX = this.roadRight + 20;
        if (this.player.x < this.roadLeft || this.player.x > this.roadRight) {
            this.player.speed = Math.max(40, this.player.speed - 1.8);
            if (Math.random() < 0.25) {
                window.racerAudio.playScreech();
            }
        }
        this.player.x = Math.max(minX, Math.min(maxX, this.player.x));

        // Actualizar sonido del motor según velocidad
        const speedRatio = this.player.speed / this.player.turboSpeed;
        window.racerAudio.updateEngineSpeed(speedRatio);

        // 3. Avance de carretera y curvas
        const moveDist = (this.player.speed * 0.28) * dt * 60;
        this.roadScroll = (this.roadScroll + moveDist) % 80;
        this.distance += (this.player.speed / 3.6) * dt; // metros reales
        this.score += Math.floor((this.player.speed / 50) * dt * 25);

        // Curvas dinámicas suaves
        this.curveTimer++;
        if (this.curveTimer > 350) {
            this.curveTimer = 0;
            this.targetCurve = (Math.random() - 0.5) * 45;
        }
        this.curve += (this.targetCurve - this.curve) * 0.01;

        // 4. Consumo de Combustible
        const fuelDrainRate = (0.018 + (this.player.speed / 200) * 0.025);
        this.fuel -= fuelDrainRate * (dt * 60);
        if (this.fuel <= 0) {
            this.fuel = 0;
            this.player.speed = Math.max(0, this.player.speed - 1.5);
            if (this.player.speed === 0) {
                this.gameOver('fuel');
                return;
            }
        }

        // Invulnerabilidad post-choque
        if (this.player.invulnerableTimer > 0) {
            this.player.invulnerableTimer--;
        }

        // 5. Huellas de derrape (Skidmarks)
        if (Math.abs(this.player.angle) > 0.1 || this.player.spinTimer > 0) {
            this.skidmarks.push({
                x1: this.player.x - 14,
                y1: this.player.y + 30,
                x2: this.player.x + 14,
                y2: this.player.y + 30,
                life: 60
            });
        }
        for (let i = this.skidmarks.length - 1; i >= 0; i--) {
            this.skidmarks[i].y1 += moveDist;
            this.skidmarks[i].y2 += moveDist;
            this.skidmarks[i].life--;
            if (this.skidmarks[i].life <= 0 || this.skidmarks[i].y1 > this.HEIGHT + 40) {
                this.skidmarks.splice(i, 1);
            }
        }

        // 6. Generación y Avance de Tráfico
        this.updateTraffic(moveDist, dt);

        // 7. Generación y Recolección de Ítems
        this.updateItems(moveDist);

        // 8. Elementos Decorativos Laterales
        this.updateDecorations(moveDist);

        // 9. Partículas (Fuego, Chispas, Nitro)
        this.updateParticles();

        // 10. Actualizar HUD
        this.updateHUD();
    }

    updateTraffic(playerMove, dt) {
        this.spawnTrafficTimer++;
        const spawnInterval = Math.max(45, 120 - Math.floor(this.distance / 200));
        if (this.spawnTrafficTimer > spawnInterval) {
            this.spawnTrafficTimer = 0;
            if (this.traffic.length < 6) {
                const laneIdx = Math.floor(Math.random() * this.lanes);
                const laneX = this.roadLeft + laneIdx * this.laneWidth + this.laneWidth / 2;
                const types = [
                    { type: 'sedan', color: '#00e5ff', speed: 120, width: 40, height: 70 },
                    { type: 'taxi', color: '#ffd600', speed: 135, width: 40, height: 70 },
                    { type: 'truck', color: '#ff5252', speed: 90, width: 46, height: 100 },
                    { type: 'sports', color: '#e040fb', speed: 155, width: 42, height: 72 }
                ];
                const choice = types[Math.floor(Math.random() * types.length)];
                this.traffic.push({
                    x: laneX,
                    y: -120,
                    targetX: laneX,
                    ...choice,
                    laneChangeTimer: Math.random() * 200 + 100,
                    alertBlink: 0
                });
            }
        }

        // Actualizar posiciones relativas de cada vehículo
        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const car = this.traffic[i];
            // Velocidad relativa hacia el jugador
            const relativeSpeedKmh = this.player.speed - car.speed;
            const carMoveY = (relativeSpeedKmh * 0.28) * dt * 60;
            car.y += carMoveY;

            // Parpadeo de alerta si tocó bocina
            if (car.alertBlink > 0) car.alertBlink--;

            // Desplazamiento lateral suave de carril
            if (car.targetLaneOffset) {
                car.x += car.targetLaneOffset * 0.08;
                car.targetLaneOffset *= 0.9;
                if (Math.abs(car.targetLaneOffset) < 1) car.targetLaneOffset = 0;
            }

            // Colisión con el Jugador
            if (this.player.invulnerableTimer <= 0 && this.checkCollision(this.player, car)) {
                this.handleCrash(car);
            }

            // Eliminar si sale de pantalla (arriba o abajo)
            if (car.y > this.HEIGHT + 140 || car.y < -300) {
                this.traffic.splice(i, 1);
            }
        }
    }

    updateItems(playerMove) {
        this.spawnItemTimer++;
        if (this.spawnItemTimer > 160) {
            this.spawnItemTimer = 0;
            const laneIdx = Math.floor(Math.random() * this.lanes);
            const laneX = this.roadLeft + laneIdx * this.laneWidth + this.laneWidth / 2;
            const rand = Math.random();
            let itemType = 'coin';
            if (rand < 0.45) itemType = 'fuel';
            else if (rand < 0.70) itemType = 'oil';
            else itemType = 'coin';

            this.items.push({
                x: laneX,
                y: -60,
                type: itemType,
                radius: itemType === 'oil' ? 22 : 16
            });
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += playerMove;

            // Recoger o pisar ítem
            const dist = Math.hypot(this.player.x - item.x, this.player.y - item.y);
            if (dist < item.radius + 24) {
                if (item.type === 'fuel') {
                    this.fuel = Math.min(100, this.fuel + 28);
                    this.score += 250;
                    window.racerAudio.playPickup(true);
                    this.createFloatingText('+COMBUSTIBLE', item.x, item.y, '#00ff66');
                    this.items.splice(i, 1);
                } else if (item.type === 'coin') {
                    this.score += 500;
                    window.racerAudio.playPickup(false);
                    this.createFloatingText('+500', item.x, item.y, '#ffd700');
                    this.items.splice(i, 1);
                } else if (item.type === 'oil') {
                    // Mancha de aceite -> Trompo!
                    if (this.player.spinTimer <= 0) {
                        this.player.spinTimer = 45;
                        window.racerAudio.playScreech();
                        this.createFloatingText('¡DERRAPE!', item.x, item.y, '#ff0055');
                    }
                }
                continue;
            }

            if (item.y > this.HEIGHT + 80) {
                this.items.splice(i, 1);
            }
        }
    }

    updateDecorations(playerMove) {
        this.roadsideDeco.forEach(deco => {
            deco.y += playerMove;
            if (deco.y > this.HEIGHT + 60) {
                deco.y = -60;
                deco.side = Math.random() > 0.5 ? 1 : -1;
                deco.type = Math.random() > 0.5 ? 'palm' : 'light';
            }
        });
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    createFloatingText(text, x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 1,
                radius: 3,
                color,
                life: 25,
                maxLife: 25
            });
        }
    }

    checkCollision(rect1, rect2) {
        const margin = 8;
        return (
            rect1.x - rect1.width / 2 + margin < rect2.x + rect2.width / 2 - margin &&
            rect1.x + rect1.width / 2 - margin > rect2.x - rect2.width / 2 + margin &&
            rect1.y - rect1.height / 2 + margin < rect2.y + rect2.height / 2 - margin &&
            rect1.y + rect1.height / 2 - margin > rect2.y - rect2.height / 2 + margin
        );
    }

    handleCrash(obstacle) {
        window.racerAudio.playCrash();
        this.player.invulnerableTimer = 90; // 1.5s parpadeo
        this.player.speed = Math.max(25, this.player.speed * 0.35);
        this.fuel = Math.max(0, this.fuel - 12);

        // Desviar lateralmente al coche chocado
        obstacle.x += (obstacle.x > this.player.x) ? 35 : -35;

        // Chispas y humo de impacto
        for (let i = 0; i < 35; i++) {
            this.particles.push({
                x: (this.player.x + obstacle.x) / 2,
                y: (this.player.y + obstacle.y) / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: Math.random() * 4 + 2,
                color: Math.random() > 0.5 ? '#ffcc00' : '#ff3300',
                life: 30,
                maxLife: 30
            });
        }

        // Si la velocidad al chocar era superior a 250 km/h y fuel es muy bajo, Game Over instantáneo
        if (this.fuel <= 0) {
            this.gameOver('crash');
        }
    }

    updateHUD() {
        this.dom.speedVal.textContent = Math.round(this.player.speed);
        this.dom.fuelBar.style.width = `${Math.max(0, Math.min(100, this.fuel))}%`;
        this.dom.fuelPct.textContent = `${Math.round(this.fuel)}%`;

        if (this.fuel < 20) {
            this.dom.fuelBar.style.backgroundColor = '#ff0055';
        } else if (this.fuel < 45) {
            this.dom.fuelBar.style.backgroundColor = '#ffcc00';
        } else {
            this.dom.fuelBar.style.backgroundColor = '#00ff66';
        }

        const distKm = (this.distance / 1000).toFixed(2);
        this.dom.distVal.textContent = distKm;
        this.dom.scoreVal.textContent = this.score;
        this.dom.bestVal.textContent = Math.max(this.score, this.bestScore);

        this.dom.turboGaugeFill.style.width = `${this.player.turboGauge}%`;
        if (this.player.turboDuration > 0) {
            this.dom.turboStatus.textContent = '¡TURBO ACTIVO!';
            this.dom.turboStatus.style.color = '#00f7ff';
        } else if (this.player.turboGauge >= 30) {
            this.dom.turboStatus.textContent = 'NITRO LISTO (ESPACIO)';
            this.dom.turboStatus.style.color = '#ffff00';
        } else {
            this.dom.turboStatus.textContent = 'RECARGANDO...';
            this.dom.turboStatus.style.color = '#888888';
        }
    }

    // ============================================================
    // RENDERIZADO VISUAL RETRO SYNTHWAVE
    // ============================================================
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        // 1. Cielo Gradiente y Sol Retro 80s
        this.drawSky();

        // 2. Terreno lateral (rejilla neón synthwave)
        this.drawTerrain();

        // 3. Carretera con curvas y líneas animadas
        this.drawRoad();

        // 4. Huellas de derrape
        this.drawSkidmarks();

        // 5. Ítems (bidones, monedas, aceite)
        this.drawItems();

        // 6. Tráfico
        this.drawTraffic();

        // 7. Coche del Jugador con sombras y faros
        this.drawPlayer();

        // 8. Elementos decorativos laterales (farolas, palmeras)
        this.drawDecorations();

        // 9. Partículas de escape, chispas y turbo
        this.drawParticles();

        // 10. Efecto Scanlines CRT
        this.drawScanlines();
    }

    drawSky() {
        const ctx = this.ctx;
        const horizon = 120;

        // Degradado de cielo violeta a fucsia
        const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
        skyGrad.addColorStop(0, '#090014');
        skyGrad.addColorStop(0.6, '#28053a');
        skyGrad.addColorStop(1, '#ff0077');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.WIDTH, horizon);

        // Sol Synthwave retro con rejilla
        const sunX = this.WIDTH / 2 + this.curve * 1.5;
        const sunY = horizon - 15;
        const sunRadius = 45;

        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#ffff00');
        sunGrad.addColorStop(0.5, '#ff5500');
        sunGrad.addColorStop(1, '#ff0066');

        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, Math.PI, 0, false);
        ctx.fillStyle = sunGrad;
        ctx.fill();

        // Líneas horizontales del sol cortado
        ctx.strokeStyle = '#090014';
        ctx.lineWidth = 3;
        for (let y = sunY - 10; y < sunY + 5; y += 6) {
            ctx.beginPath();
            ctx.moveTo(sunX - sunRadius, y);
            ctx.lineTo(sunX + sunRadius, y);
            ctx.stroke();
        }
        ctx.restore();

        // Silueta de montañas lejanas
        ctx.fillStyle = '#140026';
        ctx.beginPath();
        ctx.moveTo(0, horizon);
        ctx.lineTo(60, horizon - 25);
        ctx.lineTo(140, horizon - 5);
        ctx.lineTo(240, horizon - 35);
        ctx.lineTo(340, horizon - 12);
        ctx.lineTo(420, horizon - 30);
        ctx.lineTo(480, horizon);
        ctx.closePath();
        ctx.fill();
    }

    drawTerrain() {
        const ctx = this.ctx;
        const horizon = 120;

        // Base oscura
        ctx.fillStyle = '#06000c';
        ctx.fillRect(0, horizon, this.WIDTH, this.HEIGHT - horizon);

        // Rejilla de perspectiva a los lados
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.15)';
        ctx.lineWidth = 1;

        // Líneas horizontales con perspectiva logarítmica
        for (let y = horizon; y < this.HEIGHT; y += (y - horizon + 12) * 0.18) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.WIDTH, y);
            ctx.stroke();
        }
    }

    drawRoad() {
        const ctx = this.ctx;
        const horizon = 120;

        // Curvatura aparente
        const roadTopWidth = 120;
        const roadTopX = this.WIDTH / 2 + this.curve;
        const roadBottomX = this.WIDTH / 2;

        // 1. Asfalto principal
        ctx.fillStyle = '#181822';
        ctx.beginPath();
        ctx.moveTo(roadTopX - roadTopWidth / 2, horizon);
        ctx.lineTo(roadTopX + roadTopWidth / 2, horizon);
        ctx.lineTo(roadBottomX + this.roadWidth / 2, this.HEIGHT);
        ctx.lineTo(roadBottomX - this.roadWidth / 2, this.HEIGHT);
        ctx.closePath();
        ctx.fill();

        // 2. Bordillos / Arcén a rayas rojas y blancas (Kerbs)
        const kerbWidthBottom = 16;
        const kerbWidthTop = 6;
        const stripeCount = 20;

        for (let i = 0; i < stripeCount; i++) {
            const p1 = (i / stripeCount + (this.roadScroll / 80) * (1 / stripeCount)) % 1;
            const p2 = ((i + 1) / stripeCount + (this.roadScroll / 80) * (1 / stripeCount)) % 1;

            const y1 = horizon + Math.pow(p1, 2) * (this.HEIGHT - horizon);
            const y2 = horizon + Math.pow(p2, 2) * (this.HEIGHT - horizon);

            const w1 = roadTopWidth + p1 * (this.roadWidth - roadTopWidth);
            const w2 = roadTopWidth + p2 * (this.roadWidth - roadTopWidth);
            const cx1 = roadTopX + p1 * (roadBottomX - roadTopX);
            const cx2 = roadTopX + p2 * (roadBottomX - roadTopX);

            const isRed = (i % 2 === 0);
            ctx.fillStyle = isRed ? '#ff0033' : '#ffffff';

            // Arcén Izquierdo
            ctx.beginPath();
            ctx.moveTo(cx1 - w1 / 2 - kerbWidthBottom * p1, y1);
            ctx.lineTo(cx1 - w1 / 2, y1);
            ctx.lineTo(cx2 - w2 / 2, y2);
            ctx.lineTo(cx2 - w2 / 2 - kerbWidthBottom * p2, y2);
            ctx.fill();

            // Arcén Derecho
            ctx.beginPath();
            ctx.moveTo(cx1 + w1 / 2, y1);
            ctx.lineTo(cx1 + w1 / 2 + kerbWidthBottom * p1, y1);
            ctx.lineTo(cx2 + w2 / 2 + kerbWidthBottom * p2, y2);
            ctx.lineTo(cx2 + w2 / 2, y2);
            ctx.fill();
        }

        // 3. Líneas divisorias de carriles (Rayas discontinuas amarillas/blancas)
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 3;
        ctx.setLineDash([25, 20]);
        ctx.lineDashOffset = -this.roadScroll * 2;

        for (let l = 1; l < this.lanes; l++) {
            const laneRatio = (l / this.lanes) - 0.5;
            ctx.beginPath();
            ctx.moveTo(roadTopX + laneRatio * roadTopWidth, horizon);
            ctx.lineTo(roadBottomX + laneRatio * this.roadWidth, this.HEIGHT);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    drawSkidmarks() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(10, 10, 10, 0.45)';
        this.skidmarks.forEach(sm => {
            ctx.fillRect(sm.x1 - 3, sm.y1, 6, 8);
            ctx.fillRect(sm.x2 - 3, sm.y2, 6, 8);
        });
    }

    drawItems() {
        const ctx = this.ctx;
        this.items.forEach(item => {
            if (item.y < 110) return;

            if (item.type === 'fuel') {
                // Bidón de gasolina rojo con indicador "GAS"
                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.fillStyle = '#ff2222';
                ctx.fillRect(-12, -14, 24, 28);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-8, -12, 16, 4);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('GAS', 0, 8);
                // Asa
                ctx.strokeStyle = '#990000';
                ctx.lineWidth = 2;
                ctx.strokeRect(-6, -18, 12, 4);
                ctx.restore();
            } else if (item.type === 'coin') {
                // Moneda dorada giratoria
                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#995c00';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('$', 0, 4);
                ctx.restore();
            } else if (item.type === 'oil') {
                // Mancha de aceite oscura y brillante
                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.fillStyle = 'rgba(15, 10, 25, 0.85)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 24, 14, 0.2, 0, Math.PI * 2);
                ctx.fill();
                // Brillo iridiscente
                ctx.strokeStyle = 'rgba(0, 255, 200, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    drawTraffic() {
        const ctx = this.ctx;
        this.traffic.forEach(car => {
            if (car.y < 90) return;
            ctx.save();
            ctx.translate(car.x, car.y);

            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-car.width / 2 + 2, car.height / 2 - 4, car.width - 4, 8);

            // Carrocería
            ctx.fillStyle = car.color;
            ctx.beginPath();
            ctx.roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 6);
            ctx.fill();

            // Techo / Cabina
            ctx.fillStyle = '#111827';
            ctx.fillRect(-car.width / 2 + 5, -car.height / 4, car.width - 10, car.height / 2);

            // Luna delantera y trasera
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(-car.width / 2 + 6, -car.height / 3, car.width - 12, 6); // Parabrisas
            ctx.fillRect(-car.width / 2 + 6, car.height / 5, car.width - 12, 5);  // Trasero

            // Luces traseras rojas
            ctx.fillStyle = (car.alertBlink > 0 && Math.floor(Date.now() / 100) % 2 === 0) ? '#ffcc00' : '#ff0033';
            ctx.fillRect(-car.width / 2 + 4, car.height / 2 - 4, 8, 4);
            ctx.fillRect(car.width / 2 - 12, car.height / 2 - 4, 8, 4);

            // Luces delanteras
            ctx.fillStyle = '#ffffcc';
            ctx.fillRect(-car.width / 2 + 4, -car.height / 2, 7, 3);
            ctx.fillRect(car.width / 2 - 11, -car.height / 2, 7, 3);

            ctx.restore();
        });
    }

    drawPlayer() {
        const ctx = this.ctx;
        const p = this.player;

        // Efecto parpadeo si es invulnerable tras choque
        if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer / 4) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // 1. Sombra bajo el bólido
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 10, p.width / 2 + 4, p.height / 2 - 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Chasis del Superdeportivo Rojo Retro (Estilo Testarossa 80s)
        ctx.fillStyle = '#e60000'; // Rojo ferrari
        ctx.beginPath();
        ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 8);
        ctx.fill();

        // Líneas aerodinámicas / branquias laterales
        ctx.strokeStyle = '#990000';
        ctx.lineWidth = 1.5;
        for (let i = -10; i <= 15; i += 7) {
            ctx.beginPath();
            ctx.moveTo(-p.width / 2 + 2, i);
            ctx.lineTo(-p.width / 2 + 7, i);
            ctx.moveTo(p.width / 2 - 7, i);
            ctx.lineTo(p.width / 2 - 2, i);
            ctx.stroke();
        }

        // 3. Alerón trasero prominente
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-p.width / 2 - 2, p.height / 2 - 10, p.width + 4, 6);

        // 4. Cabina / Parabrisas tintado negro brillante
        ctx.fillStyle = '#0a0a0f';
        ctx.beginPath();
        ctx.roundRect(-p.width / 2 + 6, -p.height / 4 - 4, p.width - 12, p.height / 2 - 4, 4);
        ctx.fill();

        // Reflejo cian en parabrisas
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-p.width / 2 + 10, -p.height / 4);
        ctx.lineTo(p.width / 2 - 14, -p.height / 4 + 8);
        ctx.stroke();

        // 5. Faros traseros de neón rojo
        ctx.fillStyle = p.isBraking ? '#ff3366' : '#ff0033';
        ctx.shadowColor = p.isBraking ? '#ff0033' : 'transparent';
        ctx.shadowBlur = p.isBraking ? 15 : 0;
        ctx.fillRect(-p.width / 2 + 4, p.height / 2 - 4, 10, 4);
        ctx.fillRect(p.width / 2 - 14, p.height / 2 - 4, 10, 4);
        ctx.shadowBlur = 0;

        // 6. Tubos de Escape y Llamaradas de Nitro / Aceleración
        if (p.isTurbo || p.speed > 160) {
            const flameLen = p.isTurbo ? 22 : 10;
            const flameColor = p.isTurbo ? '#00f7ff' : '#ff9900';
            ctx.fillStyle = flameColor;
            // Escape izquierdo
            ctx.beginPath();
            ctx.moveTo(-12, p.height / 2);
            ctx.lineTo(-8, p.height / 2);
            ctx.lineTo(-10, p.height / 2 + flameLen + Math.random() * 6);
            ctx.fill();
            // Escape derecho
            ctx.beginPath();
            ctx.moveTo(8, p.height / 2);
            ctx.lineTo(12, p.height / 2);
            ctx.lineTo(10, p.height / 2 + flameLen + Math.random() * 6);
            ctx.fill();
        }

        ctx.restore();
    }

    drawDecorations() {
        const ctx = this.ctx;
        this.roadsideDeco.forEach(deco => {
            if (deco.y < 115) return;
            const posX = (deco.side === -1)
                ? this.roadLeft - 45 - (deco.y / this.HEIGHT) * 20
                : this.roadRight + 45 + (deco.y / this.HEIGHT) * 20;

            if (deco.type === 'palm') {
                // Palmera Synthwave estilo Miami 80s
                ctx.save();
                ctx.translate(posX, deco.y);
                ctx.strokeStyle = '#3a0055';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(deco.side * 10, -25, deco.side * 5, -50);
                ctx.stroke();

                // Hojas de palmera neón
                ctx.fillStyle = '#00ff88';
                for (let a = -0.8; a <= 0.8; a += 0.4) {
                    ctx.beginPath();
                    ctx.ellipse(deco.side * 5 + Math.sin(a) * 15, -50 + Math.cos(a) * 8, 14, 5, a, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else {
                // Farola con luz de neón
                ctx.save();
                ctx.translate(posX, deco.y);
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -45);
                ctx.lineTo(deco.side * -12, -45);
                ctx.stroke();
                // Foco
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(deco.side * -12, -45, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }

    drawParticles() {
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
    }

    drawScanlines() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = 0; y < this.HEIGHT; y += 4) {
            ctx.fillRect(0, y, this.WIDTH, 2);
        }
    }

    renderMenuBackdrop() {
        this.render();
    }
}

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    window.racerGame = new TurboDriftGame();
});
