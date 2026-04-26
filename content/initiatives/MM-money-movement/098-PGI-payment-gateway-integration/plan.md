---
title: "Implementation Plan: Payment Gateway Integration"
description: "Stripe card payments and GoCardless direct debit for online invoice payments with auto-reconciliation"
---

# Implementation Plan: Payment Gateway Integration

**Spec**: [spec.md](/initiatives/FL-financial-ledger/098-PGI-payment-gateway-integration/spec)
**Created**: 2026-04-01
**Status**: Draft

---

## 1. Architecture Overview

### How Payment Gateways Integrate with the Event-Sourced Invoice System

The existing invoice payment pipeline is:

```
Controller -> RecordInvoicePayment action -> InvoiceAggregate::recordPayment()
  -> InvoicePaymentReceived event -> InvoiceProjector::onInvoicePaymentReceived()
    -> Updates Invoice read model (amount_paid, amount_due, status)
    -> Creates InvoicePayment record
```

Gateway payments insert a thin orchestration layer **before** this pipeline, not alongside it:

```
Webhook arrives (Stripe/GoCardless)
  -> Signature verification (middleware)
  -> Idempotency check (gateway_event_id unique index)
  -> ProcessGatewayPayment action (NEW)
      -> RecordInvoicePayment::run() (EXISTING -- unchanged)
          -> InvoiceAggregate::recordPayment() (EXISTING -- unchanged)
          -> InvoicePaymentReceived event (EXISTING -- unchanged)
      -> Update GatewayPayment record (status, paid_at, invoice_payment_id)
      -> Post fee JE if fees absorbed
      -> Post surcharge JE if fees passed through
      -> SendPaymentConfirmationEmail::run() (EXISTING -- unchanged)
```

The key design principle: **gateway payments are a source of payment events, not a parallel payment system**. All financial mutations flow through the same `InvoiceAggregate` and the same `InvoiceProjector`. The `ProcessGatewayPayment` action is the only new entry point -- it delegates to existing infrastructure.

### Technology Stack

- Backend: Laravel 12, PHP 8.4, Spatie Event Sourcing v7
- Frontend: Next.js 16, React 19, TypeScript, TanStack Query v5
- Database: PostgreSQL, single-database multi-tenancy
- Auth: Sanctum cookie SPA + Spatie Permission teams mode
- Stripe SDK: `stripe/stripe-php` v15+
- GoCardless SDK: `gocardless/gocardless-pro` v5+

### Existing Infrastructure

| Component | File | Status |
|-----------|------|--------|
| `InvoiceAggregate::recordPayment()` | `app/Aggregates/InvoiceAggregate.php` | Done -- guards `isPayable()` + `guardNoOverpayment()` |
| `InvoicePaymentReceived` event | `app/Events/Invoicing/InvoicePaymentReceived.php` | Done -- carries amount, paymentDate, paymentMethod, reference, notes, recordedBy |
| `InvoiceProjector::onInvoicePaymentReceived()` | `app/Projectors/InvoiceProjector.php` | Done -- updates Invoice + creates InvoicePayment |
| `RecordInvoicePayment` action | `app/Actions/Invoicing/RecordInvoicePayment.php` | Done -- orchestrates aggregate + persist |
| `InvoicePayment` model | `app/Models/Tenant/InvoicePayment.php` | Done -- amount, payment_date, payment_method, reference, notes, journal_entry_id, recorded_by |
| `Payment` model | `app/Models/Tenant/Payment.php` | Done -- separate payment entity with PaymentMethod + PaymentStatus enums |
| `PaymentMethod` enum | `app/Enums/PaymentMethod.php` | Done -- `cash`, `bank_transfer`, `card`, `cheque`, `other` (needs `direct_debit` case) |
| `PaymentStatus` enum | `app/Enums/PaymentStatus.php` | Done -- `draft`, `completed`, `voided` |
| `SendPaymentConfirmationEmail` action | `app/Actions/Email/SendPaymentConfirmationEmail.php` | Done |
| `InvoiceController::recordPayment()` | `app/Http/Controllers/Api/InvoiceController.php` | Done -- calls RecordInvoicePayment + SendPaymentConfirmationEmail |
| `RecordInvoicePaymentRequest` | `app/Http/Requests/Invoice/RecordInvoicePaymentRequest.php` | Done -- pre-loads invoice in authorize() |
| `CheckFeature` middleware | `app/Http/Middleware/CheckFeature.php` | Done -- checks workspace feature toggle + plan tier |
| `Workspace.slug` column | `app/Models/Tenant/Workspace.php` | Done -- used for public payment portal URLs |
| `Workspace.branding` column | `app/Models/Tenant/Workspace.php` | Done -- JSON column for business name, logo, colors |
| Credit note infrastructure (025-CRN) | Various | Done -- used for auto-refund credit note creation |

### Constraints

- `InvoiceAggregate` and `InvoiceProjector` are NOT modified -- gateway payments flow through the existing pipeline
- All monetary amounts are integers (cents) -- no floats
- `RecordInvoicePayment::handle()` requires `int $recordedBy` -- system-initiated payments use sentinel value `0`
- Webhook processing is queued -- endpoints return 200 immediately after signature verification
- P1 enforces same-currency only (invoice currency must match workspace base currency)
- No raw card data touches our servers -- Stripe hosted checkout handles PCI compliance

---

## 2. Database Migrations

### Migration 1: `create_payment_gateways_table`

**File**: `database/migrations/2026_04_02_100001_create_payment_gateways_table.php`

```php
Schema::create('payment_gateways', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->unsignedBigInteger('workspace_id')->index();
    $table->string('provider', 20);                     // 'stripe' | 'gocardless'
    $table->string('external_account_id')->nullable();   // acct_xxx | GC org ID
    $table->string('status', 20)->default('pending');    // pending, active, restricted, disconnected
    $table->text('access_token')->nullable();            // encrypted, GoCardless OAuth token
    $table->text('refresh_token')->nullable();           // encrypted, GoCardless refresh token
    $table->json('config')->nullable();                  // fee rates, default methods, etc.
    $table->string('fee_mode', 20)->default('absorb');   // absorb | pass_to_customer
    $table->unsignedBigInteger('clearing_account_id')->nullable(); // FK -> chart_accounts
    $table->timestamp('connected_at')->nullable();
    $table->timestamp('disconnected_at')->nullable();
    $table->timestamps();

    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->foreign('clearing_account_id')->references('id')->on('chart_accounts')->nullOnDelete();
    $table->unique(['workspace_id', 'provider']);        // one gateway per provider per workspace
});
```

### Migration 2: `create_payment_links_table`

**File**: `database/migrations/2026_04_02_100002_create_payment_links_table.php`

```php
Schema::create('payment_links', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('workspace_id')->index();
    $table->unsignedBigInteger('invoice_id')->index();
    $table->string('token', 64)->unique();
    $table->string('url');
    $table->timestamp('expires_at');
    $table->timestamp('viewed_at')->nullable();
    $table->unsignedInteger('view_count')->default(0);
    $table->timestamp('deactivated_at')->nullable();
    $table->timestamps();

    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
    $table->unique(['workspace_id', 'invoice_id']);     // one link per invoice
});
```

### Migration 3: `create_gateway_payments_table`

**File**: `database/migrations/2026_04_02_100003_create_gateway_payments_table.php`

```php
Schema::create('gateway_payments', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->unsignedBigInteger('workspace_id')->index();
    $table->unsignedBigInteger('invoice_id')->index();
    $table->unsignedBigInteger('payment_gateway_id')->index();
    $table->string('type', 10)->default('payment');     // payment | refund
    $table->string('external_session_id')->nullable();  // Stripe checkout session ID
    $table->string('external_payment_id')->nullable();  // Stripe PI ID or GoCardless payment ID
    $table->string('external_charge_id')->nullable();   // Stripe charge ID
    $table->string('gateway_event_id')->nullable()->unique(); // webhook event ID, idempotency key
    $table->integer('amount');                           // cents
    $table->integer('fee_amount')->default(0);           // gateway processing fee, cents
    $table->integer('surcharge_amount')->default(0);     // passed to customer, cents
    $table->integer('net_amount')->default(0);           // amount after fees, cents
    $table->string('currency', 3)->default('AUD');
    $table->string('status', 20)->default('pending');    // pending, processing, succeeded, failed, disputed, refunded, expired
    $table->string('failure_reason')->nullable();
    $table->string('dispute_status', 20)->nullable();    // needs_response, under_review, won, lost
    $table->unsignedBigInteger('invoice_payment_id')->nullable(); // FK -> invoice_payments (set after auto-record)
    $table->unsignedBigInteger('journal_entry_id')->nullable();   // FK -> journal_entries (fee/surcharge JE)
    $table->timestamp('paid_at')->nullable();
    $table->timestamp('refunded_at')->nullable();
    $table->json('metadata')->nullable();                // full gateway response for audit
    $table->timestamps();

    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
    $table->foreign('payment_gateway_id')->references('id')->on('payment_gateways')->cascadeOnDelete();
    $table->foreign('invoice_payment_id')->references('id')->on('invoice_payments')->nullOnDelete();
    $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->nullOnDelete();

    $table->index('external_session_id');
    $table->index('external_payment_id');
});
```

### Migration 4: `create_direct_debit_mandates_table`

**File**: `database/migrations/2026_04_02_100004_create_direct_debit_mandates_table.php`

