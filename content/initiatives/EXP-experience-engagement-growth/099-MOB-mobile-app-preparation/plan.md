---
title: "Implementation Plan: Mobile App Preparation (Backend)"
---

# Implementation Plan: Mobile App Preparation (Backend) (099-MOB)

**Epic**: 099-MOB
**Created**: 2026-04-01
**Spec**: [spec.md](/initiatives/FL-financial-ledger/099-MOB-mobile-app-preparation/spec)

---

## 1. Architecture Overview

### 1.1 Token Auth Coexisting with Cookie Auth

Sanctum already supports dual authentication out of the box. The current middleware stack in `bootstrap/app.php` prepends `EnsureFrontendRequestsAreStateful` to the API middleware group and calls `$middleware->statefulApi()`. This means:

- **Cookie auth (web SPA)**: Requests from stateful domains (configured in `config/sanctum.php`) pass through `EnsureFrontendRequestsAreStateful`, which applies session/cookie/CSRF middleware. Sanctum authenticates via the `web` guard.
- **Token auth (mobile)**: Requests from non-stateful origins (no `Referer`/`Origin` matching stateful domains) skip the stateful middleware entirely. Sanctum falls back to the `Authorization: Bearer {token}` header and authenticates via the `personal_access_token` table. CSRF is never checked.

No changes are needed to `bootstrap/app.php` or `config/sanctum.php` for this dual-guard behaviour -- it is Sanctum's default. The key insight is that `EnsureFrontendRequestsAreStateful` only activates for requests whose `Referer` or `Origin` matches a domain in `sanctum.stateful`. Mobile requests (from a React Native app) will never match, so CSRF is automatically bypassed.

The existing `SetWorkspaceContext` middleware (`app/Http/Middleware/SetWorkspaceContext.php`) resolves workspace from `X-Workspace-Id` header or `workspace_id` input, validates user access via `$request->user()->hasWorkspaceAccess()`, and sets the `PermissionContext`. This middleware is auth-method-agnostic -- it calls `$request->user()` which works identically for both cookie and token auth. No changes needed.

### 1.2 Middleware Flow Diagram

```
Mobile request with Bearer token:

  Request
    |
    v
  [API middleware group]
    |
    v
  [EnsureFrontendRequestsAreStateful]
    |  Origin doesn't match stateful domains -> SKIPS session/CSRF
    v
  [auth:sanctum]
    |  Finds Bearer token -> resolves PersonalAccessToken -> sets $request->user()
    v
  [SetWorkspaceContext]
    |  Reads X-Workspace-Id -> validates access -> sets PermissionContext
    v
  [Controller / Action]
```

### 1.3 Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.4, PostgreSQL |
| Auth | Sanctum (cookie + token dual-guard), Fortify (MFA) |
| Business logic | Lorisleiva Actions (`AsAction` trait) |
| Push notifications | `laravel-notification-channels/fcm` (FCM HTTP v1 API) |
| Image processing | Intervention Image v3 (already available via `intervention/image`) |
| API responses | Laravel API Resources |
| Validation | Form Requests (mutations), `Gate::authorize()` (reads) |

### 1.4 Key Dependencies

| Dependency | Status | Relationship |
|-----------|--------|-------------|
| 003-AUT Auth & Multi-tenancy | Complete | `User` model has `HasApiTokens` trait, Sanctum configured |
| 012-ATT Attachments | Complete | `Attachment` model, `AttachmentController`, `UploadAttachment` action |
| 019-AIX AI Document Inbox | Complete | `InboxItem` model, `InboxController`, `ExtractInboxDocumentJob` |
| 024-NTF Notifications | Complete | `Notification` model, `NotificationPreference`, `CreateNotification` action |
| 045-PUB Public API | Complete | `ApiKey` model, rate limiting patterns |

### 1.5 Existing Codebase Readiness

**Already in place**:
- `User` model (`app/Models/User.php`) already uses `HasApiTokens` trait -- Sanctum token support is ready
- `User` model already has `last_login_at` field (fillable + cast)
- `TwoFactorAuthenticatable` trait on `User` -- MFA infrastructure exists via Fortify
- `SetWorkspaceContext` middleware is auth-method-agnostic
- Rate limiter in `AppServiceProvider::boot()` already limits by `$request->user()?->id` (per-user, not per-token)
- `CreateNotification` action provides the extension point for push delivery
- `InboxController::upload()` provides the pattern for receipt capture
- `AttachmentController::preview()` already serves inline attachments

**Needs building**:
- Token issuance/revocation endpoints (no `AuthTokenController` exists)
- Device registration model and controller
- Push notification delivery channel
- Conditional response middleware (ETag/Last-Modified)
- Receipt capture endpoint with multi-image support
- Image thumbnail/preview generation

---

## 2. Database Migrations

### 2.1 Migration: `create_device_registrations_table`

**File**: `database/migrations/2026_04_01_100001_create_device_registrations_table.php`

```php
Schema::create('device_registrations', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('personal_access_token_id')
        ->nullable()
        ->constrained('personal_access_tokens')
        ->nullOnDelete();
    $table->string('device_token', 512)->unique();   // FCM/APNs token
    $table->string('platform', 10);                   // DevicePlatform enum: ios, android
    $table->string('device_name');                     // e.g. "iPhone 15 Pro"
    $table->boolean('push_enabled')->default(true);
    $table->softDeletes();
    $table->timestamps();

    $table->index('user_id');
    $table->index('personal_access_token_id');
});
```

### 2.2 Migration: `create_device_push_preferences_table`

**File**: `database/migrations/2026_04_01_100002_create_device_push_preferences_table.php`

```php
Schema::create('device_push_preferences', function (Blueprint $table) {
    $table->id();
    $table->foreignId('device_registration_id')
        ->constrained()
        ->cascadeOnDelete();
    $table->string('category');    // NotificationCategory enum value
    $table->boolean('enabled')->default(true);
    $table->timestamps();

    $table->unique(['device_registration_id', 'category']);
});
```

### 2.3 Migration: `add_mobile_fields_to_users_table`

**File**: `database/migrations/2026_04_01_100003_add_mobile_fields_to_users_table.php`

