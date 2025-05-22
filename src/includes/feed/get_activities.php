<?php
// get_activities.php - Fetch activities for the feed
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    if (!isset($input['token'])) {
        throw new Exception('Token is required');
    }
    
    // Verify authentication
    $user = verify_token($input['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    $last_id = isset($input['last_id']) ? (int)$input['last_id'] : 0;
    $limit = isset($input['limit']) ? min((int)$input['limit'], 50) : 10;
    
    // Create database connection
    $pdo = get_db_connection();
    
    // Build the query to get activities from friends and own activities
    $sql = "
        SELECT DISTINCT
            a.id,
            a.titulo,
            a.tipo_actividad_id,
            a.ruta_gpx,
            a.fecha_actividad,
            a.fecha_publicacion,
            u.id as usuario_id,
            u.nombre as usuario_nombre,
            u.apellidos as usuario_apellidos,
            u.username as usuario_username,
            ta.nombre as tipo_actividad_nombre,
            (SELECT COUNT(*) FROM actividad_aplausos aa WHERE aa.actividad_id = a.id) as aplausos_count,
            (SELECT COUNT(*) > 0 FROM actividad_aplausos aa WHERE aa.actividad_id = a.id AND aa.usuario_id = :user_id) as user_applauded,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as usuario_imagen
        FROM actividades a
        INNER JOIN usuarios u ON a.usuario_id = u.id
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        LEFT JOIN amigos am ON (am.usuario_id = :user_id2 AND am.amigo_id = a.usuario_id)
        WHERE (
            a.usuario_id = :user_id3 OR 
            am.usuario_id IS NOT NULL
        )
        AND a.id > :last_id
        AND u.fecha_baja IS NULL
        ORDER BY a.fecha_publicacion DESC
        LIMIT :limit
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id2', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id3', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':last_id', $last_id, PDO::PARAM_INT);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // For each activity, get additional data
    foreach ($activities as &$activity) {
        $activity_id = $activity['id'];
        
        // Get activity images
        $img_sql = "
            SELECT i.id, i.nombre, i.ruta 
            FROM actividad_imagenes ai 
            INNER JOIN imagenes i ON ai.imagen_id = i.id 
            WHERE ai.actividad_id = :activity_id
            ORDER BY i.fecha_subida ASC
        ";
        $img_stmt = $pdo->prepare($img_sql);
        $img_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $img_stmt->execute();
        $activity['imagenes'] = $img_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get activity companions
        $comp_sql = "
            SELECT u.id, u.nombre, u.apellidos, u.username
            FROM actividad_companeros ac
            INNER JOIN usuarios u ON ac.usuario_id = u.id
            WHERE ac.actividad_id = :activity_id
            AND u.fecha_baja IS NULL
        ";
        $comp_stmt = $pdo->prepare($comp_sql);
        $comp_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $comp_stmt->execute();
        $activity['companeros'] = $comp_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert boolean values
        $activity['user_applauded'] = (bool)$activity['user_applauded'];
        $activity['aplausos_count'] = (int)$activity['aplausos_count'];
        
        // Set user image path
        if ($activity['usuario_imagen']) {
            $activity['usuario_imagen'] = '../../assets/img/profiles/' . $activity['usuario_imagen'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'activities' => $activities,
        'total_count' => count($activities),
        'has_more' => count($activities) === $limit
    ]);
    
} catch (Exception $e) {
    error_log("Get activities error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>