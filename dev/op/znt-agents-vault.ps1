#Requires -Version 5.1
<#
.SYNOPSIS
  Constants for the ZNT Agents 1Password vault.

.DESCRIPTION
  Human Google sign-in for admin.google.com and console.cloud.google.com lives here
  (item IDs required because titles contain parentheses).

  ZNTEQR product E2E automation still uses ZNTEQR Agents item google-login.
#>

$script:ZntAgentsVaultId = 'mrviyowmjwrxv7syobdlhnmawa'
$script:ZntAgentsVaultName = 'ZNT Agents'

# op:// paths must use item IDs when titles contain ( ) characters.
$script:GoogleBusinessItemId = 'ukvy6bzwb2ikq5cfeambgcq5u4'   # Google (Business)
$script:GoogleTestUserItemId = 'hlp7llqbvfm7mmic2z2e43ftem'   # Google (Test User)

function Get-ZntAgentsOpUri {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ItemId,

        [Parameter(Mandatory = $true)]
        [string]$Field
    )

    return "op://$($script:ZntAgentsVaultId)/$ItemId/$Field"
}

function Read-ZntAgentsOpField {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ItemId,

        [Parameter(Mandatory = $true)]
        [string]$Field
    )

    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    }
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        throw 'OP_SERVICE_ACCOUNT_TOKEN is required.'
    }

    return (op read (Get-ZntAgentsOpUri -ItemId $ItemId -Field $Field)).Trim()
}
