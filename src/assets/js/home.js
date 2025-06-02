// Import Spline runtime
import { Application } from 'https://cdn.skypack.dev/@splinetool/runtime@0.9.416';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById("canvas3d");
  
  // Set canvas dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const app = new Application(canvas);
  
  try {
    // Load Spline scene
    await app.load("https://prod.spline.design/LaBQiBIhyCMuluQ1/scene.splinecode");
    
    // Find the object - add debug to check all available objects
    console.log('All objects in scene:', app.getAllObjects());
    const chain = app.findObjectByName("Group");
    
    if (!chain) {
      console.error("Could not find object named 'Group' in the Spline scene");
      return;
    }
    
    // Initialize GSAP animations
    initAnimations(chain);
  } catch (error) {
    console.error("Error loading Spline model:", error);
  }
});

function initAnimations(chain) {
  // Register ScrollTrigger plugin
  gsap.registerPlugin(ScrollTrigger);
  
  gsap.set(chain.scale, { x: 1.6, y: 1.6, z: 1.6 });
  gsap.set(chain.position, { x: 800, y: 0 });
  
  // Create timeline with smoother animation
  gsap.timeline({
    scrollTrigger: {
      trigger: "#part1",
      start: "top bottom",
      end: "bottom top",
      scrub: 1.5,
      markers: false,
    }
  })
  .to(chain.rotation, { 
    y: 1,
    duration: 2 
  }, 0)
  .to(chain.position, { 
    x: -600, 
    y: -100,
    duration: 2 
  }, 0)
  

  const part2 = gsap.timeline({
    scrollTrigger: {
      trigger: "#part2",
      start: "top bottom",
      end: "bottom top",
      scrub: 1.5,
      markers: false,
    }
  })

  const part3 = gsap.timeline({
    scrollTrigger: {
      trigger: "#part3",
      start: "top bottom",
      end: "bottom top",
      scrub: 1.5,
      markers: false,
    }
  })

  const part4 = gsap.timeline({
    scrollTrigger: {
      trigger: "#part4",
      start: "top bottom",
      end: "bottom top",
      scrub: 1.5,
      markers: false,
    }
  })

  const part5 = gsap.timeline({
    scrollTrigger: {
      trigger: "#part5",
      start: "top bottom",
      end: "bottom top",
      scrub: 1.5,
      markers: false,
    }
  })
}

// Enhanced window resize handler
window.addEventListener('resize', () => {
  const canvas = document.getElementById("canvas3d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});