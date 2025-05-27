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

try {
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.username, u.email, u.nombre, u.apellidos,
            u.perfil_publico, u.compartir_ubicacion, 
            u.notif_aplausos, u.notif_comentarios, u.notif_amistades, u.notif_logros, u.notif_email,
            i.ruta as imagen_perfil
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }

    // Obtener configuración de modo oscuro si existe
    $darkMode = isset($_COOKIE['darkMode']) ? $_COOKIE['darkMode'] === 'true' : false;

    echo json_encode([
        'user' => [
            'name' => $settings['nombre'],
            'lastname' => $settings['apellidos'],
            'email' => $settings['email'],
            'avatar' => $settings['imagen_perfil'] ? '../../../' . $settings['imagen_perfil'] : '../../../public/profiles/default-avatar.jpg'
        ],
        'settings' => [
            'public_profile' => (bool)$settings['perfil_publico'],
            'share_location' => (bool)$settings['compartir_ubicacion'],
            'applause_notif' => (bool)$settings['notif_aplausos'],
            'comments_notif' => (bool)$settings['notif_comentarios'],
            'friends_notif' => (bool)$settings['notif_amistades'],
            'achievements_notif' => (bool)$settings['notif_logros'],
            'email_notif' => (bool)$settings['notif_email'],
            'dark_mode' => $darkMode
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>