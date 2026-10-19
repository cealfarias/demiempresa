// Audio Procedural para Bridge Builder (Física de Puentes)
class BridgeAudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.engineOsc = null;
        this.engineGain = null;
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

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopEngine();
        }
        return this.enabled;
    }

    // Sonido al colocar una viga o nodo
    playPlace() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, t);
            osc.frequency.exponentialRampToValueAtTime(840, t + 0.05);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.05);
        } catch (e) {}
    }

    // Sonido al borrar una viga
    playDelete() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(420, t);
            osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
    }

    // CRACK! Rotura de viga por tensión extrema
    playSnap() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            // Ruido blanco filtrado tipo crujido de madera
            const bufferSize = this.ctx.sampleRate * 0.12;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, t);
            filter.Q.setValueAtTime(3, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(t);
        } catch (e) {}
    }

    // Motor del camión continuo mientras rueda
    startEngine() {
        if (!this.enabled || !this.ctx || this.engineOsc) return;
        try {
            const t = this.ctx.currentTime;
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(65, t);

            // Filtro paso bajo para sonido de motor realista
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(260, t);

            this.engineGain.gain.setValueAtTime(0.001, t);
            this.engineGain.gain.linearRampToValueAtTime(0.08, t + 0.2);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start(t);
        } catch (e) {}
    }

    setEngineSpeed(speedRatio) {
        if (this.engineOsc && this.ctx) {
            const freq = 60 + Math.min(80, speedRatio * 70);
            this.engineOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        }
    }

    stopEngine() {
        if (this.engineOsc) {
            try {
                this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
                this.engineOsc.stop(this.ctx.currentTime + 0.1);
            } catch (e) {}
            this.engineOsc = null;
            this.engineGain = null;
        }
    }

    // Fanfarria de victoria al llegar a la meta
    playVictory() {
        this.stopEngine();
        if (!this.enabled || !this.ctx) return;
        const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // Sol, Do, Mi, Sol, Do agudo
        notes.forEach((freq, i) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.18, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.35);
                } catch (e) {}
            }, i * 90);
        });
    }

    // Caída al vacío / colapso
    playFail() {
        this.stopEngine();
        if (!this.enabled || !this.ctx) return;
        const notes = [260, 220, 180, 130];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                try {
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.14, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.25);
                } catch (e) {}
            }, i * 110);
        });
    }
}

window.bridgeAudio = new BridgeAudioManager();
