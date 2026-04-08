BEGIN;

-- =========================================================
-- 1) Create emergency backup copies of current production history tables
-- =========================================================

CREATE TABLE model_stage_backup_legacy
(
    LIKE model_stage INCLUDING ALL
);

INSERT INTO model_stage_backup_legacy
SELECT *
FROM model_stage;

CREATE TABLE model_status_backup_legacy
(
    LIKE model_status INCLUDING ALL
);

INSERT INTO model_status_backup_legacy
SELECT *
FROM model_status;


-- =========================================================
-- 2) Rename current production history tables to source tables
-- =========================================================

ALTER TABLE model_stage
    RENAME TO model_stage_source;

ALTER TABLE model_status
    RENAME TO model_status_source;


-- =========================================================
-- 3) Bring source tables to the agreed contract
-- =========================================================

ALTER TABLE model_stage_source
    ADD COLUMN source_system varchar(255) NOT NULL DEFAULT 'Camunda';

ALTER TABLE model_stage_source
    ALTER COLUMN model_id TYPE varchar(4000),
    ALTER COLUMN stage TYPE varchar(4000),
    ALTER COLUMN effective_from TYPE timestamp USING effective_from::timestamp,
    ALTER COLUMN effective_to TYPE timestamp USING effective_to::timestamp,
    ALTER COLUMN model_id SET NOT NULL,
    ALTER COLUMN stage SET NOT NULL,
    ALTER COLUMN effective_from SET NOT NULL,
    ALTER COLUMN effective_to SET NOT NULL,
    ALTER COLUMN source_system SET DEFAULT 'Camunda',
    ALTER COLUMN source_system SET NOT NULL;

ALTER TABLE model_stage_source
    ADD CONSTRAINT model_stage_source_effective_chk
        CHECK (effective_from <= effective_to);

CREATE INDEX model_stage_source_model_id_idx
    ON model_stage_source (model_id);


ALTER TABLE model_status_source
    ADD COLUMN source_system varchar(255) NOT NULL DEFAULT 'Camunda';

ALTER TABLE model_status_source
    ALTER COLUMN model_id TYPE varchar(4000),
    ALTER COLUMN status TYPE varchar(4000),
    ALTER COLUMN effective_from TYPE timestamp USING effective_from::timestamp,
    ALTER COLUMN effective_to TYPE timestamp USING effective_to::timestamp,
    ALTER COLUMN model_id SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN effective_from SET NOT NULL,
    ALTER COLUMN effective_to SET NOT NULL,
    ALTER COLUMN source_system SET DEFAULT 'Camunda',
    ALTER COLUMN source_system SET NOT NULL;

ALTER TABLE model_status_source
    ADD CONSTRAINT model_status_source_effective_chk
        CHECK (effective_from <= effective_to);

CREATE INDEX model_status_source_model_id_idx
    ON model_status_source (model_id);


-- =========================================================
-- 4) Mirror source changes to emergency backup legacy tables
-- =========================================================

CREATE OR REPLACE FUNCTION mirror_model_stage_source_to_backup_legacy()
    RETURNS trigger
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO model_stage_backup_legacy (
            id,
            model_id,
            stage,
            effective_from,
            effective_to
        )
        VALUES (
            NEW.id,
            NEW.model_id,
            NEW.stage,
            NEW.effective_from,
            NEW.effective_to
        );

        RETURN NULL;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE model_stage_backup_legacy
        SET model_id = NEW.model_id,
            stage = NEW.stage,
            effective_from = NEW.effective_from,
            effective_to = NEW.effective_to
        WHERE id = NEW.id;

        RETURN NULL;
    END IF;

    DELETE
    FROM model_stage_backup_legacy
    WHERE id = OLD.id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mirror_model_stage_source_to_backup_legacy
    AFTER INSERT OR UPDATE OR DELETE
    ON model_stage_source
    FOR EACH ROW
EXECUTE FUNCTION mirror_model_stage_source_to_backup_legacy();

CREATE OR REPLACE FUNCTION mirror_model_status_source_to_backup_legacy()
    RETURNS trigger
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO model_status_backup_legacy (
            id,
            model_id,
            status,
            effective_from,
            effective_to
        )
        VALUES (
            NEW.id,
            NEW.model_id,
            NEW.status,
            NEW.effective_from,
            NEW.effective_to
        );

        RETURN NULL;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE model_status_backup_legacy
        SET model_id = NEW.model_id,
            status = NEW.status,
            effective_from = NEW.effective_from,
            effective_to = NEW.effective_to
        WHERE id = NEW.id;

        RETURN NULL;
    END IF;

    DELETE
    FROM model_status_backup_legacy
    WHERE id = OLD.id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mirror_model_status_source_to_backup_legacy
    AFTER INSERT OR UPDATE OR DELETE
    ON model_status_source
    FOR EACH ROW
