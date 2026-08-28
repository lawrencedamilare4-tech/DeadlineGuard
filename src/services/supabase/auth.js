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
  // First, check if we already have a session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // Update metadata (optional)
    await supabase.auth.updateUser({
      data: { wallet_address: walletAddress },
    });
    return { user: session.user, session };
  }

  // If no session, sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  // Store wallet address in metadata
  if (data?.user) {
    await supabase.auth.updateUser({
      data: { wallet_address: walletAddress },
    });
  }

  return data;
}