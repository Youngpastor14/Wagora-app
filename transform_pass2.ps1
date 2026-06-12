$root = "c:\Users\SHAH SAAD\Downloads\wagora_product_design"
$files = Get-ChildItem -Path $root -Recurse -Filter "code.html"
$fixed = 0

# Floating toggle for pages without header icons
$floatingToggle = @'
<div id="wagora-theme-toggle-float" style="position:fixed;bottom:80px;left:16px;z-index:9998"><button id="wagora-theme-toggle" style="background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--text-secondary);transition:all 0.2s;box-shadow:var(--shadow-card)" onclick="(function(){var h=document.documentElement,c=h.getAttribute('data-theme'),n=c==='dark'?'light':'dark';h.setAttribute('data-theme',n);localStorage.setItem('wagora-theme',n);document.getElementById('theme-icon').textContent=n==='dark'?'light_mode':'dark_mode'})()"><span id="theme-icon" class="material-symbols-outlined" style="font-size:18px">dark_mode</span></button></div>
'@

foreach ($file in $files) {
    $c = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $orig = $c

    # --- Fix remaining hex colors ---
    # Greens → accent-primary
    $c = $c -replace '#14B8A6', 'var(--accent-primary)'
    $c = $c -replace '#14b8a6', 'var(--accent-primary)'
    $c = $c -replace '#10B981', 'var(--success)'
    $c = $c -replace '#10b981', 'var(--success)'
    $c = $c -replace '#0d9488', 'var(--accent-primary-hover)'
    $c = $c -replace '#064e3b', 'var(--accent-primary)'

    # Yellows/Limes → accent-secondary
    $c = $c -replace '#DFFF00', 'var(--accent-secondary)'
    $c = $c -replace '#D9F99D', 'var(--accent-secondary)'

    # Blues → accent-primary (strategist-blue was remapped)
    $c = $c -replace '#2563EB', 'var(--accent-primary)'

    # Neutrals/surfaces
    $c = $c -replace '#fcf8fa', 'var(--background-primary)'
    $c = $c -replace '#F8FAFC', 'var(--background-primary)'
    $c = $c -replace '#f3f0f2', 'var(--background-primary)'
    $c = $c -replace '#1b1b1d', 'var(--text-primary)'
    $c = $c -replace '#0F172A', 'var(--text-primary)'
    $c = $c -replace '#1E293B', 'var(--text-primary)'
    $c = $c -replace '#334155', 'var(--text-secondary)'
    $c = $c -replace '#18181b', 'var(--text-primary)'
    $c = $c -replace '#E2E8F0', 'var(--border-default)'
    $c = $c -replace '#CBD5E1', 'var(--border-default)'
    $c = $c -replace '#F59E0B', 'var(--status-paused)'
    $c = $c -replace '#00C896', 'var(--accent-primary)'

    # Dark mode specific surfaces
    $c = $c -replace '#151714', 'var(--background-secondary)'
    $c = $c -replace '#212420', 'var(--surface-elevated)'
    $c = $c -replace '#1A1D18', 'var(--surface-card)'
    $c = $c -replace '#090B08', 'var(--background-primary)'
    $c = $c -replace '#09090b', 'var(--background-primary)'
    $c = $c -replace '#fafafa', 'var(--background-primary)'
    $c = $c -replace '#27272a', 'var(--border-default)'

    # Reds
    $c = $c -replace '#FEF2F2', 'rgba(229, 62, 62, 0.08)'
    $c = $c -replace '#EF4444', 'var(--destructive)'

    # text-white that should stay (on accent/dark buttons)
    # Keep as is - it's for contrast

    # --- Add floating toggle to pages without one ---
    if ($c -notmatch 'wagora-theme-toggle') {
        $c = $c -replace '</body>', "$floatingToggle`n</body>"
        $fixed++
    }

    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "CLEANED: $($file.FullName)"
    }
}

Write-Host "`nSecond pass complete. $fixed files got floating toggle added."

# Final counts
$hexRemaining = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern '#[0-9a-fA-F]{6}\b' -AllMatches
$toggleCount = Get-ChildItem -Path $root -Recurse -Filter "code.html" | Select-String -Pattern 'wagora-theme-toggle' | Measure-Object | Select-Object -ExpandProperty Count

Write-Host "`n=== FINAL AUDIT ==="
Write-Host "Theme toggles present: $toggleCount / 80"
Write-Host "Files with remaining hex: $($hexRemaining | Select-Object -ExpandProperty Filename -Unique | Measure-Object | Select-Object -ExpandProperty Count)"
Write-Host "Total remaining hex values: $($hexRemaining | Measure-Object | Select-Object -ExpandProperty Count)"
