<?php
// Punto de entrada principal
require_once 'includes/config/config.php';
require_once 'includes/utils/helpers.php';

// Verificar si hay sesión
session_start();
$isAuthenticated = isset($_SESSION['auth']) && $_SESSION['auth'] === true;

// Redirigir según estado de la sesión
if ($isAuthenticated) {
    redirect('modules/dashboard/index.html');
} else {
    redirect('auth/login.html');
}
?>