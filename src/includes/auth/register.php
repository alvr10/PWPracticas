<?php
// Script para procesar el registro de usuarios

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
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$confirm_password = isset($_POST['confirm-password']) ? $_POST['confirm-password'] : '';

// Crear instancia de Auth
$auth = new Auth();

// Intentar registro
$result = $auth->register($username, $email, $password, $confirm_password);

// Devolver resultado como JSON
header('Content-Type: application/json');
echo json_encode($result);
exit;
?>