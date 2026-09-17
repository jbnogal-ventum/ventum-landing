<?php
/**
 * Ventum Software - "Start a project" form handler (home page).
 * Returns JSON: { "ok": bool, "message": string }
 */

header('Content-Type: application/json; charset=utf-8');

$receivingEmail = 'info@ventum.dev';
$fromEmail      = 'no-reply@ventum.dev'; // Must be a domain this server is allowed to send for.

$supportOptions = array(
	'New product development',
	'AI integration',
	'Improving an existing product',
	'Process automation',
	'Technical audit',
	'Product or development team',
	"I'm not sure yet",
);

function respond($ok, $message, $status = 200) {
	http_response_code($status);
	echo json_encode(array('ok' => $ok, 'message' => $message));
	exit;
}

function field($key, $maxLength) {
	$value = isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
	return mb_substr($value, 0, $maxLength);
}

// Strip line breaks so user input can never inject extra mail headers.
function header_safe($value) {
	return trim(preg_replace('/[\r\n]+/', ' ', $value));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	respond(false, 'Method not allowed.', 405);
}

// Honeypot: bots fill hidden fields; pretend success.
if (field('website', 200) !== '') {
	respond(true, 'Thank you.');
}

$name    = header_safe(field('name', 120));
$email   = header_safe(field('email', 200));
$company = header_safe(field('company', 200));
$support = field('support', 100);
$message = field('message', 5000);

$errors = array();
if ($name === '') {
	$errors[] = 'Please enter your name.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
	$errors[] = 'Please enter a valid email address.';
}
if (!in_array($support, $supportOptions, true)) {
	$errors[] = 'Please choose the kind of support you are looking for.';
}
if ($message === '') {
	$errors[] = 'Please tell us about your project.';
}

if ($errors) {
	respond(false, implode(' ', $errors), 422);
}

$subject = 'New project inquiry: ' . $support . ' - ' . $name;

$body  = "Name: {$name}\n";
$body .= "Email: {$email}\n";
$body .= 'Company: ' . ($company !== '' ? $company : '-') . "\n";
$body .= "Support: {$support}\n\n";
$body .= "Project:\n{$message}\n";

$headers  = "From: Ventum Website <{$fromEmail}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($receivingEmail, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if (!$sent) {
	respond(false, "We couldn't send your message right now. Please email us at info@ventum.dev.", 500);
}

respond(true, "Thank you — we've received your message and will be in touch soon.");
