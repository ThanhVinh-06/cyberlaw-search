<?php

namespace App\Http\Controllers;

use App\Support\PermissionMatrix;

final class PermissionMatrixController extends Controller
{
    public function index()
    {
        return response()->json([
            'version' => PermissionMatrix::VERSION,
            'roles' => ['khach', 'user', 'admin'],
            'rules' => PermissionMatrix::rules(),
        ]);
    }
}
