// Feed functionality for RunTrackPro
let currentUser = null;
let feedActivities = [];
let lastActivityId = 0;
let isLoading = false;
let selectedCompanions = [];

// Base URL for API calls
const API_BASE_URL = 'http://localhost:8000/src/includes/feed/';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Feed script loaded');

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data'));
    if (userData) {
        currentUser = userData;
        updateUserInfo();
    }

    // Initialize feed
    loadFeedActivities();
    loadUserStats();
    loadFriendsList();
    
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
            avatar.src = `../../../public/profiles/${currentUser.imagen_perfil_id}.jpg`;
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

// Load friends list with pagination
async function loadFriendsList(offset = 0) {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}get_friends_list.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: token,
                offset: offset,
                limit: 10
            })
        });

        if (!response.ok) {
            throw new Error('Error al cargar amigos');
        }

        const data = await response.json();
        
        if (data.success) {
            const friendsList = document.getElementById('friends-list');
            const loadMoreBtn = document.getElementById('load-more-friends');
            const loadMoreFriendsBtn = document.getElementById('load-more-friends-btn');
            
            if (offset === 0) {
                friendsList.innerHTML = '';
            }
            
            if (data.friends && data.friends.length > 0) {
                data.friends.forEach(friend => {
                    const friendElement = document.createElement('div');
                    friendElement.className = 'friend-item';
                    friendElement.innerHTML = `
                        <div class="friend-avatar">
                            <img src="${friend.imagen_perfil || '../../../public/profiles/default-avatar.jpg'}" 
                                 alt="${friend.nombre}">
                        </div>
                        <div class="friend-info">
                            <div class="friend-name">${friend.nombre} ${friend.apellidos}</div>
                            <div class="friend-username">@${friend.username}</div>
                            <div class="friend-status">${friend.ultima_actividad || 'Sin actividad reciente'}</div>
                        </div>
                        <div class="friend-actions">
                            <button type="button" class="btn btn-icon" onclick="viewProfile(${friend.id})" title="Ver perfil">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                    friendsList.appendChild(friendElement);
                });
                
                // Show/hide load more button
                if (data.has_more) {
                    loadMoreBtn.style.display = 'block';
                } else {
                    loadMoreBtn.style.display = 'none';
                }
                
                // Add event listener for load more button
                if (loadMoreFriendsBtn && !loadMoreFriendsBtn.hasAttribute('data-listener')) {
                    loadMoreFriendsBtn.setAttribute('data-listener', 'true');
                    loadMoreFriendsBtn.addEventListener('click', () => {
                        const currentItems = friendsList.querySelectorAll('.friend-item').length;
                        loadFriendsList(currentItems);
                    });
                }
            } else if (offset === 0) {
                friendsList.innerHTML = '<div class="no-friends">No tienes amigos agregados aún</div>';
                loadMoreBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading friends:', error);
        if (offset === 0) {
            const friendsList = document.getElementById('friends-list');
            if (friendsList) {
                friendsList.innerHTML = '<div class="error-message">Error al cargar amigos</div>';
            }
        }
    }
}

// Helper function to view user profile
function viewProfile(userId) {
    window.location.href = `../profile/friend-profile.html?user_id=${userId}`;
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
// Replace the existing createActivityElement function with this enhanced version
function createActivityElement(activity) {
    const activityDiv = document.createElement('article');
    activityDiv.className = 'post';
    activityDiv.id = `activity-${activity.id}`;
    
    // Activity type icon and color
    const typeInfo = getActivityTypeInfo(activity.tipo_actividad_id);
    
    // Format time ago
    const timeAgo = formatTimeAgo(activity.fecha_publicacion);
    
    // Check if activity has GPX data
    const hasGpx = activity.ruta_gpx && activity.ruta_gpx.trim() !== '';
    
    // Check if current user has applauded
    const hasApplauded = activity.user_applauded || false;
    const applauseCount = activity.aplausos_count || 0;
    
    activityDiv.innerHTML = `
        <div class="post-header">
            <div class="user-info">
                <img src="${activity.usuario_imagen || '../../../public/profiles/default-avatar.jpg'}" 
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
                    </div>
                </div>
                
                ${hasGpx ? `
                    <div class="activity-route">
                        <div class="route-header">
                            <i class="fas fa-route"></i>
                            <span>Ruta GPS disponible</span>
                            <button class="view-route-btn" onclick="viewRoute(${activity.id})">
                                Ver ruta
                            </button>
                        </div>
                        <div id="route-preview-${activity.id}" class="route-preview" style="display: none;">
                            <canvas id="route-canvas-${activity.id}" width="100%" height="200"></canvas>
                        </div>
                    </div>
                ` : ''}
                
                ${activity.imagenes && activity.imagenes.length > 0 ? `
                    <div class="activity-images">
                        ${activity.imagenes.map(img => `
                            <img src="../../../public/activities/${img.nombre}" 
                                 alt="Imagen de actividad" 
                                 class="activity-image"
                                 onclick="openImageModal('../../../public/activities/${img.nombre}')">
                        `).join('')}
                    </div>
                ` : ''}
                
                ${activity.companeros && activity.companeros.length > 0 ? `
                    <div class="activity-companions">
                        <span class="companions-label">Con:</span>
                        <div class="companions-list">
                            ${activity.companeros.map(c => `
                                <div class="companion-avatar">
                                    <img src="${c.imagen_perfil || '../../../public/profiles/default-avatar.jpg'}" 
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
                    <img src="${friend.imagen_perfil || '../../../public/profiles/default-avatar.jpg'}" 
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

// Follow user - Enhanced with follow/unfollow functionality
async function followUser(userId, action = 'follow') {
    const button = document.getElementById(`follow-btn-${userId}`);
    if (!button) return;
    
    // Show loading state
    const originalText = button.textContent;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    
    try {
        const response = await fetch(API_BASE_URL + 'follow_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: localStorage.getItem('auth_token'),
                user_id: userId,
                action: action
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update button based on new status
            if (data.is_following) {
                button.textContent = 'Siguiendo';
                button.className = 'follow-btn following';
                button.onclick = () => unfollowUser(userId);
                showSuccess(`Ahora sigues a ${data.target_user.name}`);
            } else {
                button.textContent = 'Seguir';
                button.className = 'follow-btn';
                button.onclick = () => followUser(userId);
                showSuccess(`Has dejado de seguir a ${data.target_user.name}`);
            }
            
            // Update follower counts if displayed
            updateFollowerCounts(userId, data.follower_count, data.following_count);
            
            // Refresh suggestions to remove followed user
            if (data.is_following) {
                setTimeout(() => {
                    loadUserSuggestions();
                }, 1000);
            }
            
        } else {
            showError('Error al seguir usuario: ' + data.message);
            // Reset button
            button.textContent = originalText;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Error following user:', error);
        showError('Error de conexión');
        // Reset button
        button.textContent = originalText;
        button.disabled = false;
    } finally {
        button.disabled = false;
    }
}

// Unfollow user
async function unfollowUser(userId) {
    return followUser(userId, 'unfollow');
}

// Update follower counts in UI (if displayed)
function updateFollowerCounts(userId, followerCount, followingCount) {
    const followerCountElement = document.getElementById(`followers-count-${userId}`);
    const followingCountElement = document.getElementById(`following-count-${userId}`);
    
    if (followerCountElement) {
        followerCountElement.textContent = followerCount;
    }
    
    if (followingCountElement) {
        followingCountElement.textContent = followingCount;
    }
}

// Check follow status for a user (utility function)
async function checkFollowStatus(userId) {
    try {
        const response = await fetch(API_BASE_URL + 'get_user_relationship.php', {
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
        return data.success ? data.is_following : false;
    } catch (error) {
        console.error('Error checking follow status:', error);
        return false;
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
            <img src="${user.imagen_perfil || '../../../public/profiles/default-avatar.jpg'}" 
                 alt="${user.nombre}" class="result-avatar">
            <div class="result-info">
                <span class="result-name">${user.nombre} ${user.apellidos}</span>
                <span class="result-activity">${user.ubicacion || 'Sin ubicación'}</span>
                <span class="result-stats">${user.total_actividades} actividades</span>
            </div>
            ${!user.es_amigo ? `
                <button class="friend-action" onclick="followUser(${user.id})" id="follow-btn-${user.id}">
                    Seguir
                </button>
            ` : `
                <button class="friend-action following" onclick="unfollowUser(${user.id})" id="follow-btn-${user.id}">
                    Siguiendo
                </button>
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

// Utility function to remove images from preview
function removeImage(index) {
    const imageInput = document.getElementById('post-images');
    const files = Array.from(imageInput.files);
    
    // Create new FileList without the removed file
    const dt = new DataTransfer();
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    imageInput.files = dt.files;
    handleImagePreview({ target: imageInput });
}

// Enhanced user profile functions
function viewUserProfile(userId) {
    // Navigate to user profile page
    window.location.href = `../profile/user.html?id=${userId}`;
}

// Bulk follow/unfollow operations
async function followMultipleUsers(userIds) {
    const results = [];
    
    for (const userId of userIds) {
        try {
            const result = await followUser(userId);
            results.push({ userId, success: true, result });
        } catch (error) {
            results.push({ userId, success: false, error: error.message });
        }
    }
    
    return results;
}

// Get mutual friends
async function getMutualFriends(userId) {
    try {
        const response = await fetch(API_BASE_URL + 'get_mutual_friends.php', {
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
        return data.success ? data.mutual_friends : [];
    } catch (error) {
        console.error('Error getting mutual friends:', error);
        return [];
    }
}

// Initialize follow buttons based on relationship status
async function initializeFollowButtons() {
    const followButtons = document.querySelectorAll('.follow-btn');
    
    for (const button of followButtons) {
        const userId = button.onclick?.toString().match(/followUser\((\d+)\)/)?.[1];
        if (userId) {
            const isFollowing = await checkFollowStatus(parseInt(userId));
            if (isFollowing) {
                button.textContent = 'Siguiendo';
                button.className = 'follow-btn following';
                button.onclick = () => unfollowUser(parseInt(userId));
            }
        }
    }
}


// Function to render activity with GPX support
function renderActivity(activity) {
  const activityCard = document.createElement('div');
  activityCard.className = 'activity-card';
  activityCard.setAttribute('data-activity-id', activity.id);
  
  // Activity header
  const activityHeader = `
    <div class="activity-header">
      <div class="user-info">
        <img src="${activity.usuario_imagen || '../../../public/profiles/default-avatar.jpg'}" 
             alt="${activity.usuario_nombre}" class="user-avatar">
        <div class="user-details">
          <span class="username">${activity.usuario_nombre} ${activity.usuario_apellidos}</span>
          <span class="activity-time">${formatDate(activity.fecha_actividad)}</span>
        </div>
      </div>
      <div class="activity-type">
        <i class="fas ${getActivityIcon(activity.tipo_actividad_id)}"></i>
        <span>${activity.tipo_actividad_nombre}</span>
      </div>
    </div>
  `;
  
  // Activity content with GPX
  const activityContent = `
    <div class="activity-content">
      <h3 class="activity-title">${activity.titulo}</h3>
      
      ${activity.has_gpx ? `
        <div class="activity-route">
          <div class="route-header">
            <i class="fas fa-route"></i>
            <span>Ruta GPS disponible</span>
            <button class="view-route-btn" onclick="viewRoute('${activity.gpx_url}', ${activity.id})">
              Ver ruta
            </button>
          </div>
          <div id="route-preview-${activity.id}" class="route-preview" style="display: none;">
            <canvas id="route-canvas-${activity.id}" width="100%" height="200"></canvas>
          </div>
        </div>
      ` : ''}
      
      ${activity.imagenes.length > 0 ? `
        <div class="activity-images">
          ${activity.imagenes.map(img => `
            <img src="${img.ruta}" alt="Imagen de actividad" 
                 class="activity-image" onclick="openImageModal('${img.ruta}')">
          `).join('')}
        </div>
      ` : ''}
      
      ${activity.companeros.length > 0 ? `
        <div class="activity-companions">
          <span>Con: ${activity.companeros.map(c => c.nombre).join(', ')}</span>
        </div>
      ` : ''}
    </div>
  `;
  
  // Activity actions
  const activityActions = `
    <div class="activity-actions">
      <button class="action-btn applause-btn ${activity.user_applauded ? 'active' : ''}" 
              onclick="toggleApplause(${activity.id})">
        <i class="fas fa-thumbs-up"></i>
        <span class="applause-count">${activity.aplausos_count}</span>
      </button>
      <button class="action-btn comment-btn" onclick="openComments(${activity.id})">
        <i class="fas fa-comment"></i>
        Comentar
      </button>
      <button class="action-btn share-btn" onclick="shareActivity(${activity.id})">
        <i class="fas fa-share"></i>
        Compartir
      </button>
    </div>
  `;
  
  activityCard.innerHTML = activityHeader + activityContent + activityActions;
  return activityCard;
}

// Function to view route
async function viewRoute(gpxUrl, activityId) {
  const routePreview = document.getElementById(`route-preview-${activityId}`);
  if (!routePreview) return;
  
  try {
    // Toggle visibility
    if (routePreview.style.display === 'none') {
      routePreview.style.display = 'block';
      
      // Load and display GPX
      const response = await fetch(gpxUrl);
      const gpxContent = await response.text();
      
      const coordinates = parseGpxCoordinates(gpxContent);
      if (coordinates.length > 0) {
        drawRouteOnCanvas(`route-canvas-${activityId}`, coordinates);
      }
      
      // Update button text
      const btn = document.querySelector(`[onclick="viewRoute('${gpxUrl}', ${activityId})"]`);
      if (btn) btn.textContent = 'Ocultar ruta';
      
    } else {
      routePreview.style.display = 'none';
      
      // Update button text
      const btn = document.querySelector(`[onclick="viewRoute('${gpxUrl}', ${activityId})"]`);
      if (btn) btn.textContent = 'Ver ruta';
    }
    
  } catch (error) {
    console.error('Error loading GPX:', error);
    showMessage('Error al cargar la ruta GPS', 'error');
  }
}

// Parse GPX coordinates (reuse from post.js)
function parseGpxCoordinates(gpxContent) {
  const coordinates = [];
  const trkptRegex = /<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"/g;
  let match;
  
  while ((match = trkptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      coordinates.push({ lat: lat, lon: lon });
    }
  }
  
  return coordinates;
}

// Draw route on canvas (reuse from post.js)
function drawRouteOnCanvas(canvasId, coordinates) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || coordinates.length < 2) return;
  
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = 200;
  
  // Set canvas size
  canvas.width = width;
  canvas.height = height;
  
  // Find bounds
  let minLat = coordinates[0].lat, maxLat = coordinates[0].lat;
  let minLon = coordinates[0].lon, maxLon = coordinates[0].lon;
  
  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.lat);
    maxLat = Math.max(maxLat, coord.lat);
    minLon = Math.min(minLon, coord.lon);
    maxLon = Math.max(maxLon, coord.lon);
  });
  
  const padding = 20;
  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;
  
  // Clear and draw background
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);
  
  // Draw route
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  coordinates.forEach((coord, index) => {
    const x = padding + ((coord.lon - minLon) / lonRange) * (width - 2 * padding);
    const y = height - padding - ((coord.lat - minLat) / latRange) * (height - 2 * padding);
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Draw start point (green)
  const startX = padding + ((coordinates[0].lon - minLon) / lonRange) * (width - 2 * padding);
  const startY = height - padding - ((coordinates[0].lat - minLat) / latRange) * (height - 2 * padding);
  ctx.fillStyle = '#28a745';
  ctx.beginPath();
  ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw end point (red)
  const endCoord = coordinates[coordinates.length - 1];
  const endX = padding + ((endCoord.lon - minLon) / lonRange) * (width - 2 * padding);
  const endY = height - padding - ((endCoord.lat - minLat) / latRange) * (height - 2 * padding);
  ctx.fillStyle = '#dc3545';
  ctx.beginPath();
  ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
  ctx.fill();
}

// Helper function to get activity icon
function getActivityIcon(typeId) {
  const icons = {
    1: 'fa-bicycle',      // Ciclismo en ruta
    2: 'fa-mountain',     // Ciclismo MTB  
    3: 'fa-hiking',       // Senderismo
    4: 'fa-running'       // Carrera
  };
  return icons[typeId] || 'fa-running';
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Hace unos minutos';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });
}

// Make viewRoute function global
window.viewRoute = viewRoute;

// Call initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize follow buttons after other content loads
    setTimeout(initializeFollowButtons, 1000);
});