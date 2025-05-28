<?php
// src/includes/settings/get_settings.php - UPDATED VERSION
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
    $pdo = get_db_connection();

    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.username, u.email, u.nombre, u.apellidos, u.rol_id,
            u.perfil_publico, u.compartir_ubicacion, 
            u.notif_aplausos, u.notif_comentarios, u.notif_amistades, u.notif_logros, u.notif_email,
            i.ruta as imagen_perfil,
            r.nombre as rol_nombre
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        LEFT JOIN roles r ON u.rol_id = r.id
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
        'success' => true,
        'user' => [
            'id' => (int)$settings['id'],
            'name' => $settings['nombre'],
            'lastname' => $settings['apellidos'],
            'email' => $settings['email'],
            'username' => $settings['username'],
            'role' => $settings['rol_nombre'],
            'role_id' => (int)$settings['rol_id'],
            'is_admin' => (int)$settings['rol_id'] === 1,
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

} catch (Exception $e) {
    error_log("Get settings error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>