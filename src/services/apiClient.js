import { clearAuthSession, readAuthSession, replaceAuthTokens } from './authSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
let refreshRequest = null;

export class ApiError extends Error {
    constructor(
        {
            status = 0,
            code = 'UNKNOWN_ERROR',
            message = 'Đã xảy ra lỗi',
            path = null,
            timestamp = null,
        } = {},
        options = {},
    ) {
        super(message, options);

        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.path = path;
        this.timestamp = timestamp;
    }
}

async function parseResponse(response) {
    const responseText = response.status === 204 ? '' : await response.text();
    if (!responseText) return null;

    try {
        return JSON.parse(responseText);
    } catch {
        return responseText;
    }
}

function toApiError(response, data, fallbackPath) {
    const errorData = data && typeof data === 'object' ? data : {};
    return new ApiError({
        status: response.status,
        code: errorData.code ?? 'HTTP_ERROR',
        message: errorData.message ?? `Request thất bại (${response.status})`,
        path: errorData.path ?? fallbackPath,
        timestamp: errorData.timestamp ?? null,
    });
}

export async function refreshAuthSession() {
    if (refreshRequest) return refreshRequest;

    const session = readAuthSession();
    if (!session?.refreshToken) {
        throw new ApiError({ status: 401, code: 'AUTH_UNAUTHORIZED', message: 'Phiên đăng nhập không tồn tại' });
    }

    refreshRequest = (async () => {
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
            });
        } catch (cause) {
            throw new ApiError(
                { code: 'NETWORK_ERROR', message: 'Không thể kết nối đến máy chủ' },
                { cause },
            );
        }

        const data = await parseResponse(response);
        if (!response.ok) {
            if ([400, 401, 403].includes(response.status)) clearAuthSession();
            throw toApiError(response, data, '/auth/refresh');
        }

        replaceAuthTokens(data);
        return data;
    })().finally(() => {
        refreshRequest = null;
    });

    return refreshRequest;
}

export async function apiRequest(
    path,
    { method = 'GET', body, headers, auth = true, retryAuth = true, ...options } = {},
) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const execute = async (accessToken) => {
        const requestHeaders = new Headers(headers);
        requestHeaders.set('Accept', 'application/json');
        if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
        if (auth && accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);

        try {
            return await fetch(`${API_BASE_URL}${normalizedPath}`, {
                ...options,
                method,
                headers: requestHeaders,
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (cause) {
            throw new ApiError(
                { code: 'NETWORK_ERROR', message: 'Không thể kết nối đến máy chủ' },
                { cause },
            );
        }
    };

    let session = auth ? readAuthSession() : null;
    if (session?.accessExpiresAt && session.accessExpiresAt <= Date.now()) {
        await refreshAuthSession();
        session = readAuthSession();
    }

    let response = await execute(session?.accessToken);
    if (response.status === 401 && auth && retryAuth && readAuthSession()?.refreshToken) {
        await refreshAuthSession();
        response = await execute(readAuthSession()?.accessToken);
    }

    const data = await parseResponse(response);

    if (!response.ok) {
        throw toApiError(response, data, normalizedPath);
    }

    return data;
}

export const apiClient = {
    get(path, options) {
        return apiRequest(path, { ...options, method: 'GET' });
    },

    post(path, body, options) {
        return apiRequest(path, { ...options, method: 'POST', body });
    },

    put(path, body, options) {
        return apiRequest(path, { ...options, method: 'PUT', body });
    },

    patch(path, body, options) {
        return apiRequest(path, { ...options, method: 'PATCH', body });
    },

    delete(path, options) {
        return apiRequest(path, { ...options, method: 'DELETE' });
    },
};
