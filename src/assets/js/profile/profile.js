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
  settingsBtn.addEventListener('click', openSettingsModal);
  closeModal.addEventListener('click', closeSettingsModal);
  cancelBtn.addEventListener('click', closeSettingsModal);
  window.addEventListener('click', outsideModalClick);
  settingsForm.addEventListener('submit', saveProfileChanges);
  uploadBtn.addEventListener('click', () => avatarUpload.click());
  avatarUpload.addEventListener('change', handleAvatarUpload);
  removeAvatarBtn.addEventListener('click', removeAvatar);

  // Función para cargar datos del perfil
  async function loadProfileData() {
    try {
      const response = await fetch(`${API_BASE_URL}get_profile.php`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el perfil');
      }
      
      const data = await response.json();
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
      showMessage('Error al cargar el perfil', 'error');
    }
  }

  // Mostrar estadísticas del perfil
  function displayProfileStats(stats) {
    document.getElementById('total-activities').textContent = stats.total_actividades || '0';
    document.getElementById('total-friends').textContent = stats.total_amigos || '0';
    document.getElementById('total-aplausos').textContent = stats.total_aplausos || '0';
  }

  // Mostrar actividades recientes
  function displayRecentActivities(activities) {
    const activitiesList = document.getElementById('activities-list');
    activitiesList.innerHTML = '';
    
    activities.forEach(activity => {
      const activityCard = document.createElement('div');
      activityCard.className = 'activity-card';
      
      // Determinar el icono según el tipo de actividad
      let activityIcon = 'fa-running'; // Por defecto
      if (activity.tipo_actividad.includes('Ciclismo')) activityIcon = 'fa-bicycle';
      if (activity.tipo_actividad.includes('Senderismo')) activityIcon = 'fa-hiking';
      
      activityCard.innerHTML = `
        <div class="activity-header">
          <div class="activity-type ${activity.tipo_actividad.toLowerCase().replace(' ', '-')}">
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
      countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = country.nombre;
        countrySelect.appendChild(option);
      });
      
      // Configurar eventos para selects dependientes
      countrySelect.addEventListener('change', updateProvinces);
      document.getElementById('settings-province').addEventListener('change', updateCities);
      
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    }
  }

  function updateProvinces() {
    const countryId = this.value;
    const provinceSelect = document.getElementById('settings-province');
    
    // Limpiar y deshabilitar si no hay selección
    provinceSelect.innerHTML = '<option value="">Selecciona una provincia</option>';
    provinceSelect.disabled = !countryId;
    
    if (countryId) {
      // Filtrar provincias por país
      const filteredProvinces = provinces.filter(p => p.pais_id === countryId);
      
      // Llenar provincias
      filteredProvinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.id;
        option.textContent = province.nombre;
        provinceSelect.appendChild(option);
      });
      
      // Seleccionar la provincia del usuario si corresponde
      if (currentUserData && currentUserData.province && 
          filteredProvinces.some(p => p.id === currentUserData.province)) {
        provinceSelect.value = currentUserData.province;
        updateCities.call(provinceSelect);
      }
    }
    
    // Limpiar ciudades
    document.getElementById('settings-city').innerHTML = '<option value="">Selecciona una localidad</option>';
    document.getElementById('settings-city').disabled = true;
  }

  function updateCities() {
    const provinceId = this.value;
    const citySelect = document.getElementById('settings-city');
    
    // Limpiar y deshabilitar si no hay selección
    citySelect.innerHTML = '<option value="">Selecciona una localidad</option>';
    citySelect.disabled = !provinceId;
    
    if (provinceId) {
      // Filtrar ciudades por provincia
      const filteredCities = cities.filter(c => c.provincia_id === provinceId);
      
      // Llenar ciudades
      filteredCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.nombre;
        citySelect.appendChild(option);
      });
      
      // Seleccionar la ciudad del usuario si corresponde
      if (currentUserData && currentUserData.city && 
          filteredCities.some(c => c.id === currentUserData.city)) {
        citySelect.value = currentUserData.city;
      }
    }
  }

  // Mostrar datos en el perfil
  function displayProfileData() {
    if (!currentUserData) return;
    
    // Datos principales
    document.getElementById('profile-name').textContent = `${currentUserData.name} ${currentUserData.lastname}`;
    document.getElementById('profile-username').textContent = `@${currentUserData.username}`;
    document.getElementById('profile-avatar').src = currentUserData.avatar_url;
    
    // Información personal
    document.getElementById('profile-email').textContent = currentUserData.email;
    document.getElementById('profile-birthdate').textContent = formatDate(currentUserData.birthdate);
    document.getElementById('profile-location').textContent = currentUserData.location;
    document.getElementById('profile-activity').textContent = currentUserData.activity;
    document.getElementById('profile-join-date').textContent = currentUserData.join_date;
    
    // Datos para el formulario de edición
    document.getElementById('settings-name').value = currentUserData.name;
    document.getElementById('settings-lastname').value = currentUserData.lastname;
    document.getElementById('settings-username').value = currentUserData.username;
    document.getElementById('settings-birthdate').value = currentUserData.birthdate;
    
    // Ubicación (se manejará en los selects dependientes)
    const countrySelect = document.getElementById('settings-country');
    if (countrySelect) {
      countrySelect.value = currentUserData.country || '';
      updateProvinces.call(countrySelect);
    }
    
    // Actividad preferida
    const activitySelect = document.getElementById('settings-activity');
    if (activitySelect) {
      activitySelect.value = currentUserData.activity_id || '';
    }
    
    // Avatar
    avatarPreview.src = currentUserData.avatar_url;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Resto del código (handleAvatarUpload, removeAvatar, saveProfileChanges, etc.)
  // ... (mantener las mismas funciones del código original que no requieren cambios)
  
  // Funciones para el modal
  function openSettingsModal() {
    settingsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeSettingsModal() {
    settingsModal.style.display = 'none';
    document.body.style.overflow = '';
    
    // Restaurar valores originales si se canceló
    if (originalUserData) {
      currentUserData = {...originalUserData};
      displayProfileData();
    }
  }

  function outsideModalClick(e) {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  }

  // Mostrar mensajes
  function showMessage(message, type) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message ${type}`;
    messageContainer.textContent = message;
    
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    settingsForm.prepend(messageContainer);
    
    setTimeout(() => {
      messageContainer.classList.add('fade-out');
      setTimeout(() => messageContainer.remove(), 500);
    }, 3000);
  }
});