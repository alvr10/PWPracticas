<?php
// src/includes/admin/get_users.php
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
    $limit = 20;
    $offset = ($page - 1) * $limit;
    
    $pdo = get_db_connection();
    
    // Build WHERE clause for search
    $where_clause = "WHERE 1=1";
    $params = [];
    
    if (!empty($search)) {
        $where_clause .= " AND (
            u.nombre LIKE :search1 OR 
            u.apellidos LIKE :search2 OR 
            u.email LIKE :search3 OR 
            u.username LIKE :search4 OR
            CONCAT(u.nombre, ' ', u.apellidos) LIKE :search5
        )";
        $search_param = '%' . $search . '%';
        $params[':search1'] = $search_param;
        $params[':search2'] = $search_param;
        $params[':search3'] = $search_param;
        $params[':search4'] = $search_param;
        $params[':search5'] = $search_param;
    }
    
    // Get total count
    $count_sql = "
        SELECT COUNT(*) 
        FROM usuarios u 
        INNER JOIN roles r ON u.rol_id = r.id 
        $where_clause
    ";
    $count_stmt = $pdo->prepare($count_sql);
    $count_stmt->execute($params);
    $total_count = $count_stmt->fetchColumn();
    
    // Get users with pagination
    $sql = "
        SELECT 
            u.id, u.username, u.email, u.nombre, u.apellidos, 
            u.fecha_alta, u.fecha_baja, u.validado, u.rol_id,
            r.nombre as rol_nombre,
            i.nombre as imagen_perfil
        FROM usuarios u 
        INNER JOIN roles r ON u.rol_id = r.id 
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        $where_clause
        ORDER BY u.fecha_alta DESC
        LIMIT :limit OFFSET :offset
    ";
    
    $stmt = $pdo->prepare($sql);
    
    // Bind search parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process user data
    foreach ($users as &$user_data) {
        $user_data['avatar_url'] = $user_data['imagen_perfil'] ? 
            '../../../public/profiles/' . $user_data['imagen_perfil'] : 
            '../../../public/profiles/default-avatar.jpg';
        $user_data['validado'] = (bool)$user_data['validado'];
    }
    
    $total_pages = ceil($total_count / $limit);
    
    echo json_encode([
        'success' => true,
        'users' => $users,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => (int)$total_count,
            'per_page' => $limit
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get users error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
