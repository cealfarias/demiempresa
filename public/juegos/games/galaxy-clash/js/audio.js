// Audio Procedural para Galaxy Clash: Hero Wars (Estilo Guerra Galáctica / Sci-Fi)
class GalaxyAudioManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.step = 0;
        this.saberHumOsc = null;
        this.saberHumGain = null;
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

    // 1. Zumbido de Sable Láser (Lightsaber Ignition & Hum)
    playSaberIgnition() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
            osc.frequency.linearRampToValueAtTime(140, t + 0.35);

            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
        } catch (e) {}
    }

    // 2. Tajo / Golpe de Sable de Plasma (Saber Clash)
    playSaberSwing() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.exponentialRampToValueAtTime(120, t + 0.14);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, t);
            filter.Q.setValueAtTime(4, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.14);
        } catch (e) {}
    }

    // 3. Disparo Blaster Láser (Pew Pew Galáctico)
    playBlaster(isHeavy = false) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            const startFreq = isHeavy ? 1200 : 1800;
            const endFreq = isHeavy ? 180 : 320;
            const duration = isHeavy ? 0.16 : 0.09;

            osc.frequency.setValueAtTime(startFreq, t);
            osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

            gain.gain.setValueAtTime(isHeavy ? 0.18 : 0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {}
    }

    // 4. Disparo de Torretas Turboláser Pesado
    playTurbolaser() {
        this.playBlaster(true);
    }

    // 5. Habilidad de Héroe: Furia de la Fuerza (Shockwave sub-bass + crujido eléctrico)
    playForcePower() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;

            // Sub-graves oscuros de la Fuerza
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(140, t);
            sub.frequency.exponentialRampToValueAtTime(35, t + 0.6);
            subGain.gain.setValueAtTime(0.45, t);
            subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            sub.connect(subGain);
            subGain.connect(this.ctx.destination);
            sub.start(t);
            sub.stop(t + 0.6);

            // Rayos de la Fuerza
            const shock = this.ctx.createOscillator();
            const shockGain = this.ctx.createGain();
            shock.type = 'sawtooth';
            shock.frequency.setValueAtTime(800, t);
            shock.frequency.setValueAtTime(1200, t + 0.1);
            shock.frequency.setValueAtTime(600, t + 0.2);
            shockGain.gain.setValueAtTime(0.15, t);
            shockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            shock.connect(shockGain);
            shockGain.connect(this.ctx.destination);
            shock.start(t);
            shock.stop(t + 0.4);
        } catch (e) {}
    }

    // 6. Explosión de Estructura / Muro de Escudo destruido
    playBuildingExplosion() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const duration = 0.45;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(t);
        } catch (e) {}
    }

    // 7. Victoria / Fanfarria de 3 Estrellas
    playVictoryStar() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.28);
                } catch (e) {}
            }, idx * 80);
        });
    }

    // 8. Música de Marcha Galáctica (Homaje Orquestal en Sintetizador)
    startMusic() {
        this.init();
        if (this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;
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

        const beatTime = 0.28;
        // Marcha dramática en C menor / G menor
        const bassProgression = [
            130.81, 130.81, 130.81, 103.83, 155.56, 130.81, 103.83, 155.56, // C, C, C, Ab, Eb, C
            98.00,  98.00,  98.00,  103.83, 155.56, 130.81, 103.83, 155.56
        ];
        const freq = bassProgression[this.step % bassProgression.length];

        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, t);

            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + beatTime * 0.9);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + beatTime * 0.9);
        } catch (e) {}

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

window.galaxyAudio = new GalaxyAudioManager();
