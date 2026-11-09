
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const audioInput = $("audioInput");
    const uploadArea = $("uploadArea");
    const waveform = $("waveform");
    const ctx = waveform.getContext("2d");

    const effects = [
        ["3D Audio", "◉", "Create a moving stereo sound effect."],
        ["Auto Panner", "↔", "Move sound automatically from left to right."],
        ["Bass Booster", "♫", "Give your audio more low-end power."],
        ["Equalizer", "≋", "Adjust bass, mids and treble frequencies."],
        ["Noise Reducer", "⌁", "Basic filtering to reduce unwanted noise."],
        ["Pitch Shifter", "↑", "Change the pitch of your audio."],
        ["Reverb", "〰", "Add an atmospheric room effect."],
        ["Reverse Audio", "↶", "Play your audio backwards."],
        ["Stereo Panner", "L/R", "Move sound toward the left or right."],
        ["Tempo Changer", "⏱", "Change playback speed."],
        ["Trimmer / Cutter", "✂", "Choose the section you want to export."],
        ["Vocal Remover", "♫", "Separate vocals from instrumental audio."],
        ["Volume Changer", "◖", "Adjust the audio volume."]
    ];

    const otherTools = [
        ["BPM Detector", "◷", "Estimate the beats per minute."],
        ["Converter", "⇄", "Export supported audio as WAV."],
        ["Downmixer", "◫", "Convert stereo audio to mono."],
        ["Spectrogram Image", "▥", "Create a frequency visualisation."],
        ["Waveform Image", "∿", "Save the waveform as an image."]
    ];

    const presets = [
        ["8D Audio", "Moving stereo sound with an atmospheric effect."],
        ["Slowed and Reverb", "Slower playback with added ambience."],
        ["440 Hz to 432 Hz Converter", "Shift pitch by approximately -0.32 semitones."],
        ["Very Light Bass Boost", "A subtle low-frequency boost."],
        ["Light Bass Boost", "A gentle bass enhancement."],
        ["Moderate Bass Boost", "A stronger low-end sound."],
        ["Heavy Bass Boost", "A powerful bass effect."],
        ["Extreme Bass Boost", "An intense low-frequency boost."],
        ["Vocal Reverb", "A light reverb for vocal recordings."],
        ["Bathroom Reverb", "A short, reflective room effect."],
        ["Small Room Reverb", "A compact room ambience."],
        ["Medium Room Reverb", "A medium-sized room ambience."],
        ["Large Room Reverb", "A spacious room effect."],
        ["Church Hall Reverb", "A long, open reverberation."],
        ["Cathedral Reverb", "A large, expansive reverb."]
    ];

    let audioBuffer = null;
    let audioContext = null;
    let currentSource = null;
    let currentTool = null;
    let currentFileName = "vexoniq-audio";
    let isPlaying = false;
    let playStartedAt = 0;
    let pausedAt = 0;
    let animationFrame = null;
    let toastTimer = null;

    const settings = {
        volume: 1,
        bass: 0,
        mid: 0,
        treble: 0,
        pan: 0,
        speed: 1,
        pitch: 0,
        reverb: 0,
        reverse: false,
        mono: false,
        noise: false,
        autoPan: false,
        pan3D: false,
        trimStart: 0,
        trimEnd: 100,
        fadeIn: 0,
        fadeOut: 0
    };

    function notify(message) {
        const toast = $("toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function requireAudio() {
        if (!audioBuffer) {
            notify("Please upload an audio file first.");
            return false;
        }
        return true;
    }

    function stopPlayback() {
        if (currentSource) {
            try { currentSource.stop(); } catch (_) {}
            try { currentSource.disconnect(); } catch (_) {}
        }
        currentSource = null;
        isPlaying = false;
        cancelAnimationFrame(animationFrame);
        $("playButton").textContent = "▶";
    }

    function getTrimmedDuration() {
        if (!audioBuffer) return 0;
        const start = settings.trimStart / 100 * audioBuffer.duration;
        const end = settings.trimEnd / 100 * audioBuffer.duration;
        return Math.max(0, end - start);
    }

    function drawWaveform(buffer) {
        const width = waveform.width;
        const height = waveform.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#11120f";
        ctx.fillRect(0, 0, width, height);

        if (!buffer) return;

        const data = buffer.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / width));
        const middle = height / 2;

        ctx.strokeStyle = "#d7ff35";
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
            let min = 1;
            let max = -1;

            for (let j = 0; j < step; j++) {
                const sample = data[x * step + j];
                if (sample === undefined) break;
                min = Math.min(min, sample);
                max = Math.max(max, sample);
            }

            ctx.moveTo(x, middle - max * middle * .88);
            ctx.lineTo(x, middle - min * middle * .88);
        }

        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,.08)";
        ctx.beginPath();
        ctx.moveTo(0, middle);
        ctx.lineTo(width, middle);
        ctx.stroke();

        $("wavePlaceholder").classList.add("hidden");
    }

    async function loadAudio(file) {
        if (!file || !file.type.startsWith("audio/")) {
            notify("Please choose a supported audio file.");
            return;
        }

        try {
            stopPlayback();
            $("editorMessage").textContent = "Loading audio...";

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                notify("Your browser does not support Web Audio.");
                return;
            }

            if (!audioContext) audioContext = new AudioContextClass();
            await audioContext.resume();

            const arrayBuffer = await file.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(arrayBuffer);

            audioBuffer = decoded;
            currentFileName = file.name.replace(/\.[^/.]+$/, "") || "vexoniq-audio";

            Object.assign(settings, {
                volume: 1,
                bass: 0,
                mid: 0,
                treble: 0,
                pan: 0,
                speed: 1,
                pitch: 0,
                reverb: 0,
                reverse: false,
                mono: false,
                noise: false,
                autoPan: false,
                pan3D: false,
                trimStart: 0,
                trimEnd: 100,
                fadeIn: 0,
                fadeOut: 0
            });

            $("fileName").textContent = file.name;
            $("fileMeta").textContent =
                `${formatTime(decoded.duration)} · ${decoded.sampleRate} Hz · ${decoded.numberOfChannels} channel(s)`;

            $("fileStatus").textContent = "AUDIO LOADED";
            $("audioDetails").classList.remove("hidden");
            uploadArea.classList.add("hidden");
            $("exportButton").disabled = false;
            $("editorMessage").textContent = "Audio loaded. Choose an effect or preset.";

            $("duration").textContent = formatTime(decoded.duration);
            $("currentTime").textContent = "00:00";
            $("seekBar").value = 0;

            drawWaveform(decoded);
            notify("Audio loaded successfully.");
        } catch (error) {
            console.error(error);
            notify("Could not decode this file. Try a different audio format.");
            $("editorMessage").textContent = "Audio could not be decoded.";
        }
    }

    audioInput.addEventListener("change", event => {
        loadAudio(event.target.files[0]);
    });

    uploadArea.addEventListener("dragover", event => {
        event.preventDefault();
        uploadArea.classList.add("dragging");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragging");
    });

    uploadArea.addEventListener("drop", event => {
        event.preventDefault();
        uploadArea.classList.remove("dragging");
        loadAudio(event.dataTransfer.files[0]);
    });

    $("removeAudio").addEventListener("click", () => {
        stopPlayback();
        audioBuffer = null;
        audioInput.value = "";
        uploadArea.classList.remove("hidden");
        $("audioDetails").classList.add("hidden");
        $("fileStatus").textContent = "NO FILE LOADED";
        $("exportButton").disabled = true;
        $("wavePlaceholder").classList.remove("hidden");
        $("wavePlaceholder").textContent = "YOUR WAVEFORM WILL APPEAR HERE";
        ctx.clearRect(0, 0, waveform.width, waveform.height);
        $("editorMessage").textContent = "Upload an audio file to unlock the editor.";
        $("currentTime").textContent = "00:00";
        $("duration").textContent = "00:00";
        $("seekBar").value = 0;
        showEmptyControls();
    });

    // Tool cards
    function createCard(name, icon, description, target) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-card";
        button.innerHTML = `
            <span class="tool-icon">${icon}</span>
            <strong>${name}</strong>
            <small>${description}</small>
            <span class="tool-arrow">↗</span>
        `;
        button.addEventListener("click", () => selectTool(name, button));
        target.appendChild(button);
    }

    effects.forEach(item => createCard(item[0], item[1], item[2], $("effectsGrid")));
    otherTools.forEach(item => createCard(item[0], item[1], item[2], $("otherGrid")));

    presets.forEach((preset, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "preset-card";
        button.innerHTML = `
            <span class="preset-number">PRESET / ${String(index + 1).padStart(2, "0")}</span>
            <strong>${preset[0]}</strong>
            <small>${preset[1]}</small>
        `;
        button.addEventListener("click", () => applyPreset(preset[0]));
        $("presetsGrid").appendChild(button);
    });

    function showEmptyControls() {
        $("effectControls").innerHTML = `
            <div class="empty-controls">
                <span>♫</span>
                <h3>CHOOSE YOUR EFFECT.</h3>
                <p>Select any tool below to see its controls here.</p>
            </div>`;
        $("effectStatus").textContent = "READY";
        currentTool = null;
    }

    function field(label, id, min, max, value, step, unit = "") {
        return `
            <div class="control-field">
                <label for="${id}">${label}<output id="${id}Value">${value}${unit}</output></label>
                <input type="range" id="${id}" min="${min}" max="${max}"
                    value="${value}" step="${step}" data-unit="${unit}">
            </div>`;
    }

    function buttonControl(label, action, style = "") {
        return `<button type="button" class="small-button ${style}" data-action="${action}">${label}</button>`;
    }

    function controlMarkup(name) {
        switch (name) {
            case "Volume Changer":
                return field("OUTPUT VOLUME", "volumeControl", 0, 200, 100, 1, "%");

            case "Bass Booster":
                return field("BASS INTENSITY", "bassControl", -12, 18, settings.bass, 1, " dB");

            case "Equalizer":
                return field("LOW / BASS", "bassControl", -18, 18, settings.bass, 1, " dB") +
                       field("MID FREQUENCIES", "midControl", -18, 18, settings.mid, 1, " dB") +
                       field("HIGH / TREBLE", "trebleControl", -18, 18, settings.treble, 1, " dB");

            case "Stereo Panner":
                return field("LEFT ← → RIGHT", "panControl", -100, 100, settings.pan * 100, 1, "%");

            case "Pitch Shifter":
                return field("PITCH SHIFT", "pitchControl", -12, 12, settings.pitch, .1, " semitones");

            case "Tempo Changer":
                return field("PLAYBACK SPEED", "speedControl", 50, 150, settings.speed * 100, 1, "%");

            case "Reverb":
                return field("REVERB INTENSITY", "reverbControl", 0, 100, settings.reverb * 100, 1, "%");

            case "Trimmer / Cutter":
                return field("START POSITION", "trimStartControl", 0, 99, settings.trimStart, 1, "%") +
                       field("END POSITION", "trimEndControl", 1, 100, settings.trimEnd, 1, "%") +
                       `<p class="control-note">Select the part of the audio you want to export. The waveform preview shows the original file.</p>` +
                       buttonControl("APPLY TRIM", "trim");

            case "Reverse Audio":
                return `<p class="control-note">Reverse the complete audio buffer before exporting.</p>` +
                       buttonControl("REVERSE AUDIO", "reverse");

            case "Auto Panner":
                return `<p class="control-note">Automatically move the sound between the left and right channels during playback. Export uses a rendered stereo pan effect.</p>` +
                       field("PAN MOVEMENT", "panControl", 0, 100, 70, 1, "%") +
                       buttonControl("ENABLE AUTO PAN", "autopan");

            case "3D Audio":
                return `<p class="control-note">Creates a moving stereo-pan effect. Headphones provide the clearest stereo impression.</p>` +
                       field("MOVEMENT INTENSITY", "panControl", 0, 100, 70, 1, "%") +
                       buttonControl("ENABLE 3D EFFECT", "3d");

            case "Noise Reducer":
                return `<p class="control-note">This basic filter reduces some low-frequency rumble and high-frequency hiss. It is not a full AI noise-removal system.</p>` +
                       buttonControl("APPLY BASIC FILTER", "noise");

            case "Downmixer":
                return `<p class="control-note">Convert a stereo file to a single mono channel.</p>` +
                       buttonControl("CONVERT TO MONO", "mono");

            case "Converter":
                return `<p class="control-note">Export your decoded audio as a standard WAV file. Other formats depend on browser support and are not currently exported.</p>` +
                       buttonControl("EXPORT WAV", "export");

            case "Waveform Image":
                return `<p class="control-note">Save the current waveform visualisation as a PNG image.</p>` +
                       buttonControl("DOWNLOAD WAVEFORM PNG", "waveimage");

            case "Spectrogram Image":
                return `<p class="control-note">Create a visual representation of the audio's frequency content.</p>` +
                       buttonControl("DOWNLOAD SPECTROGRAM PNG", "spectrogram");

            case "BPM Detector":
                return `<p class="control-note">Estimate the tempo using audio signal analysis. Results may vary for complex or non-percussive recordings.</p>` +
                       buttonControl("DETECT BPM", "bpm");

            case "Vocal Remover":
                return `<p class="control-note">True vocal separation requires a dedicated source-separation model. This feature needs an additional processing engine and is not enabled in this browser-only version.</p>` +
                       buttonControl("CHECK REQUIREMENTS", "vocal");

            default:
                return `<p class="control-note">This effect is not yet connected to the audio processor.</p>`;
        }
    }

    function selectTool(name, card) {
        document.querySelectorAll(".tool-card").forEach(item => item.classList.remove("selected"));
        card.classList.add("selected");
        currentTool = name;
        $("effectStatus").textContent = "TOOL SELECTED";
        $("effectControls").innerHTML = `
            <div class="control-layout">${controlMarkup(name)}</div>
            <div class="control-buttons">
                ${buttonControl("RESET THIS EFFECT", "reset-tool")}
            </div>`;
        bindControls();
        $("effectControls").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function updateOutput(id, value) {
        const output = $(id + "Value");
        const input = $(id);
        if (output) output.textContent = value + (input.dataset.unit || "");
    }

    function bindRange(id, callback, displayValue) {
        const input = $(id);
        if (!input) return;
        input.addEventListener("input", () => {
            callback(Number(input.value));
            updateOutput(id, displayValue ? displayValue(Number(input.value)) : input.value);
        });
    }

    function bindControls() {
        bindRange("volumeControl", v => settings.volume = v / 100);
        bindRange("bassControl", v => settings.bass = v);
        bindRange("midControl", v => settings.mid = v);
        bindRange("trebleControl", v => settings.treble = v);
        bindRange("panControl", v => settings.pan = v / 100);
        bindRange("pitchControl", v => settings.pitch = v);
        bindRange("speedControl", v => settings.speed = v / 100);
        bindRange("reverbControl", v => settings.reverb = v / 100);

        bindRange("trimStartControl", v => {
            settings.trimStart = Math.min(v, settings.trimEnd - 1);
        });
        bindRange("trimEndControl", v => {
            settings.trimEnd = Math.max(v, settings.trimStart + 1);
        });
    }

    // Presets
    function applyPreset(name) {
        if (!requireAudio()) return;

        Object.assign(settings, {
            bass: 0,
            mid: 0,
            treble: 0,
            pan: 0,
            speed: 1,
            pitch: 0,
            reverb: 0,
            autoPan: false,
            pan3D: false,
            reverse: false
        });

        switch (name) {
            case "8D Audio":
                settings.pan = .8;
                settings.pan3D = true;
                settings.reverb = .35;
                break;

            case "Slowed and Reverb":
                settings.speed = .8;
                settings.reverb = .45;
                break;

            case "440 Hz to 432 Hz Converter":
                settings.pitch = -0.32;
                break;

            case "Very Light Bass Boost":
                settings.bass = 3;
                break;

            case "Light Bass Boost":
                settings.bass = 5;
                break;

            case "Moderate Bass Boost":
                settings.bass = 8;
                break;

            case "Heavy Bass Boost":
                settings.bass = 12;
                break;

            case "Extreme Bass Boost":
                settings.bass = 16;
                break;

            case "Vocal Reverb":
                settings.reverb = .3;
                break;

            case "Bathroom Reverb":
                settings.reverb = .45;
                break;

            case "Small Room Reverb":
                settings.reverb = .2;
                break;

            case "Medium Room Reverb":
                settings.reverb = .4;
                break;

            case "Large Room Reverb":
                settings.reverb = .6;
                break;

            case "Church Hall Reverb":
                settings.reverb = .75;
                break;

            case "Cathedral Reverb":
                settings.reverb = .9;
                break;
        }

        notify(`${name} preset applied. Export to hear the processed result.`);
        $("effectStatus").textContent = "PRESET APPLIED";
    }

    // Live playback
    async function playAudio() {
        if (!requireAudio()) return;

        await audioContext.resume();

        if (isPlaying) {
            pausedAt = getCurrentPosition();
            stopPlayback();
            $("currentTime").textContent = formatTime(pausedAt);
            return;
        }

        const start = settings.trimStart / 100 * audioBuffer.duration;
        const end = settings.trimEnd / 100 * audioBuffer.duration;

        if (end <= start) {
            notify("Please check the trim positions.");
            return;
        }

        if (pausedAt < start || pausedAt >= end) pausedAt = start;

        currentSource = audioContext.createBufferSource();
        currentSource.buffer = audioBuffer;
        currentSource.playbackRate.value = settings.speed;

        const bass = audioContext.createBiquadFilter();
        bass.type = "lowshelf";
        bass.frequency.value = 150;
        bass.gain.value = settings.bass;

        const mid = audioContext.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 1000;
        mid.Q.value = 1;
        mid.gain.value = settings.mid;

        const treble = audioContext.createBiquadFilter();
        treble.type = "highshelf";
        treble.frequency.value = 5000;
        treble.gain.value = settings.treble;

        const panner = audioContext.createStereoPanner();
        panner.pan.value = settings.pan;

        const gain = audioContext.createGain();
        gain.gain.value = settings.volume;

        currentSource.connect(bass);
        bass.connect(mid);
        mid.connect(treble);
        treble.connect(panner);
        panner.connect(gain);
        gain.connect(audioContext.destination);

        currentSource.onended = () => {
            if (currentSource) {
                isPlaying = false;
                currentSource = null;
                pausedAt = start;
                $("playButton").textContent = "▶";
            }
        };

        currentSource.start(0, pausedAt, end - pausedAt);
        playStartedAt = audioContext.currentTime;
        isPlaying = true;
        $("playButton").textContent = "Ⅱ";
        updatePlaybackUI();
    }

    function getCurrentPosition() {
        if (!isPlaying) return pausedAt;
        return pausedAt + (audioContext.currentTime - playStartedAt) * settings.speed;
    }

    function updatePlaybackUI() {
        if (!isPlaying) return;

        const position = getCurrentPosition();
        const percent = position / audioBuffer.duration * 100;

        $("currentTime").textContent = formatTime(position);
        $("seekBar").value = percent;

        animationFrame = requestAnimationFrame(updatePlaybackUI);
    }

    $("playButton").addEventListener("click", playAudio);

    $("seekBar").addEventListener("input", event => {
        if (!requireAudio()) return;

        const percent = Number(event.target.value) / 100;
        const position = percent * audioBuffer.duration;

        pausedAt = position;
        $("currentTime").textContent = formatTime(position);

        if (isPlaying) {
            stopPlayback();
            playAudio();
        }
    });

    // Audio processing and WAV export
    function makeReverbImpulse(context, duration = 2.2, decay = 2.5) {
        const length = Math.floor(context.sampleRate * duration);
        const impulse = context.createBuffer(2, length, context.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const fade = Math.pow(1 - i / length, decay);
                data[i] = (Math.random() * 2 - 1) * fade;
            }
        }

        return impulse;
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function bufferToWav(buffer) {
        const channels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const frames = buffer.length;
        const bytesPerSample = 2;
        const blockAlign = channels * bytesPerSample;
        const dataSize = frames * blockAlign;

        const arrayBuffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(arrayBuffer);

        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, "WAVE");
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, "data");
        view.setUint32(40, dataSize, true);

        let offset = 44;

        for (let i = 0; i < frames; i++) {
            for (let channel = 0; channel < channels; channel++) {
                let sample = buffer.getChannelData(channel)[i];
                sample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: "audio/wav" });
    }

    async function renderAudio() {
        if (!requireAudio()) return null;

        stopPlayback();
        $("editorMessage").textContent = "Processing audio...";

        const source = audioBuffer;
        const start = Math.floor(settings.trimStart / 100 * source.duration * source.sampleRate);
        const end = Math.floor(settings.trimEnd / 100 * source.duration * source.sampleRate);
        const selectedLength = end - start;

        if (selectedLength <= 0) {
            notify("Invalid trim selection.");
            return null;
        }

        const channels = settings.mono ? 1 : Math.min(source.numberOfChannels, 2);
        const speed = settings.speed * Math.pow(2, settings.pitch / 12);
        const outputFrames = Math.max(1, Math.floor(selectedLength / speed));
        const sampleRate = source.sampleRate;

        const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OfflineContext) {
            notify("Offline audio processing is not supported in this browser.");
            return null;
        }

        const offline = new OfflineContext(channels, outputFrames, sampleRate);

        const bufferSource = offline.createBufferSource();
        bufferSource.buffer = source;
        bufferSource.playbackRate.value = speed;

        const bass = offline.createBiquadFilter();
        bass.type = "lowshelf";
        bass.frequency.value = 150;
        bass.gain.value = settings.bass;

        const mid = offline.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 1000;
        mid.Q.value = 1;
        mid.gain.value = settings.mid;

        const treble = offline.createBiquadFilter();
        treble.type = "highshelf";
        treble.frequency.value = 5000;
        treble.gain.value = settings.treble;

        const highpass = offline.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = settings.noise ? 100 : 20;

        const lowpass = offline.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = settings.noise ? 13000 : 20000;

        const gain = offline.createGain();
        gain.gain.value = settings.volume;

        const panner = offline.createStereoPanner();
        panner.pan.value = settings.pan;

        bufferSource.connect(bass);
        bass.connect(mid);
        mid.connect(treble);
        treble.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(panner);
        panner.connect(gain);

        if (settings.reverb > 0) {
            const convolver = offline.createConvolver();
            convolver.buffer = makeReverbImpulse(offline);
            const wetGain = offline.createGain();
            const dryGain = offline.createGain();

            wetGain.gain.value = settings.reverb;
            dryGain.gain.value = 1 - settings.reverb * .5;

            gain.connect(dryGain);
            gain.connect(convolver);
            convolver.connect(wetGain);
            dryGain.connect(offline.destination);
            wetGain.connect(offline.destination);
        } else {
            gain.connect(offline.destination);
        }

        bufferSource.start(0, start / sampleRate, selectedLength / sampleRate);

        let rendered;

        try {
            rendered = await offline.startRendering();
        } catch (error) {
            console.error(error);
            notify("Audio processing failed.");
            return null;
        }

        if (settings.reverse) {
            for (let channel = 0; channel < rendered.numberOfChannels; channel++) {
                const data = rendered.getChannelData(channel);
                data.reverse();
            }
        }

        if (settings.pan3D && rendered.numberOfChannels >= 2) {
            const left = rendered.getChannelData(0);
            const right = rendered.getChannelData(1);

            for (let i = 0; i < left.length; i++) {
                const movement = Math.sin(i / sampleRate * Math.PI * 0.8) * .75;
                const l = left[i];
                const r = right[i];

                left[i] = l * (1 - Math.max(0, movement) * .5) + r * Math.max(0, -movement) * .5;
                right[i] = r * (1 - Math.max(0, -movement) * .5) + l * Math.max(0, movement) * .5;
            }
        }

        applyFades(rendered);
        $("editorMessage").textContent = "Processing complete. Ready to export.";
        return rendered;
    }

    function applyFades(buffer) {
        const fadeInFrames = Math.floor(settings.fadeIn * buffer.sampleRate);
        const fadeOutFrames = Math.floor(settings.fadeOut * buffer.sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);

            for (let i = 0; i < Math.min(fadeInFrames, data.length); i++) {
                data[i] *= i / Math.max(1, fadeInFrames);
            }

            for (let i = 0; i < Math.min(fadeOutFrames, data.length); i++) {
                const index = data.length - 1 - i;
                data[index] *= i / Math.max(1, fadeOutFrames);
            }
        }
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    async function exportAudio() {
        const rendered = await renderAudio();
        if (!rendered) return;

        const wav = bufferToWav(rendered);
        downloadBlob(wav, `${currentFileName}-vexoniq.wav`);
        notify("Your WAV file has been exported.");
    }

    $("exportButton").addEventListener("click", exportAudio);

    // Tool actions
    $("effectControls").addEventListener("click", async event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const action = button.dataset.action;

        if (action === "vocal") {
            notify("Vocal separation requires an additional AI processing engine.");
            return;
        }

        if (!requireAudio()) return;

        switch (action) {
            case "reverse":
                settings.reverse = !settings.reverse;
                notify(settings.reverse ? "Reverse effect enabled." : "Reverse effect disabled.");
                break;

            case "autopan":
                settings.autoPan = !settings.autoPan;
                settings.pan3D = settings.autoPan;
                notify(settings.autoPan ? "Auto pan enabled for export." : "Auto pan disabled.");
                break;

            case "3d":
                settings.pan3D = !settings.pan3D;
                notify(settings.pan3D ? "3D stereo movement enabled." : "3D effect disabled.");
                break;

            case "noise":
                settings.noise = !settings.noise;
                notify(settings.noise ? "Basic noise filter enabled." : "Basic noise filter disabled.");
                break;

            case "mono":
                settings.mono = true;
                notify("Mono export enabled.");
                break;

            case "trim":
                notify("Trim selection applied for export.");
                break;

            case "export":
                await exportAudio();
                break;

            case "reset-tool":
                if (currentTool === "Reverse Audio") settings.reverse = false;
                if (currentTool === "Noise Reducer") settings.noise = false;
                if (currentTool === "Downmixer") settings.mono = false;
                if (currentTool === "Auto Panner") settings.autoPan = false;
                if (currentTool === "3D Audio") settings.pan3D = false;
                notify("Selected effect reset.");
                break;

            case "waveimage":
                downloadWaveform();
                break;

            case "spectrogram":
                await downloadSpectrogram();
                break;

            case "bpm":
                detectBPM();
                break;
        }
    });

    // Waveform image
    function downloadWaveform() {
        if (!requireAudio()) return;

        const imageCanvas = document.createElement("canvas");
        imageCanvas.width = 1600;
        imageCanvas.height = 500;

        const imageCtx = imageCanvas.getContext("2d");
        imageCtx.fillStyle = "#11120f";
        imageCtx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);

        const data = audioBuffer.getChannelData(0);
        const middle = imageCanvas.height / 2;
        const step = Math.max(1, Math.floor(data.length / imageCanvas.width));

        imageCtx.strokeStyle = "#d7ff35";
        imageCtx.lineWidth = 2;
        imageCtx.beginPath();

        for (let x = 0; x < imageCanvas.width; x++) {
            let min = 1;
            let max = -1;

            for (let j = 0; j < step; j++) {
                const sample = data[x * step + j];
                if (sample === undefined) break;
                min = Math.min(min, sample);
                max = Math.max(max, sample);
            }

            imageCtx.moveTo(x, middle - max * 190);
            imageCtx.lineTo(x, middle - min * 190);
        }

        imageCtx.stroke();
        imageCanvas.toBlob(blob => {
            if (blob) downloadBlob(blob, `${currentFileName}-waveform.png`);
        });

        notify("Waveform image created.");
    }

    // Spectrogram image
    async function downloadSpectrogram() {
        if (!requireAudio()) return;

        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 500;

        const imageCtx = canvas.getContext("2d");
        const analyserContext = audioContext;
        const analyser = analyserContext.createAnalyser();

        analyser.fftSize = 2048;
        const source = analyserContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);

        const bins = analyser.frequencyBinCount;
        const data = new Uint8Array(bins);

        const columnCount = 600;
        const columnWidth = canvas.width / columnCount;

        imageCtx.fillStyle = "#11120f";
        imageCtx.fillRect(0, 0, canvas.width, canvas.height);

        const offlineStart = analyserContext.currentTime;
        source.start();

        for (let column = 0; column < columnCount; column++) {
            analyser.getByteFrequencyData(data);

            for (let y = 0; y < 250; y++) {
                const value = data[Math.floor(y / 250 * bins)] || 0;
                const brightness = value / 255;
                imageCtx.fillStyle = `rgb(${Math.floor(brightness * 215)},${Math.floor(brightness * 255)},${Math.floor(brightness * 53)})`;
                imageCtx.fillRect(column * columnWidth, 500 - y * 2, columnWidth + 1, 2);
            }
        }

        try { source.stop(); } catch (_) {}
        void offlineStart;

        canvas.toBlob(blob => {
            if (blob) downloadBlob(blob, `${currentFileName}-spectrogram.png`);
        });

        notify("Spectrogram image created.");
    }

    // BPM estimate using autocorrelation on an audio sample
    function detectBPM() {
        if (!requireAudio()) return;

        const data = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const maxSamples = Math.min(data.length, sampleRate * 15);
        const sampleStep = Math.max(1, Math.floor(maxSamples / 11025));
        const signal = [];

        for (let i = 0; i < maxSamples; i += sampleStep) {
            signal.push(data[i]);
        }

        const rate = sampleRate / sampleStep;
        const minLag = Math.floor(rate * 60 / 200);
        const maxLag = Math.floor(rate * 60 / 60);

        let bestLag = -1;
        let bestCorrelation = -Infinity;

        for (let lag = minLag; lag <= maxLag; lag++) {
            let correlation = 0;

            for (let i = 0; i < signal.length - lag; i++) {
                correlation += signal[i] * signal[i + lag];
            }

            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestLag = lag;
            }
        }

        if (bestLag < 1) {
            notify("Could not estimate BPM for this audio.");
            return;
        }

        let bpm = Math.round(60 * rate / bestLag);
        while (bpm < 70) bpm *= 2;
        while (bpm > 180) bpm /= 2;

        notify(`Estimated tempo: ${Math.round(bpm)} BPM. This is an approximate result.`);
    }

    // Reset
    $("resetButton").addEventListener("click", () => {
        if (!requireAudio()) return;

        stopPlayback();
        pausedAt = 0;

        Object.assign(settings, {
            volume: 1,
            bass: 0,
            mid: 0,
            treble: 0,
            pan: 0,
            speed: 1,
            pitch: 0,
            reverb: 0,
            reverse: false,
            mono: false,
            noise: false,
            autoPan: false,
            pan3D: false,
            trimStart: 0,
            trimEnd: 100,
            fadeIn: 0,
            fadeOut: 0
        });

        notify("All effects have been reset.");
        $("effectStatus").textContent = "RESET";
    });

    $("year").textContent = new Date().getFullYear();

    // Initial state
    showEmptyControls();

    console.log(
        "%c VEXONIQ AUDIO STUDIO ",
        "background:#d7ff35;color:#111;font-size:16px;font-weight:bold;padding:10px;"
    );
});
