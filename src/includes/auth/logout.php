<?php
// Script para cerrar sesión

// Incluir necesario
require_once __DIR__ . '/auth.php';

// Crear instancia de Auth
$auth = new Auth();

// Cerrar sesión
$result = $auth->logout();

// Eliminar posibles cookies de recordar
if (isset($_COOKIE['remember_login'])) {
    setcookie('remember_login', '', time() - 3600, '/');
}

// Verificar si es una petición AJAX
$isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
          strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest';

if ($isAjax) {
    // Devolver resultado como JSON si es AJAX
    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
} else {
    // Redirigir al login si no es AJAX
    header("Location: " . BASE_URL . "/auth/login.html");
    exit;
}
?>