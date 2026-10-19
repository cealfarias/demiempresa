// ============================================================
// GALAXY CLASH: HERO WARS - Motor Isométrico 2.5D Estilo Clash of Clans
// ============================================================

const BUILDINGS = {
    command: { name: 'Centro de Mando', hp: 900, size: 2, icon: '🏛️', color: '#00f7ff', desc: 'Edificio central de la base' },
    harvester: { name: 'Extractor Kyber', hp: 350, size: 1, icon: '⚡', color: '#d500f9', rate: 4, desc: 'Genera cristales de energía Kyber' },
    refinery: { name: 'Refinería Beskar', hp: 380, size: 1, icon: '🪙', color: '#ffd700', rate: 5, desc: 'Genera créditos galácticos' },
    turret: { name: 'Torreta Turboláser', hp: 450, size: 1, icon: '💥', color: '#ff0055', range: 4.8, damage: 24, rate: 0.65, desc: 'Defensa con disparo continuo' },
    cannon: { name: 'Cañón Pesado de Iones', hp: 550, size: 1, icon: '🛡️', color: '#00e5ff', range: 5.5, damage: 48, rate: 1.2, desc: 'Cañón de largo alcance' },
    wall: { name: 'Muro de Escudo', hp: 600, size: 1, icon: '🧱', color: '#546e7a', desc: 'Blindaje perimetral reforzado' }
};

const TROOP_CONFIG = {
    trooper: { name: 'Soldado de Asalto', hp: 80, speed: 1.2, damage: 16, range: 2.8, count: 12, icon: '🪖', color: '#ffffff', type: 'ranged' },
    saber: { name: 'Caballero del Sable', hp: 150, speed: 1.6, damage: 38, range: 0.9, count: 6, icon: '⚔️', color: '#00f7ff', type: 'melee' },
    walker: { name: 'Meca Caminante', hp: 650, speed: 0.75, damage: 32, range: 2.2, count: 3, icon: '🤖', color: '#90a4ae', targetDefenses: true, type: 'tank' },
    bomber: { name: 'Droide Detonador', hp: 60, speed: 2.2, damage: 350, range: 0.8, count: 4, icon: '💣', color: '#ff9100', targetWalls: true, type: 'suicide' },
    hero: { name: 'Lord Drakon (Héroe)', hp: 1200, speed: 1.35, damage: 75, range: 1.1, count: 1, icon: '👑', color: '#ff0033', isHero: true, type: 'hero' }
};

