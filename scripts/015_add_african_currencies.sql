-- Add Major African Currencies
INSERT INTO currency_rates (currency_code, currency_name, country, symbol, exchange_rate_to_zar) VALUES
('NGN', 'Nigerian Naira', 'Nigeria', '₦', 0.012), -- Example rates, will be updated by API
('KES', 'Kenyan Shilling', 'Kenya', 'KSh', 0.14),
('GHS', 'Ghanaian Cedi', 'Ghana', 'GH₵', 1.5),
('EGP', 'Egyptian Pound', 'Egypt', 'E£', 0.38),
('ZMW', 'Zambian Kwacha', 'Zambia', 'ZK', 0.7),
('BWP', 'Botswana Pula', 'Botswana', 'P', 1.35),
('NAD', 'Namibian Dollar', 'Namibia', 'N$', 1.00), -- Pegged to ZAR usually
('MZN', 'Mozambican Metical', 'Mozambique', 'MT', 0.28),
('AOA', 'Angolan Kwanza', 'Angola', 'Kz', 0.02),
('TZS', 'Tanzanian Shilling', 'Tanzania', 'TSh', 0.007),
('UGX', 'Ugandan Shilling', 'Uganda', 'USh', 0.0048),
('MUR', 'Mauritian Rupee', 'Mauritius', '₨', 0.40),
('RWF', 'Rwandan Franc', 'Rwanda', 'FRw', 0.014),
('MWK', 'Malawian Kwacha', 'Malawi', 'MK', 0.011),
('ETB', 'Ethiopian Birr', 'Ethiopia', 'Br', 0.15)
ON CONFLICT (currency_code) DO UPDATE 
SET is_active = true;

-- Ensure last_updated column exists for live updates
ALTER TABLE currency_rates ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();
