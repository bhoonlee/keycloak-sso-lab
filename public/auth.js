import Keycloak from '/vendor/keycloak.js';

export async function signIn() {
  const clientId = document.body.dataset.client;
  const redirectUri = `${window.location.origin}/`;
  const keycloak = new Keycloak({
    url: 'http://localhost:8080',
    realm: 'sso-lab',
    clientId,
  });
  const status = document.querySelector('#auth-status');
  const logout = document.querySelector('#logout');
  const app = document.querySelector('#app');

  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      flow: 'standard',
      pkceMethod: 'S256',
      redirectUri,
    });
    if (!authenticated) return null;
  } catch {
    status.classList.add('error');
    status.textContent = '인증에 실패했어요. Keycloak 실행 상태와 Client의 주소 설정을 확인한 뒤 새로고침하세요.';
    return null;
  }

  const subject = keycloak.subject;
  if (!subject) {
    status.textContent = '로그인한 사용자를 확인할 수 없어요.';
    return null;
  }

  const username = keycloak.idTokenParsed?.preferred_username
    ?? keycloak.tokenParsed?.preferred_username
    ?? subject;
  document.querySelector('#username').textContent = username;
  status.hidden = true;
  document.querySelector('#session').hidden = false;

  function returnToLogin() {
    app.hidden = true;
    window.location.replace(redirectUri);
  }

  keycloak.onAuthLogout = returnToLogin;
  keycloak.onTokenExpired = async () => {
    try {
      await keycloak.updateToken(10);
    } catch {
      returnToLogin();
    }
  };

  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      await keycloak.logout({ redirectUri });
    } catch {
      status.textContent = '로그아웃 요청에 실패했어요. 잠시 후 다시 시도하세요.';
      status.classList.add('error');
      status.hidden = false;
      logout.disabled = false;
    }
  });
  return subject;
}