The `User` model already has `last_login_at`. This migration adds `last_login_ip` and `last_login_location` for session visibility in the token list.

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
    $table->string('last_login_location')->nullable()->after('last_login_ip');
});
```

### 2.4 Migration: `add_captured_at_to_inbox_items_table`

**File**: `database/migrations/2026_04_01_100004_add_captured_at_to_inbox_items_table.php`

```php
Schema::table('inbox_items', function (Blueprint $table) {
    $table->timestamp('captured_at')->nullable()->after('received_at');
});
```

---

## 3. Token Auth Implementation

### 3.1 New Enums

**File**: `app/Enums/DevicePlatform.php`

```php
enum DevicePlatform: string
{
    case Ios = 'ios';
    case Android = 'android';

    public function label(): string
    {
        return match ($this) {
            self::Ios => 'iOS',
            self::Android => 'Android',
        };
    }
}
```

### 3.2 AuthTokenController

**File**: `app/Http/Controllers/Api/AuthTokenController.php`

This controller handles mobile token lifecycle. It does NOT use `SetWorkspaceContext` middleware (tokens are user-scoped, not workspace-scoped).

```php
class AuthTokenController extends Controller
{
    // POST /api/v1/auth/token
    public function store(IssueTokenRequest $request): JsonResponse
    // POST /api/v1/auth/token/mfa
    public function mfa(VerifyMfaTokenRequest $request): JsonResponse
    // POST /api/v1/auth/token/refresh
    public function refresh(Request $request): JsonResponse
    // POST /api/v1/auth/token/revoke
    public function revoke(Request $request): JsonResponse
    // POST /api/v1/auth/tokens/{id}/revoke
    public function revokeById(Request $request, int $id): JsonResponse
    // GET  /api/v1/auth/tokens
    public function index(Request $request): JsonResponse
```

**Method: `store()`** -- Issue a token

1. Validate `email`, `password`, `device_name` via `IssueTokenRequest`
2. Attempt `Auth::attempt(['email' => ..., 'password' => ...])`
3. If user has MFA enabled (`two_factor_confirmed_at !== null`):
   - Generate a short-lived `mfa_token` (cache key with 5-minute TTL, value = user ID + device_name)
   - Return 403 with `{ mfa_required: true, mfa_token: "..." }`
4. If no MFA, call `IssueApiToken::run($user, $deviceName)` action
5. Update `last_login_at`, `last_login_ip`, `last_login_location` on user
6. Return `{ token: $plainTextToken, user: AuthController::user() format, workspaces: [...] }`

**Method: `mfa()`** -- Complete MFA challenge

1. Validate `mfa_token` and `code` via `VerifyMfaTokenRequest`
2. Retrieve user ID + device_name from cache using `mfa_token` key
3. Verify TOTP code via `Google2FA::verifyKey()` (Fortify's built-in)
4. If valid, call `IssueApiToken::run($user, $deviceName)` and return token
5. If invalid, return 422 with `{ message: "Invalid verification code" }`
6. Delete the cache key after use (one-time)

**Method: `refresh()`** -- Biometric token refresh

1. Requires `auth:sanctum` middleware
2. Check if current token's `last_used_at` is within `token_refresh_window` (default 30 days from config)
3. If outside window, return 401 with `{ message: "Token refresh window expired. Please re-authenticate." }`
4. Revoke current token, issue new one for same `device_name`
5. Return new plaintext token

**Method: `revoke()`** -- Revoke current token

1. Requires `auth:sanctum` middleware
2. `$request->user()->currentAccessToken()->delete()`
3. Soft-delete associated `DeviceRegistration` records via `RevokeDeviceRegistrations::run($tokenId)`
4. Return 204

**Method: `revokeById()`** -- Revoke a specific token

1. Requires `auth:sanctum` middleware
2. Find token where `tokenable_id = $request->user()->id AND id = $id`
3. Delete token, soft-delete associated device registrations
4. Return 204

**Method: `index()`** -- List active tokens

1. Requires `auth:sanctum` middleware
2. Return `$user->tokens()->get()` mapped to `{ id, name (device_name), last_used_at, created_at }` -- never the token hash

### 3.3 Actions

**File**: `app/Actions/Auth/IssueApiToken.php`

```php
class IssueApiToken
{
    use AsAction;

    public function handle(User $user, string $deviceName): NewAccessToken
    {
        return $user->createToken($deviceName, ['*']);
    }
}
```

**File**: `app/Actions/Auth/RevokeAllUserTokens.php`

```php
class RevokeAllUserTokens
{
    use AsAction;

    public function handle(User $user): int
    {
        // Soft-delete all device registrations for this user's tokens
        $tokenIds = $user->tokens()->pluck('id');
        DeviceRegistration::whereIn('personal_access_token_id', $tokenIds)
            ->delete(); // soft-delete via SoftDeletes trait

        // Delete all tokens
        return $user->tokens()->delete();
    }
}
```

**File**: `app/Actions/Auth/RevokeDeviceRegistrations.php`

```php
class RevokeDeviceRegistrations
{
    use AsAction;

    public function handle(int $personalAccessTokenId): int
    {
        return DeviceRegistration::where('personal_access_token_id', $personalAccessTokenId)
            ->delete(); // soft-delete
    }
}
```

### 3.4 Form Requests

**File**: `app/Http/Requests/Auth/IssueTokenRequest.php`

```php
class IssueTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint -- auth happens in controller via credential check
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ];
    }
}
```

**File**: `app/Http/Requests/Auth/VerifyMfaTokenRequest.php`

```php
class VerifyMfaTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // MFA token validated in controller
    }

    public function rules(): array
    {
        return [
            'mfa_token' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ];
    }
}
```

### 3.5 Sanctum Configuration

**File**: `config/sanctum.php` -- No changes required.

The existing configuration is correct:
- `expiration => null` -- tokens do not expire (spec: "Tokens do not expire by default")
- `guard => ['web']` -- Sanctum tries web guard first (cookies), then falls back to token guard
- `stateful` domains include `localhost:3000` -- mobile requests from React Native will not match

### 3.6 Password Change Hook

**File**: `app/Listeners/Auth/RevokeTokensOnPasswordChange.php`

```php
class RevokeTokensOnPasswordChange
{
    public function handle(PasswordUpdated $event): void
    {
        RevokeAllUserTokens::run($event->user);
    }
}
```

Register in `EventServiceProvider`:

```php
\Illuminate\Auth\Events\PasswordReset::class => [
    \App\Listeners\Auth\RevokeTokensOnPasswordChange::class,
],
```

Note: Fortify dispatches `PasswordUpdated` via `Illuminate\Auth\Events\PasswordReset`. If the project uses a custom password change flow, hook into the relevant event.

### 3.7 Routes (Token Auth)

Added to `routes/api.php` as a new group **outside** the `auth:sanctum` middleware group (the issue endpoint must be public):

```php
// Mobile token auth (099-MOB) — public endpoints
Route::prefix('auth')->group(function () {
    Route::post('token', [AuthTokenController::class, 'store'])
        ->middleware('throttle:login');
    Route::post('token/mfa', [AuthTokenController::class, 'mfa'])
        ->middleware('throttle:login');
});