```php
Schema::create('direct_debit_mandates', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->unsignedBigInteger('workspace_id')->index();
    $table->unsignedBigInteger('contact_id')->index();
    $table->unsignedBigInteger('payment_gateway_id')->index();
    $table->string('external_mandate_id')->unique();     // GoCardless mandate ID
    $table->string('scheme', 10)->default('becs');       // becs, bacs, sepa, ach (v1: becs only)
    $table->string('status', 20)->default('pending');    // pending, active, failed, cancelled, expired
    $table->string('bank_account_last4', 4)->nullable();
    $table->timestamp('authorised_at')->nullable();
    $table->timestamp('cancelled_at')->nullable();
    $table->timestamps();

    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->foreign('contact_id')->references('id')->on('contacts')->cascadeOnDelete();
    $table->foreign('payment_gateway_id')->references('id')->on('payment_gateways')->cascadeOnDelete();
});
```

### Migration 5: `add_direct_debit_to_payment_method_enum`

No migration needed -- `PaymentMethod` is a PHP enum and `InvoicePayment.payment_method` is a string column. Add `DirectDebit = 'direct_debit'` to `app/Enums/PaymentMethod.php`.

---

## 3. Backend Components

### New Enums

**`app/Enums/GatewayProvider.php`**

```php
enum GatewayProvider: string
{
    case Stripe = 'stripe';
    case GoCardless = 'gocardless';
}
```

**`app/Enums/GatewayPaymentStatus.php`**

```php
enum GatewayPaymentStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Disputed = 'disputed';
    case Refunded = 'refunded';
    case Expired = 'expired';
}
```

**`app/Enums/GatewayPaymentType.php`**

```php
enum GatewayPaymentType: string
{
    case Payment = 'payment';
    case Refund = 'refund';
}
```

**`app/Enums/FeeMode.php`**

```php
enum FeeMode: string
{
    case Absorb = 'absorb';
    case PassToCustomer = 'pass_to_customer';
}
```

**`app/Enums/MandateStatus.php`**

```php
enum MandateStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
}
```

**`app/Enums/DisputeStatus.php`**

```php
enum DisputeStatus: string
{
    case NeedsResponse = 'needs_response';
    case UnderReview = 'under_review';
    case Won = 'won';
    case Lost = 'lost';
}
```

### PaymentMethod Enum Update

**`app/Enums/PaymentMethod.php`** -- add one case:

```php
case DirectDebit = 'direct_debit';
// label(): 'Direct Debit'
```

### New Models

All tenant-scoped with `workspace_id` column.

**`app/Models/Tenant/PaymentGateway.php`**

```php
class PaymentGateway extends Model
{
    protected $fillable = [
        'uuid', 'workspace_id', 'provider', 'external_account_id',
        'status', 'access_token', 'refresh_token', 'config',
        'fee_mode', 'clearing_account_id', 'connected_at', 'disconnected_at',
    ];

    protected function casts(): array
    {
        return [
            'provider' => GatewayProvider::class,
            'fee_mode' => FeeMode::class,
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'config' => 'array',
            'connected_at' => 'datetime',
            'disconnected_at' => 'datetime',
        ];
    }

    // Relationships: workspace(), clearingAccount(), gatewayPayments(), mandates()
    // Helpers: isActive(): bool, isStripe(): bool, isGoCardless(): bool
    // Helper: feeRate(): array (reads from config with defaults)
}
```

**`app/Models/Tenant/PaymentLink.php`**

```php
class PaymentLink extends Model
{
    protected $fillable = [
        'workspace_id', 'invoice_id', 'token', 'url',
        'expires_at', 'viewed_at', 'view_count', 'deactivated_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'viewed_at' => 'datetime',
            'view_count' => 'integer',
            'deactivated_at' => 'datetime',
        ];
    }

    // Relationships: workspace(), invoice()
    // Helpers: isActive(): bool, isExpired(): bool, recordView(): void
}
```

**`app/Models/Tenant/GatewayPayment.php`**

```php
class GatewayPayment extends Model
{
    protected $fillable = [
        'uuid', 'workspace_id', 'invoice_id', 'payment_gateway_id',
        'type', 'external_session_id', 'external_payment_id', 'external_charge_id',
        'gateway_event_id', 'amount', 'fee_amount', 'surcharge_amount', 'net_amount',
        'currency', 'status', 'failure_reason', 'dispute_status',
        'invoice_payment_id', 'journal_entry_id', 'paid_at', 'refunded_at', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'type' => GatewayPaymentType::class,
            'status' => GatewayPaymentStatus::class,
            'dispute_status' => DisputeStatus::class,
            'amount' => 'integer',
            'fee_amount' => 'integer',
            'surcharge_amount' => 'integer',
            'net_amount' => 'integer',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    // Relationships: workspace(), invoice(), gateway(), invoicePayment(), journalEntry()
}
```

**`app/Models/Tenant/DirectDebitMandate.php`**

```php
class DirectDebitMandate extends Model
{
    protected $fillable = [
        'uuid', 'workspace_id', 'contact_id', 'payment_gateway_id',
        'external_mandate_id', 'scheme', 'status', 'bank_account_last4',
        'authorised_at', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => MandateStatus::class,
            'authorised_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    // Relationships: workspace(), contact(), gateway()
    // Helper: isActive(): bool
}
```

### Invoice Model Additions

**`app/Models/Tenant/Invoice.php`** -- add relationships:

```php
public function paymentLink(): HasOne
{
    return $this->hasOne(PaymentLink::class);
}

public function gatewayPayments(): HasMany
{
    return $this->hasMany(GatewayPayment::class);
}
```

### New Actions

#### Payment Link Actions (`app/Actions/PaymentGateway/`)

**`GeneratePaymentLink`** -- called from `SendInvoice` action after marking sent:

```php
class GeneratePaymentLink
{
    use AsAction;

    public function handle(Invoice $invoice): PaymentLink
    {
        // Reuse existing link on resend (extend expiry)
        $existing = PaymentLink::where('invoice_id', $invoice->id)->first();
        if ($existing) {
            $existing->update(['expires_at' => now()->addDays(90), 'deactivated_at' => null]);
            return $existing;
        }

        $workspace = $invoice->workspace;
        $token = Str::random(64);

        return PaymentLink::create([
            'workspace_id' => $invoice->workspace_id,
            'invoice_id' => $invoice->id,
            'token' => $token,
            'url' => config('app.frontend_url') . "/{$workspace->slug}/pay/{$token}",
            'expires_at' => now()->addDays(90),
        ]);
    }
}
```

**`DeactivatePaymentLink`** -- called from InvoiceProjector on paid/voided:

```php
class DeactivatePaymentLink
{
    use AsAction;

    public function handle(int $invoiceId): void
    {
        PaymentLink::where('invoice_id', $invoiceId)
            ->whereNull('deactivated_at')
            ->update(['deactivated_at' => now()]);
    }
}
```

#### Gateway Connection Actions (`app/Actions/PaymentGateway/`)

**`ConnectStripeAccount`**:

```php
class ConnectStripeAccount
{
    use AsAction;

    public function handle(Workspace $workspace): string  // returns Stripe onboarding URL
    {
        $gateway = PaymentGateway::updateOrCreate(
            ['workspace_id' => $workspace->id, 'provider' => GatewayProvider::Stripe],
            ['uuid' => Str::uuid(), 'status' => 'pending'],
        );

        // Create Stripe Connect Express account
        $account = \Stripe\Account::create([
            'type' => 'express',
            'country' => 'AU',
            'email' => $workspace->organisation->email,
            'capabilities' => ['card_payments' => ['requested' => true], 'transfers' => ['requested' => true]],
            'business_type' => 'company',
        ]);

        $gateway->update(['external_account_id' => $account->id]);

        // Create account link for onboarding
        $link = \Stripe\AccountLink::create([
            'account' => $account->id,
            'refresh_url' => config('app.frontend_url') . '/settings/online-payments?stripe=refresh',
            'return_url' => config('app.frontend_url') . '/settings/online-payments?stripe=return',
            'type' => 'account_onboarding',
        ]);

        return $link->url;
    }
}
```

**`CompleteStripeConnection`** -- called on return from Stripe onboarding:

```php
class CompleteStripeConnection
{
    use AsAction;

    public function handle(Workspace $workspace): PaymentGateway
    {
        $gateway = PaymentGateway::where('workspace_id', $workspace->id)
            ->where('provider', GatewayProvider::Stripe)
            ->firstOrFail();

        $account = \Stripe\Account::retrieve($gateway->external_account_id);

        if ($account->charges_enabled && $account->payouts_enabled) {
            $gateway->update([
                'status' => 'active',
                'connected_at' => now(),
                'config' => array_merge($gateway->config ?? [], [
                    'card_rate_bps' => 290,
                    'card_fixed_cents' => 30,
                ]),
            ]);

            // Auto-create clearing account in Chart of Accounts
            CreateGatewayClearingAccounts::run($workspace, $gateway);
        } else {
            $gateway->update(['status' => 'restricted']);
        }

        return $gateway->fresh();
    }
}
```

**`ConnectGoCardlessAccount`** -- handles GoCardless OAuth:

```php
class ConnectGoCardlessAccount
{
    use AsAction;

    public function handle(Workspace $workspace, string $authCode): PaymentGateway
    {
        // Exchange auth code for access token
        $response = Http::post('https://connect.gocardless.com/oauth/access_token', [
            'grant_type' => 'authorization_code',
            'code' => $authCode,
            'client_id' => config('services.gocardless.client_id'),
            'client_secret' => config('services.gocardless.client_secret'),
            'redirect_uri' => config('services.gocardless.redirect_uri'),
        ]);

        $data = $response->json();

        $gateway = PaymentGateway::updateOrCreate(
            ['workspace_id' => $workspace->id, 'provider' => GatewayProvider::GoCardless],
            [
                'uuid' => Str::uuid(),
                'external_account_id' => $data['organisation_id'],
                'access_token' => $data['access_token'],
                'status' => 'active',
                'connected_at' => now(),
                'config' => [
                    'dd_rate_bps' => 100,
                    'dd_cap_cents' => 500,
                ],
            ],
        );

        CreateGatewayClearingAccounts::run($workspace, $gateway);

        return $gateway;
    }
}
```

