
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // ELEMENTS
    // ==========================================

    const $ = id => document.getElementById(id);

    const canvas = $("photoCanvas");
    const ctx = canvas?.getContext("2d");

    const stage = $("canvasStage");
    const imageInput = $("imageInput");
    const placeholder = $("placeholder");
    const cropBox = $("cropBox");
    const toast = $("toast");

    if (!canvas || !ctx) {
        console.error("VEXONIQ Photo Studio: Canvas not found.");
        return;
    }

    // ==========================================
    // APPLICATION STATE
    // ==========================================

    let sourceImage = new Image();
    let hasImage = false;

    let baseWidth = 0;
    let baseHeight = 0;

    let currentTool = "move";
    let isDrawing = false;

    let currentStroke = null;
    let startPoint = null;

    let cropSelection = null;

    let zoom = 1;
    let toastTimer;

    let adjustments = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0
    };

    let transform = {
        rotation: 0,
        flipH: false,
        flipV: false
    };

    let activeFilter = "normal";

    // All editable layers are stored in one ordered stack.
    // The first layer is always the background.
    let layers = [];

    let selectedLayerId = "background";
    let layerIdCounter = 0;

    let history = [];
    let historyIndex = -1;

    const MAX_HISTORY = 40;

    const adjustmentIds = [
        "brightness",
        "contrast",
        "saturation",
        "blur",
        "grayscale",
        "sepia"
    ];

    // ==========================================
    // HELPERS
    // ==========================================

    function createLayerId() {
        layerIdCounter++;
        return "layer_" + Date.now() + "_" + layerIdCounter;
    }

    function notify(message) {
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }

    function getSelectedLayer() {
        return layers.find(layer => layer.id === selectedLayerId) || null;
    }

    function getLayerIndex(id) {
        return layers.findIndex(layer => layer.id === id);
    }

    function cloneLayers() {
        return JSON.parse(JSON.stringify(layers));
    }

    // ==========================================
    // CANVAS DIMENSIONS
    // ==========================================

    function updateCanvasDimensions() {
        const rotated = Math.abs(transform.rotation % 180) === 90;

        canvas.width = rotated ? baseHeight : baseWidth;
        canvas.height = rotated ? baseWidth : baseHeight;

        if ($("imageDimensions")) {
            $("imageDimensions").textContent =
                `${canvas.width} × ${canvas.height}`;
        }
    }

    // ==========================================
    // HISTORY SYSTEM
    // ==========================================

    function cloneState() {
        return {
            source: sourceImage.src,
            baseWidth,
            baseHeight,
            adjustments: { ...adjustments },
            transform: { ...transform },
            activeFilter,
            layers: cloneLayers(),
            selectedLayerId,
            layerIdCounter
        };
    }

    function saveHistory() {
        if (!hasImage) return;

        history = history.slice(0, historyIndex + 1);

        history.push(cloneState());

        if (history.length > MAX_HISTORY) {
            history.shift();
        }

        historyIndex = history.length - 1;

        updateHistoryButtons();
    }

    function updateHistoryButtons() {
        const undoBtn = $("undoBtn");
        const redoBtn = $("redoBtn");

        if (undoBtn) {
            undoBtn.disabled = historyIndex <= 0;
            undoBtn.style.opacity =
                historyIndex <= 0 ? ".4" : "1";
        }

        if (redoBtn) {
            redoBtn.disabled = historyIndex >= history.length - 1;
            redoBtn.style.opacity =
                historyIndex >= history.length - 1 ? ".4" : "1";
        }
    }

    function restoreState(state) {
        if (!state) return;

        const image = new Image();

        image.onload = () => {
            sourceImage = image;

            baseWidth = state.baseWidth || image.naturalWidth;
            baseHeight = state.baseHeight || image.naturalHeight;

            adjustments = { ...state.adjustments };
            transform = { ...state.transform };

            activeFilter = state.activeFilter || "normal";

            layers = JSON.parse(
                JSON.stringify(state.layers || [])
            );

            selectedLayerId = state.selectedLayerId || "background";
            layerIdCounter = state.layerIdCounter || 0;

            if (!layers.length) {
                layers = [{
                    id: "background",
                    name: "Background",
                    type: "background",
                    visible: true,
                    locked: true
                }];
            }

            updateCanvasDimensions();
            syncControls();
            updateFilterButtons();

            render();
            updateLayers();
            fitCanvas();
            updateHistoryButtons();
        };

        image.onerror = () => {
            notify("Unable to restore edit.");
        };

        image.src = state.source;
    }

    function undo() {
        if (historyIndex <= 0) return;

        historyIndex--;

        restoreState(history[historyIndex]);

        notify("Undo completed.");
    }

    function redo() {
        if (historyIndex >= history.length - 1) return;

        historyIndex++;

        restoreState(history[historyIndex]);

        notify("Redo completed.");
    }

    $("undoBtn")?.addEventListener("click", undo);
    $("redoBtn")?.addEventListener("click", redo);

    // ==========================================
    // IMAGE LOADING
    // ==========================================

    function openImage() {
        imageInput?.click();
    }

    $("openImageBtn")?.addEventListener("click", openImage);
    $("placeholderUpload")?.addEventListener("click", openImage);

    function loadImageFile(file) {
        if (!file || !file.type.startsWith("image/")) {
            notify("Please select a valid image.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {

                sourceImage = image;
                hasImage = true;

                const maxDimension = 1800;

                const scale = Math.min(
                    1,
                    maxDimension / Math.max(
                        image.naturalWidth,
                        image.naturalHeight
                    )
                );

                baseWidth = Math.round(image.naturalWidth * scale);
                baseHeight = Math.round(image.naturalHeight * scale);

                transform = {
                    rotation: 0,
                    flipH: false,
                    flipV: false
                };

                adjustments = {
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    blur: 0,
                    grayscale: 0,
                    sepia: 0
                };

                activeFilter = "normal";

                layers = [{
                    id: "background",
                    name: "Background",
                    type: "background",
                    visible: true,
                    locked: true
                }];

                selectedLayerId = "background";

                cropSelection = null;
                currentStroke = null;

                if (placeholder) {
                    placeholder.style.display = "none";
                }

                canvas.style.display = "block";

                const documentName = $("documentName");

                if (documentName) {
                    const name = file.name || "Untitled Image";

                    documentName.textContent =
                        name.length > 25
                            ? name.slice(0, 22) + "..."
                            : name;
                }

                updateCanvasDimensions();

                syncControls();
                updateFilterButtons();

                render();
                updateLayers();

                history = [];
                historyIndex = -1;

                saveHistory();
                fitCanvas();

                notify("Image loaded successfully.");
            };

            image.onerror = () => notify("Unable to open this image.");

            image.src = reader.result;
        };

        reader.onerror = () => notify("Unable to read this file.");

        reader.readAsDataURL(file);
    }

    imageInput?.addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (file) loadImageFile(file);

        event.target.value = "";
    });

    // ==========================================
    // DRAG AND DROP
    // ==========================================

    if (stage) {

        stage.addEventListener("dragover", event => {
            event.preventDefault();
            stage.classList.add("drag-active");
        });

        stage.addEventListener("dragleave", event => {
            if (!stage.contains(event.relatedTarget)) {
                stage.classList.remove("drag-active");
            }
        });

        stage.addEventListener("drop", event => {
            event.preventDefault();

            stage.classList.remove("drag-active");

            const file = event.dataTransfer.files?.[0];

            if (file) loadImageFile(file);
        });
    }

    // ==========================================
    // FILTER ENGINE
    // ==========================================

    function getFilterValues() {

        let brightness = adjustments.brightness;
        let contrast = adjustments.contrast;
        let saturation = adjustments.saturation;

        let grayscale = adjustments.grayscale;
        let sepia = adjustments.sepia;

        if (activeFilter === "mono") {
            grayscale = 100;
        }

        if (activeFilter === "vintage") {
            sepia = Math.max(sepia, 65);
            contrast += 10;
        }

        if (activeFilter === "cinematic") {
            contrast += 25;
            saturation = Math.max(0, saturation - 20);
            brightness -= 5;
        }

        if (activeFilter === "warm") {
            sepia = Math.max(sepia, 30);
            saturation += 15;
        }

        if (activeFilter === "cool") {
            saturation = Math.max(0, saturation - 15);
            contrast += 5;
        }

        return {
            brightness,
            contrast,
            saturation,
            grayscale,
            sepia
        };
    }

    // ==========================================
    // DRAW LAYER
    // ==========================================

    function drawDrawingLayer(layer, targetCtx) {

        if (!layer.points?.length) return;

        targetCtx.save();

        if (layer.tool === "eraser") {
            targetCtx.globalCompositeOperation = "destination-out";
        }

        targetCtx.strokeStyle = layer.color;
        targetCtx.fillStyle = layer.color;

        targetCtx.lineWidth = layer.size;
        targetCtx.lineCap = "round";
        targetCtx.lineJoin = "round";

        if (layer.type === "shape" || layer.tool === "shape") {

            const first = layer.points[0];
            const last = layer.points[layer.points.length - 1];

            targetCtx.strokeRect(
                first.x,
                first.y,
                last.x - first.x,
                last.y - first.y
            );

        } else {

            targetCtx.beginPath();

            targetCtx.moveTo(
                layer.points[0].x,
                layer.points[0].y
            );

            layer.points.forEach(point => {
                targetCtx.lineTo(point.x, point.y);
            });

            if (layer.points.length === 1) {
                targetCtx.lineTo(
                    layer.points[0].x + 0.1,
                    layer.points[0].y
                );
            }

            targetCtx.stroke();
        }

        targetCtx.restore();
    }

    // ==========================================
    // MAIN RENDER ENGINE
    // ==========================================

    function render() {
        if (!hasImage) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const background = layers.find(
            layer => layer.type === "background"
        );

        // BACKGROUND IMAGE
        if (!background || background.visible !== false) {

            const values = getFilterValues();

            ctx.save();

            ctx.filter = `
                brightness(${values.brightness}%)
                contrast(${values.contrast}%)
                saturate(${values.saturation}%)
                grayscale(${values.grayscale}%)
                sepia(${values.sepia}%)
                blur(${adjustments.blur}px)
            `;

            ctx.translate(canvas.width / 2, canvas.height / 2);

            ctx.rotate(transform.rotation * Math.PI / 180);

            ctx.scale(
                transform.flipH ? -1 : 1,
                transform.flipV ? -1 : 1
            );

            ctx.drawImage(
                sourceImage,
                -baseWidth / 2,
                -baseHeight / 2,
                baseWidth,
                baseHeight
            );

            ctx.restore();
        }

        ctx.filter = "none";

        // All editable layers are rendered in stack order.
        // Drawing layers share a transparent surface so the
        // eraser affects previous drawing marks, not the photo.

        const drawingSurface = document.createElement("canvas");

        drawingSurface.width = canvas.width;
        drawingSurface.height = canvas.height;

        const drawingCtx = drawingSurface.getContext("2d");

        layers.forEach(layer => {

            if (layer.visible === false) return;

            if (layer.type === "background") return;

            if (layer.type === "drawing" || layer.type === "shape") {
                drawDrawingLayer(layer, drawingCtx);
            }

            if (layer.type === "text") {

                ctx.drawImage(drawingSurface, 0, 0);

                drawingCtx.clearRect(
                    0,
                    0,
                    drawingSurface.width,
                    drawingSurface.height
                );

                ctx.save();

                ctx.fillStyle = layer.color || "#ffffff";
                ctx.font = `bold ${layer.size}px Arial`;
                ctx.textBaseline = "top";

                ctx.fillText(
                    layer.text,
                    layer.x,
                    layer.y
                );

                ctx.restore();
            }
        });

        ctx.drawImage(drawingSurface, 0, 0);

        // Temporary shape preview
        if (
            isDrawing &&
            currentStroke &&
            currentTool === "shape"
        ) {
            const points = currentStroke.points;

            if (points.length >= 2) {
                ctx.save();

                ctx.strokeStyle = currentStroke.color;
                ctx.lineWidth = currentStroke.size;

                ctx.strokeRect(
                    points[0].x,
                    points[0].y,
                    points[1].x - points[0].x,
                    points[1].y - points[0].y
                );

                ctx.restore();
            }
        }
    }

    // ==========================================
    // TOOL SELECTION
    // ==========================================

    document.querySelectorAll(".tool").forEach(button => {

        button.addEventListener("click", () => {

            currentTool = button.dataset.tool;

            document.querySelectorAll(".tool").forEach(tool => {
                tool.classList.toggle("active", tool === button);
            });

            if ($("toolStatus")) {
                $("toolStatus").textContent =
                    currentTool.toUpperCase() + " TOOL";
            }

            if (cropBox) {
                cropBox.style.display = "none";
            }

            if (currentTool === "crop" && hasImage) {
                notify("Drag over the image to select a crop area.");
            }
        });
    });

    // ==========================================
    // CANVAS COORDINATES
    // ==========================================

    function getCanvasPoint(event) {

        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }

    // ==========================================
    // CROP BOX
    // ==========================================

    function updateCropBox() {

        if (!cropSelection || !cropBox || !stage) return;

        const canvasRect = canvas.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();

        const scaleX = canvasRect.width / canvas.width;
        const scaleY = canvasRect.height / canvas.height;

        const left = Math.min(
            cropSelection.x,
            cropSelection.x + cropSelection.width
        );

        const top = Math.min(
            cropSelection.y,
            cropSelection.y + cropSelection.height
        );

        cropBox.style.display = "block";

        cropBox.style.left =
            `${canvasRect.left - stageRect.left + stage.scrollLeft + left * scaleX}px`;

        cropBox.style.top =
            `${canvasRect.top - stageRect.top + stage.scrollTop + top * scaleY}px`;

        cropBox.style.width =
            `${Math.abs(cropSelection.width) * scaleX}px`;

        cropBox.style.height =
            `${Math.abs(cropSelection.height) * scaleY}px`;
    }

    // ==========================================
    // POINTER DOWN
    // ==========================================

    canvas.addEventListener("pointerdown", event => {

        if (!hasImage || currentTool === "move") return;

        event.preventDefault();

        canvas.setPointerCapture(event.pointerId);

        const point = getCanvasPoint(event);

        startPoint = point;
        isDrawing = true;

        if (currentTool === "brush" || currentTool === "eraser") {

            currentStroke = {
                id: createLayerId(),
                name: currentTool === "eraser" ? "Eraser Layer" : "Drawing Layer",
                type: "drawing",
                tool: currentTool,
                visible: true,
                color: $("brushColor")?.value || "#d7ff35",
                size: Number($("brushSize")?.value || 12),
                points: [point]
            };

            layers.push(currentStroke);

            selectedLayerId = currentStroke.id;

            render();
            updateLayers();
        }

        if (currentTool === "shape") {

            currentStroke = {
                id: createLayerId(),
                name: "Rectangle Shape",
                type: "shape",
                tool: "shape",
                visible: true,
                color: $("brushColor")?.value || "#d7ff35",
                size: Number($("brushSize")?.value || 12),
                points: [point, point]
            };

            render();
        }

        if (currentTool === "crop") {

            cropSelection = {
                x: point.x,
                y: point.y,
                width: 0,
                height: 0
            };

            updateCropBox();
        }
    });

    // ==========================================
    // POINTER MOVE
    // ==========================================

    canvas.addEventListener("pointermove", event => {

        if (!isDrawing || !hasImage) return;

        const point = getCanvasPoint(event);

        if (
            currentTool === "brush" ||
            currentTool === "eraser"
        ) {

            if (currentStroke) {
                currentStroke.points.push(point);
                render();
            }
        }

        if (currentTool === "shape" && currentStroke) {

            currentStroke.points[1] = point;

            render();
        }

        if (currentTool === "crop" && cropSelection) {

            cropSelection.width = point.x - cropSelection.x;
            cropSelection.height = point.y - cropSelection.y;

            updateCropBox();
        }
    });

    // ==========================================
    // FINISH DRAWING
    // ==========================================

    function finishDrawing() {

        if (!isDrawing) return;

        isDrawing = false;

        if (
            currentTool === "brush" ||
            currentTool === "eraser" ||
            currentTool === "shape"
        ) {

            if (currentStroke && currentTool === "shape") {
                layers.push(currentStroke);
            }

            if (currentStroke) {
                selectedLayerId = currentStroke.id;
            }

            currentStroke = null;

            render();
            updateLayers();
            saveHistory();
        }

        if (currentTool === "crop" && cropSelection) {

            notify("Crop area selected.");

            addCropAction();
        }

        startPoint = null;
    }

    canvas.addEventListener("pointerup", finishDrawing);
    canvas.addEventListener("pointercancel", finishDrawing);

    // ==========================================
    // CROP
    // ==========================================

    function addCropAction() {

        if ($("applyCropBtn")) return;

        const button = document.createElement("button");

        button.id = "applyCropBtn";
        button.className = "top-btn";
        button.textContent = "APPLY CROP";

        const actions = $("undoBtn")?.parentElement;

        if (!actions) return;

        actions.insertBefore(button, $("exportBtn"));

        button.addEventListener("click", applyCrop);
    }

    function applyCrop() {

        if (!cropSelection || !hasImage) {
            notify("Select a crop area first.");
            return;
        }

        const left = Math.max(
            0,
            Math.min(
                cropSelection.x,
                cropSelection.x + cropSelection.width
            )
        );

        const top = Math.max(
            0,
            Math.min(
                cropSelection.y,
                cropSelection.y + cropSelection.height
            )
        );

        const width = Math.min(
            canvas.width - left,
            Math.abs(cropSelection.width)
        );

        const height = Math.min(
            canvas.height - top,
            Math.abs(cropSelection.height)
        );

        if (width < 5 || height < 5) {
            notify("Choose a larger crop area.");
            return;
        }

        const cropCanvas = document.createElement("canvas");

        cropCanvas.width = Math.round(width);
        cropCanvas.height = Math.round(height);

        cropCanvas.getContext("2d").drawImage(
            canvas,
            left,
            top,
            width,
            height,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height
        );

        const image = new Image();

        image.onload = () => {

            sourceImage = image;

            baseWidth = cropCanvas.width;
            baseHeight = cropCanvas.height;

            transform = {
                rotation: 0,
                flipH: false,
                flipV: false
            };

            adjustments = {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0,
                grayscale: 0,
                sepia: 0
            };

            activeFilter = "normal";

            layers = [{
                id: "background",
                name: "Background",
                type: "background",
                visible: true,
                locked: true
            }];

            selectedLayerId = "background";

            cropSelection = null;

            if (cropBox) {
                cropBox.style.display = "none";
            }

            $("applyCropBtn")?.remove();

            updateCanvasDimensions();
            syncControls();
            updateFilterButtons();

            render();
            updateLayers();
            saveHistory();
            fitCanvas();

            notify("Image cropped successfully.");
        };

        image.onerror = () => notify("Crop operation failed.");

        image.src = cropCanvas.toDataURL("image/png");
    }

    // ==========================================
    // TEXT LAYER
    // ==========================================

    function addText() {

        if (!hasImage) {
            notify("Open an image first.");
            return;
        }

        const text = prompt("Enter your text:");

        if (!text || !text.trim()) return;

        const size = Number(
            prompt("Text size (default 48):", "48")
        ) || 48;

        const newLayer = {
            id: createLayerId(),
            name: text.trim().slice(0, 30),
            type: "text",
            text: text.trim(),
            visible: true,
            color: $("brushColor")?.value || "#d7ff35",
            size: Math.max(8, Math.min(300, size)),
            x: canvas.width * 0.1,
            y: canvas.height * 0.1
        };

        layers.push(newLayer);

        selectedLayerId = newLayer.id;

        render();
        updateLayers();
        saveHistory();

        notify("Text layer added.");
    }

    $("addTextLayer")?.addEventListener("click", addText);

    // ==========================================
    // ADD SHAPE LAYER
    // ==========================================

    $("addShapeLayer")?.addEventListener("click", () => {

        if (!hasImage) {
            notify("Open an image first.");
            return;
        }

        const width = Math.min(250, canvas.width * .3);
        const height = Math.min(160, canvas.height * .25);

        const shape = {
            id: createLayerId(),
            name: "Rectangle Shape",
            type: "shape",
            tool: "shape",
            visible: true,
            color: $("brushColor")?.value || "#d7ff35",
            size: Number($("brushSize")?.value || 12),
            points: [
                {
                    x: (canvas.width - width) / 2,
                    y: (canvas.height - height) / 2
                },
                {
                    x: (canvas.width + width) / 2,
                    y: (canvas.height + height) / 2
                }
            ]
        };

        layers.push(shape);

        selectedLayerId = shape.id;

        render();
        updateLayers();
        saveHistory();

        notify("Shape layer created.");
    });

    // ==========================================
    // ADJUSTMENTS
    // ==========================================

    function updateAdjustmentLabels() {

        adjustmentIds.forEach(id => {

            const output = $(id + "Value");

            if (!output) return;

            output.textContent =
                id === "blur"
                    ? adjustments[id] + "px"
                    : adjustments[id] + "%";
        });
    }

    function syncControls() {

        adjustmentIds.forEach(id => {
            if ($(id)) {
                $(id).value = adjustments[id];
            }
        });

        updateAdjustmentLabels();
    }

    adjustmentIds.forEach(id => {

        $(id)?.addEventListener("input", () => {

            adjustments[id] = Number($(id).value);

            updateAdjustmentLabels();
            render();
        });

        $(id)?.addEventListener("change", saveHistory);
    });

    $("resetAdjustments")?.addEventListener("click", () => {

        if (!hasImage) {
            notify("Open an image first.");
            return;
        }

        adjustments = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            grayscale: 0,
            sepia: 0
        };

        syncControls();
        render();
        saveHistory();

        notify("Adjustments reset.");
    });

    // ==========================================
    // FILTERS
    // ==========================================

    function updateFilterButtons() {

        document.querySelectorAll(".filter-card").forEach(card => {

            card.classList.toggle(
                "active",
                card.dataset.filter === activeFilter
            );
        });
    }

    function applyFilter(filter) {

        if (!hasImage) {
            notify("Open an image first.");
            return;
        }

        const validFilters = [
            "normal",
            "mono",
            "vintage",
            "cinematic",
            "warm",
            "cool"
        ];

        if (!validFilters.includes(filter)) return;

        activeFilter = filter;

        updateFilterButtons();
        render();
        saveHistory();

        notify(filter.toUpperCase() + " filter applied.");
    }

    document.querySelectorAll(".filter-card").forEach(button => {

        button.addEventListener("click", () => {
            applyFilter(button.dataset.filter);
        });
    });

    // ==========================================
    // ROTATION
    // ==========================================

    function rotate(degrees) {

        if (!hasImage) {
            notify("Open an image first.");
            return;
        }

        transform.rotation =
            (transform.rotation + degrees + 360) % 360;

        updateCanvasDimensions();

        render();
        saveHistory();
        fitCanvas();

        notify("Image rotated.");
    }

    $("rotateLeft")?.addEventListener("click", () => rotate(-90));
    $("rotateRight")?.addEventListener("click", () => rotate(90));

    // ==========================================
    // FLIP
    // ==========================================

    $("flipH")?.addEventListener("click", () => {

        if (!hasImage) return;

        transform.flipH = !transform.flipH;

        render();
        saveHistory();

        notify("Horizontal flip applied.");
    });

    $("flipV")?.addEventListener("click", () => {

        if (!hasImage) return;

        transform.flipV = !transform.flipV;

        render();
        saveHistory();

        notify("Vertical flip applied.");
    });

    // ==========================================
    // ZOOM
    // ==========================================

    function setZoom(value) {

        zoom = Math.max(.1, Math.min(3, value));

        canvas.style.width = `${canvas.width * zoom}px`;
        canvas.style.height = `${canvas.height * zoom}px`;

        if ($("zoomValue")) {
            $("zoomValue").textContent =
                Math.round(zoom * 100) + "%";
        }

        updateCropBox();
    }

    $("zoomIn")?.addEventListener("click", () => setZoom(zoom + .1));
    $("zoomOut")?.addEventListener("click", () => setZoom(zoom - .1));

    function fitCanvas() {

        if (!hasImage || !stage) return;

        const availableWidth = stage.clientWidth - 70;
        const availableHeight = stage.clientHeight - 70;

        if (availableWidth <= 0 || availableHeight <= 0) return;

        const fitZoom = Math.min(
            availableWidth / canvas.width,
            availableHeight / canvas.height,
            1
        );

        setZoom(Math.max(.1, fitZoom));
    }

    $("fitBtn")?.addEventListener("click", fitCanvas);

    window.addEventListener("resize", () => {
        if (hasImage) fitCanvas();
    });

    // ==========================================
    // PANEL SWITCHING
    // ==========================================

    document.querySelectorAll(".panel-tab").forEach(button => {

        button.addEventListener("click", () => {

            const panel = button.dataset.panel;

            document.querySelectorAll(".panel-tab").forEach(tab => {
                tab.classList.toggle("active", tab === button);
            });

            document.querySelectorAll(".panel-content").forEach(content => {

                content.classList.toggle(
                    "active",
                    content.id === panel + "Panel"
                );
            });
        });
    });

    // ==========================================
    // PROFESSIONAL LAYER MANAGER
    // ==========================================

    function updateLayerControls() {

        const selected = getSelectedLayer();

        const nameElement = $("selectedLayerName");
        const typeElement = $("selectedLayerType");
        const orderElement = $("selectedLayerOrder");

        if (!selected) {

            if (nameElement) nameElement.textContent = "No layer selected";
            if (typeElement) typeElement.textContent = "NONE";
            if (orderElement) orderElement.textContent = "—";

            return;
        }

        if (nameElement) {
            nameElement.textContent = selected.name;
        }

        if (typeElement) {
            typeElement.textContent = selected.type.toUpperCase();
        }

        if (orderElement) {
            orderElement.textContent =
                `${getLayerIndex(selected.id) + 1} / ${layers.length}`;
        }

        const isBackground = selected.type === "background";
        const index = getLayerIndex(selected.id);

        if ($("duplicateLayerBtn")) {
            $("duplicateLayerBtn").disabled = isBackground;
        }

        if ($("deleteLayerBtn")) {
            $("deleteLayerBtn").disabled = isBackground;
        }

        if ($("renameLayerBtn")) {
            $("renameLayerBtn").disabled = isBackground;
        }

        if ($("moveLayerUpBtn")) {
            $("moveLayerUpBtn").disabled =
                isBackground || index >= layers.length - 1;
        }

        if ($("moveLayerDownBtn")) {
            $("moveLayerDownBtn").disabled =
                isBackground || index <= 1;
        }
    }

    function updateLayers() {

        const list = $("layerList");

        if (!list) return;

        list.innerHTML = "";

        if ($("layerCount")) {
            $("layerCount").textContent =
                `${layers.length} LAYERS`;
        }

        if (!layers.length) {

            list.innerHTML = `
                <div class="layer-empty">
                    No layers yet.<br>
                    Open an image to start creating.
                </div>
            `;

            updateLayerControls();
            return;
        }

        const icons = {
            background: "▧",
            drawing: "✎",
            shape: "□",
            text: "T"
        };

        const typeNames = {
            background: "IMAGE LAYER",
            drawing: "DRAWING LAYER",
            shape: "SHAPE LAYER",
            text: "TEXT LAYER"
        };

        // Top layer appears first in the panel.
        [...layers].reverse().forEach(layer => {

            const item = document.createElement("div");

            item.className = "layer-item";

            if (layer.id === selectedLayerId) {
                item.classList.add("selected");
            }

            item.dataset.layerId = layer.id;

            // VISIBILITY BUTTON
            const visibility = document.createElement("button");

            visibility.type = "button";
            visibility.className = "layer-visibility";

            if (layer.visible === false) {
                visibility.classList.add("hidden");
            }

            visibility.textContent =
                layer.visible === false ? "○" : "◉";

            visibility.title =
                layer.visible === false ? "Show layer" : "Hide layer";

            visibility.addEventListener("click", event => {

                event.stopPropagation();

                if (layer.type === "background" && layer.locked) {
                    layer.visible = layer.visible === false;
                } else {
                    layer.visible = layer.visible === false;
                }

                render();
                updateLayers();
                saveHistory();

                notify(
                    layer.visible
                        ? "Layer visible."
                        : "Layer hidden."
                );
            });

            // THUMBNAIL
            const thumbnail = document.createElement("div");

            thumbnail.className = "layer-thumbnail";
            thumbnail.textContent = icons[layer.type] || "▧";

            // LAYER INFORMATION
            const info = document.createElement("div");

            info.className = "layer-item-info";

            const title = document.createElement("strong");
            title.textContent = layer.name;

            const subtitle = document.createElement("small");
            subtitle.textContent = typeNames[layer.type] || "LAYER";

            info.append(title, subtitle);

            // LOCK INDICATOR
            const lock = document.createElement("span");

            lock.className = "layer-locked";
            lock.textContent = layer.locked ? "▣" : "";

            item.append(
                visibility,
                thumbnail,
                info,
                lock
            );

            item.addEventListener("click", () => {

                selectedLayerId = layer.id;

                updateLayers();
            });

            list.appendChild(item);
        });

        updateLayerControls();
    }

    // ==========================================
    // RENAME LAYER
    // ==========================================

    $("renameLayerBtn")?.addEventListener("click", () => {

        const layer = getSelectedLayer();

        if (!layer || layer.type === "background") return;

        const newName = prompt(
            "Enter new layer name:",
            layer.name
        );

        if (!newName || !newName.trim()) return;

        layer.name = newName.trim().slice(0, 40);

        updateLayers();
        saveHistory();

        notify("Layer renamed.");
    });

    // ==========================================
    // DUPLICATE LAYER
    // ==========================================

    $("duplicateLayerBtn")?.addEventListener("click", () => {

        const layer = getSelectedLayer();

        if (!layer || layer.type === "background") return;

        const index = getLayerIndex(layer.id);

        const duplicate = JSON.parse(JSON.stringify(layer));

        duplicate.id = createLayerId();
        duplicate.name = `${layer.name} Copy`;

        if (duplicate.type === "text") {
            duplicate.x += 20;
            duplicate.y += 20;
        }

        if (
            duplicate.type === "drawing" ||
            duplicate.type === "shape"
        ) {
            duplicate.points = duplicate.points.map(point => ({
                x: point.x + 15,
                y: point.y + 15
            }));
        }

        layers.splice(index + 1, 0, duplicate);

        selectedLayerId = duplicate.id;

        render();
        updateLayers();
        saveHistory();

        notify("Layer duplicated.");
    });

    // ==========================================
    // DELETE LAYER
    // ==========================================

    $("deleteLayerBtn")?.addEventListener("click", () => {

        const layer = getSelectedLayer();

        if (!layer || layer.type === "background") return;

        const index = getLayerIndex(layer.id);

        layers.splice(index, 1);

        selectedLayerId = "background";

        render();
        updateLayers();
        saveHistory();

        notify("Layer deleted.");
    });

    // ==========================================
    // MOVE LAYER UP / DOWN
    // ==========================================

    function moveSelectedLayer(direction) {

        const index = getLayerIndex(selectedLayerId);

        if (index <= 0) return;

        const newIndex = index + direction;

        // Background cannot be moved.
        if (newIndex <= 0 || newIndex >= layers.length) return;

        [layers[index], layers[newIndex]] =
            [layers[newIndex], layers[index]];

        render();
        updateLayers();
        saveHistory();

        notify("Layer order updated.");
    }

    $("moveLayerUpBtn")?.addEventListener("click", () => {
        moveSelectedLayer(1);
    });

    $("moveLayerDownBtn")?.addEventListener("click", () => {
        moveSelectedLayer(-1);
    });

    // ==========================================
    // BRUSH SIZE
    // ==========================================

    $("brushSize")?.addEventListener("input", () => {

        if ($("brushSizeValue")) {
            $("brushSizeValue").textContent = $("brushSize").value;
        }
    });

    // ==========================================
    // RESET WORKSPACE
    // ==========================================

    $("resetBtn")?.addEventListener("click", () => {

        if (!hasImage) {
            notify("Open an image first.");
            return;
        }

        if (!confirm("Reset the current editing session?")) {
            return;
        }

        adjustments = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            grayscale: 0,
            sepia: 0
        };

        transform = {
            rotation: 0,
            flipH: false,
            flipV: false
        };

        activeFilter = "normal";

        layers = [{
            id: "background",
            name: "Background",
            type: "background",
            visible: true,
            locked: true
        }];

        selectedLayerId = "background";

        cropSelection = null;
        currentStroke = null;

        if (cropBox) {
            cropBox.style.display = "none";
        }

        $("applyCropBtn")?.remove();

        updateCanvasDimensions();
        syncControls();
        updateFilterButtons();

        render();
        updateLayers();
        saveHistory();
        fitCanvas();

        notify("Workspace reset.");
    });

    // ==========================================
    // EXPORT PNG / JPG
    // ==========================================

    function exportImage() {

        if (!hasImage) {
            notify("Open an image before exporting.");
            return;
        }

        const format = prompt(
            "Export format: type PNG or JPG",
            "PNG"
        );

        if (!format) return;

        const normalized = format.trim().toLowerCase();

        if (!["png", "jpg", "jpeg"].includes(normalized)) {
            notify("Please enter PNG or JPG.");
            return;
        }

        const type =
            normalized === "jpg" || normalized === "jpeg"
                ? "image/jpeg"
                : "image/png";

        const extension =
            type === "image/jpeg" ? "jpg" : "png";

        try {

            const link = document.createElement("a");

            link.download = `vexoniq-edit.${extension}`;
            link.href = canvas.toDataURL(type, .94);

            document.body.appendChild(link);
            link.click();
            link.remove();

            notify("Image export started.");

        } catch (error) {

            console.error(error);
            notify("Export failed. Please try again.");
        }
    }

    $("exportBtn")?.addEventListener("click", exportImage);

    // ==========================================
    // DROPDOWN MENUS
    // ==========================================

    const dropdowns = document.querySelectorAll(".menu-dropdown");

    document.querySelectorAll(".menu-trigger").forEach(trigger => {

        trigger.addEventListener("click", event => {

            event.stopPropagation();

            const parent = trigger.closest(".menu-dropdown");

            const wasOpen = parent.classList.contains("open");

            dropdowns.forEach(menu => {
                menu.classList.remove("open");
            });

            if (!wasOpen) {
                parent.classList.add("open");
            }
        });
    });

    document.addEventListener("click", () => {
        dropdowns.forEach(menu => menu.classList.remove("open"));
    });

    // ==========================================
    // MENU ACTIONS
    // ==========================================

    const menuActions = {

        open: openImage,

        export: exportImage,

        reset: () => $("resetBtn")?.click(),

        undo,

        redo,

        "reset-adjustments": () =>
            $("resetAdjustments")?.click(),

        "rotate-left": () => rotate(-90),

        "rotate-right": () => rotate(90),

        "flip-h": () => $("flipH")?.click(),

        "flip-v": () => $("flipV")?.click(),

        crop: () => {
            document.querySelector('[data-tool="crop"]')?.click();
        },

        "add-text": addText,

        "show-layers": () => {
            document.querySelector('[data-panel="layers"]')?.click();
        },

        "zoom-in": () => setZoom(zoom + .1),

        "zoom-out": () => setZoom(zoom - .1),

        fit: fitCanvas
    };

    document.querySelectorAll("[data-action]").forEach(button => {

        button.addEventListener("click", () => {

            const action = button.dataset.action;

            if (menuActions[action]) {
                menuActions[action]();
            }

            dropdowns.forEach(menu => menu.classList.remove("open"));
        });
    });

    // ==========================================
    // FILTER MENU
    // ==========================================

    document.querySelectorAll("[data-filter-action]").forEach(button => {

        button.addEventListener("click", () => {

            applyFilter(button.dataset.filterAction);

            dropdowns.forEach(menu => menu.classList.remove("open"));
        });
    });

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================

    document.addEventListener("keydown", event => {

        const target = event.target;

        const isTyping =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target?.isContentEditable;

        if (isTyping) return;

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
            event.preventDefault();

            if (event.shiftKey) {
                redo();
            } else {
                undo();
            }
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
            event.preventDefault();
            redo();
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
            event.preventDefault();
            openImage();
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            exportImage();
        }

        if (event.key === "Escape") {
            dropdowns.forEach(menu => menu.classList.remove("open"));

            cropSelection = null;

            if (cropBox) {
                cropBox.style.display = "none";
            }

            $("applyCropBtn")?.remove();
        }
    });

    // ==========================================
    // INITIAL STATE
    // ==========================================

    updateHistoryButtons();
    syncControls();
    updateLayers();

    console.log(
        "VEXONIQ PHOTO STUDIO initialized successfully."
    );

});
