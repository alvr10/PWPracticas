<?php
// src/includes/post/search_friends.php
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
            $friend['imagen_perfil'] = '../../../public/profiles/' . $friend['imagen_perfil'];
        }
    }
    
    echo json_encode(['success' => true, 'friends' => $friends]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>