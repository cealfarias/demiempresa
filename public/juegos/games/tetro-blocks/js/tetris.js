// Tetris Engine Moderno
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // 300x600 canvas

// Definición de piezas (matrices y colores)
const PIECES = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00f5d4', // Cyan neón
        glow: 'rgba(0, 245, 212, 0.6)'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#3a86ff', // Azul eléctrico
        glow: 'rgba(58, 134, 255, 0.6)'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#fb5607', // Naranja vibrante
        glow: 'rgba(251, 86, 7, 0.6)'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffbe0b', // Amarillo cálido
        glow: 'rgba(255, 190, 11, 0.6)'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#06d6a0', // Verde esmeralda
        glow: 'rgba(6, 214, 160, 0.6)'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#8338ec', // Violeta neón
        glow: 'rgba(131, 56, 236, 0.6)'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff006e', // Magenta / Rojo
        glow: 'rgba(255, 0, 110, 0.6)'
    }
};

const PIECE_NAMES = Object.keys(PIECES);

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8 - 2;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.2; // Gravedad
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        // Escala para alta definición en pantallas Retina/HiDPI
        this.setupCanvases();

        // Estado del juego
        this.board = this.createBoard();
        this.bag = [];
        this.currentPiece = null;
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;

        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);

        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        this.isGameOver = false;
        this.isPaused = false;
        this.isRunning = false;

        this.particles = [];
        this.clearingLines = [];
        this.clearAnimationTimer = 0;

        this.bindEvents();
        this.updateUI();
        this.drawEmptyBoard();
    }

    setupCanvases() {
        this.canvas.width = COLS * BLOCK_SIZE;
        this.canvas.height = ROWS * BLOCK_SIZE;
        this.holdCanvas.width = 120;
        this.holdCanvas.height = 100;
        this.nextCanvas.width = 120;
        this.nextCanvas.height = 280;
    }

    createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    getBagPiece() {
        if (this.bag.length === 0) {
            this.bag = [...PIECE_NAMES].sort(() => Math.random() - 0.5);
        }
        const name = this.bag.pop();
        const info = PIECES[name];
        return {
            name: name,
            shape: info.shape.map(row => [...row]),
            color: info.color,
            glow: info.glow,
            x: Math.floor((COLS - info.shape[0].length) / 2),
            y: 0
        };
    }

    start() {
        window.soundManager.init();
        this.board = this.createBoard();
        this.bag = [];
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.isGameOver = false;
        this.isPaused = false;
        this.isRunning = true;
        this.holdPiece = null;
        this.canHold = true;
        this.particles = [];
        this.clearingLines = [];

        window.soundManager.setMusicTempoByLevel(this.level);
        window.soundManager.startMusic();

        // Generar cola inicial
        this.nextPieces = [this.getBagPiece(), this.getBagPiece(), this.getBagPiece()];
        this.spawnPiece();

        document.getElementById('game-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');

        this.updateUI();
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    spawnPiece() {
        this.currentPiece = this.nextPieces.shift();
        this.nextPieces.push(this.getBagPiece());
        this.canHold = true;

        // Comprobar colisión al nacer -> Game Over
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameOver();
        }
    }

    hold() {
        if (!this.canHold || this.isGameOver || this.isPaused || !this.isRunning) return;

        window.soundManager.playHold();
        const currentName = this.currentPiece.name;

        if (!this.holdPiece) {
            this.holdPiece = currentName;
            this.spawnPiece();
        } else {
            const temp = this.holdPiece;
            this.holdPiece = currentName;
            const info = PIECES[temp];
            this.currentPiece = {
                name: temp,
                shape: info.shape.map(row => [...row]),
                color: info.color,
                glow: info.glow,
                x: Math.floor((COLS - info.shape[0].length) / 2),
                y: 0
            };
        }

        this.canHold = false;
        this.drawHold();
    }

    checkCollision(x, y, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newX = x + c;
                    const newY = y + r;

                    // Bordes laterales e inferiores
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    // Colisión con bloques fijos del tablero
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    rotateMatrix(matrix) {
        const N = matrix.length;
        const result = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                result[c][N - 1 - r] = matrix[r][c];
            }
        }
        return result;
    }

    rotate() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return;

        const rotated = this.rotateMatrix(this.currentPiece.shape);
        // Sistema SRS simplificado de Wall Kicks: intenta en posición actual, luego -1, +1, -2, +2, y hacia arriba
        const offsets = [0, -1, 1, -2, 2];
        for (const offset of offsets) {
            if (!this.checkCollision(this.currentPiece.x + offset, this.currentPiece.y, rotated)) {
                this.currentPiece.x += offset;
                this.currentPiece.shape = rotated;
                window.soundManager.playRotate();
                return;
            }
        }
        // Intentar pateo hacia arriba si está contra el fondo
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y - 1, rotated)) {
            this.currentPiece.y -= 1;
            this.currentPiece.shape = rotated;
            window.soundManager.playRotate();
        }
    }

    moveLeft() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return;
        if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.shape)) {
            this.currentPiece.x--;
            window.soundManager.playMove();
        }
    }

    moveRight() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return;
        if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.shape)) {
            this.currentPiece.x++;
            window.soundManager.playMove();
        }
    }

    softDrop() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return;
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.currentPiece.y++;
            this.score += 1;
            this.updateUI();
        } else {
            this.lockPiece();
        }
    }

    shakeBoard(intensity = 'light') {
        const wrapper = document.querySelector('.board-wrapper');
        if (!wrapper) return;
        const cls = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
        wrapper.classList.remove('shake-light', 'shake-heavy');
        void wrapper.offsetWidth; // Forzar reflow para reiniciar animación
        wrapper.classList.add(cls);
        setTimeout(() => {
            wrapper.classList.remove(cls);
        }, intensity === 'heavy' ? 320 : 160);
    }

    hardDrop() {
        if (!this.currentPiece || this.isGameOver || this.isPaused) return;
        let dropDistance = 0;
        while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        this.score += dropDistance * 2;
        window.soundManager.playDrop();
        this.shakeBoard('light');
        this.lockPiece();
        this.updateUI();
    }

    getGhostY() {
        if (!this.currentPiece) return 0;
        let ghostY = this.currentPiece.y;
        while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
            ghostY++;
        }
        return ghostY;
    }

    lockPiece() {
        const { x, y, shape, color } = this.currentPiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardY = y + r;
                    const boardX = x + c;
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        this.board[boardY][boardX] = color;
                    }
                }
            }
        }

        this.checkLines();
        this.spawnPiece();
    }

    checkLines() {
        let linesCleared = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                linesCleared.push(r);
            }
        }

        if (linesCleared.length > 0) {
            // Si es un TETRIS (4 líneas), sacudir con fuerza la pantalla
            if (linesCleared.length === 4) {
                this.shakeBoard('heavy');
            }

            // Efectos de partículas en las líneas limpiadas
            linesCleared.forEach(row => {
                for (let c = 0; c < COLS; c++) {
                    const color = this.board[row][c];
                    for (let p = 0; p < (linesCleared.length === 4 ? 8 : 5); p++) {
                        this.particles.push(new Particle(
                            c * BLOCK_SIZE + Math.random() * BLOCK_SIZE,
                            row * BLOCK_SIZE + Math.random() * BLOCK_SIZE,
                            color
                        ));
                    }
                }
            });

            // Sonido de línea
            window.soundManager.playLineClear(linesCleared.length);

            // Eliminar filas y añadir vacías al inicio
            linesCleared.forEach(row => {
                this.board.splice(row, 1);
                this.board.unshift(Array(COLS).fill(0));
            });

            // Puntuación
            const pointsTable = [0, 100, 300, 500, 800];
            const gainedScore = (pointsTable[linesCleared.length] || 800) * this.level;
            this.score += gainedScore;
            this.lines += linesCleared.length;

            // Subir nivel cada 10 líneas
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 85);
                window.soundManager.setMusicTempoByLevel(this.level);
                window.soundManager.playLevelUp();
            }

            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('tetris_high_score', this.highScore.toString());
            }

            this.updateUI();
        }
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            window.soundManager.stopMusic();
            pauseOverlay.classList.remove('hidden');
        } else {
            pauseOverlay.classList.add('hidden');
            window.soundManager.startMusic();
            this.lastTime = performance.now();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        window.soundManager.playGameOver();

        const overlay = document.getElementById('game-overlay');
        document.getElementById('overlay-title').innerText = 'GAME OVER';
        document.getElementById('overlay-btn').innerText = 'Jugar de Nuevo';
        overlay.classList.remove('hidden');
    }

    updateUI() {
        document.getElementById('score').innerText = this.score.toLocaleString();
        document.getElementById('lines').innerText = this.lines;
        document.getElementById('level').innerText = this.level;
        document.getElementById('high-score').innerText = this.highScore.toLocaleString();
        this.drawHold();
        this.drawNext();
    }

    gameLoop(time = 0) {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.softDrop();
            this.dropCounter = 0;
        }

        // Actualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    drawBlock(ctx, x, y, color, size = BLOCK_SIZE, isGhost = false) {
        const px = x * size;
        const py = y * size;

        ctx.save();
        if (isGhost) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
            ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
        } else {
            // Fondo con degradado sutil
            const grad = ctx.createLinearGradient(px, py, px + size, py + size);
            grad.addColorStop(0, color);
            grad.addColorStop(1, '#050515');
            ctx.fillStyle = grad;
            ctx.fillRect(px, py, size, size);

            // Borde brillante superior e izquierdo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(px, py, size, 2);
            ctx.fillRect(px, py, 2, size);

            // Borde oscuro inferior y derecho
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(px, py + size - 2, size, 2);
            ctx.fillRect(px + size - 2, py, 2, size);

            // Borde de separación
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, size, size);
        }
        ctx.restore();
    }

    draw() {
        this.ctx.fillStyle = '#0f1123';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Rejilla de fondo
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        for (let c = 0; c <= COLS; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * BLOCK_SIZE, 0);
            this.ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * BLOCK_SIZE);
            this.ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
            this.ctx.stroke();
        }

        // Tablero colocado
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board[r][c]) {
                    this.drawBlock(this.ctx, c, r, this.board[r][c]);
                }
            }
        }

        // Pieza fantasma (Ghost piece)
        if (this.currentPiece) {
            const ghostY = this.getGhostY();
            const { x, shape, color } = this.currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawBlock(this.ctx, x + c, ghostY + r, color, BLOCK_SIZE, true);
                    }
                }
            }

            // Pieza actual activa
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawBlock(this.ctx, x + c, this.currentPiece.y + r, color);
                    }
                }
            }
        }

        // Partículas
        this.particles.forEach(p => p.draw(this.ctx));
    }

    drawEmptyBoard() {
        this.ctx.fillStyle = '#0f1123';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawHold();
        this.drawNext();
    }

    drawHold() {
        this.holdCtx.fillStyle = '#16192e';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (!this.holdPiece) return;

        const info = PIECES[this.holdPiece];
        const shape = info.shape;
        const miniSize = 22;
        const offsetX = (this.holdCanvas.width - shape[0].length * miniSize) / 2;
        const offsetY = (this.holdCanvas.height - shape.length * miniSize) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    this.drawMiniBlock(this.holdCtx, offsetX + c * miniSize, offsetY + r * miniSize, info.color, miniSize);
                }
            }
        }
    }

    drawNext() {
        this.nextCtx.fillStyle = '#16192e';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (this.nextPieces.length === 0) return;

        const miniSize = 20;
        this.nextPieces.slice(0, 3).forEach((piece, index) => {
            const shape = piece.shape;
            const offsetX = (this.nextCanvas.width - shape[0].length * miniSize) / 2;
            const offsetY = 25 + index * 85;

            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawMiniBlock(this.nextCtx, offsetX + c * miniSize, offsetY + r * miniSize, piece.color, miniSize);
                    }
                }
            }
        });
    }

    drawMiniBlock(ctx, px, py, color, size) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(px, py, size, 2);
        ctx.fillRect(px, py, 2, size);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.strokeRect(px, py, size, size);
        ctx.restore();
    }

    bindEvents() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            // Ignorar teclas si el juego no ha empezado
            if (!this.isRunning && e.key !== 'Enter') return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.moveRight();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.softDrop();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.rotate();
                    break;
                case ' ': // Hard drop
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'c':
                case 'C':
                case 'Shift':
                    e.preventDefault();
                    this.hold();
                    break;
                case 'p':
                case 'P':
                case 'Escape':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    this.toggleSFX();
                    break;
                case 'n':
                case 'N':
                    e.preventDefault();
                    this.toggleMusic();
                    break;
                case 'Enter':
                    if (!this.isRunning) {
                        this.start();
                    }
                    break;
            }
        });

        // Botón Start / Reiniciar en overlay
        document.getElementById('overlay-btn').addEventListener('click', () => {
            this.start();
        });

        // Botón Pausa
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            this.togglePause();
        });

        // Botón Música
        const musicBtn = document.getElementById('btn-music');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this.toggleMusic();
            });
        }

        // Botón Efectos de Sonido
        const soundBtn = document.getElementById('btn-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.toggleSFX();
            });
        }

        // Botones táctiles móviles
        const bindTouch = (id, action) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handler = (e) => {
                e.preventDefault();
                window.soundManager.init();
                action();
            };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('click', handler);
        };

        bindTouch('touch-left', () => this.moveLeft());
        bindTouch('touch-right', () => this.moveRight());
        bindTouch('touch-down', () => this.softDrop());
        bindTouch('touch-rotate', () => this.rotate());
        bindTouch('touch-drop', () => this.hardDrop());
        bindTouch('touch-hold', () => this.hold());
    }

    toggleSFX() {
        const enabled = window.soundManager.toggleSFX();
        const soundBtn = document.getElementById('btn-sound');
        if (soundBtn) {
            soundBtn.innerText = enabled ? '🔊' : '🔇';
            soundBtn.style.opacity = enabled ? '1' : '0.45';
        }
    }

    toggleMusic() {
        const enabled = window.soundManager.toggleMusic();
        const musicBtn = document.getElementById('btn-music');
        if (musicBtn) {
            musicBtn.innerText = enabled ? '🎵' : '🎶';
            musicBtn.style.opacity = enabled ? '1' : '0.45';
        }
    }
}

// Iniciar juego al cargar
window.addEventListener('DOMContentLoaded', () => {
    window.game = new TetrisGame();
});
