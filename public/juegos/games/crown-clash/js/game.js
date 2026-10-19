// ============================================================
// CROWN CLASH: ARENA ROYALE - Motor del Juego (Estilo Clash Royale)
// ============================================================

const CARDS_DATA = [
    { id: 'titan', name: 'Titán de Roca', cost: 5, icon: '🛡️', type: 'troop', targetTowers: true, hp: 1600, speed: 40, damage: 110, rate: 1.4, range: 25, isFlying: false, desc: 'Tanque pesado que ataca solo torres' },
    { id: 'paladin', name: 'Paladín Real', cost: 3, icon: '🗡️', type: 'troop', targetTowers: false, hp: 650, speed: 65, damage: 85, rate: 1.1, range: 24, isFlying: false, desc: 'Guerrero equilibrado cuerpo a cuerpo' },
    { id: 'hunters', name: 'Cazadoras Elfas', cost: 3, icon: '🏹', type: 'troop', count: 2, targetTowers: false, hp: 180, speed: 60, damage: 42, rate: 0.9, range: 115, isFlying: false, desc: 'Dúo de tiradoras a distancia' },
    { id: 'dragon', name: 'Guiverno Alado', cost: 4, icon: '🐲', type: 'troop', targetTowers: false, hp: 750, speed: 70, damage: 70, rate: 1.3, range: 75, isFlying: true, splash: 45, desc: 'Vuela sobre el río y escupe fuego de área' },
    { id: 'swarm', name: 'Horda Espectral', cost: 3, icon: '💀', type: 'troop', count: 8, targetTowers: false, hp: 45, speed: 95, damage: 32, rate: 0.8, range: 18, isFlying: false, desc: 'Enjambre rápido letal contra tanques' },
    { id: 'wizard', name: 'Mago Arcano', cost: 5, icon: '🧙', type: 'troop', targetTowers: false, hp: 420, speed: 58, damage: 95, rate: 1.4, range: 105, isFlying: false, splash: 45, desc: 'Ataques de área que desintegran hordas' },
    { id: 'meteor', name: 'Meteorito Ígneo', cost: 4, icon: '🔥', type: 'spell', radius: 65, damage: 420, towerDamage: 160, desc: 'Hechizo explosivo de alto impacto' },
    { id: 'arrows', name: 'Lluvia Estelar', cost: 3, icon: '⚡', type: 'spell', radius: 95, damage: 180, towerDamage: 75, desc: 'Hechizo de área para limpiar enjambres' }
];

