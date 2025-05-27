<?php
header('Content-Type: application/json');
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$userId = $_SESSION['user_id'];
$searchTerm = $_GET['q'] ?? '';

try {
    $stmt = $pdo->prepare("
        SELECT u.id, u.username, u.nombre, u.apellidos, i.ruta as imagen 
        FROM usuarios u
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE (u.nombre LIKE :search OR u.apellidos LIKE :search OR u.username LIKE :search)
        AND u.id != :userId
        LIMIT 10
    ");
    $stmt->execute([
        ':search' => "%$searchTerm%",
        ':userId' => $userId
    ]);
    
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(array_map(function($friend) {
        return [
            'id' => $friend['id'],
            'name' => $friend['nombre'] . ' ' . $friend['apellidos'],
            'username' => $friend['username'],
            'avatar' => $friend['imagen'] ? '../../../' . $friend['imagen'] : '../../../public/profiles/default-avatar.jpg'
        ];
    }, $friends));

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>