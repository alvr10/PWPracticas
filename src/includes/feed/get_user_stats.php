<?php
// get_user_stats.php - Get user statistics for sidebar with proper image path
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
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
    
    $user_id = $user['id'];
    $pdo = get_db_connection();
    
    // Get user info including profile image path
    $user_info_sql = "
        SELECT u.*, i.ruta as imagen_perfil_ruta, i.nombre as imagen_perfil_nombre
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE u.id = :user_id
    ";
    $stmt = $pdo->prepare($user_info_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $user_info = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Simplified version for week distance
    $week_simple_sql = "
        SELECT COUNT(*) * 5 as week_distance
        FROM actividades a
        WHERE a.usuario_id = :user_id
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ";
    $stmt = $pdo->prepare($week_simple_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $week_distance = $stmt->fetchColumn() ?: 0;
    
    // Get month distance (simplified)
    $month_simple_sql = "
        SELECT COUNT(*) * 5 as month_distance
        FROM actividades a
        WHERE a.usuario_id = :user_id
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ";
    $stmt = $pdo->prepare($month_simple_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $month_distance = $stmt->fetchColumn() ?: 0;
    
    // Get total activities
    $activities_sql = "
        SELECT COUNT(*) as total_activities
        FROM actividades a
        WHERE a.usuario_id = :user_id
    ";
    $stmt = $pdo->prepare($activities_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $total_activities = $stmt->fetchColumn() ?: 0;
    
    // Get active friends (friends who have posted in the last week)
    $friends_sql = "
        SELECT COUNT(DISTINCT am.amigo_id) as active_friends
        FROM amigos am
        INNER JOIN actividades a ON am.amigo_id = a.usuario_id
        WHERE am.usuario_id = :user_id
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ";
    $stmt = $pdo->prepare($friends_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $active_friends = $stmt->fetchColumn() ?: 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'week_distance' => number_format($week_distance, 1),
            'month_distance' => number_format($month_distance, 1),
            'total_activities' => (int)$total_activities,
            'active_friends' => (int)$active_friends
        ],
        'user_info' => [
            'id' => $user_info['id'],
            'nombre' => $user_info['nombre'],
            'apellidos' => $user_info['apellidos'],
            'username' => $user_info['username'],
            'email' => $user_info['email'],
            'imagen_perfil_ruta' => $user_info['imagen_perfil_ruta'],
            'imagen_perfil_nombre' => $user_info['imagen_perfil_nombre'],
            'imagen_perfil_id' => (int)$user_info['imagen_perfil_id'] // Ensure it's an integer
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get user stats error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>