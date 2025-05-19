<?php
// includes/utils/helpers.php
// Funciones de ayuda para el proyecto

/**
 * Redirecciona a una URL específica
 * @param string $path La ruta a redireccionar
 */
function redirect($path) {
    header("Location: " . BASE_URL . '/' . $path);
    exit;
}

/**
 * Sanitiza entrada de usuario para prevenir XSS
 * @param string $data Los datos a sanitizar
 * @return string Datos sanitizados
 */
function sanitize($data) {
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

/**
 * Genera una URL completa para assets
 * @param string $path Ruta del asset
 * @return string URL completa del asset
 */
function asset($path) {
    return BASE_URL . '/assets/' . ltrim($path, '/');
}
?>