package com.iflytek.skillhub.domain.social;

import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Domain repository contract for skill star relationships and starred-skill pagination.
 */
public interface SkillStarRepository {
    SkillStar save(SkillStar star);
    Optional<SkillStar> findBySkillIdAndUserId(Long skillId, String userId);
    List<SkillStar> findByUserIdAndSkillIdIn(String userId, List<Long> skillIds);
    void delete(SkillStar star);
    void deleteBySkillId(Long skillId);
    Page<SkillStar> findByUserId(String userId, Pageable pageable);
    long countBySkillId(Long skillId);
}
