<?php
// get_trending_activities.php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = verify_token($input['token']);
    if (!$user) throw new Exception('Invalid token');
    
    $pdo = get_db_connection();
    
    $sql = "
        SELECT 
            ta.id as tipo_id,
            ta.nombre as tipo_nombre,
            COUNT(*) as count
        FROM actividades a
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        WHERE DATE(a.fecha_actividad) = CURDATE()
        GROUP BY ta.id, ta.nombre
        ORDER BY count DESC
        LIMIT 5
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $trending = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'trending' => $trending]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

---

<?php
// get_user_suggestions.php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = verify_token($input['token']);
    if (!$user) throw new Exception('Invalid token');
    
    $user_id = $user['id'];
    $pdo = get_db_connection();
    
    $sql = "
        SELECT 
            u.id,
            u.nombre,
            u.apellidos,
            u.username,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as imagen_perfil,
            CONCAT(l.nombre, ', ', p.nombre) as ubicacion,
            (SELECT COUNT(*) FROM actividades a WHERE a.usuario_id = u.id) as total_actividades
        FROM usuarios u
        LEFT JOIN localidades l ON u.localidad_id = l.id
        LEFT JOIN provincias p ON l.provincia_id = p.id
        WHERE u.id != :user_id
        AND u.fecha_baja IS NULL
        AND u.id NOT IN (
            SELECT amigo_id FROM amigos WHERE usuario_id = :user_id2
        )
        AND u.actividad_preferida_id = (
            SELECT actividad_preferida_id FROM usuarios WHERE id = :user_id3
        )
        ORDER BY RAND()
        LIMIT 3
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id2', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id3', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($suggestions as &$suggestion) {
        if ($suggestion['imagen_perfil']) {
            $suggestion['imagen_perfil'] = '../../assets/img/profiles/' . $suggestion['imagen_perfil'];
        }
    }
    
    echo json_encode(['success' => true, 'suggestions' => $suggestions]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

---

<?php
// search_friends.php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = verify_token($input['token']);
    if (!$user) throw new Exception('Invalid token');
    
    $user_id = $user['id'];
    $query = trim($input['query']);
    
    if (strlen($query) < 2) {
        throw new Exception('Query too short');
    }
    
    $pdo = get_db_connection();
    $search_term = '%' . $query . '%';
    
    $sql = "
        SELECT 
            u.id,
            u.nombre,
            u.apellidos,
            u.username,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as imagen_perfil
        FROM amigos a
        INNER JOIN usuarios u ON a.amigo_id = u.id
        WHERE a.usuario_id = :user_id
        AND u.fecha_baja IS NULL
        AND (
            CONCAT(u.nombre, ' ', u.apellidos) LIKE :search_term
            OR u.username LIKE :search_term2
        )
        ORDER BY u.nombre, u.apellidos
        LIMIT 10
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':search_term', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':search_term2', $search_term, PDO::PARAM_STR);
    $stmt->execute();
    
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($friends as &$friend) {
        if ($friend['imagen_perfil']) {
            $friend['imagen_perfil'] = '../../assets/img/profiles/' . $friend['imagen_perfil'];
        }
    }
    
    echo json_encode(['success' => true, 'friends' => $friends]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>

---

<?php
// follow_user.php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = verify_token($input['token']);
    if (!$user) throw new Exception('Invalid token');
    
    $user_id = $user['id'];
    $target_user_id = (int)$input['user_id'];
    
    if ($user_id === $target_user_id) {
        throw new Exception('Cannot follow yourself');
    }
    
    $pdo = get_db_connection();
    
    // Check if already following
    $check_sql = "
        SELECT COUNT(*) as count 
        FROM amigos 
        WHERE usuario_id = :user_id AND amigo_id = :target_user_id
    ";
    
    $check_stmt = $pdo->prepare($check_sql);
    $check_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $check_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
    $check_stmt->execute();
    
    $already_following = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
    
    if ($already_following) {
        throw new Exception('Already following this user');
    }
    
    // Add friendship (one-way follow)
    $follow_sql = "
        INSERT INTO amigos (usuario_id, amigo_id, fecha)
        VALUES (:user_id, :target_user_id, NOW())
    ";
    
    $follow_stmt = $pdo->prepare($follow_sql);
    $follow_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $follow_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
    $follow_stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'User followed successfully']);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>