**`DisconnectGateway`**:

```php
class DisconnectGateway
{
    use AsAction;

    public function handle(PaymentGateway $gateway): void
    {
        $gateway->update([
            'status' => 'disconnected',
            'disconnected_at' => now(),
        ]);
        // Note: webhook endpoints remain active for in-flight payments
    }
}
```

**`CreateGatewayClearingAccounts`** -- auto-creates Chart of Accounts entries:

```php
class CreateGatewayClearingAccounts
{
    use AsAction;

    public function handle(Workspace $workspace, PaymentGateway $gateway): void
    {
        $providerLabel = $gateway->provider === GatewayProvider::Stripe ? 'Stripe' : 'GoCardless';
        $clearingCode = $gateway->provider === GatewayProvider::Stripe ? '1060' : '1061';

        // Check code uniqueness, suffix if taken
        $clearingCode = $this->uniqueCode($workspace->id, $clearingCode, $providerLabel);

        $clearingAccount = ChartAccount::create([
            'workspace_id' => $workspace->id,
            'code' => $clearingCode,
            'name' => "Gateway Clearing - {$providerLabel}",
            'type' => 'asset',
            'sub_type' => 'current_asset',
            'is_system' => true,
        ]);

        $gateway->update(['clearing_account_id' => $clearingAccount->id]);

        // Create shared fee/revenue accounts (once per workspace)
        $this->ensureAccount($workspace->id, '6200', 'Payment Processing Fees', 'expense', 'operating_expense');
        $this->ensureAccount($workspace->id, '4200', 'Payment Surcharge Revenue', 'revenue', 'other_revenue');
    }
}
```

#### Stripe Payment Actions (`app/Actions/PaymentGateway/Stripe/`)

**`CreateCheckoutSession`**:

```php
class CreateCheckoutSession
{
    use AsAction;

    public function handle(
        Invoice $invoice,
        PaymentGateway $gateway,
        int $amount,             // cents -- invoice amount to pay
        int $surchargeAmount,    // cents -- 0 if absorb mode
    ): GatewayPayment {
        // Guard: same currency
        if ($invoice->currency !== $invoice->workspace->base_currency) {
            throw new \DomainException('Online payments are only available for invoices in your base currency.');
        }

        $totalCharge = $amount + $surchargeAmount;

        $session = \Stripe\Checkout\Session::create([
            'mode' => 'payment',
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => strtolower($invoice->currency),
                    'unit_amount' => $totalCharge,
                    'product_data' => [
                        'name' => "Invoice {$invoice->invoice_number}",
                        'description' => $invoice->workspace->name,
                    ],
                ],
                'quantity' => 1,
            ]],
            'payment_intent_data' => [
                'application_fee_amount' => (int) round($totalCharge * 150 / 10000), // 1.5% platform fee
                'metadata' => [
                    'invoice_uuid' => $invoice->uuid,
                    'workspace_id' => $invoice->workspace_id,
                ],
            ],
            'success_url' => $invoice->paymentLink->url . '?status=success',
            'cancel_url' => $invoice->paymentLink->url . '?status=cancelled',
            'expires_at' => now()->addMinutes(30)->timestamp,
            'metadata' => [
                'invoice_uuid' => $invoice->uuid,
                'workspace_id' => $invoice->workspace_id,
            ],
        ], ['stripe_account' => $gateway->external_account_id]);

        // Create pending GatewayPayment record for webhook resolution
        return GatewayPayment::create([
            'uuid' => Str::uuid(),
            'workspace_id' => $invoice->workspace_id,
            'invoice_id' => $invoice->id,
            'payment_gateway_id' => $gateway->id,
            'type' => GatewayPaymentType::Payment,
            'external_session_id' => $session->id,
            'amount' => $amount,
            'surcharge_amount' => $surchargeAmount,
            'currency' => $invoice->currency,
            'status' => GatewayPaymentStatus::Pending,
        ]);
    }
}
```

**`ProcessStripeWebhook`** -- dispatched as a queued job:

```php
class ProcessStripeWebhook
{
    use AsAction;

    public string $jobQueue = 'webhooks';
    public int $jobTries = 3;
    public array $jobBackoff = [10, 60, 300];

    public function handle(array $event): void
    {
        match ($event['type']) {
            'checkout.session.completed' => $this->handleCheckoutCompleted($event),
            'payment_intent.payment_failed' => $this->handlePaymentFailed($event),
            'charge.refunded' => $this->handleRefund($event),
            'charge.dispute.created' => $this->handleDisputeCreated($event),
            'charge.dispute.closed' => $this->handleDisputeClosed($event),
            default => null, // ignore unhandled event types
        };
    }

    private function handleCheckoutCompleted(array $event): void
    {
        $session = $event['data']['object'];
        $gatewayPayment = GatewayPayment::where('external_session_id', $session['id'])->first();

        if (! $gatewayPayment) {
            return; // orphan event -- session not found
        }

        ProcessGatewayPayment::run($gatewayPayment, $event['id'], $session);
    }

    // ... other handlers follow same pattern
}
```

**`ProcessGatewayPayment`** -- the core orchestration action:

```php
class ProcessGatewayPayment
{
    use AsAction;

    public const SYSTEM_USER_ID = 0;

    public function handle(
        GatewayPayment $gatewayPayment,
        string $gatewayEventId,
        array $gatewayData,
    ): void {
        // Idempotency: skip if this event already processed
        if (GatewayPayment::where('gateway_event_id', $gatewayEventId)->exists()) {
            return;
        }

        $invoice = $gatewayPayment->invoice;

        // Guard: invoice still payable (race condition with voided invoices)
        if (! $invoice->status->isPayable()) {
            $this->autoRefund($gatewayPayment, "Invoice {$invoice->invoice_number} is no longer payable.");
            return;
        }

        DB::transaction(function () use ($gatewayPayment, $gatewayEventId, $gatewayData, $invoice) {
            // 1. Record payment via existing pipeline
            $invoicePayment = RecordInvoicePayment::run(
                uuid: $invoice->uuid,
                amount: $gatewayPayment->amount,
                paymentDate: now()->toDateString(),
                recordedBy: self::SYSTEM_USER_ID,
                paymentMethod: $this->resolvePaymentMethod($gatewayPayment),
                reference: $gatewayData['payment_intent'] ?? $gatewayPayment->external_payment_id,
            );

            // 2. Update GatewayPayment record
            $gatewayPayment->update([
                'status' => GatewayPaymentStatus::Succeeded,
                'gateway_event_id' => $gatewayEventId,
                'external_payment_id' => $gatewayData['payment_intent'] ?? null,
                'external_charge_id' => $gatewayData['charges']['data'][0]['id'] ?? null,
                'fee_amount' => $this->extractFeeAmount($gatewayData),
                'net_amount' => $gatewayPayment->amount - $this->extractFeeAmount($gatewayData),
                'invoice_payment_id' => $invoicePayment->id,
                'paid_at' => now(),
                'metadata' => $gatewayData,
            ]);

            // 3. Post fee/surcharge JEs
            $this->postFeeJournalEntries($gatewayPayment);

            // 4. Deactivate payment link if fully paid
            $freshInvoice = $invoice->fresh();
            if ($freshInvoice->status === InvoiceStatus::Paid) {
                DeactivatePaymentLink::run($invoice->id);
            }
        });

        // 5. Send confirmation email (outside transaction -- never blocks payment)
        $freshInvoice = $invoice->fresh()->load(['contact', 'workspace']);
        $invoicePayment = InvoicePayment::find($gatewayPayment->fresh()->invoice_payment_id);
        SendPaymentConfirmationEmail::run($freshInvoice, $invoicePayment, self::SYSTEM_USER_ID);
    }

    private function resolvePaymentMethod(GatewayPayment $gp): string
    {
        return $gp->gateway->provider === GatewayProvider::GoCardless
            ? PaymentMethod::DirectDebit->value
            : PaymentMethod::Card->value;
    }

    private function postFeeJournalEntries(GatewayPayment $gp): void
    {
        $gateway = $gp->gateway;

        if ($gateway->fee_mode === FeeMode::Absorb && $gp->fee_amount > 0) {
            // Dr "Payment Processing Fees" (expense), Cr "Gateway Clearing" (asset)
            $this->createFeeJE($gp, '6200', $gateway->clearing_account_id, $gp->fee_amount);
        }

        if ($gateway->fee_mode === FeeMode::PassToCustomer && $gp->surcharge_amount > 0) {
            // Dr "Gateway Clearing" (asset), Cr "Payment Surcharge Revenue" (revenue)
            $this->createSurchargeJE($gp, $gateway->clearing_account_id, '4200', $gp->surcharge_amount);
        }
    }
}
```

#### GoCardless Actions (`app/Actions/PaymentGateway/GoCardless/`)

**`CreateMandateRedirectFlow`**:

```php
class CreateMandateRedirectFlow
{
    use AsAction;

    public function handle(
        Invoice $invoice,
        PaymentGateway $gateway,
        Contact $contact,
    ): string  // returns redirect URL
    {
        $client = $this->goCardlessClient($gateway);

        $redirectFlow = $client->redirectFlows()->create([
            'params' => [
                'description' => "Direct debit for {$invoice->workspace->name}",
                'session_token' => Str::random(32),
                'success_redirect_url' => config('app.frontend_url')
                    . "/{$invoice->workspace->slug}/pay/{$invoice->paymentLink->token}?mandate=complete",
                'scheme' => 'becs',
            ],
        ]);

        // Store flow ID for completion
        Cache::put(
            "gc_redirect_flow:{$redirectFlow->id}",
            ['invoice_id' => $invoice->id, 'contact_id' => $contact->id, 'gateway_id' => $gateway->id],
            now()->addHours(1),
        );

        return $redirectFlow->redirect_url;
    }
}
```

