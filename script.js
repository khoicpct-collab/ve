// ====== HỆ THỐNG MÔ PHỎNG DÒNG CHẢY NÂNG CAO ======
// PHIÊN BẢN HOÀN CHỈNH - EDIT MODE + SMART ANIMATION

class AdvancedFlowSimulation {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.init();
    }

    init() {
        console.log("🔄 Đang khởi động hệ thống...");
        this.setupCanvas();
        this.setupEventListeners();
        this.setupSimulation();
        this.setupEditMode();
        this.updateUI();
        this.animate();
        console.log("✅ Hệ thống đã sẵn sàng!");
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.redrawCanvas();
    }

    setupEventListeners() {
        console.log("🔧 Đang thiết lập event listeners...");
        
        // UPLOAD EVENTS
        const backgroundUpload = document.getElementById('backgroundUpload');
        const gifUpload = document.getElementById('gifUpload');
        
        if (backgroundUpload) {
            backgroundUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e, 'image');
            });
        }
        
        if (gifUpload) {
            gifUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e, 'gif');
            });
        }

        // Drawing events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Tool events
        document.getElementById('brushTool').addEventListener('click', () => this.setTool('brush'));
        document.getElementById('penTool').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('eraserTool').addEventListener('click', () => this.setTool('eraser'));

        // Material events
        document.querySelectorAll('.material-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.setMaterial(e.currentTarget.dataset.material);
            });
        });

        // Control events
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSimulation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearDrawing());

        // Slider events
        document.getElementById('toolSize').addEventListener('input', () => this.updateBrushSize());
        document.getElementById('speed').addEventListener('input', () => this.updatePhysics());
        document.getElementById('gravity').addEventListener('input', () => this.updatePhysics());

        // Motion events
        document.querySelectorAll('.motion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMotionType(e.currentTarget.dataset.motion);
            });
        });

        // Direction events
        document.querySelectorAll('.direction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setDirection(e.currentTarget.dataset.direction);
            });
        });

        // Drag and drop
        this.setupDragAndDrop();
    }

    setupSimulation() {
        this.currentTool = 'brush';
        this.currentMaterial = 'water';
        this.currentMotion = 'linear';
        this.currentDirection = 'forward';
        this.isDrawing = false;
        this.simulationRunning = false;
        
        this.brushSize = 15;
        this.paths = [];
        this.particles = [];
        this.backgroundImage = null;

        this.physics = {
            speed: 5,
            gravity: 0.5
        };

        this.updateUI();
    }

    // ====== EDIT MODE SYSTEM ======
    setupEditMode() {
        this.editMode = false;
        this.selectedPath = null;
        this.editControls = null;
        
        console.log("✏️ Edit Mode đã được thiết lập");
        
        const editBtn = document.getElementById('editTool');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        const editBtn = document.getElementById('editTool');
        
        if (this.editMode) {
            editBtn.classList.add('active');
            editBtn.innerHTML = '<span>✅</span> HOÀN TẤT';
            this.enablePathSelection();
            this.updateStatus('CHẾ ĐỘ CHỈNH SỬA: Click chọn đường để sửa', false);
        } else {
            editBtn.classList.remove('active');
            editBtn.innerHTML = '<span>✏️</span> CHỈNH SỬA';
            this.disablePathSelection();
            this.hideEditControls();
            this.selectedPath = null;
            this.redrawCanvas();
            this.updateStatus('SẴN SÀNG', false);
        }
    }

    enablePathSelection() {
        this.canvas.style.cursor = 'pointer';
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    disablePathSelection() {
        this.canvas.style.cursor = 'crosshair';
        this.canvas.removeEventListener('click', (e) => this.handleCanvasClick(e));
    }

    handleCanvasClick(e) {
        if (!this.editMode) return;
        const pos = this.getMousePos(e);
        this.selectPathAtPosition(pos);
    }

    selectPathAtPosition(pos) {
        this.selectedPath = this.findPathAtPosition(pos);
        
        if (this.selectedPath) {
            this.highlightSelectedPath();
            this.showEditControls();
            this.updateStatus(`Đã chọn đường - ${this.selectedPath.points.length} điểm`, false);
        } else {
            this.hideEditControls();
            this.redrawCanvas();
        }
    }

    findPathAtPosition(pos) {
        let closestPath = null;
        let minDistance = 25;
        
        for (let path of this.paths) {
            for (let point of path.points) {
                const distance = Math.sqrt(
                    Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPath = path;
                }
            }
        }
        return closestPath;
    }

    highlightSelectedPath() {
        this.redrawCanvas();
        
        if (this.selectedPath) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = this.selectedPath.width + 6;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.selectedPath.points[0].x, this.selectedPath.points[0].y);
            
            for (let i = 1; i < this.selectedPath.points.length; i++) {
                this.ctx.lineTo(this.selectedPath.points[i].x, this.selectedPath.points[i].y);
            }
            this.ctx.stroke();
            
            this.drawControlPoints();
        }
    }

    drawControlPoints() {
        if (!this.selectedPath) return;
        
        this.selectedPath.points.forEach((point, index) => {
            this.ctx.fillStyle = '#E74C3C';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(index, point.x, point.y);
        });
    }

    showEditControls() {
        this.hideEditControls();
        
        this.editControls = document.createElement('div');
        this.editControls.className = 'edit-controls';
        this.editControls.style.cssText = `
            position: absolute;
            top: 150px;
            right: 30px;
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 1000;
            border: 3px solid #3498db;
            min-width: 200px;
            font-family: Arial, sans-serif;
        `;
        
        this.editControls.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 15px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; font-size: 16px;">
                ✏️ CHỈNH SỬA ĐƯỜNG
            </div>
            <button onclick="simulation.deleteSelectedPath()" class="btn btn-danger" style="width: 100%; margin: 8px 0; padding: 12px; font-size: 14px;">
                🗑️ XÓA ĐƯỜNG
            </button>
            <button onclick="simulation.duplicateSelectedPath()" class="btn btn-success" style="width: 100%; margin: 8px 0; padding: 12px; font-size: 14px;">
                📋 NHÂN BẢN
            </button>
            <button onclick="simulation.changePathMaterial()" class="btn btn-primary" style="width: 100%; margin: 8px 0; padding: 12px; font-size: 14px;">
                🌈 ĐỔI VẬT LIỆU
            </button>
            <div style="margin-top: 15px; font-size: 12px; color: #7f8c8d; text-align: center;">
                📍 Điểm: ${this.selectedPath ? this.selectedPath.points.length : 0}
            </div>
        `;
        
        document.querySelector('.canvas-area').appendChild(this.editControls);
    }

    hideEditControls() {
        if (this.editControls) {
            this.editControls.remove();
            this.editControls = null;
        }
    }

    deleteSelectedPath() {
        if (this.selectedPath) {
            this.paths = this.paths.filter(path => path !== this.selectedPath);
            this.selectedPath = null;
            this.hideEditControls();
            this.redrawCanvas();
            this.updateStats();
            this.updateStatus('✅ Đã xóa đường', false);
        }
    }

    duplicateSelectedPath() {
        if (this.selectedPath) {
            const duplicated = {
                points: JSON.parse(JSON.stringify(this.selectedPath.points)),
                color: this.selectedPath.color,
                width: this.selectedPath.width,
                tool: this.selectedPath.tool,
                material: this.selectedPath.material || this.currentMaterial
            };
            
            duplicated.points.forEach(point => {
                point.x += 25;
                point.y += 15;
            });
            
            this.paths.push(duplicated);
            this.selectedPath = duplicated;
            this.highlightSelectedPath();
            this.updateStats();
            this.updateStatus('✅ Đã nhân bản đường', false);
        }
    }

    changePathMaterial() {
        if (this.selectedPath) {
            const newMaterial = prompt('Nhập vật liệu mới (water/wheat/sand/grains):', this.selectedPath.material || this.currentMaterial);
            if (newMaterial && ['water','wheat','sand','grains'].includes(newMaterial)) {
                this.selectedPath.material = newMaterial;
                this.selectedPath.color = this.getMaterialColor(newMaterial);
                this.redrawCanvas();
                this.highlightSelectedPath();
                this.updateStatus(`✅ Đã đổi vật liệu: ${this.getMaterialName(newMaterial)}`, false);
            }
        }
    }

    getMaterialColor(material) {
        const colors = {
            'water': 'rgba(52, 152, 219, 0.8)',
            'wheat': 'rgba(241, 196, 15, 0.8)', 
            'sand': 'rgba(210, 180, 140, 0.8)',
            'grains': 'rgba(230, 126, 34, 0.8)'
        };
        return colors[material] || colors.water;
    }

    // ====== SMART ANIMATION SYSTEM ======
    createSmartParticles() {
        this.particles = [];
        
        this.paths.forEach((path, pathIndex) => {
            if (path.tool === 'eraser') return;
            
            const material = path.material || this.currentMaterial;
            const props = this.getParticleProperties(material);
            this.createParticlesForPath(path, props, pathIndex);
        });
        
        this.updateStats();
        console.log(`🎯 Đã tạo ${this.particles.length} hạt thông minh`);
    }

    createParticlesForPath(path, props, pathId) {
        const points = path.points;
        if (points.length < 2) return;
        
        let totalLength = 0;
        const segmentLengths = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const length = this.calculateDistance(points[i], points[i + 1]);
            segmentLengths.push(length);
            totalLength += length;
        }
        
        const particleCount = Math.max(5, Math.floor(totalLength / 10));
        
        for (let i = 0; i < particleCount; i++) {
            const progress = i / particleCount;
            const position = this.getPointAtProgress(points, progress, segmentLengths, totalLength);
            
            if (position) {
                this.particles.push({
                    x: position.x,
                    y: position.y,
                    vx: 0,
                    vy: 0,
                    size: Math.random() * (props.size[1] - props.size[0]) + props.size[0],
                    color: props.color,
                    pathId: pathId,
                    progress: progress,
                    speed: 0.01 + Math.random() * 0.02,
                    life: 0.5 + Math.random() * 0.5,
                    material: path.material || this.currentMaterial,
                    originalSize: 0
                });
                
                this.particles[this.particles.length - 1].originalSize = 
                    this.particles[this.particles.length - 1].size;
            }
        }
    }

    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );
    }

    getPointAtProgress(points, progress, segmentLengths, totalLength) {
        if (points.length < 2) return null;
        
        const targetDistance = progress * totalLength;
        let accumulated = 0;
        
        for (let i = 0; i < segmentLengths.length; i++) {
            const segmentLength = segmentLengths[i];
            
            if (targetDistance <= accumulated + segmentLength) {
                const segmentProgress = (targetDistance - accumulated) / segmentLength;
                return {
                    x: points[i].x + (points[i + 1].x - points[i].x) * segmentProgress,
                    y: points[i].y + (points[i + 1].y - points[i].y) * segmentProgress
                };
            }
            accumulated += segmentLength;
        }
        
        return points[points.length - 1];
    }

    updateSmartParticles() {
        this.particles.forEach(particle => {
            particle.progress += particle.speed * (this.physics.speed / 8);
            
            if (particle.progress >= 1.0) {
                particle.progress = 0;
                particle.life = 0.5 + Math.random() * 0.5;
            }
            
            const path = this.paths[particle.pathId];
            if (path && path.points.length >= 2) {
                const segmentLengths = this.calculateSegmentLengths(path.points);
                const totalLength = segmentLengths.reduce((a, b) => a + b, 0);
                const newPos = this.getPointAtProgress(
                    path.points, 
                    particle.progress, 
                    segmentLengths, 
                    totalLength
                );
                
                if (newPos) {
                    particle.x = newPos.x;
                    particle.y = newPos.y;
                }
            }
            
            this.applyAdvancedMotion(particle);
            
            particle.life -= 0.005;
            if (particle.life <= 0) {
                this.resetParticle(particle);
            }
        });
    }

    calculateSegmentLengths(points) {
        const segmentLengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            segmentLengths.push(this.calculateDistance(points[i], points[i + 1]));
        }
        return segmentLengths;
    }

    applyAdvancedMotion(particle) {
        const time = Date.now() * 0.001;
        
        switch(this.currentMotion) {
            case 'linear': break;
            case 'spiral':
                const radius = 8 * Math.sin(time + particle.progress * Math.PI * 2);
                particle.x += Math.cos(time + particle.progress * Math.PI * 4) * radius * 0.1;
                particle.y += Math.sin(time + particle.progress * Math.PI * 4) * radius * 0.1;
                break;
            case 'wave':
                const wave = Math.sin(time * 2 + particle.progress * Math.PI * 6) * 6;
                particle.y += wave * 0.1;
                break;
            case 'pulse':
                const pulse = Math.sin(time * 3 + particle.progress * Math.PI * 4) * 0.3 + 0.7;
                particle.size = particle.originalSize * pulse;
                break;
        }
        
        this.applySmartDirection(particle);
    }

    applySmartDirection(particle) {
        switch(this.currentDirection) {
            case 'forward': break;
            case 'backward':
                particle.progress -= particle.speed * (this.physics.speed / 8);
                if (particle.progress < 0) particle.progress = 1;
                break;
            case 'vortex_cw':
                const vortexTime = Date.now() * 0.003;
                const vortexRadius = 12;
                particle.x += Math.cos(vortexTime + particle.progress * Math.PI * 2) * vortexRadius * 0.1;
                particle.y += Math.sin(vortexTime + particle.progress * Math.PI * 2) * vortexRadius * 0.1;
                break;
            case 'random':
                particle.x += (Math.random() - 0.5) * 3;
                particle.y += (Math.random() - 0.5) * 3;
                break;
        }
        
        particle.vy += this.physics.gravity * 0.05;
        particle.y += particle.vy;
    }

    resetParticle(particle) {
        particle.progress = Math.random() * 0.2;
        particle.life = 0.5 + Math.random() * 0.5;
        particle.vy = 0;
        const props = this.getParticleProperties(particle.material);
        particle.size = props.size[0] + Math.random() * (props.size[1] - props.size[0]);
        particle.originalSize = particle.size;
    }

    // ====== CORE METHODS ======
    handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadBackgroundImage(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    }

    loadBackgroundImage(dataUrl, fileName) {
        this.backgroundImage = new Image();
        this.backgroundImage.onload = () => {
            this.redrawCanvas();
            this.updateStatus(`✅ Đã tải: ${fileName}`, false);
            this.showPreview(this.backgroundImage);
        };
        this.backgroundImage.onerror = () => {
            alert("Lỗi tải ảnh! Vui lòng thử file khác.");
        };
        this.backgroundImage.src = dataUrl;
    }

    showPreview(image) {
        const preview = document.getElementById('uploadPreview');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align: center;">
                    <img src="${image.src}" class="preview-image" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: 8px;">
                    <div style="margin-top: 8px; font-size: 12px; color: #27ae60;">
                        ✅ Đã tải thành công
                    </div>
                </div>
            `;
        }
    }

    setupDragAndDrop() {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.canvas.style.border = '3px dashed #3498db';
        });
        
        this.canvas.addEventListener('dragleave', () => {
            this.canvas.style.border = 'none';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.canvas.style.border = 'none';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.loadBackgroundImage(e.target.result, file.name);
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    startDrawing(e) {
        if (!this.backgroundImage) {
            alert('Vui lòng upload bản vẽ trước khi vẽ đường dẫn!');
            return;
        }
        
        this.isDrawing = true;
        const point = this.getMousePos(e);
        this.paths.push({
            points: [point],
            color: this.getToolColor(),
            width: this.brushSize,
            tool: this.currentTool,
            material: this.currentMaterial
        });
        this.draw(e);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const point = this.getMousePos(e);
        const currentPath = this.paths[this.paths.length - 1];
        currentPath.points.push(point);
        
        this.ctx.strokeStyle = currentPath.color;
        this.ctx.lineWidth = currentPath.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        const points = currentPath.points;
        this.ctx.beginPath();
        this.ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();

        this.updateStats();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clearDrawing() {
        this.paths = [];
        this.particles = [];
        this.redrawCanvas();
        this.updateStats();
        this.updateStatus('Đã xóa toàn bộ đường vẽ', false);
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.backgroundImage) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.paths.forEach(path => {
            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = path.width;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(path.points[0].x, path.points[0].y);
            
            for (let i = 1; i < path.points.length; i++) {
                this.ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            
            this.ctx.stroke();
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.updateStatus(`Công cụ: ${this.getToolName(tool)}`, false);
    }

    getToolName(tool) {
        const names = {
            'brush': 'BRUSH',
            'pen': 'PEN', 
            'eraser': 'XÓA'
        };
        return names[tool] || 'BRUSH';
    }

    getToolColor() {
        switch(this.currentTool) {
            case 'brush': return 'rgba(52, 152, 219, 0.8)';
            case 'pen': return 'rgba(231, 76, 60, 0.9)';
            case 'eraser': return 'rgba(236, 240, 241, 1)';
            default: return 'rgba(52, 152, 219, 0.8)';
        }
    }

    updateBrushSize() {
        this.brushSize = document.getElementById('toolSize').value;
        document.getElementById('toolSizeValue').textContent = this.brushSize + 'px';
    }

    setMaterial(material) {
        this.currentMaterial = material;
        
        document.querySelectorAll('.material-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-material="${material}"]`).classList.add('active');
        
        this.updateStatus(`Nguyên liệu: ${this.getMaterialName(material)}`, false);
        document.getElementById('materialText').textContent = `Nguyên liệu: ${this.getMaterialName(material)}`;
    }

    getMaterialName(material) {
        const names = {
            'water': 'NƯỚC',
            'wheat': 'LÚA MÌ',
            'sand': 'CÁT',
            'grains': 'HẠT'
        };
        return names[material] || 'NƯỚC';
    }

    getParticleProperties(material) {
        const properties = {
            'water': { color: 'rgba(52, 152, 219, 0.7)', size: [2, 4] },
            'wheat': { color: 'rgba(241, 196, 15, 0.8)', size: [3, 5] },
            'sand': { color: 'rgba(210, 180, 140, 0.8)', size: [2, 3] },
            'grains': { color: 'rgba(230, 126, 34, 0.8)', size: [4, 6] }
        };
        return properties[material] || properties.water;
    }

    startSimulation() {
        if (this.paths.length === 0) {
            alert('Vui lòng vẽ đường dẫn trước khi chạy mô phỏng!');
            return;
        }
        
        if (this.simulationRunning) return;
        
        this.simulationRunning = true;
        this.updateStatus('ĐANG CHẠY MÔ PHỎNG THÔNG MINH...', true);
        this.createSmartParticles();
    }

    stopSimulation() {
        this.simulationRunning = false;
        this.updateStatus('ĐÃ DỪNG MÔ PHỎNG', false);
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        });
    }

    animate() {
        if (this.backgroundImage) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
            
            if (this.simulationRunning) {
                this.updateSmartParticles();
                this.drawParticles();
            } else {
                this.redrawCanvas();
            }
        }
        
        requestAnimationFrame(() => this.animate());
    }

    updateUI() {
        this.updateBrushSize();
        this.updatePhysics();
        this.updateStats();
    }

    updatePhysics() {
        this.physics.speed = document.getElementById('speed').value;
        this.physics.gravity = document.getElementById('gravity').value;
        
        document.getElementById('speedValue').textContent = this.physics.speed;
        document.getElementById('gravityValue').textContent = this.physics.gravity;
    }

    updateStats() {
        document.getElementById('particleCount').textContent = this.particles.length;
        
        let totalLength = 0;
        this.paths.forEach(path => {
            for (let i = 1; i < path.points.length; i++) {
                const dx = path.points[i].x - path.points[i-1].x;
                const dy = path.points[i].y - path.points[i-1].y;
                totalLength += Math.sqrt(dx*dx + dy*dy);
            }
        });
        document.getElementById('pathLength').textContent = Math.round(totalLength);
    }

    updateStatus(message, isRunning) {
        document.getElementById('statusText').textContent = message;
        const dot = document.getElementById('statusDot');
        dot.classList.toggle('active', isRunning);
    }

    setMotionType(motion) {
        this.currentMotion = motion;
        
        document.querySelectorAll('.motion-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-motion="${motion}"]`).classList.add('active');
    }

    setDirection(direction) {
        this.currentDirection = direction;
        
        document.querySelectorAll('.direction-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-direction="${direction}"]`).classList.add('active');
    }
}

// ====== KHỞI CHẠY ỨNG DỤNG ======
let simulation;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Khởi chạy ứng dụng Mô phỏng Dòng chảy Thông minh...");
    simulation = new AdvancedFlowSimulation();
});
