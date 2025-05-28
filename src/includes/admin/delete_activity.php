
<?php
// src/includes/admin/delete_activity.php
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
    
    $pdo->beginTransaction();
    
    try {
        // Get activity images to delete files
        $img_sql = "
            SELECT i.id, i.ruta 
            FROM actividad_imagenes ai 
            INNER JOIN imagenes i ON ai.imagen_id = i.id 
            WHERE ai.actividad_id = :activity_id
        ";
        $img_stmt = $pdo->prepare($img_sql);
        $img_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $img_stmt->execute();
        $images = $img_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Delete activity companions
        $comp_sql = "DELETE FROM actividad_companeros WHERE actividad_id = :activity_id";
        $comp_stmt = $pdo->prepare($comp_sql);
        $comp_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $comp_stmt->execute();
        
        // Delete activity applause
        $applause_sql = "DELETE FROM actividad_aplausos WHERE actividad_id = :activity_id";
        $applause_stmt = $pdo->prepare($applause_sql);
        $applause_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $applause_stmt->execute();
        
        // Delete activity images relationship
        $rel_sql = "DELETE FROM actividad_imagenes WHERE actividad_id = :activity_id";
        $rel_stmt = $pdo->prepare($rel_sql);
        $rel_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $rel_stmt->execute();
        
        // Delete image records and files
        foreach ($images as $image) {
            $delete_img_sql = "DELETE FROM imagenes WHERE id = :image_id";
            $delete_img_stmt = $pdo->prepare($delete_img_sql);
            $delete_img_stmt->bindParam(':image_id', $image['id'], PDO::PARAM_INT);
            $delete_img_stmt->execute();
            
            // Delete physical file
            if ($image['ruta'] && file_exists($image['ruta'])) {
                unlink($image['ruta']);
            }
        }
        
        // Delete activity
        $activity_sql = "DELETE FROM actividades WHERE id = :activity_id";
        $activity_stmt = $pdo->prepare($activity_sql);
        $activity_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $activity_stmt->execute();
        
        if ($activity_stmt->rowCount() == 0) {
            throw new Exception('Activity not found');
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Activity deleted successfully'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Delete activity error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>