// Settings JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const API_BASE_URL = 'http://localhost:8000/src/includes/settings/';
  const ADMIN_API_URL = 'http://localhost:8000/src/includes/admin/';
  let currentUser = {};
  
  // DOM Elements
  const emailModal = document.getElementById('email-modal');
  const passwordModal = document.getElementById('password-modal');
  const confirmationModal = document.getElementById('confirmation-modal');
  const openEmailBtn = document.getElementById('change-email-btn');
  const openPasswordBtn = document.getElementById('change-password-btn');
  const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  // Load settings on start
  loadSettings();
  
  // Event listeners
  openEmailBtn?.addEventListener('click', () => emailModal.style.display = 'flex');
  openPasswordBtn?.addEventListener('click', () => passwordModal.style.display = 'flex');
  logoutBtn?.addEventListener('click', handleLogout);
  
  closeButtons.forEach(button => {
    button.addEventListener('click', closeAllModals);
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === emailModal) emailModal.style.display = 'none';
    if (event.target === passwordModal) passwordModal.style.display = 'none';
    if (event.target === confirmationModal) confirmationModal.style.display = 'none';
  });
  
  // Form submissions
  document.getElementById('email-form')?.addEventListener('submit', handleEmailChange);
  document.getElementById('password-form')?.addEventListener('submit', handlePasswordChange);
  
  // Load user settings and profile
  async function loadSettings() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}get_settings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: token })
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar configuraciones');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error loading settings');
      }
      
      currentUser = data.user;
      
      // Update user display
      updateUserDisplay(data.user);
            
      // Show admin button if user is admin
      if (data.user.is_admin) {
        showAdminButton();
      }
        
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error al cargar configuraciones: ' + error.message, 'error');
      
      // If auth error, redirect to login
      if (error.message.includes('token') || error.message.includes('auth')) {
        setTimeout(() => {
          window.location.href = '../../auth/login.html';
        }, 2000);
      }
    }
  }
  
  // Update user display
  function updateUserDisplay(user) {
    // Update account overview
    const accountName = document.querySelector('.account-name');
    const accountEmail = document.querySelector('.account-email');
    const accountAvatar = document.querySelector('.account-avatar img');
    
    if (accountName) accountName.textContent = `${user.name} ${user.lastname}`;
    if (accountEmail) accountEmail.textContent = user.email;
    if (accountAvatar) accountAvatar.src = user.avatar;
    
    // Update current email in modal
    const currentEmailField = document.getElementById('current-email');
    if (currentEmailField) currentEmailField.value = user.email;
  }
  
  // Configure setting toggles
  function configureToggles(settings) {
    const toggles = {
      'public-profile-toggle': settings.public_profile,
      'location-sharing-toggle': settings.share_location,
      'applause-notifications': settings.applause_notif,
      'comment-notifications': settings.comments_notif,
      'friend-notifications': settings.friends_notif,
      'achievement-notifications': settings.achievements_notif,
      'email-notifications': settings.email_notif
    };
    
    Object.entries(toggles).forEach(([id, value]) => {
      const toggle = document.getElementById(id);
      if (toggle) {
        toggle.checked = value;
        toggle.addEventListener('change', function() {
          console.log(`Setting ${id} changed to:`, this.checked);
        });
      }
    });
  }
  
  // Show admin button
  function showAdminButton() {
    // Check if admin button already exists
    if (document.querySelector('.admin-access-btn')) return;
    
    // Create admin section
    const adminSection = document.createElement('section');
    adminSection.className = 'settings-section admin-section';
    adminSection.innerHTML = `
      <div class="section-header">
        <h3 class="section-title">
          <i class="fas fa-shield-alt"></i>
          Panel de Administración
        </h3>
      </div>
      
      <div class="settings-item clickable admin-access-btn">
        <div class="settings-item-content">
          <div class="settings-item-icon">
            <i class="fas fa-shield-alt"></i>
          </div>
          <div class="settings-item-info">
            <span class="settings-item-title">Acceder al Panel de Admin</span>
            <span class="settings-item-description">Gestionar usuarios, actividades y datos del sistema</span>
          </div>
        </div>
        <i class="fas fa-chevron-right"></i>
      </div>
    `;
    
    // Insert before the support section
    const supportSection = document.querySelector('.settings-section:has(.fas.fa-question-circle)');
    if (supportSection) {
      supportSection.parentNode.insertBefore(adminSection, supportSection);
    } else {
      // Fallback: append to settings container
      document.querySelector('.settings-container').appendChild(adminSection);
    }
    
    // Add click listener
    const adminBtn = adminSection.querySelector('.admin-access-btn');
    adminBtn.addEventListener('click', () => {
      window.location.href = '../admin/admin.html';
    });
  }
  
  // Handle email change
  async function handleEmailChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('email-password').value;
    const newEmail = document.getElementById('new-email').value;
    
    if (!currentPassword || !newEmail) {
      showMessage('Todos los campos son obligatorios', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}change_email.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          current_password: currentPassword,
          new_email: newEmail
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al cambiar el correo');
      }
      
      showMessage(data.message || 'Correo actualizado con éxito', 'success');
      emailModal.style.display = 'none';
      
      // Update email display
      currentUser.email = newEmail;
      updateUserDisplay(currentUser);
      
      // Clear form
      document.getElementById('email-form').reset();
        
    } catch (error) {
      console.error('Error:', error);
      showMessage(error.message, 'error');
    }
  }
  
  // Handle password change
  async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('Todos los campos son obligatorios', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showMessage('Las contraseñas no coinciden', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}change_password.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }
      
      showMessage(data.message || 'Contraseña actualizada con éxito', 'success');
      passwordModal.style.display = 'none';
      
      // Clear form
      document.getElementById('password-form').reset();
        
    } catch (error) {
      console.error('Error:', error);
      showMessage(error.message, 'error');
    }
  }
  
  // Handle logout
  async function handleLogout() {
    showConfirmation(
      'Cerrar sesión', 
      '¿Estás seguro de que quieres cerrar sesión?',
      async () => {
        try {
          const token = localStorage.getItem('auth_token');
          
          // Try to logout from server
          try {
            const response = await fetch('../../includes/auth/logout.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ token: token })
            });
            
            const data = await response.json();
            console.log('Logout response:', data);
          } catch (logoutError) {
            console.log('Server logout failed, continuing with local logout');
          }
          
          // Clear local storage and redirect
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '../home.html';
          
        } catch (error) {
          console.error('Logout error:', error);
          // Still clear local storage even if server logout failed
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '../home.html';
        }
      }
    );
  }
  
  // Close all modals
  function closeAllModals() {
    emailModal.style.display = 'none';
    passwordModal.style.display = 'none';
    confirmationModal.style.display = 'none';
  }
    
  // Show message
  function showMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.settings-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.className = `settings-message alert alert-${type}`;
    messageElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      word-wrap: break-word;
    `;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateX(100%)';
      setTimeout(() => messageElement.remove(), 300);
    }, 4000);
  }
  
  // Show confirmation
  function showConfirmation(title, message, callback) {
    const titleEl = document.getElementById('confirmation-title');
    const messageEl = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirm-action-btn');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    // Remove previous event listeners
    if (confirmBtn) {
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      
      newConfirmBtn.addEventListener('click', () => {
        callback();
        confirmationModal.style.display = 'none';
      });
    }
    
    confirmationModal.style.display = 'flex';
  }
});