EXECUTE FUNCTION mirror_model_status_source_to_backup_legacy();


-- =========================================================
-- 5) Override tables
-- =========================================================

CREATE TABLE model_stage_override
(
    id                serial PRIMARY KEY,
    model_id          varchar(4000) NOT NULL,
    source_record_id  integer       NULL,
    stage             varchar(4000) NOT NULL,
    effective_from    timestamp     NOT NULL,
    effective_to      timestamp     NOT NULL,
    correction_reason text          NOT NULL,
    is_final_override boolean       NOT NULL DEFAULT false,
    author            varchar(4000) NULL,
    created_at        timestamp     NOT NULL,
    updated_at        timestamp     NOT NULL,
    CONSTRAINT model_stage_override_effective_chk
        CHECK (effective_from <= effective_to)
);

CREATE INDEX model_stage_override_model_id_idx
    ON model_stage_override (model_id);

CREATE INDEX model_stage_override_source_record_id_idx
    ON model_stage_override (source_record_id);


CREATE TABLE model_status_override
(
    id                serial PRIMARY KEY,
    model_id          varchar(4000) NOT NULL,
    source_record_id  integer       NULL,
    status            varchar(4000) NOT NULL,
    effective_from    timestamp     NOT NULL,
    effective_to      timestamp     NOT NULL,
    correction_reason text          NOT NULL,
    is_final_override boolean       NOT NULL DEFAULT false,
    author            varchar(4000) NULL,
    created_at        timestamp     NOT NULL,
    updated_at        timestamp     NOT NULL,
    CONSTRAINT model_status_override_effective_chk
        CHECK (effective_from <= effective_to)
);

CREATE INDEX model_status_override_model_id_idx
    ON model_status_override (model_id);

CREATE INDEX model_status_override_source_record_id_idx
    ON model_status_override (source_record_id);


-- =========================================================
-- 6) Final resolved tables
-- =========================================================

CREATE TABLE model_stage
(
    id                 serial PRIMARY KEY,
    model_id           varchar(4000) NOT NULL,
    stage              varchar(4000) NOT NULL,
    effective_from     timestamp     NOT NULL,
    effective_to       timestamp     NOT NULL,
    source_record_id   integer       NULL,
    override_record_id integer       NULL,
    source_table       varchar(255)  NOT NULL,
    calculated_at      timestamp     NOT NULL,
    last_event         jsonb         NULL,
    CONSTRAINT model_stage_effective_chk
        CHECK (effective_from <= effective_to),
    CONSTRAINT model_stage_source_table_chk
        CHECK (source_table IN ('model_stage_source', 'model_stage_override'))
);

CREATE INDEX model_stage_model_id_idx
    ON model_stage (model_id);

CREATE INDEX model_stage_source_record_id_idx
    ON model_stage (source_record_id);

CREATE INDEX model_stage_override_record_id_idx
    ON model_stage (override_record_id);


CREATE TABLE model_status
(
    id                 serial PRIMARY KEY,
    model_id           varchar(4000) NOT NULL,
    status             varchar(4000) NOT NULL,
    effective_from     timestamp     NOT NULL,
    effective_to       timestamp     NOT NULL,
    source_record_id   integer       NULL,
    override_record_id integer       NULL,
    source_table       varchar(255)  NOT NULL,
    calculated_at      timestamp     NOT NULL,
    last_event         jsonb         NULL,
    CONSTRAINT model_status_effective_chk
        CHECK (effective_from <= effective_to),
    CONSTRAINT model_status_source_table_chk
        CHECK (source_table IN ('model_status_source', 'model_status_override'))
);

CREATE INDEX model_status_model_id_idx
    ON model_status (model_id);

CREATE INDEX model_status_source_record_id_idx
    ON model_status (source_record_id);

CREATE INDEX model_status_override_record_id_idx
    ON model_status (override_record_id);


-- =========================================================
-- 7) Queue table
-- =========================================================

CREATE TABLE model_recalc_queue
(
    model_id        varchar(4000) PRIMARY KEY,
    updated_at      timestamp     NOT NULL,
    sources         text[]        NOT NULL,
    last_event      jsonb         NULL,
    attempts        integer       NOT NULL DEFAULT 0,
    last_error      text          NULL,
    last_error_at   timestamp     NULL,
    next_attempt_at timestamp     NULL
);

