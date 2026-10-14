$ErrorActionPreference = 'Stop'
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ username = 'e2e_admin'; password = 'AdminPass123' }
Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/user/sign_in" -Method POST -Body $body -WebSession $s -UseBasicParsing | Out-Null

# 1. 保存前 /api/user/info 的标题
$u1 = (Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/user/info" -WebSession $s -UseBasicParsing).Content | ConvertFrom-Json
Write-Output "BEFORE user/info title=[$($u1.sys.title)]"

# 2. 改标题并保存
$r = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -WebSession $s -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
$j.settings.site_title = '往返标题验证'
$payload = $j.settings | ConvertTo-Json -Depth 10 -Compress
$r2 = Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -Method POST -Body $payload -ContentType 'application/json' -WebSession $s -UseBasicParsing
Write-Output "POST err=$(($r2.Content | ConvertFrom-Json).err)"

# 3. 保存后 /api/user/info 必须立即反映新标题（不重启进程）
$u2 = (Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/user/info" -WebSession $s -UseBasicParsing).Content | ConvertFrom-Json
Write-Output "AFTER  user/info title=[$($u2.sys.title)]"

# 4. 设置页 GET 也要一致
$j3 = (Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -WebSession $s -UseBasicParsing).Content | ConvertFrom-Json
Write-Output "AFTER  settings site_title=[$($j3.settings.site_title)] keys=$($j3.settings.PSObject.Properties.Name.Count)"

if ($u2.sys.title -eq '往返标题验证' -and $j3.settings.site_title -eq '往返标题验证') {
    Write-Output "RESULT: PASS 保存后立即生效"
} else {
    Write-Output "RESULT: FAIL"
}

# 5. 还原
$j3.settings.site_title = '奇异书屋'
$p3 = $j3.settings | ConvertTo-Json -Depth 10 -Compress
Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/admin/settings" -Method POST -Body $p3 -ContentType 'application/json' -WebSession $s -UseBasicParsing | Out-Null
$u4 = (Invoke-WebRequest -Uri "http://127.0.0.1:8090/api/user/info" -WebSession $s -UseBasicParsing).Content | ConvertFrom-Json
Write-Output "RESTORED title=[$($u4.sys.title)]"