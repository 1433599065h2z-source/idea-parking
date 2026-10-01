-- Run AFTER schema.sql. This enables permanent deletion of expired trash.
-- Uses the database clock and runs even when no browser is open.
begin;
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'idea-parking-trash-cleanup',
  '0 * * * *',
  $$delete from public.ideas
    where deleted_at <= statement_timestamp() - interval '168 hours'$$
);

select cron.alter_job(
  (select jobid from cron.job where jobname = 'idea-parking-trash-cleanup' and username = current_user),
  active := true
);
commit;

-- Running this script again updates the same named job, rather than duplicating it.
select jobid, jobname, schedule, command, active from cron.job
where jobname = 'idea-parking-trash-cleanup';
