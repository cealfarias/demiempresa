// ============================================================================
// CHOMP NEO: MOTOR DE AUDIO Y CHIPTUNE ARCADE COMPLETO (Web Audio API)
// Banda sonora retro completa a 3 voces, Waka-Waka rítmico,
// Píldoras de poder, Espectros asustados y fanfarrias arcade.
// ============================================================================

class ChompAudio {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.masterVolume = 0.28;

        // Secuenciador Musical (Música completa, no un solo tono)
        this.musicTimer = null;
        this.noteIndex = 0;
        this.bassIndex = 0;
        this.isPlayingMusic = false;
        this.isFrightenedMusic = false;
        this.tempo = 146; // BPM alegre y rítmico

        // Alternancia del Waka-Waka
        this.wakaToggle = false;

        // Frecuencias exactas de notas musicales
        this.notes = {
            'REST': 0,
            'B2': 123.47, 'C3': 130.81, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F#3': 185.00, 'G3': 196.00, 'A3': 220.00,
            'B3': 246.94, 'C4': 261.63, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
            'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
            'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51, 'F#6': 1479.98, 'G6': 1567.98, 'B6': 1975.53
        };

        // Melodía Principal In-Game de Chomp Neo (Banda Sonora Arcade Completa)
        // [nota, duracion_en_semicorcheas]
        this.mainMelody = [
            // Frase 1 - Tema emblemático
            ['B4', 2], ['B5', 2], ['F#5', 2], ['D#5', 2], ['B5', 1], ['F#5', 2], ['D#5', 3],
            ['C5', 2], ['C6', 2], ['G5', 2], ['E5', 2], ['C6', 1], ['G5', 2], ['E5', 3],
            ['B4', 2], ['B5', 2], ['F#5', 2], ['D#5', 2], ['B5', 1], ['F#5', 2], ['D#5', 3],
            ['D#5', 1], ['E5', 1], ['F5', 1], ['F#5', 1], ['G5', 1], ['G#5', 1], ['A5', 1], ['A#5', 1], ['B5', 4],

            // Frase 2 - Sección dinámica y bailable
            ['E5', 2], ['G5', 2], ['B5', 2], ['E6', 2], ['D6', 2], ['B5', 2], ['G5', 4],
            ['A5', 2], ['C6', 2], ['E6', 2], ['D6', 2], ['C6', 2], ['A5', 2], ['F#5', 4],
            ['G5', 2], ['B5', 2], ['D6', 2], ['C6', 2], ['B5', 2], ['G5', 2], ['E5', 4],
            ['F#5', 2], ['A5', 2], ['C6', 2], ['B5', 2], ['A5', 2], ['F#5', 2], ['D#5', 4],

            // Cierre con gancho retro
            ['E5', 2], ['B4', 2], ['E5', 2], ['G5', 2], ['B5', 2], ['E6', 4], ['REST', 2]
        ];

        // Línea de Bajo Saltarín Acompañante
        this.bassLine = [
            ['B2', 2], ['F#3', 2], ['B2', 2], ['D#3', 2], ['C3', 2], ['G3', 2], ['C3', 2], ['E3', 2],
            ['B2', 2], ['F#3', 2], ['B2', 2], ['D#3', 2], ['F#2', 2], ['C#3', 2], ['F#2', 2], ['B2', 2],
            ['E3', 2], ['B2', 2], ['G2', 2], ['B2', 2], ['A2', 2], ['E3', 2], ['C3', 2], ['E3', 2],
            ['G2', 2], ['D3', 2], ['B2', 2], ['D3', 2], ['B2', 2], ['F#3', 2], ['D#3', 2], ['B2', 2]
        ];

