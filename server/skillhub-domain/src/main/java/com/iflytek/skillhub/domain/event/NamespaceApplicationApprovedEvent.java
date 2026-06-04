package com.iflytek.skillhub.domain.event;

public record NamespaceApplicationApprovedEvent(
        Long applicationId,
        String slug,
        String displayName,
        String applicantId,
        String reviewerId
) {}
