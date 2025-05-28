document.addEventListener('DOMContentLoaded', function() {
  console.log('Post script loaded');
  
  const API_BASE_URL = 'http://localhost:8000/src/includes/post/';
  let uploadedImages = [];
  let gpxFile = null;
  let selectedCompanions = [];
  
  // Elementos del DOM
  const companionSearch = document.getElementById('companion-search');
  const companionResults = document.getElementById('companion-results');
  const gpxInput = document.getElementById('activity-gpx');
  const imagesInput = document.getElementById('activity-images');
  const form = document.getElementById('activity-form');
  const successModal = document.getElementById('success-modal');
  
  // Event listeners
  if (companionSearch) companionSearch.addEventListener('input', searchFriends);
  if (gpxInput) gpxInput.addEventListener('change', handleGpxUpload);
  if (imagesInput) imagesInput.addEventListener('change', handleImageUpload);
  if (form) form.addEventListener('submit', handleFormSubmit);
  
  const closeSuccessBtn = document.getElementById('close-success-modal');
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
      if (successModal) successModal.style.display = 'none';
      window.location.href = '../../../modules/social/feed.html';
    });
  }
  
  // Buscar amigos
  async function searchFriends() {
    const searchTerm = this.value.trim();
    console.log('Searching friends with term:', searchTerm);
    
    if (searchTerm.length < 2) {
      if (companionResults) companionResults.style.display = 'none';
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}search_friends.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          query: searchTerm
        })
      });
      
      console.log('Search friends response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Friends search result:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to search friends');
      }
      
      const friends = data.friends || [];
      
      if (companionResults) {
        if (friends.length === 0) {
          companionResults.innerHTML = '<div class="no-results">No se encontraron amigos</div>';
          companionResults.style.display = 'block';
          return;
        }
        
        companionResults.innerHTML = friends.map(friend => `
          <div class="companion-result" data-user-id="${friend.id}">
            <img src="${friend.imagen_perfil || '../../../public/profiles/default-avatar.jpg'}" 
                 alt="${friend.nombre}" class="companion-avatar">
            <div class="companion-info">
              <span class="companion-name">${friend.nombre} ${friend.apellidos}</span>
              <span class="companion-username">@${friend.username}</span>
            </div>
            <button type="button" class="add-companion-btn">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        `).join('');
        
        companionResults.style.display = 'block';
      }
        
    } catch (error) {
      console.error('Error searching friends:', error);
      if (companionResults) {
        companionResults.innerHTML = '<div class="error">Error al buscar amigos</div>';
        companionResults.style.display = 'block';
      }
    }
  }
  
  // Manejar selección de compañeros
  document.addEventListener('click', function(e) {
    if (e.target.closest('.add-companion-btn')) {
      const result = e.target.closest('.companion-result');
      const userId = result.getAttribute('data-user-id');
      const userName = result.querySelector('.companion-name').textContent;
      const userAvatar = result.querySelector('img').src;
      
      addCompanion(userId, userName, userAvatar);
      
      // Limpiar búsqueda
      if (companionSearch) companionSearch.value = '';
      if (companionResults) companionResults.style.display = 'none';
    }
    
    if (e.target.closest('.remove-companion')) {
      const companion = e.target.closest('.selected-companion');
      const userId = companion.getAttribute('data-user-id');
      selectedCompanions = selectedCompanions.filter(c => c.id !== userId);
      companion.remove();
    }
    
    if (e.target.closest('.remove-image')) {
      const imagePreview = e.target.closest('.image-preview');
      const imageIndex = imagePreview.getAttribute('data-index');
      uploadedImages.splice(imageIndex, 1);
      imagePreview.remove();
      updateImagePreviews();
    }
  });
  
  // Añadir compañero
  function addCompanion(id, name, avatar) {
    const container = document.getElementById('selected-companions');
    if (!container) return;
    
    // Verificar si ya está añadido
    if (selectedCompanions.find(c => c.id === id)) {
      return;
    }
    
    selectedCompanions.push({ id: id, name: name, avatar: avatar });
    
    const companion = document.createElement('div');
    companion.className = 'selected-companion';
    companion.setAttribute('data-user-id', id);
    companion.innerHTML = `
      <img src="${avatar}" alt="${name}" class="companion-avatar">
      <span>${name}</span>
      <span class="remove-companion"><i class="fas fa-times"></i></span>
    `;
    container.appendChild(companion);
  }
  
  // Manejar subida de GPX
  async function handleGpxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('Uploading GPX file:', file.name);
    
    const fileInfo = document.getElementById('gpx-file-info');
    if (fileInfo) fileInfo.textContent = `Procesando ${file.name}...`;
    
    // For now, just store the file for later upload
    gpxFile = file;
    
    if (fileInfo) fileInfo.textContent = `Archivo seleccionado: ${file.name}`;
    
    console.log('GPX file selected successfully');
  }
  
  // Manejar subida de imágenes
  function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    console.log('Processing', files.length, 'image files');
    
    uploadedImages = [];
    
    // Process files for preview
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.match('image.*')) continue;
      
      uploadedImages.push(file);
    }
    
    updateImagePreviews();
    console.log('Images processed for preview:', uploadedImages.length);
  }
  
  function updateImagePreviews() {
    const previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    uploadedImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.setAttribute('data-index', index);
        preview.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <div class="remove-image"><i class="fas fa-times"></i></div>
        `;
        previewContainer.appendChild(preview);
      };
      reader.readAsDataURL(file);
    });
  }
  
  // Manejar envío del formulario
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('Submitting activity form');
    
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('token', token);
      formData.append('titulo', document.getElementById('activity-title')?.value || '');
      formData.append('tipo_actividad_id', document.getElementById('activity-type')?.value || '');
      
      const activityDate = document.getElementById('activity-date')?.value;
      if (activityDate) {
        formData.append('fecha_actividad', activityDate);
      }
      
      const description = document.getElementById('activity-description')?.value;
      if (description) {
        formData.append('descripcion', description);
      }
      
      // Add optional stats
      const distance = document.getElementById('distance')?.value;
      const duration = document.getElementById('duration')?.value;
      const elevation = document.getElementById('elevation')?.value;
      
      if (distance) formData.append('distancia', distance);
      if (duration) formData.append('duracion', duration);
      if (elevation) formData.append('elevacion', elevation);
      
      // Add GPX file
      if (gpxFile) {
        formData.append('gpx_file', gpxFile);
        console.log('Adding GPX file to form data');
      }
      
      // Add images
      uploadedImages.forEach((file, index) => {
        formData.append('images[]', file);
      });
      console.log('Adding', uploadedImages.length, 'images to form data');
      
      // Add companions
      if (selectedCompanions.length > 0) {
        formData.append('companions', JSON.stringify(selectedCompanions));
        console.log('Adding companions:', selectedCompanions);
      }
      
      console.log('Sending request to create activity...');
      
      const response = await fetch(`${API_BASE_URL}create_activity.php`, {
        method: 'POST',
        body: formData
      });
      
      console.log('Create activity response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Create activity response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create activity');
      }
      
      console.log('Activity created successfully');
      
      // Show success modal
      if (successModal) {
        successModal.style.display = 'flex';
      } else {
        // Fallback: redirect directly
        showMessage('Actividad publicada correctamente', 'success');
        setTimeout(() => {
          window.location.href = '../social/feed.html';
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error creating activity:', error);
      showMessage('Error al publicar la actividad: ' + error.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-share"></i> Publicar actividad';
      }
    }
  }
  
  // Show message function
  function showMessage(message, type) {
    console.log(`Message (${type}):`, message);
    
    // Remove existing message
    const existingMessage = document.querySelector('.post-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageContainer = document.createElement('div');
    messageContainer.className = `post-message alert alert-${type}`;
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