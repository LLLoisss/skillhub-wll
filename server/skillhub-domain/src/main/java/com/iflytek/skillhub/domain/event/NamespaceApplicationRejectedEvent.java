package com.iflytek.skillhub.domain.event;

public record NamespaceApplicationRejectedEvent(
        Long applicationId,
        String slug,
        String displayName,
        String applicantId,
        String reviewerId,
        String comment
) {}
