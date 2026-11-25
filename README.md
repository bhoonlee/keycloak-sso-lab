# Keycloak SSO 실습

하나의 Keycloak Realm에서 두 브라우저 앱을 별도 OIDC Client로 인증한다. 서비스 A는 학습 할 일을 관리하고, 서비스 B는 메모를 브라우저에서 암호화하여 보관한다. 한 Node.js 프로세스가 서로 다른 포트에 두 HTTP 서버를 연다.

## 실행

Node.js 22 이상과 실행 중인 Keycloak이 필요하다. 이전에 만든 컨테이너를 다시 켜려면 PowerShell에서 `docker start keycloak-sso`를 실행한다. Keycloak 관리자 콘솔의 `sso-lab`에 실습 사용자와 아래 설정이 있어야 한다.

| 항목 | 서비스 A | 서비스 B |
| --- | --- | --- |
| Client ID | `service-a` | `service-b` |
| Valid redirect URIs | `http://localhost:5173/` | `http://localhost:5174/` |
| Valid post logout redirect URIs | `http://localhost:5173/` | `http://localhost:5174/` |
| Web origins | `http://localhost:5173` | `http://localhost:5174` |

두 Client 모두 OpenID Connect, Client authentication Off, Standard flow On, Direct access grants Off, PKCE S256으로 설정한다.

이 README가 있는 폴더에서 실행한다. `npm.cmd install`은 최초 한 번 실행한다.

```powershell
npm.cmd install
npm.cmd start
```

브라우저에서 [서비스 A](http://localhost:5173/)를 연다. 주소에는 `localhost`를 사용한다. 실행 중인 서비스는 로컬 PC에서만 접근할 수 있다. 종료할 때는 실행한 PowerShell에서 Ctrl+C를 누른다.

## 검증과 캡처

| 검증 | 수행 방법과 예상 화면 |
| --- | --- |
| A 최초 로그인 | 새 시크릿 창에서 A를 열면 Keycloak 로그인 화면이 나온다. `student01`로 로그인하면 A 헤더에 사용자 이름이 나온다. 두 화면을 각각 캡처한다. |
| B SSO | 같은 시크릿 창의 A에서 **암호화 메모**를 눌러 B로 이동한다. Keycloak으로 잠깐 이동할 수 있고, 비밀번호 입력 없이 B 헤더에 같은 이름이 표시된다. A와 B의 주소 및 사용자 이름을 함께 기록한다. |
| 로그아웃 | B에서 **SSO 로그아웃**을 누르면 Keycloak 세션이 종료된다. B가 다시 열리면서 인증을 요청하고, 같은 시크릿 창에서 A를 새로 열어도 로그인이 필요하다. |
| 새 세션 | A나 B에 로그인한 상태에서 별도 브라우저 프로필로 접속해 로그인 화면을 확인한다. 모든 시크릿 창을 닫고 새 시크릿 창을 열어도 새 세션을 확인할 수 있다. |
| 메모 암호화 | B에 메모와 별도 메모 암호를 입력해 저장한다. 저장된 항목을 열어 암호문을 확인하고, 올바른 암호로 원문을 확인한다. 다른 암호로 다시 시도해 실패 화면을 캡처한다. |

위 표는 예상 결과다. 발표에서는 각 테스트의 실제 결과와 실행 화면을 사용한다. 시크릿 창을 모두 닫으면 그 세션의 브라우저 저장 데이터도 사라질 수 있다. 메모 암호와 로그인 비밀번호가 보이는 화면은 캡처에서 제외한다.

## 동작 원리

두 서비스가 브라우저를 각자의 Client ID로 Keycloak에 보낸다. 첫 로그인으로 Keycloak에 세션이 생기고, 두 번째 앱은 같은 브라우저의 Keycloak 세션을 이용해 자격 증명 재입력 없이 인증 코드를 받는다. 각 앱은 자신의 인증 코드를 PKCE 검증 값과 함께 토큰으로 교환한다. Keycloak JavaScript 어댑터는 앱의 토큰을 메모리에 유지한다.

할 일과 메모는 각 서비스의 브라우저 저장소에 사용자 ID별로 저장한다. 사용자별 저장 키는 화면의 데이터 구분을 위한 것이다. B는 Web Crypto를 이용해 PBKDF2-HMAC-SHA-256으로 키를 만들고 AES-256-GCM으로 메모를 암호화한다. 메모마다 무작위 16바이트 salt와 12바이트 IV를 만들고, 암호문과 함께 저장한다. 메모 암호와 평문은 저장소에 기록하지 않는다.

[Keycloak JavaScript 어댑터](https://www.keycloak.org/securing-apps/javascript-adapter) · [W3C Web Crypto 명세](https://www.w3.org/TR/webcrypto/)