**`CompleteMandateRedirectFlow`**:

```php
class CompleteMandateRedirectFlow
{
    use AsAction;

    public function handle(string $redirectFlowId): DirectDebitMandate
    {
        $flowData = Cache::pull("gc_redirect_flow:{$redirectFlowId}");
        $gateway = PaymentGateway::findOrFail($flowData['gateway_id']);
        $client = $this->goCardlessClient($gateway);

        $completedFlow = $client->redirectFlows()->complete($redirectFlowId, [
            'params' => ['session_token' => /* from cache */],
        ]);

        return DirectDebitMandate::create([
            'uuid' => Str::uuid(),
            'workspace_id' => $gateway->workspace_id,
            'contact_id' => $flowData['contact_id'],
            'payment_gateway_id' => $gateway->id,
            'external_mandate_id' => $completedFlow->links->mandate,
            'scheme' => 'becs',
            'status' => MandateStatus::Pending, // Active once webhook confirms
        ]);
    }
}
```

**`CreateDirectDebitPayment`**:

```php
class CreateDirectDebitPayment
{
    use AsAction;

    public function handle(
        Invoice $invoice,
        DirectDebitMandate $mandate,
        int $amount,
        int $surchargeAmount,
    ): GatewayPayment
    {
        $client = $this->goCardlessClient($mandate->gateway);

        $payment = $client->payments()->create([
            'params' => [
                'amount' => $amount + $surchargeAmount, // GoCardless uses cents
                'currency' => strtoupper($invoice->currency),
                'links' => ['mandate' => $mandate->external_mandate_id],
                'metadata' => [
                    'invoice_uuid' => $invoice->uuid,
                    'workspace_id' => $invoice->workspace_id,
                ],
            ],
        ]);

        return GatewayPayment::create([
            'uuid' => Str::uuid(),
            'workspace_id' => $invoice->workspace_id,
            'invoice_id' => $invoice->id,
            'payment_gateway_id' => $mandate->payment_gateway_id,
            'type' => GatewayPaymentType::Payment,
            'external_payment_id' => $payment->id,
            'amount' => $amount,
            'surcharge_amount' => $surchargeAmount,
            'currency' => $invoice->currency,
            'status' => GatewayPaymentStatus::Processing, // DD is server-initiated
        ]);
    }
}
```

**`ProcessGoCardlessWebhook`**:

```php
class ProcessGoCardlessWebhook
{
    use AsAction;

    public string $jobQueue = 'webhooks';
    public int $jobTries = 3;
    public array $jobBackoff = [10, 60, 300];

    public function handle(array $events): void
    {
        foreach ($events as $event) {
            match ($event['resource_type']) {
                'payments' => $this->handlePaymentEvent($event),
                'mandates' => $this->handleMandateEvent($event),
                default => null,
            };
        }
    }

    private function handlePaymentEvent(array $event): void
    {
        match ($event['action']) {
            'confirmed', 'paid_out' => $this->handlePaymentConfirmed($event),
            'failed' => $this->handlePaymentFailed($event),
            default => null,
        };
    }

    private function handleMandateEvent(array $event): void
    {
        match ($event['action']) {
            'active' => $this->handleMandateActive($event),
            'failed' => $this->handleMandateFailed($event),
            'cancelled' => $this->handleMandateCancelled($event),
            default => null,
        };
    }
}
```

#### Refund Actions (`app/Actions/PaymentGateway/`)

**`InitiateGatewayRefund`**:

```php
class InitiateGatewayRefund
{
    use AsAction;

    public function handle(GatewayPayment $gatewayPayment, int $amount, int $initiatedBy): GatewayPayment
    {
        // Guard: cannot refund more than original amount
        if ($amount > $gatewayPayment->amount) {
            throw new \DomainException('Refund amount exceeds original payment amount.');
        }

        $gateway = $gatewayPayment->gateway;

        if ($gateway->provider === GatewayProvider::Stripe) {
            \Stripe\Refund::create([
                'payment_intent' => $gatewayPayment->external_payment_id,
                'amount' => $amount,
            ], ['stripe_account' => $gateway->external_account_id]);
        } else {
            $client = $this->goCardlessClient($gateway);
            $client->refunds()->create([
                'params' => [
                    'amount' => $amount,
                    'links' => ['payment' => $gatewayPayment->external_payment_id],
                ],
            ]);
        }

        return GatewayPayment::create([
            'uuid' => Str::uuid(),
            'workspace_id' => $gatewayPayment->workspace_id,
            'invoice_id' => $gatewayPayment->invoice_id,
            'payment_gateway_id' => $gatewayPayment->payment_gateway_id,
            'type' => GatewayPaymentType::Refund,
            'amount' => $amount,
            'currency' => $gatewayPayment->currency,
            'status' => GatewayPaymentStatus::Pending,
        ]);
    }
}
```

**`ProcessGatewayRefund`** -- triggered by refund webhooks:

```php
class ProcessGatewayRefund
{
    use AsAction;

    public function handle(GatewayPayment $refundRecord, string $gatewayEventId): void
    {
        // Idempotency
        if (GatewayPayment::where('gateway_event_id', $gatewayEventId)->exists()) {
            return;
        }

        DB::transaction(function () use ($refundRecord, $gatewayEventId) {
            $invoice = $refundRecord->invoice;

            // 1. Auto-create credit note via existing 025-CRN pipeline
            $creditNote = CreateCreditNote::run(/* ... from invoice, amount = refund amount */);

            // 2. Auto-approve credit note (posts reversing JE)
            InvoiceAggregate::retrieve($creditNote->uuid)->approve(ProcessGatewayPayment::SYSTEM_USER_ID)->persist();

            // 3. Auto-allocate credit note against original invoice
            AllocateCreditNote::run($creditNote->uuid, $invoice->uuid, $refundRecord->amount, ProcessGatewayPayment::SYSTEM_USER_ID);

            // 4. Update refund GatewayPayment record
            $refundRecord->update([
                'status' => GatewayPaymentStatus::Refunded,
                'gateway_event_id' => $gatewayEventId,
                'refunded_at' => now(),
            ]);
        });
    }
}
```

#### Surcharge Calculation Action

**`CalculateSurcharge`** (`app/Actions/PaymentGateway/CalculateSurcharge.php`):

```php
class CalculateSurcharge
{
    use AsAction;

    public function handle(PaymentGateway $gateway, int $amount): int
    {
        if ($gateway->fee_mode !== FeeMode::PassToCustomer) {
            return 0;
        }

        $config = $gateway->config ?? [];

        if ($gateway->provider === GatewayProvider::Stripe) {
            $rateBps = $config['card_rate_bps'] ?? 290;
            $fixedCents = $config['card_fixed_cents'] ?? 30;
            return (int) round(($amount * $rateBps / 10000) + $fixedCents);
        }

        if ($gateway->provider === GatewayProvider::GoCardless) {
            $rateBps = $config['dd_rate_bps'] ?? 100;
            $capCents = $config['dd_cap_cents'] ?? 500;
            $fee = (int) round($amount * $rateBps / 10000);
            return min($fee, $capCents);
        }

        return 0;
    }
}
```

#### Stale Payment Cleanup Command

**`app/Console/Commands/CleanupStaleGatewayPayments.php`**:

```php
class CleanupStaleGatewayPayments extends Command
{
    protected $signature = 'payments:cleanup-stale';
    protected $description = 'Expire pending gateway payments older than 48 hours';

    public function handle(): void
    {
        $count = GatewayPayment::where('status', GatewayPaymentStatus::Pending)
            ->where('created_at', '<', now()->subHours(48))
            ->update(['status' => GatewayPaymentStatus::Expired]);

        $this->info("Expired {$count} stale gateway payments.");
    }
}
```

Register in `routes/console.php`:

```php
Schedule::command('payments:cleanup-stale')->daily();
```

### New Controllers

**`app/Http/Controllers/Api/PaymentGatewayController.php`** -- authenticated, workspace-scoped:

```php
class PaymentGatewayController extends Controller
{
    // GET    /payment-gateways                    -> index (list connected gateways)
    // POST   /payment-gateways/stripe/connect     -> connectStripe (initiate onboarding)
    // GET    /payment-gateways/stripe/callback     -> stripeCallback (complete connection)
    // POST   /payment-gateways/gocardless/connect  -> connectGoCardless (initiate OAuth)
    // GET    /payment-gateways/gocardless/callback  -> goCardlessCallback (complete OAuth)
    // PATCH  /payment-gateways/{uuid}               -> update (fee mode, config)
    // POST   /payment-gateways/{uuid}/disconnect    -> disconnect
}
```

**`app/Http/Controllers/Api/PublicPaymentController.php`** -- unauthenticated, rate-limited:

```php
class PublicPaymentController extends Controller
{
    // GET   /public/payment-links/{token}           -> show (invoice + workspace branding data)
    // POST  /public/payment-links/{token}/stripe     -> createStripeCheckout (returns checkout URL)
    // POST  /public/payment-links/{token}/gocardless -> initiateDirectDebit (returns redirect URL or collects against existing mandate)
    // POST  /public/payment-links/{token}/gocardless/complete -> completeMandateSetup
}
```

**`app/Http/Controllers/Api/WebhookController.php`** -- unauthenticated, signature-verified:

```php
class WebhookController extends Controller
{
    // POST  /webhooks/stripe      -> handleStripe (verify signature, dispatch ProcessStripeWebhook job)
    // POST  /webhooks/gocardless  -> handleGoCardless (verify HMAC, dispatch ProcessGoCardlessWebhook job)
}
```

**`app/Http/Controllers/Api/GatewayRefundController.php`** -- authenticated, workspace-scoped:

