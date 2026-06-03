package com.iflytek.skillhub.infra.jpa;

import com.iflytek.skillhub.domain.namespace.NamespaceApplication;
import com.iflytek.skillhub.domain.namespace.NamespaceApplicationRepository;
import com.iflytek.skillhub.domain.namespace.NamespaceApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * JPA-backed implementation of {@link NamespaceApplicationRepository}.
 * Spring Data derives all query methods from their names automatically.
 */
@Repository
public interface NamespaceApplicationJpaRepository
        extends JpaRepository<NamespaceApplication, Long>, NamespaceApplicationRepository {

    @Override
    List<NamespaceApplication> findByApplicantIdAndStatus(String applicantId,
                                                          NamespaceApplicationStatus status);

    @Override
    Page<NamespaceApplication> findByStatus(NamespaceApplicationStatus status, Pageable pageable);

    @Override
    boolean existsBySlugAndStatus(String slug, NamespaceApplicationStatus status);
}
