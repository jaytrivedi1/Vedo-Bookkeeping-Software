import { Account, Contact } from "@shared/schema";

export function validateAccountContactRequirement(
  accountId: number | null | undefined,
  contactId: number | null | undefined,
  accounts: Account[],
  contacts: Contact[]
): string | null {
  if (!accountId) return null;
  
  const account = accounts.find(a => a.id === accountId);
  if (!account) return null;

  // Check if Accounts Payable
  if (account.type === 'accounts_payable') {
    if (!contactId) {
      return "Accounts Payable requires a contact to be selected";
    }
    
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
      return "Please select a valid contact";
    }
    
    if (contact.type !== 'vendor' && contact.type !== 'both') {
      return "Accounts Payable requires a Vendor contact";
    }
  }
  
  // Check if Accounts Receivable
  if (account.type === 'accounts_receivable') {
    if (!contactId) {
      return "Accounts Receivable requires a contact to be selected";
    }
    
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
      return "Please select a valid contact";
    }
    
    if (contact.type !== 'customer' && contact.type !== 'both') {
      return "Accounts Receivable requires a Customer contact";
    }
  }
  
  return null;
}

export function hasAccountsPayableOrReceivable(
  lineItems: Array<{ accountId?: number | null }> | undefined,
  accounts: Account[]
): { hasAP: boolean; hasAR: boolean } {
  if (!lineItems || lineItems.length === 0) {
    return { hasAP: false, hasAR: false };
  }

  if (!accounts || accounts.length === 0) {
    throw new Error("Account data is required for validation but was not loaded");
  }

  let hasAP = false;
  let hasAR = false;

  for (const item of lineItems) {
    if (item.accountId) {
      const account = accounts.find(a => a.id === item.accountId);
      if (!account) {
        throw new Error(`Account with ID ${item.accountId} not found`);
      }
      if (account.type === 'accounts_payable') hasAP = true;
      if (account.type === 'accounts_receivable') hasAR = true;
    }
  }

  return { hasAP, hasAR };
}
