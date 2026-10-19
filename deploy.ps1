# ==============================================================================
# MARQUE SUA HORA — SCRIPT DE DEPLOY PRODUCAO (POWERSHELL)
# ==============================================================================
[CmdletBinding()]
param(
  [string]$ServerHost = "23.80.89.116",
  [string]$ServerUser = "root",
  [string]$RemoteDir = "/root/marquesuahora",
  [string]$Services = "web api",
  [switch]$All,
  [switch]$SkipTypeCheck,
  [switch]$Migrate,
  [switch]$Logs
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date
$TargetSSH = "$ServerUser@$ServerHost"

function Write-DeployStep {
  param([string]$Text)
  Write-Host ""
  Write-Host "========================================================" -ForegroundColor Magenta
  Write-Host " [DEPLOY] $Text" -ForegroundColor Cyan
  Write-Host "========================================================" -ForegroundColor Magenta
}

function Write-DeploySuccess {
  param([string]$Text)
  Write-Host " [OK] $Text" -ForegroundColor Green
}

function Write-DeployInfo {
  param([string]$Text)
  Write-Host " [INFO] $Text" -ForegroundColor Yellow
}

function Write-DeployFail {
  param([string]$Text)
  Write-Host " [ERRO] $Text" -ForegroundColor Red
}

try {
  Write-Host ""
  Write-Host "MARQUE SUA HORA - DEPLOY PRODUCAO" -ForegroundColor White -BackgroundColor DarkMagenta
  Write-Host "Servidor: $TargetSSH" -ForegroundColor Gray
  Write-Host "Diretorio Remoto: $RemoteDir" -ForegroundColor Gray
  if ($All) { $Services = "postgres redis evolution api web" }
  $Services = ($Services -replace ',', ' ').Trim()
  Write-Host "Servicos Alvo: $Services" -ForegroundColor Gray
  Write-Host ""

  $SSHArgs = @("-o", "BatchMode=yes", "-o", "ConnectTimeout=10")
  $EdKey = "$env:USERPROFILE\.ssh\id_ed25519"
  if (Test-Path $EdKey) {
    $SSHArgs += @("-i", $EdKey)
  }

  # 1. Teste de conectividade SSH
  Write-DeployStep "1/5 Testando conexao SSH..."
  $sshTest = & ssh @SSHArgs $TargetSSH "echo connected" 2>$null
  if ($sshTest -ne "connected") {
    Write-DeployFail "Nao foi possivel conectar via SSH a $TargetSSH."
    Write-DeployInfo "Verifique se a sua chave SSH esta autorizada."
    exit 1
  }
  Write-DeploySuccess "Conexao SSH autenticada."

  # 2. Verificacao de tipos TypeScript
  if (-not $SkipTypeCheck) {
    Write-DeployStep "2/5 Validando codigo TypeScript local..."
    Write-DeployInfo "Executando tsc --noEmit no apps/api..."
    $tscResult = cmd.exe /c "npx tsc --project apps/api/tsconfig.json --noEmit 2>&1"
    if ($LASTEXITCODE -ne 0) {
      Write-DeployFail "Falha na verificacao de tipos da API:"
      Write-Host $tscResult -ForegroundColor Red
      exit 1
    }
    Write-DeploySuccess "TypeScript da API compilado com sucesso."
  }
  else {
    Write-DeployInfo "Verificacao de tipos ignorada (-SkipTypeCheck)."
  }

  # 3. Empacotamento
  Write-DeployStep "3/5 Empacotando arquivos para transferencia..."
  $tarFile = "deploy.tar.gz"
  if (Test-Path $tarFile) {
    Remove-Item $tarFile -Force
  }

  $tarArgs = @(
    "--exclude=node_modules",
    "--exclude=.next",
    "--exclude=.git",
    "--exclude=dist",
    "--exclude=.env",
    "--exclude=.env.*",
    "--exclude=*.log",
    "--exclude=*.tar.gz",
    "-czf",
    $tarFile,
    "apps",
    "packages",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "Dockerfile.api",
    "Dockerfile.web",
    "docker-compose.prod.yml"
  )

  & tar $tarArgs

  if (-not (Test-Path $tarFile)) {
    Write-DeployFail "Erro ao gerar arquivo $tarFile."
    exit 1
  }

  $fileBytes = (Get-Item $tarFile).Length
  $fileMb = [math]::Round($fileBytes / 1048576, 2)
  Write-DeploySuccess "Pacote criado: $tarFile (${fileMb} MB)"

  # 4. Envio via SCP
  Write-DeployStep "4/5 Enviando pacote para o servidor via SCP..."
  $remoteDest = "${TargetSSH}:${RemoteDir}/$tarFile"
  Write-DeployInfo "Destino: $remoteDest"
  & scp -o ConnectTimeout=15 $tarFile $remoteDest
  if ($LASTEXITCODE -ne 0) {
    Write-DeployFail "Falha no envio via SCP."
    exit 1
  }
  Write-DeploySuccess "Upload concluido."

  # 5. Execucao remota
  Write-DeployStep "5/5 Atualizando containers Docker na VPS..."

  $rawScript = @'
set -e
cd DIR_PLACEHOLDER
echo "--> Descompactando deploy.tar.gz..."
tar -xzf deploy.tar.gz
rm -f deploy.tar.gz

echo "--> Atualizando containers: SERVICES_PLACEHOLDER..."
docker compose -f docker-compose.prod.yml up -d --build SERVICES_PLACEHOLDER

echo "--> Status dos containers MarqueSuaHora:"
docker ps --filter name=marquesuahora --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
'@

  $execScript = $rawScript.Replace('DIR_PLACEHOLDER', $RemoteDir).Replace('SERVICES_PLACEHOLDER', $Services)

  if ($Migrate) {
    $execScript += "`necho '--> Sincronizando schema do Prisma no banco (db push)...'`ndocker exec marquesuahora-api npx prisma db push --accept-data-loss`n"
  }

  $cleanScript = $execScript -replace "`r", ""
  $b64Script = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($cleanScript))
  & ssh @SSHArgs $TargetSSH "echo '$b64Script' | base64 -d | bash"

  if ($LASTEXITCODE -ne 0) {
    Write-DeployFail "Erro durante o build ou restart dos containers no servidor."
    exit 1
  }

  # Healthcheck
  Write-DeployStep "Verificando integridade das aplicacoes..."
  Start-Sleep -Seconds 3

  $healthApi = & ssh @SSHArgs $TargetSSH "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3041/health" 2>$null
  $healthWeb = & ssh @SSHArgs $TargetSSH "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3040/" 2>$null

  Write-DeployInfo "Status HTTP API Local (Porta 3041): $healthApi"
  Write-DeployInfo "Status HTTP Web Local (Porta 3040): $healthWeb"

  if ($Logs) {
    Write-DeployStep "Logs Recentes:"
    & ssh @SSHArgs $TargetSSH "docker logs --tail 25 marquesuahora-api"
    & ssh @SSHArgs $TargetSSH "docker logs --tail 25 marquesuahora-web"
  }

  $Duration = [math]::Round(((Get-Date) - $StartTime).TotalSeconds, 1)
  Write-Host ""
  Write-Host "DEPLOY CONCLUIDO COM SUCESSO EM ${Duration}s!" -ForegroundColor White -BackgroundColor DarkGreen
  Write-Host "Frontend: https://marquesuahora.com.br" -ForegroundColor Green
  Write-Host "Backend API: https://api.marquesuahora.com.br" -ForegroundColor Green
  Write-Host "WhatsApp Gateway: http://${ServerHost}:3042" -ForegroundColor Green
  Write-Host ""

}
catch {
  Write-DeployFail "Deploy interrompido: $($_.Exception.Message)"
  exit 1
}
