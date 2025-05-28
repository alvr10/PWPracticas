<?php
// src/includes/admin/get_user.php
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
    
    if (!isset($input['token']) || !isset($input['user_id'])) {
        throw new Exception('Token and user_id are required');
    }
    
    $user = verify_token($input['token']);
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $user_id = (int)$input['user_id'];
    $pdo = get_db_connection();
    
    $sql = "
        SELECT 
            u.id, u.username, u.email, u.nombre, u.apellidos, 
            u.fecha_nacimiento, u.fecha_alta, u.fecha_baja, 
            u.validado, u.rol_id, u.actividad_preferida_id, u.localidad_id,
            r.nombre as rol_nombre,
            ta.nombre as actividad_preferida_nombre,
            l.nombre as localidad_nombre,
            p.nombre as provincia_nombre,
            pa.nombre as pais_nombre,
            i.nombre as imagen_perfil
        FROM usuarios u 
        INNER JOIN roles r ON u.rol_id = r.id 
        LEFT JOIN tipos_actividad ta ON u.actividad_preferida_id = ta.id
        LEFT JOIN localidades l ON u.localidad_id = l.id
        LEFT JOIN provincias p ON l.provincia_id = p.id
        LEFT JOIN paises pa ON p.pais_id = pa.id
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE u.id = :user_id
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user_data) {
        throw new Exception('User not found');
    }
    
    // Process user data
    $user_data['avatar_url'] = $user_data['imagen_perfil'] ? 
        '../../../public/profiles/' . $user_data['imagen_perfil'] : 
        '../../../public/profiles/default-avatar.jpg';
    $user_data['validado'] = (bool)$user_data['validado'];
    
    echo json_encode([
        'success' => true,
        'user' => $user_data
    ]);
    
} catch (Exception $e) {
    error_log("Get user error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>