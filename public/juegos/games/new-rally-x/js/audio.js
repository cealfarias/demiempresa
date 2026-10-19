// ============================================================================
// NEW RALLY-X: MOTOR DE AUDIO Y CHIPTUNE ARCADE (Web Audio API)
// Fiel a la legendaria banda sonora de Yuriko Keino (Namco, 1981)
// Cero dependencias externas. 100% sintetizado en tiempo real.
// ============================================================================

class RallyAudio {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.isChallengingStage = false;
        this.masterVolume = 0.28;

        // Secuenciador
        this.musicTimer = null;
        this.noteIndex = 0;
        this.bassIndex = 0;
        this.tempo = 158; // BPM alegre y saltarín de New Rally-X

        // Sonido de motor continuo
        this.engineOsc = null;
        this.engineGain = null;
        this.isEngineRunning = false;

        // Frecuencias exactas de notas
        this.notes = {
            'REST': 0,
            'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00, 'B6': 1975.53, 'C7': 2093.00
        };

        // Melodía Principal In-Game de New Rally-X (Transcripción fiel y saltarina)
        // [nota, duracion_en_semicorcheas] (1 tiempo = 4 semicorcheas)
        this.mainMelody = [
            // Compás 1 - Entrada alegre
            ['G4', 2], ['C5', 2], ['D5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['C5', 2], ['D5', 2],
            ['E5', 2], ['D5', 2], ['C5', 2], ['A4', 2], ['G4', 3], ['A4', 1], ['C5', 4],

            // Compás 2
            ['D5', 2], ['E5', 2], ['F5', 2], ['A5', 2], ['F5', 2], ['D5', 2], ['E5', 2], ['F5', 2],
            ['G5', 2], ['F5', 2], ['E5', 2], ['D5', 2], ['C5', 3], ['D5', 1], ['E5', 4],

            // Compás 3 - Frase melódica central
            ['G4', 2], ['C5', 2], ['D5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['C5', 2], ['E5', 2],
            ['A5', 3], ['G5', 1], ['F5', 2], ['E5', 2], ['D5', 2], ['E5', 2], ['F5', 4],

            // Compás 4 - Cierre y resolución
            ['F5', 2], ['G5', 2], ['A5', 2], ['B5', 2], ['C6', 3], ['G5', 1], ['E5', 2], ['C5', 2],
            ['D5', 2], ['E5', 2], ['D5', 2], ['B4', 2], ['C5', 4], ['REST', 4],

            // Sección B: Variación festiva
            ['E5', 2], ['G5', 2], ['C6', 3], ['B5', 1], ['A5', 2], ['G5', 2], ['E5', 4],
            ['F5', 2], ['A5', 2], ['D6', 3], ['C6', 1], ['B5', 2], ['A5', 2], ['F5', 4],
            ['G5', 2], ['B5', 2], ['D6', 2], ['F6', 2], ['E6', 2], ['D6', 2], ['C6', 2], ['A5', 2],
            ['G5', 2], ['A5', 2], ['B5', 2], ['D6', 2], ['C6', 6], ['REST', 2]
        ];

        // Bajo saltarín icónico de New Rally-X (Walking Bass oom-pah enérgico)
        this.bassLine = [
            ['C3', 2], ['G3', 2], ['E3', 2], ['G3', 2], ['A2', 2], ['E3', 2], ['C3', 2], ['E3', 2],
            ['D3', 2], ['A3', 2], ['F3', 2], ['A3', 2], ['G2', 2], ['D3', 2], ['B2', 2], ['D3', 2],
            ['C3', 2], ['G3', 2], ['E3', 2], ['G3', 2], ['F2', 2], ['C3', 2], ['A2', 2], ['C3', 2],
            ['G2', 2], ['D3', 2], ['F2', 2], ['D3', 2], ['C3', 2], ['E3', 2], ['G3', 2], ['C4', 2],

            ['C3', 2], ['G3', 2], ['E3', 2], ['G3', 2], ['D3', 2], ['A3', 2], ['F3', 2], ['A3', 2],
            ['G2', 2], ['D3', 2], ['B2', 2], ['D3', 2], ['C3', 2], ['G3', 2], ['C3', 4]
        ];

        // Melodía especial de la "Challenging Stage"
        this.challengingMelody = [
            ['C5', 4], ['E5', 4], ['G5', 4], ['C6', 4],
            ['B5', 2], ['A5', 2], ['G5', 4], ['E5', 4], ['REST', 4],
            ['D5', 4], ['F5', 4], ['A5', 4], ['D6', 4],
            ['C6', 2], ['B5', 2], ['A5', 4], ['F5', 4], ['REST', 4],
            ['G5', 2], ['A5', 2], ['B5', 2], ['C6', 2], ['D6', 4], ['E6', 4],
            ['C6', 6], ['REST', 2]
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
    // MOTOR DE MÚSICA CHIPTUNE ARCADE
    // ========================================================================

    startMusic(isChallenging = false) {
        if (!this.musicEnabled) return;
        this.init();
        if (!this.ctx) return;

        this.isChallengingStage = isChallenging;
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

        const melody = this.isChallengingStage ? this.challengingMelody : this.mainMelody;
        const currentItem = melody[this.noteIndex];
        const bassItem = this.bassLine[this.bassIndex];

        const note = currentItem[0];
        const sixteenths = currentItem[1]; // Semicorcheas
        const sixteenthDuration = (60 / this.tempo) / 4;
        const noteDuration = sixteenthDuration * sixteenths;

        const now = this.ctx.currentTime;

        // Voz 1: Melodía Principal (Onda Cuadrada Namco)
        if (note !== 'REST' && this.notes[note]) {
            this.playLeadNote(this.notes[note], now, noteDuration * 0.82);
        }

        // Voz 2: Bajo Acompañante Saltarín
        if (bassItem) {
            const bNote = bassItem[0];
            const bDur = sixteenthDuration * bassItem[1];
            if (bNote !== 'REST' && this.notes[bNote]) {
                this.playBassNote(this.notes[bNote], now, bDur * 0.65);
            }
            this.bassIndex = (this.bassIndex + 1) % this.bassLine.length;
        }

        this.noteIndex = (this.noteIndex + 1) % melody.length;

        // Programar siguiente paso del secuenciador
        this.musicTimer = setTimeout(() => {
            this.scheduleNextNote();
        }, noteDuration * 1000);
    }

    playLeadNote(freq, startTime, duration) {
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Onda de pulso retro arcade (cuadrada con armónicos brillantes)
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);

            // Envolvente staccato con punch arcade
            const vol = this.masterVolume * 0.42;
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

            // Bajo con forma triangular y toque de sierra para calidez vintage
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            const vol = this.masterVolume * 0.55;
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
    // EFECTO CONTINUO DE MOTOR DE CARRERAS (Engine Hum)
    // ========================================================================

    startEngine() {
        if (!this.sfxEnabled || this.isEngineRunning) return;
        this.init();
        if (!this.ctx) return;

        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(75, this.ctx.currentTime);

            // Filtro paso bajo para que suene a motor arcade profundo
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(260, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0.035, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
            this.isEngineRunning = true;
        } catch (e) {}
    }

    updateEnginePitch(speedRatio) {
        if (!this.engineOsc || !this.isEngineRunning || !this.ctx) return;
        const targetFreq = 70 + (speedRatio * 55); // Sube cuando acelera
        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    }

    stopEngine() {
        if (this.engineOsc && this.isEngineRunning) {
            try {
                this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
                setTimeout(() => {
                    if (this.engineOsc) {
                        this.engineOsc.stop();
                        this.engineOsc.disconnect();
                        this.engineOsc = null;
                    }
                }, 60);
            } catch (e) {}
            this.isEngineRunning = false;
        }
    }

    // ========================================================================
    // EFECTOS DE SONIDO CLÁSICOS DE NEW RALLY-X
    // ========================================================================

    // 1. Cortina de Humo (Smoke Screen Puff)
    playSmoke() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            // Ráfaga de ruido blanco filtrado con descenso de frecuencia
            const bufferSize = this.ctx.sampleRate * 0.22;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(650, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.2);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    // 2. Coche Enemigo Patinando en el Humo (Spin-out Whistle)
    playSpinOut() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            const now = this.ctx.currentTime;

            // Silbido oscilante de resorte en espiral
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.linearRampToValueAtTime(320, now + 0.4);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.42);
        } catch (e) {}
    }

