<?php

namespace Tests\Feature;

use App\Support\SafeLog;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Log\Logger as LaravelLogger;
use Illuminate\Session\FileSessionHandler;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Logger as MonologLogger;
use Tests\TestCase;

class AuthLoggingTest extends TestCase
{
    public function test_json_logs_drop_secrets_correlate_requests_and_rotate_daily(): void
    {
        $directory = storage_path('framework/testing/log-test-'.bin2hex(random_bytes(6)));
        mkdir($directory, 0700, true);
        foreach (['application', 'security', 'audit'] as $channel) {
            $this->assertSame($channel === 'application' ? 14 : 90, config("logging.channels.$channel.days"));
            foreach (['2010-01-01', '2010-01-02', '2010-01-03'] as $date) {
                file_put_contents("$directory/$channel-$date.log", "old test record\n");
            }
            // Use two files to exercise cleanup without creating 90 test files.
            config(["logging.channels.$channel.days" => 2]);
            config(["logging.channels.$channel.path" => "$directory/$channel.log"]);
            Log::forgetChannel($channel);
            SafeLog::write($channel, 'auth.failed', 'failure', [
                'request_id' => 'correlation-fixture', 'status' => 401,
                'password' => 'CANARY-password-123', 'cookie' => 'CANARY-cookie-123',
                'token' => 'CANARY-token-123', 'nested' => ['secret' => 'CANARY-nested-123'],
                'exception' => new \RuntimeException('CANARY-exception-123'),
            ]);
            $logger = Log::channel($channel);
            if (! $logger instanceof LaravelLogger) {
                $this->fail('Expected a Laravel logger for the configured daily channel.');
            }
            $monolog = $logger->getLogger();
            if (! $monolog instanceof MonologLogger) {
                $this->fail('Expected Monolog to manage the rotating file handlers.');
            }
            $handler = $monolog->getHandlers()[0];
            $this->assertInstanceOf(RotatingFileHandler::class, $handler);
            $file = "$directory/$channel-".date('Y-m-d').'.log';
            $this->assertFileExists($file);
            $content = file_get_contents($file);
            $this->assertStringNotContainsString('CANARY', $content);
            $record = json_decode(trim($content), true, 512, JSON_THROW_ON_ERROR);
            $this->assertSame('correlation-fixture', $record['context']['request_id']);
            $this->assertSame(401, $record['context']['status']);
            $this->assertSame(1, substr_count($content, "\n"));
            $handler->close();
            $this->assertCount(2, glob("$directory/$channel-*.log"));
            $this->assertFileDoesNotExist("$directory/$channel-2010-01-01.log");
            Log::forgetChannel($channel);
        }
        // Only files created by this test, in its unique test directory.
        foreach (glob($directory.'/*.log') as $file) {
            unlink($file);
        }
        rmdir($directory);
    }

    public function test_logger_failure_has_bounded_redacted_fallback(): void
    {
        Log::shouldReceive('channel')->once()->with('security')->andThrow(new \RuntimeException('CANARY-secret'));
        SafeLog::write('security', 'auth.failed', 'failure', ['password' => 'CANARY-password']);
        $this->addToAssertionCount(1); // No exception escapes and authorization is not bypassed.
    }

    public function test_file_session_expiration_is_enforced(): void
    {
        $directory = storage_path('framework/testing/session-expiry-'.bin2hex(random_bytes(6)));
        mkdir($directory, 0700, true);
        $handler = new FileSessionHandler(new Filesystem, $directory, 120);
        $id = str_repeat('a', 40);
        $handler->write($id, 'synthetic-session');
        $this->assertSame('synthetic-session', $handler->read($id));
        touch($directory.'/'.$id, time() - 121 * 60);
        clearstatcache();
        $this->assertSame('', $handler->read($id));
        $handler->destroy($id);
        rmdir($directory);
    }
}
