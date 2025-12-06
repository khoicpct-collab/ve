// ====== AI PATH GENERATOR - Smart Motion Suggestions ======

class AIPathGenerator {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.pathHistory = [];
        this.learningRate = 0.01;
        
        // Motion presets database
        this.motionPresets = {
            'flow': {
                type: 'bezier',
                points: 50,
                smoothness: 0.9,
                physics: { gravity: 0.1, friction: 0.02, elasticity: 0.3 },
                description: 'Natural fluid motion with smooth curves'
            },
            'bounce': {
                type: 'parabolic',
                points: 30,
                smoothness: 0.7,
                physics: { gravity: 0.3, friction: 0.1, elasticity: 0.8 },
                description: 'Realistic bouncing with energy conservation'
            },
            'swirl': {
                type: 'spiral',
                points: 100,
                smoothness: 0.95,
                physics: { gravity: 0, friction: 0.05, elasticity: 0.1 },
                description: 'Elegant swirling motion pattern'
            },
            'gravity': {
                type: 'freefall',
                points: 20,
                smoothness: 0.6,
                physics: { gravity: 0.5, friction: 0.15, elasticity: 0.2 },
                description: 'Realistic gravity-based falling'
            },
            'explode': {
                type: 'radial',
                points: 40,
                smoothness: 0.5,
                physics: { gravity: 0.1, friction: 0.08, elasticity: 0.9 },
                description: 'Explosion effect with particle dispersion'
            }
        };
        
