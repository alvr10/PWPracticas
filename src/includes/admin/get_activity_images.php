
<?php
// src/includes/admin/get_activity_images.php
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
    
    if (!isset($input['token']) || !isset($input['activity_id'])) {
        throw new Exception('Token and activity_id are required');
    }
    
    $user = verify_token($input['token']);
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $activity_id = (int)$input['activity_id'];
    $pdo = get_db_connection();
    
    // Verify activity exists
    $activity_check = $pdo->prepare("SELECT COUNT(*) FROM actividades WHERE id = :activity_id");
    $activity_check->bindParam(':activity_id', $activity_id);
    $activity_check->execute();
    
    if ($activity_check->fetchColumn() == 0) {
        throw new Exception('Activity not found');
    }
    
    // Get activity images
    $sql = "
        SELECT i.id, i.nombre, i.ruta, i.fecha_subida
        FROM actividad_imagenes ai 
        INNER JOIN imagenes i ON ai.imagen_id = i.id 
        WHERE ai.actividad_id = :activity_id
        ORDER BY i.fecha_subida ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
    $stmt->execute();
    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'images' => $images
    ]);
    
} catch (Exception $e) {
    error_log("Get activity images error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>