<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

error_log("Create activity endpoint called");

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
    error_log("POST data received: " . json_encode($_POST));
    error_log("FILES data received: " . json_encode(array_keys($_FILES)));
    
    // Verify authentication
    if (!isset($_POST['token'])) {
        throw new Exception('Token is required');
    }
    
    $token = $_POST['token'];
    
    // Verify authentication using auth_functions
    $user = verify_token($token);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    error_log("Authenticated user ID: " . $user_id);
    
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
    
    error_log("Creating activity: '$titulo' of type $tipo_actividad_id");
    
    $pdo = get_db_connection();
    $pdo->beginTransaction();
    
    try {
        // Handle GPX file upload
        $gpx_content = '';
        if (isset($_FILES['gpx_file']) && $_FILES['gpx_file']['error'] === UPLOAD_ERR_OK) {
            $gpx_file = $_FILES['gpx_file'];
            error_log("Processing GPX file: " . $gpx_file['name']);
            
            // Validate GPX file
            if ($gpx_file['size'] > 5 * 1024 * 1024) { // 5MB limit
                throw new Exception('GPX file is too large');
            }
            
            $file_extension = strtolower(pathinfo($gpx_file['name'], PATHINFO_EXTENSION));
            if ($file_extension !== 'gpx') {
                throw new Exception('Only GPX files are allowed');
            }
            
            $gpx_content = file_get_contents($gpx_file['tmp_name']);
            
            // Basic GPX validation
            if (strpos($gpx_content, '<gpx') === false) {
                throw new Exception('Invalid GPX file format');
            }
            
            error_log("GPX file processed successfully");
        } else {
            // Create a simple GPX placeholder if no file uploaded
            $gpx_content = '<?xml version="1.0"?><gpx version="1.1"><trk><name>' . $titulo . '</name></trk></gpx>';
        }
        
        // Determine activity date
        $fecha_actividad = isset($_POST['fecha_actividad']) && !empty($_POST['fecha_actividad']) ? 
            $_POST['fecha_actividad'] : date('Y-m-d H:i:s');
        
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
        error_log("Activity created with ID: " . $activity_id);
        
        // Handle image uploads
        if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
            $upload_dir = '../../../public/activities/';
            
            // Create directory if it doesn't exist
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
                error_log("Created upload directory: " . $upload_dir);
            }
            
            $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $max_file_size = 2 * 1024 * 1024; // 2MB
            
            $uploaded_count = 0;
            for ($i = 0; $i < count($_FILES['images']['name']); $i++) {
                if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                    $file_type = $_FILES['images']['type'][$i];
                    $file_size = $_FILES['images']['size'][$i];
                    $tmp_name = $_FILES['images']['tmp_name'][$i];
                    
                    // Validate file type
                    if (!in_array($file_type, $allowed_types)) {
                        error_log("Skipping file $i: invalid type $file_type");
                        continue;
                    }
                    
                    // Validate file size
                    if ($file_size > $max_file_size) {
                        error_log("Skipping file $i: too large ($file_size bytes)");
                        continue;
                    }
                    
                    // Generate unique filename
                    $file_extension = pathinfo($_FILES['images']['name'][$i], PATHINFO_EXTENSION);
                    $filename = uniqid() . '_' . time() . '.' . $file_extension;
                    $file_path = $upload_dir . $filename;
                    
                    // Move uploaded file
                    if (move_uploaded_file($tmp_name, $file_path)) {
                        // Get image dimensions
                        $image_info = getimagesize($file_path);
                        $width = $image_info ? $image_info[0] : 0;
                        $height = $image_info ? $image_info[1] : 0;
                        
                        // Insert image record
                        $image_sql = "
                            INSERT INTO imagenes (usuario_id, nombre, tamaño, alto, ancho, ruta, fecha_subida)
                            VALUES (:user_id, :nombre, :tamaño, :alto, :ancho, :ruta, NOW())
                        ";
                        
                        $image_stmt = $pdo->prepare($image_sql);
                        $image_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                        $image_stmt->bindParam(':nombre', $filename, PDO::PARAM_STR);
                        $image_stmt->bindParam(':tamaño', $file_size, PDO::PARAM_INT);
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
                        
                        $uploaded_count++;
                        error_log("Image uploaded successfully: $filename");
                    } else {
                        error_log("Failed to move uploaded file $i");
                    }
                }
            }
            error_log("Total images uploaded: $uploaded_count");
        }
        
        // Handle companions
        if (isset($_POST['companions']) && !empty($_POST['companions'])) {
            $companions = json_decode($_POST['companions'], true);
            error_log("Processing companions: " . json_encode($companions));
            
            if (is_array($companions)) {
                $companion_count = 0;
                foreach ($companions as $companion) {
                    if (isset($companion['id']) && is_numeric($companion['id'])) {
                        $companion_id = (int)$companion['id'];
                        
                        // For now, add all companions without friendship check
                        // In production, you might want to verify friendship
                        $companion_sql = "
                            INSERT INTO actividad_companeros (actividad_id, usuario_id)
                            VALUES (:activity_id, :companion_id)
                        ";
                        
                        $companion_stmt = $pdo->prepare($companion_sql);
                        $companion_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
                        $companion_stmt->bindParam(':companion_id', $companion_id, PDO::PARAM_INT);
                        $companion_stmt->execute();
                        
                        $companion_count++;
                        error_log("Added companion: $companion_id");
                    }
                }
                error_log("Total companions added: $companion_count");
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
        error_log("Transaction rolled back due to error: " . $e->getMessage());
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