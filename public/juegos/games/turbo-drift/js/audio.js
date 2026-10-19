// Audio Procedural para Turbo Drift Neo (Carreras Arcade Retro)
class RacerAudioManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.step = 0;
        this.tempo = 138;

        // Oscilador continuo del motor del coche
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;

        // Melodía Synthwave estilo OutRun / Rad Racer
        this.bassNotes = [
            110, 110, 146.83, 110, 130.81, 110, 146.83, 164.81, // A2, D3, C3, E3
            98, 98, 130.81, 98, 123.47, 98, 130.81, 146.83,     // G2, C3, B2, D3
            87.31, 87.31, 110, 87.31, 130.81, 110, 130.81, 146.83, // F2, A2, C3
            82.41, 82.41, 110, 82.41, 123.47, 98, 110, 123.47    // E2, A2, B2
        ];

        this.leadNotes = [
            440, 0, 523.25, 0, 659.25, 587.33, 523.25, 0,
            392, 0, 493.88, 0, 587.33, 523.25, 493.88, 0,
            349.23, 0, 440, 0, 523.25, 493.88, 440, 0,
            329.63, 0, 440, 0, 493.88, 587.33, 659.25, 880
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

    // --- MOTOR CONTINUO ---
    startEngine() {
        this.init();
        if (!this.ctx || this.engineOsc || !this.sfxEnabled) return;
        try {
            const t = this.ctx.currentTime;
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineFilter = this.ctx.createBiquadFilter();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(55, t);

            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(260, t);

            this.engineGain.gain.setValueAtTime(0.001, t);
            this.engineGain.gain.linearRampToValueAtTime(0.08, t + 0.1);

            this.engineOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start(t);
        } catch (e) {}
    }

    updateEngineSpeed(speedRatio) {
        if (!this.engineOsc || !this.ctx) return;
        try {
            // El tono y filtro suben conforme aumenta la velocidad (0 a 300 km/h)
            const targetFreq = 50 + speedRatio * 180;
            const targetFilter = 220 + speedRatio * 650;
            this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
            this.engineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.05);
        } catch (e) {}
    }

    stopEngine() {
        if (this.engineOsc) {
            try {
                this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
                this.engineOsc.stop(this.ctx.currentTime + 0.1);
            } catch (e) {}
            this.engineOsc = null;
            this.engineGain = null;
            this.engineFilter = null;
        }
    }

    // --- EFECTOS DE SONIDO ---

    // 1. Chirrido de neumáticos al derrapar
    playScreech() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(850, t);
            osc.frequency.linearRampToValueAtTime(1100, t + 0.1);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, t);
            filter.Q.setValueAtTime(4, t);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.15);
        } catch (e) {}
    }

    // 2. Activación de Turbo Nitro (Silbido de turbo + Afterburner)
    playTurbo() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;

            // Silbido ascendente
            const whistle = this.ctx.createOscillator();
            const whistleGain = this.ctx.createGain();
            whistle.type = 'sine';
            whistle.frequency.setValueAtTime(400, t);
            whistle.frequency.exponentialRampToValueAtTime(2400, t + 0.28);
            whistleGain.gain.setValueAtTime(0.18, t);
            whistleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            whistle.connect(whistleGain);
            whistleGain.connect(this.ctx.destination);
            whistle.start(t);
            whistle.stop(t + 0.3);

            // Explosión de aceleración
            const boom = this.ctx.createOscillator();
            const boomGain = this.ctx.createGain();
            boom.type = 'triangle';
            boom.frequency.setValueAtTime(220, t);
            boom.frequency.exponentialRampToValueAtTime(40, t + 0.25);
            boomGain.gain.setValueAtTime(0.35, t);
            boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            boom.connect(boomGain);
            boomGain.connect(this.ctx.destination);
            boom.start(t);
            boom.stop(t + 0.28);
        } catch (e) {}
    }

    // 3. Bocina / Claxon clásico
    playHorn() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            [350, 440].forEach(f => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, t);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.18);
            });
        } catch (e) {}
    }

    // 4. Choque / Colisión metálica con coche o valla
    playCrash() {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const duration = 0.35;

            // Ruido blanco filtrado tipo chapa reventada
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
            filter.frequency.setValueAtTime(600, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.45, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(t);
        } catch (e) {}
    }

    // 5. Recoger Bidón de Combustible o Moneda
    playPickup(isFuel = true) {
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = isFuel ? [440, 554.37, 659.25, 880] : [659.25, 880];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.12);
                } catch (e) {}
            }, idx * 55);
        });
    }

    // 6. Game Over / Sin combustible
    playGameOver() {
        this.stopEngine();
        this.stopMusic();
        if (!this.sfxEnabled || !this.ctx) return;
        const notes = [350, 310, 270, 220, 160];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.18, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.25);
                } catch (e) {}
            }, idx * 110);
        });
    }

    // --- MÚSICA RETRO SYNTHWAVE OUTRUN ---
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
        const leadFreq = this.leadNotes[this.step % this.leadNotes.length];

        // Bajo pulsante
        if (bassFreq > 0) {
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(bassFreq, t);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(0.04, t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + beatTime * 0.85);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + beatTime * 0.85);
            } catch (e) {}
        }

        // Sintetizador lead
        if (leadFreq > 0 && this.step % 2 === 0) {
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(leadFreq, t);

                gain.gain.setValueAtTime(0.001, t);
                gain.gain.linearRampToValueAtTime(0.035, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + beatTime * 1.6);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + beatTime * 1.6);
            } catch (e) {}
        }

        this.step++;
        this.musicTimer = setTimeout(() => {
            this.scheduleBeat();
        }, beatTime * 1000);
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        if (!this.sfxEnabled) this.stopEngine();
        else if (window.racerGame && window.racerGame.isRunning) this.startEngine();
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) this.stopMusic();
        else this.startMusic();
        return this.musicEnabled;
    }
}

window.racerAudio = new RacerAudioManager();
