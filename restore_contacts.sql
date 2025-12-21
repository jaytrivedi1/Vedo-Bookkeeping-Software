-- Restore contacts with the new notes column
-- Run this script to restore your customers and vendors

INSERT INTO contacts (id, name, contact_name, email, phone, address, type, currency, default_tax_rate, document_ids, is_active, notes) VALUES
(2, 'Tech Supplies Inc.', 'Jane Doe', 'jane@techsupplies.example', '555-987-6543', '456 Vendor St, Supplier Town, 54321', 'vendor', 'USD', 0, '{}', true, NULL),
(4, 'Splendid Support Inc.', 'Mr. Joe Splendid', 'joe@splendidsupport.com', '4161237890', '', 'customer', 'CAD', 0, '{}', true, NULL),
(5, 'ABC Enterprise Inc.', 'Mr. ABC', 'abc@abc.com', '4161234567', '123, ABC Road
Oakville
ON', 'customer', 'CAD', 0, '{}', true, NULL),
(6, 'The Customer Company', 'Mr. Customer', 'customer@company.example', '789-456-1230', '111, The Customer Street
Customer City, ON L5J 1S6', 'customer', 'CAD', 0, '{}', true, NULL),
(7, 'Super Supplier Inc.', 'Joseph Super', 'jsuper@supers.com', '905-123-4567', '123 Super Street,
Super City
ON A1A 1A1', 'vendor', 'CAD', 0, '{}', true, NULL),
(8, 'Tropical Smoothie Cafe', '', 'trp@cafe.com', '', '', 'vendor', 'CAD', 0, '{}', true, NULL),
(11, 'USA Client Inc.', '', '', '', NULL, 'customer', 'USD', 0, '{}', true, NULL),
(12, 'USA Vendor Inc.', '', '', '', NULL, 'vendor', 'USD', 0, '{}', true, NULL),
(13, 'Europe Customer Inc.', '', '', '', NULL, 'customer', 'EUR', 0, '{}', true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence to avoid conflicts with future inserts
SELECT setval('contacts_id_seq', (SELECT MAX(id) FROM contacts) + 1);
