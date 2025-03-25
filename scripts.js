/*
document.addEventListener('DOMContentLoaded', function() {
  // Parallax effect for hero section
  const hero = document.querySelector('.hero');
  const heroBg = document.querySelector('.hero-background');
  
  if (hero && heroBg) {
    window.addEventListener('scroll', function() {
      const scrollPosition = window.pageYOffset;
      heroBg.style.transform = `translateY(${scrollPosition * 0.5}px)`;
    });
  }
});

// Demo Modal functionality
const modal = document.getElementById("demo-modal");
const demoBtn = document.getElementById("demo-btn");
const closeBtns = document.querySelectorAll(".close-modal");

demoBtn.addEventListener("click", () => {
  modal.style.display = "block";
  document.body.style.overflow = "hidden"; // Prevent scrolling
});

closeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Re-enable scrolling
  });
});

window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Re-enable scrolling
  }
});
*/