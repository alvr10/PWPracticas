<?php
// src/includes/settings/change_email.php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['token'])) {
        throw new Exception('Token is required');
    }
    
    $user = verify_token($input['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $userId = $user['id'];
    $currentPassword = $input['current_password'] ?? '';
    $newEmail = $input['new_email'] ?? '';
    
    if (empty($currentPassword) || empty($newEmail)) {
        throw new Exception('Todos los campos son obligatorios');
    }
    
    if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Email no válido');
    }

    $pdo = get_db_connection();

    // Verificar contraseña actual
    $stmt = $pdo->prepare("SELECT password FROM usuarios WHERE id = ?");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch();

    if (!password_verify($currentPassword, $userData['password'])) {
        throw new Exception('Contraseña incorrecta');
    }

    // Verificar si el nuevo email ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
    $stmt->execute([$newEmail, $userId]);
    
    if ($stmt->fetch()) {
        throw new Exception('Este correo ya está en uso');
    }

    // Actualizar email
    $stmt = $pdo->prepare("UPDATE usuarios SET email = ? WHERE id = ?");
    $stmt->execute([$newEmail, $userId]);

    echo json_encode([
        'success' => true, 
        'message' => 'Correo actualizado correctamente'
    ]);

} catch (Exception $e) {
    error_log("Change email error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>