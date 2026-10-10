<?php
return [
    // Copy this file to config.local.php on Bertina. Never commit real credentials.
    'db_dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
    'db_user' => 'YOUR_DATABASE_USER',
    'db_password' => 'YOUR_DATABASE_PASSWORD',

    // Long random secret used as an additional server-side password pepper.
    'auth_pepper' => '',

    // Bertina local mail transport. Keep false until the domain mailbox is created and tested.
    'mail_enabled' => false,
    'mail_from' => 'accounts@drjavadrezazadeh.com',
    'mail_reply_to' => 'info@drjavadrezazadeh.com',

    // Payment remains fail-closed until every switch below is explicitly verified.
    'commerce_enabled' => false,
    'bitpay_api_key' => '',
    'bitpay_amount_multiplier' => '',
    'order_email_fulfilment_confirmed' => false,
    'service_booking_confirmed' => false,
    'vip_booking_confirmed' => false,
    'book_shipping_confirmed' => false,
];
