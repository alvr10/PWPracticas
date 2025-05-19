// src/assets/js/main.js

// Check if user is logged in on pages that require authentication
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    // Skip auth check for login and register pages
    if (path.includes('/auth/') || path.includes('/modules/legal/')) {
        return;
    }
    
    // For all other pages, check if user is authenticated
    const token = localStorage.getItem('auth_token');
    const userData = JSON.parse(localStorage.getItem('user_data'));
    
    if (!token || !userData) {
        // Redirect to login if not authenticated
        window.location.href = '../auth/login.html';
        return;
    }
    
    // Verify token with server
    fetch('../includes/auth/check_session.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: token })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.valid) {
            // Token is invalid, clear storage and redirect
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '../auth/login.html';
        } else {
            // User is authenticated, you can update UI elements here
            updateUserInterface(userData);
        }
    })
    .catch(error => {
        console.error('Error checking session:', error);
    });
});

// Update UI elements based on user data
function updateUserInterface(userData) {
    // Update user information in the UI
    const userNameElements = document.querySelectorAll('.user-name');
    const userProfileImage = document.querySelectorAll('.user-profile-image');
    
    if (userNameElements.length > 0) {
        userNameElements.forEach(element => {
            element.textContent = userData.nombre + ' ' + userData.apellidos;
        });
    }
    
    if (userProfileImage.length > 0 && userData.imagen_perfil_id) {
        // This would be replaced with actual logic to fetch the user's profile image
        userProfileImage.forEach(element => {
            element.src = `../assets/img/profiles/${userData.imagen_perfil_id}.jpg`;
        });
    }
    
    // Set up logout functionality
    const logoutButtons = document.querySelectorAll('.logout-btn');
    if (logoutButtons.length > 0) {
        logoutButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        });
    }
}

// Function to log out (defined in auth.js)
// This is just a reference, the actual implementation is in auth.js
if (typeof logout !== 'function') {
    function logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '../auth/login.html';
    }
}