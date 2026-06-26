import { checkAndPromoteGrades } from './lib/automation.js';

export const onRequest = async (context: any, next: any) => {
  const { url, cookies, redirect, locals } = context;

  // Run grade promotion automation check
  checkAndPromoteGrades();

  // Public paths
  if (
    url.pathname.startsWith('/login') || 
    url.pathname.startsWith('/api/auth') || 
    url.pathname.startsWith('/favicon.svg') || 
    url.pathname.startsWith('/_astro')
  ) {
    return next();
  }

  // Verify session cookie
  const sessionCookie = cookies.get('academia_session');
  if (!sessionCookie) {
    return redirect('/login', 302);
  }

  try {
    const user = JSON.parse(sessionCookie.value);
    locals.user = user;
  } catch (error) {
    cookies.delete('academia_session', { path: '/' });
    return redirect('/login', 302);
  }

  return next();
};