// Mobile token auth (099-MOB) — authenticated endpoints
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('token/refresh', [AuthTokenController::class, 'refresh']);
    Route::post('token/revoke', [AuthTokenController::class, 'revoke']);
    Route::get('tokens', [AuthTokenController::class, 'index']);
    Route::post('tokens/{id}/revoke', [AuthTokenController::class, 'revokeById']);
});
```

### 3.8 Config: Token Refresh Window

**File**: `config/mobile.php` (new)

```php
return [
    'token_refresh_window_days' => env('MOBILE_TOKEN_REFRESH_WINDOW_DAYS', 30),
    'push' => [
        'fcm_credentials_path' => env('FCM_CREDENTIALS_PATH'),
        'fcm_project_id' => env('FCM_PROJECT_ID'),
    ],
];
```

---

## 4. Push Notification Infrastructure

### 4.1 DeviceRegistration Model

**File**: `app/Models/DeviceRegistration.php`

This model is user-scoped (not tenant/workspace-scoped). It lives outside `Models/Tenant/` because device registrations span all workspaces for a user.

```php
class DeviceRegistration extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'personal_access_token_id',
        'device_token',
        'platform',
        'device_name',
        'push_enabled',
    ];

    protected function casts(): array
    {
        return [
            'platform' => DevicePlatform::class,
            'push_enabled' => 'boolean',
        ];
    }

    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function user(): BelongsTo { ... }
    public function personalAccessToken(): BelongsTo { ... }
    public function preferences(): HasMany { ... }
}
```

### 4.2 DevicePushPreference Model

**File**: `app/Models/DevicePushPreference.php`

```php
class DevicePushPreference extends Model
{
    protected $fillable = [
        'device_registration_id',
        'category',
        'enabled',
    ];

    protected function casts(): array
    {
        return [
            'category' => NotificationCategory::class,
            'enabled' => 'boolean',
        ];
    }

    public function deviceRegistration(): BelongsTo { ... }
}
```

### 4.3 DeviceController

**File**: `app/Http/Controllers/Api/DeviceController.php`

```php
class DeviceController extends Controller
{
    // POST /api/v1/devices — register device for push
    public function store(RegisterDeviceRequest $request): JsonResponse
    // GET  /api/v1/devices — list user's registered devices
    public function index(Request $request): JsonResponse
    // DELETE /api/v1/devices/{uuid} — unregister device
    public function destroy(Request $request, string $uuid): JsonResponse
    // GET  /api/v1/devices/{uuid}/preferences — get push preferences
    public function preferences(Request $request, string $uuid): JsonResponse
    // PATCH /api/v1/devices/{uuid}/preferences — update push preferences
    public function updatePreferences(UpdateDevicePushPreferencesRequest $request, string $uuid): JsonResponse
```

**Method: `store()`** -- Register or update device

1. Validate `device_token`, `platform`, `device_name` via `RegisterDeviceRequest`
2. Upsert on `device_token`: if existing (including soft-deleted), restore and update; otherwise create
3. Associate with current `personal_access_token_id` from `$request->user()->currentAccessToken()->id`
4. Return 201 with `DeviceRegistrationResource`

### 4.4 Form Requests (Devices)

**File**: `app/Http/Requests/Device/RegisterDeviceRequest.php`

```php
class RegisterDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Any authenticated user can register a device
    }

    public function rules(): array
    {
        return [
            'device_token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'string', Rule::enum(DevicePlatform::class)],
            'device_name' => ['required', 'string', 'max:255'],
        ];
    }
}
```

**File**: `app/Http/Requests/Device/UpdateDevicePushPreferencesRequest.php`

```php
class UpdateDevicePushPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $device = DeviceRegistration::where('uuid', $this->route('uuid'))
            ->where('user_id', $this->user()->id)
            ->firstOrFail();

        $this->attributes->set('device', $device);

        return true; // Ownership validated above
    }

    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.*.category' => ['required', 'string', Rule::enum(NotificationCategory::class)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ];
    }
}
```

### 4.5 FCM Integration via Push Channel

**Package**: `laravel-notification-channels/fcm` (Composer require)

**File**: `app/Channels/PushChannel.php`

This is a custom notification delivery channel that dispatches to FCM. It is invoked from the `CreateNotification` action extension, not from Laravel's built-in notification system (since we use our own `Notification` model from 024-NTF).

```php
class PushChannel
{
    public function __construct(
        private FcmClient $fcmClient,
    ) {}

