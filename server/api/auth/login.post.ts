import { getQuery, readBody, setCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password } = body;

  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;

  if (username === validUsername && password === validPassword) {
    setCookie(event, 'auth', 'true', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });

    return { success: true };
  } else {
    throw createError({
      statusCode: 401,
      statusMessage: 'Неверный логин или пароль',
    });
  }
});
