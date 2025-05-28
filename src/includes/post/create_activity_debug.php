<?php
// src/includes/post/create_activity_debug.php - Temporary debug version
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

// Log all received data
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Debug: Check if token exists
    if (!isset($_POST['token'])) {
        throw new Exception('Token is required');
    }
    
    error_log("Token received: " . substr($_POST['token'], 0, 10) . "...");
    
    $user = verify_token($_POST['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    error_log("User verified: " . $user['id']);
    
    $user_id = $user['id'];
    
    // Validate required fields
    if (!isset($_POST['titulo']) || !isset($_POST['tipo_actividad_id'])) {
        throw new Exception('Title and activity type are required');
    }
    
    $titulo = trim($_POST['titulo']);
    $tipo_actividad_id = (int)$_POST['tipo_actividad_id'];
    
    error_log("Activity title: $titulo, type: $tipo_actividad_id");
    
    if (empty($titulo)) {
        throw new Exception('Title cannot be empty');
    }
    
    if (!in_array($tipo_actividad_id, [1, 2, 3, 4])) {
        throw new Exception('Invalid activity type');
    }
    
    $pdo = get_db_connection();
    $pdo->beginTransaction();
    
    try {
        // Handle GPX file upload
        $gpx_content = '';
        if (isset($_FILES['gpx_file']) && $_FILES['gpx_file']['error'] === UPLOAD_ERR_OK) {
            error_log("GPX file received: " . $_FILES['gpx_file']['name']);
            $gpx_file = $_FILES['gpx_file'];
            
            // Validate GPX file
            if ($gpx_file['size'] > 5 * 1024 * 1024) { // 5MB limit
                throw new Exception('GPX file is too large');
            }
            
            $file_extension = strtolower(pathinfo($gpx_file['name'], PATHINFO_EXTENSION));
            if ($file_extension !== 'gpx') {
                throw new Exception('Only GPX files are allowed');
            }
            
            $gpx_content = file_get_contents($gpx_file['tmp_name']);
            
            // Validate GPX content
            $xml = simplexml_load_string($gpx_content);
            if ($xml === false) {
                throw new Exception('Invalid GPX file format');
            }
            
            error_log("GPX file processed successfully");
        }
        
        // Set activity date
        $fecha_actividad = isset($_POST['fecha_actividad']) && !empty($_POST['fecha_actividad']) 
            ? $_POST['fecha_actividad'] 
            : date('Y-m-d H:i:s');
        
        error_log("Activity date: $fecha_actividad");
        
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
            error_log("Processing images: " . count($_FILES['images']['name']));
            
            // Fixed upload directory path
            $upload_dir = __DIR__ . '/../../../public/activities/';
            error_log("Upload directory: $upload_dir");
            
            // Create directory if it doesn't exist
            if (!is_dir($upload_dir)) {
                if (!mkdir($upload_dir, 0755, true)) {
                    throw new Exception("Failed to create upload directory: $upload_dir");
                }
                error_log("Created upload directory");
            }
            
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $max_file_size = 2 * 1024 * 1024; // 2MB
            
            for ($i = 0; $i < count($_FILES['images']['name']); $i++) {
                if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                    error_log("Processing image $i: " . $_FILES['images']['name'][$i]);
                    
                    $file_type = $_FILES['images']['type'][$i];
                    $file_size = $_FILES['images']['size'][$i];
                    $tmp_name = $_FILES['images']['tmp_name'][$i];
                    
                    // Validate file type
                    if (!in_array($file_type, $allowed_types)) {
                        error_log("Skipping invalid file type: $file_type");
                        continue; // Skip invalid files
                    }
                    
                    // Validate file size
                    if ($file_size > $max_file_size) {
                        error_log("Skipping large file: $file_size bytes");
                        continue; // Skip large files
                    }
                    
                    // Generate unique filename
                    $file_extension = pathinfo($_FILES['images']['name'][$i], PATHINFO_EXTENSION);
                    $filename = uniqid() . '_' . time() . '.' . $file_extension;
                    $file_path = $upload_dir . $filename;
                    
                    error_log("Moving file to: $file_path");
                    
                    // Move uploaded file
                    if (move_uploaded_file($tmp_name, $file_path)) {
                        error_log("File moved successfully");
                        
                        // Get image dimensions
                        $image_info = getimagesize($file_path);
                        if ($image_info === false) {
                            error_log("Could not get image dimensions");
                            continue;
                        }
                        
                        $width = $image_info[0];
                        $height = $image_info[1];
                        
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
                        error_log("Image record created with ID: $image_id");
                        
                        // Link image to activity
                        $link_sql = "
                            INSERT INTO actividad_imagenes (actividad_id, imagen_id)
                            VALUES (:activity_id, :image_id)
                        ";
                        
                        $link_stmt = $pdo->prepare($link_sql);
                        $link_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
                        $link_stmt->bindParam(':image_id', $image_id, PDO::PARAM_INT);
                        $link_stmt->execute();
                        
                        error_log("Image linked to activity");
                    } else {
                        error_log("Failed to move uploaded file");
                    }
                } else {
                    error_log("Image upload error: " . $_FILES['images']['error'][$i]);
                }
            }
        }
        
        // Handle companions
        if (isset($_POST['companions']) && !empty($_POST['companions'])) {
            error_log("Processing companions: " . $_POST['companions']);
            
            $companions = json_decode($_POST['companions'], true);
            
            if (is_array($companions)) {
                foreach ($companions as $companion) {
                    if (isset($companion['id']) && is_numeric($companion['id'])) {
                        $companion_id = (int)$companion['id'];
                        error_log("Adding companion: $companion_id");
                        
                        // Verify companion is a friend
                        $friend_check_sql = "
                            SELECT COUNT(*) as count 
                            FROM amigos 
                            WHERE usuario_id = :user_id AND amigo_id = :companion_id
                        ";
                        
                        $friend_stmt = $pdo->prepare($friend_check_sql);
                        $friend_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                        $friend_stmt->bindParam(':companion_id', $companion_id, PDO::PARAM_INT);
                        $friend_stmt->execute();
                        
                        $is_friend = $friend_stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
                        
                        if ($is_friend) {
                            $companion_sql = "
                                INSERT INTO actividad_companeros (actividad_id, usuario_id)
                                VALUES (:activity_id, :companion_id)
                            ";
                            
                            $companion_stmt = $pdo->prepare($companion_sql);
                            $companion_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
                            $companion_stmt->bindParam(':companion_id', $companion_id, PDO::PARAM_INT);
                            $companion_stmt->execute();
                            
                            error_log("Companion added successfully");
                        } else {
                            error_log("Companion is not a friend, skipping");
                        }
                    }
                }
            }
        }
        
        $pdo->commit();
        error_log("Transaction committed successfully");
        
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
        'message' => $e->getMessage(),
        'debug' => [
            'post_data' => $_POST,
            'files_data' => $_FILES
        ]
    ]);
}
?>