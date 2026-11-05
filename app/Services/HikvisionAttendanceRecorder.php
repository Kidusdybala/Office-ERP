<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class HikvisionAttendanceRecorder
{
    /** @return array{status: string, message: string} */
    public function record(array $payload): array
    {
        $event = $payload['AccessControllerEvent'] ?? null;

        if (($payload['eventType'] ?? null) !== 'AccessControllerEvent' || ! is_array($event)) {
            return ['status' => 'ignored', 'message' => 'Not an access controller event'];
        }

        if (strtolower((string) ($payload['eventState'] ?? 'active')) !== 'active'
            || strtolower((string) ($event['currentEvent'] ?? 'true')) === 'false') {
            return ['status' => 'ignored', 'message' => 'Not a live active access event'];
        }

        // Hikvision's normal successful access event is major 5 / minor 75.
        // Exclude denied/other events and modes where face is merely one optional route.
        $verifyMode = strtolower((string) ($event['currentVerifyMode'] ?? ''));
        $faceRequired = str_contains($verifyMode, 'face') && ! str_contains($verifyMode, 'or');
        if ((int) ($event['majorEventType'] ?? 0) !== 5
            || (int) ($event['subEventType'] ?? 0) !== 75
            || ! $faceRequired) {
            return ['status' => 'ignored', 'message' => 'Not a successful face access event'];
        }

        $employeeId = trim((string) ($event['employeeNoString'] ?? ''));
        if ($employeeId === '') {
            return ['status' => 'ignored', 'message' => 'Employee number missing'];
        }

        $user = User::where('employee_id', $employeeId)->first();
        if (! $user) {
            Log::warning('Hikvision face event references an unknown employee.');
            return ['status' => 'unmatched', 'message' => 'Employee not found'];
        }

        $timestamp = $payload['dateTime'] ?? $event['time'] ?? null;
        try {
            $occurredAt = is_string($timestamp) && $timestamp !== '' ? Carbon::parse($timestamp) : now();
        } catch (\Throwable) {
            $occurredAt = now();
        }

        $cutoff = $occurredAt->copy()->setTime(9, 0);
        $attendance = Attendance::firstOrCreate(
            ['user_id' => $user->id, 'date' => $occurredAt->toDateString()],
            [
                'punch_in' => $occurredAt,
                'status' => $occurredAt->gt($cutoff) ? 'late' : 'present',
            ],
        );

        return [
            'status' => $attendance->wasRecentlyCreated ? 'recorded' : 'duplicate',
            'message' => $attendance->wasRecentlyCreated ? 'Punch-in recorded' : 'Punch-in already recorded',
        ];
    }
}
