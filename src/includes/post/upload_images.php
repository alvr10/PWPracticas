<?php
header('Content-Type: application/json');
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (!isset($_FILES['gpx_file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió archivo']);
    exit;
}

$file = $_FILES['gpx_file'];

// Validar tipo de archivo
if ($file['type'] !== 'application/gpx+xml' && pathinfo($file['name'], PATHINFO_EXTENSION) !== 'gpx') {
    http_response_code(400);
    echo json_encode(['error' => 'Solo se permiten archivos GPX']);
    exit;
}

// Crear directorio si no existe
$uploadDir = '../../public/uploads/gpx/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Generar nombre único
$fileName = uniqid() . '_' . basename($file['name']);
$targetPath = $uploadDir . $fileName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode([
        'success' => true,
        'file_path' => $targetPath,
        'file_name' => $fileName
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al subir el archivo']);
}
?>