# Windows PowerShell script to load environment variables and run the backend

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Push-Location $ProjectDir

# Load .env and .env.local files
if (Test-Path ".env") {
    Write-Host "[run_dev_backend] Loading .env"
    Get-Content .env | Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

if (Test-Path ".env.local") {
    Write-Host "[run_dev_backend] Loading .env.local (overrides .env)"
    Get-Content .env.local | Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Validate required Vertex AI settings
if ($env:GEMINI_USE_VERTEX_AI -eq "true") {
    if (-not $env:GEMINI_PROJECT_ID) {
        Write-Error "GEMINI_PROJECT_ID is required when GEMINI_USE_VERTEX_AI=true"
        exit 1
    }
    if (-not $env:GEMINI_LOCATION) {
        Write-Error "GEMINI_LOCATION is required when GEMINI_USE_VERTEX_AI=true"
        exit 1
    }
    if (-not $env:GOOGLE_APPLICATION_CREDENTIALS) {
        Write-Error "GOOGLE_APPLICATION_CREDENTIALS is required when GEMINI_USE_VERTEX_AI=true"
        exit 1
    }
    
    # Verify the credentials file exists
    if (-not (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) {
        Write-Error "GOOGLE_APPLICATION_CREDENTIALS file not found: $($env:GOOGLE_APPLICATION_CREDENTIALS)"
        exit 1
    }
    
    Write-Host "[run_dev_backend] Vertex AI settings loaded:"
    Write-Host "  - Project ID: $($env:GEMINI_PROJECT_ID)"
    Write-Host "  - Location: $($env:GEMINI_LOCATION)"
    Write-Host "  - Credentials: $($env:GOOGLE_APPLICATION_CREDENTIALS)"
}

# Run Maven
Write-Host "[run_dev_backend] Starting backend with Maven..."
mvn spring-boot:run

Pop-Location
