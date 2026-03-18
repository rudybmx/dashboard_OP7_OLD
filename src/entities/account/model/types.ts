export interface MetaAccount {
  account_id: string;
  account_name: string;
  display_name?: string;
  franchise_id: string | null;
  franchise_name: string;
  current_balance: number;
  status: 'active' | 'removed' | 'disabled';
  client_visibility: boolean;
}
