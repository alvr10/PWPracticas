<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    // Obtener países
    $countries = $pdo->query("SELECT id, nombre FROM paises")->fetchAll(PDO::FETCH_ASSOC);

    // Obtener provincias
    $provinces = $pdo->query("SELECT id, nombre, pais_id FROM provincias")->fetchAll(PDO::FETCH_ASSOC);

    // Obtener localidades
    $cities = $pdo->query("SELECT id, nombre, provincia_id FROM localidades")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'countries' => $countries,
        'provinces' => $provinces,
        'cities' => $cities
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>