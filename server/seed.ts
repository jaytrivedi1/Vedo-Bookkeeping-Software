import { db } from "./db";
import { accounts, contacts } from "@shared/schema";

async function seed() {
  console.log("Seeding database with initial data...");
  
  // Check if accounts already exist
  const existingAccounts = await db.select().from(accounts);
  if (existingAccounts.length === 0) {
    console.log("Creating default accounts...");
    
    // Create default Chart of Accounts
    await db.insert(accounts).values([
      // Asset Accounts
      {
        code: "1000",
        name: "Cash",
        type: "asset",
        description: "Cash on hand and in banking accounts",
        balance: 0,
        isActive: true
      },
      {
        code: "1100",
        name: "Accounts Receivable",
        type: "asset",
        description: "Amounts owed to the company by customers",
        balance: 0,
        isActive: true
      },
      {
        code: "1200",
        name: "Inventory",
        type: "asset",
        description: "Value of goods in inventory",
        balance: 0,
        isActive: true
      },
      
      // Liability Accounts
      {
        code: "2000",
        name: "Accounts Payable",
        type: "liability",
        description: "Amounts owed by the company to suppliers",
        balance: 0,
        isActive: true
      },
      {
        code: "2100",
        name: "Sales Tax Payable",
        type: "liability",
        description: "Sales tax collected but not yet remitted",
        balance: 0,
        isActive: true
      },
      {
        code: "2200",
        name: "Accrued Expenses",
        type: "liability",
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
      {
        code: "4200",
        name: "Interest Income",
        type: "income",
        description: "Revenue from interest earned",
        balance: 0,
        isActive: true
      },
      
      // Expense Accounts
      {
        code: "5000",
        name: "Cost of Goods Sold",
        type: "expense",
        description: "Direct costs of goods sold",
        balance: 0,
        isActive: true
      },
      {
        code: "5100",
        name: "Salary Expense",
        type: "expense",
        description: "Employee salaries and wages",
        balance: 0,
        isActive: true
      },
      {
        code: "5200",
        name: "Rent Expense",
        type: "expense",
        description: "Rent for office or retail space",
        balance: 0,
        isActive: true
      },
      {
        code: "5300",
        name: "Utilities Expense",
        type: "expense",
        description: "Electricity, water, internet, etc.",
        balance: 0,
        isActive: true
      },
      {
        code: "5400",
        name: "Office Supplies",
        type: "expense",
        description: "Office supplies and materials",
        balance: 0,
        isActive: true
      }
    ]);
    
    console.log("Default accounts created successfully.");
  } else {
    console.log(`Found ${existingAccounts.length} existing accounts, skipping account creation.`);
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