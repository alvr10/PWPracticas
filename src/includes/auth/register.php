<?php
// src/includes/auth/register.php

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
if (!isset($data['nombre']) || !isset($data['apellidos']) || !isset($data['username']) || 
    !isset($data['email']) || !isset($data['password']) || !isset($data['fecha_nacimiento']) || 
    !isset($data['localidad_id']) || !isset($data['actividad_preferida_id'])) {
    
    echo json_encode([
        'success' => false,
        'message' => 'Datos incompletos'
    ]);
    exit;
}

// Procesar el registro
$auth = new Auth();
$result = $auth->register($data);

// Devolver resultado
echo json_encode($result);
?>