    // 3. Bandera Normal Recogida ("F" Flag) - Típico trino arcade agudo
    playFlag() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [1046.50, 1318.51, 1567.98, 2093.00]; // C6 - E6 - G6 - C7

        freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + idx * 0.045);

            gain.gain.setValueAtTime(0.22, now + idx * 0.045);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.045);
            osc.stop(now + idx * 0.045 + 0.09);
        });
    }

    // 4. Bandera Especial ("S" Flag) - Multiplicador de Puntos x2 (Arpegio Dorado)
    playSpecialFlag() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00, 2637.02];

        arpeggio.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);

            gain.gain.setValueAtTime(0.3, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.2);
        });
    }

    // 5. Bandera Afortunada ("L" Flag) - Bono de Combustible (Fanfarria Rápida)
    playLuckyFlag() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [
            [783.99, 0.08], [987.77, 0.08], [1174.66, 0.08], [1567.98, 0.22],
            [1318.51, 0.08], [1567.98, 0.28]
        ];

        let offset = 0;
        notes.forEach(([f, dur]) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(f, now + offset);

            gain.gain.setValueAtTime(0.24, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + offset);
            osc.stop(now + offset + dur + 0.02);

            offset += dur * 0.85;
        });
    }

    // 6. Colisión y Explosión Arcade (Crash)
    playCrash() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Ruido de impacto masivo
        const bufferSize = this.ctx.sampleRate * 0.55;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 0.5);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.55, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        // Golpe de tono grave en caída
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);

        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
    }

    // 7. Alarma de Combustible Bajo (Low Fuel Warning)
    playLowFuel() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(739.99, now + 0.08); // F#5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    }

    // 8. Fanfarria de Inicio de Ronda (Round Start Fanfare)
    playRoundStart(callback) {
        this.init();
        if (!this.ctx) {
            if (callback) callback();
            return;
        }

        const now = this.ctx.currentTime;
        const jingle = [
            ['G4', 0.1], ['C5', 0.1], ['E5', 0.1], ['G5', 0.15],
            ['E5', 0.1], ['G5', 0.1], ['C6', 0.35]
        ];

        let offset = 0;
        jingle.forEach(([note, dur]) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(this.notes[note], now + offset);

            gain.gain.setValueAtTime(0.3, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + offset);
            osc.stop(now + offset + dur + 0.02);

            offset += dur;
        });

        if (callback) {
            setTimeout(callback, (offset + 0.1) * 1000);
        }
    }

    // 9. Fanfarria de Ronda Completada (Round Clear)
    playRoundClear(callback) {
        this.stopMusic();
        this.stopEngine();
        this.init();
        if (!this.ctx) {
            if (callback) callback();
            return;
        }

        const now = this.ctx.currentTime;
        const victory = [
            ['C5', 0.12], ['E5', 0.12], ['G5', 0.12], ['C6', 0.22],
            ['REST', 0.06],
            ['A5', 0.12], ['B5', 0.12], ['C6', 0.35],
            ['REST', 0.06],
            ['G5', 0.15], ['C6', 0.45]
        ];

        let offset = 0;
        victory.forEach(([note, dur]) => {
            if (note !== 'REST') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(this.notes[note], now + offset);

                gain.gain.setValueAtTime(0.32, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + offset);
                osc.stop(now + offset + dur + 0.02);
            }
            offset += dur;
        });

        if (callback) {
            setTimeout(callback, (offset + 0.2) * 1000);
        }
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        if (!this.sfxEnabled) this.stopEngine();
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startMusic(this.isChallengingStage);
        } else {
            this.stopMusic();
        }
        return this.musicEnabled;
    }
}
