document.addEventListener('DOMContentLoaded', function() {
  const API_BASE_URL = 'http://localhost:8000/src/includes/settings/';
  let currentSettings = {};
  
  // Elementos del DOM
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const emailModal = document.getElementById('email-modal');
  const passwordModal = document.getElementById('password-modal');
  const confirmationModal = document.getElementById('confirmation-modal');
  const openEmailBtn = document.getElementById('change-email-btn');
  const openPasswordBtn = document.getElementById('change-password-btn');
  const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  // Cargar configuraciones al iniciar
  loadSettings();
  
  // Event listeners
  darkModeToggle.addEventListener('change', toggleDarkMode);
  openEmailBtn.addEventListener('click', () => emailModal.style.display = 'flex');
  openPasswordBtn.addEventListener('click', () => passwordModal.style.display = 'flex');
  logoutBtn.addEventListener('click', handleLogout);
  
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      emailModal.style.display = 'none';
      passwordModal.style.display = 'none';
      confirmationModal.style.display = 'none';
    });
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === emailModal) emailModal.style.display = 'none';
    if (event.target === passwordModal) passwordModal.style.display = 'none';
    if (event.target === confirmationModal) confirmationModal.style.display = 'none';
  });
  
  // Formularios
  document.getElementById('email-form').addEventListener('submit', handleEmailChange);
  document.getElementById('password-form').addEventListener('submit', handlePasswordChange);
  
  // Configuración de toggles
  setupSettingToggles();
  
  // Función para cargar configuraciones
  async function loadSettings() {
    try {
      const response = await fetch(`${API_BASE_URL}get_settings.php`);
      
      if (!response.ok) {
        throw new Error('Error al cargar configuraciones');
      }
      
      const data = await response.json();
      currentSettings = data.settings;
      
      // Mostrar datos del usuario
      document.querySelector('.account-name').textContent = `${data.user.name} ${data.user.lastname}`;
      document.querySelector('.account-email').textContent = data.user.email;
      document.querySelector('.account-avatar img').src = data.user.avatar;
      
      // Configurar toggles
      document.getElementById('public-profile-toggle').checked = currentSettings.public_profile;
      document.getElementById('location-sharing-toggle').checked = currentSettings.share_location;
      document.getElementById('applause-notifications').checked = currentSettings.applause_notif;
      document.getElementById('comment-notifications').checked = currentSettings.comments_notif;
      document.getElementById('friend-notifications').checked = currentSettings.friends_notif;
      document.getElementById('achievement-notifications').checked = currentSettings.achievements_notif;
      document.getElementById('email-notifications').checked = currentSettings.email_notif;
      darkModeToggle.checked = currentSettings.dark_mode;
      
      if (currentSettings.dark_mode) {
        document.body.classList.add('dark-mode');
      }
        
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error al cargar configuraciones', 'error');
    }
  }
  
  // Función para manejar el modo oscuro
  function toggleDarkMode() {
    const isDarkMode = darkModeToggle.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    
    // Guardar en cookies
    document.cookie = `darkMode=${isDarkMode}; path=/; max-age=${60*60*24*30}`;
    
    // Actualizar en el servidor si es necesario
    updateSettings({ dark_mode: isDarkMode });
  }
  
  // Función para configurar los toggles de configuración
  function setupSettingToggles() {
    const settingToggles = [
      'public-profile-toggle',
      'location-sharing-toggle',
      'applause-notifications',
      'comment-notifications',
      'friend-notifications',
      'achievement-notifications',
      'email-notifications'
    ];
    
    settingToggles.forEach(id => {
      document.getElementById(id).addEventListener('change', function() {
        const settingName = id.replace('-toggle', '').replace('-notifications', '_notif').replace(/-/g, '_');
        updateSettings({ [settingName]: this.checked });
      });
    });
  }
  
  // Función para actualizar configuraciones en el servidor
  async function updateSettings(settings) {
    try {
      const response = await fetch(`${API_BASE_URL}update_settings.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar configuraciones');
      }
      
      // Actualizar configuraciones locales
      currentSettings = { ...currentSettings, ...settings };
        
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error al guardar configuraciones', 'error');
    }
  }
  
  // Función para manejar cambio de email
  async function handleEmailChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('email-password').value;
    const newEmail = document.getElementById('new-email').value;
    
    try {
      const response = await fetch(`${API_BASE_URL}change_email.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_email: newEmail
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar el correo');
      }
      
      showMessage(data.message || 'Correo actualizado con éxito', 'success');
      emailModal.style.display = 'none';
      
      // Actualizar email mostrado
      document.querySelector('.account-email').textContent = newEmail;
        
    } catch (error) {
      console.error('Error:', error);
      showMessage(error.message, 'error');
    }
  }
  
  // Función para manejar cambio de contraseña
  async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
      showMessage('Las contraseñas no coinciden', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}change_password.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }
      
      showMessage(data.message || 'Contraseña actualizada con éxito', 'success');
      passwordModal.style.display = 'none';
        
    } catch (error) {
      console.error('Error:', error);
      showMessage(error.message, 'error');
    }
  }
  
  // Función para manejar logout
  async function handleLogout() {
    showConfirmation(
      'Cerrar sesión', 
      '¿Estás seguro de que quieres cerrar sesión?',
      async () => {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          const response = await fetch('../../../includes/auth/logout.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token: token })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          if (data.success) {
            // Clear local storage and redirect
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '../../modules/home.html';
          } else {
            throw new Error(data.message || 'Logout failed');
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Still clear local storage even if server logout failed
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '../../modules/home.html';
        }
      }
    );
  }
    
  // Función para mostrar mensajes
  function showMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type}`;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }
  
  // Función para mostrar confirmación
  function showConfirmation(title, message, callback) {
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    
    const confirmBtn = document.getElementById('confirm-action-btn');
    
    // Remover eventos anteriores
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    
    document.getElementById('confirm-action-btn').addEventListener('click', () => {
      callback();
      confirmationModal.style.display = 'none';
    });
    
    confirmationModal.style.display = 'flex';
  }
});