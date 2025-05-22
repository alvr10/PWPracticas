<?php
// toggle_applause.php - Add or remove applause for an activity
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    if (!isset($input['token']) || !isset($input['activity_id']) || !isset($input['action'])) {
        throw new Exception('Token, activity_id, and action are required');
    }
    
    // Verify authentication
    $user = verify_token($input['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    $activity_id = (int)$input['activity_id'];
    $action = $input['action']; // 'add' or 'remove'
    
    if (!in_array($action, ['add', 'remove'])) {
        throw new Exception('Invalid action. Must be "add" or "remove"');
    }
    
    // Create database connection
    $pdo = get_db_connection();
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // First, verify the activity exists and is not from a deactivated user
        $activity_sql = "
            SELECT a.id, a.usuario_id, u.fecha_baja
            FROM actividades a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.id = :activity_id
        ";
        $activity_stmt = $pdo->prepare($activity_sql);
        $activity_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $activity_stmt->execute();
        $activity = $activity_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$activity) {
            throw new Exception('Activity not found');
        }
        
        if ($activity['fecha_baja'] !== null) {
            throw new Exception('Cannot applaud activities from deactivated users');
        }
        
        // Check if user is trying to applaud their own activity
        if ($activity['usuario_id'] == $user_id) {
            throw new Exception('Cannot applaud your own activity');
        }
        
        // Check current applause status
        $check_sql = "
            SELECT COUNT(*) as count 
            FROM actividad_aplausos 
            WHERE actividad_id = :activity_id AND usuario_id = :user_id
        ";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $check_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $check_stmt->execute();
        $current_applause = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($action === 'add' && $current_applause) {
            throw new Exception('Already applauded this activity');
        }
        
        if ($action === 'remove' && !$current_applause) {
            throw new Exception('Haven\'t applauded this activity');
        }
        
        // Perform the action
        if ($action === 'add') {
            $sql = "
                INSERT INTO actividad_aplausos (actividad_id, usuario_id, fecha)
                VALUES (:activity_id, :user_id, NOW())
            ";
        } else {
            $sql = "
                DELETE FROM actividad_aplausos 
                WHERE actividad_id = :activity_id AND usuario_id = :user_id
            ";
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        // Get updated applause count
        $count_sql = "
            SELECT COUNT(*) as count 
            FROM actividad_aplausos 
            WHERE actividad_id = :activity_id
        ";
        $count_stmt = $pdo->prepare($count_sql);
        $count_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $count_stmt->execute();
        $new_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'action' => $action,
            'new_count' => (int)$new_count,
            'message' => $action === 'add' ? 'Applause added successfully' : 'Applause removed successfully'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Toggle applause error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>