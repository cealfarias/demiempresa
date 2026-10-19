// Bridge Builder 2D - Motor de Física y Simulación de Puentes
class BridgeGame {
    constructor() {
        this.canvas = document.getElementById('bridge-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Configuración y dimensiones
        this.width = 900;
        this.height = 500;
        this.setupCanvas();

        // Herramientas y estados
        this.tool = 'road'; // 'road', 'wood', 'delete'
        this.mode = 'build'; // 'build', 'simulating', 'victory', 'failed'
        this.currentLevelIndex = 0;
        this.showBlueprint = true; // Activo por defecto como tutorial

        // Niveles con Planos Guía (Blueprints de ingeniería)
        this.levels = [
            {
                name: '1. El Desfiladero Corto',
                budget: 2400,
                vehicleWeight: 1.0,
                vehicleSpeed: 2.2,
                leftCliff: { x: 200, y: 300 },
                rightCliff: { x: 440, y: 300 },
                anchors: [
                    { x: 200, y: 300 },
                    { x: 140, y: 360 },
                    { x: 440, y: 300 },
                    { x: 500, y: 360 }
                ],
                blueprint: [
                    { a: { x: 200, y: 300 }, b: { x: 320, y: 300 }, type: 'road' },
                    { a: { x: 320, y: 300 }, b: { x: 440, y: 300 }, type: 'road' },
                    { a: { x: 200, y: 300 }, b: { x: 140, y: 360 }, type: 'wood' },
                    { a: { x: 140, y: 360 }, b: { x: 320, y: 300 }, type: 'wood' },
                    { a: { x: 320, y: 300 }, b: { x: 500, y: 360 }, type: 'wood' },
                    { a: { x: 500, y: 360 }, b: { x: 440, y: 300 }, type: 'wood' }
                ],
                goalX: 520
            },
            {
                name: '2. El Gran Valle',
                budget: 4200,
                vehicleWeight: 1.2,
                vehicleSpeed: 2.3,
                leftCliff: { x: 180, y: 280 },
                rightCliff: { x: 520, y: 280 },
                anchors: [
                    { x: 180, y: 280 },
                    { x: 120, y: 340 },
                    { x: 520, y: 280 },
                    { x: 580, y: 340 }
                ],
                blueprint: [
                    { a: { x: 180, y: 280 }, b: { x: 295, y: 280 }, type: 'road' },
                    { a: { x: 295, y: 280 }, b: { x: 405, y: 280 }, type: 'road' },
                    { a: { x: 405, y: 280 }, b: { x: 520, y: 280 }, type: 'road' },
                    { a: { x: 120, y: 340 }, b: { x: 180, y: 280 }, type: 'wood' },
                    { a: { x: 120, y: 340 }, b: { x: 295, y: 280 }, type: 'wood' },
                    { a: { x: 295, y: 280 }, b: { x: 350, y: 340 }, type: 'wood' },
                    { a: { x: 350, y: 340 }, b: { x: 405, y: 280 }, type: 'wood' },
                    { a: { x: 405, y: 280 }, b: { x: 580, y: 340 }, type: 'wood' },
                    { a: { x: 520, y: 280 }, b: { x: 580, y: 340 }, type: 'wood' }
                ],
                goalX: 600
            },
            {
                name: '3. El Pilar Central',
                budget: 5200,
                vehicleWeight: 1.4,
                vehicleSpeed: 2.4,
                leftCliff: { x: 160, y: 280 },
                rightCliff: { x: 580, y: 280 },
                anchors: [
                    { x: 160, y: 280 },
                    { x: 100, y: 340 },
                    { x: 370, y: 380 }, // Pilar central de roca
                    { x: 580, y: 280 },
                    { x: 640, y: 340 }
                ],
                centralPillar: { x: 370, y: 380, width: 60, height: 120 },
                blueprint: [
                    { a: { x: 160, y: 280 }, b: { x: 265, y: 280 }, type: 'road' },
                    { a: { x: 265, y: 280 }, b: { x: 370, y: 280 }, type: 'road' },
                    { a: { x: 370, y: 280 }, b: { x: 475, y: 280 }, type: 'road' },
                    { a: { x: 475, y: 280 }, b: { x: 580, y: 280 }, type: 'road' },
                    { a: { x: 100, y: 340 }, b: { x: 160, y: 280 }, type: 'wood' },
                    { a: { x: 100, y: 340 }, b: { x: 265, y: 280 }, type: 'wood' },
                    { a: { x: 370, y: 380 }, b: { x: 265, y: 280 }, type: 'wood' },
                    { a: { x: 370, y: 380 }, b: { x: 370, y: 280 }, type: 'wood' },
                    { a: { x: 370, y: 380 }, b: { x: 475, y: 280 }, type: 'wood' },
                    { a: { x: 640, y: 340 }, b: { x: 475, y: 280 }, type: 'wood' },
                    { a: { x: 640, y: 340 }, b: { x: 580, y: 280 }, type: 'wood' }
                ],
                goalX: 660
            },
            {
                name: '4. El Salto en Desnivel',
                budget: 4600,
                vehicleWeight: 1.3,
                vehicleSpeed: 2.5,
                leftCliff: { x: 180, y: 240 },
                rightCliff: { x: 520, y: 320 },
                anchors: [
                    { x: 180, y: 240 },
                    { x: 120, y: 300 },
                    { x: 520, y: 320 },
                    { x: 580, y: 380 }
                ],
                blueprint: [
                    { a: { x: 180, y: 240 }, b: { x: 295, y: 267 }, type: 'road' },
                    { a: { x: 295, y: 267 }, b: { x: 405, y: 293 }, type: 'road' },
                    { a: { x: 405, y: 293 }, b: { x: 520, y: 320 }, type: 'road' },
                    { a: { x: 120, y: 300 }, b: { x: 180, y: 240 }, type: 'wood' },
                    { a: { x: 120, y: 300 }, b: { x: 295, y: 267 }, type: 'wood' },
                    { a: { x: 295, y: 267 }, b: { x: 350, y: 330 }, type: 'wood' },
                    { a: { x: 350, y: 330 }, b: { x: 405, y: 293 }, type: 'wood' },
                    { a: { x: 405, y: 293 }, b: { x: 580, y: 380 }, type: 'wood' },
                    { a: { x: 520, y: 320 }, b: { x: 580, y: 380 }, type: 'wood' }
                ],
                goalX: 600
            },
            {
                name: '5. El Camión de Carga Pesada',
                budget: 6500,
                vehicleWeight: 2.6, // Muy pesado
                vehicleSpeed: 2.1,
                leftCliff: { x: 160, y: 270 },
                rightCliff: { x: 580, y: 270 },
                anchors: [
                    { x: 160, y: 270 },
                    { x: 100, y: 330 },
                    { x: 100, y: 400 },
                    { x: 580, y: 270 },
                    { x: 640, y: 330 },
                    { x: 640, y: 400 }
                ],
                blueprint: [
                    { a: { x: 160, y: 270 }, b: { x: 265, y: 270 }, type: 'road' },
                    { a: { x: 265, y: 270 }, b: { x: 370, y: 270 }, type: 'road' },
                    { a: { x: 370, y: 270 }, b: { x: 475, y: 270 }, type: 'road' },
                    { a: { x: 475, y: 270 }, b: { x: 580, y: 270 }, type: 'road' },
                    { a: { x: 100, y: 330 }, b: { x: 160, y: 270 }, type: 'wood' },
                    { a: { x: 100, y: 330 }, b: { x: 265, y: 270 }, type: 'wood' },
                    { a: { x: 100, y: 400 }, b: { x: 265, y: 270 }, type: 'wood' },
                    { a: { x: 265, y: 270 }, b: { x: 370, y: 340 }, type: 'wood' },
                    { a: { x: 370, y: 340 }, b: { x: 370, y: 270 }, type: 'wood' },
                    { a: { x: 370, y: 340 }, b: { x: 475, y: 270 }, type: 'wood' },
                    { a: { x: 640, y: 400 }, b: { x: 475, y: 270 }, type: 'wood' },
                    { a: { x: 640, y: 330 }, b: { x: 475, y: 270 }, type: 'wood' },
                    { a: { x: 640, y: 330 }, b: { x: 580, y: 270 }, type: 'wood' }
                ],
                goalX: 660
            }
        ];

        // Estructura de construcción
        this.nodes = [];
        this.beams = [];
        this.history = []; // Para Deshacer

        // Interacción del cursor / toque
        this.isInteracting = false;
        this.dragStartNode = null;
        this.currentMousePos = { x: 0, y: 0 };
        this.hoverNode = null;

        // Vehículo para simulación
        this.vehicle = null;
        this.particles = [];

        this.initLevel(0);
        this.bindEvents();
        this.startLoop();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    initLevel(index) {
        this.currentLevelIndex = index;
        const lvl = this.levels[index];
        this.mode = 'build';
        this.nodes = [];
        this.beams = [];
        this.history = [];
        this.vehicle = null;
        this.particles = [];

        // Generar nodos fijos (anclajes)
        lvl.anchors.forEach((anc, i) => {
            this.nodes.push({
                id: 'anchor_' + i,
                x: anc.x,
                y: anc.y,
                oldX: anc.x,
                oldY: anc.y,
                isAnchor: true
            });
        });

        this.updateUI();
        window.bridgeAudio.stopEngine();
    }

    saveState() {
        this.history.push({
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            beams: JSON.parse(JSON.stringify(this.beams))
        });
        if (this.history.length > 25) this.history.shift();
    }

    undo() {
        if (this.mode !== 'build' || this.history.length === 0) return;
        const prev = this.history.pop();
        this.nodes = prev.nodes;
        this.beams = prev.beams;
        this.updateUI();
    }

    clear() {
        if (this.mode !== 'build') return;
        this.saveState();
        // Mantener solo los anclajes
        this.nodes = this.nodes.filter(n => n.isAnchor);
        this.beams = [];
        this.updateUI();
    }

    getBudgetSpent() {
        let total = 0;
        this.beams.forEach(b => {
            total += b.type === 'road' ? 220 : 110;
        });
        return total;
    }

    updateUI() {
        const lvl = this.levels[this.currentLevelIndex];
        const spent = this.getBudgetSpent();
        const remaining = lvl.budget - spent;

        document.getElementById('level-name').innerText = lvl.name;
        document.getElementById('budget-val').innerText = `$${remaining.toLocaleString()}`;
        document.getElementById('budget-val').style.color = remaining < 0 ? '#ff006e' : '#00f5d4';

        // Actualizar botones de herramienta activos
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`tool-${this.tool}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Botón Simular / Editar
        const simBtn = document.getElementById('btn-simulate');
        if (this.mode === 'build') {
            simBtn.innerText = '▶ PROBAR PUENTE';
            simBtn.classList.remove('danger');
            simBtn.classList.add('primary');
        } else {
            simBtn.innerText = '🛠️ EDITAR PUENTE';
            simBtn.classList.remove('primary');
            simBtn.classList.add('danger');
        }

        // Estado del botón de Blueprint / Pistas
        const bpBtn = document.getElementById('btn-toggle-blueprint');
        if (bpBtn) {
            bpBtn.innerText = this.showBlueprint ? '📐 Pistas: ON' : '📐 Pistas: OFF';
            bpBtn.classList.toggle('active', this.showBlueprint);
        }

        // Actualizar Guía y Tutorial Dinámico
        this.updateTutorialBanner();

        // Overlay de nivel superado o colapso
        const overlay = document.getElementById('bridge-overlay');
        if (this.mode === 'victory') {
            document.getElementById('overlay-title').innerText = '🎉 ¡PUENTE EXITOSO!';
            document.getElementById('overlay-msg').innerText = 'El vehículo cruzó de forma segura al otro lado.';
            document.getElementById('btn-overlay-next').innerText = this.currentLevelIndex < this.levels.length - 1 ? 'Siguiente Nivel ▶' : 'Volver a Empezar ↺';
            overlay.classList.remove('hidden');
        } else if (this.mode === 'failed') {
            document.getElementById('overlay-title').innerText = '💥 ¡PUENTE COLAPSADO!';
            document.getElementById('overlay-msg').innerText = 'El puente no soportó el peso o la tensión. Refuerza con triángulos.';
            document.getElementById('btn-overlay-next').innerText = 'Intentar de Nuevo ↺';
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    updateTutorialBanner() {
        const stepTag = document.getElementById('tutorial-step-tag');
        const textElem = document.getElementById('tutorial-text');
        if (!stepTag || !textElem) return;

        const roads = this.beams.filter(b => b.type === 'road');
        const woods = this.beams.filter(b => b.type === 'wood');

        if (this.mode === 'simulating') {
            stepTag.innerText = 'PRUEBA';
            stepTag.style.background = '#ffbe0b';
            stepTag.style.color = '#000';
            textElem.innerHTML = '<b>Física en acción:</b> Observa los colores. Verde = seguro, Amarillo = carga alta, Rojo = ¡peligro de rotura!';
        } else if (this.mode === 'victory') {
            stepTag.innerText = 'ÉXITO';
            stepTag.style.background = '#00f5d4';
            stepTag.style.color = '#000';
            textElem.innerHTML = '<b>¡Excelente ingeniería!</b> El puente distribuyó el peso perfectamente hacia los anclajes.';
        } else if (this.mode === 'failed') {
            stepTag.innerText = 'CONSEJO';
            stepTag.style.background = '#ff006e';
            stepTag.style.color = '#fff';
            textElem.innerHTML = '<b>El puente colapsó:</b> La carretera necesita vigas de madera trianguladas para resistir la flexión.';
        } else if (roads.length === 0) {
            stepTag.innerText = 'PASO 1';
            stepTag.style.background = '#00f5d4';
            stepTag.style.color = '#000';
            textElem.innerHTML = '<b>Inicia con Carretera:</b> Selecciona <b>🛣️ Carretera</b> y arrastra de anclaje a anclaje (🟡) para crear la calzada horizontal.';
        } else if (woods.length === 0) {
            stepTag.innerText = 'PASO 2';
            stepTag.style.background = '#ffbe0b';
            stepTag.style.color = '#000';
            textElem.innerHTML = '<b>¡Bien! Ahora añade soporte:</b> Selecciona <b>🪵 Viga</b> y conecta los anclajes inferiores hacia la carretera formando <b>triángulos</b>.';
        } else {
            stepTag.innerText = 'PASO 3';
            stepTag.style.background = '#8338ec';
            stepTag.style.color = '#fff';
            textElem.innerHTML = '<b>¡Estructura lista!</b> Presiona el botón verde <b>▶ PROBAR PUENTE</b> para ver si el camión cruza a salvo.';
        }
    }

    startSimulation() {
        const lvl = this.levels[this.currentLevelIndex];
        if (this.beams.length === 0) return;

        window.bridgeAudio.init();
        this.mode = 'simulating';

        // Copiar posiciones de inicio de simulación en Verlet
        this.nodes.forEach(n => {
            n.simX = n.x;
            n.simY = n.y;
            n.oldX = n.x;
            n.oldY = n.y;
        });

        // Crear vehículo en el acantilado izquierdo
        this.vehicle = {
            x: lvl.leftCliff.x - 70,
            y: lvl.leftCliff.y - 20,
            vx: lvl.vehicleSpeed,
            vy: 0,
            width: 50,
            height: 24,
            wheelRadius: 10,
            weight: lvl.vehicleWeight,
            grounded: false,
            reachedGoal: false
        };

        window.bridgeAudio.startEngine();
        this.updateUI();
    }

    stopSimulation() {
        this.mode = 'build';
        this.vehicle = null;
        window.bridgeAudio.stopEngine();
        this.updateUI();
    }

    // --- FÍSICA (VERLET + SPRINGS / RELAXATION) ---
    updatePhysics() {
        if (this.mode !== 'simulating') return;

        const subSteps = 8;
        const gravity = 0.28 / subSteps;
        const damping = 0.998;

        for (let step = 0; step < subSteps; step++) {
            // 1. Integración de Verlet para los nodos dinámicos
            this.nodes.forEach(n => {
                if (n.isAnchor) return;

                const vx = (n.simX - n.oldX) * damping;
                const vy = (n.simY - n.oldY) * damping + gravity;

                n.oldX = n.simX;
                n.oldY = n.simY;
                n.simX += vx;
                n.simY += vy;
            });

            // 2. Relajación de vigas (Resistencia a tracción / compresión)
            this.beams.forEach(b => {
                if (b.broken) return;

                const nA = this.nodes.find(n => n.id === b.nodeAId);
                const nB = this.nodes.find(n => n.id === b.nodeBId);
                if (!nA || !nB) return;

                const dx = (nA.isAnchor ? nA.x : nA.simX) - (nB.isAnchor ? nB.x : nB.simX);
                const dy = (nA.isAnchor ? nA.y : nA.simY) - (nB.isAnchor ? nB.y : nB.simY);
                const currentDist = Math.hypot(dx, dy);

                if (currentDist === 0) return;

                // Tensión (estrés)
                const diff = (currentDist - b.restLength) / currentDist;
                const stress = Math.abs(currentDist - b.restLength) / b.restLength;
                b.stress = stress / (b.type === 'road' ? 0.35 : 0.45);

                // Romper viga si supera el 100% de esfuerzo
                if (b.stress >= 1.0) {
                    b.broken = true;
                    window.bridgeAudio.playSnap();
                    this.createWoodDebris((nA.simX + nB.simX) / 2, (nA.simY + nB.simY) / 2);
                    return;
                }

                const stiffness = b.type === 'road' ? 0.9 : 0.75;
                const offsetX = dx * diff * 0.5 * stiffness;
                const offsetY = dy * diff * 0.5 * stiffness;

                if (!nA.isAnchor) {
                    nA.simX -= offsetX;
                    nA.simY -= offsetY;
                }
                if (!nB.isAnchor) {
                    nB.simX += offsetX;
                    nB.simY += offsetY;
                }
            });

            // 3. Física del Vehículo
            if (this.vehicle) {
                this.updateVehiclePhysics(subSteps);
            }
        }
    }

    updateVehiclePhysics(subSteps) {
        const v = this.vehicle;
        const lvl = this.levels[this.currentLevelIndex];

        // Gravedad del vehículo
        v.vy += 0.35 / subSteps;
        v.x += v.vx / subSteps;
        v.y += v.vy / subSteps;

        // Comprobar colisión de las ruedas sobre las vigas de carretera (Road)
        v.grounded = false;
        const wheelY = v.y + v.height / 2;

        // En el acantilado de salida (izquierdo)
        if (v.x < lvl.leftCliff.x) {
            if (wheelY > lvl.leftCliff.y) {
                v.y = lvl.leftCliff.y - v.height / 2;
                v.vy = 0;
                v.grounded = true;
            }
        }

        // En el acantilado de meta (derecho)
        if (v.x > lvl.rightCliff.x) {
            if (wheelY > lvl.rightCliff.y) {
                v.y = lvl.rightCliff.y - v.height / 2;
                v.vy = 0;
                v.grounded = true;
            }
        }

        // Sobre vigas de carretera del puente
        const roadBeams = this.beams.filter(b => b.type === 'road' && !b.broken);
        roadBeams.forEach(b => {
            const nA = this.nodes.find(n => n.id === b.nodeAId);
            const nB = this.nodes.find(n => n.id === b.nodeBId);
            if (!nA || !nB) return;

            const ax = nA.isAnchor ? nA.x : nA.simX;
            const ay = nA.isAnchor ? nA.y : nA.simY;
            const bx = nB.isAnchor ? nB.x : nB.simX;
            const by = nB.isAnchor ? nB.y : nB.simY;

            // Comprobar si el vehículo está en el rango horizontal del segmento
            const minX = Math.min(ax, bx);
            const maxX = Math.max(ax, bx);

            if (v.x >= minX - 5 && v.x <= maxX + 5) {
                const t = Math.max(0, Math.min(1, (v.x - ax) / (bx - ax)));
                const bridgeSegmentY = ay + t * (by - ay);

                // Si la rueda toca o atraviesa la carretera
                if (wheelY >= bridgeSegmentY - 4 && wheelY <= bridgeSegmentY + 18) {
                    v.y = bridgeSegmentY - v.height / 2;
                    v.vy = 0;
                    v.grounded = true;

                    // Transferir el peso del vehículo a los dos nodos de la viga
                    const weightForce = (v.weight * 0.45) / subSteps;
                    if (!nA.isAnchor) nA.simY += weightForce * (1 - t);
                    if (!nB.isAnchor) nB.simY += weightForce * t;
                }
            }
        });

        // Modulación del sonido del motor
        window.bridgeAudio.setEngineSpeed(Math.abs(v.vx) + (v.grounded ? 0.4 : 0));

        // ¿Llegó a la meta?
        if (v.x >= lvl.goalX && !v.reachedGoal) {
            v.reachedGoal = true;
            this.mode = 'victory';
            window.bridgeAudio.playVictory();
            this.createVictoryConfetti();
            this.updateUI();
        }

        // ¿Cayó al vacío o al agua?
        if (v.y > this.height + 40 && this.mode === 'simulating') {
            this.mode = 'failed';
            window.bridgeAudio.playFail();
            this.updateUI();
        }
    }

    createWoodDebris(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                color: '#d4a373',
                size: Math.random() * 5 + 3,
                life: 1
            });
        }
    }

    createVictoryConfetti() {
        const colors = ['#00f5d4', '#ff006e', '#ffbe0b', '#3a86ff', '#8338ec'];
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: this.levels[this.currentLevelIndex].goalX,
                y: 200,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.8) * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 6 + 4,
                life: 1.5
            });
        }
    }

    // --- INTERACCIÓN Y CONSTRUCCIÓN ---
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

    findClosestNode(pos, maxDist = 24) {
        let closest = null;
        let minDist = maxDist;
        this.nodes.forEach(n => {
            const d = Math.hypot(n.x - pos.x, n.y - pos.y);
            if (d < minDist) {
                minDist = d;
                closest = n;
            }
        });
        return closest;
    }

    findBeamAt(pos, maxDist = 12) {
        for (let i = 0; i < this.beams.length; i++) {
            const b = this.beams[i];
            const nA = this.nodes.find(n => n.id === b.nodeAId);
            const nB = this.nodes.find(n => n.id === b.nodeBId);
            if (!nA || !nB) continue;

            const dist = this.distToSegment(pos, nA, nB);
            if (dist < maxDist) return b;
        }
        return null;
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    handlePointerDown(pos) {
        if (this.mode !== 'build') return;
        window.bridgeAudio.init();

        if (this.tool === 'delete') {
            const beam = this.findBeamAt(pos);
            if (beam) {
                this.saveState();
                this.beams = this.beams.filter(b => b.id !== beam.id);
                // Eliminar nodos huérfanos que no sean anclajes
                this.cleanupOrphanNodes();
                window.bridgeAudio.playDelete();
                this.updateUI();
            }
            return;
        }

        // Modo Construcción (Road o Wood)
        const hitNode = this.findClosestNode(pos);
        if (hitNode) {
            this.isInteracting = true;
            this.dragStartNode = hitNode;
            this.currentMousePos = pos;
        }
    }

    handlePointerMove(pos) {
        this.currentMousePos = pos;
        this.hoverNode = this.findClosestNode(pos);
    }

    handlePointerUp(pos) {
        if (!this.isInteracting || this.mode !== 'build') {
            this.isInteracting = false;
            this.dragStartNode = null;
            return;
        }

        const startNode = this.dragStartNode;
        this.isInteracting = false;
        this.dragStartNode = null;

        // Comprobar si termina en un nodo existente o en el aire
        let endNode = this.findClosestNode(pos, 22);

        // Si no hay nodo cerca, creamos uno nuevo con ajuste magnético a rejilla
        if (!endNode) {
            const snappedX = Math.round(pos.x / 20) * 20;
            const snappedY = Math.round(pos.y / 20) * 20;

            const dist = Math.hypot(snappedX - startNode.x, snappedY - startNode.y);
            // Longitud máxima permitida de viga: 90px
            if (dist > 95 || dist < 20) return;

            endNode = {
                id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                x: snappedX,
                y: snappedY,
                oldX: snappedX,
                oldY: snappedY,
                isAnchor: false
            };
            this.nodes.push(endNode);
        }

        // Si es el mismo nodo, cancelar
        if (startNode.id === endNode.id) return;

        // Comprobar si ya existe una viga entre estos dos nodos
        const alreadyExists = this.beams.some(b => 
            (b.nodeAId === startNode.id && b.nodeBId === endNode.id) ||
            (b.nodeAId === endNode.id && b.nodeBId === startNode.id)
        );
        if (alreadyExists) return;

        const length = Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y);
        if (length > 95) return; // Demasiado larga

        this.saveState();
        this.beams.push({
            id: 'beam_' + Date.now(),
            nodeAId: startNode.id,
            nodeBId: endNode.id,
            type: this.tool,
            restLength: length,
            stress: 0,
            broken: false
        });

        window.bridgeAudio.playPlace();
        this.updateUI();
    }

    cleanupOrphanNodes() {
        this.nodes = this.nodes.filter(n => {
            if (n.isAnchor) return true;
            return this.beams.some(b => b.nodeAId === n.id || b.nodeBId === n.id);
        });
    }

    // --- RENDERIZADO VISUAL ---
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Fondo cielo y agua
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        skyGrad.addColorStop(0, '#101426');
        skyGrad.addColorStop(0.7, '#1f2747');
        skyGrad.addColorStop(1, '#0a192f');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Rejilla de puntos sutil para modo construcción
        if (this.mode === 'build') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            for (let x = 40; x < this.width - 40; x += 20) {
                for (let y = 140; y < this.height - 60; y += 20) {
                    this.ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            }
        }

        // 2. Dibujar acantilados y terreno
        this.drawTerrain();

        // 2.5. Dibujar pistas del plano (Blueprint Guide)
        if (this.showBlueprint && this.mode === 'build') {
            this.drawBlueprint();
        }

        // 3. Dibujar vigas del puente
        this.drawBeams();

        // 4. Dibujar línea elástica al arrastrar en construcción
        if (this.isInteracting && this.dragStartNode) {
            this.drawDraftBeam();
        }

        // 5. Dibujar nodos (anclajes y articulaciones)
        this.drawNodes();

        // 6. Dibujar vehículo en simulación
        if (this.vehicle) {
            this.drawVehicle();
        }

        // 7. Partículas
        this.particles.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= 0.02;

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
            this.ctx.restore();

            if (p.life <= 0) this.particles.splice(idx, 1);
        });

        // 8. Agua en el fondo
        this.ctx.fillStyle = 'rgba(0, 180, 216, 0.35)';
        this.ctx.fillRect(0, this.height - 50, this.width, 50);
    }

    drawTerrain() {
        const lvl = this.levels[this.currentLevelIndex];
        this.ctx.save();

        // Acantilado izquierdo
        this.ctx.fillStyle = '#2b2d42';
        this.ctx.beginPath();
        this.ctx.moveTo(0, lvl.leftCliff.y);
        this.ctx.lineTo(lvl.leftCliff.x, lvl.leftCliff.y);
        this.ctx.lineTo(lvl.leftCliff.x - 30, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Borde de hierba izquierda
        this.ctx.fillStyle = '#06d6a0';
        this.ctx.fillRect(0, lvl.leftCliff.y - 4, lvl.leftCliff.x, 8);

        // Acantilado derecho
        this.ctx.fillStyle = '#2b2d42';
        this.ctx.beginPath();
        this.ctx.moveTo(lvl.rightCliff.x, lvl.rightCliff.y);
        this.ctx.lineTo(this.width, lvl.rightCliff.y);
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(lvl.rightCliff.x + 30, this.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Borde de hierba derecha
        this.ctx.fillStyle = '#06d6a0';
        this.ctx.fillRect(lvl.rightCliff.x, lvl.rightCliff.y - 4, this.width - lvl.rightCliff.x, 8);

        // Pilar central si existe en el nivel
        if (lvl.centralPillar) {
            const p = lvl.centralPillar;
            this.ctx.fillStyle = '#3d405b';
            this.ctx.fillRect(p.x - p.width / 2, p.y, p.width, p.height);
            this.ctx.fillStyle = '#81b29a';
            this.ctx.fillRect(p.x - p.width / 2, p.y, p.width, 6);
        }

        // Bandera de meta
        const flagX = lvl.goalX;
        const flagY = lvl.rightCliff.y - 30;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY + 30);
        this.ctx.lineTo(flagX, flagY);
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffbe0b';
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY);
        this.ctx.lineTo(flagX + 22, flagY + 8);
        this.ctx.lineTo(flagX, flagY + 16);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    drawBlueprint() {
        const lvl = this.levels[this.currentLevelIndex];
        if (!lvl.blueprint) return;

        this.ctx.save();
        lvl.blueprint.forEach(bp => {
            // Verificar si el jugador ya construyó una viga similar para ocultar esa pista
            const isBuilt = this.beams.some(b => {
                const nA = this.nodes.find(n => n.id === b.nodeAId);
                const nB = this.nodes.find(n => n.id === b.nodeBId);
                if (!nA || !nB) return false;
                const d1 = Math.hypot(nA.x - bp.a.x, nA.y - bp.a.y) + Math.hypot(nB.x - bp.b.x, nB.y - bp.b.y);
                const d2 = Math.hypot(nA.x - bp.b.x, nA.y - bp.b.y) + Math.hypot(nB.x - bp.a.x, nB.y - bp.a.y);
                return (d1 < 16 || d2 < 16) && b.type === bp.type;
            });

            if (isBuilt) return;

            // Dibujar línea punteada guía
            this.ctx.strokeStyle = bp.type === 'road' ? 'rgba(0, 245, 212, 0.45)' : 'rgba(251, 133, 0, 0.45)';
            this.ctx.lineWidth = bp.type === 'road' ? 4 : 2.5;
            this.ctx.setLineDash([6, 6]);
            this.ctx.beginPath();
            this.ctx.moveTo(bp.a.x, bp.a.y);
            this.ctx.lineTo(bp.b.x, bp.b.y);
            this.ctx.stroke();

            // Puntos guía transparentes
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            this.ctx.beginPath();
            this.ctx.arc(bp.a.x, bp.a.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(bp.b.x, bp.b.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    drawBeams() {
        this.beams.forEach(b => {
            if (b.broken) return;

            const nA = this.nodes.find(n => n.id === b.nodeAId);
            const nB = this.nodes.find(n => n.id === b.nodeBId);
            if (!nA || !nB) return;

            const ax = this.mode === 'simulating' && !nA.isAnchor ? nA.simX : nA.x;
            const ay = this.mode === 'simulating' && !nA.isAnchor ? nA.simY : nA.y;
            const bx = this.mode === 'simulating' && !nB.isAnchor ? nB.simX : nB.x;
            const by = this.mode === 'simulating' && !nB.isAnchor ? nB.simY : nB.y;

            this.ctx.save();

            // Color según tensión en simulación
            if (this.mode === 'simulating') {
                const s = Math.min(1, Math.max(0, b.stress));
                if (s < 0.4) {
                    this.ctx.strokeStyle = '#00f5d4'; // Verde azulado relajado
                } else if (s < 0.75) {
                    this.ctx.strokeStyle = '#ffbe0b'; // Amarillo esfuerzo medio
                } else {
                    this.ctx.strokeStyle = '#ff006e'; // Rojo tensión extrema
                    this.ctx.lineWidth = b.type === 'road' ? 9 : 6;
                }
            } else {
                this.ctx.strokeStyle = b.type === 'road' ? '#222738' : '#e07a5f';
            }

            this.ctx.lineWidth = b.type === 'road' ? 8 : 4.5;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(ax, ay);
            this.ctx.lineTo(bx, by);
            this.ctx.stroke();

            // Detalles de carretera (línea punteada amarilla)
            if (b.type === 'road' && this.mode !== 'simulating') {
                this.ctx.strokeStyle = '#ffbe0b';
                this.ctx.lineWidth = 1.5;
                this.ctx.setLineDash([4, 6]);
                this.ctx.beginPath();
                this.ctx.moveTo(ax, ay);
                this.ctx.lineTo(bx, by);
                this.ctx.stroke();
            }

            this.ctx.restore();
        });
    }

    drawDraftBeam() {
        const start = this.dragStartNode;
        const current = this.currentMousePos;
        const dist = Math.hypot(current.x - start.x, current.y - start.y);
        const tooLong = dist > 95;

        this.ctx.save();
        this.ctx.strokeStyle = tooLong ? '#ff006e' : (this.tool === 'road' ? '#222738' : '#e07a5f');
        this.ctx.lineWidth = this.tool === 'road' ? 7 : 4;
        this.ctx.setLineDash([6, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(current.x, current.y);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawNodes() {
        this.nodes.forEach(n => {
            const x = this.mode === 'simulating' && !n.isAnchor ? n.simX : n.x;
            const y = this.mode === 'simulating' && !n.isAnchor ? n.simY : n.y;

            this.ctx.save();
            if (n.isAnchor) {
                // Anclaje de roca fijo (oro/acero)
                this.ctx.fillStyle = '#ffbe0b';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 7, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                // Articulación dinámica
                this.ctx.fillStyle = n === this.hoverNode ? '#ff006e' : '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#0f1123';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }
            this.ctx.restore();
        });
    }

    drawVehicle() {
        const v = this.vehicle;
        this.ctx.save();
        this.ctx.translate(v.x, v.y);

        // Chasis del camión
        this.ctx.fillStyle = '#ff006e';
        this.ctx.beginPath();
        this.ctx.roundRect(-v.width / 2, -v.height / 2, v.width, v.height, 6);
        this.ctx.fill();

        // Cabina
        this.ctx.fillStyle = '#00f5d4';
        this.ctx.fillRect(v.width / 6, -v.height / 2 + 3, v.width / 3, v.height / 2);

        // Rueda trasera
        this.ctx.fillStyle = '#111';
        this.ctx.beginPath();
        this.ctx.arc(-v.width / 3, v.height / 2, v.wheelRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#aaa';
        this.ctx.beginPath();
        this.ctx.arc(-v.width / 3, v.height / 2, v.wheelRadius / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Rueda delantera
        this.ctx.fillStyle = '#111';
        this.ctx.beginPath();
        this.ctx.arc(v.width / 3, v.height / 2, v.wheelRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#aaa';
        this.ctx.beginPath();
        this.ctx.arc(v.width / 3, v.height / 2, v.wheelRadius / 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    startLoop() {
        const loop = () => {
            this.updatePhysics();
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    bindEvents() {
        // Eventos táctiles y ratón
        const onDown = (e) => {
            e.preventDefault();
            const pos = this.getCanvasCoords(e);
            this.handlePointerDown(pos);
        };
        const onMove = (e) => {
            e.preventDefault();
            const pos = this.getCanvasCoords(e);
            this.handlePointerMove(pos);
        };
        const onUp = (e) => {
            e.preventDefault();
            const pos = this.getCanvasCoords(e);
            this.handlePointerUp(pos);
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        this.canvas.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp, { passive: false });

        // Botones de herramientas
        document.getElementById('tool-road').addEventListener('click', () => {
            this.tool = 'road';
            this.updateUI();
        });
        document.getElementById('tool-wood').addEventListener('click', () => {
            this.tool = 'wood';
            this.updateUI();
        });
        document.getElementById('tool-delete').addEventListener('click', () => {
            this.tool = 'delete';
            this.updateUI();
        });

        // Botones de acción
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-clear').addEventListener('click', () => this.clear());

        // Botón Simular / Editar
        document.getElementById('btn-simulate').addEventListener('click', () => {
            if (this.mode === 'build') {
                this.startSimulation();
            } else {
                this.stopSimulation();
            }
        });

        // Botón en overlay de victoria / fallo
        document.getElementById('btn-overlay-next').addEventListener('click', () => {
            if (this.mode === 'victory') {
                const nextLvl = (this.currentLevelIndex + 1) % this.levels.length;
                this.initLevel(nextLvl);
            } else {
                this.stopSimulation();
            }
        });

        // Selector de nivel
        document.getElementById('btn-prev-lvl').addEventListener('click', () => {
            const nextLvl = (this.currentLevelIndex - 1 + this.levels.length) % this.levels.length;
            this.initLevel(nextLvl);
        });
        document.getElementById('btn-next-lvl').addEventListener('click', () => {
            const nextLvl = (this.currentLevelIndex + 1) % this.levels.length;
            this.initLevel(nextLvl);
        });

        // Sonido
        document.getElementById('btn-sound').addEventListener('click', () => {
            const en = window.bridgeAudio.toggle();
            document.getElementById('btn-sound').innerText = en ? '🔊' : '🔇';
        });

        // Alternar Pistas / Blueprint
        const toggleBpBtn = document.getElementById('btn-toggle-blueprint');
        if (toggleBpBtn) {
            toggleBpBtn.addEventListener('click', () => {
                this.showBlueprint = !this.showBlueprint;
                this.updateUI();
            });
        }

        // Modal de Guía y Tutorial
        const tutorialModal = document.getElementById('tutorial-modal');
        const openHelpBtn = document.getElementById('btn-tutorial-help');
        const closeHelpBtn = document.getElementById('btn-close-modal');
        const gotitHelpBtn = document.getElementById('btn-modal-gotit');

        if (openHelpBtn && tutorialModal) {
            openHelpBtn.addEventListener('click', () => {
                tutorialModal.classList.remove('hidden');
            });
        }

        const hideModal = () => {
            if (tutorialModal) tutorialModal.classList.add('hidden');
        };

        if (closeHelpBtn) closeHelpBtn.addEventListener('click', hideModal);
        if (gotitHelpBtn) gotitHelpBtn.addEventListener('click', hideModal);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.bridgeGame = new BridgeGame();
});
