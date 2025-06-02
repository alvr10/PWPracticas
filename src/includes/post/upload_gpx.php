<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../config/database.php';

try {
    // Get the request data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        // Fallback to POST/GET parameters
        $token = $_POST['token'] ?? $_GET['token'] ?? null;
        $searchTerm = $_POST['query'] ?? $_GET['q'] ?? '';
    } else {
        $token = $input['token'] ?? null;
        $searchTerm = $input['query'] ?? '';
    }
    
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Token de autenticación requerido'
        ]);
        exit;
    }
    
    // Verify token and get user ID
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE auth_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Token inválido'
        ]);
        exit;
    }
    
    $userId = $user['id'];
    
    if (strlen($searchTerm) < 2) {
        echo json_encode([
            'success' => true,
            'friends' => []
        ]);
        exit;
    }
    
    // Search for users
    $stmt = $pdo->prepare("
        SELECT 
            u.id, 
            u.username, 
            u.nombre, 
            u.apellidos, 
            i.ruta as imagen_perfil
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE (
            u.nombre LIKE :search OR 
            u.apellidos LIKE :search OR 
            u.username LIKE :search
        )
        AND u.id != :userId
        AND u.activo = 1
        ORDER BY 
            CASE 
                WHEN u.username LIKE :exactSearch THEN 1
                WHEN u.nombre LIKE :exactSearch THEN 2
                WHEN u.apellidos LIKE :exactSearch THEN 3
                ELSE 4
            END,
            u.nombre ASC
        LIMIT 10
    ");
    
    $searchParam = "%$searchTerm%";
    $exactSearchParam = "$searchTerm%";
    
    $stmt->execute([
        ':search' => $searchParam,
        ':exactSearch' => $exactSearchParam,
        ':userId' => $userId
    ]);
    
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format response
    $formattedFriends = array_map(function($friend) {
        $avatarPath = $friend['imagen_perfil'] 
            ? '../../../' . $friend['imagen_perfil'] 
            : '../../../public/profiles/default-avatar.jpg';
            
        return [
            'id' => (int)$friend['id'],
            'username' => $friend['username'],
            'nombre' => $friend['nombre'] . ' ' . $friend['apellidos'],
            'apellidos' => $friend['apellidos'],
            'imagen_perfil' => $avatarPath
        ];
    }, $friends);
    
    echo json_encode([
        'success' => true,
        'friends' => $formattedFriends
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in search_friends.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en la base de datos'
    ]);
} catch (Exception $e) {
    error_log("General error in search_friends.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor'
    ]);
}
?>