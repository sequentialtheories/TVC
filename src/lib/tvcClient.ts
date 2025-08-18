type Env = { functionsBase: string; vaultClubApiKey: string };
const cfg = (): Env => (window as any).__TVC_CONFIG;

const commonHeaders = () => ({
  "content-type": "application/json",
  "x-vault-club-api-key": cfg().vaultClubApiKey,
  ...(localStorage.getItem("sb-access-token")
    ? { "authorization": `Bearer ${localStorage.getItem("sb-access-token")}` } : {})
});

const rid = () => (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${cfg().functionsBase}/${path}`, { 
    ...init, 
    headers: { ...commonHeaders(), ...(init?.headers || {}) } 
  });
  const json = await res.json();
  if (!res.ok || json?.success === false) throw new Error(json?.error || res.statusText);
  return json;
}

export const TVC = {
  create: (name: string, rigor: "LIGHT" | "MEDIUM" | "HEAVY", lock_months: number) =>
    call("vault-create", { 
      method: "POST", 
      body: JSON.stringify({ name, rigor, lock_months }) 
    }),
    
  join: (subclub_id: string) =>
    call("vault-join", { 
      method: "POST", 
      body: JSON.stringify({ subclub_id }) 
    }),
    
  balance: (subclub_id: string) =>
    call(`vault-balance?subclub_id=${encodeURIComponent(subclub_id)}`),
    
  deposit: (subclub_id: string, amount_usdc: number) =>
    call("vault-deposit", { 
      method: "POST", 
      headers: { "x-idempotency-key": rid() }, 
      body: JSON.stringify({ subclub_id, amount_usdc }) 
    }),
    
  harvest: (subclub_id: string) =>
    call("vault-harvest", { 
      method: "POST", 
      headers: { "x-idempotency-key": rid() }, 
      body: JSON.stringify({ subclub_id }) 
    }),
};
