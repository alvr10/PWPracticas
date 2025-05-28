document.addEventListener('DOMContentLoaded', function() {
  console.log('Profile script loaded');

  const API_BASE_URL = 'http://localhost:8000/src/includes/profile/';
  
  // Elementos del DOM
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeModal = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveBtn = document.getElementById('save-btn');
  const settingsForm = document.getElementById('profile-settings-form');
  const uploadBtn = document.getElementById('upload-btn');
  const avatarUpload = document.getElementById('avatar-upload');
  const avatarPreview = document.getElementById('avatar-preview');
  const removeAvatarBtn = document.getElementById('remove-avatar-btn');
  
  // Variables de estado
  let currentUserData = null;
  let originalUserData = null;
  let countries = [];
  let provinces = [];
  let cities = [];

  // Cargar datos del perfil
  loadProfileData();
  
  // Event listeners
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
  if (closeModal) closeModal.addEventListener('click', closeSettingsModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSettingsModal);
  if (settingsForm) settingsForm.addEventListener('submit', saveProfileChanges);
  if (uploadBtn) uploadBtn.addEventListener('click', () => avatarUpload?.click());
  if (avatarUpload) avatarUpload.addEventListener('change', handleAvatarUpload);
  if (removeAvatarBtn) removeAvatarBtn.addEventListener('click', removeAvatar);
  
  window.addEventListener('click', outsideModalClick);

  // Función para cargar datos del perfil
  async function loadProfileData() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}get_profile.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: token })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load profile');
      }
      
      currentUserData = data.user;
      originalUserData = {...currentUserData};
      
      // Cargar selects de ubicación
      await loadLocationData();
      
      // Mostrar datos en el perfil
      displayProfileData();
      displayProfileStats(data.stats);
      displayRecentActivities(data.activities);
      
    } catch (error) {
      console.error('Error cargando perfil:', error);
      showMessage('Error al cargar el perfil: ' + error.message, 'error');
      
      // If authentication error, redirect to login
      if (error.message.includes('token') || error.message.includes('auth')) {
        setTimeout(() => {
          window.location.href = '../../auth/login.html';
        }, 2000);
      }
    }
  }

  // Mostrar estadísticas del perfil
  function displayProfileStats(stats) {
    const totalActivitiesEl = document.getElementById('total-activities');
    const totalDistanceEl = document.getElementById('total-distance');
    const totalFriendsEl = document.getElementById('total-friends');
    const totalAplausosEl = document.getElementById('total-aplausos');

    if (totalActivitiesEl) totalActivitiesEl.textContent = stats.total_actividades || '0';
    if (totalDistanceEl) totalDistanceEl.textContent = stats.total_distancia || '0';
    if (totalFriendsEl) totalFriendsEl.textContent = stats.total_amigos || '0';
    if (totalAplausosEl) totalAplausosEl.textContent = stats.total_aplausos || '0';
  }

  // Mostrar actividades recientes
  function displayRecentActivities(activities) {
    const activitiesList = document.getElementById('activities-list');
    if (!activitiesList) return;
    
    // Clear existing content except load more button
    const loadMoreBtn = activitiesList.querySelector('.load-more-activities');
    activitiesList.innerHTML = '';
    
    activities.forEach(activity => {
      const activityCard = document.createElement('div');
      activityCard.className = 'activity-card';
      
      // Determinar el icono según el tipo de actividad
      let activityIcon = 'fa-running'; // Por defecto
      let activityClass = 'running';
      
      if (activity.tipo_actividad.toLowerCase().includes('ciclismo')) {
        activityIcon = 'fa-bicycle';
        activityClass = 'cycling';
      } else if (activity.tipo_actividad.toLowerCase().includes('senderismo')) {
        activityIcon = 'fa-hiking';
        activityClass = 'hiking';
      }
      
      activityCard.innerHTML = `
        <div class="activity-header">
          <div class="activity-type ${activityClass}">
            <i class="fas ${activityIcon}"></i>
          </div>
          <div class="activity-info">
            <h4 class="activity-title">${activity.titulo}</h4>
            <div class="activity-date">${activity.fecha_formatted}</div>
          </div>
        </div>
        <div class="activity-actions">
          <span class="activity-applause">
            <i class="fas fa-thumbs-up"></i> ${activity.aplausos} aplausos
          </span>
        </div>
      `;
      
      activitiesList.appendChild(activityCard);
    });

    // Re-add load more button if it existed
    if (loadMoreBtn) {
      activitiesList.appendChild(loadMoreBtn);
    }
  }

  // Cargar datos de ubicación
  async function loadLocationData() {
    try {
      const response = await fetch(`${API_BASE_URL}get_locations.php`);
      
      if (!response.ok) {
        throw new Error('Error al cargar ubicaciones');
      }
      
      const data = await response.json();
      countries = data.countries;
      provinces = data.provinces;
      cities = data.cities;
      
      // Llenar países
      const countrySelect = document.getElementById('settings-country');
      if (countrySelect) {
        countries.forEach(country => {
          const option = document.createElement('option');
          option.value = country.id;
          option.textContent = country.nombre;
          countrySelect.appendChild(option);
        });
        
        // Configurar eventos para selects dependientes
        countrySelect.addEventListener('change', updateProvinces);
      }

      const provinceSelect = document.getElementById('settings-province');
      if (provinceSelect) {
        provinceSelect.addEventListener('change', updateCities);
      }
      
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    }
  }

  function updateProvinces() {
    const countryId = parseInt(this.value);
    const provinceSelect = document.getElementById('settings-province');
    const citySelect = document.getElementById('settings-city');
    
    if (!provinceSelect || !citySelect) return;
    
    // Limpiar y deshabilitar si no hay selección
    provinceSelect.innerHTML = '<option value="">Selecciona una provincia</option>';
    provinceSelect.disabled = !countryId;
    
    citySelect.innerHTML = '<option value="">Selecciona una localidad</option>';
    citySelect.disabled = true;
    
    if (countryId) {
      // Filtrar provincias por país
      const filteredProvinces = provinces.filter(p => parseInt(p.pais_id) === countryId);
      
      // Llenar provincias
      filteredProvinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.id;
        option.textContent = province.nombre;
        provinceSelect.appendChild(option);
      });
      
      // Seleccionar la provincia del usuario si corresponde
      if (currentUserData && currentUserData.province && 
          filteredProvinces.some(p => parseInt(p.id) === parseInt(currentUserData.province))) {
        provinceSelect.value = currentUserData.province;
        updateCities.call(provinceSelect);
      }
    }
  }

  function updateCities() {
    const provinceId = parseInt(this.value);
    const citySelect = document.getElementById('settings-city');
    
    if (!citySelect) return;
    
    // Limpiar y deshabilitar si no hay selección
    citySelect.innerHTML = '<option value="">Selecciona una localidad</option>';
    citySelect.disabled = !provinceId;
    
    if (provinceId) {
      // Filtrar ciudades por provincia
      const filteredCities = cities.filter(c => parseInt(c.provincia_id) === provinceId);
      
      // Llenar ciudades
      filteredCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.nombre;
        citySelect.appendChild(option);
      });
      
      // Seleccionar la ciudad del usuario si corresponde
      if (currentUserData && currentUserData.city && 
          filteredCities.some(c => parseInt(c.id) === parseInt(currentUserData.city))) {
        citySelect.value = currentUserData.city;
      }
    }
  }

  // Mostrar datos en el perfil
  function displayProfileData() {
    if (!currentUserData) return;
    
    // Datos principales
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileAvatar = document.getElementById('profile-avatar');
    
    if (profileName) profileName.textContent = `${currentUserData.name} ${currentUserData.lastname}`;
    if (profileUsername) profileUsername.textContent = `@${currentUserData.username}`;
    if (profileAvatar) profileAvatar.src = currentUserData.avatar_url;
    
    // Información personal
    const profileEmail = document.getElementById('profile-email');
    const profileBirthdate = document.getElementById('profile-birthdate');
    const profileLocation = document.getElementById('profile-location');
    const profileActivity = document.getElementById('profile-activity');
    const profileJoinDate = document.getElementById('profile-join-date');
    
    if (profileEmail) profileEmail.textContent = currentUserData.email;
    if (profileBirthdate) profileBirthdate.textContent = formatDate(currentUserData.birthdate);
    if (profileLocation) profileLocation.textContent = currentUserData.location;
    if (profileActivity) profileActivity.textContent = currentUserData.activity;
    if (profileJoinDate) profileJoinDate.textContent = currentUserData.join_date;
    
    // Datos para el formulario de edición
    const settingsName = document.getElementById('settings-name');
    const settingsLastname = document.getElementById('settings-lastname');
    const settingsUsername = document.getElementById('settings-username');
    const settingsBirthdate = document.getElementById('settings-birthdate');
    
    if (settingsName) settingsName.value = currentUserData.name;
    if (settingsLastname) settingsLastname.value = currentUserData.lastname;
    if (settingsUsername) settingsUsername.value = currentUserData.username;
    if (settingsBirthdate) settingsBirthdate.value = currentUserData.birthdate;
    
    // Ubicación
    const countrySelect = document.getElementById('settings-country');
    if (countrySelect && currentUserData.country) {
      countrySelect.value = currentUserData.country;
      updateProvinces.call(countrySelect);
    }
    
    // Actividad preferida
    const activitySelect = document.getElementById('settings-activity');
    if (activitySelect && currentUserData.activity_id) {
      activitySelect.value = currentUserData.activity_id;
    }
    
    // Avatar
    if (avatarPreview) avatarPreview.src = currentUserData.avatar_url;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Guardar cambios del perfil
  async function saveProfileChanges(e) {
    e.preventDefault();
    
    if (!saveBtn) return;
    
    const saveBtnText = document.getElementById('save-btn-text');
    const saveBtnLoader = document.getElementById('save-btn-loader');
    
    // Show loading state
    saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.style.display = 'none';
    if (saveBtnLoader) saveBtnLoader.style.display = 'inline-block';
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get form data
      const formData = {
        token: token,
        name: document.getElementById('settings-name')?.value,
        lastname: document.getElementById('settings-lastname')?.value,
        username: document.getElementById('settings-username')?.value,
        birthdate: document.getElementById('settings-birthdate')?.value,
        country: document.getElementById('settings-country')?.value,
        province: document.getElementById('settings-province')?.value,
        city: document.getElementById('settings-city')?.value,
        activity: document.getElementById('settings-activity')?.value
      };

      const response = await fetch(`${API_BASE_URL}update_profile.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      showMessage('Perfil actualizado correctamente', 'success');
      
      // Update local data and close modal
      currentUserData = {...currentUserData, ...formData};
      originalUserData = {...currentUserData};
      
      setTimeout(() => {
        closeSettingsModal();
        loadProfileData(); // Reload to get fresh data
      }, 1000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('Error al guardar los cambios: ' + error.message, 'error');
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      if (saveBtnText) saveBtnText.style.display = 'inline';
      if (saveBtnLoader) saveBtnLoader.style.display = 'none';
    }
  }

  // Handle avatar upload - UPDATED TO ACTUALLY UPLOAD
  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('Avatar upload started:', file.name);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('Tipo de archivo no válido. Solo se permiten JPEG, PNG, GIF y WebP.', 'error');
      return;
    }
    
    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      showMessage('El archivo es demasiado grande. Tamaño máximo: 2MB.', 'error');
      return;
    }
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = function(e) {
      if (avatarPreview) {
        avatarPreview.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
    
    // Disable upload button and show loading
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('token', token);
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}update_avatar.php`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to upload avatar');
      }
      
      // Update current user data with new avatar URL
      if (currentUserData) {
        currentUserData.avatar_url = data.avatar_url;
      }
      
      // Update main profile avatar
      const mainProfileAvatar = document.getElementById('profile-avatar');
      if (mainProfileAvatar) {
        mainProfileAvatar.src = data.avatar_url;
      }
      
      showMessage('Avatar actualizado correctamente', 'success');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showMessage('Error al subir el avatar: ' + error.message, 'error');
      
      // Restore original avatar on error
      if (currentUserData && avatarPreview) {
        avatarPreview.src = currentUserData.avatar_url;
      }
    } finally {
      // Reset upload button
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Subir imagen';
      }
    }
  }

  // Remove avatar - UPDATED TO RESET TO DEFAULT
  async function removeAvatar() {
    if (!confirm('¿Estás seguro de que quieres eliminar tu avatar?')) {
      return;
    }
    
    const defaultAvatar = '../../../public/profiles/default-avatar.jpg';
    
    // Update preview immediately
    if (avatarPreview) {
      avatarPreview.src = defaultAvatar;
    }
    
    // Update main profile avatar
    const mainProfileAvatar = document.getElementById('profile-avatar');
    if (mainProfileAvatar) {
      mainProfileAvatar.src = defaultAvatar;
    }
    
    // Clear file input
    if (avatarUpload) {
      avatarUpload.value = '';
    }
    
    // Update current user data
    if (currentUserData) {
      currentUserData.avatar_url = defaultAvatar;
    }
    
    showMessage('Avatar restablecido al predeterminado', 'success');
    
    // Note: You might want to implement a server endpoint to actually remove 
    // the avatar from the database and delete the file
  }
  
  // Funciones para el modal
  function openSettingsModal() {
    if (settingsModal) {
      settingsModal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.style.display = 'none';
      document.body.style.overflow = '';
      
      // Restaurar valores originales si se canceló
      if (originalUserData) {
        currentUserData = {...originalUserData};
        displayProfileData();
      }
    }
  }

  function outsideModalClick(e) {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  }

  // Mostrar mensajes
  function showMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.profile-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageContainer = document.createElement('div');
    messageContainer.className = `profile-message alert alert-${type}`;
    messageContainer.style.cssText = `
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
    messageContainer.textContent = message;
    
    document.body.appendChild(messageContainer);
    
    setTimeout(() => {
      messageContainer.style.opacity = '0';
      messageContainer.style.transform = 'translateX(100%)';
      setTimeout(() => messageContainer.remove(), 300);
    }, 4000);
  }
});