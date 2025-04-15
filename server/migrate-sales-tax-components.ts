import { pool, db } from './db';
import { sql } from 'drizzle-orm';
import { salesTaxSchema, accounts } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Migration script to add sales tax components functionality
 */
async function migrateSalesTaxComponents() {
  console.log('Starting migration to add sales tax component functionality...');

  try {
    // Check if the columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sales_taxes' 
      AND column_name IN ('is_composite', 'parent_id', 'display_order')`;
    
    const { rows: existingColumns } = await pool.query(checkColumnsQuery);
    const existingColumnNames = existingColumns.map(col => col.column_name);
    
    // Add columns if they don't exist
    if (!existingColumnNames.includes('is_composite')) {
      console.log('Adding is_composite column to sales_taxes table...');
      await pool.query(`ALTER TABLE sales_taxes ADD COLUMN is_composite BOOLEAN DEFAULT FALSE`);
    } else {
      console.log('is_composite column already exists. Skipping.');
    }
    
    if (!existingColumnNames.includes('parent_id')) {
      console.log('Adding parent_id column to sales_taxes table...');
      await pool.query(`ALTER TABLE sales_taxes ADD COLUMN parent_id INTEGER REFERENCES sales_taxes(id)`);
    } else {
      console.log('parent_id column already exists. Skipping.');
    }
    
    if (!existingColumnNames.includes('display_order')) {
      console.log('Adding display_order column to sales_taxes table...');
      await pool.query(`ALTER TABLE sales_taxes ADD COLUMN display_order INTEGER DEFAULT 0`);
    } else {
      console.log('display_order column already exists. Skipping.');
    }

    // Check for GST, QST, and Sales Tax Payable accounts by name or code
    const existingQstTaxAccount = await db.select().from(accounts)
      .where(eq(accounts.name, 'QST Payable')).execute();
    const existingGstTaxAccount = await db.select().from(accounts)
      .where(eq(accounts.name, 'GST Payable')).execute();
    const existingSalesTaxAccount = await db.select().from(accounts)
      .where(eq(accounts.name, 'Sales Tax Payable')).execute();
    
    // Also check for accounts with these codes
    const existingCode2100 = await db.select().from(accounts)
      .where(eq(accounts.code, '2100')).execute();
    const existingCode2110 = await db.select().from(accounts)
      .where(eq(accounts.code, '2110')).execute();
    const existingCode2120 = await db.select().from(accounts)
      .where(eq(accounts.code, '2120')).execute();
    
    // Determine the account IDs to use
    let gstAccountId = existingGstTaxAccount.length > 0 ? existingGstTaxAccount[0].id : 
                       (existingCode2110.length > 0 ? existingCode2110[0].id : null);
    let qstAccountId = existingQstTaxAccount.length > 0 ? existingQstTaxAccount[0].id : 
                       (existingCode2120.length > 0 ? existingCode2120[0].id : null);
    let salesTaxAccountId = existingSalesTaxAccount.length > 0 ? existingSalesTaxAccount[0].id : 
                           (existingCode2100.length > 0 ? existingCode2100[0].id : null);
    
    // Create accounts if they don't exist
    if (!gstAccountId) {
      console.log('Creating GST Payable account...');
      // Find an available code for GST Payable
      let gstCode = '2110';
      if (existingCode2110.length > 0) {
        // Find the next available code
        const existingLiabilityCodes = await db.select({ code: accounts.code })
          .from(accounts)
          .where(eq(accounts.type, 'other_current_liabilities'))
          .execute();
        
        // Convert these to numbers and find the max
        const liabilityCodes = existingLiabilityCodes
          .map(a => parseInt(a.code))
          .filter(code => !isNaN(code) && code >= 2000 && code < 3000);
        
        if (liabilityCodes.length > 0) {
          gstCode = String(Math.max(...liabilityCodes) + 1);
        }
      }
      
      const newGstAccount = await db.insert(accounts).values({
        code: gstCode,
        name: 'GST Payable',
        type: 'other_current_liabilities',
        currency: 'CAD',
      }).returning().execute();
      
      gstAccountId = newGstAccount[0].id;
      console.log('Created GST Payable account with ID:', gstAccountId, 'and code:', gstCode);
    } else {
      console.log('Using existing GST Payable account with ID:', gstAccountId);
    }
    
    if (!qstAccountId) {
      console.log('Creating QST Payable account...');
      // Find an available code for QST Payable
      let qstCode = '2120';
      if (existingCode2120.length > 0) {
        // Find the next available code
        const existingLiabilityCodes = await db.select({ code: accounts.code })
          .from(accounts)
          .where(eq(accounts.type, 'other_current_liabilities'))
          .execute();
        
        // Convert these to numbers and find the max
        const liabilityCodes = existingLiabilityCodes
          .map(a => parseInt(a.code))
          .filter(code => !isNaN(code) && code >= 2000 && code < 3000);
        
        if (liabilityCodes.length > 0) {
          qstCode = String(Math.max(...liabilityCodes) + 2);
        }
      }
      
      const newQstAccount = await db.insert(accounts).values({
        code: qstCode,
        name: 'QST Payable',
        type: 'other_current_liabilities',
        currency: 'CAD',
      }).returning().execute();
      
      qstAccountId = newQstAccount[0].id;
      console.log('Created QST Payable account with ID:', qstAccountId, 'and code:', qstCode);
    } else {
      console.log('Using existing QST Payable account with ID:', qstAccountId);
    }
    
    if (!salesTaxAccountId) {
      console.log('Creating Sales Tax Payable account...');
      // Find an available code for Sales Tax Payable
      let salesTaxCode = '2100';
      if (existingCode2100.length > 0) {
        // Find the next available code
        const existingLiabilityCodes = await db.select({ code: accounts.code })
          .from(accounts)
          .where(eq(accounts.type, 'other_current_liabilities'))
          .execute();
        
        // Convert these to numbers and find the max
        const liabilityCodes = existingLiabilityCodes
          .map(a => parseInt(a.code))
          .filter(code => !isNaN(code) && code >= 2000 && code < 3000);
        
        if (liabilityCodes.length > 0) {
          salesTaxCode = String(Math.max(...liabilityCodes) + 3);
        }
      }
      
      const newSalesTaxAccount = await db.insert(accounts).values({
        code: salesTaxCode,
        name: 'Sales Tax Payable',
        type: 'other_current_liabilities',
        currency: 'CAD',
      }).returning().execute();
      
      salesTaxAccountId = newSalesTaxAccount[0].id;
      console.log('Created Sales Tax Payable account with ID:', salesTaxAccountId, 'and code:', salesTaxCode);
    } else {
      console.log('Using existing Sales Tax Payable account with ID:', salesTaxAccountId);
    }
    
    // Create QST+GST composite tax if it doesn't exist
    const existingQstGstTax = await db.select().from(salesTaxSchema)
      .where(eq(salesTaxSchema.name, 'QST+GST')).execute();
    
    if (existingQstGstTax.length === 0) {
      // Create the composite tax
      const compositeTax = await db.insert(salesTaxSchema).values({
        name: 'QST+GST',
        description: 'Quebec Sales Tax (9.975%) + Goods and Services Tax (5%)',
        rate: 14.975, // Combined rate
        accountId: salesTaxAccountId,
        isActive: true,
        isComposite: true,
      }).returning().execute();
      
      const compositeId = compositeTax[0].id;
      console.log('Created QST+GST composite tax with ID:', compositeId);
      
      // Create GST component
      await db.insert(salesTaxSchema).values({
        name: 'GST',
        description: 'Goods and Services Tax',
        rate: 5,
        accountId: gstAccountId,
        isActive: true,
        parentId: compositeId,
        displayOrder: 1,
      }).execute();
      console.log('Created GST component tax');
      
      // Create QST component
      await db.insert(salesTaxSchema).values({
        name: 'QST',
        description: 'Quebec Sales Tax',
        rate: 9.975,
        accountId: qstAccountId,
        isActive: true,
        parentId: compositeId,
        displayOrder: 2,
      }).execute();
      console.log('Created QST component tax');
    } else {
      console.log('QST+GST composite tax already exists. Skipping.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

export default migrateSalesTaxComponents;