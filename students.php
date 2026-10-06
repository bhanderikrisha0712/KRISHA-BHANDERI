<?php
session_start();
header("Content-Type: application/json");

if (!isset($_SESSION["logged_in"]) || $_SESSION["logged_in"] !== true) {
    http_response_code(401);
    echo json_encode(["message"=>"Please login first."]);
    exit;
}

$file = __DIR__ . "/../data/students.json";

function readStudents($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}
function writeStudents($file, $students) {
    file_put_contents($file, json_encode($students, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    echo json_encode(readStudents($file));
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["message"=>"Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$action = $input["action"] ?? "";
$students = readStudents($file);

if ($action === "add") {
    $student = $input["student"] ?? null;
    if (!$student || empty($student["roll"]) || empty($student["name"])) {
        http_response_code(400);
        echo json_encode(["message"=>"Name and roll number are required."]);
        exit;
    }
    foreach ($students as $s) {
        if ((string)$s["roll"] === (string)$student["roll"]) {
            http_response_code(409);
            echo json_encode(["message"=>"This Roll Number already exists."]);
            exit;
        }
    }
    $students[] = $student;
    writeStudents($file, $students);
    echo json_encode(["success"=>true, "student"=>$student]);
    exit;
}

if ($action === "update") {
    $student = $input["student"] ?? null;
    if (!$student || empty($student["id"])) {
        http_response_code(400);
        echo json_encode(["message"=>"Student ID is required."]);
        exit;
    }
    $found = false;
    foreach ($students as $i => $s) {
        if ($s["id"] === $student["id"]) {
            $students[$i] = $student;
            $found = true;
            break;
        }
    }
    if (!$found) {
        http_response_code(404);
        echo json_encode(["message"=>"Student not found."]);
        exit;
    }
    writeStudents($file, $students);
    echo json_encode(["success"=>true]);
    exit;
}

if ($action === "delete") {
    $id = $input["id"] ?? "";
    $new = array_values(array_filter($students, fn($s) => ($s["id"] ?? "") !== $id));
    if (count($new) === count($students)) {
        http_response_code(404);
        echo json_encode(["message"=>"Student not found."]);
        exit;
    }
    writeStudents($file, $new);
    echo json_encode(["success"=>true]);
    exit;
}

http_response_code(400);
echo json_encode(["message"=>"Unknown action."]);
?>