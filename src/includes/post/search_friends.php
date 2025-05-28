<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

error_log("Search friends endpoint called");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("Search friends input: " . json_encode($input));
    
    if (!isset($input['token'])) {
        throw new Exception('Token is required');
    }
    
    if (!isset($input['query'])) {
        throw new Exception('Search query is required');
    }
    
    $token = $input['token'];
    $searchTerm = trim($input['query']);
    
    error_log("Searching for friends with term: " . $searchTerm);
    
    // Verify authentication using auth_functions
    $user = verify_token($token);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $userId = $user['id'];
    error_log("User ID from token: " . $userId);
    
    $pdo = get_db_connection();

    $stmt = $pdo->prepare("
        SELECT u.id, u.username, u.nombre, u.apellidos, i.nombre as imagen_perfil
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE (u.nombre LIKE :search OR u.apellidos LIKE :search OR u.username LIKE :search)
        AND u.id != :userId
        AND u.fecha_baja IS NULL
        LIMIT 10
    ");
    
    $searchPattern = "%$searchTerm%";
    $stmt->execute([
        ':search' => $searchPattern,
        ':userId' => $userId
    ]);
    
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("Found " . count($friends) . " potential friends");
    
    // Format the response
    $formattedFriends = array_map(function($friend) {
        return [
            'id' => $friend['id'],
            'nombre' => $friend['nombre'],
            'apellidos' => $friend['apellidos'],
            'username' => $friend['username'],
            'imagen_perfil' => $friend['imagen_perfil'] ? 
                '../../../public/profiles/' . $friend['imagen_perfil'] : 
                '../../../public/profiles/default-avatar.jpg'
        ];
    }, $friends);
    
    echo json_encode([
        'success' => true,
        'friends' => $formattedFriends
    ]);

} catch (Exception $e) {
    error_log("Search friends error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>