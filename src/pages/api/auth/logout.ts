export const GET = async ({ cookies, redirect }: any) => {
  cookies.delete('academia_session', { path: '/' });
  return redirect('/login', 302);
};

export const POST = async ({ cookies, redirect }: any) => {
  cookies.delete('academia_session', { path: '/' });
  return redirect('/login', 302);
};
