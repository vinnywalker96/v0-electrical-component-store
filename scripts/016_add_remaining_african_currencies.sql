-- Add Remaining African Currencies
INSERT INTO currency_rates (currency_code, currency_name, country, symbol, exchange_rate_to_zar) VALUES
-- North Africa
('DZD', 'Algerian Dinar', 'Algeria', 'د.ج', 0.14),
('MAD', 'Moroccan Dirham', 'Morocco', 'د.م.', 1.83),
('TND', 'Tunisian Dinar', 'Tunisia', 'د.ت', 5.86),
('LYD', 'Libyan Dinar', 'Libya', 'ل.د', 3.73),
('SDG', 'Sudanese Pound', 'Sudan', 'ج.س.', 0.03),

-- West Africa
('XOF', 'West African CFA Franc', 'West African Economic and Monetary Union', 'CFA', 0.030), -- Benin, Burkina Faso, Côte d''Ivoire, Guinea-Bissau, Mali, Niger, Senegal, Togo
('GMD', 'Gambian Dalasi', 'Gambia', 'D', 0.26),
('GNF', 'Guinean Franc', 'Guinea', 'FG', 0.0021),
('SLE', 'Sierra Leonean Leone', 'Sierra Leone', 'Le', 0.80),
('LRD', 'Liberian Dollar', 'Liberia', '$', 0.092),
('CVE', 'Cape Verdean Escudo', 'Cape Verde', '$', 0.18),
('MRU', 'Mauritanian Ouguiya', 'Mauritania', 'UM', 0.46),

-- Central Africa
('XAF', 'Central African CFA Franc', 'Central African Economic and Monetary Community', 'FCFA', 0.030), -- Cameroon, Central African Republic, Chad, Congo, Equatorial Guinea, Gabon
('CDF', 'Congolese Franc', 'DR Congo', 'FC', 0.0064),
('STN', 'São Tomé and Príncipe Dobra', 'São Tomé and Príncipe', 'Db', 0.80),

-- East Africa / Horn of Africa
('SSP', 'South Sudanese Pound', 'South Sudan', '£', 0.0045),
('DJF', 'Djiboutian Franc', 'Djibouti', 'Fdj', 0.10),
('ERN', 'Eritrean Nakfa', 'Eritrea', 'Nfk', 1.20),
('SOS', 'Somali Shilling', 'Somalia', 'Sh', 0.031),
('BIF', 'Burundian Franc', 'Burundi', 'FBu', 0.0062),

-- Southern Africa / Indian Ocean Islands
('MGA', 'Malagasy Ariary', 'Madagascar', 'Ar', 0.0039),
('SCR', 'Seychellois Rupee', 'Seychelles', '₨', 1.34),
('KMF', 'Comorian Franc', 'Comoros', 'CF', 0.040),
('LSL', 'Lesotho Loti', 'Lesotho', 'L', 1.00), -- Pegged to ZAR
('SZL', 'Swazi Lilangeni', 'Eswatini', 'L', 1.00)  -- Pegged to ZAR

ON CONFLICT (currency_code) DO UPDATE 
SET is_active = true;