```php
class GatewayRefundController extends Controller
{
    // POST  /gateway-payments/{uuid}/refund  -> refund (initiate refund through gateway)
}
```

**`app/Http/Controllers/Api/DirectDebitMandateController.php`** -- authenticated, workspace-scoped:

```php
class DirectDebitMandateController extends Controller
{
    // GET   /contacts/{id}/mandates          -> index (list mandates for contact)
    // POST  /contacts/{id}/mandates/cancel    -> cancel (cancel mandate via GoCardless API)
}
```

### Form Requests

**`app/Http/Requests/PaymentGateway/ConnectStripeRequest.php`**:

```php
class ConnectStripeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageGateway', Workspace::class);
    }
    // No rules -- the action handles validation
}
```

**`app/Http/Requests/PaymentGateway/UpdatePaymentGatewayRequest.php`**:

```php
class UpdatePaymentGatewayRequest extends FormRequest
{
    public function authorize(): bool
    {
        $gateway = PaymentGateway::where('uuid', $this->route('uuid'))
            ->where('workspace_id', $this->input('workspace_id'))
            ->firstOrFail();

        $this->attributes->set('gateway', $gateway);

        return $this->user()->can('manageGateway', Workspace::class);
    }

    public function rules(): array
    {
        return [
            'fee_mode' => ['sometimes', 'in:absorb,pass_to_customer'],
            'config' => ['sometimes', 'array'],
            'config.card_rate_bps' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'config.card_fixed_cents' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'config.dd_rate_bps' => ['sometimes', 'integer', 'min:0', 'max:500'],
            'config.dd_cap_cents' => ['sometimes', 'integer', 'min:0', 'max:2000'],
        ];
    }
}
```

**`app/Http/Requests/PaymentGateway/InitiateRefundRequest.php`**:

```php
class InitiateRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        $gatewayPayment = GatewayPayment::where('uuid', $this->route('uuid'))
            ->where('workspace_id', $this->input('workspace_id'))
            ->firstOrFail();

        $this->attributes->set('gatewayPayment', $gatewayPayment);

        // Reuse invoice.void permission for refunds (owner + accountant only)
        return $this->user()->can('void', $gatewayPayment->invoice);
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
```

### API Resources

**`app/Http/Resources/PaymentGatewayResource.php`**:

```php
class PaymentGatewayResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'provider' => $this->provider->value,
            'status' => $this->status,
            'fee_mode' => $this->fee_mode->value,
            'config' => $this->config,
            'connected_at' => $this->connected_at?->toIso8601String(),
            'disconnected_at' => $this->disconnected_at?->toIso8601String(),
            // Never expose: access_token, refresh_token, external_account_id
        ];
    }
}
```

**`app/Http/Resources/PublicPaymentLinkResource.php`** -- for unauthenticated payment portal:

```php
class PublicPaymentLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $invoice = $this->invoice;
        $workspace = $invoice->workspace;

        return [
            'token' => $this->token,
            'status' => $this->resolveStatus(),             // active, expired, paid, deactivated
            'expires_at' => $this->expires_at->toIso8601String(),
            'workspace' => [
                'business_name' => $workspace->name,
                'logo_url' => $workspace->branding['logo_url'] ?? null,
                'primary_color' => $workspace->branding['primary_color'] ?? null,
            ],
            'invoice' => [
                'number' => $invoice->invoice_number,
                'issue_date' => $invoice->issue_date->toDateString(),
                'due_date' => $invoice->due_date->toDateString(),
                'contact_name' => $invoice->contact->name,
                'lines' => $invoice->lines->map(fn ($l) => [
                    'description' => $l->description,
                    'quantity' => $l->quantity,
                    'unit_price' => $l->unit_price,
                    'amount' => $l->amount,
                ]),
                'subtotal' => $invoice->subtotal,
                'tax_total' => $invoice->tax_total,
                'total' => $invoice->total,
                'amount_paid' => $invoice->amount_paid,
                'amount_due' => $invoice->amount_due,
                'currency' => $invoice->currency,
                'is_paid' => $invoice->amount_due <= 0,
            ],
            'payment_methods' => $this->availablePaymentMethods(),
            'has_active_mandate' => $this->hasActiveMandate(),
            'mandate_bank_last4' => $this->mandateBankLast4(),
        ];
    }
}
```

**`app/Http/Resources/GatewayPaymentResource.php`**

**`app/Http/Resources/DirectDebitMandateResource.php`**

### InvoiceResource Update

Add `payment_gateway_status` and `payment_link_url` to the existing `InvoiceResource`:

```php
// In app/Http/Resources/InvoiceResource.php, add to toArray():
'payment_link_url' => $this->whenLoaded('paymentLink', fn () => $this->paymentLink?->url),
'payment_link_viewed_at' => $this->whenLoaded('paymentLink', fn () => $this->paymentLink?->viewed_at?->toIso8601String()),
'payment_gateway_status' => $this->whenLoaded('gatewayPayments', fn () => $this->latestGatewayPaymentStatus()),
```

### InvoiceProjector Updates

Add payment link deactivation side-effects to `app/Projectors/InvoiceProjector.php`:

```php
public function onInvoicePaymentReceived(InvoicePaymentReceived $event): void
{
    // ... existing code ...

    // NEW: deactivate payment link when fully paid
    if ($newStatus === InvoiceStatus::Paid) {
        DeactivatePaymentLink::run($invoice->id);
    }
}

public function onInvoiceVoided(InvoiceVoided $event): void
{
    // ... existing code ...

    // NEW: deactivate payment link + expire active checkout sessions
    $invoice = Invoice::where('uuid', $event->aggregateRootUuid())->first();
    if ($invoice) {
        DeactivatePaymentLink::run($invoice->id);
        ExpireActiveCheckoutSessions::dispatch($invoice->id);
    }
}
```

### SendInvoice Action Update

Modify `app/Actions/Invoicing/SendInvoice.php` to generate payment link:

```php
class SendInvoice
{
    use AsAction;

    public function handle(string $uuid, int $sentBy): void
    {
        InvoiceAggregate::retrieve($uuid)
            ->markSent($sentBy)
            ->persist();

        // NEW: Generate payment link for online payments
        $invoice = Invoice::where('uuid', $uuid)->firstOrFail();
        GeneratePaymentLink::run($invoice);
    }
}
```

### Morph Map Addition

Add `gateway_payment` to the morph map in `app/Providers/AppServiceProvider.php`:

```php
Relation::morphMap([
    // ... existing entries ...
    'gateway_payment' => GatewayPayment::class,
]);
```

---

## 4. Stripe Integration

### Connect Express Onboarding Flow

1. Workspace owner clicks "Connect Stripe" on Settings > Online Payments
2. Frontend calls `POST /api/v1/payment-gateways/stripe/connect`
3. `ConnectStripeAccount` creates a Stripe Express account + account link
4. Returns onboarding URL -- frontend redirects to Stripe
5. Owner completes Stripe's hosted onboarding (identity verification, bank details)
6. Stripe redirects back to `{FRONTEND_URL}/settings/online-payments?stripe=return`
7. Frontend calls `GET /api/v1/payment-gateways/stripe/callback`
8. `CompleteStripeConnection` retrieves account, checks `charges_enabled` + `payouts_enabled`, updates gateway to `active`, creates clearing accounts

### Checkout Session Flow

1. Customer clicks "Pay with Card" on payment portal
2. Frontend calls `POST /api/v1/public/payment-links/{token}/stripe` with `{ amount: 50000 }` (in cents)
3. `CreateCheckoutSession` validates currency match, calculates surcharge if applicable
4. Creates Stripe Checkout Session with `application_fee_amount` for platform commission
5. Creates `GatewayPayment` record with status `pending` and `external_session_id`
6. Returns `{ checkout_url: "https://checkout.stripe.com/..." }`
7. Frontend redirects customer to Stripe Checkout
8. Customer enters card details on Stripe's hosted page (PCI-compliant)
9. On success: Stripe redirects to `success_url`, fires `checkout.session.completed` webhook
10. On failure: Stripe shows error on checkout page, fires `payment_intent.payment_failed` webhook

### Webhook Handling

**Endpoint**: `POST /api/webhooks/stripe`

**Verification**:
```php
$payload = $request->getContent();
$sigHeader = $request->header('Stripe-Signature');
$event = \Stripe\Webhook::constructEvent($payload, $sigHeader, config('services.stripe.webhook_secret'));
```

**Events handled**:

