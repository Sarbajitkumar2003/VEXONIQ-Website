
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // ELEMENTS
    const videoInput = document.getElementById("videoInput");
    const video = document.getElementById("videoPreview");
    const previewScreen = document.getElementById("previewScreen");
    const emptyPreview = document.getElementById("emptyPreview");
    const browseButton = document.getElementById("browseButton");
    const uploadButton = document.getElementById("uploadButton");
    const uploadArea = document.getElementById("uploadArea");

    const playButton = document.getElementById("playButton");
    const stopButton = document.getElementById("stopButton");
    const seekBar = document.getElementById("seekBar");

    const currentTime = document.getElementById("currentTime");
    const durationTime = document.getElementById("durationTime");
    const previewTime = document.getElementById("previewTime");

    const speedControl = document.getElementById("speedControl");
    const volumeControl = document.getElementById("volumeControl");
    const brightnessControl = document.getElementById("brightnessControl");
    const contrastControl = document.getElementById("contrastControl");
    const saturationControl = document.getElementById("saturationControl");
    const muteControl = document.getElementById("muteControl");

    const speedValue = document.getElementById("speedValue");
    const volumeValue = document.getElementById("volumeValue");
    const brightnessValue = document.getElementById("brightnessValue");
    const contrastValue = document.getElementById("contrastValue");
    const saturationValue = document.getElementById("saturationValue");

    const trimStart = document.getElementById("trimStart");
    const trimEnd = document.getElementById("trimEnd");
    const applyTrim = document.getElementById("applyTrim");

    const exportButton = document.getElementById("exportButton");
    const exportQuality = document.getElementById("exportQuality");
    const exportProgress = document.getElementById("exportProgress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    const projectName = document.getElementById("projectName");
    const videoStatus = document.getElementById("videoStatus");
    const clipName = document.getElementById("clipName");
    const clipBlock = document.getElementById("clipBlock");
    const timelineDuration = document.getElementById("timelineDuration");
    const resetButton = document.getElementById("resetButton");
    const resetEffects = document.getElementById("resetEffects");
    const toast = document.getElementById("toast");

    let videoURL = null;
    let toastTimer = null;
    let hasVideo = false;
    let trimStartTime = 0;
    let trimEndTime = 0;
    let isExporting = false;
    let exportFrame = null;

    const originalFileName = "UNTITLED PROJECT";

    // TOOLKIT
    const tools = [
        ["✂", "Video Trimmer", "Cut unwanted sections from your footage.", "AVAILABLE"],
        ["▣", "Video Merger", "Combine multiple video clips into one.", "COMING SOON"],
        ["◫", "Video Splitter", "Divide a video into smaller sections.", "COMING SOON"],
        ["↔", "Crop & Resize", "Prepare your footage for different formats.", "COMING SOON"],
        ["⤾", "Rotate & Flip", "Change video orientation and direction.", "COMING SOON"],
        ["◴", "Speed Changer", "Adjust playback speed from the workspace.", "AVAILABLE"],
        ["◁", "Reverse Video", "Play your footage in reverse.", "COMING SOON"],
        ["♫", "Audio Extractor", "Extract the soundtrack from a video.", "COMING SOON"],
        ["◖", "Mute Video", "Mute the audio using the editor controls.", "AVAILABLE"],
        ["＋", "Add Music", "Add a separate music track to your project.", "COMING SOON"],
        ["T", "Text & Titles", "Create titles and on-screen captions.", "COMING SOON"],
        ["CC", "Subtitles", "Add subtitle tracks to your video.", "COMING SOON"],
        ["✦", "Filters & Effects", "Adjust the visual look of your footage.", "AVAILABLE"],
        ["◐", "Color Adjustments", "Tune brightness, contrast and saturation.", "AVAILABLE"],
        ["⇩", "Video Compressor", "Reduce file size with encoding controls.", "COMING SOON"],
        ["⇄", "Video Converter", "Convert videos into other formats.", "COMING SOON"],
        ["GIF", "GIF Maker", "Create animated GIFs from video clips.", "COMING SOON"],
        ["▦", "Video to Frames", "Extract still images from a video.", "COMING SOON"],
        ["Ⅱ", "Slow Motion", "Create slower playback using speed control.", "AVAILABLE"],
        ["↗", "Fade In / Fade Out", "Create smooth transitions between scenes.", "COMING SOON"]
    ];

    const toolGrid = document.getElementById("toolGrid");

    tools.forEach(([icon, name, description, status]) => {
        const card = document.createElement("article");
        card.className = "tool-card";

        const iconElement = document.createElement("div");
        iconElement.className = "tool-icon";
        iconElement.textContent = icon;

        const title = document.createElement("h3");
        title.textContent = name;

        const text = document.createElement("p");
        text.textContent = description;

        const tag = document.createElement("span");
        tag.className = "tool-tag";
        tag.textContent = status;

        card.append(iconElement, title, text, tag);

        if (status === "AVAILABLE") {
            card.style.cursor = "pointer";
            card.addEventListener("click", () => {
                if (!hasVideo) {
                    showToast("Import a video first to use this feature.");
                    return;
                }

                document.getElementById("editor").scrollIntoView({
                    behavior: "smooth"
                });

                if (name === "Video Trimmer") {
                    trimStart.focus();
                } else if (name === "Speed Changer" || name === "Slow Motion") {
                    speedControl.focus();
                } else if (name === "Mute Video") {
                    muteControl.focus();
                } else {
                    brightnessControl.focus();
                }
            });
        }

        toolGrid.appendChild(card);
    });

    // HELPERS
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    function getFilter() {
        return [
            `brightness(${brightnessControl.value}%)`,
            `contrast(${contrastControl.value}%)`,
            `saturate(${saturationControl.value}%)`
        ].join(" ");
    }

    function updateFilter() {
        video.style.filter = getFilter();
    }

    function updateTime() {
        if (!hasVideo) return;

        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const current = video.currentTime || 0;

        currentTime.textContent = formatTime(current);
        durationTime.textContent = formatTime(duration);
        previewTime.textContent =
            `${formatTime(current)} / ${formatTime(duration)}`;

        seekBar.value = duration ? (current / duration) * 100 : 0;
    }

    function setEditorEnabled(enabled) {
        [
            playButton,
            stopButton,
            seekBar,
            speedControl,
            volumeControl,
            brightnessControl,
            contrastControl,
            saturationControl,
            muteControl,
            trimStart,
            trimEnd,
            applyTrim,
            exportButton,
            resetEffects
        ].forEach(element => {
            element.disabled = !enabled;
        });
    }

    // FILE UPLOAD
    function openFilePicker() {
        videoInput.click();
    }

    browseButton.addEventListener("click", openFilePicker);
    uploadButton.addEventListener("click", openFilePicker);
    uploadArea.addEventListener("click", event => {
        if (event.target.closest("button")) return;
        openFilePicker();
    });

    videoInput.addEventListener("change", event => {
        const file = event.target.files[0];
        if (file) loadVideo(file);
    });

    function loadVideo(file) {
        if (!file.type.startsWith("video/")) {
            showToast("Please select a valid video file.");
            return;
        }

        if (videoURL) URL.revokeObjectURL(videoURL);

        video.pause();
        videoURL = URL.createObjectURL(file);
        video.src = videoURL;
        video.load();

        video.onloadedmetadata = () => {
            hasVideo = true;

            emptyPreview.style.display = "none";
            video.style.display = "block";

            projectName.textContent = file.name.toUpperCase().slice(0, 35);
            clipName.textContent = file.name.toUpperCase().slice(0, 25);
            videoStatus.textContent = "MEDIA READY";

            const duration = Number.isFinite(video.duration) ? video.duration : 0;

            trimStartTime = 0;
            trimEndTime = duration;

            trimStart.value = "0";
            trimEnd.value = duration.toFixed(1);

            trimStart.max = duration;
            trimEnd.max = duration;

            timelineDuration.textContent = formatTime(duration);

            // Visual timeline width is relative to a one-minute display.
            const visualWidth = Math.min(100, (duration / 60) * 100);
            clipBlock.style.width = `${Math.max(visualWidth, 5)}%`;

            setEditorEnabled(true);
            updateTime();
            updateFilter();

            showToast("Video imported successfully.");
        };

        video.onerror = () => {
            showToast("This video format could not be opened by your browser.");
            hasVideo = false;
            setEditorEnabled(false);
        };
    }

    // DRAG AND DROP
    ["dragenter", "dragover"].forEach(type => {
        uploadArea.addEventListener(type, event => {
            event.preventDefault();
            uploadArea.classList.add("dragging");
        });
    });

    ["dragleave", "drop"].forEach(type => {
        uploadArea.addEventListener(type, event => {
            event.preventDefault();
            uploadArea.classList.remove("dragging");
        });
    });

    uploadArea.addEventListener("drop", event => {
        const file = event.dataTransfer.files[0];
        if (file) loadVideo(file);
    });

    // PLAYBACK
    playButton.addEventListener("click", async () => {
        if (!hasVideo) return;

        if (video.paused) {
            try {
                if (video.currentTime >= trimEndTime) {
                    video.currentTime = trimStartTime;
                }

                await video.play();
                playButton.textContent = "Ⅱ";
            } catch {
                showToast("Unable to play this video.");
            }
        } else {
            video.pause();
            playButton.textContent = "▶";
        }
    });

    stopButton.addEventListener("click", () => {
        if (!hasVideo) return;

        video.pause();
        video.currentTime = trimStartTime;
        playButton.textContent = "▶";
        updateTime();
    });

    video.addEventListener("timeupdate", () => {
        updateTime();

        if (
            hasVideo &&
            !isExporting &&
            video.currentTime >= trimEndTime &&
            !video.paused
        ) {
            video.pause();
            video.currentTime = trimStartTime;
            playButton.textContent = "▶";
        }
    });

    video.addEventListener("ended", () => {
        playButton.textContent = "▶";
    });

    video.addEventListener("pause", () => {
        if (!isExporting) playButton.textContent = "▶";
    });

    video.addEventListener("play", () => {
        playButton.textContent = "Ⅱ";
    });

    seekBar.addEventListener("input", () => {
        if (!hasVideo) return;

        const wasPlaying = !video.paused;
        video.pause();

        const duration = video.duration || 0;
        const requestedTime = (Number(seekBar.value) / 100) * duration;

        video.currentTime = Math.max(
            trimStartTime,
            Math.min(requestedTime, trimEndTime)
        );

        if (wasPlaying) {
            video.play().catch(() => {});
        }

        updateTime();
    });

    // PLAYBACK SPEED
    speedControl.addEventListener("input", () => {
        const speed = Number(speedControl.value);

        video.playbackRate = speed;
        speedValue.textContent = `${speed.toFixed(2).replace(/0$/, "")}×`;
    });

    // VOLUME
    volumeControl.addEventListener("input", () => {
        const volume = Number(volumeControl.value);

        video.volume = volume / 100;
        volumeValue.textContent = `${volume}%`;
    });

    // MUTE
    muteControl.addEventListener("change", () => {
        video.muted = muteControl.checked;
        showToast(muteControl.checked ? "Audio muted." : "Audio enabled.");
    });

    // VISUAL ADJUSTMENTS
    const visualControls = [
        [brightnessControl, brightnessValue, "%"],
        [contrastControl, contrastValue, "%"],
        [saturationControl, saturationValue, "%"]
    ];

    visualControls.forEach(([control, output, suffix]) => {
        control.addEventListener("input", () => {
            output.textContent = `${control.value}${suffix}`;
            updateFilter();
        });
    });

    // RESET EFFECTS
    function resetAdjustments() {
        speedControl.value = 1;
        volumeControl.value = 100;
        brightnessControl.value = 100;
        contrastControl.value = 100;
        saturationControl.value = 100;
        muteControl.checked = false;

        speedValue.textContent = "1.0×";
        volumeValue.textContent = "100%";
        brightnessValue.textContent = "100%";
        contrastValue.textContent = "100%";
        saturationValue.textContent = "100%";

        if (hasVideo) {
            video.playbackRate = 1;
            video.volume = 1;
            video.muted = false;
            updateFilter();
        }
    }

    resetEffects.addEventListener("click", resetAdjustments);

    // TRIM
    applyTrim.addEventListener("click", () => {
        if (!hasVideo) return;

        const start = Number(trimStart.value);
        const end = Number(trimEnd.value);
        const duration = video.duration;

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            start < 0 ||
            end > duration ||
            start >= end
        ) {
            showToast("Enter a valid trim start and end time.");
            return;
        }

        trimStartTime = start;
        trimEndTime = end;

        video.currentTime = trimStartTime;
        updateTime();

        showToast("Trim range applied. Export to save the trimmed clip.");
    });

    // EXPORT VIDEO
    function getSupportedMimeType() {
        if (!window.MediaRecorder) return "";

        const types = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm"
        ];

        return types.find(type => MediaRecorder.isTypeSupported(type)) || "";
    }

    function canvasToDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    function drawExportFrame(canvas, context) {
        const width = canvas.width;
        const height = canvas.height;

        context.clearRect(0, 0, width, height);
        context.fillStyle = "#000";
        context.fillRect(0, 0, width, height);

        if (video.readyState >= 2) {
            const sourceWidth = video.videoWidth;
            const sourceHeight = video.videoHeight;

            const scale = Math.min(
                width / sourceWidth,
                height / sourceHeight
            );

            const drawWidth = sourceWidth * scale;
            const drawHeight = sourceHeight * scale;

            const x = (width - drawWidth) / 2;
            const y = (height - drawHeight) / 2;

            context.filter = getFilter();
            context.drawImage(video, x, y, drawWidth, drawHeight);
            context.filter = "none";
        }
    }

    async function exportVideo() {
        if (!hasVideo || isExporting) return;

        if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
            showToast("Video export is not supported in this browser.");
            return;
        }

        const mimeType = getSupportedMimeType();

        if (!mimeType) {
            showToast("Your browser does not support WebM recording.");
            return;
        }

        if (trimEndTime <= trimStartTime) {
            showToast("Please select a valid trim range.");
            return;
        }

        const canvas = document.createElement("canvas");

        const quality = Number(exportQuality.value);
        const sourceWidth = video.videoWidth || 1280;
        const sourceHeight = video.videoHeight || 720;

        // Scale output to a practical maximum size.
        const maxWidth = quality >= 2 ? 1920 : 1280;
        const scale = Math.min(1, maxWidth / sourceWidth);

        canvas.width = Math.max(2, Math.round(sourceWidth * scale / 2) * 2);
        canvas.height = Math.max(2, Math.round(sourceHeight * scale / 2) * 2);

        const context = canvas.getContext("2d");
        const canvasStream = canvas.captureStream(30);

        // Include the source video's audio stream when available.
        let audioTracks = [];

        try {
            const capture = video.captureStream || video.mozCaptureStream;

            if (capture) {
                const sourceStream = capture.call(video);
                audioTracks = sourceStream.getAudioTracks();
            }
        } catch {
            audioTracks = [];
        }

        const outputStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks
        ]);

        const bitrate = quality * 1000000;

        let recorder;

        try {
            recorder = new MediaRecorder(outputStream, {
                mimeType,
                videoBitsPerSecond: bitrate
            });
        } catch {
            showToast("Could not start the video recorder.");
            outputStream.getTracks().forEach(track => track.stop());
            return;
        }

        const chunks = [];
        const originalTime = video.currentTime;
        const originalRate = video.playbackRate;
        const originalPaused = video.paused;

        const exportDuration = trimEndTime - trimStartTime;
        const startedAt = performance.now();

        isExporting = true;
        exportButton.disabled = true;
        resetButton.disabled = true;
        exportProgress.hidden = false;
        progressFill.style.width = "0%";
        progressText.textContent = "Preparing export...";

        function renderFrame() {
            if (!isExporting) return;

            drawExportFrame(canvas, context);

            const elapsed = (performance.now() - startedAt) / 1000;
            const percentage = Math.min(95, (elapsed / exportDuration) * 100);

            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `Recording video... ${Math.round(percentage)}%`;

            if (video.currentTime >= trimEndTime || video.ended) {
                finishExport();
                return;
            }

            exportFrame = requestAnimationFrame(renderFrame);
        }

        function finishExport() {
            if (!isExporting) return;

            isExporting = false;

            if (exportFrame) cancelAnimationFrame(exportFrame);

            video.pause();

            if (recorder.state !== "inactive") {
                recorder.stop();
            }
        }

        recorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.onerror = () => {
            finishExport();
            showToast("An error occurred during export.");
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });

            outputStream.getTracks().forEach(track => track.stop());

            video.playbackRate = originalRate;
            video.currentTime = Math.min(originalTime, video.duration || 0);

            if (originalPaused === false) {
                video.play().catch(() => {});
            }

            isExporting = false;
            exportButton.disabled = false;
            resetButton.disabled = false;

            progressFill.style.width = "100%";
            progressText.textContent = "Export complete.";

            if (blob.size > 0) {
                const baseName = (videoInput.files[0]?.name || "vexoniq-video")
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[^a-z0-9-_]/gi, "_");

                canvasToDownload(blob, `${baseName}-edited.webm`);
                showToast("Your video export is ready!");
            } else {
                showToast("Export failed. Please try again.");
            }

            setTimeout(() => {
                exportProgress.hidden = true;
            }, 3500);

            updateTime();
        };

        try {
            video.pause();
            video.currentTime = trimStartTime;

            await new Promise((resolve, reject) => {
                const onSeeked = () => {
                    cleanup();
                    resolve();
                };

                const onError = () => {
                    cleanup();
                    reject(new Error("Video seek failed"));
                };

                const cleanup = () => {
                    video.removeEventListener("seeked", onSeeked);
                    video.removeEventListener("error", onError);
                };

                video.addEventListener("seeked", onSeeked, { once: true });
                video.addEventListener("error", onError, { once: true });

                if (Math.abs(video.currentTime - trimStartTime) < 0.01) {
                    cleanup();
                    resolve();
                }
            });

            video.playbackRate = originalRate;
            video.muted = muteControl.checked;

            recorder.start(250);

            await video.play();

            renderFrame();

            showToast("Export recording started. Keep this tab open.");
        } catch (error) {
            console.error(error);

            isExporting = false;

            if (recorder.state !== "inactive") {
                recorder.stop();
            }

            outputStream.getTracks().forEach(track => track.stop());

            exportButton.disabled = false;
            resetButton.disabled = false;
            exportProgress.hidden = true;

            showToast("Could not start export. Try playing the video first.");
        }
    }

    exportButton.addEventListener("click", exportVideo);

    // RESET PROJECT
    resetButton.addEventListener("click", () => {
        if (isExporting) {
            showToast("Wait for the current export to finish.");
            return;
        }

        video.pause();

        if (videoURL) {
            URL.revokeObjectURL(videoURL);
            videoURL = null;
        }

        video.removeAttribute("src");
        video.load();

        video.style.display = "none";
        emptyPreview.style.display = "block";

        videoInput.value = "";
        hasVideo = false;

        projectName.textContent = originalFileName;
        videoStatus.textContent = "NO MEDIA LOADED";
        clipName.textContent = "NO CLIP";

        clipBlock.style.width = "0";
        timelineDuration.textContent = "00:00";

        trimStart.value = 0;
        trimEnd.value = 0;

        trimStartTime = 0;
        trimEndTime = 0;

        seekBar.value = 0;
        currentTime.textContent = "00:00";
        durationTime.textContent = "00:00";
        previewTime.textContent = "00:00 / 00:00";

        resetAdjustments();
        setEditorEnabled(false);

        showToast("Project has been reset.");
    });

    // INITIAL STATE
    setEditorEnabled(false);
    updateTime();

    window.addEventListener("beforeunload", () => {
        if (videoURL) URL.revokeObjectURL(videoURL);
    });

    console.log(
        "%c VEXONIQ VIDEO STUDIO ",
        "background:#d7ff35;color:#10110e;font-size:16px;font-weight:bold;padding:9px;"
    );
});
