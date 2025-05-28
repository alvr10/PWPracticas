<?php
// get_friends_list.php - Get paginated friends list
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
    $offset = isset($input['offset']) ? max(0, (int)$input['offset']) : 0;
    $limit = isset($input['limit']) ? min(max(1, (int)$input['limit']), 50) : 10;
    
    $pdo = get_db_connection();
    
    // Get total friends count
    $count_sql = "
        SELECT COUNT(*) as total
        FROM amigos a
        INNER JOIN usuarios u ON a.amigo_id = u.id
        WHERE a.usuario_id = :user_id
        AND u.fecha_baja IS NULL
    ";
    $count_stmt = $pdo->prepare($count_sql);
    $count_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $count_stmt->execute();
    $total_friends = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Get friends with their latest activity info
    $sql = "
        SELECT 
            u.id,
            u.nombre,
            u.apellidos,
            u.username,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as imagen_perfil,
            a.fecha as fecha_amistad,
            (
                SELECT CONCAT(ta.nombre, ' hace ', 
                    CASE 
                        WHEN TIMESTAMPDIFF(HOUR, act.fecha_actividad, NOW()) < 1 
                        THEN CONCAT(TIMESTAMPDIFF(MINUTE, act.fecha_actividad, NOW()), ' min')
                        WHEN TIMESTAMPDIFF(HOUR, act.fecha_actividad, NOW()) < 24 
                        THEN CONCAT(TIMESTAMPDIFF(HOUR, act.fecha_actividad, NOW()), 'h')
                        WHEN TIMESTAMPDIFF(DAY, act.fecha_actividad, NOW()) < 7 
                        THEN CONCAT(TIMESTAMPDIFF(DAY, act.fecha_actividad, NOW()), ' días')
                        WHEN TIMESTAMPDIFF(DAY, act.fecha_actividad, NOW()) < 30 
                        THEN CONCAT(TIMESTAMPDIFF(WEEK, act.fecha_actividad, NOW()), ' semanas')
                        ELSE 'más de un mes'
                    END
                )
                FROM actividades act
                INNER JOIN tipos_actividad ta ON act.tipo_actividad_id = ta.id
                WHERE act.usuario_id = u.id
                ORDER BY act.fecha_actividad DESC
                LIMIT 1
            ) as ultima_actividad
        FROM amigos a
        INNER JOIN usuarios u ON a.amigo_id = u.id
        WHERE a.usuario_id = :user_id
        AND u.fecha_baja IS NULL
        ORDER BY (
            SELECT MAX(act.fecha_actividad)
            FROM actividades act
            WHERE act.usuario_id = u.id
        ) DESC, a.fecha DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process image paths
    foreach ($friends as &$friend) {
        if ($friend['imagen_perfil']) {
            $friend['imagen_perfil'] = '../../../public/profiles/' . $friend['imagen_perfil'];
        }
        
        if (!$friend['ultima_actividad']) {
            $friend['ultima_actividad'] = 'Sin actividad reciente';
        }
    }
    
    // Check if there are more friends
    $has_more = ($offset + $limit) < $total_friends;
    
    echo json_encode([
        'success' => true,
        'friends' => $friends,
        'total_friends' => (int)$total_friends,
        'has_more' => $has_more,
        'offset' => $offset,
        'limit' => $limit
    ]);
    
} catch (Exception $e) {
    error_log("Get friends list error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>