// Feed functionality for RunTrackPro
let currentUser = null;
let feedActivities = [];
let lastActivityId = 0;
let isLoading = false;
let selectedCompanions = [];

// Base URL for API calls
const API_BASE_URL = 'http://localhost:8000/src/includes/feed/';

document.addEventListener('DOMContentLoaded', function() {
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data'));
    if (userData) {
        currentUser = userData;
        updateUserInfo();
    }

    // Initialize feed
    loadFeedActivities();
    loadUserStats();
    loadRecentFriends();
    loadTrendingActivities();
    loadUserSuggestions();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up infinite scroll
    setupInfiniteScroll();
    
    // Set up search functionality
    setupSearch();
    
    // Refresh feed every 30 seconds
    setInterval(() => {
        if (!isLoading) {
            loadFeedActivities();
        }
    }, 30000);
});

// Setup all event listeners
function setupEventListeners() {
    // Create post button
    const createPostBtn = document.getElementById('create-post-btn');
    const postForm = document.getElementById('post-form');
    const cancelPostBtn = document.getElementById('cancel-post-btn');
    
    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            postForm.style.display = postForm.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    if (cancelPostBtn) {
        cancelPostBtn.addEventListener('click', () => {
            postForm.style.display = 'none';
            document.getElementById('new-post-form').reset();
            clearImagePreview();
            selectedCompanions = [];
        });
    }
    
    // New post form submission
    const newPostForm = document.getElementById('new-post-form');
    if (newPostForm) {
        newPostForm.addEventListener('submit', handleNewPostSubmit);
    }
    
    // Image upload preview
    const imageInput = document.getElementById('post-images');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // Companions search
    const companionsInput = document.getElementById('post-companions');
    if (companionsInput) {
        companionsInput.addEventListener('input', handleCompanionsSearch);
    }
    
    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => loadFeedActivities(true));
    }
    
    // Modal close handlers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal')) {
            closeModals();
        }
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Update user information in the UI
function updateUserInfo() {
    if (!currentUser) return;
    
    // Update avatar
    const avatarElements = document.querySelectorAll('#current-user-avatar');
    avatarElements.forEach(avatar => {
        if (currentUser.imagen_perfil_id) {
            avatar.src = `../../assets/img/profiles/${currentUser.imagen_perfil_id}.jpg`;
        }
    });
    
    // Update username
    const usernameElement = document.getElementById('current-username');
    if (usernameElement) {
        usernameElement.textContent = `${currentUser.nombre} ${currentUser.apellidos}`;
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        const response = await fetch(API_BASE_URL + 'get_user_stats.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('week-distance').textContent = `${data.stats.week_distance} km`;
            document.getElementById('month-distance').textContent = `${data.stats.month_distance} km`;
            document.getElementById('total-activities').textContent = data.stats.total_activities;
            document.getElementById('active-friends').textContent = data.stats.active_friends;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Load recent friends
async function loadRecentFriends() {
    try {
        const response = await fetch(API_BASE_URL + '/get_recent_friends.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('recent-friends');
            container.innerHTML = '';
            
            data.friends.forEach(friend => {
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-item';
                friendElement.innerHTML = `
                    <img src="${friend.imagen_perfil || '../../assets/img/default-avatar.jpg'}" 
                         alt="${friend.nombre}" class="friend-avatar">
                    <div class="friend-info">
                        <div class="friend-name">${friend.nombre} ${friend.apellidos}</div>
                        <div class="friend-status">${friend.ultima_actividad || 'Sin actividad reciente'}</div>
                    </div>
                `;
                container.appendChild(friendElement);
            });
        }
    } catch (error) {
        console.error('Error loading recent friends:', error);
    }
}

// Load trending activities
async function loadTrendingActivities() {
    try {
        const response = await fetch(API_BASE_URL + 'get_trending_activities.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('trending-activities');
            container.innerHTML = '';
            
            data.trending.forEach(activity => {
                const typeInfo = getActivityTypeInfo(activity.tipo_id);
                const trendingElement = document.createElement('div');
                trendingElement.className = 'trending-item';
                trendingElement.innerHTML = `
                    <div class="trending-icon">
                        <i class="${typeInfo.icon}"></i>
                    </div>
                    <div class="trending-info">
                        <div class="trending-name">${activity.tipo_nombre}</div>
                        <div class="trending-count">${activity.count} actividades hoy</div>
                    </div>
                `;
                container.appendChild(trendingElement);
            });
        }
    } catch (error) {
        console.error('Error loading trending activities:', error);
    }
}

// Load user suggestions
async function loadUserSuggestions() {
    try {
        const response = await fetch(API_BASE_URL + 'get_user_suggestions.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token')
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('user-suggestions');
            container.innerHTML = '';
            
            data.suggestions.forEach(user => {
                const suggestionElement = document.createElement('div');
                suggestionElement.className = 'suggestion-item';
                suggestionElement.innerHTML = `
                    <img src="${user.imagen_perfil || '../../assets/img/default-avatar.jpg'}" 
                         alt="${user.nombre}" class="suggestion-avatar">
                    <div class="suggestion-info">
                        <div class="suggestion-name">${user.nombre} ${user.apellidos}</div>
                        <div class="suggestion-meta">${user.ubicacion || 'Ubicación no disponible'}</div>
                    </div>
                    <button class="follow-btn" onclick="followUser(${user.id})">Seguir</button>
                `;
                container.appendChild(suggestionElement);
            });
        }
    } catch (error) {
        console.error('Error loading user suggestions:', error);
    }
}

// Load feed activities from server
async function loadFeedActivities(loadMore = false) {
    if (isLoading) return;
    isLoading = true;
    
    // Show loading indicator
    if (!loadMore) {
        showLoadingState();
    }
    
    try {
        const response = await fetch(API_BASE_URL + 'get_activities.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token'),
                last_id: loadMore ? lastActivityId : 0,
                limit: 10
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (loadMore) {
                feedActivities = [...feedActivities, ...data.activities];
            } else {
                feedActivities = data.activities;
            }
            
            if (data.activities.length > 0) {
                lastActivityId = data.activities[data.activities.length - 1].id;
            }
            
            renderFeedActivities(loadMore);
            
            // Show/hide load more button
            const loadMoreContainer = document.getElementById('load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.style.display = data.has_more ? 'block' : 'none';
            }
        } else {
            showError('Error al cargar las actividades: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading feed:', error);
        showError('Error de conexión al cargar las actividades');
    } finally {
        isLoading = false;
        hideLoadingState();
    }
}

// Render activities in the feed
function renderFeedActivities(append = false) {
    const feedContainer = document.getElementById('activities-feed');
    if (!feedContainer) return;
    
    if (!append) {
        feedContainer.innerHTML = '';
    }
    
    feedActivities.forEach(activity => {
        if (!document.getElementById(`activity-${activity.id}`)) {
            const activityElement = createActivityElement(activity);
            feedContainer.appendChild(activityElement);
        }
    });
    
    // If no activities, show empty state
    if (feedActivities.length === 0 && !append) {
        showEmptyState();
    }
}

// Create HTML element for a single activity
function createActivityElement(activity) {
    const activityDiv = document.createElement('article');
    activityDiv.className = 'post';
    activityDiv.id = `activity-${activity.id}`;
    
    // Activity type icon and color
    const typeInfo = getActivityTypeInfo(activity.tipo_actividad_id);
    
    // Format time ago
    const timeAgo = formatTimeAgo(activity.fecha_publicacion);
    
    // Parse GPX data for stats
    const stats = parseGPXStats(activity.ruta_gpx);
    
    // Check if current user has applauded
    const hasApplauded = activity.user_applauded || false;
    const applauseCount = activity.aplausos_count || 0;
    
    activityDiv.innerHTML = `
        <div class="post-header">
            <div class="user-info">
                <img src="${activity.usuario_imagen || '../../../public/profiles/senior_cat.jpeg'}" 
                     alt="${activity.usuario_nombre}" 
                     class="user-avatar">
                <span class="username">${activity.usuario_nombre} ${activity.usuario_apellidos}</span>
            </div>
            <button type="button" title="Opciones" class="options-button">
                <i class="fas fa-ellipsis-h"></i>
            </button>
        </div>
        
        <div class="post-content">
            <div class="activity-info">
                <div class="activity-header">
                    <div class="activity-meta">
                        <span class="activity-type">${activity.tipo_actividad_nombre}</span>
                        <h3 class="activity-title">${activity.titulo}</h3>
                        <div class="activity-stats">
                            <span><i class="fas fa-route"></i> ${stats.distance} km</span>
                            <span><i class="fas fa-clock"></i> ${stats.duration}</span>
                            <span><i class="fas fa-mountain"></i> ${stats.elevation}m</span>
                            ${stats.pace ? `<span><i class="fas fa-tachometer-alt"></i> ${stats.pace}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${activity.imagenes && activity.imagenes.length > 0 ? `
                    <div class="activity-images">
                        ${activity.imagenes.map(img => `
                            <img src="../../assets/img/activities/${img.nombre}" 
                                 alt="Imagen de actividad" 
                                 class="activity-image"
                                 onclick="openImageModal('../../assets/img/activities/${img.nombre}')">
                        `).join('')}
                    </div>
                ` : ''}
                
                ${activity.companeros && activity.companeros.length > 0 ? `
                    <div class="activity-companions">
                        <span class="companions-label">Con:</span>
                        <div class="companions-list">
                            ${activity.companeros.map(c => `
                                <div class="companion-avatar">
                                    <img src="${c.imagen_perfil || '../../assets/img/default-avatar.jpg'}" 
                                         alt="${c.nombre}" title="${c.nombre} ${c.apellidos}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="post-footer">
            <div class="post-actions">
                <button class="like-button ${hasApplauded ? 'active' : ''}" 
                        data-activity-id="${activity.id}"
                        onclick="toggleApplause(${activity.id})">
                    <i class="fas fa-thumbs-up"></i> Aplaudir
                </button>
                <span class="like-count">${applauseCount} aplausos</span>
            </div>
            <span class="post-date">${timeAgo}</span>
        </div>
    `;
    
    return activityDiv;
}

// Handle new post form submission
async function handleNewPostSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('submit-text');
    const submitLoader = document.getElementById('submit-loader');
    
    // Show loading state
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitLoader.style.display = 'inline-block';
    
    try {
        const formData = new FormData();
        formData.append('token', localStorage.getItem('auth_token'));
        formData.append('titulo', document.getElementById('post-title').value);
        formData.append('tipo_actividad_id', document.getElementById('activity-type').value);
        
        // Add GPX file
        const gpxFile = document.getElementById('post-gpx').files[0];
        if (gpxFile) {
            formData.append('gpx_file', gpxFile);
        }
        
        // Add images
        const imageFiles = document.getElementById('post-images').files;
        for (let i = 0; i < imageFiles.length; i++) {
            formData.append('images[]', imageFiles[i]);
        }
        
        // Add companions
        formData.append('companions', JSON.stringify(selectedCompanions));
        
        const response = await fetch(API_BASE_URL + 'create_activity.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reset form and hide it
            document.getElementById('new-post-form').reset();
            document.getElementById('post-form').style.display = 'none';
            clearImagePreview();
            selectedCompanions = [];
            
            // Reload feed
            loadFeedActivities();
            
            showSuccess('Actividad publicada correctamente');
        } else {
            showError('Error al publicar la actividad: ' + data.message);
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showError('Error de conexión al publicar la actividad');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitLoader.style.display = 'none';
    }
}

// Handle image preview
function handleImagePreview(e) {
    const files = e.target.files;
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imgElement = document.createElement('div');
            imgElement.className = 'preview-image';
            imgElement.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" onclick="removeImage(${i})" class="remove-image">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(imgElement);
        };
        
        reader.readAsDataURL(file);
    }
}

// Clear image preview
function clearImagePreview() {
    const previewContainer = document.getElementById('image-preview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

// Handle companions search
async function handleCompanionsSearch(e) {
    const query = e.target.value.trim();
    const suggestionsContainer = document.getElementById('companions-suggestions');
    
    if (query.length < 2) {
        suggestionsContainer.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL + 'search_friends.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token'),
                query: query
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            suggestionsContainer.innerHTML = '';
            
            data.friends.forEach(friend => {
                const suggestionElement = document.createElement('div');
                suggestionElement.className = 'companion-suggestion';
                suggestionElement.innerHTML = `
                    <img src="${friend.imagen_perfil || '../../assets/img/default-avatar.jpg'}" 
                         alt="${friend.nombre}" class="suggestion-avatar">
                    <span class="suggestion-name">${friend.nombre} ${friend.apellidos}</span>
                `;
                
                suggestionElement.addEventListener('click', () => {
                    addCompanion(friend);
                    e.target.value = '';
                    suggestionsContainer.innerHTML = '';
                });
                
                suggestionsContainer.appendChild(suggestionElement);
            });
        }
    } catch (error) {
        console.error('Error searching friends:', error);
    }
}

// Add companion to selected list
function addCompanion(friend) {
    if (selectedCompanions.find(c => c.id === friend.id)) {
        return; // Already added
    }
    
    selectedCompanions.push(friend);
    updateCompanionsDisplay();
}

// Update companions display
function updateCompanionsDisplay() {
    const companionsInput = document.getElementById('post-companions');
    const displayText = selectedCompanions.map(c => `${c.nombre} ${c.apellidos}`).join(', ');
    companionsInput.placeholder = displayText || 'Buscar amigos...';
}

// Get activity type information (icon and CSS class)
function getActivityTypeInfo(typeId) {
    const types = {
        1: { icon: 'fas fa-bicycle', class: 'cycling' },
        2: { icon: 'fas fa-bicycle', class: 'mtb' },
        3: { icon: 'fas fa-hiking', class: 'hiking' },
        4: { icon: 'fas fa-running', class: 'running' }
    };
    
    return types[typeId] || { icon: 'fas fa-dumbbell', class: 'other' };
}

// Parse GPX data to extract basic stats
function parseGPXStats(gpxData) {
    try {
        if (!gpxData || gpxData.trim() === '') {
            return { distance: '0', duration: '0:00', elevation: '0' };
        }
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxData, "text/xml");
        const trkpts = xmlDoc.getElementsByTagName("trkpt");
        
        if (trkpts.length === 0) {
            return { distance: '0', duration: '0:00', elevation: '0' };
        }
        
        let totalDistance = 0;
        let maxElevation = 0;
        let startTime = null;
        let endTime = null;
        
        for (let i = 0; i < trkpts.length; i++) {
            const point = trkpts[i];
            const lat = parseFloat(point.getAttribute('lat'));
            const lon = parseFloat(point.getAttribute('lon'));
            const ele = point.getElementsByTagName('ele')[0];
            const time = point.getElementsByTagName('time')[0];
            
            if (ele) {
                const elevation = parseFloat(ele.textContent);
                if (elevation > maxElevation) {
                    maxElevation = elevation;
                }
            }
            
            if (time && !startTime) {
                startTime = new Date(time.textContent);
            }
            if (time) {
                endTime = new Date(time.textContent);
            }
            
            // Calculate distance between consecutive points
            if (i > 0) {
                const prevPoint = trkpts[i - 1];
                const prevLat = parseFloat(prevPoint.getAttribute('lat'));
                const prevLon = parseFloat(prevPoint.getAttribute('lon'));
                
                totalDistance += calculateDistance(prevLat, prevLon, lat, lon);
            }
        }
        
        // Calculate duration
        let duration = '0:00';
        let diffMs = 0;
        if (startTime && endTime) {
            diffMs = endTime - startTime;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}:00`;
        }
        
        return {
            distance: totalDistance.toFixed(1),
            duration: duration,
            elevation: Math.round(maxElevation),
            pace: totalDistance > 0 && diffMs > 0 ? calculatePace(totalDistance, diffMs) : null
        };
        
    } catch (error) {
        console.error('Error parsing GPX:', error);
        return { distance: '0', duration: '0:00', elevation: '0' };
    }
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate pace (for running activities)
function calculatePace(distance, durationMs) {
    if (!distance || !durationMs) return null;
    
    const minutes = durationMs / (1000 * 60);
    const paceMinutes = minutes / distance;
    const mins = Math.floor(paceMinutes);
    const secs = Math.round((paceMinutes - mins) * 60);
    
    return `${mins}:${secs.toString().padStart(2, '0')} min/km`;
}

// Format time ago
function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES');
}

// Toggle applause for an activity
async function toggleApplause(activityId) {
    const button = document.querySelector(`[data-activity-id="${activityId}"]`);
    if (!button) return;
    
    const isActive = button.classList.contains('active');
    
    try {
        const response = await fetch(API_BASE_URL + 'toggle_applause.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token'),
                activity_id: activityId,
                action: isActive ? 'remove' : 'add'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            button.classList.toggle('active');
            const countSpan = button.parentElement.querySelector('.like-count');
            countSpan.textContent = `${data.new_count} aplausos`;
            
            // Add animation
            button.style.transform = 'scale(1.2)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        } else {
            showError('Error al procesar el aplauso: ' + data.message);
        }
    } catch (error) {
        console.error('Error toggling applause:', error);
        showError('Error de conexión');
    }
}

