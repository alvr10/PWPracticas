document.addEventListener('DOMContentLoaded', function() {
  const API_BASE_URL = 'http://localhost:8000/src/includes/post/';
  let uploadedImages = [];
  let gpxFile = null;
  
  // Elementos del DOM
  const companionSearch = document.getElementById('companion-search');
  const companionResults = document.getElementById('companion-results');
  const gpxInput = document.getElementById('activity-gpx');
  const imagesInput = document.getElementById('activity-images');
  const form = document.getElementById('activity-form');
  const successModal = document.getElementById('success-modal');
  
  // Event listeners
  companionSearch.addEventListener('input', searchFriends);
  gpxInput.addEventListener('change', handleGpxUpload);
  imagesInput.addEventListener('change', handleImageUpload);
  form.addEventListener('submit', handleFormSubmit);
  document.getElementById('close-success-modal').addEventListener('click', () => {
    successModal.style.display = 'none';
    window.location.href = '../../../modules/social/feed.html';
  });
  
  // Buscar amigos
  async function searchFriends() {
    const searchTerm = this.value.trim();
    
    if (searchTerm.length < 3) {
      companionResults.style.display = 'none';
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}search_friends.php?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
          throw new Error('Error en la búsqueda');
      }
      
      const friends = await response.json();
      
      if (friends.length === 0) {
          companionResults.innerHTML = '<div class="no-results">No se encontraron amigos</div>';
          companionResults.style.display = 'block';
          return;
      }
      
      companionResults.innerHTML = friends.map(friend => `
          <div class="companion-result" data-user-id="${friend.id}">
              <img src="${friend.avatar}" alt="${friend.name}" class="companion-avatar">
              <div class="companion-info">
                  <span class="companion-name">${friend.name}</span>
                  <span class="companion-username">@${friend.username}</span>
              </div>
              <button type="button" class="add-companion-btn">
                  <i class="fas fa-plus"></i>
              </button>
          </div>
      `).join('');
      
      companionResults.style.display = 'block';
        
    } catch (error) {
      console.error('Error buscando amigos:', error);
      companionResults.innerHTML = '<div class="error">Error al buscar amigos</div>';
      companionResults.style.display = 'block';
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
      companionSearch.value = '';
      companionResults.style.display = 'none';
    }
    
    if (e.target.closest('.remove-companion')) {
      const companion = e.target.closest('.selected-companion');
      companion.remove();
    }
    
    if (e.target.closest('.remove-image')) {
      const imagePreview = e.target.closest('.image-preview');
      const imageIndex = imagePreview.getAttribute('data-index');
      uploadedImages.splice(imageIndex, 1);
      imagePreview.remove();
    }
  });
  
  // Añadir compañero
  function addCompanion(id, name, avatar) {
    const container = document.getElementById('selected-companions');
    
    // Verificar si ya está añadido
    if (document.querySelector(`.selected-companion[data-user-id="${id}"]`)) {
      return;
    }
    
    const companion = document.createElement('div');
    companion.className = 'selected-companion';
    companion.setAttribute('data-user-id', id);
    companion.innerHTML = `
      <img src="${avatar}" alt="${name}" class="companion-avatar">
      <span>${name}</span>
      <span class="remove-companion"><i class="fas fa-times"></i></span>
      <input type="hidden" name="companions[]" value="${id}">
    `;
    container.appendChild(companion);
  }
  
  // Manejar subida de GPX
  async function handleGpxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileInfo = document.getElementById('gpx-file-info');
    fileInfo.textContent = `Subiendo ${file.name}...`;
    
    const formData = new FormData();
    formData.append('gpx_file', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}upload_gpx.php`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Error al subir archivo');
      }
      
      const data = await response.json();
      gpxFile = data;
      fileInfo.textContent = `Archivo subido: ${file.name}`;
      
      // Aquí podrías mostrar un mapa con el GPX usando una librería como Leaflet
        
    } catch (error) {
      console.error('Error subiendo GPX:', error);
      fileInfo.textContent = 'Error al subir archivo';
      gpxInput.value = '';
    }
  }
  
  // Manejar subida de imágenes
  async function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const previewContainer = document.getElementById('image-preview-container');
    const formData = new FormData();
    
    // Añadir todas las imágenes al FormData
    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.match('image.*')) continue;
      formData.append('images[]', files[i]);
    }
      
    try {
      const response = await fetch(`${API_BASE_URL}upload_images.php`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Error al subir imágenes');
      }
      
      const data = await response.json();
      uploadedImages = data.images;
      
      // Mostrar previsualizaciones
      previewContainer.innerHTML = '';
      data.images.forEach((image, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.setAttribute('data-index', index);
        preview.innerHTML = `
            <img src="${image.file_path}" alt="Preview">
            <div class="remove-image"><i class="fas fa-times"></i></div>
        `;
        previewContainer.appendChild(preview);
      });
        
    } catch (error) {
      console.error('Error subiendo imágenes:', error);
      previewContainer.innerHTML = '<div class="upload-error">Error al subir imágenes</div>';
    }
  }
  
  // Manejar envío del formulario
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    
    // Obtener compañeros seleccionados
    const companions = Array.from(document.querySelectorAll('.selected-companion'))
      .map(el => el.getAttribute('data-user-id'));
    
    // Preparar datos
    const activityData = {
      title: document.getElementById('activity-title').value,
      type_id: document.getElementById('activity-type').value,
      date: document.getElementById('activity-date').value,
      description: document.getElementById('activity-description').value,
      distance: document.getElementById('distance').value || null,
      duration: document.getElementById('duration').value || null,
      elevation: document.getElementById('elevation').value || null,
      gpx_path: gpxFile?.file_path || null,
      companions: companions,
      images: uploadedImages
    };
      
    try {
      const response = await fetch(`${API_BASE_URL}create_activity.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(activityData)
      });
      
      if (!response.ok) {
        throw new Error('Error al crear actividad');
      }
      
      const data = await response.json();
      successModal.style.display = 'flex';
      
    } catch (error) {
      console.error('Error creando actividad:', error);
      alert('Error al publicar la actividad: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-share"></i> Publicar actividad';
    }
  }
});