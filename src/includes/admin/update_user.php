
<?php
// src/includes/admin/update_user.php
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
    $nombre = isset($input['nombre']) ? trim($input['nombre']) : null;
    $apellidos = isset($input['apellidos']) ? trim($input['apellidos']) : null;
    $email = isset($input['email']) ? trim($input['email']) : null;
    $username = isset($input['username']) ? trim($input['username']) : null;
    $rol_id = isset($input['rol_id']) ? (int)$input['rol_id'] : null;
    $status = isset($input['status']) ? $input['status'] : null;
    
    // Validate required fields
    if (empty($nombre) || empty($apellidos) || empty($email) || empty($username) || !$rol_id) {
        throw new Exception('All fields are required');
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Validate role
    if (!in_array($rol_id, [1, 2])) {
        throw new Exception('Invalid role');
    }
    
    $pdo = get_db_connection();
    
    // Check if email is already used by another user
    $email_check = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE email = :email AND id != :user_id");
    $email_check->bindParam(':email', $email);
    $email_check->bindParam(':user_id', $user_id);
    $email_check->execute();
    
    if ($email_check->fetchColumn() > 0) {
        throw new Exception('Email already exists for another user');
    }
    
    // Check if username is already used by another user
    $username_check = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE username = :username AND id != :user_id");
    $username_check->bindParam(':username', $username);
    $username_check->bindParam(':user_id', $user_id);
    $username_check->execute();
    
    if ($username_check->fetchColumn() > 0) {
        throw new Exception('Username already exists for another user');
    }
    
    // Prevent admin from demoting themselves
    if ($admin_user['id'] == $user_id && $rol_id != 1) {
        throw new Exception('Cannot demote yourself from admin role');
    }
    
    // Update user
    $fecha_baja = null;
    if ($status === 'inactive') {
        $fecha_baja = date('Y-m-d H:i:s');
    }
    
    $sql = "
        UPDATE usuarios 
        SET nombre = :nombre, apellidos = :apellidos, email = :email, 
            username = :username, rol_id = :rol_id, fecha_baja = :fecha_baja
        WHERE id = :user_id
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':nombre', $nombre);
    $stmt->bindParam(':apellidos', $apellidos);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':rol_id', $rol_id, PDO::PARAM_INT);
    $stmt->bindParam(':fecha_baja', $fecha_baja);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        throw new Exception('User not found or no changes made');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'User updated successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Update user error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>