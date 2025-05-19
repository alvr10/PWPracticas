<?php
// src/includes/auth/check_session.php

// Permitir peticiones desde cualquier origen (solo para desarrollo)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Incluir el archivo de autenticación
require_once 'auth.php';

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'valid' => false,
        'message' => 'Método no permitido'
    ]);
    exit;
}

// Obtener datos del cuerpo de la solicitud
$data = json_decode(file_get_contents('php://input'), true);

// Verificar si los datos requeridos están presentes
if (!isset($data['token'])) {
    echo json_encode([
        'valid' => false,
        'message' => 'Token no proporcionado'
    ]);
    exit;
}

// Verificar la sesión
$auth = new Auth();
$result = $auth->checkSession($data['token']);

// Devolver resultado
echo json_encode($result);
?>