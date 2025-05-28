<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['token'])) {
        throw new Exception('Token is required');
    }
    
    $token = $input['token'];
    
    // Simple token verification using session
    session_start();
    if (!isset($_SESSION['auth_token']) || $_SESSION['auth_token'] !== $token || 
        !isset($_SESSION['user_id']) || $_SESSION['auth'] !== true) {
        throw new Exception('Invalid or expired token');
    }
    
    $userId = $_SESSION['user_id'];
    $db = new Database();
    $pdo = $db->connect();

    // Validate required fields
    if (!isset($input['name']) || !isset($input['lastname']) || !isset($input['username'])) {
        throw new Exception('Name, lastname, and username are required');
    }

    // Sanitize input data
    $name = trim($input['name']);
    $lastname = trim($input['lastname']);
    $username = trim($input['username']);
    $birthdate = isset($input['birthdate']) ? $input['birthdate'] : null;
    $city_id = isset($input['city']) && is_numeric($input['city']) ? (int)$input['city'] : null;
    $activity_id = isset($input['activity']) && is_numeric($input['activity']) ? (int)$input['activity'] : null;

    // Validate data
    if (empty($name) || empty($lastname) || empty($username)) {
        throw new Exception('Name, lastname, and username cannot be empty');
    }

    if (strlen($username) < 3 || strlen($username) > 50) {
        throw new Exception('Username must be between 3 and 50 characters');
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        throw new Exception('Username can only contain letters, numbers, and underscores');
    }

    // Check if username is already taken by another user
    $checkUsernameStmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM usuarios 
        WHERE username = ? AND id != ? AND fecha_baja IS NULL
    ");
    $checkUsernameStmt->execute([$username, $userId]);
    $usernameExists = $checkUsernameStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;

    if ($usernameExists) {
        throw new Exception('Username is already taken');
    }

    // Start transaction
    $pdo->beginTransaction();

    try {
        // Update user data
        $updateSql = "
            UPDATE usuarios SET 
                nombre = ?, 
                apellidos = ?, 
                username = ?";
        
        $params = [$name, $lastname, $username];

        if ($birthdate) {
            $updateSql .= ", fecha_nacimiento = ?";
            $params[] = $birthdate;
        }

        if ($city_id) {
            $updateSql .= ", localidad_id = ?";
            $params[] = $city_id;
        }

        if ($activity_id) {
            $updateSql .= ", actividad_preferida_id = ?";
            $params[] = $activity_id;
        }

        $updateSql .= " WHERE id = ? AND fecha_baja IS NULL";
        $params[] = $userId;

        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute($params);

        if ($updateStmt->rowCount() === 0) {
            throw new Exception('No changes were made or user not found');
        }

        // Commit transaction
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully'
        ]);

    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Update profile error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>