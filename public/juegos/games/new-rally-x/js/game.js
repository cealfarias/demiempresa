// ============================================================================
// NEW RALLY-X: JUEGO ARCADE COMPLETO (Namco 1981 Homage)
// Gráficos pixel-art en HTML5 Canvas, Radar en tiempo real, IA enemiga,
// Cortina de humo, Banderas Normales, Especial (S) y Afortunada (L).
// ============================================================================

const TILE_SIZE = 40;
const MAP_COLS = 36;
const MAP_ROWS = 36;

const DIR_UP = { x: 0, y: -1, angle: -Math.PI / 2, name: 'UP' };
const DIR_DOWN = { x: 0, y: 1, angle: Math.PI / 2, name: 'DOWN' };
const DIR_LEFT = { x: -1, y: 0, angle: Math.PI, name: 'LEFT' };
const DIR_RIGHT = { x: 1, y: 0, angle: 0, name: 'RIGHT' };

class NewRallyXGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.radarCanvas = document.getElementById('radar-canvas');
        this.radarCtx = this.radarCanvas.getContext('2d');

        this.audio = new RallyAudio();

        // Estado de juego
        this.state = 'PLAYING'; // PLAYING, READY, ROUND_CLEAR, DYING, GAMEOVER, PAUSED
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('rallyx_high_score') || '10000', 10);
        this.round = 1;
        this.lives = 3;
        this.fuel = 100;
        this.maxFuel = 100;
        this.fuelRate = 1.0;
        this.isDoublePoints = false;
        this.flagsRemaining = 10;
        this.totalFlagsInRound = 10;
        this.isChallengingStage = false;

        // Cámara de seguimiento
        this.camera = { x: 0, y: 0 };

        // Elementos del mundo
        this.maze = [];
        this.flags = [];
        this.rocks = [];
        this.smokes = [];
        this.particles = [];
        this.floatingTexts = [];
        this.enemySpawnPoints = [];

        // Jugador
        this.player = {
            x: 0,
            y: 0,
            dir: DIR_RIGHT,
            nextDir: DIR_RIGHT,
            speed: 170,
            angle: 0,
            targetAngle: 0,
            alive: true,
            dizzyTime: 0
        };

        // Enemigos
        this.enemies = [];

        // Temporizadores y controles
        this.lastTime = 0;
        this.readyTimer = 0;
        this.roundClearTimer = 0;
        this.dyingTimer = 0;
        this.lowFuelBeepTimer = 0;
        this.radarBlinkTimer = 0;
        this.smokeCooldown = 0;

        this.initDOM();
        this.resize();

        // Construir mundo inmediatamente para que haya contenido visible
        this.startRound(1, false);

        this.bindEvents();
        window.addEventListener('resize', () => this.resize());

        // Iniciar loop indestructible
        requestAnimationFrame((t) => this.loop(t));
    }

    initDOM() {
        this.elScore = document.getElementById('score-val');
        this.elHigh = document.getElementById('high-val');
        this.elRound = document.getElementById('round-val');
        this.elFuelBar = document.getElementById('fuel-bar-fill');
        this.elFuelText = document.getElementById('fuel-text');
        this.elLives = document.getElementById('lives-box');
        this.elFlagsLeft = document.getElementById('flags-left-val');
        this.elStageBanner = document.getElementById('stage-banner');
        this.elSpecialBanner = document.getElementById('special-banner');
        this.elModal = document.getElementById('modal-overlay');

        this.updateHUD();
    }

    bindEvents() {
        const triggerGameStart = () => {
            this.audio.init();
            if (this.elModal) this.elModal.style.display = 'none';
            if (this.state === 'GAMEOVER') {
                this.startNewGame();
            } else {
                if (!this.audio.isPlayingMusic) {
                    this.audio.startMusic(this.isChallengingStage);
                    this.audio.startEngine();
                }
            }
        };

        // Teclado
        window.addEventListener('keydown', (e) => {
            this.audio.init();

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            if (this.elModal && this.elModal.style.display !== 'none') {
                triggerGameStart();
                return;
            }

            if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.player.nextDir = DIR_UP;
            } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.player.nextDir = DIR_DOWN;
            } else if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.player.nextDir = DIR_LEFT;
            } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.player.nextDir = DIR_RIGHT;
            } else if (e.code === 'Space') {
                this.triggerSmoke();
            } else if (e.code === 'KeyP') {
                this.togglePause();
            } else if (e.code === 'KeyM') {
                this.toggleSound();
            } else if (e.code === 'KeyN') {
                this.toggleMusic();
            }
        });

        // Controles Táctiles (Mobile D-Pad y Botón de Humo)
        const bindTouchBtn = (id, dir) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handlePress = (e) => {
                e.preventDefault();
                this.audio.init();
                if (this.elModal && this.elModal.style.display !== 'none') {
                    triggerGameStart();
                }
                this.player.nextDir = dir;
            };
            btn.addEventListener('touchstart', handlePress, { passive: false });
            btn.addEventListener('mousedown', handlePress);
        };

        bindTouchBtn('btn-up', DIR_UP);
        bindTouchBtn('btn-down', DIR_DOWN);
        bindTouchBtn('btn-left', DIR_LEFT);
        bindTouchBtn('btn-right', DIR_RIGHT);

        const btnSmoke = document.getElementById('btn-smoke');
        if (btnSmoke) {
            const handleSmoke = (e) => {
                e.preventDefault();
                this.audio.init();
                if (this.elModal && this.elModal.style.display !== 'none') {
                    triggerGameStart();
                }
                this.triggerSmoke();
            };
            btnSmoke.addEventListener('touchstart', handleSmoke, { passive: false });
            btnSmoke.addEventListener('mousedown', handleSmoke);
        }

        // Clic en canvas o modal para empezar
        if (this.canvas) {
            this.canvas.addEventListener('click', () => {
                this.audio.init();
                if (this.elModal && this.elModal.style.display !== 'none') {
                    triggerGameStart();
                } else if (!this.audio.isPlayingMusic) {
                    this.audio.startMusic(this.isChallengingStage);
                    this.audio.startEngine();
                }
            });
        }

        const btnStartModal = document.getElementById('btn-start-modal');
        if (btnStartModal) {
            btnStartModal.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerGameStart();
            });
        }

        if (this.elModal) {
            this.elModal.addEventListener('click', () => {
                triggerGameStart();
            });
        }

        // Botones de Cabecera
        const btnAudio = document.getElementById('btn-sound');
        if (btnAudio) {
            btnAudio.addEventListener('click', () => {
                const on = this.audio.toggleSfx();
                btnAudio.textContent = on ? '🔊' : '🔇';
            });
        }

        const btnMusic = document.getElementById('btn-music');
        if (btnMusic) {
            btnMusic.addEventListener('click', () => {
                const on = this.audio.toggleMusic();
                btnMusic.textContent = on ? '🎵' : '🎼';
            });
        }

        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            btnPause.addEventListener('click', () => this.togglePause());
        }
    }

    resize() {
        const container = document.getElementById('canvas-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width > 50 ? Math.floor(rect.width) : 600;
            this.canvas.height = rect.height > 50 ? Math.floor(rect.height) : 600;
        }

        const radarBox = document.getElementById('radar-container');
        if (radarBox) {
            const rRect = radarBox.getBoundingClientRect();
            this.radarCanvas.width = rRect.width > 20 ? Math.floor(rRect.width) : 180;
            this.radarCanvas.height = rRect.height > 20 ? Math.floor(rRect.height) : 220;
        }
    }

    // ========================================================================
    // GENERACIÓN DEL LABERINTO CLÁSICO NEW RALLY-X
    // ========================================================================

    buildMaze() {
        this.maze = [];
        for (let r = 0; r < MAP_ROWS; r++) {
            this.maze[r] = [];
            for (let c = 0; c < MAP_COLS; c++) {
                if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
                    this.maze[r][c] = 1;
                } else if (r % 3 === 0 && c % 3 === 0) {
                    this.maze[r][c] = 1;
                } else {
                    this.maze[r][c] = 0;
                }
            }
        }

        // Bloques y curvas características de New Rally-X
        for (let r = 2; r < MAP_ROWS - 2; r += 3) {
            for (let c = 2; c < MAP_COLS - 2; c += 3) {
                this.maze[r][c] = 1;
                if ((r + c) % 4 === 0 && c + 1 < MAP_COLS - 2) {
                    this.maze[r][c + 1] = 1;
                }
                if ((r * 2 + c) % 5 === 0 && r + 1 < MAP_ROWS - 2) {
                    this.maze[r + 1][c] = 1;
                }
            }
        }

        // Limpiar área central de inicio
        const midR = Math.floor(MAP_ROWS / 2);
        const midC = Math.floor(MAP_COLS / 2);
        for (let r = midR - 2; r <= midR + 2; r++) {
            for (let c = midC - 2; c <= midC + 2; c++) {
                if (this.maze[r]) {
                    this.maze[r][c] = 0;
                }
            }
        }

        // Puntos de spawn para enemigos
        this.enemySpawnPoints = [
            { x: 3 * TILE_SIZE + TILE_SIZE / 2, y: 3 * TILE_SIZE + TILE_SIZE / 2 },
            { x: (MAP_COLS - 4) * TILE_SIZE + TILE_SIZE / 2, y: 3 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 3 * TILE_SIZE + TILE_SIZE / 2, y: (MAP_ROWS - 4) * TILE_SIZE + TILE_SIZE / 2 },
            { x: (MAP_COLS - 4) * TILE_SIZE + TILE_SIZE / 2, y: (MAP_ROWS - 4) * TILE_SIZE + TILE_SIZE / 2 }
        ];

        // Rocas de obstáculo
        this.rocks = [];
        const numRocks = 8 + Math.min(this.round * 2, 14);
        let placedRocks = 0;
        let attempts = 0;

        while (placedRocks < numRocks && attempts < 300) {
            attempts++;
            const cr = Math.floor(Math.random() * (MAP_ROWS - 4)) + 2;
            const cc = Math.floor(Math.random() * (MAP_COLS - 4)) + 2;

            if (Math.abs(cr - midR) < 3 && Math.abs(cc - midC) < 3) continue;

            if (this.maze[cr][cc] === 0) {
                this.rocks.push({
                    col: cc,
                    row: cr,
                    x: cc * TILE_SIZE + TILE_SIZE / 2,
                    y: cr * TILE_SIZE + TILE_SIZE / 2,
                    radius: TILE_SIZE * 0.35
                });
                placedRocks++;
            }
        }

        // 10 Banderas (1 Especial 'S', 1 Afortunada 'L', 8 Normales 'F')
        this.flags = [];
        this.totalFlagsInRound = 10;
        this.flagsRemaining = 10;

        const flagTypes = ['SPECIAL', 'LUCKY'];
        for (let i = 0; i < 8; i++) flagTypes.push('NORMAL');
        flagTypes.sort(() => Math.random() - 0.5);

        let placedFlags = 0;
        attempts = 0;
        while (placedFlags < 10 && attempts < 500) {
            attempts++;
            const cr = Math.floor(Math.random() * (MAP_ROWS - 4)) + 2;
            const cc = Math.floor(Math.random() * (MAP_COLS - 4)) + 2;

            if (Math.abs(cr - midR) < 2 && Math.abs(cc - midC) < 2) continue;

            if (this.maze[cr][cc] === 0 && !this.rocks.some(rk => rk.col === cc && rk.row === cr) && !this.flags.some(fl => fl.col === cc && fl.row === cr)) {
                this.flags.push({
                    col: cc,
                    row: cr,
                    x: cc * TILE_SIZE + TILE_SIZE / 2,
                    y: cr * TILE_SIZE + TILE_SIZE / 2,
                    type: flagTypes[placedFlags],
                    number: placedFlags + 1,
                    collected: false
                });
                placedFlags++;
            }
        }
    }

    // ========================================================================
    // FLUJO DE PARTIDA Y RONDAS
    // ========================================================================

    startNewGame() {
        this.score = 0;
        this.lives = 3;
        this.round = 1;
        this.startRound(this.round, true);

        if (this.elModal) this.elModal.style.display = 'none';
    }

    startRound(roundNumber, playFanfare = true) {
        this.round = roundNumber;
        this.isChallengingStage = (roundNumber % 3 === 0);
        this.isDoublePoints = false;
        this.fuel = this.maxFuel;
        this.smokes = [];
        this.particles = [];
        this.floatingTexts = [];

        this.buildMaze();

        // Posicionar jugador en el centro
        const midC = Math.floor(MAP_COLS / 2);
        const midR = Math.floor(MAP_ROWS / 2);
        this.player.x = midC * TILE_SIZE + TILE_SIZE / 2;
        this.player.y = midR * TILE_SIZE + TILE_SIZE / 2;
        this.player.dir = DIR_RIGHT;
        this.player.nextDir = DIR_RIGHT;
        this.player.angle = 0;
        this.player.alive = true;
        this.player.dizzyTime = 0;

        // Enemigos
        this.enemies = [];
        const numEnemies = this.isChallengingStage ? 2 : Math.min(1 + Math.floor((roundNumber - 1) * 0.8), 5);

        for (let i = 0; i < numEnemies; i++) {
            const spawn = this.enemySpawnPoints[i % this.enemySpawnPoints.length];
            this.enemies.push({
                x: spawn.x,
                y: spawn.y,
                dir: DIR_DOWN,
                nextDir: DIR_DOWN,
                angle: Math.PI / 2,
                speed: this.isChallengingStage ? 90 : (135 + Math.min(roundNumber * 4, 30)),
                state: 'CHASING',
                spinTimer: 0,
                respawnTimer: 0
            });
        }

        // Posicionar cámara inmediatamente en el jugador
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        if (playFanfare) {
            this.state = 'READY';
            this.readyTimer = 1.8;
            this.audio.stopMusic();
            this.audio.stopEngine();

            if (this.elStageBanner) {
                this.elStageBanner.textContent = this.isChallengingStage ? '★ CHALLENGING STAGE ★' : `ROUND ${this.round}`;
                this.elStageBanner.style.color = this.isChallengingStage ? '#ffd700' : '#00f7ff';
                this.elStageBanner.style.display = 'block';
            }

            this.audio.playRoundStart(() => {
                if (this.state === 'READY') {
                    this.state = 'PLAYING';
                    if (this.elStageBanner) this.elStageBanner.style.display = 'none';
                    this.audio.startMusic(this.isChallengingStage);
                    this.audio.startEngine();
                }
            });
        } else {
            this.state = 'PLAYING';
            if (this.elStageBanner) this.elStageBanner.style.display = 'none';
        }

        if (this.elSpecialBanner) {
            this.elSpecialBanner.style.display = 'none';
        }

        this.updateHUD();
    }

    // ========================================================================
    // MECÁNICA DE HUMO (SMOKE SCREEN)
    // ========================================================================

    triggerSmoke() {
        if (this.state !== 'PLAYING' || !this.player.alive) return;
        if (this.fuel <= 0 || this.smokeCooldown > 0) return;

        this.fuel = Math.max(0, this.fuel - 3.5);
        this.smokeCooldown = 0.22;

        const backX = this.player.x - this.player.dir.x * 24;
        const backY = this.player.y - this.player.dir.y * 24;

        this.smokes.push({
            x: backX,
            y: backY,
            radius: 12,
            maxRadius: 28,
            alpha: 0.9,
            life: 3.2
        });

        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: backX + (Math.random() - 0.5) * 10,
                y: backY + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                radius: Math.random() * 5 + 3,
                alpha: 0.8,
                life: 1.0,
                color: '#ffffff'
            });
        }

        this.audio.playSmoke();
        this.updateHUD();
    }

    // ========================================================================
    // FÍSICA Y ACTUALIZACIÓN
    // ========================================================================

    update(dt) {
        if (this.state === 'READY') {
            this.readyTimer -= dt;
            if (this.readyTimer <= 0) {
                this.state = 'PLAYING';
                if (this.elStageBanner) this.elStageBanner.style.display = 'none';
                this.audio.startMusic(this.isChallengingStage);
                this.audio.startEngine();
            }
            return;
        }

        if (this.state === 'ROUND_CLEAR') {
            this.roundClearTimer -= dt;
            if (this.roundClearTimer <= 0) {
                this.startRound(this.round + 1, true);
            }
            this.updateParticles(dt);
            return;
        }

        if (this.state === 'DYING') {
            this.dyingTimer -= dt;
            this.updateParticles(dt);
            if (this.dyingTimer <= 0) {
                if (this.lives > 0) {
                    this.startRound(this.round, true);
                } else {
                    this.gameOver();
                }
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        if (this.smokeCooldown > 0) this.smokeCooldown -= dt;

        // Combustible
        this.fuel -= this.fuelRate * dt;
        if (this.fuel <= 0) {
            this.fuel = 0;
            this.lowFuelBeepTimer += dt;
            if (this.lowFuelBeepTimer > 0.8) {
                this.audio.playLowFuel();
                this.lowFuelBeepTimer = 0;
            }
        } else if (this.fuel < 20) {
            this.lowFuelBeepTimer += dt;
            if (this.lowFuelBeepTimer > 1.2) {
                this.audio.playLowFuel();
                this.lowFuelBeepTimer = 0;
            }
        }

        this.updatePlayerMovement(dt);
        this.updateEnemiesMovement(dt);
        this.updateSmokes(dt);
        this.checkFlagPickups();
        this.checkCollisions();
        this.updateParticles(dt);
        this.updateFloatingTexts(dt);
        this.updateCamera();
        this.updateHUD();
    }

    updatePlayerMovement(dt) {
        if (!this.player.alive) return;

        const currentSpeed = (this.fuel > 0 ? this.player.speed : this.player.speed * 0.5);
        this.audio.updateEnginePitch(currentSpeed / this.player.speed);

        if (this.player.nextDir !== this.player.dir) {
            if (this.canTurn(this.player.x, this.player.y, this.player.nextDir)) {
                if (this.player.nextDir.x !== 0) {
                    const centerTileY = Math.floor(this.player.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
                    this.player.y += (centerTileY - this.player.y) * 0.5;
                } else {
                    const centerTileX = Math.floor(this.player.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
                    this.player.x += (centerTileX - this.player.x) * 0.5;
                }
                this.player.dir = this.player.nextDir;
            }
        }

        const nextX = this.player.x + this.player.dir.x * currentSpeed * dt;
        const nextY = this.player.y + this.player.dir.y * currentSpeed * dt;

        if (!this.isWallCollision(nextX, nextY, 13)) {
            this.player.x = nextX;
            this.player.y = nextY;
        }

        this.player.targetAngle = this.player.dir.angle;
        let diff = this.player.targetAngle - this.player.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.player.angle += diff * 0.3;
    }

    canTurn(x, y, newDir) {
        const testX = x + newDir.x * 20;
        const testY = y + newDir.y * 20;
        if (this.isWallCollision(testX, testY, 12)) return false;

        if (newDir.x !== 0) {
            const centerY = Math.floor(y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
            return Math.abs(y - centerY) < 16;
        } else {
            const centerX = Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
            return Math.abs(x - centerX) < 16;
        }
    }

    isWallCollision(x, y, radius) {
        if (!this.maze || !this.maze.length) return false;
        const offsets = [
            { x: -radius, y: -radius },
            { x: radius, y: -radius },
            { x: -radius, y: radius },
            { x: radius, y: radius }
        ];

        for (const off of offsets) {
            const col = Math.floor((x + off.x) / TILE_SIZE);
            const row = Math.floor((y + off.y) / TILE_SIZE);

            if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
            if (this.maze[row] && this.maze[row][col] === 1) return true;
        }
        return false;
    }

    updateEnemiesMovement(dt) {
        for (const enemy of this.enemies) {
            if (enemy.state === 'SPINNING') {
                enemy.spinTimer -= dt;
                enemy.angle += 14 * dt;
                if (enemy.spinTimer <= 0) enemy.state = 'CHASING';
                continue;
            }

            if (enemy.state === 'CRASHED') {
                enemy.respawnTimer -= dt;
                if (enemy.respawnTimer <= 0) {
                    const spawn = this.enemySpawnPoints[Math.floor(Math.random() * this.enemySpawnPoints.length)];
                    enemy.x = spawn.x;
                    enemy.y = spawn.y;
                    enemy.state = 'CHASING';
                    enemy.dir = DIR_DOWN;
                    enemy.angle = Math.PI / 2;
                }
                continue;
            }

            const tileC = Math.floor(enemy.x / TILE_SIZE);
            const tileR = Math.floor(enemy.y / TILE_SIZE);
            const centerTileX = tileC * TILE_SIZE + TILE_SIZE / 2;
            const centerTileY = tileR * TILE_SIZE + TILE_SIZE / 2;
            const distToCenter = Math.hypot(enemy.x - centerTileX, enemy.y - centerTileY);

            if (distToCenter < 6) {
                const oppositeDir = { x: -enemy.dir.x, y: -enemy.dir.y };
                const availableDirs = [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT].filter(d => {
                    const nextX = centerTileX + d.x * TILE_SIZE;
                    const nextY = centerTileY + d.y * TILE_SIZE;
                    return !this.isWallCollision(nextX, nextY, 12);
                });

                if (availableDirs.length > 0) {
                    const forwardDirs = availableDirs.filter(d => !(d.x === oppositeDir.x && d.y === oppositeDir.y));
                    const candidateDirs = forwardDirs.length > 0 ? forwardDirs : availableDirs;

                    let bestDir = candidateDirs[0];
                    let minDistance = Infinity;

                    for (const d of candidateDirs) {
                        const targetX = enemy.x + d.x * TILE_SIZE;
                        const targetY = enemy.y + d.y * TILE_SIZE;
                        const dist = Math.hypot(this.player.x - targetX, this.player.y - targetY);
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestDir = d;
                        }
                    }
                    enemy.dir = bestDir;
                }
            }

            const spd = (this.isChallengingStage ? enemy.speed * 0.6 : enemy.speed);
            enemy.x += enemy.dir.x * spd * dt;
            enemy.y += enemy.dir.y * spd * dt;
            enemy.angle = enemy.dir.angle;

            // Humo
            for (const smoke of this.smokes) {
                const distToSmoke = Math.hypot(enemy.x - smoke.x, enemy.y - smoke.y);
                if (distToSmoke < smoke.radius + 14) {
                    enemy.state = 'SPINNING';
                    enemy.spinTimer = 3.2;
                    this.audio.playSpinOut();
                    this.addFloatingText(enemy.x, enemy.y - 20, '¡SPIN!', '#ffdd00');
                    break;
                }
            }

            // Rocas
            for (const rock of this.rocks) {
                const distToRock = Math.hypot(enemy.x - rock.x, enemy.y - rock.y);
                if (distToRock < rock.radius + 12) {
                    enemy.state = 'CRASHED';
                    enemy.respawnTimer = 4.5;
                    this.createExplosion(enemy.x, enemy.y, '#ff0055');
                    this.audio.playCrash();
                    this.score += 500;
                    this.addFloatingText(enemy.x, enemy.y - 20, '+500 ROCA!', '#00ff88');
                    break;
                }
            }
        }
    }

    updateSmokes(dt) {
        for (let i = this.smokes.length - 1; i >= 0; i--) {
            const smoke = this.smokes[i];
            smoke.life -= dt;
            smoke.radius = Math.min(smoke.maxRadius, smoke.radius + 12 * dt);
            smoke.alpha = (smoke.life / 3.2) * 0.9;
            if (smoke.life <= 0) this.smokes.splice(i, 1);
        }
    }

    checkFlagPickups() {
        for (const flag of this.flags) {
            if (flag.collected) continue;

            const dist = Math.hypot(this.player.x - flag.x, this.player.y - flag.y);
            if (dist < 26) {
                flag.collected = true;
                this.flagsRemaining--;

                let basePoints = (11 - this.flagsRemaining) * 100;
                let awardedPoints = this.isDoublePoints ? basePoints * 2 : basePoints;

                if (flag.type === 'SPECIAL') {
                    this.isDoublePoints = true;
                    awardedPoints = basePoints * 2;
                    this.audio.playSpecialFlag();
                    this.addFloatingText(flag.x, flag.y - 25, '★ DOUBLE POINTS x2! ★', '#ffd700');
                    if (this.elSpecialBanner) this.elSpecialBanner.style.display = 'block';
                } else if (flag.type === 'LUCKY') {
                    const fuelBonus = Math.floor(this.fuel * 25);
                    awardedPoints += fuelBonus;
                    this.fuel = Math.min(this.maxFuel, this.fuel + 35);
                    this.audio.playLuckyFlag();
                    this.addFloatingText(flag.x, flag.y - 25, `LUCKY FUEL +${fuelBonus}!`, '#00f7ff');
                } else {
                    this.audio.playFlag();
                    this.addFloatingText(flag.x, flag.y - 20, `+${awardedPoints}`, '#ffffff');
                }

                this.score += awardedPoints;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('rallyx_high_score', this.highScore.toString());
                }

                for (let p = 0; p < 8; p++) {
                    this.particles.push({
                        x: flag.x,
                        y: flag.y,
                        vx: (Math.random() - 0.5) * 80,
                        vy: (Math.random() - 0.5) * 80,
                        radius: Math.random() * 4 + 2,
                        alpha: 1,
                        life: 0.6,
                        color: flag.type === 'SPECIAL' ? '#ffd700' : (flag.type === 'LUCKY' ? '#00f7ff' : '#ffff00')
                    });
                }

                if (this.flagsRemaining <= 0) {
                    this.roundClear();
                    break;
                }
            }
        }
    }

    checkCollisions() {
        if (!this.player.alive) return;

        for (const rock of this.rocks) {
            const dist = Math.hypot(this.player.x - rock.x, this.player.y - rock.y);
            if (dist < rock.radius + 12) {
                this.playerCrash('¡CHOQUE CONTRA ROCA!');
                return;
            }
        }

        for (const enemy of this.enemies) {
            if (enemy.state === 'SPINNING' || enemy.state === 'CRASHED') continue;
            const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            if (dist < 22) {
                this.playerCrash('¡ATRAPADO POR EL COCHE ROJO!');
                return;
            }
        }
    }

    playerCrash(reason) {
        this.player.alive = false;
        this.lives--;
        this.state = 'DYING';
        this.dyingTimer = 2.2;

        this.audio.stopMusic();
        this.audio.stopEngine();
        this.audio.playCrash();

        this.createExplosion(this.player.x, this.player.y, '#00f7ff');
        this.addFloatingText(this.player.x, this.player.y - 30, reason, '#ff0055');
        this.updateHUD();
    }

    roundClear() {
        this.state = 'ROUND_CLEAR';
        this.roundClearTimer = 3.2;

        const fuelBonus = Math.floor(this.fuel * 20);
        this.score += fuelBonus;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('rallyx_high_score', this.highScore.toString());
        }

        this.addFloatingText(this.player.x, this.player.y - 30, `¡ROUND CLEAR! FUEL BONUS +${fuelBonus}`, '#00ff88');
        this.audio.playRoundClear();
        this.updateHUD();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.audio.stopMusic();
        this.audio.stopEngine();

        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalScore = document.getElementById('modal-score');

        if (modal && modalTitle && modalScore) {
            modalTitle.textContent = '¡GAME OVER!';
            modalScore.innerHTML = `Puntuación Final: <strong style="color:#ffd700;">${this.score}</strong><br>Récord: <strong style="color:#00f7ff;">${this.highScore}</strong>`;
            modal.style.display = 'flex';
        }
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 130 + 30;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 5 + 3,
                alpha: 1,
                life: Math.random() * 0.7 + 0.4,
                color: (i % 2 === 0 ? color : '#ffd700')
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.alpha = Math.max(0, p.life);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({ x, y, text, color, alpha: 1, life: 1.6 });
    }

    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.y -= 25 * dt;
            ft.alpha = Math.max(0, ft.life / 1.6);
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    updateCamera() {
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;
        this.camera.x += (targetX - this.camera.x) * 0.22;
        this.camera.y += (targetY - this.camera.y) * 0.22;

        const maxCamX = MAP_COLS * TILE_SIZE - this.canvas.width;
        const maxCamY = MAP_ROWS * TILE_SIZE - this.canvas.height;
        this.camera.x = Math.max(0, Math.min(this.camera.x, Math.max(0, maxCamX)));
        this.camera.y = Math.max(0, Math.min(this.camera.y, Math.max(0, maxCamY)));
    }

    updateHUD() {
        if (this.elScore) this.elScore.textContent = this.score;
        if (this.elHigh) this.elHigh.textContent = this.highScore;
        if (this.elRound) this.elRound.textContent = this.round;
        if (this.elFlagsLeft) this.elFlagsLeft.textContent = `${10 - this.flagsRemaining}/10`;

        if (this.elFuelBar) {
            const pct = Math.max(0, Math.min(100, (this.fuel / this.maxFuel) * 100));
            this.elFuelBar.style.width = `${pct}%`;
            if (pct < 20) {
                this.elFuelBar.style.background = 'linear-gradient(90deg, #ff0055, #ff3300)';
            } else if (pct < 45) {
                this.elFuelBar.style.background = 'linear-gradient(90deg, #ffbb00, #ff8800)';
            } else {
                this.elFuelBar.style.background = 'linear-gradient(90deg, #00f7ff, #0088ff)';
            }
        }
        if (this.elFuelText) {
            this.elFuelText.textContent = `${Math.ceil(this.fuel)}%`;
        }

        if (this.elLives) {
            let cars = '';
            for (let i = 0; i < this.lives; i++) cars += '🏎️ ';
            this.elLives.textContent = cars || '💀';
        }
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.audio.stopMusic();
            this.audio.stopEngine();
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.audio.startMusic(this.isChallengingStage);
            this.audio.startEngine();
        }
    }

    toggleSound() {
        const on = this.audio.toggleSfx();
        const btn = document.getElementById('btn-sound');
        if (btn) btn.textContent = on ? '🔊' : '🔇';
    }

    toggleMusic() {
        const on = this.audio.toggleMusic();
        const btn = document.getElementById('btn-music');
        if (btn) btn.textContent = on ? '🎵' : '🎼';
    }

    // ========================================================================
    // RENDERIZADO DEL JUEGO
    // ========================================================================

    render() {
        const ctx = this.ctx;
        if (!ctx || this.canvas.width === 0 || this.canvas.height === 0) return;

        ctx.save();
        ctx.fillStyle = '#0f1322';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.translate(-this.camera.x, -this.camera.y);

        this.renderMaze(ctx);
        this.renderRocks(ctx);
        this.renderFlags(ctx);
        this.renderSmokes(ctx);

        for (const enemy of this.enemies) {
            if (enemy.state !== 'CRASHED') {
                this.renderCar(ctx, enemy.x, enemy.y, enemy.angle, '#ff0055', '#ff99aa', enemy.state === 'SPINNING');
            }
        }

        if (this.player.alive) {
            this.renderCar(ctx, this.player.x, this.player.y, this.player.angle, '#00f7ff', '#0066ff', false);
        }

        this.renderParticles(ctx);
        this.renderFloatingTexts(ctx);
        ctx.restore();

        this.renderRadar();

        if (this.state === 'PAUSED') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 32px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSA', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    renderMaze(ctx) {
        if (!this.maze || !this.maze.length) return;

        const startCol = Math.max(0, Math.floor(this.camera.x / TILE_SIZE));
        const endCol = Math.min(MAP_COLS - 1, Math.ceil((this.camera.x + this.canvas.width) / TILE_SIZE));
        const startRow = Math.max(0, Math.floor(this.camera.y / TILE_SIZE));
        const endRow = Math.min(MAP_ROWS - 1, Math.ceil((this.camera.y + this.canvas.height) / TILE_SIZE));

        for (let r = startRow; r <= endRow; r++) {
            if (!this.maze[r]) continue;
            for (let c = startCol; c <= endCol; c++) {
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (this.maze[r][c] === 1) {
                    ctx.fillStyle = '#0a1d40';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                    ctx.strokeStyle = '#0055aa';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

                    ctx.strokeStyle = '#00aaff';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
                } else {
                    ctx.fillStyle = '#141829';
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    renderRocks(ctx) {
        for (const rock of this.rocks) {
            ctx.save();
            ctx.translate(rock.x, rock.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(2, 3, rock.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#5a6578';
            ctx.beginPath();
            ctx.arc(0, 0, rock.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#8898aa';
            ctx.beginPath();
            ctx.arc(-rock.radius * 0.3, -rock.radius * 0.3, rock.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
    }

    renderFlags(ctx) {
        const time = Date.now() * 0.008;

        for (const flag of this.flags) {
            if (flag.collected) continue;

            ctx.save();
            ctx.translate(flag.x, flag.y);

            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-4, 12);
            ctx.lineTo(-4, -12);
            ctx.stroke();

            let flagColor = '#ffd700';
            let letter = 'F';

            if (flag.type === 'SPECIAL') {
                flagColor = '#ff0033';
                letter = 'S';
            } else if (flag.type === 'LUCKY') {
                flagColor = '#00f7ff';
                letter = 'L';
            }

            const wave = Math.sin(time + flag.number) * 3;

            ctx.fillStyle = flagColor;
            ctx.beginPath();
            ctx.moveTo(-4, -12);
            ctx.lineTo(14 + wave, -6);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#050714';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter, 2 + wave * 0.5, -6);

            ctx.restore();
        }
    }

    renderSmokes(ctx) {
        for (const smoke of this.smokes) {
            ctx.save();
            ctx.translate(smoke.x, smoke.y);
            ctx.fillStyle = `rgba(220, 230, 245, ${smoke.alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, smoke.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderCar(ctx, x, y, angle, primaryColor, secondaryColor, isSpinning) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (isSpinning) {
            const starAngle = Date.now() * 0.01;
            for (let s = 0; s < 3; s++) {
                const sx = Math.cos(starAngle + s * 2.1) * 20;
                const sy = Math.sin(starAngle + s * 2.1) * 20;
                ctx.fillStyle = '#ffd700';
                ctx.font = '12px monospace';
                ctx.fillText('⭐', sx, sy);
            }
        }

        const length = 28;
        const width = 16;

        ctx.fillStyle = '#111111';
        ctx.fillRect(length * 0.2, -width * 0.65, 8, 4);
        ctx.fillRect(length * 0.2, width * 0.45, 8, 4);
        ctx.fillRect(-length * 0.45, -width * 0.7, 9, 5);
        ctx.fillRect(-length * 0.45, width * 0.4, 9, 5);

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(length * 0.5, 0);
        ctx.lineTo(length * 0.2, -width * 0.4);
        ctx.lineTo(-length * 0.4, -width * 0.4);
        ctx.lineTo(-length * 0.45, 0);
        ctx.lineTo(-length * 0.4, width * 0.4);
        ctx.lineTo(length * 0.2, width * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = secondaryColor;
        ctx.fillRect(-length * 0.5, -width * 0.55, 4, width * 1.1);

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(-2, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111';
        ctx.fillRect(0, -2, 2, 4);
        ctx.restore();
    }

    renderParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    renderFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // ========================================================================
    // RADAR / MINI-MAPA AUTÉNTICO
    // ========================================================================

    renderRadar() {
        if (!this.radarCanvas || !this.radarCtx || !this.maze || !this.maze.length) return;
        const rctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        if (w <= 0 || h <= 0) return;

        rctx.clearRect(0, 0, w, h);
        rctx.fillStyle = '#060a14';
        rctx.fillRect(0, 0, w, h);

        rctx.strokeStyle = '#0055aa';
        rctx.lineWidth = 2;
        rctx.strokeRect(1, 1, w - 2, h - 2);

        const mapW = MAP_COLS * TILE_SIZE;
        const mapH = MAP_ROWS * TILE_SIZE;
        const scaleX = (w - 12) / mapW;
        const scaleY = (h - 12) / mapH;

        rctx.save();
        rctx.translate(6, 6);

        rctx.fillStyle = '#0f2444';
        for (let r = 0; r < MAP_ROWS; r++) {
            if (!this.maze[r]) continue;
            for (let c = 0; c < MAP_COLS; c++) {
                if (this.maze[r][c] === 1) {
                    rctx.fillRect(
                        c * TILE_SIZE * scaleX,
                        r * TILE_SIZE * scaleY,
                        TILE_SIZE * scaleX,
                        TILE_SIZE * scaleY
                    );
                }
            }
        }

        this.radarBlinkTimer += 0.08;
        const blink = Math.sin(this.radarBlinkTimer * 8) > 0;

        for (const flag of this.flags) {
            if (flag.collected) continue;
            const fx = flag.x * scaleX;
            const fy = flag.y * scaleY;
            if (flag.type === 'SPECIAL') {
                rctx.fillStyle = blink ? '#ff0033' : '#ffd700';
            } else if (flag.type === 'LUCKY') {
                rctx.fillStyle = blink ? '#00f7ff' : '#00ff88';
            } else {
                rctx.fillStyle = '#ffff00';
            }
            rctx.beginPath();
            rctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
            rctx.fill();
        }

        for (const enemy of this.enemies) {
            if (enemy.state !== 'CRASHED') {
                const ex = enemy.x * scaleX;
                const ey = enemy.y * scaleY;
                rctx.fillStyle = (enemy.state === 'SPINNING') ? '#ff88aa' : '#ff0044';
                rctx.beginPath();
                rctx.arc(ex, ey, 3.4, 0, Math.PI * 2);
                rctx.fill();
            }
        }

        if (this.player.alive) {
            const px = this.player.x * scaleX;
            const py = this.player.y * scaleY;
            rctx.fillStyle = blink ? '#ffffff' : '#00f7ff';
            rctx.fillRect(px - 3, py - 3, 6, 6);
        }

        rctx.restore();
    }

    // ========================================================================
    // BUCLE PRINCIPAL DE JUEGO
    // ========================================================================

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));

        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        try {
            this.update(dt);
            this.render();
        } catch (e) {
            console.error("Game loop tick error:", e);
        }
    }
}

// Inicializar al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
    window.game = new NewRallyXGame();
});
