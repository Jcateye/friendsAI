# auth-jwt

## Purpose

TBD

## Requirements

### Requirement: AUTH-010 Register issues tokens
系统 SHALL 支持用户以 `email` 或 `phone` 注册账号，并在成功注册后返回 `accessToken` 与 `refreshToken`。

#### Scenario: Successful register with email
- **GIVEN** 用户未登录
- **WHEN** 调用 `POST /v1/auth/register`，提交 `{ email, password, name }`
- **THEN** 响应 `200` 且包含 `{ accessToken, refreshToken, user }`

#### Scenario: Duplicate register is rejected
- **GIVEN** `email` 已被注册
- **WHEN** 调用 `POST /v1/auth/register` 使用相同 `email`
- **THEN** 响应 `409` 且返回可读的错误信息

### Requirement: AUTH-020 Login issues tokens
系统 SHALL 支持用户使用 `emailOrPhone` + `password` 登录，并返回 `accessToken` 与 `refreshToken`。

#### Scenario: Successful login
- **GIVEN** 用户已注册且凭证正确
- **WHEN** 调用 `POST /v1/auth/login`，提交 `{ emailOrPhone, password }`
- **THEN** 响应 `200` 且包含 `{ accessToken, refreshToken, user }`

#### Scenario: Invalid credentials are rejected
- **GIVEN** 用户提供错误的 `password`
- **WHEN** 调用 `POST /v1/auth/login`
- **THEN** 响应 `401`

### Requirement: AUTH-030 Refresh issues new access token
系统 SHALL 支持使用 `refreshToken` 换取新的 `accessToken`（以及可选的新 `refreshToken`）。

#### Scenario: Refresh succeeds with valid refresh token
- **GIVEN** 用户持有未被撤销且未过期的 `refreshToken`
- **WHEN** 调用 `POST /v1/auth/refresh`，提交 `{ refreshToken }`
- **THEN** 响应 `200` 且包含 `{ accessToken, refreshToken }`

#### Scenario: Refresh fails after logout
- **GIVEN** 该 `refreshToken` 已被 logout 撤销
- **WHEN** 调用 `POST /v1/auth/refresh`
- **THEN** 响应 `401`

### Requirement: AUTH-040 Logout revokes refresh token
系统 SHALL 支持用户登出并撤销指定的 `refreshToken`，使其后续不可再用于 refresh。

#### Scenario: Logout revokes refresh token
- **GIVEN** 用户持有有效 `refreshToken`
- **WHEN** 调用 `POST /v1/auth/logout`，提交 `{ refreshToken }`
- **THEN** 响应 `200` 且后续对同一 token 的 `POST /v1/auth/refresh` 返回 `401`

### Requirement: AUTH-050 Protected endpoints require Bearer token
系统 MUST 对需要登录的 API 校验 `Authorization: Bearer <accessToken>`；缺失或无效 token MUST 返回 `401`。

#### Scenario: Missing token is rejected
- **GIVEN** 请求未携带 `Authorization` header
- **WHEN** 调用任意受保护 API（例如 `GET /v1/contacts`）
- **THEN** 响应 `401`

#### Scenario: Valid token allows access
- **GIVEN** 请求携带有效 `Authorization: Bearer <accessToken>`
- **WHEN** 调用任意受保护 API
- **THEN** 响应 `2xx`
