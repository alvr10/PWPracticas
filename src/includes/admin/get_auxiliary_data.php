<?php
// src/includes/admin/get_auxiliary_data.php
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
    
    if (!isset($input['token']) || !isset($input['type'])) {
        throw new Exception('Token and type are required');
    }
    
    $user = verify_token($input['token']);
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $type = $input['type'];
    $pdo = get_db_connection();
    
    switch ($type) {
        case 'activity-types':
            $sql = "SELECT id, nombre FROM tipos_actividad WHERE id = :id";
            break;
            
        case 'countries':
            $sql = "SELECT id, nombre FROM paises WHERE id = :id";
            break;
            
        case 'provinces':
            $sql = "
                SELECT p.id, p.nombre, p.pais_id, pa.nombre as pais_nombre 
                FROM provincias p 
                INNER JOIN paises pa ON p.pais_id = pa.id 
                WHERE p.id = :id
            ";
            break;
            
        case 'cities':
            $sql = "
                SELECT l.id, l.nombre, l.provincia_id, p.nombre as provincia_nombre, 
                       p.pais_id, pa.nombre as pais_nombre
                FROM localidades l 
                INNER JOIN provincias p ON l.provincia_id = p.id 
                INNER JOIN paises pa ON p.pais_id = pa.id 
                WHERE l.id = :id
            ";
            break;
            
        default:
            throw new Exception('Invalid data type');
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$item) {
        throw new Exception('Item not found');
    }
    
    echo json_encode([
        'success' => true,
        'item' => $item
    ]);
    
} catch (Exception $e) {
    error_log("Get auxiliary item error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
