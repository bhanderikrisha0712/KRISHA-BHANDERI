<?php
session_start();
header("Content-Type: application/json");

$username = trim($_POST["username"] ?? "");
$password = $_POST["password"] ?? "";

if ($username === "admin" && $password === "admin123") {
    session_regenerate_id(true);
    $_SESSION["logged_in"] = true;
    $_SESSION["username"] = $username;
    echo json_encode(["success"=>true, "message"=>"Login successful"]);
    exit;
}
http_response_code(401);
echo json_encode(["success"=>false, "message"=>"Invalid username or password"]);
?>