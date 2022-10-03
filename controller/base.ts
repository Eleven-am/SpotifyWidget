import fetch from "cross-fetch";

export class BaseClass {

    /**
     * @dwc makes a HTTP request
     * @param url - url to request
     * @param params - params to send
     * @param method - method to use
     * @param source - axios cancel token
     */
    public async makeRequest<S> (url: string, params: any, method: 'POST' | 'GET' = 'GET', source?: AbortSignal): Promise<S | null> {
        return new Promise<S | null>((resolve) => {
            url = params && method === 'GET' ? `${url}?${new URLSearchParams(params).toString()}` : url;
            fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: method === 'POST' ? JSON.stringify(params) : null,
                signal: source || null,
            }).then(async (response) => {
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const res = await response.json();

                        resolve(res);
                    } catch (e) {
                        const res = await response.text() as any as S;

                        resolve(res);
                    }
                } else {
                    resolve(null);
                }
            })
                .catch(() => {
                    resolve(null);
                });
        });
    }
}
