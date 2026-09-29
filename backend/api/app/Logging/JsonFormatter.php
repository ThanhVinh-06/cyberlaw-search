<?php

namespace App\Logging;

use Illuminate\Log\Logger;

class JsonFormatter
{
    public function __invoke(Logger $logger): void
    {
        foreach ($logger->getHandlers() as $handler) {
            $handler->setFormatter(new \Monolog\Formatter\JsonFormatter);
        }
    }
}
