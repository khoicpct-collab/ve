// ====== SMART EXPORTER - Advanced GIF/Video Export ======

class SmartExporter {
    constructor() {
        this.exportQueue = [];
        this.isExporting = false;
        this.ffmpeg = null;
        this.gifWorker = null;
        
        // Export presets
        this.exportPresets = {
            'social': { fps: 15, quality: 80, width: 640, height: 640, optimize: true },
            'hd': { fps: 30, quality: 95, width: 1920, height: 1080, optimize: false },
            'web': { fps: 24, quality: 85, width: 1280, height: 720, optimize: true },
            'mobile': { fps: 20, quality: 75, width: 480, height: 480, optimize: true }
        };
        
        this.init();
    }
    
    async init() {
        console.log('📤 Smart Exporter - Initializing...');
        
        try {
            // Initialize GIF.js worker
            this.gifWorker = new GIF({
                workers: 2,
                quality: 10,
                workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
            });
            
            // Initialize FFmpeg.wasm if available
            if (typeof createFFmpeg === 'function') {
                this.ffmpeg = createFFmpeg({ log: true });
                await this.ffmpeg.load();
            }
            
            console.log('✅ Export engine ready');
        } catch (error) {
            console.warn('⚠️ Some export features may be limited:', error);
        }
    }
    
    // ====== GIF EXPORT ======
    
    async exportGIF(frames, options = {}) {
        const {
            preset = 'social',
            duration = 5,
            loop = true,
            onProgress = null,
            onComplete = null
        } = options;
        
        console.log(`🎞️ Exporting GIF (${frames.length} frames, ${duration}s)`);
        
        const presetConfig = this.exportPresets[preset] || this.exportPresets.social;
        const fps = presetConfig.fps;
        const totalFrames = Math.min(frames.length, fps * duration);
        
        return new Promise((resolve, reject) => {
            try {
                // Create new GIF instance
                const gif = new GIF({
                    workers: 2,
                    quality: presetConfig.quality,
                    width: presetConfig.width,
                    height: presetConfig.height,
                    workerScript: 'gif.worker.js'
                });
                
                // Add frames
                const frameDelay = Math.round(1000 / fps);
                let addedFrames = 0;
                
                const addFrame = (index) => {
                    if (index >= totalFrames) {
                        // All frames added, render
                        gif.on('finished', (blob) => {
                            const result = {
                                blob: blob,
                                url: URL.createObjectURL(blob),
                                type: 'gif',
                                size: blob.size,
                                dimensions: `${presetConfig.width}x${presetConfig.height}`,
                                duration: duration,
                                fps: fps
                            };
                            
                            if (onComplete) onComplete(result);
                            resolve(result);
                        });
                        
                        gif.render();
                        return;
                    }
                    
                    // Get frame and add to GIF
                    const frame = frames[index];
                    const canvas = this.frameToCanvas(frame, presetConfig.width, presetConfig.height);
                    
                    gif.addFrame(canvas, { delay: frameDelay });
                    addedFrames++;
                    
                    // Report progress
                    if (onProgress) {
                        onProgress(Math.round((addedFrames / totalFrames) * 100));
                    }
                    
                    // Add next frame (with slight delay to prevent blocking)
                    setTimeout(() => addFrame(index + 1), 10);
                };
                
                // Start adding frames
                addFrame(0);
                
            } catch (error) {
                console.error('GIF export failed:', error);
                reject(error);
            }
        });
    }
    
    // ====== MP4 EXPORT ======
    
