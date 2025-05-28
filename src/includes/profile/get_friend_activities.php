<?php
// src/includes/profile/get_friend_activities.php
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
    $offset = isset($input['offset']) ? max(0, (int)$input['offset']) : 0;
    $limit = isset($input['limit']) ? min(max(1, (int)$input['limit']), 20) : 6;
    $filter = isset($input['filter']) ? $input['filter'] : 'all';
    
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

    $user_check->execute([$target_user_id]);
    $target_user = $user_check->fetch(PDO::FETCH_ASSOC);

    if (!$target_user || $target_user['fecha_baja']) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Usuario no encontrado'
        ]);
        exit;
    }

    // Check if users are friends
    $friend_check = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM amigos 
        WHERE usuario_id = ? AND amigo_id = ?
    ");
    $friend_check->execute([$current_user_id, $target_user_id]);
    $is_following = $friend_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
    
    // Check viewing permissions
    $can_view = $target_user['perfil_publico'] || $is_following || $current_user_id === $target_user_id;
    
    if (!$can_view) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'No tienes permisos para ver estas actividades'
        ]);
        exit;
    }

    // Build WHERE clause for activity filter
    $where_filter = "";
    $filter_params = [];
    
    if ($filter !== 'all') {
        switch ($filter) {
            case 'running':
                $where_filter = " AND ta.nombre LIKE '%carrera%'";
                break;
            case 'cycling':
                $where_filter = " AND ta.nombre LIKE '%ciclismo%'";
                break;
            case 'hiking':
                $where_filter = " AND ta.nombre LIKE '%senderismo%'";
                break;
        }
    }

    // Get total count for pagination
    $count_sql = "
        SELECT COUNT(*) as total
        FROM actividades a
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        WHERE a.usuario_id = :user_id" . $where_filter;
    
    $count_stmt = $pdo->prepare($count_sql);
    $count_stmt->bindParam(':user_id', $target_user_id, PDO::PARAM_INT);
    foreach ($filter_params as $key => $value) {
        $count_stmt->bindParam($key, $value);
    }
    $count_stmt->execute();
    $total_activities = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get activities
    $sql = "
        SELECT 
            a.id,
            a.titulo,
            a.tipo_actividad_id,
            a.ruta_gpx,
            a.fecha_actividad,
            a.fecha_publicacion,
            ta.nombre as tipo_actividad_nombre,
            (SELECT COUNT(*) FROM actividad_aplausos aa WHERE aa.actividad_id = a.id) as aplausos_count,
            (SELECT COUNT(*) > 0 FROM actividad_aplausos aa WHERE aa.actividad_id = a.id AND aa.usuario_id = :current_user_id) as user_applauded
        FROM actividades a
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        WHERE a.usuario_id = :user_id" . $where_filter . "
        ORDER BY a.fecha_actividad DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $target_user_id, PDO::PARAM_INT);
    $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    foreach ($filter_params as $key => $value) {
        $stmt->bindParam($key, $value);
    }
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
            LIMIT 5
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
        
        // Convert values
        $activity['user_applauded'] = (bool)$activity['user_applauded'];
        $activity['aplausos_count'] = (int)$activity['aplausos_count'];
        
        // Add estimated stats (you can enhance this with real GPX parsing)
        if (!empty($activity['ruta_gpx'])) {
            $activity['distancia'] = number_format(rand(30, 150) / 10, 1); // Random 3-15km
            $activity['duracion'] = sprintf('%d:%02d', rand(1, 3), rand(0, 59)); // Random duration
            $activity['elevacion'] = rand(50, 500); // Random elevation
        }
    }
    
    // Check if there are more activities
    $has_more = ($offset + $limit) < $total_activities;
    
    echo json_encode([
        'success' => true,
        'activities' => $activities,
        'total_count' => (int)$total_activities,
        'has_more' => $has_more,
        'offset' => $offset,
        'limit' => $limit
    ]);

} catch (Exception $e) {
    error_log("Get friend activities error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>