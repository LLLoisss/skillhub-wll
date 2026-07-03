package com.iflytek.skillhub.controller;

import com.iflytek.skillhub.auth.exception.AuthFlowException;
import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.AuthMeResponse;
import com.iflytek.skillhub.dto.ThirdPartyLoginRequest;
import com.iflytek.skillhub.ratelimit.RateLimit;
import com.iflytek.skillhub.service.AuthAuditService;
import com.iflytek.skillhub.service.ThirdPartyLoginService;
import com.iflytek.skillhub.service.SessionBootstrapService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/third-party")
public class ThirdPartyAuthController extends BaseApiController {

    private final ThirdPartyLoginService thirdPartyLoginService;

    private final SessionBootstrapService sessionBootstrapService;
    private final AuthAuditService authAuditService;

    public ThirdPartyAuthController(ApiResponseFactory responseFactory,
                                    ThirdPartyLoginService thirdPartyLoginService,
                                    SessionBootstrapService sessionBootstrapService,
                                    AuthAuditService authAuditService) {
        super(responseFactory);
        this.thirdPartyLoginService = thirdPartyLoginService;
        this.sessionBootstrapService = sessionBootstrapService;
        this.authAuditService = authAuditService;
    }

    @PostMapping("/login")
    @RateLimit(category = "auth-third-party-login", authenticated = 20, anonymous = 10, windowSeconds = 60)
    public ApiResponse<AuthMeResponse> login(@Valid @RequestBody ThirdPartyLoginRequest request,
                                             HttpServletRequest httpRequest,
                                             HttpServletResponse httpResponse) {
        PlatformPrincipal principal;
        try {
            principal = thirdPartyLoginService.authenticate(request, httpRequest);
            sessionBootstrapService.establishSession(principal, httpRequest);
        } catch (RuntimeException ex) {
            authAuditService.recordLoginFailure("THIRD_PARTY", provider(request), null, ex.getMessage(), httpRequest,
                    loginDetails(request));
            throw ex;
        }

        String sessionID = httpRequest.getSession().getId();

        String encodedId = Base64.getEncoder().encodeToString(sessionID.getBytes());

        httpResponse.setHeader("x-session-id", encodedId);
        authAuditService.recordLoginSuccess(principal, "THIRD_PARTY", provider(request), httpRequest,
                loginDetails(request));

        return ok("response.success.read", AuthMeResponse.from(principal));
    }

    private String provider(ThirdPartyLoginRequest request) {
        return request.platform() == null ? null : request.platform().name();
    }

    private Map<String, ?> loginDetails(ThirdPartyLoginRequest request) {
        return request.loginMethod() == null ? Map.of() : Map.of("loginMethod", request.loginMethod().name());
    }
}
