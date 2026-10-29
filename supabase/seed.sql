-- Seed: valori di partenza. Costi lasciati vuoti dove vanno compilati da Giacomo (il preventivo non si emette finché mancano).

insert into public.staff_roles (key, name, sort) values
  ('cameriere', 'Cameriere', 1), ('capo_servizio', 'Capo servizio', 2), ('bartender', 'Bartender', 3),
  ('cuoco', 'Cuoco', 4), ('ostricaro', 'Ostricaro', 5), ('lavapiatti', 'Lavapiatti', 6), ('autista', 'Autista', 7)
on conflict (key) do nothing;

insert into public.items (key, name, category, disposable) values
  ('tavolo_rotondo_10', 'Tavolo rotondo da 10',   'tavoli',     false),
  ('tavolo_buffet',     'Tavolo da buffet',       'tavoli',     false),
  ('tavolo_alto',       'Tavolo alto da cocktail','tavoli',     false),
  ('banco_bar',         'Banco bar mobile',       'attrezzature', false),
  ('banco_ostriche',    'Banco ostriche',         'attrezzature', false),
  ('sedia',             'Sedia',                  'sedute',     false),
  ('tovaglia',          'Tovaglia',               'tovagliato', false),
  ('tovagliolo',        'Tovagliolo in stoffa',   'tovagliato', false),
  ('tovagliolino',      'Tovagliolino di carta',  'tovagliato', true),
  ('piatto_piano',      'Piatto piano',           'stoviglie',  false),
  ('piatto_fondo',      'Piatto fondo',           'stoviglie',  false),
  ('piatto_dessert',    'Piatto da dessert',      'stoviglie',  false),
  ('forchetta',         'Forchetta',              'posate',     false),
  ('coltello',          'Coltello',               'posate',     false),
  ('cucchiaio',         'Cucchiaio',              'posate',     false),
  ('calice_vino',       'Calice da vino',         'bicchieri',  false),
  ('flute',             'Flûte',                  'bicchieri',  false),
  ('tumbler',           'Tumbler',                'bicchieri',  false)
on conflict (key) do nothing;

insert into public.kits (key, name) values
  ('antipasto_seduto', 'Antipasto seduto'), ('primo', 'Primo'), ('secondo', 'Secondo'), ('dessert', 'Dessert'),
  ('finger', 'Finger'), ('vino', 'Vino'), ('bollicine', 'Bollicine'), ('cocktail', 'Cocktail')
on conflict (key) do nothing;

insert into public.kit_items (kit_id, item_id, qty)
select k.id, i.id, 1 from (values
  ('antipasto_seduto','piatto_piano'), ('antipasto_seduto','forchetta'), ('antipasto_seduto','coltello'),
  ('primo','piatto_fondo'), ('primo','forchetta'), ('primo','cucchiaio'),
  ('secondo','piatto_piano'), ('secondo','forchetta'), ('secondo','coltello'),
  ('dessert','piatto_dessert'), ('dessert','cucchiaio'),
  ('finger','tovagliolino'), ('vino','calice_vino'), ('bollicine','flute'), ('cocktail','tumbler')
) as x(kit, item) join public.kits k on k.key = x.kit join public.items i on i.key = x.item
on conflict do nothing;

-- Prodotti (costi da compilare). unit_cost_cents: per pezzo, al kg per i grammi, per bottiglia.
insert into public.products (name, brand, course, unit, kit_id, hot, waste_pct)
select x.name, x.brand, x.course, x.unit, k.id, x.hot, x.waste from (values
  ('Spritz',                         'radetzky',  'bevanda',   'pezzo',     'cocktail',         false, 0),
  ('Negroni e Americano',            'radetzky',  'bevanda',   'pezzo',     'cocktail',         false, 0),
  ('Bollicine al calice',            'radetzky',  'bevanda',   'bottiglia', 'bollicine',        false, 0),
  ('Focaccia',                       'radetzky',  'finger',    'g',         'finger',           false, 5),
  ('Patatine',                       'radetzky',  'finger',    'g',         'finger',           false, 5),
  ('Olive',                          'radetzky',  'finger',    'g',         'finger',           false, 5),
  ('Mondeghili',                     'radetzky',  'finger',    'pezzo',     'finger',           true,  3),
  ('Mini panini e tramezzini',       'radetzky',  'finger',    'pezzo',     'finger',           false, 3),
  ('Risotto alla milanese in cocotte','radetzky', 'primo',     'g',         'primo',            true,  5),
  ('Cotoletta bite',                 'radetzky',  'finger',    'pezzo',     'finger',           true,  3),
  ('Formaggi lombardi',              'radetzky',  'finger',    'g',         'finger',           false, 5),
  ('Piccola pasticceria',            'radetzky',  'dolce',     'pezzo',     'dessert',          false, 3),
  ('Uova',                           'radetzky',  'secondo',   'pezzo',     'secondo',          true,  5),
  ('Pancake',                        'radetzky',  'dolce',     'pezzo',     'dessert',          true,  5),
  ('Salmone affumicato e avocado toast','radetzky','antipasto','pezzo',     'antipasto_seduto', false, 3),
  ('Torte fatte in casa',            'radetzky',  'dolce',     'pezzo',     'dessert',          false, 5),
  ('Mimosa e Bellini',               'radetzky',  'bevanda',   'bottiglia', 'bollicine',        false, 0),
  ('Ostriche miste',                 'oysteroom', 'antipasto', 'pezzo',     'finger',           false, 5),
  ('Gambero rosso di Mazara crudo',  'oysteroom', 'antipasto', 'pezzo',     'finger',           false, 3),
  ('Scampo crudo',                   'oysteroom', 'antipasto', 'pezzo',     'finger',           false, 3),
  ('Tartare di ricciola',            'oysteroom', 'antipasto', 'g',         'finger',           false, 5),
  ('Tartare di salmone',             'oysteroom', 'antipasto', 'g',         'finger',           false, 5),
  ('Lobster roll finger',            'oysteroom', 'finger',    'pezzo',     'finger',           false, 3),
  ('Champagne',                      'oysteroom', 'bevanda',   'bottiglia', 'bollicine',        false, 0)
) as x(name, brand, course, unit, kit, hot, waste) left join public.kits k on k.key = x.kit
on conflict (name, brand) do nothing;

