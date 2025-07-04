document.addEventListener('DOMContentLoaded', function() {
  console.log('Post script loaded');
  
  // FIXED: Use the correct API URL where the endpoints actually exist
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
      window.location.href = '/src/modules/social/feed.html';
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

      // FIXED: Use search_friends.php (which exists in feed directory)
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
        throw new Error(data.error || data.message || 'Failed to search friends');
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
  function handleGpxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('Uploading GPX file:', file.name);
    
    const fileInfo = document.getElementById('gpx-file-info');
    if (fileInfo) fileInfo.textContent = `Procesando ${file.name}...`;
    
    // Validate GPX file
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'gpx') {
      showMessage('Solo se permiten archivos GPX', 'error');
      e.target.value = '';
      if (fileInfo) fileInfo.textContent = '';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showMessage('El archivo GPX es demasiado grande (máximo 5MB)', 'error');
      e.target.value = '';
      if (fileInfo) fileInfo.textContent = '';
      return;
    }
    
    // Store the file for later upload
    gpxFile = file;
    
    // Show GPX preview
    showGpxPreview(file);
    
    if (fileInfo) fileInfo.textContent = `Archivo seleccionado: ${file.name}`;
    
    console.log('GPX file selected successfully');
  }

  // Show GPX preview on map
  function showGpxPreview(file) {
    const mapPreview = document.getElementById('map-preview');
    if (!mapPreview) return;
    
    // Add loading state
    mapPreview.innerHTML = `
      <div class="gpx-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Procesando archivo GPX...</p>
      </div>
    `;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const gpxContent = e.target.result;
        
        // Parse GPX coordinates
        const coordinates = parseGpxCoordinates(gpxContent);
        
        if (coordinates.length > 0) {
          // Calculate route statistics
          const distance = calculateDistance(coordinates);
          const bounds = getBounds(coordinates);
          
          // Create map preview with route info
          mapPreview.innerHTML = `
            <div class="gpx-preview-info">
              <i class="fas fa-route"></i>
              <div class="route-info">
                <h4>Ruta GPX cargada</h4>
                <p><strong>${coordinates.length}</strong> puntos de ruta</p>
                <p><strong>Distancia:</strong> ${distance.toFixed(1)} km</p>
                <p><strong>Inicio:</strong> ${coordinates[0].lat.toFixed(4)}, ${coordinates[0].lon.toFixed(4)}</p>
                <p><strong>Final:</strong> ${coordinates[coordinates.length-1].lat.toFixed(4)}, ${coordinates[coordinates.length-1].lon.toFixed(4)}</p>
              </div>
            </div>
            <div class="gpx-preview-map">
              <canvas id="route-canvas" width="600" height="300"></canvas>
            </div>
          `;
          
          // Add class to indicate content is loaded
          mapPreview.classList.add('has-content');
          
          // Draw route after DOM update
          setTimeout(() => {
            drawSimpleRoute(coordinates, bounds);
          }, 100);
          
        } else {
          mapPreview.innerHTML = `
            <div class="gpx-preview-info">
              <i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i>
              <div class="route-info">
                <h4>Archivo GPX procesado</h4>
                <p>No se pudieron extraer coordenadas para vista previa</p>
                <p>El archivo se subirá correctamente</p>
              </div>
            </div>
          `;
          mapPreview.classList.add('has-content');
        }
      } catch (error) {
        console.error('Error processing GPX file:', error);
        mapPreview.innerHTML = `
          <div class="gpx-preview-info">
            <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
            <div class="route-info">
              <h4>Error procesando GPX</h4>
              <p>Hubo un problema al procesar el archivo</p>
              <p>Intenta con otro archivo GPX</p>
            </div>
          </div>
        `;
      }
    };
    
    reader.onerror = function() {
      console.error('Error reading GPX file');
      mapPreview.innerHTML = `
        <div class="gpx-preview-info">
          <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
          <div class="route-info">
            <h4>Error leyendo archivo</h4>
            <p>No se pudo leer el archivo GPX</p>
          </div>
        </div>
      `;
    };
    
    reader.readAsText(file);
  }

  function parseGpxCoordinates(gpxContent) {
    const coordinates = [];
    
    try {
      // Try to parse as XML first
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        console.warn('XML parsing failed, falling back to regex');
        return parseGpxWithRegex(gpxContent);
      }
      
      // Look for track points (trkpt)
      const trackPoints = xmlDoc.querySelectorAll('trkpt');
      
      trackPoints.forEach(point => {
        const lat = parseFloat(point.getAttribute('lat'));
        const lon = parseFloat(point.getAttribute('lon'));
        
        if (!isNaN(lat) && !isNaN(lon)) {
          coordinates.push({ lat: lat, lon: lon });
        }
      });
      
      // If no track points, look for waypoints
      if (coordinates.length === 0) {
        const waypoints = xmlDoc.querySelectorAll('wpt');
        waypoints.forEach(point => {
          const lat = parseFloat(point.getAttribute('lat'));
          const lon = parseFloat(point.getAttribute('lon'));
          
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates.push({ lat: lat, lon: lon });
          }
        });
      }
      
    } catch (error) {
      console.warn('XML parsing failed, using regex fallback:', error);
      return parseGpxWithRegex(gpxContent);
    }
    
    return coordinates;
  }

  function parseGpxWithRegex(gpxContent) {
    const coordinates = [];
    
    // More comprehensive regex patterns
    const patterns = [
      /<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"/g,
      /<wpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"/g,
      /lat="([^"]*)"[^>]*lon="([^"]*)"/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(gpxContent)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        
        if (!isNaN(lat) && !isNaN(lon)) {
          coordinates.push({ lat: lat, lon: lon });
        }
      }
      
      if (coordinates.length > 0) break;
    }
    
    return coordinates;
  }

  function getBounds(coordinates) {
    if (coordinates.length === 0) return null;
    
    let minLat = coordinates[0].lat, maxLat = coordinates[0].lat;
    let minLon = coordinates[0].lon, maxLon = coordinates[0].lon;
    
    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.lat);
      maxLat = Math.max(maxLat, coord.lat);
      minLon = Math.min(minLon, coord.lon);
      maxLon = Math.max(maxLon, coord.lon);
    });
    
    return { minLat, maxLat, minLon, maxLon };
  }

  // Calculate approximate distance
  function calculateDistance(coordinates) {
    if (coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      
      // Haversine formula for distance between two points
      const R = 6371; // Earth's radius in km
      const dLat = (curr.lat - prev.lat) * Math.PI / 180;
      const dLon = (curr.lon - prev.lon) * Math.PI / 180;
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(prev.lat * Math.PI / 180) * Math.cos(curr.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      totalDistance += distance;
    }
    
    return totalDistance;
  }

  // Draw simple route on canvas
  function drawSimpleRoute(coordinates, bounds) {
    const canvas = document.getElementById('route-canvas');
    if (!canvas || coordinates.length < 2 || !bounds) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Add padding
    const padding = 30;
    const latRange = bounds.maxLat - bounds.minLat;
    const lonRange = bounds.maxLon - bounds.minLon;
    
    // Ensure minimum range for very small routes
    const minRange = 0.001;
    const effectiveLatRange = Math.max(latRange, minRange);
    const effectiveLonRange = Math.max(lonRange, minRange);
    
    // Clear canvas with better background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Add grid lines for better visualization
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Vertical grid lines
    for (let i = 1; i < 6; i++) {
      const x = (width / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw route with gradient effect
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#4CAF50'); // Green start
    gradient.addColorStop(1, '#2196F3'); // Blue end
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Add shadow effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.beginPath();
    
    coordinates.forEach((coord, index) => {
      const x = padding + ((coord.lon - bounds.minLon) / effectiveLonRange) * (width - 2 * padding);
      const y = height - padding - ((coord.lat - bounds.minLat) / effectiveLatRange) * (height - 2 * padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Reset shadow for markers
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw start point (green)
    const startX = padding + ((coordinates[0].lon - bounds.minLon) / effectiveLonRange) * (width - 2 * padding);
    const startY = height - padding - ((coordinates[0].lat - bounds.minLat) / effectiveLatRange) * (height - 2 * padding);
    
    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(startX, startY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw end point (red)
    const endCoord = coordinates[coordinates.length - 1];
    const endX = padding + ((endCoord.lon - bounds.minLon) / effectiveLonRange) * (width - 2 * padding);
    const endY = height - padding - ((endCoord.lat - bounds.minLat) / effectiveLatRange) * (height - 2 * padding);
    
    ctx.fillStyle = '#F44336';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    // Start label
    ctx.fillText('INICIO', startX, startY - 15);
    
    // End label
    ctx.fillText('FIN', endX, endY - 15);
  }
    
  // Manejar subida de imágenes
  function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    console.log('Processing', files.length, 'image files');
    
    uploadedImages = [];
    
    // Validate and process files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.match('image.*')) {
        showMessage(`${file.name} no es una imagen válida`, 'error');
        continue;
      }
      
      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        showMessage(`${file.name} es demasiado grande (máximo 2MB)`, 'error');
        continue;
      }
      
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

      // Validate required fields
      const title = document.getElementById('activity-title')?.value?.trim();
      const activityType = document.getElementById('activity-type')?.value;
      
      if (!title) {
        throw new Error('El título es obligatorio');
      }
      
      if (!activityType) {
        throw new Error('El tipo de actividad es obligatorio');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('token', token);
      formData.append('titulo', title);
      formData.append('tipo_actividad_id', activityType);
      
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
      
      // Add images with correct field name
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
      
      // FIXED: Use create_activity.php (which exists in feed directory)
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