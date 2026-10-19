// Audio Procedural para Cosmic Fusion (Estilo Suika / Celestial Chimes)
class CosmicAudioManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.chordStep = 0;

        // Frecuencias pentatónicas celestiales para fusiones (Tiers 1 a 11)
        this.mergePitches = [
            261.63, // C4 - Asteroide -> Luna
            293.66, // D4 - Luna -> Marte
            329.63, // E4 - Marte -> Mercurio
            392.00, // G4 - Mercurio -> Venus
            440.00, // A4 - Venus -> Tierra
            523.25, // C5 - Tierra -> Neptuno
            587.33, // D5 - Neptuno -> Saturno
            659.25, // E5 - Saturno -> Júpiter
            783.99, // G5 - Júpiter -> Sol
            880.00, // A5 - Sol -> Supernova
            1046.50 // C6 - Gran Supernova
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

    // 1. Sonido suave al soltar un planeta
    playDrop() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
    }

    // 2. Rebote elástico contra pared u otro planeta
    playBounce(intensity = 1) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            const baseFreq = 120 + Math.random() * 40;
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.08);

            const vol = Math.min(0.12, 0.03 * intensity);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
    }

    // 3. Fusión celestial armónica según el nivel del planeta
    playMerge(tier = 1) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const idx = Math.min(this.mergePitches.length - 1, Math.max(0, tier - 1));
            const rootFreq = this.mergePitches[idx];

            // Toca acorde celestial (fundamental + quinta + octava suave)
            [rootFreq, rootFreq * 1.5, rootFreq * 2].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                const volume = (i === 0 ? 0.18 : 0.08);
                gain.gain.setValueAtTime(volume, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.45);
            });
        } catch (e) {}
    }

    // 4. Sonido de advertencia si los planetas tocan la línea roja
    playWarning() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.setValueAtTime(880, t + 0.08);

            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    }

    // 5. Game Over cósmico
    playGameOver() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        const notes = [440, 392, 330, 261, 196];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.35);
                } catch (e) {}
            }, idx * 110);
        });
    }

    // 6. Música ambiental cósmica relajante (Space Ambient Pad)
    startMusic() {
        this.init();
        if (this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;
        this.isPlayingMusic = true;
        this.scheduleAmbientChord();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleAmbientChord() {
        if (!this.isPlayingMusic || !this.ctx || !this.musicEnabled) return;

        // Acordes suspendidos cósmicos: Cmaj9, Fmaj7, Am9, Gsus4
        const chordProgressions = [
            [130.81, 196.00, 246.94, 293.66], // Cmaj9 (C3, G3, B3, D4)
            [110.00, 164.81, 220.00, 261.63], // Am7   (A2, E3, A3, C4)
            [87.31, 130.81, 174.61, 220.00],  // Fmaj7 (F2, C3, F3, A3)
            [98.00, 146.83, 196.00, 246.94]   // G6    (G2, D3, G3, B3)
        ];

        const chord = chordProgressions[this.chordStep % chordProgressions.length];
        this.chordStep++;

        const t = this.ctx.currentTime;
        const duration = 4.2;

        chord.forEach(freq => {
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, t);

                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(0.025, t + 1.2);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            } catch (e) {}
        });

        this.musicTimer = setTimeout(() => {
            this.scheduleAmbientChord();
        }, (duration - 0.5) * 1000);
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) this.stopMusic();
        else this.startMusic();
        return this.musicEnabled;
    }
}

window.cosmicAudio = new CosmicAudioManager();