    public function send(Notification $notification): void
    {
        $user = User::find($notification->user_id);
        if (!$user) return;

        $devices = DeviceRegistration::where('user_id', $user->id)
            ->where('push_enabled', true)
            ->whereNull('deleted_at')
            ->get();

        if ($devices->isEmpty()) return;

        // Check category preference per device
        $category = $this->resolveCategory($notification->type);

        foreach ($devices as $device) {
            if ($category && !$this->isPushEnabledForCategory($device, $category)) {
                continue;
            }

            try {
                $this->fcmClient->send(
                    token: $device->device_token,
                    title: $notification->title,
                    body: $notification->body,
                    data: [
                        'notification_id' => $notification->uuid,
                        'subject_type' => $notification->subject_type,
                        'subject_id' => (string) $notification->subject_id,
                        'workspace_id' => (string) $notification->workspace_id,
                        'type' => $notification->type->value,
                    ],
                );
            } catch (InvalidTokenException $e) {
                // FR-016: Soft-delete on invalid/unregistered token
                $device->delete();
            }
        }
    }
}
```

### 4.6 Extending CreateNotification

**File**: `app/Actions/Notifications/CreateNotification.php` -- modified

After creating the `Notification` record, dispatch push delivery asynchronously:

```php
public function handle(...): Notification
{
    // ... existing notification creation logic ...

    $notification = Notification::create([...]);

    // Dispatch push notification (099-MOB)
    if ($notification->id) {
        DispatchPushNotification::dispatch($notification->id);
    }

    return $notification;
}
```

**File**: `app/Jobs/DispatchPushNotificationJob.php`

```php
class DispatchPushNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [10, 60, 300];

    public function __construct(public int $notificationId) {}

    public function handle(PushChannel $pushChannel): void
    {
        $notification = Notification::find($this->notificationId);
        if (!$notification) return;

        $pushChannel->send($notification);
    }
}
```

### 4.7 FCM Client Service

**File**: `app/Services/FcmClient.php`

Wraps the FCM HTTP v1 API. Uses Google service account credentials from `config/mobile.php`.

```php
class FcmClient
{
    public function send(string $token, string $title, string $body, array $data = []): void
    // Sends via POST https://fcm.googleapis.com/v1/projects/{project}/messages:send
    // Throws InvalidTokenException if FCM returns 404 (unregistered) or INVALID_ARGUMENT

    public function sendBatch(array $messages): array
    // Batch send for multi-device delivery (up to 500 per batch)
```

### 4.8 Routes (Devices)

Added to the `auth:sanctum` group in `routes/api.php`:

```php
// Device registration for push notifications (099-MOB)
Route::prefix('devices')->group(function () {
    Route::get('/', [DeviceController::class, 'index']);
    Route::post('/', [DeviceController::class, 'store']);
    Route::delete('{uuid}', [DeviceController::class, 'destroy']);
    Route::get('{uuid}/preferences', [DeviceController::class, 'preferences']);
    Route::patch('{uuid}/preferences', [DeviceController::class, 'updatePreferences']);
});
```

---

## 5. API Stability Audit

### 5.1 CSRF Bypass for Bearer Tokens

Already handled by Sanctum's architecture. `EnsureFrontendRequestsAreStateful` in `bootstrap/app.php` checks the request's `Referer`/`Origin` against `config/sanctum.php` stateful domains. Mobile requests will never match `localhost:3000` or `localhost:3001`, so the CSRF middleware is never applied. No code changes needed.

**Verification**: Write a feature test that sends a POST request with a Bearer token and no CSRF token, asserting it succeeds.

### 5.2 JSON Error Responses

Laravel already returns JSON errors when `Accept: application/json` is present. The exception handler in `bootstrap/app.php` renders `DomainException` as JSON 422. However, two areas need audit:

1. **Authentication failures**: Sanctum returns JSON 401 for `auth:sanctum` middleware when `Accept: application/json` is set. The mobile client must always send this header. No code change needed -- document as a mobile client requirement.

2. **404 responses for model binding**: Laravel returns HTML 404 by default for model binding failures. The `Accept: application/json` header triggers JSON 404. Document this.

3. **Validation errors**: Already JSON via Laravel's `FormRequest`. No change needed.

### 5.3 Rate Limiting Middleware

**Current state** (`app/Providers/AppServiceProvider.php`):

```php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});
```

This is already per-user (not per-token), satisfying FR-036. The 60 requests/minute limit supports the mobile burst scenario (20 requests in 3 seconds is within budget).

**Enhancements needed**:

1. **Rate limit headers on all responses** (FR-037): Add `RateLimitHeaders` middleware.
2. **Weighted rate limiting** (FR-038): Add `WeightedRateLimit` middleware for heavy endpoints.
3. **Runtime-configurable limits** (FR-039): Move rate limit values to database-backed config (per PlanTier).

**File**: `app/Http/Middleware/RateLimitHeaders.php`

```php
class RateLimitHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $key = 'api:' . ($request->user()?->id ?: $request->ip());
        $limit = 60;
        $remaining = RateLimiter::remaining($key, $limit);
        $retryAfter = RateLimiter::availableIn($key);

        $response->headers->set('X-RateLimit-Limit', (string) $limit);
        $response->headers->set('X-RateLimit-Remaining', (string) max(0, $remaining));
        $response->headers->set('X-RateLimit-Reset', (string) (time() + $retryAfter));

        return $response;
    }
}
```

### 5.4 API Compatibility Manifest

**File**: `app/Console/Commands/GenerateApiManifest.php`

An artisan command that scans all registered v1 routes and produces a JSON manifest:

```bash
php artisan api:manifest --output=storage/app/api-manifest.json
```

Output per route:
```json
{
    "method": "GET",
    "uri": "/api/v1/chart-accounts",
    "auth": ["cookie", "token"],
    "middleware": ["auth:sanctum", "SetWorkspaceContext"],
    "response_format": "json",
    "mobile_notes": null
}
```

### 5.5 Endpoints Requiring Review

| Endpoint | Issue | Resolution |
|----------|-------|-----------|
| `GET /sanctum/csrf-cookie` | Web-only (sets CSRF cookie) | Document as web-only, mobile skips |
| Fortify login/register routes | Return redirects by default | Already configured with JSON responses via custom `LoginResponse`, `RegisterResponse` in `app/Http/Responses/` |
| `POST /api/v1/auth/token` | Does not exist yet | Build (this epic) |
| All POST/PATCH/DELETE endpoints | CSRF required for cookie auth | Token auth bypasses CSRF automatically |

---

## 6. Offline Caching Headers

### 6.1 ConditionalResponse Middleware

**File**: `app/Http/Middleware/ConditionalResponse.php`

This middleware adds `ETag` and `Last-Modified` headers to GET responses and handles `If-None-Match` / `If-Modified-Since` conditional requests.

```php
class ConditionalResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only apply to successful GET responses with JSON content
        if ($request->method() !== 'GET' || $response->getStatusCode() !== 200) {
            return $response;
        }

        $content = $response->getContent();
        $etag = '"' . md5($content) . '"';

        $response->headers->set('ETag', $etag);

        // Set Last-Modified from response data if available
        $lastModified = $this->extractLastModified($content);
        if ($lastModified) {
            $response->headers->set('Last-Modified', $lastModified->toRfc7231String());
        }

        // Handle If-None-Match
        $ifNoneMatch = $request->header('If-None-Match');
        if ($ifNoneMatch && $ifNoneMatch === $etag) {
            return response()->noContent(304)
                ->withHeaders(['ETag' => $etag]);
        }

        // Handle If-Modified-Since
        $ifModifiedSince = $request->header('If-Modified-Since');
        if ($ifModifiedSince && $lastModified) {
            $since = Carbon::parse($ifModifiedSince);
            if ($lastModified->lte($since)) {
                return response()->noContent(304)
                    ->withHeaders(['Last-Modified' => $lastModified->toRfc7231String()]);
            }
        }

        return $response;
    }

    private function extractLastModified(string $content): ?Carbon
    {
        $data = json_decode($content, true);
        if (!$data) return null;

        // Look for the most recent updated_at in the response data
        $items = $data['data'] ?? [];
        if (!is_array($items)) return null;

        // Handle paginated collections
        $maxDate = null;
        foreach ($items as $item) {
            if (isset($item['updated_at'])) {
                $date = Carbon::parse($item['updated_at']);
                if (!$maxDate || $date->gt($maxDate)) {
                    $maxDate = $date;
                }
            }
        }

        return $maxDate;
    }
}
```

### 6.2 Cacheable Endpoint Registration

Apply `ConditionalResponse` middleware to designated offline-cacheable routes via a middleware alias:

**File**: `bootstrap/app.php` -- add alias:

```php
$middleware->alias([
    // ... existing aliases ...
    'cache.conditional' => \App\Http\Middleware\ConditionalResponse::class,
]);
```

Apply to routes in `routes/api.php`:

```php
// Cacheable endpoints (099-MOB)
Route::middleware('cache.conditional')->group(function () {
    Route::get('chart-accounts', [ChartAccountController::class, 'index']);
    Route::get('contacts', [ContactController::class, 'index']);
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('bills', [BillController::class, 'index']);
    Route::get('bank-transactions', [BankTransactionController::class, 'index']);
    Route::get('workspace', [WorkspaceController::class, 'show']);
});
```

Note: These routes already exist. The middleware is added to the existing route definitions, not as duplicate routes.

### 6.3 Sync Manifest Endpoint

**File**: `app/Http/Controllers/Api/SyncManifestController.php`

```php
class SyncManifestController extends Controller
{
    // GET /api/v1/sync/manifest
    public function __invoke(Request $request): JsonResponse
    {
        $workspaceId = $request->workspace_id;

        $resources = [
            'chart_accounts' => $this->resourceMeta(ChartAccount::class, $workspaceId),
            'contacts' => $this->resourceMeta(Contact::class, $workspaceId),
            'invoices' => $this->resourceMeta(Invoice::class, $workspaceId),
            'bills' => $this->resourceMeta(Invoice::class, $workspaceId, ['direction' => 'payable']),
            'bank_transactions' => $this->resourceMeta(BankTransaction::class, $workspaceId),
        ];

        return response()->json(['data' => $resources]);
    }

