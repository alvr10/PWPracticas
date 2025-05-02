document.addEventListener('DOMContentLoaded', function() {
  // Inicializar el formulario de registro
  initRegisterForm();
  
  // Cargar países al cargar la página
  cargarPaises();
  
  // Event listeners para selects dependientes
  document.getElementById('pais').addEventListener('change', function() {
    cargarProvincias(this.value);
  });
  
  document.getElementById('provincia').addEventListener('change', function() {
    cargarLocalidades(this.value);
  });
});

function cargarPaises() {
  // Aquí iría una llamada AJAX para cargar países desde la base de datos
  // Ejemplo simplificado:
  const paises = [
    {id: 1, nombre: 'España'},
    {id: 2, nombre: 'Portugal'},
    {id: 3, nombre: 'Francia'}
  ];
  
  const selectPais = document.getElementById('pais');
  paises.forEach(pais => {
    const option = document.createElement('option');
    option.value = pais.id;
    option.textContent = pais.nombre;
    selectPais.appendChild(option);
  });
}

function cargarProvincias(paisId) {
  const selectProvincia = document.getElementById('provincia');
  selectProvincia.innerHTML = '<option value="">Selecciona una provincia</option>';
  selectProvincia.disabled = false;
  
  // Ejemplo simplificado:
  const provincias = [
    {id: 1, nombre: 'Madrid', pais_id: 1},
    {id: 2, nombre: 'Barcelona', pais_id: 1},
    {id: 3, nombre: 'Lisboa', pais_id: 2}
  ];
  
  const provinciasFiltradas = provincias.filter(p => p.pais_id == paisId);
  
  provinciasFiltradas.forEach(provincia => {
    const option = document.createElement('option');
    option.value = provincia.id;
    option.textContent = provincia.nombre;
    selectProvincia.appendChild(option);
  });
  
  // Resetear localidad
  document.getElementById('localidad').innerHTML = '<option value="">Primero selecciona una provincia</option>';
  document.getElementById('localidad').disabled = true;
}

function cargarLocalidades(provinciaId) {
  const selectLocalidad = document.getElementById('localidad');
  selectLocalidad.innerHTML = '<option value="">Selecciona una localidad</option>';
  selectLocalidad.disabled = false;
  
  // Ejemplo simplificado:
  const localidades = [
    {id: 1, nombre: 'Madrid', provincia_id: 1},
    {id: 2, nombre: 'Alcalá de Henares', provincia_id: 1},
    {id: 3, nombre: 'Barcelona', provincia_id: 2},
    {id: 4, nombre: 'Hospitalet', provincia_id: 2}
  ];
  
  const localidadesFiltradas = localidades.filter(l => l.provincia_id == provinciaId);
  
  localidadesFiltradas.forEach(localidad => {
    const option = document.createElement('option');
    option.value = localidad.id;
    option.textContent = localidad.nombre;
    selectLocalidad.appendChild(option);
  });
}