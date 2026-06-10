export interface RenderedMessage {
  subject: string;
  text: string;
  html: string;
}

const wrap = (inner: string): string =>
  `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0a0a0a">${inner}<p style="color:#888;font-size:12px;margin-top:24px">Outegro</p></div>`;

export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): RenderedMessage | null {
  switch (template) {
    case "login_code": {
      const code = String(data.code ?? "");
      return {
        subject: "Код входа в Outegro",
        text: `Ваш код входа: ${code}\n\nКод действует 10 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.`,
        html: wrap(
          `<p>Ваш код входа в Outegro:</p><p style="font-size:32px;font-weight:600;letter-spacing:6px">${code}</p><p style="color:#888">Действует 10 минут. Не запрашивали — игнорируйте.</p>`,
        ),
      };
    }
    case "security_alert": {
      const message = String(data.message ?? "Зафиксирована новая активность в вашем аккаунте.");
      return {
        subject: "Безопасность Outegro",
        text: message,
        html: wrap(`<p>${message}</p>`),
      };
    }
    default:
      return null;
  }
}
