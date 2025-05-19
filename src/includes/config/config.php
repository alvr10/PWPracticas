<?php
// includes/config/config.php
// Configuración general del proyecto
define('BASE_URL', 'http://localhost/proyecto');
define('PROJECT_NAME', 'RunTrackPro');

// Configuración de sesiones
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => false, // Cambiar a true en producción con HTTPS
    'httponly' => true,
    'samesite' => 'Strict'
]);

// Zona horaria
date_default_timezone_set('Europe/Madrid');

// Configuración de errores
ini_set('display_errors', 1); // Cambiar a 0 en producción
ini_set('display_startup_errors', 1); // Cambiar a 0 en producción
error_reporting(E_ALL);

// Rutas de archivos
define('ROOT_PATH', realpath(dirname(__FILE__) . '/../../'));
define('INCLUDES_PATH', ROOT_PATH . '/includes/');
define('AUTH_PATH', INCLUDES_PATH . '/auth/');
define('TEMPLATES_PATH', INCLUDES_PATH . '/templates/');
define('UTILS_PATH', INCLUDES_PATH . '/utils/');

// Duración de tokens (para recuperación de contraseña, etc.)
define('TOKEN_EXPIRY', 24 * 60 * 60); // 24 horas en segundos
?>