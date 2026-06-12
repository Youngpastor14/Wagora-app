$root = "c:\Users\SHAH SAAD\Downloads\wagora_product_design"
$files = Get-ChildItem -Path $root -Recurse -Filter "code.html"
$totalMod = 0
$totalReplace = 0

# Universal Tailwind config with CSS variable references
$newConfig = @'
tailwind.config = {
      theme: {
        extend: {
          colors: {
            "background": "var(--background-primary)",
            "background-primary": "var(--background-primary)",
            "background-secondary": "var(--background-secondary)",
            "surface": "var(--background-primary)",
            "surface-card": "var(--surface-card)",
            "surface-elevated": "var(--surface-elevated)",
            "surface-neutral": "var(--background-primary)",
            "surface-container": "var(--surface-elevated)",
            "surface-container-low": "var(--background-secondary)",
            "surface-container-lowest": "var(--surface-card)",
            "surface-container-high": "var(--surface-elevated)",
            "surface-container-highest": "var(--surface-elevated)",
            "surface-bright": "var(--surface-card)",
            "surface-dim": "var(--background-secondary)",
            "surface-variant": "var(--surface-elevated)",
            "surface-tint": "var(--text-secondary)",
            "on-surface": "var(--text-primary)",
            "on-surface-variant": "var(--text-secondary)",
            "on-background": "var(--text-primary)",
            "on-primary": "var(--surface-card)",
            "on-secondary": "var(--surface-card)",
            "on-tertiary": "var(--surface-card)",
            "on-error": "var(--surface-card)",
            "on-primary-container": "var(--text-muted)",
            "on-secondary-container": "var(--surface-card)",
            "on-tertiary-container": "var(--text-muted)",
            "on-error-container": "var(--destructive)",
            "on-primary-fixed": "var(--text-primary)",
            "on-primary-fixed-variant": "var(--text-secondary)",
            "on-secondary-fixed": "var(--text-primary)",
            "on-secondary-fixed-variant": "var(--accent-primary)",
            "on-tertiary-fixed": "var(--text-primary)",
            "on-tertiary-fixed-variant": "var(--text-secondary)",
            "inverse-surface": "var(--text-primary)",
            "inverse-on-surface": "var(--background-primary)",
            "inverse-primary": "var(--border-default)",
            "accent-primary": "var(--accent-primary)",
            "accent-secondary": "var(--accent-secondary)",
            "operator-dark": "var(--text-primary)",
            "ally-slate": "var(--text-secondary)",
            "strategist-blue": "var(--accent-primary)",
            "signal-green": "var(--success)",
            "caution-amber": "var(--status-paused)",
            "critical-red": "var(--destructive)",
            "brand-teal": "var(--accent-primary)",
            "success": "var(--success)",
            "destructive": "var(--destructive)",
            "border-subtle": "var(--border-subtle)",
            "border-default": "var(--border-default)",
            "outline": "var(--text-muted)",
            "outline-variant": "var(--border-default)",
            "primary": "var(--text-primary)",
            "primary-container": "var(--text-primary)",
            "primary-fixed": "var(--border-default)",
            "primary-fixed-dim": "var(--border-default)",
            "secondary": "var(--accent-primary)",
            "secondary-container": "var(--accent-primary)",
            "secondary-fixed": "var(--surface-elevated)",
            "secondary-fixed-dim": "var(--border-default)",
            "tertiary": "var(--text-primary)",
            "tertiary-container": "var(--text-primary)",
            "tertiary-fixed": "var(--surface-elevated)",
            "tertiary-fixed-dim": "var(--border-default)",
            "error": "var(--destructive)",
            "error-container": "rgba(229, 62, 62, 0.15)",
          },
          borderRadius: {
            "DEFAULT": "var(--radius-xs)",
            "sm": "var(--radius-sm)",
            "md": "var(--radius-md)",
            "lg": "var(--radius-lg)",
            "xl": "var(--radius-lg)",
            "full": "var(--radius-pill)",
          },
          spacing: {
            "unit": "8px",
            "stack-sm": "4px",
            "stack-md": "12px",
            "stack-lg": "24px",
            "padding-card": "20px",
            "gutter-grid": "24px",
            "margin-page": "32px",
          },
          fontFamily: {
            "display-xl": ["'Clash Display'", "sans-serif"],
            "headline-lg": ["'Clash Display'", "sans-serif"],
            "headline-md": ["'Clash Display'", "sans-serif"],
            "label-caps": ["'Satoshi'", "sans-serif"],
            "body-lg": ["'Satoshi'", "sans-serif"],
            "body-md": ["'Satoshi'", "sans-serif"],
            "mono-data": ["'Geist Mono'", "monospace"],
          },
          fontSize: {
            "label-caps": ["12px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "600"}],
            "mono-data": ["14px", {"lineHeight": "1", "letterSpacing": "-0.01em", "fontWeight": "500"}],
            "headline-md": ["20px", {"lineHeight": "1.3", "fontWeight": "600"}],
            "headline-lg": ["28px", {"lineHeight": "1.2", "fontWeight": "600"}],
            "display-xl": ["40px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700"}],
            "body-lg": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
            "body-md": ["14px", {"lineHeight": "1.5", "fontWeight": "400"}],
          },
        },
      },
    }
