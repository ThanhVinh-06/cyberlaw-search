<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class PasswordResetCode extends Mailable
{
    public function __construct(public readonly string $code) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Mã xác nhận đặt lại mật khẩu CyberLaw');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.password-reset');
    }
}
