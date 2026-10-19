// Sistema de Audio Avanzado: Música Chiptune Retro y Efectos de Sonido Arcade Impactantes
class SoundManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.currentNoteIndex = 0;
        this.musicTempo = 140; // BPM base
        this.masterVolume = 0.3;

        // Melodía clásica de Tetris (Korobeiniki)
        // [nota, duracion_en_tiempos]
        this.melody = [
            // Sección A
            ['E5', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['B4', 1],
            ['A4', 2], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
            ['B4', 3], ['C5', 1], ['D5', 2], ['E5', 2],
            ['C5', 2], ['A4', 2], ['A4', 2], ['REST', 2],

            ['D5', 3], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
            ['E5', 3], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
            ['B4', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['E5', 2],
            ['C5', 2], ['A4', 2], ['A4', 2], ['REST', 2],

            // Sección B
            ['E4', 4], ['C4', 4], ['D4', 4], ['B3', 4],
            ['C4', 4], ['A3', 4], ['G#3', 4], ['B3', 4],
            ['E4', 4], ['C4', 4], ['D4', 4], ['B3', 4],
            ['C4', 2], ['E4', 2], ['A4', 4], ['G#4', 4]
        ];

        // Línea de bajo retro complementaria
        this.bassLine = [
            ['E3', 2], ['E3', 2], ['A2', 2], ['A2', 2],
            ['G#2', 2], ['E3', 2], ['A2', 2], ['A2', 2],
            ['D3', 2], ['D3', 2], ['C3', 2], ['C3', 2],
            ['B2', 2], ['E3', 2], ['A2', 2], ['A2', 2]
        ];

        this.bassIndex = 0;

        // Frecuencias estándar en Hz
        this.noteFreqs = {
            'REST': 0,
            'G#2': 103.83, 'A2': 110.00, 'B2': 123.47,
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50
        };
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

    // --- REPRODUCTOR DE MÚSICA CHIPTUNE ---
    startMusic() {
        this.init();
        if (this.isPlayingMusic || !this.musicEnabled) return;
        this.isPlayingMusic = true;
        this.currentNoteIndex = 0;
        this.bassIndex = 0;
        this.scheduleNextNote();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    setMusicTempoByLevel(level) {
        // La música se acelera conforme sube de nivel (de 135 a 190 BPM)
        this.musicTempo = Math.min(195, 135 + (level - 1) * 6);
    }

    scheduleNextNote() {
        if (!this.isPlayingMusic || !this.ctx || !this.musicEnabled) return;

        const [note, duration] = this.melody[this.currentNoteIndex];
        const beatDuration = (60 / this.musicTempo) * 0.45;
        const totalDuration = duration * beatDuration;

        // Tocar nota principal (onda cuadrada retro 8-bit)
        if (note !== 'REST' && this.noteFreqs[note]) {
            this.playChiptuneNote(this.noteFreqs[note], totalDuration * 0.85, 'square', 0.05);
        }

        // Tocar bajo complementario
        const bassItem = this.bassLine[this.bassIndex % this.bassLine.length];
        if (bassItem && bassItem[0] !== 'REST') {
            this.playChiptuneNote(this.noteFreqs[bassItem[0]], totalDuration * 0.7, 'triangle', 0.08);
        }

        // Percusión ligera retro (Hi-hat de ruido blanco)
        if (this.currentNoteIndex % 2 === 0) {
            this.playHiHat(0.03, 0.02);
        }

        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
        if (this.currentNoteIndex % 2 === 0) {
            this.bassIndex++;
        }

        this.musicTimer = setTimeout(() => {
            this.scheduleNextNote();
        }, totalDuration * 1000);
    }

    playChiptuneNote(freq, duration, type = 'square', gain = 0.05) {
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            // Envelope ADSR sutil para sonido arcade nítido
            const t = this.ctx.currentTime;
            gainNode.gain.setValueAtTime(0.001, t);
            gainNode.gain.linearRampToValueAtTime(gain * this.masterVolume, t + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {}
    }

    playHiHat(duration, gain = 0.02) {
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            // Filtro paso alto para que suene como platillo 8-bit
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(7000, this.ctx.currentTime);

            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(gain * this.masterVolume, this.ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    // --- EFECTOS DE SONIDO (SFX) LLAMATIVOS Y CONTUNDENTES ---

    // 1. Movimiento lateral: Laser chirp sci-fi
    playMove() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            const t = this.ctx.currentTime;

            osc.type = 'square';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(160, t + 0.04);

            gainNode.gain.setValueAtTime(0.06, t);
            gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.04);
        } catch (e) {}
    }

    // 2. Rotación: Doble pitido nítido ascendente
    playRotate() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            const t = this.ctx.currentTime;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.exponentialRampToValueAtTime(900, t + 0.07);

            gainNode.gain.setValueAtTime(0.1, t);
            gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.07);
        } catch (e) {}
    }

    // 3. Caída Instantánea (Hard Drop): Golpe de bajo explosivo (Impacto tipo bombo de discoteca + sub)
    playDrop() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;

            // Capa 1: Bombo sónico (Pitch drop rápido)
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

            gainNode.gain.setValueAtTime(0.35, t);
            gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.14);

            // Capa 2: Snap percusivo de impacto
            const snap = this.ctx.createOscillator();
            const snapGain = this.ctx.createGain();
            snap.type = 'sawtooth';
            snap.frequency.setValueAtTime(400, t);
            snap.frequency.exponentialRampToValueAtTime(80, t + 0.05);

            snapGain.gain.setValueAtTime(0.12, t);
            snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            snap.connect(snapGain);
            snapGain.connect(this.ctx.destination);
            snap.start(t);
            snap.stop(t + 0.05);
        } catch (e) {}
    }

    // 4. Hold: Riser futurista
    playHold() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = this.ctx.currentTime;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(260, t);
            osc.frequency.exponentialRampToValueAtTime(680, t + 0.1);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (e) {}
    }

    // 5. Limpieza de líneas: Fanfarrias y explosión de sonido
    playLineClear(count) {
        if (!this.sfxEnabled || !this.ctx) return;

        if (count === 4) {
            // ¡¡TETRIS ÉPICO!! Cuarteto triunfal con acordes
            const chords = [
                [523.25, 659.25],          // C5, E5
                [659.25, 783.99],          // E5, G5
                [783.99, 1046.50],         // G5, C6
                [1046.50, 1318.51, 1567.98] // C6, E6, G6
            ];

            chords.forEach((chord, i) => {
                setTimeout(() => {
                    chord.forEach(freq => {
                        this.playSparkleNote(freq, 0.28, 'sawtooth', 0.12);
                    });
                }, i * 90);
            });
        } else {
            // 1 a 3 líneas: Arpegio ascendente alegre
            const baseNotes = count === 1 
                ? [440, 554.37, 659.25] 
                : [440, 554.37, 659.25, 880];

            baseNotes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playSparkleNote(freq, 0.15, 'triangle', 0.14);
                }, i * 55);
            });
        }
    }

    playSparkleNote(freq, duration, type = 'sine', gain = 0.1) {
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            const t = this.ctx.currentTime;

            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);

            gainNode.gain.setValueAtTime(gain, t);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {}
    }

    // 6. Subida de Nivel: Fanfarria de victoria tipo jingle retro
    playLevelUp() {
        if (!this.sfxEnabled || !this.ctx) return;
        const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                this.playSparkleNote(freq, 0.2, 'square', 0.1);
            }, i * 70);
        });
    }

    // 7. Game Over: Crash descendente dramático de 8 bits
    playGameOver() {
        this.stopMusic();
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [380, 340, 300, 260, 220, 180, 140, 90];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playSparkleNote(freq, 0.28, 'sawtooth', 0.12);
            }, i * 110);
        });
    }

    // Conmutadores
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
        return this.musicEnabled;
    }
}

window.soundManager = new SoundManager();
