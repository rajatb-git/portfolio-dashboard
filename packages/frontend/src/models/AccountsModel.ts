// How gains in the account are taxed; missing means taxable.
export type AccountTaxType = 'taxable' | 'taxDeferred' | 'taxFree';

export const ACCOUNT_TAX_TYPE_LABELS: Record<AccountTaxType, string> = {
  taxable: 'Taxable (brokerage)',
  taxDeferred: 'Tax-deferred (Traditional IRA, 401(k))',
  taxFree: 'Tax-free (Roth IRA, Roth 401(k))',
};

export interface IAccount {
  id: string;
  name: string;
  cashBalance?: number;
  taxType?: AccountTaxType;
  createdAt?: string;
  updatedAt?: string;
}
