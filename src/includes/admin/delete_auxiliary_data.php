
<?php
// src/includes/admin/delete_auxiliary_data.php
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
    
    if (!isset($input['token']) || !isset($input['type']) || !isset($input['id'])) {
        throw new Exception('Token, type and id are required');
    }
    
    $user = verify_token($input['token']);
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $type = $input['type'];
    $id = (int)$input['id'];
    $pdo = get_db_connection();
    
    // Check for dependencies before deleting
    switch ($type) {
        case 'activity-types':
            // Check if any users have this as preferred activity
            $dep_check = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE actividad_preferida_id = :id");
            $dep_check->bindParam(':id', $id);
            $dep_check->execute();
            
            if ($dep_check->fetchColumn() > 0) {
                throw new Exception('No se puede eliminar: hay usuarios que tienen esta actividad como preferida');
            }
            
            // Check if any activities use this type
            $act_check = $pdo->prepare("SELECT COUNT(*) FROM actividades WHERE tipo_actividad_id = :id");
            $act_check->bindParam(':id', $id);
            $act_check->execute();
            
            if ($act_check->fetchColumn() > 0) {
                throw new Exception('No se puede eliminar: hay actividades registradas de este tipo');
            }
            
            $sql = "DELETE FROM tipos_actividad WHERE id = :id";
            break;
            
        case 'countries':
            // Check if any provinces exist in this country
            $dep_check = $pdo->prepare("SELECT COUNT(*) FROM provincias WHERE pais_id = :id");
            $dep_check->bindParam(':id', $id);
            $dep_check->execute();
            
            if ($dep_check->fetchColumn() > 0) {
                throw new Exception('No se puede eliminar: hay provincias registradas en este país');
            }
            
            $sql = "DELETE FROM paises WHERE id = :id";
            break;
            
        case 'provinces':
            // Check if any cities exist in this province
            $dep_check = $pdo->prepare("SELECT COUNT(*) FROM localidades WHERE provincia_id = :id");
            $dep_check->bindParam(':id', $id);
            $dep_check->execute();
            
            if ($dep_check->fetchColumn() > 0) {
                throw new Exception('No se puede eliminar: hay localidades registradas en esta provincia');
            }
            
            $sql = "DELETE FROM provincias WHERE id = :id";
            break;
            
        case 'cities':
            // Check if any users live in this city
            $dep_check = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE localidad_id = :id");
            $dep_check->bindParam(':id', $id);
            $dep_check->execute();
            
            if ($dep_check->fetchColumn() > 0) {
                throw new Exception('No se puede eliminar: hay usuarios registrados en esta localidad');
            }
            
            $sql = "DELETE FROM localidades WHERE id = :id";
            break;
            
        default:
            throw new Exception('Invalid data type');
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        throw new Exception('Item not found');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Element deleted successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Delete auxiliary data error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
