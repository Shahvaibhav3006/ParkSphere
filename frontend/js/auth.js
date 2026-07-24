// Login / register page logic
(function () {
  if (getToken()) { window.location.href = 'dashboard.html'; return; }

  const errorBanner = document.getElementById('errorBanner');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const toggleToRegister = document.getElementById('toggleToRegister');
  const toggleToLogin = document.getElementById('toggleToLogin');

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add('show');
  }
  function hideError() { errorBanner.classList.remove('show'); }

  toggleToRegister.querySelector('a').onclick = () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    toggleToRegister.style.display = 'none';
    toggleToLogin.style.display = 'block';
    hideError();
  };
  toggleToLogin.querySelector('a').onclick = () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    toggleToLogin.style.display = 'none';
    toggleToRegister.style.display = 'block';
    hideError();
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      setToken(token);
      setUser(user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const vehicleNumber = document.getElementById('regVehicle').value.trim();
    const password = document.getElementById('regPassword').value;
    try {
      const { token, user } = await api('/auth/register', { method: 'POST', body: { name, email, vehicleNumber, password }, auth: false });
      setToken(token);
      setUser(user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message);
    }
  });
})();
