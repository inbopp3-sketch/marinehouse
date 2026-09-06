$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$studioJava = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
if (-not $env:JAVA_HOME -and (Test-Path (Join-Path $studioJava 'bin\java.exe'))) { $env:JAVA_HOME = $studioJava }
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw 'Install Android Studio first, or set JAVA_HOME to a JDK 17+ installation.'
}
$sdkPath = $env:ANDROID_HOME
if (-not $sdkPath) { $sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path (Join-Path $sdkPath 'platforms\android-35\android.jar'))) {
    throw 'Android Studio > SDK Manager: install Android SDK Platform 35, then run this script again.'
}
if (-not (Test-Path (Join-Path $sdkPath 'build-tools\35.0.0'))) {
    throw 'Android Studio > SDK Manager > SDK Tools > Show Package Details: install Android SDK Build-Tools 35.0.0.'
}
$env:ANDROID_HOME = $sdkPath
$version = '8.11.1'
$toolsDir = Join-Path $PSScriptRoot '.build-tools'
$gradleExe = Join-Path $toolsDir "gradle-$version\bin\gradle.bat"
if (-not (Test-Path $gradleExe)) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $archive = Join-Path $toolsDir 'gradle.zip'
    $url = "https://services.gradle.org/distributions/gradle-$version-bin.zip"
    Write-Host 'Downloading Gradle from its official distribution service...'
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $archive
    $expected = (Invoke-WebRequest -UseBasicParsing -Uri "$url.sha256").Content.Trim()
    $actual = (Get-FileHash -Algorithm SHA256 -Path $archive).Hash.ToLowerInvariant()
    if ($actual -ne $expected.ToLowerInvariant()) { throw 'Gradle checksum did not match. Build stopped.' }
    Expand-Archive -Path $archive -DestinationPath $toolsDir -Force
    Remove-Item $archive
}
& $gradleExe --no-daemon :app:assembleDebug
if ($LASTEXITCODE -ne 0) { throw 'APK build failed. Read the Gradle error above.' }
$out = Join-Path $PSScriptRoot 'Club09-Baccarat.apk'
Copy-Item 'app\build\outputs\apk\debug\app-debug.apk' $out -Force
Write-Host "APK created: $out"
