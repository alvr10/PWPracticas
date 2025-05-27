<?php
header('Content-Type: application/json');
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$userId = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    // Verificar contraseña actual
    $stmt = $pdo->prepare("SELECT password FROM usuarios WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!password_verify($input['current_password'], $user['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Contraseña actual incorrecta']);
        exit;
    }

    // Verificar que las nuevas contraseñas coincidan
    if ($input['new_password'] !== $input['confirm_password']) {
        http_response_code(400);
        echo json_encode(['error' => 'Las contraseñas no coinciden']);
        exit;
    }

    // Actualizar contraseña
    $newPasswordHash = password_hash($input['new_password'], PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
    $stmt->execute([$newPasswordHash, $userId]);

    echo json_encode(['success' => true, 'message' => 'Contraseña actualizada con éxito']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al cambiar la contraseña: ' . $e->getMessage()]);
}
?>