<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class EmailVerificationCode extends Mailable
{
    public function __construct(public readonly string $code) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Xác minh email đăng ký CyberLaw');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.email-verification');
    }
}
