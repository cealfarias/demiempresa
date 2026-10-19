// ============================================================================
// CHOMP NEO: ARCADE CLÁSICO (Homenaje a Pac-Man 1980)
// Laberinto clásico de neón, IA de 4 espectros con personalidades únicas,
// Píldoras de poder, modo asustado, túneles de teletransporte y Waka-Waka.
// ============================================================================

const COLS = 28;
const ROWS = 31;
const TILE = 16; // 28 * 16 = 448 ancho, 31 * 16 = 496 alto

const DIR_NONE = { x: 0, y: 0, name: 'NONE' };
const DIR_UP = { x: 0, y: -1, name: 'UP', angle: -Math.PI / 2 };
const DIR_DOWN = { x: 0, y: 1, name: 'DOWN', angle: Math.PI / 2 };
const DIR_LEFT = { x: -1, y: 0, name: 'LEFT', angle: Math.PI };
const DIR_RIGHT = { x: 1, y: 0, name: 'RIGHT', angle: 0 };

// Mapa del Laberinto Clásico Arcade (28 columnas x 31 filas)
// Conexión central 100% abierta para salida fluida de los espectros
const MAZE_MAP = [
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWW", // 0
    "W............WW............W", // 1
    "W.WWWW.WWWWW.WW.WWWWW.WWWW.W", // 2
    "WOWWWW.WWWWW.WW.WWWWW.WWWWOW", // 3
    "W.WWWW.WWWWW.WW.WWWWW.WWWW.W", // 4
    "W..........................W", // 5
    "W.WWWW.WW.WWWWWWWW.WW.WWWW.W", // 6
    "W.WWWW.WW.WWWWWWWW.WW.WWWW.W", // 7
    "W......WW..........WW......W", // 8 -> Pasillo central completamente abierto!
    "WWWWWW.WWWWW    WWWWW.WWWWWW", // 9 -> Salida central abierta
    "     W.WWWWW    WWWWW.W     ", // 10
    "     W.WW          WW.W     ", // 11
    "     W.WW WWWDDWWW WW.W     ", // 12 -> Puerta de la casa DD
    "WWWWWW.WW WGGGGGGW WW.WWWWWW", // 13 -> Interior de la casa de espectros
    "T     .   WGGGGGGW   .     T", // 14 -> Túneles laterales
    "WWWWWW.WW WGGGGGGW WW.WWWWWW", // 15
    "     W.WW WWWWWWWW WW.W     ", // 16
    "     W.WW          WW.W     ", // 17
    "     W.WW WWWWWWWW WW.W     ", // 18
    "WWWWWW.WW WWWWWWWW WW.WWWWWW", // 19
    "W............WW............W", // 20
    "W.WWWW.WWWWW.WW.WWWWW.WWWW.W", // 21
    "W.WWWW.WWWWW.WW.WWWWW.WWWW.W", // 22
    "WO..WW................WW..OW", // 23
    "WWW.WW.WW.WWWWWWWW.WW.WW.WWW", // 24
    "WWW.WW.WW.WWWWWWWW.WW.WW.WWW", // 25
    "W......WW....WW....WW......W", // 26
    "W.WWWWWWWWWW.WW.WWWWWWWWWW.W", // 27
    "W.WWWWWWWWWW.WW.WWWWWWWWWW.W", // 28
    "W..........................W", // 29
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWW"  // 30
];

class ChompNeoGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.audio = new ChompAudio();

        this.gameWidth = COLS * TILE;
        this.gameHeight = ROWS * TILE;

        this.state = 'PLAYING';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('chomp_high_score') || '10000', 10);
        this.level = 1;
        this.lives = 3;
        this.totalPellets = 0;
        this.pelletsRemaining = 0;

        // Bonificación de Fruta
        this.fruit = {
            active: false,
            x: 13.5 * TILE,
            y: 17 * TILE,
            timer: 0,
            type: 'CHERRY',
            points: 100,
            symbol: '🍒'
        };

        this.ghostMultiplier = 1;
        this.frightenedTimer = 0;
        this.frightenedDuration = 8.0;

        // Chomp Neo
        this.player = {
            x: 13.5 * TILE,
            y: 23 * TILE,
            dir: DIR_LEFT,
            nextDir: DIR_LEFT,
            speed: 98,
            mouthAngle: 0,
            mouthSpeed: 14,
            mouthMax: 0.28,
            mouthDir: 1,
            alive: true
        };

        // Los 4 Espectros
        this.ghosts = [];
        this.initGhosts();

        // Grilla del laberinto
        this.grid = [];
        this.initGrid();

        this.lastTime = 0;
        this.readyTimer = 0;
        this.dyingTimer = 0;
        this.clearTimer = 0;
        this.floatingTexts = [];

        this.initDOM();
        this.bindEvents();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Iniciar loop protegido
        requestAnimationFrame((t) => this.loop(t));
    }

    initDOM() {
        this.elScore = document.getElementById('score-val');
        this.elHigh = document.getElementById('high-val');
        this.elLevel = document.getElementById('level-val');
        this.elLives = document.getElementById('lives-box');
        this.elModal = document.getElementById('modal-overlay');
        this.elReadyBanner = document.getElementById('ready-banner');

        this.updateHUD();
    }

    initGrid() {
        this.grid = [];
        this.totalPellets = 0;

        for (let r = 0; r < ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < COLS; c++) {
                const char = MAZE_MAP[r][c] || ' ';
                this.grid[r][c] = char;
                if (char === '.' || char === 'O') {
                    this.totalPellets++;
                }
            }
        }
        this.pelletsRemaining = this.totalPellets;
    }

    initGhosts() {
        // Velocidad escalada según el nivel actual (+3.5% por nivel hasta +45%)
        const speedMultiplier = 1 + Math.min((this.level - 1) * 0.035, 0.45);

        this.ghosts = [
            {
                id: 'volt',
                name: 'Volt',
                color: '#ff0033',
                homeCorner: { c: 25, r: 1 },
                x: 13.5 * TILE,
                y: 8 * TILE, // Empieza directamente en el pasillo superior
                dir: DIR_LEFT,
                speed: 84 * speedMultiplier,
                state: 'CHASING', // CHASING, FRIGHTENED, RETURNING_EYES, PEN, EXITING
                lastTileC: 13,
                lastTileR: 8,
                penTimer: 0
            },
            {
                id: 'pulse',
                name: 'Pulse',
                color: '#ff66cc',
                homeCorner: { c: 2, r: 1 },
                x: 13.5 * TILE,
                y: 14 * TILE,
                dir: DIR_UP,
                speed: 80 * speedMultiplier,
                state: 'PEN',
                lastTileC: 13,
                lastTileR: 14,
                penTimer: Math.max(0.6, 1.2 - (this.level - 1) * 0.1)
            },
            {
                id: 'glitch',
                name: 'Glitch',
                color: '#00f7ff',
                homeCorner: { c: 26, r: 29 },
                x: 11.5 * TILE,
                y: 14 * TILE,
                dir: DIR_UP,
                speed: 78 * speedMultiplier,
                state: 'PEN',
                lastTileC: 11,
                lastTileR: 14,
                penTimer: Math.max(1.5, 3.5 - (this.level - 1) * 0.2)
            },
            {
                id: 'spark',
                name: 'Spark',
                color: '#ff9900',
                homeCorner: { c: 1, r: 29 },
                x: 15.5 * TILE,
                y: 14 * TILE,
                dir: DIR_UP,
                speed: 76 * speedMultiplier,
                state: 'PEN',
                lastTileC: 15,
                lastTileR: 14,
                penTimer: Math.max(2.5, 6.0 - (this.level - 1) * 0.3)
            }
        ];
    }

    bindEvents() {
        const startGame = () => {
            this.audio.init();
            if (this.elModal) this.elModal.style.display = 'none';

            if (this.state === 'GAMEOVER') {
                this.startNewGame();
            } else {
                if (!this.audio.isPlayingMusic) {
                    this.audio.startMusic(this.frightenedTimer > 0);
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
                startGame();
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
                this.togglePause();
            } else if (e.code === 'KeyM') {
                this.toggleSound();
            } else if (e.code === 'KeyN') {
                this.toggleMusic();
            }
        });

        // Controles Táctiles (Mobile D-Pad)
        const bindTouch = (id, dir) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handler = (e) => {
                e.preventDefault();
                this.audio.init();
                if (this.elModal && this.elModal.style.display !== 'none') {
                    startGame();
                }
                this.player.nextDir = dir;
            };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('mousedown', handler);
        };

        bindTouch('btn-up', DIR_UP);
        bindTouch('btn-down', DIR_DOWN);
        bindTouch('btn-left', DIR_LEFT);
        bindTouch('btn-right', DIR_RIGHT);

        // Gestos de Deslizamiento (Swipe)
        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            this.audio.init();
            if (this.elModal && this.elModal.style.display !== 'none') {
                startGame();
            }
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            const dist = Math.hypot(dx, dy);

            if (dist > 20) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.player.nextDir = (dx > 0) ? DIR_RIGHT : DIR_LEFT;
                } else {
                    this.player.nextDir = (dy > 0) ? DIR_DOWN : DIR_UP;
                }
            }
        }, { passive: true });

        if (this.canvas) {
            this.canvas.addEventListener('click', () => {
                this.audio.init();
                if (this.elModal && this.elModal.style.display !== 'none') {
                    startGame();
                } else if (!this.audio.isPlayingMusic) {
                    this.audio.startMusic(this.frightenedTimer > 0);
                }
            });
        }

        const btnStart = document.getElementById('btn-start-modal');
        if (btnStart) {
            btnStart.addEventListener('click', (e) => {
                e.stopPropagation();
                startGame();
            });
        }

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
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const availableW = rect.width > 20 ? rect.width : 448;
        const availableH = rect.height > 20 ? rect.height : 496;

        const scale = Math.min(availableW / this.gameWidth, availableH / this.gameHeight);
        this.canvas.width = Math.floor(this.gameWidth * scale);
        this.canvas.height = Math.floor(this.gameHeight * scale);
        this.scale = scale;
    }

    startNewGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.initGrid();
        this.resetPositions();

        this.state = 'PLAYING';
        if (this.elReadyBanner) this.elReadyBanner.style.display = 'none';

        this.updateHUD();
        this.audio.startMusic(false);
    }

    resetPositions() {
        this.player.x = 13.5 * TILE;
        this.player.y = 23 * TILE;
        this.player.dir = DIR_LEFT;
        this.player.nextDir = DIR_LEFT;
        this.player.alive = true;
        this.player.mouthAngle = 0;

        this.ghostMultiplier = 1;
        this.frightenedTimer = 0;
        this.initGhosts();
    }

    // ========================================================================
    // BUCLE DE ACTUALIZACIÓN
    // ========================================================================

    update(dt) {
        if (this.state === 'READY') {
            this.readyTimer -= dt;
            if (this.readyTimer <= 0) {
                this.state = 'PLAYING';
                if (this.elReadyBanner) this.elReadyBanner.style.display = 'none';
                this.audio.startMusic(false);
            }
            return;
        }

        if (this.state === 'LEVEL_CLEAR') {
            this.clearTimer -= dt;
            if (this.clearTimer <= 0) {
                this.level++;
                this.initGrid();
                this.resetPositions();
                this.state = 'PLAYING';
                this.audio.startMusic(false);
                this.updateHUD();
            }
            return;
        }

        if (this.state === 'DYING') {
            this.dyingTimer -= dt;
            if (this.dyingTimer <= 0) {
                if (this.lives > 0) {
                    this.resetPositions();
                    this.state = 'PLAYING';
                    this.audio.startMusic(false);
                } else {
                    this.gameOver();
                }
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        // Temporizador de modo asustado
        if (this.frightenedTimer > 0) {
            this.frightenedTimer -= dt;
            if (this.frightenedTimer <= 0) {
                this.audio.startMusic(false);
                for (const g of this.ghosts) {
                    if (g.state === 'FRIGHTENED') {
                        g.state = 'CHASING';
                    }
                }
            }
        }

        // Temporizador de fruta
        if (this.fruit.active) {
            this.fruit.timer -= dt;
            if (this.fruit.timer <= 0) {
                this.fruit.active = false;
            }
        }

        this.updatePlayer(dt);
        this.updateGhosts(dt);
        this.checkCollisions();
        this.updateFloatingTexts(dt);
        this.updateHUD();
    }

    updatePlayer(dt) {
        if (!this.player.alive) return;

        // Animación de la boca
        this.player.mouthAngle += this.player.mouthSpeed * this.player.mouthDir * dt;
        if (this.player.mouthAngle > this.player.mouthMax) {
            this.player.mouthAngle = this.player.mouthMax;
            this.player.mouthDir = -1;
        } else if (this.player.mouthAngle < 0.01) {
            this.player.mouthAngle = 0.01;
            this.player.mouthDir = 1;
        }

        // Giro suave con corner buffering
        if (this.player.nextDir !== this.player.dir) {
            if (this.canMoveInDir(this.player.x, this.player.y, this.player.nextDir)) {
                if (this.player.nextDir.x !== 0) {
                    this.player.y = Math.round(this.player.y / TILE) * TILE;
                } else {
                    this.player.x = Math.round(this.player.x / TILE) * TILE;
                }
                this.player.dir = this.player.nextDir;
            }
        }

        // Avance
        if (this.canMoveInDir(this.player.x, this.player.y, this.player.dir)) {
            const spd = this.player.speed * (this.frightenedTimer > 0 ? 1.05 : 1.0);
            this.player.x += this.player.dir.x * spd * dt;
            this.player.y += this.player.dir.y * spd * dt;
        } else {
            if (this.player.dir.x !== 0) {
                this.player.x = Math.round(this.player.x / TILE) * TILE;
            } else if (this.player.dir.y !== 0) {
                this.player.y = Math.round(this.player.y / TILE) * TILE;
            }
        }

        // Túnel de teletransporte
        if (this.player.x < -TILE / 2) {
            this.player.x = this.gameWidth - TILE / 2;
        } else if (this.player.x > this.gameWidth - TILE / 2) {
            this.player.x = -TILE / 2;
        }

        // Casilla actual
        const curC = Math.floor((this.player.x + TILE / 2) / TILE);
        const curR = Math.floor((this.player.y + TILE / 2) / TILE);

        // Recoger puntos
        if (curR >= 0 && curR < ROWS && curC >= 0 && curC < COLS) {
            const cell = this.grid[curR][curC];

            if (cell === '.') {
                this.grid[curR][curC] = ' ';
                this.score += 10;
                this.pelletsRemaining--;
                this.audio.playWaka();
                this.checkFruitSpawn();
                this.checkPelletVictory();
            } else if (cell === 'O') {
                this.grid[curR][curC] = ' ';
                this.score += 50;
                this.pelletsRemaining--;
                this.triggerPowerPellet();
                this.audio.playPowerPellet();
                this.checkFruitSpawn();
                this.checkPelletVictory();
            }
        }

        // Comer Fruta
        if (this.fruit.active) {
            const distFruit = Math.hypot(this.player.x - this.fruit.x, this.player.y - this.fruit.y);
            if (distFruit < TILE * 0.9) {
                this.fruit.active = false;
                this.score += this.fruit.points;
                this.audio.playEatFruit();
                this.addFloatingText(this.fruit.x, this.fruit.y - 12, `+${this.fruit.points}`, '#ffd700');
            }
        }
    }

    canMoveInDir(x, y, dir) {
        if (dir === DIR_NONE) return true;

        const checkDist = 6;
        const targetX = x + dir.x * checkDist;
        const targetY = y + dir.y * checkDist;

        const margin = 3;
        const corners = [
            { c: Math.floor((targetX + margin) / TILE), r: Math.floor((targetY + margin) / TILE) },
            { c: Math.floor((targetX + TILE - 1 - margin) / TILE), r: Math.floor((targetY + margin) / TILE) },
            { c: Math.floor((targetX + margin) / TILE), r: Math.floor((targetY + TILE - 1 - margin) / TILE) },
            { c: Math.floor((targetX + TILE - 1 - margin) / TILE), r: Math.floor((targetY + TILE - 1 - margin) / TILE) }
        ];

        for (const pt of corners) {
            if (pt.r < 0 || pt.r >= ROWS) continue;
            if (pt.c < 0 || pt.c >= COLS) return true; // Túnel

            const cell = this.grid[pt.r][pt.c];
            if (cell === 'W' || cell === 'D') return false;
        }

        return true;
    }

    // ========================================================================
    // IA DE ESPECTROS (Navegación Fluida sin Atascos)
    // ========================================================================

    updateGhosts(dt) {
        for (const g of this.ghosts) {
            // 1. En la casa esperando turno (PEN)
            if (g.state === 'PEN') {
                g.penTimer -= dt;
                // Pequeño rebote dentro de la casa
                g.y += (g.dir === DIR_UP ? -25 : 25) * dt;
                if (g.y < 13.5 * TILE) g.dir = DIR_DOWN;
                if (g.y > 14.5 * TILE) g.dir = DIR_UP;

                if (g.penTimer <= 0) {
                    g.state = 'EXITING';
                    g.x = 13.5 * TILE; // Centrado exacto frente a la puerta
                    g.dir = DIR_UP;
                }
                continue;
            }

            // 2. Saliendo de la casa hacia el pasillo superior
            if (g.state === 'EXITING') {
                g.x = 13.5 * TILE;
                g.y -= 50 * dt; // Ascenso vertical directo

                // Al llegar a la fila 8 (pasillo horizontal abierto)
                if (g.y <= 8 * TILE) {
                    g.y = 8 * TILE;
                    g.state = (this.frightenedTimer > 0 ? 'FRIGHTENED' : 'CHASING');
                    g.dir = (Math.random() < 0.5 ? DIR_LEFT : DIR_RIGHT);
                    g.lastTileC = 13;
                    g.lastTileR = 8;
                }
                continue;
            }

            // 3. Ojos regresando a la casa tras ser devorados
            if (g.state === 'RETURNING_EYES') {
                const distHome = Math.hypot(g.x - 13.5 * TILE, g.y - 12 * TILE);
                if (distHome < 8) {
                    g.state = 'EXITING'; // Vuelve a salir listo para cazar
                    g.dir = DIR_UP;
                }
            }

            // 4. Navegación en el Laberinto
            const curC = Math.floor((g.x + TILE / 2) / TILE);
            const curR = Math.floor((g.y + TILE / 2) / TILE);

            // Toma de decisión exacta al entrar a una nueva casilla
            if (curC !== g.lastTileC || curR !== g.lastTileR) {
                g.lastTileC = curC;
                g.lastTileR = curR;

                // Alinear al centro del carril en el eje perpendicular
                if (g.dir.x !== 0) {
                    g.y = curR * TILE;
                } else if (g.dir.y !== 0) {
                    g.x = curC * TILE;
                }

                // Obtener opciones de giro válidas
                const allowDoor = (g.state === 'RETURNING_EYES');
                const validDirs = this.getValidDirections(curC, curR, g.dir, allowDoor);

                if (validDirs.length > 0) {
                    if (g.state === 'FRIGHTENED') {
                        // Huida impredecible
                        g.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
                    } else {
                        // Persecución táctica según personalidad
                        const target = this.getGhostTarget(g);
                        let bestDir = validDirs[0];
                        let minDist = Infinity;

                        for (const d of validDirs) {
                            const nextC = curC + d.x;
                            const nextR = curR + d.y;
                            const dist = Math.hypot(nextC - target.c, nextR - target.r);
                            if (dist < minDist) {
                                minDist = dist;
                                bestDir = d;
                            }
                        }
                        g.dir = bestDir;
                    }
                }
            }

            // Movimiento suave continuo
            let currentSpd = g.speed;
            if (g.state === 'FRIGHTENED') currentSpd = g.speed * 0.55;
            if (g.state === 'RETURNING_EYES') currentSpd = g.speed * 2.2;

            g.x += g.dir.x * currentSpd * dt;
            g.y += g.dir.y * currentSpd * dt;

            // Túneles de teletransporte
            if (g.x < -TILE / 2) {
                g.x = this.gameWidth - TILE / 2;
                g.lastTileC = COLS - 1;
            } else if (g.x > this.gameWidth - TILE / 2) {
                g.x = -TILE / 2;
                g.lastTileC = 0;
            }
        }
    }

    getValidDirections(tileC, tileR, currentDir, allowDoor) {
        const opposite = { x: -currentDir.x, y: -currentDir.y };
        const allDirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
        const valid = [];

        for (const d of allDirs) {
            // No permitir dar vuelta en U hacia atrás en intersecciones
            if (d.x === opposite.x && d.y === opposite.y) continue;

            const nc = tileC + d.x;
            const nr = tileR + d.y;

            if (nr < 0 || nr >= ROWS) continue;
            // Túneles
            if (nc < 0 || nc >= COLS) {
                valid.push(d);
                continue;
            }

            const cell = this.grid[nr][nc];
            if (cell === 'W') continue;
            if (cell === 'D' && !allowDoor) continue;

            valid.push(d);
        }

        // Si es un callejón sin salida, permitir marcha atrás
        if (valid.length === 0) {
            const nc = tileC + opposite.x;
            const nr = tileR + opposite.y;
            if (nr >= 0 && nr < ROWS) {
                if (nc < 0 || nc >= COLS || (this.grid[nr][nc] !== 'W' && (this.grid[nr][nc] !== 'D' || allowDoor))) {
                    valid.push(opposite);
                }
            }
        }

        return valid;
    }

    getGhostTarget(g) {
        const pC = Math.floor((this.player.x + TILE / 2) / TILE);
        const pR = Math.floor((this.player.y + TILE / 2) / TILE);

        if (g.state === 'RETURNING_EYES') {
            return { c: 13, r: 12 }; // Puerta de la casa
        }

        switch (g.id) {
            case 'volt': // 🔴 Rojo: Persecución implacable al jugador
                return { c: pC, r: pR };

            case 'pulse': // 🌸 Rosa: 4 casillas por delante
                return {
                    c: pC + this.player.dir.x * 4,
                    r: pR + this.player.dir.y * 4
                };

            case 'glitch': // 🔷 Cian: Flanqueador coordinado
                const volt = this.ghosts.find(gh => gh.id === 'volt') || { x: pC * TILE, y: pR * TILE };
                const vC = Math.floor((volt.x + TILE / 2) / TILE);
                const vR = Math.floor((volt.y + TILE / 2) / TILE);
                const aheadC = pC + this.player.dir.x * 2;
                const aheadR = pR + this.player.dir.y * 2;
                return {
                    c: aheadC + (aheadC - vC),
                    r: aheadR + (aheadR - vR)
                };

            case 'spark': // 🟠 Naranja: Cercanía cobarde
                const distToPlayer = Math.hypot(
                    Math.floor(g.x / TILE) - pC,
                    Math.floor(g.y / TILE) - pR
                );
                if (distToPlayer > 8) {
                    return { c: pC, r: pR };
                } else {
                    return g.homeCorner;
                }

            default:
                return { c: pC, r: pR };
        }
    }

    triggerPowerPellet() {
        // Duración del modo asustado decreciente según nivel arcade
        if (this.level === 1) this.frightenedDuration = 8.0;
        else if (this.level === 2) this.frightenedDuration = 7.0;
        else if (this.level === 3) this.frightenedDuration = 6.0;
        else if (this.level === 4) this.frightenedDuration = 5.0;
        else if (this.level <= 6) this.frightenedDuration = 4.0;
        else if (this.level <= 9) this.frightenedDuration = 3.0;
        else if (this.level <= 14) this.frightenedDuration = 2.0;
        else if (this.level <= 18) this.frightenedDuration = 1.2;
        else this.frightenedDuration = 0.6; // Nivel 19+: Modo experto

        this.frightenedTimer = this.frightenedDuration;
        this.ghostMultiplier = 1;
        this.audio.startMusic(true); // Música acelerada de fantasmas azules

        for (const g of this.ghosts) {
            if (g.state === 'CHASING') {
                g.state = 'FRIGHTENED';
                // Invertir dirección para huir
                g.dir = { x: -g.dir.x, y: -g.dir.y, name: 'OPPOSITE' };
            }
        }
    }

    checkCollisions() {
        if (!this.player.alive) return;

        for (const g of this.ghosts) {
            if (g.state === 'PEN' || g.state === 'EXITING') continue;

            const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);
            if (dist < TILE * 0.75) {
                if (g.state === 'FRIGHTENED') {
                    g.state = 'RETURNING_EYES';
                    const points = 200 * this.ghostMultiplier;
                    this.score += points;
                    this.ghostMultiplier *= 2;
                    this.audio.playEatGhost();
                    this.addFloatingText(g.x, g.y - 10, `+${points}`, '#00f7ff');
                } else if (g.state === 'CHASING') {
                    this.playerDeath();
                    break;
                }
            }
        }
    }

    playerDeath() {
        this.player.alive = false;
        this.lives--;
        this.state = 'DYING';
        this.dyingTimer = 1.6;

        this.audio.playDeath();
        this.updateHUD();
    }

    checkFruitSpawn() {
        const eaten = this.totalPellets - this.pelletsRemaining;
        if ((eaten === 70 || eaten === 170) && !this.fruit.active) {
            this.fruit.active = true;
            this.fruit.timer = 10.0;

            if (this.level === 1) {
                this.fruit.symbol = '🍒';
                this.fruit.points = 100;
            } else if (this.level === 2) {
                this.fruit.symbol = '🍓';
                this.fruit.points = 300;
            } else if (this.level === 3) {
                this.fruit.symbol = '🍊';
                this.fruit.points = 500;
            } else if (this.level === 4) {
                this.fruit.symbol = '🍎';
                this.fruit.points = 700;
            } else if (this.level === 5) {
                this.fruit.symbol = '🍈';
                this.fruit.points = 1000;
            } else if (this.level === 6) {
                this.fruit.symbol = '🛸';
                this.fruit.points = 2000;
            } else if (this.level === 7) {
                this.fruit.symbol = '🔔';
                this.fruit.points = 3000;
            } else {
                this.fruit.symbol = '🔑';
                this.fruit.points = 5000;
            }
        }
    }

    checkPelletVictory() {
        if (this.pelletsRemaining <= 0) {
            this.state = 'LEVEL_CLEAR';
            this.clearTimer = 2.4;
            this.audio.playVictory();
            this.addFloatingText(this.gameWidth / 2, this.gameHeight / 2, '★ STAGE CLEAR! ★', '#ffd700');
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.audio.stopMusic();

        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalScore = document.getElementById('modal-score');

        if (modal && modalTitle && modalScore) {
            modalTitle.textContent = '¡FIN DE PARTIDA!';
            modalScore.innerHTML = `Puntos: <strong style="color:#ffd700;">${this.score}</strong><br>Récord: <strong style="color:#00f7ff;">${this.highScore}</strong>`;
            modal.style.display = 'flex';
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({ x, y, text, color, life: 1.5, alpha: 1 });
    }

    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.y -= 18 * dt;
            ft.alpha = Math.max(0, ft.life / 1.5);
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    updateHUD() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('chomp_high_score', this.highScore.toString());
        }

        if (this.elScore) this.elScore.textContent = this.score;
        if (this.elHigh) this.elHigh.textContent = this.highScore;
        if (this.elLevel) this.elLevel.textContent = this.level;

        if (this.elLives) {
            let chompIcons = '';
            for (let i = 0; i < this.lives; i++) chompIcons += '🟡 ';
            this.elLives.textContent = chompIcons || '💀';
        }
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.audio.stopMusic();
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.audio.startMusic(this.frightenedTimer > 0);
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
    // RENDERIZADO DEL LABERINTO Y SPRITES
    // ========================================================================

    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();
        ctx.scale(this.scale, this.scale);

        ctx.fillStyle = '#05070e';
        ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

        this.renderMaze(ctx);

        if (this.fruit.active) {
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.fruit.symbol, this.fruit.x, this.fruit.y);
        }

        for (const g of this.ghosts) {
            this.renderGhost(ctx, g);
        }

        if (this.player.alive) {
            this.renderChomp(ctx);
        }

        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        if (this.state === 'PAUSED') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSA', this.gameWidth / 2, this.gameHeight / 2);
        }

        ctx.restore();
    }

    renderMaze(ctx) {
        const now = Date.now() * 0.006;
        const blinkPellet = Math.sin(now * 3) > 0;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.grid[r][c];
                const x = c * TILE;
                const y = r * TILE;

                if (cell === 'W') {
                    ctx.fillStyle = '#0a1738';
                    ctx.fillRect(x, y, TILE, TILE);

                    ctx.strokeStyle = '#0055ff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);

                    ctx.strokeStyle = 'rgba(0, 247, 255, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
                } else if (cell === 'D') {
                    ctx.fillStyle = '#ff66cc';
                    ctx.fillRect(x, y + TILE * 0.4, TILE, TILE * 0.2);
                } else if (cell === '.') {
                    ctx.fillStyle = '#ffea9f';
                    ctx.beginPath();
                    ctx.arc(x + TILE / 2, y + TILE / 2, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (cell === 'O') {
                    if (blinkPellet) {
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowColor = '#00f7ff';
                        ctx.shadowBlur = 8;
                        ctx.beginPath();
                        ctx.arc(x + TILE / 2, y + TILE / 2, 6.0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }
    }

    renderChomp(ctx) {
        ctx.save();
        ctx.translate(this.player.x + TILE / 2, this.player.y + TILE / 2);

        const baseAngle = this.player.dir.angle || 0;
        ctx.rotate(baseAngle);

        const radius = TILE * 0.75;
        const mouth = this.player.mouthAngle;

        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = 'rgba(255, 234, 0, 0.7)';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, radius, mouth, Math.PI * 2 - mouth);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    renderGhost(ctx, g) {
        ctx.save();
        ctx.translate(g.x + TILE / 2, g.y + TILE / 2);

        const radius = TILE * 0.72;

        if (g.state === 'RETURNING_EYES') {
            this.drawGhostEyes(ctx, g.dir);
            ctx.restore();
            return;
        }

        let bodyColor = g.color;
        if (g.state === 'FRIGHTENED') {
            if (this.frightenedTimer < 2.5 && Math.sin(Date.now() * 0.02) > 0) {
                bodyColor = '#ffffff';
            } else {
                bodyColor = '#1e38ff';
            }
        }

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, -radius * 0.2, radius, Math.PI, 0, false);
        ctx.lineTo(radius, radius * 0.85);

        const wave = Math.sin(Date.now() * 0.015) * 2;
        ctx.lineTo(radius * 0.5, radius * 0.55 + wave);
        ctx.lineTo(0, radius * 0.85);
        ctx.lineTo(-radius * 0.5, radius * 0.55 - wave);
        ctx.lineTo(-radius, radius * 0.85);
        ctx.closePath();
        ctx.fill();

        if (g.state === 'FRIGHTENED') {
            ctx.fillStyle = (bodyColor === '#ffffff') ? '#ff0033' : '#ffd700';
            ctx.fillRect(-5, -4, 3, 3);
            ctx.fillRect(2, -4, 3, 3);
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-6, 3);
            ctx.lineTo(-3, 1);
            ctx.lineTo(0, 3);
            ctx.lineTo(3, 1);
            ctx.lineTo(6, 3);
            ctx.stroke();
        } else {
            this.drawGhostEyes(ctx, g.dir);
        }

        ctx.restore();
    }

    drawGhostEyes(ctx, dir) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-4, -3, 3.5, 0, Math.PI * 2);
        ctx.arc(4, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0022cc';
        const pupX = dir.x * 1.8;
        const pupY = dir.y * 1.8;

        ctx.beginPath();
        ctx.arc(-4 + pupX, -3 + pupY, 1.8, 0, Math.PI * 2);
        ctx.arc(4 + pupX, -3 + pupY, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));

        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        try {
            this.update(dt);
            this.render();
        } catch (e) {
            console.error("Chomp loop error:", e);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new ChompNeoGame();
});
