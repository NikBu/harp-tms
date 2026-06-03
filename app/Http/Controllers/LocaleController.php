<?php
// app/Http/Controllers/LocaleController.php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $locale = $request->validate([
            'locale' => 'required|string|in:en,ru',
        ])['locale'];

        $request->user()->update(['locale' => $locale]);
        session(['locale' => $locale]);

        return redirect()->back();
    }
}