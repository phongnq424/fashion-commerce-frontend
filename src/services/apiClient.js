const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

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

export async function apiRequest(
    path,
    { method = 'GET', body, headers, ...options } = {},
) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const requestHeaders = new Headers(headers);

    requestHeaders.set('Accept', 'application/json');

    if (body !== undefined) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
            ...options,
            method,
            headers: requestHeaders,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (cause) {
        throw new ApiError(
            {
                code: 'NETWORK_ERROR',
                message: 'Không thể kết nối đến máy chủ',
            },
            { cause },
        );
    }

    const responseText =
        response.status === 204 ? '' : await response.text();

    let data = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = responseText;
        }
    }

    if (!response.ok) {
        const errorData =
            data && typeof data === 'object' ? data : {};

        throw new ApiError({
            status: response.status,
            code: errorData.code ?? 'HTTP_ERROR',
            message: errorData.message ?? `Request thất bại (${response.status})`,
            path: errorData.path ?? normalizedPath,
            timestamp: errorData.timestamp ?? null,
        });
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