CREATE INDEX model_recalc_queue_pick_idx
    ON model_recalc_queue (next_attempt_at, updated_at);


-- =========================================================
-- 8) Enqueue function
-- =========================================================

CREATE OR REPLACE FUNCTION enqueue_model_recalc()
    RETURNS trigger
    LANGUAGE plpgsql
AS
$$
DECLARE
    v_model_id      varchar(4000);
    v_row_id        integer;
    v_source_system varchar(255);
    v_event         jsonb;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_model_id := OLD.model_id;
        v_row_id := OLD.id;
    ELSE
        v_model_id := NEW.model_id;
        v_row_id := NEW.id;
    END IF;

    IF TG_TABLE_NAME IN ('model_stage_source', 'model_status_source') THEN
        IF TG_OP = 'DELETE' THEN
            v_source_system := OLD.source_system;
        ELSE
            v_source_system := NEW.source_system;
        END IF;
    ELSE
        v_source_system := NULL;
    END IF;

    v_event := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'at', now(),
        'row_id', v_row_id,
        'model_id', v_model_id,
        'source_system', v_source_system
    );

    INSERT INTO model_recalc_queue (
        model_id,
        updated_at,
        sources,
        last_event
    )
    VALUES (
        v_model_id,
        now(),
        ARRAY[TG_TABLE_NAME]::text[],
        v_event
    )
    ON CONFLICT (model_id) DO UPDATE
        SET updated_at = EXCLUDED.updated_at,
            sources = (
                SELECT array_agg(DISTINCT source_name)
                FROM unnest(model_recalc_queue.sources || EXCLUDED.sources) AS merged(source_name)
            ),
            last_event = EXCLUDED.last_event,
            next_attempt_at = NULL,
            last_error = NULL,
            last_error_at = NULL;

    PERFORM pg_notify('model_recalc', v_model_id);

    RETURN NULL;
END;
$$;


-- =========================================================
-- 9) Triggers on source and override tables
-- =========================================================

CREATE TRIGGER trg_enqueue_model_recalc_model_stage_source
    AFTER INSERT OR UPDATE OR DELETE
    ON model_stage_source
    FOR EACH ROW
EXECUTE FUNCTION enqueue_model_recalc();

CREATE TRIGGER trg_enqueue_model_recalc_model_status_source
    AFTER INSERT OR UPDATE OR DELETE
    ON model_status_source
    FOR EACH ROW
EXECUTE FUNCTION enqueue_model_recalc();

CREATE TRIGGER trg_enqueue_model_recalc_model_stage_override
    AFTER INSERT OR UPDATE OR DELETE
    ON model_stage_override
    FOR EACH ROW
EXECUTE FUNCTION enqueue_model_recalc();

CREATE TRIGGER trg_enqueue_model_recalc_model_status_override
    AFTER INSERT OR UPDATE OR DELETE
    ON model_status_override
    FOR EACH ROW
EXECUTE FUNCTION enqueue_model_recalc();


-- =========================================================
-- 10) Initial backfill from source tables to final tables
-- =========================================================

INSERT INTO model_stage (
    model_id,
    stage,
    effective_from,
    effective_to,
    source_record_id,
    override_record_id,
    source_table,
    calculated_at,
    last_event
)
SELECT
    s.model_id,
    s.stage,
    s.effective_from,
    s.effective_to,
    s.id AS source_record_id,
    NULL::integer AS override_record_id,
    'model_stage_source' AS source_table,
    now() AS calculated_at,
    jsonb_build_object(
        'table', 'model_stage_source',
        'op', 'BACKFILL',
        'at', now(),
        'row_id', s.id,
        'model_id', s.model_id,
        'source_system', s.source_system
    ) AS last_event
FROM model_stage_source s;

INSERT INTO model_status (
    model_id,
    status,
    effective_from,
    effective_to,
    source_record_id,
    override_record_id,
    source_table,
    calculated_at,
    last_event
)
SELECT
    s.model_id,
    s.status,
    s.effective_from,
    s.effective_to,
    s.id AS source_record_id,
    NULL::integer AS override_record_id,
    'model_status_source' AS source_table,
    now() AS calculated_at,
    jsonb_build_object(
        'table', 'model_status_source',
        'op', 'BACKFILL',
        'at', now(),
        'row_id', s.id,
        'model_id', s.model_id,
        'source_system', s.source_system
    ) AS last_event
FROM model_status_source s;

COMMIT;
