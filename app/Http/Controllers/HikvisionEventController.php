<?php

namespace App\Http\Controllers;

use App\Services\HikvisionAttendanceRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HikvisionEventController extends Controller
{
    public function store(Request $request, HikvisionAttendanceRecorder $recorder): JsonResponse
    {
        $configuredToken = (string) config('services.hikvision.webhook_token');
        $providedToken = (string) $request->bearerToken();

        if ($configuredToken === '' || $providedToken === '' || ! hash_equals($configuredToken, $providedToken)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $payload = $request->all();
        if ($payload === []) {
            $body = trim($request->getContent());
            $decoded = json_decode($body, true);
            if (is_array($decoded)) {
                $payload = $decoded;
            } elseif (Str::startsWith($body, '<')) {
                $xml = @simplexml_load_string($body, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_NOCDATA);
                if ($xml !== false) {
                    foreach (['eventType', 'eventState', 'dateTime'] as $field) {
                        $value = $xml->xpath('//*[local-name()="'.$field.'"]');
                        if ($value !== false && isset($value[0])) {
                            $payload[$field] = (string) $value[0];
                        }
                    }
                    foreach ([
                        'majorEventType', 'subEventType', 'employeeNoString', 'currentVerifyMode',
                        'attendanceStatus', 'serialNo', 'time', 'currentEvent',
                    ] as $field) {
                        $value = $xml->xpath('//*[local-name()="AccessControllerEvent"]/*[local-name()="'.$field.'"]');
                        if ($value !== false && isset($value[0])) {
                            $payload['AccessControllerEvent'][$field] = (string) $value[0];
                        }
                    }
                }
            }
        }

        $result = $recorder->record($payload);
        $status = match ($result['status']) {
            'recorded', 'duplicate' => 200,
            'unmatched' => 404,
            default => 202,
        };

        return response()->json(['message' => $result['message']], $status);
    }
}