// Follow user
async function followUser(userId) {
    try {
        const response = await fetch(API_BASE_URL + 'follow_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token'),
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Usuario seguido correctamente');
            loadUserSuggestions(); // Refresh suggestions
        } else {
            showError('Error al seguir usuario: ' + data.message);
        }
    } catch (error) {
        console.error('Error following user:', error);
        showError('Error de conexión');
    }
}

// Setup infinite scroll
function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
            if (!isLoading && lastActivityId > 0) {
                loadFeedActivities(true);
            }
        }
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('user-search');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput && searchButton) {
        let searchTimeout;
        
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    performSearch(query);
                } else if (query.length === 0) {
                    loadFeedActivities(); // Reset to normal feed
                }
            }, 500);
        });
        
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value.trim());
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value.trim());
            }
        });
    }
}

// Perform search
async function performSearch(query) {
    if (!query || query.length < 2) {
        return;
    }
    
    isLoading = true;
    showLoadingState();
    
    try {
        const response = await fetch(API_BASE_URL + 'search_activities.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token'),
                query: query,
                limit: 20
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            feedActivities = data.activities;
            lastActivityId = 0;
            renderFeedActivities(false);
            
            // Show search results modal if there are users
            if (data.users && data.users.length > 0) {
                showSearchResults(data.users, query);
            }
        } else {
            showError('Error en la búsqueda: ' + data.message);
        }
    } catch (error) {
        console.error('Error searching:', error);
        showError('Error de conexión en la búsqueda');
    } finally {
        isLoading = false;
        hideLoadingState();
    }
}