insert into public.formulas (name, brand, description) values
  ('Aperitivo Radetzky', 'radetzky',  'In piedi, 2 ore. Il rito di Corso Garibaldi.'),
  ('Oyster & Bubbles',   'oysteroom', 'Isola, 2–3 ore. La Oysteroom in location.'),
  ('Cocktail dinatoire', 'radetzky',  'In piedi, cena completa in finger e cocotte.'),
  ('Brunch Radetzky',    'radetzky',  'Seduti o buffet, al mattino.')
on conflict (name) do nothing;

insert into public.formula_products (formula_id, product_id, qty_per_guest)
select f.id, p.id, x.qty from (values
  ('Aperitivo Radetzky', 'Spritz', 1.5), ('Aperitivo Radetzky', 'Negroni e Americano', 0.5), ('Aperitivo Radetzky', 'Bollicine al calice', 0.15),
  ('Aperitivo Radetzky', 'Focaccia', 60), ('Aperitivo Radetzky', 'Patatine', 40), ('Aperitivo Radetzky', 'Olive', 30),
  ('Aperitivo Radetzky', 'Mondeghili', 2), ('Aperitivo Radetzky', 'Mini panini e tramezzini', 2),
  ('Oyster & Bubbles', 'Ostriche miste', 3), ('Oyster & Bubbles', 'Gambero rosso di Mazara crudo', 1), ('Oyster & Bubbles', 'Scampo crudo', 1),
  ('Oyster & Bubbles', 'Tartare di ricciola', 40), ('Oyster & Bubbles', 'Tartare di salmone', 40), ('Oyster & Bubbles', 'Lobster roll finger', 1),
  ('Oyster & Bubbles', 'Champagne', 0.4),
  ('Cocktail dinatoire', 'Ostriche miste', 2), ('Cocktail dinatoire', 'Tartare di ricciola', 30), ('Cocktail dinatoire', 'Risotto alla milanese in cocotte', 120),
  ('Cocktail dinatoire', 'Mondeghili', 2), ('Cocktail dinatoire', 'Cotoletta bite', 2), ('Cocktail dinatoire', 'Formaggi lombardi', 50),
  ('Cocktail dinatoire', 'Piccola pasticceria', 3), ('Cocktail dinatoire', 'Bollicine al calice', 0.3),
  ('Brunch Radetzky', 'Uova', 2), ('Brunch Radetzky', 'Pancake', 2), ('Brunch Radetzky', 'Salmone affumicato e avocado toast', 1),
  ('Brunch Radetzky', 'Torte fatte in casa', 1), ('Brunch Radetzky', 'Mimosa e Bellini', 0.25)
) as x(formula, product, qty)
join public.formulas f on f.name = x.formula
join public.products p on p.name = x.product
on conflict do nothing;

-- Regole del calcolatore: valori di partenza della specifica (§7.1, §8). Devono coincidere con src/lib/calc/defaults.ts.
insert into public.rules (key, value) values
  ('staff', '{
    "cameriere":     {"in_piedi":25,"buffet":20,"cena_servita":12,"min":2,"when":"always"},
    "capo_servizio": {"above_guests":60,"count":1},
    "bartender":     {"in_piedi":50,"buffet":50,"cena_servita":50,"min":1,"when":"open_bar"},
    "cuoco":         {"in_piedi":40,"buffet":40,"cena_servita":40,"min":1,"when":"hot"},
    "ostricaro":     {"in_piedi":80,"buffet":80,"cena_servita":80,"min":1,"when":"oyster_island"},
    "lavapiatti":    {"in_piedi":80,"buffet":60,"cena_servita":50,"min":1,"when":"washables"}
  }'),
  ('hours', '{"setup":2,"teardown":1.5}'),
  ('furniture', '{
    "round_table_seats":10, "buffet_table_per":50, "buffet_table_min":2, "high_table_per":10,
    "chairs": {"cena_servita":1.05,"buffet":0.70,"in_piedi":0.30},
    "tablecloth_extra":0.10, "napkin_extra":0.10
  }'),
  ('spare', '{"stoviglie":0.10,"posate":0.10,"bicchieri":0.50}'),
  ('pricing', '{"target_margin":0.35,"low_margin":0.20,"round_to_cents":50,"eur_per_km_cents":120,"trips":2,"vat_pct":10}')
on conflict (key) do nothing;

insert into public.settings (key, value) values
  ('azienda', '{"legal_name":"[Ragione sociale]","vat_number":"[Partita IVA]","address":"Corso Garibaldi 105, 20121 Milano","phone":"+39 02 657 2645","email":"radetzkycafe@libero.it"}'),
  ('preventivo', '{"validity_days":15,"deposit_pct":30,"balance_days_after":7,"conditions":"Acconto del 30% alla conferma. Saldo entro 7 giorni dall''evento. Preventivo valido 15 giorni. In caso di annullamento oltre 30 giorni prima dell''evento l''acconto viene restituito; entro 30 giorni viene trattenuto."}')
on conflict (key) do nothing;
