document.addEventListener('DOMContentLoaded', function() {
  console.log('Friend profile script loaded');

  const API_BASE_URL = 'http://localhost:8000/src/includes/profile/';
  const FEED_API_URL = 'http://localhost:8000/src/includes/feed/';
  
  // Get user ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user_id');
  
  // Elements
  const loadingSpinner = document.getElementById('loading-spinner');
  const profileContainer = document.getElementById('profile-container');
  const errorPage = document.getElementById('error-page');
  const followBtn = document.getElementById('follow-btn');
  const followBtnText = document.getElementById('follow-btn-text');
  const moreActionsBtn = document.getElementById('more-actions-btn');
  const moreActionsMenu = document.getElementById('more-actions-menu');
  const confirmationModal = document.getElementById('confirmation-modal');
  
  // State
  let currentUser = null;
  let isFollowing = false;
  let activitiesOffset = 0;
  let currentFilter = 'all';
  let hasMoreActivities = true;
  
  // Initialize
  if (!userId) {
    showError();
    return;
  }
  
  loadUserProfile();
  setupEventListeners();
  
  // Event Listeners
  function setupEventListeners() {
    if (followBtn) {
      followBtn.addEventListener('click', toggleFollow);
    }
    
    if (moreActionsBtn) {
      moreActionsBtn.addEventListener('click', toggleMoreActionsMenu);
    }
    
    // Activity filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        setActiveFilter(filter);
        loadActivities(true);
      });
    });
    
    // Load more activities
    const loadMoreBtn = document.getElementById('load-more-activities-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => loadActivities(false));
    }
    
    // Close modals
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', closeModals);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!moreActionsBtn?.contains(e.target) && !moreActionsMenu?.contains(e.target)) {
        if (moreActionsMenu) moreActionsMenu.style.display = 'none';
      }
    });
    
    // Block and report actions
    document.getElementById('block-user-btn')?.addEventListener('click', () => {
      showConfirmation('Bloquear usuario', 
        '¿Estás seguro de que quieres bloquear a este usuario?', 
        () => blockUser());
    });
    
    document.getElementById('report-user-btn')?.addEventListener('click', () => {
      showConfirmation('Reportar usuario', 
        '¿Estás seguro de que quieres reportar a este usuario?', 
        () => reportUser());
    });
  }
  
  // Load user profile data
  async function loadUserProfile() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError();
        return;
      }

      const response = await fetch(`${API_BASE_URL}get_friend_profile.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: token,
          user_id: userId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load profile');
      }
      
      currentUser = data.user;
      isFollowing = data.is_following;
      
      displayProfile(data);
      loadActivities(true);
      loadCommonFriends();
      
      // Hide loading spinner and show profile
      hideLoading();
      
    } catch (error) {
      console.error('Error loading profile:', error);
      showError();
    }
  }
  
  // Display profile information
  function displayProfile(data) {
    const user = data.user;
    const stats = data.stats;
    
    // Basic info
    document.getElementById('profile-name').textContent = `${user.name} ${user.lastname}`;
    document.getElementById('profile-username').textContent = `@${user.username}`;
    document.getElementById('profile-avatar').src = user.avatar_url;
    
    // Location and details
    document.getElementById('profile-location').textContent = user.location || 'No especificada';
    document.getElementById('profile-activity').textContent = user.activity || 'No especificada';
    document.getElementById('profile-join-date').textContent = user.join_date || 'No disponible';
    document.getElementById('profile-last-activity').textContent = user.last_activity || 'Sin actividad';
    
    // Stats
    document.getElementById('total-activities').textContent = stats.total_activities || '0';
    document.getElementById('total-distance').textContent = stats.total_distance || '0';
    document.getElementById('total-friends').textContent = stats.followers_count || '0';
    document.getElementById('total-following').textContent = stats.following_count || '0';
    
    // Follow button state
    updateFollowButton();
    
    // Update page title
    document.title = `${user.name} ${user.lastname} | RunTrackPro`;
    
    // Friend badge
    const friendBadge = document.getElementById('friend-badge');
    if (friendBadge) {
      if (isFollowing) {
        friendBadge.style.display = 'flex';
      } else {
        friendBadge.style.display = 'none';
      }
    }
  }
  
  // Load user activities
  async function loadActivities(reset = false) {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      if (reset) {
        activitiesOffset = 0;
        document.getElementById('activities-list').innerHTML = '';
      }

      const response = await fetch(`${API_BASE_URL}get_friend_activities.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: token,
          user_id: userId,
          offset: activitiesOffset,
          limit: 6,
          filter: currentFilter
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        displayActivities(data.activities, reset);
        hasMoreActivities = data.has_more;
        activitiesOffset += data.activities.length;
        
        // Show/hide load more button
        const loadMoreContainer = document.getElementById('load-more-activities');
        if (loadMoreContainer) {
          loadMoreContainer.style.display = hasMoreActivities ? 'block' : 'none';
        }
      }
      
    } catch (error) {
      console.error('Error loading activities:', error);
      if (reset) {
        document.getElementById('activities-list').innerHTML = 
          '<div class="error-message">Error al cargar actividades</div>';
      }
    }
  }
  
  // Display activities
  function displayActivities(activities, reset) {
    const activitiesList = document.getElementById('activities-list');
    
    if (!activitiesList) return;
    
    if (reset) {
      activitiesList.innerHTML = '';
    }
    
    if (activities.length === 0 && reset) {
      activitiesList.innerHTML = '<div class="no-activities">No hay actividades para mostrar</div>';
      return;
    }
    
    activities.forEach(activity => {
      const activityCard = createActivityCard(activity);
      activitiesList.appendChild(activityCard);
    });
  }
  
  // Create activity card element
  function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.setAttribute('data-activity-id', activity.id);
    
    // Determine activity type and icon
    let activityIcon = 'fa-running';
    let activityClass = 'running';
    
    if (activity.tipo_actividad_nombre.toLowerCase().includes('ciclismo')) {
      activityIcon = 'fa-bicycle';
      activityClass = 'cycling';
    } else if (activity.tipo_actividad_nombre.toLowerCase().includes('senderismo')) {
      activityIcon = 'fa-hiking';
      activityClass = 'hiking';
    }
    
    card.innerHTML = `
      <div class="activity-header">
        <div class="activity-type ${activityClass}">
          <i class="fas ${activityIcon}"></i>
        </div>
        <div class="activity-info">
          <h4 class="activity-title">${activity.titulo}</h4>
          <div class="activity-date">${formatDate(activity.fecha_actividad)}</div>
        </div>
      </div>
      <div class="activity-stats">
        ${activity.distancia ? `<span><i class="fas fa-route"></i> ${activity.distancia} km</span>` : ''}
        ${activity.duracion ? `<span><i class="fas fa-clock"></i> ${activity.duracion}</span>` : ''}
        ${activity.elevacion ? `<span><i class="fas fa-mountain"></i> ${activity.elevacion}m</span>` : ''}
      </div>
      <div class="activity-actions">
        <span class="activity-applause">
          <i class="fas fa-thumbs-up"></i> ${activity.aplausos_count} aplausos
        </span>
      </div>
      ${activity.imagenes && activity.imagenes.length > 0 ? `
        <div class="activity-images-preview">
          ${activity.imagenes.slice(0, 3).map(img => `
            <img src="${img.ruta}" alt="Imagen de actividad" class="activity-image-thumb">
          `).join('')}
          ${activity.imagenes.length > 3 ? `<span class="more-images">+${activity.imagenes.length - 3}</span>` : ''}
        </div>
      ` : ''}
    `;
    
    // Add click event to view activity details
    card.addEventListener('click', () => {
      // For now, just show applause action - you can expand this to show full activity details
      showMessage('Función de detalle de actividad próximamente', 'info');
    });
    
    return card;
  }
  
  // Load common friends
  async function loadCommonFriends() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}get_common_friends.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: token,
          user_id: userId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        displayCommonFriends(data.common_friends);
      }
      
    } catch (error) {
      console.error('Error loading common friends:', error);
    }
  }
  
  // Display common friends
  function displayCommonFriends(friends) {
    const commonFriendsList = document.getElementById('common-friends-list');
    if (!commonFriendsList) return;
    
    if (friends.length === 0) {
      commonFriendsList.innerHTML = '<div class="no-common-friends">Sin amigos en común</div>';
      return;
    }
    
    commonFriendsList.innerHTML = friends.map(friend => `
      <div class="common-friend-item" onclick="viewProfile(${friend.id})">
        <img src="${friend.imagen_perfil || '../../../public/profiles/default-avatar.jpg'}" 
             alt="${friend.nombre}" class="common-friend-avatar">
        <div class="common-friend-info">
          <div class="common-friend-name">${friend.nombre} ${friend.apellidos}</div>
          <div class="common-friend-username">@${friend.username}</div>
        </div>
      </div>
    `).join('');
  }
  
  // Toggle follow/unfollow
  async function toggleFollow() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      followBtn.disabled = true;
      const originalText = followBtnText.textContent;
      followBtnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

      const action = isFollowing ? 'unfollow' : 'follow';

      const response = await fetch(`${FEED_API_URL}follow_user.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: token,
          user_id: parseInt(userId),
          action: action
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        isFollowing = data.is_following;
        updateFollowButton();
        
        // Update followers count
        const followersCount = document.getElementById('total-friends');
        if (followersCount) {
          followersCount.textContent = data.follower_count || '0';
        }
        
        showMessage(data.message, 'success');
      } else {
        throw new Error(data.message);
      }
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      showMessage('Error al procesar la solicitud', 'error');
      followBtnText.textContent = isFollowing ? 'Dejar de seguir' : 'Seguir';
    } finally {
      followBtn.disabled = false;
    }
  }
  
  // Update follow button appearance
  function updateFollowButton() {
    if (!followBtn || !followBtnText) return;
    
    if (isFollowing) {
      followBtn.className = 'btn btn-secondary';
      followBtnText.innerHTML = '<i class="fas fa-user-minus"></i> Dejar de seguir';
    } else {
      followBtn.className = 'btn btn-primary';
      followBtnText.innerHTML = '<i class="fas fa-user-plus"></i> Seguir';
    }
  }
  
  // Set active filter
  function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-filter') === filter) {
        btn.classList.add('active');
      }
    });
  }
  
  // Toggle more actions menu
  function toggleMoreActionsMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!moreActionsMenu) return;
    
    const isVisible = moreActionsMenu.style.display === 'block';
    
    if (isVisible) {
      moreActionsMenu.style.display = 'none';
    } else {
      // Position menu
      const rect = moreActionsBtn.getBoundingClientRect();
      moreActionsMenu.style.position = 'fixed';
      moreActionsMenu.style.top = (rect.bottom + 5) + 'px';
      moreActionsMenu.style.left = (rect.left - 140) + 'px'; // Adjust for menu width
      moreActionsMenu.style.display = 'block';
    }
  }
  
  // Block user
  async function blockUser() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // This would call a block user API endpoint
      showMessage('Usuario bloqueado exitosamente', 'success');
      
      // Redirect back to feed after blocking
      setTimeout(() => {
        window.location.href = '../social/feed.html';
      }, 1500);
      
    } catch (error) {
      console.error('Error blocking user:', error);
      showMessage('Error al bloquear usuario', 'error');
    }
  }
  
  // Report user
  async function reportUser() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // This would call a report user API endpoint
      showMessage('Usuario reportado exitosamente', 'success');
      
    } catch (error) {
      console.error('Error reporting user:', error);
      showMessage('Error al reportar usuario', 'error');
    }
  }
  
  // View another user's profile
  function viewProfile(userId) {
    window.location.href = `friend-profile.html?user_id=${userId}`;
  }
  
  // Show confirmation modal
  function showConfirmation(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const titleEl = document.getElementById('confirmation-title');
    const messageEl = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirm-action-btn');
    
    if (!modal || !titleEl || !messageEl || !confirmBtn) return;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Remove previous event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Add new event listener
    newConfirmBtn.addEventListener('click', () => {
      onConfirm();
      closeModals();
    });
    
    modal.style.display = 'flex';
  }
  
  // Close all modals
  function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
    
    if (moreActionsMenu) {
      moreActionsMenu.style.display = 'none';
    }
  }
  
  // Show loading state
  function showLoading() {
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (profileContainer) profileContainer.style.display = 'none';
    if (errorPage) errorPage.style.display = 'none';
  }
  
  // Hide loading state
  function hideLoading() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'block';
    if (errorPage) errorPage.style.display = 'none';
  }
  
  // Show error page
  function showError() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'none';
    if (errorPage) errorPage.style.display = 'flex';
  }
  
  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  }
  
  // Show message
  function showMessage(message, type) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `alert alert-${type}`;
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
  
  // Make functions globally available
  window.viewProfile = viewProfile;
});