// Show search results modal
function showSearchResults(users, query) {
    const modal = document.getElementById('search-results-modal');
    const resultsContainer = document.getElementById('search-results');
    
    resultsContainer.innerHTML = `
        <h4>Usuarios encontrados para "${query}":</h4>
    `;
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-result';
        userElement.innerHTML = `
            <img src="${user.imagen_perfil || '../../img/default-avatar.jpg'}" 
                 alt="${user.nombre}" class="result-avatar">
            <div class="result-info">
                <span class="result-name">${user.nombre} ${user.apellidos}</span>
                <span class="result-activity">${user.ubicacion || 'Sin ubicación'}</span>
                <span class="result-stats">${user.total_actividades} actividades</span>
            </div>
            ${!user.es_amigo ? `
                <button class="friend-action" onclick="followUser(${user.id})">Seguir</button>
            ` : `
                <span class="friend-status">Amigo</span>
            `}
        `;
        resultsContainer.appendChild(userElement);
    });
    
    modal.style.display = 'flex';
}

// Open image modal
function openImageModal(imageSrc) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    
    modalImage.src = imageSrc;
    modal.style.display = 'flex';
}

// Open comments modal
function openComments(activityId) {
    const modal = document.getElementById('comments-modal');
    // TODO: Load comments for the activity
    modal.style.display = 'flex';
}