    async exportMP4(frames, options = {}) {
        const {
            preset = 'hd',
            duration = 5,
            includeAudio = false,
            onProgress = null
        } = options;
        
        console.log(`🎬 Exporting MP4 (${frames.length} frames)`);
        
        if (!this.ffmpeg) {
            throw new Error('FFmpeg not available for MP4 export');
        }
        
        const presetConfig = this.exportPresets[preset];
        const fps = presetConfig.fps;
        const totalFrames = Math.min(frames.length, fps * duration);
        
        try {
            // Convert frames to video using FFmpeg
            const frameFiles = [];
            
            // Prepare frames
            for (let i = 0; i < totalFrames; i++) {
                const canvas = this.frameToCanvas(frames[i], presetConfig.width, presetConfig.height);
                const dataUrl = canvas.toDataURL('image/png');
                const base64Data = dataUrl.split(',')[1];
                
                frameFiles.push({
                    name: `frame${i.toString().padStart(4, '0')}.png`,
                    data: base64Data
                });
                
                // Report progress
                if (onProgress) {
                    onProgress(Math.round((i / totalFrames) * 50));
                }
            }
            
            // Write frames to FFmpeg filesystem
            for (const file of frameFiles) {
                this.ffmpeg.FS('writeFile', file.name, 
                    this.base64ToUint8Array(file.data));
            }
            
            // Run FFmpeg command
            await this.ffmpeg.run(
                '-framerate', fps.toString(),
                '-i', 'frame%04d.png',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-preset', 'fast',
                '-crf', '23',
                'output.mp4'
            );
            
            // Get result
            const data = this.ffmpeg.FS('readFile', 'output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            
            // Clean up
            for (const file of frameFiles) {
                this.ffmpeg.FS('unlink', file.name);
            }
            this.ffmpeg.FS('unlink', 'output.mp4');
            
            return {
                blob: blob,
                url: URL.createObjectURL(blob),
                type: 'mp4',
                size: blob.size,
                dimensions: `${presetConfig.width}x${presetConfig.height}`,
                duration: duration,
                fps: fps
            };
            
        } catch (error) {
            console.error('MP4 export failed:', error);
            throw error;
        }
    }
    
    // ====== FRAME SEQUENCE EXPORT ======
    
    async exportFrameSequence(frames, options = {}) {
        const {
            format = 'png',
            quality = 0.9,
            startNumber = 1,
            onProgress = null
        } = options;
        
        console.log(`🖼️ Exporting ${frames.length} frames as ${format.toUpperCase()} sequence`);
        
        const zip = new JSZip();
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        
        for (let i = 0; i < frames.length; i++) {
            const canvas = this.frameToCanvas(frames[i]);
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, mimeType, quality);
            });
            
            const fileName = `frame_${(startNumber + i).toString().padStart(4, '0')}.${format}`;
            zip.file(fileName, blob);
            
