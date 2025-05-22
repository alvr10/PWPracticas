<?php
// get_recent_friends.php - Get recent friends activity
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
    
    // Get recent friends with their latest activity
    $sql = "
        SELECT 
            u.id,
            u.nombre,
            u.apellidos,
            u.username,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as imagen_perfil,
            (
                SELECT CONCAT(ta.nombre, ' hace ', 
                    CASE 
                        WHEN TIMESTAMPDIFF(HOUR, a.fecha_actividad, NOW()) < 1 
                        THEN CONCAT(TIMESTAMPDIFF(MINUTE, a.fecha_actividad, NOW()), ' min')
                        WHEN TIMESTAMPDIFF(HOUR, a.fecha_actividad, NOW()) < 24 
                        THEN CONCAT(TIMESTAMPDIFF(HOUR, a.fecha_actividad, NOW()), 'h')
                        WHEN TIMESTAMPDIFF(DAY, a.fecha_actividad, NOW()) < 7 
                        THEN CONCAT(TIMESTAMPDIFF(DAY, a.fecha_actividad, NOW()), ' días')
                        ELSE 'más de una semana'
                    END
                )
                FROM actividades a
                INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
                WHERE a.usuario_id = u.id
                ORDER BY a.fecha_actividad DESC
                LIMIT 1
            ) as ultima_actividad
        FROM amigos am
        INNER JOIN usuarios u ON am.amigo_id = u.id
        WHERE am.usuario_id = :user_id
        AND u.fecha_baja IS NULL
        ORDER BY (
            SELECT MAX(a.fecha_actividad)
            FROM actividades a
            WHERE a.usuario_id = u.id
        ) DESC
        LIMIT 5
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process image paths
    foreach ($friends as &$friend) {
        if ($friend['imagen_perfil']) {
            $friend['imagen_perfil'] = '../../assets/img/profiles/' . $friend['imagen_perfil'];
        }
        
        if (!$friend['ultima_actividad']) {
            $friend['ultima_actividad'] = 'Sin actividad reciente';
        }
    }
    
    echo json_encode([
        'success' => true,
        'friends' => $friends
    ]);
    
} catch (Exception $e) {
    error_log("Get recent friends error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>