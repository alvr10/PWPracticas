<?php
// Script para procesar el inicio de sesión

// Verificar que sea una petición POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response = [
        'success' => false,
        'errors' => ["Método no permitido"]
    ];
    
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// Incluir necesario
require_once __DIR__ . '/auth.php';

// Obtener datos del formulario
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$remember = isset($_POST['remember']) ? (bool)$_POST['remember'] : false;

// Crear instancia de Auth
$auth = new Auth();

// Intentar login
$result = $auth->login($email, $password);

// Si el login es exitoso y se seleccionó "recordarme"
if ($result['success'] && $remember) {
    // Configurar una cookie que dure 30 días
    $expiry = time() + (30 * 24 * 60 * 60);
    setcookie('remember_login', base64_encode($email), $expiry, '/', '', false, true);
}

// Devolver resultado como JSON
header('Content-Type: application/json');
echo json_encode($result);
exit;
?>