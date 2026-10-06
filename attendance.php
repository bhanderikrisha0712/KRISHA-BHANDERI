<?php
session_start();
header("Content-Type: application/json");

if (!isset($_SESSION["logged_in"]) || $_SESSION["logged_in"] !== true) {
    http_response_code(401);
    echo json_encode(["message"=>"Please login first."]);
    exit;
}

$file = __DIR__ . "/../data/attendance.json";
$studentFile = __DIR__ . "/../data/students.json";

function readJson($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}
function writeJson($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    echo json_encode(readJson($file));
    exit;
}
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["message"=>"Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$records = $input["records"] ?? [];
if (!is_array($records) || count($records) === 0) {
    http_response_code(400);
    echo json_encode(["message"=>"No attendance records received."]);
    exit;
}

$history = readJson($file);
$students = readJson($studentFile);

foreach ($records as $record) {
    $id = $record["id"] ?? "";
    $status = $record["status"] ?? "";
    if (!$id || !in_array($status, ["Present","Absent"], true)) continue;

    $found = false;
    foreach ($history as $i => $old) {
        if (($old["date"] ?? "") === ($record["date"] ?? "") && ($old["id"] ?? "") === $id) {
            $history[$i] = $record;
            $found = true;
            break;
        }
    }
    if (!$found) $history[] = $record;
}

foreach ($students as &$student) {
    $id = $student["id"] ?? "";
    $all = array_values(array_filter($history, fn($r) => ($r["id"] ?? "") === $id));
    $student["present"] = count(array_filter($all, fn($r) => ($r["status"] ?? "") === "Present"));
    $student["absent"] = count(array_filter($all, fn($r) => ($r["status"] ?? "") === "Absent"));
    $total = $student["present"] + $student["absent"];
    $student["attendancePercentage"] = $total ? round($student["present"] / $total * 100, 1) : 0;
}
unset($student);

writeJson($file, $history);
writeJson($studentFile, $students);

echo json_encode(["success"=>true, "records"=>$history]);
?>