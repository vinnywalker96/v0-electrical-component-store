INSERT INTO currency_rates (currency_code, currency_name, country, symbol, exchange_rate_to_zar) VALUES
('AOA', 'Angolan Kwanza', 'Angola', 'Kz', 0.02) -- Exchange rate is illustrative, will need to be updated with real-time data
ON CONFLICT (currency_code) DO NOTHING;
