<?php
// src/includes/admin/get_activities.php
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
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
    $search = isset($input['search']) ? trim($input['search']) : '';
    $filters = isset($input['filters']) ? $input['filters'] : [];
    $limit = 20;
    $offset = ($page - 1) * $limit;
    
    $pdo = get_db_connection();
    
    // Build WHERE clause for search and filters
    $where_clause = "WHERE u.fecha_baja IS NULL";
    $params = [];
    
    if (!empty($search)) {
        $where_clause .= " AND (
            a.titulo LIKE :search1 OR 
            CONCAT(u.nombre, ' ', u.apellidos) LIKE :search2 OR 
            u.username LIKE :search3
        )";
        $search_param = '%' . $search . '%';
        $params[':search1'] = $search_param;
        $params[':search2'] = $search_param;
        $params[':search3'] = $search_param;
    }
    
    // Activity type filter
    if (!empty($filters['type'])) {
        $where_clause .= " AND a.tipo_actividad_id = :type_filter";
        $params[':type_filter'] = (int)$filters['type'];
    }
    
    // Date filter
    if (!empty($filters['date'])) {
        switch ($filters['date']) {
            case 'today':
                $where_clause .= " AND DATE(a.fecha_actividad) = CURDATE()";
                break;
            case 'week':
                $where_clause .= " AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                break;
            case 'month':
                $where_clause .= " AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                break;
        }
    }
    
    // Get total count
    $count_sql = "
        SELECT COUNT(*) 
        FROM actividades a 
        INNER JOIN usuarios u ON a.usuario_id = u.id 
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id 
        $where_clause
    ";
    $count_stmt = $pdo->prepare($count_sql);
    $count_stmt->execute($params);
    $total_count = $count_stmt->fetchColumn();
    
    // Get activities with pagination
    $sql = "
        SELECT 
            a.id, a.titulo, a.fecha_actividad, a.fecha_publicacion,
            u.id as usuario_id, u.nombre as usuario_nombre, u.apellidos as usuario_apellidos, u.username,
            ta.id as tipo_actividad_id, ta.nombre as tipo_actividad,
            (SELECT COUNT(*) FROM actividad_aplausos aa WHERE aa.actividad_id = a.id) as aplausos_count
        FROM actividades a 
        INNER JOIN usuarios u ON a.usuario_id = u.id 
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id 
        $where_clause
        ORDER BY a.fecha_publicacion DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    
    // Bind search and filter parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get images for each activity
    foreach ($activities as &$activity) {
        $activity_id = $activity['id'];
        
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
        
        $activity['aplausos_count'] = (int)$activity['aplausos_count'];
    }
    
    $total_pages = ceil($total_count / $limit);
    
    echo json_encode([
        'success' => true,
        'activities' => $activities,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => (int)$total_count,
            'per_page' => $limit
        ]
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