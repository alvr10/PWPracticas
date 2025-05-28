<?php
// src/includes/post/create_activity.php - FIXED VERSION WITHOUT SIMPLEXML
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
    // Verify authentication
    if (!isset($_POST['token'])) {
        throw new Exception('Token is required');
    }
    
    $user = verify_token($_POST['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    
    // Validate required fields
    if (!isset($_POST['titulo']) || !isset($_POST['tipo_actividad_id'])) {
        throw new Exception('Title and activity type are required');
    }
    
    $titulo = trim($_POST['titulo']);
    $tipo_actividad_id = (int)$_POST['tipo_actividad_id'];
    
    if (empty($titulo)) {
        throw new Exception('Title cannot be empty');
    }
    
    if (!in_array($tipo_actividad_id, [1, 2, 3, 4])) {
        throw new Exception('Invalid activity type');
    }
    
    $pdo = get_db_connection();
    $pdo->beginTransaction();
    
    try {
        // Handle GPX file upload - SIMPLIFIED VERSION
        $gpx_content = '';
        if (isset($_FILES['gpx_file']) && $_FILES['gpx_file']['error'] === UPLOAD_ERR_OK) {
            $gpx_file = $_FILES['gpx_file'];
            
            // Validate GPX file size
            if ($gpx_file['size'] > 5 * 1024 * 1024) { // 5MB limit
                throw new Exception('GPX file is too large (max 5MB)');
            }
            
            // Validate file extension
            $file_extension = strtolower(pathinfo($gpx_file['name'], PATHINFO_EXTENSION));
            if ($file_extension !== 'gpx') {
                throw new Exception('Only GPX files are allowed');
            }
            
            // Read GPX content
            $gpx_content = file_get_contents($gpx_file['tmp_name']);
            
            // Basic GPX validation - check if it contains GPX-like content
            if (empty($gpx_content) || 
                strpos($gpx_content, '<?xml') === false || 
                strpos($gpx_content, '<gpx') === false) {
                throw new Exception('Invalid GPX file format');
            }
            
            error_log("GPX file processed successfully: " . $gpx_file['name']);
        }
        
        // Set activity date
        $fecha_actividad = isset($_POST['fecha_actividad']) && !empty($_POST['fecha_actividad']) 
            ? $_POST['fecha_actividad'] 
            : date('Y-m-d H:i:s');
        
        // Insert activity
        $activity_sql = "
            INSERT INTO actividades (usuario_id, titulo, tipo_actividad_id, ruta_gpx, fecha_actividad, fecha_publicacion)
            VALUES (:user_id, :titulo, :tipo_actividad_id, :ruta_gpx, :fecha_actividad, NOW())
        ";
        
        $activity_stmt = $pdo->prepare($activity_sql);
        $activity_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $activity_stmt->bindParam(':titulo', $titulo, PDO::PARAM_STR);
        $activity_stmt->bindParam(':tipo_actividad_id', $tipo_actividad_id, PDO::PARAM_INT);
        $activity_stmt->bindParam(':ruta_gpx', $gpx_content, PDO::PARAM_STR);
        $activity_stmt->bindParam(':fecha_actividad', $fecha_actividad, PDO::PARAM_STR);
        $activity_stmt->execute();
        
        $activity_id = $pdo->lastInsertId();
        error_log("Activity created with ID: $activity_id");
        
        // Handle image uploads
        if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
            $upload_dir = __DIR__ . '/../../../public/activities/';
            
            // Create directory if it doesn't exist
            if (!is_dir($upload_dir)) {
                if (!mkdir($upload_dir, 0755, true)) {
                    throw new Exception('Failed to create upload directory');
                }
            }
            
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $max_file_size = 2 * 1024 * 1024; // 2MB
            
            for ($i = 0; $i < count($_FILES['images']['name']); $i++) {
                if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                    $file_type = $_FILES['images']['type'][$i];
                    $file_size = $_FILES['images']['size'][$i];
                    $tmp_name = $_FILES['images']['tmp_name'][$i];
                    
                    // Validate file type
                    if (!in_array($file_type, $allowed_types)) {
                        error_log("Skipping invalid file type: $file_type");
                        continue;
                    }
                    
                    // Validate file size
                    if ($file_size > $max_file_size) {
                        error_log("Skipping large file: $file_size bytes");
                        continue;
                    }
                    
                    // Generate unique filename
                    $file_extension = pathinfo($_FILES['images']['name'][$i], PATHINFO_EXTENSION);
                    $filename = uniqid() . '_' . time() . '.' . $file_extension;
                    $file_path = $upload_dir . $filename;
                    
                    // Move uploaded file
                    if (move_uploaded_file($tmp_name, $file_path)) {
                        // Get image dimensions (optional - skip if getimagesize fails)
                        $image_info = @getimagesize($file_path);
                        $width = $image_info ? $image_info[0] : 0;
                        $height = $image_info ? $image_info[1] : 0;
                        
                        // Insert image record
                        $image_sql = "
                            INSERT INTO imagenes (usuario_id, nombre, tamano, alto, ancho, ruta, fecha_subida)
                            VALUES (:user_id, :nombre, :tamano, :alto, :ancho, :ruta, NOW())
                        ";
                        
                        $image_stmt = $pdo->prepare($image_sql);
                        $image_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                        $image_stmt->bindParam(':nombre', $filename, PDO::PARAM_STR);
                        $image_stmt->bindParam(':tamano', $file_size, PDO::PARAM_INT);
                        $image_stmt->bindParam(':alto', $height, PDO::PARAM_INT);
                        $image_stmt->bindParam(':ancho', $width, PDO::PARAM_INT);
                        $image_stmt->bindParam(':ruta', $file_path, PDO::PARAM_STR);
                        $image_stmt->execute();
                        
                        $image_id = $pdo->lastInsertId();
                        
                        // Link image to activity
                        $link_sql = "
                            INSERT INTO actividad_imagenes (actividad_id, imagen_id)
                            VALUES (:activity_id, :image_id)
                        ";
                        
                        $link_stmt = $pdo->prepare($link_sql);
                        $link_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
                        $link_stmt->bindParam(':image_id', $image_id, PDO::PARAM_INT);
                        $link_stmt->execute();
                        
                        error_log("Image uploaded and linked: $filename");
                    } else {
                        error_log("Failed to move uploaded file: " . $_FILES['images']['name'][$i]);
                    }
                }
            }
        }
        
        // Handle companions
        if (isset($_POST['companions']) && !empty($_POST['companions'])) {
            $companions = json_decode($_POST['companions'], true);
            
            if (is_array($companions)) {
                foreach ($companions as $companion) {
                    if (isset($companion['id']) && is_numeric($companion['id'])) {
                        $companion_id = (int)$companion['id'];
                        
                        // Verify companion is a friend (simplified - skip verification for class project)
                        $companion_sql = "
                            INSERT INTO actividad_companeros (actividad_id, usuario_id)
                            VALUES (:activity_id, :companion_id)
                        ";
                        
                        $companion_stmt = $pdo->prepare($companion_sql);
                        $companion_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
                        $companion_stmt->bindParam(':companion_id', $companion_id, PDO::PARAM_INT);
                        $companion_stmt->execute();
                        
                        error_log("Companion added: $companion_id");
                    }
                }
            }
        }
        
        $pdo->commit();
        error_log("Activity creation completed successfully");
        
        echo json_encode([
            'success' => true,
            'activity_id' => (int)$activity_id,
            'message' => 'Activity created successfully'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        error_log("Transaction rolled back: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Create activity error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>