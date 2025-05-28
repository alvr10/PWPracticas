<?php
// src/includes/admin/reactivate_user.php
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
    
    $admin_user = verify_token($input['token']);
    if (!$admin_user || $admin_user['rol_id'] != 1) {
        throw new Exception('Admin access required');
    }
    
    $user_id = (int)$input['user_id'];
    $pdo = get_db_connection();
    
    // Check if user exists and is deactivated
    $check_sql = "SELECT id, fecha_baja FROM usuarios WHERE id = :user_id";
    $check_stmt = $pdo->prepare($check_sql);
    $check_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $check_stmt->execute();
    $user_data = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user_data) {
        throw new Exception('User not found');
    }
    
    if (!$user_data['fecha_baja']) {
        throw new Exception('User is already active');
    }
    
    // Reactivate user
    $sql = "UPDATE usuarios SET fecha_baja = NULL WHERE id = :user_id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'User reactivated successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Reactivate user error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>