-- Seed sample products
INSERT INTO public.products (name, description, category, brand, price, stock_quantity, specifications) VALUES
  ('Resistor 1K Ohm 1/4W', 'Standard carbon film resistor with 1% tolerance', 'Resistors', 'Generic', 0.05, 500, '{"tolerance": "1%", "power": "1/4W", "temperature_coefficient": "±100 ppm/°C"}'),
  ('LED Red 5mm', 'Bright red LED with 20mA forward current', 'LEDs', 'Generic', 0.15, 1000, '{"color": "Red", "size": "5mm", "forward_voltage": "2V", "max_current": "20mA"}'),
  ('Capacitor 100µF 16V', 'Electrolytic capacitor for power applications', 'Capacitors', 'Generic', 0.25, 300, '{"capacitance": "100µF", "voltage": "16V", "type": "Electrolytic"}'),
  ('Jumper Wire Pack', 'Pre-cut and pre-stripped jumper wires for breadboards', 'Wires & Connectors', 'Generic', 2.99, 150, '{"count": "65 pieces", "colors": "Mixed"}'),
  ('Bread Board 830 Contacts', 'Large solderless breadboard for prototyping', 'Breadboards', 'Generic', 4.99, 75, '{"contacts": "830", "dimensions": "165mm x 55mm"}'),
  ('Arduino Uno R3', 'Microcontroller board based on ATmega328P', 'Microcontrollers', 'Arduino', 24.99, 50, '{"processor": "ATmega328P", "voltage": "5V", "memory": "32KB"}'),
  ('Push Button Switch', 'Momentary contact push button for breadboard', 'Switches', 'Generic', 0.50, 200, '{"type": "Momentary", "contacts": "2", "rating": "50mA @ 24V"}'),
  ('Diode 1N4007', 'General purpose rectifier diode', 'Diodes', 'Generic', 0.10, 400, '{"type": "Rectifier", "voltage": "1000V", "current": "1A"}'),
  ('PCB Double Sided 5x7cm', 'Double-sided printed circuit board', 'PCBs', 'Generic', 1.50, 100, '{"size": "5cm x 7cm", "thickness": "1.6mm", "copper": "Double-sided"}'),
  ('USB-A to USB-B Cable', '1.5m USB cable for Arduino and devices', 'Cables', 'Generic', 2.00, 80, '{"length": "1.5m", "connector": "USB-A to USB-B"}'),
  ('Potentiometer 10K', 'Rotary variable resistor for analog input', 'Potentiometers', 'Generic', 0.75, 200, '{"resistance": "10K", "type": "Rotary", "track": "Linear"}'),
  ('Relay 5V', '5V electromagnetic relay for switching circuits', 'Relays', 'Generic', 1.25, 100, '{"voltage": "5V", "coil_current": "70mA", "contacts": "SPDT"}');