| Event | Handler | Action |
|-------|---------|--------|
| `checkout.session.completed` | `ProcessStripeWebhook::handleCheckoutCompleted` | Look up `GatewayPayment` by `external_session_id`, call `ProcessGatewayPayment::run()` |
| `payment_intent.payment_failed` | `ProcessStripeWebhook::handlePaymentFailed` | Update `GatewayPayment.status` to `failed`, set `failure_reason` |
| `charge.refunded` | `ProcessStripeWebhook::handleRefund` | Call `ProcessGatewayRefund::run()` -- creates credit note + allocation |
| `charge.dispute.created` | `ProcessStripeWebhook::handleDisputeCreated` | Update `GatewayPayment.dispute_status` to `needs_response`, send notification |
| `charge.dispute.closed` | `ProcessStripeWebhook::handleDisputeClosed` | If `lost`: reverse payment via credit note. If `won`: clear dispute status |

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_xxx              # Platform secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx            # Platform webhook signing secret
STRIPE_PLATFORM_FEE_BPS=150                # 1.5% platform commission (default)
```

---

## 5. GoCardless Integration

### OAuth Connection Flow

1. Owner clicks "Connect GoCardless" on Settings > Online Payments
2. Frontend calls `POST /api/v1/payment-gateways/gocardless/connect`
3. Backend returns GoCardless OAuth authorisation URL
4. Owner authorises MoneyQuest on GoCardless hosted page
5. GoCardless redirects to callback URL with `code` param
6. `ConnectGoCardlessAccount` exchanges code for access token, creates gateway record, creates clearing accounts

### Mandate Setup Flow

1. Customer clicks "Pay by Direct Debit" on payment portal
2. If no active mandate for this contact: redirect to GoCardless hosted mandate page (BECS)
3. Customer enters BSB + account number on GoCardless hosted page
4. GoCardless redirects back with `redirect_flow_id`
5. `CompleteMandateRedirectFlow` completes the flow, creates `DirectDebitMandate` (status: pending)
6. GoCardless fires `mandates.active` webhook -- mandate status updated to `active`
7. Payment is immediately collected against the new mandate

### Direct Debit Payment Flow

1. Customer has active mandate -- clicks "Pay by Direct Debit"
2. `CreateDirectDebitPayment` calls GoCardless API to create payment against mandate
3. Creates `GatewayPayment` with status `processing`
4. Payment portal shows "Your account will be debited within 3-5 business days"
5. GoCardless fires `payments.confirmed` webhook (3-5 business days for BECS)
6. `ProcessGatewayPayment::run()` records the payment through existing pipeline

### Webhook Handling

**Endpoint**: `POST /api/webhooks/gocardless`

**Verification**:
```php
$body = $request->getContent();
$signature = $request->header('Webhook-Signature');
$calculated = hash_hmac('sha256', $body, config('services.gocardless.webhook_secret'));
if (! hash_equals($calculated, $signature)) { abort(498, 'Invalid signature'); }
```

**Events handled**:

| Resource.Action | Handler | Action |
|----------------|---------|--------|
| `mandates.active` | `handleMandateActive` | Update `DirectDebitMandate.status` to `active`, set `authorised_at` |
| `mandates.failed` | `handleMandateFailed` | Update status to `failed`, notify workspace |
| `mandates.cancelled` | `handleMandateCancelled` | Update status to `cancelled`, set `cancelled_at` |
| `payments.confirmed` | `handlePaymentConfirmed` | Call `ProcessGatewayPayment::run()` |
| `payments.paid_out` | `handlePaymentPaidOut` | Update `GatewayPayment.metadata` with payout info |
| `payments.failed` | `handlePaymentFailed` | Update status to `failed`, set `failure_reason`, notify workspace |

### Environment Variables

```env
GOCARDLESS_CLIENT_ID=xxx
GOCARDLESS_CLIENT_SECRET=xxx
GOCARDLESS_WEBHOOK_SECRET=xxx
GOCARDLESS_ENVIRONMENT=sandbox    # sandbox | live
GOCARDLESS_REDIRECT_URI=https://app.moneyquest.com/api/v1/payment-gateways/gocardless/callback
```

---

## 6. Public Payment Portal

### Next.js Page

**File**: `frontend/src/app/(public)/[slug]/pay/[token]/page.tsx`

This is the customer-facing payment page. It requires no authentication. The page is a Server Component that fetches initial data, with client components for payment interactions.

```
frontend/src/app/(public)/[slug]/pay/[token]/
├── page.tsx                        # Server Component -- fetches PaymentLink data via API
├── PaymentPortal.tsx               # 'use client' -- main payment UI
├── StripeCheckoutButton.tsx        # 'use client' -- initiates Stripe redirect
├── DirectDebitButton.tsx           # 'use client' -- initiates GoCardless redirect or collection
├── PaymentSuccess.tsx              # Success confirmation with receipt download
├── PaymentExpired.tsx              # Expired/deactivated link message
└── InvoiceSummary.tsx              # Invoice details display
```

### API Endpoint

**`GET /api/v1/public/payment-links/{token}`** -- unauthenticated, rate-limited (30/min per IP):

- Validates token exists and is not expired/deactivated
- Records `viewed_at` (first view) and increments `view_count`
- Returns `PublicPaymentLinkResource` with workspace branding, invoice details, available payment methods
- Cached for 5 minutes (`Cache::remember("payment_link:{$token}", 300, ...)`)
- No internal IDs exposed -- only token, invoice number, and amounts

### Route Registration

In `routes/api.php`, outside the `auth:sanctum` middleware group:

```php
// Public payment portal (unauthenticated)
Route::prefix('public')->middleware('throttle:30,1')->group(function () {
    Route::get('payment-links/{token}', [PublicPaymentController::class, 'show']);
    Route::post('payment-links/{token}/stripe', [PublicPaymentController::class, 'createStripeCheckout']);
    Route::post('payment-links/{token}/gocardless', [PublicPaymentController::class, 'initiateDirectDebit']);
    Route::post('payment-links/{token}/gocardless/complete', [PublicPaymentController::class, 'completeMandateSetup']);
});

