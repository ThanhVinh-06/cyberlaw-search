<?php

namespace Tests\Feature;

use App\Services\LocalAnswer;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    public function test_guest_grant_rejects_tampering_unsigned_ids_and_cross_session_copy(): void
    {
        $request = Request::create('/api/answer');
        $session = new Store('fixture', new ArraySessionHandler(120));
        $session->start();
        $request->setLaravelSession($session);
        $service = app(LocalAnswer::class);
        $remember = new \ReflectionMethod($service, 'rememberGuestThread');
        $read = new \ReflectionMethod($service, 'guestThreadIds');
        $remember->invoke($service, $request, 42);
        $grant = $session->get('guest_chat_threads');
        $this->assertSame(['42'], $read->invoke($service, $request));
        $session->put('guest_chat_threads', [...$grant, 'ids' => array_fill(0, 21, '42')]);
        $this->assertSame([], $read->invoke($service, $request));
        $session->put('guest_chat_threads', ['42']);
        $this->assertSame([], $read->invoke($service, $request));
        $session->put('guest_chat_threads', [...$grant, 'ids' => ['99']]);
        $this->assertSame([], $read->invoke($service, $request));
        $session->put('guest_chat_threads', $grant);
        $session->migrate();
        $this->assertSame([], $read->invoke($service, $request));
        for ($i = 1; $i <= 25; $i++) $remember->invoke($service, $request, $i);
        $this->assertCount(20, $read->invoke($service, $request));
        $this->assertSame('25', $read->invoke($service, $request)[0]);
        config(['app.key' => 'test-rotated-key']);
        $this->assertSame([], $read->invoke($service, $request));
    }

    public function test_unexpected_api_exception_is_reported_without_raw_secret(): void
    {
        $records = [];
        $logger = new class($records) {
            public function __construct(public array &$records) {}
            public function log($level, $event, $context) { $this->records[] = compact('level', 'event', 'context'); }
        };
        Log::shouldReceive('channel')->andReturn($logger);
        Route::get('/api/test-error', fn () => throw new \RuntimeException('CANARY-private-password-and-chat'))->name('test.error');
        $response = $this->getJson('/api/test-error')->assertStatus(500);
        $events = array_values(array_filter($records, fn ($r) => $r['event'] === 'api.exception'));
        $this->assertCount(1, $events);
        $this->assertSame('error', $events[0]['level']);
        $this->assertSame('RuntimeException', $events[0]['context']['exception_type']);
        $this->assertSame($response->headers->get('X-Request-ID'), $events[0]['context']['request_id']);
        $this->assertStringNotContainsString('CANARY', json_encode($records).$response->getContent());
        Route::get('/api/test-query-error', fn () => throw new \Illuminate\Database\QueryException(
            'fixture', 'SELECT CANARY_SQL', ['CANARY_BINDING'], new \RuntimeException('CANARY-driver')
        ))->name('test.query-error');
        $this->getJson('/api/test-query-error')->assertStatus(500);
        $events = array_values(array_filter($records, fn ($r) => $r['event'] === 'api.exception'));
        $this->assertCount(2, $events);
        $this->assertSame('database_error', $events[1]['context']['error_code']);
        $this->assertStringNotContainsString('CANARY', json_encode($records));
    }
}
