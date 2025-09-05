-- RLS policies for direct_messages to allow participants to read, senders to insert, and recipients to update read status

-- Enable RLS on table (safe if already enabled)
alter table if exists public.direct_messages enable row level security;

-- Allow participants (sender or recipient) to select their messages
create policy if not exists "dm_select_participants"
on public.direct_messages
for select
to authenticated
using (
  auth.uid() = sender_id
  or auth.uid() = recipient_id
);

-- Allow only the sender to insert a new message row
create policy if not exists "dm_insert_sender"
on public.direct_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
);

-- Allow only the recipient to update messages they received (e.g., set read_at)
create policy if not exists "dm_update_read_by_recipient"
on public.direct_messages
for update
to authenticated
using (
  auth.uid() = recipient_id
)
with check (
  auth.uid() = recipient_id
);
