<?php
header('Content-Type: application/json');
require_once '../config/database.php';
session_start();

// Verificar si el usuario está logueado
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    // Obtener datos básicos del usuario
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.username, u.email, u.nombre, u.apellidos, 
            DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
            u.actividad_preferida_id, u.localidad_id,
            l.nombre as localidad_nombre, p.nombre as provincia_nombre, 
            pa.nombre as pais_nombre, ta.nombre as actividad_nombre,
            DATE_FORMAT(u.fecha_alta, '%M %Y') as fecha_alta_formatted,
            i.ruta as imagen_perfil
        FROM usuarios u
        LEFT JOIN localidades l ON u.localidad_id = l.id
        LEFT JOIN provincias p ON l.provincia_id = p.id
        LEFT JOIN paises pa ON p.pais_id = pa.id
        LEFT JOIN tipos_actividad ta ON u.actividad_preferida_id = ta.id
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userData) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }

    // Obtener estadísticas del usuario
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(a.id) as total_actividades,
            (SELECT COUNT(*) FROM amigos WHERE usuario_id = ? OR amigo_id = ?) as total_amigos,
            (SELECT COUNT(*) FROM actividad_aplausos aa JOIN actividades a ON aa.actividad_id = a.id WHERE a.usuario_id = ?) as total_aplausos
        FROM actividades a
        WHERE a.usuario_id = ?
    ");
    $statsStmt->execute([$userId, $userId, $userId, $userId]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // Obtener actividades recientes (últimas 3)
    $activitiesStmt = $pdo->prepare("
        SELECT 
            a.id, a.titulo, ta.nombre as tipo_actividad, 
            DATE_FORMAT(a.fecha_actividad, '%e %b %Y') as fecha_formatted,
            (SELECT COUNT(*) FROM actividad_aplausos WHERE actividad_id = a.id) as aplausos
        FROM actividades a
        JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        WHERE a.usuario_id = ?
        ORDER BY a.fecha_actividad DESC
        LIMIT 3
    ");
    $activitiesStmt->execute([$userId]);
    $activities = $activitiesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatear respuesta
    $response = [
        'user' => [
            'id' => $userData['id'],
            'username' => $userData['username'],
            'email' => $userData['email'],
            'name' => $userData['nombre'],
            'lastname' => $userData['apellidos'],
            'birthdate' => $userData['fecha_nacimiento'],
            'location' => $userData['localidad_nombre'] . ', ' . $userData['provincia_nombre'] . ', ' . $userData['pais_nombre'],
            'activity' => $userData['actividad_nombre'],
            'join_date' => $userData['fecha_alta_formatted'],
            'avatar_url' => $userData['imagen_perfil'] ? '../../../' . $userData['imagen_perfil'] : '../../../public/profiles/default-avatar.jpg'
        ],
        'stats' => $stats,
        'activities' => $activities
    ];

    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>