    private function resourceMeta(string $model, int $workspaceId, array $filters = []): array
    {
        $query = $model::where('workspace_id', $workspaceId);

        foreach ($filters as $key => $value) {
            $query->where($key, $value);
        }

        $count = $query->count();
        $lastModified = $query->max('updated_at');
        $etag = md5($model . $workspaceId . $count . $lastModified);

        return [
            'count' => $count,
            'last_modified_at' => $lastModified,
            'etag' => '"' . $etag . '"',
        ];
    }
}
```

**Route** (inside workspace-scoped group):

```php
Route::get('sync/manifest', SyncManifestController::class);
```

---

## 7. Receipt Capture

### 7.1 ReceiptCaptureController

**File**: `app/Http/Controllers/Api/ReceiptCaptureController.php`

```php
class ReceiptCaptureController extends Controller
{
    // POST /api/v1/inbox/capture
    public function store(CaptureReceiptRequest $request): JsonResponse
    {
        $inboxItem = CaptureReceipt::run(
            workspaceId: $request->integer('workspace_id'),
            files: $request->file('images'),
            metadata: [
                'vendor_name' => $request->input('vendor_name'),
                'amount' => $request->input('amount'),
                'date' => $request->input('date'),
                'notes' => $request->input('notes'),
            ],
            capturedAt: $request->input('captured_at')
                ? Carbon::parse($request->input('captured_at'))
                : null,
        );

        return response()->json([
            'data' => new InboxItemResource($inboxItem),
        ], 201);
    }
}
```

### 7.2 CaptureReceipt Action

**File**: `app/Actions/Inbox/CaptureReceipt.php`

```php
class CaptureReceipt
{
    use AsAction;

    public function handle(
        int $workspaceId,
        array $files,
        array $metadata = [],
        ?Carbon $capturedAt = null,
    ): InboxItem {
        $uuid = (string) Str::uuid();
        $primaryFile = $files[0];
        $ext = $primaryFile->getClientOriginalExtension();
        $path = "inbox/{$workspaceId}/{$uuid}.{$ext}";

        $primaryFile->storeAs('', $path, 'local');

        $item = InboxItem::create([
            'uuid' => $uuid,
            'workspace_id' => $workspaceId,
            'source' => InboxItemSource::MobileCapture,
            'status' => InboxItemStatus::Processing,
            'received_at' => now(),
            'captured_at' => $capturedAt,
            'raw_file_path' => $path,
            'disk' => 'local',
            'original_filename' => $primaryFile->getClientOriginalName(),
            'mime_type' => $primaryFile->getMimeType(),
            'size_bytes' => $primaryFile->getSize(),
            'extracted_data' => array_filter($metadata), // User-provided hints
        ]);

        // Store additional images as attachments on the InboxItem
        // (requires adding InboxItem to morph map and HasAttachments trait)
        foreach (array_slice($files, 1) as $additionalFile) {
            UploadAttachment::run(
                workspaceId: $workspaceId,
                attachableType: 'inbox_item',
                attachableId: $item->id,
                file: $additionalFile,
                uploadedBy: null,
            );
        }

        ExtractInboxDocumentJob::dispatch($item->id);

        return $item;
    }
}
```

### 7.3 InboxItemSource Enum Extension

**File**: `app/Enums/InboxItemSource.php` -- add new case:

```php
enum InboxItemSource: string
{
    case Email = 'email';
    case Upload = 'upload';
    case MobileCapture = 'mobile_capture';  // New (099-MOB)

