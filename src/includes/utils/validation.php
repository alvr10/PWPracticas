<?php
// Clase para validación de datos

class Validation {
    /**
     * Validar nombre de usuario
     * 
     * @param string $username Nombre de usuario
     * @return bool
     */
    public function validateUsername($username) {
        // Nombre de usuario debe tener entre 3 y 50 caracteres alfanuméricos
        return !empty($username) && preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username);
    }
    
    /**
     * Validar correo electrónico
     * 
     * @param string $email Correo electrónico
     * @return bool
     */
    public function validateEmail($email) {
        return !empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL);
    }
    
    /**
     * Validar contraseña
     * 
     * @param string $password Contraseña
     * @return bool
     */
    public function validatePassword($password) {
        // Contraseña debe tener al menos 6 caracteres
        return !empty($password) && strlen($password) >= 6;
    }
    
    /**
     * Sanitizar entrada de texto
     * 
     * @param string $data Datos a sanitizar
     * @return string
     */
    public function sanitizeInput($data) {
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data);
        return $data;
    }
    
    /**
     * Validar token CSRF
     * 
     * @param string $token Token a validar
     * @return bool
     */
    public function validateCSRFToken($token) {
        session_start();
        return isset($_SESSION['csrf_token']) && $_SESSION['csrf_token'] === $token;
    }
    
    /**
     * Generar token CSRF
     * 
     * @return string
     */
    public function generateCSRFToken() {
        session_start();
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        return $token;
    }
}
?>