let turnstileSDK;

export function loadTurnstileSDK() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileSDK) return turnstileSDK;
  turnstileSDK = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error('Failed to load Cloudflare Turnstile'));
    };
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve();
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => {
    turnstileSDK = undefined;
    throw error;
  });
  return turnstileSDK;
}

export function appendCaptchaData(body, data) {
  if (!data) return;
  const fields = data.provider === 'turnstile' ? ['turnstile_token']
    : data.provider === 'image' ? ['captcha_code']
      : ['lot_number', 'captcha_output', 'pass_token', 'gen_time'];
  for (const key of fields) body.append(key, data[key] || '');
}
