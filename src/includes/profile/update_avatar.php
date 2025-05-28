<?php
// src/includes/profile/upload_avatar.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

// Start debug log
error_log("===== Avatar Upload Debug Start =====");
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Content Type: " . $_SERVER['CONTENT_TYPE'] ?? 'Not set');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Debug upload data
    error_log("POST data: " . print_r($_POST, true));
    error_log("FILES data: " . print_r($_FILES, true));
    error_log("Headers: " . print_r(getallheaders(), true));

    // Get token
    $token = $_POST['token'] ?? 
             (isset($_SERVER['HTTP_AUTHORIZATION']) && preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches) ? $matches[1] : null) ?? 
             ($_SERVER['HTTP_X_AUTH_TOKEN'] ?? null);
    
    if (!$token) {
        throw new Exception('Token is required');
    }
    
    error_log("Token received (first 10 chars): " . substr($token, 0, 10) . "...");
    
    $user = verify_token($token);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    error_log("User verified - ID: $user_id");

    // Validate file upload
    if (!isset($_FILES['avatar'])) {
        throw new Exception('No file uploaded');
    }
    
    $file = $_FILES['avatar'];
    error_log("File info - Name: {$file['name']}, Size: {$file['size']}, Type: {$file['type']}, Tmp: {$file['tmp_name']}");
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error_messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize (' . ini_get('upload_max_filesize') . ')',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'Partial upload',
            UPLOAD_ERR_NO_FILE => 'No file',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temp directory',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write to disk',
            UPLOAD_ERR_EXTENSION => 'PHP extension stopped upload'
        ];
        throw new Exception($error_messages[$file['error']] ?? 'Unknown upload error');
    }
    
    // Validate file type
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('Invalid file type. Allowed: ' . implode(', ', $allowed_types));
    }
    
    // Validate file size (max 2MB)
    $max_size = 2 * 1024 * 1024;
    if ($file['size'] > $max_size) {
        throw new Exception('File exceeds 2MB limit');
    }
    
    // Validate image
    $image_info = getimagesize($file['tmp_name']);
    if ($image_info === false) {
        throw new Exception('Invalid image file');
    }
    
    list($width, $height) = $image_info;
    error_log("Image dimensions: {$width}x{$height}, Type: " . $image_info['mime']);

    // Database operations
    $pdo = get_db_connection();
    $pdo->beginTransaction();
    
    try {
        // Setup upload directory
        $upload_dir = __DIR__ . '/../../../public/profiles/';
        error_log("Upload directory: " . realpath($upload_dir));
        
        if (!is_dir($upload_dir)) {
            if (!mkdir($upload_dir, 0755, true)) {
                throw new Exception('Failed to create upload directory');
            }
            error_log("Created upload directory");
        }
        
        if (!is_writable($upload_dir)) {
            throw new Exception('Upload directory not writable');
        }
        
        // Generate filename
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = "avatar_{$user_id}_" . time() . ".$ext";
        $file_path = $upload_dir . $filename;
        
        error_log("Attempting to move file to: $file_path");
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $file_path)) {
            throw new Exception('Failed to move uploaded file. Check permissions.');
        }
        
        error_log("File moved successfully");
        
        // Get current image info
        $current_stmt = $pdo->prepare("
            SELECT i.id, i.nombre, i.ruta 
            FROM usuarios u 
            LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id 
            WHERE u.id = :user_id
        ");
        $current_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $current_stmt->execute();
        $current_image = $current_stmt->fetch(PDO::FETCH_ASSOC);
        error_log("Current image: " . print_r($current_image, true));
        
        // Insert new image record
        $image_stmt = $pdo->prepare("
            INSERT INTO imagenes (usuario_id, nombre, tamano, alto, ancho, ruta, fecha_subida)
            VALUES (:user_id, :nombre, :tamano, :alto, :ancho, :ruta, NOW())
        ");
        $image_stmt->execute([
            ':user_id' => $user_id,
            ':nombre' => $filename,
            ':tamano' => $file['size'],
            ':alto' => $height,
            ':ancho' => $width,
            ':ruta' => $file_path
        ]);
        $image_id = $pdo->lastInsertId();
        error_log("New image ID: $image_id");
        
        // Update user profile
        $update_stmt = $pdo->prepare("
            UPDATE usuarios 
            SET imagen_perfil_id = :image_id 
            WHERE id = :user_id
        ");
        $update_stmt->execute([':image_id' => $image_id, ':user_id' => $user_id]);
        error_log("User profile updated");
        
        // Clean up old image if exists
        if ($current_image && $current_image['ruta'] && $current_image['nombre'] !== 'default-avatar.jpg') {
            if (file_exists($current_image['ruta'])) {
                if (!unlink($current_image['ruta'])) {
                    error_log("Warning: Failed to delete old image file");
                } else {
                    error_log("Deleted old image file: {$current_image['ruta']}");
                }
            }
            
            // Delete old image record
            $delete_stmt = $pdo->prepare("
                DELETE FROM imagenes 
                WHERE usuario_id = :user_id AND id != :new_image_id
            ");
            $delete_stmt->execute([':user_id' => $user_id, ':new_image_id' => $image_id]);
            error_log("Deleted old image record");
        }
        
        $pdo->commit();
        
        // Return web-accessible URL
        $avatar_url = '/public/profiles/' . $filename;
        
        echo json_encode([
            'success' => true,
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $avatar_url,
            'filename' => $filename
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Transaction rolled back: " . $e->getMessage());
        
        // Clean up if file was moved but DB failed
        if (isset($file_path) && file_exists($file_path)) {
            unlink($file_path);
            error_log("Cleaned up uploaded file");
        }
        
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'php_version' => phpversion(),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'memory_limit' => ini_get('memory_limit'),
            'disk_free_space' => disk_free_space(__DIR__)
        ]
    ]);
}

error_log("===== Avatar Upload Debug End =====");
?>