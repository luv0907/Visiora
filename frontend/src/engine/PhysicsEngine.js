import Matter from 'matter-js';

export class PhysicsEngine {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Engine creation
    this.engine = Matter.Engine.create({
      positionIterations: 8,
      velocityIterations: 8
    });
    
    // Resize & Setup
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    
    // Mouse Interaction
    this.mouse = Matter.Mouse.create(this.canvas);
    // Matter.js automatically multiplies mouse coordinates by (canvas.width / canvas.clientWidth)
    // which breaks interactions on Retina displays because our engine runs in CSS pixels.
    this.mouse.pixelRatio = 1;
    Matter.Mouse.setScale(this.mouse, { x: 1, y: 1 });
    
    this.mouseConstraint = Matter.MouseConstraint.create(this.engine, {
      mouse: this.mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    
    Matter.World.add(this.engine.world, this.mouseConstraint);
    
    // Runner setup
    this.runner = Matter.Runner.create();
  }

  resize() {
    // Ensure we get the actual layout dimensions, falling back to window size if layout hasn't settled
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.W = rect.width > 100 ? rect.width : window.innerWidth;
    this.H = rect.height > 100 ? rect.height : (window.innerHeight - 64);
    
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;
  }

  addBodies(bodies) {
    Matter.World.add(this.engine.world, bodies);
  }

  setGravity(scale) {
    this.engine.world.gravity.scale = scale;
  }

  onBeforeUpdate(callback) {
    Matter.Events.on(this.engine, 'beforeUpdate', callback);
  }

  onRender(callback) {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    
    const loop = () => {
      if (!this.canvas) return;
      
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(this.dpr, this.dpr);
        callback(ctx, this.W, this.H);
        ctx.restore();
      }
      
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  start() {
    Matter.Runner.run(this.runner, this.engine);
  }

  pause() {
    Matter.Runner.stop(this.runner);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    Matter.Runner.stop(this.runner);
    Matter.Engine.clear(this.engine);
    this.canvas = null;
  }
}
