
<?php
// src/includes/admin/delete_image.php
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
    
    if (!isset($input['token']) || !isset($input['image_id'])) {
        throw new Exception('Token and image_id are required');
    }
    
    $user = verify_token($input['token']);
    if (!$user || $user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $image_id = (int)$input['image_id'];
    $pdo = get_db_connection();
    
    $pdo->beginTransaction();
    
    try {
        // Get image info
        $img_sql = "SELECT id, nombre, ruta FROM imagenes WHERE id = :image_id";
        $img_stmt = $pdo->prepare($img_sql);
        $img_stmt->bindParam(':image_id', $image_id, PDO::PARAM_INT);
        $img_stmt->execute();
        $image = $img_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$image) {
            throw new Exception('Image not found');
        }
        
        // Remove from activity_imagenes table
        $remove_sql = "DELETE FROM actividad_imagenes WHERE imagen_id = :image_id";
        $remove_stmt = $pdo->prepare($remove_sql);
        $remove_stmt->bindParam(':image_id', $image_id, PDO::PARAM_INT);
        $remove_stmt->execute();
        
        // Delete image record
        $delete_sql = "DELETE FROM imagenes WHERE id = :image_id";
        $delete_stmt = $pdo->prepare($delete_sql);
        $delete_stmt->bindParam(':image_id', $image_id, PDO::PARAM_INT);
        $delete_stmt->execute();
        
        // Delete physical file
        if ($image['ruta'] && file_exists($image['ruta'])) {
            unlink($image['ruta']);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Image deleted successfully'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Delete image error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
