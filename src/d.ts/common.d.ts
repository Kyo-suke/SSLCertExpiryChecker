declare namespace SSLCertChecker {
    export type LineFeedCodeType = "cr" | "lf" | "crlf";

    export interface SSLCertStatus {
        hostname: string;
        status: "valid" | "warn" | "expired";
        // sdate, edate are ISO8601 time format
        sdate: string;
        edate: string;
        version: string;
    }

    export interface SSLCertStatusJson {
        expiryAlertTerm: number;
        message: string;
        status: "ok" | "ng";
        statusCode: number;
        timestamp: number;
        results: SSLCertStatus[];
    }
}
