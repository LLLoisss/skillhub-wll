package com.iflytek.skillhub.domain.event;

public record NamespaceApplicationSubmittedEvent(
        Long applicationId,
        String slug,
        String displayName,
        String applicantId
) {}
