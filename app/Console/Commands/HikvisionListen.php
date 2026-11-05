<?php

namespace App\Console\Commands;

use App\Services\HikvisionAttendanceRecorder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class HikvisionListen extends Command
{
    protected $signature = 'hikvision:listen';

    protected $description = 'Listen to the Hikvision access event stream and record face punch-ins';

    public function handle(HikvisionAttendanceRecorder $recorder): int
    {
        $url = rtrim((string) config('services.hikvision.url'), '/');
        $username = (string) config('services.hikvision.username');
        $password = (string) config('services.hikvision.password');

        if ($url === '' || $username === '' || $password === '') {
            $this->error('Set HIKVISION_URL, HIKVISION_USERNAME, and HIKVISION_PASSWORD first.');
            return self::FAILURE;
        }

        if (! extension_loaded('curl') || ! function_exists('simplexml_load_string')) {
            $this->error('The PHP cURL and SimpleXML extensions are required.');
            return self::FAILURE;
        }

        $this->info('Connecting to the Hikvision event stream. Press Ctrl+C to stop.');

        while (true) {
            $curl = curl_init($url.'/ISAPI/Event/notification/alertStream');
            $buffer = '';
            $lastStatus = null;

            curl_setopt_array($curl, [
                CURLOPT_HTTPAUTH => CURLAUTH_DIGEST,
                CURLOPT_USERPWD => $username.':'.$password,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 0,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_HEADERFUNCTION => static function ($handle, string $header) use (&$lastStatus): int {
                    if (preg_match('/^HTTP\/\S+\s+(\d+)/i', $header, $matches)) {
                        $lastStatus = (int) $matches[1];
                    }
                    return strlen($header);
                },
                CURLOPT_WRITEFUNCTION => function ($handle, string $chunk) use (&$buffer, $recorder): int {
                    $buffer .= $chunk;

                    while (($end = strpos($buffer, '</EventNotificationAlert>')) !== false) {
                        $end += strlen('</EventNotificationAlert>');
                        $xmlStart = strrpos(substr($buffer, 0, $end), '<EventNotificationAlert');
                        if ($xmlStart !== false) {
                            $xml = substr($buffer, $xmlStart, $end - $xmlStart);
                            $this->handleEventXml($xml, $recorder);
                        }
                        $buffer = substr($buffer, $end);
                    }

                    // Keep picture/multipart data from growing without bound; no image
                    // content is needed to create an attendance punch.
                    if (strlen($buffer) > 2_000_000) {
                        $buffer = substr($buffer, -256_000);
                    }

                    return strlen($chunk);
                },
            ]);

            curl_exec($curl);
            $error = curl_error($curl);
            $status = $lastStatus ?? curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($status === 401) {
                $this->error('Hikvision authentication failed; stopping listener.');
                Log::error('Hikvision event listener authentication failed.');
                return self::FAILURE;
            }

            if ($error !== '' || $status !== 200) {
                Log::warning('Hikvision event stream disconnected; reconnecting.');
                $this->warn('Event stream disconnected; reconnecting shortly.');
                sleep(3);
            }
        }
    }

    private function handleEventXml(string $xml, HikvisionAttendanceRecorder $recorder): void
    {
        $root = @simplexml_load_string($xml, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_NOCDATA);
        if ($root === false) {
            return;
        }

        $payload = [];
        foreach (['eventType', 'eventState', 'dateTime'] as $field) {
            $value = $root->xpath('//*[local-name()="'.$field.'"]');
            if ($value !== false && isset($value[0])) {
                $payload[$field] = (string) $value[0];
            }
        }

        $event = [];
        foreach ([
            'majorEventType', 'subEventType', 'employeeNoString', 'currentVerifyMode',
            'attendanceStatus', 'serialNo', 'time', 'currentEvent',
        ] as $field) {
            $value = $root->xpath('//*[local-name()="AccessControllerEvent"]/*[local-name()="'.$field.'"]');
            if ($value !== false && isset($value[0])) {
                $event[$field] = (string) $value[0];
            }
        }

        if ($event !== []) {
            $payload['AccessControllerEvent'] = $event;
            $result = $recorder->record($payload);
            if ($result['status'] === 'recorded') {
                $this->info('Punch-in recorded.');
            } elseif ($result['status'] === 'unmatched') {
                $this->warn('A face event arrived for an employee number not found in the ERP.');
            }
        }
    }
}
