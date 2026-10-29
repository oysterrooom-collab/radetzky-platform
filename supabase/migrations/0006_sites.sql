-- 0006 · Contenuti dei siti pubblici: menù, formule, avvisi, orari. Li legge il pubblico (anon), li modificano admin e supervisor del locale.

create table public.site_menu (
  id          uuid primary key default gen_random_uuid(),
  site        text not null check (site in ('oyster', 'radetzky', 'formule')),
  section     text not null check (length(trim(section)) > 0),
  name        text not null check (length(trim(name)) > 0),
  description text not null default '',
  price       text not null default '',
  tag         text not null default '',
  visible     boolean not null default true,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);
create index on public.site_menu (site, sort);
create trigger touch before update on public.site_menu for each row execute function private.touch();

create table public.site_info (
  key   text primary key check (key in ('oyster_avviso', 'radetzky_avviso', 'oyster_lun', 'oyster_mar', 'oyster_mer', 'oyster_gio', 'oyster_ven', 'oyster_sab', 'oyster_dom')),
  value text not null default '' check (length(value) <= 200)
);

-- Locale a cui appartiene un contenuto: oyster → Oysteroom; radetzky e formule → Radetzky
create or replace function private.site_venue(site text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.venues where slug = case when site = 'oyster' then 'oysteroom' else 'radetzky' end
$$;
grant execute on function private.site_venue(text) to authenticated;
create or replace function private.can_edit_site(site text) returns boolean
language sql stable as $$ select private.has_role(private.site_venue(site), '{admin,supervisor}') $$;
grant execute on function private.can_edit_site(text) to authenticated;

alter table public.site_menu enable row level security;
alter table public.site_info enable row level security;
create policy pub on public.site_menu for select to anon using (visible);
create policy sel on public.site_menu for select to authenticated using (visible or private.can_edit_site(site));
create policy wr  on public.site_menu for all to authenticated using (private.can_edit_site(site)) with check (private.can_edit_site(site));
create policy pub on public.site_info for select to anon, authenticated using (true);
create policy wr  on public.site_info for update to authenticated
  using (private.can_edit_site(split_part(key, '_', 1))) with check (private.can_edit_site(split_part(key, '_', 1)));
revoke insert, update, delete on public.site_menu, public.site_info from anon;

create trigger audit after insert or update or delete on public.site_menu for each row execute function private.audit();
create trigger audit after insert or update or delete on public.site_info for each row execute function private.audit();

-- Contenuti attuali dei siti (dal foglio Google)
insert into public.site_menu (site, section, name, description, price, tag, visible, sort) values
  ('oyster','Ostriche','Cocktail Gamen','Normandia. Piccola, sapida, intensa. Minimo 3 pezzi.','2,50','',true,10),
  ('oyster','Ostriche','Spéciale de Claire','Marennes-Oléron. Affinata due mesi nelle claire, delicata e versatile.','5,50','',true,20),
  ('oyster','Ostriche','Palmaria','Golfo della Spezia. Sapida, iodata, la nostra italiana.','6,50','Italia',true,30),
  ('oyster','Ostriche','Petit Gillardeau','Marennes-Oléron. La più famosa di Francia, carnosa e croccante.','','Grand cru',true,40),
  ('oyster','Ostriche','Premium Le Gall','Irlanda, affinata in Bretagna. Sapida con una base dolce.','7,00','',true,50),
  ('oyster','Ostriche','Henri IV','Normandia, tra Granville e Utah Beach. Minerale.','7,00','',true,60),
  ('oyster','Ostriche','Ostrica di Setúbal','Portogallo. Carnosa e delicata.','8,00','',true,70),
  ('oyster','Ostriche','Verde di Marennes-Oléron','Nuova Aquitania. Branchie verdi per un''alga, nota quasi erborinata.','9,00','Firma',true,80),
  ('oyster','Nudi e crudi','Gambero rosso di Mazara','Al pezzo, crudo.','6,50','',true,90),
  ('oyster','Nudi e crudi','Scampo','Al pezzo, crudo.','6,50','',true,100),
  ('oyster','Nudi e crudi','Tartare di gambero rosso','50 g','16,00','',true,110),
  ('oyster','Nudi e crudi','Tartare di scampi','50 g','16,00','',true,120),
  ('oyster','Nudi e crudi','Tartare di ricciola','50 g','16,00','',true,130),
  ('oyster','Nudi e crudi','Tartare di salmone','50 g','14,50','',true,140),
  ('oyster','Nudi e crudi','Tartare di tonno rosso ikejime','Tonno abbattuto con la tecnica giapponese ikejime.','','',true,150),
  ('oyster','Crudi with a twist','Carpaccio di gambero rosso','Crema di bufala, salicornia, datterini semidry, panura al basilico, pinoli tostati. 60 g','18,00','',true,160),
  ('oyster','Crudi with a twist','Battuto di ricciola','Dressing di barbabietola, emulsione di scalogno arrostito e lime. 50 g','18,00','',true,170),
  ('oyster','Crudi with a twist','Carpaccio di scampi','Hummus di carote, passion fruit, fiori di borragine. 60 g','18,00','',true,180),
  ('oyster','Street food di mare','Lobster roll','Il classico del New England, rifatto dallo chef Fabio Di Martino.','','Chef',true,190),
  ('oyster','Street food di mare','Sandwich al caviale','Pane morbido, burro, caviale.','','Chef',true,200),
  ('oyster','Street food di mare','Ostriche fritte o gratinate','Per chi l''ostrica la vuole calda.','','',true,210),
  ('oyster','Street food di mare','Plateau Oysteroom','Ostriche miste e crudi, da dividere. Su richiesta.','','',true,220),
  ('oyster','Street food di mare','Degustazione di 5 ostriche','Cinque varietà in sequenza, dalla più sapida alla più dolce.','≈ 35 €','',true,230),
  ('oyster','Da portare a casa','Ostriche aperte o chiuse','Tutte le varietà del banco, con ghiaccio e coltello.','','',true,240),
  ('oyster','Da portare a casa','Caviale','Selezione al grammo.','','',true,250),
  ('oyster','Da portare a casa','Acciughe e salmone','Delicatessen di mare selezionate.','','',true,260),
  ('oyster','Da portare a casa','Tartare e crudi','Preparati al momento, confezionati per l''asporto.','','',true,270),
  ('radetzky','Colazione','Caffetteria','Espresso, cappuccino, tè e infusi dal banco del bar.','','',true,10),
  ('radetzky','Colazione','Torte fatte in casa','Le torte del Radetzky, preparate ogni giorno.','','',true,20),
  ('radetzky','Colazione','Spremute e centrifughe','','','',true,30),
  ('radetzky','Brunch','Radetzky Breakfast','Una bevanda della caffetteria, pane burro e marmellata, affettati e formaggi, spremuta o succo, un uovo.','','',true,40),
  ('radetzky','Brunch','Omelette','Al momento, con le farciture del giorno.','','',true,50),
  ('radetzky','Brunch','Uova in più modi','Strapazzate, in camicia, alla benedict.','','',true,60),
  ('radetzky','Pranzo','Insalate e piatti freddi','Per la pausa veloce in Corso Garibaldi.','','',true,70),
  ('radetzky','Pranzo','Panini speciali e toast','Il pranzo milanese al banco.','','',true,80),
  ('radetzky','Pranzo','Piatti di carne','La proposta più completa della cucina.','','',true,90),
  ('radetzky','Pranzo','Piatti di pesce','In carta secondo il pescato.','','',true,100),
  ('radetzky','Aperitivo','Spritz, Negroni, Americano','I classici del bar dal 1988.','','',true,110),
  ('radetzky','Aperitivo','Long drink e calici','Bollicine, bianchi, rosé.','','',true,120),
  ('radetzky','Aperitivo','Stuzzichini al tavolo','Focaccia fresca, patatine fritte al momento, olive: il rito del Radetzky.','','',true,130),
  ('formule','Aperitivo Radetzky','Spritz, Negroni, Americano','bar con bartender','','',true,10),
  ('formule','Aperitivo Radetzky','Bollicine e calici di bianco','','','',true,20),
  ('formule','Aperitivo Radetzky','Focaccia, chips, olive','il buffet classico dell''aperitivo','','',true,30),
  ('formule','Aperitivo Radetzky','Mondeghili','polpettine milanesi','','',true,40),
  ('formule','Aperitivo Radetzky','Mini panini e tramezzini','','','',true,50),
  ('formule','Aperitivo Radetzky','Verdure in pinzimonio','','','',true,60),
  ('formule','Oyster & Bubbles','3 varietà di ostriche','aperte al momento','','',true,70),
  ('formule','Oyster & Bubbles','Gambero rosso e scampo crudi','','','',true,80),
  ('formule','Oyster & Bubbles','Tartare di ricciola e salmone','','','',true,90),
  ('formule','Oyster & Bubbles','Lobster roll finger','dello chef Fabio Di Martino','','',true,100),
  ('formule','Oyster & Bubbles','Sandwich al caviale','','','',true,110),
  ('formule','Oyster & Bubbles','Champagne o Franciacorta','','','',true,120),
  ('formule','Cocktail dinatoire','Isola di crudi','','','',true,130),
  ('formule','Cocktail dinatoire','Risotto alla milanese in cocotte','','','',true,140),
  ('formule','Cocktail dinatoire','Mondeghili e cotoletta bite','','','',true,150),
  ('formule','Cocktail dinatoire','Carpaccio di gambero rosso','bufala e basilico','','',true,160),
  ('formule','Cocktail dinatoire','Selezione di formaggi lombardi','','','',true,170),
  ('formule','Cocktail dinatoire','Piccola pasticceria','e torta su richiesta','','',true,180),
  ('formule','Brunch Radetzky','Uova in tre modi','benedict, strapazzate, in camicia','','',true,190),
  ('formule','Brunch Radetzky','Pancake e granola','','','',true,200),
  ('formule','Brunch Radetzky','Salmone affumicato e avocado toast','','','',true,210),
  ('formule','Brunch Radetzky','Torte fatte in casa','come al bar','','',true,220),
  ('formule','Brunch Radetzky','Centrifughe e caffetteria','','','',true,230),
  ('formule','Brunch Radetzky','Mimosa e Bellini','','','',true,240);
insert into public.site_info (key, value) values
  ('oyster_avviso', 'Ogni mercoledì è Happy Oyster: chiedi al banco.'), ('radetzky_avviso', ''),
  ('oyster_lun', '17-23'), ('oyster_mar', '17-23'), ('oyster_mer', '17-23'), ('oyster_gio', '17-23'),
  ('oyster_ven', '17-23'), ('oyster_sab', '11-23'), ('oyster_dom', '11-23');
