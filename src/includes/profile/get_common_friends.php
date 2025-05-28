<?php
// src/includes/profile/get_common_friends.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    if (!isset($input['token']) || !isset($input['user_id'])) {
        throw new Exception('Token and user_id are required');
    }
    
    $token = $input['token'];
    $target_user_id = (int)$input['user_id'];
    
    // Verify authentication
    $current_user = verify_token($token);
    if (!$current_user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or expired token'
        ]);
        exit;
    }
    
    $current_user_id = $current_user['id'];
    $pdo = get_db_connection();

    if (!$pdo) {
        throw new Exception('Database connection failed');
    }

    // Get common friends - users that both current user and target user follow
    $sql = "
        SELECT DISTINCT
            u.id,
            u.nombre,
            u.apellidos,
            u.username,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as imagen_perfil
        FROM usuarios u
        INNER JOIN amigos a1 ON u.id = a1.amigo_id AND a1.usuario_id = :current_user_id
        INNER JOIN amigos a2 ON u.id = a2.amigo_id AND a2.usuario_id = :target_user_id
        WHERE u.fecha_baja IS NULL
        AND u.id != :current_user_id2
        AND u.id != :target_user_id2
        ORDER BY u.nombre, u.apellidos
        LIMIT 10
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
    $stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
    $stmt->bindParam(':current_user_id2', $current_user_id, PDO::PARAM_INT);
    $stmt->bindParam(':target_user_id2', $target_user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $common_friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process image paths
    foreach ($common_friends as &$friend) {
        if ($friend['imagen_perfil']) {
            $friend['imagen_perfil'] = '../../../public/profiles/' . $friend['imagen_perfil'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'common_friends' => $common_friends,
        'total_count' => count($common_friends)
    ]);

} catch (Exception $e) {
    error_log("Get common friends error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>