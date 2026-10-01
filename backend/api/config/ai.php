<?php

return [
    // Executable is server configuration, never accepted from request input.
    'python' => env('CYBERLAW_AI_PYTHON', 'python'),
    'timeout' => 12,
];
