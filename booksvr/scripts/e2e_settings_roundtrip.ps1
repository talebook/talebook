$ErrorActionPreference = 'Stop'
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ username = 'e2e_admin'; password = 'AdminPass123' }
$r = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/user/sign_in" -Method POST -Body $body -WebSession $s -UseBasicParsing
Write-Output "login: $($r.Content)"

$r = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -WebSession $s -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
$n1 = $j.settings.PSObject.Properties.Name.Count
Write-Output "GET1 keys=$n1"
Write-Output "GET1 site_title=[$($j.settings.site_title)]"
Write-Output "GET1 MAX_UPLOAD_SIZE=[$($j.settings.MAX_UPLOAD_SIZE)]"
Write-Output "GET1 ALLOW_GUEST_READ=[$($j.settings.ALLOW_GUEST_READ)]"

# 模拟前端：改一项后整体回存
$j.settings.site_title = 'E2E-往返验证'
$payload = $j.settings | ConvertTo-Json -Depth 10 -Compress
$r2 = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -Method POST -Body $payload -ContentType 'application/json' -WebSession $s -UseBasicParsing
$j2 = $r2.Content | ConvertFrom-Json
Write-Output "POST err=$($j2.err)"

$r3 = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -WebSession $s -UseBasicParsing
$j3 = $r3.Content | ConvertFrom-Json
$n3 = $j3.settings.PSObject.Properties.Name.Count
Write-Output "GET2 keys=$n3"
Write-Output "GET2 site_title=[$($j3.settings.site_title)]"
Write-Output "GET2 MAX_UPLOAD_SIZE=[$($j3.settings.MAX_UPLOAD_SIZE)]"
Write-Output "GET2 ALLOW_GUEST_READ=[$($j3.settings.ALLOW_GUEST_READ)]"
Write-Output "GET2 OPDS_ENABLED=[$($j3.settings.OPDS_ENABLED)]"

if ($j3.settings.site_title -eq 'E2E-往返验证' -and $n3 -ge $n1) {
    Write-Output "RESULT: PASS 往返无损"
} else {
    Write-Output "RESULT: FAIL"
}