// Share activity
function shareActivity(activityId) {
    if (navigator.share) {
        navigator.share({
            title: 'Actividad en RunTrackPro',
            text: 'Mira esta actividad deportiva',
            url: `${window.location.origin}/activity/${activityId}`
        });
    } else {
        // Fallback: copy to clipboard
        const url = `${window.location.origin}/activity/${activityId}`;
        navigator.clipboard.writeText(url).then(() => {
            showSuccess('Enlace copiado al portapapeles');
        });
    }
}

// Close all modals
function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Show loading state
function showLoadingState() {
    const feedContainer = document.getElementById('activities-feed');
    if (feedContainer && feedActivities.length === 0) {
        feedContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Cargando actividades...</p>
            </div>
        `;
    }
}

// Hide loading state
function hideLoadingState() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.remove();
    }
}

// Show empty state
function showEmptyState() {
    const feedContainer = document.getElementById('activities-feed');
    if (feedContainer) {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-running"></i>
                <h3>¡Comienza tu aventura!</h3>
                <p>No hay actividades para mostrar. Sigue a más usuarios o publica tu primera actividad.</p>
                <a href="../post/post.html" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    Crear actividad
                </a>
            </div>
        `;
    }
}

// Show error message
function showError(message) {
    createToast(message, 'error');
}

// Show success message
function showSuccess(message) {
    createToast(message, 'success');
}

// Create toast notification
function createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}