<?php
// src/includes/profile/upload_avatar.php
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
    // Get token from either POST data or headers
    $token = null;
    
    // First try to get from POST data (FormData)
    if (isset($_POST['token'])) {
        $token = $_POST['token'];
    }
    // If not found, try Authorization header
    elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            $token = $matches[1];
        }
    }
    // If still not found, try custom header
    elseif (isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        $token = $_SERVER['HTTP_X_AUTH_TOKEN'];
    }
    
    if (!$token) {
        throw new Exception('Token is required');
    }
    
    error_log("Token received: " . substr($token, 0, 10) . "...");
    
    $user = verify_token($token);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    error_log("User verified: " . $user_id);
    
    // Check if file was uploaded
    if (!isset($_FILES['avatar'])) {
        throw new Exception('No file uploaded');
    }
    
    if ($_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        $error_messages = [
            UPLOAD_ERR_INI_SIZE => 'File too large (server limit)',
            UPLOAD_ERR_FORM_SIZE => 'File too large (form limit)',
            UPLOAD_ERR_PARTIAL => 'File partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'No temporary directory',
            UPLOAD_ERR_CANT_WRITE => 'Cannot write file',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];
        
        $error = $error_messages[$_FILES['avatar']['error']] ?? 'Unknown upload error';
        throw new Exception($error);
    }
    
    $file = $_FILES['avatar'];
    error_log("File uploaded: " . $file['name'] . " (" . $file['size'] . " bytes)");
    
    // Validate file type
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }
    
    // Validate file size (max 2MB)
    $max_size = 2 * 1024 * 1024; // 2MB
    if ($file['size'] > $max_size) {
        throw new Exception('File too large. Maximum size is 2MB.');
    }
    
    // Validate image dimensions and get info
    $image_info = getimagesize($file['tmp_name']);
    if ($image_info === false) {
        throw new Exception('Invalid image file.');
    }
    
    $width = $image_info[0];
    $height = $image_info[1];
    error_log("Image dimensions: {$width}x{$height}");
    
    // Optional: Validate minimum dimensions
    if ($width < 100 || $height < 100) {
        throw new Exception('Image too small. Minimum size is 100x100 pixels.');
    }
    
    $pdo = get_db_connection();
    $pdo->beginTransaction();
    
    try {
        // Create upload directory if it doesn't exist
        $upload_dir = __DIR__ . '/../../../public/profiles/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
            error_log("Created upload directory: " . $upload_dir);
        }
        
        // Generate unique filename
        $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $user_id . '_' . time() . '.' . $file_extension;
        $file_path = $upload_dir . $filename;
        
        error_log("Moving file to: " . $file_path);
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $file_path)) {
            throw new Exception('Failed to save uploaded file.');
        }
        
        error_log("File moved successfully");
        
        // Get current profile image to delete later
        $current_image_sql = "
            SELECT i.nombre, i.ruta 
            FROM usuarios u 
            LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id 
            WHERE u.id = :user_id
        ";
        $current_stmt = $pdo->prepare($current_image_sql);
        $current_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $current_stmt->execute();
        $current_image = $current_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Insert new image record
        $image_sql = "
            INSERT INTO imagenes (usuario_id, nombre, tamano, alto, ancho, ruta, fecha_subida)
            VALUES (:user_id, :nombre, :tamano, :alto, :ancho, :ruta, NOW())
        ";
        
        $image_stmt = $pdo->prepare($image_sql);
        $image_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $image_stmt->bindParam(':nombre', $filename, PDO::PARAM_STR);
        $image_stmt->bindParam(':tamano', $file['size'], PDO::PARAM_INT);
        $image_stmt->bindParam(':alto', $height, PDO::PARAM_INT);
        $image_stmt->bindParam(':ancho', $width, PDO::PARAM_INT);
        $image_stmt->bindParam(':ruta', $file_path, PDO::PARAM_STR);
        $image_stmt->execute();
        
        $image_id = $pdo->lastInsertId();
        error_log("Image record created with ID: " . $image_id);
        
        // Update user's profile image
        $update_user_sql = "
            UPDATE usuarios 
            SET imagen_perfil_id = :image_id 
            WHERE id = :user_id
        ";
        $update_stmt = $pdo->prepare($update_user_sql);
        $update_stmt->bindParam(':image_id', $image_id, PDO::PARAM_INT);
        $update_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $update_stmt->execute();
        
        error_log("User profile updated");
        
        // Delete old profile image file if it exists and it's not the default
        if ($current_image && $current_image['ruta'] && $current_image['nombre'] !== 'gigachad_cat.jpg') {
            if (file_exists($current_image['ruta'])) {
                unlink($current_image['ruta']);
                error_log("Deleted old avatar file: " . $current_image['ruta']);
            }
            
            // Delete old image record
            $delete_image_sql = "DELETE FROM imagenes WHERE usuario_id = :user_id AND id != :new_image_id";
            $delete_stmt = $pdo->prepare($delete_image_sql);
            $delete_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $delete_stmt->bindParam(':new_image_id', $image_id, PDO::PARAM_INT);
            $delete_stmt->execute();
            
            error_log("Deleted old image record");
        }
        
        $pdo->commit();
        error_log("Transaction committed successfully");
        
        // Return success with new avatar URL
        $avatar_url = '../../../public/profiles/' . $filename;
        
        echo json_encode([
            'success' => true,
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $avatar_url,
            'filename' => $filename
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        error_log("Transaction rolled back: " . $e->getMessage());
        
        // Clean up uploaded file if database operation failed
        if (isset($file_path) && file_exists($file_path)) {
            unlink($file_path);
            error_log("Cleaned up uploaded file");
        }
        
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Upload avatar error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'post_data' => $_POST,
            'files_data' => $_FILES,
            'headers' => getallheaders()
        ]
    ]);
}
?>