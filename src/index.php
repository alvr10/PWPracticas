<?php
// index.php
// Punto de entrada principal
require_once 'includes/config/config.php';
require_once 'includes/utils/helpers.php';
require_once 'includes/config/database.php'; // Add this to include the database class

// Verificar si hay sesión
session_start();
$isAuthenticated = isset($_SESSION['auth']) && $_SESSION['auth'] === true;

// Ejemplo de cómo usar la conexión a la base de datos
// $db = new Database();
// $conn = $db->connect();
// Ahora $conn contiene tu conexión a la base de datos

// Redirigir según estado de la sesión
if ($isAuthenticated) {
    redirect('modules/dashboard/index.php'); // Changed to .php
} else {
    redirect('auth/login.php'); // Changed to .php
}
?>