        this.init();
    }
    
    async init() {
        console.log('🤖 AI Path Generator - Initializing...');
        
        try {
            // Load TensorFlow.js model (or use fallback)
            await this.loadAIModel();
            this.isModelLoaded = true;
            console.log('✅ AI Model loaded successfully');
            
            // Initialize path memory
            this.initializePathMemory();
            
        } catch (error) {
            console.warn('⚠️ Could not load AI model, using rule-based system:', error);
            this.isModelLoaded = false;
        }
    }
    
    async loadAIModel() {
        // In production, load actual TensorFlow.js model
        // For demo, simulate model loading
        return new Promise((resolve) => {
            setTimeout(() => {
                this.model = {
                    predict: (input) => this.simulatePrediction(input),
                    train: (data) => this.learnFromData(data)
                };
                resolve();
            }, 1000);
        });
    }
    
    // ====== SMART PATH GENERATION ======
    
    async generateSmartPath(startPoint, endPoint, options = {}) {
        const {
            preset = 'flow',
            complexity = 'medium',
            physicsEnabled = true,
            optimize = true
        } = options;
        
        console.log(`🎯 Generating smart path from ${JSON.stringify(startPoint)} to ${JSON.stringify(endPoint)}`);
        
        // Choose generation method based on AI availability
        let path;
        if (this.isModelLoaded && this.model) {
            path = await this.generateWithAI(startPoint, endPoint, preset);
        } else {
            path = this.generateWithRules(startPoint, endPoint, preset);
        }
        
        // Apply physics simulation if enabled
        if (physicsEnabled) {
            path = this.applyPhysics(path, this.motionPresets[preset].physics);
        }
        
        // Optimize path if requested
        if (optimize) {
            path = this.optimizePath(path);
        }
        
        // Add to history for learning
        this.recordPath(path, preset);
        
        return path;
    }
    
    async generateWithAI(startPoint, endPoint, preset) {
        // AI-based path generation
        const presetConfig = this.motionPresets[preset];
        const numPoints = presetConfig.points;
        
        // Generate control points using AI
        const controlPoints = await this.generateControlPoints(startPoint, endPoint, preset);
        
        // Generate path based on preset type
        let pathPoints = [];
        
        switch (presetConfig.type) {
            case 'bezier':
                pathPoints = this.generateBezierPath(startPoint, endPoint, controlPoints, numPoints);
                break;
                
            case 'parabolic':
                pathPoints = this.generateParabolicPath(startPoint, endPoint, controlPoints, numPoints);
                break;
                
            case 'spiral':
                pathPoints = this.generateSpiralPath(startPoint, endPoint, controlPoints, numPoints);
                break;
                
            case 'freefall':
                pathPoints = this.generateFreefallPath(startPoint, endPoint, controlPoints, numPoints);
                break;
                
            case 'radial':
                pathPoints = this.generateRadialPath(startPoint, endPoint, controlPoints, numPoints);
                break;
                
            default:
                pathPoints = this.generateBezierPath(startPoint, endPoint, controlPoints, numPoints);
        }
        
        // Apply smoothness
        if (presetConfig.smoothness > 0.5) {
            pathPoints = this.smoothPath(pathPoints, presetConfig.smoothness);
        }
        
        return {
            points: pathPoints,
            type: preset,
            preset: presetConfig,
            generatedBy: 'AI',
            timestamp: Date.now()
        };
    }
    
    generateWithRules(startPoint, endPoint, preset) {
        // Rule-based path generation (fallback)
        const presetConfig = this.motionPresets[preset];
        const numPoints = presetConfig.points;
        
        // Simple linear interpolation with some randomness
        const points = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const x = startPoint.x + (endPoint.x - startPoint.x) * t;
            const y = startPoint.y + (endPoint.y - startPoint.y) * t;
            
            // Add some natural variation based on preset
            let variationX = 0;
            let variationY = 0;
            
            switch (preset) {
                case 'flow':
                    variationX = Math.sin(t * Math.PI * 4) * 20 * (1 - t);
                    variationY = Math.cos(t * Math.PI * 2) * 10;
                    break;
                    
                case 'bounce':
                    variationY = Math.abs(Math.sin(t * Math.PI * 3)) * 50 * (1 - t);
                    break;
                    
                case 'swirl':
                    variationX = Math.sin(t * Math.PI * 10) * 30 * (1 - t);
                    variationY = Math.cos(t * Math.PI * 10) * 30 * (1 - t);
                    break;
            }
            
            points.push({
                x: x + variationX,
                y: y + variationY,
                t: t
            });
        }
        
        return {
            points: points,
            type: preset,
            preset: presetConfig,
            generatedBy: 'Rule-based',
            timestamp: Date.now()
        };
    }
    
    // ====== CONTROL POINT GENERATION ======
    
    async generateControlPoints(start, end, preset) {
        // Generate intelligent control points for smooth curves
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Base control points
        const controlPoints = [];
        
        // Add midpoint with offset based on preset
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        switch (preset) {
            case 'flow':
                // Curved flow pattern
                controlPoints.push({
                    x: midX + dy * 0.3,
                    y: midY - dx * 0.3
                });
                controlPoints.push({
                    x: midX - dy * 0.2,
                    y: midY + dx * 0.2
                });
                break;
                
            case 'bounce':
                // Bouncing arc
                controlPoints.push({
                    x: midX,
                    y: start.y - distance * 0.4
                });
                break;
                
            case 'swirl':
                // Swirling control points
                for (let i = 1; i <= 3; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    controlPoints.push({
                        x: midX + Math.cos(angle) * distance * 0.3,
                        y: midY + Math.sin(angle) * distance * 0.3
                    });
                }
                break;
                
            default:
                // Default: simple curve
                controlPoints.push({
                    x: midX + dy * 0.2,
                    y: midY - dx * 0.2
                });
        }
        
        return controlPoints;
    }
    
    // ====== PATH GENERATION ALGORITHMS ======
    
    generateBezierPath(start, end, controls, numPoints) {
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            
            // Calculate point on Bezier curve
            const point = this.calculateBezierPoint(t, start, controls, end);
            point.t = t;
            
            points.push(point);
        }
        
        return points;
    }
    
    calculateBezierPoint(t, p0, controls, pn) {
        // De Casteljau's algorithm
        const points = [p0, ...controls, pn];
        let workingPoints = [...points];
        
        for (let level = 1; level < points.length; level++) {
            const newPoints = [];
            for (let i = 0; i < workingPoints.length - 1; i++) {
                newPoints.push({
                    x: workingPoints[i].x * (1 - t) + workingPoints[i + 1].x * t,
                    y: workingPoints[i].y * (1 - t) + workingPoints[i + 1].y * t
                });
            }
            workingPoints = newPoints;
        }
        
        return workingPoints[0];
    }
    
    generateParabolicPath(start, end, controls, numPoints) {
        const points = [];
        const peak = controls[0] || { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 100 };
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const x = start.x + (end.x - start.x) * t;
            
            // Quadratic parabola equation
            const y = this.quadraticBezier(start.y, peak.y, end.y, t);
            
            points.push({ x, y, t });
        }
        
        return points;
    }
    
    quadraticBezier(p0, p1, p2, t) {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    }
    
    generateSpiralPath(start, end, controls, numPoints) {
        const points = [];
        const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const maxRadius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        ) / 2;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = t * Math.PI * 4; // Two full rotations
            const radius = maxRadius * (1 - t); // Decreasing radius
            
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            
            points.push({ x, y, t });
        }
        
        return points;
    }
    
    // ====== PHYSICS SIMULATION ======
    
    applyPhysics(pathPoints, physicsParams) {
        const { gravity = 0.1, friction = 0.02, elasticity = 0.5 } = physicsParams;
        
        let velocityX = 0;
        let velocityY = 0;
        
        return pathPoints.map((point, index) => {
            if (index === 0) return point;
            
            const prevPoint = pathPoints[index - 1];
            const dt = point.t - prevPoint.t;
            
            // Apply gravity
            velocityY += gravity * dt * 100;
            
            // Apply friction
            velocityX *= (1 - friction);
            velocityY *= (1 - friction);
            
            // Calculate new position with physics
            const newX = point.x + velocityX * dt;
            const newY = point.y + velocityY * dt;
            
            // Simple boundary check (simulate floor)
            const floorY = Math.max(...pathPoints.map(p => p.y)) + 50;
            if (newY > floorY) {
                velocityY = -velocityY * elasticity; // Bounce
                return { ...point, x: newX, y: floorY };
            }
            
            return { ...point, x: newX, y: newY };
        });
    }
    
    // ====== PATH OPTIMIZATION ======
    
    optimizePath(pathPoints) {
        // Remove redundant points
        let optimized = [pathPoints[0]];
        
        for (let i = 1; i < pathPoints.length - 1; i++) {
            const prev = optimized[optimized.length - 1];
            const current = pathPoints[i];
            const next = pathPoints[i + 1];
            
            // Check if current point is necessary
            const angle = this.calculateAngle(prev, current, next);
            const distance = this.calculateDistance(prev, next);
            
            // Keep point if angle is sharp or distance is large
            if (Math.abs(angle) > 10 || distance > 20) {
                optimized.push(current);
            }
        }
        
        optimized.push(pathPoints[pathPoints.length - 1]);
        
        // Smooth the optimized path
        return this.smoothPath(optimized, 0.8);
    }
    
    smoothPath(points, smoothness = 0.5) {
        if (points.length <= 2) return points;
        
        const smoothed = [];
        const weight = smoothness;
        
        for (let i = 0; i < points.length; i++) {
            if (i === 0 || i === points.length - 1) {
                smoothed.push(points[i]);
                continue;
            }
            
            const prev = points[i - 1];
            const current = points[i];
            const next = points[i + 1];
            
            smoothed.push({
                x: (prev.x + current.x * 2 + next.x) / 4,
                y: (prev.y + current.y * 2 + next.y) / 4,
                t: current.t
            });
        }
        
        return smoothed;
    }
    
    // ====== AI LEARNING ======
    
    recordPath(path, preset) {
        this.pathHistory.push({
            path: path,
            preset: preset,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (this.pathHistory.length > 100) {
            this.pathHistory.shift();
        }
        
        // Learn from successful paths
        this.learnFromPath(path, preset);
    }
    
    learnFromPath(path, preset) {
        if (!this.model || !this.isModelLoaded) return;
        
        // Extract features from successful path
        const features = this.extractPathFeatures(path);
        
        // Update model weights
        this.model.train({
            features: features,
            label: preset,
            learningRate: this.learningRate
        });
    }
    
    extractPathFeatures(path) {
        const points = path.points;
        
        // Calculate various path features
        const features = {
            length: this.calculatePathLength(points),
            curvature: this.calculateAverageCurvature(points),
            smoothness: this.calculateSmoothness(points),
            complexity: this.calculateComplexity(points),
            directionChanges: this.countDirectionChanges(points),
            speedVariation: this.calculateSpeedVariation(points)
        };
        
        return features;
    }
    
    calculatePathLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            length += this.calculateDistance(points[i - 1], points[i]);
        }
        return length;
    }
    
    calculateAverageCurvature(points) {
        if (points.length < 3) return 0;
        
        let totalCurvature = 0;
        for (let i = 1; i < points.length - 1; i++) {
            const curvature = this.calculateAngle(points[i - 1], points[i], points[i + 1]);
            totalCurvature += Math.abs(curvature);
        }
        
        return totalCurvature / (points.length - 2);
    }
    
    calculateSmoothness(points) {
        const angles = [];
        for (let i = 1; i < points.length - 1; i++) {
            angles.push(this.calculateAngle(points[i - 1], points[i], points[i + 1]));
        }
        
        // Calculate standard deviation of angles
        const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
        const variance = angles.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / angles.length;
        
        return 1 / (1 + Math.sqrt(variance)); // Higher = smoother
    }
    
    // ====== UTILITY FUNCTIONS ======
    
    calculateDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    
    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        if (mag1 === 0 || mag2 === 0) return 0;
        
        const angle = Math.acos(dot / (mag1 * mag2));
        return angle * (180 / Math.PI); // Convert to degrees
    }
    
    simulatePrediction(input) {
        // Simulate AI prediction
        const presets = Object.keys(this.motionPresets);
        const scores = {};
        
        presets.forEach(preset => {
            const presetFeatures = this.extractPathFeatures(
                this.generateWithRules({x: 0, y: 0}, {x: 100, y: 100}, preset)
            );
            
            // Simple similarity score
            let score = 0;
            Object.keys(input.features).forEach(key => {
                if (presetFeatures[key] !== undefined) {
                    const diff = Math.abs(input.features[key] - presetFeatures[key]);
                    score += 1 / (1 + diff);
                }
            });
            
            scores[preset] = score / Object.keys(input.features).length;
        });
        
        // Return best match
        const bestPreset = Object.keys(scores).reduce((a, b) => 
            scores[a] > scores[b] ? a : b
        );
        
        return {
            preset: bestPreset,
            confidence: scores[bestPreset],
            scores: scores
        };
    }
    
    learnFromData(data) {
        // Simulate learning
        console.log('🧠 AI Learning from data:', data);
        this.learningRate *= 0.999; // Gradually decrease learning rate
    }
    
    // ====== PUBLIC API ======
    
    async suggestMotion(startPoint, endPoint, constraints = {}) {
        const suggestions = [];
        
        // Generate suggestions for each preset
        for (const preset of Object.keys(this.motionPresets)) {
            const path = await this.generateSmartPath(startPoint, endPoint, { 
                preset, 
                physicsEnabled: true,
                optimize: true 
            });
            
            // Calculate quality score
            const quality = this.calculatePathQuality(path);
            
            suggestions.push({
                preset: preset,
                path: path,
                quality: quality,
                description: this.motionPresets[preset].description,
                complexity: this.motionPresets[preset].points > 60 ? 'High' : 'Medium'
            });
        }
        
        // Sort by quality
        suggestions.sort((a, b) => b.quality - a.quality);
        
        return suggestions.slice(0, 3); // Top 3 suggestions
    }
    
    calculatePathQuality(path) {
        const features = this.extractPathFeatures(path);
        
        // Quality formula (higher is better)
        let quality = 1.0;
        
        // Reward smoothness
        quality *= (0.5 + features.smoothness * 0.5);
        
        // Reward appropriate complexity
        const idealComplexity = 0.7;
        quality *= (1 - Math.abs(features.complexity - idealComplexity));
        
        // Penalize extreme direction changes
        if (features.directionChanges > 10) {
            quality *= 0.8;
        }
        
        return Math.min(1, Math.max(0, quality));
    }
    
    async autoTraceImage(imageData) {
        console.log('🖼️ AI Auto-tracing image...');
        
        // Simulate image tracing
        return new Promise((resolve) => {
            setTimeout(() => {
                // Generate random shape points (in reality, use computer vision)
                const points = [];
                const centerX = imageData.width / 2;
                const centerY = imageData.height / 2;
                const radius = Math.min(centerX, centerY) * 0.8;
                
                for (let i = 0; i < 36; i++) {
                    const angle = (i / 36) * Math.PI * 2;
                    const noise = Math.random() * 20 - 10;
                    
                    points.push({
                        x: centerX + Math.cos(angle) * (radius + noise),
                        y: centerY + Math.sin(angle) * (radius + noise)
                    });
                }
                
                resolve({
                    success: true,
                    points: points,
                    confidence: 0.85,
                    boundingBox: {
                        x: centerX - radius,
                        y: centerY - radius,
                        width: radius * 2,
                        height: radius * 2
                    }
                });
            }, 500);
        });
    }
    
    getMotionAnalysis(path) {
        const features = this.extractPathFeatures(path);
        
        return {
            realismScore: Math.round(features.smoothness * 100),
            fluidityScore: Math.round((1 - features.complexity) * 100),
            naturalnessScore: Math.round(this.calculatePathQuality(path) * 100),
            efficiencyScore: Math.round((1 - features.directionChanges / 20) * 100),
            recommendations: this.generateRecommendations(features)
        };
    }
    
    generateRecommendations(features) {
        const recommendations = [];
        
        if (features.smoothness < 0.6) {
            recommendations.push('Consider smoothing the path for more natural motion');
        }
        
        if (features.directionChanges > 8) {
            recommendations.push('Reduce sharp direction changes for better fluidity');
        }
        
        if (features.complexity > 0.8) {
            recommendations.push('Path is overly complex, consider simplifying');
        }
        
        return recommendations.length > 0 ? recommendations : ['Path looks great! No optimization needed.'];
    }
}

// ====== GLOBAL AI INSTANCE ======
let aiPathGenerator = null;

// Initialize when page loads
window.addEventListener('load', async () => {
    aiPathGenerator = new AIPathGenerator();
    
    // Make available globally
    window.aiPathGenerator = aiPathGenerator;
    
    console.log('🤖 AI Path Generator ready');
});

// Export for modules
export { AIPathGenerator };