        // Melodía rápida de Píldora de Poder (Modo Fantasmas Asustados)
        this.frightenedMelody = [
            ['E5', 1], ['G5', 1], ['B5', 1], ['G5', 1], ['E5', 1], ['G5', 1], ['B5', 1], ['G5', 1],
            ['D#5', 1], ['F#5', 1], ['A5', 1], ['F#5', 1], ['D#5', 1], ['F#5', 1], ['A5', 1], ['F#5', 1],
            ['D5', 1], ['F5', 1], ['G#5', 1], ['F5', 1], ['D5', 1], ['F5', 1], ['G#5', 1], ['F5', 1],
            ['C#5', 1], ['E5', 1], ['G5', 1], ['E5', 1], ['C#5', 1], ['E5', 1], ['G5', 1], ['E5', 1]
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ========================================================================
    // SECUENCIADOR CHIPTUNE ARCADE (Banda Sonora Completa)
    // ========================================================================

    startMusic(isFrightened = false) {
        if (!this.musicEnabled) return;
        this.init();
        if (!this.ctx) return;

        this.isFrightenedMusic = isFrightened;
        this.isPlayingMusic = true;
        this.noteIndex = 0;
        this.bassIndex = 0;

        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }

        this.scheduleNextNote();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleNextNote() {
        if (!this.isPlayingMusic || !this.ctx) return;

        const currentTempo = this.isFrightenedMusic ? this.tempo * 1.35 : this.tempo;
        const melody = this.isFrightenedMusic ? this.frightenedMelody : this.mainMelody;

        const item = melody[this.noteIndex];
        const bassItem = this.bassLine[this.bassIndex];

        const note = item[0];
        const sixteenths = item[1];
        const sixteenthDuration = (60 / currentTempo) / 4;
        const noteDuration = sixteenthDuration * sixteenths;

        const now = this.ctx.currentTime;

        // Voz 1: Melodía Principal (Onda Cuadrada Arcade)
        if (note !== 'REST' && this.notes[note]) {
            this.playLeadNote(this.notes[note], now, noteDuration * 0.85);
        }

        // Voz 2: Bajo de Acompañamiento
        if (bassItem && !this.isFrightenedMusic) {
            const bNote = bassItem[0];
            const bDur = sixteenthDuration * bassItem[1];
            if (bNote !== 'REST' && this.notes[bNote]) {
                this.playBassNote(this.notes[bNote], now, bDur * 0.7);
            }
            this.bassIndex = (this.bassIndex + 1) % this.bassLine.length;
        }

        this.noteIndex = (this.noteIndex + 1) % melody.length;

        this.musicTimer = setTimeout(() => {
            this.scheduleNextNote();
        }, noteDuration * 1000);
    }

    playLeadNote(freq, startTime, duration) {
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);

            const vol = this.masterVolume * 0.38;
            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(vol, startTime + 0.008);
            gain.gain.setValueAtTime(vol * 0.85, startTime + duration * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);
        } catch (e) {}
    }

    playBassNote(freq, startTime, duration) {
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            const vol = this.masterVolume * 0.45;
            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);
        } catch (e) {}
    }

    // ========================================================================
    // EFECTOS DE SONIDO CLÁSICOS
    // ========================================================================

    // 1. Mítico "Waka-Waka" al comer puntos
    playWaka() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';

            // Alternancia rítmica de dos tonos que crea el "waka-waka" auténtico
            const f1 = this.wakaToggle ? 480 : 330;
            const f2 = this.wakaToggle ? 330 : 480;
            this.wakaToggle = !this.wakaToggle;

            osc.frequency.setValueAtTime(f1, now);
            osc.frequency.exponentialRampToValueAtTime(f2, now + 0.06);

            gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.075);
        } catch (e) {}
    }

    // 2. Super Píldora de Poder
    playPowerPellet() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

            gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {}
    }

    // 3. Devorar Espectro Asustado (+200, +400...)
    playEatGhost() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(1500, now + 0.25);

            gain.gain.setValueAtTime(this.masterVolume * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    // 4. Devorar Fruta / Cyber Gema
    playEatFruit() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const fruitTones = [523.25, 783.99, 1046.50, 1567.98];

        fruitTones.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.05);

            gain.gain.setValueAtTime(this.masterVolume * 0.4, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.14);
        });
    }

    // 5. Espiral de Derrota / Muerte
    playDeath(callback) {
        this.stopMusic();
        if (!this.sfxEnabled) {
            if (callback) callback();
            return;
        }
        this.init();
        if (!this.ctx) {
            if (callback) callback();
            return;
        }

        const now = this.ctx.currentTime;
        const duration = 1.2;
        const steps = 14;
        const stepDur = duration / steps;

        for (let i = 0; i < steps; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            const f = 750 * Math.pow(0.87, i);
            osc.frequency.setValueAtTime(f, now + i * stepDur);

            gain.gain.setValueAtTime(this.masterVolume * 0.42, now + i * stepDur);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * stepDur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * stepDur);
            osc.stop(now + (i + 1) * stepDur + 0.01);
        }

        setTimeout(() => {
            try {
                const popOsc = this.ctx.createOscillator();
                const popGain = this.ctx.createGain();
                popOsc.type = 'triangle';
                popOsc.frequency.setValueAtTime(100, this.ctx.currentTime);
                popGain.gain.setValueAtTime(this.masterVolume * 0.45, this.ctx.currentTime);
                popGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
                popOsc.connect(popGain);
                popGain.connect(this.ctx.destination);
                popOsc.start();
                popOsc.stop(this.ctx.currentTime + 0.15);
            } catch (e) {}

            if (callback) callback();
        }, duration * 1000);
    }

    // 6. Fanfarria de Nivel Completado
    playVictory(callback) {
        this.stopMusic();
        this.init();
        if (!this.ctx) {
            if (callback) callback();
            return;
        }

        const now = this.ctx.currentTime;
        const notes = [
            [523.25, 0.1], [659.25, 0.1], [783.99, 0.1], [1046.50, 0.22],
            [880.00, 0.1], [1046.50, 0.35]
        ];

        let offset = 0;
        notes.forEach(([f, dur]) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + offset);

            gain.gain.setValueAtTime(this.masterVolume * 0.38, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + offset);
            osc.stop(now + offset + dur + 0.02);

            offset += dur;
        });

        if (callback) {
            setTimeout(callback, (offset + 0.15) * 1000);
        }
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else {
            this.startMusic(this.isFrightenedMusic);
        }
        return this.musicEnabled;
    }
}