class CrownClashGame {
    constructor() {
        this.canvas = document.getElementById('crown-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.WIDTH = 480;
        this.HEIGHT = 680;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Geometría de la Arena
        this.riverY = 340;
        this.riverHeight = 30;
        this.leftBridgeX = 110;
        this.rightBridgeX = 370;
        this.bridgeWidth = 56;

        // Estado del Juego
        this.isRunning = false;
        this.isGameOver = false;
        this.matchTime = 180; // 3 minutos
        this.isDoubleElixir = false;
        this.playerCrowns = 0;
        this.enemyCrowns = 0;

        // Elixir (0 a 10)
        this.playerElixir = 5.0;
        this.enemyElixir = 5.0;

        // Torres (Azul = Jugador, Rojo = IA Enemiga)
        this.towers = [];
        this.initTowers();

        // Mazos y Cartas (Hand de 4 + 1 Next)
        this.playerDeck = [...CARDS_DATA];
        this.playerHand = [];
        this.playerNextCard = null;
        this.selectedCardIdx = 0;

        this.enemyDeck = [...CARDS_DATA];
        this.enemyAITimer = 0;

        // Entidades en el Campo
        this.units = [];
        this.projectiles = [];
        this.spells = [];
        this.particles = [];
        this.floatingTexts = [];

        this.initDom();
        this.bindEvents();
        this.initCards();
        this.updateHUD();
        this.renderMenu();
    }

    initTowers() {
        this.towers = [
            // Torres Jugador (Azul - Abajo)
            { id: 'p_left', team: 'blue', x: 110, y: 510, hp: 1400, maxHp: 1400, range: 120, rate: 0.8, timer: 0, isKing: false, name: 'Torre Izquierda' },
            { id: 'p_right', team: 'blue', x: 370, y: 510, hp: 1400, maxHp: 1400, range: 120, rate: 0.8, timer: 0, isKing: false, name: 'Torre Derecha' },
            { id: 'p_king', team: 'blue', x: 240, y: 590, hp: 2400, maxHp: 2400, range: 135, rate: 1.0, timer: 0, isKing: true, active: false, name: 'Torre del Rey' },

            // Torres Enemigas (Rojo - Arriba)
            { id: 'e_left', team: 'red', x: 110, y: 170, hp: 1400, maxHp: 1400, range: 120, rate: 0.8, timer: 0, isKing: false, name: 'Torre Rival Izquierda' },
            { id: 'e_right', team: 'red', x: 370, y: 170, hp: 1400, maxHp: 1400, range: 120, rate: 0.8, timer: 0, isKing: false, name: 'Torre Rival Derecha' },
            { id: 'e_king', team: 'red', x: 240, y: 90, hp: 2400, maxHp: 2400, range: 135, rate: 1.0, timer: 0, isKing: true, active: false, name: 'Torre del Rey Rival' }
        ];
    }

    initCards() {
        // Barajar mazo del jugador
        const shuffled = [...this.playerDeck].sort(() => 0.5 - Math.random());
        this.playerHand = shuffled.slice(0, 4);
        this.playerNextCard = shuffled[4];
        this.renderCardsUI();
    }

    initDom() {
        this.dom = {
            timerText: document.getElementById('match-timer'),
            crownsPlayer: document.getElementById('crowns-player'),
            crownsEnemy: document.getElementById('crowns-enemy'),
            elixirBarFill: document.getElementById('elixir-bar-fill'),
            elixirValText: document.getElementById('elixir-val-text'),
            cardsRow: document.getElementById('cards-hand-row'),
            nextCardPreview: document.getElementById('next-card-slot'),
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
        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.crownAudio.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
        });
        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.crownAudio.toggleSFX();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
        });

        // Click / Touch en el canvas para desplegar carta seleccionada
        const handleDeployClick = (clientX, clientY) => {
            if (!this.isRunning || this.isGameOver) return;
            const rect = this.canvas.getBoundingClientRect();
            const clickX = (clientX - rect.left) * (this.WIDTH / rect.width);
            const clickY = (clientY - rect.top) * (this.HEIGHT / rect.height);

            this.deploySelectedCard(clickX, clickY);
        };

        this.canvas.addEventListener('click', (e) => handleDeployClick(e.clientX, e.clientY));
        this.canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                handleDeployClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        });
    }

    start() {
        window.crownAudio.init();
        window.crownAudio.startMusic();

        this.isRunning = true;
        this.isGameOver = false;
        this.matchTime = 180;
        this.isDoubleElixir = false;
        this.playerCrowns = 0;
        this.enemyCrowns = 0;
        this.playerElixir = 5.0;
        this.enemyElixir = 5.0;
        this.selectedCardIdx = 0;

        this.initTowers();
        this.initCards();
        this.units = [];
        this.projectiles = [];
        this.spells = [];
        this.particles = [];
        this.floatingTexts = [];

        this.dom.overlay.classList.add('hidden');
        this.updateHUD();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    // ============================================================
    // GESTIÓN DE CARTAS Y DESPLIEGUE
    // ============================================================
    renderCardsUI() {
        this.dom.cardsRow.innerHTML = '';
        this.playerHand.forEach((card, idx) => {
            const btn = document.createElement('div');
            btn.className = `card-slot ${this.selectedCardIdx === idx ? 'selected' : ''}`;
            btn.innerHTML = `
                <span class="card-cost-badge">💧 ${card.cost}</span>
                <span class="card-icon">${card.icon}</span>
                <span class="card-name">${card.name}</span>
            `;
            btn.onclick = () => {
                this.selectedCardIdx = idx;
                this.renderCardsUI();
            };
            this.dom.cardsRow.appendChild(btn);
        });

        // Siguiente carta
        if (this.playerNextCard) {
            this.dom.nextCardPreview.innerHTML = `
                <small style="font-size:0.55rem; color:#ffd700;">SIGUIENTE</small>
                <span style="font-size:1.1rem;">${this.playerNextCard.icon}</span>
            `;
        }
    }

    deploySelectedCard(targetX, targetY) {
        const card = this.playerHand[this.selectedCardIdx];
        if (!card) return;

        // Comprobar elixir suficiente
        if (this.playerElixir < card.cost) {
            this.spawnFloatingText('¡Falta Elixir! 💧', this.WIDTH / 2, this.HEIGHT - 120, '#ff0055');
            return;
        }

        // Reglas de territorio para despliegue de tropas (no aplica a hechizos)
        if (card.type === 'troop') {
            const maxDeployY = this.riverY + 15;
            // Si destruyó la torre enemiga izquierda o derecha, puede desplegar más adelante en ese carril
            const leftDead = this.towers.find(t => t.id === 'e_left').hp <= 0;
            const rightDead = this.towers.find(t => t.id === 'e_right').hp <= 0;

            let allowed = (targetY >= maxDeployY);
            if (targetY < maxDeployY) {
                if (leftDead && targetX < this.WIDTH / 2 && targetY > 180) allowed = true;
                if (rightDead && targetX > this.WIDTH / 2 && targetY > 180) allowed = true;
            }

            if (!allowed) {
                this.spawnFloatingText('¡Territorio no permitido! ❌', targetX, targetY, '#ff0055');
                return;
            }
        }

        // Gastar Elixir
        this.playerElixir -= card.cost;
        window.crownAudio.playDeploy();

        // Ejecutar despliegue
        if (card.type === 'spell') {
            this.castSpell(card, targetX, targetY, 'blue');
        } else {
            this.spawnTroop(card, targetX, targetY, 'blue');
        }

        // Rotar carta jugada con la siguiente
        const playedCard = this.playerHand[this.selectedCardIdx];
        this.playerHand[this.selectedCardIdx] = this.playerNextCard;

        // Buscar otra carta del mazo para el slot de next
        const remaining = this.playerDeck.filter(c => !this.playerHand.includes(c));
        this.playerNextCard = remaining[Math.floor(Math.random() * remaining.length)] || playedCard;

        this.renderCardsUI();
        this.updateHUD();
    }

    spawnTroop(card, x, y, team) {
        const count = card.count || 1;
        for (let i = 0; i < count; i++) {
            const offsetX = (count > 1) ? (i % 2 === 0 ? -14 : 14) * (Math.floor(i / 2) + 1) * 0.7 : 0;
            const offsetY = (count > 1) ? (i % 2 === 0 ? -12 : 12) : 0;

            this.units.push({
                id: Math.random().toString(36).substring(2, 9),
                card,
                team,
                x: x + offsetX,
                y: y + offsetY,
                hp: card.hp,
                maxHp: card.hp,
                speed: card.speed,
                damage: card.damage,
                rate: card.rate,
                range: card.range,
                targetTowers: card.targetTowers,
                isFlying: card.isFlying,
                splash: card.splash || 0,
                attackTimer: 0,
                target: null
            });
        }
        this.spawnExplosion(x, y, (team === 'blue' ? '#00f7ff' : '#ff0055'), 12);
    }

    castSpell(card, x, y, team) {
        if (card.id === 'meteor') {
            window.crownAudio.playExplosion();
            this.spawnExplosion(x, y, '#ff5500', 35);
            this.damageArea(x, y, card.radius, card.damage, card.towerDamage, team);
        } else if (card.id === 'arrows') {
            window.crownAudio.playArrow();
            this.spawnExplosion(x, y, '#00f7ff', 25);
            this.damageArea(x, y, card.radius, card.damage, card.towerDamage, team);
        }
    }

    damageArea(x, y, radius, unitDamage, towerDamage, casterTeam) {
        // Dañar unidades enemigas en el radio
        this.units.forEach(u => {
            if (u.team !== casterTeam && Math.hypot(u.x - x, u.y - y) <= radius) {
                u.hp -= unitDamage;
                this.spawnFloatingText(`-${unitDamage}`, u.x, u.y - 10, '#ffd700');
            }
        });

        // Dañar torres enemigas en el radio
        this.towers.forEach(t => {
            if (t.team !== casterTeam && t.hp > 0 && Math.hypot(t.x - x, t.y - y) <= radius + 25) {
                t.hp -= towerDamage;
                this.spawnFloatingText(`-${towerDamage}`, t.x, t.y - 15, '#ffd700');
                if (t.hp <= 0) this.destroyTower(t);
            }
        });
    }

    // ============================================================
    // BUCLE PRINCIPAL (UPDATE & RENDER)
    // ============================================================
    loop(timestamp) {
        if (!this.isRunning) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        if (!this.isGameOver) {
            this.update(dt);
        }
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // 1. Temporizador del Partido y Doble Elixir
        this.matchTime = Math.max(0, this.matchTime - dt);
        if (this.matchTime <= 60 && !this.isDoubleElixir) {
            this.isDoubleElixir = true;
            window.crownAudio.playDoubleElixirBell();
            this.spawnFloatingText('¡DOBLE ELIXIR!', this.WIDTH / 2, this.HEIGHT / 2, '#d500f9', 26);
        }

        if (this.matchTime <= 0) {
            this.finishMatch();
            return;
        }

        // 2. Recarga de Elixir
        const elixirRate = this.isDoubleElixir ? 0.72 : 0.36; // ~2.8s por gota (o 1.4s en doble)
        this.playerElixir = Math.min(10, this.playerElixir + elixirRate * dt);
        this.enemyElixir = Math.min(10, this.enemyElixir + elixirRate * dt);

        // 3. IA Enemiga (Toma decisiones de despliegue)
        this.updateEnemyAI(dt);

        // 4. Actualizar Tropas
        this.updateUnits(dt);

        // 5. Actualizar Torres y sus Disparos
        this.updateTowers(dt);

        // 6. Proyectiles y Efectos
        this.updateProjectiles(dt);
        this.updateEffects(dt);

        this.updateHUD();
    }

    updateEnemyAI(dt) {
        this.enemyAITimer += dt;
        if (this.enemyAITimer >= 2.4 && this.enemyElixir >= 4) {
            this.enemyAITimer = 0;

            // Escoger carta aleatoria que pueda costear
            const affordable = this.enemyDeck.filter(c => c.cost <= this.enemyElixir);
            if (affordable.length === 0) return;

            const card = affordable[Math.floor(Math.random() * affordable.length)];
            this.enemyElixir -= card.cost;

            // Decidir carril: atacar torre con menos vida del jugador
            const targetLaneX = (this.towers[0].hp <= this.towers[1].hp) ? this.leftBridgeX : this.rightBridgeX;
            const spawnY = Math.random() * 80 + 120; // En su territorio

            if (card.type === 'spell') {
                // Lanzar hechizo a la torre más débil del jugador
                const targetTower = this.towers[0].hp > 0 ? this.towers[0] : this.towers[1];
                this.castSpell(card, targetTower.x, targetTower.y, 'red');
            } else {
                this.spawnTroop(card, targetLaneX + (Math.random() - 0.5) * 30, spawnY, 'red');
            }
        }
    }

    updateUnits(dt) {
        for (let i = this.units.length - 1; i >= 0; i--) {
            const u = this.units[i];

            // Buscar objetivo si no tiene o murió
            if (!u.target || (u.target.hp !== undefined && u.target.hp <= 0)) {
                u.target = this.findTargetForUnit(u);
            }

            if (!u.target) continue;

            const dist = Math.hypot(u.target.x - u.x, u.target.y - u.y);

            // Si está dentro del alcance de ataque
            if (dist <= u.range) {
                u.attackTimer += dt;
                if (u.attackTimer >= u.rate) {
                    u.attackTimer = 0;
                    this.executeUnitAttack(u);
                }
            } else {
                // Moverse hacia el objetivo atravesando puentes si es tropa terrestre
                this.moveUnitTowardTarget(u, dt);
            }

            // Eliminar si murió
            if (u.hp <= 0) {
                this.spawnExplosion(u.x, u.y, (u.team === 'blue' ? '#00f7ff' : '#ff0055'), 10);
                this.units.splice(i, 1);
            }
        }
    }

    executeUnitAttack(u) {
        const target = u.target;
        if (u.card.id === 'hunters') {
            window.crownAudio.playArrow();
            this.projectiles.push({ x1: u.x, y1: u.y, x2: target.x, y2: target.y, color: '#00ff88', life: 0.12 });
        } else if (u.card.id === 'dragon' || u.card.id === 'wizard') {
            window.crownAudio.playExplosion();
            this.projectiles.push({ x1: u.x, y1: u.y, x2: target.x, y2: target.y, color: '#ff5500', life: 0.14 });
            // Daño de área
            this.units.forEach(other => {
                if (other.team !== u.team && Math.hypot(other.x - target.x, other.y - target.y) <= u.splash) {
                    other.hp -= u.damage;
                }
            });
        } else {
            window.crownAudio.playSword();
        }

        target.hp -= u.damage;
        this.spawnFloatingText(`-${u.damage}`, target.x, target.y - 12, '#ffd700');

        if (target.hp <= 0 && target.name) {
            // Era una torre destruida
            this.destroyTower(target);
        }
    }

    moveUnitTowardTarget(u, dt) {
        let destX = u.target.x;
        let destY = u.target.y;

        // Si es terrestre y necesita cruzar el río
        if (!u.isFlying) {
            const needsToCrossRiver = (u.team === 'blue' && u.y > this.riverY && destY < this.riverY) ||
                                     (u.team === 'red' && u.y < this.riverY && destY > this.riverY);

            if (needsToCrossRiver) {
                // Enrutarse hacia el puente más cercano
                const bridgeX = (u.x < this.WIDTH / 2) ? this.leftBridgeX : this.rightBridgeX;
                if (Math.abs(u.y - this.riverY) > 10) {
                    destX = bridgeX;
                    destY = this.riverY + (u.team === 'blue' ? -8 : 8);
                }
            }
        }

        const angle = Math.atan2(destY - u.y, destX - u.x);
        u.x += Math.cos(angle) * u.speed * dt;
        u.y += Math.sin(angle) * u.speed * dt;
    }

    findTargetForUnit(u) {
        const enemyTeam = (u.team === 'blue') ? 'red' : 'blue';

        // Si es el Titán, busca solo torres enemigas vivas
        if (u.targetTowers) {
            return this.getClosestTower(u, enemyTeam);
        }

        // Buscar unidades enemigas cercanas en rango de visión (140px)
        const nearbyUnits = this.units.filter(other =>
            other.team === enemyTeam && other.hp > 0 && Math.hypot(other.x - u.x, other.y - u.y) < 140
        );

        if (nearbyUnits.length > 0) {
            nearbyUnits.sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
            return nearbyUnits[0];
        }

        // Si no hay unidades cerca, ataca la torre enemiga más cercana
        return this.getClosestTower(u, enemyTeam);
    }

    getClosestTower(u, enemyTeam) {
        const liveTowers = this.towers.filter(t => t.team === enemyTeam && t.hp > 0);
        if (liveTowers.length === 0) return null;

        // Las torres de princesa van primero; la torre del rey solo si no quedan de princesa o fue activada
        const princessTowers = liveTowers.filter(t => !t.isKing);
        const candidates = princessTowers.length > 0 ? princessTowers : liveTowers;

        candidates.sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
        return candidates[0];
    }

    updateTowers(dt) {
        this.towers.forEach(t => {
            if (t.hp <= 0) return;
            t.timer += dt;

            // La torre del rey solo dispara si fue atacada o si cayó una de sus torres de flanco
            if (t.isKing && !t.active) {
                const partnerDead = this.towers.some(other => other.team === t.team && !other.isKing && other.hp <= 0);
                if (t.hp < t.maxHp || partnerDead) {
                    t.active = true;
                }
            }

            if (t.isKing && !t.active) return;

            if (t.timer >= t.rate) {
                // Buscar unidad enemiga dentro del rango
                const target = this.units.find(u => u.team !== t.team && u.hp > 0 && Math.hypot(u.x - t.x, u.y - t.y) <= t.range);
                if (target) {
                    t.timer = 0;
                    const dmg = t.isKing ? 85 : 55;
                    target.hp -= dmg;
                    window.crownAudio.playCannon();

                    this.projectiles.push({
                        x1: t.x, y1: t.y - 15,
                        x2: target.x, y2: target.y,
                        color: t.team === 'blue' ? '#00f7ff' : '#ff0055',
                        life: 0.1
                    });
                }
            }
        });
    }

    destroyTower(tower) {
        window.crownAudio.playExplosion();
        window.crownAudio.playCrownCheer();
        this.spawnExplosion(tower.x, tower.y, '#ffd700', 30);

        if (tower.team === 'red') {
            this.playerCrowns++;
            this.spawnFloatingText('¡CORONA! 👑', tower.x, tower.y - 20, '#ffd700', 24);
        } else {
            this.enemyCrowns++;
            this.spawnFloatingText('¡CORONA PERDIDA! 👑', tower.x, tower.y - 20, '#ff0055', 24);
        }

        // Si fue la torre del rey, ¡KO directo!
        if (tower.isKing) {
            if (tower.team === 'red') this.playerCrowns = 3;
            else this.enemyCrowns = 3;
            this.finishMatch();
        }
    }

    finishMatch() {
        this.isGameOver = true;
        this.isRunning = false;

        const isWin = (this.playerCrowns > this.enemyCrowns);
        const isDraw = (this.playerCrowns === this.enemyCrowns);

        setTimeout(() => {
            if (isWin) {
                this.dom.overlayTitle.textContent = '¡VICTORIA REAL! 👑';
                this.dom.overlayDesc.innerHTML = `Coronas: <b style="color:#ffd700; font-size:1.5rem;">${this.playerCrowns} - ${this.enemyCrowns}</b><br>¡Has dominado la Arena Royale!`;
            } else if (isDraw) {
                this.dom.overlayTitle.textContent = '¡EMPATE ÉPICO!';
                this.dom.overlayDesc.innerHTML = `Coronas: <b>${this.playerCrowns} - ${this.enemyCrowns}</b><br>Gran defensa de ambos reyes.`;
            } else {
                this.dom.overlayTitle.textContent = '¡DERROTA!';
                this.dom.overlayDesc.innerHTML = `Coronas: <b>${this.playerCrowns} - ${this.enemyCrowns}</b><br>Tu Rey ha caído. ¡Revisa tu mazo de batalla!`;
            }
            this.dom.btnPlayOverlay.textContent = 'Jugar Otra Batalla 👑';
            this.dom.overlay.classList.remove('hidden');
        }, 800);
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            if (p.life <= 0) this.projectiles.splice(i, 1);
        }
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

    spawnExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 110 + 30;
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

    spawnFloatingText(text, x, y, color, size = 16) {
        this.floatingTexts.push({
            text, x, y, color, size,
            vy: -35,
            life: 0.75, maxLife: 0.75
        });
    }

    updateHUD() {
        const mins = Math.floor(this.matchTime / 60);
        const secs = Math.floor(this.matchTime % 60).toString().padStart(2, '0');
        this.dom.timerText.textContent = `${mins}:${secs}`;

        this.dom.crownsPlayer.textContent = `👑 ${this.playerCrowns}`;
        this.dom.crownsEnemy.textContent = `${this.enemyCrowns} 👑`;

        this.dom.elixirBarFill.style.width = `${Math.min(100, (this.playerElixir / 10) * 100)}%`;
        this.dom.elixirValText.textContent = `${Math.floor(this.playerElixir)} / 10`;

        if (this.isDoubleElixir) {
            this.dom.elixirBarFill.style.background = 'linear-gradient(90deg, #d500f9, #ff007f)';
            this.dom.timerText.style.color = '#ff007f';
        }
    }

    // ============================================================
    // RENDERIZADO VISUAL DE LA ARENA ROYALE
    // ============================================================
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        // 1. Césped de la Arena
        this.drawArenaGrass();

        // 2. Río y Puentes
        this.drawRiverAndBridges();

        // 3. Torres del Rey y de Princesa
        this.drawTowers();

        // 4. Tropas y Unidades
        this.drawUnits();

        // 5. Proyectiles
        this.drawProjectiles();

        // 6. Efectos y Textos Flotantes
        this.drawEffects();
    }

    drawArenaGrass() {
        const ctx = this.ctx;
        // Base verde vibrante
        ctx.fillStyle = '#43a047';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Rayas de césped cortado estilo estadio
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let y = 0; y < this.HEIGHT; y += 40) {
            if ((y / 40) % 2 === 0) {
                ctx.fillRect(0, y, this.WIDTH, 40);
            }
        }
    }

    drawRiverAndBridges() {
        const ctx = this.ctx;
        // Agua del río azul celeste
        ctx.fillStyle = '#0288d1';
        ctx.fillRect(0, this.riverY - this.riverHeight / 2, this.WIDTH, this.riverHeight);

        // Bordes de piedra del río
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(0, this.riverY - this.riverHeight / 2 - 3, this.WIDTH, 3);
        ctx.fillRect(0, this.riverY + this.riverHeight / 2, this.WIDTH, 3);

        // Puente Izquierdo y Derecho de Madera / Piedra
        [this.leftBridgeX, this.rightBridgeX].forEach(bx => {
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(bx - this.bridgeWidth / 2, this.riverY - this.riverHeight / 2 - 6, this.bridgeWidth, this.riverHeight + 12);

            // Tablones
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            for (let y = this.riverY - this.riverHeight / 2; y <= this.riverY + this.riverHeight / 2; y += 8) {
                ctx.beginPath();
                ctx.moveTo(bx - this.bridgeWidth / 2, y);
                ctx.lineTo(bx + this.bridgeWidth / 2, y);
                ctx.stroke();
            }
        });
    }

    drawTowers() {
        const ctx = this.ctx;
        this.towers.forEach(t => {
            if (t.hp <= 0) {
                // Escombros
                ctx.fillStyle = '#37474f';
                ctx.fillRect(t.x - 20, t.y - 15, 40, 25);
                return;
            }

            ctx.save();
            ctx.translate(t.x, t.y);

            // Base de la torre
            ctx.fillStyle = (t.team === 'blue') ? '#1e88e5' : '#e53935';
            const w = t.isKing ? 56 : 44;
            const h = t.isKing ? 50 : 40;

            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 3;
            ctx.strokeRect(-w / 2, -h / 2, w, h);

            // Corona o Cañón
            ctx.fillStyle = '#ffffff';
            ctx.font = t.isKing ? '22px sans-serif' : '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.isKing ? '👑' : '🏰', 0, 6);

            // Barra de vida de la torre
            const barW = w + 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -h / 2 - 12, barW, 6);
            ctx.fillStyle = (t.hp / t.maxHp > 0.35) ? '#00e676' : '#ff1744';
            ctx.fillRect(-barW / 2, -h / 2 - 12, barW * (t.hp / t.maxHp), 6);

            ctx.restore();
        });
    }

    drawUnits() {
        const ctx = this.ctx;
        // Ordenar por coordenada Y para profundidad
        const sorted = [...this.units].sort((a, b) => a.y - b.y);

        sorted.forEach(u => {
            ctx.save();
            ctx.translate(u.x, u.y);

            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 4, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Círculo de equipo (Azul o Rojo)
            ctx.fillStyle = (u.team === 'blue') ? '#00e5ff' : '#ff1744';
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();

            // Emoji / Icono de la unidad
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(u.card.icon, 0, 5);

            // Barra de vida de la unidad
            if (u.hp < u.maxHp) {
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(-12, -18, 24, 3);
                ctx.fillStyle = '#00e676';
                ctx.fillRect(-12, -18, 24 * (u.hp / u.maxHp), 3);
            }

            ctx.restore();
        });
    }

    drawProjectiles() {
        const ctx = this.ctx;
        this.projectiles.forEach(p => {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.x1, p.y1);
            ctx.lineTo(p.x2, p.y2);
            ctx.stroke();
        });
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
            ctx.font = `bold ${ft.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
        });
    }

    renderMenu() {
        this.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.crownGame = new CrownClashGame();
});
