// Sistema de Sonido Contundente y Potente para Cyber Pong Neo
class PongAudioManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.step = 0;
        this.tempo = 132;
        this.masterVolume = 1.0; // Ganancia fuerte e impactante

        // Melodía electro-synthwave de ritmo rápido
        this.bassNotes = [
            110, 110, 110, 130.81, 110, 110, 146.83, 130.81,
            98, 98, 98, 123.47, 98, 98, 130.81, 123.47
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

    // --- EFECTOS DE SONIDO FUERTES Y CONTUNDENTES (PUNCHY SFX) ---

    // 1. Golpe de Paleta Potente (Paddle Hit)
    playPaddleHit(speedRatio = 1) {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;

            // Capa 1: Golpe seco y profundo (Cuerpo de la paleta)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            const startFreq = 260 * speedRatio;
            osc.frequency.setValueAtTime(startFreq, t);
            osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

            gain.gain.setValueAtTime(0.45, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.09);

            // Capa 2: Chasquido metálico / madera de alto impacto
            const click = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();

            click.type = 'sawtooth';
            click.frequency.setValueAtTime(900 * speedRatio, t);
            click.frequency.exponentialRampToValueAtTime(200, t + 0.04);

            clickGain.gain.setValueAtTime(0.25, t);
            clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

            click.connect(clickGain);
            clickGain.connect(this.ctx.destination);
            click.start(t);
            click.stop(t + 0.04);
        } catch (e) {}
    }

    // 2. ¡SUPER SMASH! Golpe a máxima velocidad (Efecto Aturdidor)
    playSmash() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;

            // Cañón de sub-graves atronador
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();

            sub.type = 'sine';
            sub.frequency.setValueAtTime(420, t);
            sub.frequency.exponentialRampToValueAtTime(28, t + 0.22);

            subGain.gain.setValueAtTime(0.85, t);
            subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            sub.connect(subGain);
            subGain.connect(this.ctx.destination);
            sub.start(t);
            sub.stop(t + 0.25);

            // Ráfaga sónica de ruido blanco
            const bufferSize = this.ctx.sampleRate * 0.12;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1600, t);
            filter.Q.setValueAtTime(2, t);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.5, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(t);
        } catch (e) {}
    }

    // 3. Rebote en paredes superior/inferior
    playWallHit() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(340, t);
            osc.frequency.exponentialRampToValueAtTime(110, t + 0.05);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.05);
        } catch (e) {}
    }

    // 4. Punto anotado (Gol / Score): Explosión y fanfarria
    playPoint() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;

            // Impacto de bombo
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(250, t);
            osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);
            gain.gain.setValueAtTime(0.65, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.3);

            // Campanada triunfal
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    try {
                        const toneT = this.ctx.currentTime;
                        const toneOsc = this.ctx.createOscillator();
                        const toneGain = this.ctx.createGain();
                        toneOsc.type = 'triangle';
                        toneOsc.frequency.setValueAtTime(freq, toneT);
                        toneGain.gain.setValueAtTime(0.25, toneT);
                        toneGain.gain.exponentialRampToValueAtTime(0.001, toneT + 0.2);
                        toneOsc.connect(toneGain);
                        toneGain.connect(this.ctx.destination);
                        toneOsc.start(toneT);
                        toneOsc.stop(toneT + 0.2);
                    } catch (e) {}
                }, idx * 60);
            });
        } catch (e) {}
    }

    // 5. Victoria de la partida
    playVictory() {
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.22, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.35);
                } catch (e) {}
            }, idx * 80);
        });
    }

    // --- MÚSICA RETRO ELECTRO-SYNTHWAVE ---
    startMusic() {
        this.init();
        if (this.isPlayingMusic || !this.musicEnabled) return;
        this.isPlayingMusic = true;
        this.step = 0;
        this.scheduleBeat();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleBeat() {
        if (!this.isPlayingMusic || !this.ctx || !this.musicEnabled) return;

        const beatTime = (60 / this.tempo) * 0.25;
        const bassFreq = this.bassNotes[this.step % this.bassNotes.length];

        // Bajo potente
        if (bassFreq > 0) {
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(bassFreq, t);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(0.045, t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + beatTime * 0.85);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + beatTime * 0.85);
            } catch (e) {}
        }

        // Bombo en tiempos 0, 4, 8, 12
        if (this.step % 4 === 0) {
            try {
                const t = this.ctx.currentTime;
                const kick = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kick.type = 'sine';
                kick.frequency.setValueAtTime(140, t);
                kick.frequency.exponentialRampToValueAtTime(38, t + 0.07);
                kickGain.gain.setValueAtTime(0.09, t);
                kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
                kick.connect(kickGain);
                kickGain.connect(this.ctx.destination);
                kick.start(t);
                kick.stop(t + 0.07);
            } catch (e) {}
        }

        this.step++;
        this.musicTimer = setTimeout(() => {
            this.scheduleBeat();
        }, beatTime * 1000);
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

window.pongAudio = new PongAudioManager();
