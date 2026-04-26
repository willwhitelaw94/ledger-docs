---
name: herd
description: Local Laravel development environment manager for services like MySQL, Redis, PHP versions, and site configuration
icon: simple-icons:laravel
---

# Laravel Herd MCP Server

The Laravel Herd MCP server provides integration with Laravel Herd, the local development environment for Laravel applications. It manages services (MySQL, Redis, etc.), PHP versions, and site configurations.

## Overview

Laravel Herd automatically serves your Laravel applications at `https://[project-dir-name].test`. This MCP server provides tools to manage Herd services, PHP versions, and site settings without manual configuration.

**Important**: Sites are always available through Herd automatically. You **never** need to run commands to make a site accessible.

## Service Management

### `find_available_services`
Get a list of available services with their status and configuration.

**Returns**:
- Service type (MySQL, Redis, PostgreSQL, etc.)
- Installation status
- Running status
- Environment variables for connection
- Installed versions

**Use when**: You need connection details for databases or want to see what services are available.

```
Check MySQL connection details
```

### `install_service`
Install a local service on your system.

**Parameters**:
- `type` (required): Service type (mysql, redis, meilisearch, minio, reverb, postgresql, typesense, mongodb, mariadb)
- `port` (required): Port number to run the service on

**Use when**: You need to add a new service like Redis or PostgreSQL.

### `start_or_stop_service`
Start or stop a Herd-provided service.

**Parameters**:
- `shouldStart` (required): true to start, false to stop
- `type` (required): Service type
- `port` (required): Service port
- `version` (required): Service version (e.g., '8.0.43')

**Use when**: You need to start/stop a specific service.

## PHP Version Management

### `get_all_php_versions`
Get a list of all PHP versions and their status (installed, in-use, etc.).

**Use when**: You need to see what PHP versions are available or which one is active.

### `install_php_version`
Install or update a specific PHP version.

**Parameters**:
- `version` (required): PHP version to install (e.g., "8.3", "8.4")

**Use when**: You need to install a new PHP version.

## Site Management

### `get_all_sites`
Get all sites managed by Herd with their details.

**Returns**:
- Site names
- URLs
- Paths
- Secure status (HTTPS)
- Environment variables
- PHP version
- Isolation status

**Use when**: You need to see all Herd-managed sites and their configuration.

### `get_site_information`
Get detailed information about the current project site.

**Returns**:
- Site URL
- Path
- Secure status (HTTPS)
- Environment variables
- PHP version used
- Isolation status

**Use when**: You need to share the site URL with the user or check site configuration.

**Important**: Use Laravel Boost's `get-absolute-url` tool to generate URLs for the user.

### `secure_or_unsecure_site`
Enable or disable HTTPS for the current site.

**Parameters**:
- `shouldSecure` (required): true to enable HTTPS, false to disable

**Use when**: You need to switch between HTTP and HTTPS.

### `isolate_or_unisolate_site`
Set a specific PHP version for the site or use the global version.

**Parameters**:
- `shouldIsolate` (required): true to isolate, false to use global version
- `phpVersion`: PHP version to use (required when isolating, e.g., "8.1", "8.2")

**Use when**: The site needs a different PHP version than the global default.

## Debug Session Management

### `start_debug_session`
Start a debug session to capture queries, logs, dumps, and HTTP requests.

**Use when**: You need to debug database queries or outgoing HTTP requests.

### `stop_debug_session`
Stop the active debug session and fetch captured data.

**Use when**: You're done debugging and want to see the captured data.

## Common Workflows

### Getting Database Connection Details
1. Use `find_available_services` to see MySQL/PostgreSQL status
2. Extract connection details from environment variables
3. Use Laravel Boost's `database-schema` to verify connection

### Switching PHP Versions
1. Use `get_all_php_versions` to see available versions
2. Use `install_php_version` if needed
3. Use `isolate_or_unisolate_site` to set version for current site

### Setting Up a New Service
1. Use `find_available_services` to check if service is installed
2. Use `install_service` if not installed
3. Use `start_or_stop_service` to start the service
4. Update `.env` file with service connection details

### Sharing Site URLs with Users
1. Use `get_site_information` to get site details
2. Use Laravel Boost's `get-absolute-url` to generate proper URLs
3. Share the URL with the user

## Best Practices

1. **Never run commands to make sites available** - Herd does this automatically
2. **Use `get-absolute-url` from Laravel Boost** to generate URLs for users
3. **Check service status** with `find_available_services` before installing
4. **Use debug sessions** for troubleshooting database queries and HTTP requests
5. **Isolate PHP versions** per site when needed instead of changing global version

## Environment Variables

When you use `find_available_services` or `get_site_information`, you'll get environment variable names like:
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`

Use these to configure your application's `.env` file.

## Service Types

Available services in Herd:
- **mysql**: MySQL database
- **redis**: Redis cache/queue
- **postgresql**: PostgreSQL database
- **meilisearch**: Search engine
- **minio**: Object storage
- **reverb**: Laravel Reverb WebSocket server
- **typesense**: Search engine
- **mongodb**: MongoDB database
- **mariadb**: MariaDB database

## Important Notes

1. **Automatic Site Serving**: All Laravel projects in Herd are automatically served at `https://[kebab-case-project-dir].test`
2. **No Manual Configuration**: You don't need to configure nginx, Apache, or vhosts
3. **Environment Variables**: Herd provides all necessary connection details through the MCP server
4. **HTTPS by Default**: Sites can be secured with a single command
5. **PHP Isolation**: Each site can use a different PHP version if needed
