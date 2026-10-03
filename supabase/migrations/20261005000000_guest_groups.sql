-- Guests are now organised into "groups" (קבוצות) instead of "categories"
-- (קטגוריות). GROUP is a reserved word in SQL, so the column is group_name;
-- the app maps it to the `group` field on a guest.
--
-- A rename only changes the catalog: existing values, the '' default and the
-- not-null constraint are all kept. Deploy the matching app code together
-- with this migration, since older code still reads and writes `category`.
alter table public.guests rename column category to group_name;