class GalaxyClashGame {
    constructor() {
        this.canvas = document.getElementById('clash-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.WIDTH = 540;
        this.HEIGHT = 720;
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        // Proyección Isométrica
        this.GRID_SIZE = 14;
        this.tileW = 48;
        this.tileH = 26;
        this.originX = this.WIDTH / 2;
        this.originY = 160;

        // Modos: 'base' (Mi Aldea) o 'battle' (Asalto Enemigo)
        this.mode = 'base';

        // Recursos del Jugador
        this.credits = parseInt(localStorage.getItem('galaxy_credits') || '500', 10);
        this.kyber = parseInt(localStorage.getItem('galaxy_kyber') || '350', 10);
        this.baseLevel = parseInt(localStorage.getItem('galaxy_level') || '1', 10);

        // Estructuras de la Base del Jugador
        this.playerBuildings = [];
        this.initDefaultPlayerBase();

        // Estado de Batalla
        this.enemyBuildings = [];
        this.troops = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.selectedTroopType = 'trooper';
        this.availableTroops = {};
        this.heroSuperUsed = false;

        // Porcentaje y Estrellas de Batalla
        this.destructionPct = 0;
        this.stars = 0;
        this.totalEnemyHp = 0;
        this.currentEnemyHp = 0;
        this.battleEnded = false;
        this.battleTimer = 120; // 2 minutos

        // Herramienta de Construcción en Modo Base
        this.selectedBuildTool = null;

        this.initDom();
        this.bindEvents();
        this.updateHUD();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    initDefaultPlayerBase() {
        const saved = localStorage.getItem('galaxy_base_buildings');
        if (saved) {
            try {
                this.playerBuildings = JSON.parse(saved);
                return;
            } catch (e) {}
        }

        // Base inicial por defecto
        this.playerBuildings = [
            { type: 'command', gx: 6, gy: 6, level: 1, hp: 900, maxHp: 900 },
            { type: 'harvester', gx: 4, gy: 6, level: 1, hp: 350, maxHp: 350 },
            { type: 'refinery', gx: 8, gy: 6, level: 1, hp: 380, maxHp: 380 },
            { type: 'turret', gx: 5, gy: 4, level: 1, hp: 450, maxHp: 450 },
            { type: 'cannon', gx: 7, gy: 8, level: 1, hp: 550, maxHp: 550 },
            // Muros protectores
            { type: 'wall', gx: 4, gy: 4, level: 1, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 5, gy: 4, level: 1, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 6, gy: 4, level: 1, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 7, gy: 4, level: 1, hp: 600, maxHp: 600 }
        ];
        this.saveBase();
    }

    saveBase() {
        localStorage.setItem('galaxy_base_buildings', JSON.stringify(this.playerBuildings));
        localStorage.setItem('galaxy_credits', this.credits.toString());
        localStorage.setItem('galaxy_kyber', this.kyber.toString());
        localStorage.setItem('galaxy_level', this.baseLevel.toString());
    }

    initDom() {
        this.dom = {
            creditsVal: document.getElementById('credits-val'),
            kyberVal: document.getElementById('kyber-val'),
            modeTitle: document.getElementById('mode-title'),
            btnSwitchMode: document.getElementById('btn-switch-mode'),
            baseControls: document.getElementById('base-controls'),
            battleBar: document.getElementById('battle-bar'),
            heroSuperBtn: document.getElementById('btn-hero-super'),
            destructionText: document.getElementById('destruction-text'),
            starsDisplay: document.getElementById('stars-display'),
            timerDisplay: document.getElementById('battle-timer'),
            overlay: document.getElementById('game-overlay'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayDesc: document.getElementById('overlay-desc'),
            btnPlayOverlay: document.getElementById('btn-play-overlay'),
            btnMusic: document.getElementById('btn-music'),
            btnSound: document.getElementById('btn-sound')
        };
    }

    bindEvents() {
        this.dom.btnPlayOverlay.addEventListener('click', () => {
            this.dom.overlay.classList.add('hidden');
        });

        this.dom.btnSwitchMode.addEventListener('click', () => {
            if (this.mode === 'base') {
                this.enterBattleMode();
            } else {
                this.returnToBaseMode();
            }
        });

        this.dom.heroSuperBtn.addEventListener('click', () => this.triggerHeroSuper());

        this.dom.btnMusic.addEventListener('click', () => {
            const enabled = window.galaxyAudio.toggleMusic();
            this.dom.btnMusic.textContent = enabled ? '🎵' : '🔇';
        });

        this.dom.btnSound.addEventListener('click', () => {
            const enabled = window.galaxyAudio.toggleSFX();
            this.dom.btnSound.textContent = enabled ? '🔊' : '🔇';
        });

        // Selección de Tropa para Despliegue en Batalla
        const troopBtns = document.querySelectorAll('.deploy-btn');
        troopBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                troopBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTroopType = btn.getAttribute('data-troop');
            });
        });

        // Click / Touch en el Mapa Isométrico
        const handleMapTap = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = (clientX - rect.left) * (this.WIDTH / rect.width);
            const clickY = (clientY - rect.top) * (this.HEIGHT / rect.height);

            const gridPos = this.screenToGrid(clickX, clickY);

