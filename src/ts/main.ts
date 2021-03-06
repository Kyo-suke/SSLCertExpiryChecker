/// <reference path="../d.ts/common.d.ts" />
/// <reference path="./Inqueryer.ts" />
/// <reference path="./UIManager.ts" />
/// <reference types="jquery" />

namespace SSLCertChecker {
    export var TARGET_CGI: string = "./GetSSLCertStatus.cgi";

    /**
     * 各種状態の更新
     * @param json {SSLCertStatusJson}
     */
    export function update(json: SSLCertStatusJson): void {
        UIManager.clearTable();
        UIManager.showLoading(true);
        if (!json) {
            return;
        }
        let datas = Inqueryer.getCertStatusList();
        UIManager.setTableRow(datas);
    }

    /**
     * めいん関数
     * DOMのロードが完了後に実行する
     */
    export function main(): void {
        UIManager.initialize();
        Inqueryer.inquery(update);
    }

    document.addEventListener("DOMContentLoaded", () => {
        SSLCertChecker.main();
    });
}
