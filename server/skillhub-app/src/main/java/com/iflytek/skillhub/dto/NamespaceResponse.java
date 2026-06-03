package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.namespace.NamespaceApplication;
import com.iflytek.skillhub.domain.namespace.NamespaceType;

import java.time.Instant;

public record NamespaceResponse(
        Long id,
        String slug,
        String displayName,
        String status,
        String description,
        NamespaceType type,
        String avatarUrl,
        String createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static NamespaceResponse from(Namespace namespace) {
        return new NamespaceResponse(
                namespace.getId(),
                namespace.getSlug(),
                namespace.getDisplayName(),
                namespace.getStatus().name(),
                namespace.getDescription(),
                namespace.getType(),
                namespace.getAvatarUrl(),
                namespace.getCreatedBy(),
                namespace.getCreatedAt(),
                namespace.getUpdatedAt()
        );
    }

    /** Build a response for a pending namespace application (status = PENDING_REVIEW). */
    public static NamespaceResponse fromApplication(NamespaceApplication application) {
        return new NamespaceResponse(
                application.getId(),
                application.getSlug(),
                application.getDisplayName(),
                "PENDING_REVIEW",
                application.getDescription(),
                NamespaceType.TEAM,
                null,
                application.getApplicantId(),
                application.getAppliedAt(),
                application.getAppliedAt()
        );
    }
}
