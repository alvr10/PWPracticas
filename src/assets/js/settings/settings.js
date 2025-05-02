// Dark Mode Toggle
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

// Check for saved user preference
if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.checked = true;
}

darkModeToggle.addEventListener('change', function() {
    if (this.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
});

// Modal Handling
const emailModal = document.getElementById('email-modal');
const passwordModal = document.getElementById('password-modal');
const openEmailBtn = document.getElementById('change-email-btn');
const openPasswordBtn = document.getElementById('change-password-btn');
const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');

openEmailBtn.addEventListener('click', function() {
    emailModal.style.display = 'flex';
});

openPasswordBtn.addEventListener('click', function() {
    passwordModal.style.display = 'flex';
});

closeButtons.forEach(button => {
    button.addEventListener('click', function() {
        emailModal.style.display = 'none';
        passwordModal.style.display = 'none';
    });
});

window.addEventListener('click', function(event) {
    if (event.target === emailModal) {
        emailModal.style.display = 'none';
    }
    if (event.target === passwordModal) {
        passwordModal.style.display = 'none';
    }
});

// Form Submissions
document.getElementById('email-form').addEventListener('submit', function(e) {
    e.preventDefault();
    // TODO: Implement email change logic
    alert('Correo electrónico actualizado con éxito');
    emailModal.style.display = 'none';
});

document.getElementById('password-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    // TODO: Implement password change logic
    alert('Contraseña actualizada con éxito');
    passwordModal.style.display = 'none';
});

// Logout
document.getElementById('logout-btn').addEventListener('click', function() {
    // TODO: Implement logout logic
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        alert('Sesión cerrada con éxito');
        window.location.href = '../../index.html';
    }
});

// Notification Toggles
const notificationToggles = [
    'comment-notifications',
    'like-notifications',
    'friend-notifications'
];

// Load saved notification preferences
notificationToggles.forEach(id => {
    const toggle = document.getElementById(id);
    if (localStorage.getItem(id) === 'disabled') {
        toggle.checked = false;
    }
    
    toggle.addEventListener('change', function() {
        localStorage.setItem(id, this.checked ? 'enabled' : 'disabled');
    });
});