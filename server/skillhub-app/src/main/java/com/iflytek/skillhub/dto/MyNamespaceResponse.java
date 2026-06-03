package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.namespace.NamespaceAccessPolicy;
import com.iflytek.skillhub.domain.namespace.NamespaceApplication;
import com.iflytek.skillhub.domain.namespace.NamespaceRole;
import com.iflytek.skillhub.domain.namespace.NamespaceType;

import java.time.Instant;

public record MyNamespaceResponse(
        Long id,
        String slug,
        String displayName,
        String status,
        String description,
        NamespaceType type,
        String avatarUrl,
        String createdBy,
        Instant createdAt,
        Instant updatedAt,
        NamespaceRole currentUserRole,
        boolean immutable,
        boolean canFreeze,
        boolean canUnfreeze,
        boolean canArchive,
        boolean canRestore
) {
    public static MyNamespaceResponse from(Namespace namespace,
                                           NamespaceRole currentUserRole,
                                           NamespaceAccessPolicy accessPolicy) {
        return new MyNamespaceResponse(
                namespace.getId(),
                namespace.getSlug(),
                namespace.getDisplayName(),
                namespace.getStatus().name(),
                namespace.getDescription(),
                namespace.getType(),
                namespace.getAvatarUrl(),
                namespace.getCreatedBy(),
                namespace.getCreatedAt(),
                namespace.getUpdatedAt(),
                currentUserRole,
                accessPolicy.isImmutable(namespace),
                accessPolicy.canFreeze(namespace, currentUserRole),
                accessPolicy.canUnfreeze(namespace, currentUserRole),
                accessPolicy.canArchive(namespace, currentUserRole),
                accessPolicy.canRestore(namespace, currentUserRole)
        );
    }

    /**
     * Build a synthetic response for a PENDING namespace application.
     *
     * <p>The status is set to {@code "PENDING_REVIEW"} and all capability
     * flags are {@code false}, so the frontend card is non-interactive.
     */
    public static MyNamespaceResponse fromPendingApplication(NamespaceApplication application) {
        return new MyNamespaceResponse(
                application.getId(),
                application.getSlug(),
                application.getDisplayName(),
                "PENDING_REVIEW",
                application.getDescription(),
                NamespaceType.TEAM,
                null,
                application.getApplicantId(),
                application.getAppliedAt(),
                application.getAppliedAt(),
                null,
                false, false, false, false, false
        );
    }

        /**
         * Build a synthetic response for a REJECTED namespace application.
         *
         * <p>The status is set to {@code "REJECTED"} and all capability flags
         * are {@code false}, so the frontend can render this as a read-only card.
         */
        public static MyNamespaceResponse fromRejectedApplication(NamespaceApplication application) {
                return new MyNamespaceResponse(
                                application.getId(),
                                application.getSlug(),
                                application.getDisplayName(),
                                "REJECTED",
                                application.getDescription(),
                                NamespaceType.TEAM,
                                null,
                                application.getApplicantId(),
                                application.getAppliedAt(),
                                application.getReviewedAt() != null ? application.getReviewedAt() : application.getAppliedAt(),
                                null,
                                false, false, false, false, false
                );
        }
}
