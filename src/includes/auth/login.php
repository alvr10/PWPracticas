<?php
// src/includes/auth/login.php

// Permitir peticiones desde cualquier origen (solo para desarrollo)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Incluir el archivo de autenticación
require_once 'auth.php';

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
    exit;
}

// Obtener datos del cuerpo de la solicitud
$data = json_decode(file_get_contents('php://input'), true);

// Verificar si los datos requeridos están presentes
if (!isset($data['email']) || !isset($data['password'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Datos incompletos'
    ]);
    exit;
}

// Procesar el inicio de sesión
$auth = new Auth();
$result = $auth->login(
    $data['email'],
    $data['password'],
    isset($data['remember']) ? $data['remember'] : false
);

// Devolver resultado
echo json_encode($result);
?>