<?php
// Script para verificar el estado de la sesión mediante AJAX
session_start();

// Preparar respuesta
$response = [
    'authenticated' => false,
    'user' => null
];

// Verificar si hay sesión activa
if (isset($_SESSION['auth']) && $_SESSION['auth'] === true) {
    $response['authenticated'] = true;
    $response['user'] = [
        'id' => $_SESSION['usuario_id'],
        'username' => $_SESSION['username'],
        'email' => $_SESSION['email'],
        'rol' => $_SESSION['rol']
    ];
}

// Enviar respuesta como JSON
header('Content-Type: application/json');
echo json_encode($response);
exit;
?>