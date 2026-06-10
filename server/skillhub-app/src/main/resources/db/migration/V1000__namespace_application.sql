-- V40: namespace application table for Plan B (non-admin users apply for namespaces)
CREATE TABLE namespace_application (
    id             BIGSERIAL    PRIMARY KEY,
    slug           VARCHAR(64)  NOT NULL,
    display_name   VARCHAR(128) NOT NULL,
    description    TEXT,
    applicant_id   VARCHAR(128) NOT NULL,
    status         VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    reviewer_id    VARCHAR(128),
    review_comment TEXT,
    applied_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_at    TIMESTAMPTZ,
    namespace_id   BIGINT       
);

CREATE INDEX idx_ns_application_applicant ON namespace_application(applicant_id);
CREATE INDEX idx_ns_application_status    ON namespace_application(status);
CREATE INDEX idx_ns_application_slug      ON namespace_application(slug);
