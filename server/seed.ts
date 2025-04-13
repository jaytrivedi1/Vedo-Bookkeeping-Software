import { db } from "./db";
import { accounts, contacts } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database with initial data...");
  
  // Check if accounts already exist
  const existingAccounts = await db.select().from(accounts);
  
  // Function to update account types
  async function updateAccountTypes() {
    console.log("Updating account types to new classification...");
    
    // Define mapping from old to new types
    const accountTypeMapping = [
      { id: 1, code: "1000", name: "Cash", oldType: "asset", newType: "bank" },
      { id: 2, code: "1100", name: "Accounts Receivable", oldType: "asset", newType: "accounts_receivable" },
      { id: 3, code: "1200", name: "Inventory", oldType: "asset", newType: "current_assets" },
      { id: 4, code: "2000", name: "Accounts Payable", oldType: "liability", newType: "accounts_payable" },
      { id: 5, code: "2100", name: "Sales Tax Payable", oldType: "liability", newType: "other_current_liabilities" },
      { id: 6, code: "2200", name: "Accrued Expenses", oldType: "liability", newType: "other_current_liabilities" },
      { id: 7, code: "3000", name: "Owner's Equity", oldType: "equity", newType: "equity" },
      { id: 8, code: "3100", name: "Retained Earnings", oldType: "equity", newType: "equity" },
      { id: 9, code: "4000", name: "Sales Revenue", oldType: "income", newType: "income" },
      { id: 10, code: "4100", name: "Service Revenue", oldType: "income", newType: "income" },
      { id: 11, code: "4200", name: "Interest Income", oldType: "income", newType: "other_income" },
      { id: 12, code: "5000", name: "Cost of Goods Sold", oldType: "expense", newType: "cost_of_goods_sold" },
      { id: 13, code: "5100", name: "Salary Expense", oldType: "expense", newType: "expenses" },
      { id: 14, code: "5200", name: "Rent Expense", oldType: "expense", newType: "expenses" },
      { id: 15, code: "5300", name: "Utilities Expense", oldType: "expense", newType: "expenses" },
      { id: 16, code: "5400", name: "Office Supplies", oldType: "expense", newType: "expenses" }
    ];
    
    // Update each account with its new type
    for (const mapping of accountTypeMapping) {
      await db.update(accounts)
        .set({ type: mapping.newType })
        .where(eq(accounts.id, mapping.id));
    }
    
    console.log("Account types updated successfully.");
  }
  
  if (existingAccounts.length === 0) {
    console.log("Creating default accounts...");
    
    // Create default Chart of Accounts
    await db.insert(accounts).values([
      // Bank Accounts
      {
        code: "1000",
        name: "Cash",
        type: "bank",
        description: "Cash on hand and in banking accounts",
        balance: 0,
        isActive: true
      },
      
      // Accounts Receivable
      {
        code: "1100",
        name: "Accounts Receivable",
        type: "accounts_receivable",
        description: "Amounts owed to the company by customers",
        balance: 0,
        isActive: true
      },
      
      // Current Assets
      {
        code: "1200",
        name: "Inventory",
        type: "current_assets",
        description: "Value of goods in inventory",
        balance: 0,
        isActive: true
      },
      
      // Accounts Payable
      {
        code: "2000",
        name: "Accounts Payable",
        type: "accounts_payable",
        description: "Amounts owed by the company to suppliers",
        balance: 0,
        isActive: true
      },
      
      // Other Current Liabilities
      {
        code: "2100",
        name: "Sales Tax Payable",
        type: "other_current_liabilities",
        description: "Sales tax collected but not yet remitted",
        balance: 0,
        isActive: true
      },
      {
        code: "2200",
        name: "Accrued Expenses",
        type: "other_current_liabilities",
        description: "Expenses recognized but not yet paid",
        balance: 0,
        isActive: true
      },
      
      // Equity Accounts
      {
        code: "3000",
        name: "Owner's Equity",
        type: "equity",
        description: "Owner's investment in the business",
        balance: 0,
        isActive: true
      },
      {
        code: "3100",
        name: "Retained Earnings",
        type: "equity",
        description: "Accumulated profits or losses",
        balance: 0,
        isActive: true
      },
      
      // Income Accounts
      {
        code: "4000",
        name: "Sales Revenue",
        type: "income",
        description: "Revenue from sales of goods or services",
        balance: 0,
        isActive: true
      },
      {
        code: "4100",
        name: "Service Revenue",
        type: "income",
        description: "Revenue from providing services",
        balance: 0,
        isActive: true
      },
      
      // Other Income
      {
        code: "4200",
        name: "Interest Income",
        type: "other_income",
        description: "Revenue from interest earned",
        balance: 0,
        isActive: true
      },
      
      // Cost of Goods Sold
      {
        code: "5000",
        name: "Cost of Goods Sold",
        type: "cost_of_goods_sold",
        description: "Direct costs of goods sold",
        balance: 0,
        isActive: true
      },
      
      // Expense Accounts
      {
        code: "5100",
        name: "Salary Expense",
        type: "expenses",
        description: "Employee salaries and wages",
        balance: 0,
        isActive: true
      },
      {
        code: "5200",
        name: "Rent Expense",
        type: "expenses",
        description: "Rent for office or retail space",
        balance: 0,
        isActive: true
      },
      {
        code: "5300",
        name: "Utilities Expense",
        type: "expenses",
        description: "Electricity, water, internet, etc.",
        balance: 0,
        isActive: true
      },
      {
        code: "5400",
        name: "Office Supplies",
        type: "expenses",
        description: "Office supplies and materials",
        balance: 0,
        isActive: true
      }
    ]);
    
    console.log("Default accounts created successfully.");
  } else {
    console.log(`Found ${existingAccounts.length} existing accounts, updating account types...`);
    await updateAccountTypes();
  }
  
  // Check if contacts already exist
  const existingContacts = await db.select().from(contacts);
  if (existingContacts.length === 0) {
    console.log("Creating sample contacts...");
    
    // Create some sample contacts
    await db.insert(contacts).values([
      {
        name: "Acme Corporation",
        type: "customer",
        contactName: "John Smith",
        email: "john@acme.example",
        phone: "555-123-4567",
        address: "123 Business Ave, Commerce City, 12345",
        currency: "USD",
        defaultTaxRate: 8.25,
        documentIds: []
      },
      {
        name: "Tech Supplies Inc.",
        type: "vendor",
        contactName: "Jane Doe",
        email: "jane@techsupplies.example",
        phone: "555-987-6543",
        address: "456 Vendor St, Supplier Town, 54321",
        currency: "USD",
        defaultTaxRate: 0,
        documentIds: []
      },
      {
        name: "Global Services LLC",
        type: "customer",
        contactName: "Robert Johnson",
        email: "robert@globalservices.example",
        phone: "555-456-7890",
        address: "789 Client Rd, Customer City, 67890",
        currency: "USD",
        defaultTaxRate: 7.5,
        documentIds: []
      }
    ]);
    
    console.log("Sample contacts created successfully.");
  } else {
    console.log(`Found ${existingContacts.length} existing contacts, skipping contact creation.`);
  }
  
  console.log("Database seeding completed.");
}

// Export for use in main application
export { seed };

// Run directly if this file is executed directly
if (process.argv[1] === import.meta.url) {
  console.log("Starting seed script...");
  console.log("Import meta URL:", import.meta.url);
  console.log("Process argv[1]:", process.argv[1]);
  
  seed()
    .then(() => {
      console.log("Seed script completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error during seeding:", error);
      process.exit(1);
    });
}