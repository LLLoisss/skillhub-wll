package com.iflytek.skillhub.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BatchSkillDetailRequest(
        @NotNull @NotEmpty @Valid List<SkillLookupKey> skillList
) {
    public record SkillLookupKey(
            @NotNull String namespace,
            @NotNull String slug
    ) {}
}
