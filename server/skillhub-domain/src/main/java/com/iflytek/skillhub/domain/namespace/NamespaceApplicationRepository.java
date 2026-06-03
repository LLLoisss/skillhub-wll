package com.iflytek.skillhub.domain.namespace;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * Domain repository contract for namespace application aggregates.
 * Implementations are provided by the infra layer (JPA).
 */
public interface NamespaceApplicationRepository {

    NamespaceApplication save(NamespaceApplication application);

    Optional<NamespaceApplication> findById(Long id);

    /** Find all PENDING applications submitted by the given user. */
    List<NamespaceApplication> findByApplicantIdAndStatus(String applicantId,
                                                          NamespaceApplicationStatus status);

    /** Paginated query filtered by status; sort comes from the provided pageable. */
    Page<NamespaceApplication> findByStatus(NamespaceApplicationStatus status, Pageable pageable);

    /** Check whether there is any PENDING application for the exact slug. */
    boolean existsBySlugAndStatus(String slug, NamespaceApplicationStatus status);
}