'@

# FOUC prevention script
$foucScript = @'
<script>(function(){var t=localStorage.getItem('wagora-theme');document.documentElement.setAttribute('data-theme',t||'light');})()</script>
'@

# Theme toggle button HTML
$toggleBtn = @'
<button id="wagora-theme-toggle" style="background:var(--surface-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:4px 8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--text-secondary);transition:all 0.2s" onclick="(function(){var h=document.documentElement,c=h.getAttribute('data-theme'),n=c==='dark'?'light':'dark';h.setAttribute('data-theme',n);localStorage.setItem('wagora-theme',n);document.getElementById('theme-icon').textContent=n==='dark'?'light_mode':'dark_mode'})()"><span id="theme-icon" class="material-symbols-outlined" style="font-size:18px">dark_mode</span></button>
'@

# Theme init script (bottom of body)
$themeInitScript = @'
<script>(function(){var t=localStorage.getItem('wagora-theme')||'light';document.documentElement.setAttribute('data-theme',t);var i=document.getElementById('theme-icon');if(i)i.textContent=t==='dark'?'light_mode':'dark_mode';})()</script>
'@

foreach ($file in $files) {
    $c = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $orig = $c
    $rc = 0

    # 1. Add data-theme to html tag
    if ($c -match '<html[^>]*class="dark"') {
        $c = $c -replace '<html([^>]*)class="dark"([^>]*)>', '<html$1data-theme="dark"$2>'
        $rc++
    } elseif ($c -match '<html[^>]*class="light"') {
        $c = $c -replace '<html([^>]*)class="light"([^>]*)>', '<html$1data-theme="light"$2>'
        $rc++
    } elseif ($c -notmatch 'data-theme=') {
        $c = $c -replace '<html', '<html data-theme="light"'
        $rc++
    }

    # 2. Inject tokens.css link after charset meta
    if ($c -notmatch 'tokens\.css') {
        $c = $c -replace '(<meta\s+charset="utf-8"\s*/?>\s*)', "`$1`n<link rel=`"stylesheet`" href=`"../styles/tokens.css`"/>`n"
        $rc++
    }

    # 3. Inject FOUC prevention script after viewport meta
    if ($c -notmatch 'wagora-theme') {
        $c = $c -replace '(<meta\s+content="width=device-width[^"]*"\s+name="viewport"\s*/?>\s*)', "`$1`n$foucScript`n"
        $rc++
    }

    # 4. Replace Tailwind config block
    $c = $c -replace '(?s)tailwind\.config\s*=\s*\{.*?\n\s*\}\s*\n?\s*</script>', "$newConfig`n    </script>"
    $rc++

    # 5. Replace old font links (keep Material Symbols)
    # Remove Inter/Manrope/Geist font links
    $c = $c -replace '<link\s+href="https://fonts\.googleapis\.com/css2\?family=(Inter|Manrope|Geist)[^"]*"\s+rel="stylesheet"\s*/>', ''
    $c = $c -replace '<link\s+href="https://fonts\.googleapis\.com/css2\?family=Inter[^"]*family=Manrope[^"]*"\s+rel="stylesheet"\s*/>', ''
    $c = $c -replace '<link\s+href="https://fonts\.googleapis\.com/css2\?family=Manrope[^"]*family=Inter[^"]*"\s+rel="stylesheet"\s*/>', ''
    $rc++

    # 6. Replace inline style hex colors
    # Style block colors
    $c = $c -replace 'background-color:\s*#F5F2EE[;\s]', 'background-color: var(--background-primary);'
    $c = $c -replace 'background-color:\s*#0D0F0C[;\s]', 'background-color: var(--background-primary);'
    $c = $c -replace 'color:\s*#F0EDE8[;\s]', 'color: var(--text-primary);'
    $c = $c -replace 'color:\s*#0D0F0C[;\s]', 'color: var(--text-primary);'
    $c = $c -replace 'background-color:\s*#FFFFFF[;\s]', 'background-color: var(--surface-card);'
    $c = $c -replace 'background-color:\s*#ffffff[;\s]', 'background-color: var(--surface-card);'
    $rc++

    # 7. Replace @import url font references in style blocks
    $c = $c -replace "@import url\('https://fonts\.cdnfonts\.com/css/geist'\);", ''
    $c = $c -replace "@import url\('https://fonts\.cdnfonts\.com/css/clash-display'\);", ''
    $c = $c -replace "@import url\('https://fonts\.cdnfonts\.com/css/satoshi'\);", ''
    $rc++

    # 8. Replace Tailwind built-in color utilities
    # Background whites
    $c = $c -replace '\bbg-white/90\b', 'bg-[color-mix(in_srgb,var(--surface-card)_90%,transparent)]'
    $c = $c -replace '\bbg-white/80\b', 'bg-[color-mix(in_srgb,var(--surface-card)_80%,transparent)]'
    $c = $c -replace '\bbg-white/20\b', 'bg-[color-mix(in_srgb,var(--surface-card)_20%,transparent)]'
    $c = $c -replace '(?<!\w)bg-white(?!/)\b', 'bg-[var(--surface-card)]'

    # Slate backgrounds
    $c = $c -replace '\bbg-slate-50\b', 'bg-[var(--background-secondary)]'
    $c = $c -replace '\bbg-slate-100\b', 'bg-[var(--surface-elevated)]'
    $c = $c -replace '\bbg-slate-200\b', 'bg-[var(--border-default)]'
    $c = $c -replace '\bbg-slate-400\b', 'bg-[var(--text-muted)]'
    $c = $c -replace '\bbg-slate-600\b', 'bg-[var(--text-secondary)]'

    # Slate text
    $c = $c -replace '\btext-slate-900\b', 'text-[var(--text-primary)]'
    $c = $c -replace '\btext-slate-800\b', 'text-[var(--text-primary)]'
    $c = $c -replace '\btext-slate-700\b', 'text-[var(--text-primary)]'
    $c = $c -replace '\btext-slate-500\b', 'text-[var(--text-secondary)]'
    $c = $c -replace '\btext-slate-400\b', 'text-[var(--text-muted)]'

    # Slate borders
    $c = $c -replace '\bborder-slate-200\b', 'border-[var(--border-default)]'
    $c = $c -replace '\bborder-slate-100\b', 'border-[var(--border-subtle)]'
    $c = $c -replace '\bborder-slate-300\b', 'border-[var(--border-default)]'

    # Zinc (dark mode surfaces)
    $c = $c -replace '\bbg-zinc-950\b', 'bg-[var(--background-primary)]'
    $c = $c -replace '\bbg-zinc-900\b', 'bg-[var(--background-secondary)]'
    $c = $c -replace '\bbg-zinc-800\b', 'bg-[var(--surface-elevated)]'
    $c = $c -replace '\bbg-zinc-700\b', 'bg-[var(--surface-elevated)]'
    $c = $c -replace '\bbg-zinc-600\b', 'bg-[var(--text-muted)]'
    $c = $c -replace '\btext-zinc-100\b', 'text-[var(--text-primary)]'
    $c = $c -replace '\btext-zinc-200\b', 'text-[var(--text-primary)]'
    $c = $c -replace '\btext-zinc-300\b', 'text-[var(--text-secondary)]'
    $c = $c -replace '\btext-zinc-400\b', 'text-[var(--text-muted)]'
    $c = $c -replace '\btext-zinc-500\b', 'text-[var(--text-muted)]'
    $c = $c -replace '\bborder-zinc-800\b', 'border-[var(--border-default)]'
    $c = $c -replace '\bborder-zinc-700\b', 'border-[var(--border-default)]'
    $c = $c -replace '\bborder-zinc-600\b', 'border-[var(--border-default)]'

    # Green backgrounds
    $c = $c -replace '\bbg-green-50\b', 'bg-[rgba(0,200,150,0.1)]'
    $c = $c -replace '\bbg-green-100\b', 'bg-[rgba(0,200,150,0.15)]'

    # Hover states
    $c = $c -replace '\bhover:bg-slate-50\b', 'hover:bg-[var(--surface-elevated)]'
    $c = $c -replace '\bhover:bg-slate-100\b', 'hover:bg-[var(--surface-elevated)]'
    $c = $c -replace '\bhover:bg-zinc-900\b', 'hover:bg-[var(--surface-elevated)]'
    $c = $c -replace '\bhover:bg-zinc-800\b', 'hover:bg-[var(--surface-elevated)]'
    $c = $c -replace '\bhover:text-zinc-100\b', 'hover:text-[var(--text-primary)]'
    $c = $c -replace '\bhover:text-zinc-300\b', 'hover:text-[var(--text-primary)]'
    $c = $c -replace '\bhover:bg-black\b', 'hover:bg-[var(--accent-primary-hover)]'

    # Remove dark: prefix utilities (handled by data-theme now)
    $c = $c -replace '\bdark:bg-slate-950\b\s*', ''
    $c = $c -replace '\bdark:bg-slate-900\b\s*', ''
    $c = $c -replace '\bdark:bg-zinc-900\b\s*', ''
    $c = $c -replace '\bdark:text-white\b\s*', ''
    $c = $c -replace '\bdark:text-slate-400\b\s*', ''
    $c = $c -replace '\bdark:border-slate-800\b\s*', ''
    $c = $c -replace '\bdark:hover:bg-slate-900\b\s*', ''
    $c = $c -replace '\bdark:hover:bg-zinc-900\b\s*', ''
    $rc++

    # 9. Replace arbitrary hex value classes
    $c = $c -replace 'bg-\[#D4FF00\]', 'bg-[var(--accent-secondary)]'
    $c = $c -replace 'bg-\[#d4ff00\]', 'bg-[var(--accent-secondary)]'
    $c = $c -replace 'bg-\[#008080\]', 'bg-[var(--accent-primary)]'
    $c = $c -replace 'bg-\[#00C896\]', 'bg-[var(--accent-primary)]'
    $c = $c -replace 'bg-\[#00c896\]', 'bg-[var(--accent-primary)]'
    $c = $c -replace 'bg-\[#F5F2EE\]', 'bg-[var(--background-primary)]'
    $c = $c -replace 'bg-\[#0D0F0C\]', 'bg-[var(--background-primary)]'
    $c = $c -replace 'text-\[#D4FF00\]', 'text-[var(--accent-secondary)]'
    $c = $c -replace 'text-\[#00C896\]', 'text-[var(--accent-primary)]'
    $c = $c -replace 'text-teal-400', 'text-[var(--accent-primary)]'
    $c = $c -replace 'text-teal-500', 'text-[var(--accent-primary)]'
    $c = $c -replace 'border-teal-500', 'border-[var(--accent-primary)]'
    $c = $c -replace 'border-teal-400', 'border-[var(--accent-primary)]'
    $c = $c -replace 'ring-slate-100', 'ring-[var(--border-subtle)]'
    $c = $c -replace 'ring-zinc-100', 'ring-[var(--border-subtle)]'
    $rc++

    # 10. Replace brand-teal opacity variants
    $c = $c -replace 'bg-brand-teal/60', 'bg-[rgba(0,200,150,0.6)]'
    $c = $c -replace 'bg-brand-teal/80', 'bg-[rgba(0,200,150,0.8)]'
    $c = $c -replace 'bg-surface-variant/30', 'bg-[color-mix(in_srgb,var(--surface-elevated)_30%,transparent)]'

    # 11. Fix border-radius values in style blocks
    $c = $c -replace 'border-radius:\s*9999px', 'border-radius: var(--radius-md)'
    $c = $c -replace 'border-radius:\s*0\.125rem', 'border-radius: var(--radius-xs)'
    $c = $c -replace 'border-radius:\s*0\.25rem', 'border-radius: var(--radius-sm)'
    $c = $c -replace 'border-radius:\s*0\.375rem', 'border-radius: var(--radius-sm)'
    $c = $c -replace 'border-radius:\s*0\.5rem', 'border-radius: var(--radius-md)'
    $c = $c -replace 'border-radius:\s*0\.75rem', 'border-radius: var(--radius-lg)'
    $rc++

    # 12. Fix shadows in style blocks
    $c = $c -replace 'box-shadow:\s*0[^;]*rgba\(0,\s*0,\s*0,\s*0\.0[1-6]\)[^;]*;', 'box-shadow: var(--shadow-card);'
    $c = $c -replace 'box-shadow:\s*0[^;]*rgba\(0,\s*0,\s*0,\s*0\.1\)[^;]*;', 'box-shadow: var(--shadow-elevated);'
    $rc++

    # 13. Replace font-family references in style blocks
    $c = $c -replace "font-family:\s*'Manrope',\s*sans-serif", "font-family: var(--font-display)"
    $c = $c -replace "font-family:\s*'Inter',\s*sans-serif", "font-family: var(--font-body)"
    $c = $c -replace "font-family:\s*'Satoshi',\s*sans-serif", "font-family: var(--font-body)"
    $c = $c -replace "font-family:\s*'Clash Display',\s*sans-serif", "font-family: var(--font-display)"
    $c = $c -replace "font-family:\s*'Geist Mono',\s*monospace", "font-family: var(--font-mono)"
    $c = $c -replace "font-family:\s*system-ui[^;]*;", "font-family: var(--font-body);"
    $c = $c -replace "font-family:\s*-apple-system[^;]*;", "font-family: var(--font-body);"

    # Fix inline font references in class attributes
    $c = $c -replace "font-\['Clash_Display'\]", "font-[var(--font-display)]"
    $c = $c -replace "font-\['Satoshi'\]", "font-[var(--font-body)]"
    $c = $c -replace "font-\['Geist_Mono'\]", "font-[var(--font-mono)]"
    $c = $c -replace "font-\['Inter'\]", "font-[var(--font-body)]"
    $c = $c -replace "font-\['Manrope'\]", "font-[var(--font-display)]"
    $c = $c -replace '\bfont-manrope\b', 'font-[var(--font-display)]'
    $c = $c -replace '\bfont-inter\b', 'font-[var(--font-body)]'
    $rc++

    # 14. Replace remaining hardcoded hex colors per mapping
    # In inline styles and style blocks
    $c = $c -replace '#f3fbf5', 'var(--background-primary)'
    $c = $c -replace '#F3FBF5', 'var(--background-primary)'
    $c = $c -replace '#eef6ef', 'var(--background-secondary)'
    $c = $c -replace '#EEF6EF', 'var(--background-secondary)'
    $c = $c -replace '#e8f0e9', 'var(--background-secondary)'
    $c = $c -replace '#E8F0E9', 'var(--background-secondary)'
    $c = $c -replace '#e2eae4', 'var(--background-secondary)'
    $c = $c -replace '#E2EAE4', 'var(--background-secondary)'
    $c = $c -replace '#dce4de', 'var(--surface-elevated)'
    $c = $c -replace '#DCE4DE', 'var(--surface-elevated)'
    $c = $c -replace '#161d1a', 'var(--text-primary)'
    $c = $c -replace '#161D1A', 'var(--text-primary)'
    $c = $c -replace '#3c4a43', 'var(--text-secondary)'
    $c = $c -replace '#3C4A43', 'var(--text-secondary)'
    $c = $c -replace '#6c7a72', 'var(--text-muted)'
    $c = $c -replace '#6C7A72', 'var(--text-muted)'
    $c = $c -replace '#bbcac1', 'var(--border-default)'
    $c = $c -replace '#BBCAC1', 'var(--border-default)'
    $c = $c -replace '#006c4f', 'var(--accent-primary)'
    $c = $c -replace '#006C4F', 'var(--accent-primary)'
    $c = $c -replace '#3adfab', 'var(--accent-primary)'
    $c = $c -replace '#3ADFAB', 'var(--accent-primary)'
    $c = $c -replace '#60fcc6', 'var(--accent-primary)'
    $c = $c -replace '#60FCC6', 'var(--accent-primary)'
    $c = $c -replace '#d5ec37', 'var(--accent-secondary)'
    $c = $c -replace '#D5EC37', 'var(--accent-secondary)'
    $c = $c -replace '#d8ee3a', 'var(--accent-secondary)'
    $c = $c -replace '#D8EE3A', 'var(--accent-secondary)'
    $c = $c -replace '#bcd215', 'var(--accent-secondary)'
    $c = $c -replace '#BCD215', 'var(--accent-secondary)'
    $c = $c -replace '#596400', 'var(--text-primary)'
    $c = $c -replace '#ba1a1a', 'var(--destructive)'
    $c = $c -replace '#BA1A1A', 'var(--destructive)'
    $c = $c -replace '#ffdad6', 'rgba(229, 62, 62, 0.15)'
    $c = $c -replace '#FFDAD6', 'rgba(229, 62, 62, 0.15)'
    $c = $c -replace '#2a322e', 'var(--background-secondary)'
    $c = $c -replace '#2A322E', 'var(--background-secondary)'
    $c = $c -replace '#ebf3ec', 'var(--surface-elevated)'
    $c = $c -replace '#EBF3EC', 'var(--surface-elevated)'
    $rc++

    # 15. Inject theme toggle button
    # Find notifications icon area and insert toggle before it
    if ($c -notmatch 'wagora-theme-toggle') {
        # Try to insert before notifications icon in header
        if ($c -match 'data-icon="notifications"') {
            $c = $c -replace '(<span\s+class="material-symbols-outlined[^"]*"\s+data-icon="notifications")', "$toggleBtn`n`$1"
            $rc++
        }
        # Or insert before dark_mode icon
        elseif ($c -match 'data-icon="dark_mode"') {
            $c = $c -replace '<span\s+class="material-symbols-outlined[^"]*"[^>]*data-icon="dark_mode"[^>]*>[^<]*</span>', $toggleBtn
            $rc++
        }
        # Or insert before contrast icon
        elseif ($c -match 'data-icon="contrast"') {
            $c = $c -replace '<span\s+class="material-symbols-outlined[^"]*"[^>]*data-icon="contrast"[^>]*>[^<]*</span>', $toggleBtn
            $rc++
        }
    }

    # 16. Add theme init script before </body>
    if ($c -notmatch 'wagora-theme.*light_mode') {
        $c = $c -replace '</body>', "$themeInitScript`n</body>"
        $rc++
    }

    # 17. Clean up empty lines and double spaces from removals
    $c = $c -replace '\n\s*\n\s*\n', "`n`n"

    # Write if changed
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file.FullName, $c, [System.Text.Encoding]::UTF8)
        $totalMod++
        $totalReplace += $rc
        Write-Host "UPDATED: $($file.FullName) ($rc changes)"
    } else {
        Write-Host "SKIPPED: $($file.FullName) (no changes needed)"
    }
}

Write-Host "`n========================================="
Write-Host "TRANSFORMATION COMPLETE"
Write-Host "Files modified: $totalMod / $($files.Count)"
Write-Host "Total replacement operations: $totalReplace"
Write-Host "========================================="
