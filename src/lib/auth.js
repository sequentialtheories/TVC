import { supabase } from './supabase.js';

const VAULT_CLUB_API_KEY = import.meta.env.VITE_VAULT_CLUB_API_KEY || 'vault-club-dev-key';
const SEQUENCE_THEORY_API_URL = 'https://qldjhlnsphlixmzzrdwi.supabase.co/functions/v1';

export async function createVaultClubUser(email, password, name) {
  try {
    const response = await fetch(`${SEQUENCE_THEORY_API_URL}/vault-club-user-creation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vault-club-api-key': VAULT_CLUB_API_KEY,
      },
      body: JSON.stringify({ email, password, name }),
    });

    const result = await response.json();
    
    if (result.success) {
      await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });
      
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Account creation failed:', error);
    throw error;
  }
}

export async function authenticateVaultClubUser(email, password) {
  try {
    const response = await fetch(`${SEQUENCE_THEORY_API_URL}/vault-club-auth-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vault-club-api-key': VAULT_CLUB_API_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    
    if (result.success) {
      await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });
      
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
}
