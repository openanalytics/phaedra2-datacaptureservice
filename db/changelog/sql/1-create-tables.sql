begin;

create schema if not exists datacapture;
-- grant usage on schema datacapture to phaedra_usr;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'capture_job_status') then
        create type datacapture.capture_job_status as enum ('Submitted', 'Running', 'Cancelled', 'Error', 'Completed');
    end if;
end
$$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'capture_job_event_type') then
        create type datacapture.capture_job_event_type as enum ('Info', 'Warning', 'Error');
    end if;
end
$$;

create table if not exists datacapture.capture_job
(
    id              bigserial primary key,
    create_date     timestamp not null,
    created_by      text not null,
    source_path     text not null,
    capture_config  jsonb not null,
    status_code     datacapture.capture_job_status not null,
    status_message  text
);
-- grant select, insert, update, delete on datacapture.capture_job to phaedra_usr;
-- grant usage, select on sequence datacapture.capture_job_id_seq to phaedra_usr;

create table if not exists datacapture.capture_job_event
(
    job_id          bigint not null references datacapture.capture_job (id),
    event_date      timestamp not null,
    event_type      datacapture.capture_job_event_type not null,
    event_details   text
);
-- grant select, insert, update, delete on datacapture.capture_job_event to phaedra_usr;

create table if not exists datacapture.scan_job
(
    id              bigserial primary key,
    schedule        varchar(100),
    scanner_type    varchar(100),
    label           varchar(100),
    description     varchar(1000),
    scan_job_config  jsonb not null,
    created_on      timestamp not null,
    created_by      text not null,
    updated_on      timestamp,
    updated_by      text
);
-- grant select, insert, update, delete on datacapture.scan_job to phaedra_usr;
-- grant usage, select on sequence datacapture.scan_job_id_seq to phaedra_usr;

commit;
