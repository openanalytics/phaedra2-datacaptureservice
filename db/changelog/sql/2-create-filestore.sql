begin;

create table if not exists datacapture.file_store
(
    id              bigserial primary key,
    store_id        text not null,
    name            text not null,
    version         integer not null,
    description     text,
    value           text,
    created_on      timestamp not null,
    created_by      text not null,
    updated_on      timestamp,
    updated_by      text,
    UNIQUE (store_id, name)
);
-- grant select, insert, update, delete on datacapture.file_store to phaedra_usr;
-- grant usage, select on sequence datacapture.file_store_id_seq to phaedra_usr;

commit;
