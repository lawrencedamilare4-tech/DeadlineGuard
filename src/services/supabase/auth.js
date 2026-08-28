import { supabase } from './client';

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// export async function getCurrentUser() {
//   const { data: { user } } = await supabase.auth.getUser();
//   return user;
// }

export async function getCurrentUser() {
  // Use getSession first (cheaper, doesn't hit server)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  // Only call getUser if session exists
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}

/**
 * Sign in (or create) a user associated with a wallet address.
 * @param {string} walletAddress 
 * @returns {Promise<{user: any, session: any}>}
 */
export async function signInWithWallet(walletAddress) {
  // First, attempt anonymous sign-in (if enabled)
  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
  if (!anonError) {
    return anonData;
  }

  // Fallback: create deterministic email/password user
  const email = `wallet-${walletAddress.toLowerCase()}@deadlineguard.local`;
  const password = 'DeadlineGuardWallet123!'; // Strong enough for demo, but can be improved

  // Try to sign in first (in case user already exists)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) return signInData;

  // If not exists, sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError) throw signUpError;
  return signUpData;
}

