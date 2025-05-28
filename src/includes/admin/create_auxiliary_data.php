
<?php
// src/includes/admin/create_auxiliary_data.php
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
    
    if (!isset($input['token']) || !isset($input['type']) || !isset($input['name'])) {
        throw new Exception('Token, type and name are required');
    }
    
    $user = verify_token($input['token']);
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $type = $input['type'];
    $name = trim($input['name']);
    
    if (empty($name)) {
        throw new Exception('Name cannot be empty');
    }
    
    $pdo = get_db_connection();
    
    switch ($type) {
        case 'activity-types':
            // Check if exists
            $check_sql = "SELECT COUNT(*) FROM tipos_actividad WHERE nombre = :name";
            $check_stmt = $pdo->prepare($check_sql);
            $check_stmt->bindParam(':name', $name);
            $check_stmt->execute();
            
            if ($check_stmt->fetchColumn() > 0) {
                throw new Exception('Ya existe un tipo de actividad con ese nombre');
            }
            
            $sql = "INSERT INTO tipos_actividad (nombre) VALUES (:name)";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':name', $name);
            break;
            
        case 'countries':
            // Check if exists
            $check_sql = "SELECT COUNT(*) FROM paises WHERE nombre = :name";
            $check_stmt = $pdo->prepare($check_sql);
            $check_stmt->bindParam(':name', $name);
            $check_stmt->execute();
            
            if ($check_stmt->fetchColumn() > 0) {
                throw new Exception('Ya existe un país con ese nombre');
            }
            
            $sql = "INSERT INTO paises (nombre) VALUES (:name)";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':name', $name);
            break;
            
        case 'provinces':
            if (!isset($input['country_id'])) {
                throw new Exception('Country ID is required for provinces');
            }
            
            $country_id = (int)$input['country_id'];
            
            // Check if country exists
            $country_check = $pdo->prepare("SELECT COUNT(*) FROM paises WHERE id = :country_id");
            $country_check->bindParam(':country_id', $country_id);
            $country_check->execute();
            
            if ($country_check->fetchColumn() == 0) {
                throw new Exception('País no encontrado');
            }
            
            // Check if province exists in country
            $check_sql = "SELECT COUNT(*) FROM provincias WHERE nombre = :name AND pais_id = :country_id";
            $check_stmt = $pdo->prepare($check_sql);
            $check_stmt->bindParam(':name', $name);
            $check_stmt->bindParam(':country_id', $country_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetchColumn() > 0) {
                throw new Exception('Ya existe una provincia con ese nombre en el país seleccionado');
            }
            
            $sql = "INSERT INTO provincias (nombre, pais_id) VALUES (:name, :country_id)";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':country_id', $country_id);
            break;
            
        case 'cities':
            if (!isset($input['province_id'])) {
                throw new Exception('Province ID is required for cities');
            }
            
            $province_id = (int)$input['province_id'];
            
            // Check if province exists
            $province_check = $pdo->prepare("SELECT COUNT(*) FROM provincias WHERE id = :province_id");
            $province_check->bindParam(':province_id', $province_id);
            $province_check->execute();
            
            if ($province_check->fetchColumn() == 0) {
                throw new Exception('Provincia no encontrada');
            }
            
            // Check if city exists in province
            $check_sql = "SELECT COUNT(*) FROM localidades WHERE nombre = :name AND provincia_id = :province_id";
            $check_stmt = $pdo->prepare($check_sql);
            $check_stmt->bindParam(':name', $name);
            $check_stmt->bindParam(':province_id', $province_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetchColumn() > 0) {
                throw new Exception('Ya existe una localidad con ese nombre en la provincia seleccionada');
            }
            
            $sql = "INSERT INTO localidades (nombre, provincia_id) VALUES (:name, :province_id)";
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':province_id', $province_id);
            break;
            
        default:
            throw new Exception('Invalid data type');
    }
    
    $stmt->execute();
    $new_id = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => 'Element created successfully',
        'id' => $new_id
    ]);
    
} catch (Exception $e) {
    error_log("Create auxiliary data error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>