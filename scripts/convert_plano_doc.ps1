$ErrorActionPreference = "Stop"
$src = "c:\Users\leonardo\Desktop\defeitos-produtos\templates\_plano_src.doc"
$out = "c:\Users\leonardo\Desktop\defeitos-produtos\templates\_from_doc.docx"

# Copy from Downloads (latest Plano*.doc)
$docs = Get-ChildItem -LiteralPath "c:\Users\leonardo\Downloads" -Filter "Plano*.doc" |
  Where-Object { $_.Extension -eq ".doc" } |
  Sort-Object LastWriteTime -Descending
if (-not $docs) { throw "DOC not found" }
Copy-Item -LiteralPath $docs[0].FullName -Destination $src -Force

if (Test-Path $out) { Remove-Item -LiteralPath $out -Force }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($src)
  # 16 = wdFormatXMLDocument (.docx)
  $null = $doc.SaveAs([ref]$out, [ref]16)
  $doc.Close()
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

Write-Output "OK $out"
