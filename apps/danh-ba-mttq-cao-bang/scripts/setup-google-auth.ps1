param(
  [string]$Repo = "danganhdung26788-cloud/sotay-mttqcb"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Step($text) {
  Write-Host ""
  Write-Host "==> $text" -ForegroundColor Cyan
}

Step "Kiem tra Node.js / npm"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Chua co Node.js. Cai Node.js LTS roi chay lai script."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "Khong tim thay npm."
}

Step "Cai dat @google/clasp 3.4.1"
npm install -g @google/clasp@3.4.1
clasp --version

Step "Mo trang Apps Script user settings"
Start-Process "https://script.google.com/home/usersettings"
Read-Host "Bat Google Apps Script API (neu chua bat), sau do nhan Enter"

Step "Mo trang tao Apps Script project"
Start-Process "https://script.google.com/home/projects/create"
Write-Host "Tao project ten: Danh ba MTTQ tinh Cao Bang"
Write-Host "Vao Project Settings > IDs > copy Script ID."
$ScriptId = (Read-Host "Dan Script ID vao day").Trim()
if ([string]::IsNullOrWhiteSpace($ScriptId)) {
  throw "Script ID khong duoc de trong."
}

Step "Dang nhap clasp - day la buoc OAuth nguoi dung tu xac nhan"
clasp login

$ClaspRc = Join-Path $HOME ".clasprc.json"
if (-not (Test-Path $ClaspRc)) {
  throw "Khong tim thay $ClaspRc sau clasp login."
}

Step "Tao .clasp.json local (file nay da duoc gitignore)"
$ClaspObject = [ordered]@{
  scriptId = $ScriptId
  rootDir  = "src"
}
$ClaspJson = $ClaspObject | ConvertTo-Json -Compress
Set-Content -Path (Join-Path $ProjectRoot ".clasp.json") -Value $ClaspJson -Encoding UTF8
Write-Host "Da tao $ProjectRoot\.clasp.json"

Step "Kiem tra GitHub CLI"
if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh auth status
  Write-Host "Nap CLASPRC_JSON vao GitHub Actions Secrets (khong in token ra man hinh)..."
  Get-Content -Raw $ClaspRc | gh secret set CLASPRC_JSON --repo $Repo
  Write-Host "Nap CLASP_JSON..."
  $ClaspJson | gh secret set CLASP_JSON --repo $Repo

  Step "Kich workflow push source sang Apps Script"
  gh workflow run "danh-ba-deploy.yml" --repo $Repo --ref main -f description="Initial Apps Script source push"
  Write-Host "Da gui workflow. Theo doi tai:"
  Write-Host "https://github.com/$Repo/actions"
} else {
  Write-Host ""
  Write-Host "Khong tim thay GitHub CLI (gh)." -ForegroundColor Yellow
  Write-Host "Source va clasp da san sang. Hay tao 2 GitHub Secrets bang giao dien GitHub:"
  Write-Host "  CLASPRC_JSON = noi dung file $ClaspRc"
  Write-Host "  CLASP_JSON   = $ClaspJson"
  Write-Host "Khong dan noi dung CLASPRC_JSON vao chat hoac commit."
}

Step "Hoan tat gate OAuth local"
Write-Host "Sau khi workflow push source PASS:"
Write-Host "1. Mo Apps Script project."
Write-Host "2. Chay setupDatabase_()."
Write-Host "3. Chay runPhase4RegressionTests_()."
Write-Host "4. Tao Web App deployment dau tien bang giao dien Deploy > New deployment > Web app."
Write-Host "5. Sau khi co deployment ID, luu no thanh GitHub Secret CLASP_DEPLOYMENT_ID."
Write-Host ""
Write-Host "KHONG commit .clasp.json, .clasprc.json, token hoac mat khau."