            if (onProgress) {
                onProgress(Math.round((i / frames.length) * 100));
            }
        }
        
        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        return {
            blob: zipBlob,
            url: URL.createObjectURL(zipBlob),
            type: 'zip',
            size: zipBlob.size,
            frameCount: frames.length,
            format: format
        };
    }
    
    // ====== UTILITY FUNCTIONS ======
    
    frameToCanvas(frame, targetWidth, targetHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (targetWidth && targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // Scale and draw frame
            ctx.drawImage(frame, 0, 0, frame.width, frame.height, 
                          0, 0, targetWidth, targetHeight);
        } else {
            canvas.width = frame.width;
            canvas.height = frame.height;
            ctx.drawImage(frame, 0, 0);
        }
        
        return canvas;
    }
    
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    
    // ====== AI OPTIMIZED EXPORT ======
    
    async exportWithAI(frames, options = {}) {
        console.log('🤖 AI Optimized Export starting...');
        
        // Analyze frames for optimization
        const analysis = this.analyzeFrames(frames);
        
        // Choose optimal export settings based on analysis
        const optimalSettings = this.determineOptimalSettings(analysis, options);
        
        // Apply AI optimizations
        const optimizedFrames = await this.optimizeFramesAI(frames, analysis, optimalSettings);
        
        // Export with optimal settings
        let result;
        switch (optimalSettings.format) {
            case 'mp4':
                result = await this.exportMP4(optimizedFrames, optimalSettings);
                break;
            case 'sequence':
                result = await this.exportFrameSequence(optimizedFrames, optimalSettings);
                break;
            case 'gif':
            default:
                result = await this.exportGIF(optimizedFrames, optimalSettings);
        }
        
        // Add AI metadata
        result.aiOptimized = true;
        result.optimizations = optimalSettings.aiOptimizations;
        result.qualityScore = analysis.qualityScore;
        
        return result;
    }
    
    analyzeFrames(frames) {
        const analysis = {
            frameCount: frames.length,
            motionIntensity: 0,
            colorComplexity: 0,
            brightnessRange: { min: 255, max: 0 },
            qualityScore: 0,
            suggestedFPS: 24,
            suggestedCompression: 'medium'
        };
        
        // Sample frames for analysis
        const sampleSize = Math.min(10, frames.length);
        const sampleIndices = Array.from({ length: sampleSize }, 
            (_, i) => Math.floor(i * (frames.length / sampleSize)));
        
        let totalMotion = 0;
        let totalBrightness = 0;
        
        for (let i = 0; i < sampleIndices.length - 1; i++) {
            const idx1 = sampleIndices[i];
            const idx2 = sampleIndices[i + 1];
            
            const motion = this.calculateFrameDifference(frames[idx1], frames[idx2]);
            totalMotion += motion;
            
            const brightness = this.calculateAverageBrightness(frames[idx1]);
            totalBrightness += brightness;
            
            analysis.brightnessRange.min = Math.min(analysis.brightnessRange.min, brightness);
            analysis.brightnessRange.max = Math.max(analysis.brightnessRange.max, brightness);
        }
        
        analysis.motionIntensity = totalMotion / (sampleIndices.length - 1);
        analysis.colorComplexity = this.calculateColorComplexity(frames[0]);
        
        // Calculate quality score
        analysis.qualityScore = this.calculateQualityScore(analysis);
        
        // Determine optimal FPS based on motion
        if (analysis.motionIntensity > 0.3) {
            analysis.suggestedFPS = 30;
        } else if (analysis.motionIntensity < 0.1) {
            analysis.suggestedFPS = 15;
        }
        
        return analysis;
    }
    
    determineOptimalSettings(analysis, userOptions) {
        const settings = {
            format: userOptions.format || 'gif',
            preset: 'social',
            duration: userOptions.duration || 5,
            fps: analysis.suggestedFPS,
            quality: 85,
            aiOptimizations: []
        };
        
        // Choose format based on analysis
        if (!userOptions.format) {
            if (analysis.motionIntensity > 0.2 && analysis.qualityScore > 70) {
                settings.format = 'mp4';
                settings.preset = 'hd';
            } else if (analysis.colorComplexity > 0.7) {
                settings.format = 'sequence';
                settings.quality = 95;
            }
        }
        
        // Add AI optimizations
        if (analysis.motionIntensity < 0.15) {
            settings.aiOptimizations.push('frameRateReduction');
            settings.fps = Math.max(15, settings.fps - 5);
        }
        
        if (analysis.brightnessRange.max - analysis.brightnessRange.min > 100) {
            settings.aiOptimizations.push('dynamicCompression');
        }
        
        if (analysis.qualityScore < 60) {
            settings.aiOptimizations.push('qualityEnhancement');
            settings.quality = Math.min(95, settings.quality + 10);
        }
        
        return settings;
    }
    
    async optimizeFramesAI(frames, analysis, settings) {
        console.log('🔄 Applying AI optimizations:', settings.aiOptimizations);
        
        let optimizedFrames = [...frames];
        
        // Apply optimizations
        for (const optimization of settings.aiOptimizations) {
            switch (optimization) {
                case 'frameRateReduction':
                    optimizedFrames = this.reduceFrameRate(optimizedFrames, settings.fps);
                    break;
                    
                case 'dynamicCompression':
                    optimizedFrames = await this.applyDynamicCompression(optimizedFrames);
                    break;
                    
                case 'qualityEnhancement':
                    optimizedFrames = await this.enhanceQuality(optimizedFrames);
                    break;
            }
        }
        
        return optimizedFrames;
    }
    
    reduceFrameRate(frames, targetFPS) {
        const originalFPS = 30; // Assuming original is 30fps
        const ratio = originalFPS / targetFPS;
        
        return frames.filter((_, index) => Math.floor(index % ratio) === 0);
    }
    
    async applyDynamicCompression(frames) {
        // Simulated compression optimization
        return frames.map(frame => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = frame.width;
            canvas.height = frame.height;
            ctx.drawImage(frame, 0, 0);
            
            // Simple contrast adjustment
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Lighten dark areas slightly
                if (data[i] + data[i + 1] + data[i + 2] < 300) {
                    data[i] = Math.min(255, data[i] + 10);
                    data[i + 1] = Math.min(255, data[i + 1] + 10);
                    data[i + 2] = Math.min(255, data[i + 2] + 10);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        });
    }
    
    // ====== QUALITY CALCULATION ======
    
    calculateFrameDifference(frame1, frame2) {
        const canvas1 = this.frameToCanvas(frame1, 64, 64);
        const canvas2 = this.frameToCanvas(frame2, 64, 64);
        
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');
        
        const data1 = ctx1.getImageData(0, 0, 64, 64).data;
        const data2 = ctx2.getImageData(0, 0, 64, 64).data;
        
        let difference = 0;
        for (let i = 0; i < data1.length; i += 4) {
            const diffR = Math.abs(data1[i] - data2[i]);
            const diffG = Math.abs(data1[i + 1] - data2[i + 1]);
            const diffB = Math.abs(data1[i + 2] - data2[i + 2]);
            
            difference += (diffR + diffG + diffB) / 3;
        }
        
        return difference / (data1.length / 4) / 255; // Normalize to 0-1
    }
    
    calculateAverageBrightness(frame) {
        const canvas = this.frameToCanvas(frame, 32, 32);
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, 32, 32).data;
        
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            total += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        
        return total / (data.length / 4);
    }
    
    calculateColorComplexity(frame) {
        const canvas = this.frameToCanvas(frame, 32, 32);
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, 32, 32).data;
        
        const colorSet = new Set();
        for (let i = 0; i < data.length; i += 4) {
            const color = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`;
            colorSet.add(color);
        }
        
        return colorSet.size / 4096; // Normalize (32*32 = 1024 pixels, 4-bit color = 4096 possible colors)
    }
    
    calculateQualityScore(analysis) {
        let score = 50; // Base score
        
        // Reward good conditions
        if (analysis.motionIntensity > 0.1 && analysis.motionIntensity < 0.4) {
            score += 20; // Optimal motion
        }
        
        if (analysis.colorComplexity > 0.3 && analysis.colorComplexity < 0.8) {
            score += 15; // Good color range
        }
        
        const brightnessRange = analysis.brightnessRange.max - analysis.brightnessRange.min;
        if (brightnessRange > 50 && brightnessRange < 200) {
            score += 15; // Good contrast
        }
        
        return Math.min(100, Math.max(0, score));
    }
    
    // ====== BATCH PROCESSING ======
    
    async processExportQueue() {
        if (this.isExporting || this.exportQueue.length === 0) return;
        
        this.isExporting = true;
        
        while (this.exportQueue.length > 0) {
            const task = this.exportQueue.shift();
            
            try {
                console.log(`Processing export: ${task.type}`);
                
                // Update UI
                if (task.onStart) task.onStart();
                
                // Perform export
                const result = await this[`export${task.type.toUpperCase()}`](task.frames, task.options);
                
                // Complete
                if (task.onComplete) task.onComplete(result);
                
            } catch (error) {
                console.error('Export task failed:', error);
                if (task.onError) task.onError(error);
            }
        }
        
        this.isExporting = false;
    }
    
    addToQueue(frames, type, options = {}) {
        const task = {
            frames,
            type,
            options,
            id: Date.now(),
            onStart: options.onStart,
            onProgress: options.onProgress,
            onComplete: options.onComplete,
            onError: options.onError
        };
        
        this.exportQueue.push(task);
        this.processExportQueue();
        
        return task.id;
    }
    
    // ====== PUBLIC API ======
    
    async exportAnimation(animationData, format = 'gif', options = {}) {
        const {
            useAI = true,
            onProgress = null,
            onComplete = null
        } = options;
        
        // Extract frames from animation
        const frames = await this.extractFramesFromAnimation(animationData, options);
        
        if (onProgress) onProgress(10);
        
        let result;
        if (useAI) {
            result = await this.exportWithAI(frames, { ...options, format });
        } else {
            switch (format.toLowerCase()) {
                case 'mp4':
                    result = await this.exportMP4(frames, options);
                    break;
                case 'zip':
                case 'sequence':
                    result = await this.exportFrameSequence(frames, options);
                    break;
                case 'gif':
                default:
                    result = await this.exportGIF(frames, options);
            }
        }
        
        if (onComplete) onComplete(result);
        return result;
    }
    
    async extractFramesFromAnimation(animationData, options) {
        const { duration = 5, fps = 24 } = options;
        const totalFrames = fps * duration;
        const frames = [];
        
        // For demo, generate mock frames
        // In reality, capture frames from canvas animation
        
        for (let i = 0; i < totalFrames; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            
            const ctx = canvas.getContext('2d');
            
            // Draw animation frame (simulated)
            const t = i / totalFrames;
            this.drawAnimationFrame(ctx, t, animationData);
            
            frames.push(canvas);
        }
        
        return frames;
    }
    
    drawAnimationFrame(ctx, t, animationData) {
        // Draw a sample animation frame
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw moving circle
        const x = 400 + Math.cos(t * Math.PI * 2) * 200;
        const y = 300 + Math.sin(t * Math.PI * 2) * 200;
        const radius = 50 + Math.sin(t * Math.PI * 4) * 20;
        
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw path trail
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i <= 20; i++) {
            const trailT = t - i * 0.02;
            if (trailT < 0) continue;
            
            const trailX = 400 + Math.cos(trailT * Math.PI * 2) * 200;
            const trailY = 300 + Math.sin(trailT * Math.PI * 2) * 200;
            
            if (i === 0) ctx.moveTo(trailX, trailY);
            else ctx.lineTo(trailX, trailY);
        }
        
        ctx.stroke();
    }
    
    getExportPresets() {
        return this.exportPresets;
    }
    
    getEstimatedFileSize(frames, format, options = {}) {
        const preset = this.exportPresets[options.preset] || this.exportPresets.social;
        
        let sizePerFrame;
        switch (format) {
            case 'mp4':
                sizePerFrame = (preset.width * preset.height * 3) / 1000; // Rough estimate
                break;
            case 'png':
                sizePerFrame = (preset.width * preset.height * 4) / 1000;
                break;
            case 'gif':
            default:
                sizePerFrame = (preset.width * preset.height) / 2000; // Compressed
        }
        
        const frameCount = options.duration ? preset.fps * options.duration : frames.length;
        const estimatedSize = sizePerFrame * frameCount;
        
        return {
            min: estimatedSize * 0.5,
            avg: estimatedSize,
            max: estimatedSize * 1.5,
            unit: 'KB'
        };
    }
}

// ====== GLOBAL EXPORTER ======
let smartExporter = null;

// Initialize when page loads
window.addEventListener('load', async () => {
    smartExporter = new SmartExporter();
    window.smartExporter = smartExporter;
    console.log('📤 Smart Exporter ready');
});

// Export for modules
export { SmartExporter };
