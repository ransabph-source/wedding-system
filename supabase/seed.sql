-- Demo data matching the former local mocks, so existing links such as
-- /couple/mock-1 keep working. Safe to re-run: existing rows are left alone.

insert into public.events (id, couple_names, event_date, venue, guests_invited, status, phase) values
  ('mock-1', 'דניאל ותמר כהן', '2026-11-12', 'אולמי הגן הגדול', 220, 'planning', 'SETUP'),
  ('2', 'עידו ונועה לוי', '2026-10-03', 'צימר הכרם', 120, 'confirmed', 'RSVP_CAMPAIGN'),
  ('3', 'יובל ומאיה ברק', '2026-09-28', 'מלון דן תל אביב', 300, 'confirmed', 'SEATING')
on conflict (id) do nothing;

-- Every demo event starts with the same four tables and five guests.
insert into public.seating_tables (event_id, id, name, capacity, shape)
select e.id, t.id, t.name, t.capacity, t.shape
from public.events e
cross join (values
  ('table-1', 'שולחן 1', 12, 'round'),
  ('table-2', 'שולחן 2', 12, 'round'),
  ('table-3', 'שולחן 3', 12, 'square'),
  ('table-4', 'שולחן 4', 12, 'square')
) as t (id, name, capacity, shape)
where e.id in ('mock-1', '2', '3')
order by e.id, t.id
on conflict (event_id, id) do nothing;

insert into public.guests (event_id, id, name, phone, group_name, party_size, table_id, arrived, rsvp_status, contact_count)
select e.id, g.id, g.name, g.phone, g.group_name, g.party_size, g.table_id, g.arrived, 'confirmed', g.contact_count
from public.events e
cross join (values
  ('demo-guest-1', 'משפחת אברהמי', '050-1234567', 'משפחה', 4, 'table-1', false, 1),
  ('demo-guest-2', 'רועי ודנה שמעוני', '052-2345678', 'חברים', 2, 'table-2', true, 2),
  ('demo-guest-3', 'אלון פרץ', '054-3456789', 'עבודה', 1, 'table-3', false, 1),
  ('demo-guest-4', 'משפחת גולדברג', '053-4567890', 'משפחה', 5, 'table-1', true, 1),
  ('demo-guest-5', 'מאיה כספי', '058-5678901', 'חברים', 1, 'table-4', false, 3)
) as g (id, name, phone, group_name, party_size, table_id, arrived, contact_count)
where e.id in ('mock-1', '2', '3')
order by e.id, g.id
on conflict (event_id, id) do nothing;
