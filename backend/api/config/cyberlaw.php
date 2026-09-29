<?php

return [
    // Same-origin reverse proxy in production. No wildcard credentialed CORS.
    'frontend_origins' => array_filter(array_map('trim', explode(',', env(
        'FRONTEND_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173'
    )))),
];
