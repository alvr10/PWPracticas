document.getElementById('profile-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  fetch('/update-profile', {
    method: 'POST',
    body: formData,
  })
    .then(response => response.json())
    .then(data => {
      alert('Profile updated successfully!');
    })
    .catch(error => {
      console.error('Error:', error);
    });
});