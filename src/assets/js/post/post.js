// TODO: Implement AJAX functionality for:
// - Searching friends
// - Uploading GPX file and displaying map preview
// - Uploading images and displaying previews
// - Submitting the form

document.getElementById('companion-search').addEventListener('input', function() {
    const searchTerm = this.value.trim();
    const resultsContainer = document.getElementById('companion-results');
    
    if (searchTerm.length > 2) {
        // TODO: AJAX search for friends
        resultsContainer.style.display = 'block';
        
        // Simulate results
        resultsContainer.innerHTML = `
            <div class="companion-result" data-user-id="1">
                <img src="../../assets/img/default-avatar.jpg" alt="User" class="companion-avatar">
                <span>Amigo 1</span>
            </div>
            <div class="companion-result" data-user-id="2">
                <img src="../../assets/img/default-avatar.jpg" alt="User" class="companion-avatar">
                <span>Amigo 2</span>
            </div>
        `;
    } else {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
});

// Handle companion selection
document.addEventListener('click', function(e) {
    if (e.target.closest('.companion-result')) {
        const result = e.target.closest('.companion-result');
        const userId = result.getAttribute('data-user-id');
        const userName = result.querySelector('span').textContent;
        const userAvatar = result.querySelector('img').src;
        
        addCompanion(userId, userName, userAvatar);
        
        // Clear search
        document.getElementById('companion-search').value = '';
        document.getElementById('companion-results').style.display = 'none';
        document.getElementById('companion-results').innerHTML = '';
    }
    
    if (e.target.closest('.remove-companion')) {
        const companion = e.target.closest('.selected-companion');
        companion.remove();
    }
    
    if (e.target.closest('.remove-image')) {
        const imagePreview = e.target.closest('.image-preview');
        imagePreview.remove();
    }
});

// Handle image upload
document.getElementById('activity-images').addEventListener('change', function() {
    const files = this.files;
    const previewContainer = document.getElementById('image-preview-container');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.match('image.*')) continue;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="remove-image"><i class="fas fa-times"></i></div>
            `;
            previewContainer.appendChild(preview);
        };
        reader.readAsDataURL(file);
    }
});

// Form submission
document.getElementById('activity-form').addEventListener('submit', function(e) {
    e.preventDefault();
    // TODO: Implement form submission
    alert('Actividad publicada con éxito!');
    window.location.href = '../feed/feed.html';
});

// Helper function to add companion
function addCompanion(id, name, avatar) {
    const container = document.getElementById('selected-companions');
    
    // Check if already added
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