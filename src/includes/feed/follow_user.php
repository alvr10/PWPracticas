<?php
// src/includes/feed/follow_user.php - Follow/unfollow a user
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
    if (!isset($input['token']) || !isset($input['user_id'])) {
        throw new Exception('Token and user_id are required');
    }
    
    // Verify authentication
    $user = verify_token($input['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    $target_user_id = (int)$input['user_id'];
    $action = isset($input['action']) ? $input['action'] : 'follow'; // 'follow' or 'unfollow'
    
    // Validate inputs
    if ($user_id === $target_user_id) {
        throw new Exception('Cannot follow yourself');
    }
    
    if (!in_array($action, ['follow', 'unfollow'])) {
        throw new Exception('Invalid action. Must be "follow" or "unfollow"');
    }
    
    // Create database connection
    $pdo = get_db_connection();
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Verify target user exists and is not deactivated
        $target_user_sql = "
            SELECT id, username, nombre, apellidos
            FROM usuarios 
            WHERE id = :target_user_id AND fecha_baja IS NULL
        ";
        $target_user_stmt = $pdo->prepare($target_user_sql);
        $target_user_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
        $target_user_stmt->execute();
        $target_user = $target_user_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$target_user) {
            throw new Exception('User not found or deactivated');
        }
        
        // Check current follow status
        $check_sql = "
            SELECT COUNT(*) as count 
            FROM amigos 
            WHERE usuario_id = :user_id AND amigo_id = :target_user_id
        ";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $check_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
        $check_stmt->execute();
        $is_following = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        if ($action === 'follow') {
            if ($is_following) {
                throw new Exception('Already following this user');
            }
            
            // Add friendship (one-way follow)
            $follow_sql = "
                INSERT INTO amigos (usuario_id, amigo_id, fecha)
                VALUES (:user_id, :target_user_id, NOW())
            ";
            $follow_stmt = $pdo->prepare($follow_sql);
            $follow_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $follow_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
            $follow_stmt->execute();
            
            $message = 'User followed successfully';
            $new_status = true;
            
        } else { // unfollow
            if (!$is_following) {
                throw new Exception('Not following this user');
            }
            
            // Remove friendship
            $unfollow_sql = "
                DELETE FROM amigos 
                WHERE usuario_id = :user_id AND amigo_id = :target_user_id
            ";
            $unfollow_stmt = $pdo->prepare($unfollow_sql);
            $unfollow_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $unfollow_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
            $unfollow_stmt->execute();
            
            $message = 'User unfollowed successfully';
            $new_status = false;
        }
        
        // Get updated follower counts
        $follower_count_sql = "
            SELECT COUNT(*) as count 
            FROM amigos 
            WHERE amigo_id = :target_user_id
        ";
        $follower_stmt = $pdo->prepare($follower_count_sql);
        $follower_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
        $follower_stmt->execute();
        $follower_count = $follower_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        $following_count_sql = "
            SELECT COUNT(*) as count 
            FROM amigos 
            WHERE usuario_id = :target_user_id
        ";
        $following_stmt = $pdo->prepare($following_count_sql);
        $following_stmt->bindParam(':target_user_id', $target_user_id, PDO::PARAM_INT);
        $following_stmt->execute();
        $following_count = $following_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'action' => $action,
            'message' => $message,
            'is_following' => $new_status,
            'target_user' => [
                'id' => (int)$target_user['id'],
                'username' => $target_user['username'],
                'name' => $target_user['nombre'] . ' ' . $target_user['apellidos']
            ],
            'follower_count' => (int)$follower_count,
            'following_count' => (int)$following_count
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Follow user error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>