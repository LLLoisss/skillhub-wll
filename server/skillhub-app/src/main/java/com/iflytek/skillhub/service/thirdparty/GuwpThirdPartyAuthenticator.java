package com.iflytek.skillhub.service.thirdparty;

import com.iflytek.skillhub.config.ThirdPartyLoginProperties;
import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import org.springframework.stereotype.Component;

@Component
public class GuwpThirdPartyAuthenticator extends AbstractGuwpThirdPartyAuthenticator {

    public GuwpThirdPartyAuthenticator(ThirdPartyLoginProperties properties) {
        super(properties, ThirdPartyLoginPlatform.GUWP);
    }
}

