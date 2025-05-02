document.addEventListener('DOMContentLoaded', function() {
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
      // Simulación de datos del servidor
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      
      // En producción, usaríamos:
      // const response = await fetch('/api/user/profile');
      // currentUserData = await response.json();
      
      // Datos de ejemplo
      currentUserData = {
        id: 1,
        username: 'runner123',
        email: 'correo@ejemplo.com',
        name: 'María',
        lastname: 'González Pérez',
        birthdate: '1992-05-15',
        country: '1', // España
        province: '1', // Madrid
        city: '1', // Madrid
        activity: '4', // Carrera
        profilePublic: true,
        showEmail: false,
        activityNotifications: true,
        avatarUrl: '../assets/images/default-avatar.jpg'
      };
      
      originalUserData = {...currentUserData};
      
      // Cargar selects de ubicación
      loadLocationData();
      
      // Mostrar datos en el perfil
      displayProfileData();
      
    } catch (error) {
      console.error('Error cargando perfil:', error);
      showMessage('Error al cargar el perfil', 'error');
    }
  }

  // Cargar datos de ubicación
  async function loadLocationData() {
    // Simulación de datos de ubicación
    countries = [
      {id: '1', name: 'España'},
      {id: '2', name: 'Portugal'},
      {id: '3', name: 'Francia'}
    ];
    
    provinces = [
      {id: '1', name: 'Madrid', country_id: '1'},
      {id: '2', name: 'Barcelona', country_id: '1'},
      {id: '3', name: 'Lisboa', country_id: '2'}
    ];
    
    cities = [
      {id: '1', name: 'Madrid', province_id: '1'},
      {id: '2', name: 'Alcalá de Henares', province_id: '1'},
      {id: '3', name: 'Barcelona', province_id: '2'}
    ];
    
    // Llenar países
    const countrySelect = document.getElementById('settings-country');
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.id;
      option.textContent = country.name;
      countrySelect.appendChild(option);
    });
    
    // Configurar eventos para selects dependientes
    countrySelect.addEventListener('change', updateProvinces);
    document.getElementById('settings-province').addEventListener('change', updateCities);
  }

  function updateProvinces() {
    const countryId = this.value;
    const provinceSelect = document.getElementById('settings-province');
    
    // Limpiar y deshabilitar si no hay selección
    provinceSelect.innerHTML = '<option value="">Selecciona una provincia</option>';
    provinceSelect.disabled = !countryId;
    
    if (countryId) {
      // Filtrar provincias por país
      const filteredProvinces = provinces.filter(p => p.country_id === countryId);
      
      // Llenar provincias
      filteredProvinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.id;
        option.textContent = province.name;
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
      const filteredCities = cities.filter(c => c.province_id === provinceId);
      
      // Llenar ciudades
      filteredCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.name;
        citySelect.appendChild(option);
      });
      
      // Seleccionar la ciudad del usuario si corresponde
      if (currentUserData && currentUserData.city && 
          filteredCities.some(c => c.id === currentUserData.city)) {
        citySelect.value = currentUserData.city;
      }
    }
  }

  // Mostrar datos en el formulario
  function displayProfileData() {
    if (!currentUserData) return;
    
    document.getElementById('settings-name').value = currentUserData.name;
    document.getElementById('settings-lastname').value = currentUserData.lastname;
    document.getElementById('settings-username').value = currentUserData.username;
    document.getElementById('settings-birthdate').value = currentUserData.birthdate;
    
    // Ubicación
    const countrySelect = document.getElementById('settings-country');
    countrySelect.value = currentUserData.country || '';
    updateProvinces.call(countrySelect);
    
    // Actividad
    document.getElementById('settings-activity').value = currentUserData.activity || '';
    
    // Configuración de privacidad
    document.getElementById('settings-profile-public').checked = currentUserData.profilePublic || false;
    document.getElementById('settings-show-email').checked = currentUserData.showEmail || false;
    document.getElementById('settings-activity-notifications').checked = currentUserData.activityNotifications || true;
    
    // Avatar
    avatarPreview.src = currentUserData.avatarUrl;
  }

  // Subir imagen de avatar
  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      showMessage('Por favor, selecciona un archivo de imagen', 'error');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB
      showMessage('La imagen no debe superar los 2MB', 'error');
      return;
    }
    
    // Previsualización
    const reader = new FileReader();
    reader.onload = function(event) {
      avatarPreview.src = event.target.result;
      // En una implementación real, aquí podrías subir la imagen al servidor
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    avatarPreview.src = '../assets/images/default-avatar.jpg';
    // En una implementación real, enviarías una petición para eliminar el avatar
  }

  // Guardar cambios
  async function saveProfileChanges(e) {
    e.preventDefault();
    
    // Validación básica
    const name = document.getElementById('settings-name').value.trim();
    const lastname = document.getElementById('settings-lastname').value.trim();
    const username = document.getElementById('settings-username').value.trim();
    
    if (!name || !lastname || !username) {
      showMessage('Por favor, completa todos los campos obligatorios', 'error');
      return;
    }
    
    // Mostrar loader
    saveBtn.disabled = true;
    document.getElementById('save-btn-text').style.display = 'none';
    document.getElementById('save-btn-loader').style.display = 'block';
    
    try {
      // Recoger datos del formulario
      const formData = {
        name,
        lastname,
        username,
        birthdate: document.getElementById('settings-birthdate').value,
        country: document.getElementById('settings-country').value,
        province: document.getElementById('settings-province').value,
        city: document.getElementById('settings-city').value,
        activity: document.getElementById('settings-activity').value,
        profilePublic: document.getElementById('settings-profile-public').checked,
        showEmail: document.getElementById('settings-show-email').checked,
        activityNotifications: document.getElementById('settings-activity-notifications').checked,
        avatar: avatarPreview.src !== '../assets/images/default-avatar.jpg' ? avatarPreview.src : null
      };
      
      // Simular envío al servidor
      console.log('Datos a enviar:', formData);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simular retardo de red
      
      // Actualizar datos locales
      currentUserData = {...currentUserData, ...formData};
      
      showMessage('Perfil actualizado correctamente', 'success');
      closeSettingsModal();
      
      // Actualizar la vista del perfil
      updateProfileView();
      
    } catch (error) {
      console.error('Error guardando perfil:', error);
      showMessage('Error al guardar los cambios', 'error');
    } finally {
      // Ocultar loader
      saveBtn.disabled = false;
      document.getElementById('save-btn-text').style.display = 'block';
      document.getElementById('save-btn-loader').style.display = 'none';
    }
  }

  function updateProfileView() {
    if (!currentUserData) return;
    
    // Actualizar datos visibles en el perfil
    document.getElementById('profile-name').textContent = `${currentUserData.name} ${currentUserData.lastname}`;
    document.getElementById('profile-username').textContent = `@${currentUserData.username}`;
    document.getElementById('profile-avatar').src = currentUserData.avatarUrl || '../assets/images/default-avatar.jpg';
    
    // Actualizar otros campos según sea necesario
  }

  // Funciones para el modal
  function openSettingsModal() {
    //if (!currentUserData) return;
    
    settingsModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevenir scroll del fondo
  }

  function closeSettingsModal() {
    settingsModal.style.display = 'none';
    document.body.style.overflow = ''; // Restaurar scroll
    
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