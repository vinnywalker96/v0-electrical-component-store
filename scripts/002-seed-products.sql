
-- Seed sample products
-- Seed sample products
INSERT INTO public.products (name, name_pt, description, description_pt, category, manufacturer, price, stock_quantity, specifications) VALUES
  ('Resistor 1K Ohm 1/4W', 'Resistor 1K Ohm 1/4W', 'Standard carbon film resistor with 1% tolerance', 'Resistor de filme de carbono padrão com tolerância de 1%', 'Resistors', 'Generic', 0.05, 500, '{"tolerance": "1%", "power": "1/4W", "temperature_coefficient": "±100 ppm/°C"}'),
  ('LED Red 5mm', 'LED Vermelho 5mm', 'Bright red LED with 20mA forward current', 'LED vermelho brilhante com corrente direta de 20mA', 'LEDs', 'Generic', 0.15, 1000, '{"color": "Red", "size": "5mm", "forward_voltage": "2V", "max_current": "20mA"}'),
  ('Capacitor 100µF 16V', 'Capacitor 100µF 16V', 'Electrolytic capacitor for power applications', 'Capacitor eletrolítico para aplicações de potência', 'Capacitors', 'Generic', 0.25, 300, '{"capacitance": "100µF", "voltage": "16V", "type": "Electrolytic"}'),
  ('Jumper Wire Pack', 'Pacote de Fios de Jumper', 'Pre-cut and pre-stripped jumper wires for breadboards', 'Fios de jumper pré-cortados e pré-descascados para breadboards', 'Wires & Connectors', 'Generic', 2.99, 150, '{"count": "65 pieces", "colors": "Mixed"}'),
  ('Bread Board 830 Contacts', 'Placa de Ensaio 830 Contactos', 'Large solderless breadboard for prototyping', 'Breadboard grande sem solda para prototipagem', 'Breadboards', 'Generic', 4.99, 75, '{"contacts": "830", "dimensions": "165mm x 55mm"}'),
  ('Arduino Uno R3', 'Arduino Uno R3', 'Microcontroller board based on ATmega328P', 'Placa microcontroladora baseada no ATmega328P', 'Microcontrollers', 'Arduino', 24.99, 50, '{"processor": "ATmega328P", "voltage": "5V", "memory": "32KB"}'),
  ('Push Button Switch', 'Interruptor de Botão de Pressão', 'Momentary contact push button for breadboard', 'Botão de pressão de contato momentâneo para breadboard', 'Switches', 'Generic', 0.50, 200, '{"type": "Momentary", "contacts": "2", "rating": "50mA @ 24V"}'),
  ('Diode 1N4007', 'Diodo 1N4007', 'General purpose rectifier diode', 'Diodo retificador de uso geral', 'Diodes', 'Generic', 0.10, 400, '{"type": "Rectifier", "voltage": "1000V", "current": "1A"}'),
  ('PCB Double Sided 5x7cm', 'PCB de Dupla Face 5x7cm', 'Double-sided printed circuit board', 'Placa de circuito impresso de dupla face', 'PCBs', 'Generic', 1.50, 100, '{"size": "5cm x 7cm", "thickness": "1.6mm", "copper": "Double-sided"}'),
  ('USB-A to USB-B Cable', 'Cabo USB-A para USB-B', '1.5m USB cable for Arduino and devices', 'Cabo USB de 1,5m para Arduino e dispositivos', 'Cables', 'Generic', 2.00, 80, '{"length": "1.5m", "connector": "USB-A to USB-B"}'),
  ('Potentiometer 10K', 'Potenciómetro 10K', 'Rotary variable resistor for analog input', 'Resistor variável rotativo para entrada analógica', 'Potentiometers', 'Generic', 0.75, 200, '{"resistance": "10K", "type": "Rotary", "track": "Linear"}'),
  ('Relay 5V', 'Relé 5V', '5V electromagnetic relay for switching circuits', 'Relé eletromagnético de 5V para circuitos de comutação', 'Relays', 'Generic', 1.25, 100, '{"voltage": "5V", "coil_current": "70mA", "contacts": "SPDT"}');
