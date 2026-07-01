package com.iflytek.skillhub.service.thirdparty;

import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;

public interface ThirdPartyPlatformAuthenticator {
    ThirdPartyLoginPlatform platform();

    String verifyToken(String token);
}
