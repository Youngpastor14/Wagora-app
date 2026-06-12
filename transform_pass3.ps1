$root = "c:\Users\SHAH SAAD\Downloads\wagora_product_design"
$files = Get-ChildItem -Path $root -Recurse -Filter "code.html"

foreach ($file in $files) {
    $c = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $orig = $c

    # Arbitrary value classes with hex
    $c = $c -replace 'bg-\[#F0EDE8\]', 'bg-[var(--surface-elevated)]'
    $c = $c -replace 'text-\[#0D0F0C\]', 'text-[var(--text-primary)]'
    $c = $c -replace 'text-\[#8FB200\]', 'text-[var(--accent-secondary)]'

    # Inline style hex values
    $c = $c -replace 'background-color:\s*#020617;', 'background-color: var(--background-primary);'
    $c = $c -replace 'background:\s*#2dd4bf;', 'background: var(--accent-primary);'
    $c = $c -replace 'color:\s*#f1f5f9;', 'color: var(--text-primary);'
    $c = $c -replace 'color:\s*#ffffff;', 'color: var(--surface-card);'

    # rounded-[12px] → var(--radius-lg)
    $c = $c -replace 'rounded-\[12px\]', 'rounded-[var(--radius-lg)]'

    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "FIXED: $($file.FullName)"
    }
}

# Final audit
Write-Host "`n=== FINAL AUDIT ==="
$hexRemaining = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern '#[0-9a-fA-F]{6}\b' -AllMatches
$tokensCount = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'tokens\.css' | Measure-Object | Select-Object -ExpandProperty Count
$themeCount = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'data-theme=' | Measure-Object | Select-Object -ExpandProperty Count
$toggleCount = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'wagora-theme-toggle' | Measure-Object | Select-Object -ExpandProperty Count
$fontClash = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'Clash Display' | Measure-Object | Select-Object -ExpandProperty Count
$fontSatoshi = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'Satoshi' | Measure-Object | Select-Object -ExpandProperty Count
$fontGeist = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'Geist Mono' | Measure-Object | Select-Object -ExpandProperty Count

Write-Host "tokens.css linked: $tokensCount / 80"
Write-Host "data-theme present: $themeCount / 80"
Write-Host "Theme toggle present: $toggleCount / 80"
Write-Host "Clash Display refs: $fontClash files"
Write-Host "Satoshi refs: $fontSatoshi files"
Write-Host "Geist Mono refs: $fontGeist files"
Write-Host "Remaining hex values: $($hexRemaining | Measure-Object | Select-Object -ExpandProperty Count)"

if ($hexRemaining.Count -gt 0) {
    Write-Host "`nRemaining hex locations:"
    foreach ($match in $hexRemaining) {
        $trimmed = $match.Line.Trim()
        if ($trimmed.Length -gt 120) { $trimmed = $trimmed.Substring(0, 120) + "..." }
        Write-Host "  $($match.Filename):$($match.LineNumber) -> $trimmed"
    }
}

# Check for rgb/rgba that are NOT our tokens
$rgbaRemaining = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'rgba?\([^)]+\)' -AllMatches | Where-Object { $_.Line -notmatch 'var\(--' -and $_.Line -notmatch 'rgba\(0,\s*0,\s*0' -and $_.Line -notmatch 'rgba\(255,\s*255,\s*255' -and $_.Line -notmatch 'rgba\(229,\s*62,\s*62' -and $_.Line -notmatch 'rgba\(0,\s*200,\s*150' -and $_.Line -notmatch 'color-mix' }
Write-Host "`nNon-token rgba values: $($rgbaRemaining | Measure-Object | Select-Object -ExpandProperty Count)"
