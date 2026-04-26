---
name: laravel-boost
description: Laravel ecosystem MCP server providing database access, Artisan commands, error logs, Tinker execution, and semantic documentation search
icon: carbon:application-web
---

# Laravel Boost

Laravel Boost is a powerful MCP server that provides deep integration with Laravel applications. It offers database schema access, Artisan command execution, error logs, Tinker console, and semantic documentation search for Laravel and its ecosystem packages.

## Overview

Laravel Boost enhances Claude's ability to work with Laravel applications by providing direct access to application internals, documentation, and development tools. It bridges the gap between AI assistance and Laravel development workflows.

## Key Tools

### Application Information

#### `application-info`
Get comprehensive application details including:
- PHP version
- Laravel version
- Database engine
- All installed packages with versions
- Eloquent models in the application

**Use when**: You need to understand the application structure or write version-specific code.

```
Use application-info to see installed packages and their versions
```

### Documentation Search

#### `search-docs`
Search for up-to-date, version-specific documentation for installed packages. Supports Laravel, Inertia, Livewire, Filament, Nova, Pest, Tailwind, and more.

**Parameters**:
- `queries` (required): Array of search queries
- `packages` (optional): Filter by specific package names
- `token_limit` (optional): Maximum tokens to return (default: 3000, max: 1,000,000)

**Use when**: You need to look up how to implement something in Laravel or related packages.

```
Search docs for: ['rate limiting', 'routing rate limiting']
```

### Database Tools

#### `database-schema`
Read complete database schema including tables, columns, data types, indexes, and foreign keys.

**Parameters**:
- `database` (optional): Database connection name
- `filter` (optional): Filter tables by name pattern

**Use when**: You need to understand the database structure or write database-specific code.

#### `database-query`
Execute read-only SQL queries against the database.

**Parameters**:
- `query` (required): SQL SELECT query
- `database` (optional): Database connection name

**Use when**: You need to query data directly without using Eloquent.

#### `database-connections`
List all configured database connection names.

### Artisan Commands

#### `list-artisan-commands`
Get all available Artisan commands registered in the application.

**Use when**: You need to see what Artisan commands are available or verify command parameters.

### Routes

#### `list-routes`
List all application routes with filtering options.

**Parameters**:
- `method`: Filter by HTTP method (GET, POST, etc.)
- `name`: Filter by route name
- `action`: Filter by controller action
- `path`: Filter by path pattern
- `domain`: Filter by domain
- `except_vendor`: Exclude vendor routes
- `only_vendor`: Show only vendor routes

**Use when**: You need to understand the application's routing structure.

#### `get-absolute-url`
Generate absolute URLs with correct scheme, domain, and port.

**Parameters**:
- `path`: Relative URL path (e.g., "/dashboard")
- `route`: Named route (e.g., "home")

**Use when**: Sharing URLs with the user.

### Debugging & Logs

#### `tinker`
Execute PHP code in the Laravel application context (like `php artisan tinker`).

**Parameters**:
- `code` (required): PHP code to execute (without `<?php` tags)
- `timeout`: Maximum execution time in seconds (default: 180)

**Use when**: Debugging issues, testing code snippets, or querying Eloquent models.

```
Use tinker to check if User::count() returns expected results
```

#### `last-error`
Get details of the last backend error/exception.

**Use when**: Investigating recent errors or exceptions.

#### `read-log-entries`
Read the last N entries from the application log.

**Parameters**:
- `entries` (required): Number of log entries to return

**Use when**: Investigating application logs for issues.

#### `browser-logs`
Read the last N entries from browser console logs.

**Parameters**:
- `entries` (required): Number of log entries to return

**Use when**: Debugging frontend JavaScript issues.

### Configuration

#### `list-available-config-keys`
List all Laravel configuration keys in dot notation.

**Use when**: You need to see what configuration options are available.

#### `get-config`
Get the value of a specific configuration variable.

**Parameters**:
- `key` (required): Config key in dot notation (e.g., "app.name")

**Use when**: You need to check a specific configuration value.

#### `list-available-env-vars`
List environment variable names from .env files.

**Parameters**:
- `filename` (optional): Name of .env file (default: .env)

**Use when**: You need to see what environment variables are configured.

## Best Practices

1. **Always use `search-docs` first** when implementing Laravel features to ensure version-specific approaches
2. **Use `application-info`** at the start of new conversations to understand package versions
3. **Use `tinker` for debugging** instead of writing test scripts
4. **Use `database-query`** for quick data inspection without creating models
5. **Check `last-error`** when investigating issues reported by the user

## Common Workflows

### Investigating a Bug
1. Check `last-error` for exception details
2. Use `read-log-entries` to see recent logs
3. Use `tinker` to test hypotheses
4. Use `browser-logs` for frontend issues

### Implementing a New Feature
1. Use `application-info` to see installed packages
2. Use `search-docs` to find relevant documentation
3. Use `database-schema` to understand data structure
4. Use `list-routes` to see existing routes

### Understanding the Codebase
1. Use `application-info` for high-level overview
2. Use `database-schema` to see data models
3. Use `list-routes` to understand endpoints
4. Use `list-artisan-commands` to see available commands
