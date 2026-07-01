package com.iflytek.skillhub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ThirdPartyLoginRequest(
        @NotNull(message = "validation.auth.thirdParty.loginMethod.notNull")
        ThirdPartyLoginMethod loginMethod,
        @NotNull(message = "validation.auth.thirdParty.platform.notNull")
        ThirdPartyLoginPlatform platform,
        @NotBlank(message = "validation.auth.thirdParty.token.notBlank")
        String token
) {
}
