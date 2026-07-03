package com.iflytek.skillhub.config;

import com.iflytek.skillhub.dto.ThirdPartyLoginPlatform;
import com.iflytek.skillhub.exception.BadRequestException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "skillhub.auth.third-party")
public class ThirdPartyLoginProperties {

    private Duration authTokenTtl = Duration.ofMinutes(5);

    private Map<String, PlatformProperties> platforms = new HashMap<>();

    public Duration getAuthTokenTtl() {
        return authTokenTtl;
    }

    public void setAuthTokenTtl(Duration authTokenTtl) {
        this.authTokenTtl = authTokenTtl;
    }

    public Map<String, PlatformProperties> getPlatforms() {
        return platforms;
    }

    public void setPlatforms(Map<String, PlatformProperties> platforms) {
        this.platforms = platforms;
    }

    public PlatformProperties getRequiredPlatform(ThirdPartyLoginPlatform platform) {
        PlatformProperties config = platforms.get(platform.name().toLowerCase(Locale.ROOT));
        if (config == null) {
            config = platforms.get(platform.name());
        }
        if (config == null) {
            throw new BadRequestException("error.auth.thirdParty.platformUnsupported", platform.name());
        }
        return config;
    }

    public static class PlatformProperties {
        /**
         * Third-party token validation API. Token login sends {"token": "..."} to this URL.
         */
        private String tokenVerifyUrl;

        /**
         * Offline agreed eight-character platform secret used to build AES auth-login keys.
         */
        private String authSecret;

        public String getTokenVerifyUrl() {
            return tokenVerifyUrl;
        }

        public void setTokenVerifyUrl(String tokenVerifyUrl) {
            this.tokenVerifyUrl = tokenVerifyUrl;
        }

        public String getAuthSecret() {
            return authSecret;
        }

        public void setAuthSecret(String authSecret) {
            this.authSecret = authSecret;
        }
    }
}
