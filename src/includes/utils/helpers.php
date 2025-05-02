<?php
// Funciones auxiliares para el proyecto

/**
 * Redirigir a una URL
 * 
 * @param string $url URL de destino
 */
function redirect($url) {
    header("Location: " . $url);
    exit;
}

/**
 * Generar una URL completa
 * 
 * @param string $path Ruta relativa
 * @return string URL completa
 */
function url($path = '') {
    return BASE_URL . '/' . ltrim($path, '/');
}

/**
 * Verificar si el usuario está autenticado
 * 
 * @return bool
 */
function isAuthenticated() {
    require_once AUTH_PATH . '/auth.php';
    $auth = new Auth();
    return $auth->isAuthenticated();
}

/**
 * Verificar si el usuario tiene un rol específico
 * 
 * @param string $role Rol a verificar
 * @return bool
 */
function hasRole($role) {
    require_once AUTH_PATH . '/auth.php';
    $auth = new Auth();
    return $auth->hasRole($role);
}

/**
 * Obtener datos del usuario actual
 * 
 * @return array|null Datos del usuario o null si no está autenticado
 */
function getCurrentUser() {
    session_start();
    if (isset($_SESSION['auth']) && $_SESSION['auth'] === true) {
        return [
            'id' => $_SESSION['usuario_id'],
            'username' => $_SESSION['username'],
            'email' => $_SESSION['email'],
            'rol' => $_SESSION['rol']
        ];
    }
    return null;
}

/**
 * Generar una cadena aleatoria
 * 
 * @param int $length Longitud de la cadena
 * @return string Cadena aleatoria
 */
function generateRandomString($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Formatear fecha y hora
 * 
 * @param string $datetime Fecha y hora en formato MySQL
 * @param string $format Formato deseado
 * @return string Fecha formateada
 */
function formatDateTime($datetime, $format = 'd/m/Y H:i') {
    $date = new DateTime($datetime);
    return $date->format($format);
}

/**
 * Mostrar mensaje de éxito o error
 * 
 * @param array $data Datos con 'success' y 'message' o 'errors'
 * @return string HTML con el mensaje
 */
function showMessage($data) {
    if (!isset($data['success'])) {
        return '';
    }
    
    if ($data['success']) {
        $html = '<div class="success-container">';
        $html .= '<p class="success-msg">' . htmlspecialchars($data['message']) . '</p>';
        $html .= '</div>';
    } else {
        $html = '<div class="error-container">';
        if (isset($data['errors']) && is_array($data['errors'])) {
            foreach ($data['errors'] as $error) {
                $html .= '<p class="error-msg">' . htmlspecialchars($error) . '</p>';
            }
        }
        $html .= '</div>';
    }
    
    return $html;
}
?>