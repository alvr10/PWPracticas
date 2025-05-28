// Admin Panel JavaScript - FIXED VERSION
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel loaded');

    const API_BASE_URL = 'http://localhost:8000/src/includes/admin/';
    
    // State
    let currentSection = 'auxiliary-data';
    let currentDataType = 'activity-types';
    let currentPage = 1;
    let totalPages = 1;
    let currentEditingItem = null;
    let authToken = localStorage.getItem('auth_token');

    // Check admin permissions first
    checkAdminPermissions();

    // Initialize
    initializeEventListeners();
    loadSection(currentSection);

    // Check if user is admin
    async function checkAdminPermissions() {
        try {
            if (!authToken) {
                redirectToLogin();
                return;
            }

            const response = await fetch(`${API_BASE_URL}check_admin.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: authToken })
            });

            const data = await response.json();
            
            if (!data.success || !data.is_admin) {
                showError('No tienes permisos de administrador');
                setTimeout(() => {
                    window.location.href = '../social/feed.html';
                }, 2000);
                return;
            }

        } catch (error) {
            console.error('Error checking admin permissions:', error);
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        window.location.href = '../../auth/login.html';
    }

    // Initialize event listeners
    function initializeEventListeners() {
        // Section navigation
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                switchSection(section);
            });
        });

        // Data type selector
        document.querySelectorAll('.data-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dataType = btn.dataset.type;
                switchDataType(dataType);
            });
        });

        // Add buttons
        document.getElementById('add-activity-type')?.addEventListener('click', () => openAddModal('activity-types'));
        document.getElementById('add-country')?.addEventListener('click', () => openAddModal('countries'));
        document.getElementById('add-province')?.addEventListener('click', () => openAddModal('provinces'));
        document.getElementById('add-city')?.addEventListener('click', () => openAddModal('cities'));

        // Search functionality
        document.getElementById('search-users-btn')?.addEventListener('click', searchUsers);
        document.getElementById('user-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchUsers();
        });

        document.getElementById('search-activities-btn')?.addEventListener('click', searchActivities);
        document.getElementById('activity-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchActivities();
        });

        // Filter changes
        document.getElementById('activity-type-filter')?.addEventListener('change', searchActivities);
        document.getElementById('date-filter')?.addEventListener('change', searchActivities);

        // Pagination
        document.getElementById('prev-page')?.addEventListener('click', () => changePage(currentPage - 1));
        document.getElementById('next-page')?.addEventListener('click', () => changePage(currentPage + 1));
        document.getElementById('activity-prev-page')?.addEventListener('click', () => changeActivityPage(currentPage - 1));
        document.getElementById('activity-next-page')?.addEventListener('click', () => changeActivityPage(currentPage + 1));

        // Modal controls
        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        // Form submissions
        document.getElementById('add-edit-form')?.addEventListener('submit', saveItem);
        document.getElementById('user-edit-form')?.addEventListener('submit', saveUser);

        // User actions
        document.getElementById('deactivate-user-btn')?.addEventListener('click', deactivateUser);

        // Confirmation modal
        document.getElementById('confirm-action-btn')?.addEventListener('click', executeConfirmedAction);

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModals();
            }
        });
    }

    // Section switching
    function switchSection(section) {
        // Update navigation
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        currentSection = section;
        loadSection(section);
    }

    // Data type switching
    function switchDataType(dataType) {
        // Update buttons
        document.querySelectorAll('.data-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${dataType}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.data-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${dataType}-content`).classList.add('active');

        currentDataType = dataType;
        loadDataType(dataType);
    }

    // Load section data
    async function loadSection(section) {
        switch (section) {
            case 'auxiliary-data':
                loadDataType(currentDataType);
                break;
            case 'users':
                loadUsers();
                break;
            case 'activities':
                loadActivities();
                loadActivityTypes(); // For filter
                break;
        }
    }

    // Load data type
    async function loadDataType(dataType) {
        try {
            showLoading(`${dataType}-table`);
            
            const response = await fetch(`${API_BASE_URL}get_auxiliary_data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    type: dataType 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error loading data');
            }

            renderDataTable(dataType, data.data);

        } catch (error) {
            console.error('Error loading data type:', error);
            showError('Error al cargar los datos: ' + error.message);
        }
    }

    // Render data table
    function renderDataTable(dataType, data) {
        const tableBody = document.querySelector(`#${dataType}-table tbody`);
        if (!tableBody) return;

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h3>No hay datos</h3>
                            <p>No se encontraron elementos para mostrar</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            switch (dataType) {
                case 'activity-types':
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.nombre}</td>
                            <td class="actions">
                                <button class="btn btn-secondary" onclick="editItem('${dataType}', ${item.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-danger" onclick="deleteItem('${dataType}', ${item.id}, '${item.nombre}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                case 'countries':
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.nombre}</td>
                            <td class="actions">
                                <button class="btn btn-secondary" onclick="editItem('${dataType}', ${item.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-danger" onclick="deleteItem('${dataType}', ${item.id}, '${item.nombre}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                case 'provinces':
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.nombre}</td>
                            <td>${item.pais_nombre}</td>
                            <td class="actions">
                                <button class="btn btn-secondary" onclick="editItem('${dataType}', ${item.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-danger" onclick="deleteItem('${dataType}', ${item.id}, '${item.nombre}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                case 'cities':
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.nombre}</td>
                            <td>${item.provincia_nombre}</td>
                            <td>${item.pais_nombre}</td>
                            <td class="actions">
                                <button class="btn btn-secondary" onclick="editItem('${dataType}', ${item.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-danger" onclick="deleteItem('${dataType}', ${item.id}, '${item.nombre}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                default:
                    return '';
            }
        }).join('');
    }

    // Load users
    async function loadUsers(page = 1, search = '') {
        try {
            showLoading('users-table');
            
            const response = await fetch(`${API_BASE_URL}get_users.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    page: page,
                    search: search 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error loading users');
            }

            renderUsersTable(data.users);
            updatePagination(data.pagination);

        } catch (error) {
            console.error('Error loading users:', error);
            showError('Error al cargar usuarios: ' + error.message);
        }
    }

    // Render users table
    function renderUsersTable(users) {
        const tableBody = document.querySelector('#users-table tbody');
        if (!tableBody) return;

        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>No se encontraron usuarios</h3>
                            <p>Intenta ajustar los criterios de búsqueda</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <img src="${user.avatar_url || '../../../public/profiles/default-avatar.jpg'}" 
                         alt="Avatar" class="user-avatar">
                </td>
                <td>${user.nombre} ${user.apellidos}</td>
                <td>${user.email}</td>
                <td>@${user.username}</td>
                <td>${formatDate(user.fecha_alta)}</td>
                <td>
                    <span class="user-status ${user.fecha_baja ? 'inactive' : 'active'}">
                        ${user.fecha_baja ? 'Inactivo' : 'Activo'}
                    </span>
                </td>
                <td>${user.rol_nombre}</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${!user.fecha_baja ? `
                        <button class="btn btn-warning" onclick="deactivateUserConfirm(${user.id}, '${user.nombre} ${user.apellidos}')">
                            <i class="fas fa-user-slash"></i> Dar de baja
                        </button>
                    ` : `
                        <button class="btn btn-success" onclick="reactivateUser(${user.id})">
                            <i class="fas fa-user-check"></i> Reactivar
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    }

    // Load activities
    async function loadActivities(page = 1, search = '', filters = {}) {
        try {
            showLoading('activities-table');
            
            const response = await fetch(`${API_BASE_URL}get_activities.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    page: page,
                    search: search,
                    filters: filters
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error loading activities');
            }

            renderActivitiesTable(data.activities);
            updateActivityPagination(data.pagination);

        } catch (error) {
            console.error('Error loading activities:', error);
            showError('Error al cargar actividades: ' + error.message);
        }
    }

    // Render activities table
    function renderActivitiesTable(activities) {
        const tableBody = document.querySelector('#activities-table tbody');
        if (!tableBody) return;

        if (activities.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-running"></i>
                            <h3>No se encontraron actividades</h3>
                            <p>Intenta ajustar los criterios de búsqueda</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = activities.map(activity => `
            <tr>
                <td>${activity.id}</td>
                <td>${activity.titulo}</td>
                <td>${activity.usuario_nombre} ${activity.usuario_apellidos}</td>
                <td>${activity.tipo_actividad}</td>
                <td>${formatDate(activity.fecha_actividad)}</td>
                <td>
                    ${activity.imagenes.length > 0 ? `
                        <div class="activity-images">
                            ${activity.imagenes.slice(0, 3).map(img => `
                                <img src="${img.ruta}" alt="Imagen" class="activity-image-thumb" 
                                     onclick="viewActivityImages(${activity.id})">
                            `).join('')}
                            ${activity.imagenes.length > 3 ? `
                                <span class="images-count">+${activity.imagenes.length - 3}</span>
                            ` : ''}
                        </div>
                    ` : '<span class="text-muted">Sin imágenes</span>'}
                </td>
                <td>${activity.aplausos_count}</td>
                <td class="actions">
                    ${activity.imagenes.length > 0 ? `
                        <button class="btn btn-secondary" onclick="viewActivityImages(${activity.id})">
                            <i class="fas fa-images"></i> Ver imágenes
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteActivity(${activity.id}, '${activity.titulo}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Load activity types for filter
    async function loadActivityTypes() {
        try {
            const response = await fetch(`${API_BASE_URL}get_auxiliary_data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    type: 'activity-types' 
                })
            });

            const data = await response.json();
            if (data.success) {
                const filter = document.getElementById('activity-type-filter');
                if (filter) {
                    filter.innerHTML = `
                        <option value="">Todos los tipos</option>
                        ${data.data.map(type => `
                            <option value="${type.id}">${type.nombre}</option>
                        `).join('')}
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading activity types:', error);
        }
    }

    // Modal functions
    function openAddModal(dataType) {
        const modal = document.getElementById('add-edit-modal');
        const title = document.getElementById('modal-title');
        const formFields = document.getElementById('form-fields');
        
        currentEditingItem = null;
        
        // Set title
        const titles = {
            'activity-types': 'Agregar Tipo de Actividad',
            'countries': 'Agregar País',
            'provinces': 'Agregar Provincia',
            'cities': 'Agregar Localidad'
        };
        title.textContent = titles[dataType];
        
        // Generate form fields
        generateFormFields(dataType, formFields);
        
        modal.style.display = 'block';
    }

    // Generate form fields based on data type
    async function generateFormFields(dataType, container, editData = null) {
        let fieldsHTML = '';
        
        switch (dataType) {
            case 'activity-types':
            case 'countries':
                fieldsHTML = `
                    <div class="form-group">
                        <label for="item-name">Nombre</label>
                        <input type="text" id="item-name" required value="${editData?.nombre || ''}">
                    </div>
                `;
                break;
                
            case 'provinces':
                const countries = await getCountries();
                fieldsHTML = `
                    <div class="form-group">
                        <label for="item-name">Nombre</label>
                        <input type="text" id="item-name" required value="${editData?.nombre || ''}">
                    </div>
                    <div class="form-group">
                        <label for="item-country">País</label>
                        <select id="item-country" required>
                            <option value="">Selecciona un país</option>
                            ${countries.map(country => `
                                <option value="${country.id}" ${editData?.pais_id == country.id ? 'selected' : ''}>
                                    ${country.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
                break;
                
            case 'cities':
                const allCountries = await getCountries();
                fieldsHTML = `
                    <div class="form-group">
                        <label for="item-name">Nombre</label>
                        <input type="text" id="item-name" required value="${editData?.nombre || ''}">
                    </div>
                    <div class="form-group">
                        <label for="item-country">País</label>
                        <select id="item-country" required>
                            <option value="">Selecciona un país</option>
                            ${allCountries.map(country => `
                                <option value="${country.id}" ${editData?.pais_id == country.id ? 'selected' : ''}>
                                    ${country.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="item-province">Provincia</label>
                        <select id="item-province" required disabled>
                            <option value="">Primero selecciona un país</option>
                        </select>
                    </div>
                `;
                
                // Set up AJAX for province loading
                setTimeout(() => {
                    const countrySelect = document.getElementById('item-country');
                    const provinceSelect = document.getElementById('item-province');
                    
                    countrySelect.addEventListener('change', async function() {
                        const countryId = this.value;
                        if (countryId) {
                            const provinces = await getProvincesByCountry(countryId);
                            provinceSelect.innerHTML = `
                                <option value="">Selecciona una provincia</option>
                                ${provinces.map(province => `
                                    <option value="${province.id}" ${editData?.provincia_id == province.id ? 'selected' : ''}>
                                        ${province.nombre}
                                    </option>
                                `).join('')}
                            `;
                            provinceSelect.disabled = false;
                        } else {
                            provinceSelect.innerHTML = '<option value="">Primero selecciona un país</option>';
                            provinceSelect.disabled = true;
                        }
                    });
                    
                    // Trigger change if editing and country is already selected
                    if (editData?.pais_id) {
                        countrySelect.dispatchEvent(new Event('change'));
                    }
                }, 100);
                break;
        }
        
        container.innerHTML = fieldsHTML;
    }

    // Get countries for dropdowns
    async function getCountries() {
        try {
            const response = await fetch(`${API_BASE_URL}get_auxiliary_data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    type: 'countries' 
                })
            });

            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting countries:', error);
            return [];
        }
    }

    // Get provinces by country
    async function getProvincesByCountry(countryId) {
        try {
            const response = await fetch(`${API_BASE_URL}get_provinces_by_country.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    country_id: countryId 
                })
            });

            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting provinces:', error);
            return [];
        }
    }

    // Save item (add/edit)
    async function saveItem(e) {
        e.preventDefault();
        
        try {
            const itemName = document.getElementById('item-name').value;
            const itemCountry = document.getElementById('item-country')?.value;
            const itemProvince = document.getElementById('item-province')?.value;
            
            const itemData = {
                token: authToken,
                type: currentDataType,
                name: itemName
            };
            
            // Add specific fields based on type
            if (currentDataType === 'provinces' && itemCountry) {
                itemData.country_id = itemCountry;
            } else if (currentDataType === 'cities' && itemCountry && itemProvince) {
                itemData.country_id = itemCountry;
                itemData.province_id = itemProvince;
            }
            
            // Add ID if editing
            if (currentEditingItem) {
                itemData.id = currentEditingItem.id;
            }
            
            const endpoint = currentEditingItem ? 'update_auxiliary_data.php' : 'create_auxiliary_data.php';
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error saving item');
            }
            
            showSuccess(currentEditingItem ? 'Elemento actualizado correctamente' : 'Elemento creado correctamente');
            closeModals();
            loadDataType(currentDataType);
            
        } catch (error) {
            console.error('Error saving item:', error);
            showError('Error al guardar: ' + error.message);
        }
    }

    // User management functions
    function searchUsers() {
        const search = document.getElementById('user-search').value;
        currentPage = 1;
        loadUsers(currentPage, search);
    }

    function searchActivities() {
        const search = document.getElementById('activity-search').value;
        const typeFilter = document.getElementById('activity-type-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        
        const filters = {};
        if (typeFilter) filters.type = typeFilter;
        if (dateFilter) filters.date = dateFilter;
        
        currentPage = 1;
        loadActivities(currentPage, search, filters);
    }

    // Deactivate user (fixed function)
    async function deactivateUser() {
        if (!currentEditingItem) return;
        
        showConfirmation(
            `¿Estás seguro de que quieres dar de baja a "${currentEditingItem.nombre} ${currentEditingItem.apellidos}"?`,
            () => executeDeactivateUser(currentEditingItem.id)
        );
    }

    // Pagination functions
    function changePage(page) {
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        const search = document.getElementById('user-search').value;
        loadUsers(currentPage, search);
    }

    function changeActivityPage(page) {
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        searchActivities();
    }

    function updatePagination(pagination) {
        currentPage = pagination.current_page;
        totalPages = pagination.total_pages;
        
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
    }

    function updateActivityPagination(pagination) {
        currentPage = pagination.current_page;
        totalPages = pagination.total_pages;
        
        document.getElementById('activity-current-page').textContent = currentPage;
        document.getElementById('activity-total-pages').textContent = totalPages;
        
        const prevBtn = document.getElementById('activity-prev-page');
        const nextBtn = document.getElementById('activity-next-page');
        
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
    }

    // Modal functions
    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        currentEditingItem = null;
    }

    function showConfirmation(message, onConfirm) {
        document.getElementById('confirmation-message').textContent = message;
        document.getElementById('confirmation-modal').style.display = 'block';
        
        // Store the callback
        window.pendingConfirmAction = onConfirm;
    }

    function executeConfirmedAction() {
        if (window.pendingConfirmAction) {
            window.pendingConfirmAction();
            window.pendingConfirmAction = null;
        }
        closeModals();
    }

    // Utility functions
    function showLoading(tableId) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center">
                        <div class="loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            Cargando...
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Global functions that need to be accessible from onclick handlers
    window.editItem = async function(dataType, itemId) {
        try {
            const response = await fetch(`${API_BASE_URL}get_auxiliary_item.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    type: dataType,
                    id: itemId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error loading item');
            }
            
            currentEditingItem = data.item;
            
            const modal = document.getElementById('add-edit-modal');
            const title = document.getElementById('modal-title');
            const formFields = document.getElementById('form-fields');
            
            // Set title
            const titles = {
                'activity-types': 'Editar Tipo de Actividad',
                'countries': 'Editar País',
                'provinces': 'Editar Provincia',
                'cities': 'Editar Localidad'
            };
            title.textContent = titles[dataType];
            
            // Generate form fields with data
            await generateFormFields(dataType, formFields, data.item);
            
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error editing item:', error);
            showError('Error al cargar elemento: ' + error.message);
        }
    };

    window.deleteItem = function(dataType, itemId, itemName) {
        showConfirmation(
            `¿Estás seguro de que quieres eliminar "${itemName}"?`,
            () => executeDeleteItem(dataType, itemId)
        );
    };

    async function executeDeleteItem(dataType, itemId) {
        try {
            const response = await fetch(`${API_BASE_URL}delete_auxiliary_data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    type: dataType,
                    id: itemId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error deleting item');
            }
            
            showSuccess('Elemento eliminado correctamente');
            loadDataType(currentDataType);
            
        } catch (error) {
            console.error('Error deleting item:', error);
            showError('Error al eliminar: ' + error.message);
        }
    }

    window.editUser = async function(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}get_user.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    user_id: userId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error loading user');
            }
            
            const user = data.user;
            
            // Fill form
            document.getElementById('edit-user-name').value = user.nombre;
            document.getElementById('edit-user-lastname').value = user.apellidos;
            document.getElementById('edit-user-email').value = user.email;
            document.getElementById('edit-user-username').value = user.username;
            document.getElementById('edit-user-role').value = user.rol_id;
            document.getElementById('edit-user-status').value = user.fecha_baja ? 'inactive' : 'active';
            
            currentEditingItem = user;
            document.getElementById('user-edit-modal').style.display = 'block';
            
        } catch (error) {
            console.error('Error editing user:', error);
            showError('Error al cargar usuario: ' + error.message);
        }
    };

    async function saveUser(e) {
        e.preventDefault();
        
        try {
            const userData = {
                token: authToken,
                user_id: currentEditingItem.id,
                nombre: document.getElementById('edit-user-name').value,
                apellidos: document.getElementById('edit-user-lastname').value,
                email: document.getElementById('edit-user-email').value,
                username: document.getElementById('edit-user-username').value,
                rol_id: document.getElementById('edit-user-role').value,
                status: document.getElementById('edit-user-status').value
            };
            
            const response = await fetch(`${API_BASE_URL}update_user.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error updating user');
            }
            
            showSuccess('Usuario actualizado correctamente');
            closeModals();
            loadUsers(currentPage, document.getElementById('user-search').value);
            
        } catch (error) {
            console.error('Error saving user:', error);
            showError('Error al guardar usuario: ' + error.message);
        }
    }

    window.deactivateUserConfirm = function(userId, userName) {
        showConfirmation(
            `¿Estás seguro de que quieres dar de baja a "${userName}"?`,
            () => executeDeactivateUser(userId)
        );
    };

    async function executeDeactivateUser(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}deactivate_user.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    user_id: userId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error deactivating user');
            }
            
            showSuccess('Usuario dado de baja correctamente');
            loadUsers(currentPage, document.getElementById('user-search').value);
            
        } catch (error) {
            console.error('Error deactivating user:', error);
            showError('Error al dar de baja: ' + error.message);
        }
    }

    window.reactivateUser = async function(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}reactivate_user.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    user_id: userId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error reactivating user');
            }
            
            showSuccess('Usuario reactivado correctamente');
            loadUsers(currentPage, document.getElementById('user-search').value);
            
        } catch (error) {
            console.error('Error reactivating user:', error);
            showError('Error al reactivar usuario: ' + error.message);
        }
    };

    window.viewActivityImages = async function(activityId) {
        try {
            const response = await fetch(`${API_BASE_URL}get_activity_images.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    activity_id: activityId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error loading images');
            }
            
            const gallery = document.getElementById('image-gallery');
            gallery.innerHTML = data.images.map(image => `
                <div class="image-item">
                    <img src="${image.ruta}" alt="Imagen de actividad">
                    <div class="image-actions">
                        <button class="btn btn-danger" onclick="deleteImage(${image.id}, ${activityId})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('image-gallery-modal').style.display = 'block';
            
        } catch (error) {
            console.error('Error viewing images:', error);
            showError('Error al cargar imágenes: ' + error.message);
        }
    };

    window.deleteImage = function(imageId, activityId) {
        showConfirmation(
            '¿Estás seguro de que quieres eliminar esta imagen?',
            () => executeDeleteImage(imageId, activityId)
        );
    };

    async function executeDeleteImage(imageId, activityId) {
        try {
            const response = await fetch(`${API_BASE_URL}delete_image.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    image_id: imageId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error deleting image');
            }
            
            showSuccess('Imagen eliminada correctamente');
            // Refresh the image gallery
            viewActivityImages(activityId);
            // Refresh activities table
            searchActivities();
            
        } catch (error) {
            console.error('Error deleting image:', error);
            showError('Error al eliminar imagen: ' + error.message);
        }
    }

    window.deleteActivity = function(activityId, activityTitle) {
        showConfirmation(
            `¿Estás seguro de que quieres eliminar la actividad "${activityTitle}"?`,
            () => executeDeleteActivity(activityId)
        );
    };

    async function executeDeleteActivity(activityId) {
        try {
            const response = await fetch(`${API_BASE_URL}delete_activity.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    token: authToken,
                    activity_id: activityId 
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error deleting activity');
            }
            
            showSuccess('Actividad eliminada correctamente');
            searchActivities();
            
        } catch (error) {
            console.error('Error deleting activity:', error);
            showError('Error al eliminar actividad: ' + error.message);
        }
    }
});