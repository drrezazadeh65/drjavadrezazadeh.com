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

    // Bertina SMTP transport. Use the exact values shown by cPanel > Email Accounts > Connect Devices.
    // Never commit the real mailbox password.
    'smtp_enabled' => false,
    'smtp_host' => 'mail.drjavadrezazadeh.com',
    'smtp_port' => 465,
    'smtp_security' => 'ssl', // ssl, tls, or none
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
];
