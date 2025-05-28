<?php
// src/includes/settings/get_settings.php
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
            i.nombre as imagen_perfil,
            r.nombre as rol_nombre
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        throw new Exception('Usuario no encontrado');
    }

    // Set avatar URL
    $avatar_url = $settings['imagen_perfil'] ? 
        '../../../public/profiles/' . $settings['imagen_perfil'] : 
        '../../../public/profiles/default-avatar.jpg';

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
            'avatar' => $avatar_url
        ]
    ]);

} catch (Exception $e) {
    error_log("Get settings error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>