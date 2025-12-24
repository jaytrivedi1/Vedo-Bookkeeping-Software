--
-- PostgreSQL database dump
--

\restrict 6XpNJCxIIspqA9JCrVO2kRrnarIuaaeolLuvAPPUfwpRxoXhQ7WabI1yFd0W0lb

-- Dumped from database version 16.11 (b740647)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: neondb_owner
--



--
-- Data for Name: accounting_firms; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.accounts VALUES (32, '1110', 'Accounts Receivable - USD', 'accounts_receivable', 'USD', '', 0, true, 'none');
INSERT INTO public.accounts VALUES (1, '1000', 'Cash', 'bank', 'CAD', '', 26, true, 'none');
INSERT INTO public.accounts VALUES (2, '1100', 'Accounts Receivable', 'accounts_receivable', 'CAD', '', 81864.98, true, 'operating');
INSERT INTO public.accounts VALUES (3, '1200', 'Inventory', 'current_assets', 'CAD', '', 3202, false, 'operating');
INSERT INTO public.accounts VALUES (4, '2000', 'Accounts Payable', 'accounts_payable', 'CAD', '', -3192, true, 'operating');
INSERT INTO public.accounts VALUES (5, '2100', 'Sales Tax Payable', 'other_current_liabilities', 'CAD', '', 257.33017699115055, true, 'operating');
INSERT INTO public.accounts VALUES (6, '2200', 'Accrued Expenses', 'other_current_liabilities', 'CAD', '', 65, true, 'operating');
INSERT INTO public.accounts VALUES (7, '3000', 'Owner''s Equity', 'equity', 'CAD', '', 0, true, 'financing');
INSERT INTO public.accounts VALUES (24, '2110', 'PST Payable', 'other_current_liabilities', 'CAD', '', 0, true, 'operating');
INSERT INTO public.accounts VALUES (34, NULL, 'Accounts Payable - USD', 'accounts_payable', 'USD', NULL, 0, true, 'none');
INSERT INTO public.accounts VALUES (8, '3100', 'Retained Earnings', 'equity', 'CAD', '', 0, true, 'financing');
INSERT INTO public.accounts VALUES (27, '5600', 'Bank charges', 'expenses', 'CAD', '', -33, true, 'operating');
INSERT INTO public.accounts VALUES (9, '4000', 'Sales Revenue', 'income', 'CAD', '', 6378.600000000002, true, 'operating');
INSERT INTO public.accounts VALUES (10, '4100', 'Service Revenue', 'income', 'CAD', '', 1112.5, true, 'operating');
INSERT INTO public.accounts VALUES (11, '4200', 'Interest Income', 'other_income', 'CAD', '', 0, true, 'operating');
INSERT INTO public.accounts VALUES (12, '5000', 'Cost of Goods Sold', 'cost_of_goods_sold', 'CAD', '', 0, true, 'operating');
INSERT INTO public.accounts VALUES (13, '5100', 'Salary Expense', 'expenses', 'CAD', '', -3, true, 'operating');
INSERT INTO public.accounts VALUES (14, '5200', 'Rent Expense', 'expenses', 'CAD', '', -1500, true, 'operating');
INSERT INTO public.accounts VALUES (15, '5300', 'Utilities Expense', 'expenses', 'CAD', '', -1000, true, 'operating');
INSERT INTO public.accounts VALUES (16, '5400', 'Office Supplies', 'expenses', 'CAD', '', -2965.4601769911505, true, 'operating');
INSERT INTO public.accounts VALUES (30, '4300', 'Realized FX Gain', 'other_income', 'USD', NULL, 0, true, 'operating');
INSERT INTO public.accounts VALUES (31, '7100', 'Realized FX Loss', 'other_expense', 'USD', NULL, 0, true, 'operating');
INSERT INTO public.accounts VALUES (28, '5700', 'Meals', 'expenses', 'CAD', '', -36.88, true, 'operating');
INSERT INTO public.accounts VALUES (21, '5500', 'Miscellaneous Expenses', 'expenses', 'CAD', '', -300, true, 'operating');
INSERT INTO public.accounts VALUES (29, '5800', 'Advertising', 'expenses', 'CAD', '', 0, true, 'operating');
INSERT INTO public.accounts VALUES (25, '2120', 'QST Payable', 'other_current_liabilities', 'CAD', '', -49.870000000000005, true, 'operating');
INSERT INTO public.accounts VALUES (17, '1300', 'Office Building', 'current_assets', 'CAD', '', 0, true, 'investing');
INSERT INTO public.accounts VALUES (20, '2400', 'Long-term Loan', 'current_assets', 'CAD', '', 0, true, 'financing');
INSERT INTO public.accounts VALUES (19, '2300', 'Business Credit Card', 'current_assets', 'CAD', '', 0, true, 'none');
INSERT INTO public.accounts VALUES (23, '2500', 'Test Account', 'other_current_liabilities', 'USD', 'TEST', 0, true, 'none');
INSERT INTO public.accounts VALUES (35, NULL, 'Accounts Receivable - EUR', 'accounts_receivable', 'EUR', NULL, 1621.4, true, 'none');
INSERT INTO public.accounts VALUES (22, '1050', 'RBC Bank 0123', 'bank', 'CAD', '', -88115.655, true, 'none');


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.companies VALUES (1, 'My Company Inc.', '123 Main St, City, Country', '4167209432', 'info@vedoaccounting.com', '', '', '/uploads/company-logos/company-1.png', true, true, '2025-04-15 13:50:01.9235', '2025-04-15 13:50:01.9235', 4, '71-200 Veterans Dr', '', 'Brampton', 'Ontario', 'L7A 4S6', 'Canada', 'VED-2WHY694G', NULL, NULL, NULL, NULL);
INSERT INTO public.companies VALUES (4, 'BCD Company', NULL, NULL, NULL, NULL, NULL, NULL, false, false, '2025-11-28 03:15:47.608161', '2025-11-28 03:15:47.608161', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'VED-G86KSE3A', NULL, NULL, NULL, NULL);
INSERT INTO public.companies VALUES (5, 'Open Secrets Inc.', NULL, NULL, NULL, NULL, NULL, NULL, false, false, '2025-12-03 18:22:55.938483', '2025-12-03 18:22:55.938483', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'VED-BWDRVUMZ', NULL, NULL, NULL, NULL);
INSERT INTO public.companies VALUES (3, 'Super Company LLC', NULL, NULL, NULL, NULL, NULL, NULL, false, false, '2025-11-27 13:02:01.469637', '2025-11-27 13:02:01.469637', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'VED-B84RJ4AK', NULL, NULL, NULL, NULL);
INSERT INTO public.companies VALUES (2, 'Super Vanity LLC', NULL, NULL, NULL, NULL, NULL, NULL, false, false, '2025-11-27 04:11:21.035822', '2025-11-27 04:11:21.035822', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'VED-WFVVWASP', NULL, NULL, NULL, NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.users VALUES (2, 'jay@excelfrontbiz.com', 'jay@excelfrontbiz.com', 'ddf07ff39360733c2c7b7fe52cdb65ae462fc72cbd890934e812fccbf5615435da1e60981be31b09df5f16cdfb7c53b10bada1923f1fb57e9450e1921699a8f5.88f801abbf970e1aa47e4991716f8765', 'Jay', 'Trivedi', 'admin', false, NULL, '2025-11-27 03:55:02.924132', '2025-11-27 03:55:02.924132', NULL, NULL, NULL);
INSERT INTO public.users VALUES (3, 'jaytrivedi.ca@gmail.com', 'jaytrivedi.ca@gmail.com', 'ed579889fa4dbf2cf6a71a533950d61e4f385a312da0ba7ae48c0e29b48b5fd6edddf54c35db28457592142e0f32cf0e3a965be01a9ca4ed0977d12a67d70e0d.1d3899c6b0b0b0b50c29a7f8e771105c', 'Jay', 'Trivedi', 'admin', false, NULL, '2025-12-03 18:05:12.930633', '2025-12-03 18:05:12.930633', NULL, NULL, NULL);
INSERT INTO public.users VALUES (4, 'jay@finledger.com', 'jay@finledger.com', 'af8c6b3bb52550810d72c08864111ec45eec1ad825b400be24645fd23fb826b63eff3e06be9f71f2a22e89561a3b41d5142c1b9aa9ac43290511f9f16e01ae95.1068d9db5d40ef2523f500c500c8944d', 'Jay', 'Bhai', 'admin', false, NULL, '2025-12-03 20:13:23.975552', '2025-12-03 20:13:23.975552', NULL, NULL, NULL);
INSERT INTO public.users VALUES (1, 'admin', 'admin@finledger.com', '79d24e95bf6250f9e5d42d9436253cbaff9727d24af31bc886ecdd7d64ddc6ec2af37e6dac613b102e3a238e5c0b124ce223966e7add3f722aad0abf36f7ba76.6a22a5e24d07824e06b6b37fa0325c99', 'System', 'Administrator', 'admin', true, '2025-12-04 16:16:38.237', '2025-10-15 16:12:15.072796', '2025-10-15 16:12:15.072796', NULL, NULL, NULL);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.activity_logs VALUES (1, 1, 'deleted', 'transaction', 338, '{"reference":"1015","type":"invoice","amount":2000,"contactId":13}', '172.31.70.162', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', '2025-11-21 20:55:38.856104');
INSERT INTO public.activity_logs VALUES (2, 1, 'deleted', 'transaction', 278, '{"reference":"X2543","type":"invoice","amount":2825,"contactId":1}', '172.31.70.162', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', '2025-11-21 20:56:18.713426');
INSERT INTO public.activity_logs VALUES (3, 1, 'deleted', 'transaction', 324, '{"reference":"SR-2025-1027-4533","type":"sales_receipt","amount":1695,"contactId":1}', '172.31.70.162', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', '2025-11-21 20:56:33.687516');
INSERT INTO public.activity_logs VALUES (4, 1, 'deleted', 'transaction', 332, '{"reference":"111","type":"expense","amount":565,"contactId":1}', '172.31.70.162', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', '2025-11-21 21:02:24.067177');
INSERT INTO public.activity_logs VALUES (5, 1, 'deleted', 'transaction', 347, '{"reference":"1001","type":"invoice","amount":2260,"contactId":5}', '172.31.97.162', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', '2025-11-28 21:43:20.879203');


--
-- Data for Name: bank_connections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.bank_connections VALUES (1, 'ogkA4GAQ5BuGaEvZPXq4UN7oPeNAl6iRr1Aoj', 'access-sandbox-d8515590-2072-4816-b4f9-75c7ea17257a', 'ins_39', 'RBC Royal Bank', '{jMKoB9oNblt96yaoxl4NsWLP3AwkX3u6K9pm1}', 'active', '2025-11-13 19:21:12.642', NULL, '2025-10-28 18:30:37.646722', '2025-10-28 18:30:37.646722');


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.bank_accounts VALUES (1, 1, 'jMKoB9oNblt96yaoxl4NsWLP3AwkX3u6K9pm1', 'Checking', '7768', 'Plaid checking', 'depository', 'checking', 500, NULL, 22, true, '2025-10-28 18:30:37.727793', '2025-10-28 18:30:37.727793', '2025-11-13 19:21:12.703');


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.contacts VALUES (2, 'Tech Supplies Inc.', 'Jane Doe', 'jane@techsupplies.example', '555-987-6543', '456 Vendor St, Supplier Town, 54321', 'vendor', 'USD', 0, '{}', true);
INSERT INTO public.contacts VALUES (4, 'Splendid Support Inc.', 'Mr. Joe Splendid', 'joe@splendidsupport.com', '4161237890', '', 'customer', 'CAD', 0, '{}', true);
INSERT INTO public.contacts VALUES (6, 'The Customer Company', 'Mr. Customer', 'customer@company.example', '789-456-1230', '111, The Customer Street
Customer City, ON L5J 1S6', 'customer', 'CAD', 0, '{}', true);
INSERT INTO public.contacts VALUES (7, 'Super Supplier Inc.', 'Joseph Super', 'jsuper@supers.com', '905-123-4567', '123 Super Street,
Super City
ON A1A 1A1', 'vendor', 'CAD', 0, '{}', true);
INSERT INTO public.contacts VALUES (5, 'ABC Enterprise Inc.', 'Mr. ABC', 'abc@abc.com', '4161234567', '123, ABC Road
Oakville
ON', 'customer', 'CAD', 0, '{}', true);
INSERT INTO public.contacts VALUES (8, 'Tropical Smoothie Cafe', '', 'trp@cafe.com', '', '', 'vendor', 'CAD', 0, '{}', true);
INSERT INTO public.contacts VALUES (11, 'USA Client Inc.', '', '', '', NULL, 'customer', 'USD', 0, '{}', true);
INSERT INTO public.contacts VALUES (12, 'USA Vendor Inc.', '', '', '', NULL, 'vendor', 'USD', 0, '{}', true);
INSERT INTO public.contacts VALUES (13, 'Europe Customer Inc.', '', '', '', NULL, 'customer', 'EUR', 0, '{}', true);


--
-- Data for Name: sales_taxes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.sales_taxes VALUES (4, 'HST ON', 'Ontario Harmonized Sales Tax', 13, 5, true, false, NULL, 0);
INSERT INTO public.sales_taxes VALUES (1, 'GST', 'Goods and Services Tax', 5, 5, true, false, NULL, 0);
INSERT INTO public.sales_taxes VALUES (5, 'Exempt', '', 0, 5, true, false, NULL, 0);
INSERT INTO public.sales_taxes VALUES (6, 'Out of Scope', '', 0, 5, true, false, NULL, 0);
INSERT INTO public.sales_taxes VALUES (8, 'QST+GST', 'Quebec Sales Tax (9.975%) + Goods and Services Tax (5%)', 14.975, 5, true, true, NULL, 0);
INSERT INTO public.sales_taxes VALUES (19, 'QST', 'Component of QST+GST', 9.975, 25, true, false, 8, 0);
INSERT INTO public.sales_taxes VALUES (20, 'GST', 'Component of QST+GST', 5, 5, true, false, 8, 1);
INSERT INTO public.sales_taxes VALUES (2, 'Sask PST', 'Saskatchewan Provincial Sales Tax', 12, NULL, true, true, NULL, 0);
INSERT INTO public.sales_taxes VALUES (23, 'GST', 'Component of Sask PST', 5, 5, true, false, 2, 0);
INSERT INTO public.sales_taxes VALUES (24, 'PST', 'Component of Sask PST', 7, 24, true, false, 2, 1);


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.transactions VALUES (346, 'DEP-1764197132281', 'deposit', '2025-11-26 22:45:01.672', 'Deposit', 500, 4, 'unapplied_credit', -500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (320, '', 'expense', '2025-10-14 00:00:00', 'COMMERCIAL TAXES EMPTX 6432635', 1, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-10-14 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (321, 'TRF-2025-1023-1673', 'journal_entry', '2025-10-23 18:59:00.034', 'Transfer from RBC Bank 0123 to Cash', 1000, NULL, 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (330, '', 'expense', '2025-10-09 00:00:00', 'Direct Deposits (PDS) service total PAY EMP-VENDOR', 3, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-10-09 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (331, '123', 'expense', '2025-10-29 22:11:46.033', '', 1130, 2, 'completed', NULL, 1000, 130, NULL, 22, '2025-10-29 22:11:46.033', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (270, 'EXP-2025-1002', 'expense', '2025-10-02 15:49:11.279', '', 574.87, 2, 'completed', NULL, 500, 74.87, NULL, 22, '2025-10-02 15:49:11.279', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (272, '', 'expense', '2024-11-08 05:00:00', '', 220, 2, 'completed', NULL, 200, 20, 'bank_transfer', 1, '2024-11-08 05:00:00', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (335, '', 'expense', '2025-10-28 04:00:00', '', 41.67, 8, 'completed', NULL, 36.88, 4.79, NULL, 22, '2025-10-28 04:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (305, 'BILL-0004', 'bill', '2025-10-06 04:00:00', '', 1695, 2, 'open', 1695, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (304, 'BILL-0003', 'bill', '2025-10-01 04:00:00', '', 2260, 2, 'open', 2260, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (316, 'DEP-2025-10-21', 'deposit', '2025-10-21 19:23:26.048', 'Deposit', 378, NULL, 'completed', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (319, '', 'expense', '2025-10-14 00:00:00', 'Misc Payment Wise', 299.97, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-10-14 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (348, NULL, 'deposit', '2025-11-19 05:00:00', 'Deposit Applied to invoice #1001 on 2025-11-28 [Credit restored after invoice #1001 deletion on 2025-11-28]', 500, 5, 'unapplied_credit', -500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (328, '', 'expense', '2025-07-02 00:00:00', 'Bill Payment PAY-FILE FEES', 2, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-07-02 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (306, 'CHQ-1001', 'cheque', '2025-10-10 04:00:00', '', 3000, 2, 'unapplied_credit', -3000, 3000, 0, 'check', 22, '2025-10-10 04:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (323, 'SR-2025-1027-2777', 'journal_entry', '2025-10-27 21:43:12.777', 'Sales Receipt SR-2025-1027-2777', 2100, 5, 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (254, 'A-101', 'bill', '2025-09-15 04:00:00', '', 315, 7, 'open', 315, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (326, '', 'expense', '2025-06-02 00:00:00', 'Bill Payment PAY-FILE FEES', 2, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-06-02 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (327, '', 'expense', '2025-08-01 00:00:00', 'Bill Payment PAY-FILE FEES', 2, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-08-01 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (329, '', 'expense', '2025-10-01 00:00:00', 'Bill Payment PAY-FILE FEES', 2, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-10-01 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (325, '', 'expense', '2025-09-02 00:00:00', 'Bill Payment PAY-FILE FEES', 4, NULL, 'completed', NULL, NULL, NULL, NULL, 22, '2025-09-02 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.transactions VALUES (344, NULL, 'expense', '2025-11-13 00:00:00', 'CASH APP TRANSFER', 30, NULL, 'completed', NULL, NULL, NULL, 'bank_transfer', 22, '2025-11-13 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: imported_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.imported_transactions VALUES (1, NULL, NULL, '2025-06-02 00:00:00', NULL, 'Monthly fee ', NULL, -6, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (174, 1, 'MeBkvzk675h9KWvG4lAgT1vMQZVq43ULXvRRb', '2025-10-30 00:00:00', '2025-10-30 00:00:00', '20 AMAZON - LEN N', 'Amazon', -14.470418, 'USD', '{}', true, 'online', NULL, 'unmatched', '2025-10-30 22:07:57.034258', '2025-10-30 22:07:57.034258', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (3, NULL, NULL, '2025-06-02 00:00:00', NULL, 'Pay Employee-Vendor OFI002@00.85', NULL, -1.7, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (4, NULL, NULL, '2025-06-05 00:00:00', NULL, 'Online transfer received - 0917 ', NULL, 226, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (5, NULL, NULL, '2025-06-05 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 599.67, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (6, NULL, NULL, '2025-06-06 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (7, NULL, NULL, '2025-06-09 00:00:00', NULL, 'e-Transfer - Autodeposit BYERS DATA DRIVEN MARKETING (BDDM) INC', NULL, 673.48, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (8, NULL, NULL, '2025-06-12 00:00:00', NULL, 'Online Banking payment - 4542 RBC MASTERCARD', NULL, -217.56, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (9, NULL, NULL, '2025-06-12 00:00:00', NULL, 'Online Banking transfer - 1528 ', NULL, -909.87, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (10, NULL, NULL, '2025-06-13 00:00:00', NULL, 'Account Payable Pmt UZADO INC.', NULL, 3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (11, NULL, NULL, '2025-06-16 00:00:00', NULL, 'e-Transfer - Autodeposit PAYMENTS MEDIA SOLUTIONS CANADA INC.', NULL, 508.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (12, NULL, NULL, '2025-06-16 00:00:00', NULL, 'e-Transfer - Autodeposit INVENTCANADA INNOVATIONS INC.', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (13, NULL, NULL, '2025-06-16 00:00:00', NULL, 'Mobile cheque deposit -     0796 ', NULL, 723.2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (14, NULL, NULL, '2025-06-23 00:00:00', NULL, 'e-Transfer - Autodeposit carolyn', NULL, 734.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (15, NULL, NULL, '2025-06-23 00:00:00', NULL, 'Misc Payment Wise', NULL, -201.18, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (16, NULL, NULL, '2025-06-30 00:00:00', NULL, 'e-Transfer - Autodeposit JUICERVILLE ENTERPRISE INC.', NULL, 2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (17, NULL, NULL, '2025-06-30 00:00:00', NULL, 'Misc Payment CARBOCLAVE CORP', NULL, 508.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (18, NULL, NULL, '2025-06-30 00:00:00', NULL, 'COMMERCIAL TAXES GST-P 7412289', NULL, -1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (19, NULL, NULL, '2025-07-02 00:00:00', NULL, 'Monthly fee ', NULL, -6, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (21, NULL, NULL, '2025-07-02 00:00:00', NULL, 'Pay Employee-Vendor OFI001@00.85', NULL, -0.85, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (22, NULL, NULL, '2025-07-03 00:00:00', NULL, 'Online Banking payment - 2654 RBC MASTERCARD', NULL, -152.28, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (23, NULL, NULL, '2025-07-03 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (24, NULL, NULL, '2025-07-03 00:00:00', NULL, 'Online Banking transfer - 9681 ', NULL, -1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (25, NULL, NULL, '2025-07-03 00:00:00', NULL, 'e-Transfer - Autodeposit VIRTUALINK PROPERTIES INC.', NULL, 500, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (26, NULL, NULL, '2025-07-03 00:00:00', NULL, 'Misc Payment Wise', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (27, NULL, NULL, '2025-07-07 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 598.26, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (28, NULL, NULL, '2025-07-07 00:00:00', NULL, 'e-Transfer - Autodeposit WHITBY MARINE PRODUCTS INC', NULL, 2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (29, NULL, NULL, '2025-07-07 00:00:00', NULL, 'Online transfer received - 0970 ', NULL, 226, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (30, NULL, NULL, '2025-07-08 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (31, NULL, NULL, '2025-07-09 00:00:00', NULL, 'Account Payable Pmt UZADO INC.', NULL, 3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (32, NULL, NULL, '2025-07-11 00:00:00', NULL, 'e-Transfer - Autodeposit BYERS DATA DRIVEN MARKETING (BDDM) INC', NULL, 168.37, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (33, NULL, NULL, '2025-07-17 00:00:00', NULL, 'e-Transfer - Autodeposit ROCKET SCIENCE MULTIMEDIA LTD', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (34, NULL, NULL, '2025-07-18 00:00:00', NULL, 'e-Transfer - Autodeposit carolyn', NULL, 734.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (35, NULL, NULL, '2025-07-22 00:00:00', NULL, 'e-Transfer - Autodeposit Darren Portelli', NULL, 452, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (36, NULL, NULL, '2025-07-23 00:00:00', NULL, 'Mobile cheque deposit -     5078 ', NULL, 723.2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (37, NULL, NULL, '2025-07-23 00:00:00', NULL, 'COMMERCIAL TAXES GST-P 2280207', NULL, -213.97, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (38, NULL, NULL, '2025-07-25 00:00:00', NULL, 'Misc Payment CARBOCLAVE CORP', NULL, 169.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (39, NULL, NULL, '2025-07-25 00:00:00', NULL, 'e-Transfer - Autodeposit ZEROBETA INC.', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (40, NULL, NULL, '2025-07-31 00:00:00', NULL, 'e-Transfer - Autodeposit LAL VENTURES INC.', NULL, 2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (41, NULL, NULL, '2025-08-01 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (42, NULL, NULL, '2025-08-01 00:00:00', NULL, 'Monthly fee ', NULL, -6, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (44, NULL, NULL, '2025-08-01 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (45, NULL, NULL, '2025-08-01 00:00:00', NULL, 'Pay Employee-Vendor OFI001@00.85', NULL, -0.85, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (46, NULL, NULL, '2025-08-04 00:00:00', NULL, 'COMMERCIAL TAXES GST-P 1513440', NULL, -7, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (47, NULL, NULL, '2025-08-04 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (48, NULL, NULL, '2025-08-05 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -175, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (49, NULL, NULL, '2025-08-05 00:00:00', NULL, 'Online transfer received - 9079 ', NULL, 226, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (50, NULL, NULL, '2025-08-07 00:00:00', NULL, 'Account Payable Pmt UZADO INC.', NULL, 3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (51, NULL, NULL, '2025-08-07 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (52, NULL, NULL, '2025-08-07 00:00:00', NULL, 'Online Banking transfer - 8341 ', NULL, -1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (53, NULL, NULL, '2025-08-08 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 543.84, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (54, NULL, NULL, '2025-08-11 00:00:00', NULL, 'e-Transfer - Autodeposit SAUROV CPA PROFESSIONAL CORPORATION', NULL, 2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (55, NULL, NULL, '2025-08-14 00:00:00', NULL, 'COMMERCIAL TAXES EMPTX 1512935', NULL, -20.95, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (56, NULL, NULL, '2025-08-18 00:00:00', NULL, 'e-Transfer - Autodeposit carolyn', NULL, 734.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (57, NULL, NULL, '2025-08-18 00:00:00', NULL, 'e-Transfer - Autodeposit Darren Portelli', NULL, 452, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (58, NULL, NULL, '2025-08-18 00:00:00', NULL, 'Misc Payment Wise', NULL, -167.13, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (20, NULL, NULL, '2025-07-02 00:00:00', NULL, 'Bill Payment PAY-FILE FEES', NULL, -2, 'USD', NULL, false, NULL, 328, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (59, NULL, NULL, '2025-08-25 00:00:00', NULL, 'Misc Payment Wise', NULL, -2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (60, NULL, NULL, '2025-08-29 00:00:00', NULL, 'Mobile cheque deposit -     9067 ', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (61, NULL, NULL, '2025-09-02 00:00:00', NULL, 'Monthly fee ', NULL, -6, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (63, NULL, NULL, '2025-09-02 00:00:00', NULL, 'Pay Employee-Vendor OFI004@00.85', NULL, -3.4, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (64, NULL, NULL, '2025-09-03 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (65, NULL, NULL, '2025-09-04 00:00:00', NULL, 'Online Banking payment - 4306 RBC MASTERCARD', NULL, -136.34, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (66, NULL, NULL, '2025-09-04 00:00:00', NULL, 'Online Banking transfer - 6495 ', NULL, -1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (67, NULL, NULL, '2025-09-05 00:00:00', NULL, 'Online transfer received - 9115 ', NULL, 226, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (68, NULL, NULL, '2025-09-05 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 543.84, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (69, NULL, NULL, '2025-09-08 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (70, NULL, NULL, '2025-09-08 00:00:00', NULL, 'Misc Payment Wise', NULL, -166.28, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (71, NULL, NULL, '2025-09-08 00:00:00', NULL, 'e-Transfer - Autodeposit BYERS DATA DRIVEN MARKETING (BDDM) INC', NULL, 168.37, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (72, NULL, NULL, '2025-09-10 00:00:00', NULL, 'Misc Payment CARBOCLAVE CORP', NULL, 169.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (73, NULL, NULL, '2025-09-11 00:00:00', NULL, 'e-Transfer - Autodeposit BLUE COG SOFTWARE INC', NULL, 2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (74, NULL, NULL, '2025-09-12 00:00:00', NULL, 'e-Transfer - Autodeposit CODEPXLS INC.', NULL, 339, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (76, NULL, NULL, '2025-09-15 00:00:00', NULL, 'e-Transfer - Autodeposit Darren Portelli', NULL, 904, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (77, NULL, NULL, '2025-09-16 00:00:00', NULL, 'Account Payable Pmt UZADO INC.', NULL, 3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (78, NULL, NULL, '2025-09-16 00:00:00', NULL, 'e-Transfer - Autodeposit CHIBUIKEM EUGENE ONUOHA (SWIFTCORE TECHN', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (81, NULL, NULL, '2025-09-29 00:00:00', NULL, 'e-Transfer - Autodeposit GYASI CONSULTING INC.', NULL, 2, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (82, NULL, NULL, '2025-10-01 00:00:00', NULL, 'e-Transfer - Autodeposit Jay', NULL, 395.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (83, NULL, NULL, '2025-10-01 00:00:00', NULL, 'Monthly fee ', NULL, -6, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (86, NULL, NULL, '2025-10-06 00:00:00', NULL, 'e-Transfer - Autodeposit ZEROBETA INC.', NULL, 1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (87, NULL, NULL, '2025-10-06 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (88, NULL, NULL, '2025-10-06 00:00:00', NULL, 'e-Transfer - Autodeposit LAL VENTURES INC.', NULL, 339, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (89, NULL, NULL, '2025-10-06 00:00:00', NULL, 'Online Banking transfer - 6772 ', NULL, -1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (90, NULL, NULL, '2025-10-06 00:00:00', NULL, 'Online transfer received - 8999 ', NULL, 226, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (91, NULL, NULL, '2025-10-07 00:00:00', NULL, 'Account Payable Pmt UZADO INC.', NULL, 3, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (92, NULL, NULL, '2025-10-07 00:00:00', NULL, 'Misc Payment STRIPE', NULL, 543.84, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (93, NULL, NULL, '2025-10-08 00:00:00', NULL, 'e-Transfer - Autodeposit RAJESH KUMAR BHAGAT', NULL, 734.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (97, NULL, NULL, '2025-10-14 00:00:00', NULL, 'COMMERCIAL TAXES EMPTX 6432635', NULL, -1, 'USD', NULL, false, NULL, 320, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (120, 1, 'Q1anwdn6J5Iekq4mEMLJUjWLZ5d9XliBVMxpv', '2025-10-19 00:00:00', '2025-10-18 00:00:00', 'Panera Bread', 'Panera Bread', -15.466949, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:45.909606', '2025-10-28 18:30:45.909606', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (121, 1, 'jMKoB9oNblt96yaoxl4NsWL1QVPyveS9eM5yp', '2025-10-18 00:00:00', '2025-10-17 00:00:00', '3947558 VISA PURCHASE PLAYSTUD 07057808 TAYLOR MI 8840321 748', NULL, -3, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:46.033192', '2025-10-28 18:30:46.033192', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (80, NULL, NULL, '2025-09-26 00:00:00', NULL, 'e-Transfer - Autodeposit carolyn', NULL, 734.5, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (95, NULL, NULL, '2025-10-14 00:00:00', NULL, 'e-Transfer - Autodeposit JUICERVILLE ENTERPRISE INC.', NULL, 1, 'USD', NULL, false, NULL, NULL, 'deleted', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (94, NULL, NULL, '2025-10-09 00:00:00', NULL, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', NULL, -3, 'USD', NULL, false, NULL, 330, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (85, NULL, NULL, '2025-10-01 00:00:00', NULL, 'Pay Employee-Vendor OFI002@00.85', NULL, -1.7, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (175, 1, '1jDndqn5l1i7VeyWMZRjsQyzR7vp64ip9RPPQ', '2025-10-30 00:00:00', '2025-10-30 00:00:00', 'EMPOWER E 371025 NY 81 7221918 32 DDA PURCHASE', 'Empower', -13.421385, 'USD', '{}', true, 'other', NULL, 'unmatched', '2025-10-30 22:07:57.241768', '2025-10-30 22:07:57.241768', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (176, 1, 'ZKG3XZ36q5Ckg4DGa7dxHBDmwkPK9MCeap11w', '2025-10-30 00:00:00', '2025-10-30 00:00:00', 'Withdrawal to 808 Savings 19917071496', NULL, -64, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-30 22:07:57.541718', '2025-10-30 22:07:57.541718', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (75, NULL, NULL, '2025-09-12 00:00:00', NULL, 'COMMERCIAL TAXES EMPTX 3032495', NULL, -1, 'USD', NULL, false, NULL, NULL, 'unmatched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (96, NULL, NULL, '2025-10-14 00:00:00', NULL, 'Misc Payment Wise', NULL, -299.97, 'USD', NULL, false, NULL, 319, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (79, NULL, NULL, '2025-09-26 00:00:00', NULL, 'e-Transfer - Autodeposit RAJESH KUMAR BHAGAT', NULL, 706.25, 'USD', NULL, false, NULL, NULL, 'deleted', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (130, 1, 'Bzg7EM7AR6CLRzm86eP1SM1QVNGBkqtalWP7k', '2025-10-07 00:00:00', '2025-10-06 00:00:00', 'POS PUR 449399193 04/07 TIMESTAMP THE PIZZA PLACE 4205 NEW YORK NY 634330', 'The Pizza Place', -2.8096795, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:47.118479', '2025-10-28 18:30:47.118479', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (131, 1, 'qEanPGnMRxtWGwEpPRrjSBrLa1Jeg4Cx3maJN', '2025-10-06 00:00:00', '2025-10-05 00:00:00', '60904 PURCHASE-SIG 09/21 TIMESTAMP UPLIFT RE 9123348 562542 SC 63432961 3968766', 'Uplift', -20.519363, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:47.238959', '2025-10-28 18:30:47.238959', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (135, 1, 'KjrgvKg6n5ipdjBwNZD7fxjXADPyVKcJQZP6m', '2025-10-06 00:00:00', '2025-10-05 00:00:00', 'Walmart', 'Walmart', -6.2822237, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:47.724524', '2025-10-28 18:30:47.724524', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (249, 1, 'Q1anwdn6J5Iekq4mEMLnIPeelmnovxiw4zwPE', '2025-11-08 00:00:00', '2025-11-08 00:00:00', 'Klover app boost', 'Klover App', 5, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:12.124559', '2025-11-12 00:07:12.124559', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (84, NULL, NULL, '2025-10-01 00:00:00', NULL, 'Bill Payment PAY-FILE FEES', NULL, -2, 'USD', NULL, false, NULL, 329, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (250, 1, 'PMdGvxG6b5tbAlKQdkDnIN33aQwdRpfoBJoLG', '2025-11-08 00:00:00', '2025-11-08 00:00:00', 'POS PURCHASE CASEYS 04245 07743 RM ARDMORE OK 829', NULL, -6.982434, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:12.301349', '2025-11-12 00:07:12.301349', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (251, 1, '71Wr7xrmpEIveXLyPjk8S7QQAKprmBcdAjdbm', '2025-11-08 00:00:00', '2025-11-08 00:00:00', 'Popeyes', 'Popeyes', -8.184456, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:12.47937', '2025-11-12 00:07:12.47937', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (252, 1, 'Q1anwdn6J5Iekq4mEMLeu7DZnrJj1PIwM8AeB', '2025-11-08 00:00:00', '2025-11-07 00:00:00', 'WITHDRAWAL DEBIT CARD BONUS POINTS KAISER''S PIZZA & PU #06346 AL DATE 12/10 CARD 336 40 MERCHANT CATEGORY CODE : 7346019', 'Points Kaiser''s Pizza & Pu', -97, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:12.656476', '2025-11-12 00:07:12.656476', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (157, 1, 'qEanPGnMRxtWGwEpPRrjSk76ybgjRBt6j1omB', '2025-10-29 00:00:00', '2025-10-28 00:00:00', '72116609 POS PURCHASE EARNIN RE SC 6 721582259', 'Earnin', -58, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-29 22:26:33.952373', '2025-10-29 22:26:33.952373', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (270, 1, 'WEerv7rVR5tk7x4MD9oph7Ro7WgW96s6ARken', '2025-11-13 00:00:00', '2025-11-13 00:00:00', 'EmpsubscrXX/XX', NULL, -7.6611557, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-13 19:21:05.23029', '2025-11-13 19:21:05.23029', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (148, 1, 'b497vG7rxJCGzEy8kvKrUzvygX8xrnfPex5G4', '2025-10-02 00:00:00', '2025-10-01 00:00:00', 'Food Lion', 'Food Lion', -143.92996, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:49.283852', '2025-10-28 18:30:49.283852', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (142, 1, 'vz7KZwKyqPCEq1V3JBdrSWpJqE1bZaSJdzjoz', '2025-10-03 00:00:00', '2025-10-02 00:00:00', 'Albertsons', 'Albertsons', -76.018364, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:48.564192', '2025-10-28 18:30:48.564192', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (173, 1, 'MeBkvzk675h9KWvG4lAPcENeo1B5oBfLKNqXg', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'Tropical Smoothie Cafe', 'Tropical Smoothie Cafe', -41.668015, 'USD', '{}', false, 'in store', 335, 'matched', '2025-10-30 12:22:05.132516', '2025-10-30 22:03:47.134', 'plaid', 22, 'expense', NULL, true, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (271, 1, 'x3Zz1Gzyr7CXgVaWMK4DHVQv3GBJKXu61xlbq', '2025-11-13 00:00:00', '2025-11-13 00:00:00', 'Overdraft Protection Deposit', NULL, 618, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-13 19:21:05.412232', '2025-11-13 19:21:05.412232', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (272, 1, 'b497vG7rxJCGzEy8kvKqTXEjX1g1byFmylXAQ', '2025-11-13 00:00:00', '2025-11-13 00:00:00', 'PHILLIPS 66 HWY 6 - CHECK #961', NULL, -171.99315, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-13 19:21:05.593348', '2025-11-13 19:21:05.593348', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (273, 1, 'no3WaGWe5ziGEydJ9mlpTlVRldMdq4tApoj1N', '2025-11-13 00:00:00', '2025-11-13 00:00:00', 'VOLA VOLA ACH ENTRY MEMO POSTED TODAY', 'Vola Finance', -50, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-13 19:21:05.822922', '2025-11-13 19:21:05.822922', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (274, 1, 'k1rg36gPyqI64EWnkZNws4JwxkZkj1FL6vwoE', '2025-11-12 00:00:00', '2025-11-11 00:00:00', '7-Eleven', '7-Eleven', -46.25297, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-13 19:21:06.010884', '2025-11-13 19:21:06.010884', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (177, 1, 'vz7KZwKyqPCEq1V3JBdQcVG7pNwDeeiqbn7Ex', '2025-10-31 00:00:00', '2025-10-30 00:00:00', '20 AMAZON - LEN N', 'Amazon', -14.470418, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-31 13:59:03.748162', '2025-10-31 13:59:03.748162', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (178, 1, '6M1Kj3K5g8tB4bd19qozH9LgNRwAZZS8QbAy5', '2025-10-31 00:00:00', '2025-10-31 00:00:00', 'CASH APP TRANSFER', NULL, -21, 'USD', '{}', true, 'other', NULL, 'unmatched', '2025-10-31 13:59:03.8743', '2025-10-31 13:59:03.8743', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (179, 1, 'RL4bvab685tQDKRZ4l1ktepRBq4WggCaNX1By', '2025-10-31 00:00:00', '2025-10-30 00:00:00', 'EMPOWER E 371025 NY 81 7221918 32 DDA PURCHASE', 'Empower', -13.421385, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-31 13:59:03.989799', '2025-10-31 13:59:03.989799', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (180, 1, 'D39QALQ685CE1W6AvwLMc5bGrPLBKKi3NEpkl', '2025-10-31 00:00:00', '2025-10-31 00:00:00', 'FANDUEL INC STARDUST', NULL, 519.6777, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-31 13:59:04.117263', '2025-10-31 13:59:04.117263', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (181, 1, 'XlDkvek685FbwAp3JWgvFGeZaXvNppHbkPl3r', '2025-10-31 00:00:00', '2025-10-31 00:00:00', 'WEIGELS 03/23 # 588398765 PURCHASE 257 ARLINGTON AV JEFFERSON', NULL, -37, 'USD', '{}', true, 'in store', NULL, 'unmatched', '2025-10-31 13:59:04.247272', '2025-10-31 13:59:04.247272', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (182, 1, 'zdE3pG3VmQtMAbWlJrPbt7XQwv7KNJClXr8vj', '2025-11-05 00:00:00', '2025-11-05 00:00:00', 'American Express Credit Card', NULL, -451, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:31.306127', '2025-11-06 02:01:31.306127', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (183, 1, 'aaLjv8jKe5iKkArDEMq3SAqlG1MlMgSZDV7Lw', '2025-11-05 00:00:00', '2025-11-05 00:00:00', 'CASH APP TRANSFER', NULL, -99.39966, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:31.496049', '2025-11-06 02:01:31.496049', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (184, 1, 'PMdGvxG6b5tbAlKQdkD9TBDbmRkbkMFoAV7Zb', '2025-11-05 00:00:00', '2025-11-05 00:00:00', 'Kwik Trip', 'Trip', -3.9330208, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:31.678119', '2025-11-06 02:01:31.678119', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (185, 1, 'dPAQvkQBw5ikMoXP5QzaSlRrADQrQ7tJRrZeN', '2025-11-05 00:00:00', '2025-11-05 00:00:00', 'Netflix', 'Netflix', -17.478123, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:31.860417', '2025-11-06 02:01:31.860417', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (186, 1, 'jMKoB9oNblt96yaoxl4pUM4ngZrnr1F6al1qo', '2025-11-05 00:00:00', '2025-11-05 00:00:00', 'POINT OF SALE WITHDRAWAL ETSY R XWKS 2695897 NORTH FIRST STREETSAN JOSE', 'Etsy', -27.365015, 'USD', '{}', true, 'online', NULL, 'unmatched', '2025-11-06 02:01:32.038064', '2025-11-06 02:01:32.038064', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (187, 1, 'NQ3WvBW6R5Cw3W1RLjDlUMJoNEjojWFyQkWmz', '2025-11-05 00:00:00', '2025-11-05 00:00:00', 'TRANSFER MoneyLion Instacash', 'MoneyLion', 214, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:32.215895', '2025-11-06 02:01:32.215895', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (188, 1, 'MeBkvzk675h9KWvG4lARh1lzxRELRmcNpaWdP', '2025-11-04 00:00:00', '2025-11-03 00:00:00', 'Amazon Prime', 'Amazon Prime', -17.78836, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:32.393773', '2025-11-06 02:01:32.393773', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (189, 1, 'vz7KZwKyqPCEq1V3JBd1CbPGxDonaxcv3BEKr', '2025-11-04 00:00:00', '2025-11-04 00:00:00', 'Autosave Savings 69426663278', NULL, -69.83455, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:32.584374', '2025-11-06 02:01:32.584374', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (190, 1, 'L7z8vr86V5hbAnWjNQkosGQ18MxXMEhqKZxVE', '2025-11-04 00:00:00', '2025-11-04 00:00:00', 'FANDUEL INC STARDUST', NULL, 519.6777, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:32.767444', '2025-11-06 02:01:32.767444', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (191, 1, 'XlDkvek685FbwAp3JWgAc61e8NqkB8i1WN3Xq', '2025-11-04 00:00:00', '2025-11-04 00:00:00', 'Klover app boost', 'Klover App', 5, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:32.951247', '2025-11-06 02:01:32.951247', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (192, 1, '1jDndqn5l1i7VeyWMZRAIQJxjGw8GaSNX6kAo', '2025-11-04 00:00:00', '2025-11-04 00:00:00', 'RECURRING DEBIT CARD 889455596 DNHGODADDYCOM 962724152', NULL, -38.858063, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:33.145492', '2025-11-06 02:01:33.145492', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (193, 1, '6M1Kj3K5g8tB4bd19qobUbKLWAyv8Wc1opylp', '2025-11-04 00:00:00', '2025-11-04 00:00:00', 'SPRINT * BILL PA REF 2 TX CARD 73051161', 'Sprint', -61, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:33.340053', '2025-11-06 02:01:33.340053', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (194, 1, 'ZKG3XZ36q5Ckg4DGa7dqUB7aLAZ3AWcPmZEdV', '2025-11-04 00:00:00', '2025-11-03 00:00:00', 'VOLA VOLA ACH ENTRY MEMO POSTED TODAY', 'Vola Finance', -105.34121, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:33.523722', '2025-11-06 02:01:33.523722', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (195, 1, 'RL4bvab685tQDKRZ4l1Ku5PpNWwnJNtPvWBqB', '2025-11-04 00:00:00', '2025-11-04 00:00:00', 'Withdrawal to Simply Checking 3529455836', NULL, -1642, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:33.70193', '2025-11-06 02:01:33.70193', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (196, 1, 'aaLjv8jKe5iKkArDEMqbFkgKBMNl8gUZ9lZDj', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'BUSINESS TO BUSINESS ACH PETAL CARD INC iXcBC86263 175292', NULL, -66, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:33.880902', '2025-11-06 02:01:33.880902', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (197, 1, 'L7z8vr86V5hbAnWjNQkos9LVoQ79V1fk6D4ZK', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'DEBIT CARD PURCHASE MADISON DELI 198 ECOMM HTTPS : PROD. 3TTAZ', NULL, -13, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:34.062499', '2025-11-06 02:01:34.062499', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (198, 1, '3eDm4rmoKphN9dKbaMkphkRpw1nAPRUZaKZE5', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'Delta Air Lines', 'Delta Air Lines', -81, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:34.242778', '2025-11-06 02:01:34.242778', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (199, 1, '1jDndqn5l1i7VeyWMZR1uDeqBQnw4atpwDPjk', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'MERCHANT PAYMENT RACETRAC - 12310 US HIGHWAY 301 9 WEST DADE CITY FL ON 295482 FROM CARD : 01011', 'RaceTrac', -5, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:34.467839', '2025-11-06 02:01:34.467839', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (200, 1, 'MeBkvzk675h9KWvG4lA1C6gBN1oE3mtLomR6K', '2025-11-03 00:00:00', '2025-11-02 00:00:00', 'STASH TRANSFER', 'Stash', -38.826084, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:34.646439', '2025-11-06 02:01:34.646439', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (201, 1, 'Bzg7EM7AR6CLRzm86ePXugQ5N8aAGQs4G64ga', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'Shoe Carnival', NULL, -119.16473, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:34.823092', '2025-11-06 02:01:34.823092', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (202, 1, '8L8zedzApktwEJ6Pk3KzhlEQoLMlQAcW7dQDy', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'Starbucks', 'Starbucks', -84.29, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:35.014236', '2025-11-06 02:01:35.014236', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (203, 1, 'x3Zz1Gzyr7CXgVaWMK4kuVgvmeP5xEu6EQK4j', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:35.196789', '2025-11-06 02:01:35.196789', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (275, 1, 'vz7KZwKyqPCEq1V3JBdniLE3ya3QzMiq3kPWq', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 'DEBIT CARD DEBIT KLARNA R', 'Klarna', -64.515434, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-13 19:21:06.194894', '2025-11-13 19:21:06.194894', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (204, 1, '4QglNzlDroC5gp3A6zRmFXopg5Mk7ofJxNJLj', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 'TRANSFER Earnin Trans Money Transf CA CARD4998', 'Earnin', 98, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:35.375565', '2025-11-06 02:01:35.375565', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (205, 1, 'k1rg36gPyqI64EWnkZNvcejxrjMNzGUJVZxXZ', '2025-11-02 00:00:00', '2025-11-02 00:00:00', 'DBT CRD 210285213 5 ONLY FANS NY 0', NULL, -17.089108, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:35.558758', '2025-11-06 02:01:35.558758', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (206, 1, 'MeBkvzk675h9KWvG4lAwIarVVW8oWpH4e4Dam', '2025-11-02 00:00:00', '2025-11-02 00:00:00', 'McDonald''s', 'McDonald''s', -113.18486, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:35.736463', '2025-11-06 02:01:35.736463', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (207, 1, '5Z1qPBqRogCRy749MZvdIo7xP7g1ydUGPNx9k', '2025-11-02 00:00:00', '2025-11-02 00:00:00', 'Sam''s Club', 'Sam''s', -173.61632, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:35.914127', '2025-11-06 02:01:35.914127', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (208, 1, 'wBerMGrwKjCGzor3MXavT4BXGBLzWbiE7WgJB', '2025-11-02 00:00:00', '2025-11-02 00:00:00', 'Uber Eats', 'Uber Eats', -86.69915, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:36.099439', '2025-11-06 02:01:36.099439', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (209, 1, 'D39QALQ685CE1W6AvwL4HgJKaJ8MpeU4P6zb9', '2025-11-02 00:00:00', '2025-11-02 00:00:00', 'Walmart', 'Walmart', -9.624247, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:36.281509', '2025-11-06 02:01:36.281509', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (2, NULL, NULL, '2025-06-02 00:00:00', NULL, 'Bill Payment PAY-FILE FEES', NULL, -2, 'USD', NULL, false, NULL, 326, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (43, NULL, NULL, '2025-08-01 00:00:00', NULL, 'Bill Payment PAY-FILE FEES', NULL, -2, 'USD', NULL, false, NULL, 327, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (62, NULL, NULL, '2025-09-02 00:00:00', NULL, 'Bill Payment PAY-FILE FEES', NULL, -4, 'USD', NULL, false, NULL, 325, 'matched', '2025-10-15 22:53:29.844716', '2025-10-15 22:53:29.844716', 'csv', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (210, 1, 'geL1KG1db5hEmnL8Mx55i9PrnLV8KWTLo11XE', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'CHECKCARD 90597 BASKIN-ROBBINS - 4357427 - ROSEMEAD CA 3518647', 'Baskin-Robbins', -108.30432, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:36.457367', '2025-11-06 02:01:36.457367', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (211, 1, 'zdE3pG3VmQtMAbWlJrPxhQkQE4ErLnuw9MGkg', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'H&R Block', NULL, 3248.059, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:36.634775', '2025-11-06 02:01:36.634775', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (212, 1, 'ZKG3XZ36q5Ckg4DGa7dAI3N3l4lnvgIr5PjZJ', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'Jimmy John''s', 'Jimmy John''s', -174.83548, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:36.812242', '2025-11-06 02:01:36.812242', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (213, 1, 'yxZBLXByVeu95EQrRkN3HwQgZ9PW1zU4QMRAM', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'LRM CLAIMS ADJ DR SIG-009217283661', NULL, -761, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:36.988734', '2025-11-06 02:01:36.988734', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (214, 1, 'L7z8vr86V5hbAnWjNQkkfA1vKBkWm7Ue7aaJg', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'ORIG CO NAME:Rocket Savings CO ENTRY DESCR:Deposit SEC:WEB IND ID:48859733711 ORIG ID:9097253681', 'Rocket Money', -21.54441, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:37.165625', '2025-11-06 02:01:37.165625', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (145, 1, 'XlDkvek685FbwAp3JWgPIwa5yQm6EBhJa645a', '2025-10-03 00:00:00', '2025-10-02 00:00:00', 'TOPGOLF 1010 GREENWOOD BLVD', 'Topgol', -16, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:48.927419', '2025-10-28 18:30:48.927419', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (146, 1, 'RL4bvab685tQDKRZ4l1eU7BMvdy5oJcMElKzj', '2025-10-03 00:00:00', '2025-10-02 00:00:00', 'Venmo', NULL, -145.08855, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:49.045126', '2025-10-28 18:30:49.045126', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (215, 1, 'MeBkvzk675h9KWvG4lAAuJznpowe53C4Kyyo5', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'PRE-AUTHORIZATION DEBIT AT OLIVE GARDE 997319147 ERIE PA ON 800339376 FROM CARD : 163838', 'Olive Garden', -17.344067, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:37.343034', '2025-11-06 02:01:37.343034', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (216, 1, 'Q1anwdn6J5Iekq4mEMLAs1K1EqEw8jt3xZdbw', '2025-11-01 00:00:00', '2025-10-31 00:00:00', 'PROGRESSIVE LEASING R 56 73809', 'Progressive Leasing', -380.7424, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:37.521287', '2025-11-06 02:01:37.521287', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (217, 1, '1jDndqn5l1i7VeyWMZRRimxKWnX9P4Tqzoowy', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'PURCHASE AUTHORIZED ON 07/17 FAMILY EXPRESS #5 024 W. BOURBON IN 53039331440 CARD 43', 'Family Express', -4.531564, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:37.700595', '2025-11-06 02:01:37.700595', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (218, 1, 'ej8ZlGZ3v5iGX5RpMgBdsPEPNyNApXc7NJwAL', '2025-11-01 00:00:00', '2025-10-31 00:00:00', 'Safeway', 'Safeway', -10.176247, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:37.879854', '2025-11-06 02:01:37.879854', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (219, 1, 'p8dGNyGZ53tEvVyLMpKKir67Vexo3GfJwnnxD', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'Starbucks', 'Starbucks', -26.21083, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:38.070145', '2025-11-06 02:01:38.070145', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (103, 1, 'yxZBLXByVeu95EQrRkNDsK985GEPDliMB39yG', '2025-10-28 00:00:00', '2025-10-27 00:00:00', 'TRANSFER PAYPAL ADD TO BALANCE INTERNET PAYMENT', NULL, -89, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:43.749295', '2025-10-28 18:30:43.749295', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (147, 1, 'yxZBLXByVeu95EQrRkNDsK985GEPDliMB39rG', '2025-10-02 00:00:00', '2025-10-01 00:00:00', 'Dunkin'' Donuts', 'Dunkin''', -103.44398, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:49.165088', '2025-10-28 18:30:49.165088', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (110, 1, 'ExgZGpZb95ukvxe4oRDLTqM691ey8JczNRwXe', '2025-10-25 00:00:00', '2025-10-24 00:00:00', 'CITGO', NULL, -30.900715, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:44.70172', '2025-10-28 18:30:44.70172', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (114, 1, 'p8dGNyGZ53tEvVyLMpK4S531dlmxDpHedr4Ln', '2025-10-23 00:00:00', '2025-10-22 00:00:00', 'CREDIT CARD PURCHASE SMART AND FINAL #1 ANAHEIM CA DATE 12/14 15277301931256 9 CARD 5', NULL, -48.2542, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:45.178775', '2025-10-28 18:30:45.178775', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (140, 1, 'D39QALQ685CE1W6AvwL7Slr8JVmvRNidMwgzr', '2025-10-04 00:00:00', '2025-10-03 00:00:00', 'MICROSOFT 979333884', 'Microsoft', -3.25206, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:48.322126', '2025-10-28 18:30:48.322126', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (109, 1, 'GaE1vg1AQ5iKw9JW1BL8TrLxZom8bgfwdBl15', '2025-10-26 00:00:00', '2025-10-25 00:00:00', 'CARD PURCHASE PAYBYPHONE 804665947 11/19', 'PayByPhone', -133.55963, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:44.582638', '2025-10-28 18:30:44.582638', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (112, 1, 'geL1KG1db5hEmnL8Mx5dSmKDdv6VgAC9JVbg7', '2025-10-24 00:00:00', '2025-10-23 00:00:00', 'Internal Revenue Service', NULL, -744, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:44.942143', '2025-10-28 18:30:44.942143', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (113, 1, 'ogkA4GAQ5BuGaEvZPXq4UN7ap81bwXiAmMaRb', '2025-10-24 00:00:00', '2025-10-23 00:00:00', 'Walmart', 'Walmart', -15.607323, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:45.060123', '2025-10-28 18:30:45.060123', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (166, 1, 'p8dGNyGZ53tEvVyLMpKBs9zJ6qnqN5TpZ614E', '2025-10-30 00:00:00', '2025-10-30 00:00:00', 'CHECKCARD 732005814 BROOKSHIRE BROT 1420 N UNIVERSITY DR NACOGDOCHES TX 87668490 CKCD 9878520 49245826', NULL, -254.71141, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-30 12:22:03.864343', '2025-10-30 12:22:03.864343', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (105, 1, 'no3WaGWe5ziGEydJ9mlQUpr4MlyGxmcD4ed6B', '2025-10-27 00:00:00', '2025-10-26 00:00:00', 'McDonald''s', 'McDonald''s', -66.62851, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:43.988976', '2025-10-28 18:30:43.988976', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (98, 1, '9pgBQaBD8AtND7MZ5QrGck3Q7xbAElhB6GLRv', '2025-10-28 00:00:00', '2025-10-28 00:00:00', '72116609 POS PURCHASE EARNIN RE SC 6 721582259', 'Earnin', -58, 'USD', '{}', true, 'other', NULL, 'unmatched', '2025-10-28 18:30:43.130443', '2025-10-28 18:30:43.130443', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (167, 1, 'MeBkvzk675h9KWvG4lAgTDRXz4E4ZaiLJAMB9', '2025-10-30 00:00:00', '2025-10-29 00:00:00', 'INSUFFICIENT FUNDS FEE FOR CHECK #015 IN THE AMOUNT OF $846.XX', NULL, -38, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-30 12:22:03.99024', '2025-10-30 12:22:03.99024', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (168, 1, 'L7z8vr86V5hbAnWjNQkph9M61exezdTkX4rbe', '2025-10-30 00:00:00', '2025-10-30 00:00:00', 'Overdraft Transfer TO DD 3405657042', NULL, -231.65741, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-30 12:22:04.110316', '2025-10-30 12:22:04.110316', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (171, 1, 'L7z8vr86V5hbAnWjNQkPCxPWBGVmBVuk7qw6J', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'Adjustment - Cr', NULL, 2.8079693, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-30 12:22:04.529808', '2025-10-30 12:22:04.529808', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (220, 1, 'ogkA4GAQ5BuGaEvZPXqqcM5D6WbG73tpjyy3R', '2025-11-01 00:00:00', '2025-11-01 00:00:00', 'Wendy''s', 'Wendy''s', -106.71162, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:38.252863', '2025-11-06 02:01:38.252863', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (221, 1, 'ogkA4GAQ5BuGaEvZPXq7td5yXeRmdruoVPQ9R', '2025-10-31 00:00:00', '2025-10-31 00:00:00', 'CASH APP TRANSFER', NULL, -21, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-06 02:01:38.490017', '2025-11-06 02:01:38.490017', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (169, 1, '1jDndqn5l1i7VeyWMZRjs1GVx6w67rFp8yJgp', '2025-10-30 00:00:00', '2025-10-30 00:00:00', 'UBER 913007 RIDE 07/24 CA 267 DEBIT CARD PURCHASE 12/09 TIMESTAMP 85207', 'Uber', -10.752028, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-30 12:22:04.228559', '2025-10-30 12:22:04.228559', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (170, 1, 'ZKG3XZ36q5Ckg4DGa7d3iZbynBQEnQte3P4aq', '2025-10-29 00:00:00', '2025-10-29 00:00:00', '741197 POS PURCHASE EARNIN RE SC 83441 67959', 'Earnin', -88.85323, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-30 12:22:04.408541', '2025-10-30 12:22:04.408541', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (222, 1, 'Arvj8Zj6nRiKbrWPpRNMuw7ZBno3wEs9xkLwy', '2025-10-31 00:00:00', '2025-10-31 00:00:00', 'Uber Eats', 'Uber Eats', -58.95166, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-06 02:01:38.922271', '2025-11-06 02:01:38.922271', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (223, 1, 'geL1KG1db5hEmnL8Mx56coPBAxaNobCE7GNDE', '2025-10-31 00:00:00', '2025-10-31 00:00:00', 'WEIGELS 03/23 # 588398765 PURCHASE 257 ARLINGTON AV JEFFERSON', NULL, -37, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-06 02:01:39.100584', '2025-11-06 02:01:39.100584', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (253, 1, '8L8zedzApktwEJ6Pk3KrS81l3LvXeeFgoWb9E', '2025-11-07 00:00:00', '2025-11-06 00:00:00', '67377967 17940 WAWA CENTRAL AVE N STAFFORD VA 45', 'Wawa', -3, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:12.833382', '2025-11-12 00:07:12.833382', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (254, 1, 'GaE1vg1AQ5iKw9JW1BLMsGeVLBrXqqcqg65bD', '2025-11-07 00:00:00', '2025-11-07 00:00:00', 'AIRBNB PAR AC', 'Airbnb', -370.7536, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:13.009818', '2025-11-12 00:07:13.009818', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (255, 1, 'L7z8vr86V5hbAnWjNQkbuv5gzJopzdcqXvnbD', '2025-11-07 00:00:00', '2025-11-07 00:00:00', 'CHECK CARD PURCHASE BETMGM ONLINE NJ DATE 09/15 7627903994 6692 CARD 3', NULL, -20.799616, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:13.18815', '2025-11-12 00:07:13.18815', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (172, 1, 'p8dGNyGZ53tEvVyLMpKQtnmoel13e1fpwbal1', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'CASH DEPOSIT', NULL, 346.01056, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-30 12:22:04.771304', '2025-10-30 12:22:04.771304', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (143, 1, '6M1Kj3K5g8tB4bd19qoRceN36nabd8Tk59WrZ', '2025-10-03 00:00:00', '2025-10-02 00:00:00', 'EFT DEBIT  MICROSOFT XBOX CA 830 08/03 TIMESTAMP', 'Microsoft', -59.521763, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:48.683133', '2025-10-28 18:30:48.683133', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (124, 1, '4QglNzlDroC5gp3A6zR7Tzxodg7m6qfWPreg6', '2025-10-15 00:00:00', '2025-10-14 00:00:00', '671 POS PURCHASE EARNIN RE SC 9671543 349619', 'Earnin', -91.52556, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:46.391607', '2025-10-28 18:30:46.391607', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (99, 1, 'vz7KZwKyqPCEq1V3JBdrSWpJqE1bZaSJdzjWz', '2025-10-28 00:00:00', '2025-10-28 00:00:00', 'INTERAC PURCHASE - 67200 TARGET #052', 'Target', -595.10675, 'USD', '{}', true, 'in store', NULL, 'unmatched', '2025-10-28 18:30:43.269116', '2025-10-28 18:30:43.269116', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (101, 1, 'XlDkvek685FbwAp3JWgPIwa5yQm6EBhJa64da', '2025-10-28 00:00:00', '2025-10-28 00:00:00', 'Spotify', 'Spotify', -12.65, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:43.507474', '2025-10-28 18:30:43.507474', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (102, 1, 'RL4bvab685tQDKRZ4l1eU7BMvdy5oJcMElKRj', '2025-10-28 00:00:00', '2025-10-28 00:00:00', 'Starbucks', 'Starbucks', -45.473385, 'USD', '{}', true, 'in store', NULL, 'unmatched', '2025-10-28 18:30:43.628419', '2025-10-28 18:30:43.628419', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (104, 1, 'b497vG7rxJCGzEy8kvKrUzvygX8xrnfPex5V4', '2025-10-27 00:00:00', '2025-10-26 00:00:00', 'Krispy Kreme', 'Krispy Kreme', -6.0424743, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:43.869948', '2025-10-28 18:30:43.869948', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (106, 1, 'mpBEdGE75ktE7oyjx9R4SWQ4Bkb6v9SkambLb', '2025-10-27 00:00:00', '2025-10-27 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:44.107181', '2025-10-28 18:30:44.107181', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (107, 1, 'Arvj8Zj6nRiKbrWPpRNmTykq5e68vBtMmj71N', '2025-10-26 00:00:00', '2025-10-25 00:00:00', '70252237 AMAZON - LEN N', 'Amazon', -10.021521, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:44.226426', '2025-10-28 18:30:44.226426', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (108, 1, 'WEerv7rVR5tk7x4MD9obT1Q6g75BkEUxV9rlZ', '2025-10-26 00:00:00', '2025-10-25 00:00:00', 'BLAZE PIZZA #31 SIG PUR 9906', 'Blaze Pizza', -5, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:44.45675', '2025-10-28 18:30:44.45675', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (132, 1, 'rl4bkGb1JdFG5ExJPLzXUgVB5E7b3mimzPxyo', '2025-10-06 00:00:00', '2025-10-05 00:00:00', 'QUEENS BAR 35 E GRAND RIVER AVE #9 DETROIT MI CARD 29602991', 'Queens Bar', -4.26607, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:47.357785', '2025-10-28 18:30:47.357785', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (134, 1, 'lLz8xG8jZKtGnEjrbpPRU1R7ZVxlyXUNxwyLa', '2025-10-06 00:00:00', '2025-10-05 00:00:00', 'UBER 588639690 RIDE 05/12 CA 12095 DEBIT CARD PURCHASE 04/04 TIMESTAMP 8102241', 'Uber', -12.202726, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:47.604426', '2025-10-28 18:30:47.604426', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (256, 1, 'WEerv7rVR5tk7x4MD9o6sPoDQ91XddCXz6kpd', '2025-11-07 00:00:00', '2025-11-07 00:00:00', 'Chevron', NULL, -183.91618, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:13.36458', '2025-11-12 00:07:13.36458', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (257, 1, 'geL1KG1db5hEmnL8Mx5EfrpRkJXdkmiPxapoW', '2025-11-07 00:00:00', '2025-11-07 00:00:00', 'MICROSOFT 115', 'Microsoft', -3.6584084, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:13.541386', '2025-11-12 00:07:13.541386', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (258, 1, '8L8zedzApktwEJ6Pk3Kwt1BwDmoGDvSgb4onG', '2025-11-07 00:00:00', '2025-11-07 00:00:00', 'Starbucks', 'Starbucks', -60.40177, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:13.719895', '2025-11-12 00:07:13.719895', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (259, 1, 'ExgZGpZb95ukvxe4oRDGslGVMRqjwwirn4qov', '2025-11-07 00:00:00', '2025-11-06 00:00:00', 'TRANSFER PAYPAL ADD TO BALANCE INTERNET PAYMENT', NULL, -82, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:13.896916', '2025-11-12 00:07:13.896916', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (260, 1, '3eDm4rmoKphN9dKbaMk1tMX5mNnErnCZgMXP3', '2025-11-06 00:00:00', '2025-11-06 00:00:00', '52 AMAZON - LEN N', 'Amazon', -5.0936947, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:14.074865', '2025-11-12 00:07:14.074865', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (261, 1, 'MeBkvzk675h9KWvG4lA5fW3LZxqxgBIL6Rzvx', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 'American Express Credit Card', NULL, -466, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:14.251592', '2025-11-12 00:07:14.251592', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (136, 1, '5Z1qPBqRogCRy749MZvXsB8g7Vaq4RCJmwoxx', '2025-10-05 00:00:00', '2025-10-04 00:00:00', 'CASH APP TRANSFER', NULL, -20, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:47.84463', '2025-10-28 18:30:47.84463', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (262, 1, '1jDndqn5l1i7VeyWMZRqFo487jpjeqUpjP3RR', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 'Burger King', 'Burger King', -6.3330564, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:14.428859', '2025-11-12 00:07:14.428859', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (263, 1, 'KjrgvKg6n5ipdjBwNZDqFmg1AwlxplURoGJne', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 'Kroger', 'Kroger', -272.62683, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:14.604824', '2025-11-12 00:07:14.604824', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (264, 1, 'lLz8xG8jZKtGnEjrbpPlC1lV6dQz7vfa4rkqN', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 'PENDING CREDIT ON XX/XX', NULL, 4939.382, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:14.781567', '2025-11-12 00:07:14.781567', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (265, 1, 'k1rg36gPyqI64EWnkZN1I4QlKanLMetJ98Xjm', '2025-11-06 00:00:00', '2025-11-05 00:00:00', 'POINT OF SALE WITHDRAWAL ETSY R XWKS 2695897 NORTH FIRST STREETSAN JOSE', 'Etsy', -27.365015, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:14.998548', '2025-11-12 00:07:14.998548', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (266, 1, 'L7z8vr86V5hbAnWjNQk5io7Xz8N8pVUkjWoM5', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 'TRADER 03/17 # 36974 PURCHASE 73 EAST MAIN JAMES', NULL, -172.6526, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:15.174826', '2025-11-12 00:07:15.174826', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (267, 1, 'rl4bkGb1JdFG5ExJPLzZh6Kj5NWgrWu7bamoE', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 'VOLA VOLA ACH ENTRY MEMO POSTED TODAY', 'Vola Finance', -50, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:15.35177', '2025-11-12 00:07:15.35177', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (269, 1, 'mpBEdGE75ktE7oyjx9RWHkpAkaBaZ4fgwEDBd', '2025-11-13 00:00:00', '2025-11-13 00:00:00', 'CRAIGSLIST.ORG R DWK CD 5124747', NULL, -3.5353835, 'USD', '{}', true, 'online', NULL, 'unmatched', '2025-11-13 19:21:05.051494', '2025-11-13 19:21:05.051494', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (137, 1, 'JPKovqo6E5iDwPpbN4o1H3Gag9VAEdSxP4Ebd', '2025-10-05 00:00:00', '2025-10-04 00:00:00', 'Planet Fitness', 'Planet Fitness', -25.983858, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:47.963766', '2025-10-28 18:30:47.963766', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (138, 1, 'k1rg36gPyqI64EWnkZNLF4PMjlJQvBuavQBxL', '2025-10-05 00:00:00', '2025-10-04 00:00:00', 'WITHDRAWAL 02178293119 POS POUR CHOICES', NULL, -5.5849614, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:48.082484', '2025-10-28 18:30:48.082484', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (139, 1, 'V87KvjK6W5tyBARZpmW6IMrR1L6XvBtlrm465', '2025-10-04 00:00:00', '2025-10-03 00:00:00', 'CASH APP TRANSFER', NULL, -19, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:48.202913', '2025-10-28 18:30:48.202913', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (141, 1, 'wBerMGrwKjCGzor3MXabUnVLBZ1KAjiM8NvgA', '2025-10-04 00:00:00', '2025-10-03 00:00:00', 'WITHDRAWAL DEBIT CARD CONSUMER DEBIT PULSZ 252-291-2362 VA DATE 04/12 23978676735612 63546108 CARD 94353', NULL, -38, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:48.44115', '2025-10-28 18:30:48.44115', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (149, 1, 'no3WaGWe5ziGEydJ9mlQUpr4MlyGxmcD4ed8B', '2025-10-02 00:00:00', '2025-10-01 00:00:00', 'McDonald''s', 'McDonald''s', -128.11888, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:49.403024', '2025-10-28 18:30:49.403024', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (150, 1, 'mpBEdGE75ktE7oyjx9R4SWQ4Bkb6v9Skamb7b', '2025-10-02 00:00:00', '2025-10-01 00:00:00', 'Uber Eats', 'Uber Eats', -72, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:49.52292', '2025-10-28 18:30:49.52292', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (151, 1, 'GaE1vg1AQ5iKw9JW1BL8TrLxZom8bgfwdBlW5', '2025-10-01 00:00:00', '2025-09-30 00:00:00', 'CHECKCARD 538036 CLEO AI IN MOUNTAIN VIEWCA 172788892 RECURRING', 'Cleo', -37.474327, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:49.643878', '2025-10-28 18:30:49.643878', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (152, 1, 'Arvj8Zj6nRiKbrWPpRNmTykq5e68vBtMmj7WN', '2025-09-30 00:00:00', '2025-09-29 00:00:00', 'McDonald''s', 'McDonald''s', -162.69058, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:49.764706', '2025-10-28 18:30:49.764706', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (153, 1, 'ExgZGpZb95ukvxe4oRDLTqM691ey8JczNRwje', '2025-09-29 00:00:00', '2025-09-29 00:00:00', 'Brigit XX/XX #406735377 PMNT RCVD Brigit', 'Brigit', 95, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:49.885069', '2025-10-28 18:30:49.885069', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (154, 1, 'WEerv7rVR5tk7x4MD9obT1Q6g75BkEUxV9rWZ', '2025-09-29 00:00:00', '2025-09-29 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:50.004271', '2025-10-28 18:30:50.004271', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (155, 1, 'geL1KG1db5hEmnL8Mx5dSmKDdv6VgAC9JVbl7', '2025-09-28 00:00:00', '2025-09-28 00:00:00', 'Interest payment', NULL, 0.12, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:50.123447', '2025-10-28 18:30:50.123447', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (158, 1, 'x3Zz1Gzyr7CXgVaWMK43tnyxg96A5Dt6PedAN', '2025-10-29 00:00:00', '2025-10-29 00:00:00', '741197 POS PURCHASE EARNIN RE SC 83441 67959', 'Earnin', -88.85323, 'USD', '{}', true, 'other', NULL, 'unmatched', '2025-10-29 22:26:34.075556', '2025-10-29 22:26:34.075556', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (159, 1, 'Bzg7EM7AR6CLRzm86eP1SpWErdk4nMfzpNZWD', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'CASH APP TRANSFER', NULL, 18, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-29 22:26:34.195208', '2025-10-29 22:26:34.195208', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (160, 1, 'aaLjv8jKe5iKkArDEMqyidPyjeDV3WtZJDAeX', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'CASH DEPOSIT', NULL, 516.4022, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-29 22:26:34.313905', '2025-10-29 22:26:34.313905', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (161, 1, 'zdE3pG3VmQtMAbWlJrPgH1yjNqR8wnh3y1q7A', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'CHECK CARD PURCHASE BETMGM ONLINE NJ DATE 05/24 33177024452 09 CARD 3777571', NULL, -34.244915, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-29 22:26:34.433446', '2025-10-29 22:26:34.433446', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (162, 1, 'KjrgvKg6n5ipdjBwNZD7f9nkvoVGJxUE9anZ3', '2025-10-29 00:00:00', '2025-10-28 00:00:00', 'INTERAC PURCHASE - 67200 TARGET #052', 'Target', -595.10675, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-29 22:26:34.551864', '2025-10-29 22:26:34.551864', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (163, 1, '3eDm4rmoKphN9dKbaMkyTJ6BmXV7aEFZbEd88', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'Pizza Ranch', NULL, -28.256458, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-29 22:26:34.674367', '2025-10-29 22:26:34.674367', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (164, 1, 'rl4bkGb1JdFG5ExJPLzXUvDzLx3lkgtdAVoPq', '2025-10-29 00:00:00', '2025-10-28 00:00:00', 'Starbucks', 'Starbucks', -45.473385, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-29 22:26:34.792431', '2025-10-29 22:26:34.792431', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (165, 1, 'dPAQvkQBw5ikMoXP5QzDiGqx58oXkPiJzRL6l', '2025-10-29 00:00:00', '2025-10-29 00:00:00', 'Tropical Smoothie Cafe', 'Tropical Smoothie Cafe', -41.668015, 'USD', '{}', true, 'in store', NULL, 'unmatched', '2025-10-29 22:26:34.912425', '2025-10-29 22:26:34.912425', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (224, 1, 'MeBkvzk675h9KWvG4lAJHqZ8WQgVmmFL16aAA', '2025-11-11 00:00:00', '2025-11-11 00:00:00', '35 AMAZON - LEN N', 'Amazon', -11.134901, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:07.652346', '2025-11-12 00:07:07.652346', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (225, 1, 'p8dGNyGZ53tEvVyLMpKJTKNLwgd8XXtpzoP6L', '2025-11-11 00:00:00', '2025-11-11 00:00:00', '7-Eleven', '7-Eleven', -46.25297, 'USD', '{}', true, 'in store', NULL, 'unmatched', '2025-11-12 00:07:07.845548', '2025-11-12 00:07:07.845548', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (226, 1, '5Z1qPBqRogCRy749MZvyi1NlJEgKRxc5Qn5XE', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 'ATM WITHDRAWAL XX/XX K30050 ?', NULL, -66.891495, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:08.022786', '2025-11-12 00:07:08.022786', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (227, 1, 'L7z8vr86V5hbAnWjNQkgUNzgolpZEEukEjZ4L', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 'Adjustment - Cr', NULL, 2.795105, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:08.199779', '2025-11-12 00:07:08.199779', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (228, 1, 'k1rg36gPyqI64EWnkZN4SNyoKpMwBxfL1jL7r', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 'Circle K', 'Circle K', -69.027824, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:08.376576', '2025-11-12 00:07:08.376576', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (229, 1, 'ogkA4GAQ5BuGaEvZPXq5sBnZQgpq99fobq6Bo', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 'LRM CLAIMS ADJ DR SIG-238107837600', NULL, -1065, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:08.553565', '2025-11-12 00:07:08.553565', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (230, 1, 'zdE3pG3VmQtMAbWlJrPACekbGBz5loTl6pbR9', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'Autosave Savings 52696091989', NULL, -69.83455, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:08.730025', '2025-11-12 00:07:08.730025', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (231, 1, 'rl4bkGb1JdFG5ExJPLz5tb6oRmyeJqF7NERj5', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'H&R Block', NULL, 3248.059, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:08.907418', '2025-11-12 00:07:08.907418', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (232, 1, 'ZKG3XZ36q5Ckg4DGa7dzHBDXlJ1jBziemQvnp', '2025-11-10 00:00:00', '2025-11-09 00:00:00', 'Jea Ezpay', NULL, -74.98368, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:09.08414', '2025-11-12 00:07:09.08414', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (233, 1, 'Bzg7EM7AR6CLRzm86ePRcBKe8qAJLwc4VrodB', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'McDonald''s', 'McDonald''s', -158.41417, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:09.273154', '2025-11-12 00:07:09.273154', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (234, 1, 'lLz8xG8jZKtGnEjrbpPntlbn3Xa5mrCp6l3j3', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'NON-HUNTINGTON CASH WITHDRAWAL', NULL, -180, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:09.45441', '2025-11-12 00:07:09.45441', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (235, 1, 'qEanPGnMRxtWGwEpPRrGceAxK4XzpqTgBnK9z', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'Payment to Chase card ending in 9391 XX/XX', NULL, -747.5, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:09.631645', '2025-11-12 00:07:09.631645', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (236, 1, 'MeBkvzk675h9KWvG4lA7T1vDbrjW1pfLpn5br', '2025-11-10 00:00:00', '2025-11-09 00:00:00', 'SALLY BEAUTY - LEESBURG LEESBURG', 'Sally Beauty', -201.02579, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:09.809395', '2025-11-12 00:07:09.809395', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (237, 1, '1jDndqn5l1i7VeyWMZRrsQy1lLEoQWcpXWaba', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'Smoker Friendly', 'Smoker Friendly', -4.9701953, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:09.986212', '2025-11-12 00:07:09.986212', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (238, 1, 'ogkA4GAQ5BuGaEvZPXqjS8AJvEVQ86Co5LP4X', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:10.163468', '2025-11-12 00:07:10.163468', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (239, 1, 'dPAQvkQBw5ikMoXP5Qzri3MN6N47aLCJQnPwm', '2025-11-09 00:00:00', '2025-11-09 00:00:00', '4676877 POS PURCHASE EARNIN RE SC 916418710 38100662', 'Earnin', -37.309143, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:10.340428', '2025-11-12 00:07:10.340428', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (240, 1, '6M1Kj3K5g8tB4bd19qo5Teg1RP1mG7tzZN9A7', '2025-11-09 00:00:00', '2025-11-09 00:00:00', 'APPLE 8641160 NEWKIRK #49', NULL, -33.16828, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:10.518792', '2025-11-12 00:07:10.518792', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (115, 1, 'L7z8vr86V5hbAnWjNQkwIdmVpGPkqruB5QbPp', '2025-10-22 00:00:00', '2025-10-21 00:00:00', 'PURCHASE AUTHORIZED ON 05/27 ROYAL FARMS 100 MONUMENT AVE A P NATIONAL HARBOR MD 0846248421604 CARD 44', NULL, -21.771215, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:45.297886', '2025-10-28 18:30:45.297886', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (241, 1, 'L7z8vr86V5hbAnWjNQk1Co8qEq3V91ikpWLbN', '2025-11-09 00:00:00', '2025-11-09 00:00:00', 'Amazon Prime', 'Amazon Prime', -11.881689, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:10.695747', '2025-11-12 00:07:10.695747', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (116, 1, '1jDndqn5l1i7VeyWMZRvSrPqeQBXz3fV1Kg5l', '2025-10-21 00:00:00', '2025-10-20 00:00:00', 'Dunkin'' Donuts', 'Dunkin''', -70.61283, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:45.424529', '2025-10-28 18:30:45.424529', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (117, 1, 'MeBkvzk675h9KWvG4lAZsa5Bg1NwMAFkrlB98', '2025-10-20 00:00:00', '2025-10-20 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:45.542966', '2025-10-28 18:30:45.542966', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (118, 1, 'ZKG3XZ36q5Ckg4DGa7dXTgEQ8BbRm5iWBR5gN', '2025-10-20 00:00:00', '2025-10-19 00:00:00', 'Uber Eats', 'Uber Eats', -52.34218, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:45.662133', '2025-10-28 18:30:45.662133', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (119, 1, 'ej8ZlGZ3v5iGX5RpMgBAUX8ez4DdxbuPGdNL8', '2025-10-19 00:00:00', '2025-10-18 00:00:00', '5 PURCHASE-SIG DENNY''S 366992 EUGENE OR 6 039488', 'Denny''s', -4.790203, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:45.782477', '2025-10-28 18:30:45.782477', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (156, 1, '8L8zedzApktwEJ6Pk3KMsv3QG9Wd4ri5B1Ax7', '2025-09-28 00:00:00', '2025-09-28 00:00:00', 'Spotify', 'Spotify', -12.65, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:50.242626', '2025-10-28 18:30:50.242626', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (125, 1, 'NQ3WvBW6R5Cw3W1RLjDVs4zWPqD7bauawjvrP', '2025-10-15 00:00:00', '2025-10-14 00:00:00', 'GrubHub', 'Grubhub', -134, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-10-28 18:30:46.510451', '2025-10-28 18:30:46.510451', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (133, 1, 'zdE3pG3VmQtMAbWlJrPgHnXDWAgeRBijn79EM', '2025-10-06 00:00:00', '2025-10-06 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:47.48142', '2025-10-28 18:30:47.48142', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (100, 1, '6M1Kj3K5g8tB4bd19qoRceN36nabd8Tk59WgZ', '2025-10-28 00:00:00', '2025-10-28 00:00:00', 'Interest payment', NULL, 0.12, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:43.387908', '2025-10-28 18:30:43.387908', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (122, 1, '71Wr7xrmpEIveXLyPjkRSxLEjJR9dAc3qlWgX', '2025-10-18 00:00:00', '2025-10-17 00:00:00', 'American Airlines', 'American Airlines', -186, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:46.154041', '2025-10-28 18:30:46.154041', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (123, 1, 'PMdGvxG6b5tbAlKQdkDXIPnM79jl4atjRkDwq', '2025-10-18 00:00:00', '2025-10-17 00:00:00', 'Bojangles', 'Famous Chicken N Biscuits', -9.94589, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:46.273007', '2025-10-28 18:30:46.273007', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (126, 1, 'aaLjv8jKe5iKkArDEMqoTWrgjB8oQVSnMaqRl', '2025-10-15 00:00:00', '2025-10-14 00:00:00', 'Popeyes', 'Popeyes', -4.780789, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:46.631041', '2025-10-28 18:30:46.631041', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (127, 1, 'x3Zz1Gzyr7CXgVaWMK45SDzvgemM8Aigb7o9L', '2025-10-14 00:00:00', '2025-10-13 00:00:00', 'APPLE 857979823 NEWKIRK #4', NULL, -97.66696, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:46.753857', '2025-10-28 18:30:46.753857', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (128, 1, 'dPAQvkQBw5ikMoXP5QzbTPm75jy9NXt9pMwPA', '2025-10-14 00:00:00', '2025-10-14 00:00:00', 'CASH DEPOSIT', NULL, 496, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:46.872242', '2025-10-28 18:30:46.872242', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (129, 1, '3eDm4rmoKphN9dKbaMkncEbRmwP397UXxrpwX', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 'Sweetgreen inc payroll ppd id', NULL, 810, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-10-28 18:30:46.995812', '2025-10-28 18:30:46.995812', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (111, 1, '8L8zedzApktwEJ6Pk3KMsv3QG9Wd4ri5B1Aw7', '2025-10-25 00:00:00', '2025-10-24 00:00:00', 'Tropical Smoothie Cafe', 'Tropical Smoothie Cafe', -69, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:44.822948', '2025-10-28 18:30:44.822948', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (144, 1, '9pgBQaBD8AtND7MZ5QrGck3Q7xbAElhB6GLlv', '2025-10-03 00:00:00', '2025-10-02 00:00:00', 'STOP & SHOP #25402 WEST CALDWELL MODATE 01/24 31772803806094 17096869 CARD 34321 WITHDRAWAL DEBIT CARD', 'Stop & Shop', -9.7853775, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-10-28 18:30:48.804718', '2025-10-28 18:30:48.804718', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (242, 1, 'MeBkvzk675h9KWvG4lA7T6mPkK81KqCmrX94A', '2025-11-09 00:00:00', '2025-11-09 00:00:00', 'GOOGLE DRIVE CA DBT PURCHASE ON 03/15 TIMESTAMP CARD NBR : 9810 RECURRING ITEM 32184722', NULL, -3.5148163, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:10.872776', '2025-11-12 00:07:10.872776', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (243, 1, 'RL4bvab685tQDKRZ4l1Jf7RKqDKAxjhZyDl1p', '2025-11-09 00:00:00', '2025-11-08 00:00:00', 'POS DEBIT 17616 81 BOBEVANS #931 SHOP', NULL, -55.56942, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-12 00:07:11.058639', '2025-11-12 00:07:11.058639', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (244, 1, 'ogkA4GAQ5BuGaEvZPXqjS49RokZ8kBFvmQRpo', '2025-11-09 00:00:00', '2025-11-09 00:00:00', 'Payment to Chase card ending in 1576 XX/XX', NULL, -747.5, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:11.237718', '2025-11-12 00:07:11.237718', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (245, 1, 'vz7KZwKyqPCEq1V3JBdjtW7gNmgv9MhwmNz7e', '2025-11-09 00:00:00', '2025-11-08 00:00:00', 'SPRINT * BILL PA REF 2 TX CARD 73051161', 'Sprint', -61, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:11.414512', '2025-11-12 00:07:11.414512', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (246, 1, '1jDndqn5l1i7VeyWMZRrsDabMdgQdpCD195qb', '2025-11-09 00:00:00', '2025-11-09 00:00:00', 'Uber Eats', 'Uber Eats', -29, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:11.592537', '2025-11-12 00:07:11.592537', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (247, 1, 'XlDkvek685FbwAp3JWgBCwZRXzR9bgTDZV6lm', '2025-11-09 00:00:00', '2025-11-09 00:00:00', 'X/X ONLINE TRANSFER FROM SV: 1836515858 REF # 15760954687', NULL, 168, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-12 00:07:11.770362', '2025-11-12 00:07:11.770362', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (248, 1, 'MeBkvzk675h9KWvG4lA9tr8gRVmaLquLlMZyZ', '2025-11-08 00:00:00', '2025-11-08 00:00:00', 'DBT CRD 7651868 3 ONLY FANS NY 098', NULL, -30.950218, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-12 00:07:11.946357', '2025-11-12 00:07:11.946357', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (276, 1, '6M1Kj3K5g8tB4bd19qonI4nlo8l5D7f8oXqgb', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 'DEPOSIT - DETAIL NOT YET AVAILABLE', NULL, 351.6474, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-13 19:21:06.392563', '2025-11-13 19:21:06.392563', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (277, 1, 'XlDkvek685FbwAp3JWgRfoQJVBJWPgTbWnrdx', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 'Instant Pmt from ALBERT CORPORATION', NULL, 75, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-13 19:21:06.574265', '2025-11-13 19:21:06.574265', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (278, 1, '9pgBQaBD8AtND7MZ5Qr9IKxNBlN8VyT4WQ3RR', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 'McDonald''s', 'McDonald''s', -53.640903, 'USD', '{}', false, 'online', NULL, 'unmatched', '2025-11-13 19:21:06.758729', '2025-11-13 19:21:06.758729', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (279, 1, 'yxZBLXByVeu95EQrRkN1iLGrBlrw3zi4qXZyr', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 'Venmo', NULL, -411, 'USD', '{}', false, 'other', NULL, 'unmatched', '2025-11-13 19:21:06.942214', '2025-11-13 19:21:06.942214', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (280, 1, 'RL4bvab685tQDKRZ4l1wcrdm8JmlEjfavbLRP', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 'Walmart', 'Walmart', -18.06317, 'USD', '{}', false, 'in store', NULL, 'unmatched', '2025-11-13 19:21:07.129174', '2025-11-13 19:21:07.129174', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);
INSERT INTO public.imported_transactions VALUES (268, 1, '3eDm4rmoKphN9dKbaMkVCMdR4DxzAnTZAkoxz', '2025-11-13 00:00:00', '2025-11-13 00:00:00', 'CASH APP TRANSFER', NULL, -30, 'USD', '{}', false, 'other', 344, 'matched', '2025-11-13 19:21:04.863311', '2025-11-13 19:21:04.863311', 'plaid', 22, NULL, NULL, false, false, NULL, NULL, NULL, NULL);


--
-- Data for Name: bank_transaction_matches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: categorization_rules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.company_settings VALUES (1, 'My Company Inc.', 'info@vedoaccounting.com', '4167209432', '123 Business Street, City, State, ZIP', '', '', NULL, '2025-11-17 21:35:39.464', 4, '71-200 Veterans Dr', '', 'Brampton', 'Ontario', 'L7A 4S6', 'Canada');


--
-- Data for Name: csv_mapping_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.csv_mapping_preferences VALUES (1, 1, 22, 'Date', 'Description 1', 'Amount', NULL, NULL, 'MM/DD/YYYY', true, '2025-10-15 22:53:30.04416', '2025-10-15 22:53:30.04416');


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.currencies VALUES (1, 'USD', 'US Dollar', '$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (2, 'EUR', 'Euro', '€', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (3, 'GBP', 'British Pound', '£', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (4, 'JPY', 'Japanese Yen', '¥', 0, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (5, 'CAD', 'Canadian Dollar', 'CA$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (6, 'AUD', 'Australian Dollar', 'A$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (7, 'CHF', 'Swiss Franc', 'CHF', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (8, 'CNY', 'Chinese Yuan', '¥', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (9, 'HKD', 'Hong Kong Dollar', 'HK$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (10, 'NZD', 'New Zealand Dollar', 'NZ$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (11, 'SEK', 'Swedish Krona', 'kr', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (12, 'KRW', 'South Korean Won', '₩', 0, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (13, 'SGD', 'Singapore Dollar', 'S$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (14, 'NOK', 'Norwegian Krone', 'kr', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (15, 'MXN', 'Mexican Peso', 'MX$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (16, 'INR', 'Indian Rupee', '₹', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (17, 'RUB', 'Russian Ruble', '₽', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (18, 'ZAR', 'South African Rand', 'R', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (19, 'BRL', 'Brazilian Real', 'R$', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (20, 'TRY', 'Turkish Lira', '₺', 2, true, '2025-11-04 19:35:31.367429');
INSERT INTO public.currencies VALUES (21, 'DKK', 'Danish Krone', 'kr', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (22, 'PLN', 'Polish Zloty', 'zł', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (23, 'CZK', 'Czech Koruna', 'Kč', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (24, 'HUF', 'Hungarian Forint', 'Ft', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (25, 'RON', 'Romanian Leu', 'lei', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (26, 'BGN', 'Bulgarian Lev', 'лв', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (27, 'HRK', 'Croatian Kuna', 'kn', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (28, 'ISK', 'Icelandic Krona', 'kr', 0, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (29, 'THB', 'Thai Baht', '฿', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (30, 'MYR', 'Malaysian Ringgit', 'RM', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (31, 'IDR', 'Indonesian Rupiah', 'Rp', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (32, 'PHP', 'Philippine Peso', '₱', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (33, 'VND', 'Vietnamese Dong', '₫', 0, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (34, 'PKR', 'Pakistani Rupee', '₨', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (35, 'BDT', 'Bangladeshi Taka', '৳', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (36, 'LKR', 'Sri Lankan Rupee', '₨', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (37, 'NPR', 'Nepalese Rupee', '₨', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (38, 'KZT', 'Kazakhstani Tenge', '₸', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (39, 'UAH', 'Ukrainian Hryvnia', '₴', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (40, 'AED', 'UAE Dirham', 'د.إ', 2, true, '2025-11-04 19:35:31.4343');
INSERT INTO public.currencies VALUES (41, 'SAR', 'Saudi Riyal', '﷼', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (42, 'QAR', 'Qatari Riyal', '﷼', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (43, 'KWD', 'Kuwaiti Dinar', 'د.ك', 3, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (44, 'BHD', 'Bahraini Dinar', 'د.ب', 3, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (45, 'OMR', 'Omani Rial', '﷼', 3, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (46, 'ILS', 'Israeli Shekel', '₪', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (47, 'JOD', 'Jordanian Dinar', 'د.ا', 3, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (48, 'LBP', 'Lebanese Pound', '£', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (49, 'EGP', 'Egyptian Pound', '£', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (50, 'NGN', 'Nigerian Naira', '₦', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (51, 'KES', 'Kenyan Shilling', 'KSh', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (52, 'GHS', 'Ghanaian Cedi', '₵', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (53, 'TZS', 'Tanzanian Shilling', 'TSh', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (54, 'UGX', 'Ugandan Shilling', 'USh', 0, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (55, 'MAD', 'Moroccan Dirham', 'د.م.', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (56, 'TND', 'Tunisian Dinar', 'د.ت', 3, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (57, 'ETB', 'Ethiopian Birr', 'Br', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (58, 'ARS', 'Argentine Peso', '$', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (59, 'CLP', 'Chilean Peso', '$', 0, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (60, 'COP', 'Colombian Peso', '$', 2, true, '2025-11-04 19:35:31.49983');
INSERT INTO public.currencies VALUES (61, 'PEN', 'Peruvian Sol', 'S/', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (62, 'UYU', 'Uruguayan Peso', '$U', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (63, 'VES', 'Venezuelan Bolivar', 'Bs.', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (64, 'DOP', 'Dominican Peso', 'RD$', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (65, 'CRC', 'Costa Rican Colon', '₡', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (66, 'GTQ', 'Guatemalan Quetzal', 'Q', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (67, 'HNL', 'Honduran Lempira', 'L', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (68, 'TWD', 'Taiwan Dollar', 'NT$', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (69, 'IQD', 'Iraqi Dinar', 'ع.د', 3, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (70, 'IRR', 'Iranian Rial', '﷼', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (71, 'AFN', 'Afghan Afghani', '؋', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (72, 'AMD', 'Armenian Dram', '֏', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (73, 'AZN', 'Azerbaijani Manat', '₼', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (74, 'BYN', 'Belarusian Ruble', 'Br', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (75, 'GEL', 'Georgian Lari', '₾', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (76, 'MDL', 'Moldovan Leu', 'L', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (77, 'MKD', 'Macedonian Denar', 'ден', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (78, 'RSD', 'Serbian Dinar', 'дин', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (79, 'ALL', 'Albanian Lek', 'L', 2, true, '2025-11-04 19:35:31.563281');
INSERT INTO public.currencies VALUES (80, 'BAM', 'Bosnia Mark', 'KM', 2, true, '2025-11-04 19:35:31.563281');


--
-- Data for Name: currency_locks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.exchange_rates VALUES (1, 'CAD', 'AED', 2.602600, '2025-11-05', false, '2025-11-06 20:27:06.849315', '2025-11-06 20:27:06.849315');
INSERT INTO public.exchange_rates VALUES (2, 'CAD', 'AFN', 47.049400, '2025-11-05', false, '2025-11-06 20:27:06.97171', '2025-11-06 20:27:06.97171');
INSERT INTO public.exchange_rates VALUES (3, 'CAD', 'ALL', 59.554300, '2025-11-05', false, '2025-11-06 20:27:07.088339', '2025-11-06 20:27:07.088339');
INSERT INTO public.exchange_rates VALUES (4, 'CAD', 'AMD', 270.838400, '2025-11-05', false, '2025-11-06 20:27:07.205979', '2025-11-06 20:27:07.205979');
INSERT INTO public.exchange_rates VALUES (5, 'CAD', 'ANG', 1.268500, '2025-11-05', false, '2025-11-06 20:27:07.321743', '2025-11-06 20:27:07.321743');
INSERT INTO public.exchange_rates VALUES (6, 'CAD', 'AOA', 663.485300, '2025-11-05', false, '2025-11-06 20:27:07.438618', '2025-11-06 20:27:07.438618');
INSERT INTO public.exchange_rates VALUES (7, 'CAD', 'ARS', 1025.809600, '2025-11-05', false, '2025-11-06 20:27:07.556403', '2025-11-06 20:27:07.556403');
INSERT INTO public.exchange_rates VALUES (8, 'CAD', 'AUD', 1.090000, '2025-11-05', false, '2025-11-06 20:27:07.672215', '2025-11-06 20:27:07.672215');
INSERT INTO public.exchange_rates VALUES (9, 'CAD', 'AWG', 1.268500, '2025-11-05', false, '2025-11-06 20:27:07.788327', '2025-11-06 20:27:07.788327');
INSERT INTO public.exchange_rates VALUES (10, 'CAD', 'AZN', 1.203100, '2025-11-05', false, '2025-11-06 20:27:07.90771', '2025-11-06 20:27:07.90771');
INSERT INTO public.exchange_rates VALUES (11, 'CAD', 'BAM', 1.206300, '2025-11-05', false, '2025-11-06 20:27:08.023332', '2025-11-06 20:27:08.023332');
INSERT INTO public.exchange_rates VALUES (12, 'CAD', 'BBD', 1.417400, '2025-11-05', false, '2025-11-06 20:27:08.139137', '2025-11-06 20:27:08.139137');
INSERT INTO public.exchange_rates VALUES (13, 'CAD', 'BDT', 86.367500, '2025-11-05', false, '2025-11-06 20:27:08.254085', '2025-11-06 20:27:08.254085');
INSERT INTO public.exchange_rates VALUES (14, 'CAD', 'BGN', 1.206100, '2025-11-05', false, '2025-11-06 20:27:08.372891', '2025-11-06 20:27:08.372891');
INSERT INTO public.exchange_rates VALUES (15, 'CAD', 'BHD', 0.266500, '2025-11-05', false, '2025-11-06 20:27:08.48797', '2025-11-06 20:27:08.48797');
INSERT INTO public.exchange_rates VALUES (16, 'CAD', 'BIF', 2085.384600, '2025-11-05', false, '2025-11-06 20:27:08.613813', '2025-11-06 20:27:08.613813');
INSERT INTO public.exchange_rates VALUES (17, 'CAD', 'BMD', 0.708700, '2025-11-05', false, '2025-11-06 20:27:08.727791', '2025-11-06 20:27:08.727791');
INSERT INTO public.exchange_rates VALUES (18, 'CAD', 'BND', 0.926000, '2025-11-05', false, '2025-11-06 20:27:08.844375', '2025-11-06 20:27:08.844375');
INSERT INTO public.exchange_rates VALUES (19, 'CAD', 'BOB', 4.899200, '2025-11-05', false, '2025-11-06 20:27:08.961517', '2025-11-06 20:27:08.961517');
INSERT INTO public.exchange_rates VALUES (20, 'CAD', 'BRL', 3.820600, '2025-11-05', false, '2025-11-06 20:27:09.076042', '2025-11-06 20:27:09.076042');
INSERT INTO public.exchange_rates VALUES (21, 'CAD', 'BSD', 0.708700, '2025-11-05', false, '2025-11-06 20:27:09.191405', '2025-11-06 20:27:09.191405');
INSERT INTO public.exchange_rates VALUES (22, 'CAD', 'BTN', 62.746400, '2025-11-05', false, '2025-11-06 20:27:09.306752', '2025-11-06 20:27:09.306752');
INSERT INTO public.exchange_rates VALUES (23, 'CAD', 'BWP', 10.043500, '2025-11-05', false, '2025-11-06 20:27:09.421693', '2025-11-06 20:27:09.421693');
INSERT INTO public.exchange_rates VALUES (24, 'CAD', 'BYN', 2.280700, '2025-11-05', false, '2025-11-06 20:27:09.536454', '2025-11-06 20:27:09.536454');
INSERT INTO public.exchange_rates VALUES (25, 'CAD', 'BZD', 1.417400, '2025-11-05', false, '2025-11-06 20:27:09.651674', '2025-11-06 20:27:09.651674');
INSERT INTO public.exchange_rates VALUES (26, 'CAD', 'CDF', 1606.518500, '2025-11-05', false, '2025-11-06 20:27:09.767608', '2025-11-06 20:27:09.767608');
INSERT INTO public.exchange_rates VALUES (27, 'CAD', 'CHF', 0.574200, '2025-11-05', false, '2025-11-06 20:27:09.882733', '2025-11-06 20:27:09.882733');
INSERT INTO public.exchange_rates VALUES (28, 'CAD', 'CLF', 0.016960, '2025-11-05', false, '2025-11-06 20:27:10.001683', '2025-11-06 20:27:10.001683');
INSERT INTO public.exchange_rates VALUES (29, 'CAD', 'CLP', 670.341200, '2025-11-05', false, '2025-11-06 20:27:10.1163', '2025-11-06 20:27:10.1163');
INSERT INTO public.exchange_rates VALUES (30, 'CAD', 'CNH', 5.052400, '2025-11-05', false, '2025-11-06 20:27:10.233913', '2025-11-06 20:27:10.233913');
INSERT INTO public.exchange_rates VALUES (31, 'CAD', 'CNY', 5.054800, '2025-11-05', false, '2025-11-06 20:27:10.350588', '2025-11-06 20:27:10.350588');
INSERT INTO public.exchange_rates VALUES (32, 'CAD', 'COP', 2736.342200, '2025-11-05', false, '2025-11-06 20:27:10.466241', '2025-11-06 20:27:10.466241');
INSERT INTO public.exchange_rates VALUES (33, 'CAD', 'CRC', 355.137800, '2025-11-05', false, '2025-11-06 20:27:10.582712', '2025-11-06 20:27:10.582712');
INSERT INTO public.exchange_rates VALUES (34, 'CAD', 'CUP', 17.008200, '2025-11-05', false, '2025-11-06 20:27:10.697859', '2025-11-06 20:27:10.697859');
INSERT INTO public.exchange_rates VALUES (35, 'CAD', 'CVE', 68.005500, '2025-11-05', false, '2025-11-06 20:27:10.813155', '2025-11-06 20:27:10.813155');
INSERT INTO public.exchange_rates VALUES (36, 'CAD', 'CZK', 15.017900, '2025-11-05', false, '2025-11-06 20:27:10.927934', '2025-11-06 20:27:10.927934');
INSERT INTO public.exchange_rates VALUES (37, 'CAD', 'DJF', 125.946700, '2025-11-05', false, '2025-11-06 20:27:11.045221', '2025-11-06 20:27:11.045221');
INSERT INTO public.exchange_rates VALUES (38, 'CAD', 'DKK', 4.601200, '2025-11-05', false, '2025-11-06 20:27:11.161838', '2025-11-06 20:27:11.161838');
INSERT INTO public.exchange_rates VALUES (39, 'CAD', 'DOP', 45.395000, '2025-11-05', false, '2025-11-06 20:27:11.278988', '2025-11-06 20:27:11.278988');
INSERT INTO public.exchange_rates VALUES (40, 'CAD', 'DZD', 92.556200, '2025-11-05', false, '2025-11-06 20:27:11.394713', '2025-11-06 20:27:11.394713');
INSERT INTO public.exchange_rates VALUES (41, 'CAD', 'EGP', 33.570800, '2025-11-05', false, '2025-11-06 20:27:11.509845', '2025-11-06 20:27:11.509845');
INSERT INTO public.exchange_rates VALUES (42, 'CAD', 'ERN', 10.630200, '2025-11-05', false, '2025-11-06 20:27:11.625947', '2025-11-06 20:27:11.625947');
INSERT INTO public.exchange_rates VALUES (43, 'CAD', 'ETB', 108.766300, '2025-11-05', false, '2025-11-06 20:27:11.74139', '2025-11-06 20:27:11.74139');
INSERT INTO public.exchange_rates VALUES (44, 'CAD', 'EUR', 0.616800, '2025-11-05', false, '2025-11-06 20:27:11.857277', '2025-11-06 20:27:11.857277');
INSERT INTO public.exchange_rates VALUES (45, 'CAD', 'FJD', 1.613300, '2025-11-05', false, '2025-11-06 20:27:11.972556', '2025-11-06 20:27:11.972556');
INSERT INTO public.exchange_rates VALUES (46, 'CAD', 'FKP', 0.543200, '2025-11-05', false, '2025-11-06 20:27:12.096673', '2025-11-06 20:27:12.096673');
INSERT INTO public.exchange_rates VALUES (47, 'CAD', 'FOK', 4.601400, '2025-11-05', false, '2025-11-06 20:27:12.218685', '2025-11-06 20:27:12.218685');
INSERT INTO public.exchange_rates VALUES (48, 'CAD', 'GBP', 0.543300, '2025-11-05', false, '2025-11-06 20:27:12.336464', '2025-11-06 20:27:12.336464');
INSERT INTO public.exchange_rates VALUES (49, 'CAD', 'GEL', 1.918500, '2025-11-05', false, '2025-11-06 20:27:12.451692', '2025-11-06 20:27:12.451692');
INSERT INTO public.exchange_rates VALUES (50, 'CAD', 'GGP', 0.543200, '2025-11-05', false, '2025-11-06 20:27:12.567884', '2025-11-06 20:27:12.567884');
INSERT INTO public.exchange_rates VALUES (51, 'CAD', 'GHS', 7.858900, '2025-11-05', false, '2025-11-06 20:27:12.683983', '2025-11-06 20:27:12.683983');
INSERT INTO public.exchange_rates VALUES (52, 'CAD', 'GIP', 0.543200, '2025-11-05', false, '2025-11-06 20:27:12.800703', '2025-11-06 20:27:12.800703');
INSERT INTO public.exchange_rates VALUES (53, 'CAD', 'GMD', 52.017100, '2025-11-05', false, '2025-11-06 20:27:12.916392', '2025-11-06 20:27:12.916392');
INSERT INTO public.exchange_rates VALUES (54, 'CAD', 'GNF', 6165.926600, '2025-11-05', false, '2025-11-06 20:27:13.032576', '2025-11-06 20:27:13.032576');
INSERT INTO public.exchange_rates VALUES (55, 'CAD', 'GTQ', 5.423100, '2025-11-05', false, '2025-11-06 20:27:13.149055', '2025-11-06 20:27:13.149055');
INSERT INTO public.exchange_rates VALUES (56, 'CAD', 'GYD', 148.243300, '2025-11-05', false, '2025-11-06 20:27:13.265053', '2025-11-06 20:27:13.265053');
INSERT INTO public.exchange_rates VALUES (57, 'CAD', 'HKD', 5.509000, '2025-11-05', false, '2025-11-06 20:27:13.380681', '2025-11-06 20:27:13.380681');
INSERT INTO public.exchange_rates VALUES (58, 'CAD', 'HNL', 18.631300, '2025-11-05', false, '2025-11-06 20:27:13.496728', '2025-11-06 20:27:13.496728');
INSERT INTO public.exchange_rates VALUES (59, 'CAD', 'HRK', 4.646900, '2025-11-05', false, '2025-11-06 20:27:13.612881', '2025-11-06 20:27:13.612881');
INSERT INTO public.exchange_rates VALUES (60, 'CAD', 'HTG', 92.723400, '2025-11-05', false, '2025-11-06 20:27:13.728483', '2025-11-06 20:27:13.728483');
INSERT INTO public.exchange_rates VALUES (61, 'CAD', 'HUF', 238.659400, '2025-11-05', false, '2025-11-06 20:27:13.844465', '2025-11-06 20:27:13.844465');
INSERT INTO public.exchange_rates VALUES (62, 'CAD', 'IDR', 11810.472900, '2025-11-05', false, '2025-11-06 20:27:13.960201', '2025-11-06 20:27:13.960201');
INSERT INTO public.exchange_rates VALUES (63, 'CAD', 'ILS', 2.311700, '2025-11-05', false, '2025-11-06 20:27:14.127294', '2025-11-06 20:27:14.127294');
INSERT INTO public.exchange_rates VALUES (64, 'CAD', 'IMP', 0.543200, '2025-11-05', false, '2025-11-06 20:27:14.244125', '2025-11-06 20:27:14.244125');
INSERT INTO public.exchange_rates VALUES (65, 'CAD', 'INR', 62.752700, '2025-11-05', false, '2025-11-06 20:27:14.361172', '2025-11-06 20:27:14.361172');
INSERT INTO public.exchange_rates VALUES (66, 'CAD', 'IQD', 926.837600, '2025-11-05', false, '2025-11-06 20:27:14.475938', '2025-11-06 20:27:14.475938');
INSERT INTO public.exchange_rates VALUES (67, 'CAD', 'IRR', 30264.289300, '2025-11-05', false, '2025-11-06 20:27:14.591011', '2025-11-06 20:27:14.591011');
INSERT INTO public.exchange_rates VALUES (68, 'CAD', 'ISK', 90.585700, '2025-11-05', false, '2025-11-06 20:27:14.706773', '2025-11-06 20:27:14.706773');
INSERT INTO public.exchange_rates VALUES (69, 'CAD', 'JEP', 0.543200, '2025-11-05', false, '2025-11-06 20:27:14.820956', '2025-11-06 20:27:14.820956');
INSERT INTO public.exchange_rates VALUES (70, 'CAD', 'JMD', 114.124900, '2025-11-05', false, '2025-11-06 20:27:14.937021', '2025-11-06 20:27:14.937021');
INSERT INTO public.exchange_rates VALUES (71, 'CAD', 'JOD', 0.502500, '2025-11-05', false, '2025-11-06 20:27:15.053612', '2025-11-06 20:27:15.053612');
INSERT INTO public.exchange_rates VALUES (72, 'CAD', 'JPY', 109.121700, '2025-11-05', false, '2025-11-06 20:27:15.168989', '2025-11-06 20:27:15.168989');
INSERT INTO public.exchange_rates VALUES (73, 'CAD', 'KES', 91.276900, '2025-11-05', false, '2025-11-06 20:27:15.285198', '2025-11-06 20:27:15.285198');
INSERT INTO public.exchange_rates VALUES (74, 'CAD', 'KGS', 61.840600, '2025-11-05', false, '2025-11-06 20:27:15.401566', '2025-11-06 20:27:15.401566');
INSERT INTO public.exchange_rates VALUES (75, 'CAD', 'KHR', 2853.684200, '2025-11-05', false, '2025-11-06 20:27:15.517534', '2025-11-06 20:27:15.517534');
INSERT INTO public.exchange_rates VALUES (76, 'CAD', 'KID', 1.090100, '2025-11-05', false, '2025-11-06 20:27:15.635186', '2025-11-06 20:27:15.635186');
INSERT INTO public.exchange_rates VALUES (77, 'CAD', 'KMF', 303.419100, '2025-11-05', false, '2025-11-06 20:27:15.750812', '2025-11-06 20:27:15.750812');
INSERT INTO public.exchange_rates VALUES (78, 'CAD', 'KRW', 1021.942500, '2025-11-05', false, '2025-11-06 20:27:15.866445', '2025-11-06 20:27:15.866445');
INSERT INTO public.exchange_rates VALUES (79, 'CAD', 'KWD', 0.217300, '2025-11-05', false, '2025-11-06 20:27:15.983681', '2025-11-06 20:27:15.983681');
INSERT INTO public.exchange_rates VALUES (80, 'CAD', 'KYD', 0.590600, '2025-11-05', false, '2025-11-06 20:27:16.099675', '2025-11-06 20:27:16.099675');
INSERT INTO public.exchange_rates VALUES (81, 'CAD', 'KZT', 371.947300, '2025-11-05', false, '2025-11-06 20:27:16.215332', '2025-11-06 20:27:16.215332');
INSERT INTO public.exchange_rates VALUES (82, 'CAD', 'LAK', 15373.485700, '2025-11-05', false, '2025-11-06 20:27:16.330059', '2025-11-06 20:27:16.330059');
INSERT INTO public.exchange_rates VALUES (83, 'CAD', 'LBP', 63426.568400, '2025-11-05', false, '2025-11-06 20:27:16.445061', '2025-11-06 20:27:16.445061');
INSERT INTO public.exchange_rates VALUES (84, 'CAD', 'LKR', 215.570600, '2025-11-05', false, '2025-11-06 20:27:16.561562', '2025-11-06 20:27:16.561562');
INSERT INTO public.exchange_rates VALUES (85, 'CAD', 'LRD', 129.711300, '2025-11-05', false, '2025-11-06 20:27:16.677519', '2025-11-06 20:27:16.677519');
INSERT INTO public.exchange_rates VALUES (86, 'CAD', 'LSL', 12.345400, '2025-11-05', false, '2025-11-06 20:27:16.795349', '2025-11-06 20:27:16.795349');
INSERT INTO public.exchange_rates VALUES (87, 'CAD', 'LYD', 3.871400, '2025-11-05', false, '2025-11-06 20:27:16.911427', '2025-11-06 20:27:16.911427');
INSERT INTO public.exchange_rates VALUES (88, 'CAD', 'MAD', 6.594900, '2025-11-05', false, '2025-11-06 20:27:17.028185', '2025-11-06 20:27:17.028185');
INSERT INTO public.exchange_rates VALUES (89, 'CAD', 'MDL', 12.070200, '2025-11-05', false, '2025-11-06 20:27:17.143832', '2025-11-06 20:27:17.143832');
INSERT INTO public.exchange_rates VALUES (90, 'CAD', 'MGA', 3187.345900, '2025-11-05', false, '2025-11-06 20:27:17.259158', '2025-11-06 20:27:17.259158');
INSERT INTO public.exchange_rates VALUES (91, 'CAD', 'MKD', 38.028800, '2025-11-05', false, '2025-11-06 20:27:17.374886', '2025-11-06 20:27:17.374886');
INSERT INTO public.exchange_rates VALUES (92, 'CAD', 'MMK', 1485.101900, '2025-11-05', false, '2025-11-06 20:27:17.491501', '2025-11-06 20:27:17.491501');
INSERT INTO public.exchange_rates VALUES (93, 'CAD', 'MNT', 2553.976600, '2025-11-05', false, '2025-11-06 20:27:17.6081', '2025-11-06 20:27:17.6081');
INSERT INTO public.exchange_rates VALUES (94, 'CAD', 'MOP', 5.674400, '2025-11-05', false, '2025-11-06 20:27:17.723589', '2025-11-06 20:27:17.723589');
INSERT INTO public.exchange_rates VALUES (95, 'CAD', 'MRU', 28.394900, '2025-11-05', false, '2025-11-06 20:27:17.839283', '2025-11-06 20:27:17.839283');
INSERT INTO public.exchange_rates VALUES (96, 'CAD', 'MUR', 32.568600, '2025-11-05', false, '2025-11-06 20:27:17.95538', '2025-11-06 20:27:17.95538');
INSERT INTO public.exchange_rates VALUES (97, 'CAD', 'MVR', 10.935700, '2025-11-05', false, '2025-11-06 20:27:18.070105', '2025-11-06 20:27:18.070105');
INSERT INTO public.exchange_rates VALUES (98, 'CAD', 'MWK', 1235.774500, '2025-11-05', false, '2025-11-06 20:27:18.18568', '2025-11-06 20:27:18.18568');
INSERT INTO public.exchange_rates VALUES (99, 'CAD', 'MXN', 13.187800, '2025-11-05', false, '2025-11-06 20:27:18.30201', '2025-11-06 20:27:18.30201');
INSERT INTO public.exchange_rates VALUES (100, 'CAD', 'MYR', 2.969500, '2025-11-05', false, '2025-11-06 20:27:18.416543', '2025-11-06 20:27:18.416543');
INSERT INTO public.exchange_rates VALUES (101, 'CAD', 'MZN', 45.243800, '2025-11-05', false, '2025-11-06 20:27:18.532792', '2025-11-06 20:27:18.532792');
INSERT INTO public.exchange_rates VALUES (102, 'CAD', 'NAD', 12.345400, '2025-11-05', false, '2025-11-06 20:27:18.648635', '2025-11-06 20:27:18.648635');
INSERT INTO public.exchange_rates VALUES (103, 'CAD', 'NGN', 1023.815900, '2025-11-05', false, '2025-11-06 20:27:18.768321', '2025-11-06 20:27:18.768321');
INSERT INTO public.exchange_rates VALUES (104, 'CAD', 'NIO', 26.045300, '2025-11-05', false, '2025-11-06 20:27:18.887254', '2025-11-06 20:27:18.887254');
INSERT INTO public.exchange_rates VALUES (105, 'CAD', 'NOK', 7.239300, '2025-11-05', false, '2025-11-06 20:27:19.002909', '2025-11-06 20:27:19.002909');
INSERT INTO public.exchange_rates VALUES (106, 'CAD', 'NPR', 100.394300, '2025-11-05', false, '2025-11-06 20:27:19.116974', '2025-11-06 20:27:19.116974');
INSERT INTO public.exchange_rates VALUES (107, 'CAD', 'NZD', 1.252200, '2025-11-05', false, '2025-11-06 20:27:19.231541', '2025-11-06 20:27:19.231541');
INSERT INTO public.exchange_rates VALUES (108, 'CAD', 'OMR', 0.272500, '2025-11-05', false, '2025-11-06 20:27:19.34661', '2025-11-06 20:27:19.34661');
INSERT INTO public.exchange_rates VALUES (109, 'CAD', 'PAB', 0.708700, '2025-11-05', false, '2025-11-06 20:27:19.468751', '2025-11-06 20:27:19.468751');
INSERT INTO public.exchange_rates VALUES (110, 'CAD', 'PEN', 2.390800, '2025-11-05', false, '2025-11-06 20:27:19.584885', '2025-11-06 20:27:19.584885');
INSERT INTO public.exchange_rates VALUES (111, 'CAD', 'PGK', 3.014600, '2025-11-05', false, '2025-11-06 20:27:19.700776', '2025-11-06 20:27:19.700776');
INSERT INTO public.exchange_rates VALUES (112, 'CAD', 'PHP', 41.628800, '2025-11-05', false, '2025-11-06 20:27:19.818434', '2025-11-06 20:27:19.818434');
INSERT INTO public.exchange_rates VALUES (113, 'CAD', 'PKR', 200.118800, '2025-11-05', false, '2025-11-06 20:27:19.935423', '2025-11-06 20:27:19.935423');
INSERT INTO public.exchange_rates VALUES (114, 'CAD', 'PLN', 2.624800, '2025-11-05', false, '2025-11-06 20:27:20.052754', '2025-11-06 20:27:20.052754');
INSERT INTO public.exchange_rates VALUES (115, 'CAD', 'PYG', 5023.323300, '2025-11-05', false, '2025-11-06 20:27:20.169566', '2025-11-06 20:27:20.169566');
INSERT INTO public.exchange_rates VALUES (116, 'CAD', 'QAR', 2.579600, '2025-11-05', false, '2025-11-06 20:27:20.285425', '2025-11-06 20:27:20.285425');
INSERT INTO public.exchange_rates VALUES (117, 'CAD', 'RON', 3.133200, '2025-11-05', false, '2025-11-06 20:27:20.400732', '2025-11-06 20:27:20.400732');
INSERT INTO public.exchange_rates VALUES (118, 'CAD', 'RSD', 72.297700, '2025-11-05', false, '2025-11-06 20:27:20.516323', '2025-11-06 20:27:20.516323');
INSERT INTO public.exchange_rates VALUES (119, 'CAD', 'RUB', 57.502700, '2025-11-05', false, '2025-11-06 20:27:20.632756', '2025-11-06 20:27:20.632756');
INSERT INTO public.exchange_rates VALUES (120, 'CAD', 'RWF', 1044.972100, '2025-11-05', false, '2025-11-06 20:27:20.748036', '2025-11-06 20:27:20.748036');
INSERT INTO public.exchange_rates VALUES (121, 'CAD', 'SAR', 2.657500, '2025-11-05', false, '2025-11-06 20:27:20.864354', '2025-11-06 20:27:20.864354');
INSERT INTO public.exchange_rates VALUES (122, 'CAD', 'SBD', 5.879400, '2025-11-05', false, '2025-11-06 20:27:20.980419', '2025-11-06 20:27:20.980419');
INSERT INTO public.exchange_rates VALUES (123, 'CAD', 'SCR', 10.266600, '2025-11-05', false, '2025-11-06 20:27:21.096782', '2025-11-06 20:27:21.096782');
INSERT INTO public.exchange_rates VALUES (124, 'CAD', 'SDG', 316.613100, '2025-11-05', false, '2025-11-06 20:27:21.212259', '2025-11-06 20:27:21.212259');
INSERT INTO public.exchange_rates VALUES (125, 'CAD', 'SEK', 6.779200, '2025-11-05', false, '2025-11-06 20:27:21.327594', '2025-11-06 20:27:21.327594');
INSERT INTO public.exchange_rates VALUES (126, 'CAD', 'SGD', 0.926000, '2025-11-05', false, '2025-11-06 20:27:21.443222', '2025-11-06 20:27:21.443222');
INSERT INTO public.exchange_rates VALUES (127, 'CAD', 'SHP', 0.543200, '2025-11-05', false, '2025-11-06 20:27:21.560306', '2025-11-06 20:27:21.560306');
INSERT INTO public.exchange_rates VALUES (128, 'CAD', 'SLE', 16.441500, '2025-11-05', false, '2025-11-06 20:27:21.67663', '2025-11-06 20:27:21.67663');
INSERT INTO public.exchange_rates VALUES (129, 'CAD', 'SLL', 16440.780900, '2025-11-05', false, '2025-11-06 20:27:21.793215', '2025-11-06 20:27:21.793215');
INSERT INTO public.exchange_rates VALUES (130, 'CAD', 'SOS', 405.383200, '2025-11-05', false, '2025-11-06 20:27:21.90914', '2025-11-06 20:27:21.90914');
INSERT INTO public.exchange_rates VALUES (131, 'CAD', 'SRD', 28.158900, '2025-11-05', false, '2025-11-06 20:27:22.025267', '2025-11-06 20:27:22.025267');
INSERT INTO public.exchange_rates VALUES (132, 'CAD', 'SSP', 3340.225600, '2025-11-05', false, '2025-11-06 20:27:22.140471', '2025-11-06 20:27:22.140471');
INSERT INTO public.exchange_rates VALUES (133, 'CAD', 'STN', 15.110300, '2025-11-05', false, '2025-11-06 20:27:22.381186', '2025-11-06 20:27:22.381186');
INSERT INTO public.exchange_rates VALUES (134, 'CAD', 'SYP', 7794.027500, '2025-11-05', false, '2025-11-06 20:27:22.49643', '2025-11-06 20:27:22.49643');
INSERT INTO public.exchange_rates VALUES (135, 'CAD', 'SZL', 12.345400, '2025-11-05', false, '2025-11-06 20:27:22.610994', '2025-11-06 20:27:22.610994');
INSERT INTO public.exchange_rates VALUES (136, 'CAD', 'THB', 23.037700, '2025-11-05', false, '2025-11-06 20:27:22.726868', '2025-11-06 20:27:22.726868');
INSERT INTO public.exchange_rates VALUES (137, 'CAD', 'TJS', 6.576000, '2025-11-05', false, '2025-11-06 20:27:22.843032', '2025-11-06 20:27:22.843032');
INSERT INTO public.exchange_rates VALUES (138, 'CAD', 'TMT', 2.476300, '2025-11-05', false, '2025-11-06 20:27:22.960189', '2025-11-06 20:27:22.960189');
INSERT INTO public.exchange_rates VALUES (139, 'CAD', 'TND', 2.094400, '2025-11-05', false, '2025-11-06 20:27:23.076949', '2025-11-06 20:27:23.076949');
INSERT INTO public.exchange_rates VALUES (140, 'CAD', 'TOP', 1.673200, '2025-11-05', false, '2025-11-06 20:27:23.211946', '2025-11-06 20:27:23.211946');
INSERT INTO public.exchange_rates VALUES (141, 'CAD', 'TRY', 29.872600, '2025-11-05', false, '2025-11-06 20:27:23.330441', '2025-11-06 20:27:23.330441');
INSERT INTO public.exchange_rates VALUES (142, 'CAD', 'TTD', 4.791500, '2025-11-05', false, '2025-11-06 20:27:23.446981', '2025-11-06 20:27:23.446981');
INSERT INTO public.exchange_rates VALUES (143, 'CAD', 'TVD', 1.090100, '2025-11-05', false, '2025-11-06 20:27:23.562562', '2025-11-06 20:27:23.562562');
INSERT INTO public.exchange_rates VALUES (144, 'CAD', 'TWD', 21.898500, '2025-11-05', false, '2025-11-06 20:27:23.678455', '2025-11-06 20:27:23.678455');
INSERT INTO public.exchange_rates VALUES (145, 'CAD', 'TZS', 1755.388100, '2025-11-05', false, '2025-11-06 20:27:23.793821', '2025-11-06 20:27:23.793821');
INSERT INTO public.exchange_rates VALUES (146, 'CAD', 'UAH', 29.770300, '2025-11-05', false, '2025-11-06 20:27:23.909323', '2025-11-06 20:27:23.909323');
INSERT INTO public.exchange_rates VALUES (147, 'CAD', 'UGX', 2483.070600, '2025-11-05', false, '2025-11-06 20:27:24.026396', '2025-11-06 20:27:24.026396');
INSERT INTO public.exchange_rates VALUES (148, 'CAD', 'USD', 0.708700, '2025-11-05', false, '2025-11-06 20:27:24.142708', '2025-11-06 20:27:24.142708');
INSERT INTO public.exchange_rates VALUES (149, 'CAD', 'UYU', 28.149400, '2025-11-05', false, '2025-11-06 20:27:24.25867', '2025-11-06 20:27:24.25867');
INSERT INTO public.exchange_rates VALUES (150, 'CAD', 'UZS', 8411.947700, '2025-11-05', false, '2025-11-06 20:27:24.372966', '2025-11-06 20:27:24.372966');
INSERT INTO public.exchange_rates VALUES (151, 'CAD', 'VES', 161.270600, '2025-11-05', false, '2025-11-06 20:27:24.488632', '2025-11-06 20:27:24.488632');
INSERT INTO public.exchange_rates VALUES (152, 'CAD', 'VND', 18569.756100, '2025-11-05', false, '2025-11-06 20:27:24.604217', '2025-11-06 20:27:24.604217');
INSERT INTO public.exchange_rates VALUES (153, 'CAD', 'VUV', 85.781800, '2025-11-05', false, '2025-11-06 20:27:24.720014', '2025-11-06 20:27:24.720014');
INSERT INTO public.exchange_rates VALUES (154, 'CAD', 'WST', 1.971700, '2025-11-05', false, '2025-11-06 20:27:24.836914', '2025-11-06 20:27:24.836914');
INSERT INTO public.exchange_rates VALUES (155, 'CAD', 'XAF', 404.558800, '2025-11-05', false, '2025-11-06 20:27:24.952693', '2025-11-06 20:27:24.952693');
INSERT INTO public.exchange_rates VALUES (156, 'CAD', 'XCD', 1.913400, '2025-11-05', false, '2025-11-06 20:27:25.068887', '2025-11-06 20:27:25.068887');
INSERT INTO public.exchange_rates VALUES (157, 'CAD', 'XCG', 1.268500, '2025-11-05', false, '2025-11-06 20:27:25.184429', '2025-11-06 20:27:25.184429');
INSERT INTO public.exchange_rates VALUES (158, 'CAD', 'XDR', 0.524300, '2025-11-05', false, '2025-11-06 20:27:25.302542', '2025-11-06 20:27:25.302542');
INSERT INTO public.exchange_rates VALUES (159, 'CAD', 'XOF', 404.558800, '2025-11-05', false, '2025-11-06 20:27:25.417923', '2025-11-06 20:27:25.417923');
INSERT INTO public.exchange_rates VALUES (160, 'CAD', 'XPF', 73.597500, '2025-11-05', false, '2025-11-06 20:27:25.534241', '2025-11-06 20:27:25.534241');
INSERT INTO public.exchange_rates VALUES (161, 'CAD', 'YER', 169.239200, '2025-11-05', false, '2025-11-06 20:27:25.650148', '2025-11-06 20:27:25.650148');
INSERT INTO public.exchange_rates VALUES (162, 'CAD', 'ZAR', 12.345600, '2025-11-05', false, '2025-11-06 20:27:25.766427', '2025-11-06 20:27:25.766427');
INSERT INTO public.exchange_rates VALUES (163, 'CAD', 'ZMW', 15.947200, '2025-11-05', false, '2025-11-06 20:27:25.882159', '2025-11-06 20:27:25.882159');
INSERT INTO public.exchange_rates VALUES (164, 'CAD', 'ZWL', 18.688700, '2025-11-05', false, '2025-11-06 20:27:25.9977', '2025-11-06 20:27:25.9977');
INSERT INTO public.exchange_rates VALUES (165, 'USD', 'AED', 3.672500, '2025-11-07', false, '2025-11-07 19:22:36.28669', '2025-11-07 19:22:36.28669');
INSERT INTO public.exchange_rates VALUES (166, 'USD', 'AFN', 66.329100, '2025-11-07', false, '2025-11-07 19:22:36.412883', '2025-11-07 19:22:36.412883');
INSERT INTO public.exchange_rates VALUES (167, 'USD', 'ALL', 83.878300, '2025-11-07', false, '2025-11-07 19:22:36.531587', '2025-11-07 19:22:36.531587');
INSERT INTO public.exchange_rates VALUES (168, 'USD', 'AMD', 382.591200, '2025-11-07', false, '2025-11-07 19:22:36.650669', '2025-11-07 19:22:36.650669');
INSERT INTO public.exchange_rates VALUES (169, 'USD', 'ANG', 1.790000, '2025-11-07', false, '2025-11-07 19:22:36.768431', '2025-11-07 19:22:36.768431');
INSERT INTO public.exchange_rates VALUES (170, 'USD', 'AOA', 920.113500, '2025-11-07', false, '2025-11-07 19:22:36.886199', '2025-11-07 19:22:36.886199');
INSERT INTO public.exchange_rates VALUES (171, 'USD', 'ARS', 1447.500000, '2025-11-07', false, '2025-11-07 19:22:37.010857', '2025-11-07 19:22:37.010857');
INSERT INTO public.exchange_rates VALUES (172, 'USD', 'AUD', 1.541300, '2025-11-07', false, '2025-11-07 19:22:37.133885', '2025-11-07 19:22:37.133885');
INSERT INTO public.exchange_rates VALUES (173, 'USD', 'AWG', 1.790000, '2025-11-07', false, '2025-11-07 19:22:37.259011', '2025-11-07 19:22:37.259011');
INSERT INTO public.exchange_rates VALUES (174, 'USD', 'AZN', 1.698900, '2025-11-07', false, '2025-11-07 19:22:37.386183', '2025-11-07 19:22:37.386183');
INSERT INTO public.exchange_rates VALUES (175, 'USD', 'BAM', 1.695100, '2025-11-07', false, '2025-11-07 19:22:37.504604', '2025-11-07 19:22:37.504604');
INSERT INTO public.exchange_rates VALUES (176, 'USD', 'BBD', 2.000000, '2025-11-07', false, '2025-11-07 19:22:37.622918', '2025-11-07 19:22:37.622918');
INSERT INTO public.exchange_rates VALUES (177, 'USD', 'BDT', 121.980300, '2025-11-07', false, '2025-11-07 19:22:37.741702', '2025-11-07 19:22:37.741702');
INSERT INTO public.exchange_rates VALUES (178, 'USD', 'BGN', 1.695200, '2025-11-07', false, '2025-11-07 19:22:37.862197', '2025-11-07 19:22:37.862197');
INSERT INTO public.exchange_rates VALUES (179, 'USD', 'BHD', 0.376000, '2025-11-07', false, '2025-11-07 19:22:37.988684', '2025-11-07 19:22:37.988684');
INSERT INTO public.exchange_rates VALUES (180, 'USD', 'BIF', 2951.674800, '2025-11-07', false, '2025-11-07 19:22:38.106314', '2025-11-07 19:22:38.106314');
INSERT INTO public.exchange_rates VALUES (181, 'USD', 'BMD', 1.000000, '2025-11-07', false, '2025-11-07 19:22:38.22478', '2025-11-07 19:22:38.22478');
INSERT INTO public.exchange_rates VALUES (182, 'USD', 'BND', 1.304600, '2025-11-07', false, '2025-11-07 19:22:38.345248', '2025-11-07 19:22:38.345248');
INSERT INTO public.exchange_rates VALUES (183, 'USD', 'BOB', 6.917700, '2025-11-07', false, '2025-11-07 19:22:38.466152', '2025-11-07 19:22:38.466152');
INSERT INTO public.exchange_rates VALUES (184, 'USD', 'BRL', 5.351100, '2025-11-07', false, '2025-11-07 19:22:38.590222', '2025-11-07 19:22:38.590222');
INSERT INTO public.exchange_rates VALUES (185, 'USD', 'BSD', 1.000000, '2025-11-07', false, '2025-11-07 19:22:38.711057', '2025-11-07 19:22:38.711057');
INSERT INTO public.exchange_rates VALUES (186, 'USD', 'BTN', 88.677700, '2025-11-07', false, '2025-11-07 19:22:38.830999', '2025-11-07 19:22:38.830999');
INSERT INTO public.exchange_rates VALUES (187, 'USD', 'BWP', 13.821500, '2025-11-07', false, '2025-11-07 19:22:38.953379', '2025-11-07 19:22:38.953379');
INSERT INTO public.exchange_rates VALUES (188, 'USD', 'BYN', 3.257400, '2025-11-07', false, '2025-11-07 19:22:39.072769', '2025-11-07 19:22:39.072769');
INSERT INTO public.exchange_rates VALUES (189, 'USD', 'BZD', 2.000000, '2025-11-07', false, '2025-11-07 19:22:39.191486', '2025-11-07 19:22:39.191486');
INSERT INTO public.exchange_rates VALUES (190, 'USD', 'CAD', 1.410900, '2025-11-07', false, '2025-11-07 19:22:39.310735', '2025-11-07 19:22:39.310735');
INSERT INTO public.exchange_rates VALUES (191, 'USD', 'CDF', 2244.538800, '2025-11-07', false, '2025-11-07 19:22:39.436218', '2025-11-07 19:22:39.436218');
INSERT INTO public.exchange_rates VALUES (192, 'USD', 'CHF', 0.807000, '2025-11-07', false, '2025-11-07 19:22:39.557111', '2025-11-07 19:22:39.557111');
INSERT INTO public.exchange_rates VALUES (193, 'USD', 'CLF', 0.023880, '2025-11-07', false, '2025-11-07 19:22:39.69291', '2025-11-07 19:22:39.69291');
INSERT INTO public.exchange_rates VALUES (194, 'USD', 'CLP', 943.816400, '2025-11-07', false, '2025-11-07 19:22:39.816208', '2025-11-07 19:22:39.816208');
INSERT INTO public.exchange_rates VALUES (195, 'USD', 'CNH', 7.121500, '2025-11-07', false, '2025-11-07 19:22:39.942986', '2025-11-07 19:22:39.942986');
INSERT INTO public.exchange_rates VALUES (196, 'USD', 'CNY', 7.120200, '2025-11-07', false, '2025-11-07 19:22:40.092226', '2025-11-07 19:22:40.092226');
INSERT INTO public.exchange_rates VALUES (197, 'USD', 'COP', 3832.972000, '2025-11-07', false, '2025-11-07 19:22:40.215926', '2025-11-07 19:22:40.215926');
INSERT INTO public.exchange_rates VALUES (198, 'USD', 'CRC', 501.885400, '2025-11-07', false, '2025-11-07 19:22:40.337201', '2025-11-07 19:22:40.337201');
INSERT INTO public.exchange_rates VALUES (199, 'USD', 'CUP', 24.000000, '2025-11-07', false, '2025-11-07 19:22:40.457782', '2025-11-07 19:22:40.457782');
INSERT INTO public.exchange_rates VALUES (200, 'USD', 'CVE', 95.565500, '2025-11-07', false, '2025-11-07 19:22:40.579568', '2025-11-07 19:22:40.579568');
INSERT INTO public.exchange_rates VALUES (201, 'USD', 'CZK', 21.097100, '2025-11-07', false, '2025-11-07 19:22:40.699065', '2025-11-07 19:22:40.699065');
INSERT INTO public.exchange_rates VALUES (202, 'USD', 'DJF', 177.721000, '2025-11-07', false, '2025-11-07 19:22:40.818588', '2025-11-07 19:22:40.818588');
INSERT INTO public.exchange_rates VALUES (203, 'USD', 'DKK', 6.465800, '2025-11-07', false, '2025-11-07 19:22:40.947925', '2025-11-07 19:22:40.947925');
INSERT INTO public.exchange_rates VALUES (204, 'USD', 'DOP', 64.239300, '2025-11-07', false, '2025-11-07 19:22:41.070088', '2025-11-07 19:22:41.070088');
INSERT INTO public.exchange_rates VALUES (205, 'USD', 'DZD', 130.628700, '2025-11-07', false, '2025-11-07 19:22:41.189342', '2025-11-07 19:22:41.189342');
INSERT INTO public.exchange_rates VALUES (206, 'USD', 'EGP', 47.338400, '2025-11-07', false, '2025-11-07 19:22:41.313416', '2025-11-07 19:22:41.313416');
INSERT INTO public.exchange_rates VALUES (207, 'USD', 'ERN', 15.000000, '2025-11-07', false, '2025-11-07 19:22:41.435216', '2025-11-07 19:22:41.435216');
INSERT INTO public.exchange_rates VALUES (208, 'USD', 'ETB', 152.232700, '2025-11-07', false, '2025-11-07 19:22:41.578082', '2025-11-07 19:22:41.578082');
INSERT INTO public.exchange_rates VALUES (209, 'USD', 'EUR', 0.866600, '2025-11-07', false, '2025-11-07 19:22:41.708632', '2025-11-07 19:22:41.708632');
INSERT INTO public.exchange_rates VALUES (210, 'USD', 'FJD', 2.280300, '2025-11-07', false, '2025-11-07 19:22:41.828355', '2025-11-07 19:22:41.828355');
INSERT INTO public.exchange_rates VALUES (211, 'USD', 'FKP', 0.762300, '2025-11-07', false, '2025-11-07 19:22:41.947752', '2025-11-07 19:22:41.947752');
INSERT INTO public.exchange_rates VALUES (212, 'USD', 'FOK', 6.466100, '2025-11-07', false, '2025-11-07 19:22:42.074639', '2025-11-07 19:22:42.074639');
INSERT INTO public.exchange_rates VALUES (213, 'USD', 'GBP', 0.762000, '2025-11-07', false, '2025-11-07 19:22:42.195382', '2025-11-07 19:22:42.195382');
INSERT INTO public.exchange_rates VALUES (214, 'USD', 'GEL', 2.707300, '2025-11-07', false, '2025-11-07 19:22:42.318051', '2025-11-07 19:22:42.318051');
INSERT INTO public.exchange_rates VALUES (215, 'USD', 'GGP', 0.762300, '2025-11-07', false, '2025-11-07 19:22:42.438354', '2025-11-07 19:22:42.438354');
INSERT INTO public.exchange_rates VALUES (216, 'USD', 'GHS', 11.119100, '2025-11-07', false, '2025-11-07 19:22:42.570975', '2025-11-07 19:22:42.570975');
INSERT INTO public.exchange_rates VALUES (217, 'USD', 'GIP', 0.762300, '2025-11-07', false, '2025-11-07 19:22:42.689475', '2025-11-07 19:22:42.689475');
INSERT INTO public.exchange_rates VALUES (218, 'USD', 'GMD', 73.394400, '2025-11-07', false, '2025-11-07 19:22:42.807656', '2025-11-07 19:22:42.807656');
INSERT INTO public.exchange_rates VALUES (219, 'USD', 'GNF', 8702.226400, '2025-11-07', false, '2025-11-07 19:22:42.927306', '2025-11-07 19:22:42.927306');
INSERT INTO public.exchange_rates VALUES (220, 'USD', 'GTQ', 7.657000, '2025-11-07', false, '2025-11-07 19:22:43.05062', '2025-11-07 19:22:43.05062');
INSERT INTO public.exchange_rates VALUES (221, 'USD', 'GYD', 209.196900, '2025-11-07', false, '2025-11-07 19:22:43.178567', '2025-11-07 19:22:43.178567');
INSERT INTO public.exchange_rates VALUES (222, 'USD', 'HKD', 7.774800, '2025-11-07', false, '2025-11-07 19:22:43.299342', '2025-11-07 19:22:43.299342');
INSERT INTO public.exchange_rates VALUES (223, 'USD', 'HNL', 26.290700, '2025-11-07', false, '2025-11-07 19:22:43.420878', '2025-11-07 19:22:43.420878');
INSERT INTO public.exchange_rates VALUES (224, 'USD', 'HRK', 6.530100, '2025-11-07', false, '2025-11-07 19:22:43.541339', '2025-11-07 19:22:43.541339');
INSERT INTO public.exchange_rates VALUES (225, 'USD', 'HTG', 130.930900, '2025-11-07', false, '2025-11-07 19:22:43.659565', '2025-11-07 19:22:43.659565');
INSERT INTO public.exchange_rates VALUES (226, 'USD', 'HUF', 334.597400, '2025-11-07', false, '2025-11-07 19:22:43.778797', '2025-11-07 19:22:43.778797');
INSERT INTO public.exchange_rates VALUES (227, 'USD', 'IDR', 16676.986400, '2025-11-07', false, '2025-11-07 19:22:44.008577', '2025-11-07 19:22:44.008577');
INSERT INTO public.exchange_rates VALUES (228, 'USD', 'ILS', 3.262200, '2025-11-07', false, '2025-11-07 19:22:44.1272', '2025-11-07 19:22:44.1272');
INSERT INTO public.exchange_rates VALUES (229, 'USD', 'IMP', 0.762300, '2025-11-07', false, '2025-11-07 19:22:44.245417', '2025-11-07 19:22:44.245417');
INSERT INTO public.exchange_rates VALUES (230, 'USD', 'INR', 88.676400, '2025-11-07', false, '2025-11-07 19:22:44.362848', '2025-11-07 19:22:44.362848');
INSERT INTO public.exchange_rates VALUES (231, 'USD', 'IQD', 1308.787100, '2025-11-07', false, '2025-11-07 19:22:44.481402', '2025-11-07 19:22:44.481402');
INSERT INTO public.exchange_rates VALUES (232, 'USD', 'IRR', 42415.872600, '2025-11-07', false, '2025-11-07 19:22:44.599615', '2025-11-07 19:22:44.599615');
INSERT INTO public.exchange_rates VALUES (233, 'USD', 'ISK', 126.864300, '2025-11-07', false, '2025-11-07 19:22:44.717508', '2025-11-07 19:22:44.717508');
INSERT INTO public.exchange_rates VALUES (234, 'USD', 'JEP', 0.762300, '2025-11-07', false, '2025-11-07 19:22:44.838123', '2025-11-07 19:22:44.838123');
INSERT INTO public.exchange_rates VALUES (235, 'USD', 'JMD', 160.626000, '2025-11-07', false, '2025-11-07 19:22:44.956856', '2025-11-07 19:22:44.956856');
INSERT INTO public.exchange_rates VALUES (236, 'USD', 'JOD', 0.709000, '2025-11-07', false, '2025-11-07 19:22:45.078202', '2025-11-07 19:22:45.078202');
INSERT INTO public.exchange_rates VALUES (237, 'USD', 'JPY', 153.228200, '2025-11-07', false, '2025-11-07 19:22:45.196355', '2025-11-07 19:22:45.196355');
INSERT INTO public.exchange_rates VALUES (238, 'USD', 'KES', 129.091600, '2025-11-07', false, '2025-11-07 19:22:45.314383', '2025-11-07 19:22:45.314383');
INSERT INTO public.exchange_rates VALUES (239, 'USD', 'KGS', 87.410400, '2025-11-07', false, '2025-11-07 19:22:45.434457', '2025-11-07 19:22:45.434457');
INSERT INTO public.exchange_rates VALUES (240, 'USD', 'KHR', 4020.710100, '2025-11-07', false, '2025-11-07 19:22:45.553705', '2025-11-07 19:22:45.553705');
INSERT INTO public.exchange_rates VALUES (241, 'USD', 'KID', 1.540500, '2025-11-07', false, '2025-11-07 19:22:45.67414', '2025-11-07 19:22:45.67414');
INSERT INTO public.exchange_rates VALUES (242, 'USD', 'KMF', 426.383300, '2025-11-07', false, '2025-11-07 19:22:45.803627', '2025-11-07 19:22:45.803627');
INSERT INTO public.exchange_rates VALUES (243, 'USD', 'KRW', 1446.483600, '2025-11-07', false, '2025-11-07 19:22:45.922806', '2025-11-07 19:22:45.922806');
INSERT INTO public.exchange_rates VALUES (244, 'USD', 'KWD', 0.306900, '2025-11-07', false, '2025-11-07 19:22:46.044701', '2025-11-07 19:22:46.044701');
INSERT INTO public.exchange_rates VALUES (245, 'USD', 'KYD', 0.833300, '2025-11-07', false, '2025-11-07 19:22:46.162705', '2025-11-07 19:22:46.162705');
INSERT INTO public.exchange_rates VALUES (246, 'USD', 'KZT', 525.842600, '2025-11-07', false, '2025-11-07 19:22:46.280314', '2025-11-07 19:22:46.280314');
INSERT INTO public.exchange_rates VALUES (247, 'USD', 'LAK', 21712.907200, '2025-11-07', false, '2025-11-07 19:22:46.398203', '2025-11-07 19:22:46.398203');
INSERT INTO public.exchange_rates VALUES (248, 'USD', 'LBP', 89500.000000, '2025-11-07', false, '2025-11-07 19:22:46.519993', '2025-11-07 19:22:46.519993');
INSERT INTO public.exchange_rates VALUES (249, 'USD', 'LKR', 304.522400, '2025-11-07', false, '2025-11-07 19:22:46.64227', '2025-11-07 19:22:46.64227');
INSERT INTO public.exchange_rates VALUES (250, 'USD', 'LRD', 182.840100, '2025-11-07', false, '2025-11-07 19:22:46.779952', '2025-11-07 19:22:46.779952');
INSERT INTO public.exchange_rates VALUES (251, 'USD', 'LSL', 17.369700, '2025-11-07', false, '2025-11-07 19:22:46.902586', '2025-11-07 19:22:46.902586');
INSERT INTO public.exchange_rates VALUES (252, 'USD', 'LYD', 5.467800, '2025-11-07', false, '2025-11-07 19:22:47.026342', '2025-11-07 19:22:47.026342');
INSERT INTO public.exchange_rates VALUES (253, 'USD', 'MAD', 9.286200, '2025-11-07', false, '2025-11-07 19:22:47.149484', '2025-11-07 19:22:47.149484');
INSERT INTO public.exchange_rates VALUES (254, 'USD', 'MDL', 17.095600, '2025-11-07', false, '2025-11-07 19:22:47.277561', '2025-11-07 19:22:47.277561');
INSERT INTO public.exchange_rates VALUES (255, 'USD', 'MGA', 4504.179600, '2025-11-07', false, '2025-11-07 19:22:47.402063', '2025-11-07 19:22:47.402063');
INSERT INTO public.exchange_rates VALUES (256, 'USD', 'MKD', 53.563600, '2025-11-07', false, '2025-11-07 19:22:47.521125', '2025-11-07 19:22:47.521125');
INSERT INTO public.exchange_rates VALUES (257, 'USD', 'MMK', 2096.979900, '2025-11-07', false, '2025-11-07 19:22:47.646204', '2025-11-07 19:22:47.646204');
INSERT INTO public.exchange_rates VALUES (258, 'USD', 'MNT', 3615.694100, '2025-11-07', false, '2025-11-07 19:22:47.764898', '2025-11-07 19:22:47.764898');
INSERT INTO public.exchange_rates VALUES (259, 'USD', 'MOP', 8.008900, '2025-11-07', false, '2025-11-07 19:22:47.885466', '2025-11-07 19:22:47.885466');
INSERT INTO public.exchange_rates VALUES (260, 'USD', 'MRU', 39.837400, '2025-11-07', false, '2025-11-07 19:22:48.033623', '2025-11-07 19:22:48.033623');
INSERT INTO public.exchange_rates VALUES (261, 'USD', 'MUR', 45.961400, '2025-11-07', false, '2025-11-07 19:22:48.158166', '2025-11-07 19:22:48.158166');
INSERT INTO public.exchange_rates VALUES (262, 'USD', 'MVR', 15.431700, '2025-11-07', false, '2025-11-07 19:22:48.281742', '2025-11-07 19:22:48.281742');
INSERT INTO public.exchange_rates VALUES (263, 'USD', 'MWK', 1742.935300, '2025-11-07', false, '2025-11-07 19:22:48.403623', '2025-11-07 19:22:48.403623');
INSERT INTO public.exchange_rates VALUES (264, 'USD', 'MXN', 18.584000, '2025-11-07', false, '2025-11-07 19:22:48.524029', '2025-11-07 19:22:48.524029');
INSERT INTO public.exchange_rates VALUES (265, 'USD', 'MYR', 4.183700, '2025-11-07', false, '2025-11-07 19:22:48.649487', '2025-11-07 19:22:48.649487');
INSERT INTO public.exchange_rates VALUES (266, 'USD', 'MZN', 63.704400, '2025-11-07', false, '2025-11-07 19:22:48.771365', '2025-11-07 19:22:48.771365');
INSERT INTO public.exchange_rates VALUES (267, 'USD', 'NAD', 17.369700, '2025-11-07', false, '2025-11-07 19:22:48.894587', '2025-11-07 19:22:48.894587');
INSERT INTO public.exchange_rates VALUES (268, 'USD', 'NGN', 1436.828700, '2025-11-07', false, '2025-11-07 19:22:49.017413', '2025-11-07 19:22:49.017413');
INSERT INTO public.exchange_rates VALUES (269, 'USD', 'NIO', 36.756800, '2025-11-07', false, '2025-11-07 19:22:49.139627', '2025-11-07 19:22:49.139627');
INSERT INTO public.exchange_rates VALUES (270, 'USD', 'NOK', 10.195300, '2025-11-07', false, '2025-11-07 19:22:49.266601', '2025-11-07 19:22:49.266601');
INSERT INTO public.exchange_rates VALUES (271, 'USD', 'NPR', 141.884300, '2025-11-07', false, '2025-11-07 19:22:49.388136', '2025-11-07 19:22:49.388136');
INSERT INTO public.exchange_rates VALUES (272, 'USD', 'NZD', 1.772300, '2025-11-07', false, '2025-11-07 19:22:49.509755', '2025-11-07 19:22:49.509755');
INSERT INTO public.exchange_rates VALUES (273, 'USD', 'OMR', 0.384500, '2025-11-07', false, '2025-11-07 19:22:49.631569', '2025-11-07 19:22:49.631569');
INSERT INTO public.exchange_rates VALUES (274, 'USD', 'PAB', 1.000000, '2025-11-07', false, '2025-11-07 19:22:49.751026', '2025-11-07 19:22:49.751026');
INSERT INTO public.exchange_rates VALUES (275, 'USD', 'PEN', 3.374400, '2025-11-07', false, '2025-11-07 19:22:49.871165', '2025-11-07 19:22:49.871165');
INSERT INTO public.exchange_rates VALUES (276, 'USD', 'PGK', 4.264000, '2025-11-07', false, '2025-11-07 19:22:49.991809', '2025-11-07 19:22:49.991809');
INSERT INTO public.exchange_rates VALUES (277, 'USD', 'PHP', 58.928700, '2025-11-07', false, '2025-11-07 19:22:50.114128', '2025-11-07 19:22:50.114128');
INSERT INTO public.exchange_rates VALUES (278, 'USD', 'PKR', 282.680400, '2025-11-07', false, '2025-11-07 19:22:50.242155', '2025-11-07 19:22:50.242155');
INSERT INTO public.exchange_rates VALUES (279, 'USD', 'PLN', 3.684700, '2025-11-07', false, '2025-11-07 19:22:50.36146', '2025-11-07 19:22:50.36146');
INSERT INTO public.exchange_rates VALUES (280, 'USD', 'PYG', 7085.457700, '2025-11-07', false, '2025-11-07 19:22:50.484774', '2025-11-07 19:22:50.484774');
INSERT INTO public.exchange_rates VALUES (281, 'USD', 'QAR', 3.640000, '2025-11-07', false, '2025-11-07 19:22:50.608301', '2025-11-07 19:22:50.608301');
INSERT INTO public.exchange_rates VALUES (282, 'USD', 'RON', 4.411100, '2025-11-07', false, '2025-11-07 19:22:50.734946', '2025-11-07 19:22:50.734946');
INSERT INTO public.exchange_rates VALUES (283, 'USD', 'RSD', 101.698500, '2025-11-07', false, '2025-11-07 19:22:50.858488', '2025-11-07 19:22:50.858488');
INSERT INTO public.exchange_rates VALUES (284, 'USD', 'RUB', 81.235600, '2025-11-07', false, '2025-11-07 19:22:50.980094', '2025-11-07 19:22:50.980094');
INSERT INTO public.exchange_rates VALUES (285, 'USD', 'RWF', 1456.861000, '2025-11-07', false, '2025-11-07 19:22:51.100454', '2025-11-07 19:22:51.100454');
INSERT INTO public.exchange_rates VALUES (286, 'USD', 'SAR', 3.750000, '2025-11-07', false, '2025-11-07 19:22:51.229078', '2025-11-07 19:22:51.229078');
INSERT INTO public.exchange_rates VALUES (287, 'USD', 'SBD', 8.231900, '2025-11-07', false, '2025-11-07 19:22:51.350066', '2025-11-07 19:22:51.350066');
INSERT INTO public.exchange_rates VALUES (288, 'USD', 'SCR', 13.856900, '2025-11-07', false, '2025-11-07 19:22:51.483299', '2025-11-07 19:22:51.483299');
INSERT INTO public.exchange_rates VALUES (289, 'USD', 'SDG', 511.761200, '2025-11-07', false, '2025-11-07 19:22:51.603308', '2025-11-07 19:22:51.603308');
INSERT INTO public.exchange_rates VALUES (290, 'USD', 'SEK', 9.565600, '2025-11-07', false, '2025-11-07 19:22:51.727964', '2025-11-07 19:22:51.727964');
INSERT INTO public.exchange_rates VALUES (291, 'USD', 'SGD', 1.304300, '2025-11-07', false, '2025-11-07 19:22:51.847584', '2025-11-07 19:22:51.847584');
INSERT INTO public.exchange_rates VALUES (292, 'USD', 'SHP', 0.762300, '2025-11-07', false, '2025-11-07 19:22:51.970544', '2025-11-07 19:22:51.970544');
INSERT INTO public.exchange_rates VALUES (293, 'USD', 'SLE', 23.199400, '2025-11-07', false, '2025-11-07 19:22:52.093319', '2025-11-07 19:22:52.093319');
INSERT INTO public.exchange_rates VALUES (294, 'USD', 'SLL', 23199.379500, '2025-11-07', false, '2025-11-07 19:22:52.214804', '2025-11-07 19:22:52.214804');
INSERT INTO public.exchange_rates VALUES (295, 'USD', 'SOS', 571.816600, '2025-11-07', false, '2025-11-07 19:22:52.350224', '2025-11-07 19:22:52.350224');
INSERT INTO public.exchange_rates VALUES (296, 'USD', 'SRD', 39.082800, '2025-11-07', false, '2025-11-07 19:22:52.475938', '2025-11-07 19:22:52.475938');
INSERT INTO public.exchange_rates VALUES (297, 'USD', 'SSP', 4682.456100, '2025-11-07', false, '2025-11-07 19:22:52.600027', '2025-11-07 19:22:52.600027');
INSERT INTO public.exchange_rates VALUES (298, 'USD', 'STN', 21.233900, '2025-11-07', false, '2025-11-07 19:22:52.717791', '2025-11-07 19:22:52.717791');
INSERT INTO public.exchange_rates VALUES (299, 'USD', 'SYP', 11013.358400, '2025-11-07', false, '2025-11-07 19:22:52.838825', '2025-11-07 19:22:52.838825');
INSERT INTO public.exchange_rates VALUES (300, 'USD', 'SZL', 17.369700, '2025-11-07', false, '2025-11-07 19:22:52.960833', '2025-11-07 19:22:52.960833');
INSERT INTO public.exchange_rates VALUES (301, 'USD', 'THB', 32.396000, '2025-11-07', false, '2025-11-07 19:22:53.081421', '2025-11-07 19:22:53.081421');
INSERT INTO public.exchange_rates VALUES (302, 'USD', 'TJS', 9.281200, '2025-11-07', false, '2025-11-07 19:22:53.202114', '2025-11-07 19:22:53.202114');
INSERT INTO public.exchange_rates VALUES (303, 'USD', 'TMT', 3.499700, '2025-11-07', false, '2025-11-07 19:22:53.329893', '2025-11-07 19:22:53.329893');
INSERT INTO public.exchange_rates VALUES (304, 'USD', 'TND', 2.951400, '2025-11-07', false, '2025-11-07 19:22:53.448205', '2025-11-07 19:22:53.448205');
INSERT INTO public.exchange_rates VALUES (305, 'USD', 'TOP', 2.367700, '2025-11-07', false, '2025-11-07 19:22:53.57379', '2025-11-07 19:22:53.57379');
INSERT INTO public.exchange_rates VALUES (306, 'USD', 'TRY', 42.183400, '2025-11-07', false, '2025-11-07 19:22:53.697422', '2025-11-07 19:22:53.697422');
INSERT INTO public.exchange_rates VALUES (307, 'USD', 'TTD', 6.754300, '2025-11-07', false, '2025-11-07 19:22:53.815781', '2025-11-07 19:22:53.815781');
INSERT INTO public.exchange_rates VALUES (308, 'USD', 'TVD', 1.540500, '2025-11-07', false, '2025-11-07 19:22:53.934657', '2025-11-07 19:22:53.934657');
INSERT INTO public.exchange_rates VALUES (309, 'USD', 'TWD', 30.941000, '2025-11-07', false, '2025-11-07 19:22:54.053669', '2025-11-07 19:22:54.053669');
INSERT INTO public.exchange_rates VALUES (310, 'USD', 'TZS', 2455.251100, '2025-11-07', false, '2025-11-07 19:22:54.183341', '2025-11-07 19:22:54.183341');
INSERT INTO public.exchange_rates VALUES (311, 'USD', 'UAH', 42.054700, '2025-11-07', false, '2025-11-07 19:22:54.30195', '2025-11-07 19:22:54.30195');
INSERT INTO public.exchange_rates VALUES (312, 'USD', 'UGX', 3468.030000, '2025-11-07', false, '2025-11-07 19:22:54.419666', '2025-11-07 19:22:54.419666');
INSERT INTO public.exchange_rates VALUES (313, 'USD', 'UYU', 39.782400, '2025-11-07', false, '2025-11-07 19:22:54.54974', '2025-11-07 19:22:54.54974');
INSERT INTO public.exchange_rates VALUES (314, 'USD', 'UZS', 11954.293400, '2025-11-07', false, '2025-11-07 19:22:54.667802', '2025-11-07 19:22:54.667802');
INSERT INTO public.exchange_rates VALUES (315, 'USD', 'VES', 228.479600, '2025-11-07', false, '2025-11-07 19:22:54.786253', '2025-11-07 19:22:54.786253');
INSERT INTO public.exchange_rates VALUES (316, 'USD', 'VND', 26163.170700, '2025-11-07', false, '2025-11-07 19:22:54.905888', '2025-11-07 19:22:54.905888');
INSERT INTO public.exchange_rates VALUES (317, 'USD', 'VUV', 121.287800, '2025-11-07', false, '2025-11-07 19:22:55.025535', '2025-11-07 19:22:55.025535');
INSERT INTO public.exchange_rates VALUES (318, 'USD', 'WST', 2.787900, '2025-11-07', false, '2025-11-07 19:22:55.148579', '2025-11-07 19:22:55.148579');
INSERT INTO public.exchange_rates VALUES (319, 'USD', 'XAF', 568.511100, '2025-11-07', false, '2025-11-07 19:22:55.272862', '2025-11-07 19:22:55.272862');
INSERT INTO public.exchange_rates VALUES (320, 'USD', 'XCD', 2.700000, '2025-11-07', false, '2025-11-07 19:22:55.394793', '2025-11-07 19:22:55.394793');
INSERT INTO public.exchange_rates VALUES (321, 'USD', 'XCG', 1.790000, '2025-11-07', false, '2025-11-07 19:22:55.513258', '2025-11-07 19:22:55.513258');
INSERT INTO public.exchange_rates VALUES (322, 'USD', 'XDR', 0.738500, '2025-11-07', false, '2025-11-07 19:22:55.6363', '2025-11-07 19:22:55.6363');
INSERT INTO public.exchange_rates VALUES (323, 'USD', 'XOF', 568.511100, '2025-11-07', false, '2025-11-07 19:22:55.758501', '2025-11-07 19:22:55.758501');
INSERT INTO public.exchange_rates VALUES (324, 'USD', 'XPF', 103.423800, '2025-11-07', false, '2025-11-07 19:22:55.876861', '2025-11-07 19:22:55.876861');
INSERT INTO public.exchange_rates VALUES (325, 'USD', 'YER', 238.709600, '2025-11-07', false, '2025-11-07 19:22:55.995806', '2025-11-07 19:22:55.995806');
INSERT INTO public.exchange_rates VALUES (326, 'USD', 'ZAR', 17.372700, '2025-11-07', false, '2025-11-07 19:22:56.114484', '2025-11-07 19:22:56.114484');
INSERT INTO public.exchange_rates VALUES (327, 'USD', 'ZMW', 22.548800, '2025-11-07', false, '2025-11-07 19:22:56.284346', '2025-11-07 19:22:56.284346');
INSERT INTO public.exchange_rates VALUES (328, 'USD', 'ZWL', 26.381300, '2025-11-07', false, '2025-11-07 19:22:56.405857', '2025-11-07 19:22:56.405857');
INSERT INTO public.exchange_rates VALUES (329, 'USD', 'AED', 3.672500, '2025-11-04', false, '2025-11-07 19:24:53.854515', '2025-11-07 19:24:53.854515');
INSERT INTO public.exchange_rates VALUES (330, 'USD', 'AFN', 66.329100, '2025-11-04', false, '2025-11-07 19:24:53.989833', '2025-11-07 19:24:53.989833');
INSERT INTO public.exchange_rates VALUES (331, 'USD', 'ALL', 83.878300, '2025-11-04', false, '2025-11-07 19:24:54.109887', '2025-11-07 19:24:54.109887');
INSERT INTO public.exchange_rates VALUES (332, 'USD', 'AMD', 382.591200, '2025-11-04', false, '2025-11-07 19:24:54.231079', '2025-11-07 19:24:54.231079');
INSERT INTO public.exchange_rates VALUES (333, 'USD', 'ANG', 1.790000, '2025-11-04', false, '2025-11-07 19:24:54.351057', '2025-11-07 19:24:54.351057');
INSERT INTO public.exchange_rates VALUES (334, 'USD', 'AOA', 920.113500, '2025-11-04', false, '2025-11-07 19:24:54.471295', '2025-11-07 19:24:54.471295');
INSERT INTO public.exchange_rates VALUES (335, 'USD', 'ARS', 1447.500000, '2025-11-04', false, '2025-11-07 19:24:54.591942', '2025-11-07 19:24:54.591942');
INSERT INTO public.exchange_rates VALUES (336, 'USD', 'AUD', 1.541300, '2025-11-04', false, '2025-11-07 19:24:54.713031', '2025-11-07 19:24:54.713031');
INSERT INTO public.exchange_rates VALUES (337, 'USD', 'AWG', 1.790000, '2025-11-04', false, '2025-11-07 19:24:54.834048', '2025-11-07 19:24:54.834048');
INSERT INTO public.exchange_rates VALUES (338, 'USD', 'AZN', 1.698900, '2025-11-04', false, '2025-11-07 19:24:54.954133', '2025-11-07 19:24:54.954133');
INSERT INTO public.exchange_rates VALUES (339, 'USD', 'BAM', 1.695100, '2025-11-04', false, '2025-11-07 19:24:55.074314', '2025-11-07 19:24:55.074314');
INSERT INTO public.exchange_rates VALUES (340, 'USD', 'BBD', 2.000000, '2025-11-04', false, '2025-11-07 19:24:55.194535', '2025-11-07 19:24:55.194535');
INSERT INTO public.exchange_rates VALUES (341, 'USD', 'BDT', 121.980300, '2025-11-04', false, '2025-11-07 19:24:55.314703', '2025-11-07 19:24:55.314703');
INSERT INTO public.exchange_rates VALUES (342, 'USD', 'BGN', 1.695200, '2025-11-04', false, '2025-11-07 19:24:55.434818', '2025-11-07 19:24:55.434818');
INSERT INTO public.exchange_rates VALUES (343, 'USD', 'BHD', 0.376000, '2025-11-04', false, '2025-11-07 19:24:55.554543', '2025-11-07 19:24:55.554543');
INSERT INTO public.exchange_rates VALUES (344, 'USD', 'BIF', 2951.674800, '2025-11-04', false, '2025-11-07 19:24:55.674684', '2025-11-07 19:24:55.674684');
INSERT INTO public.exchange_rates VALUES (345, 'USD', 'BMD', 1.000000, '2025-11-04', false, '2025-11-07 19:24:55.795134', '2025-11-07 19:24:55.795134');
INSERT INTO public.exchange_rates VALUES (346, 'USD', 'BND', 1.304600, '2025-11-04', false, '2025-11-07 19:24:55.915286', '2025-11-07 19:24:55.915286');
INSERT INTO public.exchange_rates VALUES (347, 'USD', 'BOB', 6.917700, '2025-11-04', false, '2025-11-07 19:24:56.03437', '2025-11-07 19:24:56.03437');
INSERT INTO public.exchange_rates VALUES (348, 'USD', 'BRL', 5.351100, '2025-11-04', false, '2025-11-07 19:24:56.154667', '2025-11-07 19:24:56.154667');
INSERT INTO public.exchange_rates VALUES (349, 'USD', 'BSD', 1.000000, '2025-11-04', false, '2025-11-07 19:24:56.274883', '2025-11-07 19:24:56.274883');
INSERT INTO public.exchange_rates VALUES (350, 'USD', 'BTN', 88.677700, '2025-11-04', false, '2025-11-07 19:24:56.398115', '2025-11-07 19:24:56.398115');
INSERT INTO public.exchange_rates VALUES (351, 'USD', 'BWP', 13.821500, '2025-11-04', false, '2025-11-07 19:24:56.527113', '2025-11-07 19:24:56.527113');
INSERT INTO public.exchange_rates VALUES (352, 'USD', 'BYN', 3.257400, '2025-11-04', false, '2025-11-07 19:24:56.648588', '2025-11-07 19:24:56.648588');
INSERT INTO public.exchange_rates VALUES (353, 'USD', 'BZD', 2.000000, '2025-11-04', false, '2025-11-07 19:24:56.768878', '2025-11-07 19:24:56.768878');
INSERT INTO public.exchange_rates VALUES (354, 'USD', 'CAD', 1.410900, '2025-11-04', false, '2025-11-07 19:24:56.889801', '2025-11-07 19:24:56.889801');
INSERT INTO public.exchange_rates VALUES (355, 'USD', 'CDF', 2244.538800, '2025-11-04', false, '2025-11-07 19:24:57.009939', '2025-11-07 19:24:57.009939');
INSERT INTO public.exchange_rates VALUES (356, 'USD', 'CHF', 0.807000, '2025-11-04', false, '2025-11-07 19:24:57.130513', '2025-11-07 19:24:57.130513');
INSERT INTO public.exchange_rates VALUES (357, 'USD', 'CLF', 0.023880, '2025-11-04', false, '2025-11-07 19:24:57.252365', '2025-11-07 19:24:57.252365');
INSERT INTO public.exchange_rates VALUES (358, 'USD', 'CLP', 943.816400, '2025-11-04', false, '2025-11-07 19:24:57.373176', '2025-11-07 19:24:57.373176');
INSERT INTO public.exchange_rates VALUES (359, 'USD', 'CNH', 7.121500, '2025-11-04', false, '2025-11-07 19:24:57.495559', '2025-11-07 19:24:57.495559');
INSERT INTO public.exchange_rates VALUES (360, 'USD', 'CNY', 7.120200, '2025-11-04', false, '2025-11-07 19:24:57.615414', '2025-11-07 19:24:57.615414');
INSERT INTO public.exchange_rates VALUES (361, 'USD', 'COP', 3832.972000, '2025-11-04', false, '2025-11-07 19:24:57.735575', '2025-11-07 19:24:57.735575');
INSERT INTO public.exchange_rates VALUES (362, 'USD', 'CRC', 501.885400, '2025-11-04', false, '2025-11-07 19:24:57.85631', '2025-11-07 19:24:57.85631');
INSERT INTO public.exchange_rates VALUES (363, 'USD', 'CUP', 24.000000, '2025-11-04', false, '2025-11-07 19:24:57.977117', '2025-11-07 19:24:57.977117');
INSERT INTO public.exchange_rates VALUES (364, 'USD', 'CVE', 95.565500, '2025-11-04', false, '2025-11-07 19:24:58.09852', '2025-11-07 19:24:58.09852');
INSERT INTO public.exchange_rates VALUES (365, 'USD', 'CZK', 21.097100, '2025-11-04', false, '2025-11-07 19:24:58.218714', '2025-11-07 19:24:58.218714');
INSERT INTO public.exchange_rates VALUES (366, 'USD', 'DJF', 177.721000, '2025-11-04', false, '2025-11-07 19:24:58.338338', '2025-11-07 19:24:58.338338');
INSERT INTO public.exchange_rates VALUES (367, 'USD', 'DKK', 6.465800, '2025-11-04', false, '2025-11-07 19:24:58.4595', '2025-11-07 19:24:58.4595');
INSERT INTO public.exchange_rates VALUES (368, 'USD', 'DOP', 64.239300, '2025-11-04', false, '2025-11-07 19:24:58.579604', '2025-11-07 19:24:58.579604');
INSERT INTO public.exchange_rates VALUES (369, 'USD', 'DZD', 130.628700, '2025-11-04', false, '2025-11-07 19:24:58.699732', '2025-11-07 19:24:58.699732');
INSERT INTO public.exchange_rates VALUES (370, 'USD', 'EGP', 47.338400, '2025-11-04', false, '2025-11-07 19:24:58.820648', '2025-11-07 19:24:58.820648');
INSERT INTO public.exchange_rates VALUES (371, 'USD', 'ERN', 15.000000, '2025-11-04', false, '2025-11-07 19:24:58.942281', '2025-11-07 19:24:58.942281');
INSERT INTO public.exchange_rates VALUES (372, 'USD', 'ETB', 152.232700, '2025-11-04', false, '2025-11-07 19:24:59.063712', '2025-11-07 19:24:59.063712');
INSERT INTO public.exchange_rates VALUES (373, 'USD', 'EUR', 0.866600, '2025-11-04', false, '2025-11-07 19:24:59.184133', '2025-11-07 19:24:59.184133');
INSERT INTO public.exchange_rates VALUES (374, 'USD', 'FJD', 2.280300, '2025-11-04', false, '2025-11-07 19:24:59.304382', '2025-11-07 19:24:59.304382');
INSERT INTO public.exchange_rates VALUES (375, 'USD', 'FKP', 0.762300, '2025-11-04', false, '2025-11-07 19:24:59.424456', '2025-11-07 19:24:59.424456');
INSERT INTO public.exchange_rates VALUES (376, 'USD', 'FOK', 6.466100, '2025-11-04', false, '2025-11-07 19:24:59.54334', '2025-11-07 19:24:59.54334');
INSERT INTO public.exchange_rates VALUES (377, 'USD', 'GBP', 0.762000, '2025-11-04', false, '2025-11-07 19:24:59.664006', '2025-11-07 19:24:59.664006');
INSERT INTO public.exchange_rates VALUES (378, 'USD', 'GEL', 2.707300, '2025-11-04', false, '2025-11-07 19:24:59.784187', '2025-11-07 19:24:59.784187');
INSERT INTO public.exchange_rates VALUES (379, 'USD', 'GGP', 0.762300, '2025-11-04', false, '2025-11-07 19:24:59.903377', '2025-11-07 19:24:59.903377');
INSERT INTO public.exchange_rates VALUES (380, 'USD', 'GHS', 11.119100, '2025-11-04', false, '2025-11-07 19:25:00.024173', '2025-11-07 19:25:00.024173');
INSERT INTO public.exchange_rates VALUES (381, 'USD', 'GIP', 0.762300, '2025-11-04', false, '2025-11-07 19:25:00.14434', '2025-11-07 19:25:00.14434');
INSERT INTO public.exchange_rates VALUES (382, 'USD', 'GMD', 73.394400, '2025-11-04', false, '2025-11-07 19:25:00.263071', '2025-11-07 19:25:00.263071');
INSERT INTO public.exchange_rates VALUES (383, 'USD', 'GNF', 8702.226400, '2025-11-04', false, '2025-11-07 19:25:00.38427', '2025-11-07 19:25:00.38427');
INSERT INTO public.exchange_rates VALUES (384, 'USD', 'GTQ', 7.657000, '2025-11-04', false, '2025-11-07 19:25:00.505436', '2025-11-07 19:25:00.505436');
INSERT INTO public.exchange_rates VALUES (385, 'USD', 'GYD', 209.196900, '2025-11-04', false, '2025-11-07 19:25:00.62614', '2025-11-07 19:25:00.62614');
INSERT INTO public.exchange_rates VALUES (386, 'USD', 'HKD', 7.774800, '2025-11-04', false, '2025-11-07 19:25:00.745482', '2025-11-07 19:25:00.745482');
INSERT INTO public.exchange_rates VALUES (387, 'USD', 'HNL', 26.290700, '2025-11-04', false, '2025-11-07 19:25:00.866533', '2025-11-07 19:25:00.866533');
INSERT INTO public.exchange_rates VALUES (388, 'USD', 'HRK', 6.530100, '2025-11-04', false, '2025-11-07 19:25:00.986797', '2025-11-07 19:25:00.986797');
INSERT INTO public.exchange_rates VALUES (389, 'USD', 'HTG', 130.930900, '2025-11-04', false, '2025-11-07 19:25:01.106896', '2025-11-07 19:25:01.106896');
INSERT INTO public.exchange_rates VALUES (390, 'USD', 'HUF', 334.597400, '2025-11-04', false, '2025-11-07 19:25:01.227399', '2025-11-07 19:25:01.227399');
INSERT INTO public.exchange_rates VALUES (391, 'USD', 'IDR', 16676.986400, '2025-11-04', false, '2025-11-07 19:25:01.34749', '2025-11-07 19:25:01.34749');
INSERT INTO public.exchange_rates VALUES (392, 'USD', 'ILS', 3.262200, '2025-11-04', false, '2025-11-07 19:25:01.467563', '2025-11-07 19:25:01.467563');
INSERT INTO public.exchange_rates VALUES (393, 'USD', 'IMP', 0.762300, '2025-11-04', false, '2025-11-07 19:25:01.590039', '2025-11-07 19:25:01.590039');
INSERT INTO public.exchange_rates VALUES (394, 'USD', 'INR', 88.676400, '2025-11-04', false, '2025-11-07 19:25:01.710991', '2025-11-07 19:25:01.710991');
INSERT INTO public.exchange_rates VALUES (395, 'USD', 'IQD', 1308.787100, '2025-11-04', false, '2025-11-07 19:25:01.832164', '2025-11-07 19:25:01.832164');
INSERT INTO public.exchange_rates VALUES (396, 'USD', 'IRR', 42415.872600, '2025-11-04', false, '2025-11-07 19:25:01.952634', '2025-11-07 19:25:01.952634');
INSERT INTO public.exchange_rates VALUES (397, 'USD', 'ISK', 126.864300, '2025-11-04', false, '2025-11-07 19:25:02.072711', '2025-11-07 19:25:02.072711');
INSERT INTO public.exchange_rates VALUES (398, 'USD', 'JEP', 0.762300, '2025-11-04', false, '2025-11-07 19:25:02.193156', '2025-11-07 19:25:02.193156');
INSERT INTO public.exchange_rates VALUES (399, 'USD', 'JMD', 160.626000, '2025-11-04', false, '2025-11-07 19:25:02.313616', '2025-11-07 19:25:02.313616');
INSERT INTO public.exchange_rates VALUES (400, 'USD', 'JOD', 0.709000, '2025-11-04', false, '2025-11-07 19:25:02.434706', '2025-11-07 19:25:02.434706');
INSERT INTO public.exchange_rates VALUES (401, 'USD', 'JPY', 153.228200, '2025-11-04', false, '2025-11-07 19:25:02.554757', '2025-11-07 19:25:02.554757');
INSERT INTO public.exchange_rates VALUES (402, 'USD', 'KES', 129.091600, '2025-11-04', false, '2025-11-07 19:25:02.674766', '2025-11-07 19:25:02.674766');
INSERT INTO public.exchange_rates VALUES (403, 'USD', 'KGS', 87.410400, '2025-11-04', false, '2025-11-07 19:25:02.794788', '2025-11-07 19:25:02.794788');
INSERT INTO public.exchange_rates VALUES (404, 'USD', 'KHR', 4020.710100, '2025-11-04', false, '2025-11-07 19:25:02.915242', '2025-11-07 19:25:02.915242');
INSERT INTO public.exchange_rates VALUES (405, 'USD', 'KID', 1.540500, '2025-11-04', false, '2025-11-07 19:25:03.036498', '2025-11-07 19:25:03.036498');
INSERT INTO public.exchange_rates VALUES (406, 'USD', 'KMF', 426.383300, '2025-11-04', false, '2025-11-07 19:25:03.156693', '2025-11-07 19:25:03.156693');
INSERT INTO public.exchange_rates VALUES (407, 'USD', 'KRW', 1446.483600, '2025-11-04', false, '2025-11-07 19:25:03.278271', '2025-11-07 19:25:03.278271');
INSERT INTO public.exchange_rates VALUES (408, 'USD', 'KWD', 0.306900, '2025-11-04', false, '2025-11-07 19:25:03.398909', '2025-11-07 19:25:03.398909');
INSERT INTO public.exchange_rates VALUES (409, 'USD', 'KYD', 0.833300, '2025-11-04', false, '2025-11-07 19:25:03.521801', '2025-11-07 19:25:03.521801');
INSERT INTO public.exchange_rates VALUES (410, 'USD', 'KZT', 525.842600, '2025-11-04', false, '2025-11-07 19:25:03.64366', '2025-11-07 19:25:03.64366');
INSERT INTO public.exchange_rates VALUES (411, 'USD', 'LAK', 21712.907200, '2025-11-04', false, '2025-11-07 19:25:03.763448', '2025-11-07 19:25:03.763448');
INSERT INTO public.exchange_rates VALUES (412, 'USD', 'LBP', 89500.000000, '2025-11-04', false, '2025-11-07 19:25:03.883608', '2025-11-07 19:25:03.883608');
INSERT INTO public.exchange_rates VALUES (413, 'USD', 'LKR', 304.522400, '2025-11-04', false, '2025-11-07 19:25:04.004237', '2025-11-07 19:25:04.004237');
INSERT INTO public.exchange_rates VALUES (414, 'USD', 'LRD', 182.840100, '2025-11-04', false, '2025-11-07 19:25:04.12413', '2025-11-07 19:25:04.12413');
INSERT INTO public.exchange_rates VALUES (415, 'USD', 'LSL', 17.369700, '2025-11-04', false, '2025-11-07 19:25:04.244909', '2025-11-07 19:25:04.244909');
INSERT INTO public.exchange_rates VALUES (416, 'USD', 'LYD', 5.467800, '2025-11-04', false, '2025-11-07 19:25:04.367468', '2025-11-07 19:25:04.367468');
INSERT INTO public.exchange_rates VALUES (417, 'USD', 'MAD', 9.286200, '2025-11-04', false, '2025-11-07 19:25:04.487157', '2025-11-07 19:25:04.487157');
INSERT INTO public.exchange_rates VALUES (418, 'USD', 'MDL', 17.095600, '2025-11-04', false, '2025-11-07 19:25:04.607138', '2025-11-07 19:25:04.607138');
INSERT INTO public.exchange_rates VALUES (419, 'USD', 'AED', 3.672500, '2025-11-03', false, '2025-11-07 19:25:04.638226', '2025-11-07 19:25:04.638226');
INSERT INTO public.exchange_rates VALUES (420, 'USD', 'MGA', 4504.179600, '2025-11-04', false, '2025-11-07 19:25:04.727612', '2025-11-07 19:25:04.727612');
INSERT INTO public.exchange_rates VALUES (421, 'USD', 'AFN', 66.329100, '2025-11-03', false, '2025-11-07 19:25:04.764111', '2025-11-07 19:25:04.764111');
INSERT INTO public.exchange_rates VALUES (422, 'USD', 'MKD', 53.563600, '2025-11-04', false, '2025-11-07 19:25:04.848231', '2025-11-07 19:25:04.848231');
INSERT INTO public.exchange_rates VALUES (423, 'USD', 'ALL', 83.878300, '2025-11-03', false, '2025-11-07 19:25:04.882137', '2025-11-07 19:25:04.882137');
INSERT INTO public.exchange_rates VALUES (424, 'USD', 'MMK', 2096.979900, '2025-11-04', false, '2025-11-07 19:25:04.968699', '2025-11-07 19:25:04.968699');
INSERT INTO public.exchange_rates VALUES (425, 'USD', 'AMD', 382.591200, '2025-11-03', false, '2025-11-07 19:25:05.000105', '2025-11-07 19:25:05.000105');
INSERT INTO public.exchange_rates VALUES (426, 'USD', 'MNT', 3615.694100, '2025-11-04', false, '2025-11-07 19:25:05.089723', '2025-11-07 19:25:05.089723');
INSERT INTO public.exchange_rates VALUES (427, 'USD', 'ANG', 1.790000, '2025-11-03', false, '2025-11-07 19:25:05.115295', '2025-11-07 19:25:05.115295');
INSERT INTO public.exchange_rates VALUES (428, 'USD', 'MOP', 8.008900, '2025-11-04', false, '2025-11-07 19:25:05.210803', '2025-11-07 19:25:05.210803');
INSERT INTO public.exchange_rates VALUES (429, 'USD', 'AOA', 920.113500, '2025-11-03', false, '2025-11-07 19:25:05.229941', '2025-11-07 19:25:05.229941');
INSERT INTO public.exchange_rates VALUES (431, 'USD', 'ARS', 1447.500000, '2025-11-03', false, '2025-11-07 19:25:05.350685', '2025-11-07 19:25:05.350685');
INSERT INTO public.exchange_rates VALUES (433, 'USD', 'AUD', 1.541300, '2025-11-03', false, '2025-11-07 19:25:05.465651', '2025-11-07 19:25:05.465651');
INSERT INTO public.exchange_rates VALUES (435, 'USD', 'AWG', 1.790000, '2025-11-03', false, '2025-11-07 19:25:05.590914', '2025-11-07 19:25:05.590914');
INSERT INTO public.exchange_rates VALUES (437, 'USD', 'AZN', 1.698900, '2025-11-03', false, '2025-11-07 19:25:05.706151', '2025-11-07 19:25:05.706151');
INSERT INTO public.exchange_rates VALUES (439, 'USD', 'BAM', 1.695100, '2025-11-03', false, '2025-11-07 19:25:05.82386', '2025-11-07 19:25:05.82386');
INSERT INTO public.exchange_rates VALUES (441, 'USD', 'BBD', 2.000000, '2025-11-03', false, '2025-11-07 19:25:05.939792', '2025-11-07 19:25:05.939792');
INSERT INTO public.exchange_rates VALUES (443, 'USD', 'BDT', 121.980300, '2025-11-03', false, '2025-11-07 19:25:06.055684', '2025-11-07 19:25:06.055684');
INSERT INTO public.exchange_rates VALUES (444, 'USD', 'BGN', 1.695200, '2025-11-03', false, '2025-11-07 19:25:06.170694', '2025-11-07 19:25:06.170694');
INSERT INTO public.exchange_rates VALUES (446, 'USD', 'BHD', 0.376000, '2025-11-03', false, '2025-11-07 19:25:06.2894', '2025-11-07 19:25:06.2894');
INSERT INTO public.exchange_rates VALUES (448, 'USD', 'BIF', 2951.674800, '2025-11-03', false, '2025-11-07 19:25:06.407353', '2025-11-07 19:25:06.407353');
INSERT INTO public.exchange_rates VALUES (450, 'USD', 'BMD', 1.000000, '2025-11-03', false, '2025-11-07 19:25:06.52658', '2025-11-07 19:25:06.52658');
INSERT INTO public.exchange_rates VALUES (452, 'USD', 'BND', 1.304600, '2025-11-03', false, '2025-11-07 19:25:06.64222', '2025-11-07 19:25:06.64222');
INSERT INTO public.exchange_rates VALUES (454, 'USD', 'BOB', 6.917700, '2025-11-03', false, '2025-11-07 19:25:06.75978', '2025-11-07 19:25:06.75978');
INSERT INTO public.exchange_rates VALUES (456, 'USD', 'BRL', 5.351100, '2025-11-03', false, '2025-11-07 19:25:06.876175', '2025-11-07 19:25:06.876175');
INSERT INTO public.exchange_rates VALUES (458, 'USD', 'BSD', 1.000000, '2025-11-03', false, '2025-11-07 19:25:06.993166', '2025-11-07 19:25:06.993166');
INSERT INTO public.exchange_rates VALUES (460, 'USD', 'BTN', 88.677700, '2025-11-03', false, '2025-11-07 19:25:07.109965', '2025-11-07 19:25:07.109965');
INSERT INTO public.exchange_rates VALUES (462, 'USD', 'BWP', 13.821500, '2025-11-03', false, '2025-11-07 19:25:07.236283', '2025-11-07 19:25:07.236283');
INSERT INTO public.exchange_rates VALUES (464, 'USD', 'BYN', 3.257400, '2025-11-03', false, '2025-11-07 19:25:07.360517', '2025-11-07 19:25:07.360517');
INSERT INTO public.exchange_rates VALUES (466, 'USD', 'BZD', 2.000000, '2025-11-03', false, '2025-11-07 19:25:07.479976', '2025-11-07 19:25:07.479976');
INSERT INTO public.exchange_rates VALUES (468, 'USD', 'CAD', 1.410900, '2025-11-03', false, '2025-11-07 19:25:07.595993', '2025-11-07 19:25:07.595993');
INSERT INTO public.exchange_rates VALUES (470, 'USD', 'CDF', 2244.538800, '2025-11-03', false, '2025-11-07 19:25:07.71035', '2025-11-07 19:25:07.71035');
INSERT INTO public.exchange_rates VALUES (472, 'USD', 'CHF', 0.807000, '2025-11-03', false, '2025-11-07 19:25:07.826479', '2025-11-07 19:25:07.826479');
INSERT INTO public.exchange_rates VALUES (474, 'USD', 'CLF', 0.023880, '2025-11-03', false, '2025-11-07 19:25:07.943753', '2025-11-07 19:25:07.943753');
INSERT INTO public.exchange_rates VALUES (476, 'USD', 'CLP', 943.816400, '2025-11-03', false, '2025-11-07 19:25:08.059412', '2025-11-07 19:25:08.059412');
INSERT INTO public.exchange_rates VALUES (478, 'USD', 'CNH', 7.121500, '2025-11-03', false, '2025-11-07 19:25:08.178337', '2025-11-07 19:25:08.178337');
INSERT INTO public.exchange_rates VALUES (480, 'USD', 'CNY', 7.120200, '2025-11-03', false, '2025-11-07 19:25:08.296', '2025-11-07 19:25:08.296');
INSERT INTO public.exchange_rates VALUES (482, 'USD', 'COP', 3832.972000, '2025-11-03', false, '2025-11-07 19:25:08.411154', '2025-11-07 19:25:08.411154');
INSERT INTO public.exchange_rates VALUES (484, 'USD', 'CRC', 501.885400, '2025-11-03', false, '2025-11-07 19:25:08.526241', '2025-11-07 19:25:08.526241');
INSERT INTO public.exchange_rates VALUES (486, 'USD', 'CUP', 24.000000, '2025-11-03', false, '2025-11-07 19:25:08.645174', '2025-11-07 19:25:08.645174');
INSERT INTO public.exchange_rates VALUES (488, 'USD', 'CVE', 95.565500, '2025-11-03', false, '2025-11-07 19:25:08.760225', '2025-11-07 19:25:08.760225');
INSERT INTO public.exchange_rates VALUES (490, 'USD', 'CZK', 21.097100, '2025-11-03', false, '2025-11-07 19:25:08.875251', '2025-11-07 19:25:08.875251');
INSERT INTO public.exchange_rates VALUES (492, 'USD', 'DJF', 177.721000, '2025-11-03', false, '2025-11-07 19:25:08.991289', '2025-11-07 19:25:08.991289');
INSERT INTO public.exchange_rates VALUES (494, 'USD', 'DKK', 6.465800, '2025-11-03', false, '2025-11-07 19:25:09.10658', '2025-11-07 19:25:09.10658');
INSERT INTO public.exchange_rates VALUES (496, 'USD', 'DOP', 64.239300, '2025-11-03', false, '2025-11-07 19:25:09.270633', '2025-11-07 19:25:09.270633');
INSERT INTO public.exchange_rates VALUES (498, 'USD', 'DZD', 130.628700, '2025-11-03', false, '2025-11-07 19:25:09.385575', '2025-11-07 19:25:09.385575');
INSERT INTO public.exchange_rates VALUES (500, 'USD', 'EGP', 47.338400, '2025-11-03', false, '2025-11-07 19:25:09.503829', '2025-11-07 19:25:09.503829');
INSERT INTO public.exchange_rates VALUES (502, 'USD', 'ERN', 15.000000, '2025-11-03', false, '2025-11-07 19:25:09.623164', '2025-11-07 19:25:09.623164');
INSERT INTO public.exchange_rates VALUES (504, 'USD', 'ETB', 152.232700, '2025-11-03', false, '2025-11-07 19:25:09.741952', '2025-11-07 19:25:09.741952');
INSERT INTO public.exchange_rates VALUES (506, 'USD', 'EUR', 0.866600, '2025-11-03', false, '2025-11-07 19:25:09.858361', '2025-11-07 19:25:09.858361');
INSERT INTO public.exchange_rates VALUES (508, 'USD', 'FJD', 2.280300, '2025-11-03', false, '2025-11-07 19:25:09.975354', '2025-11-07 19:25:09.975354');
INSERT INTO public.exchange_rates VALUES (510, 'USD', 'FKP', 0.762300, '2025-11-03', false, '2025-11-07 19:25:10.090564', '2025-11-07 19:25:10.090564');
INSERT INTO public.exchange_rates VALUES (512, 'USD', 'FOK', 6.466100, '2025-11-03', false, '2025-11-07 19:25:10.206067', '2025-11-07 19:25:10.206067');
INSERT INTO public.exchange_rates VALUES (514, 'USD', 'GBP', 0.762000, '2025-11-03', false, '2025-11-07 19:25:10.320912', '2025-11-07 19:25:10.320912');
INSERT INTO public.exchange_rates VALUES (516, 'USD', 'GEL', 2.707300, '2025-11-03', false, '2025-11-07 19:25:10.436445', '2025-11-07 19:25:10.436445');
INSERT INTO public.exchange_rates VALUES (518, 'USD', 'GGP', 0.762300, '2025-11-03', false, '2025-11-07 19:25:10.550249', '2025-11-07 19:25:10.550249');
INSERT INTO public.exchange_rates VALUES (520, 'USD', 'GHS', 11.119100, '2025-11-03', false, '2025-11-07 19:25:10.664794', '2025-11-07 19:25:10.664794');
INSERT INTO public.exchange_rates VALUES (521, 'USD', 'GIP', 0.762300, '2025-11-03', false, '2025-11-07 19:25:10.779629', '2025-11-07 19:25:10.779629');
INSERT INTO public.exchange_rates VALUES (523, 'USD', 'GMD', 73.394400, '2025-11-03', false, '2025-11-07 19:25:10.902451', '2025-11-07 19:25:10.902451');
INSERT INTO public.exchange_rates VALUES (525, 'USD', 'GNF', 8702.226400, '2025-11-03', false, '2025-11-07 19:25:11.021828', '2025-11-07 19:25:11.021828');
INSERT INTO public.exchange_rates VALUES (527, 'USD', 'GTQ', 7.657000, '2025-11-03', false, '2025-11-07 19:25:11.142333', '2025-11-07 19:25:11.142333');
INSERT INTO public.exchange_rates VALUES (529, 'USD', 'GYD', 209.196900, '2025-11-03', false, '2025-11-07 19:25:11.268575', '2025-11-07 19:25:11.268575');
INSERT INTO public.exchange_rates VALUES (531, 'USD', 'HKD', 7.774800, '2025-11-03', false, '2025-11-07 19:25:11.388113', '2025-11-07 19:25:11.388113');
INSERT INTO public.exchange_rates VALUES (533, 'USD', 'HNL', 26.290700, '2025-11-03', false, '2025-11-07 19:25:11.505065', '2025-11-07 19:25:11.505065');
INSERT INTO public.exchange_rates VALUES (535, 'USD', 'HRK', 6.530100, '2025-11-03', false, '2025-11-07 19:25:11.619495', '2025-11-07 19:25:11.619495');
INSERT INTO public.exchange_rates VALUES (537, 'USD', 'HTG', 130.930900, '2025-11-03', false, '2025-11-07 19:25:11.734186', '2025-11-07 19:25:11.734186');
INSERT INTO public.exchange_rates VALUES (539, 'USD', 'HUF', 334.597400, '2025-11-03', false, '2025-11-07 19:25:11.851684', '2025-11-07 19:25:11.851684');
INSERT INTO public.exchange_rates VALUES (541, 'USD', 'IDR', 16676.986400, '2025-11-03', false, '2025-11-07 19:25:11.967487', '2025-11-07 19:25:11.967487');
INSERT INTO public.exchange_rates VALUES (543, 'USD', 'ILS', 3.262200, '2025-11-03', false, '2025-11-07 19:25:12.086694', '2025-11-07 19:25:12.086694');
INSERT INTO public.exchange_rates VALUES (545, 'USD', 'IMP', 0.762300, '2025-11-03', false, '2025-11-07 19:25:12.203979', '2025-11-07 19:25:12.203979');
INSERT INTO public.exchange_rates VALUES (546, 'USD', 'INR', 88.676400, '2025-11-03', false, '2025-11-07 19:25:12.322148', '2025-11-07 19:25:12.322148');
INSERT INTO public.exchange_rates VALUES (548, 'USD', 'IQD', 1308.787100, '2025-11-03', false, '2025-11-07 19:25:12.437422', '2025-11-07 19:25:12.437422');
INSERT INTO public.exchange_rates VALUES (550, 'USD', 'IRR', 42415.872600, '2025-11-03', false, '2025-11-07 19:25:12.551247', '2025-11-07 19:25:12.551247');
INSERT INTO public.exchange_rates VALUES (552, 'USD', 'ISK', 126.864300, '2025-11-03', false, '2025-11-07 19:25:12.666716', '2025-11-07 19:25:12.666716');
INSERT INTO public.exchange_rates VALUES (554, 'USD', 'JEP', 0.762300, '2025-11-03', false, '2025-11-07 19:25:12.780652', '2025-11-07 19:25:12.780652');
INSERT INTO public.exchange_rates VALUES (556, 'USD', 'JMD', 160.626000, '2025-11-03', false, '2025-11-07 19:25:12.897648', '2025-11-07 19:25:12.897648');
INSERT INTO public.exchange_rates VALUES (558, 'USD', 'JOD', 0.709000, '2025-11-03', false, '2025-11-07 19:25:13.018096', '2025-11-07 19:25:13.018096');
INSERT INTO public.exchange_rates VALUES (560, 'USD', 'JPY', 153.228200, '2025-11-03', false, '2025-11-07 19:25:13.13633', '2025-11-07 19:25:13.13633');
INSERT INTO public.exchange_rates VALUES (562, 'USD', 'KES', 129.091600, '2025-11-03', false, '2025-11-07 19:25:13.258919', '2025-11-07 19:25:13.258919');
INSERT INTO public.exchange_rates VALUES (564, 'USD', 'KGS', 87.410400, '2025-11-03', false, '2025-11-07 19:25:13.374154', '2025-11-07 19:25:13.374154');
INSERT INTO public.exchange_rates VALUES (566, 'USD', 'KHR', 4020.710100, '2025-11-03', false, '2025-11-07 19:25:13.490797', '2025-11-07 19:25:13.490797');
INSERT INTO public.exchange_rates VALUES (568, 'USD', 'KID', 1.540500, '2025-11-03', false, '2025-11-07 19:25:13.605956', '2025-11-07 19:25:13.605956');
INSERT INTO public.exchange_rates VALUES (570, 'USD', 'KMF', 426.383300, '2025-11-03', false, '2025-11-07 19:25:13.720328', '2025-11-07 19:25:13.720328');
INSERT INTO public.exchange_rates VALUES (571, 'USD', 'KRW', 1446.483600, '2025-11-03', false, '2025-11-07 19:25:13.840138', '2025-11-07 19:25:13.840138');
INSERT INTO public.exchange_rates VALUES (572, 'USD', 'KWD', 0.306900, '2025-11-03', false, '2025-11-07 19:25:13.956033', '2025-11-07 19:25:13.956033');
INSERT INTO public.exchange_rates VALUES (573, 'USD', 'KYD', 0.833300, '2025-11-03', false, '2025-11-07 19:25:14.07246', '2025-11-07 19:25:14.07246');
INSERT INTO public.exchange_rates VALUES (574, 'USD', 'KZT', 525.842600, '2025-11-03', false, '2025-11-07 19:25:14.256413', '2025-11-07 19:25:14.256413');
INSERT INTO public.exchange_rates VALUES (575, 'USD', 'LAK', 21712.907200, '2025-11-03', false, '2025-11-07 19:25:14.378375', '2025-11-07 19:25:14.378375');
INSERT INTO public.exchange_rates VALUES (576, 'USD', 'LBP', 89500.000000, '2025-11-03', false, '2025-11-07 19:25:14.495996', '2025-11-07 19:25:14.495996');
INSERT INTO public.exchange_rates VALUES (577, 'USD', 'LKR', 304.522400, '2025-11-03', false, '2025-11-07 19:25:14.613095', '2025-11-07 19:25:14.613095');
INSERT INTO public.exchange_rates VALUES (578, 'USD', 'LRD', 182.840100, '2025-11-03', false, '2025-11-07 19:25:14.72884', '2025-11-07 19:25:14.72884');
INSERT INTO public.exchange_rates VALUES (579, 'USD', 'LSL', 17.369700, '2025-11-03', false, '2025-11-07 19:25:14.849888', '2025-11-07 19:25:14.849888');
INSERT INTO public.exchange_rates VALUES (580, 'USD', 'LYD', 5.467800, '2025-11-03', false, '2025-11-07 19:25:14.967901', '2025-11-07 19:25:14.967901');
INSERT INTO public.exchange_rates VALUES (581, 'USD', 'MAD', 9.286200, '2025-11-03', false, '2025-11-07 19:25:15.085819', '2025-11-07 19:25:15.085819');
INSERT INTO public.exchange_rates VALUES (582, 'USD', 'MDL', 17.095600, '2025-11-03', false, '2025-11-07 19:25:15.203341', '2025-11-07 19:25:15.203341');
INSERT INTO public.exchange_rates VALUES (583, 'USD', 'MGA', 4504.179600, '2025-11-03', false, '2025-11-07 19:25:15.318169', '2025-11-07 19:25:15.318169');
INSERT INTO public.exchange_rates VALUES (584, 'USD', 'MKD', 53.563600, '2025-11-03', false, '2025-11-07 19:25:15.436153', '2025-11-07 19:25:15.436153');
INSERT INTO public.exchange_rates VALUES (585, 'USD', 'MMK', 2096.979900, '2025-11-03', false, '2025-11-07 19:25:15.555332', '2025-11-07 19:25:15.555332');
INSERT INTO public.exchange_rates VALUES (586, 'USD', 'MNT', 3615.694100, '2025-11-03', false, '2025-11-07 19:25:15.67364', '2025-11-07 19:25:15.67364');
INSERT INTO public.exchange_rates VALUES (587, 'USD', 'MOP', 8.008900, '2025-11-03', false, '2025-11-07 19:25:15.791171', '2025-11-07 19:25:15.791171');
INSERT INTO public.exchange_rates VALUES (588, 'USD', 'MRU', 39.837400, '2025-11-03', false, '2025-11-07 19:25:15.909327', '2025-11-07 19:25:15.909327');
INSERT INTO public.exchange_rates VALUES (589, 'USD', 'MUR', 45.961400, '2025-11-03', false, '2025-11-07 19:25:16.026509', '2025-11-07 19:25:16.026509');
INSERT INTO public.exchange_rates VALUES (590, 'USD', 'MVR', 15.431700, '2025-11-03', false, '2025-11-07 19:25:16.147224', '2025-11-07 19:25:16.147224');
INSERT INTO public.exchange_rates VALUES (591, 'USD', 'MWK', 1742.935300, '2025-11-03', false, '2025-11-07 19:25:16.264416', '2025-11-07 19:25:16.264416');
INSERT INTO public.exchange_rates VALUES (592, 'USD', 'MXN', 18.584000, '2025-11-03', false, '2025-11-07 19:25:16.382158', '2025-11-07 19:25:16.382158');
INSERT INTO public.exchange_rates VALUES (593, 'USD', 'MYR', 4.183700, '2025-11-03', false, '2025-11-07 19:25:16.502589', '2025-11-07 19:25:16.502589');
INSERT INTO public.exchange_rates VALUES (594, 'USD', 'MZN', 63.704400, '2025-11-03', false, '2025-11-07 19:25:16.622618', '2025-11-07 19:25:16.622618');
INSERT INTO public.exchange_rates VALUES (595, 'USD', 'NAD', 17.369700, '2025-11-03', false, '2025-11-07 19:25:16.743186', '2025-11-07 19:25:16.743186');
INSERT INTO public.exchange_rates VALUES (596, 'USD', 'NGN', 1436.828700, '2025-11-03', false, '2025-11-07 19:25:16.864972', '2025-11-07 19:25:16.864972');
INSERT INTO public.exchange_rates VALUES (597, 'USD', 'NIO', 36.756800, '2025-11-03', false, '2025-11-07 19:25:16.986718', '2025-11-07 19:25:16.986718');
INSERT INTO public.exchange_rates VALUES (598, 'USD', 'NOK', 10.195300, '2025-11-03', false, '2025-11-07 19:25:17.101377', '2025-11-07 19:25:17.101377');
INSERT INTO public.exchange_rates VALUES (599, 'USD', 'NPR', 141.884300, '2025-11-03', false, '2025-11-07 19:25:17.216522', '2025-11-07 19:25:17.216522');
INSERT INTO public.exchange_rates VALUES (600, 'USD', 'NZD', 1.772300, '2025-11-03', false, '2025-11-07 19:25:17.331442', '2025-11-07 19:25:17.331442');
INSERT INTO public.exchange_rates VALUES (601, 'USD', 'OMR', 0.384500, '2025-11-03', false, '2025-11-07 19:25:17.447146', '2025-11-07 19:25:17.447146');
INSERT INTO public.exchange_rates VALUES (602, 'USD', 'PAB', 1.000000, '2025-11-03', false, '2025-11-07 19:25:17.561479', '2025-11-07 19:25:17.561479');
INSERT INTO public.exchange_rates VALUES (603, 'USD', 'PEN', 3.374400, '2025-11-03', false, '2025-11-07 19:25:17.676652', '2025-11-07 19:25:17.676652');
INSERT INTO public.exchange_rates VALUES (604, 'USD', 'PGK', 4.264000, '2025-11-03', false, '2025-11-07 19:25:17.791913', '2025-11-07 19:25:17.791913');
INSERT INTO public.exchange_rates VALUES (430, 'USD', 'MRU', 39.837400, '2025-11-04', false, '2025-11-07 19:25:05.330626', '2025-11-07 19:25:05.330626');
INSERT INTO public.exchange_rates VALUES (432, 'USD', 'MUR', 45.961400, '2025-11-04', false, '2025-11-07 19:25:05.451149', '2025-11-07 19:25:05.451149');
INSERT INTO public.exchange_rates VALUES (434, 'USD', 'MVR', 15.431700, '2025-11-04', false, '2025-11-07 19:25:05.572007', '2025-11-07 19:25:05.572007');
INSERT INTO public.exchange_rates VALUES (436, 'USD', 'MWK', 1742.935300, '2025-11-04', false, '2025-11-07 19:25:05.692114', '2025-11-07 19:25:05.692114');
INSERT INTO public.exchange_rates VALUES (438, 'USD', 'MXN', 18.584000, '2025-11-04', false, '2025-11-07 19:25:05.812369', '2025-11-07 19:25:05.812369');
INSERT INTO public.exchange_rates VALUES (440, 'USD', 'MYR', 4.183700, '2025-11-04', false, '2025-11-07 19:25:05.93254', '2025-11-07 19:25:05.93254');
INSERT INTO public.exchange_rates VALUES (442, 'USD', 'MZN', 63.704400, '2025-11-04', false, '2025-11-07 19:25:06.05275', '2025-11-07 19:25:06.05275');
INSERT INTO public.exchange_rates VALUES (445, 'USD', 'NAD', 17.369700, '2025-11-04', false, '2025-11-07 19:25:06.172183', '2025-11-07 19:25:06.172183');
INSERT INTO public.exchange_rates VALUES (447, 'USD', 'NGN', 1436.828700, '2025-11-04', false, '2025-11-07 19:25:06.292573', '2025-11-07 19:25:06.292573');
INSERT INTO public.exchange_rates VALUES (449, 'USD', 'NIO', 36.756800, '2025-11-04', false, '2025-11-07 19:25:06.41171', '2025-11-07 19:25:06.41171');
INSERT INTO public.exchange_rates VALUES (451, 'USD', 'NOK', 10.195300, '2025-11-04', false, '2025-11-07 19:25:06.530302', '2025-11-07 19:25:06.530302');
INSERT INTO public.exchange_rates VALUES (453, 'USD', 'NPR', 141.884300, '2025-11-04', false, '2025-11-07 19:25:06.649604', '2025-11-07 19:25:06.649604');
INSERT INTO public.exchange_rates VALUES (455, 'USD', 'NZD', 1.772300, '2025-11-04', false, '2025-11-07 19:25:06.769425', '2025-11-07 19:25:06.769425');
INSERT INTO public.exchange_rates VALUES (457, 'USD', 'OMR', 0.384500, '2025-11-04', false, '2025-11-07 19:25:06.889532', '2025-11-07 19:25:06.889532');
INSERT INTO public.exchange_rates VALUES (459, 'USD', 'PAB', 1.000000, '2025-11-04', false, '2025-11-07 19:25:07.010343', '2025-11-07 19:25:07.010343');
INSERT INTO public.exchange_rates VALUES (461, 'USD', 'PEN', 3.374400, '2025-11-04', false, '2025-11-07 19:25:07.130271', '2025-11-07 19:25:07.130271');
INSERT INTO public.exchange_rates VALUES (463, 'USD', 'PGK', 4.264000, '2025-11-04', false, '2025-11-07 19:25:07.26825', '2025-11-07 19:25:07.26825');
INSERT INTO public.exchange_rates VALUES (465, 'USD', 'PHP', 58.928700, '2025-11-04', false, '2025-11-07 19:25:07.395122', '2025-11-07 19:25:07.395122');
INSERT INTO public.exchange_rates VALUES (467, 'USD', 'PKR', 282.680400, '2025-11-04', false, '2025-11-07 19:25:07.53141', '2025-11-07 19:25:07.53141');
INSERT INTO public.exchange_rates VALUES (469, 'USD', 'PLN', 3.684700, '2025-11-04', false, '2025-11-07 19:25:07.651394', '2025-11-07 19:25:07.651394');
INSERT INTO public.exchange_rates VALUES (471, 'USD', 'PYG', 7085.457700, '2025-11-04', false, '2025-11-07 19:25:07.770739', '2025-11-07 19:25:07.770739');
INSERT INTO public.exchange_rates VALUES (473, 'USD', 'QAR', 3.640000, '2025-11-04', false, '2025-11-07 19:25:07.889318', '2025-11-07 19:25:07.889318');
INSERT INTO public.exchange_rates VALUES (475, 'USD', 'RON', 4.411100, '2025-11-04', false, '2025-11-07 19:25:08.008846', '2025-11-07 19:25:08.008846');
INSERT INTO public.exchange_rates VALUES (477, 'USD', 'RSD', 101.698500, '2025-11-04', false, '2025-11-07 19:25:08.128488', '2025-11-07 19:25:08.128488');
INSERT INTO public.exchange_rates VALUES (479, 'USD', 'RUB', 81.235600, '2025-11-04', false, '2025-11-07 19:25:08.248446', '2025-11-07 19:25:08.248446');
INSERT INTO public.exchange_rates VALUES (481, 'USD', 'RWF', 1456.861000, '2025-11-04', false, '2025-11-07 19:25:08.368913', '2025-11-07 19:25:08.368913');
INSERT INTO public.exchange_rates VALUES (483, 'USD', 'SAR', 3.750000, '2025-11-04', false, '2025-11-07 19:25:08.489778', '2025-11-07 19:25:08.489778');
INSERT INTO public.exchange_rates VALUES (485, 'USD', 'SBD', 8.231900, '2025-11-04', false, '2025-11-07 19:25:08.609689', '2025-11-07 19:25:08.609689');
INSERT INTO public.exchange_rates VALUES (487, 'USD', 'SCR', 13.856900, '2025-11-04', false, '2025-11-07 19:25:08.729912', '2025-11-07 19:25:08.729912');
INSERT INTO public.exchange_rates VALUES (489, 'USD', 'SDG', 511.761200, '2025-11-04', false, '2025-11-07 19:25:08.850162', '2025-11-07 19:25:08.850162');
INSERT INTO public.exchange_rates VALUES (491, 'USD', 'SEK', 9.565600, '2025-11-04', false, '2025-11-07 19:25:08.973667', '2025-11-07 19:25:08.973667');
INSERT INTO public.exchange_rates VALUES (493, 'USD', 'SGD', 1.304300, '2025-11-04', false, '2025-11-07 19:25:09.093842', '2025-11-07 19:25:09.093842');
INSERT INTO public.exchange_rates VALUES (495, 'USD', 'SHP', 0.762300, '2025-11-04', false, '2025-11-07 19:25:09.214586', '2025-11-07 19:25:09.214586');
INSERT INTO public.exchange_rates VALUES (497, 'USD', 'SLE', 23.199400, '2025-11-04', false, '2025-11-07 19:25:09.337941', '2025-11-07 19:25:09.337941');
INSERT INTO public.exchange_rates VALUES (499, 'USD', 'SLL', 23199.379500, '2025-11-04', false, '2025-11-07 19:25:09.45891', '2025-11-07 19:25:09.45891');
INSERT INTO public.exchange_rates VALUES (501, 'USD', 'SOS', 571.816600, '2025-11-04', false, '2025-11-07 19:25:09.57944', '2025-11-07 19:25:09.57944');
INSERT INTO public.exchange_rates VALUES (503, 'USD', 'SRD', 39.082800, '2025-11-04', false, '2025-11-07 19:25:09.699817', '2025-11-07 19:25:09.699817');
INSERT INTO public.exchange_rates VALUES (505, 'USD', 'SSP', 4682.456100, '2025-11-04', false, '2025-11-07 19:25:09.819518', '2025-11-07 19:25:09.819518');
INSERT INTO public.exchange_rates VALUES (507, 'USD', 'STN', 21.233900, '2025-11-04', false, '2025-11-07 19:25:09.93999', '2025-11-07 19:25:09.93999');
INSERT INTO public.exchange_rates VALUES (509, 'USD', 'SYP', 11013.358400, '2025-11-04', false, '2025-11-07 19:25:10.060206', '2025-11-07 19:25:10.060206');
INSERT INTO public.exchange_rates VALUES (511, 'USD', 'SZL', 17.369700, '2025-11-04', false, '2025-11-07 19:25:10.1802', '2025-11-07 19:25:10.1802');
INSERT INTO public.exchange_rates VALUES (513, 'USD', 'THB', 32.396000, '2025-11-04', false, '2025-11-07 19:25:10.300365', '2025-11-07 19:25:10.300365');
INSERT INTO public.exchange_rates VALUES (515, 'USD', 'TJS', 9.281200, '2025-11-04', false, '2025-11-07 19:25:10.424387', '2025-11-07 19:25:10.424387');
INSERT INTO public.exchange_rates VALUES (517, 'USD', 'TMT', 3.499700, '2025-11-04', false, '2025-11-07 19:25:10.545043', '2025-11-07 19:25:10.545043');
INSERT INTO public.exchange_rates VALUES (519, 'USD', 'TND', 2.951400, '2025-11-04', false, '2025-11-07 19:25:10.664426', '2025-11-07 19:25:10.664426');
INSERT INTO public.exchange_rates VALUES (522, 'USD', 'TOP', 2.367700, '2025-11-04', false, '2025-11-07 19:25:10.785699', '2025-11-07 19:25:10.785699');
INSERT INTO public.exchange_rates VALUES (524, 'USD', 'TRY', 42.183400, '2025-11-04', false, '2025-11-07 19:25:10.905602', '2025-11-07 19:25:10.905602');
INSERT INTO public.exchange_rates VALUES (526, 'USD', 'TTD', 6.754300, '2025-11-04', false, '2025-11-07 19:25:11.116155', '2025-11-07 19:25:11.116155');
INSERT INTO public.exchange_rates VALUES (528, 'USD', 'TVD', 1.540500, '2025-11-04', false, '2025-11-07 19:25:11.237561', '2025-11-07 19:25:11.237561');
INSERT INTO public.exchange_rates VALUES (530, 'USD', 'TWD', 30.941000, '2025-11-04', false, '2025-11-07 19:25:11.358947', '2025-11-07 19:25:11.358947');
INSERT INTO public.exchange_rates VALUES (532, 'USD', 'TZS', 2455.251100, '2025-11-04', false, '2025-11-07 19:25:11.478662', '2025-11-07 19:25:11.478662');
INSERT INTO public.exchange_rates VALUES (534, 'USD', 'UAH', 42.054700, '2025-11-04', false, '2025-11-07 19:25:11.598663', '2025-11-07 19:25:11.598663');
INSERT INTO public.exchange_rates VALUES (536, 'USD', 'UGX', 3468.030000, '2025-11-04', false, '2025-11-07 19:25:11.719154', '2025-11-07 19:25:11.719154');
INSERT INTO public.exchange_rates VALUES (538, 'USD', 'UYU', 39.782400, '2025-11-04', false, '2025-11-07 19:25:11.839053', '2025-11-07 19:25:11.839053');
INSERT INTO public.exchange_rates VALUES (540, 'USD', 'UZS', 11954.293400, '2025-11-04', false, '2025-11-07 19:25:11.95925', '2025-11-07 19:25:11.95925');
INSERT INTO public.exchange_rates VALUES (542, 'USD', 'VES', 228.479600, '2025-11-04', false, '2025-11-07 19:25:12.079666', '2025-11-07 19:25:12.079666');
INSERT INTO public.exchange_rates VALUES (544, 'USD', 'VND', 26163.170700, '2025-11-04', false, '2025-11-07 19:25:12.199806', '2025-11-07 19:25:12.199806');
INSERT INTO public.exchange_rates VALUES (547, 'USD', 'VUV', 121.287800, '2025-11-04', false, '2025-11-07 19:25:12.33483', '2025-11-07 19:25:12.33483');
INSERT INTO public.exchange_rates VALUES (549, 'USD', 'WST', 2.787900, '2025-11-04', false, '2025-11-07 19:25:12.455408', '2025-11-07 19:25:12.455408');
INSERT INTO public.exchange_rates VALUES (551, 'USD', 'XAF', 568.511100, '2025-11-04', false, '2025-11-07 19:25:12.575687', '2025-11-07 19:25:12.575687');
INSERT INTO public.exchange_rates VALUES (553, 'USD', 'XCD', 2.700000, '2025-11-04', false, '2025-11-07 19:25:12.696151', '2025-11-07 19:25:12.696151');
INSERT INTO public.exchange_rates VALUES (555, 'USD', 'XCG', 1.790000, '2025-11-04', false, '2025-11-07 19:25:12.818112', '2025-11-07 19:25:12.818112');
INSERT INTO public.exchange_rates VALUES (557, 'USD', 'XDR', 0.738500, '2025-11-04', false, '2025-11-07 19:25:12.937684', '2025-11-07 19:25:12.937684');
INSERT INTO public.exchange_rates VALUES (559, 'USD', 'XOF', 568.511100, '2025-11-04', false, '2025-11-07 19:25:13.058347', '2025-11-07 19:25:13.058347');
INSERT INTO public.exchange_rates VALUES (561, 'USD', 'XPF', 103.423800, '2025-11-04', false, '2025-11-07 19:25:13.180844', '2025-11-07 19:25:13.180844');
INSERT INTO public.exchange_rates VALUES (563, 'USD', 'YER', 238.709600, '2025-11-04', false, '2025-11-07 19:25:13.300401', '2025-11-07 19:25:13.300401');
INSERT INTO public.exchange_rates VALUES (565, 'USD', 'ZAR', 17.372700, '2025-11-04', false, '2025-11-07 19:25:13.430535', '2025-11-07 19:25:13.430535');
INSERT INTO public.exchange_rates VALUES (567, 'USD', 'ZMW', 22.548800, '2025-11-04', false, '2025-11-07 19:25:13.55079', '2025-11-07 19:25:13.55079');
INSERT INTO public.exchange_rates VALUES (569, 'USD', 'ZWL', 26.381300, '2025-11-04', false, '2025-11-07 19:25:13.681764', '2025-11-07 19:25:13.681764');
INSERT INTO public.exchange_rates VALUES (605, 'USD', 'PHP', 58.928700, '2025-11-03', false, '2025-11-07 19:25:17.906611', '2025-11-07 19:25:17.906611');
INSERT INTO public.exchange_rates VALUES (606, 'USD', 'PKR', 282.680400, '2025-11-03', false, '2025-11-07 19:25:18.169864', '2025-11-07 19:25:18.169864');
INSERT INTO public.exchange_rates VALUES (607, 'USD', 'PLN', 3.684700, '2025-11-03', false, '2025-11-07 19:25:18.293187', '2025-11-07 19:25:18.293187');
INSERT INTO public.exchange_rates VALUES (608, 'USD', 'PYG', 7085.457700, '2025-11-03', false, '2025-11-07 19:25:18.412873', '2025-11-07 19:25:18.412873');
INSERT INTO public.exchange_rates VALUES (609, 'USD', 'QAR', 3.640000, '2025-11-03', false, '2025-11-07 19:25:18.528168', '2025-11-07 19:25:18.528168');
INSERT INTO public.exchange_rates VALUES (610, 'USD', 'RON', 4.411100, '2025-11-03', false, '2025-11-07 19:25:18.64387', '2025-11-07 19:25:18.64387');
INSERT INTO public.exchange_rates VALUES (611, 'USD', 'RSD', 101.698500, '2025-11-03', false, '2025-11-07 19:25:18.758541', '2025-11-07 19:25:18.758541');
INSERT INTO public.exchange_rates VALUES (612, 'USD', 'RUB', 81.235600, '2025-11-03', false, '2025-11-07 19:25:18.877426', '2025-11-07 19:25:18.877426');
INSERT INTO public.exchange_rates VALUES (613, 'USD', 'RWF', 1456.861000, '2025-11-03', false, '2025-11-07 19:25:18.993777', '2025-11-07 19:25:18.993777');
INSERT INTO public.exchange_rates VALUES (614, 'USD', 'SAR', 3.750000, '2025-11-03', false, '2025-11-07 19:25:19.109592', '2025-11-07 19:25:19.109592');
INSERT INTO public.exchange_rates VALUES (615, 'USD', 'SBD', 8.231900, '2025-11-03', false, '2025-11-07 19:25:19.224309', '2025-11-07 19:25:19.224309');
INSERT INTO public.exchange_rates VALUES (616, 'USD', 'SCR', 13.856900, '2025-11-03', false, '2025-11-07 19:25:19.341432', '2025-11-07 19:25:19.341432');
INSERT INTO public.exchange_rates VALUES (617, 'USD', 'SDG', 511.761200, '2025-11-03', false, '2025-11-07 19:25:19.45662', '2025-11-07 19:25:19.45662');
INSERT INTO public.exchange_rates VALUES (618, 'USD', 'SEK', 9.565600, '2025-11-03', false, '2025-11-07 19:25:19.570919', '2025-11-07 19:25:19.570919');
INSERT INTO public.exchange_rates VALUES (619, 'USD', 'SGD', 1.304300, '2025-11-03', false, '2025-11-07 19:25:19.68601', '2025-11-07 19:25:19.68601');
INSERT INTO public.exchange_rates VALUES (620, 'USD', 'SHP', 0.762300, '2025-11-03', false, '2025-11-07 19:25:19.801359', '2025-11-07 19:25:19.801359');
INSERT INTO public.exchange_rates VALUES (621, 'USD', 'SLE', 23.199400, '2025-11-03', false, '2025-11-07 19:25:19.922422', '2025-11-07 19:25:19.922422');
INSERT INTO public.exchange_rates VALUES (622, 'USD', 'SLL', 23199.379500, '2025-11-03', false, '2025-11-07 19:25:20.039258', '2025-11-07 19:25:20.039258');
INSERT INTO public.exchange_rates VALUES (623, 'USD', 'SOS', 571.816600, '2025-11-03', false, '2025-11-07 19:25:20.156796', '2025-11-07 19:25:20.156796');
INSERT INTO public.exchange_rates VALUES (624, 'USD', 'SRD', 39.082800, '2025-11-03', false, '2025-11-07 19:25:20.274154', '2025-11-07 19:25:20.274154');
INSERT INTO public.exchange_rates VALUES (625, 'USD', 'SSP', 4682.456100, '2025-11-03', false, '2025-11-07 19:25:20.389596', '2025-11-07 19:25:20.389596');
INSERT INTO public.exchange_rates VALUES (626, 'USD', 'STN', 21.233900, '2025-11-03', false, '2025-11-07 19:25:20.508963', '2025-11-07 19:25:20.508963');
INSERT INTO public.exchange_rates VALUES (627, 'USD', 'SYP', 11013.358400, '2025-11-03', false, '2025-11-07 19:25:20.623832', '2025-11-07 19:25:20.623832');
INSERT INTO public.exchange_rates VALUES (628, 'USD', 'SZL', 17.369700, '2025-11-03', false, '2025-11-07 19:25:20.738824', '2025-11-07 19:25:20.738824');
INSERT INTO public.exchange_rates VALUES (629, 'USD', 'THB', 32.396000, '2025-11-03', false, '2025-11-07 19:25:20.860121', '2025-11-07 19:25:20.860121');
INSERT INTO public.exchange_rates VALUES (630, 'USD', 'TJS', 9.281200, '2025-11-03', false, '2025-11-07 19:25:20.978259', '2025-11-07 19:25:20.978259');
INSERT INTO public.exchange_rates VALUES (631, 'USD', 'TMT', 3.499700, '2025-11-03', false, '2025-11-07 19:25:21.095882', '2025-11-07 19:25:21.095882');
INSERT INTO public.exchange_rates VALUES (632, 'USD', 'TND', 2.951400, '2025-11-03', false, '2025-11-07 19:25:21.218476', '2025-11-07 19:25:21.218476');
INSERT INTO public.exchange_rates VALUES (633, 'USD', 'TOP', 2.367700, '2025-11-03', false, '2025-11-07 19:25:21.342349', '2025-11-07 19:25:21.342349');
INSERT INTO public.exchange_rates VALUES (634, 'USD', 'TRY', 42.183400, '2025-11-03', false, '2025-11-07 19:25:21.459076', '2025-11-07 19:25:21.459076');
INSERT INTO public.exchange_rates VALUES (635, 'USD', 'TTD', 6.754300, '2025-11-03', false, '2025-11-07 19:25:21.574767', '2025-11-07 19:25:21.574767');
INSERT INTO public.exchange_rates VALUES (636, 'USD', 'TVD', 1.540500, '2025-11-03', false, '2025-11-07 19:25:21.692251', '2025-11-07 19:25:21.692251');
INSERT INTO public.exchange_rates VALUES (637, 'USD', 'TWD', 30.941000, '2025-11-03', false, '2025-11-07 19:25:21.811784', '2025-11-07 19:25:21.811784');
INSERT INTO public.exchange_rates VALUES (638, 'USD', 'TZS', 2455.251100, '2025-11-03', false, '2025-11-07 19:25:21.930426', '2025-11-07 19:25:21.930426');
INSERT INTO public.exchange_rates VALUES (639, 'USD', 'UAH', 42.054700, '2025-11-03', false, '2025-11-07 19:25:22.046381', '2025-11-07 19:25:22.046381');
INSERT INTO public.exchange_rates VALUES (640, 'USD', 'UGX', 3468.030000, '2025-11-03', false, '2025-11-07 19:25:22.162605', '2025-11-07 19:25:22.162605');
INSERT INTO public.exchange_rates VALUES (641, 'USD', 'UYU', 39.782400, '2025-11-03', false, '2025-11-07 19:25:22.279215', '2025-11-07 19:25:22.279215');
INSERT INTO public.exchange_rates VALUES (642, 'USD', 'UZS', 11954.293400, '2025-11-03', false, '2025-11-07 19:25:22.396983', '2025-11-07 19:25:22.396983');
INSERT INTO public.exchange_rates VALUES (643, 'USD', 'VES', 228.479600, '2025-11-03', false, '2025-11-07 19:25:22.518093', '2025-11-07 19:25:22.518093');
INSERT INTO public.exchange_rates VALUES (644, 'USD', 'VND', 26163.170700, '2025-11-03', false, '2025-11-07 19:25:22.638956', '2025-11-07 19:25:22.638956');
INSERT INTO public.exchange_rates VALUES (645, 'USD', 'VUV', 121.287800, '2025-11-03', false, '2025-11-07 19:25:22.757549', '2025-11-07 19:25:22.757549');
INSERT INTO public.exchange_rates VALUES (646, 'USD', 'WST', 2.787900, '2025-11-03', false, '2025-11-07 19:25:22.873863', '2025-11-07 19:25:22.873863');
INSERT INTO public.exchange_rates VALUES (647, 'USD', 'XAF', 568.511100, '2025-11-03', false, '2025-11-07 19:25:22.990562', '2025-11-07 19:25:22.990562');
INSERT INTO public.exchange_rates VALUES (648, 'USD', 'XCD', 2.700000, '2025-11-03', false, '2025-11-07 19:25:23.111738', '2025-11-07 19:25:23.111738');
INSERT INTO public.exchange_rates VALUES (649, 'USD', 'XCG', 1.790000, '2025-11-03', false, '2025-11-07 19:25:23.226489', '2025-11-07 19:25:23.226489');
INSERT INTO public.exchange_rates VALUES (650, 'USD', 'XDR', 0.738500, '2025-11-03', false, '2025-11-07 19:25:23.344291', '2025-11-07 19:25:23.344291');
INSERT INTO public.exchange_rates VALUES (651, 'USD', 'XOF', 568.511100, '2025-11-03', false, '2025-11-07 19:25:23.460544', '2025-11-07 19:25:23.460544');
INSERT INTO public.exchange_rates VALUES (652, 'USD', 'XPF', 103.423800, '2025-11-03', false, '2025-11-07 19:25:23.579426', '2025-11-07 19:25:23.579426');
INSERT INTO public.exchange_rates VALUES (653, 'USD', 'YER', 238.709600, '2025-11-03', false, '2025-11-07 19:25:23.699285', '2025-11-07 19:25:23.699285');
INSERT INTO public.exchange_rates VALUES (654, 'USD', 'ZAR', 17.372700, '2025-11-03', false, '2025-11-07 19:25:23.816913', '2025-11-07 19:25:23.816913');
INSERT INTO public.exchange_rates VALUES (655, 'USD', 'ZMW', 22.548800, '2025-11-03', false, '2025-11-07 19:25:23.937087', '2025-11-07 19:25:23.937087');
INSERT INTO public.exchange_rates VALUES (656, 'USD', 'ZWL', 26.381300, '2025-11-03', false, '2025-11-07 19:25:24.052', '2025-11-07 19:25:24.052');
INSERT INTO public.exchange_rates VALUES (657, 'USD', 'AED', 3.672500, '2025-11-01', false, '2025-11-07 19:35:42.711519', '2025-11-07 19:35:42.711519');
INSERT INTO public.exchange_rates VALUES (658, 'USD', 'AFN', 66.329100, '2025-11-01', false, '2025-11-07 19:35:42.846626', '2025-11-07 19:35:42.846626');
INSERT INTO public.exchange_rates VALUES (659, 'USD', 'ALL', 83.878300, '2025-11-01', false, '2025-11-07 19:35:42.965656', '2025-11-07 19:35:42.965656');
INSERT INTO public.exchange_rates VALUES (660, 'USD', 'AMD', 382.591200, '2025-11-01', false, '2025-11-07 19:35:43.091325', '2025-11-07 19:35:43.091325');
INSERT INTO public.exchange_rates VALUES (661, 'USD', 'ANG', 1.790000, '2025-11-01', false, '2025-11-07 19:35:43.214122', '2025-11-07 19:35:43.214122');
INSERT INTO public.exchange_rates VALUES (662, 'USD', 'AOA', 920.113500, '2025-11-01', false, '2025-11-07 19:35:43.334023', '2025-11-07 19:35:43.334023');
INSERT INTO public.exchange_rates VALUES (663, 'USD', 'ARS', 1447.500000, '2025-11-01', false, '2025-11-07 19:35:43.453104', '2025-11-07 19:35:43.453104');
INSERT INTO public.exchange_rates VALUES (664, 'USD', 'AUD', 1.541300, '2025-11-01', false, '2025-11-07 19:35:43.573217', '2025-11-07 19:35:43.573217');
INSERT INTO public.exchange_rates VALUES (665, 'USD', 'AWG', 1.790000, '2025-11-01', false, '2025-11-07 19:35:43.694171', '2025-11-07 19:35:43.694171');
INSERT INTO public.exchange_rates VALUES (666, 'USD', 'AZN', 1.698900, '2025-11-01', false, '2025-11-07 19:35:43.818069', '2025-11-07 19:35:43.818069');
INSERT INTO public.exchange_rates VALUES (667, 'USD', 'BAM', 1.695100, '2025-11-01', false, '2025-11-07 19:35:43.936319', '2025-11-07 19:35:43.936319');
INSERT INTO public.exchange_rates VALUES (668, 'USD', 'BBD', 2.000000, '2025-11-01', false, '2025-11-07 19:35:44.057058', '2025-11-07 19:35:44.057058');
INSERT INTO public.exchange_rates VALUES (669, 'USD', 'BDT', 121.980300, '2025-11-01', false, '2025-11-07 19:35:44.176488', '2025-11-07 19:35:44.176488');
INSERT INTO public.exchange_rates VALUES (670, 'USD', 'BGN', 1.695200, '2025-11-01', false, '2025-11-07 19:35:44.297328', '2025-11-07 19:35:44.297328');
INSERT INTO public.exchange_rates VALUES (671, 'USD', 'BHD', 0.376000, '2025-11-01', false, '2025-11-07 19:35:44.426305', '2025-11-07 19:35:44.426305');
INSERT INTO public.exchange_rates VALUES (672, 'USD', 'BIF', 2951.674800, '2025-11-01', false, '2025-11-07 19:35:44.549011', '2025-11-07 19:35:44.549011');
INSERT INTO public.exchange_rates VALUES (673, 'USD', 'BMD', 1.000000, '2025-11-01', false, '2025-11-07 19:35:44.667137', '2025-11-07 19:35:44.667137');
INSERT INTO public.exchange_rates VALUES (674, 'USD', 'BND', 1.304600, '2025-11-01', false, '2025-11-07 19:35:44.786721', '2025-11-07 19:35:44.786721');
INSERT INTO public.exchange_rates VALUES (675, 'USD', 'BOB', 6.917700, '2025-11-01', false, '2025-11-07 19:35:44.906931', '2025-11-07 19:35:44.906931');
INSERT INTO public.exchange_rates VALUES (676, 'USD', 'BRL', 5.351100, '2025-11-01', false, '2025-11-07 19:35:45.033306', '2025-11-07 19:35:45.033306');
INSERT INTO public.exchange_rates VALUES (677, 'USD', 'BSD', 1.000000, '2025-11-01', false, '2025-11-07 19:35:45.152984', '2025-11-07 19:35:45.152984');
INSERT INTO public.exchange_rates VALUES (678, 'USD', 'BTN', 88.677700, '2025-11-01', false, '2025-11-07 19:35:45.273634', '2025-11-07 19:35:45.273634');
INSERT INTO public.exchange_rates VALUES (679, 'USD', 'BWP', 13.821500, '2025-11-01', false, '2025-11-07 19:35:45.392051', '2025-11-07 19:35:45.392051');
INSERT INTO public.exchange_rates VALUES (680, 'USD', 'BYN', 3.257400, '2025-11-01', false, '2025-11-07 19:35:45.511337', '2025-11-07 19:35:45.511337');
INSERT INTO public.exchange_rates VALUES (681, 'USD', 'BZD', 2.000000, '2025-11-01', false, '2025-11-07 19:35:45.630186', '2025-11-07 19:35:45.630186');
INSERT INTO public.exchange_rates VALUES (682, 'USD', 'CAD', 1.410900, '2025-11-01', false, '2025-11-07 19:35:45.749304', '2025-11-07 19:35:45.749304');
INSERT INTO public.exchange_rates VALUES (683, 'USD', 'CDF', 2244.538800, '2025-11-01', false, '2025-11-07 19:35:45.867052', '2025-11-07 19:35:45.867052');
INSERT INTO public.exchange_rates VALUES (684, 'USD', 'CHF', 0.807000, '2025-11-01', false, '2025-11-07 19:35:45.986333', '2025-11-07 19:35:45.986333');
INSERT INTO public.exchange_rates VALUES (685, 'USD', 'CLF', 0.023880, '2025-11-01', false, '2025-11-07 19:35:46.106055', '2025-11-07 19:35:46.106055');
INSERT INTO public.exchange_rates VALUES (686, 'USD', 'CLP', 943.816400, '2025-11-01', false, '2025-11-07 19:35:46.231706', '2025-11-07 19:35:46.231706');
INSERT INTO public.exchange_rates VALUES (687, 'USD', 'CNH', 7.121500, '2025-11-01', false, '2025-11-07 19:35:46.351933', '2025-11-07 19:35:46.351933');
INSERT INTO public.exchange_rates VALUES (688, 'USD', 'CNY', 7.120200, '2025-11-01', false, '2025-11-07 19:35:46.470155', '2025-11-07 19:35:46.470155');
INSERT INTO public.exchange_rates VALUES (689, 'USD', 'COP', 3832.972000, '2025-11-01', false, '2025-11-07 19:35:46.58851', '2025-11-07 19:35:46.58851');
INSERT INTO public.exchange_rates VALUES (690, 'USD', 'CRC', 501.885400, '2025-11-01', false, '2025-11-07 19:35:46.709192', '2025-11-07 19:35:46.709192');
INSERT INTO public.exchange_rates VALUES (691, 'USD', 'CUP', 24.000000, '2025-11-01', false, '2025-11-07 19:35:46.829388', '2025-11-07 19:35:46.829388');
INSERT INTO public.exchange_rates VALUES (692, 'USD', 'CVE', 95.565500, '2025-11-01', false, '2025-11-07 19:35:46.952499', '2025-11-07 19:35:46.952499');
INSERT INTO public.exchange_rates VALUES (693, 'USD', 'CZK', 21.097100, '2025-11-01', false, '2025-11-07 19:35:47.073292', '2025-11-07 19:35:47.073292');
INSERT INTO public.exchange_rates VALUES (694, 'USD', 'DJF', 177.721000, '2025-11-01', false, '2025-11-07 19:35:47.197784', '2025-11-07 19:35:47.197784');
INSERT INTO public.exchange_rates VALUES (695, 'USD', 'DKK', 6.465800, '2025-11-01', false, '2025-11-07 19:35:47.316692', '2025-11-07 19:35:47.316692');
INSERT INTO public.exchange_rates VALUES (696, 'USD', 'DOP', 64.239300, '2025-11-01', false, '2025-11-07 19:35:47.437242', '2025-11-07 19:35:47.437242');
INSERT INTO public.exchange_rates VALUES (697, 'USD', 'DZD', 130.628700, '2025-11-01', false, '2025-11-07 19:35:47.555141', '2025-11-07 19:35:47.555141');
INSERT INTO public.exchange_rates VALUES (698, 'USD', 'EGP', 47.338400, '2025-11-01', false, '2025-11-07 19:35:47.673263', '2025-11-07 19:35:47.673263');
INSERT INTO public.exchange_rates VALUES (699, 'USD', 'ERN', 15.000000, '2025-11-01', false, '2025-11-07 19:35:47.802069', '2025-11-07 19:35:47.802069');
INSERT INTO public.exchange_rates VALUES (700, 'USD', 'AED', 3.672500, '2025-10-31', false, '2025-11-07 19:35:47.881089', '2025-11-07 19:35:47.881089');
INSERT INTO public.exchange_rates VALUES (701, 'USD', 'ETB', 152.232700, '2025-11-01', false, '2025-11-07 19:35:47.92534', '2025-11-07 19:35:47.92534');
INSERT INTO public.exchange_rates VALUES (702, 'USD', 'AFN', 66.329100, '2025-10-31', false, '2025-11-07 19:35:48.005637', '2025-11-07 19:35:48.005637');
INSERT INTO public.exchange_rates VALUES (703, 'USD', 'EUR', 0.866600, '2025-11-01', false, '2025-11-07 19:35:48.052734', '2025-11-07 19:35:48.052734');
INSERT INTO public.exchange_rates VALUES (704, 'USD', 'ALL', 83.878300, '2025-10-31', false, '2025-11-07 19:35:48.126427', '2025-11-07 19:35:48.126427');
INSERT INTO public.exchange_rates VALUES (705, 'USD', 'FJD', 2.280300, '2025-11-01', false, '2025-11-07 19:35:48.173137', '2025-11-07 19:35:48.173137');
INSERT INTO public.exchange_rates VALUES (706, 'USD', 'AMD', 382.591200, '2025-10-31', false, '2025-11-07 19:35:48.248625', '2025-11-07 19:35:48.248625');
INSERT INTO public.exchange_rates VALUES (707, 'USD', 'FKP', 0.762300, '2025-11-01', false, '2025-11-07 19:35:48.290276', '2025-11-07 19:35:48.290276');
INSERT INTO public.exchange_rates VALUES (708, 'USD', 'ANG', 1.790000, '2025-10-31', false, '2025-11-07 19:35:48.368423', '2025-11-07 19:35:48.368423');
INSERT INTO public.exchange_rates VALUES (709, 'USD', 'FOK', 6.466100, '2025-11-01', false, '2025-11-07 19:35:48.408184', '2025-11-07 19:35:48.408184');
INSERT INTO public.exchange_rates VALUES (710, 'USD', 'AOA', 920.113500, '2025-10-31', false, '2025-11-07 19:35:48.486716', '2025-11-07 19:35:48.486716');
INSERT INTO public.exchange_rates VALUES (711, 'USD', 'GBP', 0.762000, '2025-11-01', false, '2025-11-07 19:35:48.526128', '2025-11-07 19:35:48.526128');
INSERT INTO public.exchange_rates VALUES (712, 'USD', 'ARS', 1447.500000, '2025-10-31', false, '2025-11-07 19:35:48.607793', '2025-11-07 19:35:48.607793');
INSERT INTO public.exchange_rates VALUES (714, 'USD', 'AUD', 1.541300, '2025-10-31', false, '2025-11-07 19:35:48.732876', '2025-11-07 19:35:48.732876');
INSERT INTO public.exchange_rates VALUES (716, 'USD', 'AWG', 1.790000, '2025-10-31', false, '2025-11-07 19:35:48.852497', '2025-11-07 19:35:48.852497');
INSERT INTO public.exchange_rates VALUES (718, 'USD', 'AZN', 1.698900, '2025-10-31', false, '2025-11-07 19:35:48.971083', '2025-11-07 19:35:48.971083');
INSERT INTO public.exchange_rates VALUES (720, 'USD', 'BAM', 1.695100, '2025-10-31', false, '2025-11-07 19:35:49.091074', '2025-11-07 19:35:49.091074');
INSERT INTO public.exchange_rates VALUES (722, 'USD', 'BBD', 2.000000, '2025-10-31', false, '2025-11-07 19:35:49.208171', '2025-11-07 19:35:49.208171');
INSERT INTO public.exchange_rates VALUES (724, 'USD', 'BDT', 121.980300, '2025-10-31', false, '2025-11-07 19:35:49.32692', '2025-11-07 19:35:49.32692');
INSERT INTO public.exchange_rates VALUES (726, 'USD', 'BGN', 1.695200, '2025-10-31', false, '2025-11-07 19:35:49.44653', '2025-11-07 19:35:49.44653');
INSERT INTO public.exchange_rates VALUES (728, 'USD', 'BHD', 0.376000, '2025-10-31', false, '2025-11-07 19:35:49.565233', '2025-11-07 19:35:49.565233');
INSERT INTO public.exchange_rates VALUES (730, 'USD', 'BIF', 2951.674800, '2025-10-31', false, '2025-11-07 19:35:49.68396', '2025-11-07 19:35:49.68396');
INSERT INTO public.exchange_rates VALUES (732, 'USD', 'BMD', 1.000000, '2025-10-31', false, '2025-11-07 19:35:49.802352', '2025-11-07 19:35:49.802352');
INSERT INTO public.exchange_rates VALUES (734, 'USD', 'BND', 1.304600, '2025-10-31', false, '2025-11-07 19:35:49.925066', '2025-11-07 19:35:49.925066');
INSERT INTO public.exchange_rates VALUES (736, 'USD', 'BOB', 6.917700, '2025-10-31', false, '2025-11-07 19:35:50.043446', '2025-11-07 19:35:50.043446');
INSERT INTO public.exchange_rates VALUES (738, 'USD', 'BRL', 5.351100, '2025-10-31', false, '2025-11-07 19:35:50.16367', '2025-11-07 19:35:50.16367');
INSERT INTO public.exchange_rates VALUES (740, 'USD', 'BSD', 1.000000, '2025-10-31', false, '2025-11-07 19:35:50.281821', '2025-11-07 19:35:50.281821');
INSERT INTO public.exchange_rates VALUES (742, 'USD', 'BTN', 88.677700, '2025-10-31', false, '2025-11-07 19:35:50.402868', '2025-11-07 19:35:50.402868');
INSERT INTO public.exchange_rates VALUES (744, 'USD', 'BWP', 13.821500, '2025-10-31', false, '2025-11-07 19:35:50.525782', '2025-11-07 19:35:50.525782');
INSERT INTO public.exchange_rates VALUES (746, 'USD', 'BYN', 3.257400, '2025-10-31', false, '2025-11-07 19:35:50.645889', '2025-11-07 19:35:50.645889');
INSERT INTO public.exchange_rates VALUES (748, 'USD', 'BZD', 2.000000, '2025-10-31', false, '2025-11-07 19:35:50.763706', '2025-11-07 19:35:50.763706');
INSERT INTO public.exchange_rates VALUES (750, 'USD', 'CAD', 1.410900, '2025-10-31', false, '2025-11-07 19:35:50.882164', '2025-11-07 19:35:50.882164');
INSERT INTO public.exchange_rates VALUES (752, 'USD', 'CDF', 2244.538800, '2025-10-31', false, '2025-11-07 19:35:51.001515', '2025-11-07 19:35:51.001515');
INSERT INTO public.exchange_rates VALUES (754, 'USD', 'CHF', 0.807000, '2025-10-31', false, '2025-11-07 19:35:51.127373', '2025-11-07 19:35:51.127373');
INSERT INTO public.exchange_rates VALUES (756, 'USD', 'CLF', 0.023880, '2025-10-31', false, '2025-11-07 19:35:51.24954', '2025-11-07 19:35:51.24954');
INSERT INTO public.exchange_rates VALUES (758, 'USD', 'CLP', 943.816400, '2025-10-31', false, '2025-11-07 19:35:51.367631', '2025-11-07 19:35:51.367631');
INSERT INTO public.exchange_rates VALUES (760, 'USD', 'CNH', 7.121500, '2025-10-31', false, '2025-11-07 19:35:51.486315', '2025-11-07 19:35:51.486315');
INSERT INTO public.exchange_rates VALUES (762, 'USD', 'CNY', 7.120200, '2025-10-31', false, '2025-11-07 19:35:51.607911', '2025-11-07 19:35:51.607911');
INSERT INTO public.exchange_rates VALUES (764, 'USD', 'COP', 3832.972000, '2025-10-31', false, '2025-11-07 19:35:51.726714', '2025-11-07 19:35:51.726714');
INSERT INTO public.exchange_rates VALUES (766, 'USD', 'CRC', 501.885400, '2025-10-31', false, '2025-11-07 19:35:51.846267', '2025-11-07 19:35:51.846267');
INSERT INTO public.exchange_rates VALUES (768, 'USD', 'CUP', 24.000000, '2025-10-31', false, '2025-11-07 19:35:51.964186', '2025-11-07 19:35:51.964186');
INSERT INTO public.exchange_rates VALUES (770, 'USD', 'CVE', 95.565500, '2025-10-31', false, '2025-11-07 19:35:52.081678', '2025-11-07 19:35:52.081678');
INSERT INTO public.exchange_rates VALUES (772, 'USD', 'CZK', 21.097100, '2025-10-31', false, '2025-11-07 19:35:52.200092', '2025-11-07 19:35:52.200092');
INSERT INTO public.exchange_rates VALUES (774, 'USD', 'DJF', 177.721000, '2025-10-31', false, '2025-11-07 19:35:52.317409', '2025-11-07 19:35:52.317409');
INSERT INTO public.exchange_rates VALUES (776, 'USD', 'DKK', 6.465800, '2025-10-31', false, '2025-11-07 19:35:52.43579', '2025-11-07 19:35:52.43579');
INSERT INTO public.exchange_rates VALUES (778, 'USD', 'DOP', 64.239300, '2025-10-31', false, '2025-11-07 19:35:52.554711', '2025-11-07 19:35:52.554711');
INSERT INTO public.exchange_rates VALUES (780, 'USD', 'DZD', 130.628700, '2025-10-31', false, '2025-11-07 19:35:52.674989', '2025-11-07 19:35:52.674989');
INSERT INTO public.exchange_rates VALUES (782, 'USD', 'EGP', 47.338400, '2025-10-31', false, '2025-11-07 19:35:52.791246', '2025-11-07 19:35:52.791246');
INSERT INTO public.exchange_rates VALUES (784, 'USD', 'ERN', 15.000000, '2025-10-31', false, '2025-11-07 19:35:52.90854', '2025-11-07 19:35:52.90854');
INSERT INTO public.exchange_rates VALUES (786, 'USD', 'ETB', 152.232700, '2025-10-31', false, '2025-11-07 19:35:53.027018', '2025-11-07 19:35:53.027018');
INSERT INTO public.exchange_rates VALUES (788, 'USD', 'EUR', 0.866600, '2025-10-31', false, '2025-11-07 19:35:53.146515', '2025-11-07 19:35:53.146515');
INSERT INTO public.exchange_rates VALUES (790, 'USD', 'FJD', 2.280300, '2025-10-31', false, '2025-11-07 19:35:53.266638', '2025-11-07 19:35:53.266638');
INSERT INTO public.exchange_rates VALUES (792, 'USD', 'FKP', 0.762300, '2025-10-31', false, '2025-11-07 19:35:53.387724', '2025-11-07 19:35:53.387724');
INSERT INTO public.exchange_rates VALUES (794, 'USD', 'FOK', 6.466100, '2025-10-31', false, '2025-11-07 19:35:53.506043', '2025-11-07 19:35:53.506043');
INSERT INTO public.exchange_rates VALUES (796, 'USD', 'GBP', 0.762000, '2025-10-31', false, '2025-11-07 19:35:53.624583', '2025-11-07 19:35:53.624583');
INSERT INTO public.exchange_rates VALUES (798, 'USD', 'GEL', 2.707300, '2025-10-31', false, '2025-11-07 19:35:53.742948', '2025-11-07 19:35:53.742948');
INSERT INTO public.exchange_rates VALUES (800, 'USD', 'GGP', 0.762300, '2025-10-31', false, '2025-11-07 19:35:53.863232', '2025-11-07 19:35:53.863232');
INSERT INTO public.exchange_rates VALUES (802, 'USD', 'GHS', 11.119100, '2025-10-31', false, '2025-11-07 19:35:53.980341', '2025-11-07 19:35:53.980341');
INSERT INTO public.exchange_rates VALUES (804, 'USD', 'GIP', 0.762300, '2025-10-31', false, '2025-11-07 19:35:54.099752', '2025-11-07 19:35:54.099752');
INSERT INTO public.exchange_rates VALUES (806, 'USD', 'GMD', 73.394400, '2025-10-31', false, '2025-11-07 19:35:54.22189', '2025-11-07 19:35:54.22189');
INSERT INTO public.exchange_rates VALUES (808, 'USD', 'GNF', 8702.226400, '2025-10-31', false, '2025-11-07 19:35:54.341306', '2025-11-07 19:35:54.341306');
INSERT INTO public.exchange_rates VALUES (810, 'USD', 'GTQ', 7.657000, '2025-10-31', false, '2025-11-07 19:35:54.46066', '2025-11-07 19:35:54.46066');
INSERT INTO public.exchange_rates VALUES (811, 'USD', 'GYD', 209.196900, '2025-10-31', false, '2025-11-07 19:35:54.579236', '2025-11-07 19:35:54.579236');
INSERT INTO public.exchange_rates VALUES (813, 'USD', 'HKD', 7.774800, '2025-10-31', false, '2025-11-07 19:35:54.698546', '2025-11-07 19:35:54.698546');
INSERT INTO public.exchange_rates VALUES (815, 'USD', 'HNL', 26.290700, '2025-10-31', false, '2025-11-07 19:35:54.820443', '2025-11-07 19:35:54.820443');
INSERT INTO public.exchange_rates VALUES (817, 'USD', 'HRK', 6.530100, '2025-10-31', false, '2025-11-07 19:35:54.939772', '2025-11-07 19:35:54.939772');
INSERT INTO public.exchange_rates VALUES (819, 'USD', 'HTG', 130.930900, '2025-10-31', false, '2025-11-07 19:35:55.058547', '2025-11-07 19:35:55.058547');
INSERT INTO public.exchange_rates VALUES (821, 'USD', 'HUF', 334.597400, '2025-10-31', false, '2025-11-07 19:35:55.176906', '2025-11-07 19:35:55.176906');
INSERT INTO public.exchange_rates VALUES (823, 'USD', 'IDR', 16676.986400, '2025-10-31', false, '2025-11-07 19:35:55.295227', '2025-11-07 19:35:55.295227');
INSERT INTO public.exchange_rates VALUES (825, 'USD', 'ILS', 3.262200, '2025-10-31', false, '2025-11-07 19:35:55.414107', '2025-11-07 19:35:55.414107');
INSERT INTO public.exchange_rates VALUES (827, 'USD', 'IMP', 0.762300, '2025-10-31', false, '2025-11-07 19:35:55.532485', '2025-11-07 19:35:55.532485');
INSERT INTO public.exchange_rates VALUES (829, 'USD', 'INR', 88.676400, '2025-10-31', false, '2025-11-07 19:35:55.651943', '2025-11-07 19:35:55.651943');
INSERT INTO public.exchange_rates VALUES (831, 'USD', 'IQD', 1308.787100, '2025-10-31', false, '2025-11-07 19:35:55.771603', '2025-11-07 19:35:55.771603');
INSERT INTO public.exchange_rates VALUES (833, 'USD', 'IRR', 42415.872600, '2025-10-31', false, '2025-11-07 19:35:55.890201', '2025-11-07 19:35:55.890201');
INSERT INTO public.exchange_rates VALUES (835, 'USD', 'ISK', 126.864300, '2025-10-31', false, '2025-11-07 19:35:56.008326', '2025-11-07 19:35:56.008326');
INSERT INTO public.exchange_rates VALUES (837, 'USD', 'JEP', 0.762300, '2025-10-31', false, '2025-11-07 19:35:56.127449', '2025-11-07 19:35:56.127449');
INSERT INTO public.exchange_rates VALUES (839, 'USD', 'JMD', 160.626000, '2025-10-31', false, '2025-11-07 19:35:56.248408', '2025-11-07 19:35:56.248408');
INSERT INTO public.exchange_rates VALUES (841, 'USD', 'JOD', 0.709000, '2025-10-31', false, '2025-11-07 19:35:56.367701', '2025-11-07 19:35:56.367701');
INSERT INTO public.exchange_rates VALUES (843, 'USD', 'JPY', 153.228200, '2025-10-31', false, '2025-11-07 19:35:56.486276', '2025-11-07 19:35:56.486276');
INSERT INTO public.exchange_rates VALUES (845, 'USD', 'KES', 129.091600, '2025-10-31', false, '2025-11-07 19:35:56.604891', '2025-11-07 19:35:56.604891');
INSERT INTO public.exchange_rates VALUES (847, 'USD', 'KGS', 87.410400, '2025-10-31', false, '2025-11-07 19:35:56.723182', '2025-11-07 19:35:56.723182');
INSERT INTO public.exchange_rates VALUES (849, 'USD', 'KHR', 4020.710100, '2025-10-31', false, '2025-11-07 19:35:56.841395', '2025-11-07 19:35:56.841395');
INSERT INTO public.exchange_rates VALUES (851, 'USD', 'KID', 1.540500, '2025-10-31', false, '2025-11-07 19:35:56.961349', '2025-11-07 19:35:56.961349');
INSERT INTO public.exchange_rates VALUES (853, 'USD', 'KMF', 426.383300, '2025-10-31', false, '2025-11-07 19:35:57.087757', '2025-11-07 19:35:57.087757');
INSERT INTO public.exchange_rates VALUES (855, 'USD', 'KRW', 1446.483600, '2025-10-31', false, '2025-11-07 19:35:57.211347', '2025-11-07 19:35:57.211347');
INSERT INTO public.exchange_rates VALUES (857, 'USD', 'KWD', 0.306900, '2025-10-31', false, '2025-11-07 19:35:57.333761', '2025-11-07 19:35:57.333761');
INSERT INTO public.exchange_rates VALUES (859, 'USD', 'KYD', 0.833300, '2025-10-31', false, '2025-11-07 19:35:57.451944', '2025-11-07 19:35:57.451944');
INSERT INTO public.exchange_rates VALUES (861, 'USD', 'KZT', 525.842600, '2025-10-31', false, '2025-11-07 19:35:57.573933', '2025-11-07 19:35:57.573933');
INSERT INTO public.exchange_rates VALUES (863, 'USD', 'LAK', 21712.907200, '2025-10-31', false, '2025-11-07 19:35:57.691411', '2025-11-07 19:35:57.691411');
INSERT INTO public.exchange_rates VALUES (865, 'USD', 'LBP', 89500.000000, '2025-10-31', false, '2025-11-07 19:35:57.81149', '2025-11-07 19:35:57.81149');
INSERT INTO public.exchange_rates VALUES (867, 'USD', 'LKR', 304.522400, '2025-10-31', false, '2025-11-07 19:35:57.931411', '2025-11-07 19:35:57.931411');
INSERT INTO public.exchange_rates VALUES (869, 'USD', 'LRD', 182.840100, '2025-10-31', false, '2025-11-07 19:35:58.05126', '2025-11-07 19:35:58.05126');
INSERT INTO public.exchange_rates VALUES (871, 'USD', 'LSL', 17.369700, '2025-10-31', false, '2025-11-07 19:35:58.172754', '2025-11-07 19:35:58.172754');
INSERT INTO public.exchange_rates VALUES (873, 'USD', 'LYD', 5.467800, '2025-10-31', false, '2025-11-07 19:35:58.294269', '2025-11-07 19:35:58.294269');
INSERT INTO public.exchange_rates VALUES (875, 'USD', 'MAD', 9.286200, '2025-10-31', false, '2025-11-07 19:35:58.417884', '2025-11-07 19:35:58.417884');
INSERT INTO public.exchange_rates VALUES (877, 'USD', 'MDL', 17.095600, '2025-10-31', false, '2025-11-07 19:35:58.536816', '2025-11-07 19:35:58.536816');
INSERT INTO public.exchange_rates VALUES (879, 'USD', 'MGA', 4504.179600, '2025-10-31', false, '2025-11-07 19:35:58.65519', '2025-11-07 19:35:58.65519');
INSERT INTO public.exchange_rates VALUES (881, 'USD', 'MKD', 53.563600, '2025-10-31', false, '2025-11-07 19:35:58.775288', '2025-11-07 19:35:58.775288');
INSERT INTO public.exchange_rates VALUES (883, 'USD', 'MMK', 2096.979900, '2025-10-31', false, '2025-11-07 19:35:58.895005', '2025-11-07 19:35:58.895005');
INSERT INTO public.exchange_rates VALUES (885, 'USD', 'MNT', 3615.694100, '2025-10-31', false, '2025-11-07 19:35:59.015292', '2025-11-07 19:35:59.015292');
INSERT INTO public.exchange_rates VALUES (887, 'USD', 'MOP', 8.008900, '2025-10-31', false, '2025-11-07 19:35:59.136631', '2025-11-07 19:35:59.136631');
INSERT INTO public.exchange_rates VALUES (889, 'USD', 'MRU', 39.837400, '2025-10-31', false, '2025-11-07 19:35:59.25844', '2025-11-07 19:35:59.25844');
INSERT INTO public.exchange_rates VALUES (891, 'USD', 'MUR', 45.961400, '2025-10-31', false, '2025-11-07 19:35:59.376632', '2025-11-07 19:35:59.376632');
INSERT INTO public.exchange_rates VALUES (893, 'USD', 'MVR', 15.431700, '2025-10-31', false, '2025-11-07 19:35:59.496356', '2025-11-07 19:35:59.496356');
INSERT INTO public.exchange_rates VALUES (895, 'USD', 'MWK', 1742.935300, '2025-10-31', false, '2025-11-07 19:35:59.615096', '2025-11-07 19:35:59.615096');
INSERT INTO public.exchange_rates VALUES (897, 'USD', 'MXN', 18.584000, '2025-10-31', false, '2025-11-07 19:35:59.732343', '2025-11-07 19:35:59.732343');
INSERT INTO public.exchange_rates VALUES (899, 'USD', 'MYR', 4.183700, '2025-10-31', false, '2025-11-07 19:35:59.851104', '2025-11-07 19:35:59.851104');
INSERT INTO public.exchange_rates VALUES (901, 'USD', 'MZN', 63.704400, '2025-10-31', false, '2025-11-07 19:35:59.970313', '2025-11-07 19:35:59.970313');
INSERT INTO public.exchange_rates VALUES (903, 'USD', 'NAD', 17.369700, '2025-10-31', false, '2025-11-07 19:36:00.089268', '2025-11-07 19:36:00.089268');
INSERT INTO public.exchange_rates VALUES (905, 'USD', 'NGN', 1436.828700, '2025-10-31', false, '2025-11-07 19:36:00.21229', '2025-11-07 19:36:00.21229');
INSERT INTO public.exchange_rates VALUES (906, 'USD', 'NIO', 36.756800, '2025-10-31', false, '2025-11-07 19:36:00.328759', '2025-11-07 19:36:00.328759');
INSERT INTO public.exchange_rates VALUES (908, 'USD', 'NOK', 10.195300, '2025-10-31', false, '2025-11-07 19:36:00.447374', '2025-11-07 19:36:00.447374');
INSERT INTO public.exchange_rates VALUES (911, 'USD', 'NPR', 141.884300, '2025-10-31', false, '2025-11-07 19:36:00.567801', '2025-11-07 19:36:00.567801');
INSERT INTO public.exchange_rates VALUES (912, 'USD', 'NZD', 1.772300, '2025-10-31', false, '2025-11-07 19:36:00.690722', '2025-11-07 19:36:00.690722');
INSERT INTO public.exchange_rates VALUES (914, 'USD', 'OMR', 0.384500, '2025-10-31', false, '2025-11-07 19:36:00.809042', '2025-11-07 19:36:00.809042');
INSERT INTO public.exchange_rates VALUES (916, 'USD', 'PAB', 1.000000, '2025-10-31', false, '2025-11-07 19:36:00.927282', '2025-11-07 19:36:00.927282');
INSERT INTO public.exchange_rates VALUES (919, 'USD', 'PEN', 3.374400, '2025-10-31', false, '2025-11-07 19:36:01.051317', '2025-11-07 19:36:01.051317');
INSERT INTO public.exchange_rates VALUES (921, 'USD', 'PGK', 4.264000, '2025-10-31', false, '2025-11-07 19:36:01.17144', '2025-11-07 19:36:01.17144');
INSERT INTO public.exchange_rates VALUES (922, 'USD', 'PHP', 58.928700, '2025-10-31', false, '2025-11-07 19:36:01.292938', '2025-11-07 19:36:01.292938');
INSERT INTO public.exchange_rates VALUES (713, 'USD', 'GEL', 2.707300, '2025-11-01', false, '2025-11-07 19:35:48.646688', '2025-11-07 19:35:48.646688');
INSERT INTO public.exchange_rates VALUES (715, 'USD', 'GGP', 0.762300, '2025-11-01', false, '2025-11-07 19:35:48.766814', '2025-11-07 19:35:48.766814');
INSERT INTO public.exchange_rates VALUES (717, 'USD', 'GHS', 11.119100, '2025-11-01', false, '2025-11-07 19:35:48.888542', '2025-11-07 19:35:48.888542');
INSERT INTO public.exchange_rates VALUES (719, 'USD', 'GIP', 0.762300, '2025-11-01', false, '2025-11-07 19:35:49.006552', '2025-11-07 19:35:49.006552');
INSERT INTO public.exchange_rates VALUES (721, 'USD', 'GMD', 73.394400, '2025-11-01', false, '2025-11-07 19:35:49.124926', '2025-11-07 19:35:49.124926');
INSERT INTO public.exchange_rates VALUES (723, 'USD', 'GNF', 8702.226400, '2025-11-01', false, '2025-11-07 19:35:49.243165', '2025-11-07 19:35:49.243165');
INSERT INTO public.exchange_rates VALUES (725, 'USD', 'GTQ', 7.657000, '2025-11-01', false, '2025-11-07 19:35:49.36233', '2025-11-07 19:35:49.36233');
INSERT INTO public.exchange_rates VALUES (727, 'USD', 'GYD', 209.196900, '2025-11-01', false, '2025-11-07 19:35:49.480195', '2025-11-07 19:35:49.480195');
INSERT INTO public.exchange_rates VALUES (729, 'USD', 'HKD', 7.774800, '2025-11-01', false, '2025-11-07 19:35:49.600315', '2025-11-07 19:35:49.600315');
INSERT INTO public.exchange_rates VALUES (731, 'USD', 'HNL', 26.290700, '2025-11-01', false, '2025-11-07 19:35:49.722316', '2025-11-07 19:35:49.722316');
INSERT INTO public.exchange_rates VALUES (733, 'USD', 'HRK', 6.530100, '2025-11-01', false, '2025-11-07 19:35:49.842029', '2025-11-07 19:35:49.842029');
INSERT INTO public.exchange_rates VALUES (735, 'USD', 'HTG', 130.930900, '2025-11-01', false, '2025-11-07 19:35:49.964337', '2025-11-07 19:35:49.964337');
INSERT INTO public.exchange_rates VALUES (737, 'USD', 'HUF', 334.597400, '2025-11-01', false, '2025-11-07 19:35:50.084387', '2025-11-07 19:35:50.084387');
INSERT INTO public.exchange_rates VALUES (739, 'USD', 'IDR', 16676.986400, '2025-11-01', false, '2025-11-07 19:35:50.202734', '2025-11-07 19:35:50.202734');
INSERT INTO public.exchange_rates VALUES (741, 'USD', 'ILS', 3.262200, '2025-11-01', false, '2025-11-07 19:35:50.323582', '2025-11-07 19:35:50.323582');
INSERT INTO public.exchange_rates VALUES (743, 'USD', 'IMP', 0.762300, '2025-11-01', false, '2025-11-07 19:35:50.443898', '2025-11-07 19:35:50.443898');
INSERT INTO public.exchange_rates VALUES (745, 'USD', 'INR', 88.676400, '2025-11-01', false, '2025-11-07 19:35:50.565892', '2025-11-07 19:35:50.565892');
INSERT INTO public.exchange_rates VALUES (747, 'USD', 'IQD', 1308.787100, '2025-11-01', false, '2025-11-07 19:35:50.687424', '2025-11-07 19:35:50.687424');
INSERT INTO public.exchange_rates VALUES (749, 'USD', 'IRR', 42415.872600, '2025-11-01', false, '2025-11-07 19:35:50.807056', '2025-11-07 19:35:50.807056');
INSERT INTO public.exchange_rates VALUES (751, 'USD', 'ISK', 126.864300, '2025-11-01', false, '2025-11-07 19:35:50.925688', '2025-11-07 19:35:50.925688');
INSERT INTO public.exchange_rates VALUES (753, 'USD', 'JEP', 0.762300, '2025-11-01', false, '2025-11-07 19:35:51.043725', '2025-11-07 19:35:51.043725');
INSERT INTO public.exchange_rates VALUES (755, 'USD', 'JMD', 160.626000, '2025-11-01', false, '2025-11-07 19:35:51.170171', '2025-11-07 19:35:51.170171');
INSERT INTO public.exchange_rates VALUES (757, 'USD', 'JOD', 0.709000, '2025-11-01', false, '2025-11-07 19:35:51.292128', '2025-11-07 19:35:51.292128');
INSERT INTO public.exchange_rates VALUES (759, 'USD', 'JPY', 153.228200, '2025-11-01', false, '2025-11-07 19:35:51.410449', '2025-11-07 19:35:51.410449');
INSERT INTO public.exchange_rates VALUES (761, 'USD', 'KES', 129.091600, '2025-11-01', false, '2025-11-07 19:35:51.531478', '2025-11-07 19:35:51.531478');
INSERT INTO public.exchange_rates VALUES (763, 'USD', 'KGS', 87.410400, '2025-11-01', false, '2025-11-07 19:35:51.656594', '2025-11-07 19:35:51.656594');
INSERT INTO public.exchange_rates VALUES (765, 'USD', 'KHR', 4020.710100, '2025-11-01', false, '2025-11-07 19:35:51.777307', '2025-11-07 19:35:51.777307');
INSERT INTO public.exchange_rates VALUES (767, 'USD', 'KID', 1.540500, '2025-11-01', false, '2025-11-07 19:35:51.896254', '2025-11-07 19:35:51.896254');
INSERT INTO public.exchange_rates VALUES (769, 'USD', 'KMF', 426.383300, '2025-11-01', false, '2025-11-07 19:35:52.018023', '2025-11-07 19:35:52.018023');
INSERT INTO public.exchange_rates VALUES (771, 'USD', 'KRW', 1446.483600, '2025-11-01', false, '2025-11-07 19:35:52.138051', '2025-11-07 19:35:52.138051');
INSERT INTO public.exchange_rates VALUES (773, 'USD', 'KWD', 0.306900, '2025-11-01', false, '2025-11-07 19:35:52.254744', '2025-11-07 19:35:52.254744');
INSERT INTO public.exchange_rates VALUES (775, 'USD', 'KYD', 0.833300, '2025-11-01', false, '2025-11-07 19:35:52.374008', '2025-11-07 19:35:52.374008');
INSERT INTO public.exchange_rates VALUES (777, 'USD', 'KZT', 525.842600, '2025-11-01', false, '2025-11-07 19:35:52.496946', '2025-11-07 19:35:52.496946');
INSERT INTO public.exchange_rates VALUES (779, 'USD', 'LAK', 21712.907200, '2025-11-01', false, '2025-11-07 19:35:52.615548', '2025-11-07 19:35:52.615548');
INSERT INTO public.exchange_rates VALUES (781, 'USD', 'LBP', 89500.000000, '2025-11-01', false, '2025-11-07 19:35:52.734189', '2025-11-07 19:35:52.734189');
INSERT INTO public.exchange_rates VALUES (783, 'USD', 'LKR', 304.522400, '2025-11-01', false, '2025-11-07 19:35:52.851318', '2025-11-07 19:35:52.851318');
INSERT INTO public.exchange_rates VALUES (785, 'USD', 'LRD', 182.840100, '2025-11-01', false, '2025-11-07 19:35:52.970994', '2025-11-07 19:35:52.970994');
INSERT INTO public.exchange_rates VALUES (787, 'USD', 'LSL', 17.369700, '2025-11-01', false, '2025-11-07 19:35:53.089187', '2025-11-07 19:35:53.089187');
INSERT INTO public.exchange_rates VALUES (789, 'USD', 'LYD', 5.467800, '2025-11-01', false, '2025-11-07 19:35:53.207658', '2025-11-07 19:35:53.207658');
INSERT INTO public.exchange_rates VALUES (791, 'USD', 'MAD', 9.286200, '2025-11-01', false, '2025-11-07 19:35:53.328251', '2025-11-07 19:35:53.328251');
INSERT INTO public.exchange_rates VALUES (793, 'USD', 'MDL', 17.095600, '2025-11-01', false, '2025-11-07 19:35:53.458513', '2025-11-07 19:35:53.458513');
INSERT INTO public.exchange_rates VALUES (795, 'USD', 'MGA', 4504.179600, '2025-11-01', false, '2025-11-07 19:35:53.579856', '2025-11-07 19:35:53.579856');
INSERT INTO public.exchange_rates VALUES (797, 'USD', 'MKD', 53.563600, '2025-11-01', false, '2025-11-07 19:35:53.699242', '2025-11-07 19:35:53.699242');
INSERT INTO public.exchange_rates VALUES (799, 'USD', 'MMK', 2096.979900, '2025-11-01', false, '2025-11-07 19:35:53.818673', '2025-11-07 19:35:53.818673');
INSERT INTO public.exchange_rates VALUES (801, 'USD', 'MNT', 3615.694100, '2025-11-01', false, '2025-11-07 19:35:53.943164', '2025-11-07 19:35:53.943164');
INSERT INTO public.exchange_rates VALUES (803, 'USD', 'MOP', 8.008900, '2025-11-01', false, '2025-11-07 19:35:54.067149', '2025-11-07 19:35:54.067149');
INSERT INTO public.exchange_rates VALUES (805, 'USD', 'MRU', 39.837400, '2025-11-01', false, '2025-11-07 19:35:54.189393', '2025-11-07 19:35:54.189393');
INSERT INTO public.exchange_rates VALUES (807, 'USD', 'MUR', 45.961400, '2025-11-01', false, '2025-11-07 19:35:54.308838', '2025-11-07 19:35:54.308838');
INSERT INTO public.exchange_rates VALUES (809, 'USD', 'MVR', 15.431700, '2025-11-01', false, '2025-11-07 19:35:54.429195', '2025-11-07 19:35:54.429195');
INSERT INTO public.exchange_rates VALUES (812, 'USD', 'MWK', 1742.935300, '2025-11-01', false, '2025-11-07 19:35:54.649671', '2025-11-07 19:35:54.649671');
INSERT INTO public.exchange_rates VALUES (814, 'USD', 'MXN', 18.584000, '2025-11-01', false, '2025-11-07 19:35:54.769482', '2025-11-07 19:35:54.769482');
INSERT INTO public.exchange_rates VALUES (816, 'USD', 'MYR', 4.183700, '2025-11-01', false, '2025-11-07 19:35:54.888571', '2025-11-07 19:35:54.888571');
INSERT INTO public.exchange_rates VALUES (818, 'USD', 'MZN', 63.704400, '2025-11-01', false, '2025-11-07 19:35:55.007562', '2025-11-07 19:35:55.007562');
INSERT INTO public.exchange_rates VALUES (820, 'USD', 'NAD', 17.369700, '2025-11-01', false, '2025-11-07 19:35:55.13563', '2025-11-07 19:35:55.13563');
INSERT INTO public.exchange_rates VALUES (822, 'USD', 'NGN', 1436.828700, '2025-11-01', false, '2025-11-07 19:35:55.255433', '2025-11-07 19:35:55.255433');
INSERT INTO public.exchange_rates VALUES (824, 'USD', 'NIO', 36.756800, '2025-11-01', false, '2025-11-07 19:35:55.373682', '2025-11-07 19:35:55.373682');
INSERT INTO public.exchange_rates VALUES (826, 'USD', 'NOK', 10.195300, '2025-11-01', false, '2025-11-07 19:35:55.492543', '2025-11-07 19:35:55.492543');
INSERT INTO public.exchange_rates VALUES (828, 'USD', 'NPR', 141.884300, '2025-11-01', false, '2025-11-07 19:35:55.609583', '2025-11-07 19:35:55.609583');
INSERT INTO public.exchange_rates VALUES (830, 'USD', 'NZD', 1.772300, '2025-11-01', false, '2025-11-07 19:35:55.728862', '2025-11-07 19:35:55.728862');
INSERT INTO public.exchange_rates VALUES (832, 'USD', 'OMR', 0.384500, '2025-11-01', false, '2025-11-07 19:35:55.847975', '2025-11-07 19:35:55.847975');
INSERT INTO public.exchange_rates VALUES (834, 'USD', 'PAB', 1.000000, '2025-11-01', false, '2025-11-07 19:35:55.972563', '2025-11-07 19:35:55.972563');
INSERT INTO public.exchange_rates VALUES (836, 'USD', 'PEN', 3.374400, '2025-11-01', false, '2025-11-07 19:35:56.091439', '2025-11-07 19:35:56.091439');
INSERT INTO public.exchange_rates VALUES (838, 'USD', 'PGK', 4.264000, '2025-11-01', false, '2025-11-07 19:35:56.209842', '2025-11-07 19:35:56.209842');
INSERT INTO public.exchange_rates VALUES (840, 'USD', 'PHP', 58.928700, '2025-11-01', false, '2025-11-07 19:35:56.327972', '2025-11-07 19:35:56.327972');
INSERT INTO public.exchange_rates VALUES (842, 'USD', 'PKR', 282.680400, '2025-11-01', false, '2025-11-07 19:35:56.44651', '2025-11-07 19:35:56.44651');
INSERT INTO public.exchange_rates VALUES (844, 'USD', 'PLN', 3.684700, '2025-11-01', false, '2025-11-07 19:35:56.566887', '2025-11-07 19:35:56.566887');
INSERT INTO public.exchange_rates VALUES (846, 'USD', 'PYG', 7085.457700, '2025-11-01', false, '2025-11-07 19:35:56.685198', '2025-11-07 19:35:56.685198');
INSERT INTO public.exchange_rates VALUES (848, 'USD', 'QAR', 3.640000, '2025-11-01', false, '2025-11-07 19:35:56.80261', '2025-11-07 19:35:56.80261');
INSERT INTO public.exchange_rates VALUES (850, 'USD', 'RON', 4.411100, '2025-11-01', false, '2025-11-07 19:35:56.920764', '2025-11-07 19:35:56.920764');
INSERT INTO public.exchange_rates VALUES (852, 'USD', 'RSD', 101.698500, '2025-11-01', false, '2025-11-07 19:35:57.039045', '2025-11-07 19:35:57.039045');
INSERT INTO public.exchange_rates VALUES (854, 'USD', 'RUB', 81.235600, '2025-11-01', false, '2025-11-07 19:35:57.157997', '2025-11-07 19:35:57.157997');
INSERT INTO public.exchange_rates VALUES (856, 'USD', 'RWF', 1456.861000, '2025-11-01', false, '2025-11-07 19:35:57.275911', '2025-11-07 19:35:57.275911');
INSERT INTO public.exchange_rates VALUES (858, 'USD', 'SAR', 3.750000, '2025-11-01', false, '2025-11-07 19:35:57.397085', '2025-11-07 19:35:57.397085');
INSERT INTO public.exchange_rates VALUES (860, 'USD', 'SBD', 8.231900, '2025-11-01', false, '2025-11-07 19:35:57.5269', '2025-11-07 19:35:57.5269');
INSERT INTO public.exchange_rates VALUES (862, 'USD', 'SCR', 13.856900, '2025-11-01', false, '2025-11-07 19:35:57.649318', '2025-11-07 19:35:57.649318');
INSERT INTO public.exchange_rates VALUES (864, 'USD', 'SDG', 511.761200, '2025-11-01', false, '2025-11-07 19:35:57.773569', '2025-11-07 19:35:57.773569');
INSERT INTO public.exchange_rates VALUES (866, 'USD', 'SEK', 9.565600, '2025-11-01', false, '2025-11-07 19:35:57.892106', '2025-11-07 19:35:57.892106');
INSERT INTO public.exchange_rates VALUES (868, 'USD', 'SGD', 1.304300, '2025-11-01', false, '2025-11-07 19:35:58.016112', '2025-11-07 19:35:58.016112');
INSERT INTO public.exchange_rates VALUES (870, 'USD', 'SHP', 0.762300, '2025-11-01', false, '2025-11-07 19:35:58.138529', '2025-11-07 19:35:58.138529');
INSERT INTO public.exchange_rates VALUES (872, 'USD', 'SLE', 23.199400, '2025-11-01', false, '2025-11-07 19:35:58.259494', '2025-11-07 19:35:58.259494');
INSERT INTO public.exchange_rates VALUES (874, 'USD', 'SLL', 23199.379500, '2025-11-01', false, '2025-11-07 19:35:58.378347', '2025-11-07 19:35:58.378347');
INSERT INTO public.exchange_rates VALUES (876, 'USD', 'SOS', 571.816600, '2025-11-01', false, '2025-11-07 19:35:58.496795', '2025-11-07 19:35:58.496795');
INSERT INTO public.exchange_rates VALUES (878, 'USD', 'SRD', 39.082800, '2025-11-01', false, '2025-11-07 19:35:58.613736', '2025-11-07 19:35:58.613736');
INSERT INTO public.exchange_rates VALUES (880, 'USD', 'SSP', 4682.456100, '2025-11-01', false, '2025-11-07 19:35:58.731624', '2025-11-07 19:35:58.731624');
INSERT INTO public.exchange_rates VALUES (882, 'USD', 'STN', 21.233900, '2025-11-01', false, '2025-11-07 19:35:58.851252', '2025-11-07 19:35:58.851252');
INSERT INTO public.exchange_rates VALUES (884, 'USD', 'SYP', 11013.358400, '2025-11-01', false, '2025-11-07 19:35:58.975543', '2025-11-07 19:35:58.975543');
INSERT INTO public.exchange_rates VALUES (886, 'USD', 'SZL', 17.369700, '2025-11-01', false, '2025-11-07 19:35:59.098748', '2025-11-07 19:35:59.098748');
INSERT INTO public.exchange_rates VALUES (888, 'USD', 'THB', 32.396000, '2025-11-01', false, '2025-11-07 19:35:59.218362', '2025-11-07 19:35:59.218362');
INSERT INTO public.exchange_rates VALUES (890, 'USD', 'TJS', 9.281200, '2025-11-01', false, '2025-11-07 19:35:59.33759', '2025-11-07 19:35:59.33759');
INSERT INTO public.exchange_rates VALUES (892, 'USD', 'TMT', 3.499700, '2025-11-01', false, '2025-11-07 19:35:59.454399', '2025-11-07 19:35:59.454399');
INSERT INTO public.exchange_rates VALUES (894, 'USD', 'TND', 2.951400, '2025-11-01', false, '2025-11-07 19:35:59.574674', '2025-11-07 19:35:59.574674');
INSERT INTO public.exchange_rates VALUES (896, 'USD', 'TOP', 2.367700, '2025-11-01', false, '2025-11-07 19:35:59.694559', '2025-11-07 19:35:59.694559');
INSERT INTO public.exchange_rates VALUES (898, 'USD', 'TRY', 42.183400, '2025-11-01', false, '2025-11-07 19:35:59.826615', '2025-11-07 19:35:59.826615');
INSERT INTO public.exchange_rates VALUES (900, 'USD', 'TTD', 6.754300, '2025-11-01', false, '2025-11-07 19:35:59.946165', '2025-11-07 19:35:59.946165');
INSERT INTO public.exchange_rates VALUES (902, 'USD', 'TVD', 1.540500, '2025-11-01', false, '2025-11-07 19:36:00.069688', '2025-11-07 19:36:00.069688');
INSERT INTO public.exchange_rates VALUES (904, 'USD', 'TWD', 30.941000, '2025-11-01', false, '2025-11-07 19:36:00.206732', '2025-11-07 19:36:00.206732');
INSERT INTO public.exchange_rates VALUES (907, 'USD', 'TZS', 2455.251100, '2025-11-01', false, '2025-11-07 19:36:00.32942', '2025-11-07 19:36:00.32942');
INSERT INTO public.exchange_rates VALUES (909, 'USD', 'UAH', 42.054700, '2025-11-01', false, '2025-11-07 19:36:00.448489', '2025-11-07 19:36:00.448489');
INSERT INTO public.exchange_rates VALUES (910, 'USD', 'UGX', 3468.030000, '2025-11-01', false, '2025-11-07 19:36:00.567346', '2025-11-07 19:36:00.567346');
INSERT INTO public.exchange_rates VALUES (913, 'USD', 'UYU', 39.782400, '2025-11-01', false, '2025-11-07 19:36:00.695115', '2025-11-07 19:36:00.695115');
INSERT INTO public.exchange_rates VALUES (915, 'USD', 'UZS', 11954.293400, '2025-11-01', false, '2025-11-07 19:36:00.81396', '2025-11-07 19:36:00.81396');
INSERT INTO public.exchange_rates VALUES (917, 'USD', 'VES', 228.479600, '2025-11-01', false, '2025-11-07 19:36:00.931106', '2025-11-07 19:36:00.931106');
INSERT INTO public.exchange_rates VALUES (918, 'USD', 'VND', 26163.170700, '2025-11-01', false, '2025-11-07 19:36:01.048661', '2025-11-07 19:36:01.048661');
INSERT INTO public.exchange_rates VALUES (920, 'USD', 'VUV', 121.287800, '2025-11-01', false, '2025-11-07 19:36:01.171084', '2025-11-07 19:36:01.171084');
INSERT INTO public.exchange_rates VALUES (923, 'USD', 'WST', 2.787900, '2025-11-01', false, '2025-11-07 19:36:01.294662', '2025-11-07 19:36:01.294662');
INSERT INTO public.exchange_rates VALUES (925, 'USD', 'XAF', 568.511100, '2025-11-01', false, '2025-11-07 19:36:01.412205', '2025-11-07 19:36:01.412205');
INSERT INTO public.exchange_rates VALUES (927, 'USD', 'XCD', 2.700000, '2025-11-01', false, '2025-11-07 19:36:01.54013', '2025-11-07 19:36:01.54013');
INSERT INTO public.exchange_rates VALUES (924, 'USD', 'PKR', 282.680400, '2025-10-31', false, '2025-11-07 19:36:01.41125', '2025-11-07 19:36:01.41125');
INSERT INTO public.exchange_rates VALUES (926, 'USD', 'PLN', 3.684700, '2025-10-31', false, '2025-11-07 19:36:01.538079', '2025-11-07 19:36:01.538079');
INSERT INTO public.exchange_rates VALUES (928, 'USD', 'PYG', 7085.457700, '2025-10-31', false, '2025-11-07 19:36:01.669805', '2025-11-07 19:36:01.669805');
INSERT INTO public.exchange_rates VALUES (930, 'USD', 'QAR', 3.640000, '2025-10-31', false, '2025-11-07 19:36:01.789858', '2025-11-07 19:36:01.789858');
INSERT INTO public.exchange_rates VALUES (932, 'USD', 'RON', 4.411100, '2025-10-31', false, '2025-11-07 19:36:01.91276', '2025-11-07 19:36:01.91276');
INSERT INTO public.exchange_rates VALUES (934, 'USD', 'RSD', 101.698500, '2025-10-31', false, '2025-11-07 19:36:02.031796', '2025-11-07 19:36:02.031796');
INSERT INTO public.exchange_rates VALUES (936, 'USD', 'RUB', 81.235600, '2025-10-31', false, '2025-11-07 19:36:02.152508', '2025-11-07 19:36:02.152508');
INSERT INTO public.exchange_rates VALUES (938, 'USD', 'RWF', 1456.861000, '2025-10-31', false, '2025-11-07 19:36:02.27324', '2025-11-07 19:36:02.27324');
INSERT INTO public.exchange_rates VALUES (940, 'USD', 'SAR', 3.750000, '2025-10-31', false, '2025-11-07 19:36:02.392917', '2025-11-07 19:36:02.392917');
INSERT INTO public.exchange_rates VALUES (942, 'USD', 'SBD', 8.231900, '2025-10-31', false, '2025-11-07 19:36:02.525659', '2025-11-07 19:36:02.525659');
INSERT INTO public.exchange_rates VALUES (944, 'USD', 'SCR', 13.856900, '2025-10-31', false, '2025-11-07 19:36:02.651683', '2025-11-07 19:36:02.651683');
INSERT INTO public.exchange_rates VALUES (945, 'USD', 'SDG', 511.761200, '2025-10-31', false, '2025-11-07 19:36:02.770383', '2025-11-07 19:36:02.770383');
INSERT INTO public.exchange_rates VALUES (946, 'USD', 'SEK', 9.565600, '2025-10-31', false, '2025-11-07 19:36:02.889154', '2025-11-07 19:36:02.889154');
INSERT INTO public.exchange_rates VALUES (947, 'USD', 'SGD', 1.304300, '2025-10-31', false, '2025-11-07 19:36:03.009363', '2025-11-07 19:36:03.009363');
INSERT INTO public.exchange_rates VALUES (948, 'USD', 'SHP', 0.762300, '2025-10-31', false, '2025-11-07 19:36:03.128061', '2025-11-07 19:36:03.128061');
INSERT INTO public.exchange_rates VALUES (949, 'USD', 'SLE', 23.199400, '2025-10-31', false, '2025-11-07 19:36:03.24985', '2025-11-07 19:36:03.24985');
INSERT INTO public.exchange_rates VALUES (950, 'USD', 'SLL', 23199.379500, '2025-10-31', false, '2025-11-07 19:36:03.36887', '2025-11-07 19:36:03.36887');
INSERT INTO public.exchange_rates VALUES (951, 'USD', 'SOS', 571.816600, '2025-10-31', false, '2025-11-07 19:36:03.487575', '2025-11-07 19:36:03.487575');
INSERT INTO public.exchange_rates VALUES (952, 'USD', 'SRD', 39.082800, '2025-10-31', false, '2025-11-07 19:36:03.606', '2025-11-07 19:36:03.606');
INSERT INTO public.exchange_rates VALUES (953, 'USD', 'SSP', 4682.456100, '2025-10-31', false, '2025-11-07 19:36:03.725113', '2025-11-07 19:36:03.725113');
INSERT INTO public.exchange_rates VALUES (954, 'USD', 'STN', 21.233900, '2025-10-31', false, '2025-11-07 19:36:03.848338', '2025-11-07 19:36:03.848338');
INSERT INTO public.exchange_rates VALUES (955, 'USD', 'SYP', 11013.358400, '2025-10-31', false, '2025-11-07 19:36:03.966603', '2025-11-07 19:36:03.966603');
INSERT INTO public.exchange_rates VALUES (956, 'USD', 'SZL', 17.369700, '2025-10-31', false, '2025-11-07 19:36:04.086368', '2025-11-07 19:36:04.086368');
INSERT INTO public.exchange_rates VALUES (957, 'USD', 'THB', 32.396000, '2025-10-31', false, '2025-11-07 19:36:04.206431', '2025-11-07 19:36:04.206431');
INSERT INTO public.exchange_rates VALUES (958, 'USD', 'TJS', 9.281200, '2025-10-31', false, '2025-11-07 19:36:04.325361', '2025-11-07 19:36:04.325361');
INSERT INTO public.exchange_rates VALUES (959, 'USD', 'TMT', 3.499700, '2025-10-31', false, '2025-11-07 19:36:04.444921', '2025-11-07 19:36:04.444921');
INSERT INTO public.exchange_rates VALUES (960, 'USD', 'TND', 2.951400, '2025-10-31', false, '2025-11-07 19:36:04.573379', '2025-11-07 19:36:04.573379');
INSERT INTO public.exchange_rates VALUES (961, 'USD', 'TOP', 2.367700, '2025-10-31', false, '2025-11-07 19:36:04.691663', '2025-11-07 19:36:04.691663');
INSERT INTO public.exchange_rates VALUES (962, 'USD', 'TRY', 42.183400, '2025-10-31', false, '2025-11-07 19:36:04.809166', '2025-11-07 19:36:04.809166');
INSERT INTO public.exchange_rates VALUES (963, 'USD', 'TTD', 6.754300, '2025-10-31', false, '2025-11-07 19:36:04.930976', '2025-11-07 19:36:04.930976');
INSERT INTO public.exchange_rates VALUES (964, 'USD', 'TVD', 1.540500, '2025-10-31', false, '2025-11-07 19:36:05.049609', '2025-11-07 19:36:05.049609');
INSERT INTO public.exchange_rates VALUES (965, 'USD', 'TWD', 30.941000, '2025-10-31', false, '2025-11-07 19:36:05.185297', '2025-11-07 19:36:05.185297');
INSERT INTO public.exchange_rates VALUES (966, 'USD', 'TZS', 2455.251100, '2025-10-31', false, '2025-11-07 19:36:05.418482', '2025-11-07 19:36:05.418482');
INSERT INTO public.exchange_rates VALUES (967, 'USD', 'UAH', 42.054700, '2025-10-31', false, '2025-11-07 19:36:05.537393', '2025-11-07 19:36:05.537393');
INSERT INTO public.exchange_rates VALUES (968, 'USD', 'UGX', 3468.030000, '2025-10-31', false, '2025-11-07 19:36:05.65624', '2025-11-07 19:36:05.65624');
INSERT INTO public.exchange_rates VALUES (969, 'USD', 'UYU', 39.782400, '2025-10-31', false, '2025-11-07 19:36:05.776257', '2025-11-07 19:36:05.776257');
INSERT INTO public.exchange_rates VALUES (970, 'USD', 'UZS', 11954.293400, '2025-10-31', false, '2025-11-07 19:36:05.894723', '2025-11-07 19:36:05.894723');
INSERT INTO public.exchange_rates VALUES (971, 'USD', 'VES', 228.479600, '2025-10-31', false, '2025-11-07 19:36:06.019062', '2025-11-07 19:36:06.019062');
INSERT INTO public.exchange_rates VALUES (972, 'USD', 'VND', 26163.170700, '2025-10-31', false, '2025-11-07 19:36:06.139189', '2025-11-07 19:36:06.139189');
INSERT INTO public.exchange_rates VALUES (973, 'USD', 'VUV', 121.287800, '2025-10-31', false, '2025-11-07 19:36:06.260359', '2025-11-07 19:36:06.260359');
INSERT INTO public.exchange_rates VALUES (974, 'USD', 'WST', 2.787900, '2025-10-31', false, '2025-11-07 19:36:06.379472', '2025-11-07 19:36:06.379472');
INSERT INTO public.exchange_rates VALUES (975, 'USD', 'XAF', 568.511100, '2025-10-31', false, '2025-11-07 19:36:06.498258', '2025-11-07 19:36:06.498258');
INSERT INTO public.exchange_rates VALUES (976, 'USD', 'XCD', 2.700000, '2025-10-31', false, '2025-11-07 19:36:06.617929', '2025-11-07 19:36:06.617929');
INSERT INTO public.exchange_rates VALUES (977, 'USD', 'XCG', 1.790000, '2025-10-31', false, '2025-11-07 19:36:06.738046', '2025-11-07 19:36:06.738046');
INSERT INTO public.exchange_rates VALUES (978, 'USD', 'XDR', 0.738500, '2025-10-31', false, '2025-11-07 19:36:06.856604', '2025-11-07 19:36:06.856604');
INSERT INTO public.exchange_rates VALUES (979, 'USD', 'XOF', 568.511100, '2025-10-31', false, '2025-11-07 19:36:06.975138', '2025-11-07 19:36:06.975138');
INSERT INTO public.exchange_rates VALUES (980, 'USD', 'XPF', 103.423800, '2025-10-31', false, '2025-11-07 19:36:07.094707', '2025-11-07 19:36:07.094707');
INSERT INTO public.exchange_rates VALUES (981, 'USD', 'YER', 238.709600, '2025-10-31', false, '2025-11-07 19:36:07.213626', '2025-11-07 19:36:07.213626');
INSERT INTO public.exchange_rates VALUES (982, 'USD', 'ZAR', 17.372700, '2025-10-31', false, '2025-11-07 19:36:07.332513', '2025-11-07 19:36:07.332513');
INSERT INTO public.exchange_rates VALUES (983, 'USD', 'ZMW', 22.548800, '2025-10-31', false, '2025-11-07 19:36:07.45324', '2025-11-07 19:36:07.45324');
INSERT INTO public.exchange_rates VALUES (984, 'USD', 'ZWL', 26.381300, '2025-10-31', false, '2025-11-07 19:36:07.57465', '2025-11-07 19:36:07.57465');
INSERT INTO public.exchange_rates VALUES (929, 'USD', 'XCG', 1.790000, '2025-11-01', false, '2025-11-07 19:36:01.670171', '2025-11-07 19:36:01.670171');
INSERT INTO public.exchange_rates VALUES (931, 'USD', 'XDR', 0.738500, '2025-11-01', false, '2025-11-07 19:36:01.790208', '2025-11-07 19:36:01.790208');
INSERT INTO public.exchange_rates VALUES (933, 'USD', 'XOF', 568.511100, '2025-11-01', false, '2025-11-07 19:36:01.915569', '2025-11-07 19:36:01.915569');
INSERT INTO public.exchange_rates VALUES (935, 'USD', 'XPF', 103.423800, '2025-11-01', false, '2025-11-07 19:36:02.036216', '2025-11-07 19:36:02.036216');
INSERT INTO public.exchange_rates VALUES (937, 'USD', 'YER', 238.709600, '2025-11-01', false, '2025-11-07 19:36:02.185402', '2025-11-07 19:36:02.185402');
INSERT INTO public.exchange_rates VALUES (939, 'USD', 'ZAR', 17.372700, '2025-11-01', false, '2025-11-07 19:36:02.32997', '2025-11-07 19:36:02.32997');
INSERT INTO public.exchange_rates VALUES (941, 'USD', 'ZMW', 22.548800, '2025-11-01', false, '2025-11-07 19:36:02.449356', '2025-11-07 19:36:02.449356');
INSERT INTO public.exchange_rates VALUES (943, 'USD', 'ZWL', 26.381300, '2025-11-01', false, '2025-11-07 19:36:02.599309', '2025-11-07 19:36:02.599309');
INSERT INTO public.exchange_rates VALUES (985, 'EUR', 'AED', 4.253400, '2025-11-19', false, '2025-11-19 20:46:29.258119', '2025-11-19 20:46:29.258119');
INSERT INTO public.exchange_rates VALUES (986, 'EUR', 'AFN', 76.940800, '2025-11-19', false, '2025-11-19 20:46:29.416438', '2025-11-19 20:46:29.416438');
INSERT INTO public.exchange_rates VALUES (987, 'EUR', 'ALL', 96.643900, '2025-11-19', false, '2025-11-19 20:46:29.551465', '2025-11-19 20:46:29.551465');
INSERT INTO public.exchange_rates VALUES (988, 'EUR', 'AMD', 442.426700, '2025-11-19', false, '2025-11-19 20:46:29.668687', '2025-11-19 20:46:29.668687');
INSERT INTO public.exchange_rates VALUES (989, 'EUR', 'ANG', 2.073200, '2025-11-19', false, '2025-11-19 20:46:29.80536', '2025-11-19 20:46:29.80536');
INSERT INTO public.exchange_rates VALUES (990, 'EUR', 'AOA', 1088.926300, '2025-11-19', false, '2025-11-19 20:46:29.934967', '2025-11-19 20:46:29.934967');
INSERT INTO public.exchange_rates VALUES (991, 'EUR', 'ARS', 1607.563800, '2025-11-19', false, '2025-11-19 20:46:30.063139', '2025-11-19 20:46:30.063139');
INSERT INTO public.exchange_rates VALUES (992, 'EUR', 'AUD', 1.781400, '2025-11-19', false, '2025-11-19 20:46:30.200603', '2025-11-19 20:46:30.200603');
INSERT INTO public.exchange_rates VALUES (993, 'EUR', 'AWG', 2.073200, '2025-11-19', false, '2025-11-19 20:46:30.32235', '2025-11-19 20:46:30.32235');
INSERT INTO public.exchange_rates VALUES (994, 'EUR', 'AZN', 1.970700, '2025-11-19', false, '2025-11-19 20:46:30.453014', '2025-11-19 20:46:30.453014');
INSERT INTO public.exchange_rates VALUES (995, 'EUR', 'BAM', 1.955800, '2025-11-19', false, '2025-11-19 20:46:30.586059', '2025-11-19 20:46:30.586059');
INSERT INTO public.exchange_rates VALUES (996, 'EUR', 'BBD', 2.316400, '2025-11-19', false, '2025-11-19 20:46:30.706421', '2025-11-19 20:46:30.706421');
INSERT INTO public.exchange_rates VALUES (997, 'EUR', 'BDT', 141.701100, '2025-11-19', false, '2025-11-19 20:46:30.823599', '2025-11-19 20:46:30.823599');
INSERT INTO public.exchange_rates VALUES (998, 'EUR', 'BGN', 1.955800, '2025-11-19', false, '2025-11-19 20:46:30.941188', '2025-11-19 20:46:30.941188');
INSERT INTO public.exchange_rates VALUES (999, 'EUR', 'BHD', 0.435500, '2025-11-19', false, '2025-11-19 20:46:31.070046', '2025-11-19 20:46:31.070046');
INSERT INTO public.exchange_rates VALUES (1000, 'EUR', 'BIF', 3419.056300, '2025-11-19', false, '2025-11-19 20:46:31.188683', '2025-11-19 20:46:31.188683');
INSERT INTO public.exchange_rates VALUES (1001, 'EUR', 'BMD', 1.158200, '2025-11-19', false, '2025-11-19 20:46:31.318889', '2025-11-19 20:46:31.318889');
INSERT INTO public.exchange_rates VALUES (1002, 'EUR', 'BND', 1.508500, '2025-11-19', false, '2025-11-19 20:46:31.437674', '2025-11-19 20:46:31.437674');
INSERT INTO public.exchange_rates VALUES (1003, 'EUR', 'BOB', 8.039600, '2025-11-19', false, '2025-11-19 20:46:31.562416', '2025-11-19 20:46:31.562416');
INSERT INTO public.exchange_rates VALUES (1004, 'EUR', 'BRL', 6.169700, '2025-11-19', false, '2025-11-19 20:46:31.684076', '2025-11-19 20:46:31.684076');
INSERT INTO public.exchange_rates VALUES (1005, 'EUR', 'BSD', 1.158200, '2025-11-19', false, '2025-11-19 20:46:31.813281', '2025-11-19 20:46:31.813281');
INSERT INTO public.exchange_rates VALUES (1006, 'EUR', 'BTN', 102.621900, '2025-11-19', false, '2025-11-19 20:46:31.931816', '2025-11-19 20:46:31.931816');
INSERT INTO public.exchange_rates VALUES (1007, 'EUR', 'BWP', 16.381800, '2025-11-19', false, '2025-11-19 20:46:32.055081', '2025-11-19 20:46:32.055081');
INSERT INTO public.exchange_rates VALUES (1008, 'EUR', 'BYN', 3.741900, '2025-11-19', false, '2025-11-19 20:46:32.179617', '2025-11-19 20:46:32.179617');
INSERT INTO public.exchange_rates VALUES (1009, 'EUR', 'BZD', 2.316400, '2025-11-19', false, '2025-11-19 20:46:32.301515', '2025-11-19 20:46:32.301515');
INSERT INTO public.exchange_rates VALUES (1010, 'EUR', 'CAD', 1.621400, '2025-11-19', false, '2025-11-19 20:46:32.427836', '2025-11-19 20:46:32.427836');
INSERT INTO public.exchange_rates VALUES (1011, 'EUR', 'CDF', 2552.107900, '2025-11-19', false, '2025-11-19 20:46:32.567174', '2025-11-19 20:46:32.567174');
INSERT INTO public.exchange_rates VALUES (1012, 'EUR', 'CHF', 0.925600, '2025-11-19', false, '2025-11-19 20:46:32.690463', '2025-11-19 20:46:32.690463');
INSERT INTO public.exchange_rates VALUES (1013, 'EUR', 'CLF', 0.027120, '2025-11-19', false, '2025-11-19 20:46:32.811161', '2025-11-19 20:46:32.811161');
INSERT INTO public.exchange_rates VALUES (1014, 'EUR', 'CLP', 1072.093700, '2025-11-19', false, '2025-11-19 20:46:32.931972', '2025-11-19 20:46:32.931972');
INSERT INTO public.exchange_rates VALUES (1015, 'EUR', 'CNH', 8.238500, '2025-11-19', false, '2025-11-19 20:46:33.050474', '2025-11-19 20:46:33.050474');
INSERT INTO public.exchange_rates VALUES (1016, 'EUR', 'CNY', 8.239100, '2025-11-19', false, '2025-11-19 20:46:33.169397', '2025-11-19 20:46:33.169397');
INSERT INTO public.exchange_rates VALUES (1017, 'EUR', 'COP', 4364.029900, '2025-11-19', false, '2025-11-19 20:46:33.288135', '2025-11-19 20:46:33.288135');
INSERT INTO public.exchange_rates VALUES (1018, 'EUR', 'CRC', 580.113400, '2025-11-19', false, '2025-11-19 20:46:33.408917', '2025-11-19 20:46:33.408917');
INSERT INTO public.exchange_rates VALUES (1019, 'EUR', 'CUP', 27.796500, '2025-11-19', false, '2025-11-19 20:46:33.526979', '2025-11-19 20:46:33.526979');
INSERT INTO public.exchange_rates VALUES (1020, 'EUR', 'CVE', 110.265000, '2025-11-19', false, '2025-11-19 20:46:33.64609', '2025-11-19 20:46:33.64609');
INSERT INTO public.exchange_rates VALUES (1021, 'EUR', 'CZK', 24.180700, '2025-11-19', false, '2025-11-19 20:46:33.764517', '2025-11-19 20:46:33.764517');
INSERT INTO public.exchange_rates VALUES (1022, 'EUR', 'DJF', 205.834200, '2025-11-19', false, '2025-11-19 20:46:33.883162', '2025-11-19 20:46:33.883162');
INSERT INTO public.exchange_rates VALUES (1023, 'EUR', 'DKK', 7.462500, '2025-11-19', false, '2025-11-19 20:46:34.002669', '2025-11-19 20:46:34.002669');
INSERT INTO public.exchange_rates VALUES (1024, 'EUR', 'DOP', 74.385400, '2025-11-19', false, '2025-11-19 20:46:34.125504', '2025-11-19 20:46:34.125504');
INSERT INTO public.exchange_rates VALUES (1025, 'EUR', 'DZD', 151.099300, '2025-11-19', false, '2025-11-19 20:46:34.250537', '2025-11-19 20:46:34.250537');
INSERT INTO public.exchange_rates VALUES (1026, 'EUR', 'EGP', 54.617900, '2025-11-19', false, '2025-11-19 20:46:34.371106', '2025-11-19 20:46:34.371106');
INSERT INTO public.exchange_rates VALUES (1027, 'EUR', 'ERN', 17.372800, '2025-11-19', false, '2025-11-19 20:46:34.499558', '2025-11-19 20:46:34.499558');
INSERT INTO public.exchange_rates VALUES (1028, 'EUR', 'ETB', 177.911000, '2025-11-19', false, '2025-11-19 20:46:34.742392', '2025-11-19 20:46:34.742392');
INSERT INTO public.exchange_rates VALUES (1029, 'EUR', 'FJD', 2.642100, '2025-11-19', false, '2025-11-19 20:46:34.862975', '2025-11-19 20:46:34.862975');
INSERT INTO public.exchange_rates VALUES (1030, 'EUR', 'FKP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:35.06477', '2025-11-19 20:46:35.06477');
INSERT INTO public.exchange_rates VALUES (1031, 'EUR', 'FOK', 7.462500, '2025-11-19', false, '2025-11-19 20:46:35.195189', '2025-11-19 20:46:35.195189');
INSERT INTO public.exchange_rates VALUES (1032, 'EUR', 'GBP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:35.323564', '2025-11-19 20:46:35.323564');
INSERT INTO public.exchange_rates VALUES (1033, 'EUR', 'GEL', 3.136000, '2025-11-19', false, '2025-11-19 20:46:35.440717', '2025-11-19 20:46:35.440717');
INSERT INTO public.exchange_rates VALUES (1034, 'EUR', 'GGP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:35.56355', '2025-11-19 20:46:35.56355');
INSERT INTO public.exchange_rates VALUES (1035, 'EUR', 'GHS', 13.014400, '2025-11-19', false, '2025-11-19 20:46:35.685692', '2025-11-19 20:46:35.685692');
INSERT INTO public.exchange_rates VALUES (1036, 'EUR', 'GIP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:35.805697', '2025-11-19 20:46:35.805697');
INSERT INTO public.exchange_rates VALUES (1037, 'EUR', 'GMD', 85.322600, '2025-11-19', false, '2025-11-19 20:46:35.924589', '2025-11-19 20:46:35.924589');
INSERT INTO public.exchange_rates VALUES (1038, 'EUR', 'GNF', 10100.664100, '2025-11-19', false, '2025-11-19 20:46:36.043213', '2025-11-19 20:46:36.043213');
INSERT INTO public.exchange_rates VALUES (1039, 'EUR', 'GTQ', 8.882100, '2025-11-19', false, '2025-11-19 20:46:36.161636', '2025-11-19 20:46:36.161636');
INSERT INTO public.exchange_rates VALUES (1040, 'EUR', 'GYD', 242.642300, '2025-11-19', false, '2025-11-19 20:46:36.280257', '2025-11-19 20:46:36.280257');
INSERT INTO public.exchange_rates VALUES (1041, 'EUR', 'HKD', 9.016700, '2025-11-19', false, '2025-11-19 20:46:36.402804', '2025-11-19 20:46:36.402804');
INSERT INTO public.exchange_rates VALUES (1042, 'EUR', 'HNL', 30.511600, '2025-11-19', false, '2025-11-19 20:46:36.521829', '2025-11-19 20:46:36.521829');
INSERT INTO public.exchange_rates VALUES (1043, 'EUR', 'HRK', 7.534500, '2025-11-19', false, '2025-11-19 20:46:36.640441', '2025-11-19 20:46:36.640441');
INSERT INTO public.exchange_rates VALUES (1044, 'EUR', 'HTG', 151.794200, '2025-11-19', false, '2025-11-19 20:46:36.759806', '2025-11-19 20:46:36.759806');
INSERT INTO public.exchange_rates VALUES (1045, 'EUR', 'HUF', 384.216500, '2025-11-19', false, '2025-11-19 20:46:36.877951', '2025-11-19 20:46:36.877951');
INSERT INTO public.exchange_rates VALUES (1046, 'EUR', 'IDR', 19372.750400, '2025-11-19', false, '2025-11-19 20:46:36.996821', '2025-11-19 20:46:36.996821');
INSERT INTO public.exchange_rates VALUES (1047, 'EUR', 'ILS', 3.795300, '2025-11-19', false, '2025-11-19 20:46:37.117267', '2025-11-19 20:46:37.117267');
INSERT INTO public.exchange_rates VALUES (1048, 'EUR', 'IMP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:37.236697', '2025-11-19 20:46:37.236697');
INSERT INTO public.exchange_rates VALUES (1049, 'EUR', 'INR', 102.626100, '2025-11-19', false, '2025-11-19 20:46:37.356385', '2025-11-19 20:46:37.356385');
INSERT INTO public.exchange_rates VALUES (1050, 'EUR', 'IQD', 1522.502100, '2025-11-19', false, '2025-11-19 20:46:37.487065', '2025-11-19 20:46:37.487065');
INSERT INTO public.exchange_rates VALUES (1051, 'EUR', 'IRR', 49207.121700, '2025-11-19', false, '2025-11-19 20:46:37.605644', '2025-11-19 20:46:37.605644');
INSERT INTO public.exchange_rates VALUES (1052, 'EUR', 'ISK', 147.086900, '2025-11-19', false, '2025-11-19 20:46:37.725185', '2025-11-19 20:46:37.725185');
INSERT INTO public.exchange_rates VALUES (1053, 'EUR', 'JEP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:37.848274', '2025-11-19 20:46:37.848274');
INSERT INTO public.exchange_rates VALUES (1054, 'EUR', 'JMD', 185.836200, '2025-11-19', false, '2025-11-19 20:46:37.968939', '2025-11-19 20:46:37.968939');
INSERT INTO public.exchange_rates VALUES (1055, 'EUR', 'JOD', 0.821200, '2025-11-19', false, '2025-11-19 20:46:38.08825', '2025-11-19 20:46:38.08825');
INSERT INTO public.exchange_rates VALUES (1056, 'EUR', 'JPY', 180.058100, '2025-11-19', false, '2025-11-19 20:46:38.20657', '2025-11-19 20:46:38.20657');
INSERT INTO public.exchange_rates VALUES (1057, 'EUR', 'KES', 150.437300, '2025-11-19', false, '2025-11-19 20:46:38.323663', '2025-11-19 20:46:38.323663');
INSERT INTO public.exchange_rates VALUES (1058, 'EUR', 'KGS', 101.358700, '2025-11-19', false, '2025-11-19 20:46:38.444796', '2025-11-19 20:46:38.444796');
INSERT INTO public.exchange_rates VALUES (1059, 'EUR', 'KHR', 4667.671100, '2025-11-19', false, '2025-11-19 20:46:38.569968', '2025-11-19 20:46:38.569968');
INSERT INTO public.exchange_rates VALUES (1060, 'EUR', 'KID', 1.781400, '2025-11-19', false, '2025-11-19 20:46:38.696654', '2025-11-19 20:46:38.696654');
INSERT INTO public.exchange_rates VALUES (1061, 'EUR', 'KMF', 491.967800, '2025-11-19', false, '2025-11-19 20:46:38.815702', '2025-11-19 20:46:38.815702');
INSERT INTO public.exchange_rates VALUES (1062, 'EUR', 'KRW', 1694.860500, '2025-11-19', false, '2025-11-19 20:46:38.934966', '2025-11-19 20:46:38.934966');
INSERT INTO public.exchange_rates VALUES (1063, 'EUR', 'KWD', 0.355100, '2025-11-19', false, '2025-11-19 20:46:39.054019', '2025-11-19 20:46:39.054019');
INSERT INTO public.exchange_rates VALUES (1064, 'EUR', 'KYD', 0.965200, '2025-11-19', false, '2025-11-19 20:46:39.172719', '2025-11-19 20:46:39.172719');
INSERT INTO public.exchange_rates VALUES (1065, 'EUR', 'KZT', 602.497900, '2025-11-19', false, '2025-11-19 20:46:39.291768', '2025-11-19 20:46:39.291768');
INSERT INTO public.exchange_rates VALUES (1066, 'EUR', 'LAK', 25239.344800, '2025-11-19', false, '2025-11-19 20:46:39.413946', '2025-11-19 20:46:39.413946');
INSERT INTO public.exchange_rates VALUES (1067, 'EUR', 'LBP', 103657.753500, '2025-11-19', false, '2025-11-19 20:46:39.532476', '2025-11-19 20:46:39.532476');
INSERT INTO public.exchange_rates VALUES (1068, 'EUR', 'LKR', 356.387700, '2025-11-19', false, '2025-11-19 20:46:39.653932', '2025-11-19 20:46:39.653932');
INSERT INTO public.exchange_rates VALUES (1069, 'EUR', 'LRD', 209.767900, '2025-11-19', false, '2025-11-19 20:46:39.786932', '2025-11-19 20:46:39.786932');
INSERT INTO public.exchange_rates VALUES (1070, 'EUR', 'LSL', 19.904100, '2025-11-19', false, '2025-11-19 20:46:39.904981', '2025-11-19 20:46:39.904981');
INSERT INTO public.exchange_rates VALUES (1071, 'EUR', 'LYD', 6.325000, '2025-11-19', false, '2025-11-19 20:46:40.034682', '2025-11-19 20:46:40.034682');
INSERT INTO public.exchange_rates VALUES (1072, 'EUR', 'MAD', 10.714000, '2025-11-19', false, '2025-11-19 20:46:40.154975', '2025-11-19 20:46:40.154975');
INSERT INTO public.exchange_rates VALUES (1073, 'EUR', 'MDL', 19.619500, '2025-11-19', false, '2025-11-19 20:46:40.272679', '2025-11-19 20:46:40.272679');
INSERT INTO public.exchange_rates VALUES (1074, 'EUR', 'MGA', 5133.424000, '2025-11-19', false, '2025-11-19 20:46:40.390821', '2025-11-19 20:46:40.390821');
INSERT INTO public.exchange_rates VALUES (1075, 'EUR', 'MKD', 61.521700, '2025-11-19', false, '2025-11-19 20:46:40.509395', '2025-11-19 20:46:40.509395');
INSERT INTO public.exchange_rates VALUES (1076, 'EUR', 'MMK', 2432.395700, '2025-11-19', false, '2025-11-19 20:46:40.63042', '2025-11-19 20:46:40.63042');
INSERT INTO public.exchange_rates VALUES (1077, 'EUR', 'MNT', 4126.493800, '2025-11-19', false, '2025-11-19 20:46:40.75075', '2025-11-19 20:46:40.75075');
INSERT INTO public.exchange_rates VALUES (1078, 'EUR', 'MOP', 9.288000, '2025-11-19', false, '2025-11-19 20:46:40.868732', '2025-11-19 20:46:40.868732');
INSERT INTO public.exchange_rates VALUES (1079, 'EUR', 'MRU', 46.184500, '2025-11-19', false, '2025-11-19 20:46:40.987612', '2025-11-19 20:46:40.987612');
INSERT INTO public.exchange_rates VALUES (1080, 'EUR', 'MUR', 53.124800, '2025-11-19', false, '2025-11-19 20:46:41.106729', '2025-11-19 20:46:41.106729');
INSERT INTO public.exchange_rates VALUES (1081, 'EUR', 'MVR', 17.917300, '2025-11-19', false, '2025-11-19 20:46:41.225718', '2025-11-19 20:46:41.225718');
INSERT INTO public.exchange_rates VALUES (1082, 'EUR', 'MWK', 2024.241700, '2025-11-19', false, '2025-11-19 20:46:41.344195', '2025-11-19 20:46:41.344195');
INSERT INTO public.exchange_rates VALUES (1083, 'EUR', 'MXN', 21.282200, '2025-11-19', false, '2025-11-19 20:46:41.462645', '2025-11-19 20:46:41.462645');
INSERT INTO public.exchange_rates VALUES (1084, 'EUR', 'MYR', 4.824600, '2025-11-19', false, '2025-11-19 20:46:41.582259', '2025-11-19 20:46:41.582259');
INSERT INTO public.exchange_rates VALUES (1085, 'EUR', 'MZN', 74.123500, '2025-11-19', false, '2025-11-19 20:46:41.699592', '2025-11-19 20:46:41.699592');
INSERT INTO public.exchange_rates VALUES (1086, 'EUR', 'NAD', 19.904100, '2025-11-19', false, '2025-11-19 20:46:41.818502', '2025-11-19 20:46:41.818502');
INSERT INTO public.exchange_rates VALUES (1087, 'EUR', 'NGN', 1679.955700, '2025-11-19', false, '2025-11-19 20:46:41.936975', '2025-11-19 20:46:41.936975');
INSERT INTO public.exchange_rates VALUES (1088, 'EUR', 'NIO', 42.678600, '2025-11-19', false, '2025-11-19 20:46:42.05533', '2025-11-19 20:46:42.05533');
INSERT INTO public.exchange_rates VALUES (1089, 'EUR', 'NOK', 11.715000, '2025-11-19', false, '2025-11-19 20:46:42.176451', '2025-11-19 20:46:42.176451');
INSERT INTO public.exchange_rates VALUES (1090, 'EUR', 'NPR', 164.195000, '2025-11-19', false, '2025-11-19 20:46:42.293541', '2025-11-19 20:46:42.293541');
INSERT INTO public.exchange_rates VALUES (1091, 'EUR', 'NZD', 2.046200, '2025-11-19', false, '2025-11-19 20:46:42.411587', '2025-11-19 20:46:42.411587');
INSERT INTO public.exchange_rates VALUES (1092, 'EUR', 'OMR', 0.445300, '2025-11-19', false, '2025-11-19 20:46:42.530163', '2025-11-19 20:46:42.530163');
INSERT INTO public.exchange_rates VALUES (1093, 'EUR', 'PAB', 1.158200, '2025-11-19', false, '2025-11-19 20:46:42.64927', '2025-11-19 20:46:42.64927');
INSERT INTO public.exchange_rates VALUES (1094, 'EUR', 'PEN', 3.904300, '2025-11-19', false, '2025-11-19 20:46:42.768892', '2025-11-19 20:46:42.768892');
INSERT INTO public.exchange_rates VALUES (1095, 'EUR', 'PGK', 4.910700, '2025-11-19', false, '2025-11-19 20:46:42.887225', '2025-11-19 20:46:42.887225');
INSERT INTO public.exchange_rates VALUES (1096, 'EUR', 'PHP', 68.218800, '2025-11-19', false, '2025-11-19 20:46:43.007287', '2025-11-19 20:46:43.007287');
INSERT INTO public.exchange_rates VALUES (1097, 'EUR', 'PKR', 327.348500, '2025-11-19', false, '2025-11-19 20:46:43.12551', '2025-11-19 20:46:43.12551');
INSERT INTO public.exchange_rates VALUES (1098, 'EUR', 'PLN', 4.239500, '2025-11-19', false, '2025-11-19 20:46:43.246118', '2025-11-19 20:46:43.246118');
INSERT INTO public.exchange_rates VALUES (1099, 'EUR', 'PYG', 8196.843600, '2025-11-19', false, '2025-11-19 20:46:43.367448', '2025-11-19 20:46:43.367448');
INSERT INTO public.exchange_rates VALUES (1100, 'EUR', 'QAR', 4.215800, '2025-11-19', false, '2025-11-19 20:46:43.484615', '2025-11-19 20:46:43.484615');
INSERT INTO public.exchange_rates VALUES (1101, 'EUR', 'RON', 5.086000, '2025-11-19', false, '2025-11-19 20:46:43.603751', '2025-11-19 20:46:43.603751');
INSERT INTO public.exchange_rates VALUES (1102, 'EUR', 'RSD', 117.227100, '2025-11-19', false, '2025-11-19 20:46:43.723713', '2025-11-19 20:46:43.723713');
INSERT INTO public.exchange_rates VALUES (1103, 'EUR', 'RUB', 93.816900, '2025-11-19', false, '2025-11-19 20:46:43.842213', '2025-11-19 20:46:43.842213');
INSERT INTO public.exchange_rates VALUES (1104, 'EUR', 'RWF', 1694.920000, '2025-11-19', false, '2025-11-19 20:46:43.961094', '2025-11-19 20:46:43.961094');
INSERT INTO public.exchange_rates VALUES (1105, 'EUR', 'SAR', 4.343200, '2025-11-19', false, '2025-11-19 20:46:44.079246', '2025-11-19 20:46:44.079246');
INSERT INTO public.exchange_rates VALUES (1106, 'EUR', 'SBD', 9.423900, '2025-11-19', false, '2025-11-19 20:46:44.198888', '2025-11-19 20:46:44.198888');
INSERT INTO public.exchange_rates VALUES (1107, 'EUR', 'SCR', 16.368000, '2025-11-19', false, '2025-11-19 20:46:44.321469', '2025-11-19 20:46:44.321469');
INSERT INTO public.exchange_rates VALUES (1108, 'EUR', 'SDG', 518.630100, '2025-11-19', false, '2025-11-19 20:46:44.439689', '2025-11-19 20:46:44.439689');
INSERT INTO public.exchange_rates VALUES (1109, 'EUR', 'SEK', 10.977500, '2025-11-19', false, '2025-11-19 20:46:44.55766', '2025-11-19 20:46:44.55766');
INSERT INTO public.exchange_rates VALUES (1110, 'EUR', 'SGD', 1.508500, '2025-11-19', false, '2025-11-19 20:46:44.675997', '2025-11-19 20:46:44.675997');
INSERT INTO public.exchange_rates VALUES (1111, 'EUR', 'SHP', 0.881300, '2025-11-19', false, '2025-11-19 20:46:44.793943', '2025-11-19 20:46:44.793943');
INSERT INTO public.exchange_rates VALUES (1112, 'EUR', 'SLE', 26.922300, '2025-11-19', false, '2025-11-19 20:46:44.911878', '2025-11-19 20:46:44.911878');
INSERT INTO public.exchange_rates VALUES (1113, 'EUR', 'SLL', 26922.570600, '2025-11-19', false, '2025-11-19 20:46:45.030632', '2025-11-19 20:46:45.030632');
INSERT INTO public.exchange_rates VALUES (1114, 'EUR', 'SOS', 661.834000, '2025-11-19', false, '2025-11-19 20:46:45.148333', '2025-11-19 20:46:45.148333');
INSERT INTO public.exchange_rates VALUES (1115, 'EUR', 'SRD', 44.739900, '2025-11-19', false, '2025-11-19 20:46:45.266475', '2025-11-19 20:46:45.266475');
INSERT INTO public.exchange_rates VALUES (1116, 'EUR', 'SSP', 5477.293700, '2025-11-19', false, '2025-11-19 20:46:45.384452', '2025-11-19 20:46:45.384452');
INSERT INTO public.exchange_rates VALUES (1117, 'EUR', 'STN', 24.500000, '2025-11-19', false, '2025-11-19 20:46:45.507925', '2025-11-19 20:46:45.507925');
INSERT INTO public.exchange_rates VALUES (1118, 'EUR', 'SYP', 12766.189100, '2025-11-19', false, '2025-11-19 20:46:45.625933', '2025-11-19 20:46:45.625933');
INSERT INTO public.exchange_rates VALUES (1119, 'EUR', 'SZL', 19.904100, '2025-11-19', false, '2025-11-19 20:46:45.745261', '2025-11-19 20:46:45.745261');
INSERT INTO public.exchange_rates VALUES (1120, 'EUR', 'THB', 37.548000, '2025-11-19', false, '2025-11-19 20:46:45.864484', '2025-11-19 20:46:45.864484');
INSERT INTO public.exchange_rates VALUES (1121, 'EUR', 'TJS', 10.746600, '2025-11-19', false, '2025-11-19 20:46:46.320129', '2025-11-19 20:46:46.320129');
INSERT INTO public.exchange_rates VALUES (1122, 'EUR', 'TMT', 4.055500, '2025-11-19', false, '2025-11-19 20:46:46.443458', '2025-11-19 20:46:46.443458');
INSERT INTO public.exchange_rates VALUES (1123, 'EUR', 'TND', 3.415400, '2025-11-19', false, '2025-11-19 20:46:46.572409', '2025-11-19 20:46:46.572409');
INSERT INTO public.exchange_rates VALUES (1124, 'EUR', 'TOP', 2.731200, '2025-11-19', false, '2025-11-19 20:46:46.691424', '2025-11-19 20:46:46.691424');
INSERT INTO public.exchange_rates VALUES (1125, 'EUR', 'TRY', 49.053500, '2025-11-19', false, '2025-11-19 20:46:46.809703', '2025-11-19 20:46:46.809703');
INSERT INTO public.exchange_rates VALUES (1126, 'EUR', 'TTD', 8.308700, '2025-11-19', false, '2025-11-19 20:46:46.928376', '2025-11-19 20:46:46.928376');
INSERT INTO public.exchange_rates VALUES (1127, 'EUR', 'TVD', 1.781400, '2025-11-19', false, '2025-11-19 20:46:47.047734', '2025-11-19 20:46:47.047734');
INSERT INTO public.exchange_rates VALUES (1128, 'EUR', 'TWD', 36.089700, '2025-11-19', false, '2025-11-19 20:46:47.16716', '2025-11-19 20:46:47.16716');
INSERT INTO public.exchange_rates VALUES (1129, 'EUR', 'TZS', 2813.470800, '2025-11-19', false, '2025-11-19 20:46:47.286572', '2025-11-19 20:46:47.286572');
INSERT INTO public.exchange_rates VALUES (1130, 'EUR', 'UAH', 48.783300, '2025-11-19', false, '2025-11-19 20:46:47.409007', '2025-11-19 20:46:47.409007');
INSERT INTO public.exchange_rates VALUES (1131, 'EUR', 'UGX', 4161.712100, '2025-11-19', false, '2025-11-19 20:46:47.53088', '2025-11-19 20:46:47.53088');
INSERT INTO public.exchange_rates VALUES (1132, 'EUR', 'USD', 1.158200, '2025-11-19', false, '2025-11-19 20:46:47.667424', '2025-11-19 20:46:47.667424');
INSERT INTO public.exchange_rates VALUES (1133, 'EUR', 'UYU', 46.160300, '2025-11-19', false, '2025-11-19 20:46:47.786284', '2025-11-19 20:46:47.786284');
INSERT INTO public.exchange_rates VALUES (1134, 'EUR', 'UZS', 13936.239700, '2025-11-19', false, '2025-11-19 20:46:47.909877', '2025-11-19 20:46:47.909877');
INSERT INTO public.exchange_rates VALUES (1135, 'EUR', 'VES', 275.814400, '2025-11-19', false, '2025-11-19 20:46:48.029597', '2025-11-19 20:46:48.029597');
INSERT INTO public.exchange_rates VALUES (1136, 'EUR', 'VND', 30279.399000, '2025-11-19', false, '2025-11-19 20:46:48.148037', '2025-11-19 20:46:48.148037');
INSERT INTO public.exchange_rates VALUES (1137, 'EUR', 'VUV', 141.710700, '2025-11-19', false, '2025-11-19 20:46:48.267878', '2025-11-19 20:46:48.267878');
INSERT INTO public.exchange_rates VALUES (1138, 'EUR', 'WST', 3.221900, '2025-11-19', false, '2025-11-19 20:46:48.386851', '2025-11-19 20:46:48.386851');
INSERT INTO public.exchange_rates VALUES (1139, 'EUR', 'XAF', 655.957000, '2025-11-19', false, '2025-11-19 20:46:48.517998', '2025-11-19 20:46:48.517998');
INSERT INTO public.exchange_rates VALUES (1140, 'EUR', 'XCD', 3.127100, '2025-11-19', false, '2025-11-19 20:46:48.641348', '2025-11-19 20:46:48.641348');
INSERT INTO public.exchange_rates VALUES (1141, 'EUR', 'XCG', 2.073200, '2025-11-19', false, '2025-11-19 20:46:48.76364', '2025-11-19 20:46:48.76364');
INSERT INTO public.exchange_rates VALUES (1142, 'EUR', 'XDR', 0.851000, '2025-11-19', false, '2025-11-19 20:46:48.88217', '2025-11-19 20:46:48.88217');
INSERT INTO public.exchange_rates VALUES (1143, 'EUR', 'XOF', 655.957000, '2025-11-19', false, '2025-11-19 20:46:49.002097', '2025-11-19 20:46:49.002097');
INSERT INTO public.exchange_rates VALUES (1144, 'EUR', 'XPF', 119.332000, '2025-11-19', false, '2025-11-19 20:46:49.121868', '2025-11-19 20:46:49.121868');
INSERT INTO public.exchange_rates VALUES (1145, 'EUR', 'YER', 276.569800, '2025-11-19', false, '2025-11-19 20:46:49.239081', '2025-11-19 20:46:49.239081');
INSERT INTO public.exchange_rates VALUES (1146, 'EUR', 'ZAR', 19.905200, '2025-11-19', false, '2025-11-19 20:46:49.365787', '2025-11-19 20:46:49.365787');
INSERT INTO public.exchange_rates VALUES (1147, 'EUR', 'ZMW', 26.421300, '2025-11-19', false, '2025-11-19 20:46:49.490052', '2025-11-19 20:46:49.490052');
INSERT INTO public.exchange_rates VALUES (1148, 'EUR', 'ZWL', 30.568000, '2025-11-19', false, '2025-11-19 20:46:49.61223', '2025-11-19 20:46:49.61223');
INSERT INTO public.exchange_rates VALUES (1149, 'CAD', 'ZWG', 18.746400, '2025-11-20', false, '2025-11-21 04:18:17.429862', '2025-11-21 04:18:17.429862');


--
-- Data for Name: firm_client_access; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: fx_realizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: fx_revaluations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: invoice_activities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.ledger_entries VALUES (677, 254, 21, 'Bill A-101 - ', 300, 0, '2025-09-15 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (856, 316, 22, 'Deposit DEP-2025-10-21', 378, 0, '2025-10-21 19:23:26.048', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (857, 316, 10, 'Deposit DEP-2025-10-21', 0, 378, '2025-10-21 19:23:26.048', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (862, 319, 16, 'Misc Payment Wise', 265.4601769911505, 0, '2025-10-14 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (863, 319, 22, 'Misc Payment Wise', 0, 299.97, '2025-10-14 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (864, 319, 5, 'HST ON on Misc Payment Wise', 34.50982300884954, 0, '2025-10-14 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (865, 320, 27, 'COMMERCIAL TAXES EMPTX 6432635', 1, 0, '2025-10-14 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (841, 305, 14, 'Bill BILL-0004 - ', 1500, 0, '2025-10-06 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (842, 305, 5, 'Bill BILL-0004 - Tax', 195, 0, '2025-10-06 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (843, 305, 4, 'Bill BILL-0004', 0, 1695, '2025-10-06 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (866, 320, 22, 'COMMERCIAL TAXES EMPTX 6432635', 0, 1, '2025-10-14 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (867, 321, 1, 'Transfer from RBC Bank 0123', 1000, 0, '2025-10-23 18:59:00.034', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (868, 321, 22, 'Transfer to Cash', 0, 1000, '2025-10-23 18:59:00.034', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (871, 323, 22, 'Sales Receipt SR-2025-1027-2777 - cash', 2100, 0, '2025-10-27 21:43:12.777', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (733, 270, 16, '', 500, 0, '2025-10-02 15:49:11.279', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (678, 254, 4, 'Bill A-101', 0, 315, '2025-09-15 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (872, 323, 9, 'Sales Receipt SR-2025-1027-2777 - Revenue', 0, 2000, '2025-10-27 21:43:12.777', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (734, 270, 25, 'Expense EXP-2025-1002 - Sales Tax', 49.87, 0, '2025-10-02 15:49:11.279', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (735, 270, 5, 'Expense EXP-2025-1002 - Sales Tax', 25, 0, '2025-10-02 15:49:11.279', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (736, 270, 22, 'Expense EXP-2025-1002 - Payment', 0, 574.87, '2025-10-02 15:49:11.279', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (873, 323, 5, 'Sales Receipt SR-2025-1027-2777 - Sales Tax', 0, 100, '2025-10-27 21:43:12.777', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (879, 325, 27, 'Bill Payment PAY-FILE FEES', 4, 0, '2025-09-02 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (878, 326, 27, 'Bill Payment PAY-FILE FEES', 2, 0, '2025-06-02 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (883, 325, 22, 'Bill Payment PAY-FILE FEES', 0, 4, '2025-09-02 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (886, 326, 22, 'Bill Payment PAY-FILE FEES', 0, 2, '2025-06-02 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (887, 330, 13, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', 3, 0, '2025-10-09 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (888, 330, 22, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', 0, 3, '2025-10-09 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (889, 331, 15, '', 1000, 0, '2025-10-29 22:11:46.033', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (890, 331, 5, 'Expense 123 - Sales Tax', 130, 0, '2025-10-29 22:11:46.033', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (891, 331, 22, 'Expense 123 - Payment', 0, 1130, '2025-10-29 22:11:46.033', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (755, 272, 15, '', 200, 0, '2024-11-08 05:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (757, 272, 1, 'Expense  - Payment', 0, 220, '2024-11-08 05:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (756, 272, 5, 'Expense  - Sales Tax', 20, 0, '2024-11-08 05:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (904, 335, 28, '', 36.88, 0, '2025-10-28 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (905, 335, 5, 'Expense  - Sales Tax', 4.79, 0, '2025-10-28 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (906, 335, 22, 'Expense  - Payment', 0, 41.67, '2025-10-28 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (917, 344, 27, 'CASH APP TRANSFER', 30, 0, '2025-11-13 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (918, 344, 22, 'CASH APP TRANSFER', 0, 30, '2025-11-13 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (921, 346, 22, 'Deposit DEP-1764197132281', 500, 0, '2025-11-26 22:45:01.672', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (922, 346, 2, 'Deposit DEP-1764197132281', 0, 500, '2025-11-26 22:45:01.672', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (926, 348, 22, 'Deposit', 500, 0, '2025-11-19 05:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (927, 348, 2, 'Deposit', 0, 500, '2025-11-19 05:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (881, 329, 27, 'Bill Payment PAY-FILE FEES', 2, 0, '2025-10-01 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (880, 328, 27, 'Bill Payment PAY-FILE FEES', 2, 0, '2025-07-02 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (884, 328, 22, 'Bill Payment PAY-FILE FEES', 0, 2, '2025-07-02 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (691, 254, 5, 'Bill A-101 - Tax', 15, 0, '2025-09-15 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (885, 329, 22, 'Bill Payment PAY-FILE FEES', 0, 2, '2025-10-01 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (844, 306, 4, '', 3000, 0, '2025-10-10 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (845, 306, 22, 'Cheque CHQ-1001 - Payment', 0, 3000, '2025-10-10 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (877, 327, 27, 'Bill Payment PAY-FILE FEES', 2, 0, '2025-08-01 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (882, 327, 22, 'Bill Payment PAY-FILE FEES', 0, 2, '2025-08-01 00:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (838, 304, 16, 'Bill BILL-0003 - ', 2000, 0, '2025-10-01 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (839, 304, 5, 'Bill BILL-0003 - Tax', 260, 0, '2025-10-01 04:00:00', NULL, NULL, NULL);
INSERT INTO public.ledger_entries VALUES (840, 304, 4, 'Bill BILL-0003', 0, 2260, '2025-10-01 04:00:00', NULL, NULL, NULL);


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.products VALUES (8, 'Bookkeeping', '', NULL, 'product', 0.00, 0.00, 10, NULL, true, '2025-04-14 14:52:08.227863', '2025-04-14 14:52:08.227863');
INSERT INTO public.products VALUES (9, 'Year-End Accounting', '', NULL, 'product', 0.00, 0.00, 10, NULL, true, '2025-04-14 14:52:21.390283', '2025-04-14 14:52:21.390283');
INSERT INTO public.products VALUES (10, 'Corporate Tax Return (T2)', '', NULL, 'product', 0.00, 0.00, 10, NULL, true, '2025-04-14 14:52:48.166739', '2025-04-14 14:52:48.166739');


--
-- Data for Name: line_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.line_items VALUES (134, 319, 'Misc Payment Wise', 1, 265.4601769911505, 265.4601769911505, 4, 16, NULL);
INSERT INTO public.line_items VALUES (135, 320, 'COMMERCIAL TAXES EMPTX 6432635', 1, 1, 1, 5, 27, NULL);
INSERT INTO public.line_items VALUES (137, 323, 'Bookkeeping', 1, 2000, 2000, 1, NULL, 8);
INSERT INTO public.line_items VALUES (141, 327, 'Bill Payment PAY-FILE FEES', 1, 2, 2, 5, 27, NULL);
INSERT INTO public.line_items VALUES (142, 325, 'Bill Payment PAY-FILE FEES', 1, 4, 4, 5, 27, NULL);
INSERT INTO public.line_items VALUES (140, 326, 'Bill Payment PAY-FILE FEES', 1, 2, 2, 5, 27, NULL);
INSERT INTO public.line_items VALUES (143, 329, 'Bill Payment PAY-FILE FEES', 1, 2, 2, 5, 27, NULL);
INSERT INTO public.line_items VALUES (139, 328, 'Bill Payment PAY-FILE FEES', 1, 2, 2, 5, 27, NULL);
INSERT INTO public.line_items VALUES (144, 330, 'Direct Deposits (PDS) service total PAY EMP-VENDOR', 1, 3, 3, 6, 13, NULL);
INSERT INTO public.line_items VALUES (91, 270, '', 1, 500, 500, 8, 16, NULL);
INSERT INTO public.line_items VALUES (145, 331, '', 1, 1000, 1000, 4, 15, NULL);
INSERT INTO public.line_items VALUES (150, 335, '', 1, 41.67, 41.67, 4, 28, NULL);
INSERT INTO public.line_items VALUES (98, 272, '', 1, 200, 200, 4, 15, NULL);
INSERT INTO public.line_items VALUES (155, 344, 'CASH APP TRANSFER', 1, 30, 30, 5, 27, NULL);
INSERT INTO public.line_items VALUES (117, 304, '', 1, 2000, 2000, 4, 16, NULL);
INSERT INTO public.line_items VALUES (118, 305, '', 1, 1500, 1500, 4, 14, NULL);
INSERT INTO public.line_items VALUES (119, 306, '', 1, 3000, 3000, 6, 4, NULL);
INSERT INTO public.line_items VALUES (79, 254, '', 1, 300, 300, 1, 21, NULL);


--
-- Data for Name: payment_applications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.preferences VALUES (1, false, true, NULL, '2025-11-26 19:03:03.382', true, 'CAD', '2025-11-06 21:35:47.921', 'classic', NULL);


--
-- Data for Name: reconciliations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.reconciliations VALUES (1, 22, '2025-09-30 00:00:00', 10000, 0, 0, 'in_progress', '2025-10-28 00:49:37.414594', NULL, NULL);
INSERT INTO public.reconciliations VALUES (2, 22, '2025-10-31 00:00:00', 10000, 0, 0, 'in_progress', '2025-10-30 13:45:12.549881', NULL, NULL);
INSERT INTO public.reconciliations VALUES (3, 22, '2025-10-31 00:00:00', 25030, -6, 25036, 'in_progress', '2025-11-18 21:41:49.570901', NULL, NULL);


--
-- Data for Name: reconciliation_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.reconciliation_items VALUES (1, 3, 886, true);
INSERT INTO public.reconciliation_items VALUES (2, 3, 884, true);
INSERT INTO public.reconciliation_items VALUES (3, 3, 882, true);


--
-- Data for Name: recurring_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: recurring_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: recurring_lines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.session VALUES ('PmlqjZ0Iev4TyuZei6MsYplpCTD141Ps', '{"cookie":{"originalMaxAge":2592000000,"expires":"2025-11-28T23:01:46.098Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}', '2025-12-26 20:47:39');
INSERT INTO public.session VALUES ('Oa-LmK709Ys9et2e3Fwu3ff7NnjRZWlk', '{"cookie":{"originalMaxAge":2592000000,"expires":"2026-01-03T16:16:38.416Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}', '2026-01-14 20:47:47');
INSERT INTO public.session VALUES ('oRFu3a334QrbKhN7_wY9l4Nw_7r4GBdb', '{"cookie":{"originalMaxAge":2592000000,"expires":"2025-11-27T19:38:59.892Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":1}}', '2025-12-27 18:59:03');


--
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: user_companies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.user_companies VALUES (1, 1, 1, 'admin', false, '2025-11-27 13:26:58.102879');
INSERT INTO public.user_companies VALUES (2, 2, 4, 'admin', false, '2025-11-28 03:15:47.671929');
INSERT INTO public.user_companies VALUES (3, 2, 1, 'admin', false, '2025-11-28 14:39:48.319956');
INSERT INTO public.user_companies VALUES (4, 3, 5, 'admin', true, '2025-12-03 18:22:56.009553');


--
-- Data for Name: user_invitations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: neondb_owner
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: accounting_firms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.accounting_firms_id_seq', 1, false);


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.accounts_id_seq', 35, true);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 5, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, true);


--
-- Name: bank_connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.bank_connections_id_seq', 1, true);


--
-- Name: bank_transaction_matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.bank_transaction_matches_id_seq', 1, false);


--
-- Name: categorization_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.categorization_rules_id_seq', 1, false);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.companies_id_seq', 5, true);


--
-- Name: company_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.company_settings_id_seq', 1, true);


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.contacts_id_seq', 13, true);


--
-- Name: csv_mapping_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.csv_mapping_preferences_id_seq', 1, true);


--
-- Name: currencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.currencies_id_seq', 80, true);


--
-- Name: currency_locks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.currency_locks_id_seq', 1, false);


--
-- Name: exchange_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.exchange_rates_id_seq', 1149, true);


--
-- Name: firm_client_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.firm_client_access_id_seq', 1, false);


--
-- Name: fx_realizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.fx_realizations_id_seq', 1, false);


--
-- Name: fx_revaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.fx_revaluations_id_seq', 1, false);


--
-- Name: imported_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.imported_transactions_id_seq', 280, true);


--
-- Name: invoice_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.invoice_activities_id_seq', 1, false);


--
-- Name: ledger_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.ledger_entries_id_seq', 927, true);


--
-- Name: line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.line_items_id_seq', 156, true);


--
-- Name: payment_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.payment_applications_id_seq', 26, true);


--
-- Name: preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.preferences_id_seq', 1, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.products_id_seq', 10, true);


--
-- Name: reconciliation_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.reconciliation_items_id_seq', 3, true);


--
-- Name: reconciliations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.reconciliations_id_seq', 3, true);


--
-- Name: recurring_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.recurring_history_id_seq', 1, false);


--
-- Name: recurring_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.recurring_lines_id_seq', 1, false);


--
-- Name: recurring_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.recurring_templates_id_seq', 1, false);


--
-- Name: sales_taxes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sales_taxes_id_seq', 24, true);


--
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.transaction_attachments_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.transactions_id_seq', 348, true);


--
-- Name: user_companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_companies_id_seq', 4, true);


--
-- Name: user_invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_invitations_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 6XpNJCxIIspqA9JCrVO2kRrnarIuaaeolLuvAPPUfwpRxoXhQ7WabI1yFd0W0lb

