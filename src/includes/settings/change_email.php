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
        echo json_encode(['error' => 'Contraseña incorrecta']);
        exit;
    }

    // Verificar si el nuevo email ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
    $stmt->execute([$input['new_email'], $userId]);
    
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Este correo ya está en uso']);
        exit;
    }

    // Actualizar email
    $stmt = $pdo->prepare("UPDATE usuarios SET email = ?, validado = 0 WHERE id = ?");
    $stmt->execute([$input['new_email'], $userId]);

    // Aquí deberías enviar un email de verificación al nuevo correo

    echo json_encode(['success' => true, 'message' => 'Correo actualizado. Por favor verifica tu nuevo correo.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al cambiar el correo: ' . $e->getMessage()]);
}
?>