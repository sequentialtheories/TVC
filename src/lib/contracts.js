import { supabase } from './supabase.js';

export async function createSubclubContract(contractData) {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        contract_type: 'vault_club',
        name: `${contractData.lockupPeriod} ${contractData.isChargedContract ? 'Month' : 'Year'} ${contractData.rigorLevel} Rigor Contract`,
        description: `Lockup: ${contractData.lockupPeriod} ${contractData.isChargedContract ? 'months' : 'years'}, Max Members: ${contractData.maxMembers}`,
        target_amount: 10000,
        minimum_contribution: 100,
        maximum_participants: contractData.maxMembers,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Contract creation failed:', error);
    throw error;
  }
}

export async function joinContract(contractId, contributionAmount, walletAddress) {
  try {
    const { data, error } = await supabase.rpc('join_contract', {
      p_contract_id: contractId,
      p_contribution_amount: contributionAmount,
      p_wallet_address: walletAddress,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to join contract:', error);
    throw error;
  }
}

export async function getUserContracts() {
  try {
    const { data, error } = await supabase.rpc('get_user_contracts');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get user contracts:', error);
    return [];
  }
}

export async function getContractParticipants(contractId) {
  try {
    const { data, error } = await supabase
      .from('contract_participants')
      .select(`
        *,
        profiles!inner(name, email)
      `)
      .eq('contract_id', contractId)
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contract participants:', error);
    return [];
  }
}
