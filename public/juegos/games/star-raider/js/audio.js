// Audio Procedural para Star Raider Neo (Space Shooter Retro)
class ShooterAudioManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.step = 0;
        this.tempo = 135;

        // Notas para la línea de bajo y sintetizador espacial retro
        this.bassNotes = [
            110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83, // A2, A2, C3, D3, A2, A2, E3, D3
            98, 98, 123.47, 130.81, 98, 98, 146.83, 130.81,     // G2, G2, B2, C3, G2, G2, D3, C3
            87.31, 87.31, 110, 130.81, 87.31, 87.31, 130.81, 110, // F2, F2, A2, C3, F2, F2, C3, A2
            82.41, 82.41, 110, 123.47, 82.41, 98, 110, 123.47    // E2, E2, A2, B2, E2, G2, A2, B2
        ];

        this.leadNotes = [
            440, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25,
            392, 0, 493.88, 523.25, 587.33, 0, 523.25, 493.88,
            349.23, 0, 440, 523.25, 587.33, 0, 523.25, 440,
            329.63, 0, 440, 493.88, 523.25, 587.33, 659.25, 783.99
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

    // --- MÚSICA RETRO DE ESPACIO (SYNTHWAVE 8-BIT) ---
    startMusic() {
        this.init();
        if (this.isPlayingMusic || !this.musicEnabled) return;
        this.isPlayingMusic = true;
        this.step = 0;
        this.scheduleMusicBeat();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMusicBeat() {
        if (!this.isPlayingMusic || !this.ctx || !this.musicEnabled) return;

        const beatDuration = (60 / this.tempo) * 0.25;
        const bassFreq = this.bassNotes[this.step % this.bassNotes.length];
        const leadFreq = this.leadNotes[this.step % this.leadNotes.length];

        // Bajo pulsante
        if (bassFreq > 0) {
            this.playSynthNote(bassFreq, beatDuration * 0.9, 'sawtooth', 0.04);
        }

        // Melodía principal
        if (leadFreq > 0 && this.step % 2 === 0) {
            this.playSynthNote(leadFreq, beatDuration * 1.5, 'square', 0.035);
        }

        // Caja / Hi-hat de ruido en ritmos pares
        if (this.step % 4 === 2) {
            this.playNoiseSnare(0.06, 0.03);
        } else if (this.step % 2 === 0) {
            this.playNoiseHiHat(0.02, 0.015);
        }

        this.step++;
        this.musicTimer = setTimeout(() => {
            this.scheduleMusicBeat();
        }, beatDuration * 1000);
    }

    playSynthNote(freq, duration, type = 'sawtooth', gainVal = 0.04) {
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, t);

            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(gainVal, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {}
    }

    playNoiseHiHat(duration, gainVal = 0.02) {
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(8000, this.ctx.currentTime);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        } catch (e) {}
    }

    playNoiseSnare(duration, gainVal = 0.04) {
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        } catch (e) {}
    }

    // --- EFECTOS DE SONIDO (SFX) ---

    // Disparo del jugador: Láser arcade brillante
    playShoot() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (e) {}
    }

    // Disparo alienígena
    playAlienShoot() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.linearRampToValueAtTime(180, t + 0.12);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
    }

    // Explosión al destruir nave o meteoro
    playExplosion(isBig = false) {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const duration = isBig ? 0.35 : 0.2;

            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(isBig ? 450 : 850, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(isBig ? 0.35 : 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(t);
        } catch (e) {}
    }

    // Impacto en roca / escudo
    playHit() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
    }

    // Alarma de advertencia de JEFE
    playBossWarning() {
        if (!this.sfxEnabled || !this.ctx) return;
        const freqs = [700, 440, 700, 440];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(f, t);
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.14);
                } catch (e) {}
            }, i * 180);
        });
    }

    // Bomba EMP Masiva
    playBomb() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            // Capa 1: Pulso de frecuencia descendente
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.6);

            // Capa 2: Trueno de ruido blanco
            this.playExplosion(true);
        } catch (e) {}
    }

    // Lanzamiento de misil
    playMissile() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(750, t + 0.12);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
    }

    // Sector despejado / Subida de nivel
    playLevelClear() {
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.3);
                } catch (e) {}
            }, i * 85);
        });
    }

    // Recoger Power-up
    playPowerup() {
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.14, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.12);
                } catch (e) {}
            }, i * 45);
        });
    }

    // Game Over
    playGameOver() {
        this.stopMusic();
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [330, 293, 261, 220, 164, 110];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.28);
                } catch (e) {}
            }, i * 110);
        });
    }

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

window.shooterAudio = new ShooterAudioManager();
