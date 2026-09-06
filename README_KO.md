# 클럽09 바카라 — Android 앱 프로젝트

**이 묶음은 APK가 아니라 APK를 만들기 위한 Android 소스입니다.**
현재 제작 환경에 Android SDK와 빌드 도구가 없고 다운로드 요청이 자동 승인 검토에서 차단되어 APK 컴파일·서명·설치 검증은 수행하지 못했습니다.

## 구현한 기능

- 휴대폰 한 대에서 혼자 + 봇: 외부 서버 없이 폰 내부에서 진행.
- 휴대폰 두 대에서 LAN: 한 폰이 방을 열고 다른 폰은 같은 Wi-Fi에서 IP 주소와 6자리 코드로 참여.
- 칩 버튼 1만 / 5만 / 10만 / 50만, 최소 1만 단위, 시작 100만 가상 칩.
- 8덱 슈, 표준 서드카드 규칙, 플레이어·뱅커·타이 베팅.
- 뱅커 이익 5% 수수료, 타이 시 플레이어·뱅커 베팅 반환, 타이 순이익 8배.
- 두 사람의 확정 베팅과 정산을 호스트 폰에서 처리.
- 카드 표시, 생성한 녹색 테이블 배경 이미지, 최근 60판 결과.
- 1만 칩 미만이면 다음 라운드에 100만 가상 칩 재충전.
- 실제 돈 결제·구매·환전 기능 없음.

## Windows PC에서 APK 만들기

1. Android Studio를 설치하고 최초 설정을 마칩니다.
   https://developer.android.com/studio
2. Android Studio의 SDK Manager에서 Android SDK Platform 35와 Android SDK Build-Tools 35.0.0을 설치합니다.
3. 압축을 풀고 `BUILD_WINDOWS.bat`를 실행합니다.
   - Java는 Android Studio의 기본 설치 경로 또는 JAVA_HOME에서 찾습니다.
   - SDK는 ANDROID_HOME 또는 `%LOCALAPPDATA%\Android\Sdk`에서 찾습니다.
   - Gradle 8.11.1을 공식 배포 서버에서 내려받고 SHA-256을 검사합니다.
   - 처음 빌드에는 인터넷이 필요합니다. 게임 실행 자체에는 외부 인터넷이 필요 없습니다.
4. 성공하면 이 폴더에 `Club09-Baccarat.apk`가 생성됩니다.
5. 같은 APK를 두 휴대폰으로 보내 설치합니다.

PowerShell이 회사/사용자 정책으로 스크립트 실행을 막으면 정책을 임의로 우회하지 마세요. Android Studio에서 프로젝트를 열고 Gradle 8.11.1을 지정한 뒤 `:app:assembleDebug` 태스크로 빌드할 수 있습니다. 이 프로젝트는 Gradle wrapper 바이너리를 포함하지 않으며 `Build-APK.ps1`이 Gradle을 준비합니다.

SDK/Java가 다른 경로에 있으면 ANDROID_HOME/JAVA_HOME을 실제 설치 경로로 지정하세요. AGP 8.9.1 / Gradle 8.11.1 / JDK 17 / compileSdk 35 / targetSdk 35 / minSdk 26 구성입니다. Android 16 폰을 염두에 두었으나 실기기 테스트는 아직 하지 않았습니다.

디버그 APK는 빌드 PC의 디버그 키로 서명됩니다. 다른 PC에서 재빌드하면 서명이 달라 기존 앱 위에 업데이트 설치하지 못할 수 있습니다. Play Store 배포용 서명과 업로드는 포함하지 않았습니다.

## 휴대폰에서 플레이

혼자: 앱 실행 → 닉네임 → 혼자 + 봇 → 베팅.

둘이:
1. 두 폰을 같은 Wi-Fi에 연결합니다.
2. A 폰에서 ‘2인 방 만들기’를 누릅니다.
3. A 폰 상단의 IP 주소와 게임 화면의 6자리 방 코드를 B에게 알려줍니다.
4. B 폰에서 ‘친구 폰에 입장’에 IP 주소만 입력하고 연결합니다.
5. 게임 화면에서 6자리 방 코드를 입력합니다.
6. 둘 다 베팅을 확정하면 결과가 나오고, 한 명이 다음 라운드를 누르면 같이 이동합니다.

## 연결과 수명

- 방을 연 폰은 게임 화면을 켜두세요. 다른 앱으로 전환하거나 화면을 잠그면 Android의 백그라운드 제한으로 통신이 멈출 수 있습니다. 앱 종료·프로세스 종료 시 방과 기록은 초기화됩니다.
- 앱 홈으로 나가면 호스트의 서버가 종료됩니다. 클라이언트는 퇴장 요청을 보냅니다.
- Wi-Fi 변경, VPN, 게스트 Wi-Fi 기기 간 격리, 일부 핫스폿에서는 연결이 제한될 수 있습니다.
- 여러 IP 주소가 나오면 Wi-Fi 설정에서 확인한 IPv4 주소를 사용합니다. 기본 포트는 8765입니다.
- 자동 기기 검색 대신 IP를 직접 입력합니다. 공인 인터넷에서 접속하는 서비스가 아닙니다.
- 본 앱은 외부 스크립트와 JavaScript 네이티브 브리지를 사용하지 않습니다. 웹 게임 화면과 이미지는 APK에 포함됩니다.

## 검증 결과와 미검증 항목

통과: Java 엔진·HTTP 서버 컴파일, 엔진/정산/입력 검증/두 HTTP 클라이언트 상태 일치 등 106개 검사, 게임 JavaScript 구문 검사.
미수행: Android SDK를 사용한 전체 APK 빌드, Android UI 컴파일 및 렌더링, APK 서명 검증, 실제 두 폰의 Wi-Fi 접속 테스트.
따라서 이 소스를 설치 검증이 완료된 앱으로 취급하면 안 됩니다.

## 개발 참고 자료

- https://developer.android.com/build/releases/agp-8-9-0-release-notes
- https://developer.android.com/privacy-and-security/local-network-permission
- https://developer.android.com/develop/ui/views/layout/webapps/webview

현재 targetSdk 35에 맞춰 INTERNET 권한으로 LAN을 사용합니다. 추후 targetSdk 37 이상으로 높이면 공식 문서에 따라 로컬 네트워크 런타임 권한 처리를 추가해야 합니다.
