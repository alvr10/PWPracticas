<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    $db = new Database();
    $pdo = $db->connect();

    // Obtener países
    $countriesStmt = $pdo->query("SELECT id, nombre FROM paises ORDER BY nombre");
    $countries = $countriesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Obtener provincias
    $provincesStmt = $pdo->query("SELECT id, nombre, pais_id FROM provincias ORDER BY nombre");
    $provinces = $provincesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Obtener localidades
    $citiesStmt = $pdo->query("SELECT id, nombre, provincia_id FROM localidades ORDER BY nombre");
    $cities = $citiesStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'countries' => $countries,
        'provinces' => $provinces,
        'cities' => $cities
    ]);

} catch (PDOException $e) {
    error_log("Get locations error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en la base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Get locations error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>