    public function label(): string
    {
        return match ($this) {
            self::Email => 'Email',
            self::Upload => 'Upload',
            self::MobileCapture => 'Mobile Capture',
        };
    }
}
```

### 7.4 Form Request

**File**: `app/Http/Requests/Inbox/CaptureReceiptRequest.php`

```php
class CaptureReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('inbox.upload');
    }

    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1', 'max:5'],
            'images.*' => ['required', 'file', 'max:20480', 'mimes:jpg,jpeg,png,heic,heif,pdf'],
            'vendor_name' => ['nullable', 'string', 'max:255'],
            'amount' => ['nullable', 'integer', 'min:0'],        // cents
            'date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'captured_at' => ['nullable', 'date'],
        ];
    }
}
```

### 7.5 Morph Map Extension

**File**: `app/Providers/AppServiceProvider.php` -- add `inbox_item` to morph map:

```php
Relation::morphMap([
    'invoice' => Invoice::class,
    'journal_entry' => JournalEntry::class,
    'bank_transaction' => BankTransaction::class,
    'contact' => Contact::class,
    'job' => Job::class,
    'inbox_item' => InboxItem::class,  // New (099-MOB)
]);
```

### 7.6 Route

Added to workspace-scoped group in `routes/api.php`:

```php
// Receipt capture (099-MOB)
Route::post('inbox/capture', [ReceiptCaptureController::class, 'store']);
```

---

## 8. Image & File Optimisation

### 8.1 AttachmentVariantController

**File**: `app/Http/Controllers/Api/AttachmentVariantController.php`

```php
class AttachmentVariantController extends Controller
{
    // GET /api/v1/attachments/{uuid}/thumbnail
    public function thumbnail(Request $request, string $uuid): StreamedResponse
    {
        $attachment = Attachment::where('workspace_id', $request->integer('workspace_id'))
            ->where('uuid', $uuid)
            ->firstOrFail();

        Gate::authorize('view', $attachment);

        return GenerateAttachmentVariant::run($attachment, 'thumbnail');
    }

    // GET /api/v1/attachments/{uuid}/preview
    public function preview(Request $request, string $uuid): StreamedResponse
    {
        $attachment = Attachment::where('workspace_id', $request->integer('workspace_id'))
            ->where('uuid', $uuid)
            ->firstOrFail();

        Gate::authorize('view', $attachment);

        return GenerateAttachmentVariant::run($attachment, 'preview');
    }
}
```

### 8.2 GenerateAttachmentVariant Action

**File**: `app/Actions/Attachments/GenerateAttachmentVariant.php`

```php
class GenerateAttachmentVariant
{
    use AsAction;

    private const VARIANTS = [
        'thumbnail' => ['max_edge' => 400, 'quality' => 80, 'format' => 'webp'],
        'preview' => ['max_edge' => 1200, 'quality' => 85, 'format' => 'webp'],
    ];

    public function handle(Attachment $attachment, string $variant): StreamedResponse
    {
        $config = self::VARIANTS[$variant]
            ?? throw new \InvalidArgumentException("Unknown variant: {$variant}");

        $variantPath = "attachments/{$attachment->uuid}/variants/{$variant}.{$config['format']}";
        $disk = Storage::disk($attachment->disk);

        // Serve from cache if exists
        if ($disk->exists($variantPath)) {
            return $this->stream($disk, $variantPath, $config['format']);
        }

        // Generate variant
        if (!$this->isImage($attachment->mime_type)) {
            abort(422, 'Thumbnails are only available for image attachments.');
        }

        $image = Image::read($disk->readStream($attachment->stored_path));
        $image->scaleDown(width: $config['max_edge'], height: $config['max_edge']);
        $encoded = $image->toWebp($config['quality']);

        $disk->put($variantPath, (string) $encoded);

        return $this->stream($disk, $variantPath, $config['format']);
    }

    private function stream(Filesystem $disk, string $path, string $format): StreamedResponse { ... }

