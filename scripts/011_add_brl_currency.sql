INSERT INTO currency_rates (currency_code, currency_name, country, symbol, exchange_rate_to_zar, is_active) VALUES
('BRL', 'Brazilian Real', 'Brazil', 'R$', 3.5)
ON CONFLICT (currency_code) DO NOTHING;