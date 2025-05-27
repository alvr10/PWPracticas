<?php
header('Content-Type: application/json');
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (!isset($_FILES['images'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibieron imágenes']);
    exit;
}

$uploadedImages = [];
$uploadDir = '../../../public/uploads/images/';

// Crear directorio si no existe
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

foreach ($_FILES['images']['tmp_name'] as $key => $tmpName) {
    $fileType = $_FILES['images']['type'][$key];
    
    // Validar que sea imagen
    if (!strstr($fileType, 'image/')) {
        continue;
    }
    
    // Generar nombre único
    $fileName = uniqid() . '_' . basename($_FILES['images']['name'][$key]);
    $targetPath = $uploadDir . $fileName;
    
    if (move_uploaded_file($tmpName, $targetPath)) {
        $uploadedImages[] = [
            'file_path' => $targetPath,
            'file_name' => $fileName
        ];
    }
}

if (!empty($uploadedImages)) {
    echo json_encode([
        'success' => true,
        'images' => $uploadedImages
    ]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'No se subieron imágenes válidas']);
}
?>