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
    $stmt = $pdo->prepare("
        UPDATE usuarios SET
            perfil_publico = :public_profile,
            compartir_ubicacion = :share_location,
            notif_aplausos = :applause_notif,
            notif_comentarios = :comments_notif,
            notif_amistades = :friends_notif,
            notif_logros = :achievements_notif,
            notif_email = :email_notif
        WHERE id = :userId
    ");
    
    $stmt->execute([
        ':public_profile' => $input['public_profile'] ? 1 : 0,
        ':share_location' => $input['share_location'] ? 1 : 0,
        ':applause_notif' => $input['applause_notif'] ? 1 : 0,
        ':comments_notif' => $input['comments_notif'] ? 1 : 0,
        ':friends_notif' => $input['friends_notif'] ? 1 : 0,
        ':achievements_notif' => $input['achievements_notif'] ? 1 : 0,
        ':email_notif' => $input['email_notif'] ? 1 : 0,
        ':userId' => $userId
    ]);

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar configuraciones: ' . $e->getMessage()]);
}
?>