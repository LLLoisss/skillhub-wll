package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.domain.namespace.NamespaceApplication;

import java.time.Instant;

/**
 * Summary DTO for a namespace application in the admin review list.
 *
 * <p>Field names intentionally match the frontend {@code NamespaceApplicationItem} interface
 * so Jackson serialization produces the correct JSON property names.
 *
 * @param id            application ID
 * @param slug          requested namespace slug
 * @param displayName   requested display name
 * @param description   optional description
 * @param applicantId   user ID of the applicant
 * @param applicantName display name of the applicant (resolved at query time)
 * @param status        PENDING | APPROVED | REJECTED
 * @param reviewerId    admin who reviewed (null while pending)
 * @param reviewerName  reviewer display name (null while pending)
 * @param reviewComment rejection or approval comment
 * @param appliedAt     when the application was submitted
 * @param reviewedAt    when the review was performed (null while pending)
 */
public record NamespaceApplicationResponse(
        Long id,
        String slug,
        String displayName,
        String description,
        String applicantId,
        String applicantName,
        String status,
        String reviewerId,
        String reviewerName,
        String reviewComment,
        Instant appliedAt,
        Instant reviewedAt
) {
    /** Build a response from the entity plus resolved user display names. */
    public static NamespaceApplicationResponse from(NamespaceApplication application,
                                                    String applicantName,
                                                    String reviewerName) {
        return new NamespaceApplicationResponse(
                application.getId(),
                application.getSlug(),
                application.getDisplayName(),
                application.getDescription(),
                application.getApplicantId(),
                applicantName,
                application.getStatus().name(),
                application.getReviewerId(),
                reviewerName,
                application.getReviewComment(),
                application.getAppliedAt(),
                application.getReviewedAt()
        );
    }
}