// Webhook endpoints (unauthenticated, signature-verified)
Route::prefix('webhooks')->group(function () {
    Route::post('stripe', [WebhookController::class, 'handleStripe']);
    Route::post('gocardless', [WebhookController::class, 'handleGoCardless']);
});
```

### Frontend Hooks

**`frontend/src/hooks/usePaymentLink.ts`** -- TanStack Query hook for public payment portal:

```typescript
export function usePaymentLink(token: string) {
    return useQuery({
        queryKey: ['payment-link', token],
        queryFn: () => publicApi.get(`/public/payment-links/${token}`),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
```

**`frontend/src/hooks/usePaymentGateways.ts`** -- TanStack Query hooks for settings page:

```typescript
export function usePaymentGateways() { /* list connected gateways */ }
export function useConnectStripe() { /* mutation: initiate Stripe Connect */ }
export function useConnectGoCardless() { /* mutation: initiate GoCardless OAuth */ }
export function useDisconnectGateway() { /* mutation: disconnect gateway */ }
export function useUpdateGateway() { /* mutation: update fee mode / config */ }
```

### Payment Settings Page

**File**: `frontend/src/app/(dashboard)/settings/online-payments/page.tsx`

Displays gateway connection cards, fee mode toggles, and payment method configuration. Feature-gated: only visible on Professional+ plans.

---

## 7. Auto-Reconciliation Flow

The auto-reconciliation pipeline is the heart of this epic. Here is the end-to-end flow:

### Step 1: Webhook Arrives

```
POST /api/webhooks/stripe
  -> Verify Stripe-Signature header
  -> Check event type is handled
  -> Return 200 OK immediately
  -> Dispatch ProcessStripeWebhook job to 'webhooks' queue
```

### Step 2: Resolve Gateway Payment

```
ProcessStripeWebhook::handleCheckoutCompleted
  -> Extract session_id from event payload
  -> GatewayPayment::where('external_session_id', $sessionId)->first()
  -> If not found: log warning, return (orphan event)
  -> Call ProcessGatewayPayment::run($gatewayPayment, $eventId, $sessionData)
```

### Step 3: Idempotency Check

```
ProcessGatewayPayment::handle
  -> GatewayPayment::where('gateway_event_id', $gatewayEventId)->exists()
  -> If exists: return (duplicate webhook, already processed)
```

### Step 4: Record Payment (Existing Pipeline)

```
RecordInvoicePayment::run(
    uuid: $invoice->uuid,
    amount: $gatewayPayment->amount,
    paymentDate: now()->toDateString(),
    recordedBy: 0,                              // SYSTEM_USER_ID
    paymentMethod: 'card',                      // or 'direct_debit'
    reference: 'pi_xxx',                        // Stripe payment intent ID
)
  -> InvoiceAggregate::recordPayment()          // guards isPayable + noOverpayment
  -> InvoicePaymentReceived event fired
  -> InvoiceProjector::onInvoicePaymentReceived
      -> Updates Invoice: amount_paid, amount_due, status
      -> Creates InvoicePayment record
```

### Step 5: Update Gateway Payment Record

```
$gatewayPayment->update([
    'status' => 'succeeded',
    'gateway_event_id' => $eventId,
    'invoice_payment_id' => $invoicePayment->id,
    'paid_at' => now(),
    'metadata' => $fullGatewayResponse,
])
```

### Step 6: Post Fee/Surcharge Journal Entries

```
If fee_mode = 'absorb' and fee_amount > 0:
    JE: Dr "Payment Processing Fees" (6200), Cr "Gateway Clearing - Stripe" (1060)

If fee_mode = 'pass_to_customer' and surcharge_amount > 0:
    JE: Dr "Gateway Clearing - Stripe" (1060), Cr "Payment Surcharge Revenue" (4200)
```

### Step 7: Deactivate Payment Link (if fully paid)

```
If invoice.status == Paid:
    PaymentLink::where('invoice_id', $invoice->id)->update(['deactivated_at' => now()])
```

### Step 8: Send Confirmation Email

```
SendPaymentConfirmationEmail::run($invoice, $invoicePayment, SYSTEM_USER_ID)
```

### Two-Phase Bank Reconciliation

Gateway clearing accounts bridge the gap between gateway payment and bank payout:

1. **Payment confirmed** (this epic): `Dr Gateway Clearing, Cr Accounts Receivable`
2. **Payout lands in bank** (existing 004-BFR bank feeds): Bookkeeper matches bank feed transaction against clearing account balance: `Dr Business Bank Account, Cr Gateway Clearing`

This ensures the clearing account nets to zero once the payout is reconciled, matching standard accounting practice for payment processor clearing.

---

## 8. Security

### Webhook Signature Verification

**Stripe**: Uses the `Stripe\Webhook::constructEvent()` method with the platform webhook secret. Throws `\Stripe\Exception\SignatureVerificationException` on failure. The controller catches this and returns 400.

**GoCardless**: HMAC-SHA256 verification using `hash_hmac('sha256', $body, $secret)` compared against the `Webhook-Signature` header via `hash_equals()` (timing-safe comparison).

Both webhook endpoints are outside all auth middleware. They return 200 immediately after verification and before processing (processing is queued).

### Payment Link Token Security

- Tokens are 64-character random strings generated via `Str::random(64)` (uses `random_bytes()` / CSPRNG)
- Tokens are the sole identifier for payment links -- no internal IDs in URLs
- Token lookup uses a unique database index for O(1) lookups
- Payment link responses never expose `workspace_id`, `invoice_id`, or any internal identifiers
- Expired and deactivated links return informational messages, not errors

### Rate Limiting

- Public payment portal: 30 requests per minute per IP (`throttle:30,1` middleware)
- Webhook endpoints: no rate limiting (Stripe/GoCardless retry on non-2xx responses)
- Authenticated gateway settings: standard API rate limiting (existing `throttle:api` middleware)

### PCI Compliance

- MoneyQuest never handles raw card data -- all card input happens on Stripe's hosted Checkout page
- No card numbers, CVVs, or sensitive cardholder data touch MoneyQuest servers
- This qualifies for PCI DSS SAQ A (merchants that fully outsource cardholder data processing)
- GoCardless bank details are similarly collected on their hosted mandate setup page

### Credential Storage

- `PaymentGateway.access_token` uses Laravel's `encrypted` cast (AES-256-CBC via `APP_KEY`)
- `PaymentGateway.refresh_token` uses Laravel's `encrypted` cast
- Stripe platform secret key stored in `.env` (`STRIPE_SECRET_KEY`), never in database
- GoCardless client secret stored in `.env` (`GOCARDLESS_CLIENT_SECRET`), never in database
- Webhook secrets stored in `.env`, never in database
- No credentials are logged -- `metadata` JSON stores response payloads but Stripe/GoCardless responses do not contain raw credentials

### Permissions

| Action | Permission | Roles |
|--------|-----------|-------|
| Connect/disconnect gateway | `workspace.manage` | owner |
| Update gateway settings | `workspace.manage` | owner |
| View gateway dashboard | `invoice.view` | owner, accountant, bookkeeper, approver, auditor |
| Initiate refund | `invoice.void` | owner, accountant |
| View mandates | `invoice.view` | owner, accountant, bookkeeper |
| Cancel mandate | `invoice.void` | owner, accountant |
| Public payment portal | none (unauthenticated) | -- |

---

## 9. Task Breakdown

### Phase 1: Database & Models (P1 -- Foundation)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 1.1 | Create enums: `GatewayProvider`, `GatewayPaymentStatus`, `GatewayPaymentType`, `FeeMode`, `MandateStatus`, `DisputeStatus` | -- | `app/Enums/` (6 files) |
| 1.2 | Add `DirectDebit` case to `PaymentMethod` enum | -- | `app/Enums/PaymentMethod.php` |
| 1.3 | Create migration: `payment_gateways` table | -- | `database/migrations/` |
| 1.4 | Create migration: `payment_links` table | -- | `database/migrations/` |
| 1.5 | Create migration: `gateway_payments` table | 1.3 | `database/migrations/` |
| 1.6 | Create migration: `direct_debit_mandates` table | 1.3 | `database/migrations/` |
| 1.7 | Create models: `PaymentGateway`, `PaymentLink`, `GatewayPayment`, `DirectDebitMandate` | 1.1, 1.3-1.6 | `app/Models/Tenant/` (4 files) |
| 1.8 | Add `paymentLink()` and `gatewayPayments()` relationships to Invoice model | 1.7 | `app/Models/Tenant/Invoice.php` |
| 1.9 | Add `gateway_payment` to morph map in AppServiceProvider | 1.7 | `app/Providers/AppServiceProvider.php` |

### Phase 2: Payment Link Generation (P1)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 2.1 | Create `GeneratePaymentLink` action | 1.7 | `app/Actions/PaymentGateway/GeneratePaymentLink.php` |
| 2.2 | Create `DeactivatePaymentLink` action | 1.7 | `app/Actions/PaymentGateway/DeactivatePaymentLink.php` |
| 2.3 | Update `SendInvoice` action to call `GeneratePaymentLink` | 2.1 | `app/Actions/Invoicing/SendInvoice.php` |
| 2.4 | Update `InvoiceProjector` -- deactivate link on paid/voided | 2.2 | `app/Projectors/InvoiceProjector.php` |
| 2.5 | Update `InvoiceResource` with payment link fields | 1.8 | `app/Http/Resources/InvoiceResource.php` |

### Phase 3: Stripe Integration (P1)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 3.1 | Install `stripe/stripe-php` package | -- | `composer.json` |
| 3.2 | Add Stripe env vars and config | 3.1 | `config/services.php`, `.env.example` |
| 3.3 | Create `ConnectStripeAccount` action | 1.7 | `app/Actions/PaymentGateway/Stripe/ConnectStripeAccount.php` |
| 3.4 | Create `CompleteStripeConnection` action | 3.3 | `app/Actions/PaymentGateway/Stripe/CompleteStripeConnection.php` |
| 3.5 | Create `CreateGatewayClearingAccounts` action | 1.7 | `app/Actions/PaymentGateway/CreateGatewayClearingAccounts.php` |
| 3.6 | Create `CalculateSurcharge` action | 1.7 | `app/Actions/PaymentGateway/CalculateSurcharge.php` |
| 3.7 | Create `CreateCheckoutSession` action | 1.7, 3.6 | `app/Actions/PaymentGateway/Stripe/CreateCheckoutSession.php` |
| 3.8 | Create `ProcessGatewayPayment` action (core orchestrator) | 1.7, existing `RecordInvoicePayment` | `app/Actions/PaymentGateway/ProcessGatewayPayment.php` |
| 3.9 | Create `ProcessStripeWebhook` action (queued job) | 3.8 | `app/Actions/PaymentGateway/Stripe/ProcessStripeWebhook.php` |
| 3.10 | Create `WebhookController` with Stripe signature verification | 3.9 | `app/Http/Controllers/Api/WebhookController.php` |
| 3.11 | Create `PaymentGatewayController` (connect/disconnect/update) | 3.3, 3.4 | `app/Http/Controllers/Api/PaymentGatewayController.php` |
| 3.12 | Create Form Requests: `ConnectStripeRequest`, `UpdatePaymentGatewayRequest` | 3.11 | `app/Http/Requests/PaymentGateway/` |
| 3.13 | Create API Resources: `PaymentGatewayResource`, `GatewayPaymentResource` | 3.11 | `app/Http/Resources/` |
| 3.14 | Register routes (authenticated gateway settings + webhook endpoints) | 3.10, 3.11 | `routes/api.php` |

### Phase 4: Public Payment Portal (P1)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 4.1 | Create `PublicPaymentLinkResource` | 1.7 | `app/Http/Resources/PublicPaymentLinkResource.php` |
| 4.2 | Create `PublicPaymentController` | 4.1, 3.7 | `app/Http/Controllers/Api/PublicPaymentController.php` |
| 4.3 | Register public routes (rate-limited, unauthenticated) | 4.2 | `routes/api.php` |
| 4.4 | Create Next.js page: `(public)/[slug]/pay/[token]/page.tsx` | 4.1 | `frontend/src/app/(public)/` |
| 4.5 | Create `PaymentPortal` client component | 4.4 | `frontend/src/app/(public)/[slug]/pay/[token]/PaymentPortal.tsx` |
| 4.6 | Create `InvoiceSummary` component | 4.5 | `frontend/src/app/(public)/[slug]/pay/[token]/InvoiceSummary.tsx` |
| 4.7 | Create `StripeCheckoutButton` component | 4.5 | `frontend/src/app/(public)/[slug]/pay/[token]/StripeCheckoutButton.tsx` |
| 4.8 | Create `PaymentSuccess` and `PaymentExpired` components | 4.5 | `frontend/src/app/(public)/[slug]/pay/[token]/` |
| 4.9 | Create `usePaymentLink` TanStack Query hook | 4.2 | `frontend/src/hooks/usePaymentLink.ts` |

### Phase 5: Auto-Reconciliation & Fees (P1)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 5.1 | Implement fee JE posting in `ProcessGatewayPayment` | 3.8 | `app/Actions/PaymentGateway/ProcessGatewayPayment.php` |
| 5.2 | Create `CleanupStaleGatewayPayments` command | 1.7 | `app/Console/Commands/CleanupStaleGatewayPayments.php` |
| 5.3 | Register cleanup command schedule | 5.2 | `routes/console.php` |
| 5.4 | Create `ExpireActiveCheckoutSessions` job | 3.7 | `app/Jobs/ExpireActiveCheckoutSessions.php` |

### Phase 6: P1 Tests

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 6.1 | Unit tests: `CalculateSurcharge` (Stripe + GoCardless fee calculations) | 3.6 | `tests/Unit/Actions/PaymentGateway/` |
| 6.2 | Unit tests: `GeneratePaymentLink` (token generation, reuse, expiry) | 2.1 | `tests/Unit/Actions/PaymentGateway/` |
| 6.3 | Feature tests: Payment gateway CRUD (connect, disconnect, update) | 3.11 | `tests/Feature/Api/PaymentGatewayTest.php` |
| 6.4 | Feature tests: Public payment portal API (show, viewed tracking) | 4.2 | `tests/Feature/Api/PublicPaymentPortalTest.php` |
| 6.5 | Feature tests: `ProcessGatewayPayment` (happy path, idempotency, overpayment guard) | 3.8 | `tests/Feature/Actions/ProcessGatewayPaymentTest.php` |
| 6.6 | Feature tests: Stripe webhook handler (signature verification, event routing) | 3.10 | `tests/Feature/Api/StripeWebhookTest.php` |
| 6.7 | Feature tests: Invoice payment link deactivation on paid/voided | 2.4 | `tests/Feature/Projectors/InvoiceProjectorPaymentLinkTest.php` |
| 6.8 | Feature tests: Authorization (owner connects, bookkeeper cannot, unauthenticated portal) | 3.12 | `tests/Feature/Api/PaymentGatewayAuthTest.php` |
| 6.9 | Feature tests: Rate limiting on public endpoints | 4.3 | `tests/Feature/Api/PublicPaymentRateLimitTest.php` |

### Phase 7: GoCardless Integration (P2)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 7.1 | Install `gocardless/gocardless-pro` package | -- | `composer.json` |
| 7.2 | Add GoCardless env vars and config | 7.1 | `config/services.php`, `.env.example` |
| 7.3 | Create `ConnectGoCardlessAccount` action | 1.7 | `app/Actions/PaymentGateway/GoCardless/ConnectGoCardlessAccount.php` |
| 7.4 | Create `CreateMandateRedirectFlow` action | 1.7 | `app/Actions/PaymentGateway/GoCardless/CreateMandateRedirectFlow.php` |
| 7.5 | Create `CompleteMandateRedirectFlow` action | 7.4 | `app/Actions/PaymentGateway/GoCardless/CompleteMandateRedirectFlow.php` |
| 7.6 | Create `CreateDirectDebitPayment` action | 7.5 | `app/Actions/PaymentGateway/GoCardless/CreateDirectDebitPayment.php` |
| 7.7 | Create `ProcessGoCardlessWebhook` action (queued job) | 3.8 | `app/Actions/PaymentGateway/GoCardless/ProcessGoCardlessWebhook.php` |
| 7.8 | Add GoCardless webhook handler to `WebhookController` | 7.7 | `app/Http/Controllers/Api/WebhookController.php` |
| 7.9 | Update `PublicPaymentController` with GoCardless endpoints | 7.4, 7.6 | `app/Http/Controllers/Api/PublicPaymentController.php` |
| 7.10 | Create `DirectDebitMandateController` | 7.5 | `app/Http/Controllers/Api/DirectDebitMandateController.php` |
| 7.11 | Create `DirectDebitButton` frontend component | 7.9 | `frontend/src/app/(public)/[slug]/pay/[token]/DirectDebitButton.tsx` |
| 7.12 | Create mandate management UI on contact detail page | 7.10 | `frontend/src/components/contacts/MandateList.tsx` |
| 7.13 | Register GoCardless routes | 7.8, 7.10 | `routes/api.php` |

### Phase 8: Refunds (P2)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 8.1 | Create `InitiateGatewayRefund` action | 3.8 | `app/Actions/PaymentGateway/InitiateGatewayRefund.php` |
| 8.2 | Create `ProcessGatewayRefund` action | 8.1, existing CreditNote pipeline | `app/Actions/PaymentGateway/ProcessGatewayRefund.php` |
| 8.3 | Create `GatewayRefundController` | 8.1 | `app/Http/Controllers/Api/GatewayRefundController.php` |
| 8.4 | Create `InitiateRefundRequest` Form Request | 8.3 | `app/Http/Requests/PaymentGateway/InitiateRefundRequest.php` |
| 8.5 | Add refund button to invoice payment detail UI | 8.3 | `frontend/src/components/invoices/` |
| 8.6 | Update Stripe webhook handler for `charge.refunded` | 8.2 | `app/Actions/PaymentGateway/Stripe/ProcessStripeWebhook.php` |
| 8.7 | Update GoCardless webhook handler for refund events | 8.2 | `app/Actions/PaymentGateway/GoCardless/ProcessGoCardlessWebhook.php` |

### Phase 9: Payment Settings Frontend (P1)

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 9.1 | Create `usePaymentGateways` hooks | 3.14 | `frontend/src/hooks/usePaymentGateways.ts` |
| 9.2 | Create Online Payments settings page | 9.1 | `frontend/src/app/(dashboard)/settings/online-payments/page.tsx` |
| 9.3 | Create gateway connection card components | 9.2 | `frontend/src/components/settings/` |
| 9.4 | Create fee mode configuration UI | 9.2 | `frontend/src/components/settings/` |
| 9.5 | Add payment status badges to invoice list | 2.5 | `frontend/src/components/invoices/PaymentStatusBadge.tsx` |
| 9.6 | Add navigation item for Online Payments settings | 9.2 | `frontend/src/lib/navigation.ts` |

### Phase 10: P2 Tests

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 10.1 | Feature tests: GoCardless webhook handler | 7.7 | `tests/Feature/Api/GoCardlessWebhookTest.php` |
| 10.2 | Feature tests: Mandate CRUD + cancellation | 7.10 | `tests/Feature/Api/DirectDebitMandateTest.php` |
| 10.3 | Feature tests: Refund flow (initiate + webhook confirmation + credit note) | 8.1, 8.2 | `tests/Feature/Actions/GatewayRefundTest.php` |
| 10.4 | Feature tests: Fee calculations (absorb vs pass-through, Stripe vs GoCardless) | 5.1 | `tests/Feature/Actions/FeeHandlingTest.php` |
| 10.5 | Feature tests: Race conditions (void during checkout, simultaneous online + manual payment) | 5.4 | `tests/Feature/Actions/PaymentRaceConditionTest.php` |
| 10.6 | Browser tests: Payment portal page load, Stripe redirect, success page | 4.4 | `tests/Browser/PaymentPortalTest.php` |
| 10.7 | Browser tests: Payment settings page (connect/disconnect/configure) | 9.2 | `tests/Browser/PaymentSettingsTest.php` |

### Phase 11: Polish & Feature Flag

| # | Task | Depends On | Files |
|---|------|-----------|-------|
| 11.1 | Add `online_payments` to `FeatureRegistry` | -- | `app/Services/FeatureRegistry.php` |
| 11.2 | Gate payment settings routes with `feature:online_payments` middleware | 11.1 | `routes/api.php` |
| 11.3 | Add feature flag to workspace API response | 11.1 | `app/Http/Resources/WorkspaceResource.php` |
| 11.4 | Update `RolesAndPermissionsSeeder` if new permissions needed | -- | `database/seeders/RolesAndPermissionsSeeder.php` |
| 11.5 | Run `vendor/bin/pint --dirty` for formatting | all | -- |
| 11.6 | Run `php artisan test` full regression | all | -- |
| 11.7 | TypeScript check: `cd frontend && npx tsc --noEmit` | all frontend | -- |

---

## Architecture Decisions

### Why gateway payments go through `RecordInvoicePayment` (not a separate pipeline)

The event-sourced invoice aggregate owns all payment state transitions. Creating a parallel pipeline would mean two sources of truth for `amount_paid` and `amount_due`. By routing through the existing action, every payment -- manual, gateway card, or direct debit -- produces the same `InvoicePaymentReceived` event and updates the same projector. The aggregate's `guardNoOverpayment()` naturally prevents double-processing from webhook retries.

### Why clearing accounts instead of direct bank account debits

Stripe and GoCardless do not deposit funds in real-time. Stripe batches payouts (typically T+2), and GoCardless BECS takes 3-5 business days. A clearing account (`Dr Gateway Clearing, Cr AR`) captures the "funds received by gateway but not yet in our bank" state. When the payout arrives in the bank feed, reconciliation completes the circuit (`Dr Bank, Cr Gateway Clearing`). This matches standard accounting practice and avoids showing bank account balances that are higher than reality.

### Why `recorded_by = 0` instead of a system user record

Creating a fake `User` record for system actions introduces a row that must be excluded from user listings, permission checks, and workspace membership queries. A sentinel value of `0` is simpler -- the projector stores it, and the UI displays "Online Payment" when it encounters `recorded_by === 0`. The `RecordInvoicePayment` action already accepts `int $recordedBy` with no foreign key constraint on the column, so this requires no schema change.

### Why webhook processing is queued (not synchronous)

Stripe and GoCardless expect webhook endpoints to return 200 within a few seconds. Processing involves database writes, aggregate replays, JE posting, and email sending -- any of which could take longer than the timeout. Queuing the work means: (1) the endpoint always returns fast, (2) transient failures trigger retries via the job queue (3 attempts with exponential backoff), and (3) failed jobs are captured by the existing failed-jobs monitoring.

### Why two JEs for surcharge mode (not one combined JE)

When fees are passed to the customer, the invoice amount and surcharge are economically distinct: the invoice amount is revenue from services, and the surcharge is revenue from fee pass-through. Combining them in one JE would obscure the surcharge revenue line. Two JEs keep the Chart of Accounts accurate: AR reduces by the invoice amount, and surcharge revenue increases by the surcharge amount. The clearing account total equals the amount charged to the customer.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stripe Connect onboarding blocked (identity verification) | Medium | Medium | Clear error messages, link to Stripe dashboard for manual resolution |
| Webhook delivery failures | Low | High | Idempotent processing, `gateway_event_id` unique index, 3 retry attempts |
| Race condition: void during checkout | Low | High | Auto-refund in `ProcessGatewayPayment` when invoice not payable |
| Race condition: simultaneous online + manual payment | Low | Medium | Aggregate `guardNoOverpayment()` rejects the second payment |
| GoCardless BECS mandate failures (invalid BSB) | Medium | Low | Customer retries on GoCardless hosted page with different bank details |
| Fee calculation precision errors | Low | Medium | All arithmetic in integer cents, configurable rates on `PaymentGateway.config` |
| Payment link token collision | Negligible | High | 64-char random string (2^384 entropy) + unique DB index |

---

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md with time estimates
2. Implement Phases 1-6 (P1: payment links, Stripe, portal, auto-reconciliation, tests)
3. Implement Phases 7-10 (P2: GoCardless, refunds, fees)
4. Run `/trilogy-dev-handover` (Gate 4: Code Quality)
