package com.iflytek.skillhub.controller;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.dto.ApiResponse;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.dto.AuthMeResponse;
import com.iflytek.skillhub.dto.ThirdPartyLoginRequest;
import com.iflytek.skillhub.ratelimit.RateLimit;
import com.iflytek.skillhub.service.ThirdPartyLoginService;
import com.iflytek.skillhub.service.SessionBootstrapService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;

@RestController
@RequestMapping("/api/v1/auth/third-party")
public class ThirdPartyAuthController extends BaseApiController {

    private final ThirdPartyLoginService thirdPartyLoginService;

    private final SessionBootstrapService sessionBootstrapService;

    public ThirdPartyAuthController(ApiResponseFactory responseFactory,
                                    ThirdPartyLoginService thirdPartyLoginService,
                                    SessionBootstrapService sessionBootstrapService) {
        super(responseFactory);
        this.thirdPartyLoginService = thirdPartyLoginService;
        this.sessionBootstrapService = sessionBootstrapService;
    }

    @PostMapping("/login")
    @RateLimit(category = "auth-third-party-login", authenticated = 20, anonymous = 10, windowSeconds = 60)
    public ApiResponse<AuthMeResponse> login(@Valid @RequestBody ThirdPartyLoginRequest request,
                                             HttpServletRequest httpRequest,
                                             HttpServletResponse httpResponse) {
        PlatformPrincipal principal = thirdPartyLoginService.authenticate(request, httpRequest);
        //建立session权限
        sessionBootstrapService.establishSession(principal, httpRequest);

        String sessionID = httpRequest.getSession().getId();

        String encodedId = Base64.getEncoder().encodeToString(sessionID.getBytes());

        httpResponse.setHeader("x-session-id", encodedId);

        return ok("response.success.read", AuthMeResponse.from(principal));
    }
}