package com.iflytek.skillhub.domain.namespace;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Represents a user-submitted application to create a new namespace.
 *
 * <p>Non-admin users cannot create namespaces directly; instead they submit
 * an application that goes through admin review (Plan B approach). On approval
 * the actual {@link Namespace} is created and linked via {@code namespaceId}.
 */
@Entity
@Table(name = "namespace_application")
public class NamespaceApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Requested slug for the namespace. */
    @Column(nullable = false, length = 64)
    private String slug;

    /** Requested display name. */
    @Column(name = "display_name", nullable = false, length = 128)
    private String displayName;

    /** Optional description provided by the applicant. */
    @Column
    private String description;

    /** User ID of the applicant. */
    @Column(name = "applicant_id", nullable = false, length = 128)
    private String applicantId;

    /** Current review status. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private NamespaceApplicationStatus status = NamespaceApplicationStatus.PENDING;

    /** User ID of the admin who reviewed this application. */
    @Column(name = "reviewer_id", length = 128)
    private String reviewerId;

    /** Comment left by the reviewer (required when rejecting). */
    @Column(name = "review_comment")
    private String reviewComment;

    /** Timestamp when the application was submitted. */
    @Column(name = "applied_at", nullable = false, updatable = false)
    private Instant appliedAt;

    /** Timestamp when the review was performed. */
    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** ID of the created namespace after approval. Null while PENDING or REJECTED. */
    @Column(name = "namespace_id")
    private Long namespaceId;

    protected NamespaceApplication() {}

    public NamespaceApplication(String slug, String displayName, String description, String applicantId) {
        this.slug = slug;
        this.displayName = displayName;
        this.description = description;
        this.applicantId = applicantId;
        this.appliedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public String getDisplayName() { return displayName; }
    public String getDescription() { return description; }
    public String getApplicantId() { return applicantId; }
    public NamespaceApplicationStatus getStatus() { return status; }
    public String getReviewerId() { return reviewerId; }
    public String getReviewComment() { return reviewComment; }
    public Instant getAppliedAt() { return appliedAt; }
    public Instant getReviewedAt() { return reviewedAt; }
    public Long getNamespaceId() { return namespaceId; }

    public void setStatus(NamespaceApplicationStatus status) { this.status = status; }
    public void setReviewerId(String reviewerId) { this.reviewerId = reviewerId; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
    public void setNamespaceId(Long namespaceId) { this.namespaceId = namespaceId; }
}