            if (this.mode === 'battle') {
                // Desplegar tropa en batalla
                this.deployTroopAt(gridPos.gx, gridPos.gy);
            } else {
                // Modo Base: Recolectar recursos o construir
                this.handleBaseClick(gridPos.gx, gridPos.gy);
            }
        };

        this.canvas.addEventListener('click', (e) => handleMapTap(e.clientX, e.clientY));
        this.canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                handleMapTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        });
    }

    // ============================================================
    // CONVERSIÓN DE COORDENADAS ISOMÉTRICAS 2.5D
    // ============================================================
    gridToScreen(gx, gy) {
        const sx = this.originX + (gx - gy) * (this.tileW / 2);
        const sy = this.originY + (gx + gy) * (this.tileH / 2);
        return { x: sx, y: sy };
    }

    screenToGrid(sx, sy) {
        const dx = sx - this.originX;
        const dy = sy - this.originY;
        const gx = (dx / (this.tileW / 2) + dy / (this.tileH / 2)) / 2;
        const gy = (dy / (this.tileH / 2) - dx / (this.tileW / 2)) / 2;
        return { gx, gy };
    }

    // ============================================================
    // MODO ALDEA: GESTIÓN Y CONSTRUCCIÓN
    // ============================================================
    handleBaseClick(gx, gy) {
        const intGx = Math.round(gx);
        const intGy = Math.round(gy);

        // Buscar si tocó un extractor de recursos
        const clicked = this.playerBuildings.find(b =>
            Math.abs(b.gx - intGx) <= 0.5 && Math.abs(b.gy - intGy) <= 0.5
        );

        if (clicked) {
            if (clicked.type === 'harvester') {
                this.kyber += 60;
                this.spawnFloatingText('+60 Kyber ⚡', this.gridToScreen(clicked.gx, clicked.gy).x, this.gridToScreen(clicked.gx, clicked.gy).y - 20, '#d500f9');
                window.galaxyAudio.playVictoryStar();
            } else if (clicked.type === 'refinery') {
                this.credits += 75;
                this.spawnFloatingText('+75 Créditos 🪙', this.gridToScreen(clicked.gx, clicked.gy).x, this.gridToScreen(clicked.gx, clicked.gy).y - 20, '#ffd700');
                window.galaxyAudio.playVictoryStar();
            } else if (clicked.type === 'command') {
                // Mejorar Base
                const upgradeCost = this.baseLevel * 250;
                if (this.credits >= upgradeCost && this.kyber >= upgradeCost) {
                    this.credits -= upgradeCost;
                    this.kyber -= upgradeCost;
                    this.baseLevel++;
                    this.spawnFloatingText(`¡Base Nivel ${this.baseLevel}! 🏛️`, this.WIDTH / 2, this.HEIGHT / 2, '#00f7ff', 22);
                    window.galaxyAudio.playVictoryStar();
                } else {
                    this.spawnFloatingText(`Mejora: ${upgradeCost} 🪙 / ${upgradeCost} ⚡`, this.WIDTH / 2, this.HEIGHT / 2, '#ff0055');
                }
            }
            this.saveBase();
            this.updateHUD();
        }
    }

    // ============================================================
    // MODO BATALLA: ASALTO A BASE ENEMIGA
    // ============================================================
    enterBattleMode() {
        this.mode = 'battle';
        window.galaxyAudio.init();
        window.galaxyAudio.startMusic();
        window.galaxyAudio.playSaberIgnition();

        this.dom.baseControls.classList.add('hidden');
        this.dom.battleBar.classList.remove('hidden');
        this.dom.modeTitle.textContent = 'ASALTO A BASE IMPERIAL';
        this.dom.btnSwitchMode.textContent = '🏳️ Rendirse / Salir';

        // Inicializar tropas disponibles para el combate
        this.availableTroops = {
            trooper: TROOP_CONFIG.trooper.count,
            saber: TROOP_CONFIG.saber.count,
            walker: TROOP_CONFIG.walker.count,
            bomber: TROOP_CONFIG.bomber.count,
            hero: TROOP_CONFIG.hero.count
        };
        this.updateTroopCountsUI();

        this.troops = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.destructionPct = 0;
        this.stars = 0;
        this.battleEnded = false;
        this.heroSuperUsed = false;
        this.battleTimer = 120;
        this.dom.heroSuperBtn.disabled = true;

        // Generar base enemiga de la campaña
        this.generateEnemyBase();
        this.updateBattleHUD();
    }

    generateEnemyBase() {
        this.enemyBuildings = [
            { type: 'command', gx: 6.5, gy: 6.5, hp: 1000, maxHp: 1000 },
            { type: 'harvester', gx: 4.5, gy: 5, hp: 380, maxHp: 380 },
            { type: 'refinery', gx: 8.5, gy: 5, hp: 400, maxHp: 400 },
            { type: 'turret', gx: 5, gy: 8, hp: 480, maxHp: 480, timer: 0 },
            { type: 'turret', gx: 8, gy: 8, hp: 480, maxHp: 480, timer: 0 },
            { type: 'cannon', gx: 6.5, gy: 4, hp: 550, maxHp: 550, timer: 0 },
            // Perímetro de muros
            { type: 'wall', gx: 3.5, gy: 4, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 4.5, gy: 4, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 8.5, gy: 4, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 9.5, gy: 4, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 3.5, gy: 9, hp: 600, maxHp: 600 },
            { type: 'wall', gx: 9.5, gy: 9, hp: 600, maxHp: 600 }
        ];

        this.totalEnemyHp = this.enemyBuildings.reduce((sum, b) => sum + b.maxHp, 0);
        this.currentEnemyHp = this.totalEnemyHp;
    }

    deployTroopAt(gx, gy) {
        if (this.battleEnded) return;

        // Validar que esté fuera del perímetro rojo interior (debe estar en el borde del mapa)
        if (gx > 2.5 && gx < 10.5 && gy > 2.5 && gy < 10.5) {
            this.spawnFloatingText('¡Zona restringida! Despliega afuera ❌', this.WIDTH / 2, this.HEIGHT / 2, '#ff0055');
            return;
        }

        const type = this.selectedTroopType;
        if (this.availableTroops[type] <= 0) return;

        this.availableTroops[type]--;
        this.updateTroopCountsUI();

        const config = TROOP_CONFIG[type];
        const troop = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            config,
            gx, gy,
            hp: config.hp,
            maxHp: config.hp,
            speed: config.speed,
            damage: config.damage,
            range: config.range,
            target: null,
            attackTimer: 0,
            angle: 0
        };

        this.troops.push(troop);

        if (type === 'hero') {
            window.galaxyAudio.playSaberIgnition();
            this.dom.heroSuperBtn.disabled = false;
        } else if (type === 'saber') {
            window.galaxyAudio.playSaberSwing();
        } else {
            window.galaxyAudio.playBlaster(false);
        }

        const pos = this.gridToScreen(gx, gy);
        this.spawnExplosion(pos.x, pos.y, config.color, 8);
    }

    triggerHeroSuper() {
        if (this.heroSuperUsed || this.battleEnded) return;
        const hero = this.troops.find(t => t.type === 'hero');
        if (!hero) return;

        this.heroSuperUsed = true;
        this.dom.heroSuperBtn.disabled = true;
        window.galaxyAudio.playForcePower();

        // 1. Curación instantánea
        hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.4);

        // 2. Onda de choque destructiva de la Fuerza a edificios cercanos
        this.enemyBuildings.forEach(b => {
            const dist = Math.hypot(b.gx - hero.gx, b.gy - hero.gy);
            if (dist < 4) {
                b.hp -= 280;
                const bPos = this.gridToScreen(b.gx, b.gy);
                this.spawnFloatingText('¡IMPACTO DE LA FUERZA! -280', bPos.x, bPos.y - 15, '#ff0033', 18);
                if (b.hp <= 0) this.destroyBuilding(b);
            }
        });

        // 3. Invocar 3 Soldados Élite de escolta
        for (let i = 0; i < 3; i++) {
            this.troops.push({
                id: Math.random().toString(36).substring(2, 9),
                type: 'trooper',
                config: TROOP_CONFIG.trooper,
                gx: hero.gx + (Math.random() - 0.5) * 1.5,
                gy: hero.gy + (Math.random() - 0.5) * 1.5,
                hp: 120, maxHp: 120,
                speed: 1.4, damage: 25, range: 2.8,
                target: null, attackTimer: 0, angle: 0
            });
        }

        const hPos = this.gridToScreen(hero.gx, hero.gy);
        this.spawnFloatingText('¡FURIA DE LA FUERZA! ⚡', hPos.x, hPos.y - 30, '#ff0033', 24);
        this.spawnExplosion(hPos.x, hPos.y, '#ff0033', 35);
    }

    updateBattle(dt) {
        this.battleTimer = Math.max(0, this.battleTimer - dt);
        if (this.battleTimer <= 0 && !this.battleEnded) {
            this.finishBattle('timeout');
            return;
        }

        // 1. IA de Tropas Atacantes
        for (let i = this.troops.length - 1; i >= 0; i--) {
            const tr = this.troops[i];

            // Buscar objetivo si no tiene o fue destruido
            if (!tr.target || tr.target.hp <= 0) {
                tr.target = this.findBestTarget(tr);
            }

            if (!tr.target) continue;

            const dist = Math.hypot(tr.target.gx - tr.gx, tr.target.gy - tr.gy);

            if (dist <= tr.range) {
                // Atacar objetivo
                tr.attackTimer += dt;
                if (tr.attackTimer >= 0.75) {
                    tr.attackTimer = 0;
                    tr.target.hp -= tr.damage;

                    const tPos = this.gridToScreen(tr.target.gx, tr.target.gy);
                    if (tr.type === 'hero' || tr.type === 'saber') {
                        window.galaxyAudio.playSaberSwing();
                        this.spawnExplosion(tPos.x, tPos.y, tr.config.color, 6);
                    } else {
                        window.galaxyAudio.playBlaster(false);
                    }

                    // Suicida (Droide Detonador)
                    if (tr.type === 'bomber') {
                        window.galaxyAudio.playBuildingExplosion();
                        this.spawnExplosion(tPos.x, tPos.y, '#ff9100', 30);
                        tr.hp = 0;
                    }

                    if (tr.target.hp <= 0) {
                        this.destroyBuilding(tr.target);
                        tr.target = null;
                    }
                }
            } else {
                // Moverse hacia el objetivo
                const angle = Math.atan2(tr.target.gy - tr.gy, tr.target.gx - tr.gx);
                tr.gx += Math.cos(angle) * tr.speed * dt;
                tr.gy += Math.sin(angle) * tr.speed * dt;
                tr.angle = angle;
            }

            // Eliminar si murió
            if (tr.hp <= 0) {
                this.troops.splice(i, 1);
            }
        }

        // 2. IA de Defensas Enemigas (Torretas y Cañones)
        this.enemyBuildings.forEach(b => {
            if (b.type !== 'turret' && b.type !== 'cannon') return;
            b.timer = (b.timer || 0) + dt;

            const config = BUILDINGS[b.type];
            if (b.timer >= config.rate && this.troops.length > 0) {
                // Buscar tropa más cercana
                let nearest = null;
                let minDist = config.range;
                this.troops.forEach(tr => {
                    const dist = Math.hypot(tr.gx - b.gx, tr.gy - b.gy);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = tr;
                    }
                });

                if (nearest) {
                    b.timer = 0;
                    nearest.hp -= config.damage;
                    window.galaxyAudio.playTurbolaser();

                    const bPos = this.gridToScreen(b.gx, b.gy);
                    const trPos = this.gridToScreen(nearest.gx, nearest.gy);
                    this.projectiles.push({
                        x1: bPos.x, y1: bPos.y - 25,
                        x2: trPos.x, y2: trPos.y - 10,
                        color: config.color,
                        life: 0.12
                    });

                    if (nearest.hp <= 0) {
                        this.spawnExplosion(trPos.x, trPos.y, nearest.config.color, 12);
                    }
                }
            }
        });

        // 3. Proyectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            if (p.life <= 0) this.projectiles.splice(i, 1);
        }

        // 4. Chequeo de Victoria o Fin de Tropas
        const aliveBuildings = this.enemyBuildings.filter(b => b.hp > 0 && b.type !== 'wall');
        if (aliveBuildings.length === 0 && !this.battleEnded) {
            this.finishBattle('win');
        } else if (this.troops.length === 0 && this.allTroopsSpent() && !this.battleEnded) {
            this.finishBattle('defeat');
        }

        this.updateBattleHUD();
    }

    findBestTarget(troop) {
        const alive = this.enemyBuildings.filter(b => b.hp > 0);
        if (alive.length === 0) return null;

        // Los Mecas buscan defensas primero
        if (troop.config.targetDefenses) {
            const defenses = alive.filter(b => b.type === 'turret' || b.type === 'cannon');
            if (defenses.length > 0) {
                return this.getClosestBuilding(troop, defenses);
            }
        }

        // Los Droides buscan muros primero
        if (troop.config.targetWalls) {
            const walls = alive.filter(b => b.type === 'wall');
            if (walls.length > 0) {
                return this.getClosestBuilding(troop, walls);
            }
        }

        // Demás tropas: edificio más cercano que no sea muro a menos que bloquee
        const nonWalls = alive.filter(b => b.type !== 'wall');
        if (nonWalls.length > 0) {
            return this.getClosestBuilding(troop, nonWalls);
        }
        return this.getClosestBuilding(troop, alive);
    }

    getClosestBuilding(troop, list) {
        let nearest = list[0];
        let minDist = 999;
        list.forEach(b => {
            const dist = Math.hypot(b.gx - troop.gx, b.gy - troop.gy);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        });
        return nearest;
    }

    destroyBuilding(b) {
        window.galaxyAudio.playBuildingExplosion();
        const bPos = this.gridToScreen(b.gx, b.gy);
        this.spawnExplosion(bPos.x, bPos.y, BUILDINGS[b.type].color, 24);

        // Recalcular porcentaje de destrucción
        const remainingHp = this.enemyBuildings.reduce((sum, item) => sum + Math.max(0, item.hp), 0);
        this.destructionPct = Math.round(((this.totalEnemyHp - remainingHp) / this.totalEnemyHp) * 100);

        // Chequear estrellas
        if (this.destructionPct >= 50 && this.stars < 1) {
            this.stars = 1;
            window.galaxyAudio.playVictoryStar();
        }
        if (b.type === 'command' && this.stars < 2) {
            this.stars = Math.max(this.stars, 2);
            window.galaxyAudio.playVictoryStar();
        }
        if (this.destructionPct >= 100) {
            this.stars = 3;
            window.galaxyAudio.playVictoryStar();
        }
    }

    allTroopsSpent() {
        return Object.values(this.availableTroops).every(val => val === 0);
    }

    finishBattle(reason) {
        this.battleEnded = true;
        const lootedCredits = Math.round(this.destructionPct * 4.5);
        const lootedKyber = Math.round(this.destructionPct * 3.5);

        this.credits += lootedCredits;
        this.kyber += lootedKyber;
        this.saveBase();

        setTimeout(() => {
            let starsStr = '⭐'.repeat(this.stars);
            if (this.stars === 0) starsStr = 'Sin Estrellas';

            this.dom.overlayTitle.textContent = (this.stars >= 1) ? '¡VICTORIA GALÁCTICA!' : '¡ATAQUE REPELIDO!';
            this.dom.overlayDesc.innerHTML = `
                Estrellas: <b style="font-size:1.4rem; color:#ffd700;">${starsStr}</b><br>
                Destrucción: <b>${this.destructionPct}%</b><br>
                Botín Saqueado: <b style="color:#ffd700;">+${lootedCredits} 🪙</b> &bull; <b style="color:#d500f9;">+${lootedKyber} ⚡</b>
            `;
            this.dom.btnPlayOverlay.textContent = 'Volver a Mi Base 🏛️';
            this.dom.btnPlayOverlay.onclick = () => {
                this.dom.overlay.classList.add('hidden');
                this.returnToBaseMode();
            };
            this.dom.overlay.classList.remove('hidden');
        }, 800);
    }

    returnToBaseMode() {
        this.mode = 'base';
        this.dom.battleBar.classList.add('hidden');
        this.dom.baseControls.classList.remove('hidden');
        this.dom.modeTitle.textContent = 'MI BASE GALÁCTICA';
        this.dom.btnSwitchMode.textContent = '⚔️ Atacar Base Rival';
        this.updateHUD();
    }

    updateTroopCountsUI() {
        Object.keys(this.availableTroops).forEach(type => {
            const el = document.getElementById(`count-${type}`);
            if (el) el.textContent = `x${this.availableTroops[type]}`;
        });
    }

    updateBattleHUD() {
        this.dom.destructionText.textContent = `${this.destructionPct}%`;
        let starsStr = '';
        for (let i = 0; i < 3; i++) {
            starsStr += (i < this.stars) ? '⭐' : '☆';
        }
        this.dom.starsDisplay.textContent = starsStr;

        const mins = Math.floor(this.battleTimer / 60);
        const secs = Math.floor(this.battleTimer % 60).toString().padStart(2, '0');
        this.dom.timerDisplay.textContent = `${mins}:${secs}`;
    }

    updateHUD() {
        this.dom.creditsVal.textContent = this.credits;
        this.dom.kyberVal.textContent = this.kyber;
    }

    // ============================================================
    // BUCLE PRINCIPAL (UPDATE & RENDER)
    // ============================================================
    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        if (this.mode === 'battle') {
            this.updateBattle(dt);
        }
        this.updateEffects(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
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
            const speed = Math.random() * 120 + 30;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1.5,
                color,
                life: 0.4, maxLife: 0.4
            });
        }
    }

    spawnFloatingText(text, x, y, color, size = 16) {
        this.floatingTexts.push({
            text, x, y, color, size,
            vy: -35,
            life: 0.8, maxLife: 0.8
        });
    }

    // ============================================================
    // RENDERIZADO VISUAL ISOMÉTRICO 2.5D
    // ============================================================
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        // 1. Terreno Galáctico (Suelo del planeta)
        this.drawTerrain();

        // 2. Perímetro rojo de despliegue si está en batalla
        if (this.mode === 'battle') {
            this.drawDeployPerimeter();
        }

        // 3. Estructuras y Tropas ordenadas por profundidad Y (Z-sorting)
        this.drawWorldEntities();

        // 4. Proyectiles Láser
        this.drawProjectiles();

        // 5. Partículas y Efectos
        this.drawEffects();
    }

    drawTerrain() {
        const ctx = this.ctx;
        // Fondo espacial / superficie desértica
        ctx.fillStyle = '#0b0c16';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Cuadrícula Isométrica
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.08)';
        ctx.lineWidth = 1;

        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const p1 = this.gridToScreen(x, y);
                const p2 = this.gridToScreen(x + 1, y);
                const p3 = this.gridToScreen(x + 1, y + 1);
                const p4 = this.gridToScreen(x, y + 1);

                ctx.fillStyle = ((x + y) % 2 === 0) ? 'rgba(18, 22, 38, 0.85)' : 'rgba(14, 18, 32, 0.85)';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    drawDeployPerimeter() {
        const ctx = this.ctx;
        // Borde rojo punteado
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);

        const p1 = this.gridToScreen(2.5, 2.5);
        const p2 = this.gridToScreen(10.5, 2.5);
        const p3 = this.gridToScreen(10.5, 10.5);
        const p4 = this.gridToScreen(2.5, 10.5);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawWorldEntities() {
        const ctx = this.ctx;
        const currentBuildings = (this.mode === 'battle') ? this.enemyBuildings : this.playerBuildings;

        // Unir edificios y tropas en una lista para ordenamiento por profundidad
        const renderList = [];

        currentBuildings.forEach(b => {
            if (b.hp > 0) {
                renderList.push({ type: 'building', entity: b, sortY: b.gx + b.gy });
            }
        });

        if (this.mode === 'battle') {
            this.troops.forEach(t => {
                if (t.hp > 0) {
                    renderList.push({ type: 'troop', entity: t, sortY: t.gx + t.gy });
                }
            });
        }

        renderList.sort((a, b) => a.sortY - b.sortY);

        renderList.forEach(item => {
            if (item.type === 'building') {
                this.drawBuilding(item.entity);
            } else {
                this.drawTroop(item.entity);
            }
        });
    }

    drawBuilding(b) {
        const ctx = this.ctx;
        const pos = this.gridToScreen(b.gx, b.gy);
        const config = BUILDINGS[b.type];

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Sombra de la estructura
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        if (b.type === 'wall') {
            // Muro de Escudo Isométrico
            ctx.fillStyle = '#37474f';
            ctx.fillRect(-12, -18, 24, 18);
            ctx.fillStyle = '#00f7ff';
            ctx.fillRect(-10, -16, 20, 4); // Neón de escudo
        } else if (b.type === 'command') {
            // Centro de Mando Galáctico
            ctx.fillStyle = '#1c223a';
            ctx.fillRect(-26, -45, 52, 45);
            ctx.fillStyle = '#00f7ff';
            ctx.shadowColor = '#00f7ff';
            ctx.shadowBlur = 15;
            ctx.fillRect(-18, -35, 36, 12);
            ctx.shadowBlur = 0;
            // Antena / Cúpula
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -50, 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (b.type === 'turret' || b.type === 'cannon') {
            // Torreta Defensiva
            ctx.fillStyle = '#263238';
            ctx.fillRect(-16, -30, 32, 30);
            ctx.fillStyle = config.color;
            ctx.shadowColor = config.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, -32, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Extractores / Refinerías
            ctx.fillStyle = '#212121';
            ctx.fillRect(-18, -28, 36, 28);
            ctx.fillStyle = config.color;
            ctx.shadowColor = config.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, -14, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Barra de Vida
        if (b.hp < b.maxHp) {
            const barW = 32;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -55, barW, 4);
            ctx.fillStyle = (b.hp / b.maxHp > 0.4) ? '#00ff88' : '#ff0055';
            ctx.fillRect(-barW / 2, -55, barW * (b.hp / b.maxHp), 4);
        }

        ctx.restore();
    }

    drawTroop(t) {
        const ctx = this.ctx;
        const pos = this.gridToScreen(t.gx, t.gy);

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (t.type === 'hero') {
            // LORD DRAKON (El Héroe Oscuro con Capa y Sable Carmesí)
            // Capa negra ondulante
            ctx.fillStyle = '#0a0a0f';
            ctx.beginPath();
            ctx.moveTo(-6, -15);
            ctx.lineTo(-12, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            // Armadura
            ctx.fillStyle = '#11131c';
            ctx.fillRect(-6, -22, 12, 18);

            // Casco con máscara brillante
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -26, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff0033';
            ctx.fillRect(-3, -27, 6, 2); // Visor rojo

            // Sable Láser Carmesí
            ctx.strokeStyle = '#ff0033';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(6, -14);
            ctx.lineTo(16, -28);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (t.type === 'saber') {
            // Caballero Jedi con sable azul
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-4, -16, 8, 14);
            ctx.strokeStyle = '#00f7ff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00f7ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(4, -10);
            ctx.lineTo(12, -22);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (t.type === 'walker') {
            // Meca Bípode Caminante
            ctx.fillStyle = '#455a64';
            ctx.fillRect(-12, -28, 24, 18);
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(-10, -24, 20, 6); // Cabina
            // Patas
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-6, -10);
            ctx.lineTo(-8, 2);
            ctx.moveTo(6, -10);
            ctx.lineTo(8, 2);
            ctx.stroke();
        } else {
            // Soldado Clon / Troopers
            ctx.fillStyle = t.config.color;
            ctx.fillRect(-4, -14, 8, 12);
            ctx.fillStyle = '#000000';
            ctx.fillRect(-3, -13, 6, 2);
        }

        ctx.restore();
    }

    drawProjectiles() {
        const ctx = this.ctx;
        this.projectiles.forEach(p => {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(p.x1, p.y1);
            ctx.lineTo(p.x2, p.y2);
            ctx.stroke();
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
            ctx.font = `bold ${ft.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 6;
            ctx.fillText(ft.text, ft.x, ft.y);
        });
        ctx.shadowBlur = 0;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.galaxyClash = new GalaxyClashGame();
});
