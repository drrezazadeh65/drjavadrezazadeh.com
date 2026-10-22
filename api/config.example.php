<?php
return [
    // Copy this file to config.local.php on Bertina. Never commit real credentials.
    'db_dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
    'db_user' => 'YOUR_DATABASE_USER',
    'db_password' => 'YOUR_DATABASE_PASSWORD',

    // Long random secret used as an additional server-side password pepper.
    'auth_pepper' => '',

    // Mail is a final safety gate. Keep false until the configured transport is tested end-to-end.
    'mail_enabled' => false,
    'mail_from' => 'admin@drjavadrezazadeh.com',
    'mail_reply_to' => 'admin@drjavadrezazadeh.com',
    // Alerts use the existing authenticated SMTP transport and the private
    // incident outbox. Configure an administrator-controlled mailbox explicitly.
    // Never store credentials or sensitive incident payloads in source control.
    'operations_alert_recipient' => '',

    // Confirmed by Bertina support ticket t833905 on 2026-10-11:
    // drjavadrezazadeh.com:465 SSL/TLS, alternatively :587 STARTTLS.
    // Use the real mailbox password only in the private Bertina config.local.php.
    // Never commit the real mailbox password.
    'smtp_enabled' => false,
    'smtp_host' => 'drjavadrezazadeh.com',
    'smtp_port' => 465,
    'smtp_security' => 'ssl', // ssl on port 465; use tls on port 587
    'smtp_user' => 'admin@drjavadrezazadeh.com',
    'smtp_password' => '',
    'smtp_verify_peer' => true,

    // Payment remains fail-closed until every switch below is explicitly verified.
    'commerce_enabled' => false,
    // Set true only after external CA-trusted HTTPS verification passes for apex + www.
    'public_tls_confirmed' => false,
    'bitpay_api_key' => '',
    'bitpay_amount_multiplier' => '',
    'order_email_fulfilment_confirmed' => false,
    'service_booking_confirmed' => false,
    'vip_booking_confirmed' => false,
    'book_shipping_confirmed' => false,

    // JHELA uses the SAME mother database and verified customer sessions.
    // Leave both switches false until end-to-end host acceptance is documented.
    'jhela_intake_enabled' => false,
    'jhela_reviewer_intake_enabled' => false,
    // Provision a private, writable directory OUTSIDE public_html; never serve it directly.
    'jhela_private_storage' => '',
    // Must be an executable trusted ClamAV binary, confirmed by Bertina.
    // Only /usr/bin/clamscan or /usr/local/bin/clamscan is supported.
    'jhela_av_binary' => '',
];
