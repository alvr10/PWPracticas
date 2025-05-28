<?php
// src/includes/settings/change_password.php
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
    $newPassword = $input['new_password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        throw new Exception('Todos los campos son obligatorios');
    }
    
    if ($newPassword !== $confirmPassword) {
        throw new Exception('Las contraseñas no coinciden');
    }
    
    if (strlen($newPassword) < 6) {
        throw new Exception('La contraseña debe tener al menos 6 caracteres');
    }

    $pdo = get_db_connection();

    // Verificar contraseña actual
    $stmt = $pdo->prepare("SELECT password FROM usuarios WHERE id = ?");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch();

    if (!password_verify($currentPassword, $userData['password'])) {
        throw new Exception('Contraseña actual incorrecta');
    }

    // Actualizar contraseña
    $newPasswordHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
    $stmt->execute([$newPasswordHash, $userId]);

    echo json_encode([
        'success' => true, 
        'message' => 'Contraseña actualizada con éxito'
    ]);

} catch (Exception $e) {
    error_log("Change password error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>