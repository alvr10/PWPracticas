<?php
// src/includes/admin/get_auxiliary_data.php - FIXED VERSION
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
            $sql = "SELECT id, nombre FROM tipos_actividad ORDER BY nombre";
            break;
            
        case 'countries':
            $sql = "SELECT id, nombre FROM paises ORDER BY nombre";
            break;
            
        case 'provinces':
            $sql = "
                SELECT p.id, p.nombre, p.pais_id, pa.nombre as pais_nombre 
                FROM provincias p 
                INNER JOIN paises pa ON p.pais_id = pa.id 
                ORDER BY pa.nombre, p.nombre
            ";
            break;
            
        case 'cities':
            $sql = "
                SELECT l.id, l.nombre, l.provincia_id, p.nombre as provincia_nombre, 
                       p.pais_id, pa.nombre as pais_nombre
                FROM localidades l 
                INNER JOIN provincias p ON l.provincia_id = p.id 
                INNER JOIN paises pa ON p.pais_id = pa.id 
                ORDER BY pa.nombre, p.nombre, l.nombre
            ";
            break;
            
        default:
            throw new Exception('Invalid data type');
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    
} catch (Exception $e) {
    error_log("Get auxiliary data error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>