    private function isImage(string $mimeType): bool
    {
        return str_starts_with($mimeType, 'image/');
    }
}
```

### 8.3 AttachmentResource Extension

**File**: `app/Http/Resources/AttachmentResource.php` -- add variant URLs:

```php
public function toArray(Request $request): array
{
    return [
        // ... existing fields ...
        'thumbnail_url' => $this->isImage()
            ? url("/api/v1/attachments/{$this->uuid}/thumbnail")
            : null,
        'preview_url' => $this->isImage()
            ? url("/api/v1/attachments/{$this->uuid}/preview")
            : null,
    ];
}
```

### 8.4 Routes

Added to workspace-scoped group in `routes/api.php`:

```php
// Attachment variants (099-MOB)
Route::get('attachments/{uuid}/thumbnail', [AttachmentVariantController::class, 'thumbnail']);
Route::get('attachments/{uuid}/preview', [AttachmentVariantController::class, 'preview']);
```

---

## 9. Mobile Response Optimisation

### 9.1 DetectClientPlatform Middleware

**File**: `app/Http/Middleware/DetectClientPlatform.php`

```php
class DetectClientPlatform
{
    public function handle(Request $request, Closure $next): Response
    {
        $platform = $request->header('X-Client-Platform');

        if ($platform === 'mobile') {
            $request->attributes->set('client_platform', 'mobile');

            // Override default per_page if not explicitly set
            if (!$request->has('per_page')) {
                $request->merge(['per_page' => 25]);
            }
        }

        return $next($request);
    }
}
```

### 9.2 API Resource Pattern

API Resources check the `client_platform` attribute to omit `web_only` fields:

```php
// In any API Resource
public function toArray(Request $request): array
{
    $isMobile = $request->attributes->get('client_platform') === 'mobile';

    return array_filter([
        'uuid' => $this->uuid,
        'name' => $this->name,
        'email' => $this->email,
        'phone' => $this->phone,
        // Web-only fields omitted on mobile
        'html_body' => $isMobile ? null : $this->html_body,
        'email_history' => $isMobile ? null : $this->email_history,
        'audit_trail' => $isMobile ? null : $this->audit_trail,
    ], fn ($value) => $value !== null || !$isMobile);
}
```

This pattern is applied incrementally per-resource as the mobile app is built. No bulk changes needed now.

### 9.3 Middleware Registration

Register `DetectClientPlatform` in `bootstrap/app.php` as a global API middleware:

```php
$middleware->api(prepend: [
    \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    \App\Http\Middleware\DetectClientPlatform::class,  // New (099-MOB)
]);
```

---

## 10. Task Breakdown

### Phase 1: Token Auth Foundation (P1)

| # | Task | File(s) | Depends On | Est |
|---|------|---------|-----------|-----|
| 1 | Create `DevicePlatform` enum | `app/Enums/DevicePlatform.php` | -- | 0.5h |
| 2 | Create migration: `device_registrations` | `database/migrations/2026_04_01_100001_...` | -- | 0.5h |
| 3 | Create migration: `device_push_preferences` | `database/migrations/2026_04_01_100002_...` | -- | 0.5h |
| 4 | Create migration: add `last_login_ip`, `last_login_location` to users | `database/migrations/2026_04_01_100003_...` | -- | 0.5h |
| 5 | Create migration: add `captured_at` to inbox_items | `database/migrations/2026_04_01_100004_...` | -- | 0.5h |
| 6 | Create `config/mobile.php` | `config/mobile.php` | -- | 0.5h |
| 7 | Create `IssueApiToken` action | `app/Actions/Auth/IssueApiToken.php` | -- | 0.5h |
| 8 | Create `RevokeAllUserTokens` action | `app/Actions/Auth/RevokeAllUserTokens.php` | 2 | 0.5h |
| 9 | Create `RevokeDeviceRegistrations` action | `app/Actions/Auth/RevokeDeviceRegistrations.php` | 2 | 0.5h |
| 10 | Create `IssueTokenRequest` form request | `app/Http/Requests/Auth/IssueTokenRequest.php` | -- | 0.5h |
| 11 | Create `VerifyMfaTokenRequest` form request | `app/Http/Requests/Auth/VerifyMfaTokenRequest.php` | -- | 0.5h |
| 12 | Create `AuthTokenController` (store, mfa, refresh, revoke, revokeById, index) | `app/Http/Controllers/Api/AuthTokenController.php` | 7, 8, 9, 10, 11 | 3h |
| 13 | Register token auth routes in `routes/api.php` | `routes/api.php` | 12 | 0.5h |
| 14 | Create `RevokeTokensOnPasswordChange` listener | `app/Listeners/Auth/RevokeTokensOnPasswordChange.php` | 8 | 0.5h |
| 15 | Register password change listener in `EventServiceProvider` | `app/Providers/EventServiceProvider.php` | 14 | 0.5h |
| 16 | Update `User` model: add `last_login_ip`, `last_login_location` to fillable/casts | `app/Models/User.php` | 4 | 0.5h |
| 17 | Write feature tests for token auth (issue, MFA, refresh, revoke, list) | `tests/Feature/Api/AuthTokenTest.php` | 12, 13 | 3h |

### Phase 2: Push Notification Infrastructure (P1)

| # | Task | File(s) | Depends On | Est |
|---|------|---------|-----------|-----|
| 18 | Install `laravel-notification-channels/fcm` package | `composer.json` | -- | 0.5h |
| 19 | Create `DeviceRegistration` model | `app/Models/DeviceRegistration.php` | 2 | 1h |
| 20 | Create `DevicePushPreference` model | `app/Models/DevicePushPreference.php` | 3 | 0.5h |
| 21 | Create `RegisterDeviceRequest` form request | `app/Http/Requests/Device/RegisterDeviceRequest.php` | 1 | 0.5h |
| 22 | Create `UpdateDevicePushPreferencesRequest` form request | `app/Http/Requests/Device/UpdateDevicePushPreferencesRequest.php` | 19, 20 | 0.5h |
| 23 | Create `DeviceRegistrationResource` API resource | `app/Http/Resources/DeviceRegistrationResource.php` | 19 | 0.5h |
| 24 | Create `DeviceController` (store, index, destroy, preferences, updatePreferences) | `app/Http/Controllers/Api/DeviceController.php` | 19, 20, 21, 22, 23 | 2h |
| 25 | Register device routes in `routes/api.php` | `routes/api.php` | 24 | 0.5h |
| 26 | Create `FcmClient` service | `app/Services/FcmClient.php` | 18 | 2h |
| 27 | Create `PushChannel` | `app/Channels/PushChannel.php` | 19, 26 | 2h |
| 28 | Create `DispatchPushNotificationJob` | `app/Jobs/DispatchPushNotificationJob.php` | 27 | 1h |
| 29 | Extend `CreateNotification` to dispatch push job | `app/Actions/Notifications/CreateNotification.php` | 28 | 0.5h |
| 30 | Write feature tests for device registration and push delivery | `tests/Feature/Api/DeviceRegistrationTest.php` | 24, 25 | 2h |
| 31 | Write feature tests for push preferences | `tests/Feature/Api/DevicePushPreferenceTest.php` | 24, 25 | 1h |

### Phase 3: API Stability & Offline Caching (P1/P2)

| # | Task | File(s) | Depends On | Est |
|---|------|---------|-----------|-----|
| 32 | Create `RateLimitHeaders` middleware | `app/Http/Middleware/RateLimitHeaders.php` | -- | 1h |
| 33 | Register `RateLimitHeaders` in `bootstrap/app.php` | `bootstrap/app.php` | 32 | 0.5h |
| 34 | Create `ConditionalResponse` middleware | `app/Http/Middleware/ConditionalResponse.php` | -- | 2h |
| 35 | Register `cache.conditional` middleware alias | `bootstrap/app.php` | 34 | 0.5h |
| 36 | Apply `cache.conditional` to cacheable routes | `routes/api.php` | 35 | 0.5h |
| 37 | Create `SyncManifestController` | `app/Http/Controllers/Api/SyncManifestController.php` | -- | 1.5h |
| 38 | Register sync manifest route | `routes/api.php` | 37 | 0.5h |
| 39 | Create `GenerateApiManifest` artisan command | `app/Console/Commands/GenerateApiManifest.php` | -- | 2h |
| 40 | Write feature tests for conditional responses (ETag, 304) | `tests/Feature/Api/ConditionalResponseTest.php` | 34, 36 | 2h |
| 41 | Write feature tests for sync manifest | `tests/Feature/Api/SyncManifestTest.php` | 37, 38 | 1h |

### Phase 4: Receipt Capture & Image Optimisation (P2)

| # | Task | File(s) | Depends On | Est |
|---|------|---------|-----------|-----|
| 42 | Add `MobileCapture` case to `InboxItemSource` enum | `app/Enums/InboxItemSource.php` | -- | 0.5h |
| 43 | Add `inbox_item` to morph map in `AppServiceProvider` | `app/Providers/AppServiceProvider.php` | -- | 0.5h |
| 44 | Create `CaptureReceiptRequest` form request | `app/Http/Requests/Inbox/CaptureReceiptRequest.php` | -- | 0.5h |
| 45 | Create `CaptureReceipt` action | `app/Actions/Inbox/CaptureReceipt.php` | 5, 42 | 1.5h |
| 46 | Create `ReceiptCaptureController` | `app/Http/Controllers/Api/ReceiptCaptureController.php` | 44, 45 | 1h |
| 47 | Register receipt capture route | `routes/api.php` | 46 | 0.5h |
| 48 | Create `GenerateAttachmentVariant` action | `app/Actions/Attachments/GenerateAttachmentVariant.php` | -- | 2h |
| 49 | Create `AttachmentVariantController` | `app/Http/Controllers/Api/AttachmentVariantController.php` | 48 | 1h |
| 50 | Register attachment variant routes | `routes/api.php` | 49 | 0.5h |
| 51 | Extend `AttachmentResource` with `thumbnail_url` and `preview_url` | `app/Http/Resources/AttachmentResource.php` | 50 | 0.5h |
| 52 | Write feature tests for receipt capture | `tests/Feature/Api/ReceiptCaptureTest.php` | 46, 47 | 2h |
| 53 | Write feature tests for attachment variants | `tests/Feature/Api/AttachmentVariantTest.php` | 49, 50 | 1.5h |

### Phase 5: Mobile Response Optimisation (P3)

| # | Task | File(s) | Depends On | Est |
|---|------|---------|-----------|-----|
| 54 | Create `DetectClientPlatform` middleware | `app/Http/Middleware/DetectClientPlatform.php` | -- | 1h |
| 55 | Register middleware in `bootstrap/app.php` | `bootstrap/app.php` | 54 | 0.5h |
| 56 | Add mobile-aware field trimming to `ContactResource` | `app/Http/Resources/ContactResource.php` | 54 | 0.5h |
| 57 | Add mobile-aware field trimming to `InvoiceResource` | `app/Http/Resources/InvoiceResource.php` | 54 | 0.5h |
| 58 | Write feature tests for mobile response optimisation | `tests/Feature/Api/MobileResponseTest.php` | 54, 55, 56, 57 | 1.5h |
| 59 | Run full API audit (JSON responses, no HTML, no redirects) | `tests/Feature/Api/ApiStabilityAuditTest.php` | -- | 3h |

---

## 11. Testing Strategy

### 11.1 Feature Tests

| Test File | Covers | Est Tests |
|-----------|--------|-----------|
| `AuthTokenTest.php` | Token issuance, MFA flow, refresh, revoke, list, password change revocation | ~15 |
| `DeviceRegistrationTest.php` | Device register, upsert, list, delete, token revoke cascade | ~10 |
| `DevicePushPreferenceTest.php` | Get/update preferences, category validation | ~6 |
| `ConditionalResponseTest.php` | ETag generation, 304 responses, If-None-Match, If-Modified-Since | ~8 |
| `SyncManifestTest.php` | Manifest shape, counts, ETags | ~4 |
| `ReceiptCaptureTest.php` | Single/multi image capture, metadata, captured_at, validation | ~8 |
| `AttachmentVariantTest.php` | Thumbnail generation, preview generation, cache hit, non-image rejection | ~6 |
| `MobileResponseTest.php` | X-Client-Platform header, trimmed responses, default per_page | ~6 |
| `ApiStabilityAuditTest.php` | JSON responses for 401/422/404, no HTML, CSRF bypass for tokens | ~8 |

**Total estimated: ~71 new tests**

### 11.2 Test Patterns

All tests follow existing workspace test setup from CLAUDE.md:

```php
uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->user = User::factory()->create();
    // ... org + workspace setup ...
    $this->workspace->users()->attach($this->user->id, ['role' => 'owner']);
    $this->wsHeaders = ['X-Workspace-Id' => (string) $this->workspace->id];
});
```

Token auth tests create tokens via `$this->user->createToken('test-device')` and use `withToken($token->plainTextToken)` instead of `actingAs()`.

---

## 12. Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| FCM credentials not configured in all environments | Push notifications silently fail | FR-018: Graceful degradation, admin warning in settings |
| Token refresh window too short causes user friction | Users forced to re-login frequently | Configurable via `config/mobile.php`, default 30 days |
| ETag generation on large paginated responses is slow | Increased API latency | MD5 hash of serialised response is O(n); cacheable endpoints already return bounded page sizes |
| `InboxItemSource::MobileCapture` breaks existing enum-dependent code | Runtime errors | Enum cases are string-backed; existing `match` statements get `default` fallback |
| Image processing (Intervention Image) for thumbnails is CPU-intensive | Queue worker overload | Generate variants on-demand with cache; heavy processing is a one-time cost per attachment |
