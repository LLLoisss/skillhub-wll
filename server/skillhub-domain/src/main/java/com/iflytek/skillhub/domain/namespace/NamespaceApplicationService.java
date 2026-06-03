package com.iflytek.skillhub.domain.namespace;

import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.domain.shared.exception.DomainNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Domain service for the namespace application workflow.
 *
 * <p>Non-admin users submit an application ({@link #apply}); admins
 * then {@link #approve} (which creates the actual namespace) or
 * {@link #reject} with a mandatory comment.
 */
@Service
public class NamespaceApplicationService {

    private final NamespaceApplicationRepository applicationRepository;
    private final NamespaceRepository namespaceRepository;
    private final NamespaceService namespaceService;

    public NamespaceApplicationService(NamespaceApplicationRepository applicationRepository,
                                       NamespaceRepository namespaceRepository,
                                       NamespaceService namespaceService) {
        this.applicationRepository = applicationRepository;
        this.namespaceRepository = namespaceRepository;
        this.namespaceService = namespaceService;
    }

    /**
     * Submit a new namespace application.
     *
     * <p>Validates the slug format, checks that the slug is not already taken,
     * and that the user has no existing PENDING application for the same slug.
     *
     * @param slug        requested namespace slug
     * @param displayName requested display name
     * @param description optional description
     * @param applicantId user ID of the applicant
     * @return the persisted application
     */
    @Transactional
    public NamespaceApplication apply(String slug, String displayName, String description,
                                      String applicantId) {
        SlugValidator.validate(slug);

        if (namespaceRepository.findBySlug(slug).isPresent()) {
            throw new DomainBadRequestException("error.namespace.slug.exists", slug);
        }

        if (applicationRepository.existsBySlugAndStatus(slug, NamespaceApplicationStatus.PENDING)) {
            throw new DomainBadRequestException("error.namespace.application.alreadyPending", slug);
        }

        var application = new NamespaceApplication(slug, displayName, description, applicantId);
        return applicationRepository.save(application);
    }

    /**
     * Paginated list of applications filtered by status.
     *
     * @param status        filter; defaults to PENDING when blank or null
     * @param pageable      page/size
     * @param sortDirection "ASC" or "DESC"
     * @return paged result
     */
    @Transactional(readOnly = true)
    public Page<NamespaceApplication> listByStatus(NamespaceApplicationStatus status,
                                                   Pageable pageable,
                                                   String sortDirection) {
        String primaryField = status == NamespaceApplicationStatus.PENDING ? "appliedAt" : "reviewedAt";
        Sort.Direction direction = Sort.Direction.fromOptionalString(sortDirection)
                .orElse(Sort.Direction.DESC);
        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(new Sort.Order(direction, primaryField),
                        new Sort.Order(direction, "id"))
        );
        return applicationRepository.findByStatus(status, sortedPageable);
    }

    /**
     * Approve a PENDING application.
     *
     * <p>Creates the actual namespace (with the applicant as OWNER), then
     * links the created namespace to this application record.
     *
     * @param applicationId the application to approve
     * @param reviewerId    admin performing the action
     * @return the updated application
     */
    @Transactional
    public NamespaceApplication approve(Long applicationId, String reviewerId) {
        var application = findPendingOrThrow(applicationId);

        Namespace namespace = namespaceService.createNamespace(
                application.getSlug(),
                application.getDisplayName(),
                application.getDescription(),
                application.getApplicantId()
        );

        application.setStatus(NamespaceApplicationStatus.APPROVED);
        application.setReviewerId(reviewerId);
        application.setReviewedAt(Instant.now());
        application.setNamespaceId(namespace.getId());
        return applicationRepository.save(application);
    }

    /**
     * Reject a PENDING application with a mandatory comment.
     *
     * @param applicationId the application to reject
     * @param reviewerId    admin performing the action
     * @param comment       rejection reason shown to the applicant
     * @return the updated application
     */
    @Transactional
    public NamespaceApplication reject(Long applicationId, String reviewerId, String comment) {
        var application = findPendingOrThrow(applicationId);

        application.setStatus(NamespaceApplicationStatus.REJECTED);
        application.setReviewerId(reviewerId);
        application.setReviewedAt(Instant.now());
        application.setReviewComment(comment);
        return applicationRepository.save(application);
    }

    // -------------------------------------------------------------------------

    private NamespaceApplication findPendingOrThrow(Long id) {
        var application = applicationRepository.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("error.namespace.application.notFound", id));
        if (application.getStatus() != NamespaceApplicationStatus.PENDING) {
            throw new DomainBadRequestException("error.namespace.application.notPending",
                    application.getStatus().name());
        }
        return application;
    }
}
