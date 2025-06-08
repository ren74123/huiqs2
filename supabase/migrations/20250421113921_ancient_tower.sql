-- Create the id-cards bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('id-cards', 'id-cards', false)
on conflict (id) do nothing;

-- Policy to allow authenticated users to upload files
create policy "Allow authenticated users to upload files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'id-cards' AND
  auth.role() = 'authenticated'
);

-- Policy to allow file owners to read their own files
create policy "Allow users to read their own files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'id-cards' AND
  (
    -- Allow users to access their own files
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Allow agents to access files for their orders
    exists (
      select 1 
      from orders o
      join travel_packages tp on o.package_id = tp.id
      where 
        tp.agent_id = auth.uid() AND
        o.id::text = (storage.foldername(name))[2]
    )
  )
);

-- Policy to allow file owners to delete their own files
create policy "Allow users to delete their own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'id-cards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);